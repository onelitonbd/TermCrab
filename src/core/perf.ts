/**
 * The performance budget as a command: measure this machine, compare every
 * number to its ceiling, and write the snapshot the panel reads (38.1).
 *
 * `termcrab perf` runs `scripts/bench.mjs` — the same measurements the suite's
 * gate runs, never a second implementation — and keeps the result in
 * `state/perf.json` with the machine it came from, so "is this still as fast as
 * it was?" is answerable on a phone with one command.
 */
/*
 * The ceilings live here, in PERF_CEILINGS, and scripts/bench.mjs imports them
 * from the built copy of this file: one declaration, two callers, so the alarm
 * in the suite and the alarm on the phone can never disagree.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { PACKAGE_ROOT, stateDir } from './paths.js';
import { humanAgeMs } from './format.js';

export interface PerfCeiling {
  max: number;
  why: string;
  unit: 'ms' | 'MB' | 'KB';
}

/**
 * The ceilings (37.1, extended through 40.5). Measured on the development box
 * while each batch was written; every one is a loose multiple so the alarm
 * fires on a regression rather than on jitter. docs/PERFORMANCE.md explains
 * them, and `termcrab perf --save` files a release's numbers under
 * docs/openclaw/data/ so an old claim can be checked.
 */
export const PERF_CEILINGS: Record<string, PerfCeiling> = {
  installMs: { max: 20_000, unit: 'ms', why: 'zero runtime deps: npm has nothing to fetch' },
  coldStartMs: { max: 1_500, unit: 'ms', why: 'every CLI call pays it' },
  idleRssMb: { max: 130, unit: 'MB', why: 'a 2 GB phone kills hogs' },
  restartMs: { max: 2_500, unit: 'ms', why: 'a restart has to be invisible' },
  turnMs: { max: 5_000, unit: 'ms', why: 'the whole message-to-answer loop, offline' },
  panelKb: {
    max: 700,
    unit: 'KB',
    why: 'the panel is one HTML file with no build step — inline CSS/JS, no bundler, no CDN. 317 KB today; the ceiling is what stops "let us add a framework" from being a quiet decision',
  },
  panelMs: {
    max: 250,
    unit: 'ms',
    why: 'the gateway serving that file: a phone opening the panel must get the shell immediately, before any /api call',
  },
  coldInstallMs: {
    max: 60_000,
    unit: 'ms',
    why: 'npm install on a checkout with an empty cache: three dev packages, no runtime dependencies — the whole point of having none is that this stays short even on mobile data',
  },
  coldCheckoutMs: {
    max: 90_000,
    unit: 'ms',
    why: 'the complete first contact: .git clone to a tree, npm install, ./termcrab answers. Measured with an isolated npm cache, so it cannot freeload on this machine',
  },
  roomWriteMs: {
    max: 1_500,
    unit: 'ms',
    why: '200 group messages recorded into one room at its cap (every append re-reads and trims a 64 KB file) — a chatty group must not make the phone hot',
  },
  outboxDrainMs: {
    max: 1_500,
    unit: 'ms',
    why: 'queueing, claiming and acknowledging 200 owed messages — a phone that was offline has to flush a queue without a stall',
  },
  telegramPollMs: {
    max: 2_000,
    unit: 'ms',
    why: '50 poll cycles of 50 updates each through the real client against a local stub, offsets and all — the plumbing between Telegram and our handlers',
  },
  docsMs: {
    max: 1_500,
    unit: 'ms',
    why: 'building the offline docs page (60 docs, ~2.7 MB of markdown into one HTML file) — the panel serves it, and a rebuild must stay a blink',
  },
  docsKb: {
    max: 4_000,
    unit: 'KB',
    why: 'the built page on a phone: every doc in one file, and 4 MB is the line past which a phone tab gets unhappy',
  },
  searchMs: {
    max: 200,
    unit: 'ms',
    why: 'one memory search over 10 000 vectors (a year on a phone): filter + cosine + sort must stay a scan, not a stop',
  },
  queueDrainMs: {
    max: 500,
    unit: 'ms',
    why: '24 turns through one lane with a 2 ms runner: the queue\'s own overhead per turn (53 ms here, 48 of it the runner sleeping) — a busy session must drain, not crawl',
  },
  queueWakeMs: {
    max: 120,
    unit: 'ms',
    why: 'the worst gap between one queued turn finishing and the next starting (1 ms here): the wake-up latency a person feels while the session is busy',
  },
  subagentFanoutMs: {
    max: 600,
    unit: 'ms',
    why: 'four subagents spawned together, each sleeping 40 ms, must finish in about the time of one: it proves the four slots are parallel, not a polite queue',
  },
  firstRunMs: { max: 30_000, unit: 'ms', why: 'the one wait a new user pays' },
  rebuildMs: { max: 8_000, unit: 'ms', why: 'pull, then run, must not be a rebuild' },
};

/** What the fast half measures; the rest needs npm and a 5 s compile. */
export const FAST_METRICS = ['coldStartMs', 'idleRssMb', 'restartMs', 'turnMs', 'searchMs', 'docsMs', 'docsKb', 'panelKb', 'panelMs', 'queueDrainMs', 'queueWakeMs', 'subagentFanoutMs', 'roomWriteMs', 'outboxDrainMs', 'telegramPollMs'];

export interface PerfSnapshot {
  /** When the measurement finished, ISO-8601 UTC. */
  at: string;
  /** The release this was filed for — present in `docs/openclaw/data/perf-<release>.json`. */
  release?: string;
  /** Where the numbers came from, so nobody mistakes a checkout for a phone. */
  source: 'checkout';
  bench: string;
  machine: { node: string; platform: string; arch: string; cpus: number; totalMemMb: number };
  /** measured values, keyed like the ceilings */
  metrics: Record<string, number>;
  /** the ceilings that applied, so an old snapshot explains itself */
  ceilings: Record<string, { max: number; unit: 'ms' | 'MB' | 'KB' }>;
  /** names of the metrics over their ceiling (empty = inside the budget) */
  over: string[];
  /** which of them the fast run did not measure */
  skipped: string[];
  /** 41.4 — what the machine was carrying while this was measured (absent in old files) */
  load?: { load1: number; cpus: number; perCpu: number };
  /** 41.4 — true when another heavy process was running: the numbers are not a fair measure */
  suspect?: boolean;
}

export function perfPath(): string {
  return path.join(stateDir(), 'perf.json');
}

/** The bench script that owns the measurements; env override is for tests. */
export function benchScriptPath(): string {
  return process.env.TCRAB_PERF_BENCH || path.join(PACKAGE_ROOT, 'scripts', 'bench.mjs');
}

export interface PerfRunOptions {
  /** 3 samples per timing instead of 1. */
  full?: boolean;
  /** Ask for everything, including install and the first-run compile. */
  everything?: boolean;
}

/**
 * Run the measurements and return the snapshot — plus, in `bench`, the raw
 * object the script printed so callers can show the numbers it measured.
 */
export function measurePerf(opts: PerfRunOptions = {}): { snapshot: PerfSnapshot; bench: Record<string, unknown>; loud: string } {
  const script = benchScriptPath();
  if (!fs.existsSync(script)) {
    throw new Error(
      `no bench script at ${script} — this install cannot measure itself (a checkout has scripts/bench.mjs; npm install does not ship it)`,
    );
  }
  const args = [script, '--budget', '--json'];
  if (!opts.full) args.push('--quick');
  if (opts.everything) args.push('--first-run');
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(process.execPath, args, { encoding: 'utf8', timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    stdout = e.stdout ?? '';
    stderr = e.stderr ?? '';
    if (!stdout.trim()) {
      throw new Error(`the bench failed before printing numbers: ${stderr.trim() || `exit ${e.status ?? 1}`}`);
    }
    // Numbers came out; the script exited 1 because something was over. That is
    // a result, not an error — the snapshot says which.
  }
  const bench = JSON.parse(stdout) as Record<string, number> & { budget?: { key: string; max: number }[] };
  const metrics: Record<string, number> = {};
  for (const key of Object.keys(PERF_CEILINGS)) {
    const value = bench[key];
    if (typeof value === 'number' && Number.isFinite(value)) metrics[key] = value;
  }
  const ceilings: PerfSnapshot['ceilings'] = {};
  for (const [key, c] of Object.entries(PERF_CEILINGS)) ceilings[key] = { max: c.max, unit: c.unit };
  const over = Object.keys(metrics).filter((k) => metrics[k]! > PERF_CEILINGS[k]!.max);
  const skipped = Object.keys(PERF_CEILINGS).filter((k) => !(k in metrics));
  const load = perfLoad();
  const snapshot: PerfSnapshot = {
    at: new Date().toISOString(),
    source: 'checkout',
    bench: script,
    machine: {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemMb: Math.round(os.totalmem() / (1024 * 1024)),
    },
    metrics,
    ceilings,
    over,
    skipped,
    load,
    suspect: load.perCpu > PERF_BUSY_PER_CPU,
  };
  return { snapshot, bench, loud: stderr.trim() };
}

/**
 * 40.4 — check a measurement in, so "how fast was 0.73?" is answerable offline.
 *
 * `state/perf.json` is this home's latest number and `state/perf-history.jsonl`
 * is the series on this device; neither travels with the repository. `--save`
 * writes a copy into `docs/openclaw/data/perf-<release>.json` — one file per
 * release, committed on purpose — and says so, because a measurement that is
 * only on the phone that took it is a measurement nobody can check.
 */
export function perfSaveDir(): string {
  return process.env.TCRAB_PERF_SAVE_DIR || path.join(PACKAGE_ROOT, 'docs', 'openclaw', 'data');
}

/** The file a release's measurement lives in, `perf-<release>.json`. */
export function perfSavePath(release: string, dir = perfSaveDir()): string {
  const safe = release.replace(/[^0-9A-Za-z.+-]/g, '') || 'unknown';
  return path.join(dir, `perf-${safe}.json`);
}

/**
 * 41.4 — what the machine was carrying when the numbers were taken.
 *
 * A measurement on a machine that is already busy is not a measurement of the
 * code: `load1 / cpus` above 1 means every core is already wanted by somebody
 * else, and every timing below is then an upper bound. `TCRAB_PERF_LOAD` exists
 * so the rule itself can be tested (a test cannot make a real machine busy).
 */
export function perfLoad(): { load1: number; cpus: number; perCpu: number } {
  const cpus = Math.max(1, os.cpus().length);
  const override = process.env.TCRAB_PERF_LOAD;
  const load1 = override !== undefined && override !== '' ? Number(override) : os.loadavg()[0] ?? 0;
  const safe = Number.isFinite(load1) && load1 >= 0 ? load1 : 0;
  return { load1: Math.round(safe * 100) / 100, cpus, perCpu: Math.round((safe / cpus) * 100) / 100 };
}

/** The rule, nameable so the CLI and the panel cannot disagree: busy above 1 per CPU. */
export const PERF_BUSY_PER_CPU = 1;

export function perfSuspect(load = perfLoad()): boolean {
  return load.perCpu > PERF_BUSY_PER_CPU;
}

/** `load 12.5 over 4 cpu (3.1 per cpu)` — the sentence for a suspect run. */
export function describeSuspectLoad(load: { load1: number; cpus: number; perCpu: number }): string {
  return `load ${load.load1.toFixed(2)} over ${load.cpus} cpu (${load.perCpu.toFixed(2)} per cpu)`;
}

/** The version whose measurement we are about to file (package.json's `version`). */
export function currentRelease(): string {
  try {
    return (JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version?: string }).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Write the snapshot for a release into the tracker's data dir. Returns the file
 * and whether an earlier copy was replaced (so the CLI can say which happened).
 */
export function savePerfSnapshot(
  snapshot: PerfSnapshot,
  release: string,
  dir = perfSaveDir(),
): { file: string; replaced: boolean } {
  const file = perfSavePath(release, dir);
  const replaced = fs.existsSync(file);
  fs.mkdirSync(dir, { recursive: true });
  const body = {
    ...snapshot,
    release,
    __note: 'measured on the machine in `machine`; the ceilings and their reasons live in docs/PERFORMANCE.md',
  };
  fs.writeFileSync(file, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
  return { file, replaced };
}

/** The saved measurements, newest release first. */
export function listSavedPerfSaves(dir = perfSaveDir()): { file: string; release: string; at: string }[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /^perf-\d+\.\d+\.\d+\.json$/.test(f))
      .map((f) => {
        const file = path.join(dir, f);
        try {
          const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { release?: string; at?: string };
          return { file, release: parsed.release ?? f.replace(/^perf-|\.json$/g, ''), at: parsed.at ?? '' };
        } catch {
          return { file, release: f.replace(/^perf-|\.json$/g, ''), at: '' };
        }
      })
      .sort((a, b) => compareReleases(b.release, a.release));
  } catch {
    return [];
  }
}

/** `0.10.0` after `0.9.0` — numeric, not lexicographic. */
function compareReleases(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Write the snapshot where the panel can read it; returns the file. */
export function writePerfSnapshot(snapshot: PerfSnapshot, file = perfPath()): string {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return file;
}

/** The last snapshot, or null when nothing has been measured on this home. */
export function readPerfSnapshot(file = perfPath()): PerfSnapshot | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as PerfSnapshot;
    if (!parsed || typeof parsed !== 'object' || !parsed.metrics) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * 39.1 — a history, not just a snapshot.
 *
 * One snapshot answers "how fast is it right now?". It cannot answer the
 * question a phone actually provokes: *is it getting slower?* So every
 * measurement appends one compact line to `state/perf-history.jsonl` (bounded —
 * the newest `HISTORY_LIMIT` runs), and `perfTrend()` compares the newest run
 * against the oldest in the window, oldest-first so a reader can see the shape.
 */
export const HISTORY_LIMIT = 60;

export interface PerfHistoryRun {
  at: string;
  metrics: Record<string, number>;
  over: string[];
}

export function perfHistoryPath(): string {
  return process.env.TCRAB_PERF_HISTORY || path.join(stateDir(), 'perf-history.jsonl');
}

/** Append one run and keep only the newest `HISTORY_LIMIT` lines. */
export function appendPerfHistory(snapshot: PerfSnapshot, file = perfHistoryPath()): string {
  const run: PerfHistoryRun = { at: snapshot.at, metrics: snapshot.metrics, over: snapshot.over };
  const runs = [run, ...readPerfHistory(Number.MAX_SAFE_INTEGER, file)].slice(0, HISTORY_LIMIT);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${runs.reverse().map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
  return file;
}

/** The recorded runs, newest first; a torn line is dropped like every other reader here. */
export function readPerfHistory(limit = HISTORY_LIMIT, file = perfHistoryPath()): PerfHistoryRun[] {
  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const runs: PerfHistoryRun[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as PerfHistoryRun;
      if (parsed && typeof parsed.at === 'string' && parsed.metrics) runs.push(parsed);
    } catch {
      /* a half-written line is not a run */
    }
  }
  runs.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return runs.slice(0, Math.max(0, limit));
}

export interface PerfTrendRow {
  key: string;
  /** the oldest value in the window */
  first: number;
  /** the newest value */
  last: number;
  /** last minus first — positive means slower/bigger, which for every one of our metrics is worse */
  delta: number;
  /** delta as a percentage of `first`, rounded */
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
  samples: number;
  /** the newest run is over its ceiling */
  over: boolean;
}

function directionOf(first: number, last: number): 'up' | 'down' | 'flat' {
  if (first === 0) return last === 0 ? 'flat' : 'up';
  const pct = ((last - first) / first) * 100;
  if (Math.abs(pct) < 3) return 'flat'; // a 3% band: jitter is not a trend
  return pct > 0 ? 'up' : 'down';
}

/** Per metric, newest against oldest in the window (chronological, oldest first). */
export function perfTrend(history: PerfHistoryRun[]): PerfTrendRow[] {
  const runs = [...history].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (runs.length < 2) return [];
  const first = runs[0]!;
  const last = runs[runs.length - 1]!;
  const rows: PerfTrendRow[] = [];
  for (const key of Object.keys(PERF_CEILINGS)) {
    const values = runs.map((r) => r.metrics[key]).filter((v): v is number => typeof v === 'number');
    if (values.length < 2) continue;
    const from = values[0]!;
    const to = values[values.length - 1]!;
    rows.push({
      key,
      first: from,
      last: to,
      delta: to - from,
      deltaPct: from === 0 ? (to === 0 ? 0 : 100) : Math.round(((to - from) / from) * 100),
      direction: directionOf(from, to),
      samples: values.length,
      over: to > PERF_CEILINGS[key]!.max,
    });
  }
  return rows;
}

/**
 * 41.1 — what to look at when a ceiling trips, one line per metric.
 *
 * The ceiling says *that* something got slower; this says *where to look*. It
 * lives here, next to `PERF_CEILINGS`, for the same reason: the panel, the CLI
 * and `docs/PERFORMANCE.md` all read this object, so the fix line a phone shows
 * cannot drift from the document (a test asserts every ceiling has one and that
 * the doc's "when a ceiling trips" list names every key).
 */
export const PERF_ADVICE: Record<string, string> = {
  installMs: 'a real dependency appeared: check `dependencies` in package.json — there are none, on purpose',
  coldStartMs: 'something heavy moved into startup: look at what `src/bin/termcrab.ts` imports at the top',
  idleRssMb: 'timers and buffers outliving their work: the schedulers in src/gateway/, the supervisor, the outbox, the ambient history ring',
  restartMs: 'shutdown doing work that should have happened at startup',
  turnMs: 'the agent loop (src/agent/loop.ts), tool dispatch, or a session store growing without a cap',
  panelKb: 'something was added to ui/index.html: a library, an inline asset, a second `<script src>` — it is one file by design',
  panelMs: 'serving the panel started doing work per request; it should be a file read and a write',
  queueDrainMs: 'the lane is doing per-turn work it could hoist: re-reading a session file, rebuilding a prompt on every message, a synchronous write in SessionQueue.finish',
  queueWakeMs: 'the lane stopped pumping between turns: look at SessionQueue.drain/finish and anything awaited there',
  subagentFanoutMs: 'tasks are being serialised (a shared lock, an await on the previous task) or the slot cap moved past four',
  roomWriteMs: 'the room log is doing more than a bounded read-and-trim per message: src/channels/rooms.ts',
  outboxDrainMs: 'the owed-message queue is doing more per row than read, claim, ack: src/mobile/outbox.ts',
  telegramPollMs: 'the poll plumbing got heavier (JSON parse, offset arithmetic, handler dispatch): src/channels/api.ts',
  docsMs: 'what `collectDocs()` embeds (docs/openclaw/data is excluded by default — 47 MB of raw crawl) or the per-doc byte cap',
  docsKb: 'the built page grew: check the exclusion list and the embedding cap before the file becomes a download',
  searchMs: 'the search became quadratic or started hitting the disk: src/agent/embed.ts — filter, cosine, sort must stay one scan',
  coldInstallMs: 'npm has nothing to fetch, so this is npm itself plus mobile data: check that `dependencies` is still empty (dev tools are fine)',
  coldCheckoutMs: 'the whole first contact: split it into the install half (npm, network) and the compile half (the launcher, CPU) and see which moved',
  firstRunMs: 'how much code `tsconfig.json` includes and what the launcher rebuilds',
  rebuildMs: 'the incremental file (dist/.tsbuildinfo) is gone, or it was pointed outside dist/',
};

/** The fix line for a metric, or a generic sentence when one has not been written. */
export function perfAdvice(key: string): string {
  return PERF_ADVICE[key] ?? 'see docs/PERFORMANCE.md for where this number comes from';
}

/**
 * 41.3 — the suite's own clock, where the phone can see it.
 *
 * `npm run test:time` records `docs/openclaw/data/suite-time.json` (wall clock,
 * every file, the slowest five, the budgets). That file is the record a person
 * checks before adding "just one more test", and until now it was only readable
 * with a shell in the repository. This is the read half: the newest record,
 * summarised — never a measurement (the suite is minutes, and the panel asks on
 * every refresh).
 */
export interface SuiteTimeStatus {
  exists: boolean;
  file: string;
  at: string | null;
  age: string;
  wallMs: number;
  cases: number;
  files: number;
  budgetWallMs: number;
  budgetFileMs: number;
  /** the slowest files, as the record names them */
  slowest: { file: string; ms: number }[];
  /** true when the record says the run was over its own budget */
  over: boolean;
}

/** Where the suite clock is recorded; env override is for tests. */
export function suiteTimePath(): string {
  return process.env.TCRAB_SUITE_TIME || path.join(PACKAGE_ROOT, 'docs', 'openclaw', 'data', 'suite-time.json');
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

interface SuiteTimeRecord {
  at?: string;
  wallMs?: number;
  totalTests?: number;
  totalFiles?: number;
  slowest?: { file?: string; ms?: number }[];
  budget?: { wallMs?: number; fileMs?: number };
  over?: string[] | boolean;
}

export function suiteTimeStatus(file = suiteTimePath()): SuiteTimeStatus {
  let record: SuiteTimeRecord | null = null;
  try {
    record = JSON.parse(fs.readFileSync(file, 'utf8')) as SuiteTimeRecord;
  } catch {
    record = null;
  }
  const at = record?.at ?? null;
  const ageMs = at ? Math.max(0, Date.now() - Date.parse(at)) : null;
  return {
    exists: record !== null,
    file,
    at,
    age: ageMs === null ? 'never recorded' : humanAgeMs(ageMs),
    wallMs: num(record?.wallMs),
    cases: num(record?.totalTests),
    files: num(record?.totalFiles),
    budgetWallMs: num(record?.budget?.wallMs) || 240_000,
    budgetFileMs: num(record?.budget?.fileMs) || 90_000,
    slowest: (record?.slowest ?? [])
      .filter((row): row is { file: string; ms: number } => typeof row?.file === 'string' && typeof row?.ms === 'number')
      .slice(0, 5),
    over: Array.isArray(record?.over) ? record.over.length > 0 : record?.over === true,
  };
}

/** `99 files · 1024 cases · 165.5 s of 240 s · slowest tier3j 40.4 s` — one line. */
export function describeSuiteTime(status: SuiteTimeStatus): string {
  if (!status.exists) return 'the suite has not recorded a run on this checkout yet — npm run test:time';
  const secs = (ms: number): string => `${(ms / 1000).toFixed(1)} s`;
  const slow = status.slowest[0];
  return `${status.files} files · ${status.cases} cases · ${secs(status.wallMs)} of ${secs(status.budgetWallMs)}${status.over ? ' (OVER)' : ''}${slow ? ` · slowest ${slow.file.replace(/\.test\.js$/, '')} ${secs(slow.ms)}` : ''} · recorded ${status.age}`;
}

export interface PerfStatus {
  exists: boolean;
  file: string;
  at: string | null;
  ageMs: number | null;
  age: string;
  /** the metric furthest along its ceiling, with the percentage of the way there */
  worst: { key: string; value: number; max: number; pct: number } | null;
  /** metrics over their ceiling; empty means inside the budget */
  over: string[];
  /** metrics that run did not measure */
  skipped: string[];
  measured: number;
  total: number;
  machine: PerfSnapshot['machine'] | null;
  /** how many runs are recorded in the history (0 when there is none) */
  runs: number;
  /** per-metric movement across the window, worst-looking first */
  trend: PerfTrendRow[];
  /** the newest run that was over its ceiling, if any (the newest is `over` itself) */
  lastOverAt: string | null;
  /** 41.1 — the fix line for the worst metric (null when nothing was measured) */
  worstAdvice: string | null;
  /** 41.1 — the fix line for each metric that is over its ceiling */
  overAdvice: { key: string; advice: string }[];
  /** 41.4 — the machine was busy while this was measured: do not trust the numbers */
  suspect: boolean;
  /** 41.4 — the load behind that judgement, when the snapshot recorded it */
  load: PerfSnapshot['load'] | null;
  /** 41.5 — the measured values themselves, so a surface can quote one metric */
  metrics: Record<string, number>;
  /** 41.5 — the ceilings that applied to them */
  budget: Record<string, { max: number; unit: string }>;
}

/**
 * 38.2 — what the panel needs to say about the last measurement: when it was,
 * what is closest to its line, and whether anything crossed one. Never measures
 * anything itself (the panel asks on every refresh, and a measurement boots a
 * gateway and runs a turn).
 */
export function perfStatus(file = perfPath()): PerfStatus {
  const snapshot = readPerfSnapshot(file);
  if (!snapshot) {
    return {
      exists: false,
      file,
      at: null,
      ageMs: null,
      age: 'never measured',
      worst: null,
      over: [],
      skipped: Object.keys(PERF_CEILINGS),
      measured: 0,
      total: Object.keys(PERF_CEILINGS).length,
      machine: null,
      runs: 0,
      trend: [],
      lastOverAt: null,
      worstAdvice: null,
      overAdvice: [],
      suspect: false,
      load: null,
      metrics: {},
      budget: {},
    };
  }
  const ageMs = snapshot.at ? Math.max(0, Date.now() - Date.parse(snapshot.at)) : null;
  let worst: PerfStatus['worst'] = null;
  for (const [key, value] of Object.entries(snapshot.metrics)) {
    const ceiling = snapshot.ceilings[key]?.max ?? PERF_CEILINGS[key]?.max;
    if (!ceiling) continue;
    const pct = Math.round((value / ceiling) * 100);
    if (!worst || pct > worst.pct) worst = { key, value, max: ceiling, pct };
  }
  const history = readPerfHistory();
  const trend = perfTrend(history).sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  const lastOver = history.find((r) => (r.over ?? []).length > 0);
  return {
    exists: true,
    file,
    at: snapshot.at ?? null,
    ageMs,
    age: ageMs === null ? 'unknown when' : humanAgeMs(ageMs),
    worst,
    over: snapshot.over ?? [],
    skipped: snapshot.skipped ?? [],
    measured: Object.keys(snapshot.metrics).length,
    total: Object.keys(PERF_CEILINGS).length,
    machine: snapshot.machine ?? null,
    runs: history.length,
    trend,
    lastOverAt: lastOver?.at ?? null,
    worstAdvice: worst ? perfAdvice(worst.key) : null,
    overAdvice: (snapshot.over ?? []).map((key) => ({ key, advice: perfAdvice(key) })),
    suspect: snapshot.suspect === true,
    load: snapshot.load ?? null,
    metrics: snapshot.metrics,
    budget: Object.fromEntries(
      Object.entries(snapshot.ceilings ?? PERF_CEILINGS).map(([key, c]) => [key, { max: c.max, unit: c.unit }]),
    ),
  };
}

/**
 * 41.2 — the current run against a saved one, metric by metric.
 *
 * A trend says "this got slower on this phone"; a comparison against a
 * *release* says "0.74 is 7% slower at a turn than 0.73 was, on this machine,
 * and here is the ceiling". Only metrics both snapshots measured appear: a
 * metric the saved run skipped is not a change, and inventing a zero for it
 * would be the one lie this whole budget exists to avoid.
 */
export interface PerfComparisonRow {
  key: string;
  then: number;
  now: number;
  delta: number;
  deltaPct: number;
  direction: 'up' | 'down' | 'flat';
  max: number;
}

export interface PerfComparison {
  then: { release: string | null; at: string | null; machine: string | null; file: string };
  now: { release: string | null; at: string | null };
  rows: PerfComparisonRow[];
  /** the largest movement, or null when nothing moved beyond the flat band */
  biggest: PerfComparisonRow | null;
  /** metrics the saved run measured that this run did not (so the compare is honest) */
  missing: string[];
}

const FLAT_PCT = 3;

export function comparePerfSnapshots(
  now: PerfSnapshot & { release?: string },
  then: (PerfSnapshot & { release?: string }) | null | undefined,
  files: { then: string; now: string },
): PerfComparison {
  const out: PerfComparison = {
    then: {
      release: then?.release ?? null,
      at: then?.at ?? null,
      machine: then?.machine ? `${then.machine.platform}/${then.machine.arch}` : null,
      file: files.then,
    },
    now: { release: now.release ?? null, at: now.at ?? null },
    rows: [],
    biggest: null,
    missing: [],
  };
  if (!then) return out;
  for (const [key, value] of Object.entries(now.metrics)) {
    const before = then.metrics[key];
    if (typeof before !== 'number') continue;
    const delta = value - before;
    const deltaPct = before === 0 ? (value === 0 ? 0 : 100) : Math.round((delta / before) * 100);
    const direction: PerfComparisonRow['direction'] = Math.abs(deltaPct) < FLAT_PCT ? 'flat' : delta > 0 ? 'up' : 'down';
    out.rows.push({ key, then: before, now: value, delta, deltaPct, direction, max: PERF_CEILINGS[key]?.max ?? 0 });
  }
  out.rows.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  out.biggest = out.rows.find((r) => r.direction !== 'flat') ?? null;
  out.missing = Object.keys(then.metrics).filter((key) => !(key in now.metrics));
  return out;
}

/** The saved snapshot to compare against: a named release, else the newest other release. */
export function readSavedPerfSnapshot(release: string | null, dir = perfSaveDir()): { file: string; snapshot: (PerfSnapshot & { release?: string }) | null } {
  // The release is announced by the file's own `release` field when it has one,
  // and by its name when it does not (`perf-0.73.0.json` is not ambiguous) —
  // a comparison that says "saved → now" is much less useful than one that
  // says "0.73.0 → 0.74.0".
  const named = (file: string, snapshot: PerfSnapshot | null): (PerfSnapshot & { release?: string }) | null =>
    snapshot ? { ...snapshot, release: snapshot.release ?? /perf-([0-9.]+)\.json$/.exec(file)?.[1] ?? undefined } : null;
  if (release) {
    const file = perfSavePath(release, dir);
    return { file, snapshot: named(file, readPerfSnapshot(file)) };
  }
  const saves = listSavedPerfSaves(dir);
  const current = currentRelease();
  const pick = saves.find((s) => s.release !== current) ?? saves[0];
  if (!pick) return { file: perfSavePath(current, dir), snapshot: null };
  return { file: pick.file, snapshot: named(pick.file, readPerfSnapshot(pick.file)) };
}

/** The comparison as a human table, largest movement first (41.2). */
export function describeComparison(cmp: PerfComparison): string[] {
  const arrow = (d: PerfComparisonRow['direction']): string => (d === 'up' ? '↑' : d === 'down' ? '↓' : '·');
  const label = `${cmp.then.release ?? 'saved'}${cmp.then.at ? ` (${cmp.then.at.slice(0, 10)})` : ''} → ${cmp.now.release ?? 'this run'}`;
  const lines = [`compare: ${label}  [${cmp.then.machine ?? 'unknown machine'}]`];
  if (cmp.then.at === null) {
    lines.length = 0;
    lines.push('compare: no saved measurement yet — file one with `termcrab perf --save` (docs/openclaw/data/perf-<release>.json)');
    return lines;
  }
  if (!cmp.rows.length) {
    lines.push('  nothing to compare: the saved run measured no metric this one did');
    return lines;
  }
  for (const row of cmp.rows) {
    const unit = PERF_CEILINGS[row.key]?.unit ?? 'ms';
    const move = row.direction === 'flat' ? 'steady' : `${arrow(row.direction)} ${Math.abs(row.deltaPct)}%`;
    lines.push(`  ${row.key.padEnd(15)} ${formatMetric(row.key, row.then)} → ${formatMetric(row.key, row.now)} (${unit})  ${move}`);
  }
  lines.push(`  largest: ${cmp.biggest ? `${cmp.biggest.key} ${arrow(cmp.biggest.direction)} ${Math.abs(cmp.biggest.deltaPct)}%` : 'nothing moved beyond the 3% band'}`);
  if (cmp.missing.length) lines.push(`  not measured by this run (so not compared): ${cmp.missing.join(', ')}`);
  return lines;
}

/** `coldStartMs ↑ 38% over 6 runs` — one line per metric that moved (39.1). */
export function describeTrend(trend: PerfTrendRow[]): string[] {
  const arrow = (d: PerfTrendRow['direction']): string => (d === 'up' ? '↑' : d === 'down' ? '↓' : '·');
  return trend.map((row) => {
    const move = row.direction === 'flat' ? 'steady' : `${arrow(row.direction)} ${Math.abs(row.deltaPct)}%`;
    return `${row.key.padEnd(13)} ${move.padEnd(10)} over ${row.samples} run(s) (${formatMetric(row.key, row.first)} → ${formatMetric(row.key, row.last)})`;
  });
}

/** `122 ms` / `71 MB` — the unit the ceiling is written in. */
export function formatMetric(key: string, value: number): string {
  const unit = PERF_CEILINGS[key]?.unit ?? 'ms';
  if (unit === 'MB') return `${Math.round(value)} MB`;
  if (unit === 'KB') return `${Math.round(value)} KB`;
  return `${Math.round(value)} ms`;
}

/** One line per metric: `coldStartMs 124 ms of 1500 ms  ok`. */
export function describePerf(snapshot: PerfSnapshot): string[] {
  return Object.keys(PERF_CEILINGS).map((key) => {
    const value = snapshot.metrics[key];
    const ceiling = snapshot.ceilings[key]?.max ?? PERF_CEILINGS[key]!.max;
    const unit = PERF_CEILINGS[key]!.unit;
    if (typeof value !== 'number') return `${key.padEnd(13)} not measured in this run`;
    const verdict = value > ceiling ? 'OVER' : 'ok';
    return `${key.padEnd(13)} ${formatMetric(key, value).padStart(8)} of ${ceiling} ${unit}`.padEnd(40) + verdict;
  });
}
