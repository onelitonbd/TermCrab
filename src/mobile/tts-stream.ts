import { spawn, ChildProcess } from 'node:child_process';

/**
 * TTS streaming: chunked synthesis for long text.
 * Splits text into sentences, speaks each chunk, and pipes output.
 * Falls back to non-streaming if the engine doesn't support it.
 */

export interface TtsStreamResult {
  ok: boolean;
  error?: string;
}

export interface TtsStreamOptions {
  voice?: string;
  speed?: number;
  onChunk?: (text: string) => void;
}

/** Split text into speakable chunks (sentences, ~200 chars max). */
export function splitForTts(text: string, maxChars = 200): string[] {
  const sentences = text
    .replace(/\n+/g, '. ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim());
  const chunks: string[] = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current) chunks.push(current);
  return chunks.length ? chunks : [text.slice(0, maxChars)];
}

/**
 * Stream TTS: speak text in chunks, calling onChunk for each.
 * Uses termux-tts-speak on Termux, espeak otherwise.
 */
export function speakStream(text: string, opts: TtsStreamOptions = {}): Promise<TtsStreamResult> {
  return new Promise((resolve) => {
    const chunks = splitForTts(text);
    const bin = process.env.PREFIX ? `${process.env.PREFIX}/bin/termux-tts-speak` : 'espeak';
    let idx = 0;
    let child: ChildProcess | undefined;
    let settled = false;

    const finish = (r: TtsStreamResult): void => {
      if (settled) return;
      settled = true;
      try { child?.kill(); } catch { /* already gone */ }
      resolve(r);
    };

    const speakNext = (): void => {
      if (idx >= chunks.length) {
        finish({ ok: true });
        return;
      }
      const chunk = chunks[idx]!;
      idx++;
      opts.onChunk?.(chunk);

      try {
        const args: string[] = [];
        if (process.env.PREFIX) {
          if (opts.voice) args.push('-v', opts.voice);
          if (opts.speed) args.push('-r', String(opts.speed));
        }
        args.push(chunk);
        child = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      } catch (err) {
        finish({ ok: false, error: `tts failed to start: ${err instanceof Error ? err.message : String(err)}` });
        return;
      }

      child.on('error', (err: NodeJS.ErrnoException) => {
        finish({
          ok: false,
          error: err.code === 'ENOENT' ? 'tts engine not available' : `tts failed: ${err.message}`,
        });
      });

      child.on('close', () => {
        // Small gap between chunks
        setTimeout(speakNext, 50);
      });
    };

    speakNext();
  });
}

/**
 * Continuous STT: keep listening until stopped.
 * Calls onResult for each recognized phrase.
 */
export interface ContinuousStt {
  stop(): void;
  isRunning(): boolean;
}

export function startContinuousStt(
  onResult: (text: string) => void,
  opts: { timeoutMs?: number } = {},
): ContinuousStt {
  const bin = process.env.PREFIX ? `${process.env.PREFIX}/bin/termux-speech-to-text` : 'termux-speech-to-text';
  let running = true;
  let child: ChildProcess | undefined;
  let timer: NodeJS.Timeout | undefined;
  let out = '';

  const cleanup = (): void => {
    running = false;
    if (timer) clearTimeout(timer);
    try { child?.kill(); } catch { /* already gone */ }
  };

  const listen = (): void => {
    if (!running) return;
    out = '';
    try {
      child = spawn(bin, [], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      cleanup();
      return;
    }

    timer = setTimeout(() => {
      // No speech in this window — restart
      try { child?.kill(); } catch { /* already gone */ }
      if (running) listen();
    }, opts.timeoutMs ?? 30_000);

    child.stdout?.on('data', (b: Buffer) => {
      out += b.toString();
      const line = out.split('\n').map((s) => s.trim()).filter(Boolean)[0];
      if (line) {
        if (timer) clearTimeout(timer);
        onResult(line);
        try { child?.kill(); } catch { /* already gone */ }
        if (running) listen();
      }
    });

    child.on('close', () => {
      if (running) listen();
    });

    child.on('error', () => {
      cleanup();
    });
  };

  listen();

  return {
    stop: cleanup,
    isRunning: () => running,
  };
}
