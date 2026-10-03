import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults } from '../src/core/config.js';
import { decideHeartbeat } from '../src/mobile/power.js';
import { chunkText, escapeHtml } from '../src/channels/telegram.js';
import { SessionStore } from '../src/agent/sessions.js';

// Auth removed — checkToken/extractAuth tests removed.
// Gateway now allows all requests without token validation.

test('heartbeat pauses on low battery unless charging', () => {
  assert.equal(decideHeartbeat(null, 20).run, true);
  assert.equal(decideHeartbeat({ percentage: 10, plugged: false }, 20).run, false);
  assert.equal(decideHeartbeat({ percentage: 10, plugged: true }, 20).run, true);
  assert.equal(decideHeartbeat({ percentage: 55, plugged: false }, 20).run, true);
});

test('telegram escaping and chunking', () => {
  assert.equal(escapeHtml('<b> & "x"'), '&lt;b&gt; &amp; "x"');
  const long = 'a'.repeat(9000);
  const chunks = chunkText(long, 4000);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[0]!.length, 4000);
  assert.equal(chunkText('short').length, 1);
  // chunking preserves content
  assert.equal(chunks.join('').length, 9000);
});

test('session store reset backs up and list orders by recency', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsess-'));
  process.env.TCRAB_HOME = dir;
  const store = new SessionStore(path.join(dir, 'sessions'));
  store.append('a', { role: 'user', content: 'x', ts: 1 });
  store.reset('a');
  assert.equal(store.read('a').length, 0);
  assert.ok(store.list().length === 0 || store.list().every((s) => s.id !== 'a'));
});

test('authHint explains a refused login in plain English', async () => {
  const { authHint } = await import('../src/gateway/auth.js');
  // File and panel agree; pasted password is wrong (same length -> generic).
  assert.match(authHint('token-tokeX', 'token-token', 'token-token')!, /Wrong password/);
  // Truncated paste: lengths differ, so say so.
  assert.match(authHint('abc', 'token-token', 'token-token')!, /3 letters.*11/s);
  // File unreadable: still give the generic pointer, never nothing.
  assert.match(authHint('nope', 'token-token', null)!, /Wrong password/);
  // Pasted what the file says, but the panel started before it changed.
  assert.match(authHint('file-token', 'mem-token', 'file-token')!, /restart the panel/);
  // File and panel disagree, pasted matches neither.
  assert.match(authHint('other', 'mem-token', 'file-token')!, /different passwords/);
  // Nothing useful to say.
  assert.equal(authHint(null, 'token-token', 'token-token'), null);
  assert.equal(authHint('', 'token-token', 'token-token'), null);
  assert.equal(authHint('Bearer token-token', '', 'file-token'), null);
  // Bearer prefix and whitespace are ignored, same as the real check.
  assert.match(authHint('  Bearer abc  ', 'token-token', 'token-token')!, /3 letters/);
});

test('doctor reports the web panel password state', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdoc-'));
  process.env.TCRAB_HOME = dir;
  const { loadConfig, saveConfig } = await import('../src/core/config.js');
  const cfg = loadConfig();
  cfg.gateway.token = 'doctor-token';
  // Pin the port to a free one: "no panel is answering" must be true because
  // nothing listens there, not because the default port happens to be idle.
  cfg.gateway.port = await new Promise<number>((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const p = (probe.address() as { port: number }).port;
      probe.close(() => resolve(p));
    });
  });
  saveConfig(cfg);
  const { runDoctor } = await import('../src/mobile/doctor.js');
  const checks = await runDoctor();
  const c = checks.find((x) => x.id === 'panel-password');
  assert.ok(c, 'panel-password check exists');
  // No panel is running in this test home -> informational with a start hint.
  assert.equal(c.status, 'info');
  assert.match(c.detail ?? '', /no panel is answering/);
  assert.match(c.fix ?? '', /termcrab gateway/);
});

test('doctor treats a missing password as a choice when bound to this device', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tdoc-open-'));
  process.env.TCRAB_HOME = dir;
  const { loadConfig } = await import('../src/core/config.js');
  const cfg = loadConfig();
  assert.equal(cfg.gateway.token, '', 'fresh defaults: no password');
  const { runDoctor } = await import('../src/mobile/doctor.js');
  const checks = await runDoctor();
  const c = checks.find((x) => x.id === 'panel-password');
  assert.ok(c, 'panel-password check exists');
  assert.equal(c.status, 'info', 'loopback + no password is a valid choice, not a failure');
  assert.match(c.detail ?? '', /without a login/);
  assert.match(c.fix ?? '', /config set gateway\.token generate/);
});
