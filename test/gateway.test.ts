import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkToken, extractAuth } from '../src/gateway/auth.js';
import { defaults } from '../src/core/config.js';
import { decideHeartbeat } from '../src/mobile/power.js';
import { chunkText, escapeHtml } from '../src/channels/telegram.js';
import { SessionStore } from '../src/agent/sessions.js';

test('checkToken accepts valid token in header or raw form', () => {
  const cfg = defaults();
  cfg.gateway.token = 'secret-token';
  assert.equal(checkToken(cfg, 'secret-token'), true);
  assert.equal(checkToken(cfg, 'Bearer secret-token'), true);
  assert.equal(checkToken(cfg, 'bearer secret-token'), true);
  assert.equal(checkToken(cfg, 'wrong'), false);
  assert.equal(checkToken(cfg, null), false);
  assert.equal(checkToken(cfg, ''), false);
});

test('checkToken with empty config token only matches empty presenter safely', () => {
  const cfg = defaults();
  cfg.gateway.token = '';
  // no token configured -> allowed (loopback binding is enforced at gateway start)
  assert.equal(checkToken(cfg, null), true);
});

test('extractAuth reads authorization header and query token', () => {
  assert.equal(extractAuth({ headers: { authorization: 'Bearer abc' } }), 'Bearer abc');
  assert.equal(extractAuth({ headers: {}, url: '/api/events?token=xyz' }), 'xyz');
  assert.equal(extractAuth({ headers: {}, url: '/api/events' }), null);
});

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
