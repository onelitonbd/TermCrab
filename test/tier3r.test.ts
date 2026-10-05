import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, loadConfig, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';
import { SessionStore } from '../src/agent/sessions.js';

/**
 * Batch 49 — the web panel's quick gaps.
 *
 * The audit left six web cells open; this batch closes two of them (session
 * search, embeddings provider) and gives the panel the two things the other
 * surfaces already had as verbs: the prompt-context report and the queue
 * mode / steer control. Every test drives the *HTTP* surface the panel uses,
 * not the function behind it, because the panel is the thing being fixed.
 */

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

async function panel() {
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  config.gateway = { ...config.gateway, token: 'tok' };
  saveConfig(config);
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  const get = async (p: string): Promise<{ status: number; body: Record<string, unknown> }> => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, { headers: { authorization: 'Bearer tok' } });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };
  const post = async (p: string, body: unknown): Promise<{ status: number; body: Record<string, unknown> }> => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, {
      method: 'POST',
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as Record<string, unknown> };
  };
  return { get, post, handle };
}

test('49.1 the panel searches every chat by words, ranked', async () => {
  tmpHome('t49a-');
  const store = new SessionStore();
  const now = Date.now();
  store.append('plumber-thread', { role: 'user', content: 'the kitchen plumber comes on Tuesday', ts: now - 60_000 });
  store.append('plumber-thread', { role: 'assistant', content: 'noted — Tuesday, kitchen sink', ts: now - 59_000 });
  store.append('garden-thread', { role: 'user', content: 'buy tomato seeds for the balcony', ts: now - 30_000 });

  const { get, handle } = await panel();
  try {
    const hit = await get('/api/sessions?q=plumber');
    assert.equal(hit.status, 200);
    assert.equal(hit.body.query, 'plumber');
    const hits = hit.body.hits as { sessionId: string; role: string; snippet: string }[];
    assert.ok(hits.length >= 1, 'a word only one chat has finds it');
    assert.equal(hits[0]!.sessionId, 'plumber-thread');
    assert.match(hits[0]!.snippet, /plumber/i, 'the hit carries the matched words, not just an id');
    assert.ok(!hits.some((h) => h.sessionId === 'garden-thread'), 'the other chat is not returned');

    const miss = await get('/api/sessions?q=zeppelin');
    assert.equal(miss.status, 200);
    assert.deepEqual(miss.body.hits, [], 'a miss is an empty list, not an error');

    const plain = await get('/api/sessions');
    assert.equal(plain.status, 200);
    assert.equal(plain.body.hits, undefined, 'the normal list is unchanged');
    assert.ok(Array.isArray(plain.body.sessions));

    // The panel calls exactly this route.
    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /api\('\/api\/sessions\?q='/);
    assert.match(html, /id="sessSearch"/);
  } finally {
    await handle.stop();
  }
});

test('49.2 the panel shows the prompt-context report', async () => {
  tmpHome('t49b-');
  const { get, handle } = await panel();
  try {
    const r = await get('/api/context');
    assert.equal(r.status, 200);
    const sections = r.body.sections as { name: string; bytes: number }[];
    assert.ok(Array.isArray(sections) && sections.length > 0, 'sections are reported');
    for (let i = 1; i < sections.length; i++) {
      assert.ok(sections[i - 1]!.bytes >= sections[i]!.bytes, 'biggest section first');
    }
    assert.ok(Number(r.body.totalBytes) > 0);
    assert.ok(r.body.tools && typeof (r.body.tools as { count: number }).count === 'number');
    assert.ok(r.body.history && typeof (r.body.history as { messages: number }).messages === 'number');

    // A named session is what the page asks for.
    const named = await get('/api/context?session=web:main');
    assert.equal(named.body.sessionId, 'web:main');

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="ctxTable"/);
    assert.match(html, /api\('\/api\/context\?session='/);
  } finally {
    await handle.stop();
  }
});

test('49.3 the embeddings picker writes the same config the CLI writes', async () => {
  tmpHome('t49c-');
  const { get, post, handle } = await panel();
  try {
    const before = await get('/api/embeddings');
    assert.equal(before.status, 200);
    assert.deepEqual(before.body.providers, ['auto', 'local', 'openai', 'gemini']);
    assert.equal(before.body.setting, 'auto', 'the default the CLI would report');
    assert.ok(typeof before.body.summary === 'string', 'the status line is the CLI’s own summary');
    assert.equal((before.body.install as { running: boolean }).running, false);

    const bad = await post('/api/embeddings', { provider: 'magic' });
    assert.equal(bad.status, 400);
    assert.match(String(bad.body.error), /provider must be one of/);

    const set = await post('/api/embeddings', { provider: 'openai' });
    assert.equal(set.status, 200);
    assert.equal(set.body.provider, 'openai');
    assert.equal(loadConfig().memory?.embedProvider, 'openai', 'the config key the CLI reads');

    const back = await get('/api/embeddings');
    assert.equal(back.body.setting, 'openai');

    // Installing downloads things; it must ask first.
    const noConfirm = await post('/api/embeddings', { action: 'install' });
    assert.equal(noConfirm.status, 400);
    assert.match(String(noConfirm.body.error), /confirm:true|termcrab embeddings setup/);

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="embProvider"/);
    assert.match(html, /action: 'install'/);
  } finally {
    await handle.stop();
  }
});

test('49.4 the queue mode and steering work from the panel’s own endpoints', async () => {
  tmpHome('t49d-');
  const { get, post, handle } = await panel();
  try {
    const q0 = await get('/api/queue');
    assert.equal(q0.status, 200);
    assert.equal(q0.body.mode, 'followup', 'the default');
    assert.equal(q0.body.running, 0);

    const bad = await post('/api/queue', { mode: 'whenever' });
    assert.equal(bad.status, 400);
    assert.match(String(bad.body.error), /mode must be one of/);

    const set = await post('/api/queue', { mode: 'collect' });
    assert.equal(set.status, 200);
    assert.equal(set.body.mode, 'collect');
    assert.equal(loadConfig().agent.queueMode, 'collect', 'the same key /queue writes');

    // Steering with nothing running says so, in the dispatcher's own words.
    const steer = await post('/api/steer', { text: 'try the other file' });
    assert.equal(steer.status, 200);
    assert.match(String(steer.body.message), /nothing is running/);
    const empty = await post('/api/steer', { text: '   ' });
    assert.equal(empty.status, 400);
    assert.match(String(empty.body.error), /usage: \/steer/);

    const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(html, /id="queueSel"/);
    assert.match(html, /id="steerInput"/);
    assert.match(html, /api\('\/api\/steer'/);
  } finally {
    await handle.stop();
  }
});
