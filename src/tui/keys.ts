/**
 * Raw bytes to named keys, partial escape sequences included (batch 29).
 *
 * A TUI reads raw bytes: an arrow key is three, a paste is many, and a phone
 * keyboard sending a stray escape must not leave the screen stuck. This module
 * turns a byte buffer into named keys and tells the caller how much it consumed
 * — the classic partial-escape problem, solved in one place so the app loop has
 * no parser of its own.
 */

export type Key =
  | { name: 'char'; char: string }
  | { name: 'enter' }
  | { name: 'backspace' }
  | { name: 'delete' }
  | { name: 'ctrl'; letter: string }
  | { name: 'up' }
  | { name: 'down' }
  | { name: 'left' }
  | { name: 'right' }
  | { name: 'home' }
  | { name: 'end' }
  | { name: 'pageup' }
  | { name: 'pagedown' }
  | { name: 'tab' }
  | { name: 'shift-tab' }
  | { name: 'escape' };

export interface Decoded {
  keys: Key[];
  /** Bytes not yet part of a complete key (keep them for the next chunk). */
  rest: string;
}

const CSI: Record<string, Key> = {
  A: { name: 'up' },
  B: { name: 'down' },
  C: { name: 'right' },
  D: { name: 'left' },
  H: { name: 'home' },
  F: { name: 'end' },
  '1~': { name: 'home' },
  '4~': { name: 'end' },
  '5~': { name: 'pageup' },
  '6~': { name: 'pagedown' },
  '3~': { name: 'delete' },
};

/**
 * Decode as much as possible. `rest` is what could not be decoded yet: either a
 * half-arrived escape sequence or a half-arrived UTF-8 code point — both must
 * wait for the next read rather than error.
 */
export function decodeKeys(input: string): Decoded {
  const keys: Key[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    const code = ch.charCodeAt(0);

    if (ch === '\x1b') {
      const next = input[i + 1];
      if (next === undefined) break; // maybe an arrow, maybe Escape — wait
      if (next === '[') {
        // CSI: ESC [ params final
        const m = /^\x1b\[(\d*;?\d*)?([A-Za-z~])/.exec(input.slice(i));
        if (!m) break; // incomplete
        const params = m[1] ?? '';
        const final = m[2]!;
        const key = final === 'Z' ? { name: 'shift-tab' as const } : CSI[params + final] ?? CSI[final];
        if (key) keys.push(key);
        i += m[0].length;
        continue;
      }
      if (next === 'O') {
        const m = /^\x1bO([A-Z])/.exec(input.slice(i));
        if (!m) break;
        keys.push(CSI[m[1]!] ?? { name: 'escape' });
        i += m[0].length;
        continue;
      }
      // ESC plus one printable: Alt-<key>; we do not use Alt, so it is Escape.
      keys.push({ name: 'escape' });
      i += 1;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      keys.push({ name: 'enter' });
      i += 1;
      continue;
    }
    if (ch === '\x7f' || ch === '\b') {
      keys.push({ name: 'backspace' });
      i += 1;
      continue;
    }
    if (ch === '\t') {
      keys.push({ name: 'tab' });
      i += 1;
      continue;
    }
    if (code < 32) {
      keys.push({ name: 'ctrl', letter: String.fromCharCode(code + 96) });
      i += 1;
      continue;
    }
    // A code point may be split across reads (a phone keyboard's emoji).
    const cp = input.codePointAt(i)!;
    const len = cp > 0xffff ? 2 : 1;
    if (i + len > input.length) break;
    // A lone high surrogate at the end of the buffer is half an emoji, not a
    // character: wait for the low half instead of drawing a replacement box.
    if (len === 1 && code >= 0xd800 && code <= 0xdbff) break;
    keys.push({ name: 'char', char: input.slice(i, i + len) });
    i += len;
  }
  return { keys, rest: input.slice(i) };
}
