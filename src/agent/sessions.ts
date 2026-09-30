import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sessionsDir, ensureLayout } from '../core/paths.js';

export type Entry =
  | { role: 'user'; content: string; ts: number; channel?: string }
  | { role: 'assistant'; content: string; ts: number; toolCalls?: { id: string; name: string; args: unknown }[] }
  | { role: 'tool'; toolCallId: string; name: string; result: string; ts: number };

const KEEP = 80;

export function sanitizeSessionId(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 64);
  return clean || 'default';
}

export class SessionStore {
  constructor(private readonly root: string = sessionsDir()) {
    ensureLayout();
  }

  private file(sessionId: string): string {
    return path.join(this.root, `${sanitizeSessionId(sessionId)}.jsonl`);
  }

  append(sessionId: string, entry: Entry): void {
    const f = this.file(sessionId);
    fs.appendFileSync(f, `${JSON.stringify(entry)}\n`, 'utf8');
    this.maybeTrim(sessionId);
  }

  read(sessionId: string): Entry[] {
    const f = this.file(sessionId);
    if (!fs.existsSync(f)) return [];
    const out: Entry[] = [];
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as Entry);
      } catch {
        /* skip corrupt lines */
      }
    }
    return out;
  }

  delete(sessionId: string): boolean {
    try {
      fs.unlinkSync(this.file(sessionId));
      return true;
    } catch {
      return false;
    }
  }

  reset(sessionId: string): void {
    const f = this.file(sessionId);
    if (fs.existsSync(f)) {
      const backup = `${f}.${Date.now()}.bak`;
      fs.renameSync(f, backup);
    }
  }

  list(): { id: string; messages: number; modified: number; bytes: number }[] {
    if (!fs.existsSync(this.root)) return [];
    return fs
      .readdirSync(this.root)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => {
        const full = path.join(this.root, f);
        const content = fs.readFileSync(full, 'utf8');
        return {
          id: f.replace(/\.jsonl$/, ''),
          messages: content.split('\n').filter((l) => l.trim()).length,
          modified: Math.floor(fs.statSync(full).mtimeMs / 1000),
          bytes: Buffer.byteLength(content, 'utf8'),
        };
      })
      .sort((a, b) => b.modified - a.modified);
  }

  /** Readable Markdown export of one conversation (for saving/sharing). */
  exportMarkdown(sessionId: string): string | null {
    const entries = this.read(sessionId);
    if (!entries.length) return null;
    const lines: string[] = [`# Chat: ${sessionId}`, ''];
    for (const e of entries) {
      const when = new Date(e.ts).toISOString().slice(0, 16).replace('T', ' ');
      if (e.role === 'user') lines.push(`**You** (${when}):`, '', e.content, '');
      else if (e.role === 'assistant') lines.push(`**Crab** (${when}):`, '', e.content, '');
      else if (e.role === 'tool') lines.push(`*tool ${e.name}:* \`${String(e.result).slice(0, 200)}\``, '');
    }
    return lines.join('\n');
  }

  /**
   * Delete conversations (and old reset backups) older than `days` —
   * actually frees disk, unlike reset() which only renames.
   */
  purgeOlderThan(days: number): { removed: number; freedBytes: number } {
    if (!fs.existsSync(this.root)) return { removed: 0, freedBytes: 0 };
    const cutoff = Date.now() - Math.max(0, days) * 86_400_000;
    let removed = 0;
    let freedBytes = 0;
    for (const f of fs.readdirSync(this.root)) {
      if (!f.endsWith('.jsonl') && !f.endsWith('.bak')) continue;
      const full = path.join(this.root, f);
      try {
        const st = fs.statSync(full);
        if (st.mtimeMs >= cutoff) continue;
        freedBytes += st.size;
        fs.unlinkSync(full);
        removed++;
      } catch {
        /* someone else got it */
      }
    }
    return { removed, freedBytes };
  }

  /** Rename a conversation (moves the file; refuses to clobber). */
  rename(from: string, to: string): 'ok' | 'not-found' | 'exists' | 'bad-name' {
    const dest = sanitizeSessionId(to);
    if (dest !== to.trim()) return 'bad-name';
    const src = this.file(from);
    const dst = path.join(this.root, `${dest}.jsonl`);
    if (!fs.existsSync(src)) return 'not-found';
    if (fs.existsSync(dst)) return 'exists';
    fs.renameSync(src, dst);
    return 'ok';
  }

  /**
   * Rolling window: keep the newest KEEP entries. Older context lives in
   * MEMORY.md / daily logs instead of the hot transcript (cheap on mobile).
   */
  private maybeTrim(sessionId: string): void {
    const f = this.file(sessionId);
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
    if (lines.length <= KEEP + 10) return;
    const kept = lines.slice(-KEEP);
    const tmp = `${f}.tmp`;
    fs.writeFileSync(tmp, `${kept.join('\n')}\n`, 'utf8');
    fs.renameSync(tmp, f);
  }
}

export function newRunId(): string {
  return crypto.randomBytes(6).toString('hex');
}
