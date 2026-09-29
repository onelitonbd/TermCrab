import { spawn, ChildProcess } from 'node:child_process';

export interface ListenResult {
  ok: boolean;
  text?: string;
  error?: string;
}

/**
 * One-shot speech-to-text for the web panel's 🎤 button.
 * Uses Termux:API `termux-speech-to-text` (first recognized line wins).
 * Never throws; always settles — missing tool / silence / timeout become
 * friendly errors the UI can show as-is.
 */
export function listenOnce(timeoutMs = 30_000): Promise<ListenResult> {
  return new Promise((resolve) => {
    let child: ChildProcess | undefined;
    let timer: NodeJS.Timeout | undefined;
    let settled = false;
    let out = '';

    const finish = (r: ListenResult): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try {
        child?.kill();
      } catch {
        /* already gone */
      }
      resolve(r);
    };

    try {
      child = spawn('termux-speech-to-text', [], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      resolve({
        ok: false,
        error: `speech-to-text failed to start: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    timer = setTimeout(() => {
      finish({ ok: false, error: 'nothing heard (waited 30s) — tap Listen and speak again' });
    }, timeoutMs);

    const firstLine = (): string =>
      out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)[0] ?? '';

    child.stdout?.on('data', (b: Buffer) => {
      out += b.toString();
      const line = firstLine();
      if (line) finish({ ok: true, text: line });
    });

    child.on('error', (err: NodeJS.ErrnoException) => {
      finish({
        ok: false,
        error:
          err.code === 'ENOENT'
            ? 'dictation tool not available — install: pkg install termux-api (+ the Termux:API app from F-Droid)'
            : `dictation failed: ${err.message}`,
      });
    });

    child.on('close', () => {
      const line = firstLine();
      if (line) finish({ ok: true, text: line });
      else finish({ ok: false, error: 'no speech recognized — try again' });
    });
  });
}
