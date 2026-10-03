import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';

/**
 * Regression guard for the 2026-10-03 leak: the config-file watcher created in
 * startGateway() was never stored, so it could not be closed. On stop() the
 * HTTP listener closed but the watcher kept the event loop alive forever —
 * every test file that started a gateway hung until the runner's timeout (the
 * whole suite read as "slow" and never finished), and each start/stop cycle in
 * production leaked one inotify watch.
 *
 * If this test starts failing, look for a new fs.watch / setInterval / server
 * that nobody closes in src/gateway/server.ts.
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

const activeWatchers = (): number => {
  const hooks = process as unknown as { _getActiveHandles?: () => unknown[] };
  const handles = hooks._getActiveHandles ? hooks._getActiveHandles() : [];
  return handles.filter(
    (h) => (h as { constructor?: { name?: string } })?.constructor?.name === 'FSWatcher',
  ).length;
};

test('stop() closes the listener and the config watcher', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tlife-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  saveConfig(config); // the watcher is only created when a config file exists
  const port = await freePort();

  const before = activeWatchers();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  assert.equal(handle.server.listening, true, 'gateway is listening');

  await handle.stop();

  assert.equal(handle.server.listening, false, 'listener closed after stop()');
  const after = activeWatchers();
  assert.ok(
    after < before + 1,
    `stop() must not leak a file watcher (before ${before}, after ${after})`,
  );

  // The port must be really free again — a second gateway can take it.
  const again = await startGateway({ config, host: '127.0.0.1', port });
  assert.equal(again.server.listening, true, 'port is reusable right after stop()');
  await again.stop();

  fs.rmSync(home, { recursive: true, force: true });
});
