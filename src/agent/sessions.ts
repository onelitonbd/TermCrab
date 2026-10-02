import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { sessionsDir, ensureLayout, home } from '../core/paths.js';

export type Entry =
  | { role: 'system'; content: string; ts: number }
  | { role: 'user'; content: string; ts: number; channel?: string }
  | {
      role: 'assistant';
      content: string;
      ts: number;
      toolCalls?: { id: string; name: string; args: unknown }[];
      /** Reasoning trace text (shown in the UI drawer, not sent back upstream). */
      thinking?: string;
      /** Raw provider reasoning blocks (Anthropic) — echoed back verbatim. */
      thinkingBlocks?: unknown[];
    }
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

  /**
   * Compact a session: summarize old entries into a digest file, then trim.
   * Returns the summary text (or empty string if no compaction was needed).
   * The digest is written to memory/compacted/<sessionId>.md so the agent
   * can still search it via search_memory.
   */
  compact(sessionId: string, maxEntries = 60): string {
    const f = this.file(sessionId);
    if (!fs.existsSync(f)) return '';
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
    if (lines.length <= maxEntries + 10) return '';

    const overflowCount = lines.length - maxEntries;
    const overflow = lines.slice(0, overflowCount);
    const kept = lines.slice(overflowCount);

    // Build a simple digest of the overflow (no LLM needed — just extract key lines).
    const digest = this.buildDigest(overflow, sessionId);

    // Write digest to memory/compacted/<sessionId>.md
    const compactedDir = path.join(home(), 'memory', 'compacted');
    fs.mkdirSync(compactedDir, { recursive: true });
    const digestFile = path.join(compactedDir, `${sessionId}.md`);
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const digestEntry = `\n\n## Compacted ${timestamp}\n${digest}\n`;
    fs.appendFileSync(digestFile, digestEntry, 'utf8');

    // Trim the session file
    const tmp = `${f}.tmp`;
    fs.writeFileSync(tmp, `${kept.join('\n')}\n`, 'utf8');
    fs.renameSync(tmp, f);

    return digest;
  }

  /**
   * Build a simple text digest from session lines. Extracts user/assistant
   * messages and tool results, skipping empty or redundant entries.
   */
  private buildDigest(lines: string[], sessionId: string): string {
    const parts: string[] = [];
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as {
          role?: string;
          content?: string;
          name?: string;
          result?: string;
        };
        if (entry.role === 'user' && entry.content) {
          parts.push(`User: ${entry.content.slice(0, 200)}`);
        } else if (entry.role === 'assistant' && entry.content) {
          parts.push(`Assistant: ${entry.content.slice(0, 200)}`);
        } else if (entry.role === 'tool' && entry.name) {
          parts.push(`Tool(${entry.name}): ${String(entry.result ?? '').slice(0, 100)}`);
        }
      } catch {
        /* skip malformed lines */
      }
    }
    return parts.join('\n');
  }
}

export function newRunId(): string {
  return crypto.randomBytes(6).toString('hex');
}

/**
 * Replay a session: re-execute user messages with full tool trace.
 * Returns the new session id (replayed:<original>).
 */
export function replaySession(
  sessionId: string,
  entries: Entry[],
  onEvent: (entry: Entry) => void,
): string {
  const newId = `replayed:${sessionId}`;
  const file = path.join(sessionsDir(), `${sanitizeSessionId(newId)}.jsonl`);
  fs.writeFileSync(file, '', 'utf8'); // clear

  for (const entry of entries) {
    if (entry.role === 'user') {
      // Re-append user message
      fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, 'utf8');
      onEvent(entry);
    }
  }
  return newId;
}

// ---------------------------------------------------------------------------
// Session queue: per-session FIFO with steer/interrupt/followup/collect modes.
// ---------------------------------------------------------------------------

export type QueueMode = 'steer' | 'followup' | 'collect' | 'interrupt';

export interface QueuedTurn {
  id: string;
  sessionId: string;
  userMessage: string;
  channel?: string;
  agent?: string;
  tier?: 'cloud' | 'local';
  thinkingLevel?: import('../providers/types.js').ThinkingLevel;
  enqueuedAt: number;
  status: 'queued' | 'running' | 'done' | 'error' | 'interrupted';
  output?: string;
  error?: string;
}

export class SessionQueue {
  private queues = new Map<string, QueuedTurn[]>();
  private running = new Map<string, QueuedTurn>();
  private completed = new Map<string, QueuedTurn>();
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Map<string, Set<(turn: QueuedTurn) => void>>();

  /** Enqueue a turn. Returns the queued turn with its id. */
  enqueue(turn: Omit<QueuedTurn, 'id' | 'enqueuedAt' | 'status'>): QueuedTurn {
    const full: QueuedTurn = {
      ...turn,
      id: crypto.randomBytes(4).toString('hex'),
      enqueuedAt: Date.now(),
      status: 'queued',
    };
    const q = this.queues.get(full.sessionId) ?? [];
    q.push(full);
    this.queues.set(full.sessionId, q);
    return full;
  }

  /** Dequeue the next turn for a session (FIFO). */
  dequeue(sessionId: string): QueuedTurn | null {
    const q = this.queues.get(sessionId);
    if (!q || q.length === 0) return null;
    return q.shift()!;
  }

  /** Mark a turn as running and associate an abort controller. */
  markRunning(turnId: string, sessionId: string, ctrl: AbortController): void {
    this.abortControllers.set(`${sessionId}:${turnId}`, ctrl);
    const q = this.queues.get(sessionId) ?? [];
    const turn = q.find((t) => t.id === turnId);
    if (turn) {
      turn.status = 'running';
      this.running.set(sessionId, turn);
    }
  }

  /** Mark a turn as done with output. */
  markDone(turnId: string, sessionId: string, output: string): void {
    this.abortControllers.delete(`${sessionId}:${turnId}`);
    const turn = this.running.get(sessionId);
    if (turn && turn.id === turnId) {
      turn.status = 'done';
      turn.output = output;
      this.running.delete(sessionId);
      this.completed.set(turnId, turn);
      if (this.completed.size > 100) {
        const oldest = this.completed.keys().next().value;
        if (oldest) this.completed.delete(oldest);
      }
      this.notify(sessionId, turn);
    }
  }

  /** Mark a turn as errored. */
  markError(turnId: string, sessionId: string, error: string): void {
    this.abortControllers.delete(`${sessionId}:${turnId}`);
    const turn = this.running.get(sessionId);
    if (turn && turn.id === turnId) {
      turn.status = 'error';
      turn.error = error;
      this.running.delete(sessionId);
      this.completed.set(turnId, turn);
      if (this.completed.size > 100) {
        const oldest = this.completed.keys().next().value;
        if (oldest) this.completed.delete(oldest);
      }
      this.notify(sessionId, turn);
    }
  }

  /** Interrupt the currently running turn for a session. */
  interrupt(sessionId: string): boolean {
    const turn = this.running.get(sessionId);
    if (!turn) return false;
    const ctrl = this.abortControllers.get(`${sessionId}:${turn.id}`);
    if (ctrl) ctrl.abort();
    turn.status = 'interrupted';
    this.running.delete(sessionId);
    this.completed.set(turn.id, turn);
    if (this.completed.size > 100) {
      const oldest = this.completed.keys().next().value;
      if (oldest) this.completed.delete(oldest);
    }
    this.abortControllers.delete(`${sessionId}:${turn.id}`);
    this.notify(sessionId, turn);
    return true;
  }

  /** Get turn by id across running, queued, and recently completed turns. */
  getTurn(sessionId: string, turnId: string): QueuedTurn | null {
    const run = this.running.get(sessionId);
    if (run && run.id === turnId) return run;
    const q = this.queues.get(sessionId) ?? [];
    const queued = q.find((t) => t.id === turnId);
    if (queued) return queued;
    return this.completed.get(turnId) ?? null;
  }

  /** Get the currently running turn for a session. */
  getRunning(sessionId: string): QueuedTurn | null {
    return this.running.get(sessionId) ?? null;
  }

  /** Get the queue length for a session. */
  getQueueLength(sessionId: string): number {
    return this.queues.get(sessionId)?.length ?? 0;
  }

  /** Get all queued (not running) turns for a session. */
  getQueued(sessionId: string): QueuedTurn[] {
    return this.queues.get(sessionId) ?? [];
  }

  /** Wait for the current running turn to finish (or timeout). */
  async waitForTurn(sessionId: string, timeoutMs = 120_000): Promise<QueuedTurn | null> {
    const turn = this.running.get(sessionId);
    if (!turn) return null;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.unsubscribe(sessionId, listener);
        resolve(null);
      }, timeoutMs);
      const listener = (t: QueuedTurn) => {
        if (t.id === turn.id) {
          clearTimeout(timer);
          this.unsubscribe(sessionId, listener);
          resolve(t);
        }
      };
      this.subscribe(sessionId, listener);
    });
  }

  /** Subscribe to turn completion events for a session. */
  subscribe(sessionId: string, listener: (turn: QueuedTurn) => void): () => void {
    const set = this.listeners.get(sessionId) ?? new Set();
    set.add(listener);
    this.listeners.set(sessionId, set);
    return () => set.delete(listener);
  }

  private unsubscribe(sessionId: string, listener: (turn: QueuedTurn) => void): void {
    this.listeners.get(sessionId)?.delete(listener);
  }

  private notify(sessionId: string, turn: QueuedTurn): void {
    for (const listener of this.listeners.get(sessionId) ?? []) {
      try {
        listener(turn);
      } catch {
        /* ignore listener errors */
      }
    }
  }

  /** Clear all queues and running state (for testing). */
  clear(): void {
    this.queues.clear();
    this.running.clear();
    this.abortControllers.clear();
    this.listeners.clear();
  }
}
