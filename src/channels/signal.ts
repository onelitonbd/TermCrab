import { log } from '../core/logger.js';
import { spawn, ChildProcess } from 'node:child_process';

/**
 * Signal channel (optional, requires signal-cli).
 * Off by default — enable in config: channels.signal.enabled = true
 */

export interface SignalCfg {
  enabled: boolean;
  phoneNumber: string;
  allowedNumbers: string[];
}

export class SignalChannel {
  private running = false;
  private child: ChildProcess | null = null;

  constructor(private readonly cfg: SignalCfg) {}

  async start(): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.phoneNumber) {
      log.warn('signal: not enabled or no phone number — channel off');
      return;
    }
    try {
      // signal-cli daemon mode
      this.child = spawn('signal-cli', ['-u', this.cfg.phoneNumber, 'daemon', '--json'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      this.running = true;
      log.info('signal: channel started');
    } catch (err) {
      log.warn('signal: failed to start:', err instanceof Error ? err.message : String(err));
    }
  }

  stop(): void {
    this.running = false;
    try { this.child?.kill(); } catch { /* already gone */ }
  }
}
