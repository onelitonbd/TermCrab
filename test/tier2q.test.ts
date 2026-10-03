import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { MAIN_SESSION, rollMainSession, rollingLine, rollingSessionKey } from '../src/agent/rolling.js';
import { SessionStore } from '../src/agent/sessions.js';
import { startGateway, type GatewayHandle } from '../src/gateway/server.js';
import { defaults, saveConfig, validateConfig } from '../src/core/config.js';

/**
 * Batch 28 — sessions.
 *
 * 28.1 one rolling main session for the owner across the panel, the terminal
 * and their Telegram DM, archived daily; 28.2 several clients attached to one
 * conversation without a message lost; 28.3 one gateway, several people, each
 * fact carrying who said it and (optionally) each person their own thread.
 */

function home(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t28-${tag}-`));
  process.env.TCRAB_HOME = dir;
  return dir;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
}

// ---------------------------------------------------------------------------
// 28.1 — which surface lands in the main session
// ---------------------------------------------------------------------------

test('28.1 the owner surfaces share one main session; everything else keeps its key', () => {
  const config = defaults();
  const key = (channel: string, chatId: string, group = false): string =>
    rollingSessionKey(config, { fallback: `${channel}:${chatId}`, channel, chatId, group });

  for (const surface of ['web', 'cli', 'voice', 'terminal', 'repl']) {
    assert.equal(key(surface, 'main'), MAIN_SESSION, `${surface} is the owner speaking`);
  }
  // The owner's Telegram DM — and only the owner's.
  config.channels.telegram = { token: 't', allowedUserIds: [42, 43] };
  assert.equal(key('telegram', '42'), MAIN_SESSION);
  assert.equal(key('telegram', '43'), MAIN_SESSION, 'every allowed id is an owner id');
  assert.equal(key('telegram', '99'), 'telegram:99', 'a stranger gets their own thread');
  assert.equal(key('telegram', '-100123', true), 'telegram:-100123', 'a group never shares the owner thread');
  // Scheduled and internal work is nobody speaking.
  for (const [channel, id] of [['cron', 'morning'], ['heartbeat', 'main'], ['dream', 'night'], ['subagent', 'task-1'], ['wake', 'main']] as const) {
    assert.equal(key(channel, id), `${channel}:${id}`);
  }
});

test('28.1 a custom name and an opt-out both work', () => {
  const config = defaults();
  config.agent.mainSession = 'desk';
  assert.equal(rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' }), 'desk');
  assert.match(rollingLine(config, 'desk'), /this is the main session/);
  assert.match(rollingLine(config, 'cron:morning'), /its own thread/);

  config.agent.rollingSession = false;
  assert.equal(rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' }), 'web:main');
  assert.match(rollingLine(config, 'desk'), /rolling is off/);
  // And the config accepts both keys without complaint.
  const problems = validateConfig(config);
  assert.equal(problems.filter((p) => p.path.includes('rollingSession') || p.path.includes('mainSession')).length, 0);
});

// ---------------------------------------------------------------------------
// 28.1 — the roll-over itself
// ---------------------------------------------------------------------------

test('28.1 the main session rolls over on the first turn of a new day, and the archive keeps the old day', () => {
  home('roll');
  const store = new SessionStore();
  const yesterday = Date.now() - 26 * 60 * 60 * 1000;
  store.append('main', { role: 'user', content: 'what is on the board today?', ts: yesterday });
  store.append('main', { role: 'assistant', content: 'three things', ts: yesterday + 1000 });

  const first = rollMainSession(store, 'main');
  assert.equal(first.rolled, true);
  assert.equal(first.entries, 2);
  assert.ok(first.archivedTo, 'the archive path is reported');

  const live = store.readHot('main');
  assert.equal(live.length, 1, 'the new thread has exactly the note');
  assert.equal(live[0]!.role, 'system');
  assert.match(live[0]!.content as string, /^\[rolling\]/);
  assert.match(live[0]!.content as string, /2 entries/);
  assert.match(live[0]!.content as string, /sessions search/, 'the note says how to find it again');
  // Nothing is lost: the archive is still part of the session.
  assert.equal(store.read('main').length, 3);

  const archived = fs.readFileSync(store.archivePath('main'), 'utf8').trim().split('\n');
  assert.equal(archived.length, 2, 'nothing is deleted — the old day is in the archive');

  const again = rollMainSession(store, 'main');
  assert.equal(again.rolled, false, 'the same day does not roll twice');
  assert.match(again.reason, /already talking today/);
});

test('28.1 an empty session has nothing to roll', () => {
  home('empty');
  const store = new SessionStore();
  const out = rollMainSession(store, 'main');
  assert.equal(out.rolled, false);
  assert.equal(out.archivedTo, null);
  assert.match(out.reason, /nothing to roll/);
});

// ---------------------------------------------------------------------------
// 28.2 — several clients on one conversation
// ---------------------------------------------------------------------------

test('28.2 /attach streams this session only, and the viewer count is real', async () => {
  const dir = home('attach');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'test-token';
  config.gateway.port = await freePort();
  saveConfig(config);

  let handle: GatewayHandle | undefined;
  try {
    handle = await startGateway({ config, host: '127.0.0.1', port: config.gateway.port });
    const base = `http://127.0.0.1:${config.gateway.port}`;
    const auth = { authorization: 'Bearer test-token' };

    assert.equal((await fetch(`${base}/api/sessions/nobody/attach`, { headers: auth })).status, 404);

    const store = handle.agent.sessions;
    store.append('main', { role: 'user', content: 'the phone said this', ts: Date.now() });

    const ac = new AbortController();
    const res = await fetch(`${base}/api/sessions/main/attach`, { headers: auth, signal: ac.signal });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') ?? '', /text\/event-stream/);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const state = await (async () => {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const { value } = await reader.read();
        if (!value) break;
        buf += decoder.decode(value, { stream: true });
        if (buf.includes('event: state')) return buf;
      }
      throw new Error(`no state frame: ${buf}`);
    })();
    assert.match(state, /"sessionId":"main"/);
    assert.match(state, /the phone said this/, 'the tail is there — a fresh tab catches up');
    assert.match(state, /"viewers":1/);

    // A second client on the same conversation.
    const ac2 = new AbortController();
    const res2 = await fetch(`${base}/api/sessions/main/attach`, { headers: auth, signal: ac2.signal });
    const reader2 = res2.body!.getReader();
    const first2 = decoder.decode((await reader2.read()).value ?? new Uint8Array(), { stream: true });
    assert.match(first2, /"viewers":2/, 'the second client is counted');

    const list = (await (await fetch(`${base}/api/sessions`, { headers: auth })).json()) as {
      sessions: { id: string; viewers: number; running: string | null }[];
    };
    const main = list.sessions.find((s) => s.id === 'main');
    assert.ok(main, 'main is listed');
    assert.equal(main!.viewers, 2);

    // A frame for another session must not reach this stream (28.2 is
    // per-conversation, not a second copy of /api/events).
    store.append('elsewhere', { role: 'user', content: 'not for main', ts: Date.now() });
    const { bus } = await import('../src/gateway/events.js');
    bus.emit({ type: 'delta', sessionId: 'elsewhere', text: 'not for main' } as never);
    bus.emit({ type: 'delta', sessionId: 'main', text: 'this one is for main' } as never);
    const got = await (async () => {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const { value } = await reader.read();
        if (!value) break;
        buf += decoder.decode(value, { stream: true });
        if (buf.includes('this one is for main')) return buf;
      }
      throw new Error(`no delta frame: ${buf}`);
    })();
    assert.match(got, /for main/);
    assert.equal(got.includes('not for main'), false, 'another conversation never leaks in');

    ac.abort();
    ac2.abort();
    await new Promise((r) => setTimeout(r, 150));
    const after = (await (await fetch(`${base}/api/sessions`, { headers: auth })).json()) as {
      sessions: { id: string; viewers: number }[];
    };
    assert.equal(after.sessions.find((s) => s.id === 'main')?.viewers, 0, 'closing a tab releases the viewer');
    void dir;
  } finally {
    await handle?.stop();
  }
});

test('28.2 the panel chat without a session id lands in the rolling main session', async () => {
  home('chatdefault');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'test-token';
  config.gateway.port = await freePort();
  saveConfig(config);

  let handle: GatewayHandle | undefined;
  try {
    handle = await startGateway({ config, host: '127.0.0.1', port: config.gateway.port });
    const base = `http://127.0.0.1:${config.gateway.port}`;
    const auth = { authorization: 'Bearer test-token', 'content-type': 'application/json' };

    const dflt = (await (
      await fetch(`${base}/api/chat`, { method: 'POST', headers: auth, body: JSON.stringify({ message: 'hello from the panel' }) })
    ).json()) as { sessionId: string };
    assert.equal(dflt.sessionId, 'main');

    const named = (await (
      await fetch(`${base}/api/chat`, { method: 'POST', headers: auth, body: JSON.stringify({ message: 'hi', sessionId: 'scratch' }) })
    ).json()) as { sessionId: string };
    assert.equal(named.sessionId, 'scratch', 'an explicit session id is honoured');

    const status = (await (await fetch(`${base}/api/status`, { headers: auth })).json()) as {
      sessions: { main: string; rolling: boolean; note: string };
    };
    assert.equal(status.sessions.main, 'main');
    assert.equal(status.sessions.rolling, true);
    assert.match(status.sessions.note, /main session/);
  } finally {
    await handle?.stop();
  }
});

// ---------------------------------------------------------------------------
// 28.3 — one gateway, several people
// ---------------------------------------------------------------------------

test('28.3 scoping=user gives each person their own thread, and the fact carries who said it', async () => {
  home('scoping');
  const config = defaults();
  config.channels.telegram = { token: 't', allowedUserIds: [42], scoping: 'user' };
  assert.equal(rollingSessionKey(config, { fallback: 'telegram:-100', channel: 'telegram', chatId: '-100', group: true }), 'telegram:-100');

  assert.equal(validateConfig(config).filter((p) => p.path.includes('scoping')).length, 0);

  // 'chat' (the default) is what a group wants; 'user' is what a person wants.
  const chatScoped = defaults();
  chatScoped.channels.telegram = { token: 't', allowedUserIds: [42] };
  assert.equal(rollingSessionKey(chatScoped, { fallback: 'telegram:7', channel: 'telegram', chatId: '7' }), 'telegram:7');

  // The provenance: a run started by a person names that person.
  const { startRun, listRuns, clearRuns } = await import('../src/core/tracing.js');
  clearRuns();
  startRun('run-28-3', 'telegram:7', 'mock', 'mock-1', { user: '7' });
  startRun('run-28-3b', 'cron:morning', 'mock', 'mock-1');
  const runs = listRuns();
  assert.equal(runs.find((r) => r.runId === 'run-28-3')?.user, '7');
  assert.equal(runs.find((r) => r.runId === 'run-28-3b')?.user, undefined, 'scheduled work has no person');
  clearRuns();
});

// ---------------------------------------------------------------------------
// 28.1 — the loop actually rolls the main session before the turn reads it
// ---------------------------------------------------------------------------

test('28.1 a turn on the main session rolls it and says so in the events', async () => {
  home('turnroll');
  const { runTurn } = await import('../src/agent/loop.js');
  const { MemoryStore } = await import('../src/agent/memory.js');
  const { SkillStore } = await import('../src/skills/loader.js');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const dir = process.env.TCRAB_HOME!;
  const sessions = new SessionStore();
  const yesterday = Date.now() - 26 * 60 * 60 * 1000;
  sessions.append('main', { role: 'user', content: 'yesterday', ts: yesterday });
  const agent = {
    config,
    memory: new MemoryStore(path.join(dir, 'memory')),
    sessions,
    skills: new SkillStore([{ dir: path.join(dir, 'skills'), origin: 'user' }]),
  } as unknown as Parameters<typeof runTurn>[0];

  const events: { type: string; reason?: string }[] = [];
  await runTurn(agent, { sessionId: 'main', userMessage: 'good morning', channel: 'web', onEvent: (e) => events.push(e as never) });

  const reset = events.find((e) => e.type === 'session:reset');
  assert.ok(reset, 'the roll is announced');
  assert.equal(reset!.reason, 'rolling');
  assert.equal(fs.readFileSync(sessions.archivePath('main'), 'utf8').trim().split('\n').length, 1, 'yesterday is archived');
  assert.equal(sessions.readHot('main').some((e) => 'content' in e && e.content === 'yesterday'), false, 'and is not in the new thread');
  assert.ok(sessions.readHot('main').some((e) => 'content' in e && e.content.startsWith('[rolling]')), 'the fresh thread starts with the note');

  // A session that is not the main one is left alone.
  sessions.append('cron:morning', { role: 'user', content: 'yesterday job', ts: yesterday });
  const before = sessions.readHot('cron:morning').length;
  await runTurn(agent, { sessionId: 'cron:morning', userMessage: 'today', channel: 'cron' });
  assert.equal(sessions.readHot('cron:morning').length > before, true, 'the scheduled thread keeps its own history');
  assert.ok(sessions.readHot('cron:morning').some((e) => 'content' in e && e.content === 'yesterday job'));
});

test('28.1 sessions show names the main session without a word of config', async () => {
  const dir = home('show');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const store = new SessionStore();
  store.append('main', { role: 'user', content: 'hi', ts: Date.now() });
  store.append('cron:morning', { role: 'user', content: 'tick', ts: Date.now() });

  const ls = await run(process.execPath, [path.join(process.cwd(), 'dist/src/bin/termcrab.js'), 'sessions', 'ls'], {
    env: { ...process.env, TCRAB_HOME: dir },
  });
  assert.match(ls.stdout, /main\s+1 messages.*← main \(panel \+ terminal \+ your Telegram DM\)/);

  const show = await run(process.execPath, [path.join(process.cwd(), 'dist/src/bin/termcrab.js'), 'sessions', 'show', 'main'], {
    env: { ...process.env, TCRAB_HOME: dir },
  });
  assert.match(show.stdout, /🔄 .*main session/);

  const json = await run(process.execPath, [path.join(process.cwd(), 'dist/src/bin/termcrab.js'), 'sessions', 'show', 'main', '--json'], {
    env: { ...process.env, TCRAB_HOME: dir },
  });
  const parsed = JSON.parse(json.stdout) as { data: { rolling: string } };
  assert.match(parsed.data.rolling, /main session/);
});
