/**
 * tier3n — batch 43, the last piece: the suite's deadlines are declared once.
 *
 *   44.2 a test may not be cancelled while the work it authorized is still
 *        running. node's runner cancels a test at `--test-timeout`, and the CLI
 *        flag **overrides** a test's own `{ timeout }` option — so the two files
 *        that measure (a real `npm install`, the real bench) were cancelled on a
 *        loaded machine and reported as `not ok` with zero failing assertions:
 *        the worst kind of red. `scripts/test-files.mjs` is the one place that
 *        decides how long a test may take, and `npm test` runs through it.
 *
 * The override itself is asserted here against a throwaway file, so the reason
 * this split exists cannot quietly stop being true.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();

function runNodeAsync(args: string[], timeout = 30_000, env: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    execFile(
      process.execPath,
      args,
      { cwd: ROOT, env: { ...process.env, NO_COLOR: '1', ...env }, timeout },
      (err, stdout, stderr) => {
        resolve({ code: err ? ((err as { code?: number }).code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

async function script<T>(name: string): Promise<T> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', name)).href)) as T;
}

test('44.2 the suite is split by deadline, and every built file runs exactly once', async () => {
  const { plan, assertComplete, HEAVY_FILES, FAST_TIMEOUT_MS, HEAVY_TIMEOUT_MS } = await script<{
    plan: (files?: string[]) => {
      fast: { files: string[]; timeoutMs: number };
      heavy: { files: string[]; timeoutMs: number };
    };
    assertComplete: (files?: string[]) => { count: number; fast: number; heavy: number };
    HEAVY_FILES: { file: string; why: string }[];
    FAST_TIMEOUT_MS: number;
    HEAVY_TIMEOUT_MS: number;
  }>('test-files.mjs');

  const { fast, heavy } = plan();
  const summary = assertComplete();

  // The property the suite's honesty rests on: no file is skipped, none twice.
  assert.equal(summary.count, fast.files.length + heavy.files.length);
  assert.equal(new Set([...fast.files, ...heavy.files]).size, summary.count, 'every file exactly once');
  assert.ok(summary.count >= 100, `the suite is the whole suite (${summary.count} files)`);

  // The split itself: the measuring files are heavy, everything else is fast.
  assert.deepEqual(heavy.files.sort(), HEAVY_FILES.map((h) => h.file).sort());
  assert.ok(fast.files.length > 90, 'the fast group is everything else');
  for (const h of HEAVY_FILES) {
    assert.ok(h.why.length > 30, `${h.file} says why it is heavy`);
  }

  // The deadlines are different on purpose, and the heavy one is the larger.
  assert.equal(fast.timeoutMs, FAST_TIMEOUT_MS);
  assert.equal(heavy.timeoutMs, HEAVY_TIMEOUT_MS);
  assert.equal(FAST_TIMEOUT_MS, 60_000, 'a hung fast test still fails quickly');
  assert.ok(HEAVY_TIMEOUT_MS >= 600_000, 'the measuring files get the time their children were already given');

  const heavySource = new Map(
    HEAVY_FILES.map((h) => [
      h.file,
      fs.readFileSync(path.join(ROOT, 'test', h.file.replace(/\.test\.js$/, '.test.ts')), 'utf8'),
    ]),
  );
  for (const h of HEAVY_FILES) {
    assert.match(
      heavySource.get(h.file)!,
      /300_000|600_000/,
      `${h.file} really does spawn work with a minutes-long deadline — otherwise it belongs in the fast group`,
    );
  }
});

test('44.2 the runner flag overrides a test\'s own deadline — the fact this design rests on', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't436-'));
  const file = path.join(dir, 'own-deadline.test.mjs');
  fs.writeFileSync(
    file,
    [
      "import { test } from 'node:test';",
      "test('asks for five seconds, sleeps three hundred milliseconds', { timeout: 5000 }, async () => {",
      '  await new Promise((r) => setTimeout(r, 300));',
      '});',
      '',
    ].join('\n'),
  );

  // Inside a test run, NODE_TEST_CONTEXT makes a nested runner speak to its
  // parent instead of printing TAP — drop it and pin the reporter, so what is
  // asserted is the runner's verdict, not the ambient reporter.
  const env: Record<string, string> = {};
  delete process.env.NODE_TEST_CONTEXT;
  for (const [k, v] of Object.entries(process.env)) if (k !== 'NODE_TEST_CONTEXT' && v !== undefined) env[k] = v;
  const nested = async (args: string[]) => {
    const r = await new Promise<{ code: number; out: string }>((resolve) => {
      execFile(
        process.execPath,
        [...args],
        { cwd: ROOT, env: { ...env, NO_COLOR: '1' }, timeout: 30_000 },
        (err, stdout, stderr) => {
          resolve({ code: err ? ((err as { code?: number }).code ?? 1) : 0, out: String(stdout) + String(stderr) });
        },
      );
    });
    return r;
  };

  // The flag tighter than the test's own option: the test is cancelled even
  // though it asked for — and needed — more. This is why HEAVY_FILES exists.
  const tight = await nested(['--test', '--test-reporter=tap', '--test-timeout=100', file]);
  assert.match(tight.out, /cancelled 1/, `the flag wins, and the test is cancelled:\n${tight.out}`);
  assert.doesNotMatch(tight.out, /# fail [1-9]/, 'cancelled is not a failing assertion — the line that made this look like a flake');
  assert.notEqual(tight.code, 0, 'and the file is red anyway');

  // Given room, the same test passes.
  const roomy = await nested(['--test', '--test-reporter=tap', '--test-timeout=5000', file]);
  assert.equal(roomy.code, 0, roomy.out);
  assert.match(roomy.out, /# pass 1/);
});

test('44.2 npm test and the recordings all use the declared deadlines', async () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  assert.equal(pkg.scripts.test, 'npm run build:test && node scripts/test-files.mjs', 'npm test runs the split');
  assert.doesNotMatch(pkg.scripts.test, /--test-timeout/, 'and does not carry a second, competing deadline');

  // The three recording runs take one generous deadline instead of the tight
  // one: a cancelled heavy test would be recorded as a failure that never
  // happened. The daily suite keeps the tight default; the budget gate is what
  // notices the suite got slow.
  for (const [file, needle] of [
    ['coverage.mjs', '--test-timeout=600000'],
    ['cli-coverage.mjs', '--test-timeout=600000'],
    ['suite-time.mjs', '--test-timeout=600000'],
  ] as const) {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', file), 'utf8');
    assert.ok(src.includes(needle), `${file} gives its run ${needle}`);
    assert.doesNotMatch(src, /--test-timeout=60000\b/, `${file} no longer carries the tight deadline`);
  }

  // The alarm for "the suite got slow" is untouched by this change.
  const { SUITE_BUDGETS } = await script<{ SUITE_BUDGETS: { wallMs: { max: number }; fileMs: { max: number } } }>(
    'suite-time.mjs',
  );
  assert.equal(SUITE_BUDGETS.wallMs.max, 240_000);
  assert.equal(SUITE_BUDGETS.fileMs.max, 90_000);

  // And the runner itself is importable without running anything.
  const again = await script<{ plan: () => unknown }>('test-files.mjs');
  assert.equal(typeof again.plan, 'function');
});
