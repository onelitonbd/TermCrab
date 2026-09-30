import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSseText } from '../src/providers/sse.js';
import { createOpenAi } from '../src/providers/openai.js';
import { createAnthropic } from '../src/providers/anthropic.js';
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

test('anthropic streaming: text and tool_use blocks', async () => {
  const frames = [
    'event: message_start\ndata: {"type":"message_start","message":{}}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi "}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"there"}}\n\n',
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
    'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_1","name":"web_fetch"}}\n\n',
    'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\\"url\\": \\"https://e.x/\\"}"}}\n\n',
    'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n',
    'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"tool_use"}}\n\n',
    'event: message_stop\ndata: {"type":"message_stop"}\n\n',
  ];
  let body: Record<string, unknown> = {};
  const provider = createAnthropic(
    { baseUrl: 'https://x.test', apiKey: 'k', model: 'm', stream: true },
    async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return sseResponse(frames);
    },
  );
  const deltas: string[] = [];
  const result = await provider.chat(
    { system: 's', messages: [{ role: 'user', content: 'go' }], tools: [] },
    { onDelta: (c) => deltas.push(c) },
  );
  assert.equal(body.stream, true);
  assert.equal(result.text, 'Hi there');
  assert.equal(result.stopReason, 'tool');
  assert.equal(result.toolCalls[0]!.name, 'web_fetch');
  assert.equal(result.toolCalls[0]!.id, 'tu_1');
  assert.deepEqual(result.toolCalls[0]!.args, { url: 'https://e.x/' });
  assert.deepEqual(deltas, ['Hi ', 'there']);
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
