import { Config } from '../core/config.js';

/**
 * The one place that knows how to talk to the local gateway: host resolution
 * (0.0.0.0/:: mean "this machine"), the bearer token, and a short timeout.
 * Used by `termcrab status` (live queue state) and `termcrab approvals`.
 */

/** Thrown when nothing answers — the message is meant to be shown to a person. */
export class GatewayNotRunningError extends Error {
  constructor(readonly base: string, cause?: unknown) {
    super(`Cannot reach the TermCrab panel at ${base} — start it with: termcrab gateway`);
    this.name = 'GatewayNotRunningError';
    this.cause = cause;
  }
}

export class GatewayClient {
  constructor(
    private readonly config: Config,
    private readonly timeoutMs = 5000,
  ) {}

  /** Base URL of the gateway on this machine. */
  get base(): string {
    const host = this.config.gateway.host;
    const local = host === '0.0.0.0' || host === '::' || host === '' ? '127.0.0.1' : host;
    return `http://${local}:${this.config.gateway.port}`;
  }

  private headers(json: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.config.gateway.token) h.authorization = `Bearer ${this.config.gateway.token}`;
    if (json) h['content-type'] = 'application/json';
    return h;
  }

  async request(path: string, init?: RequestInit & { json?: unknown }): Promise<Response> {
    const body = init?.json !== undefined ? JSON.stringify(init.json) : init?.body;
    try {
      return await fetch(this.base + path, {
        method: init?.method ?? 'GET',
        headers: { ...this.headers(body !== undefined), ...((init?.headers as Record<string, string>) ?? {}) },
        body: body as string | undefined,
        signal: init?.signal ?? AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new GatewayNotRunningError(this.base, err);
    }
  }

  /** Request + parsed JSON, with the panel's error text surfaced when it fails. */
  async json<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
    const res = await this.request(path, init);
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) detail = body.error;
      } catch {
        /* not JSON */
      }
      throw new Error(detail);
    }
    return (await res.json()) as T;
  }
}
