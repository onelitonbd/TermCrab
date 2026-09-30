import crypto from 'node:crypto';
import { Config } from '../core/config.js';

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
