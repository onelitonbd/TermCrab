/**
 * Cron job store (crons.json): load/save/add/remove + next-run bookkeeping.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CronParseError, cronMatches, parseCron } from './parser.js';
import { stateDir, ensureLayout } from '../core/paths.js';

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // raw 5-field or @macro
  prompt: string;
  enabled: boolean;
  /** Skip the low-battery pause when true. */
  critical: boolean;
  /** Fire once then auto-disable (reminders). */
  oneShot?: boolean;
  /** Named agent this job runs as (33.2; falls back to agents.routes.cron). */
  agent?: string;
  /**
   * Where the output goes when the job finishes (33.4):
   *   telegram — the paired chat
   *   panel    — the web panel's notifications and the daily log (default)
   *   none     — the run is recorded, nothing is delivered
   */
  deliver?: 'telegram' | 'panel' | 'none';
  createdAt: number;
  // ---- 34.4: what happened last, so a job can be judged rather than trusted ----
  /** When it last started, epoch ms. */
  lastRun?: number;
  /** How the last attempt ended. */
  lastResult?: 'ok' | 'error' | 'skipped-battery' | 'skipped-overlap';
  /** The last error's message, trimmed. Cleared on success. */
  lastError?: string;
  /** Consecutive failures; reset by a success. Shown, never used to disable. */
  failures?: number;
  /** The last few attempts, newest last (bounded to 5). */
  history?: CronRun[];
}

export interface CronRun {
  at: number;
  ms: number;
  ok: boolean;
  /** 'ok' | the error | 'low battery' | 'still running' | 'missed N while off' */
  note?: string;
}

const CRON_FILE = 'crons.json';

function file(): string {
  return path.join(stateDir(), CRON_FILE);
}

export function loadCrons(): CronJob[] {
  ensureLayout();
  try {
    if (!fs.existsSync(file())) return [];
    const data = JSON.parse(fs.readFileSync(file(), 'utf8')) as CronJob[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveCrons(jobs: CronJob[]): void {
  ensureLayout();
  fs.writeFileSync(file(), `${JSON.stringify(jobs, null, 2)}\n`, 'utf8');
}

export function addCron(input: {
  name: string;
  schedule: string;
  prompt: string;
  critical?: boolean;
  oneShot?: boolean;
  agent?: string;
  deliver?: 'telegram' | 'panel' | 'none';
}): CronJob {
  parseCron(input.schedule); // validates, throws CronParseError
  if (!input.prompt.trim()) throw new CronParseError('prompt is required');
  const jobs = loadCrons();
  const job: CronJob = {
    id: crypto.randomBytes(4).toString('hex'),
    name: input.name.trim() || input.schedule,
    schedule: input.schedule.trim(),
    prompt: input.prompt.trim(),
    enabled: true,
    critical: Boolean(input.critical),
    oneShot: Boolean(input.oneShot),
    ...(input.agent ? { agent: input.agent.trim().toLowerCase() } : {}),
    ...(input.deliver ? { deliver: input.deliver } : {}),
    createdAt: Date.now(),
  };
  jobs.push(job);
  saveCrons(jobs);
  return job;
}

export function removeCron(id: string): boolean {
  const jobs = loadCrons();
  const next = jobs.filter((j) => j.id !== id && j.name !== id);
  const changed = next.length !== jobs.length;
  if (changed) saveCrons(next);
  return changed;
}

export function setCronEnabled(id: string, enabled: boolean): CronJob | null {
  const jobs = loadCrons();
  const job = jobs.find((j) => j.id === id || j.name === id);
  if (!job) return null;
  job.enabled = enabled;
  saveCrons(jobs);
  return job;
}

/**
 * Record one attempt on a job (34.4). Keeps the last five, counts consecutive
 * failures, and never throws: bookkeeping must not cost the run.
 */
export function recordCronRun(id: string, entry: CronRun, outcome: {
  result: NonNullable<CronJob['lastResult']>;
  error?: string;
}): void {
  try {
    const jobs = loadCrons();
    const job = jobs.find((j) => j.id === id || j.name === id);
    if (!job) return;
    job.lastRun = entry.at;
    job.lastResult = outcome.result;
    const failed = outcome.result === 'error';
    job.failures = failed ? (job.failures ?? 0) + 1 : 0;
    if (failed && outcome.error) job.lastError = outcome.error.slice(0, 300);
    else if (!failed) delete job.lastError;
    job.history = [...(job.history ?? []), entry].slice(-5);
    saveCrons(jobs);
  } catch {
    /* bookkeeping is best effort */
  }
}

export function getCron(id: string): CronJob | null {
  return loadCrons().find((j) => j.id === id || j.name === id) ?? null;
}

// ---- run state (which minute each job last ran) ----

interface CronState {
  [id: string]: number; // epoch minute start
}

/**
 * How far back a job may be caught up after the device was off (34.4). A phone
 * that was asleep for a day still runs a missed daily job once; a phone that
 * was off for a month does not fire thirty of them.
 */
export const CATCHUP_LIMIT_MINUTES = 24 * 60;
/** Reserved key in the state file: the previous tick's minute. */
export const TICK_KEY = '__tick';

function stateFile(): string {
  return path.join(stateDir(), 'cron-state.json');
}

export function loadCronState(): CronState {
  try {
    if (fs.existsSync(stateFile())) return JSON.parse(fs.readFileSync(stateFile(), 'utf8')) as CronState;
  } catch {
    /* ignore */
  }
  return {};
}

export function saveCronState(state: CronState): void {
  ensureLayout();
  fs.writeFileSync(stateFile(), JSON.stringify(state), 'utf8');
}

/** Pure decision helper (tested): which enabled jobs are due in this minute? */
export function findDue(
  jobs: CronJob[],
  now: Date,
  state: CronState,
  opts: { catchupLimitMinutes?: number } = {},
): { job: CronJob; minuteKey: number; missed: number }[] {
  const minuteKey = Math.floor(now.getTime() / 60_000);
  const limit = opts.catchupLimitMinutes ?? CATCHUP_LIMIT_MINUTES;
  const previous = state[TICK_KEY];
  // The first tick after a start has nothing to compare against, so it only
  // fires the current minute: no history means no catch-up, never a burst.
  const earliest =
    typeof previous === 'number' && previous < minuteKey
      ? Math.max(previous + 1, minuteKey - limit)
      : minuteKey;
  const due: { job: CronJob; minuteKey: number; missed: number }[] = [];
  for (const job of jobs) {
    if (!job.enabled) continue;
    if (state[job.id] === minuteKey) continue;
    let expr;
    try {
      expr = parseCron(job.schedule);
    } catch {
      continue; // invalid stored schedule: skip, never crash the scheduler
    }
    const lastRan = state[job.id];
    const from = Math.max(earliest, typeof lastRan === 'number' ? lastRan + 1 : earliest);
    let missed = 0;
    for (let m = from; m <= minuteKey; m++) {
      const minute = new Date(m * 60_000);
      if (cronMatches(expr, minute)) missed++;
    }
    // Coalesce: a job that was due three times while the phone was off runs
    // once now, and says how many it skipped.
    if (missed > 0) due.push({ job, minuteKey, missed });
  }
  return due;
}

/** Mark this minute as seen, so the next tick can tell what it covers (34.4). */
export function markTick(state: CronState, now: Date): CronState {
  state[TICK_KEY] = Math.floor(now.getTime() / 60_000);
  return state;
}
