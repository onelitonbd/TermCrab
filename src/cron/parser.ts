/**
 * Dependency-free 5-field cron:  minute hour day-of-month month day-of-week
 * Supports: * , - / and macros @hourly @daily @midnight @weekly @monthly @yearly
 * plus plain numbers and lists like "1,15" and steps such as star-slash-15 or 8-18/2.
 *
 * Standard semantics: if BOTH day-of-month and day-of-week are restricted,
 * a date matches when EITHER matches.
 */

export interface CronExpr {
  minutes: Set<number> | null; // null = wildcard
  hours: Set<number> | null;
  dom: Set<number> | null;
  months: Set<number> | null;
  dow: Set<number> | null; // 0 or 7 = Sunday
  raw: string;
}

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

export class CronParseError extends Error {}

function parseField(
  field: string,
  min: number,
  max: number,
  label: string,
  aliases?: Record<string, number>,
): Set<number> | null {
  const f = field.trim().toLowerCase();
  if (!f || f === '*') return null;
  const out = new Set<number>();
  for (const part of f.split(',')) {
    const chunk = part.trim();
    if (!chunk) throw new CronParseError(`empty item in ${label} field`);
    // step: base/step where base is *, range, or number
    const [rangePart, stepPart, extra] = chunk.split('/');
    if (extra !== undefined) throw new CronParseError(`invalid step syntax in ${label}: ${chunk}`);
    let step = 1;
    if (stepPart !== undefined) {
      step = Number(stepPart);
      if (!Number.isInteger(step) || step < 1) throw new CronParseError(`invalid step in ${label}: ${chunk}`);
    }
    let lo: number;
    let hi: number;
    const range = rangePart ?? '*';
    if (range === '*') {
      lo = min;
      hi = max;
    } else if (range.includes('-')) {
      const [a, b] = range.split('-');
      lo = toNum(a!, aliases, label);
      hi = toNum(b!, aliases, label);
    } else {
      lo = toNum(range, aliases, label);
      hi = stepPart !== undefined ? max : lo;
    }
    if (lo < min || hi > max || lo > hi) throw new CronParseError(`out of range in ${label}: ${chunk}`);
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

function toNum(raw: string, aliases: Record<string, number> | undefined, label: string): number {
  const key = raw.trim().toLowerCase();
  if (aliases && key in aliases) return aliases[key]!;
  const n = Number(key);
  if (!Number.isInteger(n)) throw new CronParseError(`not a number in ${label}: ${raw}`);
  return n;
}

const MONTH_ALIASES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const DOW_ALIASES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

export function parseCron(expr: string): CronExpr {
  const raw = expr.trim();
  if (!raw) throw new CronParseError('empty schedule');
  const expanded = MACROS[raw.toLowerCase()] ?? raw;
  const parts = expanded.split(/\s+/);
  if (parts.length !== 5) {
    throw new CronParseError(`expected 5 fields (got ${parts.length}): "${expr}" — e.g. "*/30 * * * *" or "0 8 * * 1-5"`);
  }
  const minutes = parseField(parts[0]!, 0, 59, 'minute');
  const hours = parseField(parts[1]!, 0, 23, 'hour');
  const dom = parseField(parts[2]!, 1, 31, 'day-of-month');
  const months = parseField(parts[3]!, 1, 12, 'month', MONTH_ALIASES);
  const dowRaw = parseField(parts[4]!, 0, 7, 'day-of-week', DOW_ALIASES);
  const dow = dowRaw ? new Set([...dowRaw].map((d) => (d === 7 ? 0 : d))) : null;
  return { minutes, hours, dom, months, dow, raw };
}

/** Does the schedule match this local minute? (seconds ignored) */
export function cronMatches(expr: CronExpr, date: Date): boolean {
  const m = date.getMinutes();
  const h = date.getHours();
  const dom = date.getDate();
  const mon = date.getMonth() + 1;
  const dow = date.getDay();

  if (expr.minutes && !expr.minutes.has(m)) return false;
  if (expr.hours && !expr.hours.has(h)) return false;
  if (expr.months && !expr.months.has(mon)) return false;

  const domRestricted = expr.dom !== null;
  const dowRestricted = expr.dow !== null;
  if (domRestricted && dowRestricted) {
    if (!expr.dom!.has(dom) && !expr.dow!.has(dow)) return false;
  } else if (domRestricted && !expr.dom!.has(dom)) return false;
  else if (dowRestricted && !expr.dow!.has(dow)) return false;
  return true;
}

/** Next occurrence strictly after `from` (local time). Returns null if none within 366 days. */
export function nextRun(expr: CronExpr, from: Date = new Date()): Date | null {
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const limit = from.getTime() + 366 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= limit) {
    if (cronMatches(expr, cursor)) return new Date(cursor.getTime());
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return null;
}
