import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

/** v0.17.0: Providers page API — OpenAI-compatible endpoints + many API keys. */
test('providers API: list / add / keys / use / delete', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tprov-'));
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
    let data: Record<string, unknown> = {};
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      /* empty body */
    }
    return { status: res.status, data };
  };

  try {
    await t.test('requires the token', async () => {
      const res = await fetch(base + '/api/providers');
      assert.equal(res.status, 401);
    });

    await t.test('rejects a bad base url', async () => {
      const { status, data } = await req('/api/providers', 'POST', { name: 'Broken', baseUrl: 'not-a-url' });
      assert.equal(status, 400);
      assert.match(String(data.error), /base url/);
    });

    await t.test('rejects a missing name', async () => {
      const { status } = await req('/api/providers', 'POST', { name: '   ', baseUrl: 'https://api.openai.com/v1' });
      assert.equal(status, 400);
    });

    let provId = '';
    await t.test('create a provider', async () => {
      const { status, data } = await req('/api/providers', 'POST', {
        name: '  OpenRouter  ',
        baseUrl: 'https://openrouter.ai/api/v1/',
      });
      assert.equal(status, 200);
      const p = data.provider as Record<string, unknown>;
      assert.equal(p.name, 'OpenRouter', 'name trimmed');
      assert.equal(p.baseUrl, 'https://openrouter.ai/api/v1', 'trailing slash trimmed');
      assert.equal(p.keyCount, 0);
      assert.match(String(p.id), /^prov_[a-f0-9]{12}$/);
      provId = String(p.id);
    });

    await t.test('list providers', async () => {
      const { status, data } = await req('/api/providers');
      assert.equal(status, 200);
      const list = data.providers as Array<Record<string, unknown>>;
      assert.equal(list.length, 1);
      assert.equal(list[0]!.keyCount, 0);
      assert.ok(!JSON.stringify(list).includes('key_'), 'list never exposes key ids or values');
    });

    await t.test('add two keys — responses are masked, never the raw key', async () => {
      const raw1 = 'sk-secret-abcdef123456';
      const raw2 = 'sk-another-999988887777';
      const k1 = await req(`/api/providers/${provId}/keys`, 'POST', { name: 'main', key: raw1 });
      assert.equal(k1.status, 200);
      const k2 = await req(`/api/providers/${provId}/keys`, 'POST', { name: 'backup', key: raw2 });
      assert.equal(k2.status, 200);
      const shown1 = (k1.data.key as Record<string, unknown>).masked;
      const shown2 = (k2.data.key as Record<string, unknown>).masked;
      assert.notEqual(shown1, raw1);
      assert.notEqual(shown2, raw2);
      assert.ok(String(shown1).endsWith('456'));
      assert.ok(String(shown2).endsWith('7777'));
      const whole = JSON.stringify(k1.data) + JSON.stringify(k2.data);
      assert.ok(!whole.includes(raw1) && !whole.includes(raw2), 'raw keys never serialize');
    });

    await t.test('get provider shows both keys, none active yet', async () => {
      const { status, data } = await req(`/api/providers/${provId}`);
      assert.equal(status, 200);
      const p = data.provider as Record<string, unknown>;
      const keys = p.keys as Array<Record<string, unknown>>;
      assert.equal(keys.length, 2);
      assert.equal(keys.every((k) => k.active === false), true);
      assert.equal(p.keyCount, 2);
    });

    await t.test('unknown provider and key 404', async () => {
      assert.equal((await req('/api/providers/prov_missing')).status, 404);
      assert.equal((await req(`/api/providers/${provId}/keys/key_missing`, 'DELETE')).status, 404);
    });

    let keyIds: string[] = [];
    await t.test('use a key — live config switches to that endpoint', async () => {
      const { data } = await req(`/api/providers/${provId}`);
      const keys = (data.provider as { keys: Array<{ id: string }> }).keys;
      keyIds = keys.map((k) => k.id);
      const { status, data: used } = await req(`/api/providers/${provId}/keys/${keyIds[0]}/use`, 'POST');
      assert.equal(status, 200);
      assert.equal(used.ok, true);
      const cfg = (await req('/api/config')).data.config as Record<string, unknown>;
      const pv = cfg.provider as Record<string, unknown>;
      assert.equal(pv.type, 'openai');
      assert.equal(pv.baseUrl, 'https://openrouter.ai/api/v1');
      assert.match(String(pv.apiKey), /•••/, 'stored key shown masked in /api/config');
      assert.ok(!String(pv.apiKey).includes('abcdef123456'), 'raw key never returned by /api/config');
    });

    await t.test('the active key is flagged in the provider view', async () => {
      const { data } = await req(`/api/providers/${provId}`);
      const keys = (data.provider as { keys: Array<{ id: string; active: boolean }> }).keys;
      assert.equal(keys.find((k) => k.id === keyIds[0])!.active, true);
      assert.equal(keys.find((k) => k.id === keyIds[1])!.active, false);
    });

    await t.test('list flags the in-use provider and describes the current one', async () => {
      const { data } = await req('/api/providers');
      const rows = data.providers as Array<Record<string, unknown>>;
      assert.equal(rows[0]!.inUse, true, 'saved provider actually in use is flagged');
      const active = data.active as Record<string, unknown>;
      assert.equal(active.type, 'openai');
      assert.equal(active.baseUrl, 'https://openrouter.ai/api/v1');
      assert.equal(active.label, 'OpenRouter');
      assert.equal(active.matchedId, provId);
      assert.match(String(active.maskedKey), /…/, 'current key shown masked');
      assert.ok(String(active.maskedKey).endsWith('3456'), 'tail of the current key visible');
      assert.ok(!JSON.stringify(data).includes('abcdef123456'), 'raw key never in the list response');
    });

    await t.test('delete one key, then the whole provider', async () => {
      assert.equal((await req(`/api/providers/${provId}/keys/${keyIds[1]}`, 'DELETE')).status, 200);
      const after = (await req(`/api/providers/${provId}`)).data.provider as { keys: unknown[] };
      assert.equal(after.keys.length, 1);
      assert.equal((await req(`/api/providers/${provId}`, 'DELETE')).status, 200);
      assert.equal((await req(`/api/providers/${provId}`)).status, 404);
      const list = (await req('/api/providers')).data.providers as unknown[];
      assert.equal(list.length, 0);
    });

    await t.test('a provider set outside the page (CLI / onboard) still shows as active', async () => {
      // simulate what the terminal does: termcrab onboard / config set provider.*
      config.provider = { ...config.provider, type: 'openai', baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'sk-cli-1234567890', model: 'llama-3.1-70b' };
      const first = await req('/api/providers');
      const active1 = first.data.active as Record<string, unknown>;
      assert.equal(active1.label, 'Groq');
      assert.equal(active1.baseUrl, 'https://api.groq.com/openai/v1');
      assert.equal(active1.model, 'llama-3.1-70b');
      assert.equal(active1.matchedId, null, 'nothing saved yet');
      assert.equal((first.data.providers as unknown[]).length, 0);
      // saving the same endpoint from the page syncs the list with reality
      const created = await req('/api/providers', 'POST', { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1' });
      const pid2 = (created.data.provider as Record<string, unknown>).id;
      const second = await req('/api/providers');
      const rows = second.data.providers as Array<Record<string, unknown>>;
      assert.equal(rows[0]!.inUse, true, 'matching endpoint flips to in use');
      assert.equal((second.data.active as Record<string, unknown>).matchedId, pid2);
      // tidy: back to the offline demo
      config.provider = { ...config.provider, type: 'mock', baseUrl: '', apiKey: '', model: 'mock-1' };
    });
  } finally {
    await handle.stop();
  }
});
