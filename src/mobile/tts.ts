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

/**
 * 51.2 — speech written to a *file* instead of the speakers.
 *
 * `speak()` above plays audio on the machine that runs TermCrab. A chat cannot
 * hear that: it needs bytes to send. This is the same chain, the file-writing
 * half of it: espeak's `-w`, macOS `say -o`, and then `ffmpeg` when it exists,
 * because Telegram's `sendVoice` wants OGG/Opus and espeak writes WAV.
 *
 * Everything is injectable (`has`, `run`, `now`) so a test can prove the
 * ordering without a sound card: the fakes write the file the real binaries
 * would, and the assertions are about which commands ran and what was produced.
 */
export interface VoiceFileResult {
  ok: boolean;
  /** The file that was written; OGG/Opus when `ogg` is true. */
  file?: string;
  /** The synthesizer that spoke (espeak-ng, say, …). */
  engine?: string;
  /** The converter that ran afterwards, when one did. */
  converter?: string;
  /** True when `file` is OGG/Opus, which is what Telegram plays as a voice note. */
  ogg: boolean;
  bytes?: number;
  error?: string;
}

export interface VoiceFileEngine {
  cmd: string;
  ext: string;
  args: (text: string, out: string) => string[];
}

/** Ordered by preference; only engines that can write to a file are listed. */
export const TTS_FILE_CANDIDATES: VoiceFileEngine[] = [
  { cmd: 'espeak-ng', ext: 'wav', args: (t, out) => ['-w', out, t] },
  { cmd: 'espeak', ext: 'wav', args: (t, out) => ['-w', out, t] },
  { cmd: 'spd-say', ext: 'wav', args: (t, out) => ['-o', out, t] },
  { cmd: 'say', ext: 'aiff', args: (t, out) => ['-o', out, t] },
];

/** Everything that can turn a WAV into the OGG/Opus a voice note needs. */
export const OGG_ENCODERS: { cmd: string; args: (input: string, out: string) => string[] }[] = [
  { cmd: 'ffmpeg', args: (input, out) => ['-y', '-loglevel', 'error', '-i', input, '-c:a', 'libopus', '-b:a', '32k', '-ar', '48000', '-ac', '1', out] },
  { cmd: 'opusenc', args: (input, out) => ['--quiet', input, out] },
];

export interface SpeakFileOptions {
  has?: (cmd: string) => Promise<boolean>;
  run?: (cmd: string, args: string[]) => Promise<{ code: number; out: string }>;
  now?: () => Date;
}

/**
 * Write `text` to a spoken file under `dir`. Returns the OGG when an encoder
 * exists, otherwise the synthesizer's own file (which a chat sends as a
 * document instead of a voice note) — with the reason recorded either way.
 */
export async function speakToFile(text: string, dir: string, opts: SpeakFileOptions = {}): Promise<VoiceFileResult> {
  const clean = text.trim();
  if (!clean) return { ok: false, ogg: false, error: 'nothing to say' };

  const has = opts.has ?? ((cmd: string) => commandExists(cmd));
  const run = opts.run ?? (async (cmd, args) => {
    try {
      await execFileAsync(cmd, args, { timeout: 60_000 });
      return { code: 0, out: '' };
    } catch (err) {
      return { code: 1, out: err instanceof Error ? err.message : String(err) };
    }
  });
  const stamp = (opts.now ?? (() => new Date()))().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  fs.mkdirSync(dir, { recursive: true });

  let raw: { file: string; engine: string } | null = null;
  const failures: string[] = [];
  for (const engine of TTS_FILE_CANDIDATES) {
    if (!(await has(engine.cmd))) continue;
    const out = path.join(dir, `voice-${stamp}.${engine.ext}`);
    const r = await run(engine.cmd, engine.args(clean, out));
    if (r.code === 0 && fs.existsSync(out) && fs.statSync(out).size > 0) {
      raw = { file: out, engine: engine.cmd };
      break;
    }
    failures.push(`${engine.cmd}: ${r.out.trim() || `exit ${r.code}`}`);
    try {
      fs.rmSync(out, { force: true });
    } catch {
      /* the engine may not have written anything at all */
    }
  }
  if (!raw) {
    return {
      ok: false,
      ogg: false,
      error:
        failures.length > 0
          ? `speech failed (${failures.join('; ')})`
          : 'no TTS backend that can write a file (install espeak-ng; Android: pkg install termux-api)',
    };
  }

  for (const enc of OGG_ENCODERS) {
    if (!(await has(enc.cmd))) continue;
    const out = path.join(dir, `voice-${stamp}.ogg`);
    const r = await run(enc.cmd, enc.args(raw.file, out));
    if (r.code === 0 && fs.existsSync(out) && fs.statSync(out).size > 0) {
      try {
        fs.rmSync(raw.file, { force: true });
      } catch {
        /* leaving the wav behind is harmless */
      }
      return { ok: true, file: out, engine: raw.engine, converter: enc.cmd, ogg: true, bytes: fs.statSync(out).size };
    }
    try {
      fs.rmSync(out, { force: true });
    } catch {
      /* nothing written */
    }
  }

  return {
    ok: true,
    file: raw.file,
    engine: raw.engine,
    ogg: false,
    bytes: fs.statSync(raw.file).size,
    error: 'no OGG/Opus encoder found (install ffmpeg) — sending the raw file instead of a voice note',
  };
}
