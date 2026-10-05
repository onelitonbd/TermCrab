#!/usr/bin/env node
/**
 * 34.6 — which commands does the suite actually run?
 *
 * Their CI runs contract tests per channel and 16k PRs; we have one phone and a
 * suite that spawns the real binary. So CLI coverage here is *measured*, not
 * claimed: `src/cli.ts` appends the command it dispatched to the file in
 * `TCRAB_CLI_COVERAGE`, this script runs the whole suite with that variable set,
 * and then compares what ran against what the switch can dispatch.
 *
 *   node scripts/cli-coverage.mjs          # check the recorded snapshot (fast, used by the suite)
 *   node scripts/cli-coverage.mjs --run    # run the full suite, record, rewrite the doc
 *   node scripts/cli-coverage.mjs --json   # the snapshot as data
 *
 * Two rules keep it honest:
 *   1. A command is either *seen* in the recording, or listed in `UNTESTED`
 *      below with a reason and where it is tested instead. A command that is
 *      neither fails the check, so adding a command to the CLI cannot silently
 *      skip the suite.
 *   2. An entry in `UNTESTED` whose command *was* seen fails too (the list may
 *      not rot).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SNAPSHOT = 'docs/openclaw/data/cli-coverage.json';
const DOC = 'docs/CLI-COVERAGE.md';

/**
 * Commands the suite cannot sensibly drive end-to-end, each with the reason and
 * the test that covers the behaviour at the level it can be covered on a
 * machine with no TTY, no Telegram account and no Termux.
 */
const UNTESTED = {
  tui: {
    why: 'needs a real TTY (alternate screen + raw keys); the suite drives it through a fake TTY instead',
    instead: 'test/tier2r.test.ts',
  },
  supervisor: {
    why: 'supervise-and-restart is a loop with no exit condition — spawning it would hang the suite',
    instead: 'test/tier2s.test.ts',
  },
  boot: {
    why: 'termscrab boot writes the Termux:Boot script; the machine it runs on has no Termux prefix',
    instead: 'test/tier2w.test.ts',
  },
  import: {
    why: 'reads a Telegram desktop export; the suite builds the same files and imports them through the library',
    instead: 'test/import.test.ts',
  },
  pair: {
    why: 'the pairing code is printed for a device that has to answer — the HTTP flow is tested live instead',
    instead: 'test/tier2i.test.ts',
  },
  devices: {
    why: 'same flow: the paired-device list and revocation are asserted over a real socket',
    instead: 'test/tier2i.test.ts',
  },
  onboard: {
    why: 'an interactive question-and-answer wizard on stdin; the prompts are asserted directly',
    instead: 'test/tier.test.ts',
  },
  dream: {
    why: 'a long background consolidation pass; the same store is exercised by the library tests',
    instead: 'test/dream.test.ts',
  },
};

function commands() {
  const src = fs.readFileSync(path.join(ROOT, 'src/cli.ts'), 'utf8');
  const lines = src.split('\n');
  const start = lines.findIndex((l) => /switch \(cmd\) \{/.test(l));
  if (start < 0) throw new Error('src/cli.ts: `switch (cmd)` not found — did the dispatch move?');
  const seen = new Map();
  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(/^\s*case '([^']+)':/);
    if (!m) continue;
    const name = m[1];
    if (name.startsWith('-')) continue; // --help / -v aliases point at a real command
    if (!seen.has(name)) seen.set(name, i + 1);
  }
  return seen;
}

function snapshot() {
  const file = path.join(ROOT, SNAPSHOT);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function run() {
  const log = path.join(ROOT, 'dist', 'cli-coverage.log');
  fs.mkdirSync(path.dirname(log), { recursive: true });
  fs.writeFileSync(log, '');
  process.stderr.write('running the full suite with the coverage hook set (≈80s)…\n');
  try {
    // 44.2 — a cancelled test runs no command, so a tight deadline would quietly
    // shrink the recorded coverage. The daily `npm test` keeps the tight one.
    execFileSync(process.execPath, ['--test', '--test-timeout=600000', ...listTests()], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: { ...process.env, TCRAB_CLI_COVERAGE: log },
    });
  } catch {
    process.stderr.write('the suite exited non-zero — recording what ran anyway\n');
  }
  const raw = fs.readFileSync(log, 'utf8');
  const counts = {};
  for (const line of raw.split('\n')) {
    const cmd = line.trim();
    if (cmd) counts[cmd] = (counts[cmd] ?? 0) + 1;
  }
  return counts;
}

function listTests() {
  const dir = path.join(ROOT, 'dist', 'test');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.test.js'))
    .map((f) => path.join('dist/test', f));
}

function classify(counts) {
  const all = commands();
  const covered = [];
  const untested = [];
  const unknown = [];
  for (const [name, line] of all) {
    if (counts[name]) covered.push({ command: name, line, runs: counts[name] });
    else if (UNTESTED[name]) untested.push({ command: name, line, ...UNTESTED[name] });
    else unknown.push({ command: name, line });
  }
  const stale = Object.keys(UNTESTED).filter((c) => counts[c] && all.has(c));
  const ghost = Object.keys(UNTESTED).filter((c) => !all.has(c));
  return { all, covered, untested, unknown, stale, ghost };
}

function render(snap) {
  const rows = [];
  rows.push('# CLI command coverage — measured, not claimed', '');
  rows.push(
    `Every command the \`switch (cmd)\` in \`src/cli.ts\` can dispatch, and whether the test suite`,
    `actually runs it through the built binary. The number below is a recording, not an estimate:`,
    `\`src/cli.ts\` appends its command to \`$TCRAB_CLI_COVERAGE\` on every dispatch, and`,
    `\`node scripts/cli-coverage.mjs --run\` runs the whole suite with that variable set.`,
    '',
    `**Measured:** ${snap.measuredAt} · **${snap.covered.length} of ${snap.commands.length}** commands ` +
      `executed end-to-end by \`npm test\` (${Math.round((snap.covered.length / snap.commands.length) * 100)}%).`,
    '',
    '## Run by the suite',
    '',
    '| Command | In `src/cli.ts` | Times run |',
    '|---|---|---|',
  );
  for (const c of snap.covered) rows.push(`| \`termcrab ${c.command}\` | line ${c.line} | ${c.runs} |`);
  rows.push('', '## Not run by the suite — and what covers it instead', '');
  rows.push('| Command | Why not | Covered instead by |', '|---|---|---|');
  for (const u of snap.untested) rows.push(`| \`termcrab ${u.command}\` | ${u.why} | \`${u.instead}\` |`);
  rows.push(
    '',
    '## What this measures, and what it does not',
    '',
    '- It measures **the CLI surface**: whether the command was dispatched at all by a test that',
    '  spawns the real binary. It says nothing about how much of the command ran.',
    '- Library-level coverage is measured separately and reported in `docs/TESTING.md`',
    '  (`npm run test:coverage`).',
    '- A command that is added to `src/cli.ts` and neither run nor listed in `scripts/cli-coverage.mjs`',
    '  fails `node scripts/cli-coverage.mjs --check`, and so does a listing whose command is now run —',
    '  the list may not rot in either direction.',
    '',
  );
  return rows.join('\n');
}

const mode = process.argv.includes('--run') ? 'run' : process.argv.includes('--json') ? 'json' : 'check';

if (mode === 'run') {
  const counts = run();
  const { covered, untested, unknown, stale, ghost } = classify(counts);
  const snap = {
    measuredAt: new Date().toISOString().slice(0, 10),
    commands: [...commands().keys()],
    covered,
    untested: untested.map(({ command, line, why, instead }) => ({ command, line, why, instead })),
    unknown,
    runCounts: counts,
  };
  fs.writeFileSync(path.join(ROOT, SNAPSHOT), JSON.stringify(snap, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, DOC), render(snap));
  for (const name of stale) process.stderr.write(`stale entry: ${name} is run by the suite now — remove it from UNTESTED\n`);
  for (const name of ghost) process.stderr.write(`ghost entry: ${name} is not a command any more — remove it from UNTESTED\n`);
  for (const u of unknown) process.stderr.write(`uncovered: termcrab ${u.command} (line ${u.line})\n`);
  process.stdout.write(
    `CLI coverage: ${covered.length}/${commands().size} commands run by the suite · ` +
      `${untested.length} listed with a reason · ${unknown.length} uncovered\n`,
  );
} else if (mode === 'json') {
  const snap = snapshot();
  if (!snap) {
    process.stderr.write(`no snapshot yet — run: node scripts/cli-coverage.mjs --run\n`);
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(snap, null, 2) + '\n');
} else {
  const snap = snapshot();
  const problems = [];
  if (!snap) problems.push(`the snapshot ${SNAPSHOT} is missing — run: node scripts/cli-coverage.mjs --run`);
  else {
    const { unknown, stale, ghost } = classify(snap.runCounts ?? {});
    if (unknown.length)
      problems.push(
        `${unknown.length} command(s) neither run by the suite nor listed with a reason: ` +
          unknown.map((u) => u.command).join(', '),
      );
    for (const name of stale) problems.push(`\`${name}\` is run by the suite now — remove it from UNTESTED`);
    for (const name of ghost) problems.push(`\`${name}\` is no longer a CLI command — remove it from UNTESTED`);
    for (const u of snap.untested) {
      const file = path.join(ROOT, u.instead);
      if (!fs.existsSync(file)) problems.push(`\`${u.command}\` says ${u.instead} covers it, but that file does not exist`);
    }
    if (!fs.existsSync(path.join(ROOT, DOC))) problems.push(`${DOC} is missing — run: node scripts/cli-coverage.mjs --run`);
    else {
      const doc = fs.readFileSync(path.join(ROOT, DOC), 'utf8');
      if (!doc.includes(`${snap.covered.length} of ${snap.commands.length}`))
        problems.push(`${DOC} does not show the recorded number — re-run with --run`);
    }
  }
  if (problems.length) {
    process.stderr.write('cli-coverage: ' + problems.join('\n  ') + '\n');
    process.exit(1);
  }
  process.stdout.write(
    `cli-coverage: ok (${snap.covered.length}/${snap.commands.length} commands run by the suite, ` +
      `${snap.untested.length} listed with a reason, ${snap.unknown.length} uncovered)\n`,
  );
}
