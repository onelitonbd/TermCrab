import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listenOnce } from '../src/mobile/stt.js';

test('listenOnce resolves with a friendly error when the tool is missing', async () => {
  // CI/sandbox has no termux-speech-to-text — must NOT hang or throw.
  const r = await listenOnce(5_000);
  assert.equal(r.ok, false);
  assert.ok(typeof r.error === 'string' && r.error.length > 5, 'must explain what happened');
  // On a machine without the tool the message points at the install command;
  // if a tool DID exist and returned nothing, a different friendly error appears.
  assert.match(r.error!, /dictation|termux-api|speech/i);
});

test('listenOnce never hangs past its timeout', async () => {
  const started = Date.now();
  const r = await listenOnce(1); // 1ms budget: settles either way
  assert.equal(r.ok, false);
  assert.ok(Date.now() - started < 4_000, 'must settle quickly');
});
