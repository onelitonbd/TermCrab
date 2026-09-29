import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { log } from '../core/logger.js';

/**
 * Voice wake loop for Termux.
 *
 * Honest scope: this is an STT session loop (termux-speech-to-text), not an
 * always-on DSP wakeword - that would drain the battery. You start it, say the
 * keyword + command, get a spoken reply. Best while plugged in.
 */

export type WakeEvent =
  | { type: 'idle' }
  | { type: 'wake'; keyword: string }
  | { type: 'command'; text: string }
  | { type: 'silence' };

/** Two-phase state machine: keyword arms it, next utterance is the command. */
export class WakeSession {
  private armed = false;

  constructor(private readonly keyword: string) {}

  get isArmed(): boolean {
    return this.armed;
  }

  feed(rawLine: string): WakeEvent {
    const line = rawLine.trim();
    if (!line) return { type: 'silence' };
    const lower = line.toLowerCase();
    const kw = this.keyword.toLowerCase();

    if (!this.armed) {
      const idx = lower.indexOf(kw);
      if (idx === -1) return { type: 'idle' };
      this.armed = true;
      const rest = line.slice(idx + kw.length).replace(/^[\s,.!?]+/, '').trim();
      if (rest) {
        // keyword + command in one breath
        this.armed = false;
        return { type: 'command', text: rest };
      }
      return { type: 'wake', keyword: this.keyword };
    }

    // Armed: this utterance is the command (any text)
    this.armed = false;
    return { type: 'command', text: line };
  }

  disarm(): void {
    this.armed = false;
  }
}

export interface WakeLoopOpts {
  keyword: string;
  /** Called with each recognized command; return a reply to speak. */
  onCommand: (text: string) => Promise<string>;
  /** Speak a reply (defaults to log). */
  speak?: (text: string) => Promise<void>;
  /** Injected stream for tests; defaults to termux-speech-to-text stdout. */
  input?: NodeJS.ReadableStream;
  /** Injected process spawner for tests. */
  spawnStt?: () => NodeJS.ReadableStream;
}

function defaultSpawnStt(): NodeJS.ReadableStream {
  // termux-speech-to-text streams recognized lines to stdout until killed
  const child = spawn('termux-speech-to-text', [], { stdio: ['ignore', 'pipe', 'pipe'] });
  child.stderr?.on('data', (b: Buffer) => log.debug('stt stderr:', b.toString().trim()));
  child.on('error', (err: NodeJS.ErrnoException) => {
    // Missing binary (ENOENT) etc. - end the stream so runWakeLoop exits cleanly.
    log.error(
      `speech-to-text unavailable: ${err.message}`,
      err.code === 'ENOENT' ? '(pkg install termux-api + Termux:API app)' : '',
    );
    try {
      child.stdout?.push(null);
    } catch {
      /* already closed */
    }
  });
  return child.stdout as NodeJS.ReadableStream;
}

/**
 * Run the wake loop until the stream closes or abort() is called.
 * Returns when the input ends (Ctrl+C in the CLI wrapper stops the child).
 */
export async function runWakeLoop(opts: WakeLoopOpts): Promise<{ commands: number }> {
  const session = new WakeSession(opts.keyword);
  const speak = opts.speak ?? (async (t: string) => log.info(`🔊 ${t}`));
  const stream = opts.input ?? opts.spawnStt?.() ?? defaultSpawnStt();
  let commands = 0;

  await new Promise<void>((resolve) => {
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => {
      const ev = session.feed(line);
      if (ev.type === 'wake') {
        log.info(`👂 say your command (keyword was "${ev.keyword}")`);
        void speak('Yes?');
        return;
      }
      if (ev.type === 'command') {
        commands++;
        void (async () => {
          try {
            const reply = await opts.onCommand(ev.text);
            if (reply) await speak(reply);
          } catch (err) {
            log.error('wake command failed:', err instanceof Error ? err.message : err);
          }
        })();
      }
    });
    rl.on('close', () => resolve());
  });

  return { commands };
}
