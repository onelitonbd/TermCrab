import { ANSI, paint } from './color.js';

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LEVELS)[number];

let current: LogLevel = (process.env.TCRAB_LOG_LEVEL as LogLevel) || 'info';

export function setLogLevel(level: LogLevel): void {
  current = level;
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

function line(level: LogLevel, tag: string, args: unknown[]): void {
  if (!enabled(level)) return;
  const ts = new Date().toISOString().slice(11, 19);
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  const head = paint(COLORS[level], `${ts} ${level.toUpperCase().padEnd(5)}`, { stream });
  const prefix = `${head} ${tag}`;
  const body = args
    .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.stack || a.message : JSON.stringify(a)))
    .join(' ');
  const out = `${prefix} ${body}`;
  if (level === 'error' || level === 'warn') console.error(out);
  else console.log(out);
}

export const log = {
  debug: (...args: unknown[]) => line('debug', '[debug]', args),
  info: (...args: unknown[]) => line('info', '[termcrab]', args),
  warn: (...args: unknown[]) => line('warn', '[warn]', args),
  error: (...args: unknown[]) => line('error', '[error]', args),
};
