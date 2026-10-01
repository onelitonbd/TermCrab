import { log } from '../core/logger.js';

/**
 * Discord channel (optional, requires discord.js).
 * Off by default — enable in config: channels.discord.enabled = true
 */

export interface DiscordCfg {
  enabled: boolean;
  token: string;
  allowedGuilds: string[];
  allowedUsers: string[];
}

export class DiscordChannel {
  private running = false;

  constructor(private readonly cfg: DiscordCfg) {}

  async start(): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.token) {
      log.warn('discord: not enabled or no token — channel off');
      return;
    }
    try {
      // Dynamic import — only loads discord.js if installed
      // Use a variable module name so TypeScript can't statically resolve it
      const mod = 'discord.js';
      const { Client, GatewayIntentBits } = await import(mod) as unknown as {
        Client: new (opts: { intents: unknown[] }) => {
          on: (event: string, handler: (msg: { author: { bot: boolean; id: string; username: string }; guildId: string | null; content: string; channelId: string; reply: (text: string) => Promise<void> }) => Promise<void>) => void;
          login: (token: string) => Promise<void>;
        };
        GatewayIntentBits: Record<string, unknown>;
      };
      const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      });

      client.on('messageCreate', async (msg: { author: { bot: boolean; id: string; username: string }; guildId: string | null; content: string; channelId: string; reply: (text: string) => Promise<void> }) => {
        if (msg.author.bot) return;
        if (this.cfg.allowedGuilds.length > 0 && !this.cfg.allowedGuilds.includes(msg.guildId ?? '')) return;
        if (this.cfg.allowedUsers.length > 0 && !this.cfg.allowedUsers.includes(msg.author.id)) return;

        // Route to agent
        const { bus } = await import('../gateway/events.js');
        bus.emit({ type: 'discord:message', author: msg.author.username, text: msg.content, channel: msg.channelId });

        // Reply
        const reply = `Echo: ${msg.content}`; // TODO: route to agent
        await msg.reply(reply);
      });

      await client.login(this.cfg.token);
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

  stop(): void {
    this.running = false;
  }
}
