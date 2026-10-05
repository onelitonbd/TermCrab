import crypto from 'node:crypto';
import { Config } from '../core/config.js';
import { Device, verifyDeviceToken } from './devices.js';

function sha(s: string): Buffer {
  return crypto.createHash('sha256').update(s).digest();
}

/** Strip "Bearer " and stray whitespace from a presented token. */
function normalize(presented: string): string {
  let value = presented.trim();
  if (/^bearer\s+/i.test(value)) value = value.replace(/^bearer\s+/i, '');
  return value;
}

/** Constant-time token check. Accepts "Bearer x", "x", or query param x. */
export function checkToken(config: Config, presented: string | null | undefined): boolean {
  const expected = config.gateway.token;
  if (!expected) {
    // No token configured: only allow when bound to loopback (enforced at server start).
    return true;
  }
  if (!presented) return false;
  return crypto.timingSafeEqual(sha(normalize(presented)), sha(expected));
}

/**
 * Plain-English reason a login was refused, shown right on the login screen.
 * `memoryToken` is what the running gateway uses; `diskToken` is what the
 * config file says at this moment (null when unreadable). Returns null when
 * there is nothing useful to say.
 */
export function authHint(
  presented: string | null | undefined,
  memoryToken: string,
  diskToken: string | null,
): string | null {
  if (!presented || !memoryToken) return null;
  const value = normalize(presented);
  if (!value) return null;
  if (diskToken && diskToken !== memoryToken) {
    // The file and the running gateway disagree — whatever he pasted, the
    // real problem is the split. Point at the restart, not the password.
    if (value === diskToken) {
      return 'This is the password in the settings file, but the panel was started before it changed - restart the panel (stop it, then run termcrab gateway) and try again.';
    }
    return 'This panel and the settings file have different passwords right now - restart the panel (stop it, then run termcrab gateway), then run: termcrab config get gateway.token';
  }
  // File and panel agree — the pasted password is simply wrong.
  if (diskToken && value.length !== diskToken.length) {
    return `This password has ${value.length} letters, but the saved one has ${diskToken.length} - copy the whole line again (one long word, no spaces).`;
  }
  return 'Wrong password - run: termcrab config get gateway.token and paste the whole line.';
}

/** Constant-time equality for tokens we compare directly (webhook secrets). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  return crypto.timingSafeEqual(sha(a), sha(b));
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

export type AuthResult =
  | { ok: true; kind: 'master' }
  | { ok: true; kind: 'device'; device: Device }
  | { ok: true; kind: 'open' }
  | { ok: false; kind: 'none' };

/**
 * Who is this? The owner's master token, or a paired device's own token (20.1).
 *
 * Keeping both paths in one function is the point: every route that already
 * called `checkToken` gains devices without a second branch, and "no token
 * configured" still means loopback-only (the bind guard enforces that at start).
 */
export function authenticate(
  config: Config,
  presented: string | null | undefined,
  opts: { now?: number; ip?: string | null } = {},
): AuthResult {
  const value = presented ? normalize(presented) : '';
  if (config.gateway.token && value) {
    if (crypto.timingSafeEqual(sha(value), sha(config.gateway.token))) return { ok: true, kind: 'master' };
  }
  if (value) {
    const device = verifyDeviceToken(value, opts);
    if (device) return { ok: true, kind: 'device', device };
  }
  if (!config.gateway.token) return { ok: true, kind: 'open' };
  return { ok: false, kind: 'none' };
}

/** A stable key for rate limiting: the device, else the token, else the peer. */
export function authKey(auth: AuthResult, presented: string | null | undefined, peer: string | null): string {
  if (auth.ok && auth.kind === 'device') return `device:${auth.device.id}`;
  if (auth.ok && auth.kind === 'master') return 'master';
  if (presented) return `token:${crypto.createHash('sha256').update(normalize(presented)).digest('hex').slice(0, 12)}`;
  return `ip:${peer || 'unknown'}`;
}
