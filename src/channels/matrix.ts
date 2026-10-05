import { log } from '../core/logger.js';
import { bus } from '../gateway/events.js';
import { ChannelOnMessage } from './api.js';
import { outboxAck, outboxFail, outboxMarkSending, outboxPending, outboxPush } from '../mobile/outbox.js';

/**
 * Matrix channel (optional, requires matrix-js-sdk — no bundled dependency).
 * Off by default: set channels.matrix.enabled = true.
 *
 * `client` is the test seam; with it injected nothing is imported and no
 * socket is opened. The adapter ignores its own messages, honours the room
 * allowlist, routes to the agent and sends the answer back.
 */

export interface MatrixCfg {
  enabled: boolean;
  homeserver: string;
  accessToken: string;
  userId: string;
  allowedRooms: string[];
}

export interface MatrixEventLike {
  roomId: string;
  sender?: string;
  content?: { body?: string; msgtype?: string };
}

export interface MatrixClientLike {
  on(event: 'room.message', handler: (event: MatrixEventLike) => void | Promise<void>): void;
  startClient(): Promise<unknown>;
  stopClient?: () => void;
  sendTextMessage?: (roomId: string, text: string) => Promise<unknown>;
  sendMessage?: (roomId: string, content: { msgtype: string; body: string }) => Promise<unknown>;
}

export interface MatrixDeps {
  cfg: MatrixCfg;
  onMessage: ChannelOnMessage;
  client?: MatrixClientLike;
}

export class MatrixChannel {
  private running = false;
  private client: MatrixClientLike | null = null;

  constructor(private readonly deps: MatrixDeps) {
    this.client = deps.client ?? null;
  }

  async start(): Promise<void> {
    const { cfg } = this.deps;
    if (!cfg.enabled || !cfg.accessToken) {
      log.warn('matrix: not enabled or missing config — channel off');
      return;
    }
    try {
      let client = this.deps.client;
      if (!client) {
        const mod = 'matrix-js-sdk';
        const { createClient } = (await import(mod)) as unknown as {
          createClient: (opts: { baseUrl: string; accessToken: string; userId: string }) => MatrixClientLike;
        };
        client = createClient({ baseUrl: cfg.homeserver, accessToken: cfg.accessToken, userId: cfg.userId });
      }
      client.on('room.message', (event) => {
        void this.handleEvent(event).catch((err) =>
          log.warn('matrix: handler failed:', err instanceof Error ? err.message : err),
        );
      });
      await client.startClient();
      this.client = client;
      this.running = true;
      log.info('matrix: channel started');
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        log.warn('matrix: matrix-js-sdk not installed — channel off. Install: npm install matrix-js-sdk');
      } else {
        log.warn('matrix: failed to start:', err instanceof Error ? err.message : String(err));
      }
    }
  }

  /** Returns the reply it sent, or null when the event was ignored. */
  async handleEvent(event: MatrixEventLike): Promise<string | null> {
    const { cfg } = this.deps;
    const body = event.content?.body ?? '';
    if (!body) return null;
    if (event.sender && cfg.userId && event.sender === cfg.userId) return null;
    if (cfg.allowedRooms.length > 0 && !cfg.allowedRooms.includes(event.roomId)) return null;

    bus.emit({ type: 'matrix:message', room: event.roomId, text: body, sender: event.sender });
    let reply: string;
    try {
      reply = await this.deps.onMessage(event.sender ?? event.roomId, event.roomId, body, event.sender ?? 'matrix');
    } catch (err) {
      reply = `⚠️ ${err instanceof Error ? err.message : String(err)}`;
    }
    if (reply) await this.send(event.roomId, reply);
    return reply || null;
  }

  async send(roomId: string, text: string): Promise<void> {
    try {
      await this.rawSend(roomId, text);
    } catch (err) {
      outboxPush({ channel: 'matrix', chatId: roomId, text, error: err instanceof Error ? err.message : String(err) });
      log.warn('matrix send failed, queuing to outbox:', err instanceof Error ? err.message : err);
    }
  }

  private async rawSend(roomId: string, text: string): Promise<void> {
    const client = this.client;
    if (!client) throw new Error('matrix: no client connected yet');
    if (typeof client.sendTextMessage === 'function') {
      await client.sendTextMessage(roomId, text);
      return;
    }
    if (typeof client.sendMessage === 'function') {
      await client.sendMessage(roomId, { msgtype: 'm.text', body: text });
      return;
    }
    throw new Error('matrix: client cannot send messages');
  }

  async flushOutbox(): Promise<number> {
    let sent = 0;
    for (const item of outboxPending('matrix')) {
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
      this.client?.stopClient?.();
    } catch {
      /* already gone */
    }
  }
}
