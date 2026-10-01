import { log } from '../core/logger.js';

/**
 * Matrix channel (optional, requires matrix-js-sdk).
 * Off by default — enable in config: channels.matrix.enabled = true
 */

export interface MatrixCfg {
  enabled: boolean;
  homeserver: string;
  accessToken: string;
  userId: string;
  allowedRooms: string[];
}

export class MatrixChannel {
  private running = false;

  constructor(private readonly cfg: MatrixCfg) {}

  async start(): Promise<void> {
    if (!this.cfg.enabled || !this.cfg.accessToken) {
      log.warn('matrix: not enabled or missing config — channel off');
      return;
    }
    try {
      const mod = 'matrix-js-sdk';
      const { createClient } = await import(mod) as unknown as { createClient: (opts: { baseUrl: string; accessToken: string; userId: string }) => {
        on: (event: string, handler: (event: { roomId: string; content: { body?: string } }) => Promise<void>) => void;
        startClient: () => Promise<void>;
      } };
      const client = createClient({
        baseUrl: this.cfg.homeserver,
        accessToken: this.cfg.accessToken,
        userId: this.cfg.userId,
      });

      client.on('room.message', async (event: { roomId: string; content: { body?: string } }) => {
        if (this.cfg.allowedRooms.length > 0 && !this.cfg.allowedRooms.includes(event.roomId)) return;
        const { bus } = await import('../gateway/events.js');
        bus.emit({ type: 'matrix:message', room: event.roomId, text: event.content?.body ?? '' });
      });

      await client.startClient();
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

  stop(): void {
    this.running = false;
  }
}
