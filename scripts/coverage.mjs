#!/usr/bin/env node
/**
 * 34.6 — what the suite actually covers, measured with Node's own coverage
 * reporter (no dependency, no instrumentation of our own).
 *
 *   node scripts/coverage.mjs          # check the recorded snapshot (fast, used by the suite)
 *   node scripts/coverage.mjs --run    # run the full suite with coverage, record, rewrite docs/TESTING.md
 *   node scripts/coverage.mjs --json   # the snapshot as data
 *
 * The number is *pinned to the source it measured*: the snapshot carries a
 * fingerprint of every file under `src/`, and `--check` fails when the source
 * has moved since the recording. That is what stops a coverage badge from
 * quietly describing last month's code.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SNAPSHOT = 'docs/openclaw/data/coverage.json';
const DOC = 'docs/TESTING.md';
const FLOOR = 80; // source line coverage the recording has to clear, in percent

function sourceFiles(dir = path.join(ROOT, 'src')) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out.sort();
}

function fingerprint() {
  const hash = crypto.createHash('sha256');
  for (const file of sourceFiles()) {
    hash.update(path.relative(ROOT, file));
    hash.update(fs.readFileSync(file));
  }
  return hash.digest('hex').slice(0, 16);
}

function testFiles() {
  return fs
    .readdirSync(path.join(ROOT, 'dist', 'test'))
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join('dist/test', f));
}

function parse(text) {
  // # all files  |  88.30 |    78.24 |   89.82 |
  const rows = [];
  let section = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('#')) continue;
    const body = line.slice(1).trimEnd();
    const dir = body.match(/^\s{2,}([a-z0-9_-]+)\s{2,}\|\s*\|/i);
    if (dir) {
      section = dir[1];
      continue;
    }
    const row = body.match(/^\s*([A-Za-z0-9_.-]+\.js)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (row) {
      rows.push({ dir: section, file: row[1], lines: +row[2], branches: +row[3], functions: +row[4] });
      continue;
    }
    const all = body.match(/^all files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (all) rows.push({ dir: 'all', file: 'all files', lines: +all[1], branches: +all[2], functions: +all[3] });
  }
  const counts = {};
  for (const m of text.matchAll(/^# (tests|pass|fail|skipped|cancelled) (\d+)$/gm)) counts[m[1]] = +m[2];
  return { rows, counts };
}

/** Weighted average over the files that belong to the product, not the tests. */
function weighted(rows, key) {
  const src = rows.filter((r) => r.dir !== 'test' && r.file !== 'all files');
  if (!src.length) return 0;
  const total = src.reduce((sum, r) => sum + r[key], 0);
  return total / src.length;
}

function run() {
  execFileSync('npm', ['run', 'build:test'], { cwd: ROOT, stdio: 'ignore' });
  process.stderr.write('running the full suite with node --experimental-test-coverage (≈80s)…\n');
  let text = '';
  try {
    text = execFileSync(
      process.execPath,
      ['--test', '--test-timeout=60000', '--experimental-test-coverage', ...testFiles()],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    text = String(err && err.stdout ? err.stdout : '');
    process.stderr.write('the suite exited non-zero — recording the numbers anyway\n');
  }
  const { rows, counts } = parse(text);
  const files = testFiles().length;
  const snapshot = {
    measuredAt: new Date().toISOString().slice(0, 10),
    fingerprint: fingerprint(),
    floor: FLOOR,
    tests: counts.tests ?? 0,
    pass: counts.pass ?? 0,
    fail: counts.fail ?? 0,
    skipped: counts.skipped ?? 0,
    testFiles: files,
    source: {
      lines: +weighted(rows, 'lines').toFixed(2),
      branches: +weighted(rows, 'branches').toFixed(2),
      functions: +weighted(rows, 'functions').toFixed(2),
    },
    all: rows.find((r) => r.file === 'all files') ?? { lines: 0, branches: 0, functions: 0 },
    worst: rows
      .filter((r) => r.dir !== 'test' && r.file !== 'all files' && r.lines < 100)
      .sort((a, b) => a.lines - b.lines)
      .slice(0, 12),
    best: rows
      .filter((r) => r.dir !== 'test' && r.file !== 'all files' && r.lines >= 100)
      .slice(0, 5)
      .map((r) => r.file),
  };
  fs.writeFileSync(path.join(ROOT, SNAPSHOT), JSON.stringify(snapshot, null, 2) + '\n');
  if (fs.existsSync(path.join(ROOT, DOC))) rewriteDoc(snapshot);
  process.stdout.write(
    `coverage: ${snapshot.source.lines}% lines · ${snapshot.source.branches}% branches · ` +
      `${snapshot.source.functions}% functions over src/ · ${snapshot.tests} tests (${snapshot.testFiles} files) · ` +
      `floor ${FLOOR}%\n`,
  );
  if (snapshot.source.lines < FLOOR) {
    process.stderr.write(`below the floor (${snapshot.source.lines}% < ${FLOOR}%)\n`);
    process.exit(1);
  }
}

function rewriteDoc(snapshot) {
  const file = path.join(ROOT, DOC);
  const doc = fs.readFileSync(file, 'utf8');
  const begin = '<!-- coverage:begin -->';
  const end = '<!-- coverage:end -->';
  const i = doc.indexOf(begin);
  const j = doc.indexOf(end);
  if (i < 0 || j < 0) return;
  const block = [
    begin,
    `**Measured ${snapshot.measuredAt}:** **${snapshot.source.lines}%** of the lines in \`src/\` are executed by the`,
    `suite (${snapshot.source.branches}% of branches, ${snapshot.source.functions}% of functions), across`,
    `**${snapshot.tests} test cases in ${snapshot.testFiles} files**. The floor is ${FLOOR}% and it is enforced:`,
    '`node scripts/coverage.mjs --check` also verifies that the recording was made on *this* source.',
    '',
    '| Lowest coverage in `src/` | lines |',
    '|---|---|',
    ...snapshot.worst.map((r) => `| \`${r.dir ? r.dir + '/' : ''}${r.file}\` | ${r.lines}% |`),
    '',
    'Those are the files the suite touches least. They are named here on purpose: on a phone, the',
    'cheapest next step is whichever of them your next bug lands in.',
    end,
  ].join('\n');
  fs.writeFileSync(file, doc.slice(0, i) + block + doc.slice(j + end.length));
}

function snapshotOf() {
  const file = path.join(ROOT, SNAPSHOT);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const mode = process.argv.includes('--run')
  ? 'run'
  : process.argv.includes('--json')
    ? 'json'
    : process.argv.includes('--doc')
      ? 'doc'
      : 'check';

if (mode === 'run') run();
else if (mode === 'doc') {
  const snap = snapshotOf();
  if (!snap) {
    process.stderr.write('no snapshot yet — run: node scripts/coverage.mjs --run\n');
    process.exit(1);
  }
  rewriteDoc(snap);
  process.stdout.write(`${DOC} rewritten from the recorded snapshot\n`);
} else if (mode === 'json') {
  const snap = snapshotOf();
  if (!snap) {
    process.stderr.write('no snapshot yet — run: node scripts/coverage.mjs --run\n');
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(snap, null, 2) + '\n');
} else {
  const snap = snapshotOf();
  const problems = [];
  if (!snap) problems.push(`${SNAPSHOT} is missing — run: node scripts/coverage.mjs --run`);
  else {
    if (snap.fail > 0) problems.push(`the recorded run had ${snap.fail} failing test(s) — a coverage number from a red suite means nothing`);
    if (snap.source.lines < FLOOR)
      problems.push(`source line coverage ${snap.source.lines}% is below the ${FLOOR}% floor`);
    const now = fingerprint();
    if (snap.fingerprint !== now)
      problems.push(
        `the recording is stale: it measured source fingerprint ${snap.fingerprint}, the tree is now ${now} — re-run npm run test:coverage`,
      );
    if (!fs.existsSync(path.join(ROOT, DOC))) problems.push(`${DOC} is missing`);
    else {
      const doc = fs.readFileSync(path.join(ROOT, DOC), 'utf8');
      if (!doc.includes(`${snap.source.lines}%`)) problems.push(`${DOC} does not show the recorded number`);
    }
  }
  if (problems.length) {
    process.stderr.write('coverage: ' + problems.join('\n  ') + '\n');
    process.exit(1);
  }
  process.stdout.write(
    `coverage: ok (${snap.source.lines}% lines of src/, ${snap.tests} tests, floor ${FLOOR}%, fingerprint ${snap.fingerprint})\n`,
  );
}
