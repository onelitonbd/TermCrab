import { log } from '../core/logger.js';

/**
 * Slack channel (optional, requires @slack/bolt).
 * Off by default — enable in config: channels.slack.enabled = true
 */

export interface SlackCfg {
  enabled: boolean;
  botToken: string;
  appToken: string;
  allowedChannels: string[];
  allowedUsers: string[];
}

export class SlackChannel {
  private running = false;

  constructor(private readonly cfg: SlackCfg) {}

  async start(): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.botToken || !this.cfg.appToken) {
      log.warn('slack: not enabled or missing tokens — channel off');
      return;
    }
    try {
      const mod = '@slack/bolt';
      const { App } = await import(mod) as unknown as { App: new (opts: { token: string; appToken: string; socketMode: boolean }) => {
        message(handler: (args: { message: { subtype?: string; channel: string; user: string; text?: string }; say: (text: string) => Promise<void> }) => Promise<void>): void;
        start(): Promise<void>;
      } };
      const app = new App({
        token: this.cfg.botToken,
        appToken: this.cfg.appToken,
        socketMode: true,
      });

      app.message(async ({ message, say }) => {
        if (message.subtype) return;
        if (this.cfg.allowedChannels.length > 0 && !this.cfg.allowedChannels.includes(message.channel)) return;
        if (this.cfg.allowedUsers.length > 0 && !this.cfg.allowedUsers.includes(message.user)) return;

        // Route to agent
        const { bus } = await import('../gateway/events.js');
        bus.emit({ type: 'slack:message', user: message.user, text: message.text, channel: message.channel });

        // Reply
        await say(`Echo: ${message.text}`); // TODO: route to agent
      });

      await app.start();
      this.running = true;
      log.info('slack: channel started');
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        log.warn('slack: @slack/bolt not installed — channel off. Install: npm install @slack/bolt');
      } else {
        log.warn('slack: failed to start:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  stop(): void {
    this.running = false;
  }
}
