import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaults } from '../src/core/config.js';
import { statusReport, countMemoryFacts } from '../src/agent/status.js';
import { MemoryStore } from '../src/agent/memory.js';

function tempHome(): { config: ReturnType<typeof defaults>; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tstat-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'panel-password';
  return { config, home };
}

test('status report is plain English and factual', async () => {
  const { config, home } = tempHome();
  const memory = new MemoryStore(path.join(home, 'memory'));
  memory.remember('user drinks tea every morning');
  memory.remember('project deadline is friday');

  assert.equal(countMemoryFacts(), 2);
  const report = await statusReport(config);

  assert.match(report, /plain-English status/);
  assert.match(report, /2 remembered facts/);
  assert.match(report, /Brain/);
  assert.match(report, /Dreaming/);
  assert.match(report, /every 24h/);
  assert.match(report, /password set/);
  assert.match(report, /Self-checks/);
  assert.match(report, /every 60 min/);
  assert.match(report, /termcrab doctor/, 'must point to the health check');
  assert.doesNotMatch(report, /undefined|\[object Object\]/, 'no leaked internals');
});

test('status adapts when features are off', async () => {
  const { config } = tempHome();
  config.dream.enabled = false;
  config.heartbeat.enabled = false;
  config.gateway.token = '';
  const report = await statusReport(config);

  assert.match(report, /Dreaming\s+off/i);
  assert.match(report, /off \(turn on in Settings/);
  assert.match(report, /NO PASSWORD/);
});

test('status counts agents and cron jobs', async () => {
  const { config, home } = tempHome();
  const agentDir = path.join(home, 'workspace', 'agents', 'brief');
  fs.mkdirSync(agentDir, { recursive: true });
  fs.writeFileSync(path.join(agentDir, 'SOUL.md'), '# SOUL\n- Name: Brief\n');
  const report = await statusReport(config);
  assert.match(report, /@brief/);
  assert.match(report, /Cron jobs\s+0 total/);
});
