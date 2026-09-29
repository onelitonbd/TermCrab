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

  reset(sessionId: string): void {
    const f = this.file(sessionId);
    if (fs.existsSync(f)) {
      const backup = `${f}.${Date.now()}.bak`;
      fs.renameSync(f, backup);
    }
  }

  list(): { id: string; messages: number; modified: number }[] {
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
        };
      })
      .sort((a, b) => b.modified - a.modified);
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
