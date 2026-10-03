/**
 * Batch 9 — usage and cost accounting.
 *
 * The census called this row ABSENT: no provider parsed `usage`, no event
 * carried it, no surface showed it. On a phone on mobile data that is the one
 * number the owner needs to trust an always-on agent — and a number nobody
 * must invent. These tests pin the whole path:
 *
 *   9.1 every provider reports tokens it really saw (or nothing at all)
 *   9.2 the turn's usage is accumulated across the tool loop and recorded per day
 *   9.3 the panel shows the turn's tokens and today's total
 *   9.4 `termcrab usage` reports the same numbers from the running panel
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { AgentCtx, AgentEvent, runTurn } from '../src/agent/loop.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { PRICING_AS_OF, computeCost } from '../src/core/pricing.js';
import { usageDayFile, usageForDay } from '../src/core/usage.js';
import { GatewayHandle, startGateway } from '../src/gateway/server.js';
import { createMock } from '../src/providers/mock.js';
import { createOpenAi } from '../src/providers/openai.js';
import { ChatRequest, Usage } from '../src/providers/types.js';

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function makeCtx(home: string): { ctx: AgentCtx } {
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo\n---\n\nbody\n');
  return {
    ctx: {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      skills: new SkillStore([{ dir: skillRoot, origin: 'user' }]),
      sessions: new SessionStore(path.join(home, 'sessions')),
    },
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

function sseResponse(frames: unknown[]): Response {
  const enc = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const f of frames) controller.enqueue(enc.encode(`data: ${JSON.stringify(f)}\n\n`));
        controller.enqueue(enc.encode('data: [DONE]\n\n'));
        controller.close();
      },
    }),
    { status: 200, headers: { 'content-type': 'text/event-stream' } },
  );
}

const REQ: ChatRequest = { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [] };

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

async function runCli(args: string[], home: string): Promise<{ stdout: string; code: number }> {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    const { stdout } = await execFileAsync(process.execPath, [bin, ...args], {
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
    });
    return { stdout, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.code ?? 1 };
  }
}

// ------------------------------------------------------------------ 9.1

test('9.1 a provider reports the usage it saw — and nothing when there is none', async () => {
  // Non-streaming OpenAI-compatible response: usage comes straight from the body.
  const plain = createOpenAi(
    { baseUrl: 'https://api.example/v1', apiKey: 'k', model: 'gpt-4o', stream: false },
    async () =>
      jsonResponse({
        choices: [{ message: { content: 'hello' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1200, completion_tokens: 34, total_tokens: 1234 },
      }),
  );
  const plainRes = await plain.chat(REQ, {});
  assert.deepEqual(plainRes.usage, { promptTokens: 1200, completionTokens: 34, totalTokens: 1234 });

  // Streaming: the usage frame arrives at the end (we ask for it explicitly).
  const bodies: Record<string, unknown>[] = [];
  const streamed = createOpenAi(
    { baseUrl: 'https://api.example/v1', apiKey: 'k', model: 'gpt-4o', stream: true },
    async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return sseResponse([
        { choices: [{ delta: { content: 'he' } }] },
        { choices: [{ delta: { content: 'llo' } }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 900, completion_tokens: 12, total_tokens: 912 } },
      ]);
    },
  );
  const streamRes = await streamed.chat(REQ, { onDelta: () => undefined });
  assert.deepEqual(streamRes.usage, { promptTokens: 900, completionTokens: 12, totalTokens: 912 });
  assert.equal(
    (bodies[0]?.stream_options as { include_usage?: boolean } | undefined)?.include_usage,
    true,
    'the streaming request asks for a usage frame',
  );

  // A server that reports nothing: the result says nothing. No guessing.
  const silent = createOpenAi(
    { baseUrl: 'https://api.example/v1', apiKey: 'k', model: 'gpt-4o', stream: false },
    async () => jsonResponse({ choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }),
  );
  assert.equal((await silent.chat(REQ, {})).usage, undefined, 'no usage in the body — no usage claimed');

  // The offline brain is deterministic, so tests never depend on a tokeniser.
  const mock = createMock('mock-1');
  const a = await mock.chat(REQ, {});
  const b = await mock.chat(REQ, {});
  assert.ok(a.usage && a.usage.totalTokens > 0, 'the mock reports numbers');
  assert.deepEqual(a.usage, b.usage, 'the same input gives the same numbers');
  assert.equal(a.usage!.estimated, true, 'and marks them as estimated (it is an offline stand-in)');
});

// ------------------------------------------------------------------ 9.2

test('9.2 a finished turn carries its tokens on run:end and records them per day', async () => {
  const home = tmpHome('tusage-');
  const { ctx } = makeCtx(home);
  const events: AgentEvent[] = [];
  const reply = await runTurn(ctx, { sessionId: 'u:1', userMessage: 'hello there', onEvent: (e) => events.push(e) });

  assert.ok(reply.length > 0);
  const end = events.filter((e) => e.type === 'run:end').at(-1) as Extract<AgentEvent, { type: 'run:end' }>;
  assert.ok(end.usage, 'run:end carries the turn usage');
  assert.ok(end.usage.totalTokens > 0);
  // The mock asks for a tool first, so one turn is two provider calls — the
  // turn's number is the sum, not the last call.
  assert.ok(end.iterations >= 1);

  const day = usageForDay(new Date());
  assert.equal(day.turns, 1, 'the day file records the turn');
  assert.equal(day.totalTokens, end.usage.totalTokens, 'the recorded total is the turn total');
  assert.equal(day.promptTokens, end.usage.promptTokens);
  assert.equal(day.completionTokens, end.usage.completionTokens);
  assert.ok(day.byModel['mock-1'], 'per-model breakdown');
  assert.ok(fs.existsSync(usageDayFile(new Date())), 'usage lives in TCRAB_HOME/usage/<day>.jsonl');

  // A second turn adds to the same day instead of replacing it.
  await runTurn(ctx, { sessionId: 'u:1', userMessage: 'again' });
  const after = usageForDay(new Date());
  assert.equal(after.turns, 2);
  assert.ok(after.totalTokens > day.totalTokens);
  fs.rmSync(home, { recursive: true, force: true });
});

test('9.2b cost is computed only from a price we actually know', () => {
  const usage: Usage = { promptTokens: 1_000_000, completionTokens: 500_000, totalTokens: 1_500_000 };
  assert.equal(computeCost('some-model-nobody-priced', usage, {}), undefined, 'unknown model: no invented price');

  const cfg = { priceInPerM: 3, priceOutPerM: 15 };
  assert.equal(computeCost('some-model-nobody-priced', usage, cfg), 10.5, '1M in @ $3 + 0.5M out @ $15');

  // A model in the built-in snapshot is priced, and the snapshot says when it is from.
  const known = computeCost('gpt-4o-mini', usage, {});
  assert.ok(typeof known === 'number' && known > 0, 'a snapshot price exists for common models');
  assert.match(PRICING_AS_OF, /^\d{4}-\d{2}/, 'the snapshot is dated, so nobody mistakes it for a live quote');
});

// ------------------------------------------------------------------ 9.3 + 9.4

test('9.3 + 9.4 the panel and the CLI report the same real numbers', async (t) => {
  const home = tmpHome('tusage-gw-');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = '';
  const port = await freePort();
  config.gateway.port = port;
  saveConfig(config);
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;
  try {
    const post = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'meter me', sessionId: 'web:usage' }),
    });
    assert.equal(post.status, 202);
    const { turnId } = (await post.json()) as { turnId: string };
    let status = 'queued';
    for (let i = 0; i < 60 && status !== 'done'; i++) {
      await sleep(50);
      const poll = await fetch(`${base}/api/chat/${encodeURIComponent('web:usage')}/${turnId}`);
      status = ((await poll.json()) as { status: string }).status;
    }
    assert.equal(status, 'done', 'the turn finished');

    const usageRes = await fetch(`${base}/api/usage`);
    assert.equal(usageRes.status, 200);
    const body = (await usageRes.json()) as {
      turns: number;
      totalTokens: number;
      promptTokens: number;
      completionTokens: number;
      costUsd?: number;
      pricingAsOf: string;
      byModel: Record<string, { totalTokens: number }>;
    };
    assert.equal(body.turns, 1);
    assert.ok(body.totalTokens > 0, '/api/usage reports the real total');
    assert.equal(body.totalTokens, body.promptTokens + body.completionTokens);
    assert.ok(body.pricingAsOf.length > 0, 'the price snapshot is dated in the response too');
    assert.ok((body.byModel['mock-1']?.totalTokens ?? 0) > 0, 'per-model breakdown is there');

    await t.test('the CLI reads the same numbers from the running panel', async () => {
      const { stdout, code } = await runCli(['usage', '--json'], home);
      assert.equal(code, 0, 'usage exits 0 with the panel up');
      // Batch 14: --json is one envelope, and the numbers live in data.
      const envelope = JSON.parse(stdout) as { ok: boolean; command: string; data: { turns: number; totalTokens: number } };
      assert.equal(envelope.ok, true);
      assert.equal(envelope.command, 'usage');
      assert.equal(envelope.data.turns, body.turns);
      assert.equal(envelope.data.totalTokens, body.totalTokens, 'panel and CLI agree');
    });

    // The panel source shows tokens where the user reads them.
    const ui = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
    assert.match(ui, /addEventListener\('run:end'/, 'the panel listens for the end of a turn');
    assert.match(ui, /function addUsageFooter|usageFooter/, 'the transcript gets a per-turn token footer');
    assert.match(ui, /\/api\/usage/, "the header reads today's total from the API");
  } finally {
    await handle.stop();
  }

  await t.test('the CLI refuses to invent numbers when the panel is down', async () => {
    const { stdout, code } = await runCli(['usage'], home);
    assert.notEqual(code, 0, 'no panel: honest failure');
    assert.match(stdout, /panel is not running|not running/i);
    assert.doesNotMatch(stdout, /\d+ tokens/, 'nothing is printed that could be mistaken for real usage');
  });
  fs.rmSync(home, { recursive: true, force: true });
});
