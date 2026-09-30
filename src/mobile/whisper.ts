import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { home } from '../core/paths.js';

/**
 * Offline audio transcription via whisper.cpp (`whisper-cli`).
 *
 * Spike #11 verdict (2026-09-29): on-device transcription is good enough for
 * voice memos — measured 10.5s of audio → perfect text in ~1.1s (~9x realtime)
 * with the tiny model on a sandbox x86 CPU. Phones are slower but still ahead
 * of realtime with the tiny model. Engine + model stay optional (zero-dep core):
 * we locate what the user installed, or explain how in one sentence.
 */

export interface TranscribeResult {
  ok: boolean;
  text?: string;
  error?: string;
  /** How the engine/model was found (for transparency). */
  engine?: string;
  model?: string;
  ms?: number;
}

const BIN_NAMES = ['whisper-cli', 'whisper'];

/** Where to look for the whisper binary (PATH first, then common builds). */
export function findWhisperBin(): string | null {
  const extra = [
    path.join(home(), 'whisper.cpp', 'build', 'bin', 'whisper-cli'),
    path.join(home(), 'whisper.cpp', 'build', 'bin', 'main'),
    path.join(home(), 'whisper-whisper', 'build', 'bin', 'whisper-cli'),
  ];
  for (const n of BIN_NAMES) {
    // sync which-equivalent keeps this function simple & testable
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
      if (!dir) continue;
      const p = path.join(dir, n);
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
      } catch {
        /* unreadable dir - keep looking */
      }
    }
  }
  for (const p of extra) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Candidate model files: explicit flag > env > drop-in folder > whisper.cpp checkouts. */
export function findWhisperModel(explicit?: string): string | null {
  const candidates: string[] = [];
  if (explicit) candidates.push(explicit);
  if (process.env.WHISPER_MODEL) candidates.push(process.env.WHISPER_MODEL);
  const dirs = [
    path.join(home(), 'models'),
    path.join(home(), 'models', 'whisper'),
    path.join(home(), 'whisper.cpp', 'models'),
    path.join(home(), 'whisper', 'models'),
  ];
  for (const d of dirs) {
    try {
      if (!fs.existsSync(d)) continue;
      const bins = fs
        .readdirSync(d)
        .filter((f) => /^ggml.*\.bin$/i.test(f))
        .sort((a, b) => rankModel(a) - rankModel(b));
      for (const f of bins) candidates.push(path.join(d, f));
    } catch {
      /* ignore */
    }
  }
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Prefer tiny > base > small > others (phone-friendly sizes). */
function rankModel(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('tiny')) return 0;
  if (n.includes('base')) return 1;
  if (n.includes('small')) return 2;
  if (n.includes('medium')) return 3;
  return 4;
}

const INSTALL_HINT =
  'to transcribe audio files offline: install whisper.cpp (pkg install cmake clang git && git clone https://github.com/ggerganov/whisper.cpp && cd whisper.cpp && cmake -B build && cmake --build build -j) and drop a ggml model into ~/models/ (e.g. ggml-tiny.bin from huggingface.co/ggerganov/whisper.cpp)';

/**
 * Transcribe an audio file (wav/mp3/flac/m4a — anything whisper.cpp decodes).
 * Never throws; always settles with friendly text.
 */
export async function transcribeFile(
  file: string,
  opts: { model?: string; timeoutMs?: number; lang?: string } = {},
): Promise<TranscribeResult> {
  if (!fs.existsSync(file)) {
    return { ok: false, error: `audio file not found: ${file}` };
  }
  const bin = findWhisperBin();
  if (!bin) {
    return { ok: false, error: `whisper engine not installed — ${INSTALL_HINT}` };
  }
  const model = findWhisperModel(opts.model);
  if (!model) {
    return {
      ok: false,
      error: `no whisper model found — download ggml-tiny.bin (~75 MB) into ${path.join(home(), 'models')}/, or pass --model <file>`,
    };
  }

  const args = ['-m', model, '-f', file, '-np'];
  if (opts.lang) args.push('-l', opts.lang);
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const started = Date.now();

  return new Promise((resolve) => {
    let out = '';
    let err = '';
    let settled = false;
    const finish = (r: TranscribeResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        /* already gone */
      }
      resolve(r);
    };
    const timer = setTimeout(() => {
      finish({ ok: false, error: `transcription timed out after ${Math.round(timeoutMs / 1000)}s — try a shorter clip or the tiny model` });
    }, timeoutMs);

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      finish({ ok: false, error: `whisper engine failed to start: ${e instanceof Error ? e.message : String(e)}` });
      return;
    }
    child.stdout?.on('data', (b: Buffer) => (out += b.toString()));
    child.stderr?.on('data', (b: Buffer) => (err += b.toString()));
    child.on('error', (e) => {
      finish({ ok: false, error: `whisper engine failed to start: ${e.message}` });
    });
    child.on('close', (code) => {
      const lines = out
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const text = lines.join('\n');
      if (text) {
        finish({ ok: true, text, engine: bin, model, ms: Date.now() - started });
      } else {
        const detail = err.split('\n').filter(Boolean).slice(-2).join('; ');
        finish({
          ok: false,
          error:
            code === 0
              ? 'no speech recognized in that file'
              : `transcription failed${detail ? `: ${detail}` : ''}`,
        });
      }
    });
  });
}
