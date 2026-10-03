import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import { startGateway, type GatewayHandle } from '../src/gateway/server.js';

/**
 * The gateway's front door.
 *
 * Until 2026-10-03 every /api/* route was open: auth.ts existed, was tested,
 * and was imported by nothing (server.ts said so in a comment). These tests
 * pin the rule that replaced it:
 *
 *   - a configured gateway.token is required for every /api/* route;
 *   - an empty token keeps the loopback-only behaviour the bind guard allows;
 *   - webhooks authenticate with their own per-hook secret, not the panel one.
 */

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

async function gatewayWith(configure: (c: ReturnType<typeof defaults>) => void): Promise<{
  handle: GatewayHandle;
  base: string;
  home: string;
}> {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tauth-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  configure(config);
  saveConfig(config);
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  return { handle, base: `http://127.0.0.1:${port}`, home };
}

/** Routes a caller should not reach without the panel password. */
const PROTECTED = [
  '/api/config',
  '/api/status',
  '/api/memory',
  '/api/sessions',
  '/api/providers',
  '/api/tools',
  '/api/logs',
  '/api/approvals',
  '/api/skills',
  '/api/chat',
];

test('with a token configured, every sampled /api route refuses an anonymous caller', async () => {
  const { handle, base, home } = await gatewayWith((c) => {
    c.gateway.token = 'panel-token-abc';
  });
  try {
    for (const route of PROTECTED) {
      const res = await fetch(base + route);
      assert.equal(res.status, 401, `${route} must refuse without a token`);
      assert.equal(res.headers.get('www-authenticate'), 'Bearer realm="TermCrab"', route);
    }

    // Wrong token, and empty Bearer, are refused too.
    for (const bad of ['nope', '', 'panel-token-ab']) {
      const res = await fetch(base + '/api/config', { headers: { authorization: `Bearer ${bad}` } });
      assert.equal(res.status, 401, `bad token ${JSON.stringify(bad)} must be refused`);
    }

    // The right token — header form and the SSE query form — is accepted.
    const header = await fetch(base + '/api/config', { headers: { authorization: 'Bearer panel-token-abc' } });
    assert.equal(header.status, 200);
    const query = await fetch(base + '/api/status?token=panel-token-abc');
    assert.equal(query.status, 200, 'query token works for EventSource-style callers');

    // The static panel itself stays reachable: it renders the password gate.
    const page = await fetch(base + '/');
    assert.equal(page.status, 200, 'the UI must load so it can ask for the password');
  } finally {
    await handle.stop();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('no token configured keeps the loopback panel open (backwards compatible)', async () => {
  const { handle, base, home } = await gatewayWith(() => {
    /* defaults: no token */
  });
  try {
    const res = await fetch(base + '/api/config');
    assert.equal(res.status, 200, 'no password set: the local panel still works');
  } finally {
    await handle.stop();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('webhooks need their own hook token, not the panel token', async () => {
  const { handle, base, home } = await gatewayWith((c) => {
    c.gateway.token = 'panel-token-abc';
    c.hooks = [{ id: 'github', token: 'hook-secret-9', prompt: 'handle a push' }];
  });
  try {
    const body = JSON.stringify({ ref: 'refs/heads/main' });
    const post = (headers: Record<string, string> = {}) =>
      fetch(`${base}/api/hooks/github`, { method: 'POST', headers, body });

    assert.equal((await post()).status, 401, 'no hook token -> refused');
    assert.equal(
      (await post({ 'x-hook-token': 'wrong' })).status,
      401,
      'a wrong hook token is refused',
    );
    assert.equal(
      (await post({ authorization: 'Bearer panel-token-abc' })).status,
      401,
      'the panel password is not a hook secret',
    );
    assert.equal((await post({ 'x-hook-token': 'hook-secret-9' })).status, 202, 'the hook token works');
    assert.equal((await post()).status, 401, 'the query form is opt-in, header still required');
    const viaQuery = await fetch(`${base}/api/hooks/github?token=hook-secret-9`, { method: 'POST', body });
    assert.equal(viaQuery.status, 202, '?token= works for callers that cannot set headers');
  } finally {
    await handle.stop();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('an unknown hook id is still 404, not 401', async () => {
  const { handle, base, home } = await gatewayWith((c) => {
    c.gateway.token = 'panel-token-abc';
  });
  try {
    const res = await fetch(`${base}/api/hooks/nope`, { method: 'POST', body: '{}' });
    assert.equal(res.status, 404);
  } finally {
    await handle.stop();
    fs.rmSync(home, { recursive: true, force: true });
  }
});
