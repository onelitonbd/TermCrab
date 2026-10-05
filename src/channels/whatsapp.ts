import fs from 'node:fs';
import path from 'node:path';
import { log } from '../core/logger.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';
import { stateDir, home } from '../core/paths.js';

/**
 * WhatsApp channel via Baileys - shipped as an OPTIONAL extension so the TermCrab
 * core keeps zero runtime dependencies. Install with:  npm install baileys
 *
 * Secure defaults (same philosophy as Telegram):
 * - channel does NOT start unless enabled AND an allowlist exists
 * - unknown senders get a lock notice, nothing else
 * - QR pairing printed to the terminal on first start
 */

export interface WhatsAppCfg {
  enabled: boolean;
  allowedJids: string[];
  authDir?: string;
}

export interface WhatsAppDeps {
  cfg: WhatsAppCfg;
  onMessage: (userId: string, chatId: string, text: string, displayName: string) => Promise<string>;
  /** Test seam: provide a fake Baileys module instead of importing the real one. */
  loadModule?: () => Promise<BaileysModule>;
}

/** Minimal structural view of the Baileys API we use (real or fake in tests). */
export interface BaileysSock {
  ev: {
    on(event: string, cb: (data: unknown) => void): void;
  };
  sendMessage(jid: string, content: { text: string }): Promise<unknown>;
}

export interface BaileysModule {
  default: (opts: Record<string, unknown>) => BaileysSock;
  useMultiFileAuthState?: (dir: string) => Promise<{ state: unknown; saveCreds: () => Promise<void> | void }>;
  DisconnectReason?: Record<string, number>;
  fetchLatestBaileysVersion?: () => Promise<{ version: number[] }>;
}

async function importOptional(name: string): Promise<unknown> {
  // Non-literal specifier: resolves at runtime only (baileys is an optional extension).
  const spec = name;
  return import(spec);
}

export async function defaultBaileysLoader(): Promise<BaileysModule> {
  try {
    return (await importOptional('baileys')) as BaileysModule;
  } catch {
    /* fall through */
  }
  try {
    return (await importOptional('@whiskeysockets/baileys')) as BaileysModule;
  } catch {
    throw new Error(
      'WhatsApp is an optional extension. Install it in the TermCrab directory:\n' +
        '  npm install baileys\n' +
        'then restart the gateway. (Core stays dependency-free by design.)',
    );
  }
}

/** Normalize allowlist entries: bare numbers become JIDs. */
export function normalizeAllowed(entries: string[]): string[] {
  return entries
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => (/^\d+$/.test(e) ? `${e}@s.whatsapp.net` : e));
}

export function isAllowedJid(jid: string, allowed: string[]): boolean {
  const list = normalizeAllowed(allowed);
  if (!list.length) return false;
  if (list.includes(jid)) return true;
  // allow matching by bare phone number regardless of @server suffix for DMs
  const bare = jid.split('@')[0] ?? '';
  return list.some((a) => a.split('@')[0] === bare && a.endsWith('@s.whatsapp.net') && jid.endsWith('@s.whatsapp.net'));
}

/** Extract plain text from a Baileys message object. */
export function extractText(message: unknown): string {
  if (!message || typeof message !== 'object') return '';
  const m = message as Record<string, unknown>;
  if (typeof m.conversation === 'string' && m.conversation) return m.conversation;
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext && typeof ext.text === 'string') return ext.text;
  const doc = m.documentWithCaptionMessage as { message?: Record<string, unknown> } | undefined;
  if (doc?.message) return extractText(doc.message);
  const viewOnce = m.viewOnceMessage as { message?: Record<string, unknown> } | undefined;
  if (viewOnce?.message) return extractText(viewOnce.message);
  const image = m.imageMessage as Record<string, unknown> | undefined;
  if (image && typeof image.caption === 'string' && image.caption) return image.caption;
  const video = m.videoMessage as Record<string, unknown> | undefined;
  if (video && typeof video.caption === 'string' && video.caption) return video.caption;
  return '';
}

const CHUNK = 3900;

export class WhatsAppChannel {
  private sock: BaileysSock | null = null;
  private running = false;
  private readonly loader: () => Promise<BaileysModule>;

  constructor(private readonly deps: WhatsAppDeps) {
    this.loader = deps.loadModule ?? defaultBaileysLoader;
  }

  get available(): boolean {
    return this.sock !== null;
  }

  /** Fire-and-forget send: `true` on success, the failure reason otherwise. */
  async trySend(jid: string, text: string): Promise<true | string> {
    if (!this.sock) return 'not connected';
    try {
      for (let i = 0; i < text.length; i += CHUNK) {
        await this.sock.sendMessage(jid, { text: text.slice(i, i + CHUNK) });
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.warn('whatsapp send failed:', message);
      return message;
    }
  }

  /** Send with outbox fallback (mobile networks drop packets). */
  async send(jid: string, text: string): Promise<void> {
    const result = await this.trySend(jid, text);
    if (result === true) return;
    outboxPush({ channel: 'whatsapp', chatId: jid, text, error: result });
  }

  /** Retry queued whatsapp items; called by the gateway's outbox flusher. */
  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('whatsapp')) {
      outboxMarkSending(item.id);
      const result = await this.trySend(String(item.chatId), item.text);
      if (result === true) {
        outboxAck(item.id);
        sent++;
      } else {
        outboxFail(item.id, result);
      }
    }
    return sent;
  }

  async start(): Promise<void> {
    if (this.running) return;
    const allowed = normalizeAllowed(this.deps.cfg.allowedJids);
    if (!allowed.length) {
      log.warn('whatsapp: enabled but allowlist empty - channel NOT started (secure default)');
      return;
    }
    const mod = await this.loader();
    const authDir = this.deps.cfg.authDir || path.join(stateDir(), 'wa-auth');
    fs.mkdirSync(authDir, { recursive: true });

    const authState = mod.useMultiFileAuthState
      ? await mod.useMultiFileAuthState(authDir)
      : { state: {}, saveCreds: () => undefined };

    const sock = mod.default({
      auth: authState.state,
      // QR surfaces via connection.update; also print when supported
      printQRInTerminal: false,
    });
    this.sock = sock;
    this.running = true;

    sock.ev.on('creds.update', () => {
      void authState.saveCreds();
    });

    sock.ev.on('connection.update', (update: unknown) => {
      const u = update as { qr?: string; connection?: string; lastDisconnect?: { error?: unknown } };
      if (u.qr) {
        log.info('whatsapp: scan this QR from WhatsApp > Linked Devices:');
        console.log(u.qr);
      }
      if (u.connection === 'open') log.info('whatsapp: connected ✅');
      if (u.connection === 'closed') {
        const err = u.lastDisconnect?.error as { output?: { statusCode?: number } } | undefined;
        const status = err?.output?.statusCode;
        if (status === 401) {
          log.warn('whatsapp: logged out - delete state/wa-auth and re-pair');
          this.running = false;
          this.sock = null;
          return;
        }
        log.warn('whatsapp: connection closed - restart the gateway to reconnect');
        this.running = false;
        this.sock = null;
      }
    });

    sock.ev.on('messages.upsert', (data: unknown) => {
      const d = data as { type?: string; messages?: unknown[] };
      if (d.type && d.type !== 'notify') return;
      const raw = d.messages?.[0] as
        | { key?: { remoteJid?: string; fromMe?: boolean; participant?: string }; pushName?: string; message?: unknown }
        | undefined;
      if (!raw?.key || raw.key.fromMe) return;
      const jid = raw.key.remoteJid || '';
      if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') return;
      const text = extractText(raw.message);
      if (!text.trim()) return;

      if (!isAllowedJid(jid, allowed)) {
        log.warn(`whatsapp: rejected message from non-allowlisted ${jid}`);
        void this.send(jid, '🔒 Not authorized. Ask the device owner to add you to the allowlist.');
        return;
      }
      void (async () => {
        try {
          const reply = await this.deps.onMessage(jid, jid, text.trim(), raw.pushName || jid);
          if (reply) await this.send(jid, reply);
        } catch (err) {
          await this.send(jid, `⚠️ ${err instanceof Error ? err.message : err}`);
        }
      })();
    });

    log.info(`whatsapp: starting (allowlist: ${allowed.length} entry/entries, auth: ${authDir})`);
  }

  async stop(): Promise<void> {
    this.running = false;
    this.sock = null;
  }
}

/** Helper for doctor/onboarding: does the package directory have baileys? */
export async function baileysInstalled(): Promise<boolean> {
  try {
    await defaultBaileysLoader();
    return true;
  } catch {
    return false;
  }
}

export function whatsappAuthDir(): string {
  return path.join(home(), 'state', 'wa-auth');
}
