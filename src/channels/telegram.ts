import { TelegramApi } from './api.js';
import { log } from '../core/logger.js';
import { outboxPush, OutboxItem } from '../mobile/outbox.js';

export interface TelegramCfg {
  token: string;
  allowedUserIds: number[];
  notifyChatId?: number;
}

export interface TelegramDeps {
  cfg: TelegramCfg;
  onMessage: (userId: number, chatId: number, text: string, displayName: string) => Promise<string>;
  getOffset: () => number;
  setOffset: (n: number) => void;
}

/** Escape for Telegram HTML parse mode. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function chunkText(text: string, size = 3900): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.5) cut = size;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.trim()) chunks.push(rest);
  return chunks;
}

export class TelegramChannel {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private readonly api: TelegramApi;
  private backoffMs = 1000;

  constructor(private readonly deps: TelegramDeps) {
    this.api = new TelegramApi(deps.cfg.token);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loopPromise = this.loop().catch((err) => {
      log.error('telegram loop died:', err instanceof Error ? err.message : err);
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loopPromise;
  }

  /** Queue-safe send with outbox fallback (mobile networks drop packets). */
  async send(chatId: number, text: string): Promise<void> {
    for (const chunk of chunkText(text)) {
      try {
        await this.api.sendMessage(chatId, escapeHtml(chunk));
        this.backoffMs = 1000;
      } catch (err) {
        log.warn('telegram send failed, queuing to outbox:', err instanceof Error ? err.message : err);
        const item: OutboxItem = { channel: 'telegram', chatId, text: chunk, ts: Date.now(), attempts: 1 };
        outboxPush(item);
      }
    }
  }

  async flushOutbox(take: () => OutboxItem[]): Promise<number> {
    const items = take();
    let sent = 0;
    for (const item of items) {
      try {
        await this.api.sendMessage(item.chatId, escapeHtml(item.text));
        sent++;
      } catch {
        outboxPush({ ...item, attempts: item.attempts + 1 });
      }
    }
    return sent;
  }

  async verify(): Promise<{ ok: boolean; username?: string; error?: string }> {
    try {
      const me = await this.api.getMe();
      return { ok: true, username: me.username };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private async loop(): Promise<void> {
    log.info('telegram channel: long-poll started');
    while (this.running) {
      try {
        const updates = await this.api.getUpdates(this.deps.getOffset(), 50);
        this.backoffMs = 1000;
        for (const upd of updates) {
          this.deps.setOffset(upd.update_id + 1);
          await this.handleUpdate(upd);
        }
      } catch (err) {
        if (!this.running) break;
        log.warn(`telegram poll error (retry in ${this.backoffMs}ms):`, err instanceof Error ? err.message : err);
        await new Promise((r) => setTimeout(r, this.backoffMs));
        this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
      }
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg || !msg.text) return;
    const userId = msg.from?.id ?? 0;
    const chatId = msg.chat.id;
    const name = msg.from?.username || msg.from?.first_name || String(userId);

    if (this.deps.cfg.allowedUserIds.length > 0 && !this.deps.cfg.allowedUserIds.includes(userId)) {
      log.warn(`telegram: rejected message from non-allowlisted user ${userId}`);
      await this.send(chatId, '🔒 Not authorized. Ask the device owner to add your user id to the allowlist.');
      return;
    }

    const text = msg.text.trim();
    let reply: string;
    try {
      reply = await this.deps.onMessage(userId, chatId, text, name);
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reply) await this.send(chatId, reply);
  }
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type?: string };
    from?: { id: number; username?: string; first_name?: string };
  };
}
