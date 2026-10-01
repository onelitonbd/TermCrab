import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveProviderChain,
  markProviderCooldown,
  providerInCooldown,
} from '../src/providers/index.js';
import { ProviderCfg } from '../src/core/config.js';

const mockCfg: ProviderCfg = { type: 'mock', model: 'mock-1' };
const mockCfg2: ProviderCfg = { type: 'mock', model: 'mock-2' };

test('failover: single provider returns directly', () => {
  const provider = resolveProviderChain(mockCfg, []);
  assert.equal(provider.model, 'mock-1');
});

test('failover: chain with multiple providers succeeds', () => {
  const provider = resolveProviderChain(mockCfg, [mockCfg2]);
  assert.ok(provider.name.includes('failover'));
});

test('failover: cooldown tracking works', () => {
  markProviderCooldown(mockCfg);
  assert.ok(providerInCooldown(mockCfg), 'should be in cooldown');
  assert.ok(!providerInCooldown(mockCfg2), 'mockCfg2 should not be in cooldown');
});

test('failover: provider in cooldown is skipped', () => {
  markProviderCooldown(mockCfg);
  // When primary is in cooldown, chain should skip it
  const provider = resolveProviderChain(mockCfg, [mockCfg2]);
  // Should fall through to mockCfg2
  assert.equal(provider.model, 'mock-2');
});

test('failover: all providers in cooldown falls back to primary', () => {
  markProviderCooldown(mockCfg);
  markProviderCooldown(mockCfg2);
  const provider = resolveProviderChain(mockCfg, [mockCfg2]);
  // Should try primary anyway when all are in cooldown
  assert.equal(provider.model, 'mock-1');
});
