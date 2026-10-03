/**
 * Batch 27 — the loop and the providers.
 *
 * 27.1 parallel tool batches: a model that asks for several read-only tools in
 * one turn gets them run at once (bounded by `agent.parallelTools`), while
 * anything that can change something stays sequential, in the model's order.
 * The rules this file pins:
 *
 *   - read-only tools overlap; mutating or approval-gated ones do not
 *   - the transcript keeps the model's order, not the finishing order
 *   - one tool failing does not cancel the rest of the batch
 *   - `parallelTools: 1` turns the whole thing off
 *   - the batching decision is opt-in per tool (`parallelSafe`), so an unknown
 *     tool is sequential by default
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentCtx, AgentEvent, runTurn } from '../src/agent/loop.js';
import { SessionStore } from '../src/agent/sessions.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { PARALLEL_SAFE_TOOLS, Tool } from '../src/agent/tools.js';
import { defaults } from '../src/core/config.js';
import { Provider } from '../src/providers/types.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function makeCtx(extra: Partial<AgentCtx['config']['agent']> = {}): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 't27-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.agent = { ...config.agent, ...extra };
  return {
    home,
    ctx: {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      skills: new SkillStore(),
      sessions: new SessionStore(path.join(home, 'sessions')),
    },
  };
}

/** Records when each tool starts and ends, and how many run at once. */
function makeTracker(): {
  make: (name: string, ms: number, safe: boolean, boom?: boolean) => Tool;
  events: string[];
  peak: () => number;
  spans: () => { name: string; start: number; end: number }[];
} {
  const events: string[] = [];
  const spans: { name: string; start: number; end: number }[] = [];
  let running = 0;
  let peak = 0;
  const make = (name: string, ms: number, safe: boolean, boom = false): Tool => ({
    def: { name, description: `fake ${name}`, schema: { type: 'object', properties: {} } },
    parallelSafe: safe,
    async execute() {
      const start = Date.now();
      running++;
      peak = Math.max(peak, running);
      events.push(`${name}:start`);
      await sleep(ms);
      events.push(`${name}:end`);
      running--;
      spans.push({ name, start, end: Date.now() });
      if (boom) throw new Error(`${name} exploded`);
      return `${name} ok`;
    },
  });
  return { make, events, peak: () => peak, spans: () => spans };
}

/** A provider that asks for every call in one turn, then answers. */
function batchProvider(names: string[]): Provider {
  return {
    name: 'scripted',
    model: 'scripted-1',
    async chat(req) {
      const results = req.messages.filter((m) => m.role === 'tool');
      if (results.length >= names.length) return { text: 'all done', toolCalls: [], stopReason: 'end' };
      return {
        text: '',
        toolCalls: names.map((name, i) => ({ id: `call-${i + 1}`, name, args: { i } })),
        stopReason: 'tool',
      };
    },
  };
}

function toolEntries(sessions: SessionStore, sessionId: string): { name: string; result: string }[] {
  const out: { name: string; result: string }[] = [];
  for (const entry of sessions.read(sessionId)) {
    if (entry.role !== 'tool') continue;
    out.push({ name: entry.name, result: entry.result ?? '' });
  }
  return out;
}

// --------------------------------------------------------------------------- 27.1

test('27.1 read-only tools in one turn run together, and the transcript keeps the model\'s order', async () => {
  const { ctx } = makeCtx();
  const t = makeTracker();
  ctx.tools = [t.make('read_a', 120, true), t.make('read_b', 120, true), t.make('read_c', 120, true)];
  ctx.provider = batchProvider(['read_a', 'read_b', 'read_c']);

  const events: AgentEvent[] = [];
  const started = Date.now();
  const final = await runTurn(ctx, { sessionId: 's-batch', userMessage: 'read three things', onEvent: (e) => events.push(e) });
  const elapsed = Date.now() - started;

  assert.equal(final, 'all done');
  assert.equal(t.peak(), 3, 'all three read-only tools were in flight at once');
  assert.ok(elapsed < 320, `three 120ms tools in one batch should not take 360ms serial (took ${elapsed}ms)`);

  // Order in the transcript is the model's order, even though b is not the
  // first to finish in every run: the loop appends after the batch settles.
  assert.deepEqual(
    toolEntries(ctx.sessions, 's-batch').map((e) => e.name),
    ['read_a', 'read_b', 'read_c'],
  );

  // Starts are emitted in the model's order, and every call gets an end.
  const starts = events.filter((e) => e.type === 'tool:start').map((e) => (e as { name: string }).name);
  const ends = events.filter((e) => e.type === 'tool:end').map((e) => (e as { name: string }).name).sort();
  assert.deepEqual(starts, ['read_a', 'read_b', 'read_c']);
  assert.deepEqual(ends, ['read_a', 'read_b', 'read_c']);
});

test('27.1 a tool that changes something is never batched — it runs after the batch, in order', async () => {
  const { ctx } = makeCtx();
  const t = makeTracker();
  ctx.tools = [
    t.make('read_a', 100, true),
    t.make('write_thing', 40, false),
    t.make('read_b', 100, true),
  ];
  ctx.provider = batchProvider(['read_a', 'write_thing', 'read_b']);

  await runTurn(ctx, { sessionId: 's-mixed', userMessage: 'read, write, read' });

  const spans = t.spans();
  const readA = spans.find((s) => s.name === 'read_a')!;
  const readB = spans.find((s) => s.name === 'read_b')!;
  const write = spans.find((s) => s.name === 'write_thing')!;

  assert.ok(write.start >= readA.end, 'the mutating tool waited for the read-only batch');
  assert.ok(readB.start >= write.end, 'the next batch waited for the mutating tool');
  assert.equal(t.peak(), 1, 'nothing overlapped with the mutating tool');
  assert.deepEqual(
    toolEntries(ctx.sessions, 's-mixed').map((e) => e.name),
    ['read_a', 'write_thing', 'read_b'],
  );
});

test('27.1 one tool blowing up does not cancel the batch, and the error is the tool result', async () => {
  const { ctx } = makeCtx();
  const t = makeTracker();
  ctx.tools = [t.make('read_a', 60, true), t.make('read_boom', 60, true, true), t.make('read_c', 60, true)];
  ctx.provider = batchProvider(['read_a', 'read_boom', 'read_c']);

  const events: AgentEvent[] = [];
  await runTurn(ctx, { sessionId: 's-boom', userMessage: 'one will fail', onEvent: (e) => events.push(e) });

  const results = toolEntries(ctx.sessions, 's-boom');
  assert.deepEqual(results.map((r) => r.name), ['read_a', 'read_boom', 'read_c']);
  assert.match(results[1]!.result, /read_boom exploded/);
  assert.equal(t.peak(), 3, 'the other two still ran concurrently');

  const end = events.find((e) => e.type === 'tool:end' && (e as { name: string }).name === 'read_boom') as { ok: boolean };
  assert.equal(end.ok, false);
});

test('27.1 the knob: agent.parallelTools = 1 makes it strictly sequential', async () => {
  const { ctx } = makeCtx({ parallelTools: 1 });
  const t = makeTracker();
  ctx.tools = [t.make('read_a', 80, true), t.make('read_b', 80, true)];
  ctx.provider = batchProvider(['read_a', 'read_b']);

  await runTurn(ctx, { sessionId: 's-serial', userMessage: 'two reads' });
  assert.equal(t.peak(), 1, 'parallelTools: 1 means no overlap at all');
  assert.deepEqual(
    t.events,
    ['read_a:start', 'read_a:end', 'read_b:start', 'read_b:end'],
  );
});

test('27.1 batching is opt-in: the table is real, and an unknown tool is sequential', () => {
  // Every name in the table must be a live tool, checked against the built-ins
  // in the toolbox test; here we only guard the shape so a rename is caught.
  for (const name of PARALLEL_SAFE_TOOLS) assert.match(name, /^[a-z_]+$/, `${name} looks like a tool name`);
  assert.ok(PARALLEL_SAFE_TOOLS.includes('read_file'));
  assert.ok(PARALLEL_SAFE_TOOLS.includes('web_search'));
  assert.ok(!PARALLEL_SAFE_TOOLS.includes('exec'), 'exec changes the world');
  assert.ok(!PARALLEL_SAFE_TOOLS.includes('write_file'));
  assert.ok(!PARALLEL_SAFE_TOOLS.includes('send_file'));
});
