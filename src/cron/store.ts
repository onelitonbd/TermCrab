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
  createdAt: number;
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

export function addCron(input: { name: string; schedule: string; prompt: string; critical?: boolean }): CronJob {
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

export function getCron(id: string): CronJob | null {
  return loadCrons().find((j) => j.id === id || j.name === id) ?? null;
}

// ---- run state (which minute each job last ran) ----

interface CronState {
  [id: string]: number; // epoch minute start
}

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
): { job: CronJob; minuteKey: number }[] {
  const minuteKey = Math.floor(now.getTime() / 60_000);
  const due: { job: CronJob; minuteKey: number }[] = [];
  for (const job of jobs) {
    if (!job.enabled) continue;
    if (state[job.id] === minuteKey) continue;
    let expr;
    try {
      expr = parseCron(job.schedule);
    } catch {
      continue; // invalid stored schedule: skip, never crash the scheduler
    }
    // match against minute-truncated now
    const minute = new Date(now.getTime());
    minute.setSeconds(0, 0);
    if (cronMatches(expr, minute)) due.push({ job, minuteKey });
  }
  return due;
}
