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
  unit: 'ms' | 'MB';
}

/**
 * The ceilings (37.1). Measured 2026-10-04 on the development box while these
 * were written; each one is a loose multiple so the alarm fires on a
 * regression rather than on jitter. docs/PERFORMANCE.md explains them.
 */
export const PERF_CEILINGS: Record<string, PerfCeiling> = {
  installMs: { max: 20_000, unit: 'ms', why: 'zero runtime deps: npm has nothing to fetch' },
  coldStartMs: { max: 1_500, unit: 'ms', why: 'every CLI call pays it' },
  idleRssMb: { max: 130, unit: 'MB', why: 'a 2 GB phone kills hogs' },
  restartMs: { max: 2_500, unit: 'ms', why: 'a restart has to be invisible' },
  turnMs: { max: 5_000, unit: 'ms', why: 'the whole message-to-answer loop, offline' },
  firstRunMs: { max: 30_000, unit: 'ms', why: 'the one wait a new user pays' },
  rebuildMs: { max: 8_000, unit: 'ms', why: 'pull, then run, must not be a rebuild' },
};

/** What the fast half measures; the rest needs npm and a 5 s compile. */
export const FAST_METRICS = ['coldStartMs', 'idleRssMb', 'restartMs', 'turnMs'];

export interface PerfSnapshot {
  /** When the measurement finished, ISO-8601 UTC. */
  at: string;
  /** Where the numbers came from, so nobody mistakes a checkout for a phone. */
  source: 'checkout';
  bench: string;
  machine: { node: string; platform: string; arch: string; cpus: number; totalMemMb: number };
  /** measured values, keyed like the ceilings */
  metrics: Record<string, number>;
  /** the ceilings that applied, so an old snapshot explains itself */
  ceilings: Record<string, { max: number; unit: 'ms' | 'MB' }>;
  /** names of the metrics over their ceiling (empty = inside the budget) */
  over: string[];
  /** which of them the fast run did not measure */
  skipped: string[];
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
  };
  return { snapshot, bench, loud: stderr.trim() };
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
  };
}

/** `122 ms` / `71 MB` — the unit the ceiling is written in. */
export function formatMetric(key: string, value: number): string {
  const unit = PERF_CEILINGS[key]?.unit ?? 'ms';
  return unit === 'MB' ? `${Math.round(value)} MB` : `${Math.round(value)} ms`;
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
