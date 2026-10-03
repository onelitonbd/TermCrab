/**
 * Colour discipline (13.2).
 *
 * Rules, in the order they apply:
 *  1. `TCRAB_COLOR=always|never` (also `1/0`, `true/false`, `force/off`) wins —
 *     it exists so tests and screenshots can ask for colour on purpose.
 *  2. `NO_COLOR` set to a non-empty value turns colour off (no-color.org).
 *  3. `FORCE_COLOR` set to anything but `0` turns colour on.
 *  4. Otherwise: colour only when the stream is a TTY — a pipe, a file or a
 *     chat bridge never gets raw escape codes.
 */

export type ColorMode = 'auto' | 'always' | 'never';

export function colorModeFromEnv(env: NodeJS.ProcessEnv = process.env): ColorMode {
  const explicit = (env.TCRAB_COLOR ?? '').trim().toLowerCase();
  if (['always', '1', 'true', 'force', 'yes', 'on'].includes(explicit)) return 'always';
  if (['never', '0', 'false', 'off', 'no'].includes(explicit)) return 'never';
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== '') return 'never';
  const force = (env.FORCE_COLOR ?? '').trim();
  if (force && force !== '0') return 'always';
  return 'auto';
}

export function colorEnabled(
  stream: { isTTY?: boolean } | undefined = process.stdout,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const mode = colorModeFromEnv(env);
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return Boolean(stream?.isTTY);
}

export interface ColorOpts {
  stream?: { isTTY?: boolean } | undefined;
  env?: NodeJS.ProcessEnv;
}

/** Wrap `text` in an ANSI code, or return it untouched when colour is off. */
export function paint(code: string, text: string, opts: ColorOpts = {}): string {
  if (!code || !colorEnabled(opts.stream, opts.env ?? process.env)) return text;
  return `${code}${text}\x1b[0m`;
}

/** Plain `\x1b[31m`-style strings that came out of a subprocess or a log file. */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export const ANSI = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[90m',
} as const;
