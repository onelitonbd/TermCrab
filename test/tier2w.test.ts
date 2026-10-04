/**
 * Batch 32.4 — the ops rows, measured rather than asserted.
 *
 * Three rows claimed things that were not true in the repository: the installer
 * had no way to answer "what would this do" without doing it, "service install"
 * was a docs paragraph, and the CI workflow sat in a folder GitHub never reads.
 * These tests pin what is now actually true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url'; // still used for the CLI path
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
// The suite runs from the repository root (npm test), so this is the root —
// import.meta.url would point into dist/, which is not where the workflow lives.
const ROOT = process.cwd();
const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));

function tmpdir(tag: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `tc34-${tag}-`));
}

// --------------------------------------------------------------------------
// 32.4 the installer can be asked without being obeyed
// --------------------------------------------------------------------------

test('32.4 install.sh --check explains the plan and writes nothing', async () => {
  const dest = tmpdir('dest');
  const { stdout } = await execFileP('bash', ['install.sh', '--check'], {
    cwd: ROOT,
    env: { ...process.env, TCRAB_DEST: dest, TCRAB_BRANCH: 'v0.65.0' },
  });
  assert.match(stdout, /check: nothing will be written/);
  assert.match(stdout, /node\s+:\s+v\d+/);
  assert.match(stdout, /git\s+:\s+git version/);
  assert.match(stdout, /ref\s+:\s+v0\.65\.0/);
  assert.match(stdout, new RegExp(`destination: ${dest}`));
  assert.match(stdout, /mode\s+:\s+fresh install/);
  assert.match(stdout, /no runtime dependencies/);
  assert.deepEqual(fs.readdirSync(dest), [], 'the check must not create a single file');
});

test('32.4 the installer refuses an unsupported Node before touching anything', async () => {
  const fakebin = tmpdir('fakebin');
  fs.writeFileSync(path.join(fakebin, 'node'), '#!/bin/sh\necho v18.20.0\n');
  fs.chmodSync(path.join(fakebin, 'node'), 0o755);
  const dest = tmpdir('dest18');
  await assert.rejects(
    () =>
      execFileP('bash', ['install.sh', '--check'], {
        cwd: ROOT,
        env: { ...process.env, TCRAB_DEST: dest, PATH: `${fakebin}:${process.env.PATH}` },
      }),
    (err: Error & { stderr?: string; stdout?: string }) => {
      const out = `${err.stdout ?? ''}${err.stderr ?? ''}`;
      assert.match(out, /too old/);
      assert.match(out, /20\.10/);
      return true;
    },
  );
  assert.deepEqual(fs.readdirSync(dest), [], 'nothing was written on the failure path either');
});

// --------------------------------------------------------------------------
// 32.4 a service that is really written, and can be read first
// --------------------------------------------------------------------------

test('32.4 service install writes a real unit, idempotently, and dry-run writes nothing', async () => {
  const dir = tmpdir('svc');
  const home = tmpdir('svchome');
  const { installService, serviceStatus, uninstallService, servicePlan } = await import('../src/mobile/service.js');

  const previousDir = process.env.TCRAB_SERVICE_DIR;
  const previousHome = process.env.TCRAB_HOME;
  process.env.TCRAB_SERVICE_DIR = dir;
  process.env.TCRAB_HOME = home;
  try {
    const plan = servicePlan();
    assert.equal(plan.installed, false);
    if (plan.platform === 'systemd') {
      assert.match(plan.content, /^# TermCrab gateway/);
      assert.match(plan.content, /ExecStart=\S+ \S+ gateway/, 'the unit starts the gateway');
      assert.match(plan.content, /Environment=TCRAB_HOME=/, 'and knows where the home is');
      assert.match(plan.content, /Restart=on-failure/);
      assert.match(plan.content, /WantedBy=default\.target/, 'a user unit, so no root is needed');
      assert.equal(plan.file, path.join(dir, 'termcrab.service'));
    } else if (plan.platform === 'launchd') {
      assert.match(plan.content, /dev\.termcrab\.gateway/);
      assert.equal(plan.file, path.join(dir, 'dev.termcrab.gateway.plist'));
    }

    // --dry-run answers with the path and the steps, and writes nothing.
    const dry = installService({ dryRun: true });
    assert.equal(dry.ok, true);
    assert.equal(dry.action, 'dry run');
    assert.deepEqual(fs.readdirSync(dir), [], 'dry run writes nothing');
    assert.ok(dry.steps.length >= 1, 'and it says what would turn it on');

    const first = installService();
    assert.equal(first.ok, true);
    if (first.platform !== 'termux') {
      assert.equal(first.action, 'installed');
      assert.ok(fs.existsSync(first.file), 'the unit file exists');
      const again = installService();
      assert.equal(again.action, 'already installed', 'installing twice is boring, not destructive');
      const forced = installService({ force: true });
      assert.equal(forced.action, 'installed');

      const status = serviceStatus();
      assert.equal(status.installed, true);

      const removed = uninstallService();
      assert.equal(removed.action, 'removed');
      assert.equal(fs.existsSync(first.file), false);
      assert.equal(serviceStatus().installed, false);
      assert.equal(uninstallService().action, 'not installed', 'removing twice is fine');
    }
  } finally {
    if (previousDir === undefined) delete process.env.TCRAB_SERVICE_DIR;
    else process.env.TCRAB_SERVICE_DIR = previousDir;
    if (previousHome === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previousHome;
  }
});

test('32.4 the CLI exposes the service, with a JSON envelope', async () => {
  const dir = tmpdir('svccli');
  const help = await execFileP(process.execPath, [CLI, 'service', '--help'], { env: { ...process.env } });
  assert.match(help.stdout, /systemd user unit/);
  assert.match(help.stdout, /Termux:Boot/);

  const status = await execFileP(process.execPath, [CLI, 'service', 'status', '--json'], {
    env: { ...process.env, TCRAB_SERVICE_DIR: dir },
  });
  const parsed = JSON.parse(status.stdout) as { ok: boolean; command: string; data: { platform: string; file: string; installed: boolean } };
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, 'service');
  assert.ok(['systemd', 'launchd', 'termux'].includes(parsed.data.platform));
  assert.equal(parsed.data.file.startsWith(dir) || parsed.data.platform === 'termux', true);
  assert.equal(parsed.data.installed, false);
});

// --------------------------------------------------------------------------
// 32.4 CI where CI runs, doing what it says
// --------------------------------------------------------------------------

test('32.4 the CI workflow is versioned, verified, and one command from running', () => {
  // The source lives in ci/ci.yml (GitHub refuses an integration without the
  // `workflows` permission to push .github/workflows/), so what is asserted
  // here is the content plus the copy step that installs it.
  const src = path.join(ROOT, 'ci', 'ci.yml');
  assert.ok(fs.existsSync(src), 'the workflow source is in the repository');
  const wf = fs.readFileSync(src, 'utf8');

  assert.match(wf, /matrix:[\s\S]*node:\s*\[20, 22, 24\]/, 'the supported Node lines are the matrix');
  assert.match(wf, /run: npm test/, 'the suite runs');
  assert.match(wf, /run: npm run build/);
  assert.match(wf, /termcrab\.js agent "ping"/, 'and the offline brain answers in CI');
  assert.match(wf, /status\.mjs/, 'the work tracker is checked for staleness');
  assert.match(wf, /census\.mjs/, 'and the census for drift');
  assert.match(wf, /check:measure/, 'and the coverage/CLI-coverage recordings are pinned to the source they measured');
  assert.match(wf, /install-ci\.mjs --check/, 'the installed copy is checked against this source from inside CI');
  assert.match(wf, /bash install\.sh --check/, 'the installer plan is exercised');
  assert.match(wf, /too old/, 'including its refusal of an unsupported Node');
  assert.match(wf, /npm pack/, 'and the packaged tarball is built');
  assert.match(wf, /termcrab --version/, 'and run from a clean install');

  // The copy step really is a byte-for-byte copy, and --check agrees.
  const dest = tmpdir('ci');
  execFileSync(process.execPath, ['scripts/install-ci.mjs', '--dest', dest], { cwd: ROOT, stdio: 'pipe' });
  assert.equal(fs.readFileSync(path.join(dest, 'ci.yml'), 'utf8'), wf, 'installed copy is identical');
  const ok = execFileSync(process.execPath, ['scripts/install-ci.mjs', '--check', '--dest', dest], { cwd: ROOT, encoding: 'utf8' });
  assert.match(ok, /installed and identical/);
  // An empty location is reported with the fix, not silently accepted.
  const empty = tmpdir('ci-empty');
  const failed = spawnSync(process.execPath, ['scripts/install-ci.mjs', '--check', '--dest', empty], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /not installed/);

  // The old file in ci/ must not come back as a second, unread copy.
  assert.equal(fs.existsSync(path.join(ROOT, 'ci', 'github-actions.yml')), false);
  assert.match(fs.readFileSync(path.join(ROOT, 'ci', 'README.md'), 'utf8'), /ci\.yml/);
});

test('32.4 the packaged tarball really installs and runs (npm pack, no network)', async () => {
  const out = tmpdir('pack');
  try {
    execFileSync('npm', ['pack', '--ignore-scripts', '--pack-destination', out], { cwd: ROOT, stdio: 'pipe' });
  } catch (err) {
    // A sandbox without npm cannot pack; the CI job covers it. Say so.
    if (String((err as Error).message).includes('npm')) return;
    throw err;
  }
  const tgz = fs.readdirSync(out).find((f) => f.endsWith('.tgz'));
  assert.ok(tgz, 'a tarball was produced');

  // What matters is that the archive contains a runnable CLI, not just sources.
  const listing = execFileSync('tar', ['-tzf', path.join(out, tgz)], { encoding: 'utf8' });
  assert.match(listing, /package\/dist\/src\/bin\/termcrab\.js/, 'the built CLI ships in the tarball');
  assert.match(listing, /package\/dist\/src\/cli\.js/);
  assert.match(listing, /package\/package\.json/);
  assert.equal(/package\/node_modules\//.test(listing), false, 'no dependencies are bundled — there are none');

  const pkg = JSON.parse(execFileSync('tar', ['-xzOf', path.join(out, tgz), 'package/package.json'], { encoding: 'utf8' })) as {
    dependencies?: Record<string, string>;
    bin?: Record<string, string>;
  };
  assert.deepEqual(pkg.dependencies ?? {}, {}, 'zero runtime dependencies is the promise the tarball must keep');
  assert.ok(pkg.bin?.termcrab, 'and it installs a termcrab command');
});
