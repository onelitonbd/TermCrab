/**
 * Terminal-cell arithmetic for the full-screen terminal: how wide a string is,
 * where to cut it, how to wrap it (batch 29).
 *
 * A TUI has one hard problem that a line printer does not: everything must fit
 * in a rectangle, and the rectangle changes when the phone is rotated. These
 * are the pure parts — width, truncation, wrapping, padding — so the renderer
 * can stay a function of the state and the size, and the tests can check the
 * arithmetic instead of eyeballing a terminal.
 *
 * Zero dependencies, and the only assumption is that a terminal understands
 * ANSI SGR (colours) and that one "cell" is one code point, except for the
 * east-asian wide ranges and emoji, which take two. That is enough to stop the
 * right edge of the screen from being ragged on a phone.
 */

/** SGR escapes. Names, not numbers, so the renderer reads like prose. */
export const SGR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  inverse: '\x1b[7m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  grey: '\x1b[90m',
} as const;

const ANSI_RE = /\x1b\[[0-9;]*m/g;

/** The text a terminal actually shows: escapes removed. */
export function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

const WIDE_RE =
  /[\u1100-\u115f\u2e80-\u303e\u3041-\u33ff\u3400-\u4dbf\u4e00-\u9fff\ua000-\ua4cf\uf900-\ufaff\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]|[\u{1f300}-\u{1faff}]|[\u{20000}-\u{3ffff}]/u;

/** Printable width of one code point in terminal cells (0, 1 or 2). */
export function charWidth(ch: string): number {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp === 0) return 0;
  if (cp < 32 || cp === 0x7f) return 0;
  if (cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) return 0; // ZWJ, variation selectors
  return WIDE_RE.test(ch) ? 2 : 1;
}

/** How many cells a string occupies, ignoring escapes. */
export function width(text: string): number {
  let n = 0;
  for (const ch of stripAnsi(text)) n += charWidth(ch);
  return n;
}

/** Cut to `max` cells, no ellipsis — for a line that continues elsewhere. */
export function cut(text: string, max: number): string {
  if (max <= 0) return '';
  if (width(text) <= max) return text;
  let out = '';
  let n = 0;
  for (const ch of stripAnsi(text)) {
    const w = charWidth(ch);
    if (n + w > max) break;
    out += ch;
    n += w;
  }
  return out;
}

/** Cut to `max` cells with a single-character ellipsis, for labels. */
export function truncate(text: string, max: number): string {
  if (max <= 0) return '';
  if (width(text) <= max) return text;
  if (max === 1) return '…';
  return `${cut(text, max - 1)}…`;
}

/** Right-pad to exactly `cols` cells (escapes excluded from the count). */
export function pad(text: string, cols: number): string {
  const w = width(text);
  return w >= cols ? truncate(text, cols) : text + ' '.repeat(cols - w);
}

/**
 * Word-wrap to `cols` cells. Explicit newlines are kept, words longer than the
 * line are cut rather than pushed to their own line (a long path must not
 * create a blank line), and escapes in the input are ignored for measuring but
 * preserved in the output.
 */
export function wrap(text: string, cols: number): string[] {
  const width0 = Math.max(1, cols);
  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (!rawLine) {
      out.push('');
      continue;
    }
    let line = '';
    let used = 0;
    const words = rawLine.split(/(\s+)/); // keep the spaces, so indentation survives
    for (const word of words) {
      const w = width(word);
      if (used + w <= width0) {
        line += word;
        used += w;
        continue;
      }
      if (/^\s+$/.test(word)) {
        // A space that would end the line is dropped, not wrapped.
        out.push(line);
        line = '';
        used = 0;
        continue;
      }
      if (line.trim()) {
        out.push(line.replace(/\s+$/, ''));
        line = '';
        used = 0;
      }
      if (w <= width0) {
        line = word;
        used = w;
        continue;
      }
      // Longer than the line: hard-cut it across as many lines as it needs.
      let rest = word;
      while (width(rest) > width0) {
        const piece = cut(rest, width0);
        out.push(piece);
        rest = stripAnsi(rest).slice(piece.length);
      }
      line = rest;
      used = width(rest);
    }
    out.push(line.replace(/\s+$/, ''));
  }
  // A trailing empty line means the text ended with a newline — that is real.
  return out;
}
