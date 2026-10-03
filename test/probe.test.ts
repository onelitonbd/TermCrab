import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { probeModel, getCachedCaps, getModelCaps, modelCapsKey } from '../src/providers/probe.js';
import { getModelCapabilities, isOpenAiOfficialHost } from '../src/providers/capabilities.js';
import { createOpenAi } from '../src/providers/openai.js';
import { isWellKnownBase, providerNameFor } from '../src/providers/index.js';

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

/* -------------------------------------------------------------------------
 * Regressions
 * ---------------------------------------------------------------------- */

/** A 401 means the request never reached parameter validation, so it says
 *  nothing about reasoning support. Caching it as "accepted" marked plain
 *  models like gpt-4o as reasoning-capable, and applyThinking() trusts the
 *  cache over the heuristic — so the next real turn sent reasoning_effort to
 *  gpt-4o and got a hard 400. */
test('probe: 401 is inconclusive — nothing is cached and the heuristic stands', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'probe401-'));
  process.env.TCRAB_HOME = home;
  const fetchImpl = async () =>
    new Response(JSON.stringify({ error: { message: 'Incorrect API key provided' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

  const base = 'https://api.openai.com/v1';
  const r = await probeModel({ baseUrl: base, model: 'gpt-4o', apiKey: 'sk-wrong', fetchImpl, force: true });
  assert.equal(r.supportsThinking, false, 'a plain model stays non-reasoning');
  assert.equal(getCachedCaps(base, 'gpt-4o', 'sk-wrong'), null, 'a 401 is never cached');
});

test('probe: a network error is inconclusive and caches nothing', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'probeNet-'));
  process.env.TCRAB_HOME = home;
  const fetchImpl = async () => {
    throw new Error('ECONNREFUSED');
  };
  const base = 'https://api.openai.com/v1';
  const r = await probeModel({ baseUrl: base, model: 'deepseek-r1', apiKey: 'k', fetchImpl, force: true });
  assert.equal(r.supportsThinking, true, 'falls back to the heuristic for a known reasoning model');
  assert.equal(getCachedCaps(base, 'deepseek-r1', 'k'), null, 'nothing cached');
});

/** Probing an o-series model used to send `max_tokens: 1`, which OpenAI
 *  rejects with "Unsupported parameter: 'max_tokens'" — a body the probe
 *  misreads as "this effort level is unsupported". Every o3/o4/gpt-5 probe
 *  therefore concluded the model could not reason. */
test('probe: reasoning models are probed with max_completion_tokens', async () => {
  const seen: Record<string, unknown>[] = [];
  const srv = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      seen.push(JSON.parse(raw || '{}'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }] }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
  const port = (srv.address() as net.AddressInfo).port;
  const base = `http://127.0.0.1:${port}/v1`;
  try {
    const r = await probeModel({ baseUrl: base, model: 'o3-mini', apiKey: 'k', force: true });
    assert.ok(seen.length > 0, 'probe sent requests');
    for (const b of seen) {
      assert.equal('max_tokens' in b, false, 'no max_tokens on a reasoning model');
      assert.equal(b.max_completion_tokens, 1);
    }
    assert.equal(r.supportsThinking, true, 'probe no longer false-negatives');
  } finally {
    srv.close();
  }
});

/** Verified answers used to be trusted forever; a wrong one (bad key at probe
 *  time, model since changed) would stick with no way back. */
test('probe: cached answers expire instead of being trusted forever', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'probeTtl-'));
  process.env.TCRAB_HOME = home;
  const base = 'https://api.openai.com/v1';
  const key = modelCapsKey(base, 'o3-mini', 'sk-ttl');
  fs.mkdirSync(path.join(home, 'state'), { recursive: true });
  fs.writeFileSync(
    path.join(home, 'state', 'model-caps.json'),
    JSON.stringify({
      [key]: {
        probedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        supportsThinking: false,
        supportedLevels: ['none'],
        defaultLevel: 'none',
      },
    }),
  );
  assert.equal(getCachedCaps(base, 'o3-mini', 'sk-ttl'), null, 'a month-old record is not trusted');
});

/** Regression: Kilo and other OpenRouter-style gateways accept
 *  reasoning_effort OR reasoning:{max_tokens} but 400 when both are sent
 *  ("Cannot specify both 'effort' and 'max_tokens' in reasoning parameter").
 *  The probe now detects which shape the server takes, and the client sends
 *  exactly one. */
test('probe: detects the reasoning mechanism and never sends both', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'probeMech-'));
  process.env.TCRAB_HOME = home;
  const seen: Record<string, unknown>[] = [];
  // Server accepts effort only; rejects any request carrying `reasoning`.
  const srv = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const b = JSON.parse(raw || '{}');
      seen.push(b);
      if ('reasoning' in b) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: "Cannot specify both 'effort' and 'max_tokens' in reasoning parameter" } }));
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
    const caps = await probeModel({ baseUrl: base, model: 'some/model:free', apiKey: 'k', force: true });
    assert.equal(caps.supportsThinking, true);
    assert.equal(caps.mechanism, 'effort', 'probe picked the effort shape');

    let captured: Record<string, unknown> = {};
    const p = createOpenAi({ baseUrl: base, apiKey: 'k', model: 'some/model:free', isCustomHost: true }, async (_u, init) => {
      captured = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    await p.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' }, {});
    assert.equal('reasoning_effort' in captured, true, 'effort shape sent');
    assert.equal('reasoning' in captured, false, 'the other shape is NOT also sent');
    assert.equal(captured.reasoning_effort, 'high');
  } finally {
    srv.close();
  }
});

test('probe: a budget-only server is detected and used', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'probeBudget-'));
  process.env.TCRAB_HOME = home;
  // Server rejects reasoning_effort, accepts reasoning:{max_tokens}.
  const srv = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const b = JSON.parse(raw || '{}');
      if ('reasoning_effort' in b) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { message: "Unsupported parameter: 'reasoning_effort' is not supported." } }));
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
    const caps = await probeModel({ baseUrl: base, model: 'deepseek-r1', apiKey: 'k', force: true });
    assert.equal(caps.supportsThinking, true);
    assert.equal(caps.mechanism, 'budget', 'probe fell back to the budget shape');

    let captured: Record<string, unknown> = {};
    const p = createOpenAi({ baseUrl: base, apiKey: 'k', model: 'deepseek-r1', isCustomHost: true }, async (_u, init) => {
      captured = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    await p.chat({ system: 's', messages: [{ role: 'user', content: 'hi' }], tools: [], thinkingLevel: 'high' }, {});
    assert.equal('reasoning' in captured, true, 'budget shape sent');
    assert.equal('reasoning_effort' in captured, false, 'effort shape not sent');
  } finally {
    srv.close();
  }
});

test('isWellKnownBase recognises spelling variants of known hosts', () => {
  assert.equal(isWellKnownBase('https://api.openai.com/v1'), true);
  assert.equal(isWellKnownBase('https://api.openai.com/v1/'), true, 'trailing slash');
  assert.equal(isWellKnownBase('https://api.openai.com'), true, 'no /v1 suffix');
  assert.equal(isWellKnownBase('https://openrouter.ai/api/v1/'), true, 'trailing slash on openrouter');
  assert.equal(isWellKnownBase('https://api.deepseek.com/v1'), true);
  assert.equal(isWellKnownBase('http://127.0.0.1:11434/v1'), true);
  assert.equal(isWellKnownBase('http://127.0.0.1:8000/v1'), false, 'self-hosted is custom');
  assert.equal(isWellKnownBase('https://api.openai.com.evil.test/v1'), false, 'lookalike host is custom');
  assert.equal(isWellKnownBase('not-a-url'), false, 'garbage does not throw');
});

test('providerNameFor labels known hosts for heuristic detection', () => {
  assert.equal(providerNameFor('https://api.deepseek.com/v1'), 'deepseek');
  assert.equal(providerNameFor('https://openrouter.ai/api/v1/'), 'openrouter');
  assert.equal(providerNameFor('http://127.0.0.1:8000/v1'), 'openai-compatible');
});

test('isOpenAiOfficialHost only matches OpenAI itself', () => {
  assert.equal(isOpenAiOfficialHost('https://api.openai.com/v1'), true);
  assert.equal(isOpenAiOfficialHost('https://api.openai.com'), true);
  assert.equal(isOpenAiOfficialHost('http://api.openai.com/v1'), true);
  assert.equal(isOpenAiOfficialHost('api.openai.com/v1'), true, 'scheme-less spelling');
  // These must be treated as custom, or reasoning params get stripped from a
  // self-hosted server (or a hostile host gets OpenAI's stricter handling).
  assert.equal(isOpenAiOfficialHost('https://api.openai.com.evil.test/v1'), false, 'lookalike host');
  assert.equal(isOpenAiOfficialHost('https://openai.com.evil.test/v1'), false, 'lookalike host');
  assert.equal(isOpenAiOfficialHost('https://notopenai.com/v1'), false);
  assert.equal(isOpenAiOfficialHost('https://openrouter.ai/api/v1'), false);
  assert.equal(isOpenAiOfficialHost('http://127.0.0.1:8000/v1'), false);
  assert.equal(isOpenAiOfficialHost(''), false);
  assert.equal(isOpenAiOfficialHost('not-a-url'), false);
});
