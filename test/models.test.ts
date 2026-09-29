import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults } from '../src/core/config.js';

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

/** v0.20.0: Models page — fetch a provider catalog, tick to save, switch live. */
test('models API: fetch / register / use, everything live', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tmdl-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = 'test-token';
  const port = await freePort();
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;

  const req = async (
    p: string,
    method = 'GET',
    body?: unknown,
  ): Promise<{ status: number; data: Record<string, unknown> }> => {
    const res = await fetch(base + p, {
      method,
      headers: {
        authorization: 'Bearer test-token',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: (await res.json()) as Record<string, unknown> };
  };

  // Local OpenAI-compatible upstream: catalog only with the right Bearer key.
  const upstream = http.createServer((rq, rs) => {
    const auth = rq.headers.authorization || '';
    if (rq.url !== '/v1/models') {
      rs.writeHead(404, { 'content-type': 'application/json' });
      rs.end('{"error":"not found"}');
      return;
    }
    if (auth !== 'Bearer sk-upstream-1') {
      rs.writeHead(401, { 'content-type': 'application/json' });
      rs.end('{"error":"bad key"}');
      return;
    }
    rs.writeHead(200, { 'content-type': 'application/json' });
    rs.end(JSON.stringify({
      data: [{ id: 'beta-model' }, { id: 'alpha-model' }, { id: 'gamma.x' }, { id: 'alpha-model' }],
    }));
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamPort = (upstream.address() as net.AddressInfo).port;
  const upstreamBase = `http://127.0.0.1:${upstreamPort}/v1`;

  let provId = '';
  let keylessId = '';

  try {
    await t.test('token gate + unknown provider', async () => {
      const noAuth = await fetch(base + '/api/providers/x/models');
      assert.equal(noAuth.status, 401);
      const missing = await req('/api/providers/prov_nope/models');
      assert.equal(missing.status, 404);
    });

    await t.test('fetch needs an API key first', async () => {
      const created = await req('/api/providers', 'POST', { name: 'Local shim', baseUrl: upstreamBase });
      assert.equal(created.status, 200);
      provId = (created.data.provider as Record<string, unknown>).id as string;
      const noKey = await req(`/api/providers/${provId}/models`);
      assert.equal(noKey.status, 400);
      assert.match(String(noKey.data.error), /API key/);
    });

    await t.test('fetch returns the deduplicated catalog, sorted', async () => {
      const keyed = await req(`/api/providers/${provId}/keys`, 'POST', { name: 'main', key: 'sk-upstream-1' });
      assert.equal(keyed.status, 200);
      const got = await req(`/api/providers/${provId}/models`);
      assert.equal(got.status, 200, JSON.stringify(got.data));
      assert.deepEqual(got.data.models, ['alpha-model', 'beta-model', 'gamma.x']);
    });

    await t.test('tick saves a model immediately, untick removes it', async () => {
      const save = await req(`/api/providers/${provId}/models`, 'POST', { model: 'beta-model' });
      assert.equal(save.status, 200);
      assert.deepEqual(save.data.models, ['beta-model']);
      // idempotent
      const again = await req(`/api/providers/${provId}/models`, 'POST', { model: 'beta-model' });
      assert.deepEqual(again.data.models, ['beta-model']);
      const one = await req(`/api/providers/${provId}/models`, 'POST', { model: 'gamma.x' });
      assert.deepEqual(one.data.models, ['beta-model', 'gamma.x']);
      const view = await req(`/api/providers/${provId}`);
      const pv = view.data.provider as Record<string, unknown>;
      assert.deepEqual(pv.models, ['beta-model', 'gamma.x']);
      assert.equal(pv.modelCount, 2);
      const untick = await req(`/api/providers/${provId}/models/${encodeURIComponent('gamma.x')}`, 'DELETE');
      assert.equal(untick.status, 200);
      assert.deepEqual(untick.data.models, ['beta-model']);
      const miss = await req(`/api/providers/${provId}/models/never-saved`, 'DELETE');
      assert.equal(miss.status, 404);
      const bad = await req(`/api/providers/${provId}/models`, 'POST', { model: '' });
      assert.equal(bad.status, 400);
    });

    await t.test('use switches the live brain instantly — no restart', async () => {
      const wrongModel = await req('/api/models/use', 'POST', { providerId: provId, model: 'not-saved' });
      assert.equal(wrongModel.status, 400);
      const use = await req('/api/models/use', 'POST', { providerId: provId, model: 'beta-model' });
      assert.equal(use.status, 200, JSON.stringify(use.data));
      assert.equal(config.provider.model, 'beta-model');
      assert.equal(config.provider.type, 'openai');
      assert.equal(config.provider.baseUrl, upstreamBase);
      assert.equal(config.provider.apiKey, 'sk-upstream-1');
      const cfg = await req('/api/config');
      const masked = JSON.stringify(cfg.data);
      assert.ok(!masked.includes('sk-upstream-1'), 'raw key never returned');
      const list = await req('/api/providers');
      const act = list.data.active as Record<string, unknown>;
      assert.equal(act.matchedId, provId);
      assert.equal(act.label, 'Local shim', 'the saved provider name is what shows as current');
      // switch back to the offline demo
      const saved = await req(`/api/providers/${provId}`);
      const savedModels = (saved.data.provider as { models: string[] }).models;
      assert.deepEqual(savedModels, ['beta-model']);
    });

    await t.test('keyless provider cannot be used unless it is the live endpoint', async () => {
      const other = await req('/api/providers', 'POST', { name: 'No key yet', baseUrl: 'https://api.openai.com/v1' });
      keylessId = (other.data.provider as Record<string, unknown>).id as string;
      await req(`/api/providers/${keylessId}/models`, 'POST', { model: 'gpt-4o' });
      const refused = await req('/api/models/use', 'POST', { providerId: keylessId, model: 'gpt-4o' });
      assert.equal(refused.status, 400);
      assert.match(String(refused.data.error), /API key/);
      assert.equal(config.provider.model, 'beta-model', 'live brain untouched after the refusal');
    });
  } finally {
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    await handle.stop();
    fs.rmSync(home, { recursive: true, force: true });
  }
});
