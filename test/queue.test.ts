import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionQueue, QueuedTurn } from '../src/agent/sessions.js';

test('queue: enqueue and dequeue in FIFO order', () => {
  const q = new SessionQueue();
  const t1 = q.enqueue({ sessionId: 's1', userMessage: 'first' });
  const t2 = q.enqueue({ sessionId: 's1', userMessage: 'second' });
  const t3 = q.enqueue({ sessionId: 's1', userMessage: 'third' });

  assert.equal(q.getQueueLength('s1'), 3);

  const d1 = q.dequeue('s1');
  assert.equal(d1?.id, t1.id);
  assert.equal(d1?.userMessage, 'first');

  const d2 = q.dequeue('s1');
  assert.equal(d2?.id, t2.id);

  const d3 = q.dequeue('s1');
  assert.equal(d3?.id, t3.id);

  assert.equal(q.getQueueLength('s1'), 0);
  assert.equal(q.dequeue('s1'), null);
});

test('queue: mark running and done', () => {
  const q = new SessionQueue();
  const turn = q.enqueue({ sessionId: 's1', userMessage: 'hello' });
  const ctrl = new AbortController();

  q.markRunning(turn.id, 's1', ctrl);
  assert.equal(q.getRunning('s1')?.id, turn.id);
  assert.equal(turn.status, 'running');

  q.markDone(turn.id, 's1', 'world');
  assert.equal(q.getRunning('s1'), null);
  assert.equal(turn.status, 'done');
  assert.equal(turn.output, 'world');
});

test('queue: interrupt aborts running turn', () => {
  const q = new SessionQueue();
  const turn = q.enqueue({ sessionId: 's1', userMessage: 'hello' });
  const ctrl = new AbortController();

  q.markRunning(turn.id, 's1', ctrl);
  const interrupted = q.interrupt('s1');

  assert.ok(interrupted);
  assert.ok(ctrl.signal.aborted);
  assert.equal(turn.status, 'interrupted');
  assert.equal(q.getRunning('s1'), null);
});

test('queue: interrupt with no running turn returns false', () => {
  const q = new SessionQueue();
  const result = q.interrupt('s1');
  assert.equal(result, false);
});

test('queue: waitForTurn resolves when turn completes', async () => {
  const q = new SessionQueue();
  const turn = q.enqueue({ sessionId: 's1', userMessage: 'hello' });
  const ctrl = new AbortController();

  q.markRunning(turn.id, 's1', ctrl);

  // Complete the turn after a short delay
  setTimeout(() => q.markDone(turn.id, 's1', 'done!'), 50);

  const result = await q.waitForTurn('s1', 5000);
  assert.ok(result);
  assert.equal(result?.status, 'done');
  assert.equal(result?.output, 'done!');
});

test('queue: waitForTurn times out if turn never completes', async () => {
  const q = new SessionQueue();
  const turn = q.enqueue({ sessionId: 's1', userMessage: 'hello' });
  const ctrl = new AbortController();

  q.markRunning(turn.id, 's1', ctrl);

  const result = await q.waitForTurn('s1', 100);
  assert.equal(result, null);
});

test('queue: multiple sessions are isolated', () => {
  const q = new SessionQueue();
  q.enqueue({ sessionId: 's1', userMessage: 'a' });
  q.enqueue({ sessionId: 's1', userMessage: 'b' });
  q.enqueue({ sessionId: 's2', userMessage: 'c' });

  assert.equal(q.getQueueLength('s1'), 2);
  assert.equal(q.getQueueLength('s2'), 1);

  const d = q.dequeue('s2');
  assert.equal(d?.userMessage, 'c');
  assert.equal(q.getQueueLength('s1'), 2);
});

test('queue: markError sets error state', () => {
  const q = new SessionQueue();
  const turn = q.enqueue({ sessionId: 's1', userMessage: 'hello' });
  const ctrl = new AbortController();

  q.markRunning(turn.id, 's1', ctrl);
  q.markError(turn.id, 's1', 'provider timeout');

  assert.equal(turn.status, 'error');
  assert.equal(turn.error, 'provider timeout');
  assert.equal(q.getRunning('s1'), null);
});
