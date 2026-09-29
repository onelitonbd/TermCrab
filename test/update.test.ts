import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { semverGt, checkForUpdate, renderUpdate } from '../src/core/update.js';
import { applyUpdate, repoRoot } from '../src/core/updater.js';

test('semverGt compares versions correctly', () => {
  assert.equal(semverGt('0.5.0', '0.4.2'), true);
  assert.equal(semverGt('0.4.2', '0.4.2'), false);
  assert.equal(semverGt('0.4.2', '0.5.0'), false);
  assert.equal(semverGt('0.10.0', '0.9.9'), true);
  assert.equal(semverGt('v1.0.0', '0.9.9'), true);
});

function stubFetch(ok: boolean, payload: unknown, status = 200) {
  return async () => ({ ok, status, json: async () => payload });
}

test('checkForUpdate detects a newer release', async () => {
  const r = await checkForUpdate('0.4.2', {
    fetchImpl: stubFetch(true, { tag_name: 'v0.9.0', html_url: 'https://example/x' }),
  });
  assert.equal(r.ok, true);
  assert.equal(r.latest, '0.9.0');
  assert.equal(r.updateAvailable, true);
  assert.equal(r.url, 'https://example/x');
});

test('checkForUpdate reports up-to-date', async () => {
  const r = await checkForUpdate('0.9.0', { fetchImpl: stubFetch(true, { tag_name: 'v0.9.0' }) });
  assert.equal(r.ok, true);
  assert.equal(r.updateAvailable, false);
});

test('checkForUpdate never throws when offline', async () => {
  const r = await checkForUpdate('0.4.2', {
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(r.ok, false);
  assert.match(r.error ?? '', /network down/);
});

test('renderUpdate is plain English in all three states', () => {
  const upToDate = renderUpdate({ ok: true, current: '0.4.2', latest: '0.4.2', updateAvailable: false });
  assert.match(upToDate, /latest version \(v0\.4\.2\)/);

  const available = renderUpdate({ ok: true, current: '0.4.2', latest: '0.5.0', updateAvailable: true, url: 'u' });
  assert.match(available, /0\.5\.0 is available/);
  assert.match(available, /Auto update/);

  const offline = renderUpdate({ ok: false, current: '0.4.2', error: 'offline' });
  assert.match(offline, /Couldn't check/);
  assert.match(offline, /you're fine running v0\.4\.2/);
});

test('repoRoot finds the git checkout around this module', () => {
  const root = repoRoot();
  assert.ok(root);
  assert.ok(fs.existsSync(path.join(root, '.git')));
});

test('applyUpdate runs pull -> install -> build in order with progress', async () => {
  const calls: string[] = [];
  const phases: string[] = [];
  const r = await applyUpdate({
    onPhase: (p) => phases.push(p),
    runImpl: async (cmd, args) => {
      calls.push([cmd, ...args].join(' '));
      if (cmd === 'git' && args[0] === 'status') return '';
      if (cmd === 'git' && args[0] === 'rev-parse') return 'main\n';
      return '';
    },
  });
  assert.deepEqual(r, { ok: true });
  assert.deepEqual(phases, ['pull', 'install', 'build']);
  const pullIdx = calls.findIndex((c) => c.startsWith('git pull'));
  const installIdx = calls.findIndex((c) => c.startsWith('npm install'));
  const buildIdx = calls.findIndex((c) => c.startsWith('npm run build'));
  assert.ok(pullIdx >= 0 && installIdx > pullIdx && buildIdx > installIdx, calls.join(' | '));
  assert.match(calls[pullIdx]!, /origin main/, 'pulls the checked-out branch');
});

test('applyUpdate refuses to touch an install with local changes', async () => {
  let ranPull = false;
  const r = await applyUpdate({
    runImpl: async (cmd, args) => {
      if (cmd === 'git' && args[0] === 'status') return ' M ui/index.html\n';
      if (cmd === 'git' && args[0] === 'pull') ranPull = true;
      return '';
    },
  });
  assert.equal(r.ok, false);
  assert.match((r as { ok: false; error: string }).error, /local changes/);
  assert.equal(ranPull, false);
});

test('applyUpdate surfaces the failing step without throwing', async () => {
  const r = await applyUpdate({
    runImpl: async (cmd, args) => {
      if (cmd === 'git' && args[0] === 'status') return '';
      if (cmd === 'git' && args[0] === 'rev-parse') return 'main\n';
      if (cmd === 'git' && args[0] === 'pull') throw new Error('pull exploded');
      return '';
    },
  });
  assert.deepEqual(r, { ok: false, error: 'pull exploded' });
});

test('checkForUpdate says "no internet connection" in plain words', async () => {
  const r = await checkForUpdate('0.15.0', {
    fetchImpl: async () => {
      throw new Error('fetch failed');
    },
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'no internet connection');
});
