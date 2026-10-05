#!/usr/bin/env node
/**
 * 44.2 — one place that decides how long a test may take.
 *
 * node's runner cancels a test that outlives `--test-timeout`, and the CLI flag
 * **overrides** a test's own `{ timeout }` option (verified, and asserted in
 * test/tier3n.test.ts). The suite used to pass 60 s for every file — but two
 * files spawn work that legitimately runs for minutes on a slow machine (a real
 * `npm install`, the real bench), so on a loaded box or on a phone those tests
 * were cancelled while their children were still working, and the file was
 * reported as `not ok` with **zero failing assertions**. That is the worst kind
 * of red: it looks like a flake, teaches people to re-run, and hides the fact
 * that nothing was actually measured.
 *
 * So: two groups, one declared number each.
 *
 *   - the fast group (everything else) keeps 60 s, so a genuinely hung test
 *     still fails quickly — the property that keeps `npm test` bearable;
 *   - the heavy group (the measurement files, named here with the reason) gets
 *     10 minutes, because it authorizes children to run that long.
 *
 * `npm test`, `scripts/coverage.mjs`, `scripts/cli-coverage.mjs` and
 * `scripts/suite-time.mjs` all run the suite through this file, so the split
 * cannot drift between the four of them. The wall-clock budget in
 * `scripts/suite-time.mjs` (240 s) stays the alarm for "the suite got slow";
 * this file only decides how long a single test may stay silent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const FAST_TIMEOUT_MS = 60_000;
export const HEAVY_TIMEOUT_MS = 600_000;

/**
 * The files that measure instead of assert: they spawn real installs and the
 * real bench, with child timeouts of 300–600 s. Named explicitly, and asserted
 * to exist, so a rename cannot quietly move a file into the fast group.
 */
export const HEAVY_FILES = [
  { file: 'tier3i.test.js', why: 'the performance budget: runs the real bench and the gates around it' },
  { file: 'tier3j.test.js', why: 'the cold-checkout measurement: a real npm install from an empty cache' },
];

/** Every built test file, sorted. */
export function builtTestFiles(dir = path.join(ROOT, 'dist', 'test')) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.test.js'))
    .sort();
}

/**
 * Split the built files into the two groups and say which timeout each group
 * runs with. Throws when a heavy file is missing (a rename that skipped this
 * file is a bug, not a smaller suite).
 */
export function plan(files = builtTestFiles()) {
  const heavyNames = new Set(HEAVY_FILES.map((h) => h.file));
  for (const h of HEAVY_FILES) {
    if (!files.includes(h.file)) {
      throw new Error(`the heavy list names ${h.file}, which is not built — update scripts/test-files.mjs`);
    }
  }
  const fast = files.filter((f) => !heavyNames.has(f));
  const heavy = files.filter((f) => heavyNames.has(f));
  if (fast.length + heavy.length !== files.length) {
    throw new Error('the groups do not add up to the built files');
  }
  return {
    fast: { files: fast, timeoutMs: FAST_TIMEOUT_MS },
    heavy: { files: heavy, timeoutMs: HEAVY_TIMEOUT_MS },
  };
}

/** Every file exactly once — the property the suite's honesty rests on. */
export function assertComplete(files = builtTestFiles()) {
  const { fast, heavy } = plan(files);
  const seen = [...fast.files, ...heavy.files];
  const unique = new Set(seen);
  if (unique.size !== files.length) throw new Error('a test file is in both groups or in neither');
  return { count: files.length, fast: fast.files.length, heavy: heavy.files.length };
}

/** `node --test` argv for one group. */
export function argvFor(group) {
  return ['--test', `--test-timeout=${group.timeoutMs}`, ...group.files.map((f) => path.join(ROOT, 'dist', 'test', f))];
}

/**
 * Run the whole suite — heavy group first, so a slow machine spends its time on
 * the measurement before the fast assertions, and the fast group's 60 s keeps
 * its meaning. Returns the worst exit code, so a failure in either group is a
 * failure of `npm test`.
 */
export function runSuite({ stdio = 'inherit', env = process.env, node = process.execPath } = {}) {
  const { fast, heavy } = plan();
  let code = 0;
  for (const group of [heavy, fast]) {
    const r = spawnSync(node, argvFor(group), { cwd: ROOT, stdio, env });
    if (r.error) throw r.error;
    if (r.status) code = r.status;
  }
  return code;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--json')) {
    const { fast, heavy } = plan();
    console.log(
      JSON.stringify(
        {
          ok: true,
          fast: { files: fast.files.length, timeoutMs: fast.timeoutMs },
          heavy: heavy.files.map((f) => ({ file: f, why: HEAVY_FILES.find((h) => h.file === f)?.why })),
          total: fast.files.length + heavy.files.length,
        },
        null,
        2,
      ),
    );
  } else {
    const summary = assertComplete();
    process.stderr.write(
      `running ${summary.count} test file(s): ${summary.heavy} heavy (${HEAVY_TIMEOUT_MS / 1000}s each) then ${summary.fast} fast (${FAST_TIMEOUT_MS / 1000}s each)\n`,
    );
    process.exit(runSuite());
  }
}
