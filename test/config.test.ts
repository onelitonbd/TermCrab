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

test('config get gateway.token creates the password on a fresh install', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcfg-fresh-'));
  const first = await runCli(['config', 'get', 'gateway.token'], home);
  const token = first.out.trim();
  assert.match(token, /^[0-9a-f]{48}$/, 'prints a freshly generated 48-hex password');
  assert.match(first.err, /no panel password existed - created one and saved it/);
  assert.ok(fs.existsSync(path.join(home, 'config.json')), 'config file now exists');
  const second = await runCli(['config', 'get', 'gateway.token'], home);
  assert.equal(second.out.trim(), token, 'second run returns the SAME saved password');
});

test('termcrab gateway on a fresh home creates a password before listening', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcfg-gw-'));
  const port = await new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
  const child = spawn(process.execPath, [CLI, 'gateway', '--port', String(port)], {
    env: { ...process.env, TCRAB_HOME: home },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += String(d); });
  child.stderr.on('data', (d) => { out += String(d); });
  try {
    const ok = await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), 15000);
      const check = () => {
        if (/control UI token: [0-9a-f]{48}/.test(out)) { clearTimeout(t); resolve(true); }
      };
      child.stdout.on('data', check);
      child.on('exit', () => { clearTimeout(t); resolve(false); });
      check();
    });
    assert.ok(ok, `gateway should print a generated password; saw: ${out.slice(0, 400)}`);
    assert.match(out, /no panel password was set - created one and saved it/);
    const cfg = JSON.parse(fs.readFileSync(path.join(home, 'config.json'), 'utf8')) as {
      gateway: { token: string };
    };
    assert.match(cfg.gateway.token, /^[0-9a-f]{48}$/, 'password persisted to the fresh config');
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => child.on('exit', r));
  }
});
