import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveProviderChain,
  markProviderCooldown,
  providerInCooldown,
} from '../src/providers/index.js';
import { ProviderCfg } from '../src/core/config.js';

const cfgA: ProviderCfg = { type: 'openai', baseUrl: 'http://127.0.0.1:11111/v1', apiKey: 'sk-a', model: 'model-a' };
const cfgB: ProviderCfg = { type: 'openai', baseUrl: 'http://127.0.0.1:11112/v1', apiKey: 'sk-b', model: 'model-b' };

test('failover: single provider returns directly', () => {
  const provider = resolveProviderChain(cfgA, []);
  assert.equal(provider.model, 'model-a');
});

test('failover: chain with multiple providers succeeds', () => {
  const provider = resolveProviderChain(cfgA, [cfgB]);
  assert.ok(provider.name.includes('failover'));
});

test('failover: cooldown tracking works', () => {
  markProviderCooldown(cfgA);
  assert.ok(providerInCooldown(cfgA), 'should be in cooldown');
  assert.ok(!providerInCooldown(cfgB), 'cfgB should not be in cooldown');
});

test('failover: provider in cooldown is skipped', () => {
  markProviderCooldown(cfgA);
  // When primary is in cooldown and only one fallback is available, the chain
  // reduces to that single fallback (no FailoverProvider wrapper needed).
  const provider = resolveProviderChain(cfgA, [cfgB]);
  assert.equal(provider.model, 'model-b', 'falls through to the non-cooldown provider');
});

test('failover: all providers in cooldown falls back to primary', () => {
  markProviderCooldown(cfgA);
  markProviderCooldown(cfgB);
  const provider = resolveProviderChain(cfgA, [cfgB]);
  // Should try primary anyway when all are in cooldown
  assert.equal(provider.model, 'model-a');
});
