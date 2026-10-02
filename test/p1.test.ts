import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { SessionStore } from '../src/agent/sessions.js';
import { scaffoldSkill, scaffoldAgent, soulTemplate, SOUL_TEMPLATES } from '../src/skills/scaffold.js';
import { embeddingsStatus, embeddingsSetup } from '../src/agent/embed-setup.js';
import { dreamHistory } from '../src/agent/dream.js';
import { SkillStore } from '../src/skills/loader.js';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults } from '../src/core/config.js';

/** v0.5 P1: session tools, skill/agent scaffolds, embeddings UX, dream history. */
test('P1: session tools', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tsess-'));
  const store = new SessionStore(root);

  const seed = () => {
    store.append('trip:planning', { role: 'user', content: 'book the flight', ts: Date.now() - 90 * 86_400_000 });
    store.append('trip:planning', { role: 'assistant', content: 'done — booked Friday', ts: Date.now() - 90 * 86_400_000 });
    store.append('web:main', { role: 'user', content: 'hello', ts: Date.now() });
    store.append('web:main', { role: 'assistant', content: 'hi!', ts: Date.now() });
  };
  seed();

  await t.test('list reports bytes so the UI can show sizes', () => {
    const list = store.list();
    assert.equal(list.length, 2);
    const main = list.find((s) => s.id === 'web:main');
    assert.ok(main);
    assert.ok(main.bytes > 0);
    assert.equal(main.messages, 2);
  });

  await t.test('export makes readable markdown', () => {
    const md = store.exportMarkdown('trip:planning');
    assert.ok(md);
    assert.match(md!, /# Chat: trip:planning/);
    assert.match(md!, /\*\*You\*\*/);
    assert.match(md!, /book the flight/);
    assert.match(md!, /done — booked Friday/);
    assert.equal(store.exportMarkdown('nope:missing'), null);
  });

  await t.test('rename moves, refuses clobber and bad names', () => {
    assert.equal(store.rename('web:main', 'holiday'), 'ok');
    assert.ok(store.list().some((s) => s.id === 'holiday'));
    assert.equal(store.rename('web:main', 'x'), 'not-found'); // already moved
    assert.equal(store.rename('holiday', 'trip:planning'), 'exists');
    assert.equal(store.rename('holiday', 'bad name!'), 'bad-name');
  });

  await t.test('purge only removes files older than the cutoff', async () => {
    // make trip:planning look old
    const f = path.join(root, 'trip:planning.jsonl');
    const old = new Date(Date.now() - 90 * 86_400_000);
    fs.utimesSync(f, old, old);
    const r = store.purgeOlderThan(30);
    assert.equal(r.removed, 1);
    assert.ok(r.freedBytes > 0);
    assert.ok(!fs.existsSync(f), 'old file gone');
    assert.ok(fs.existsSync(path.join(root, 'holiday.jsonl')), 'recent file kept');
    // second run: nothing left to purge
    assert.equal(store.purgeOlderThan(30).removed, 0);
  });
});

test('P1: skill + agent scaffolds', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tscf-'));
  process.env.TCRAB_HOME = home;

  await t.test('skills new writes a SKILL.md the loader actually accepts', () => {
    const r = scaffoldSkill('make-tea', 'boil water, steep, serve');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const store = new SkillStore();
    const found = store.get('make-tea');
    assert.ok(found, 'loader must discover the scaffolded skill');
    assert.equal(found!.name, 'make-tea');
    assert.equal(found!.description, 'boil water, steep, serve');
    // content includes the TODO guidance
    assert.match(found!.content, /Steps/);
  });

  await t.test('skills new refuses duplicates and bad names', () => {
    const dup = scaffoldSkill('make-tea');
    assert.equal(dup.ok, false);
    const bad = scaffoldSkill('Bad Name!');
    assert.equal(bad.ok, false);
  });

  await t.test('agents new --template writes a starter personality', () => {
    for (const kind of SOUL_TEMPLATES) {
      const r = scaffoldAgent(`helper-${kind}`, kind);
      assert.equal(r.ok, true, `template ${kind}`);
      if (!r.ok) continue;
      const soul = fs.readFileSync(r.path, 'utf8');
      assert.match(soul, /# SOUL/);
      assert.match(soul, new RegExp(`helper-${kind}`), 'name substituted in');
    }
    // duplicate refused
    assert.equal(scaffoldAgent('helper-brief', 'brief').ok, false);
    // templates differ from each other
    assert.notEqual(soulTemplate('brief', 'x'), soulTemplate('teacher', 'x'));
  });
});

test('P1: embeddings status + setup', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'temb-'));
  process.env.TCRAB_HOME = home;

  await t.test('status is plain English with a next step', () => {
    const st = embeddingsStatus();
    assert.equal(typeof st.packageInstalled, 'boolean');
    assert.equal(st.indexVectors, 0);
    assert.ok(st.summary.length > 10, 'must be a sentence, not a code dump');
    assert.match(st.summary, /setup|ready|off/);
  });

  await t.test('setup honors memory.embeddings=false', async () => {
    fs.writeFileSync(
      path.join(home, 'config.json'),
      JSON.stringify({ memory: { embeddings: false } }, null, 2),
    );
    const r = await embeddingsSetup({ install: async () => true, probe: async () => 384 });
    assert.equal(r.ok, false);
    assert.match(r.error!, /memory\.embeddings=false/);
    fs.rmSync(path.join(home, 'config.json'));
  });

  await t.test('setup happy path verifies the 384-dim probe', async () => {
    let installed = false;
    const r = await embeddingsSetup({
      install: async () => { installed = true; return true; },
      probe: async () => 384,
    });
    assert.equal(r.ok, true, r.error ?? '');
    assert.equal(installed, true, 'install step ran');
    assert.ok(r.steps.some((s) => /384/.test(s)), 'probe verified');
    assert.ok(r.steps.some((s) => /done/.test(s)), 'finishes with done');
  });

  await t.test('setup reports a friendly error when install fails or probe is wrong size', async () => {
    const failInstall = await embeddingsSetup({ install: async () => false, probe: async () => 384 });
    assert.equal(failInstall.ok, false);
    assert.match(failInstall.error!, /npm install/);

    // package already present (probe path): wrong dims → clear message
    const badProbe = await embeddingsSetup({ install: async () => true, probe: async () => 128 });
    assert.equal(badProbe.ok, false);
    assert.match(badProbe.error!, /128/);
  });
});

test('P1: dream history reads the trail dreams leave in daily logs', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tdrm-'));
  process.env.TCRAB_HOME = home;
  fs.mkdirSync(path.join(home, 'memory', 'daily'), { recursive: true });
  fs.writeFileSync(
    path.join(home, 'memory', 'daily', '2026-09-28.md'),
    '# 2026-09-28\n\n- dream: 3 new fact(s) consolidated — likes oolong tea\n- walked 4000 steps\n',
  );
  fs.writeFileSync(
    path.join(home, 'memory', 'daily', '2026-09-29.md'),
    '# 2026-09-29\n\n- dream: 1 new fact(s) consolidated — deadline friday\n',
  );
  fs.mkdirSync(path.join(home, 'state'), { recursive: true });
  fs.writeFileSync(path.join(home, 'state', 'dream.json'), JSON.stringify({ lastDreamAt: 1790600000000 }));

  await t.test('returns last run + only dream lines, newest first', () => {
    const { lastDreamAt, history } = dreamHistory();
    assert.equal(lastDreamAt, 1790600000000);
    assert.equal(history.length, 2);
    assert.equal(history[0]!.day, '2026-09-29');
    assert.match(history[0]!.line, /deadline friday/);
    assert.equal(history[1]!.day, '2026-09-28');
    assert.ok(!history.some((h) => /walked 4000/.test(h.line)), 'non-dream lines excluded');
  });

  await t.test('degrades calmly on a fresh install', () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'tdrm2-'));
    process.env.TCRAB_HOME = fresh;
    const { lastDreamAt, history } = dreamHistory();
    assert.equal(lastDreamAt, null);
    assert.deepEqual(history, []);
    process.env.TCRAB_HOME = home;
  });
});

test('P1: gateway session/dream routes', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tapi2-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  config.gateway.token = 'test-token';
  const srv = net.createServer();
  const port: number = await new Promise((resolve, reject) => {
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;
  const req = async (p: string, method = 'GET', body?: unknown) => {
    const res = await fetch(base + p, {
      method,
      headers: {
        authorization: 'Bearer test-token',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data: Record<string, unknown> = {};
    try { data = (await res.json()) as Record<string, unknown>; } catch { /* empty */ }
    return { status: res.status, data };
  };

  try {
    // create a chat to work with
    await req('/api/chat', 'POST', { message: 'remember this test chat', sessionId: 'web:main' });

    await t.test('GET /api/sessions includes sizes', async () => {
      const { status, data } = await req('/api/sessions');
      assert.equal(status, 200);
      const list = data.sessions as { id: string; bytes?: number }[];
      assert.ok(list.length >= 1);
      assert.ok(typeof list[0]!.bytes === 'number');
    });

    await t.test('export returns markdown or 404', async () => {
      const ok = await req('/api/sessions/web:main/export');
      assert.equal(ok.status, 200);
      assert.match(String(ok.data.markdown), /# Chat: web:main/);
      const missing = await req('/api/sessions/nope:zz/export');
      assert.equal(missing.status, 404);
    });

    await t.test('rename works with clear errors', async () => {
      const r = await req('/api/sessions/web:main/rename', 'POST', { to: 'first-chat' });
      assert.equal(r.status, 200);
      const dup = await req('/api/sessions/first-chat/rename', 'POST', { to: 'first-chat' });
      assert.equal(dup.status, 409);
      const bad = await req('/api/sessions/first-chat/rename', 'POST', { to: 'bad name!' });
      assert.equal(bad.status, 400);
      const gone = await req('/api/sessions/never-existed/rename', 'POST', { to: 'x' });
      assert.equal(gone.status, 404);
    });

    await t.test('purge validates days and reports counts', async () => {
      const bad = await req('/api/sessions/purge', 'POST', { olderThanDays: -3 });
      assert.equal(bad.status, 400);
      const r = await req('/api/sessions/purge', 'POST', { olderThanDays: 30 });
      assert.equal(r.status, 200);
      assert.equal(r.data.removed, 0, 'fresh chats survive');
      assert.equal(r.data.freedBytes, 0);
    });

    await t.test('GET /api/dreams answers calmly on a fresh install', async () => {
      const { status, data } = await req('/api/dreams');
      assert.equal(status, 200);
      assert.equal(data.lastDreamAt, null);
      assert.deepEqual(data.history, []);
    });

    await t.test('agents POST accepts a template', async () => {
      const r = await req('/api/agents', 'POST', { name: 'tutor', template: 'teacher' });
      assert.equal(r.status, 200);
      const read = await req('/api/agents/tutor');
      assert.match(String(read.data.soul), /patient teacher/);
      const plain = await req('/api/agents', 'POST', { name: 'plain-one' });
      assert.equal(plain.status, 200);
      const read2 = await req('/api/agents/plain-one');
      assert.match(String(read2.data.soul), /TermCrab agent/);
    });
  } finally {
    await handle.stop();
  }
});
