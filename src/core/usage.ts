import fs from 'node:fs';
import path from 'node:path';
import { home, ensureLayout } from './paths.js';

/**
 * Token accounting, one JSONL line per turn: `TCRAB_HOME/usage/<day>.jsonl`.
 *
 * Append-only and cheap (no index, no DB) because it is written on every turn —
 * including on a phone. A corrupt line is skipped, never fatal: this file is a
 * meter, not the transcript. Everything reported here is a number a provider
 * actually sent (see `Usage.estimated` for the one exception, the offline mock,
 * which is labelled as such everywhere it is shown).
 */
export interface UsageRecord {
  ts: number;
  sessionId: string;
  provider: string;
  model: string;
  /** Provider calls this turn made (a tool loop makes several). */
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Only present when a price was known for the model. */
  costUsd?: number;
}

export interface UsageDay {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  turns: number;
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Sum over the records that had a price; 0 when none did. */
  costUsd: number;
  /** True when at least one record carried a cost. */
  priced: boolean;
  byModel: Record<string, { turns: number; calls: number; promptTokens: number; completionTokens: number; totalTokens: number; costUsd?: number }>;
}

/** Local (not UTC) day key: "today" must mean the owner's today. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function usageDir(): string {
  return path.join(home(), 'usage');
}

export function usageDayFile(d: Date = new Date()): string {
  return path.join(usageDir(), `${dayKey(d)}.jsonl`);
}

/** Record one finished turn. Never throws: a meter that breaks a turn is worse than no meter. */
export function recordUsage(rec: Omit<UsageRecord, 'ts'> & { ts?: number }): void {
  try {
    ensureLayout();
    fs.mkdirSync(usageDir(), { recursive: true });
    const line = JSON.stringify({ ...rec, ts: rec.ts ?? Date.now() });
    fs.appendFileSync(usageDayFile(), `${line}\n`, 'utf8');
  } catch {
    /* never break a turn over accounting */
  }
}

export function readUsageDay(d: Date = new Date()): UsageRecord[] {
  const file = usageDayFile(d);
  if (!fs.existsSync(file)) return [];
  const out: UsageRecord[] = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as UsageRecord);
    } catch {
      /* a torn line is ignored, not fatal */
    }
  }
  return out;
}

/** Everything recorded for one day, summed. Empty days sum to zero, not to null. */
export function usageForDay(d: Date = new Date()): UsageDay {
  const day: UsageDay = {
    day: dayKey(d),
    turns: 0,
    calls: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    priced: false,
    byModel: {},
  };
  for (const rec of readUsageDay(d)) {
    day.turns += 1;
    day.calls += rec.calls || 1;
    day.promptTokens += rec.promptTokens || 0;
    day.completionTokens += rec.completionTokens || 0;
    day.totalTokens += rec.totalTokens || 0;
    if (typeof rec.costUsd === 'number') {
      day.costUsd += rec.costUsd;
      day.priced = true;
    }
    const key = rec.model || '(unknown)';
    const m = day.byModel[key] ?? { turns: 0, calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    m.turns += 1;
    m.calls += rec.calls || 1;
    m.promptTokens += rec.promptTokens || 0;
    m.completionTokens += rec.completionTokens || 0;
    m.totalTokens += rec.totalTokens || 0;
    if (typeof rec.costUsd === 'number') m.costUsd = Number(((m.costUsd ?? 0) + rec.costUsd).toFixed(6));
    day.byModel[key] = m;
  }
  day.costUsd = Number(day.costUsd.toFixed(6));
  return day;
}

/** The last `days` days, oldest first — used for a weekly view. */
export function usageWindow(days = 7, end: Date = new Date()): UsageDay[] {
  const out: UsageDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    out.push(usageForDay(d));
  }
  return out;
}

/** Compact display form: 1234 → "1.2k". */
export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}
