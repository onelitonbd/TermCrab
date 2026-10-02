import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { getModelCapabilities, normalizeThinkingLevel, thinkingLevelToEffort, thinkingLevelToTokens } from '../src/providers/capabilities.js';
import { createOpenAi } from '../src/providers/openai.js';
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

/** thinking level — capability table + input validation for OpenAI-compatible models. */
test('capabilities: reasoning models are recognised, plain models are not', () => {
  assert.equal(getModelCapabilities('gpt-4o', 'openai').supportsThinking, false, 'gpt-4o must not get reasoning_effort');
  assert.equal(getModelCapabilities('gpt-4o-mini', 'openai').supportsThinking, false);
  assert.equal(getModelCapabilities('o3-mini', 'openai').supportsThinking, true, 'o3-mini is reasoning');
  assert.equal(getModelCapabilities('openai/o1-preview', 'openai').supportsThinking, true);
  assert.equal(getModelCapabilities('gpt-5', 'openai').supportsThinking, true);
  assert.equal(getModelCapabilities('deepseek-chat', 'deepseek').supportsThinking, false);
  assert.equal(getModelCapabilities('deepseek-r1', 'deepseek').supportsThinking, true, 'deepseek-r1 is reasoning');
  assert.equal(getModelCapabilities('deepseek-reasoner', 'deepseek').supportsThinking, true);
  assert.equal(getModelCapabilities('qwq-plus', 'openai').supportsThinking, true, 'QwQ is reasoning');
  assert.equal(getModelCapabilities('openrouter/model:thinking', 'openai').supportsThinking, true);
  assert.equal(getModelCapabilities('kimi-k2', 'openai').supportsThinking, true, 'Kimi k2 is reasoning');
  assert.equal(getModelCapabilities('llama3.2', 'ollama').supportsThinking, false);
});

test('capabilities: level-to-effort mapping for OpenAI effort API', () => {
  assert.equal(thinkingLevelToEffort('low'), 'low');
  assert.equal(thinkingLevelToEffort('medium'), 'medium');
  assert.equal(thinkingLevelToEffort('high'), 'high');
  assert.equal(thinkingLevelToEffort('xhigh'), 'high', 'xhigh collapses to high on OpenAI');
  assert.equal(thinkingLevelToEffort('max'), 'high', 'max collapses to high on OpenAI');
  assert.equal(thinkingLevelToEffort('none'), undefined);
});

test('capabilities: level-to-tokens mapping produces budgets', () => {
  assert.equal(thinkingLevelToTokens('none'), undefined);
  assert.equal(thinkingLevelToTokens('low'), 1024);
  assert.equal(thinkingLevelToTokens('medium'), 4096);
  assert.equal(thinkingLevelToTokens('high'), 16384);
  assert.equal(thinkingLevelToTokens('xhigh'), 32768);
  assert.equal(thinkingLevelToTokens('max'), 64000);
});

test('capabilities: only the six known levels pass validation', () => {
  assert.equal(normalizeThinkingLevel('none'), 'none');
  assert.equal(normalizeThinkingLevel('high'), 'high');
  assert.equal(normalizeThinkingLevel('max'), 'max');
  assert.equal(normalizeThinkingLevel('ultra'), undefined);
  assert.equal(normalizeThinkingLevel(42), undefined);
  assert.equal(normalizeThinkingLevel(undefined), undefined);
});

/** OpenAI-compatible: reasoning_effort only for reasoning models on official OpenAI. */
test('openai: reasoning_effort is gated on the model (official OpenAI host)', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
  };

  const plain = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'gpt-4o' }, fetchImpl);
  await plain.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal('reasoning_effort' in bodies[0]!, false, 'gpt-4o must never receive reasoning_effort (400 from OpenAI)');

  const reasoning = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini' }, fetchImpl);
  await reasoning.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'xhigh' },
    {},
  );
  assert.equal(bodies[1]!.reasoning_effort, 'high', 'xhigh maps to the highest OpenAI effort');
  assert.ok(bodies[1]!.reasoning, 'reasoning budget block attached');

  await reasoning.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'none' },
    {},
  );
  assert.equal('reasoning_effort' in bodies[2]!, false, 'none level sends no effort');

  const streamed = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini', stream: true }, fetchImpl);
  await streamed.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'low' },
    { onDelta: () => undefined },
  );
  assert.equal(bodies[3]!.reasoning_effort, 'low', 'streaming path carries the effort too');
});

/** Custom/self-hosted endpoints: forward reasoning_effort when user asks, even if we don't know the model. */
test('openai: custom hosts forward reasoning_effort for unknown models (trust the user)', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
  };
  const p = createOpenAi(
    { baseUrl: 'http://127.0.0.1:8080/v1', apiKey: 'k', model: 'acme-internal-reasoner', isCustomHost: true },
    fetchImpl,
  );
  await p.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'medium' },
    {},
  );
  assert.equal(bodies[0]!.reasoning_effort, 'medium', 'custom host forwards effort on user request');
});

/** Streaming: reasoning_content / thinking deltas reach onThinkingDelta. */
test('openai: reasoning_content deltas are surfaced as thinking; inline <think> tags stripped', async () => {
  const frames = [
    `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'Let me think… ' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'answer is 42' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: 'The answer is 42.' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`,
    'data: [DONE]\n\n',
  ];
  const provider = createOpenAi(
    { baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini', stream: true },
    async () => sseResponse(frames),
  );
  const chunks: string[] = [];
  const thinking: string[] = [];
  const res = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'q' }], tools: [], thinkingLevel: 'medium' },
    { onDelta: (c) => chunks.push(c), onThinkingDelta: (c) => thinking.push(c) },
  );
  assert.equal(res.thinking, 'Let me think… answer is 42');
  assert.equal(res.text, 'The answer is 42.');
  assert.deepEqual(thinking, ['Let me think… ', 'answer is 42']);
  assert.deepEqual(chunks, ['The answer is 42.']);
});

/** Non-streaming: reasoning_content / thinking fields and <think> tag extraction. */
test('openai: non-streaming reasoning fields and inline <think> extraction', async () => {
  const fetchImpl: FetchLike = async () => jsonResponse({
    choices: [{
      message: {
        content: '<think>hidden thought</think>visible answer',
        reasoning_content: 'prefixed thought',
      },
      finish_reason: 'stop',
    }],
  });
  const provider = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'deepseek-r1' }, fetchImpl);
  const res = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'q' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal(res.text, 'visible answer');
  assert.ok(res.thinking && /prefixed thought/.test(res.thinking));
  assert.ok(res.thinking && /hidden thought/.test(res.thinking));
});

/** Gateway: /api/config exposes capability info; bad levels never reach a turn. */
test('gateway: config reports thinking capability and drops bogus levels', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tthink-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = '';
  config.provider.model = 'gpt-4o';
  config.provider.apiKey = 'sk-test';
  config.provider.baseUrl = 'http://127.0.0.1:1/never';
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
      let b: Record<string, unknown> = {};
      try { b = JSON.parse(raw) as Record<string, unknown>; seen.push(b); } catch { /* ignore */ }
      // Always respond with valid JSON for non-stream, SSE for stream.
      if (b.stream) {
        res.writeHead(200, { 'content-type': 'text/event-stream' });
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'hello from upstream' } }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`);
        res.end('data: [DONE]\n\n');
      } else {
        const payload = JSON.stringify({
          choices: [{ message: { content: 'hello', reasoning_content: '…' }, finish_reason: 'stop' }],
        });
        res.writeHead(200, {
          'content-type': 'application/json',
          'content-length': String(Buffer.byteLength(payload)),
          connection: 'close',
        });
        res.end(payload);
      }
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
    // Find the streaming chat request (background probe sends non-stream probes first)
    const chatReq = seen.find((b) => b.stream === true);
    assert.ok(chatReq, 'streaming chat request reached upstream');
    assert.equal(chatReq!.reasoning_effort, 'high', 'the picked level reaches the chat request body');

    await send('second', 'none');
    const chatReq2 = [...seen].reverse().find((b) => b.stream === true);
    assert.ok(chatReq2, 'second streaming request reached upstream');
    assert.equal('reasoning_effort' in chatReq2!, false, 'none sends no effort');
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
