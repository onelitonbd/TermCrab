#!/usr/bin/env node
/**
 * The closing numbers, read back from the artifacts (42.1).
 *
 * Every number the tracker quotes — the census score, the suite's tests, the
 * coverage floor, the CLI's command count, the suite clock, the performance
 * budget — is *produced* somewhere in `docs/openclaw/data/*.json`. Until now the
 * tracker repeated them by hand, which is a promise that somebody will one day
 * update one and forget the other. This script is the read-back: it loads the
 * artifacts, prints the numbers with the file each came from, and `--check`
 * refuses (exit 1) when the tracker's numbers line no longer quotes them (in the
 * Bengali digits the tracker is written in).
 *
 *   node scripts/final-numbers.mjs            # the closing numbers, with sources
 *   node scripts/final-numbers.mjs --json     # machine-readable
 *   node scripts/final-numbers.mjs --check    # …and is WORKLOG.md still quoting them?
 *
 * It reads files and nothing else: no network, no build, no suite.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = (root) => path.join(root, 'docs', 'openclaw', 'data');

const BENGALI = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** 1234.5 → ১২৩৪.৫ — the tracker is written in Bengali digits. */
export function bengali(value) {
  return String(value).replace(/\d/g, (d) => BENGALI[Number(d)]);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readTrackerLine(root) {
  try {
    const text = fs.readFileSync(path.join(root, 'WORKLOG.md'), 'utf8');
    return /^- \*\*সংখ্যা:\*\* (.*)$/m.exec(text)?.[1] ?? '';
  } catch {
    return '';
  }
}

/**
 * The closing numbers, each with the artifact it was read from. Throws a plain
 * sentence when an artifact is missing — a number nobody can re-derive is worse
 * than no number.
 */
export function finalNumbers(root = ROOT) {
  const dataDir = DATA(root);
  const census = readJson(path.join(dataDir, 'census.json'));
  const coverage = readJson(path.join(dataDir, 'coverage.json'));
  const cli = readJson(path.join(dataDir, 'cli-coverage.json'));
  const clock = readJson(path.join(dataDir, 'suite-time.json'));
  const missing = [];
  if (!census) missing.push('census.json');
  if (!coverage) missing.push('coverage.json');
  if (!cli) missing.push('cli-coverage.json');
  if (!clock) missing.push('suite-time.json');
  if (missing.length) throw new Error(`no number to quote: ${missing.join(', ')} not found under ${dataDir}`);

  const perfFiles = fs
    .readdirSync(dataDir)
    .filter((f) => /^perf-[0-9.]+\.json$/.test(f))
    .sort();
  const perf = perfFiles.map((f) => ({ file: f, ...readJson(path.join(dataDir, f)) }));
  if (!perf.length) throw new Error(`no number to quote: no perf-<release>.json under ${dataDir}`);
  const latest = perf[perf.length - 1];

  const tally = census.tally ?? {};
  const number = {
    census: {
      score: census.coverage,
      inScope: census.inScope,
      outOfScope: census.outOfScope,
      working: tally.WORKING ?? 0,
      better: tally.BETTER ?? 0,
      partial: tally.PARTIAL ?? 0,
      broken: tally.BROKEN ?? 0,
      absent: tally.ABSENT ?? 0,
      drift: Array.isArray(census.drift) ? census.drift.length : Number(census.drift) || 0,
      effortDays: census.effortLeft,
      measuredAt: census.measuredAt,
      source: 'census.json',
    },
    suite: {
      tests: coverage.tests,
      // The plain run's pass/fail/skip live in suite-time.json. A recording that
      // predates those fields says null instead of being guessed from the
      // coverage run (whose skip count differs on purpose).
      pass: Number.isFinite(clock.totalPass) ? clock.totalPass : null,
      fail: Number.isFinite(clock.totalFail) ? clock.totalFail : null,
      skipped: Number.isFinite(clock.totalSkipped) ? clock.totalSkipped : null,
      testFiles: coverage.testFiles,
      source: 'suite-time.json + coverage.json',
    },
    coverage: {
      lines: coverage.source?.lines,
      branches: coverage.source?.branches,
      functions: coverage.source?.functions,
      floor: coverage.floor,
      fingerprint: coverage.fingerprint,
      measuredAt: coverage.measuredAt,
      source: 'coverage.json',
    },
    cli: {
      covered: cli.covered?.length ?? 0,
      total: cli.commands?.length ?? 0,
      untested: cli.untested?.length ?? 0,
      unknown: cli.unknown?.length ?? 0,
      measuredAt: cli.measuredAt,
      source: 'cli-coverage.json',
    },
    clock: {
      wallMs: clock.wallMs,
      seconds: Number((clock.wallMs / 1000).toFixed(1)),
      files: clock.totalFiles,
      cases: clock.totalTests,
      budgetSeconds: Math.round((clock.budget?.wallMs ?? 0) / 1000),
      slowest: clock.slowest?.[0] ?? null,
      over: clock.over ?? [],
      at: clock.at,
      source: 'suite-time.json',
    },
    perf: {
      releases: perf.map((p) => p.release || p.file.replace(/^perf-|\.json$/g, '')),
      latestRelease: latest.release || latest.file.replace(/^perf-|\.json$/g, ''),
      metrics: Object.keys(latest.metrics ?? {}).length,
      ceilings: Object.keys(latest.ceilings ?? {}).length,
      over: latest.over ?? [],
      at: latest.at,
      source: latest.file,
    },
  };
  return number;
}

/** The human view: one line per group, each naming the file it came from. */
export function describeFinalNumbers(n = finalNumbers()) {
  const lines = [];
  lines.push('The closing numbers — read back from docs/openclaw/data/');
  lines.push('');
  lines.push(`  census      ${n.census.score}% of ${n.census.inScope} in-scope checks · working ${n.census.working} · better ${n.census.better} · partial ${n.census.partial} · drift ${n.census.drift}   (${n.census.source})`);
  const suiteCounts =
    n.suite.pass === null
      ? `${n.suite.tests} tests over ${n.suite.testFiles} files (pass/fail/skip not in the record yet)`
      : `${n.suite.tests} tests · ${n.suite.pass} pass · ${n.suite.fail} fail · ${n.suite.skipped} skipped over ${n.suite.testFiles} files`;
  lines.push(`  suite       ${suiteCounts}   (${n.suite.source})`);
  lines.push(`  coverage    ${n.coverage.lines}% lines · ${n.coverage.branches}% branches · ${n.coverage.functions}% functions · floor ${n.coverage.floor}% · ${n.coverage.fingerprint}   (${n.coverage.source})`);
  lines.push(`  cli         ${n.cli.covered}/${n.cli.total} commands run by the suite · ${n.cli.untested} listed with a reason · ${n.cli.unknown} uncovered   (${n.cli.source})`);
  lines.push(`  clock       ${n.clock.files} files · ${n.clock.cases} cases · ${n.clock.seconds} s of ${n.clock.budgetSeconds} s${n.clock.over.length ? ' (OVER)' : ''} · slowest ${n.clock.slowest?.file ?? '?'}   (${n.clock.source})`);
  lines.push(`  perf        ${n.perf.metrics} metrics against ${n.perf.ceilings} ceilings · releases ${n.perf.releases.map((r) => 'v' + r).join(', ')} · over: ${n.perf.over.length ? n.perf.over.join(', ') : 'nothing'}   (${n.perf.source})`);
  lines.push('');
  lines.push('  worklog     node scripts/final-numbers.mjs --check — is the tracker still quoting these?');
  return lines.join('\n');
}

/**
 * The fragments the tracker's numbers line has to contain, each derived from an
 * artifact above. Exported so the suite can assert the read-back itself, not the
 * script's exit code.
 */
export function expectedTrackerFragments(n = finalNumbers()) {
  const b = bengali;
  const out = [
    { label: 'census score', fragment: `${b(n.census.score)}%` },
    { label: 'in-scope checks', fragment: `${b(n.census.inScope)} in-scope` },
    { label: 'working', fragment: `WORKING ${b(n.census.working)}` },
    { label: 'better', fragment: `BETTER ${b(n.census.better)}` },
    { label: 'partial', fragment: `PARTIAL ${b(n.census.partial)}` },
    { label: 'drift', fragment: `drift ${b(n.census.drift)}` },
    { label: 'suite tests', fragment: `${b(n.suite.tests)} টেস্ট` },
    { label: 'coverage lines', fragment: `${b(n.coverage.lines)}%` },
    { label: 'coverage floor', fragment: `floor ${b(n.coverage.floor)}` },
    { label: 'coverage fingerprint', fragment: n.coverage.fingerprint },
    { label: 'cli commands', fragment: `${b(n.cli.covered)}/${b(n.cli.total)}` },
    { label: 'clock files', fragment: `${b(n.clock.files)} ফাইল` },
    { label: 'clock seconds', fragment: `${b(n.clock.seconds)}s` },
    { label: 'clock budget', fragment: `বাজেট ${b(n.clock.budgetSeconds)}s` },
    { label: 'perf ceilings', fragment: `${b(n.perf.ceilings)}টা সিলিং` },
    { label: 'perf metrics', fragment: `${b(n.perf.metrics)}টা মেট্রিক` },
    { label: 'latest release', fragment: `v${n.perf.latestRelease}` },
  ];
  // Only demanded once the plain run's counts are actually in the record.
  if (n.suite.pass !== null) {
    out.splice(7, 0,
      { label: 'suite pass', fragment: `${b(n.suite.pass)} pass` },
      { label: 'suite fail', fragment: `${b(n.suite.fail)} fail` },
      { label: 'suite skipped', fragment: `${b(n.suite.skipped)} skip` },
    );
  }
  return out;
}

/** Does WORKLOG.md's numbers line still quote every artifact? */
export function checkTrackerNumbers(root = ROOT) {
  const n = finalNumbers(root);
  const line = readTrackerLine(root);
  const required = expectedTrackerFragments(n).map((r) => ({ ...r, found: line.includes(r.fragment) }));
  return { ok: line.length > 0 && required.every((r) => r.found), line, required, numbers: n };
}

function main() {
  const args = process.argv.slice(2);
  const root = process.env.TCRAB_FINAL_ROOT || ROOT;
  if (args.includes('--check')) {
    const check = checkTrackerNumbers(root);
    if (args.includes('--json')) {
      console.log(JSON.stringify({ ok: check.ok, missing: check.required.filter((r) => !r.found), line: check.line }, null, 2));
    } else {
      console.log(describeFinalNumbers(check.numbers));
      const missing = check.required.filter((r) => !r.found);
      if (check.ok) {
        console.log(`\n  ✓ WORKLOG.md quotes every one of them (${check.required.length} fragment(s) found).`);
      } else if (!check.line) {
        console.log('\n  ✗ WORKLOG.md has no numbers line — the tracker quotes nothing.');
      } else {
        console.log(`\n  ✗ WORKLOG.md is behind the artifacts — ${missing.length} fragment(s) missing:`);
        for (const m of missing) console.log(`      ${m.label}: expected "${m.fragment}"`);
        console.log('    update the numbers line in WORKLOG.md §1 to match, then run this again.');
      }
    }
    process.exit(check.ok ? 0 : 1);
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ok: true, numbers: finalNumbers(root) }, null, 2));
    return;
  }
  console.log(describeFinalNumbers(finalNumbers(root)));
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
