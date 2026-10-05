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
import { parseWorklog } from './worklog-parse.mjs';

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

function readWorklogText() {
  try {
    return fs.readFileSync(WORKLOG, 'utf8');
  } catch {
    return '';
  }
}

function readWorklog() {
  return parseWorklog(readWorklogText());
}

/**
 * 42.3 — the closing batch. When §3 carries no rows the queue is done, and the
 * only acceptable shape after that is the declaration itself: every row in the
 * current batch finished, one sentence in §3 saying the queue is empty. Anything
 * else is a tracker pretending to be busy.
 */
function queueState(text, log) {
  if (log.nextSteps.length) return { empty: false, declared: /queue is empty|queue empty/i.test(text), done: false };
  return {
    empty: true,
    declared: /queue is empty|queue empty/i.test(text),
    done: log.stepLines.length > 0 && log.stepLines.every((s) => s.state.startsWith('✔')),
  };
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
  // Scope matters here too (batch 25): the tracker must quote the same number
  // the census scores — in-scope checks only, with the excluded count beside it.
  const inScope = list.filter((r) => r.scope !== 'out');
  const count = (v) => inScope.filter((r) => r.verdict === v).length;
  return {
    checks: inScope.length,
    measured: list.length,
    outOfScope: list.length - inScope.length,
    working: count('WORKING'),
    better: count('BETTER'),
    partial: count('PARTIAL'),
    broken: count('BROKEN'),
    absent: count('ABSENT'),
    score: typeof raw.coverage === 'number' ? raw.coverage : null,
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
const worklogText = readWorklogText();
const log = parseWorklog(worklogText);
const queue = queueState(worklogText, log);
const age = trackerAge();
const fresh = age.behind === 0;
const census = censusSummary();
const tests = wantTests ? runTests() : null;

const report = { head, trackerUpdatedIn: age.last, commitsSinceTracker: age.behind, note: age.note, fresh, updated: log.updated, stepLines: log.stepLines, nextSteps: log.nextSteps, queueEmpty: queue.empty, queueDeclared: queue.declared, census, tests };
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
  if (queue.empty) {
    line(
      queue.declared
        ? '  Next        queue empty — every declared batch is done; only the owner\'s two actions remain (termcrab owner)'
        : '  Next        queue empty, but WORKLOG.md §3 does not say so — add the declaration',
    );
    line('');
  } else {
    line(`  Next (${log.nextSteps.filter((s) => s.state.startsWith('☐')).length} step(s) queued)`);
    for (const s of log.nextSteps.slice(0, 4)) line(`    ${icon(s.state)} ${s.id}  ${s.step}`);
    if (log.nextSteps.length > 4) line(`    … +${log.nextSteps.length - 4} more in WORKLOG.md §3`);
    line('');
  }
  if (census) {
    line('  Level (census, vs OpenClaw)');
    line(
      `    ${census.score ?? '?'}% of ${census.checks} in-scope checks · working ${census.working} · better ${census.better} · partial ${census.partial} · BROKEN ${census.broken} · absent ${census.absent}`,
    );
    if (census.outOfScope) line(`    ${census.outOfScope} deliberately out of scope (measured, not scored — reason per row)`);
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
  line(
    queue.empty
      ? `  ${log.stepLines.filter((s) => s.state.startsWith('✔')).length} step(s) done here · queue empty`
      : `  ${log.stepLines.filter((s) => s.state.startsWith('✔')).length} step(s) done here · ${log.nextSteps.filter((s) => s.state.startsWith('☐')).length} queued for next`,
  );
  line('');
}

process.exit(fresh && (!tests || tests.ok) ? 0 : 1);
