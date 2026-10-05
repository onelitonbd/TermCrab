/**
 * Batch 12 — the phone bets, proven.
 *
 * Tier 2 is where the moat lives ("the phone is the gateway"), and a moat you
 * cannot measure is a slogan. These five steps turn each claim into something a
 * person can re-run:
 *
 *   12.1 numbers: `scripts/bench.mjs` measures idle RSS, cold start, install,
 *        restart and a real turn — and the README quotes those measurements,
 *        naming the script and its tolerance.
 *   12.2 offline end-to-end: with the mock brain, the whole path (CLI → HTTP →
 *        queue → run → transcript) works with **zero** network attempts.
 *   12.3 the phone guide: every command it prints is a real command, and the
 *        OEM battery killers are covered by name.
 *   12.4 the first screen answers what / where / what it costs.
 *   12.5 the offline outbox delivers exactly once (not zero, not twice).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { SessionStore } from '../src/agent/sessions.js';
import { TelegramChannel } from '../src/channels/telegram.js';
import {
  outboxAck,
  outboxFail,
  outboxMarkSending,
  outboxPending,
  outboxPush,
  outboxSweep,
} from '../src/mobile/outbox.js';
import { probeModel } from '../src/providers/probe.js';

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
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

async function runCli(args: string[], home: string): Promise<{ stdout: string; code: number }> {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    const { stdout } = await execFileAsync(process.execPath, [bin, ...args], {
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
      timeout: 60_000,
    });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.code ?? 1 };
  }
}

/** A gateway on the offline mock brain, with `config.json` saved for the CLI. */
async function bootOffline(prefix: string): Promise<{ home: string; base: string; handle: GatewayHandle }> {
  const home = tmpHome(prefix);
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = '';
  const port = await freePort();
  config.gateway.port = port;
  saveConfig(config);
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  return { home, base: `http://127.0.0.1:${port}`, handle };
}

async function waitRun(base: string, turnId: string, ms = 20_000): Promise<Record<string, unknown>> {
  const deadline = Date.now() + ms;
  for (;;) {
    const res = await fetch(`${base}/api/runs/${encodeURIComponent(turnId)}`);
    if (res.status === 200) {
      const body = (await res.json()) as Record<string, unknown>;
      if (['done', 'error', 'interrupted'].includes(String(body.status))) return body;
    }
    assert.ok(Date.now() < deadline, 'the run reaches a terminal state in time');
    await sleep(60);
  }
}

// ------------------------------------------------------------------- 12.1

test('12.1 the numbers in the README are reproducible with the bench script', async () => {
  assert.ok(fs.existsSync('scripts/bench.mjs'), 'scripts/bench.mjs exists');
  const home = tmpHome('tbench-');
  const out = execFileSync(process.execPath, ['scripts/bench.mjs', '--quick', '--json'], {
    env: { ...process.env, TCRAB_HOME: home },
    encoding: 'utf8',
    timeout: 120_000,
  });
  const bench = JSON.parse(out) as {
    measuredAt: string;
    node: string;
    installMs: number;
    coldStartMs: number;
    idleRssMb: number;
    restartMs: number;
    turnMs: number;
    tolerancePct: number;
  };
  for (const key of ['measuredAt', 'node', 'installMs', 'coldStartMs', 'idleRssMb', 'restartMs', 'turnMs', 'tolerancePct']) {
    assert.ok(key in bench, `the bench reports ${key}`);
    assert.ok(bench[key as keyof typeof bench] !== undefined, `${key} has a value`);
  }
  const { idleRssMb, coldStartMs, turnMs, tolerancePct } = bench;
  assert.ok(idleRssMb > 5 && idleRssMb < 400, `idle RSS is a real memory reading, got ${idleRssMb} MB`);
  assert.ok(coldStartMs > 5 && coldStartMs < 30_000, `cold start is a real duration, got ${coldStartMs} ms`);
  assert.ok(turnMs >= 0 && turnMs < 60_000, `a turn is a real duration, got ${turnMs} ms`);
  assert.ok(tolerancePct >= 10, 'the script states how much a re-run may differ');

  const readme = fs.readFileSync('README.md', 'utf8');
  assert.match(readme, /scripts\/bench\.mjs/, 'the README names the script that produced the numbers');
  assert.match(readme, /BEGIN BENCH \(generated by scripts\/bench\.mjs\)/, 'and keeps them in a generated block');
  assert.match(readme, /tolerance|within ±\d+%/i, 'and states the tolerance');
  const rss = /idle RSS[^0-9]{0,60}(\d+(?:\.\d+)?)\s*MB/i.exec(readme);
  assert.ok(rss, 'the README quotes an idle RSS number');
  const quoted = Number(rss[1]);
  const live = idleRssMb;
  assert.ok(
    quoted <= live * 3 + 10 && quoted >= live / 3 - 10,
    `the quoted idle RSS (${quoted} MB) must be near this machine's (${live} MB) — a stale number is a lie`,
  );
  assert.match(readme, /cold start[^0-9]{0,60}\d+(\.\d+)?\s*m?s/i, 'cold start is quoted too');
  assert.match(readme, /npm install[^0-9]{0,80}\d+(\.\d+)?\s*(ms|s\b)/i, 'and the install time');
});

test('12.2 the whole loop runs with no network at all', async (t) => {
  const realFetch = globalThis.fetch;
  const external: string[] = [];
  globalThis.fetch = ((url: unknown, init?: unknown) => {
    const u = typeof url === 'string' ? url : String((url as { url?: string })?.url ?? url);
    if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/.test(u)) {
      external.push(u);
      throw new Error(`offline: nothing may leave the device (${u})`);
    }
    return realFetch(url as never, init as never);
  }) as typeof fetch;

  const boot = await bootOffline('toffline-');
  try {
    await t.test('a message goes in and a real answer comes out', async () => {
      const res = await fetch(`${boot.base}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'are you awake?', sessionId: 'web:flight' }),
      });
      assert.equal(res.status, 202, 'the turn is accepted');
      const { turnId } = (await res.json()) as { turnId: string };
      const run = await waitRun(boot.base, turnId);
      assert.equal(run.status, 'done');
      assert.match(String(run.output), /are you awake\?/, 'the offline brain answered the actual question');
      assert.deepEqual(external, [], 'and nothing reached for the network');
    });

    await t.test('the transcript kept both sides, and the CLI is the same path', async () => {
      // A mock turn may use a tool, so the shape is user → (assistant, tool)* →
      // assistant: what matters is that the question and the final answer are
      // both durable, on disk, in the session the phone can read later.
      const sessions = new SessionStore();
      const entries = sessions.read('web:flight');
      assert.equal(entries[0]?.role, 'user', 'the question starts the transcript');
      assert.equal(String(entries[0]?.content), 'are you awake?');
      const last = entries[entries.length - 1]!;
      assert.equal(last.role, 'assistant', 'the answer ends it');
      assert.match(String(last.content), /are you awake\?/, 'and carries the actual reply');
      const cli = await runCli(['run', 'still awake?'], boot.home);
      assert.equal(cli.code, 0, `the real CLI drove the panel: ${cli.stdout.slice(0, 200)}`);
      assert.match(cli.stdout, /still awake\?/, 'and printed the answer the panel produced');
      assert.deepEqual(external, [], 'no turn needed a network');
    });

    await t.test('even the model probe stays offline', async () => {
      const probe = await probeModel({ baseUrl: 'https://api.openai.com/v1', model: 'mock-1', offline: true });
      assert.equal(probe.offline, true, 'the mock brain is never probed over the network');
      assert.deepEqual(external, [], 'and probing did not try');
    });
  } finally {
    globalThis.fetch = realFetch;
    await boot.handle.stop();
    fs.rmSync(boot.home, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------- 12.3

test('12.3 every command the phone guide prints is a real command', () => {
  const help = execFileSync(process.execPath, ['dist/src/bin/termcrab.js', 'help'], { encoding: 'utf8' });
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  const docs = ['docs/TERMUX.md', 'README.md'];
  const problems: string[] = [];
  for (const doc of docs) {
    assert.ok(fs.existsSync(doc), `${doc} exists`);
    const text = fs.readFileSync(doc, 'utf8');
    for (const m of text.matchAll(/\btermcrab ([a-z][a-z-]+)/g)) {
      const cmd = m[1]!;
      if (!new RegExp(`termcrab ${cmd}\\b`).test(help)) problems.push(`${doc}: \`termcrab ${cmd}\` is not in the CLI help`);
    }
    for (const m of text.matchAll(/npm run ([a-z][a-z:-]*)/g)) {
      if (!pkg.scripts[m[1]!]) problems.push(`${doc}: \`npm run ${m[1]}\` is not a package script`);
    }
    for (const m of text.matchAll(/node (dist\/[A-Za-z0-9./_-]+\.js)/g)) {
      if (!fs.existsSync(m[1]!)) problems.push(`${doc}: \`node ${m[1]}\` does not exist`);
    }
  }
  assert.deepEqual([...new Set(problems)], [], 'the guide must not send people to commands that do not exist');

  const termux = fs.readFileSync('docs/TERMUX.md', 'utf8');
  for (const [what, re] of [
    ['MIUI / HyperOS battery + autostart', /MIUI|HyperOS/i],
    ['ColorOS / OxygenOS (Oppo, Realme, OnePlus)', /ColorOS|OxygenOS|Realme|OnePlus/i],
    ['wake-lock behaviour', /wake-lock/i],
    ['Termux:Boot', /Termux:Boot/i],
    ['proot leftovers (the thing we do not need)', /proot/i],
    ['how to check it worked', /termcrab doctor/],
  ] as const) {
    assert.match(termux, re, `the guide covers ${what}`);
  }
});

// ------------------------------------------------------------------- 12.4

test('12.4 the first screen says what it is, where it runs, and what it costs', () => {
  const readme = fs.readFileSync('README.md', 'utf8');
  const firstScreen = readme.slice(0, readme.indexOf('\n## ', 3));
  assert.match(firstScreen, /Termux|phone/i, 'where it runs');
  assert.match(firstScreen, /cost|free|no key|your own (API )?key/i, 'what it costs');
  assert.match(firstScreen, /--demo|offline brain|mock/i, 'that it can run with no key and no network');
  assert.match(firstScreen, /scripts\/bench\.mjs/, 'the numbers it quotes have a named source');
  assert.match(firstScreen, /\d+(\.\d+)?\s*(ms|MB|s\b)/, 'and at least one real measurement');
});

// ------------------------------------------------------------------- 12.5

test('12.5 the offline outbox delivers exactly once', async (t) => {
  await t.test('queued while down, delivered once when it comes back — even across a restart', () => {
    const home = tmpHome('toutbox-');
    outboxPush({ channel: 'telegram', chatId: 42, text: 'first' });
    outboxPush({ channel: 'telegram', chatId: 42, text: 'second' });
    assert.equal(outboxPending('telegram').length, 2, 'both are waiting');

    // The process died *after* claiming the first message but before sending it.
    const claimed = outboxPending('telegram')[0]!;
    outboxMarkSending(claimed.id);
    const afterRestart = outboxPending('telegram', { staleMs: 0 });
    assert.equal(afterRestart.length, 2, 'a claimed-but-unsent message comes back after a restart');

    const delivered: string[] = [];
    for (const item of afterRestart) {
      outboxMarkSending(item.id);
      delivered.push(item.text); // the network call
      outboxAck(item.id);
    }
    assert.deepEqual(delivered, ['first', 'second'], 'each message was sent');
    assert.deepEqual(outboxPending('telegram', { staleMs: 0 }), [], 'and acked');

    // A second flush (or a restart) must not send them again.
    for (const item of outboxPending('telegram', { staleMs: 0 })) {
      delivered.push(item.text);
      outboxAck(item.id);
    }
    assert.deepEqual(delivered, ['first', 'second'], 'nothing is delivered twice');

    // A send that fails stays queued with the reason — never silently dropped.
    outboxPush({ channel: 'telegram', chatId: 42, text: 'third' });
    const third = outboxPending('telegram')[0]!;
    outboxMarkSending(third.id);
    outboxFail(third.id, 'network down');
    const again = outboxPending('telegram', { staleMs: 0 });
    assert.equal(again.length, 1, 'the failed message is still queued');
    assert.match(again[0]!.lastError ?? '', /network down/, 'with the reason recorded');
    assert.ok(again[0]!.attempts >= 1, 'and the attempt count');

    // Retention: sent messages are swept, pending ones are not.
    outboxAck(again[0]!.id);
    outboxPush({ channel: 'telegram', chatId: 42, text: 'fourth' });
    const removed = outboxSweep(0);
    assert.equal(removed, 3, 'the three acked messages are swept');
    assert.deepEqual(
      outboxPending('telegram', { staleMs: 0 }).map((i) => i.text),
      ['fourth'],
      'a message that was never acked survives the sweep',
    );
    fs.rmSync(home, { recursive: true, force: true });
  });

  await t.test('the telegram sender queues on failure and flushes exactly once', async () => {
    const home = tmpHome('toutbox-tg-');
    let down = true;
    const sent: string[] = [];
    const api = {
      sendMessage: async (_chatId: number, text: string) => {
        if (down) throw new Error('502 bad gateway');
        sent.push(text);
        return { ok: true };
      },
      getMe: async () => ({ ok: true, username: 'testbot' }),
      getUpdates: async () => [],
    };
    const channel = new TelegramChannel({
      cfg: { token: 'test-token', allowedUserIds: [] },
      onMessage: async () => '',
      getOffset: () => 0,
      setOffset: () => {},
      api: api as never,
    });

    await channel.send(42, 'hello from a tunnel');
    assert.deepEqual(sent, [], 'the network was down, so nothing was sent');
    assert.equal(outboxPending('telegram').length, 1, 'the reply is queued, not lost');

    down = false;
    assert.equal(await channel.flushOutbox(), 1, 'the flush sends it');
    assert.deepEqual(sent, ['hello from a tunnel'], 'exactly once');
    assert.equal(outboxPending('telegram').length, 0, 'and acks it');
    assert.equal(await channel.flushOutbox(), 0, 'a second flush has nothing to do');
    assert.deepEqual(sent, ['hello from a tunnel'], 'still exactly once');
    fs.rmSync(home, { recursive: true, force: true });
  });
});
