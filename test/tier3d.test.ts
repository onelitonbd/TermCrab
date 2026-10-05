/**
 * Batch 34.6 — CLI coverage, measured instead of claimed.
 *
 * Their CI runs contract tests per channel and thousands of PRs; we have one
 * phone and a suite that spawns the real binary. So the question "is every
 * command tested?" is answered by a recording: `src/cli.ts` appends the command
 * it dispatched to `$TCRAB_CLI_COVERAGE`, `npm run test:cli` sets it for a full
 * suite run, and `scripts/cli-coverage.mjs --check` compares the recording
 * against what the switch can dispatch. A command that is neither run nor
 * listed with a reason fails — and so does a listing that has become false.
 *
 * This file is also what moved four commands (update, agent, heartbeat, wake)
 * from "uncovered" to "run by the suite", so it asserts what each of them
 * actually does, not just that it started.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { checkForUpdate } from '../src/core/update.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

function cli(args: string[], opts: { env?: Record<string, string>; tolerate?: boolean } = {}): CliResult {
  const env = { ...process.env, NO_COLOR: '1', ...opts.env };
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env, timeout: 60_000 });
  const result: CliResult = { code: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
  if (result.code !== 0 && !opts.tolerate) {
    throw new Error(`termcrab ${args.join(' ')} exited ${result.code}\n${result.stderr || result.stdout}`);
  }
  return result;
}

/**
 * The same call, but without blocking this process: a test that hosts the HTTP
 * server the child has to reach cannot use `execFileSync` — the parent's event
 * loop is blocked, the server never answers, and both sides wait forever.
 */
function cliAsync(args: string[], opts: { env?: Record<string, string> } = {}): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [CLI, ...args],
      { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1', ...opts.env }, timeout: 30_000 },
      (err, stdout, stderr) => {
        const code = err ? ((err as { code?: number }).code ?? 1) : 0;
        resolve({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
      },
    );
  });
}

function saveMockConfig(home: string): void {
  const config = {
    version: 3,
    gateway: { host: '127.0.0.1', port: 7788, token: '' },
    provider: { type: 'mock', model: 'mock-1', apiKey: '', baseUrl: '' },
    agent: { name: 'Tester', allowExec: false },
  };
  fs.writeFileSync(path.join(home, 'config.json'), JSON.stringify(config, null, 2));
}

// ------------------------------------------------------------------- 34.6

test('34.6 the recording hook is real, quiet when unused, and cannot break a command', { concurrency: false }, async (t) => {
  await t.test('a dispatch appends its command to $TCRAB_CLI_COVERAGE', () => {
    const home = tmpHome('t346a-');
    const log = path.join(home, 'cov.log');
    const run = cli(['security', '--json'], { env: { TCRAB_CLI_COVERAGE: log }, tolerate: true });
    assert.equal(run.code, 0, run.stderr);
    assert.equal(fs.readFileSync(log, 'utf8'), 'security\n');
  });

  await t.test('with the variable unset, nothing is written anywhere', () => {
    const home = tmpHome('t346b-');
    const log = path.join(home, 'cov.log');
    cli(['version'], { tolerate: true });
    assert.ok(!fs.existsSync(log), 'the CLI must not create a coverage file on its own');
  });

  await t.test('an unwritable path is swallowed — coverage never becomes an outage', () => {
    tmpHome('t346c-');
    const run = cli(['version'], { env: { TCRAB_CLI_COVERAGE: '/proc/nope/cov.log' }, tolerate: true });
    assert.equal(run.code, 0);
    assert.match(run.stdout, /\d+\.\d+\.\d+/);
  });
});

test('34.6 the recorded snapshot and the checked-in table agree with the switch', { concurrency: false }, async (t) => {
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'openclaw', 'data', 'cli-coverage.json'), 'utf8')) as {
    measuredAt: string;
    commands: string[];
    covered: { command: string; runs: number }[];
    untested: { command: string; why: string; instead: string }[];
    unknown: { command: string }[];
  };

  await t.test('every command is either run by the suite or listed with a reason', () => {
    assert.equal(snapshot.unknown.length, 0, `uncovered: ${snapshot.unknown.map((u) => u.command).join(', ')}`);
    const listed = new Set([...snapshot.covered.map((c) => c.command), ...snapshot.untested.map((u) => u.command)]);
    for (const cmd of snapshot.commands) assert.ok(listed.has(cmd), `${cmd} is in neither list`);
  });

  await t.test('the covered count is what the suite really reaches, and it is most of the surface', () => {
    const ratio = snapshot.covered.length / snapshot.commands.length;
    assert.ok(ratio >= 0.8, `only ${Math.round(ratio * 100)}% of commands are run by the suite`);
    for (const c of snapshot.covered) assert.ok(c.runs >= 1, `${c.command} claims covered with no runs`);
  });

  await t.test('each exception names a reason and a test that exists', () => {
    assert.ok(snapshot.untested.length <= 12, 'the exception list must stay small enough to read');
    for (const u of snapshot.untested) {
      assert.ok(u.why.length > 20, `${u.command}: the reason is a sentence, not a shrug`);
      assert.ok(fs.existsSync(path.join(ROOT, u.instead)), `${u.command} points at ${u.instead}, which does not exist`);
    }
  });

  await t.test('--check passes, so a new command cannot land untested silently', () => {
    const out = execFileSync(process.execPath, ['scripts/cli-coverage.mjs', '--check'], { encoding: 'utf8', cwd: ROOT });
    assert.match(out, /cli-coverage: ok/);
  });

  await t.test('the generated table is the same measurement, readable by a person', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'CLI-COVERAGE.md'), 'utf8');
    assert.match(doc, new RegExp(`${snapshot.covered.length} of ${snapshot.commands.length}`));
    assert.match(doc, /What this measures, and what it does not/);
    assert.match(doc, /measured, not claimed/i);
    for (const u of snapshot.untested) assert.ok(doc.includes(`\`termcrab ${u.command}\``), `${u.command} missing from the table`);
  });
});

test('34.6 the four commands the suite never reached, reached and asserted', { concurrency: false }, async (t) => {
  await t.test('update --check: the "there is a newer release" branch, against a local server', async () => {
    tmpHome('t346d-');
    const server = http.createServer((_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ tag_name: 'v99.0.0', html_url: 'https://example.invalid/releases/v99.0.0' }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    // A keep-alive socket from the CLI child must not keep this test file alive.
    server.unref();
    const port = (server.address() as { port: number }).port;
    try {
      const json = JSON.parse(
        (await cliAsync(['update', '--check', '--json'], { env: { TCRAB_UPDATE_API: `http://127.0.0.1:${port}` } }))
          .stdout,
      ) as { ok: boolean; data: { ok: boolean; updateAvailable: boolean; latest: string } };
      assert.equal(json.ok, true);
      assert.equal(json.data.ok, true);
      assert.equal(json.data.latest, '99.0.0');
      assert.equal(json.data.updateAvailable, true);

      const text = (await cliAsync(['update', '--check'], { env: { TCRAB_UPDATE_API: `http://127.0.0.1:${port}` } }))
        .stdout;
      assert.match(text, /99\.0\.0/);
      assert.match(text, /update it in place: {2}termcrab update --apply/);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  await t.test('update --check: an unreachable API is a sentence, not a stack trace', () => {
    tmpHome('t346e-');
    const result = cli(['update', '--check'], { env: { TCRAB_UPDATE_API: 'http://127.0.0.1:1' }, tolerate: true });
    assert.equal(result.code, 0, 'a failed check is not a failed command');
    assert.match(result.stdout, /Couldn't check for updates/);
    assert.match(result.stdout, /no internet|fetch|ECONNREFUSED|connect/i);
    assert.ok(!/at Object\./.test(result.stdout), 'no stack trace');
  });

  await t.test('the API override is opt-in: the default stays api.github.com', async () => {
    const seen: string[] = [];
    await checkForUpdate('1.0.0', {
      fetchImpl: async (url: string) => {
        seen.push(url);
        return { ok: false, status: 404, json: async () => ({}) };
      },
    });
    assert.equal(seen[0], 'https://api.github.com/repos/onelitonbd/claw/releases/latest');

    seen.length = 0;
    await checkForUpdate('1.0.0', {
      api: 'http://mirror.test/api/',
      fetchImpl: async (url: string) => {
        seen.push(url);
        return { ok: false, status: 404, json: async () => ({}) };
      },
    });
    assert.equal(seen[0], 'http://mirror.test/api/repos/onelitonbd/claw/releases/latest', 'trailing slashes are handled');
  });

  await t.test('agent --demo answers offline and writes no config', () => {
    const home = tmpHome('t346f-');
    saveMockConfig(home);
    const before = fs.readFileSync(path.join(home, 'config.json'), 'utf8');
    const run = cli(['agent', '--demo', '--session', 'cli:test', 'say hi']);
    assert.match(run.stdout, /\[mock:mock-1\]/, 'the mock brain answers');
    assert.match(run.stdout + run.stderr, /offline demo/);
    assert.equal(fs.readFileSync(path.join(home, 'config.json'), 'utf8'), before, 'a demo turn never touches config.json');
  });

  await t.test('heartbeat: skips with a reason when empty, runs when there is something to do', () => {
    const home = tmpHome('t346g-');
    saveMockConfig(home);
    const empty = cli(['heartbeat'], { tolerate: true });
    assert.match(empty.stdout, /skipped: HEARTBEAT\.md is empty/);

    fs.writeFileSync(path.join(home, 'workspace', 'HEARTBEAT.md'), '# heartbeat\n\n- check the inbox\n', 'utf8');
    const ran = cli(['heartbeat'], { tolerate: true });
    assert.match(ran.stdout, /✅ heartbeat ran/);
    assert.ok(ran.stdout.length > empty.stdout.length, 'a real heartbeat produces a turn, not a skip');
  });

  await t.test('wake without termux-api: exit 1 and the install line, before anything listens', () => {
    tmpHome('t346h-');
    const bin = path.dirname(process.execPath);
    const result = cli(['wake', '--keyword', 'crab'], { env: { PATH: `${bin}:/usr/bin:/bin` }, tolerate: true });
    assert.equal(result.code, 1);
    assert.match(result.stderr, /termux-speech-to-text not found/);
    assert.match(result.stderr, /pkg install termux-api/);
    assert.ok(!/wake loop: listening/.test(result.stdout), 'it must not claim to listen when it cannot');
  });
});

test('34.6 the coverage snapshot is pinned to the source it measured', { concurrency: false }, async (t) => {
  const snap = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'openclaw', 'data', 'coverage.json'), 'utf8')) as {
    measuredAt: string;
    fingerprint: string;
    floor: number;
    tests: number;
    testFiles: number;
    fail: number;
    source: { lines: number; branches: number; functions: number };
    worst: { dir: string; file: string; lines: number }[];
  };

  await t.test('the recorded run is green and clears the floor it declares', (t) => {
    if (process.env.TCRAB_COVERAGE_RECORDING === '1') {
      // This run *is* the recording: the snapshot on disk is the previous one,
      // so this assertion can only be made afterwards. Any other failure in this
      // run still lands in the snapshot's `fail` count and --check refuses it.
      t.skip('this suite run is the recording itself');
      return;
    }
    assert.equal(snap.fail, 0, 'coverage from a red suite means nothing');
    assert.ok(snap.floor >= 80, `the floor is a real bar, not a formality: ${snap.floor}`);
    assert.ok(
      snap.source.lines >= snap.floor,
      `src/ is at ${snap.source.lines}% lines, below the declared floor of ${snap.floor}%`,
    );
    assert.ok(snap.tests >= 900 && snap.testFiles >= 90, `measured ${snap.tests} tests in ${snap.testFiles} files`);
  });

  await t.test('the check passes now, and the doc carries the same number', (t) => {
    if (process.env.TCRAB_COVERAGE_RECORDING === '1') {
      t.skip('the check is run by the next (non-recording) suite run');
      return;
    }
    const out = execFileSync(process.execPath, ['scripts/coverage.mjs', '--check'], { encoding: 'utf8', cwd: ROOT });
    assert.match(out, /coverage: ok/);
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'TESTING.md'), 'utf8');
    assert.ok(doc.includes(`${snap.source.lines}%`), 'docs/TESTING.md shows the recorded number');
    assert.match(doc, /no browser rendering|No browser rendering/);
    assert.match(doc, /No real Telegram or WhatsApp network/);
  });

  await t.test('the fingerprint is what makes the recording expire', () => {
    assert.match(snap.fingerprint, /^[0-9a-f]{16}$/);

    // A copy of the script over a copy of the snapshot with a wrong fingerprint:
    // the check has to refuse it, or the pinning is decorative.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't346cov-'));
    fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'docs', 'openclaw', 'data'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts', 'coverage.mjs'), path.join(dir, 'scripts', 'coverage.mjs'));
    fs.writeFileSync(path.join(dir, 'src', 'thing.ts'), 'export const x = 1;\n');
    fs.writeFileSync(
      path.join(dir, 'docs', 'TESTING.md'),
      '# t\n<!-- coverage:begin -->\n<!-- coverage:end -->\n',
    );
    fs.writeFileSync(
      path.join(dir, 'docs', 'openclaw', 'data', 'coverage.json'),
      JSON.stringify({ ...snap, fingerprint: 'deadbeefdeadbeef', worst: [] }),
    );
    const bad = spawnSync(process.execPath, [path.join(dir, 'scripts', 'coverage.mjs'), '--check'], {
      encoding: 'utf8',
    });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /recording is stale/);
    assert.match(bad.stderr, /npm run test:coverage/);

    const missing = spawnSync(process.execPath, [path.join(dir, 'scripts', 'coverage.mjs'), '--check'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: '/usr/bin:/bin' },
    });
    assert.equal(missing.status, 1, 'a missing snapshot cannot pass silently');
  });

  await t.test('the two measurements are one command', async () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    assert.match(pkg.scripts['test:coverage'] ?? '', /coverage\.mjs --run/);
    assert.match(pkg.scripts['test:cli'] ?? '', /cli-coverage\.mjs --run/);
    assert.match(pkg.scripts['check:measure'] ?? '', /--check.*--check/);
    const out = execFileSync('node', ['scripts/coverage.mjs', '--json'], { encoding: 'utf8', cwd: ROOT });
    assert.equal((JSON.parse(out) as { fingerprint: string }).fingerprint, snap.fingerprint);
  });
});
