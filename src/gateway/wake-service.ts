import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { WakeSession } from '../mobile/wake.js';
import { execExists } from '../mobile/doctor.js';
import { log } from '../core/logger.js';

/**
 * Gateway-side wake loop: the same two-phase state machine as the CLI
 * (`termcrab wake`), but running inside the gateway so the control UI can
 * start/stop it and watch it live over SSE.
 *
 * Honest scope (unchanged): this is an STT session loop (termux-speech-to-text),
 * not an always-on DSP wakeword. Text feed (`feed()`) gives the same state
 * machine to people without a mic (desktop, browsers, tests).
 */

export type WakeState = 'wake' | 'command' | 'reply' | 'error' | 'started' | 'stopped';

export interface WakeEventOut {
  type: 'wake';
  state: WakeState;
  /** keyword heard / configured keyword */
  keyword?: string;
  /** the spoken/typed command */
  text?: string;
  /** final reply for a command */
  reply?: string;
  /** friendly error message */
  error?: string;
}

export interface WakeServiceOpts {
  /** Called with each recognized command; return the reply text. */
  onCommand: (text: string) => Promise<string>;
  /** Speak a reply (best-effort; failures must not kill the loop). */
  speak?: (text: string) => Promise<void>;
  /** Push an event to subscribers (SSE bus). */
  emit: (ev: WakeEventOut) => void;
}

export interface WakeStatus {
  running: boolean;
  micReady: boolean;
  keyword: string;
  armed: boolean;
  commands: number;
}

export class WakeService {
  private child: ReturnType<typeof spawn> | null = null;
  private session: WakeSession | null = null;
  private running = false;
  private micReady = false;
  private keyword = 'crab';
  private commands = 0;

  constructor(private readonly opts: WakeServiceOpts) {}

  status(): WakeStatus {
    return {
      running: this.running,
      micReady: this.micReady,
      keyword: this.keyword,
      armed: this.session?.isArmed ?? false,
      commands: this.commands,
    };
  }

  /** Start the mic loop. Friendly {ok:false,error} when Termux:API is missing. */
  async start(keyword?: string): Promise<{ ok: boolean; error?: string; keyword: string }> {
    if (keyword) this.keyword = keyword;
    if (this.running) return { ok: true, keyword: this.keyword };
    if (!(await execExists('termux-speech-to-text'))) {
      return {
        ok: false,
        error:
          'Voice input is not available here — install it with: pkg install termux-api (plus the Termux:API app from F-Droid). You can still type commands in the box below.',
        keyword: this.keyword,
      };
    }
    this.session = new WakeSession(this.keyword);
    this.commands = 0;
    const child = spawn('termux-speech-to-text', [], { stdio: ['ignore', 'pipe', 'pipe'] });
    this.child = child;
    this.running = true;
    this.micReady = true;
    child.on('error', (err: NodeJS.ErrnoException) => {
      log.error('wake: speech-to-text failed:', err.message);
      this.fail(
        err.code === 'ENOENT'
          ? 'Speech-to-text disappeared — install termux-api (pkg install termux-api).'
          : `Speech-to-text failed: ${err.message}`,
      );
    });
    child.stderr?.on('data', (b: Buffer) => log.debug('wake stt:', b.toString().trim()));
    const rl = readline.createInterface({ input: child.stdout!, crlfDelay: Infinity });
    rl.on('line', (line) => this.handle(line));
    rl.on('close', () => {
      if (this.running && this.child === child) this.fail('Voice session ended (microphone closed).');
    });
    child.stdout?.on('error', () => /* stream killed */ undefined);
    this.opts.emit({ type: 'wake', state: 'started', keyword: this.keyword });
    log.info(`wake loop started in gateway (keyword "${this.keyword}")`);
    return { ok: true, keyword: this.keyword };
  }

  /** Stop the mic loop. Idempotent. */
  stop(): { ok: true } {
    const child = this.child;
    this.child = null;
    this.running = false;
    this.micReady = false;
    if (this.session) this.session.disarm();
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
    }
    this.opts.emit({ type: 'wake', state: 'stopped', keyword: this.keyword });
    return { ok: true };
  }

  /**
   * Feed one utterance through the state machine (text mode — works with or
   * without the mic loop). Returns what happened so the caller can answer
   * synchronously; the command reply itself arrives as a 'reply' event.
   */
  feed(text: string): { ok: true; state: 'wake' | 'command' | 'idle' } {
    this.session ??= new WakeSession(this.keyword);
    const ev = this.session.feed(text);
    this.handleEvent(ev);
    if (ev.type === 'command') return { ok: true, state: 'command' as const };
    if (ev.type === 'wake') return { ok: true, state: 'wake' as const };
    return { ok: true, state: 'idle' as const };
  }

  private handle(line: string): void {
    if (!this.session) return;
    this.handleEvent(this.session.feed(line));
  }

  private handleEvent(ev: ReturnType<WakeSession['feed']>): void {
    if (ev.type === 'wake') {
      this.opts.emit({ type: 'wake', state: 'wake', keyword: ev.keyword });
      void this.opts.speak?.('Yes?').catch(() => undefined);
      return;
    }
    if (ev.type === 'command') {
      this.commands++;
      this.opts.emit({ type: 'wake', state: 'command', text: ev.text });
      void (async () => {
        try {
          const reply = await this.opts.onCommand(ev.text);
          this.opts.emit({ type: 'wake', state: 'reply', text: ev.text, reply });
          if (reply) await this.opts.speak?.(reply);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.error('wake command failed:', msg);
          this.opts.emit({ type: 'wake', state: 'error', error: msg });
        }
      })();
    }
  }

  private fail(error: string): void {
    const wasRunning = this.running;
    this.running = false;
    this.micReady = false;
    const child = this.child;
    this.child = null;
    if (child) {
      try {
        child.kill('SIGTERM');
      } catch {
        /* already gone */
      }
    }
    if (wasRunning) {
      this.opts.emit({ type: 'wake', state: 'error', error });
      this.opts.emit({ type: 'wake', state: 'stopped', keyword: this.keyword });
    }
  }
}
