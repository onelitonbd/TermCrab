/**
 * tier3m — batch 42, the closing batch.
 *
 *   42.1 the closing numbers are read back from `docs/openclaw/data/*.json`, and
 *        the tracker's numbers line is checked against them instead of being
 *        trusted (the read-back lives in `scripts/final-numbers.mjs`).
 *   42.2 the owner's two remaining actions are declared once in `src/core/owner.ts`
 *        and the help text and `docs/OWNER.md` still carry the same commands.
 *   42.3 the tracker can end: §3 empty, one declaration, nothing left at ☐ todo —
 *        and `scripts/status.mjs` prints `queue empty` instead of a count of zero.
 *   42.5 `termcrab owner` prints exactly the declared handover, on the phone,
 *        with a `--json` view for anything that wants to poll it.
 *
 * Cheap by construction: two CLI invocations, no suite, no network.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { COMMANDS } from '../src/command-help.js';
import { OWNER_ACTIONS, describeOwnerActions, ownerReport } from '../src/core/owner.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist/src/bin/termcrab.js');
const DATA = path.join(ROOT, 'docs', 'openclaw', 'data');

function runNodeAsync(
  args: string[],
  timeout: number,
  env: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
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

/** Import a repository script (never compiled into dist/) by absolute path. */
async function script<T>(name: string): Promise<T> {
  return (await import(pathToFileURL(path.join(ROOT, 'scripts', name)).href)) as T;
}

const readData = (file: string) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));

type FinalNumbers = {
  census: { score: number; inScope: number; working: number; better: number; partial: number; drift: number };
  suite: { tests: number; pass: number; fail: number; skipped: number; testFiles: number };
  coverage: { lines: number; branches: number; functions: number; floor: number; fingerprint: string };
  cli: { covered: number; total: number; untested: number };
  clock: { wallMs: number; seconds: number; files: number; cases: number; budgetSeconds: number };
  perf: { metrics: number; ceilings: number; latestRelease: string; releases: string[] };
};

test('42.1 the closing numbers are read back from the artifacts, and the tracker quotes them', async () => {
  const { finalNumbers, expectedTrackerFragments, checkTrackerNumbers, bengali } = await script<{
    finalNumbers: (root?: string) => FinalNumbers;
    expectedTrackerFragments: (n: FinalNumbers) => { label: string; fragment: string }[];
    checkTrackerNumbers: (root?: string) => {
      ok: boolean;
      line: string;
      required: { label: string; fragment: string; found: boolean }[];
      numbers: FinalNumbers;
    };
    bengali: (v: unknown) => string;
  }>('final-numbers.mjs');

  const n = finalNumbers(ROOT);
  // The numbers the script reports really are the files' values — compare with
  // the artifacts directly, so a mismatch cannot hide behind the same helper.
  const census = readData('census.json');
  const coverage = readData('coverage.json');
  const cli = readData('cli-coverage.json');
  const clock = readData('suite-time.json');
  assert.equal(n.census.score, census.coverage);
  assert.equal(n.census.inScope, census.inScope);
  assert.equal(n.census.working, census.tally.WORKING);
  assert.equal(n.census.better, census.tally.BETTER);
  assert.equal(n.census.partial, census.tally.PARTIAL);
  assert.equal(n.census.drift, Array.isArray(census.drift) ? census.drift.length : census.drift);
  assert.equal(n.coverage.lines, coverage.source.lines);
  assert.equal(n.coverage.floor, coverage.floor);
  assert.equal(n.coverage.fingerprint, coverage.fingerprint);
  assert.equal(n.cli.total, cli.commands.length);
  assert.equal(n.cli.covered, cli.covered.length);
  assert.equal(n.clock.files, clock.totalFiles);
  assert.equal(n.clock.cases, clock.totalTests);
  assert.equal(n.clock.wallMs, clock.wallMs);
  assert.ok(n.perf.metrics > 0 && n.perf.ceilings > 0, 'the perf budget is one of the numbers');
  assert.ok(n.perf.releases.length >= 3, 'every released measurement in the data directory counts');

  // Bengali digits are how the tracker is written; the read-back has to speak it.
  assert.equal(bengali('1030 ৮৭.২৪'), '১০৩০ ৮৭.২৪');

  // The tracker's own numbers line must contain every fragment.
  const check = checkTrackerNumbers(ROOT);
  assert.ok(check.line.length > 40, 'WORKLOG.md has a numbers line');
  const missing = check.required.filter((r) => !r.found);
  assert.deepEqual(missing.map((m) => `${m.label} "${m.fragment}"`), [], 'the tracker quotes the artifacts');
  assert.equal(check.ok, true);
  assert.ok(check.required.length >= 15, 'a real set of numbers, not a token one');

  // And it fails when the tracker stops quoting them: a synthetic root whose
  // WORKLOG has no numbers line must not pass.
  const fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 't42num-'));
  fs.mkdirSync(path.join(fakeRoot, 'docs', 'openclaw', 'data'), { recursive: true });
  for (const f of fs.readdirSync(DATA)) fs.copyFileSync(path.join(DATA, f), path.join(fakeRoot, 'docs', 'openclaw', 'data', f));
  fs.writeFileSync(path.join(fakeRoot, 'WORKLOG.md'), '# Worklog\n\n- **সংখ্যা:** সব ঠিক আছে\n');
  const bad = checkTrackerNumbers(fakeRoot);
  assert.equal(bad.ok, false, 'a tracker that quotes nothing is not verified');
  assert.ok(bad.required.some((r) => !r.found));
  assert.deepEqual(expectedTrackerFragments(n).filter((r) => !r.fragment), [], 'every fragment is a real string');
});

test('42.2 the owner handover is declared once: help, JSON and docs/OWNER.md agree', async () => {
  assert.equal(OWNER_ACTIONS.length, 2, 'the closing handover is exactly two actions');
  assert.deepEqual(OWNER_ACTIONS.map((a) => a.id), ['ci', 'telegram']);
  for (const a of OWNER_ACTIONS) {
    assert.ok(a.title.length > 10 && a.closes.length > 10, `${a.id} says what it is and what it closes`);
    assert.ok(a.commands.length >= 1 && a.commands.every((c) => c.trim().length > 0), `${a.id} carries its commands`);
    assert.ok(a.expect.length > 10 && a.evidence.length > 10, `${a.id} says what to expect and what it leaves`);
  }

  // The help entry exists and is the only place the command is named.
  const doc = COMMANDS.find((c) => c.cmd === 'owner');
  assert.ok(doc, 'termcrab owner is in the command table');
  assert.equal(doc.usage, 'owner');
  assert.match(doc.summary, /action/i);
  assert.match(doc.json ?? '', /actions/, 'the machine view is documented');
  assert.match(doc.example ?? '', /termcrab owner/);

  // docs/OWNER.md is the human page: every declared command has to be on it, under
  // the heading that action owns — a handover that exists twice and disagrees is
  // worse than none.
  const ownerdoc = fs.readFileSync(path.join(ROOT, 'docs', 'OWNER.md'), 'utf8');
  assert.match(ownerdoc, /Start the CI workflow/, 'the CI heading');
  assert.match(ownerdoc, /Let the bot answer a real Telegram message/, 'the Telegram heading');
  const anchors: Record<string, RegExp> = {
    ci: /closes the last open census row/,
    telegram: /closes 37\.4/,
  };
  for (const a of OWNER_ACTIONS) {
    for (const c of a.commands) {
      assert.ok(ownerdoc.includes(c), `docs/OWNER.md is missing the declared command: ${c}`);
    }
    assert.match(ownerdoc, anchors[a.id]!, `${a.id}: the page says what it closes`);
  }
  assert.match(ownerdoc, /declared queue is empty/i, 'the page states the end state');

  // ownerReport() is the JSON shape the CLI prints, and it is a copy.
  const report = ownerReport();
  assert.equal(report.count, OWNER_ACTIONS.length);
  assert.equal(report.doc, 'docs/OWNER.md');
  assert.notEqual(report.actions[0], OWNER_ACTIONS[0], 'a caller cannot mutate the declared handover');
  assert.notEqual(report.actions[0]!.commands, OWNER_ACTIONS[0]!.commands);

  // Nothing else in the help table claims to be the owner's list.
  const others = COMMANDS.filter((c) => c.cmd !== 'owner' && /\bowner'?s? actions?\b/i.test(c.summary + c.flags.join(' ')));
  assert.deepEqual(others.map((c) => c.cmd), [], 'one declared handover, one command');
});

test('42.3 the tracker can end: queue empty, declared, and nothing stranded', async () => {
  const text = fs.readFileSync(path.join(ROOT, 'WORKLOG.md'), 'utf8');
  const { parseWorklog } = await script<{ parseWorklog: (s: string) => { stepLines: { id: string; state: string }[]; nextSteps: { id: string; state: string }[] } }>(
    'worklog-parse.mjs',
  );
  const parsed = parseWorklog(text);
  assert.equal(parsed.nextSteps.length, 0, '§3 carries no unqueued batch');
  assert.match(text, /\*\*Queue empty\.\*\*/, 'the declaration is a sentence somebody reads');
  const stranded = parsed.stepLines.filter((r) => r.state.startsWith('☐'));
  assert.deepEqual(stranded.map((r) => r.id), [], 'no row sits at ☐ todo with an empty queue');

  const json = await runNodeAsync(['scripts/status.mjs', '--json'], 60_000);
  assert.equal(json.code, 0, json.stderr);
  const report = JSON.parse(json.stdout) as { queueEmpty: boolean; queueDeclared: boolean; nextSteps: unknown[] };
  assert.equal(report.queueEmpty, true);
  assert.equal(report.queueDeclared, true);
  assert.deepEqual(report.nextSteps, []);

  const human = await runNodeAsync(['scripts/status.mjs'], 60_000);
  assert.equal(human.code, 0, human.stderr);
  assert.match(human.stdout, /queue empty/, 'the tracker prints the words, not "0 queued"');
  assert.doesNotMatch(human.stdout, /0 step\(s\) queued/);
});

test('42.5 termcrab owner prints the declared handover, for the phone', async () => {
  const human = await runNodeAsync([CLI, 'owner'], 60_000);
  assert.equal(human.code, 0, human.stderr);
  assert.equal(human.stdout, describeOwnerActions() + '\n', 'the command prints the declared text');
  for (const a of OWNER_ACTIONS) {
    assert.ok(human.stdout.includes(a.title), `${a.id}: the title reaches the phone`);
    for (const c of a.commands) assert.ok(human.stdout.includes(c), `${a.id}: the command reaches the phone`);
    assert.ok(human.stdout.includes(a.evidence), `${a.id}: where the proof lands`);
  }
  assert.match(human.stdout, /docs\/OWNER\.md/, 'and where the long version is');

  const machine = await runNodeAsync([CLI, 'owner', '--json'], 60_000);
  assert.equal(machine.code, 0, machine.stderr);
  const envelope = JSON.parse(machine.stdout) as {
    ok: boolean;
    command: string;
    data: { count: number; doc: string; actions: { id: string; commands: string[] }[] };
  };
  assert.equal(envelope.ok, true);
  assert.equal(envelope.command, 'owner');
  assert.equal(envelope.data.count, 2);
  assert.equal(envelope.data.doc, 'docs/OWNER.md');
  assert.deepEqual(envelope.data.actions.map((a) => a.id), ['ci', 'telegram']);
  // stdout stays parseable: the human text is not smuggled into the JSON run.
  assert.doesNotMatch(machine.stdout, /Still yours/);

  const help = await runNodeAsync([CLI, 'help', 'owner'], 60_000);
  assert.equal(help.code, 0, help.stderr);
  assert.match(help.stdout, /termcrab owner/);
});
