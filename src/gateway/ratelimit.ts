/**
 * Rate limiting that answers instead of absorbing (20.3).
 *
 * A phone on a flaky network retries; a group chat can produce a burst; a
 * script gone wrong can hammer the gateway. The failure mode we refuse is the
 * silent one — turns queued until the queue is full and the owner sees a
 * backlog with no explanation. So every key (a device, a chat, a session) has
 * a token bucket, and a bucket that is empty gets a 429 with `retryAfterMs`
 * and one sentence, immediately, instead of another queued turn.
 */
import { Config } from '../core/config.js';

export interface RateLimitCfg {
  /** Sustained requests per minute. */
  perMinute: number;
  /** How many can arrive at once before the first refusal. */
  burst: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitCfg = { perMinute: 60, burst: 10 };

export interface Allow {
  ok: boolean;
  remaining: number;
  /** Only meaningful when ok is false: when to try again. */
  retryAfterMs: number;
}

interface Bucket {
  tokens: number;
  updated: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(private cfg: RateLimitCfg = DEFAULT_RATE_LIMIT) {}

  get config(): RateLimitCfg {
    return this.cfg;
  }

  private refill(b: Bucket, now: number): void {
    const perMs = Math.max(1, this.cfg.perMinute) / 60_000;
    b.tokens = Math.min(this.cfg.burst, b.tokens + Math.max(0, now - b.updated) * perMs);
    b.updated = now;
  }

  allow(key: string, now = Date.now()): Allow {
    const k = key || 'anonymous';
    const b = this.buckets.get(k) ?? { tokens: this.cfg.burst, updated: now };
    this.refill(b, now);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      this.buckets.set(k, b);
      return { ok: true, remaining: Math.floor(b.tokens), retryAfterMs: 0 };
    }
    this.buckets.set(k, b);
    const perMs = Math.max(1, this.cfg.perMinute) / 60_000;
    return { ok: false, remaining: 0, retryAfterMs: Math.max(1, Math.ceil((1 - b.tokens) / perMs)) };
  }

  /** Forget a key (a device that paired, a test). */
  reset(key?: string): void {
    if (key) this.buckets.delete(key);
    else this.buckets.clear();
  }

  /** For `/api/doctor` and tests: what each key has left, without spending. */
  snapshot(now = Date.now()): Array<{ key: string; tokens: number; limited: boolean }> {
    return [...this.buckets.entries()].map(([key, b]) => {
      const copy = { ...b };
      this.refill(copy, now);
      return { key, tokens: Math.floor(copy.tokens * 100) / 100, limited: copy.tokens < 1 };
    });
  }
}

/** Config override, so the owner can tune it: `gateway.rateLimit`. */
export function limiterFromConfig(config: Config): RateLimiter {
  const raw = (config.gateway as { rateLimit?: Partial<RateLimitCfg> }).rateLimit;
  const cfg: RateLimitCfg = {
    perMinute: clamp(raw?.perMinute, 1, 10_000, DEFAULT_RATE_LIMIT.perMinute),
    burst: clamp(raw?.burst, 1, 1000, DEFAULT_RATE_LIMIT.burst),
  };
  return new RateLimiter(cfg);
}

function clamp(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

/** One sentence a human can act on, in both CLI and HTTP forms. */
export function rateLimitHint(retryAfterMs: number): string {
  const secs = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return `Too many messages at once — try again in ${secs}s.`;
}
