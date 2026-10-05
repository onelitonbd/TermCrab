import { ANSI, paint } from './color.js';
import { structuredLog } from './structured-log.js';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LEVELS)[number];

let current: LogLevel = (process.env.TCRAB_LOG_LEVEL as LogLevel) || 'info';
let logsToStderr = false;

export function setLogLevel(level: LogLevel): void {
  current = level;
}

/**
 * Route every log line to stderr (batch 14). The CLI turns this on with
 * `--json`, where stdout is reserved for one JSON document: a warning printed
 * to stdout would corrupt the answer a script is about to parse.
 */
export function setLogToStderr(on: boolean): void {
  logsToStderr = on;
}

export function logStream(): 'stdout' | 'stderr' {
  return logsToStderr ? 'stderr' : 'stdout';
}

const COLORS: Record<LogLevel, string> = {
  debug: ANSI.dim,
  info: ANSI.cyan,
  warn: ANSI.yellow,
  error: ANSI.red,
};

function enabled(level: LogLevel): boolean {
  return LEVELS.indexOf(level) >= LEVELS.indexOf(current);
}

function areaOf(tag: string, body: string): string {
  // The tag is `[termcrab]`, `[warn]`, …; the area is what the message is
  // about, taken from a leading `word:` when there is one (23.2).
  const fromTag = tag.replace(/^\[|\]$/g, '');
  if (fromTag && fromTag !== 'termcrab' && fromTag !== 'debug' && fromTag !== 'warn' && fromTag !== 'error') return fromTag;
  const m = /^([a-z][a-z0-9-]{1,20}):/.exec(body);
  return m ? m[1]! : 'termcrab';
}

function line(level: LogLevel, tag: string, args: unknown[]): void {
  if (!enabled(level)) return;
  const ts = new Date().toISOString().slice(11, 19);
  const stream = logsToStderr || level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  const head = paint(COLORS[level], `${ts} ${level.toUpperCase().padEnd(5)}`, { stream });
  const prefix = `${head} ${tag}`;
  const body = args
    .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)))
    .join(' ');
  const out = `${prefix} ${body}`;
  if (stream === process.stderr) console.error(out);
  else console.log(out);
  // Mirror into logs/termcrab.jsonl so tomorrow's question has an answer that
  // does not depend on someone having watched the terminal (23.2).
  structuredLog.write(level, areaOf(tag, body), body.slice(0, 2000));
}

export const log = {
  debug: (...args: unknown[]) => line('debug', '[debug]', args),
  info: (...args: unknown[]) => line('info', '[termcrab]', args),
  warn: (...args: unknown[]) => line('warn', '[warn]', args),
  error: (...args: unknown[]) => line('error', '[error]', args),
};
