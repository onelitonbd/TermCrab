import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults, loadConfig } from '../src/core/config.js';
import { bus, BusEvent } from '../src/gateway/events.js';

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

/** v0.5 phase 3: wake as a gateway service, setup wizard, update button. */
test('phase 3: wake service + wizard + update button', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tph3-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
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
    await t.test('wake status starts idle', async () => {
      const { status, data } = await req('/api/wake');
      assert.equal(status, 200);
      assert.equal(data.running, false);
      assert.equal(data.keyword, 'crab');
      assert.equal(data.commands, 0);
    });

    await t.test('wake feed: keyword arms, next breath is the command, reply arrives on the bus', async () => {
      const replies: BusEvent[] = [];
      const off = bus.subscribe((ev) => { if (ev.type === 'wake') replies.push(ev); });
      try {
        // no keyword -> idle
        const idle = await req('/api/wake/feed', 'POST', { text: 'just talking' });
        assert.equal(idle.status, 200);
        assert.equal(idle.data.state, 'idle');
        // empty text -> 400 with a friendly message
        const empty = await req('/api/wake/feed', 'POST', { text: '   ' });
        assert.equal(empty.status, 400);
        // keyword alone -> armed
        const armed = await req('/api/wake/feed', 'POST', { text: 'crab' });
        assert.equal(armed.data.state, 'wake');
        // next utterance -> command (mock brain answers)
        const cmd = await req('/api/wake/feed', 'POST', { text: 'do a little dance' });
        assert.equal(cmd.data.state, 'command');
        // reply event lands on the bus (SSE clients see the same thing)
        const deadline = Date.now() + 8000;
        while (Date.now() < deadline && !replies.some((e) => e.state === 'reply')) {
          await new Promise((r) => setTimeout(r, 50));
        }
        const reply = replies.find((e) => e.state === 'reply');
        assert.ok(reply, 'expected a wake reply event');
        assert.equal(typeof reply.reply, 'string');
        assert.ok(String(reply.reply).length > 0);
        assert.equal(reply.text, 'do a little dance');
        // command counter went up
        const st = await req('/api/wake');
        assert.equal(st.data.commands, 1);
      } finally {
        off();
      }
    });

    await t.test('wake start answers friendly when mic STT is unavailable; stop is idempotent', async () => {
      const start = await req('/api/wake/start', 'POST', {});
      assert.equal(start.status, 200, 'always 200, never a bare HTTP error');
      assert.equal(typeof start.data.ok, 'boolean');
      if (!start.data.ok) {
        assert.ok(String(start.data.error).length > 10, 'friendly reason required');
        assert.match(String(start.data.error), /termux-api|type commands/i);
      } else {
        // Running on a real Termux box — make sure we can still stop it.
        const stop = await req('/api/wake/stop', 'POST');
        assert.equal(stop.status, 200);
      }
      const stop2 = await req('/api/wake/stop', 'POST');
      assert.equal(stop2.status, 200);
      assert.equal(stop2.data.ok, true);
      const st = await req('/api/wake');
      assert.equal(st.data.running, false);
    });

    await t.test('update button: shape only (network may be blocked)', async () => {
      const { status, data } = await req('/api/update', 'POST');
      assert.equal(status, 200);
      assert.equal(typeof data.ok, 'boolean');
      assert.equal(typeof data.current, 'string');
      if (data.ok) {
        assert.equal(typeof data.latest, 'string');
        assert.equal(typeof data.updateAvailable, 'boolean');
      } else {
        assert.ok(String(data.error || '').length > 0);
      }
    });

    await t.test('wizard: applies provider/key/name, persists, never echoes the key', async () => {
      const secret = 'sk-wizard-secret-987654321';
      const res = await req('/api/onboard', 'POST', {
        provider: 'openai',
        apiKey: secret,
        model: 'gpt-4o-mini',
        name: 'Wizzy',
        allowExec: false,
        port: '',
        telegramToken: '',
        telegramUsers: [],
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.ok, true);
      assert.equal(res.data.setupNeeded, false);
      assert.equal(res.data.providerType, 'openai');
      assert.equal(res.data.name, 'Wizzy');
      assert.ok(!JSON.stringify(res.data).includes(secret), 'key must not be echoed');
      const cfg = loadConfig();
      assert.equal(cfg.provider.type, 'openai');
      assert.equal(cfg.provider.apiKey, secret);
      assert.equal(cfg.provider.model, 'gpt-4o-mini');
      assert.equal(cfg.agent.name, 'Wizzy');
      assert.equal(cfg.agent.allowExec, false);
      // workspace seeded with the name
      const soul = fs.readFileSync(path.join(home, 'workspace', 'SOUL.md'), 'utf8');
      assert.match(soul, /Wizzy/);
      // GET /api/config still masks it
      const get = await req('/api/config');
      assert.ok(!JSON.stringify(get.data).includes(secret));
    });

    await t.test('wizard: submitting empty key flags setup needed', async () => {
      const res = await req('/api/onboard', 'POST', { provider: 'openai', apiKey: '', model: '', baseUrl: '' });
      assert.equal(res.status, 200);
      assert.equal(res.data.providerType, 'openai');
      assert.equal(res.data.setupNeeded, true);
      const cfg = loadConfig();
      assert.equal(cfg.provider.type, 'openai');
    });
  } finally {
    await handle.stop();
  }
});
