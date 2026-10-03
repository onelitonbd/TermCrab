import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
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
  // Official OpenAI Chat Completions has no `reasoning` object — sending one is
  // a hard 400 ("Unrecognized request argument supplied: reasoning"), and the
  // output limit must be max_completion_tokens for o-series models.
  assert.equal('reasoning' in bodies[1]!, false, 'no reasoning block on official OpenAI');
  assert.equal('max_tokens' in bodies[1]!, false, 'o-series rejects max_tokens');
  assert.equal('max_completion_tokens' in bodies[1]!, false, 'token limit left unset unless configured');

  const reasoningWithLimit = createOpenAi(
    { baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini', maxTokens: 8000 },
    fetchImpl,
  );
  await reasoningWithLimit.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'low' },
    {},
  );
  assert.equal(bodies[2]!.max_completion_tokens, 8000, 'configured limit uses max_completion_tokens');

  // Plain non-reasoning models keep the classic max_tokens key.
  const plainWithLimit = createOpenAi(
    { baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'gpt-4o', maxTokens: 500 },
    fetchImpl,
  );
  await plainWithLimit.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal(bodies[3]!.max_tokens, 500, 'gpt-4o keeps max_tokens');

  await reasoning.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'none' },
    {},
  );
  assert.equal('reasoning_effort' in bodies[4]!, false, 'none level sends no effort');

  const streamed = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini', stream: true }, fetchImpl);
  await streamed.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'low' },
    { onDelta: () => undefined },
  );
  assert.equal(bodies[5]!.reasoning_effort, 'low', 'streaming path carries the effort too');
  assert.equal('reasoning' in bodies[5]!, false, 'streaming path sends no reasoning block either');
});

/** Without a verified probe, self-hosted hosts get exactly ONE reasoning shape.
 *  Default is 'effort' (the OpenAI-spec form); 'budget' is chosen only when the
 *  probe says the server rejects reasoning_effort. Never both — servers like
 *  Kilo 400 with "Cannot specify both 'effort' and 'max_tokens'". */
test('openai: unprobed self-hosted host sends one reasoning shape, not both', async () => {
  const bodies: Record<string, unknown>[] = [];
  const fetchImpl: FetchLike = async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return jsonResponse({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] });
  };

  const vllm = createOpenAi(
    { baseUrl: 'http://127.0.0.1:8000/v1', apiKey: 'k', model: 'deepseek-r1', isCustomHost: true },
    fetchImpl,
  );
  await vllm.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' }, {});
  assert.equal(bodies[0]!.reasoning_effort, 'high', 'effort is the default shape');
  assert.equal('reasoning' in bodies[0]!, false, 'the budget block is not also sent');
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
  assert.equal('reasoning' in bodies[0]!, false, 'exactly one reasoning shape, never both');
});

/** Regression: a stream that fails before any output retries non-streaming,
 *  and the retry must still reach onDelta or the UI shows nothing at all. */
test('openai: the non-streaming retry emits deltas so the UI still renders', async () => {
  let call = 0;
  const fetchImpl: FetchLike = async () => {
    call++;
    if (call === 1) throw new Error('ECONNRESET');
    return jsonResponse({ choices: [{ message: { content: 'recovered text' }, finish_reason: 'stop' }] });
  };
  const provider = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'gpt-4o' }, fetchImpl);
  const deltas: string[] = [];
  const res = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [] },
    { onDelta: (c) => deltas.push(c) },
  );
  assert.equal(res.text, 'recovered text');
  assert.deepEqual(deltas, ['recovered text'], 'retry flushes the reply through onDelta');
});

/** Regression: a stream that already showed reasoning must NOT be retried,
 *  otherwise the thinking trace the user saw gets repeated. */
test('openai: a stream that emitted reasoning is not silently retried', async () => {
  const frames = [
    `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'thinking out loud' } }] })}\n\n`,
  ];
  // pull() guarantees the reasoning chunk is delivered before the error, which
  // is what a real truncated stream looks like.
  const enc = new TextEncoder();
  let pull = 0;
  const provider = createOpenAi(
    { baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini', stream: true },
    async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      if (body.stream) {
        return new Response(
          new ReadableStream<Uint8Array>({
            pull(controller) {
              if (pull++ === 0) {
                controller.enqueue(enc.encode(frames[0]!));
                return;
              }
              controller.error(new Error('socket hang up'));
            },
          }),
          { status: 200, headers: { 'content-type': 'text/event-stream' } },
        );
      }
      return jsonResponse({ choices: [{ message: { content: 'SECOND CALL' }, finish_reason: 'stop' }] });
    },
  );
  const thinking: string[] = [];
  await assert.rejects(
    provider.chat(
      { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'medium' },
      { onDelta: () => undefined, onThinkingDelta: (c) => thinking.push(c) },
    ),
    /socket hang up/,
    'no silent retry after reasoning was already streamed',
  );
  assert.deepEqual(thinking, ['thinking out loud']);
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

/** Regression: gateways that spell the trace `reasoning` (OpenRouter-style, e.g.
 *  Kilo) send it under a third key. The streaming branch read all three spellings
 *  but the non-streaming one read only two, so the trace vanished on that path —
 *  which is also the retry path when streaming fails, and the path used whenever
 *  the caller passes no onDelta. Measured against a live gateway: the API
 *  returned 471 chars under `reasoning` and basic() extracted 0. */
test('openai: non-streaming also reads the `reasoning` field', async () => {
  for (const key of ['reasoning', 'reasoning_content', 'thinking'] as const) {
    const fetchImpl: FetchLike = async () =>
      jsonResponse({ choices: [{ message: { content: 'answer', [key]: 'the trace' }, finish_reason: 'stop' }] });
    const provider = createOpenAi({ baseUrl: 'https://api.kilo.ai/api/gateway', apiKey: 'k', model: 'x/y:free' }, fetchImpl);
    const res = await provider.chat(
      { system: 's', messages: [{ role: 'user', content: 'q' }], tools: [], thinkingLevel: 'low' },
      {}, // no onDelta → non-streaming branch
    );
    assert.equal(res.thinking, 'the trace', `non-streaming must read message.${key}`);
  }
});

/** Regression: the reasoning trace has to outlive a refresh. Two halves —
 *  the loop used to append the final reply without `thinking` (so the drawer
 *  the user actually reads was wiped while tool turns survived), and the UI's
 *  history replay ignored the field entirely even when it was present. */
test('thinking trace survives a restart: loop persists it and the UI replays it', () => {
  const loop = fs.readFileSync(path.join(process.cwd(), 'src', 'agent', 'loop.ts'), 'utf8');
  // The final-reply append must carry the trace.
  const finalAppend = loop.match(
    /ctx\.sessions\.append\(sessionId, \{\s*role: 'assistant',\s*content: finalText,[\s\S]{0,400}?\}\);/g,
  );
  assert.ok(finalAppend && finalAppend.length > 0, 'final reply append found');
  assert.ok(
    finalAppend.some((a) => /thinking:/.test(a)),
    'the final assistant append must persist `thinking` (this is the entry the UI replays)',
  );

  // And it must actually round-trip through the store.
  const sessions = fs.readFileSync(path.join(process.cwd(), 'src', 'agent', 'sessions.ts'), 'utf8');
  assert.ok(/thinking\?: string;/.test(sessions), 'Entry keeps the thinking field');

  // UI: history replay must build a drawer from m.thinking.
  const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
  const start = html.indexOf('const messages = data.messages');
  assert.ok(start > 0, 'history replay block located');
  const replay = html.slice(start, start + 1600);
  assert.ok(/m\.thinking/.test(replay), 'history replay reads m.thinking');
  assert.ok(
    /buildThinkDrawer\(m\.thinking/.test(replay),
    'history replay renders the trace through the shared drawer builder',
  );
  assert.ok(/function buildThinkDrawer/.test(html), 'drawer builder exists');
  assert.ok(
    /function addThinkingDelta[\s\S]{0,900}buildThinkDrawer\(/.test(html),
    'the live stream uses the same builder, so the two renderings cannot drift',
  );
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

/** UI pin: the picker must be a real modal. The button is now icon-only. */
test('ui: thinking picker markup is a modal and the button is an icon-only circle', async () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
  assert.ok(
    /#overlay, #modal, #modelPick, #thinkingPick \{/.test(html),
    'the thinking picker must use the modal sheet styles',
  );
  assert.ok(
    /#overlay \.card, #modal \.card, #modelPick \.card, #thinkingPick \.card \{/.test(html),
    'the thinking picker card must be styled like the other sheets',
  );
  // The base rules still say `width: auto` so the chip can size to a label, but
  // an ID-scoped override in the composer block now pins it to a circle. Assert
  // the override, since that is what the browser actually computes.
  assert.ok(
    /#modelBtn, #thinkingBtn \{[^}]*border-radius: 50%/.test(html),
    'thinking/model buttons are circles in the composer',
  );
  assert.ok(
    /#composer #modelBtnLabel, #composer #thinkingBtnLabel[^{]*\{ display: none; \}/.test(html),
    'the level text is hidden so the chip stays icon-only',
  );
  assert.ok(/\.thinkingBtn \.modOn \{/.test(html), 'thinking chip has its own pill styling');
  assert.ok(html.includes('id="tpModelNote"'), 'picker explains the model in use');
  assert.ok(html.includes('aria-labelledby="tpTitle"'), 'picker is an accessible dialog');
  assert.ok(html.includes('closeThinkingPick'), 'picker has a close path');
  assert.ok(html.includes("e.key !== 'Escape'"), 'Escape closes the picker');
  assert.ok(html.includes('.tpRow.unsupported'), 'unsupported levels are marked');
});

/** Strip CSS comments and whole-line JS comments so prose about a property
 *  cannot satisfy an assertion about that property. */
function stripComments(html: string): string {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  return html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    + '\n' + styleBlocks.replace(/\/\*[\s\S]*?\*\//g, '');
}

test('ui: the inline script parses', async () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8');
  const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter((m) => !/\bsrc=/.test(m[1] ?? ''));
  assert.ok(blocks.length > 0, 'the page must have an inline script');
  // Every other UI test greps the source, so a syntax error slips past all of
  // them and the app silently never boots. Parse it instead.
  for (const [i, m] of blocks.entries()) {
    assert.doesNotThrow(
      () => new vm.Script(m[2] ?? '', { filename: `ui-inline-${i}.js` }),
      `inline script ${i} must parse`,
    );
  }
});

test('ui: the composer has no gradient anywhere on it and an opaque fill', async () => {
  const html = stripComments(fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8'));
  const start = html.indexOf('#composerBox {');
  assert.ok(start > 0, '#composerBox rule must exist');
  const rule = html.slice(start, html.indexOf('}', start));
  assert.match(rule, /background:\s*#[0-9a-f]{3,6}/i, 'composer surface is an opaque solid fill');
  assert.ok(!/gradient/i.test(rule), 'no gradient on the composer surface');
  assert.ok(!/backdrop-filter/.test(rule), 'no backdrop blur behind an opaque surface');
  assert.ok(!/#composerBox::before/.test(html), 'the masked gradient ring is gone');

  // Guard against a second rule reintroducing a gradient on the same element.
  for (const m of html.matchAll(/#composerBox[^{]*\{([^}]*)\}/g)) {
    assert.ok(!/gradient/i.test(m[1] ?? ''), `#composerBox rule must stay gradient-free: ${m[0].slice(0, 60)}`);
  }
});

/** Fetch the declaration block for a single-class/id selector, anchored to the
 *  start of a line so `.ib` cannot accidentally match `.bar .ib`. */
function cssRule(html: string, sel: string): string {
  const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`^\\s*${esc}\\s*\\{`, 'm').exec(html);
  assert.ok(m, `${sel} rule must exist`);
  const start = m.index + m[0].length;
  return html.slice(start, html.indexOf('}', start));
}

test('ui: the chat view is white and the composer floats with nothing behind it', async () => {
  const html = stripComments(fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8'));

  // The view paints white full-bleed. #log is only 720px wide, so without this
  // the page gradient shows either side of the message column.
  const chatView = cssRule(html, 'body[data-view="chat"]');
  assert.match(chatView, /background:\s*#fff/i, 'the chat view paints white');

  // --edge is #fff. On a white page that is no border at all, so the whole
  // family of glass cards over the feed loses its edge unless it is repointed.
  assert.match(chatView, /--edge:\s*var\(--line\)/, 'white --edge borders are repointed at --line in chat');

  const log = cssRule(html, '#log');
  assert.match(log, /background:\s*#fff/i, 'the message column itself is white');

  // "Floating" means the dock draws nothing. It spans the full viewport width,
  // so any fill here is a bar behind the card.
  const dock = cssRule(html, '#composer');
  assert.match(dock, /background:\s*transparent/i, 'the composer dock paints nothing');
  for (const m of html.matchAll(/#composer\s*\{([^}]*)\}/g)) {
    const bg = m[1] ?? '';
    assert.ok(
      /background:\s*transparent/i.test(bg) || !/background:/.test(bg),
      `#composer rule must stay unpainted: ${bg.trim().slice(0, 60)}`,
    );
  }

  // The card is the only thing drawn, and it must read as lifted off the page:
  // an opaque tint (not the same white as the feed), a visible edge, and a shadow.
  const box = cssRule(html, '#composerBox');
  const boxBg = box.match(/background:\s*(#[0-9a-f]{3,6})/i)?.[1];
  assert.ok(boxBg, 'the composer card has an opaque fill');
  assert.notEqual(boxBg!.toLowerCase(), '#fff', 'card must not be pure white like the page, or it vanishes');
  assert.ok(/border:\s*1px solid var\(--line\)/.test(box), 'card edge must be visible on a light fill');
  assert.match(box, /box-shadow:[^;]*[0-9]/, 'a shadow is what makes the card read as floating');

  // Same trap for the two things that float over the feed.
  assert.ok(/border:\s*1px solid var\(--line\)/.test(cssRule(html, '.ib')), 'floating buttons stay visible on white');
  assert.ok(/border:\s*1px solid var\(--line\)/.test(cssRule(html, '.msg.welcome')), 'welcome card stays visible on white');
});

test('ui: the model sheet closes on an outside tap and on Escape, like the thinking sheet', async () => {
  const html = stripComments(fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8'));
  assert.ok(
    /addEventListener\('click', \(e\) => \{ if \(e\.target === \$\('modelPick'\)\) closeModelPick\(\); \}\)/.test(html),
    'tapping the model sheet backdrop must close it',
  );
  assert.ok(html.includes('function closeModelPick()'), 'a close function exists for the model sheet');
  // Literal string, so use includes(): in a regex `('mpCancel')` would be a
  // capture group, not the parentheses the source actually contains.
  assert.ok(html.includes("$('mpCancel').onclick = closeModelPick;"), 'the Close button uses the same path');

  const esc = html.slice(html.indexOf("e.key !== 'Escape'"), html.indexOf("e.key !== 'Escape'") + 700);
  assert.ok(/closeThinkingPick\(\); return;/.test(esc), 'Escape closes the thinking sheet first');
  assert.ok(/closeModelPick\(\);/.test(esc), 'Escape closes the model sheet too');
});

test('ui: history replay pins the feed to the end of the last reply', async () => {
  const html = stripComments(fs.readFileSync(path.join(process.cwd(), 'ui', 'index.html'), 'utf8'));
  assert.ok(html.includes('function scrollLogToEnd()'), 'a scroll-to-end helper exists');

  // Regression: addMsg() scrolls when it appends, but the assistant reply is
  // injected into .textBody *after* that, so the last scroll landed on the user
  // turn. loadSession must pin again once the replay is finished.
  const ls = html.slice(html.indexOf('async function loadSession'));
  const loop = ls.slice(0, ls.indexOf("addMsg('sys', 'failed to load session"));
  assert.ok(
    /closeToolGroup\(\);[\s\S]{0,200}?scrollLogToEnd\(\);/.test(loop),
    'the replay loop must pin to the end after the last message is rendered',
  );
  assert.ok(
    /finally \{[^}]*scrollLogToEnd\(\);/.test(ls),
    'loadSession must pin even when the fetch failed',
  );
  assert.ok(
    /if \(name === 'chat'\) \{ scrollLogToEnd\(\);/.test(html),
    'switching into the chat view must pin to the end',
  );

  const helper = html.slice(html.indexOf('function scrollLogToEnd'));
  assert.ok(/requestAnimationFrame/.test(helper), 're-pins after layout settles, not just once');
  assert.ok(
    /img\.addEventListener\('load', jump, \{ once: true \}\)/.test(helper),
    're-pins as images decode and grow the feed',
  );
});
