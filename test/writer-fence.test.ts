import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionQueue, SessionStore } from '../src/agent/sessions.js';
import { AgentCtx, runQueuedTurn, runTurn } from '../src/agent/loop.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults } from '../src/core/config.js';
import { ChatRequest, Provider } from '../src/providers/types.js';

/**
 * Batch 8 — one writer per transcript.
 *
 * The last BROKEN row. `SessionStore.append()` had no writer claim, so the
 * gateway and the CLI (or two surfaces inside the gateway) could interleave
 * lines into one `sessions/<id>.jsonl`, and a crash mid-write could leave a
 * torn line behind. The queue only serialises turns inside ONE process; this
 * file is about the fence that holds across processes.
 */

function tmpHome(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = dir;
  return dir;
}

function makeCtx(home: string): { ctx: AgentCtx } {
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const memory = new MemoryStore(path.join(home, 'memory'));
  const sessions = new SessionStore(path.join(home, 'sessions'));
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo skill\n---\n\nSolo body\n');
  const skills = new SkillStore([{ dir: skillRoot, origin: 'user' }]);
  return { ctx: { config, memory, skills, sessions } };
}

function lockPath(home: string, id: string): string {
  return path.join(home, 'sessions', `${id}.lock`);
}

/** Write a lock file by hand, the way a crashed or foreign writer would leave it. */
function writeLock(home: string, id: string, lock: Record<string, unknown>): void {
  fs.mkdirSync(path.join(home, 'sessions'), { recursive: true });
  fs.writeFileSync(lockPath(home, id), `${JSON.stringify(lock)}\n`, 'utf8');
}

test('8.1 a session has one writer at a time, and it names the holder', () => {
  const home = tmpHome('tfence-');
  const sessions = new SessionStore(path.join(home, 'sessions'));

  const first = sessions.claim('s1', 'gateway');
  assert.equal(first.ok, true, 'the first claim must win');

  const second = sessions.claim('s1', 'cli');
  assert.equal(second.ok, false, 'a second writer must be refused');
  assert.equal(second.holder?.owner, 'gateway', 'and it must say who holds it');
  assert.equal(second.holder?.pid, process.pid, 'the holder is identified by pid too');

  first.release();
  const third = sessions.claim('s1', 'cli');
  assert.equal(third.ok, true, 'after release the next writer gets it');
  third.release();

  // Different sessions are independent.
  const a = sessions.claim('one', 'gateway');
  const b = sessions.claim('two', 'cli', { waitMs: 50 });
  assert.equal(a.ok && b.ok, true, 'sessions do not block each other');
  a.release();
  b.release();
  fs.rmSync(home, { recursive: true, force: true });
});

test('8.2 a stale claim is reclaimed instead of wedging the session', () => {
  const home = tmpHome('tfence-stale-');
  const sessions = new SessionStore(path.join(home, 'sessions'));

  // A writer that died without releasing: its pid is gone.
  writeLock(home, 'dead', { owner: 'crashed', pid: 999_999, since: Date.now() - 60_000, heartbeatAt: Date.now() - 60_000 });
  const dead = sessions.claim('dead', 'gateway');
  assert.equal(dead.ok, true, 'a dead pid must not hold the session forever');
  dead.release();

  // A live pid whose heartbeat went quiet (wedged process).
  writeLock(home, 'wedged', { owner: 'wedged', pid: process.pid, since: Date.now() - 600_000, heartbeatAt: Date.now() - 600_000 });
  const wedged = sessions.claim('wedged', 'gateway', { ttlMs: 60_000 });
  assert.equal(wedged.ok, true, 'an expired heartbeat must not hold the session forever');
  wedged.release();

  // A fresh, live claim must be honoured (this is the normal case).
  writeLock(home, 'busy', { owner: 'someone-else', pid: process.pid, since: Date.now(), heartbeatAt: Date.now() });
  const busy = sessions.claim('busy', 'gateway', { ttlMs: 60_000 });
  assert.equal(busy.ok, false, 'a live writer with a recent heartbeat is honoured');
  assert.equal(busy.holder?.owner, 'someone-else');
  fs.rmSync(home, { recursive: true, force: true });
});

test('8.1b a turn refuses to run while another writer holds the session', async () => {
  const home = tmpHome('tfence-turn-');
  const { ctx } = makeCtx(home);

  const held = ctx.sessions.claim('busy:session', 'cli');
  assert.equal(held.ok, true);

  const refused = await runTurn(ctx, { sessionId: 'busy:session', userMessage: 'let me write' });
  assert.match(refused, /\[busy\]/, 'the caller is told the session is busy');
  assert.match(refused, /cli/, 'and who holds it');
  assert.equal(ctx.sessions.read('busy:session').length, 0, 'a refused turn writes nothing');

  held.release();
  const ok = await runTurn(ctx, { sessionId: 'busy:session', userMessage: 'now it is mine' });
  assert.doesNotMatch(ok, /\[busy\]/, 'after release the turn runs normally');
  assert.equal(ctx.sessions.read('busy:session')[0]?.role, 'user');
  fs.rmSync(home, { recursive: true, force: true });
});

test('8.3 a torn write is healed: every remaining line parses', () => {
  const home = tmpHome('tfence-torn-');
  const root = path.join(home, 'sessions');
  const sessions = new SessionStore(root);
  const file = path.join(root, 's1.jsonl');

  sessions.append('s1', { role: 'user', content: 'first', ts: Date.now() });
  // A crash in the middle of a write leaves a partial JSON line, no newline.
  fs.appendFileSync(file, '{"role":"assis', 'utf8');

  sessions.append('s1', { role: 'user', content: 'second', ts: Date.now() });

  const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  for (const line of lines) {
    assert.doesNotThrow(() => JSON.parse(line), `every line must parse: ${line.slice(0, 40)}`);
  }
  const entries = sessions.read('s1');
  assert.equal(entries.length, 2, 'the complete entries survive');
  assert.equal((entries[1] as { content: string }).content, 'second');

  // One append = one line (no rewrite of the file, no interleaving risk).
  const before = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).length;
  sessions.append('s1', { role: 'user', content: 'third', ts: Date.now() });
  const after = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).length;
  assert.equal(after, before + 1, 'append adds exactly one line');
  fs.rmSync(home, { recursive: true, force: true });
});

test('8.4 two surfaces on one session share one lane', async () => {
  const home = tmpHome('tfence-lane-');
  const { ctx } = makeCtx(home);
  const queue = new SessionQueue();
  ctx.queue = queue;

  let active = 0;
  let maxActive = 0;
  const slow: Provider = {
    name: 'slow',
    model: 'slow-1',
    async chat(req: ChatRequest) {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 25));
      active--;
      const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
      return { text: `reply to ${lastUser?.content ?? ''}`, toolCalls: [], stopReason: 'end' };
    },
  };
  ctx.provider = slow;
  queue.setRunner(async (turn, signal) =>
    runTurn(ctx, {
      sessionId: turn.sessionId,
      userMessage: turn.userMessage,
      channel: turn.channel,
      signal,
      skipQueue: true,
    }),
  );

  // A Telegram message and a web message land on the same session at once.
  const telegram = await runQueuedTurn(ctx, { sessionId: 'mix:1', userMessage: 'from telegram', channel: 'telegram' });
  assert.match(telegram, /from telegram/);
  const [tg, web] = await Promise.all([
    runQueuedTurn(ctx, { sessionId: 'mix:2', userMessage: 'from telegram', channel: 'telegram' }),
    runQueuedTurn(ctx, { sessionId: 'mix:2', userMessage: 'from web', channel: 'web' }),
  ]);
  assert.match(tg, /from telegram/, 'each surface gets its own reply');
  assert.match(web, /from web/);
  assert.equal(maxActive, 1, 'never two provider calls for one session at once');
  const users = ctx.sessions.read('mix:2').filter((e) => e.role === 'user');
  assert.deepEqual(
    users.map((u) => (u as { content: string }).content),
    ['from telegram', 'from web'],
    'order is preserved',
  );
  fs.rmSync(home, { recursive: true, force: true });
});
