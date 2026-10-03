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
  /** Messages steered into this turn while it runs (queue mode 'steer'). */
  steers?: string[];
}

/**
 * Largest number of turns a single session may have waiting behind a run.
 * A cap keeps a runaway loop (a webhook firing twice a second, a broken client
 * retrying) from growing the process without bound. The HTTP layer turns this
 * into a 429 instead of pretending the work was accepted.
 */
export const MAX_QUEUED_TURNS = 32;

export class QueueFullError extends Error {
  constructor(sessionId: string) {
    super(`queue is full for ${sessionId}: ${MAX_QUEUED_TURNS} turns already waiting`);
    this.name = 'QueueFullError';
  }
}

/** The function the queue calls to actually run a claimed turn. */
export type TurnRunner = (turn: QueuedTurn, signal: AbortSignal) => Promise<string>;

export class SessionQueue {
  private queues = new Map<string, QueuedTurn[]>();
  private running = new Map<string, QueuedTurn>();
  private completed = new Map<string, QueuedTurn>();
  private byId = new Map<string, QueuedTurn>();
  /** Turns merged into a collect-mode run (they share its result). */
  private absorbed = new Map<string, QueuedTurn[]>();
  private abortControllers = new Map<string, AbortController>();
  private listeners = new Map<string, Set<(turn: QueuedTurn) => void>>();
  /** Sessions whose drain loop is alive. Exactly one drain loop per session. */
  private lanes = new Set<string>();
  private runner: TurnRunner | null = null;
  private mode: QueueMode = 'followup';

  /** How a new message is treated when one is already running. */
  setMode(mode: QueueMode): void {
    this.mode = mode;
  }

  getMode(): QueueMode {
    return this.mode;
  }

  /**
   * Install the runner and start draining anything already waiting. The runner
   * is called one turn at a time per session; whatever it resolves with becomes
   * the turn's output, a rejection becomes the turn's error.
   */
  setRunner(fn: TurnRunner | null): void {
    this.runner = fn;
    if (fn) {
      for (const sessionId of this.queues.keys()) this.pump(sessionId);
    }
  }

  /** Enqueue a turn. Returns the queued turn with its id. */
  enqueue(turn: Omit<QueuedTurn, 'id' | 'enqueuedAt' | 'status'>): QueuedTurn {
    const q = this.queues.get(turn.sessionId) ?? [];
    if (q.length >= MAX_QUEUED_TURNS) throw new QueueFullError(turn.sessionId);
    const full: QueuedTurn = {
      ...turn,
      id: crypto.randomBytes(4).toString('hex'),
      enqueuedAt: Date.now(),
      status: 'queued',
    };
    q.push(full);
    this.queues.set(full.sessionId, q);
    this.byId.set(full.id, full);
    return full;
  }

  /**
   * The one way in for real callers: enqueue, apply the session's queue mode,
   * and make sure the lane is draining. Returns the turn to poll. `steered`
   * means the message joined the running turn instead of creating a new one.
   */
  submit(turn: Omit<QueuedTurn, 'id' | 'enqueuedAt' | 'status'>): { turn: QueuedTurn; steered: boolean } {
    const running = this.running.get(turn.sessionId);
    if (running && this.mode === 'steer') {
      const steered = this.steer(turn.sessionId, turn.userMessage);
      if (steered) return { turn: steered, steered: true };
    }
    if (running && this.mode === 'interrupt') {
      this.interrupt(turn.sessionId);
    }
    const full = this.enqueue(turn);
    this.pump(turn.sessionId);
    return { turn: full, steered: false };
  }

  /** Dequeue the next turn for a session (FIFO). */
  dequeue(sessionId: string): QueuedTurn | null {
    const q = this.queues.get(sessionId);
    if (!q || q.length === 0) return null;
    return q.shift()!;
  }

  /**
   * Start (or continue) draining a session's lane. Safe to call at any time:
   * there is at most one drain loop per session, and it re-checks the waiting
   * list after every turn, so a message enqueued mid-run is never dropped.
   */
  pump(sessionId: string): void {
    if (!this.runner) return;
    if (this.lanes.has(sessionId)) return;
    this.lanes.add(sessionId);
    void this.drain(sessionId).finally(() => {
      this.lanes.delete(sessionId);
    });
  }

  /**
   * Claim the next turn for a session. In collect mode every turn already
   * waiting is merged into the claimed one (debounce), so a burst of messages
   * costs a single extra model run.
   */
  private claim(sessionId: string): QueuedTurn | null {
    if (this.running.has(sessionId)) return null;
    const q = this.queues.get(sessionId);
    if (!q || q.length === 0) return null;
    const primary = q.shift()!;
    primary.status = 'running';
    this.running.set(sessionId, primary);
    this.abortControllers.set(`${sessionId}:${primary.id}`, new AbortController());
    if (this.mode === 'collect' && q.length > 0) {
      const merged: QueuedTurn[] = [];
      while (q.length > 0) {
        const extra = q.shift()!;
        extra.status = 'running';
        merged.push(extra);
      }
      if (merged.length > 0) {
        primary.userMessage = [primary.userMessage, ...merged.map((t) => t.userMessage)].join('\n\n');
        this.absorbed.set(primary.id, merged);
      }
    }
    return primary;
  }

  private async drain(sessionId: string): Promise<void> {
    const runner = this.runner;
    if (!runner) return;
    for (;;) {
      const turn = this.claim(sessionId);
      if (!turn) return;
      const ctrl = this.abortControllers.get(`${sessionId}:${turn.id}`);
      try {
        const output = await runner(turn, ctrl?.signal ?? new AbortController().signal);
        this.markDone(turn.id, sessionId, output);
      } catch (err) {
        this.markError(turn.id, sessionId, err instanceof Error ? err.message : String(err));
      }
      // Defensive: a runner that settled without the queue noticing (or an
      // interrupted turn whose controller is gone) must not wedge the lane.
      const stuck = this.running.get(sessionId);
      if (stuck && stuck.id === turn.id) this.running.delete(sessionId);
    }
  }

  /**
   * Steer a message into the running turn: it is appended to the turn's queue
   * and the loop picks it up inside the same run (same run id, no new turn).
   */
  steer(sessionId: string, message: string): QueuedTurn | null {
    const turn = this.running.get(sessionId);
    if (!turn) return null;
    turn.steers = [...(turn.steers ?? []), message];
    this.notify(sessionId, turn);
    return turn;
  }

  /** Take (and clear) the messages steered into the running turn. */
  takeSteers(sessionId: string): string[] {
    const turn = this.running.get(sessionId);
    if (!turn || !turn.steers?.length) return [];
    const steers = turn.steers;
    turn.steers = [];
    return steers;
  }

  /** Mark a turn as running and associate an abort controller. */
  markRunning(turnId: string, sessionId: string, ctrl: AbortController): void {
    const turn = this.byId.get(turnId);
    if (!turn) return;
    this.abortControllers.set(`${sessionId}:${turnId}`, ctrl);
    turn.status = 'running';
    this.running.set(sessionId, turn);
    // The turn is no longer waiting: keeping it in the array made
    // getQueueLength() lie for the rest of the process's life.
    const q = this.queues.get(sessionId);
    if (q) {
      const i = q.findIndex((t) => t.id === turnId);
      if (i >= 0) q.splice(i, 1);
    }
  }

  /** Mark a turn as done with output. */
  markDone(turnId: string, sessionId: string, output: string): void {
    this.abortControllers.delete(`${sessionId}:${turnId}`);
    const turn = this.running.get(sessionId);
    if (!turn || turn.id !== turnId) return;
    turn.status = 'done';
    turn.output = output;
    this.running.delete(sessionId);
    this.finish(sessionId, turn);
  }

  /** Mark a turn as errored. */
  markError(turnId: string, sessionId: string, error: string): void {
    this.abortControllers.delete(`${sessionId}:${turnId}`);
    const turn = this.running.get(sessionId);
    if (!turn || turn.id !== turnId) return;
    turn.status = 'error';
    turn.error = error;
    this.running.delete(sessionId);
    this.finish(sessionId, turn);
  }

  /** Record a finished turn, finalise anything merged into it, notify, drop the oldest. */
  private finish(sessionId: string, turn: QueuedTurn): void {
    this.completed.set(turn.id, turn);
    for (const merged of this.absorbed.get(turn.id) ?? []) {
      merged.status = turn.status;
      merged.output = turn.output;
      merged.error = turn.error;
      this.completed.set(merged.id, merged);
      this.notify(sessionId, merged);
    }
    this.absorbed.delete(turn.id);
    while (this.completed.size > 100) {
      const oldest = this.completed.keys().next().value;
      if (!oldest) break;
      this.completed.delete(oldest);
      this.byId.delete(oldest);
    }
    this.notify(sessionId, turn);
    // A turn may have arrived while this one was running; keep the lane going.
    if ((this.queues.get(sessionId)?.length ?? 0) > 0) this.pump(sessionId);
  }

  /** Interrupt the currently running turn for a session. */
  interrupt(sessionId: string): boolean {
    const turn = this.running.get(sessionId);
    if (!turn) return false;
    const ctrl = this.abortControllers.get(`${sessionId}:${turn.id}`);
    if (ctrl) ctrl.abort();
    turn.status = 'interrupted';
    this.running.delete(sessionId);
    this.abortControllers.delete(`${sessionId}:${turn.id}`);
    this.finish(sessionId, turn);
    return true;
  }

  /** Get turn by id across running, queued, and recently completed turns. */
  getTurn(sessionId: string, turnId: string): QueuedTurn | null {
    void sessionId;
    return this.byId.get(turnId) ?? null;
  }

  /** Get the currently running turn for a session. */
  getRunning(sessionId: string): QueuedTurn | null {
    return this.running.get(sessionId) ?? null;
  }

  /**
   * Snapshot for the status surfaces (panel /api/status, `termcrab status`):
   * how many sessions have waiting work, how many turns run, how many wait.
   */
  stats(): { sessions: number; running: number; waiting: number } {
    let waiting = 0;
    for (const q of this.queues.values()) waiting += q.length;
    return { sessions: this.queues.size, running: this.running.size, waiting };
  }

  /** How many messages are waiting for the session (the run in flight is not waiting). */
  getQueueLength(sessionId: string): number {
    return this.queues.get(sessionId)?.length ?? 0;
  }

  /** Get all queued (not running) turns for a session. */
  getQueued(sessionId: string): QueuedTurn[] {
    return this.queues.get(sessionId) ?? [];
  }

  /**
   * Wait for a turn to finish. With a turnId, waits for that exact turn even if
   * it is still queued behind another one; without, waits for the running turn
   * (returns null when the session is idle, as it always did).
   */
  async waitForTurn(sessionId: string, timeoutMs = 120_000, turnId?: string): Promise<QueuedTurn | null> {
    const target = turnId ? this.byId.get(turnId) ?? null : this.running.get(sessionId) ?? null;
    if (!target) return null;
    if (target.status === 'done' || target.status === 'error' || target.status === 'interrupted') return target;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.unsubscribe(sessionId, listener);
        resolve(null);
      }, timeoutMs);
      const listener = (t: QueuedTurn) => {
        if (t.id === target.id) {
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
    this.completed.clear();
    this.byId.clear();
    this.absorbed.clear();
    this.abortControllers.clear();
    this.listeners.clear();
    this.lanes.clear();
  }
}
