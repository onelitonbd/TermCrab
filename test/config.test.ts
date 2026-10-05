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
  assert.equal(cfg.provider.type, 'openai');
  assert.equal(cfg.agent.maxIterations, 8);
});

test('save/load roundtrip + deep merge with defaults', () => {
  tempHome();
  const cfg = defaults();
  cfg.gateway.token = 'abc123';
  cfg.provider = { type: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-test' };
  saveConfig(cfg);

  // Simulate a partial/older config file missing newer keys.
  const file = path.join(process.env.TCRAB_HOME!, 'config.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  delete raw.heartbeat;
  fs.writeFileSync(file, JSON.stringify(raw));

  const loaded = loadConfig();
  assert.equal(loaded.gateway.token, 'abc123');
  assert.equal(loaded.provider.model, 'gpt-4o-mini');
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

test('invalid provider type is coerced to openai', () => {
  tempHome();
  const cfg = defaults();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cfg.provider as any).type = 'nope';
  saveConfig(cfg);
  assert.equal(loadConfig().provider.type, 'openai');
});

// ---- fresh-install password paths (the "config get printed nothing" bug) ----

import { execFile, spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));

function runCli(args: string[], home: string): Promise<{ out: string; err: string }> {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [CLI, ...args], { env: { ...process.env, TCRAB_HOME: home } }, (e, out, err) => {
      if (e) reject(e);
      else resolve({ out, err });
    });
  });
}

test('config get gateway.token creates the password on a fresh install', async (t) => {
  // The CLI probes the default port before creating a password. If a panel is
  // already answering there (a dev machine, a live preview), this scenario
  // cannot exist — say so instead of failing for the wrong reason.
  const free = await new Promise<boolean>((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(7788, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
  if (!free) {
    t.skip('another panel is answering on port 7788');
    return;
  }
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcfg-fresh-'));
  const first = await runCli(['config', 'get', 'gateway.token'], home);
  const token = first.out.trim();
  assert.match(token, /^[0-9a-f]{48}$/, 'prints a freshly generated 48-hex password');
  assert.match(first.err, /no panel password existed - created one and saved it/);
  assert.ok(fs.existsSync(path.join(home, 'config.json')), 'config file now exists');
  const second = await runCli(['config', 'get', 'gateway.token'], home);
  assert.equal(second.out.trim(), token, 'second run returns the SAME saved password');
});

test('config get will not lock a fresh panel that runs open (default port)', async (t) => {
  // The CLI probes the port from config (7788 when nothing is saved yet), so
  // the open panel must be on the default port for this scenario to exist.
  const canBind = await new Promise<boolean>((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(7788, '127.0.0.1', () => probe.close(() => resolve(true)));
  });
  if (!canBind) { t.skip('port 7788 is busy in this environment'); return; }

  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcfg-gw-'));
  const child = spawn(process.execPath, [CLI, 'gateway'], {
    env: { ...process.env, TCRAB_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += String(d); });
  child.stderr.on('data', (d) => { out += String(d); });
  try {
    const started = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 15000);
      const check = () => {
        if (/the panel opens without a login/.test(out)) { clearTimeout(timer); resolve(true); }
      };
      child.stdout.on('data', check);
      child.on('exit', () => { clearTimeout(timer); resolve(false); });
      check();
    });
    assert.ok(started, `gateway should announce open mode; saw: ${out.slice(0, 400)}`);

    // Auth removed — panel is open by default.
    const status = await fetch('http://127.0.0.1:7788/api/status');
    assert.equal(status.status, 200, 'API reachable without any password');

    // The login screen's own command must NOT lock a running open panel.
    const cg = await runCli(['config', 'get', 'gateway.token'], home);
    assert.equal(cg.out.trim(), '', 'prints empty while the panel runs open');
    assert.match(cg.err, /panel runs without a login/);
    assert.ok(!fs.existsSync(path.join(home, 'config.json')), 'no config file created by a read');
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => child.on('exit', r));
  }
});

test('config get on a deliberately-open config stays empty (no resurrection)', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcfg-open-'));
  process.env.TCRAB_HOME = home;
  const cfg = defaults();
  cfg.gateway.token = ''; // chosen: run without a password
  saveConfig(cfg);
  const r = await runCli(['config', 'get', 'gateway.token'], home);
  assert.equal(r.out.trim(), '', 'prints empty, like the setting is');
  assert.match(r.err, /panel runs without a login/);
  const after = loadConfig();
  assert.equal(after.gateway.token, '', 'must NOT generate a password here');
});
