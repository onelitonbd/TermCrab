import crypto from 'node:crypto';
import { Config } from '../core/config.js';

function sha(s: string): Buffer {
  return crypto.createHash('sha256').update(s).digest();
}

/** Constant-time token check. Accepts "Bearer x", "x", or query param x. */
export function checkToken(config: Config, presented: string | null | undefined): boolean {
  const expected = config.gateway.token;
  if (!expected) {
    // No token configured: only allow when bound to loopback (enforced at server start).
    return true;
  }
  if (!presented) return false;
  let value = presented.trim();
  if (/^bearer\s+/i.test(value)) value = value.replace(/^bearer\s+/i, '');
  return crypto.timingSafeEqual(sha(value), sha(expected));
}

export function extractAuth(req: { headers: Record<string, string | string[] | undefined>; url?: string }): string | null {
  const header = req.headers['authorization'];
  if (typeof header === 'string' && header) return header;
  if (req.url) {
    try {
      const u = new URL(req.url, 'http://localhost');
      const q = u.searchParams.get('token');
      if (q) return q;
    } catch {
      /* ignore */
    }
  }
  return null;
}
