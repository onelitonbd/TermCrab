import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface TtsChoice {
  cmd: string;
  args: (text: string) => string[];
}

/** Ordered by preference: Termux first (mobile-native), then desktop fallbacks. */
export const TTS_CANDIDATES: TtsChoice[] = [
  { cmd: 'termux-tts-speak', args: (t) => [t] },
  { cmd: 'espeak-ng', args: (t) => [t] },
  { cmd: 'espeak', args: (t) => [t] },
  { cmd: 'spd-say', args: (t) => [t] },
  { cmd: 'say', args: (t) => [t] },
];

/** Pick the first available TTS binary. `has` is injectable for tests. */
export function resolveTts(has: (cmd: string) => boolean): TtsChoice | null {
  for (const c of TTS_CANDIDATES) {
    if (has(c.cmd)) return c;
  }
  return null;
}

/**
 * PATH lookup without spawning `which`.
 *
 * Needed where a decision cannot be awaited (the streaming speaker starts
 * synchronously). `$PREFIX/bin` — Termux's own bin — is checked first when
 * PREFIX is set, because that is the copy the Termux:API app answers to.
 */
export function whichSync(cmd: string): string | null {
  const dirs = [
    ...(process.env.PREFIX ? [path.join(process.env.PREFIX, 'bin')] : []),
    ...(process.env.PATH ?? '').split(path.delimiter),
  ];
  for (const dir of dirs) {
    if (!dir) continue;
    const p = path.join(dir, cmd);
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch {
      /* unreadable dir — keep looking */
    }
  }
  return null;
}

/** The same chain as `speak()`, resolved without awaiting anything. */
export function resolveTtsSync(): TtsChoice | null {
  return resolveTts((cmd) => whichSync(cmd) !== null);
}

async function commandExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync('which', [cmd], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export interface SpeakResult {
  ok: boolean;
  backend?: string;
  error?: string;
}

/** Speak text aloud. Used by `termcrab say` and the voice skill. */
export async function speak(text: string): Promise<SpeakResult> {
  const clean = text.trim();
  if (!clean) return { ok: false, error: 'nothing to say' };

  const whichCache = new Map<string, boolean>();
  const has = async (cmd: string): Promise<boolean> => {
    if (!whichCache.has(cmd)) whichCache.set(cmd, await commandExists(cmd));
    return Boolean(whichCache.get(cmd));
  };

  for (const candidate of TTS_CANDIDATES) {
    if (await has(candidate.cmd)) {
      try {
        await execFileAsync(candidate.cmd, candidate.args(clean), { timeout: 60_000 });
        return { ok: true, backend: candidate.cmd };
      } catch (err) {
        return { ok: false, backend: candidate.cmd, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }
  return {
    ok: false,
    error: 'no TTS backend found. On Termux: pkg install termux-api (+ Termux:API app). Desktop: install espeak-ng or say.',
  };
}

/** Speech-to-text via Termux (blocks until the user finishes talking). */
export async function listen(timeoutMs = 60_000): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const { stdout } = await execFileAsync('termux-speech-to-text', [], { timeout: timeoutMs });
    return { ok: true, text: stdout.trim() };
  } catch (err) {
    return {
      ok: false,
      error: `termux-speech-to-text failed: ${err instanceof Error ? err.message : err} (need Termux:API app + mic permission)`,
    };
  }
}
