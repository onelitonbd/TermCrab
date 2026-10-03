import fs from 'node:fs';
import path from 'node:path';
import { TelegramApi } from './api.js';
import { log } from '../core/logger.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';
import { escapeHtml, mdToTelegramHtml } from './markdown.js';
import {
  acceptIncoming,
  DEFAULT_MAX_FILE_MB,
  describeIncoming,
  safeFileName,
  saveIncoming,
  type IncomingFile,
  type SavedFile,
} from './media.js';

export { escapeHtml };

export interface TelegramCfg {
  token: string;
  allowedUserIds: number[];
  notifyChatId?: number;
  /** `mention` (default) answers in groups only when the bot is addressed. */
  groupPolicy?: 'mention' | 'all';
  /** Largest file accepted from a chat (MB). */
  maxFileMb?: number;
}

export interface TelegramDeps {
  cfg: TelegramCfg;
  onMessage: (userId: number, chatId: number, text: string, displayName: string) => Promise<string>;
  getOffset: () => number;
  setOffset: (n: number) => void;
  /** Test seam: the real API client is built from cfg.token. */
  api?: Pick<TelegramApi, 'sendMessage' | 'getUpdates' | 'getMe'> &
    Partial<Pick<TelegramApi, 'sendChatAction' | 'getFile' | 'downloadFile' | 'sendDocument'>>;
  /** Test seam: where an incoming file lands (default: workspace/inbox). */
  saveFile?: (file: IncomingFile) => Promise<SavedFile> | SavedFile;
}

/** Telegram forgets a typing indicator after ~5s, so long turns re-send it. */
export const TYPING_REFRESH_MS = 4000;

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
    this.api = (deps.api ?? new TelegramApi(deps.cfg.token)) as TelegramApi;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.learnSelf(); // so a group mention can be recognised
    this.loopPromise = this.loop().catch((err) => {
      log.error('telegram loop died:', err instanceof Error ? err.message : err);
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.loopPromise;
  }

  /** Deliver with chunking + markdown rendering; throws on failure (used by flush).
   *  Chunks are cut from the raw markdown first, then translated per chunk.
   *  If Telegram rejects the translated HTML, the chunk is retried as plain
   *  escaped text so a reply can never be lost to a formatting edge case. */
  private async deliver(chatId: number, text: string): Promise<void> {
    for (const chunk of chunkText(text, 3400)) {
      try {
        await this.api.sendMessage(chatId, mdToTelegramHtml(chunk));
      } catch (err) {
        log.warn('telegram html send failed, retrying as plain text:', err instanceof Error ? err.message : err);
        await this.api.sendMessage(chatId, escapeHtml(chunk));
      }
      this.backoffMs = 1000;
    }
  }

  /** Send a local file (15.2). Failures keep the file for the outbox flush. */
  async sendDocument(chatId: number, filePath: string, caption?: string): Promise<void> {
    try {
      await this.rawSendDocument(chatId, filePath, caption);
    } catch (err) {
      outboxPush({ channel: 'telegram', chatId, text: caption ?? '', file: filePath, error: err instanceof Error ? err.message : String(err) });
      log.warn('telegram document send failed, queuing to outbox:', err instanceof Error ? err.message : err);
    }
  }

  private async rawSendDocument(chatId: number, filePath: string, caption?: string): Promise<void> {
    const send = (this.api as Partial<TelegramApi>).sendDocument;
    if (typeof send !== 'function') throw new Error('this telegram client cannot send documents');
    const bytes = fs.readFileSync(filePath);
    if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Telegram bots may send at most 20 MB');
    await send.call(this.api, chatId, safeFileName(path.basename(filePath), 'file'), bytes, caption);
  }

  /** Queue-safe send with outbox fallback (mobile networks drop packets). */
  async send(chatId: number, text: string): Promise<void> {
    try {
      await this.deliver(chatId, text);
    } catch (err) {
      const item = outboxPush({ channel: 'telegram', chatId, text, error: err instanceof Error ? err.message : String(err) });
      log.warn('telegram send failed, queuing to outbox:', err instanceof Error ? err.message : err);
      void item;
    }
  }

  /**
   * Retry queued replies. Each item is claimed, sent, then acked — a crash
   * between the send and the ack can repeat one message, a crash before the
   * send repeats none that were already delivered (see mobile/outbox.ts).
   */
  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('telegram')) {
      outboxMarkSending(item.id);
      try {
        if (item.file) {
          const caption = item.text.trim() ? item.text : undefined;
          await this.rawSendDocument(Number(item.chatId), item.file, caption);
        } else {
          await this.deliver(Number(item.chatId), item.text);
        }
        outboxAck(item.id);
        sent++;
      } catch (err) {
        outboxFail(item.id, err instanceof Error ? err.message : String(err));
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
    // Knowing our own @username first: a group message that mentions us must be
    // recognised on the very first poll, not a second later.
    await this.learnSelf();
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

  /**
   * Show "typing…" while the agent works, and stop the moment the reply is
   * ready (13.1). Best effort by design: a chat that blocks the indicator
   * must never cost a reply or an inbound message.
   */
  private async withTyping<T>(chatId: number, fn: () => Promise<T>): Promise<T> {
    const send = (this.api as Partial<TelegramApi>).sendChatAction;
    if (typeof send !== 'function') return fn();
    const tick = (): void => {
      void Promise.resolve()
        .then(() => send.call(this.api, chatId, 'typing'))
        .catch((err) => log.debug('telegram typing indicator failed:', err instanceof Error ? err.message : err));
    };
    tick();
    const timer = setInterval(tick, TYPING_REFRESH_MS);
    timer.unref?.();
    try {
      return await fn();
    } finally {
      clearInterval(timer);
    }
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message;
    if (!msg) return;
    const userId = msg.from?.id ?? 0;
    const chatId = msg.chat.id;
    const name = msg.from?.username || msg.from?.first_name || String(userId);

    if (this.deps.cfg.allowedUserIds.length > 0 && !this.deps.cfg.allowedUserIds.includes(userId)) {
      log.warn(`telegram: rejected message from non-allowlisted user ${userId}`);
      await this.send(chatId, '🔒 Not authorized. Ask the device owner to add your user id to the allowlist.');
      return;
    }

    // 15.1: a photo, a voice note or a document becomes a file in the inbox and
    // a sentence the agent can act on. A refused file gets a sentence back.
    if (!msg.text && (msg.photo?.length || msg.document || msg.voice)) {
      const incoming = await this.fetchIncoming(msg);
      if (!incoming.ok) {
        await this.send(chatId, `📎 I did not take that file: ${incoming.reason}`);
        return;
      }
      let question: string;
      try {
        question = await this.withTyping(chatId, () => this.deps.onMessage(userId, chatId, incoming.text, name));
      } catch (err) {
        question = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
      }
      if (question) await this.send(chatId, question);
      return;
    }

    if (!msg.text) return;
    const text = msg.text.trim();

    // 15.3: in a group the bot stays quiet unless it is addressed, unless the
    // owner asked for everything (channels.telegram.groupPolicy = "all").
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
      const policy = this.deps.cfg.groupPolicy ?? 'mention';
      const mention = this.selfMention(text);
      // A reply to one of our own messages counts as addressing us, and then
      // there is nothing to strip — hence a boolean, not a match.
      const addressed = Boolean(mention) || this.isReplyToSelf(msg);
      if (policy !== 'all' && !addressed) return;
      const stripped = mention ? text.replace(mention, ' ').trim() : text;
      let reply: string;
      try {
        reply = await this.withTyping(chatId, () =>
          this.deps.onMessage(userId, chatId, stripped || text, name),
        );
      } catch (err) {
        reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
      }
      if (reply) await this.send(chatId, reply);
      return;
    }

    let reply: string;
    try {
      reply = await this.withTyping(chatId, () => this.deps.onMessage(userId, chatId, text, name));
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reply) await this.send(chatId, reply);
  }

  /** `@ourbot` (or `/cmd@ourbot`) as written in the message, if present. */
  private selfMention(text: string): string | null {
    const username = this.botUsername;
    if (!username) return null;
    const at = new RegExp(`@${username}\\b`, 'i');
    const m = text.match(at);
    return m ? m[0] : null;
  }

  /** Is this message a reply to one of the bot's own messages? */
  private isReplyToSelf(msg: TelegramUpdate['message']): boolean {
    const author = msg?.reply_to_message?.from;
    if (!author) return false;
    const botId = this.botId;
    if (botId && author.id === botId) return true;
    return Boolean(this.botUsername && (author.username ?? '').toLowerCase() === this.botUsername.toLowerCase());
  }

  private get botUsername(): string {
    return (this.me?.username ?? '').toLowerCase();
  }

  private get botId(): number | 0 {
    return this.me?.id ?? 0;
  }

  /** Who am I (needed to notice a mention). Cached; failures keep it unknown. */
  private me: { username?: string; id?: number } | null = null;
  private mePromise: Promise<void> | null = null;

  private async learnSelf(): Promise<void> {
    if (this.me) return;
    if (this.mePromise) return this.mePromise;
    this.mePromise = this.api
      .getMe()
      .then((me) => {
        this.me = me;
      })
      .catch(() => {
        /* private chats do not need this */
      });
    return this.mePromise;
  }

  /** Download an incoming file through getFile, or explain why it was refused. */
  private async fetchIncoming(msg: TelegramUpdate['message']): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
    const maxMb = this.deps.cfg.maxFileMb ?? DEFAULT_MAX_FILE_MB;
    const api = this.api as Partial<TelegramApi>;
    const photo = msg!.photo?.length ? msg!.photo[msg!.photo.length - 1]! : null;
    const doc = msg!.document ?? null;
    const voice = msg!.voice ?? null;
    const pick = photo
      ? { id: photo.file_id, size: photo.file_size ?? 0, name: `photo-${Date.now()}.jpg`, kind: 'photo' as const, mime: 'image/jpeg' }
      : doc
        ? { id: doc.file_id, size: doc.file_size ?? 0, name: doc.file_name ?? `document-${Date.now()}`, kind: 'document' as const, mime: doc.mime_type }
        : { id: voice!.file_id, size: voice!.file_size ?? 0, name: `voice-${Date.now()}.ogg`, kind: 'audio' as const, mime: 'audio/ogg' };

    const allowed = acceptIncoming({ name: pick.name, size: pick.size }, maxMb);
    if (!allowed.ok) return { ok: false, reason: allowed.reason ?? 'not accepted' };
    if (typeof api.getFile !== 'function' || typeof api.downloadFile !== 'function') {
      return { ok: false, reason: 'this telegram client cannot download files' };
    }
    try {
      const info = await api.getFile(pick.id);
      if (!info.file_path) return { ok: false, reason: 'Telegram did not say where the file is' };
      const bytes = await api.downloadFile(info.file_path, maxMb * 1024 * 1024);
      const save = this.deps.saveFile ?? saveIncoming;
      const saved = await save({ name: pick.name, bytes, kind: pick.kind, mimeType: pick.mime, caption: msg!.caption });
      return { ok: true, text: describeIncoming(saved, { kind: pick.kind, caption: msg!.caption }) };
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    caption?: string;
    chat: { id: number; type?: string };
    from?: { id: number; username?: string; first_name?: string };
    reply_to_message?: { from?: { id: number; username?: string; is_bot?: boolean } };
    photo?: { file_id: string; file_size?: number; width?: number; height?: number }[];
    document?: { file_id: string; file_name?: string; mime_type?: string; file_size?: number };
    voice?: { file_id: string; file_size?: number; mime_type?: string };
  };
}

/**
 * Multi-agent routing: "@brief do the thing" -> agent "brief" (if known).
 * Returns the stripped text and the resolved agent name (if any).
 */
export function parseAgentPrefix(text: string, knownAgents: string[]): { agent: string | null; text: string } {
  const m = text.trim().match(/^@([a-zA-Z0-9][a-zA-Z0-9-_]{0,63})(\s+|$)/);
  if (!m) return { agent: null, text };
  const candidate = m[1]!.toLowerCase();
  if (!knownAgents.includes(candidate)) return { agent: null, text };
  return { agent: candidate, text: text.trim().slice(m[0].length).trim() || text };
}
