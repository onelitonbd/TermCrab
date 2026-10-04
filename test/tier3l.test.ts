/**
 * tier3l — batch 41: the numbers get used, not just reported.
 *
 *   41.1 every ceiling has a fix line, declared once (`PERF_ADVICE`), shown by
 *        `termcrab perf` and the panel, and copied into docs/PERFORMANCE.md where
 *        the suite checks it against the code.
 *   41.2 `termcrab perf --compare [release]` puts this run next to a checked-in
 *        measurement: what moved, by how much, against which ceiling.
 *   41.3 the suite's own clock (`npm run test:time`'s record) reaches the panel,
 *        so "the tests got slow" is visible on a phone.
 *   41.4 a measurement taken while the machine was busy is flagged, and `--save`
 *        refuses to file it unless the person says `--trust`.
 *   41.5 the docs page's budget (`docsMs`/`docsKb`) is quoted next to the docs
 *        line that already shows the release.
 *
 * Cheap by construction: the measurements come from fabricated snapshots and a
 * one-line stand-in bench, so the 60 s clock is spent on the surfaces.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import {
  PERF_ADVICE,
  PERF_CEILINGS,
  comparePerfSnapshots,
  describeComparison,
  describeSuiteTime,
  describeSuspectLoad,
  perfAdvice,
  perfLoad,
  perfStatus,
  perfSuspect,
  suiteTimeStatus,
} from '../src/core/perf.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist/src/bin/termcrab.js');

function tmpHome(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

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

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

/** A one-line bench: the real one is measured in tier3j, this file tests plumbing. */
function fakeBench(metrics: Record<string, number>): string {
  const file = path.join(tmpHome('t41bench-'), 'fake-bench.mjs');
  fs.writeFileSync(file, `console.log(JSON.stringify(${JSON.stringify(metrics)}))\n`);
  return file;
}

type Snapshot = {
  at: string;
  source: string;
  bench: string;
  machine: { node: string; platform: string; arch: string; cpus: number; totalMemMb: number };
  metrics: Record<string, number>;
  ceilings: Record<string, { max: number; unit: 'ms' | 'MB' | 'KB' }>;
  over: string[];
  skipped: string[];
  load?: { load1: number; cpus: number; perCpu: number };
  suspect?: boolean;
};

function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    at: '2026-10-04T06:00:00.000Z',
    source: 'checkout',
    bench: 'scripts/bench.mjs',
    machine: { node: 'v22.0.0', platform: 'linux', arch: 'x64', cpus: 4, totalMemMb: 8192 },
    metrics: { coldStartMs: 120, turnMs: 90, docsMs: 45, docsKb: 2777 },
    ceilings: {
      coldStartMs: { max: 1500, unit: 'ms' },
      turnMs: { max: 5000, unit: 'ms' },
      docsMs: { max: 1500, unit: 'ms' },
      docsKb: { max: 4000, unit: 'KB' },
    },
    over: [],
    skipped: [],
    ...over,
  };
}

// ------------------------------------------------------------------- 41.1

test('41.1 every ceiling has a fix line, and the doc, the CLI and the panel say the same thing', async () => {
  const keys = Object.keys(PERF_CEILINGS);
  assert.equal(Object.keys(PERF_ADVICE).length, keys.length, 'one fix line per ceiling, no strays');
  for (const key of keys) {
    const advice = PERF_ADVICE[key];
    assert.ok(advice && advice.length >= 25, `${key} has a real sentence, not a placeholder`);
    assert.equal(perfAdvice(key), advice);
  }
  assert.match(perfAdvice('not-A-real-key'), /docs\/PERFORMANCE\.md/, 'an unknown metric still points somewhere useful');

  // The doc is the human copy, and the copy is checked (text, not just the key).
  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  const trips = doc.slice(doc.indexOf('## When a ceiling trips'), doc.indexOf('## What the numbers are not'));
  for (const key of keys) {
    const line = new RegExp(`\\*\\*\`${key}\`\\*\\* → ([^\\n]+)`).exec(trips);
    assert.ok(line, `${key} is named in the trip list`);
    const flat = (s: string): string => s.replace(/\\s+/g, ' ').replace(/\s+/g, ' ').trim();
    assert.equal(flat(line![1]!), flat(PERF_ADVICE[key]!), `${key}'s fix line in the doc is the declared one`);
  }

  // The panel reads the same object and shows the fix when something is over.
  const panel = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
  assert.match(panel, /p\.overAdvice/, 'the panel reads the advice for over metrics');
  assert.match(panel, /p\.worstAdvice/, 'and for the worst metric');
  assert.match(panel, /fix: /, 'and labels it a fix');

  // perfStatus carries both, from a snapshot on disk.
  const home = tmpHome('t411status-');
  const file = path.join(home, 'state', 'perf.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snapshot({ over: ['turnMs'], metrics: { coldStartMs: 100, turnMs: 999_999, docsKb: 3900 } })));
  const status = perfStatus(file);
  assert.equal(status.over.length, 1);
  assert.deepEqual(status.overAdvice, [{ key: 'turnMs', advice: PERF_ADVICE.turnMs }]);
  assert.equal(status.worst?.key, 'turnMs');
  assert.equal(status.worstAdvice, PERF_ADVICE.turnMs);

  // And the command prints it for the metric that is over, then exits 1.
  const run = await runNodeAsync([CLI, 'perf'], 120_000, {
    TCRAB_HOME: tmpHome('t411cli-'),
    TCRAB_PERF_BENCH: fakeBench({ coldStartMs: 100, turnMs: 999_999 }),
  });
  assert.equal(run.code, 1, 'over budget is still exit 1');
  assert.match(run.stdout, /⚠️ over budget: turnMs/, 'the metric is named');
  assert.match(run.stdout, /turnMs: the agent loop \(src\/agent\/loop\.ts\)/, 'and the fix line follows it');
});

// ------------------------------------------------------------------- 41.2

test('41.2 perf --compare puts this run next to a saved measurement', async () => {
  const then = snapshot({
    at: '2026-10-01T00:00:00.000Z',
    metrics: { coldStartMs: 100, turnMs: 90, docsMs: 40, searchMs: 7 },
    skipped: ['docsKb'],
  });
  const now = snapshot({ at: '2026-10-04T00:00:00.000Z', metrics: { coldStartMs: 130, turnMs: 90, docsMs: 44, panelMs: 4 } });

  const cmp = comparePerfSnapshots(now as never, then as never, { then: '/tmp/perf-0.73.0.json', now: '/tmp/state/perf.json' });
  const byKey = new Map(cmp.rows.map((r) => [r.key, r]));
  assert.equal(byKey.get('coldStartMs')!.deltaPct, 30);
  assert.equal(byKey.get('coldStartMs')!.direction, 'up');
  assert.equal(byKey.get('coldStartMs')!.max, 1500, 'each row carries its ceiling');
  assert.equal(byKey.get('turnMs')!.direction, 'flat', 'under 3% reads as steady, not as noise');
  assert.equal(byKey.get('docsMs')!.direction, 'up');
  assert.equal(byKey.has('docsKb'), false, 'a metric the saved run skipped is compared only if both measured it');
  assert.equal(byKey.has('panelMs'), false, 'and a metric the old run never knew is not invented here');
  assert.equal(cmp.biggest!.key, 'coldStartMs', 'the largest movement is named');
  assert.deepEqual(cmp.missing, ['searchMs'], 'and a metric only the saved run measured is listed as not compared');
  const lines = describeComparison(cmp).join('\n');
  assert.match(lines, /compare: /);
  assert.match(lines, /coldStartMs\s+100 ms → 130 ms \(ms\)\s+↑ 30%/);
  assert.match(lines, /largest: coldStartMs ↑ 30%/);
  assert.match(lines, /not measured by this run \(so not compared\): searchMs/);

  const empty = comparePerfSnapshots(now as never, null, { then: '/tmp/none.json', now: '/tmp/state/perf.json' });
  assert.equal(empty.rows.length, 0);
  assert.match(describeComparison(empty).join('\n'), /no saved measurement yet — file one with `termcrab perf --save`/);

  // The command: a saved 0.73.0 file in a temp dir, this run from the stand-in bench.
  const home = tmpHome('t412cli-');
  const saves = tmpHome('t412saves-');
  fs.writeFileSync(
    path.join(saves, 'perf-0.73.0.json'),
    JSON.stringify(snapshot({ at: '2026-10-01T00:00:00.000Z', metrics: { coldStartMs: 100, turnMs: 80 } })),
  );
  const env = {
    TCRAB_HOME: home,
    TCRAB_PERF_SAVE_DIR: saves,
    TCRAB_PERF_BENCH: fakeBench({ coldStartMs: 130, turnMs: 100 }),
  };
  const human = await runNodeAsync([CLI, 'perf', '--compare', '0.73.0'], 120_000, env);
  assert.equal(human.code, 0, `compare: ${human.stderr}`);
  assert.match(human.stdout, /compare: 0\.73\.0 \(2026-10-01\) → \d+\.\d+\.\d+/, 'it names both sides');
  assert.match(human.stdout, /coldStartMs\s+100 ms → 130 ms \(ms\)\s+↑ 30%/);
  assert.match(human.stdout, /largest: /);

  const json = await runNodeAsync([CLI, 'perf', '--compare', '0.73.0', '--json'], 120_000, env);
  const envelope = JSON.parse(json.stdout) as { data: { compare: { rows: { key: string; deltaPct: number }[]; then: { release: string | null } } } };
  assert.equal(envelope.data.compare.then.release, '0.73.0', 'the checked-in file announces its release');
  assert.ok(envelope.data.compare.rows.length >= 2);

  const none = await runNodeAsync([CLI, 'perf', '--compare'], 120_000, { ...env, TCRAB_PERF_SAVE_DIR: tmpHome('t412empty-') });
  assert.equal(none.code, 0);
  assert.match(none.stdout, /no saved measurement yet/, 'a missing comparison is a sentence, not a crash');

  const help = fs.readFileSync(path.join(ROOT, 'src/command-help.ts'), 'utf8');
  assert.match(help, /'--compare \[release\] {2}compare this run against a saved measurement/, 'the flag is in the help');
  const docs = fs.readFileSync(path.join(ROOT, 'docs/CLI.md'), 'utf8');
  assert.match(docs, /--compare/, 'and in the CLI reference');
});

// ------------------------------------------------------------------- 41.3

test('41.3 the suite clock reaches the panel, from the record and never from a run', async () => {
  const dir = tmpHome('t413record-');
  const file = path.join(dir, 'suite-time.json');
  const record = {
    at: '2026-10-04T08:58:39.426Z',
    node: 'v22.22.3',
    wallMs: 165_521,
    totalFiles: 99,
    totalTests: 1024,
    slowest: [
      { file: 'tier3j.test.js', ms: 40_417 },
      { file: 'tier3i.test.js', ms: 33_046 },
    ],
    budget: { wallMs: 240_000, fileMs: 90_000 },
    over: [],
  };
  fs.writeFileSync(file, JSON.stringify(record));
  const status = suiteTimeStatus(file);
  assert.equal(status.exists, true);
  assert.equal(status.files, 99);
  assert.equal(status.cases, 1024);
  assert.equal(status.wallMs, 165_521);
  assert.equal(status.over, false);
  assert.equal(status.slowest[0]!.file, 'tier3j.test.js');
  const line = describeSuiteTime(status);
  assert.match(line, /99 files · 1024 cases · 165\.5 s of 240\.0 s/);
  assert.match(line, /slowest tier3j 40\.4 s/, 'the .test.js suffix is dropped for a phone-sized line');
  assert.match(line, /recorded \d+ min ago|\d+ h ago|just now/);

  fs.writeFileSync(file, JSON.stringify({ ...record, over: ['wallMs'] }));
  assert.equal(suiteTimeStatus(file).over, true, 'a record that was over its budget says so');
  assert.match(describeSuiteTime(suiteTimeStatus(file)), /OVER/);

  assert.equal(suiteTimeStatus(path.join(dir, 'nope.json')).exists, false);
  assert.match(describeSuiteTime(suiteTimeStatus(path.join(dir, 'nope.json'))), /has not recorded a run/);

  // The repository's own record is real and inside its budget.
  const real = suiteTimeStatus(path.join(ROOT, 'docs/openclaw/data/suite-time.json'));
  assert.equal(real.exists, true, 'npm run test:time has recorded a run');
  assert.ok(real.files >= 90 && real.cases > 900, 'with the suite in it');
  assert.ok(real.wallMs > 0 && real.wallMs <= real.budgetWallMs, `wall ${real.wallMs} is inside ${real.budgetWallMs}`);

  // A real gateway serves it, and the panel has a line for it.
  const home = tmpHome('t413gw-');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const { defaults } = await import('../src/core/config.js');
    const { startGateway } = await import('../src/gateway/server.js');
    const port = await freePort();
    const cfg = defaults();
    cfg.gateway = { host: '127.0.0.1', port, token: '' };
    const handle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/suite-time`);
      assert.equal(res.status, 200, 'the route needs no token, like the other read-only ones');
      const body = (await res.json()) as { files: number; cases: number; slowest: { file: string }[] };
      assert.equal(body.files, real.files);
      assert.equal(body.cases, real.cases);
      assert.ok(body.slowest.length >= 1);
    } finally {
      await handle.stop();
    }
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }

  const panel = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
  assert.match(panel, /id="suiteNote"/, 'the Work page has a suite line');
  assert.match(panel, /api\/suite-time/, 'fed by the route');
  assert.match(panel, /files · ' \+ s\.cases \+ ' cases/, 'and it says files and cases');
});

// ------------------------------------------------------------------- 41.4

test('41.4 a measurement taken on a busy machine is flagged, and --save refuses it', async () => {
  const keys = ['load1', 'cpus', 'perCpu'];
  assert.deepEqual(Object.keys(perfLoad()), keys, 'the load reading has one shape');
  process.env.TCRAB_PERF_LOAD = '12';
  try {
    const load = perfLoad();
    assert.equal(load.load1, 12);
    assert.ok(load.cpus >= 1);
    assert.equal(load.perCpu, Math.round((12 / load.cpus) * 100) / 100);
    assert.equal(perfSuspect(load), true, 'twelve on any machine this runs on is busy');
    assert.equal(perfSuspect({ load1: 0, cpus: 8, perCpu: 0 }), false, 'an idle machine is not suspect');
    assert.equal(perfSuspect({ load1: 8, cpus: 8, perCpu: 1 }), false, 'exactly one per cpu is the line, and the line is not crossed');
    assert.equal(perfSuspect({ load1: 8.1, cpus: 8, perCpu: 1.01 }), true);
    assert.match(describeSuspectLoad(load), /^load 12\.00 over \d+ cpu \(\d+\.\d\d per cpu\)$/);
  } finally {
    delete process.env.TCRAB_PERF_LOAD;
  }

  const home = tmpHome('t414cli-');
  const saves = tmpHome('t414saves-');
  const env = {
    TCRAB_HOME: home,
    TCRAB_PERF_SAVE_DIR: saves,
    TCRAB_PERF_BENCH: fakeBench({ coldStartMs: 120, turnMs: 90 }),
    TCRAB_PERF_LOAD: '999',
  };
  const refused = await runNodeAsync([CLI, 'perf', '--save'], 120_000, env);
  assert.equal(refused.code, 1, 'refusing to file a bad measurement is a failure');
  assert.match(refused.stderr, /refused to save — load 999\.00 over \d+ cpu/);
  assert.match(refused.stderr, /--trust/, 'and it says how to override');
  assert.deepEqual(fs.readdirSync(saves), [], 'nothing was written');

  const trusted = await runNodeAsync([CLI, 'perf', '--save', '--trust'], 120_000, env);
  assert.equal(trusted.code, 0, `--trust files it anyway: ${trusted.stderr}`);
  const written = fs.readdirSync(saves)[0]!;
  const saved = JSON.parse(fs.readFileSync(path.join(saves, written), 'utf8')) as Snapshot;
  assert.equal(saved.suspect, true, 'the file itself carries the warning');
  assert.equal(saved.load!.perCpu, Math.round((999 / saved.load!.cpus) * 100) / 100);

  const human = await runNodeAsync([CLI, 'perf'], 120_000, env);
  assert.match(human.stdout, /⚠️ measured on a busy machine: load 999\.00/, 'a plain run says so too');

  const json = await runNodeAsync([CLI, 'perf', '--json'], 120_000, env);
  const envelope = JSON.parse(json.stdout) as { data: { suspect: boolean; load: { perCpu: number } } };
  assert.equal(envelope.data.suspect, true);
  assert.ok(envelope.data.load.perCpu > 1);

  // perfStatus and the doctor both carry the caveat.
  const file = path.join(home, 'state', 'perf.json');
  const status = perfStatus(file);
  assert.equal(status.suspect, true);
  assert.equal(status.load?.perCpu, envelope.data.load.perCpu);

  const cfg = await runNodeAsync([CLI, 'config', 'set', 'provider.model', 'mock-1'], 60_000, { TCRAB_HOME: home });
  assert.equal(cfg.code, 0, cfg.stderr);
  const doctor = await runNodeAsync([CLI, 'doctor'], 120_000, { TCRAB_HOME: home });
  assert.match(doctor.stdout, /performance budget - .*measured while busy: load 999\.00/, 'the doctor repeats it');
  assert.match(doctor.stdout, /fix: that measurement was taken on a busy machine — re-run: termcrab perf/);
});

// ------------------------------------------------------------------- 41.5

test('41.5 the docs budget is quoted where the docs release already is', async () => {
  const home = tmpHome('t415-');
  const file = path.join(home, 'state', 'perf.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(snapshot({ metrics: { docsMs: 43, docsKb: 2777 }, ceilings: { docsMs: { max: 1500, unit: 'ms' }, docsKb: { max: 4000, unit: 'KB' } } })));
  const status = perfStatus(file);
  assert.equal(status.metrics.docsMs, 43, 'the payload carries the measured value');
  assert.equal(status.budget.docsMs!.max, 1500, 'and the ceiling it was judged against');
  assert.equal(status.budget.docsKb!.unit, 'KB');

  const panel = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
  assert.match(panel, /function loadDocsBudget\(\)/, 'the panel has one place that reads the docs numbers');
  assert.match(panel, /p\.metrics\.docsMs/, 'docsMs');
  assert.match(panel, /p\.metrics\.docsKb/, 'docsKb');
  assert.match(panel, /await loadDocsBudget\(\)/, 'the docs line awaits it, so the note is complete when it paints');
  assert.match(panel, /'build ' \+ Math\.round\(ms\) \+ ' ms'/, 'and it prints the build time against its ceiling');
  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  assert.match(doc, /docsMs/, 'the doc still explains the ceiling these numbers are compared to');
});

// ------------------------------------------------------------------- 41.6 (found here)

test('41.6 the coverage table parser keeps src/ and dist/ apart, and ignores temp trees', async () => {
  // Batch 41 found this while the recorded number halved: the reporter prints an
  // indented tree, and a parser that keeps only the nearest directory averages
  // the compiled copy (and a second copy under a temp directory) into "source
  // coverage". The parser is importable exactly so this cannot happen again.
  const { parseCoverageTable, sourceRows } = (await import(
    pathToFileURL(path.join(ROOT, 'scripts', 'coverage.mjs')).href
  )) as {
    parseCoverageTable: (text: string) => { rows: { path: string; lines: number }[]; counts: Record<string, number> };
    sourceRows: (rows: { path: string; lines: number }[]) => { path: string; sourcePath: string; lines: number }[];
  };
  const table = [
    '# file                             | line % | branch % | funcs % | uncovered lines',
    '# dist                             |        |          |         |',
    '#  src                             |        |          |         |',
    '#   agent                          |        |          |         |',
    '#    loop.js                       |  70.00 |   60.00 |   50.00 | 1-3',
    '#  test                            |        |          |         |',
    '#   thing.test.js                  | 100.00 |   100.00 |  100.00 |',
    '# ..                               |        |          |         |',
    '#  tmp                             |        |          |         |',
    '#   t41bench-x                     |        |          |         |',
    '#    fake-bench.mjs                | 100.00 |   100.00 |  100.00 |',
    '# scripts                          |        |          |         |',
    '#  bench.mjs                       |  10.00 |   100.00 |    0.00 | 1-9',
    '# all files                        |  72.00 |   61.00 |   51.00 |',
    '# tests 1029',
    '# pass 1024',
    '# fail 0',
  ].join('\n');
  const { rows, counts } = parseCoverageTable(table);
  assert.equal(counts.tests, 1029, 'counts come from the # lines');
  const src = sourceRows(rows);
  assert.equal(src.length, 1, 'only the project source counts');
  assert.equal(src[0]!.sourcePath, 'agent/loop.ts', 'and it is named the way a person would name it');
  assert.equal(src[0]!.lines, 70);
  assert.equal(
    rows.filter((r) => r.path.startsWith('..')).length,
    1,
    'the temp tree is parsed, and then ignored',
  );

  // When a run loaded both copies, the real source row wins.
  const both = parseCoverageTable(
    ['# dist                            |        |          |         |',
     '#  src                             |        |          |         |',
     '#   mobile                          |        |          |         |',
     '#    doctor.js                     |  80.00 |   70.00 |   60.00 | 1-3',
     '# src                              |        |          |         |',
     '#  mobile                          |        |          |         |',
     '#   doctor.js                      |  81.00 |   70.00 |   60.00 | 1-3'].join('\n'),
  );
  const picked = sourceRows(both.rows);
  assert.equal(picked.length, 1, 'one row per source file, not two');
  assert.equal(picked[0]!.lines, 81, 'and it is the real src/ row');

  // And the record on disk is the proof on a normal run — every row is a src/ path.
  // Inside the recording run the snapshot on disk is the *previous* one, so this
  // stands down there (tier3d's 34.6 owns the "the recording is green" check).
  if (process.env.TCRAB_COVERAGE_RECORDING === '1') return;
  const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/openclaw/data/coverage.json'), 'utf8')) as {
    worst: { dir: string; file: string }[];
    best: string[];
  };
  for (const row of record.worst) {
    assert.match(`${row.dir}/${row.file}`, /\.ts$/, 'the lowest-coverage list names real source files, not compiled copies');
  }
  for (const file of record.best) assert.match(file, /\.ts$/, 'and so does the best list');
});
