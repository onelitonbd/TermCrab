/**
 * Batch 5 — "a queue you can trust".
 *
 * Before this file, `SessionQueue` looked like a queue but behaved like a list:
 * two POSTs to /api/chat in the same session ran at the same time, `dequeue()`
 * was never called, `markRunning()` left the turn in the waiting array so
 * `getQueueLength()` never dropped, and 'steer'/'collect' were config values
 * with no effect. These tests pin the behaviour the panel, the CLI and the
 * docs now promise:
 *
 *   5.1 a second message in the same session waits (never interleaves)
 *   5.2 queueLength tells the truth (1 while waiting, 0 when the lane is idle)
 *   5.3 followup: three messages run in order, one at a time
 *   5.4 steer: the message lands in the running turn, same run id, no new turn
 *   5.5 collect: rapid messages merge into one extra turn
 *   5.6 interrupt: the running turn is cancelled and the next one still runs
 *   5.7 the HTTP surface reports the true state (queued + queueLength)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { AgentEvent, AgentCtx, runTurn } from '../src/agent/loop.js';
import { QueuedTurn, SessionQueue, SessionStore } from '../src/agent/sessions.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults } from '../src/core/config.js';
import { GatewayHandle, startGateway } from '../src/gateway/server.js';
import { createMock } from '../src/providers/mock.js';
import { Provider } from '../src/providers/types.js';

/** Let every pending microtask (and the drain loop) settle. */
const tick = () => new Promise<void>((r) => setImmediate(r));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * A runner that blocks each turn until the test releases it, so overlap is
 * observable instead of a race against the event loop.
 */
function gatedRunner(log: string[]) {
  const waiting: (() => void)[] = [];
  const runner = async (turn: QueuedTurn): Promise<string> => {
    log.push(`start:${turn.userMessage}`);
    await new Promise<void>((resolve) => waiting.push(resolve));
    log.push(`end:${turn.userMessage}`);
    return `reply:${turn.userMessage}`;
  };
  return {
    runner,
    release() {
      const next = waiting.shift();
      if (!next) throw new Error('nothing is running');
      next();
    },
  };
}

function makeLoopCtx(): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tqueue-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo\n---\n\nbody\n');
  return {
    home,
    ctx: {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      skills: new SkillStore([{ dir: skillRoot, origin: 'user' }]),
      sessions: new SessionStore(path.join(home, 'sessions')),
    },
  };
}

test('5.1 a second message in one session waits its turn (never interleaved)', async () => {
  const q = new SessionQueue();
  const log: string[] = [];
  const { runner, release } = gatedRunner(log);
  q.setRunner(runner);

  const first = q.submit({ sessionId: 's1', userMessage: 'first' }).turn;
  const second = q.submit({ sessionId: 's1', userMessage: 'second' }).turn;
  await tick();

  assert.deepEqual(log, ['start:first'], 'only the first turn runs');
  assert.equal(first.status, 'running');
  assert.equal(second.status, 'queued', '5.1: the second turn stays queued');

  release();
  await tick();
  assert.deepEqual(log, ['start:first', 'end:first', 'start:second'], 'no interleaving');

  release();
  await tick();
  assert.deepEqual(log, ['start:first', 'end:first', 'start:second', 'end:second']);
  assert.equal(first.output, 'reply:first');
  assert.equal(second.output, 'reply:second');
});

test('5.2 queueLength is truthful: 1 while one waits, 0 when the lane is idle', async () => {
  const q = new SessionQueue();
  const log: string[] = [];
  const { runner, release } = gatedRunner(log);
  q.setRunner(runner);

  assert.equal(q.getQueueLength('s1'), 0, 'idle session');

  const first = q.submit({ sessionId: 's1', userMessage: 'one' }).turn;
  const second = q.submit({ sessionId: 's1', userMessage: 'two' }).turn;
  await tick();
  assert.equal(q.getQueueLength('s1'), 1, 'exactly one message is waiting');
  assert.equal(q.getRunning('s1')?.id, first.id, 'the running turn is not counted as waiting');
  assert.equal(q.getTurn('s1', second.id)?.status, 'queued');

  release();
  await tick();
  release();
  await tick();
  assert.equal(q.getQueueLength('s1'), 0, '5.2: the count drops back to zero');
  assert.equal(q.getRunning('s1'), null);
  assert.equal(second.status, 'done');
});

test('5.3 followup: three messages run in order, one at a time', async () => {
  const q = new SessionQueue();
  const order: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  q.setRunner(async (turn) => {
    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    order.push(turn.userMessage);
    await sleep(5);
    inFlight--;
    return `reply:${turn.userMessage}`;
  });

  const turns = ['one', 'two', 'three'].map((m) => q.submit({ sessionId: 's1', userMessage: m }).turn);
  const last = turns[2]!;
  const done = await q.waitForTurn('s1', 5000, last.id);

  assert.equal(done?.status, 'done');
  assert.deepEqual(order, ['one', 'two', 'three'], 'FIFO order');
  assert.equal(maxInFlight, 1, 'one run per session at a time');
  assert.deepEqual(
    turns.map((t) => t.status),
    ['done', 'done', 'done'],
  );
});

test('5.4 steer: the message joins the running turn, no second turn, same run id', async () => {
  const q = new SessionQueue();
  const log: string[] = [];
  const { runner, release } = gatedRunner(log);
  q.setRunner(runner);
  q.setMode('steer');

  const first = q.submit({ sessionId: 's1', userMessage: 'first' }).turn;
  await tick();
  const steered = q.submit({ sessionId: 's1', userMessage: 'change of plan' });

  assert.equal(steered.steered, true, 'the message was steered, not queued');
  assert.equal(steered.turn.id, first.id, 'no second turn was created');
  assert.equal(q.getQueueLength('s1'), 0, 'nothing is waiting');
  assert.equal(q.getRunning('s1')?.id, first.id, 'still the same running turn');
  assert.deepEqual(q.takeSteers('s1'), ['change of plan'], 'the loop can pick it up');
  assert.deepEqual(q.takeSteers('s1'), [], 'steers are consumed exactly once');

  release();
  await tick();
  assert.deepEqual(log, ['start:first', 'end:first']);
});

test('5.4b runTurn picks a steered message into the same run (one run:start)', async () => {
  const { ctx } = makeLoopCtx();
  const q = new SessionQueue();
  ctx.queue = q;
  q.setMode('steer');

  // A provider that blocks until released, so we can steer mid-call.
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const inner = createMock('mock-1');
  ctx.provider = {
    name: 'paused',
    model: 'paused-1',
    async chat(req, opts) {
      await gate;
      return inner.chat(req, opts);
    },
  } satisfies Provider;

  const events: AgentEvent[] = [];
  q.setRunner((turn, signal) =>
    runTurn(ctx, {
      sessionId: turn.sessionId,
      userMessage: turn.userMessage,
      channel: turn.channel,
      signal,
      skipQueue: true,
      onEvent: (ev) => events.push(ev),
    }),
  );

  const first = q.submit({ sessionId: 's1', userMessage: 'first' }).turn;
  const steered = q.submit({ sessionId: 's1', userMessage: 'STEER-ME' });
  assert.equal(steered.steered, true);
  release();

  const done = await q.waitForTurn('s1', 5000, first.id);
  assert.equal(done?.status, 'done');

  const users = ctx.sessions
    .read('s1')
    .filter((e) => e.role === 'user')
    .map((e) => e.content);
  assert.deepEqual(users, ['first', 'STEER-ME'], 'the steer landed in the transcript');
  assert.equal(events.filter((e) => e.type === 'run:start').length, 1, 'still one run');
  assert.equal(events.filter((e) => e.type === 'steer').length, 1, 'a steer event was emitted');
  assert.match(done?.output ?? '', /STEER-ME/, 'the model saw the steered message');
});

test('5.5 collect: rapid messages merge into one extra turn', async () => {
  const q = new SessionQueue();
  const log: string[] = [];
  const { runner, release } = gatedRunner(log);
  q.setRunner(runner);
  q.setMode('collect');

  const first = q.submit({ sessionId: 's1', userMessage: 'first' }).turn;
  await tick();
  const rest = ['two', 'three', 'four'].map((m) => q.submit({ sessionId: 's1', userMessage: m }).turn);

  assert.equal(q.getQueueLength('s1'), 3, 'three messages are waiting');
  assert.deepEqual(
    rest.map((t) => t.status),
    ['queued', 'queued', 'queued'],
  );

  release();
  await tick();
  assert.deepEqual(log, ['start:first', 'end:first', 'start:two\n\nthree\n\nfour'], 'one merged extra turn');

  release();
  await tick();
  assert.equal(log.length, 4, 'exactly one extra run, no matter how many messages');
  assert.deepEqual(
    [first, ...rest].map((t) => t.status),
    ['done', 'done', 'done', 'done'],
  );
  assert.equal(q.getQueueLength('s1'), 0);
  assert.equal(rest[2]!.output, 'reply:two\n\nthree\n\nfour', 'merged turns share the answer');
});

test('5.6 interrupt: the running turn is cancelled and the next one still runs', async () => {
  const q = new SessionQueue();
  const log: string[] = [];
  q.setMode('interrupt');
  q.setRunner(async (turn, signal) => {
    log.push(`start:${turn.userMessage}`);
    if (turn.userMessage === 'first') {
      await new Promise<never>((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
      });
    }
    log.push(`end:${turn.userMessage}`);
    return `reply:${turn.userMessage}`;
  });

  const first = q.submit({ sessionId: 's1', userMessage: 'first' }).turn;
  await tick();
  const second = q.submit({ sessionId: 's1', userMessage: 'second' }).turn;

  assert.equal(first.status, 'interrupted', 'the old turn is marked interrupted');
  // The aborted run has to unwind before the lane is free; that takes a tick,
  // not a new parallel run — which is the whole point of the lane.
  await tick();
  assert.deepEqual(
    log.filter((l) => l.startsWith('start:')),
    ['start:first', 'start:second'],
    'the new message took the lane after the cancel',
  );
  assert.ok(!log.includes('end:first'), 'the cancelled turn never finished');

  const done = await q.waitForTurn('s1', 5000, second.id);
  assert.equal(done?.status, 'done');
  assert.equal(second.output, 'reply:second');
  assert.equal(q.getQueueLength('s1'), 0);
});

test('queue: sessions have their own lanes (one session does not block another)', async () => {
  const q = new SessionQueue();
  const log: string[] = [];
  const { runner, release } = gatedRunner(log);
  q.setRunner(runner);

  q.submit({ sessionId: 's1', userMessage: 'a' });
  q.submit({ sessionId: 's2', userMessage: 'b' });
  await tick();
  assert.deepEqual(log, ['start:a', 'start:b'], 'both sessions run at once');

  release();
  release();
  await tick();
  assert.equal(q.getQueueLength('s1'), 0);
  assert.equal(q.getQueueLength('s2'), 0);
});

test('queue: a runaway backlog is refused instead of growing without bound', () => {
  const q = new SessionQueue();
  const first = q.submit({ sessionId: 's1', userMessage: 'running' }).turn;
  assert.equal(first.status, 'queued', 'no runner: the turn waits for one');

  let accepted = 0;
  let refused: Error | null = null;
  for (let i = 0; i < 100; i++) {
    try {
      q.submit({ sessionId: 's1', userMessage: `m${i}` });
      accepted++;
    } catch (err) {
      refused = err as Error;
      break;
    }
  }
  assert.ok(refused, 'at some point the queue says no');
  assert.match(refused!.message, /queue is full/i);
  assert.ok(accepted >= 8 && accepted <= 64, `cap should be sane, accepted ${accepted}`);
  assert.equal(q.getQueueLength('s1'), accepted + 1);
});

// ---------------------------------------------------------------------------
// The HTTP surface: this is what the panel actually talks to.
// ---------------------------------------------------------------------------

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

/** An OpenAI-compatible upstream that answers slowly, echoing the last user text. */
function slowUpstream(delayMs: number, log: string[]): http.Server {
  return http.createServer((rq, rs) => {
    const chunks: Buffer[] = [];
    rq.on('data', (c) => chunks.push(c));
    rq.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
        messages?: { role?: string; content?: string }[];
      };
      const lastUser = [...(body.messages ?? [])].reverse().find((m) => m.role === 'user');
      const text = String(lastUser?.content ?? '').trim();
      log.push(text);
      setTimeout(() => {
        rs.writeHead(200, { 'content-type': 'application/json' });
        rs.end(
          JSON.stringify({
            choices: [{ message: { role: 'assistant', content: `echo:${text}` }, finish_reason: 'stop' }],
          }),
        );
      }, delayMs);
    });
  });
}

test('5.7 HTTP: two chat posts serialize, and the poll reports the real queue', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'thttpq-'));
  process.env.TCRAB_HOME = home;
  const calls: string[] = [];
  const upstream = slowUpstream(150, calls);
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upPort = (upstream.address() as net.AddressInfo).port;

  const config = defaults();
  config.provider = {
    type: 'openai',
    baseUrl: `http://127.0.0.1:${upPort}`,
    apiKey: 'sk-test',
    model: 'slow-1',
    stream: false,
  };
  config.gateway.token = 'test-token';
  const port = await freePort();
  let handle: GatewayHandle | null = null;

  try {
    handle = await startGateway({ config, host: '127.0.0.1', port });
    const base = `http://127.0.0.1:${port}`;
    const auth = { authorization: 'Bearer test-token' };

    const post = async (message: string) => {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ message, sessionId: 'web:main' }),
      });
      return { status: res.status, data: (await res.json()) as { turnId: string; status: string } };
    };
    const poll = async (turnId: string) => {
      const res = await fetch(`${base}/api/chat/${encodeURIComponent('web:main')}/${turnId}`, { headers: auth });
      assert.equal(res.status, 200);
      return (await res.json()) as { status: string; output?: string; queueLength: number };
    };
    const waitDone = async (turnId: string, ms = 6000) => {
      const deadline = Date.now() + ms;
      for (;;) {
        const t = await poll(turnId);
        if (t.status === 'done' || t.status === 'error' || t.status === 'interrupted') return t;
        assert.ok(Date.now() < deadline, `turn ${turnId} never finished (${t.status})`);
        await sleep(25);
      }
    };

    const a = await post('first');
    assert.equal(a.status, 202, 'the chat endpoint is queue-first');
    assert.equal(a.data.status, 'queued');

    const b = await post('second');
    assert.equal(b.status, 202);

    const aState = await poll(a.data.turnId);
    assert.equal(aState.status, 'running', `first turn is live (upstream saw ${JSON.stringify(calls)})`);
    const whileRunning = await poll(b.data.turnId);
    assert.equal(
      whileRunning.status,
      'queued',
      `5.1 over HTTP: the second turn waits (got ${JSON.stringify(whileRunning)}, upstream saw ${JSON.stringify(calls)})`,
    );
    assert.equal(whileRunning.queueLength, 1, '5.7: the poll reports one waiting');

    const doneA = await waitDone(a.data.turnId);
    assert.match(doneA.output ?? '', /echo:first/);
    const doneB = await waitDone(b.data.turnId);
    assert.match(doneB.output ?? '', /echo:second/);
    assert.equal(doneB.queueLength, 0, '5.2 over HTTP: idle again');
    // The gateway also probes the model with a 'ping' request; ignore that.
    assert.deepEqual(
      calls.filter((c) => c === 'first' || c === 'second'),
      ['first', 'second'],
      'the upstream saw the two messages in order',
    );
  } finally {
    if (handle) await handle.stop();
    upstream.close();
  }
});
