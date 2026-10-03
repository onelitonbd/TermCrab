/**
 * Batch 10 — the Tier-0 sweep: seven small flips, each one a census row.
 *
 *   10.1 a broken config can never break a running agent   (validate before apply)
 *   10.2 a script can wait for a run                       (run ids + terminal wait)
 *   10.3 stop a running turn from outside                  (panel/CLI, not just Esc)
 *   10.4 progress drafts arrive while the agent works      (non-streaming included)
 *   10.5 skill precedence: user > bundled, with an allow-list
 *   10.6 a disk budget that trims the oldest, never crashes the phone
 *   10.7 release discipline: version and CHANGELOG cannot drift
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { AgentCtx, AgentEvent, runTurn } from '../src/agent/loop.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';
import { Config, defaults, saveConfig, validateConfig } from '../src/core/config.js';
import { configPath } from '../src/core/paths.js';
import { diskUsage, enforceDiskBudget } from '../src/core/disk.js';
import { GatewayHandle, startGateway } from '../src/gateway/server.js';
import { Provider } from '../src/providers/types.js';

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

/** Delay per message: containing "slowly" takes `slowMs`, otherwise `delayMs`. */
function slowUpstream(
  delayMs: number,
  calls?: string[],
  slowMs = 3000,
): { server: http.Server; sockets: Set<net.Socket> } {
  const sockets = new Set<net.Socket>();
  const server = http.createServer((rq, rs) => {
    const chunks: Buffer[] = [];
    rq.on('data', (c) => chunks.push(c));
    rq.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
        messages?: { role?: string; content?: string }[];
      };
      const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user');
      const text = String(lastUser?.content ?? '').trim();
      calls?.push(text);
      setTimeout(() => {
        rs.writeHead(200, { 'content-type': 'application/json' });
        rs.end(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content: `echo:${text}` }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
          }),
        );
      }, /slowly/i.test(text) ? slowMs : delayMs);
    });
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  return { server, sockets };
}

interface Booted {
  home: string;
  config: Config;
  handle: GatewayHandle;
  base: string;
  close: () => Promise<void>;
  upstream: http.Server;
}

async function bootGateway(opts: { delayMs?: number; token?: string; stream?: boolean } = {}): Promise<Booted> {
  const home = tmpHome('ttier0-');
  const calls: string[] = [];
  const { server: upstream, sockets } = slowUpstream(opts.delayMs ?? 60, calls);
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upPort = (upstream.address() as net.AddressInfo).port;
  const config = defaults();
  config.provider = {
    type: 'openai',
    baseUrl: `http://127.0.0.1:${upPort}`,
    apiKey: 'sk-test',
    model: 'slow-1',
    stream: opts.stream ?? false,
  };
  config.gateway.token = opts.token ?? '';
  const port = await freePort();
  config.gateway.port = port;
  saveConfig(config);
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  return {
    home,
    config,
    handle,
    base: `http://127.0.0.1:${port}`,
    upstream,
    close: async () => {
      await handle.stop();
      // A delayed reply still pending must not hold the test run open.
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => upstream.close(() => resolve()));
      fs.rmSync(home, { recursive: true, force: true });
    },
  };
}

async function runCli(args: string[], home: string): Promise<{ stdout: string; code: number }> {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    const { stdout } = await execFileAsync(process.execPath, [bin, ...args], {
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
      timeout: 30_000,
    });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.code ?? 1 };
  }
}

async function postChat(base: string, message: string, sessionId: string, token = ''): Promise<string> {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ message, sessionId }),
  });
  assert.equal(res.status, 202, 'the turn is accepted');
  return ((await res.json()) as { turnId: string }).turnId;
}

async function waitTurn(base: string, sessionId: string, turnId: string, ms = 15_000): Promise<Record<string, unknown>> {
  const deadline = Date.now() + ms;
  for (;;) {
    const res = await fetch(`${base}/api/runs/${encodeURIComponent(turnId)}`);
    if (res.status === 200) {
      const body = (await res.json()) as Record<string, unknown>;
      if (['done', 'error', 'interrupted'].includes(String(body.status))) return body;
    }
    assert.ok(Date.now() < deadline, 'the turn reaches a terminal state in time');
    await sleep(60);
  }
}

// ------------------------------------------------------------------ 10.1

test('10.1 a broken config is named and refused, never applied', async (t) => {
  await t.test('validateConfig points at the key that is wrong', () => {
    const problems = validateConfig({ gateway: { port: 'nope', token: 5 }, provider: { type: 'banana' } });
    const paths = problems.map((p) => p.path);
    assert.ok(paths.includes('gateway.port'), `gateway.port must be reported, got ${paths.join(', ')}`);
    assert.ok(paths.includes('provider.type'), 'an unknown provider type must be reported');
    assert.deepEqual(validateConfig(defaults() as unknown as Record<string, unknown>), [], 'the defaults are valid');
  });

  await t.test('live: a bad edit leaves the running gateway untouched', async () => {
    const boot = await bootGateway({ delayMs: 40 });
    try {
      fs.writeFileSync(configPath(), '{ "gateway": { "port": "not-a-port" }', 'utf8'); // torn JSON
      await sleep(400);
      type ConfigView = {
        config?: { provider?: { model?: string } };
        configProblems?: { path: string; message: string }[];
      };
      const cfg = (await (await fetch(`${boot.base}/api/config`)).json()) as ConfigView;
      assert.equal(cfg.config?.provider?.model, 'slow-1', 'the running config is unchanged');
      assert.ok(Array.isArray(cfg.configProblems) && cfg.configProblems.length > 0, 'the panel is told what is wrong');

      // A valid edit still hot-applies (the guard must not block real changes).
      const good = JSON.parse(JSON.stringify(defaults())) as Config;
      good.provider = { ...boot.config.provider, model: 'slow-2' };
      good.gateway = boot.config.gateway;
      fs.writeFileSync(configPath(), JSON.stringify(good), 'utf8');
      await sleep(400);
      const after = (await (await fetch(`${boot.base}/api/config`)).json()) as {
        config?: { provider?: { model?: string } };
        configProblems?: unknown[];
      };
      assert.equal(after.config?.provider?.model, 'slow-2', 'a valid edit is applied');
      assert.deepEqual(after.configProblems, [], 'and the warning clears');
    } finally {
      await boot.close();
    }
  });
});

// ------------------------------------------------------------------ 10.2

test('10.2 a script can wait for a run and read its result', async (t) => {
  const boot = await bootGateway({ delayMs: 250 });
  try {
    const turnId = await postChat(boot.base, 'hello waiter', 'web:wait');
    const running = (await (await fetch(`${boot.base}/api/runs/${turnId}`)).json()) as { status: string; sessionId?: string };
    assert.ok(['queued', 'running'].includes(running.status), `not finished yet, got ${running.status}`);
    assert.equal(running.sessionId, 'web:wait', 'the run knows its session');

    const { stdout, code } = await runCli(['run', '--wait', turnId], boot.home);
    assert.equal(code, 0, `wait exits 0 for a finished run:\n${stdout}`);
    assert.match(stdout, /echo:hello waiter/, 'and prints the run output');

    // The short alias does the same thing.
    const alias = await runCli(['wait', turnId], boot.home);
    assert.equal(alias.code, 0, 'the `wait` alias works too');
    assert.match(alias.stdout, /echo:hello waiter/);

    // A run that never finishes exits non-zero, and says why.
    const slowId = await postChat(boot.base, 'slowly never mind', 'web:wait');
    const timed = await runCli(['run', '--wait', slowId, '--timeout', '0.2'], boot.home);
    assert.notEqual(timed.code, 0, 'a timeout is a failure, not a silent success');
    assert.match(timed.stdout, /still running|timeout/i);
  } finally {
    await boot.close();
  }
});

// ------------------------------------------------------------------ 10.3

test('10.3 a running turn can be stopped from outside, and keeps what it said', async (t) => {
  const boot = await bootGateway({ delayMs: 4000 });
  try {
    const turnId = await postChat(boot.base, 'long one', 'web:stop');
    await sleep(300); // let it start
    const stop = await fetch(`${boot.base}/api/stop`, { method: 'POST' });
    assert.equal(stop.status, 200);
    const body = (await stop.json()) as { stopped?: string[] };
    assert.ok(Array.isArray(body.stopped) && body.stopped.length >= 1, 'the stop reports what it stopped');

    const turn = await waitTurn(boot.base, 'web:stop', turnId);
    assert.equal(turn.status, 'interrupted');
    assert.match(String(turn.output ?? ''), /\[interrupted\]/, 'the partial answer is kept, not thrown away');
    const status = (await (await fetch(`${boot.base}/api/status`)).json()) as { queue: { running: number; waiting: number } };
    assert.deepEqual(status.queue, { sessions: 0, running: 0, waiting: 0 }, 'no orphaned work is left running');

    await t.test('the CLI can stop a run too', async () => {
      await postChat(boot.base, 'another long one', 'web:stop2');
      await sleep(300);
      const { stdout, code } = await runCli(['stop'], boot.home);
      assert.equal(code, 0, `stop exits 0:\n${stdout}`);
      assert.match(stdout, /stopped 1|stopped/i);
    });
  } finally {
    await boot.close();
  }
});

// ------------------------------------------------------------------ 10.4

test('10.4 progress drafts reach the client while the agent is still working', async () => {
  const home = tmpHome('ttier0-draft-');
  const config = defaults();
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo\n---\n\nbody\n');

  // A provider that answers nothing for two tool rounds: exactly the case where
  // a non-streaming server leaves the panel silent until the very end.
  let round = 0;
  const provider: Provider = {
    name: 'scripted',
    model: 'scripted-1',
    async chat() {
      round++;
      if (round <= 2) {
        return {
          text: `working on step ${round}`,
          toolCalls: [{ id: `call-${round}`, name: 'get_time', args: { step: round } }],
          stopReason: 'tool',
        };
      }
      return { text: 'final answer', toolCalls: [], stopReason: 'end' };
    },
  };
  const ctx: AgentCtx = {
    config,
    memory: new MemoryStore(path.join(home, 'memory')),
    skills: new SkillStore([{ dir: skillRoot, origin: 'user' }]),
    sessions: new SessionStore(path.join(home, 'sessions')),
    provider,
  };
  const events: AgentEvent[] = [];
  const reply = await runTurn(ctx, { sessionId: 'draft:1', userMessage: 'do the thing', onEvent: (e) => events.push(e) });

  const drafts = events.filter((e): e is Extract<AgentEvent, { type: 'draft' }> => e.type === 'draft');
  assert.ok(drafts.length >= 2, `at least two drafts before the final text, got ${drafts.length}`);
  const end = events.findIndex((e) => e.type === 'run:end');
  const lastDraft = events.map((e) => e.type).lastIndexOf('draft');
  assert.ok(lastDraft < end, 'drafts arrive before the turn ends');
  assert.match(drafts[drafts.length - 1]!.text, /working on step 2/, 'the draft carries the partial answer');
  for (const d of drafts) {
    assert.ok(typeof d.sessionId === 'string' && d.sessionId.length > 0, 'a draft knows its session');
  }
  assert.equal(reply, 'final answer');
  fs.rmSync(home, { recursive: true, force: true });
});

// ------------------------------------------------------------------ 10.5

test('10.5 skill precedence is user > bundled, and an allow-list gates loading', async () => {
  const home = tmpHome('ttier0-skills-');
  const builtin = path.join(home, 'builtin');
  const user = path.join(home, 'user');
  for (const [root, body] of [
    [builtin, 'BUNDLED BODY'],
    [user, 'USER BODY'],
  ] as const) {
    fs.mkdirSync(path.join(root, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(root, 'shared', 'SKILL.md'), `---\nname: shared\ndescription: from ${body}\n---\n\n${body}\n`);
  }
  fs.mkdirSync(path.join(user, 'extra'), { recursive: true });
  fs.writeFileSync(path.join(user, 'extra', 'SKILL.md'), '---\nname: extra\ndescription: only in user\n---\n\nEXTRA BODY\n');

  const roots = [
    { dir: builtin, origin: 'builtin' as const },
    { dir: user, origin: 'user' as const },
  ];
  const open = new SkillStore(roots);
  assert.equal(open.list().find((s) => s.name === 'shared')?.origin, 'user', 'the user skill wins');
  assert.match(open.get('shared')?.content ?? '', /USER BODY/, 'and its content is the one served');
  assert.ok(open.get('extra'), 'a user-only skill is loaded');

  const gated = new SkillStore(roots, { allow: ['extra'] });
  assert.deepEqual(gated.list().map((s) => s.name), ['extra'], 'the allow-list gates what loads');
  assert.equal(gated.get('shared'), null, 'a gated skill is not served to the prompt');
  fs.rmSync(home, { recursive: true, force: true });
});

// ------------------------------------------------------------------ 10.6

test('10.6 a disk budget trims the oldest and reports what it freed', () => {
  const home = tmpHome('ttier0-disk-');
  const sessions = path.join(home, 'sessions');
  const logs = path.join(home, 'logs');
  fs.mkdirSync(sessions, { recursive: true });
  fs.mkdirSync(logs, { recursive: true });
  const old = path.join(sessions, 'old.jsonl');
  const fresh = path.join(sessions, 'fresh.jsonl');
  const oldLog = path.join(logs, 'old.log');
  fs.writeFileSync(old, 'x'.repeat(2000) + '\n');
  fs.writeFileSync(fresh, 'y'.repeat(100) + '\n');
  fs.writeFileSync(oldLog, 'z'.repeat(1000) + '\n');
  const longAgo = new Date(Date.now() - 30 * 86_400_000);
  fs.utimesSync(old, longAgo, longAgo);
  fs.utimesSync(oldLog, longAgo, longAgo);

  const before = diskUsage();
  assert.ok(before.totalBytes >= 3100, `usage counts real bytes, got ${before.totalBytes}`);
  assert.ok((before.byArea.sessions ?? 0) >= 2100, 'and breaks them down by area');

  const result = enforceDiskBudget(1000, { keepDays: 7 });
  assert.ok(result.freedBytes >= 3000, `freed bytes are reported, got ${result.freedBytes}`);
  assert.equal(fs.existsSync(old), false, 'the old transcript is gone');
  assert.equal(fs.existsSync(oldLog), false, 'the old log is gone');
  assert.equal(fs.existsSync(fresh), true, 'the fresh transcript is untouched');

  const under = enforceDiskBudget(10 * 1024 * 1024, { keepDays: 7 });
  assert.deepEqual({ removed: under.removed, freedBytes: under.freedBytes }, { removed: 0, freedBytes: 0 }, 'under budget nothing is deleted');
  fs.rmSync(home, { recursive: true, force: true });
});

// ------------------------------------------------------------------ 10.7

test('10.7 the release version and the CHANGELOG cannot drift apart', async (t) => {
  const repo = process.cwd();
  await t.test('the repo passes its own release check', async () => {
    const { stdout, code } = await runNode(['scripts/release.mjs', '--check'], repo);
    assert.equal(code, 0, `release --check must pass:\n${stdout}`);
    const pkg = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')) as { version: string };
    assert.match(stdout, new RegExp(pkg.version.replace(/\./g, '\\.')), 'the check names the version');
  });

  await t.test('a mismatched pair fails loudly', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trelease-'));
    fs.writeFileSync(
      path.join(tmp, 'package.json'),
      JSON.stringify({ name: 'termcrab', version: '9.9.9' }, null, 2),
    );
    fs.writeFileSync(path.join(tmp, 'CHANGELOG.md'), '# Changelog\n\n## 0.1.0 - 2020-01-01\n\n- old\n');
    const { stdout, code } = await runNode([path.join(repo, 'scripts/release.mjs'), '--check', '--root', tmp], repo);
    assert.notEqual(code, 0, 'a mismatch must fail the check');
    assert.match(stdout, /9\.9\.9/);
    assert.match(stdout, /0\.1\.0/);

    // The lock file carries the version too: a bump that forgets it must fail
    // here rather than surprise somebody running npm ci later.
    fs.writeFileSync(path.join(tmp, 'CHANGELOG.md'), '# Changelog\n\n## 9.9.9 - 2020-01-01\n\n- fixed\n');
    fs.writeFileSync(
      path.join(tmp, 'package-lock.json'),
      JSON.stringify({ name: 'termcrab', version: '9.9.8', lockfileVersion: 3, packages: { '': { version: '9.9.8' } } }, null, 2),
    );
    const stale = await runNode([path.join(repo, 'scripts/release.mjs'), '--check', '--root', tmp], repo);
    assert.notEqual(stale.code, 0, 'a stale lock file fails the release check');
    assert.match(stale.stdout, /package-lock\.json says 9\.9\.8/);
    assert.match(stale.stdout, /npm install --package-lock-only/, 'the fix is named');

    // And a bump writes both files together.
    const bumped = await runNode([path.join(repo, 'scripts/release.mjs'), '9.9.10', '--root', tmp], repo);
    assert.equal(bumped.code, 0, bumped.stdout);
    const lock = JSON.parse(fs.readFileSync(path.join(tmp, 'package-lock.json'), 'utf8')) as { version: string; packages: Record<string, { version: string }> };
    assert.equal(lock.version, '9.9.10');
    assert.equal(lock.packages['']!.version, '9.9.10', 'the bump keeps the lock in step');

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

async function runNode(args: string[], cwd: string): Promise<{ stdout: string; code: number }> {
  try {
    const { stdout } = await execFileAsync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 30_000 });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.code ?? 1 };
  }
}
