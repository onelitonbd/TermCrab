import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cfgGet, cfgSet, defaults, loadConfig, saveConfig } from '../src/core/config.js';

function tempHome(): void {
  process.env.TCRAB_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tcfg-'));
}

test('loadConfig returns defaults when no file', () => {
  tempHome();
  const cfg = loadConfig();
  assert.equal(cfg.gateway.port, 7788);
  assert.equal(cfg.provider.type, 'mock');
  assert.equal(cfg.agent.maxIterations, 8);
});

test('save/load roundtrip + deep merge with defaults', () => {
  tempHome();
  const cfg = defaults();
  cfg.gateway.token = 'abc123';
  cfg.provider = { type: 'anthropic', model: 'claude-x', apiKey: 'sk-test' };
  saveConfig(cfg);

  // Simulate a partial/older config file missing newer keys.
  const file = path.join(process.env.TCRAB_HOME!, 'config.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  delete raw.heartbeat;
  fs.writeFileSync(file, JSON.stringify(raw));

  const loaded = loadConfig();
  assert.equal(loaded.gateway.token, 'abc123');
  assert.equal(loaded.provider.model, 'claude-x');
  assert.ok(loaded.heartbeat, 'defaults merged for missing heartbeat section');
});

test('cfgSet sets nested values with coercion', () => {
  tempHome();
  let next = cfgSet(loadConfig(), 'gateway.port', '9000');
  assert.equal(cfgGet(next, 'gateway.port'), 9000);
  next = cfgSet(next, 'agent.allowExec', 'false');
  assert.equal(cfgGet(next, 'agent.allowExec'), false);
  next = cfgSet(next, 'channels.telegram.allowedUserIds', '[11,22]');
  assert.deepEqual(cfgGet(next, 'channels.telegram.allowedUserIds'), [11, 22]);
  saveConfig(next);
  assert.equal(loadConfig().gateway.port, 9000);
});

test('invalid provider type falls back to mock', () => {
  tempHome();
  const cfg = defaults();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cfg.provider as any).type = 'nope';
  saveConfig(cfg);
  assert.equal(loadConfig().provider.type, 'mock');
});
