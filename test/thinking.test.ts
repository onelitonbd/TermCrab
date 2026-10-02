import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { getModelCapabilities, normalizeThinkingLevel } from '../src/providers/capabilities.js';
import { createOpenAi } from '../src/providers/openai.js';
import { createAnthropic } from '../src/providers/anthropic.js';
import { createGemini } from '../src/providers/gemini.js';
import { createOllama } from '../src/providers/ollama.js';
import { FetchLike } from '../src/providers/types.js';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults } from '../src/core/config.js';

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
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

/** v0.34.0: thinking level — capability table + input validation. */
test('capabilities: reasoning models are recognised, plain models are not', () => {
  assert.equal(getModelCapabilities('gpt-4o', 'openai').supportsThinking, false, 'gpt-4o must not get reasoning_effort');
  assert.equal(getModelCapabilities('gpt-4o-mini', 'openai').supportsThinking, false);
  assert.equal(getModelCapabilities('o3-mini', 'openai').supportsThinking, true);
  assert.equal(getModelCapabilities('openai/o1-preview', 'openai').supportsThinking, true);
  assert.equal(getModelCapabilities('gpt-5', 'openai').supportsThinking, true);

  assert.equal(getModelCapabilities('claude-3-5-sonnet-20241022', 'anthropic').supportsThinking, false);
  assert.equal(getModelCapabilities('claude-3-7-sonnet-20250219', 'anthropic').supportsThinking, true);
  assert.equal(getModelCapabilities('claude-sonnet-4-20250514', 'anthropic').supportsThinking, true);

  assert.equal(getModelCapabilities('gemini-2.0-flash', 'gemini').supportsThinking, false);
  assert.equal(getModelCapabilities('gemini-2.5-flash', 'gemini').supportsThinking, true);

  assert.equal(getModelCapabilities('deepseek-chat', 'deepseek').supportsThinking, false);
  assert.equal(getModelCapabilities('deepseek-r1', 'deepseek').supportsThinking, true);
  assert.equal(getModelCapabilities('llama3.2', 'ollama').supportsThinking, false);
  assert.equal(getModelCapabilities('qwen3:8b', 'ollama').supportsThinking, false);
});

test('capabilities: only the six known levels pass validation', () => {
  assert.equal(normalizeThinkingLevel('none'), 'none');
  assert.equal(normalizeThinkingLevel('high'), 'high');
  assert.equal(normalizeThinkingLevel('max'), 'max');
  assert.equal(normalizeThinkingLevel('ultra'), undefined);
  assert.equal(normalizeThinkingLevel(42), undefined);
  assert.equal(normalizeThinkingLevel(undefined), undefined);
});

/** OpenAI-compatible: reasoning_effort only for reasoning models. */
test('openai: reasoning_effort is gated on the model', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
  };

  const plain = createOpenAi({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'gpt-4o' }, fetchImpl);
  await plain.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal('reasoning_effort' in bodies[0]!, false, 'gpt-4o must never receive reasoning_effort (400)');

  const reasoning = createOpenAi({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'o3-mini' }, fetchImpl);
  await reasoning.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'xhigh' },
    {},
  );
  assert.equal(bodies[1]!.reasoning_effort, 'high', 'xhigh maps to the highest OpenAI effort');

  await reasoning.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'none' },
    {},
  );
  assert.equal('reasoning_effort' in bodies[2]!, false, 'auto level sends no effort');

  const streamed = createOpenAi({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'o3-mini', stream: true }, fetchImpl);
  await streamed.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'low' },
    { onDelta: () => undefined },
  );
  assert.equal(bodies[3]!.reasoning_effort, 'low', 'streaming path carries the effort too');
});

/** Anthropic extended thinking: budget, max_tokens, temperature, trace + replay. */
test('anthropic: extended thinking streams a trace and preserves the blocks', async () => {
  const frames = [
    'event: message_start\ndata: {"type":"message_start","message":{}}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me "}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"think."}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"sig-1"}}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_1","name":"get_time"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{}"}}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\n',
  ];
  let body: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (_url, init) => {
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return sseResponse(frames);
  };
  const provider = createAnthropic(
    { baseUrl: 'https://x.test', apiKey: 'k', model: 'claude-sonnet-4-20250514', temperature: 0.7, stream: true },
    fetchImpl,
  );
  const thinking: string[] = [];
  const result = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'go' }], tools: [], thinkingLevel: 'medium' },
    { onDelta: () => undefined, onThinkingDelta: (c) => thinking.push(c) },
  );

  const cfg = body.thinking as { type: string; budget_tokens: number } | undefined;
  assert.ok(cfg, 'thinking config must be sent for Claude 3.7+/4');
  assert.equal(cfg!.type, 'enabled');
  assert.equal(cfg!.budget_tokens, 4096, 'medium maps to a 4K budget');
  assert.ok(
    Number(body.max_tokens) > cfg!.budget_tokens,
    'max_tokens must exceed the thinking budget or Anthropic rejects the call',
  );
  assert.equal('temperature' in body, false, 'thinking requires the default temperature');

  assert.deepEqual(thinking, ['Let me ', 'think.'], 'thinking deltas reach the drawer');
  assert.equal(result.thinking, 'Let me think.');
  assert.ok(Array.isArray(result.thinkingBlocks) && result.thinkingBlocks.length === 1);

  // Second turn: the tool result follow-up must echo the thinking block back.
  const replay = createAnthropic(
    { baseUrl: 'https://x.test', apiKey: 'k', model: 'claude-sonnet-4-20250514', stream: false },
    async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return jsonResponse({ content: [{ type: 'text', text: 'done' }], stop_reason: 'end_turn' });
    },
  );
  await replay.chat(
    {
      system: 's',
      messages: [
        { role: 'user', content: 'go' },
        {
          role: 'assistant',
          content: '',
          toolCalls: [{ id: 'tu_1', name: 'get_time', args: {} }],
          thinkingBlocks: result.thinkingBlocks,
        },
        { role: 'tool', content: '12:00', toolCallId: 'tu_1', toolName: 'get_time' },
      ],
      tools: [],
      thinkingLevel: 'medium',
    },
    {},
  );
  const messages = body.messages as { role: string; content: unknown[] }[];
  const assistant = messages.find((m) => m.role === 'assistant')!;
  assert.equal((assistant.content[0] as { type: string }).type, 'thinking', 'thinking block comes first');
  assert.equal((assistant.content[0] as { signature?: string }).signature, 'sig-1');
  assert.equal((assistant.content[1] as { type: string }).type, 'tool_use');
});

test('anthropic: no thinking config for models that do not support it', async () => {
  let body: Record<string, unknown> = {};
  const provider = createAnthropic(
    { baseUrl: 'https://x.test', apiKey: 'k', model: 'claude-3-5-sonnet-20241022', stream: false },
    async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return jsonResponse({ content: [{ type: 'text', text: 'hi' }], stop_reason: 'end_turn' });
    },
  );
  await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal('thinking' in body, false, 'Claude 3.5 rejects the thinking parameter');
});

/** Gemini: thinkingConfig (clamped) + thought parts separated from the answer. */
test('gemini: thinkingConfig is clamped and thoughts stay out of the answer', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({
      candidates: [
        {
          content: {
            role: 'model',
            parts: [
              { text: 'weighing options', thought: true },
              { text: 'the answer' },
            ],
          },
          finishReason: 'STOP',
        },
      ],
    });
  };

  const gem = createGemini({ apiKey: 'k', model: 'gemini-2.5-flash', stream: false }, fetchImpl);
  const res = await gem.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'max' },
    {},
  );
  const gen = bodies[0]!.generationConfig as { thinkingConfig?: { thinkingBudget: number; includeThoughts: boolean } };
  assert.ok(gen.thinkingConfig, 'gemini 2.5 must receive a thinking budget');
  assert.equal(gen.thinkingConfig!.thinkingBudget, 24576, 'clamped to Gemini\'s 24K ceiling');
  assert.equal(gen.thinkingConfig!.includeThoughts, true);
  assert.equal(res.text, 'the answer', 'thought parts never leak into the reply');
  assert.equal(res.thinking, 'weighing options');

  const plain = createGemini({ apiKey: 'k', model: 'gemini-2.0-flash', stream: false }, fetchImpl);
  await plain.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  const gen2 = bodies[1]!.generationConfig as { thinkingConfig?: unknown };
  assert.equal(gen2.thinkingConfig, undefined, 'gemini 2.0 does not take a thinking budget');
});

/** Ollama: `think` only for reasoning-capable models + thinking stream. */
test('ollama: think flag and thinking stream for reasoning models', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({
      message: { role: 'assistant', content: 'hi', thinking: 'hmm' },
      done: true,
    });
  };

  const r1 = createOllama({ model: 'deepseek-r1:7b', stream: false }, fetchImpl);
  const res = await r1.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'medium' },
    {},
  );
  assert.equal(bodies[0]!.think, true, 'deepseek-r1 accepts think');
  assert.equal(res.thinking, 'hmm', 'thinking text is surfaced for the drawer');

  const llama = createOllama({ model: 'llama3.2', stream: false }, fetchImpl);
  await llama.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'medium' },
    {},
  );
  assert.equal('think' in bodies[1]!, false, 'llama must not receive think');
});

/** Gateway: /api/config exposes capability info; bad levels never reach a turn. */
test('gateway: config reports thinking capability and drops bogus levels', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tthink-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = '';
  // Mock provider: the queued turn must not reach the network, but the model id
  // still drives the capability block the UI reads.
  config.provider.type = 'mock';
  config.provider.model = 'gpt-4o';
  const port = await freePort();
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;
  try {
    const cfgRes = await fetch(base + '/api/config');
    const cfgBody = (await cfgRes.json()) as { thinking?: { model: string; supportsThinking: boolean } };
    assert.ok(cfgBody.thinking, '/api/config carries the thinking block');
    assert.equal(cfgBody.thinking!.model, 'gpt-4o');
    assert.equal(cfgBody.thinking!.supportsThinking, false, 'plain model reported as non-reasoning');

    const chat = await fetch(base + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hi', sessionId: 'web:main', thinkingLevel: 'not-a-level' }),
    });
    assert.equal(chat.status, 202, 'a bogus level never blocks the message');
  } finally {
    await handle.stop();
  }
});

/** End to end: what the picker sends is what the provider receives. */
test('gateway: the picked level reaches the provider request', async () => {
  const seen: Record<string, unknown>[] = [];
  const upstream = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      seen.push(JSON.parse(raw) as Record<string, unknown>);
      // The provider streams by default, so answer like an OpenAI SSE endpoint.
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'hello from upstream' } }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`);
      res.end('data: [DONE]\n\n');
    });
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', () => resolve()));
  const upstreamPort = (upstream.address() as net.AddressInfo).port;

  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tthink-e2e-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = '';
  config.provider.type = 'openai';
  config.provider.baseUrl = `http://127.0.0.1:${upstreamPort}/v1`;
  config.provider.apiKey = 'k';
  config.provider.model = 'o3-mini';
  const port = await freePort();
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;

  const send = async (message: string, thinkingLevel: string): Promise<void> => {
    const res = await fetch(base + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message, sessionId: 'web:main', thinkingLevel }),
    });
    assert.equal(res.status, 202);
    const { turnId } = (await res.json()) as { turnId: string };
    for (let i = 0; i < 100; i++) {
      const t = (await (await fetch(`${base}/api/chat/web:main/${turnId}`)).json()) as { status: string };
      if (t.status === 'done' || t.status === 'error') return;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('turn never finished');
  };

  try {
    await send('first', 'high');
    assert.equal(seen[0]!.reasoning_effort, 'high', 'the picked level reaches the request body');

    await send('second', 'none');
    assert.equal('reasoning_effort' in seen[1]!, false, 'auto sends no effort');
  } finally {
    await handle.stop();
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  }
});

/** UI pin: the picker must be a real modal and the button must size to content. */
test('ui: thinking picker markup is a modal and the button is not a bare circle', async () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
  assert.ok(
    /#overlay, #modal, #modelPick, #thinkingPick \{/.test(html),
    'the thinking picker must use the modal sheet styles',
  );
  assert.ok(
    /#overlay \.card, #modal \.card, #modelPick \.card, #thinkingPick \.card \{/.test(html),
    'the thinking picker card must be styled like the other sheets',
  );
  assert.ok(/\.iconBtn\.thinkingBtn \{/.test(html) && /width: auto;/.test(html), 'thinking button sizes to content');
  assert.ok(/\.thinkingBtn \.modOn \{/.test(html), 'thinking chip has its own pill styling');
  assert.ok(html.includes('id="tpModelNote"'), 'picker explains the model in use');
  assert.ok(html.includes('aria-labelledby="tpTitle"'), 'picker is an accessible dialog');
  assert.ok(html.includes('closeThinkingPick'), 'picker has a close path');
  assert.ok(html.includes("e.key === 'Escape'"), 'Escape closes the picker');
  assert.ok(html.includes('.tpRow.unsupported'), 'unsupported levels are marked');
});
