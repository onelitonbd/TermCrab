import { log } from '../core/logger.js';
import { bus } from '../gateway/events.js';
import { ChannelOnMessage } from './api.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';

/**
 * Discord channel (optional, requires discord.js — no bundled dependency).
 * Off by default: set channels.discord.enabled = true.
 *
 * Inbound messages are routed to the same agent as Telegram/WhatsApp and the
 * answer is sent back; a send that fails is queued in the offline outbox, so a
 * flaky connection does not lose a reply. `client` is the test seam: with it
 * injected, nothing is imported and no socket is opened.
 */

export interface DiscordCfg {
  enabled: boolean;
  token: string;
  allowedGuilds: string[];
  allowedUsers: string[];
}

export interface DiscordMessageLike {
  author: { bot?: boolean; id: string; username?: string };
  guildId?: string | null;
  channelId: string;
  content: string;
  reply: (text: string) => Promise<unknown>;
}

export interface DiscordClientLike {
  on(event: 'messageCreate', handler: (msg: DiscordMessageLike) => void | Promise<void>): void;
  login(token: string): Promise<unknown>;
  destroy?: () => void;
  /** Proactive send (conversations_* tools + outbox flush). */
  sendTo?: (channelId: string, text: string) => Promise<unknown>;
}

export interface DiscordDeps {
  cfg: DiscordCfg;
  onMessage: ChannelOnMessage;
  client?: DiscordClientLike;
}

async function loadDiscordJs(): Promise<DiscordClientLike> {
  // A variable specifier keeps TypeScript from resolving an optional dep.
  const mod = 'discord.js';
  const { Client, GatewayIntentBits } = (await import(mod)) as unknown as {
    Client: new (opts: { intents: unknown[] }) => {
      on: (event: string, handler: (msg: DiscordMessageLike) => void) => void;
      login: (token: string) => Promise<unknown>;
      destroy?: () => void;
      channels: { fetch: (id: string) => Promise<{ send: (text: string) => Promise<unknown> } | null> };
    };
    GatewayIntentBits: Record<string, unknown>;
  };
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });
  return {
    on: (event, handler) => client.on(event, handler),
    login: (token) => client.login(token),
    destroy: () => client.destroy?.(),
    sendTo: async (channelId, text) => {
      const channel = await client.channels.fetch(channelId);
      if (!channel) throw new Error(`discord: channel ${channelId} not found`);
      await channel.send(text);
    },
  };
}

export class DiscordChannel {
  private running = false;
  private client: DiscordClientLike | null = null;
  private backoffMs = 1000;

  constructor(private readonly deps: DiscordDeps) {
    this.client = deps.client ?? null;
  }

  async start(): Promise<void> {
    const { cfg } = this.deps;
    if (!cfg.enabled || !cfg.token) {
      log.warn('discord: not enabled or no token — channel off');
      return;
    }
    try {
      this.client = this.deps.client ?? (await loadDiscordJs());
      this.client.on('messageCreate', (msg) => {
        void this.handleMessage(msg).catch((err) =>
          log.warn('discord: handler failed:', err instanceof Error ? err.message : err),
        );
      });
      await this.client.login(cfg.token);
      this.running = true;
      log.info('discord: channel started');
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        log.warn('discord: discord.js not installed — channel off. Install: npm install discord.js');
      } else {
        log.warn('discord: failed to start:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  /** Returns the reply it sent, or null when the message was ignored. */
  async handleMessage(msg: DiscordMessageLike): Promise<string | null> {
    const { cfg } = this.deps;
    if (msg.author?.bot) return null;
    if (cfg.allowedGuilds.length > 0 && !cfg.allowedGuilds.includes(msg.guildId ?? '')) return null;
    if (cfg.allowedUsers.length > 0 && !cfg.allowedUsers.includes(msg.author.id)) return null;

    bus.emit({ type: 'discord:message', author: msg.author.username, text: msg.content, channel: msg.channelId });
    let reply: string;
    try {
      reply = await this.deps.onMessage(msg.author.id, msg.channelId, msg.content, msg.author.username ?? msg.author.id);
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reply) await msg.reply(reply);
    return reply || null;
  }

  /** Send now, or keep the text for later (mobile networks drop packets). */
  async send(channelId: string, text: string): Promise<void> {
    try {
      await this.rawSend(channelId, text);
      this.backoffMs = 1000;
    } catch (err) {
      outboxPush({ channel: 'discord', chatId: channelId, text, error: err instanceof Error ? err.message : String(err) });
      log.warn('discord send failed, queuing to outbox:', err instanceof Error ? err.message : err);
    }
  }

  private async rawSend(channelId: string, text: string): Promise<void> {
    const client = this.client;
    if (!client?.sendTo) throw new Error('discord: no client connected yet');
    await client.sendTo(channelId, text);
  }

  /** Retry queued replies: claim, send, ack (at-least-once, acked exactly once). */
  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('discord')) {
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

  stop(): void {
    this.running = false;
    try {
      this.client?.destroy?.();
    } catch {
      /* already gone */
    }
  }
}
