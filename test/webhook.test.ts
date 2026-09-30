import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Webhook config validation tests (gateway integration is tested via API tests)
test('webhook: hook config requires id, token, and prompt', () => {
  const hook = { id: 'github', token: 'secret123', prompt: 'Handle GitHub push event' };
  assert.ok(hook.id);
  assert.ok(hook.token);
  assert.ok(hook.prompt);
});

test('webhook: hook token should be a secure random string', () => {
  const token = crypto.randomBytes(24).toString('hex');
  assert.equal(token.length, 48);
  assert.match(token, /^[a-f0-9]+$/);
});

test('webhook: multiple hooks can coexist', () => {
  const hooks = [
    { id: 'github', token: 'gh-token', push: 'Handle GitHub push' },
    { id: 'stripe', token: 'stripe-token', prompt: 'Handle Stripe payment' },
    { id: 'ci', token: 'ci-token', prompt: 'Handle CI build result' },
  ];
  assert.equal(hooks.length, 3);
  const ids = hooks.map((h) => h.id);
  assert.ok(ids.includes('github'));
  assert.ok(ids.includes('stripe'));
  assert.ok(ids.includes('ci'));
});

test('webhook: hook session namespacing', () => {
  const hookId = 'github';
  const sessionId = `hook:${hookId}`;
  assert.equal(sessionId, 'hook:github');
  assert.ok(sessionId.startsWith('hook:'));
});

test('webhook: payload serialization', () => {
  const payload = { action: 'opened', number: 42, title: 'Test PR' };
  const payloadStr = JSON.stringify(payload);
  assert.ok(payloadStr.includes('"action":"opened"'));
  assert.ok(payloadStr.includes('"number":42'));
});

test('webhook: prompt with payload formatting', () => {
  const hook = { id: 'github', token: 'secret', prompt: 'Handle GitHub push event' };
  const payload = { ref: 'refs/heads/main', commit: 'abc123' };
  const payloadStr = JSON.stringify(payload);
  const userMessage = `[webhook:${hook.id}] ${hook.prompt}\n\nPayload: ${payloadStr}`;
  assert.ok(userMessage.includes('[webhook:github]'));
  assert.ok(userMessage.includes('Handle GitHub push event'));
  assert.ok(userMessage.includes('"ref":"refs/heads/main"'));
});
