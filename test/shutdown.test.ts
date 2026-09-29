import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startGateway } from '../src/gateway/server.js';
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

/**
 * v0.15.0: shutting down used to hang while the control UI was open,
 * because server.close() waited for the live event stream to end.
 */
test('gateway stops promptly with an open event stream', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tshut-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = 'shut-token';
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });

  const ac = new AbortController();
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/events?token=shut-token`, {
      signal: ac.signal,
    });
    assert.equal(res.status, 200);
    const reader = res.body!.getReader();
    const first = await reader.read(); // stream is connected and held open
    assert.ok(first.value && first.value.length > 0, 'event stream connected');

    const started = Date.now();
    await handle.stop();
    const ms = Date.now() - started;
    assert.ok(ms < 2000, `stop() took ${ms}ms with an open event stream`);
  } finally {
    ac.abort();
    try {
      await handle.stop();
    } catch {
      /* already stopped */
    }
  }
});

test('gateway stops promptly when nothing is connected', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tshut2-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = 'shut-token';
  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  const started = Date.now();
  await handle.stop();
  const ms = Date.now() - started;
  assert.ok(ms < 2000, `stop() took ${ms}ms`);
});
