import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';
import { runReportCommand } from '../src/gateway/chat-reports.js';
import { listProposals, rejectProposal } from '../src/skills/proposals.js';

/**
 * Batch 52 — the named ◐ cells.
 *
 * Batch 51 emptied the ❌ register; what was left were the cells marked "partly"
 * with a reason. This file proves the ones that were half-doors: the panel's
 * inbox/rooms/watchers/tool-toggles/security/secrets views, session rename and
 * export, a spoken reply as a downloadable file, the chat's `/skills` decision
 * and `/cron add`, and the CLI's own `suite-time` / `work` verbs.
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
  const get = async (p: string): Promise<{ status: number; headers: Headers; text: string; body: Record<string, unknown> }> => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, { headers: { authorization: 'Bearer tok' } });
    const text = await res.text();
    let body: Record<string, unknown> = {};
    try { body = JSON.parse(text) as Record<string, unknown>; } catch { /* binary */ }
    return { status: res.status, headers: res.headers, text, body };
  };
  const send = async (
    p: string,
    body?: unknown,
    method = 'POST',
  ): Promise<{ status: number; body: Record<string, unknown> }> => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, {
      method,
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    const text = await res.text();
    let out: Record<string, unknown> = {};
    try { out = JSON.parse(text) as Record<string, unknown>; } catch { /* ignore */ }
    return { status: res.status, body: out };
  };
  const post = (p: string, body: unknown): Promise<Response> =>
    fetch(`http://127.0.0.1:${port}${p}`, {
      method: 'POST',
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  return { get, send, post, handle, port };
}

test('52.1 the panel sees the inbox, the rooms and the watchers, and flips a tool', async (t) => {
  const home = tmpHome('t52a-');
  const { get, send, handle } = await panel();

  try {
    await t.test('the inbox lists what was sent and refuses a path', async () => {
      const inboxDir = path.join(home, 'workspace', 'inbox');
      fs.mkdirSync(inboxDir, { recursive: true });
      fs.writeFileSync(path.join(inboxDir, 'note.txt'), 'hello from a chat');
      const list = await get('/api/inbox');
      assert.equal(list.status, 200);
      const entries = list.body.entries as { name: string }[];
      assert.ok(Array.isArray(entries));

      const { recordArrival } = await import('../src/channels/inbox.js');
      recordArrival({ name: 'note.txt', bytes: 18, kind: 'document', text: 'hello from a chat' });
      const listed = await get('/api/inbox');
      assert.ok(
        (listed.body.entries as { name: string }[]).some((e) => e.name === 'note.txt'),
        'the saved file is listed',
      );

      const one = await get('/api/inbox/note.txt');
      assert.equal(one.status, 200);
      assert.equal(one.body.ok, true);
      assert.match(String(one.body.text), /hello from a chat/);

      const traversal = await get('/api/inbox/..%2Fsecrets.json');
      assert.ok(traversal.status >= 400, 'a path is refused');
    });

    await t.test('rooms are listed and a room reads back', async () => {
      const rooms = await get('/api/rooms');
      assert.equal(rooms.status, 200);
      assert.ok(Array.isArray(rooms.body.rooms));
      const one = await get('/api/rooms/telegram/-100123');
      assert.equal(one.status, 200);
      assert.equal(typeof one.body.history, 'string');
    });

    await t.test('watchers add, list and remove through the panel', async () => {
      const added = await send('/api/watchers', { action: 'add', path: '~/notes', match: '.md' });
      assert.equal(added.status, 200);
      const id = (added.body.added as { id: string }).id;
      assert.ok(id, 'an id came back');
      const listed = await get('/api/watchers');
      assert.equal((listed.body.watchers as { id: string }[]).length, 1);
      const cfg = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8')) as { watchers: { path: string }[] };
      assert.equal(cfg.watchers[0]!.path, '~/notes');

      const gone = await send('/api/watchers', { action: 'rm', id });
      assert.equal(gone.status, 200);
      assert.equal(((await get('/api/watchers')).body.watchers as unknown[]).length, 0);
      const missing = await send('/api/watchers', { action: 'rm', id: 'nope' });
      assert.equal(missing.status, 404);
    });

    await t.test('tool toggles write the config keys the catalog shows', async () => {
      const off = await send('/api/tools/toggle', { tool: 'exec', enabled: false });
      assert.equal(off.status, 200);
      assert.equal(off.body.enabled, false);
      const on = await send('/api/tools/toggle', { tool: 'browser', enabled: true });
      assert.equal(on.body.enabled, true);
      assert.equal(on.body.tool, 'allowBrowser');
      const bad = await send('/api/tools/toggle', { tool: 'teleport' });
      assert.equal(bad.status, 400);
      assert.match(String(bad.body.error), /toggles:/);
    });
  } finally {
    await handle.stop();
  }
});

test('52.2 the panel shows the security findings and secret names, never a value', async (t) => {
  tmpHome('t52b-');
  const { get, handle } = await panel();
  try {
    await t.test('security findings arrive with their fixes', async () => {
      const r = await get('/api/security');
      assert.equal(r.status, 200);
      const findings = r.body.findings as { level: string; title: string; fix?: string }[];
      assert.ok(findings.length > 0, 'the audit always has something to say');
      for (const f of findings) assert.ok(f.title, 'a finding has a title');
      assert.equal(typeof r.body.notable, 'number');
    });

    await t.test('secrets are names and timestamps only', async () => {
      const { setSecret } = await import('../src/agent/secrets.js');
      setSecret('OPENAI_KEY', 'sk-super-secret-value');
      const r = await get('/api/secrets');
      assert.equal(r.status, 200);
      const one = (r.body.secrets as { name: string }[]).find((s) => s.name === 'OPENAI_KEY');
      assert.ok(one, 'the name is there');
      assert.ok(!JSON.stringify(r.body).includes('sk-super-secret-value'), 'the value never leaves the store');
    });
  } finally {
    await handle.stop();
  }
});

test('52.3 a chat can decide a proposal and add a cron job', async (t) => {
  tmpHome('t52c-');
  const deps = { agent: {}, skills: { list: () => [] }, proposals: () => listProposals() };

  await t.test('/cron add writes a job through the shared parser', async () => {
    const added = await runReportCommand('/cron add "0 8 * * *" give me a briefing --name morning', deps);
    assert.ok(added?.ok, 'the command is handled');
    assert.match(added.text, /added/);
    assert.match(added.text, /morning/);
    const bad = await runReportCommand('/cron add "not a cron" do things', deps);
    assert.equal(bad?.ok, false);
    const usage = await runReportCommand('/cron add', deps);
    assert.equal(usage?.ok, false);
    assert.match((usage as { error: string }).error, /usage: \/cron add/);
    // the same store the CLI reads (`loadCrons()` is what `termcrab cron ls` calls)
    const { loadCrons } = await import('../src/cron/store.js');
    const jobs = loadCrons();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]!.name, 'morning');
  });

  await t.test('/skills approve makes a proposal live, and refuses a stranger', async () => {
    const missing = await runReportCommand('/skills approve nobody', deps);
    assert.equal(missing?.ok, false);
    assert.match((missing as { error: string }).error, /no proposal/);

    // A real proposal, made the way the agent makes one.
    const { proposeSkill } = await import('../src/skills/proposals.js');
    const made = proposeSkill({
      name: 'weather',
      description: 'ask about the sky',
      content: 'When asked, look outside.',
      by: 'agent',
    });
    assert.equal(made.ok, true, made.error ?? 'the proposal was written');
    const shown = await runReportCommand('/skills show weather', deps);
    assert.ok(shown?.ok);
    assert.match(shown.text, /look outside/);
    const approved = await runReportCommand('/skills approve weather', deps);
    assert.ok(approved?.ok, 'the approval succeeded');
    assert.match(approved.text, /approved weather/);
    const { userSkillsDir } = await import('../src/core/paths.js');
    assert.ok(fs.existsSync(path.join(userSkillsDir(), 'weather', 'SKILL.md')), 'it is live now');

    const rejected = await runReportCommand('/skills reject gone missing detail', deps);
    assert.equal(rejected?.ok, false);
    void rejectProposal;
  });
});

test('52.4 the CLI has the suite clock and the tracker as commands', async () => {
  tmpHome('t52d-');
  const CLI = path.join(process.cwd(), 'dist', 'src', 'bin', 'termcrab.js');
  const run = (args: string[], env: Record<string, string> = {}): Promise<{ code: number; stdout: string }> =>
    new Promise((resolve) => {
      execFile(
        process.execPath,
        [CLI, ...args],
        { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', ...env }, timeout: 60_000 },
        (err, stdout) => resolve({ code: err && 'code' in err ? Number(err.code) || 1 : 0, stdout: String(stdout) }),
      );
    });

  const clock = await run(['suite-time']);
  assert.equal(clock.code, 0);
  assert.match(clock.stdout, /suite:/);
  const clockJson = await run(['suite-time', '--json']);
  const envelope = JSON.parse(clockJson.stdout) as { ok: boolean; command: string; data: { cases: number; files: number } };
  assert.equal(envelope.ok, true);
  assert.equal(envelope.command, 'suite-time');
  assert.ok(envelope.data.cases > 0, 'the record carries the case count');

  const work = await run(['work']);
  assert.equal(work.code, 0);
  assert.match(work.stdout, /WORKLOG\.md/);
  const full = await run(['work', '--full']);
  assert.match(full.stdout, /## 2\. Now/);
  const workJson = JSON.parse((await run(['work', '--json'])).stdout) as { data: { now: string[] } };
  assert.ok(workJson.data.now.length >= 4, 'the Now rows are data too');
});

test('52.5 rename, export, and a spoken reply as a file', async (t) => {
  tmpHome('t52e-');
  const { get, send, post, handle } = await panel();

  try {
    await t.test('a session renames and exports as markdown', async () => {
      const { SessionStore } = await import('../src/agent/sessions.js');
      const store = new SessionStore();
      store.append('cli:main', { role: 'user', content: 'ping', ts: Date.now() });
      store.append('cli:main', { role: 'assistant', content: 'pong', ts: Date.now() });

      const renamed = await send('/api/sessions/cli:main/rename', { to: 'cli:renamed' });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.id, 'cli:renamed');
      const conflict = await send('/api/sessions/cli:renamed/rename', { to: 'cli:renamed' });
      assert.equal(conflict.status, 409, 'clobbering an existing name is refused');
      const bad = await send('/api/sessions/cli:renamed/rename', { to: 'bad name!' });
      assert.equal(bad.status, 400);
      const missing = await send('/api/sessions/nope/rename', { to: 'x' });
      assert.equal(missing.status, 404);

      // The route predates this batch (v0.5 P1); the panel rail is what 52.5
      // added, and this pins the shape the rail's Export button downloads.
      const exported = await get('/api/sessions/cli:renamed/export');
      assert.equal(exported.status, 200);
      assert.equal(exported.body.id, 'cli:renamed');
      assert.match(String(exported.body.markdown), /# Chat: cli:renamed/);
      assert.match(String(exported.body.markdown), /pong/);
      const missingExport = await get('/api/sessions/nope/export');
      assert.equal(missingExport.status, 404);
    });

    await t.test('/api/voice answers with a file or the install hint', async () => {
      const empty = await send('/api/voice', { text: '' });
      assert.equal(empty.status, 400);
      // The synthesizer may or may not exist on this machine; both answers are
      // correct, and the test pins whichever one happened.
      const res = await post('/api/voice', { text: 'hello there' });
      if (res.status === 200) {
        const buf = Buffer.from(await res.arrayBuffer());
        assert.ok(buf.byteLength > 0, 'audio bytes came back');
        assert.match(res.headers.get('content-type') ?? '', /audio\//);
      } else {
        assert.equal(res.status, 422);
        const body = (await res.json()) as { error: string; hint: string };
        assert.match(body.hint, /espeak-ng/);
      }
    });
  } finally {
    await handle.stop();
  }
});
