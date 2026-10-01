import { log } from '../core/logger.js';

/**
 * SMS/MMS channel (optional, requires Twilio).
 * Off by default — enable in config: channels.sms.enabled = true
 */

export interface SmsCfg {
  enabled: boolean;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  allowedNumbers: string[];
}

export class SmsChannel {
  private running = false;

  constructor(private readonly cfg: SmsCfg) {}

  async start(): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.accountSid) {
      log.warn('sms: not enabled or missing config — channel off');
      return;
    }
    try {
      // Twilio webhook would be set up here
      this.running = true;
      log.info('sms: channel started');
    } catch (err) {
      log.warn('sms: failed to start:', err instanceof Error ? err.message : String(err));
    }
  }

  stop(): void {
    this.running = false;
  }
}
