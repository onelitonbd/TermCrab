#!/usr/bin/env node
/**
 * Work tracker verifier — answers "what is being done right now, and is the
 * tracker itself telling the truth?"
 *
 *   node scripts/status.mjs           # fast (≈1s): freshness + batch state + census summary
 *   node scripts/status.mjs --tests   # + full test suite (≈18s)
 *   node scripts/status.mjs --json    # machine-readable (used by tests + the panel)
 *
 * Exit codes: 0 = tracker fresh and green, 1 = stale/green-fail (a broken tracker
 * is a bug: WORKLOG.md says so itself).
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WORKLOG = path.join(ROOT, 'WORKLOG.md');
const CENSUS_JSON = path.join(ROOT, 'docs', 'openclaw', 'data', 'census.json');

const args = process.argv.slice(2);
const wantTests = args.includes('--tests');
const asJson = args.includes('--json');

function gitHead() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function readWorklog() {
  const text = fs.readFileSync(WORKLOG, 'utf8');
  const updated = /\*\*Updated:\*\* ([^\n·]+)/.exec(text)?.[1]?.trim() ?? '';
  // Step tables live under "## 2. Now" and "## 3. Next" (any numbering), each
  // row: | id | step | ▶ doing / ☐ todo / ✔ done | evidence |
  const section = (n) => {
    const m = new RegExp(`^## ${n}\\. ([\\s\\S]*?)(?=^## |\\Z)`, 'm').exec(text);
    return m ? m[1] : '';
  };
  const rowsOf = (body) =>
    [...body.matchAll(/^\|\s*(\d+\.\d+)\s*\|\s*([^|]+?)\s*\|\s*(▶ doing|☐ todo|✔ done)[^|]*\|/gm)].map((m) => ({
      id: m[1],
      step: m[2].replace(/\*\*/g, ''),
      state: m[3],
    }));
  const now = rowsOf(section(2));
  const next = rowsOf(section(3));
  return { updated, stepLines: now, nextSteps: next };
}

/**
 * Freshness without bookkeeping: how many commits landed after the last commit
 * that touched WORKLOG.md? Zero is the only healthy number — it means the
 * tracker was updated as part of the newest work. Works with any clone.
 */
function trackerAge() {
  const git = (args) => execSync(`git ${args}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  try {
    const last = git('log -1 --format=%h -- WORKLOG.md');
    if (!last) return { last: '', behind: 0, note: 'WORKLOG.md is not committed yet' };
    const behind = Number(git(`rev-list --count ${last}..HEAD`));
    return { last, behind: Number.isFinite(behind) ? behind : 0, note: '' };
  } catch {
    return { last: '', behind: 0, note: 'no git history: freshness unknowable' };
  }
}

function censusSummary() {
  if (!fs.existsSync(CENSUS_JSON)) return null;
  const raw = JSON.parse(fs.readFileSync(CENSUS_JSON, 'utf8'));
  const rows = raw.rows || raw.checks || raw;
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  const count = (v) => list.filter((r) => r.verdict === v).length;
  return {
    checks: list.length,
    working: count('WORKING'),
    better: count('BETTER'),
    partial: count('PARTIAL'),
    broken: count('BROKEN'),
    absent: count('ABSENT'),
    score: typeof raw.score === 'number' ? raw.score : null,
  };
}

function runTests() {
  const t0 = Date.now();
  const r = spawnSync('npm', ['test'], { cwd: ROOT, encoding: 'utf8', timeout: 10 * 60_000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const num = (k) => Number(new RegExp(`^# ${k} (\\d+)$`, 'm').exec(out)?.[1] ?? -1);
  return {
    ok: r.status === 0,
    tests: num('tests'),
    pass: num('pass'),
    fail: num('fail'),
    skipped: num('skipped'),
    ms: Date.now() - t0,
  };
}

const head = gitHead();
const log = readWorklog();
const age = trackerAge();
const fresh = age.behind === 0;
const census = censusSummary();
const tests = wantTests ? runTests() : null;

const report = { head, trackerUpdatedIn: age.last, commitsSinceTracker: age.behind, note: age.note, fresh, updated: log.updated, stepLines: log.stepLines, nextSteps: log.nextSteps, census, tests };
if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const line = (s) => console.log(s);
  line('');
  line('  TermCrab work tracker');
  line('  ' + '─'.repeat(58));
  line(`  ${fresh ? '✅ FRESH' : '⚠️  STALE'}   HEAD ${head || '(no git)'} · tracker last touched in ${age.last || '(uncommitted)'}`);
  if (!fresh) {
    line(`            → ${age.behind} commit(s) landed after WORKLOG.md was updated`);
    line('            → update WORKLOG.md (batch moved to ✔ or a new batch started) in that commit');
  }
  if (age.note) line(`            note: ${age.note}`);
  line(`  Updated      ${log.updated}`);
  line('');
  const icon = (st) => (st.startsWith('✔') ? '✔' : st.startsWith('▶') ? '▶' : '☐');
  if (log.stepLines.length) {
    line('  Now');
    for (const s of log.stepLines) line(`    ${icon(s.state)} ${s.id}  ${s.step}`);
    line('');
  }
  if (log.nextSteps.length) {
    line(`  Next (${log.nextSteps.filter((s) => s.state.startsWith('☐')).length} step(s) queued)`);
    for (const s of log.nextSteps.slice(0, 4)) line(`    ${icon(s.state)} ${s.id}  ${s.step}`);
    if (log.nextSteps.length > 4) line(`    … +${log.nextSteps.length - 4} more in WORKLOG.md §3`);
    line('');
  }
  if (census) {
    line('  Level (census, vs OpenClaw)');
    line(`    checks ${census.checks} · working ${census.working} · better ${census.better} · partial ${census.partial} · BROKEN ${census.broken} · absent ${census.absent}`);
    line('');
  }
  if (tests) {
    line('  Tests');
    line(`    ${tests.ok ? '✅' : '❌'} ${tests.pass}/${tests.tests} pass, ${tests.fail} fail, ${tests.skipped} skipped — ${(tests.ms / 1000).toFixed(1)}s`);
    line('');
  } else {
    line('  Tests        not run (add --tests)');
    line('');
  }
  line(`  ${log.stepLines.filter((s) => s.state.startsWith('✔')).length} step(s) done here · ${log.nextSteps.filter((s) => s.state.startsWith('☐')).length} queued for next`);
  line('');
}

process.exit(fresh && (!tests || tests.ok) ? 0 : 1);
