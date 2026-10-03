import { log } from '../core/logger.js';
import { bus } from '../gateway/events.js';
import { ChannelOnMessage } from './api.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';

/**
 * Slack channel (optional, requires @slack/bolt — no bundled dependency).
 * Off by default: set channels.slack.enabled = true.
 *
 * Route + reply + offline outbox, exactly like the Telegram channel.
 * `app` is the test seam: with it injected, nothing is imported and no socket
 * is opened, so the routing and allowlist rules are testable without Slack.
 */

export interface SlackCfg {
  enabled: boolean;
  botToken: string;
  appToken: string;
  allowedChannels: string[];
  allowedUsers: string[];
}

export interface SlackMessageLike {
  subtype?: string;
  channel: string;
  user: string;
  text?: string;
  bot_id?: string;
}

export interface SlackAppLike {
  message(handler: (args: { message: SlackMessageLike; say: (text: string) => Promise<unknown> }) => void | Promise<void>): void;
  start(): Promise<unknown>;
  client?: { chat: { postMessage: (args: { channel: string; text: string }) => Promise<unknown> } };
  stop?: () => Promise<unknown>;
}

export interface SlackDeps {
  cfg: SlackCfg;
  onMessage: ChannelOnMessage;
  app?: SlackAppLike;
}

export class SlackChannel {
  private running = false;
  private app: SlackAppLike | null = null;

  constructor(private readonly deps: SlackDeps) {
    this.app = deps.app ?? null;
  }

  async start(): Promise<void> {
    const { cfg } = this.deps;
    if (!cfg.enabled || !cfg.botToken || !cfg.appToken) {
      log.warn('slack: not enabled or missing tokens — channel off');
      return;
    }
    try {
      let app = this.deps.app;
      if (!app) {
        const mod = '@slack/bolt';
        const { App } = (await import(mod)) as unknown as {
          App: new (opts: { token: string; appToken: string; socketMode: boolean }) => SlackAppLike;
        };
        app = new App({ token: cfg.botToken, appToken: cfg.appToken, socketMode: true });
      }
      app.message(async ({ message, say }) => {
        await this.handleMessage(message, say);
      });
      await app.start();
      this.app = app;
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

  /** Returns the reply it sent, or null when the message was ignored. */
  async handleMessage(message: SlackMessageLike, say: (text: string) => Promise<unknown>): Promise<string | null> {
    const { cfg } = this.deps;
    if (message.subtype || message.bot_id) return null;
    if (cfg.allowedChannels.length > 0 && !cfg.allowedChannels.includes(message.channel)) return null;
    if (cfg.allowedUsers.length > 0 && !cfg.allowedUsers.includes(message.user)) return null;

    const text = message.text ?? '';
    bus.emit({ type: 'slack:message', user: message.user, text, channel: message.channel });
    let reply: string;
    try {
      reply = await this.deps.onMessage(message.user, message.channel, text, message.user);
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reply) await say(reply);
    return reply || null;
  }

  async send(channelId: string, text: string): Promise<void> {
    try {
      await this.rawSend(channelId, text);
    } catch (err) {
      outboxPush({ channel: 'slack', chatId: channelId, text, error: err instanceof Error ? err.message : String(err) });
      log.warn('slack send failed, queuing to outbox:', err instanceof Error ? err.message : err);
    }
  }

  private async rawSend(channelId: string, text: string): Promise<void> {
    const post = this.app?.client?.chat?.postMessage;
    if (typeof post !== 'function') throw new Error('slack: no app connected yet');
    await post.call(this.app?.client?.chat, { channel: channelId, text });
  }

  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('slack')) {
      outboxMarkSending(item.id);
      try {
        await this.rawSend(String(item.chatId), item.text);
        outboxAck(item.id);
        sent++;
      } catch (err) {
        outboxFail(item.id, err instanceof Error ? err.message : String(err));
      }
    }
    return sent;
  }

  async stop(): Promise<void> {
    this.running = false;
    try {
      await this.app?.stop?.();
    } catch {
      /* already gone */
    }
  }
}
