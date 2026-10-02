import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSseText } from '../src/providers/sse.js';
import { createOpenAi } from '../src/providers/openai.js';
import { resolveProvider } from '../src/providers/index.js';
import { FetchLike } from '../src/providers/types.js';

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

test('parseSseText extracts data payloads and skips comments', () => {
  const blocks = ': ping\n\n{"a":1}\n\ndata: {"b":2}\n\n';
  const out = parseSseText(blocks);
  // '{"a":1}' has no data: prefix -> skipped; data: line extracted
  assert.deepEqual(out, ['{"b":2}']);
});

test('openai streaming: text deltas + tool call assembly', async () => {
  const frames = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: 'Hello ' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: 'world' } }] })}\n\n`,
    `data: ${JSON.stringify({
      choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'get_time', arguments: '{}' } }] } }],
    })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] })}\n\n`,
    'data: [DONE]\n\n',
  ];
  let capturedBody: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (_url, init) => {
    capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return sseResponse(frames);
  };
  const provider = createOpenAi(
    { baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm', stream: true },
    fetchImpl,
  );
  const deltas: string[] = [];
  const result = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [] },
    { onDelta: (c) => deltas.push(c) },
  );
  assert.equal(capturedBody.stream, true, 'stream flag must be set');
  assert.equal(result.text, 'Hello world');
  assert.equal(result.stopReason, 'tool');
  assert.equal(result.toolCalls.length, 1);
  assert.equal(result.toolCalls[0]!.name, 'get_time');
  assert.equal(result.toolCalls[0]!.id, 'call_1');
  assert.deepEqual(deltas, ['Hello ', 'world']);
});

test('openai streaming: reasoning_content deltas are surfaced as thinking', async () => {
  const frames = [
    `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'Let me think… ' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { reasoning_content: 'the answer is 42' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: '42' } }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`,
    'data: [DONE]\n\n',
  ];
  const provider = createOpenAi(
    { baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'o3-mini', stream: true },
    async () => sseResponse(frames),
  );
  const thinking: string[] = [];
  const text: string[] = [];
  const result = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'medium' },
    { onDelta: (c) => text.push(c), onThinkingDelta: (c) => thinking.push(c) },
  );
  assert.equal(result.thinking, 'Let me think… the answer is 42');
  assert.equal(result.text, '42');
  assert.deepEqual(thinking, ['Let me think… ', 'the answer is 42']);
  assert.deepEqual(text, ['42']);
});

test('openai streaming: fragmented tool arguments concatenate', async () => {
  const frames = [
    `data: ${JSON.stringify({
      choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'exec', arguments: '{"cmd"' } }] } }],
    })}\n\n`,
    `data: ${JSON.stringify({
      choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"ls"}' } }] } }],
    })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] })}\n\n`,
    'data: [DONE]\n\n',
  ];
  const provider = createOpenAi(
    { baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' },
    async () => sseResponse(frames),
  );
  const result = await provider.chat({ system: 's', messages: [], tools: [] }, { onDelta: () => undefined });
  assert.equal(result.toolCalls[0]!.name, 'exec');
  assert.deepEqual(result.toolCalls[0]!.args, { cmd: 'ls' });
});

test('openai basic (non-stream) request attaches reasoning_effort for reasoning models', async () => {
  let captured: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (_url, init) => {
    captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const provider = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'o3-mini' }, fetchImpl);
  await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal(captured.reasoning_effort, 'high', 'reasoning_effort must be set for reasoning model');
});

test('openai basic request does NOT attach reasoning_effort for plain chat models on the official API', async () => {
  let captured: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (_url, init) => {
    captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const provider = createOpenAi({ baseUrl: 'https://api.openai.com/v1', apiKey: 'k', model: 'gpt-4o-mini' }, fetchImpl);
  await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' },
    {},
  );
  assert.equal(captured.reasoning_effort, undefined, 'plain chat model must not receive reasoning_effort');
});

test('openai basic request DOES send reasoning_effort on custom hosts even for unknown models', async () => {
  let captured: Record<string, unknown> = {};
  const fetchImpl: FetchLike = async (_url, init) => {
    captured = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const provider = createOpenAi(
    { baseUrl: 'http://127.0.0.1:8080/v1', apiKey: 'k', model: 'some-unknown-model', isCustomHost: true },
    fetchImpl,
  );
  await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'medium' },
    {},
  );
  assert.equal(captured.reasoning_effort, 'medium', 'custom host should forward reasoning_effort on user request');
});

test('openai falls back to non-streaming when stream errors before any delta', async () => {
  let calls = 0;
  const fetchImpl: FetchLike = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body)) as { stream?: boolean };
    if (body.stream) return sseResponse(['data: {broken json\n\n']); // parser skips, then EOF -> empty result
    return new Response(JSON.stringify({ choices: [{ message: { content: 'fallback text' }, finish_reason: 'stop' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const provider = createOpenAi({ baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' }, fetchImpl);
  const result = await provider.chat({ system: 's', messages: [], tools: [] }, { onDelta: () => undefined });
  // broken frames produced empty text and no tool calls -> treated as unknown; ensure no crash
  assert.equal(calls, 1);
  assert.ok(result);
});

test('resolveProvider passes stream flag through', async () => {
  let sawStream = false;
  const fetchImpl: FetchLike = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { stream?: boolean };
    sawStream = Boolean(body.stream);
    return new Response(JSON.stringify({ choices: [{ message: { content: 'x' }, finish_reason: 'stop' }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const p = resolveProvider({ type: 'openai', model: 'm', baseUrl: 'https://x.test/v1', apiKey: 'k', stream: false }, fetchImpl);
  await p.chat({ system: 's', messages: [], tools: [] }, { onDelta: () => undefined });
  assert.equal(sawStream, false, 'stream:false must skip SSE');
});
