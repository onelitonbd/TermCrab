import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { probeModel, getCachedCaps, getModelCaps, modelCapsKey } from '../src/providers/probe.js';
import { getModelCapabilities } from '../src/providers/capabilities.js';
import { createOpenAi } from '../src/providers/openai.js';

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

test('probe: server that accepts reasoning_effort → supports all levels', async () => {
  const srv = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }] }));
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as net.AddressInfo).port;
  const base = `http://127.0.0.1:${port}/v1`;
  try {
    const r = await probeModel({ baseUrl: base, model: 'o3-mini', apiKey: 'k', force: true });
    assert.equal(r.supportsThinking, true);
    assert.deepEqual(r.supportedLevels, ['none', 'low', 'medium', 'high', 'xhigh', 'max']);
    assert.equal(r.defaultLevel, 'medium');
    // Cached.
    const cached = getCachedCaps(base, 'o3-mini', 'k');
    assert.ok(cached, 'cached result available');
    assert.equal(cached!.supportsThinking, true);
  } finally {
    srv.close();
  }
});

test('probe: server that rejects reasoning_effort (400 names param) → supportsThinking false', async () => {
  const srv = http.createServer((req, res) => {
    if (req.method === 'POST') {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning_effort' is not supported with this model." } }));
      return;
    }
    res.writeHead(200); res.end();
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as net.AddressInfo).port;
  const base = `http://127.0.0.1:${port}/v1`;
  try {
    const r = await probeModel({ baseUrl: base, model: 'gpt-4o-mini', apiKey: 'k', force: true });
    assert.equal(r.supportsThinking, false);
    assert.deepEqual(r.supportedLevels, ['none']);
    assert.ok(r.rejectReason && /reasoning_effort/.test(r.rejectReason), 'reject reason captured');
  } finally {
    srv.close();
  }
});

test('applyThinking clamps to probed supported levels', async () => {
  // Fake server: rejects high, accepts low/medium.
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      const b = JSON.parse(body || '{}');
      if (b.reasoning_effort === 'high') {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning_effort' value 'high'." } }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as net.AddressInfo).port;
  const base = `http://127.0.0.1:${port}/v1`;
  try {
    const caps = await probeModel({ baseUrl: base, model: 'custom-model', apiKey: 'k', force: true });
    assert.equal(caps.supportsThinking, true);
    // Our probe tests low/medium/high; high rejected, low/medium accepted.
    assert.ok(caps.supportedLevels.includes('low'));
    assert.ok(caps.supportedLevels.includes('medium'));
    assert.ok(!caps.supportedLevels.includes('high'));

    // Send a request with thinkingLevel=max. The client should clamp to
    // 'medium' (highest accepted), never send high.
    let captured: Record<string, unknown> = {};
    const p = createOpenAi({ baseUrl: base, apiKey: 'k', model: 'custom-model', isCustomHost: true }, async (_url, init) => {
      const text = init?.body ? String(init.body) : '{}';
      captured = JSON.parse(text);
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    await p.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'max' }, {});
    assert.equal(captured.reasoning_effort, 'medium', 'max should clamp down to medium when high is rejected');
  } finally {
    srv.close();
  }
});

test('modelCapsKey is stable', () => {
  const a = modelCapsKey('https://api.openai.com/v1', 'gpt-4o', 'sk-xxx');
  const b = modelCapsKey('https://api.openai.com/v1/', 'gpt-4o', 'sk-xxx');
  assert.equal(a, b, 'trailing slashes normalized');
  const c = modelCapsKey('https://api.openai.com/v1', 'gpt-4o', 'sk-yyy');
  assert.notEqual(a, c, 'different keys produce different entries');
});

test('getModelCaps falls back to heuristic when nothing cached', () => {
  const heuristic = getModelCapabilities('o3-mini', 'openai');
  const caps = getModelCaps('https://api.openai.com/v1', 'o3-mini-not-real-model-xxx', '', heuristic);
  assert.equal(caps.supportsThinking, heuristic.supportsThinking);
});
