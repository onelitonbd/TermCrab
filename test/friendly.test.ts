import { test } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyError } from '../src/core/friendly.js';

test('connection refused explains what and how to fix', () => {
  const err = Object.assign(new Error('fetch failed'), { code: 'ECONNREFUSED' });
  const f = friendlyError(err);
  assert.match(f.headline, /Can't reach/i);
  assert.ok(f.fix.length > 10, 'must include a next step');
});

test('bad API key points at the exact command', () => {
  const f = friendlyError(new Error('401 incorrect API key provided'));
  assert.match(f.headline, /password \(API key\)/i);
  assert.match(f.fix, /termcrab config set provider\.apiKey/);
});

test('DNS failure suggests offline mode', () => {
  const f = friendlyError(Object.assign(new Error('getaddrinfo ENOTFOUND api.anthropic.com'), { code: 'EAI_AGAIN' }));
  assert.match(f.headline, /No internet/i);
  assert.match(f.fix, /mock/);
});

test('missing module suggests npm install', () => {
  const f = friendlyError(new Error("Cannot find module 'baileys'"));
  assert.match(f.headline, /baileys/);
  assert.match(f.fix, /npm install/);
});

test('unknown errors still give a next step (doctor)', () => {
  const f = friendlyError(new Error('something exploded'));
  assert.equal(f.headline, 'something exploded');
  assert.match(f.fix, /termcrab doctor/);
});
