import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
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
      /** Tokens this turn used (from the provider) — shown as a footer, not sent upstream. */
      usage?: import('../providers/types.js').Usage;
      /** Cost when a price was known at the time of the turn. */
      costUsd?: number;
    }
  | { role: 'tool'; toolCallId: string; name: string; result: string; ts: number };

const KEEP = 80;
/** Overflow moves here instead of being deleted (full history stays on disk). */
const ARCHIVE_SUFFIX = '.archive.jsonl';

/** Who wrote a digest block. */
export type DigestEngine = 'extractive' | 'model';

/**
 * The instruction the summariser model gets. Deliberately narrow: a summary that
 * invents structure is worse than the extractive digest it replaces, and this is
 * the whole prompt the model sees (the conversation follows as the user message).
 */
const SUMMARY_SYSTEM = [
  'You are compacting a long conversation so a small on-device agent can keep working.',
  'Summarise the messages below: what the user wanted, decisions made, facts, names, numbers,',
  'open questions, and anything they asked to remember.',
  'Be concise and factual. Plain text only: no preamble, no headings, under 200 words.',
].join(' ');

export interface CompactOpts {
  /** The model to write the summary. Without one the extractive digest is used. */
  provider?: import('../providers/types.js').Provider;
  /** Characters of conversation per model call (default 4000). */
  chunkChars?: number;
  /** Never make more than this many model calls (default 4). */
  maxChunks?: number;
  timeoutMs?: number;
}

export interface CompactResult {
  /** '' when there was nothing to compact. */
  digest: string;
  by: DigestEngine;
  model?: string;
  /** Entries this digest stands in for (they moved out of the hot window). */
  covered: number;
  /** Model calls made. */
  chunks: number;
  /** Why it is extractive, or what was capped — surfaced, never hidden. */
  note?: string;
  digestFile: string;
}

export interface DigestBlock {
  at: string;
  by: DigestEngine | '';
  model?: string;
  covered: number;
  note?: string;
  body: string;
}

export interface DigestView {
  /** The text to inject into the prompt (capped). */
  text: string;
  by: DigestEngine | '';
  model?: string;
  /** Blocks included in `text` / blocks on disk. */
  blocks: number;
  totalBlocks: number;
  /** Entries covered by the included blocks / by every block. */
  coveredTurns: number;
  totalCoveredTurns: number;
}

export interface DigestSummary {
  session: string;
  at: string;
  by: DigestEngine | '';
  model?: string;
  /** Turns the newest block stands in for. */
  coveredTurns: number;
  note?: string;
  /** Digest blocks on disk for that session. */
  blocks: number;
  file: string;
}

/** One transcript line rendered the way a person (or a summariser) reads it. */
function renderEntry(line: string): string | null {
  try {
    const entry = JSON.parse(line) as { role?: string; content?: string; name?: string; result?: string };
    if (entry.role === 'user' && entry.content) return `User: ${entry.content.slice(0, 400)}`;
    if (entry.role === 'assistant' && entry.content) return `Assistant: ${entry.content.slice(0, 400)}`;
    if (entry.role === 'tool' && entry.name) return `Tool(${entry.name}): ${String(entry.result ?? '').slice(0, 200)}`;
    if (entry.role === 'system' && entry.content) return `System: ${entry.content.slice(0, 200)}`;
    return null;
  } catch {
    return null;
  }
}

/** Split rendered lines into chunks of at most `chunkChars` characters. */
function chunkLines(lines: string[], chunkChars: number): string[][] {
  const groups: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (current.length && size + line.length + 1 > chunkChars) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Parse a `memory/compacted/<session>.md` file into its blocks (oldest first). */
export function parseDigestFile(text: string): DigestBlock[] {
  const out: DigestBlock[] = [];
  const parts = text.split(/(?:^|\n)## Compacted /).filter((part) => part.trim());
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const header = (nl >= 0 ? part.slice(0, nl) : part).trim();
    const body = (nl >= 0 ? part.slice(nl + 1) : '').trim();
    const m = /^(.+?)(?: \((\d+) turns, by (extractive|model)(?: ([^)—)]+?))?(?: — ([^)]*))?\))?$/.exec(header);
    if (!m) continue;
    out.push({
      at: m[1]!.trim(),
      by: (m[3] as DigestEngine | undefined) ?? '',
      model: m[4]?.trim(),
      covered: m[2] ? Number(m[2]) : 0,
      note: m[5]?.trim(),
      body,
    });
  }
  return out;
}

/**
 * The digest as the prompt should see it: the newest blocks that fit `maxChars`,
 * plus what they cover — so the model knows it is reading a summary of N turns
 * rather than those turns, and that the originals are still on disk.
 */
export function readDigest(sessionId: string, maxChars = 1200): DigestView {
  const file = digestFileFor(sessionId);
  let blocks: DigestBlock[] = [];
  try {
    blocks = parseDigestFile(fs.readFileSync(file, 'utf8'));
  } catch {
    blocks = [];
  }
  const chosen: DigestBlock[] = [];
  let size = 0;
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]!;
    const add = (chosen.length ? 2 : 0) + block.body.length;
    if (chosen.length && size + add > maxChars) break;
    chosen.unshift(block);
    size += add;
  }
  const newest = chosen[chosen.length - 1];
  let text = chosen.map((b) => b.body).join('\n\n');
  if (text.length > maxChars) text = text.slice(text.length - maxChars);
  return {
    text,
    by: newest?.by ?? '',
    model: newest?.model,
    blocks: chosen.length,
    totalBlocks: blocks.length,
    coveredTurns: chosen.reduce((n, b) => n + b.covered, 0),
    totalCoveredTurns: blocks.reduce((n, b) => n + b.covered, 0),
  };
}

/** The newest digest anywhere in this home (for `/api/status`). */
export function lastDigestSummary(): DigestSummary | null {
  const dir = path.join(home(), 'memory', 'compacted');
  let best: { file: string; mtime: number } | null = null;
  try {
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      const full = path.join(dir, name);
      let mtime = 0;
      try {
        mtime = fs.statSync(full).mtimeMs;
      } catch {
        continue;
      }
      if (!best || mtime > best.mtime) best = { file: full, mtime };
    }
  } catch {
    return null;
  }
  if (!best) return null;
  const blocks = parseDigestFile(safeRead(best.file));
  const newest = blocks[blocks.length - 1];
  if (!newest) return null;
  return {
    session: path.basename(best.file, '.md'),
    at: newest.at,
    by: newest.by,
    model: newest.model,
    coveredTurns: newest.covered,
    note: newest.note,
    blocks: blocks.length,
    file: best.file,
  };
}

function safeRead(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** One file per session, newest block last: memory/compacted/<session>.md */
function digestFileFor(sessionId: string): string {
  return path.join(home(), 'memory', 'compacted', `${sanitizeSessionId(sessionId)}.md`);
}

export function sanitizeSessionId(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 64);
  return clean || 'default';
}

/**
 * Who is writing a session's transcript. The fence is a tiny JSON lock file
 * (`sessions/<id>.lock`) holding this record; a lock is honoured while its pid
 * is alive AND its heartbeat is fresh, so a crashed writer cannot wedge a chat
 * forever and a wedged one (SIGSTOP, a hung tool) is reclaimed after `ttlMs`.
 */
export interface WriterHolder {
  /** Which surface took it: gateway, cli, cron, voice, heartbeat, dream. */
  owner: string;
  pid: number;
  host: string;
  /** ms epoch the claim was first taken. */
  since: number;
  /** ms epoch of the last append or touch (this is what staleness is judged on). */
  heartbeatAt: number;
}

/** A line in a transcript that could not be read, and why (21.1). */
export interface TranscriptDamage {
  file: string;
  line: number;
  bytes: number;
  why: 'torn tail (crash mid-write)' | 'unreadable line';
}

export interface TranscriptReport {
  sessions: Array<{
    id: string;
    entries: number;
    hot: number;
    archived: number;
    badLines: number;
    repairedBytes: number;
    bytes: number;
  }>;
  sessionsWithDamage: number;
  badLines: number;
  repaired: number;
  bytes: number;
}

export interface ClaimOpts {
  /** Wait up to this long for a live writer to release before refusing (0 = refuse now). */
  waitMs?: number;
  /** A claim whose heartbeat is older than this is stale even if the pid is alive. */
  ttlMs?: number;
}

/** The result of `claim()`: take it, or be told who holds the session. */
export interface SessionClaim {
  ok: boolean;
  /** Who holds it (set when ok is false, and when a stale claim was replaced). */
  holder?: WriterHolder;
  /** True when an existing stale claim was reclaimed instead of honoured. */
  reclaimed?: boolean;
  /** Time spent waiting for a live holder before this answer. */
  waitedMs?: number;
  /** Drop the claim. Safe to call more than once. */
  release: () => void;
  /** Refresh the heartbeat (a long turn does this on every append). */
  touch: () => void;
}

/** A claim older than this (heartbeat) is treated as wedged, not live. */
const DEFAULT_CLAIM_TTL_MS = 300_000;
const CLAIM_POLL_MS = 25;

export class SessionStore {
  constructor(private readonly root: string = sessionsDir()) {
    ensureLayout();
  }

  private file(sessionId: string): string {
    return path.join(this.root, `${sanitizeSessionId(sessionId)}.jsonl`);
  }

  /** Cold storage for a session that outgrew the hot window. Never deleted. */
  /** Public view of where a transcript lives (search, `sessions show`, tests). */
  transcriptFile(sessionId: string): string {
    return this.file(sessionId);
  }

  /** Public view of where the overflow of a transcript lives. */
  archivePath(sessionId: string): string {
    return this.archiveFile(sessionId);
  }

  private archiveFile(sessionId: string): string {
    return path.join(this.root, `${sanitizeSessionId(sessionId)}${ARCHIVE_SUFFIX}`);
  }

  /** The writer lock for a session. Not a transcript, so `list()` ignores it. */
  private lockFile(sessionId: string): string {
    return path.join(this.root, `${sanitizeSessionId(sessionId)}.lock`);
  }

  /** The current writer, or null when the session is free (or the lock is torn). */
  readClaim(sessionId: string): WriterHolder | null {
    const f = this.lockFile(sessionId);
    let raw: string;
    try {
      raw = fs.readFileSync(f, 'utf8');
    } catch {
      return null;
    }
    try {
      const h = JSON.parse(raw) as WriterHolder;
      return typeof h?.pid === 'number' && typeof h?.owner === 'string' ? h : null;
    } catch {
      // A half-written lock cannot fence anything; the next claimer replaces it.
      return null;
    }
  }

  /** Atomic lock write: a torn lock file would look like "nobody" to a claimer. */
  private writeClaim(sessionId: string, holder: WriterHolder): void {
    const f = this.lockFile(sessionId);
    const tmp = `${f}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(holder)}\n`, 'utf8');
    fs.renameSync(tmp, f);
  }

  /** Is the process that took a claim still running? (pid 0 = the kernel). */
  private isAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      // EPERM means it exists but belongs to another user: still alive.
      return (err as NodeJS.ErrnoException).code === 'EPERM';
    }
  }

  /** Block without spinning (the store is synchronous by design). */
  private sleepSync(ms: number): void {
    if (ms <= 0) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  }

  /**
   * Claim the right to write a session's transcript — the fence that makes
   * "one writer per transcript" true across processes and surfaces, not just
   * inside one queue. A second claimant is refused and told who holds it
   * (or waits `waitMs` first). A stale claim — dead pid, or a heartbeat older
   * than `ttlMs` — is reclaimed instead of wedging the session.
   */
  claim(sessionId: string, owner: string, opts: ClaimOpts = {}): SessionClaim {
    const ttl = opts.ttlMs ?? DEFAULT_CLAIM_TTL_MS;
    const waitMs = Math.max(0, opts.waitMs ?? 0);
    const started = Date.now();
    let reclaimed = false;

    for (;;) {
      const now = Date.now();
      const holder = this.readClaim(sessionId);

      if (!holder || !this.isAlive(holder.pid) || now - holder.heartbeatAt > ttl) {
        if (holder) reclaimed = true;
        const mine: WriterHolder = {
          owner,
          pid: process.pid,
          host: os.hostname(),
          since: now,
          heartbeatAt: now,
        };
        this.writeClaim(sessionId, mine);
        return this.claimHandle(sessionId, owner, mine, reclaimed, started);
      }

      // The same process, claiming for the same surface again (a tool that
      // starts a nested turn on this session): hand the claim straight back.
      if (holder.owner === owner && holder.pid === process.pid) {
        const mine: WriterHolder = { ...holder, heartbeatAt: now };
        this.writeClaim(sessionId, mine);
        return this.claimHandle(sessionId, owner, mine, reclaimed, started);
      }

      if (Date.now() - started >= waitMs) {
        return {
          ok: false,
          holder,
          reclaimed,
          waitedMs: Date.now() - started,
          release: () => undefined,
          touch: () => undefined,
        };
      }
      this.sleepSync(Math.min(CLAIM_POLL_MS, waitMs - (Date.now() - started)));
    }
  }

  private claimHandle(
    sessionId: string,
    owner: string,
    holder: WriterHolder,
    reclaimed: boolean,
    started: number,
  ): SessionClaim {
    return {
      ok: true,
      holder,
      reclaimed,
      waitedMs: Date.now() - started,
      release: () => {
        this.releaseClaim(sessionId, owner);
      },
      touch: () => {
        this.touchClaim(sessionId, owner);
      },
    };
  }

  /** Drop a claim, but only the one this owner holds. */
  releaseClaim(sessionId: string, owner?: string): boolean {
    const holder = this.readClaim(sessionId);
    if (holder && owner && (holder.owner !== owner || holder.pid !== process.pid)) return false;
    try {
      fs.unlinkSync(this.lockFile(sessionId));
      return true;
    } catch {
      return false;
    }
  }

  /** Refresh the heartbeat so a slow-but-alive turn keeps its claim. */
  touchClaim(sessionId: string, owner: string): boolean {
    const holder = this.readClaim(sessionId);
    if (!holder || holder.owner !== owner || holder.pid !== process.pid) return false;
    this.writeClaim(sessionId, { ...holder, heartbeatAt: Date.now() });
    return true;
  }

  /**
   * Add one entry. One write of one whole line (O_APPEND), so a kill in the
   * middle of a turn cannot interleave with another writer's line; a tail left
   * half-written by an earlier crash is cut before the next append, so every
   * line in the file parses. `opts.owner` marks a fenced write: the claim is
   * refreshed, and a live writer that lost its claim quietly takes it back.
   */
  append(sessionId: string, entry: Entry, opts: { owner?: string; durable?: boolean } = {}): void {
    const f = this.file(sessionId);
    this.healTail(f);
    if (opts.owner) this.refreshFence(sessionId, opts.owner);
    const fd = fs.openSync(f, 'a');
    try {
      fs.writeSync(fd, `${JSON.stringify(entry)}\n`, null, 'utf8');
      // Phone storage on a dying battery is exactly where "the last thing the
      // user said" must survive: flush the line to disk before calling it done
      // (21.1). One fsync per entry; the caller can pass durable:false for
      // bulk writes that do not mind losing the tail.
      if (opts.durable !== false) fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    // Keep the live file small; older lines move to the archive (not the bin).
    this.archiveOverflow(sessionId, KEEP + 40);
  }

  /** Cut a half-written trailing line (a process killed mid-append). */
  private healTail(f: string): void {
    let size: number;
    try {
      size = fs.statSync(f).size;
    } catch {
      return;
    }
    if (size === 0) return;
    const fd = fs.openSync(f, 'r+');
    try {
      const last = Buffer.alloc(1);
      fs.readSync(fd, last, 0, 1, size - 1);
      if (last[0] === 0x0a) return; // ends on a newline: nothing torn
      let cut = 0;
      let pos = size;
      const chunk = Buffer.alloc(8192);
      for (;;) {
        const start = Math.max(0, pos - chunk.length);
        const n = fs.readSync(fd, chunk, 0, pos - start, start);
        let found = -1;
        for (let i = n - 1; i >= 0; i--) {
          if (chunk[i] === 0x0a) {
            found = start + i + 1;
            break;
          }
        }
        if (found >= 0) {
          cut = found;
          break;
        }
        if (start === 0) break;
        pos = start;
      }
      fs.ftruncateSync(fd, cut);
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * A fenced append: the caller owns the claim, so refresh its heartbeat. If
   * the claim vanished (the TTL expired while this process was stalled) the
   * live writer retakes it rather than losing an entry — losing transcript
   * lines would be worse than a lock that lapsed.
   */
  private refreshFence(sessionId: string, owner: string): void {
    if (!this.touchClaim(sessionId, owner)) {
      const holder = this.readClaim(sessionId);
      if (!holder || !this.isAlive(holder.pid)) {
        this.writeClaim(sessionId, {
          owner,
          pid: process.pid,
          host: os.hostname(),
          since: Date.now(),
          heartbeatAt: Date.now(),
        });
      }
    }
  }

  /** Read a transcript: the archive first, then the live file. Nothing is lost. */
  read(sessionId: string): Entry[] {
    return this.readDetailed(sessionId).entries;
  }

  /**
   * The same read, but honest about damage (21.1). A line that does not parse
   * is reported by line number instead of being silently skipped, so
   * `termcrab sessions verify` can say "3 lines unreadable" rather than "fine".
   */
  readDetailed(sessionId: string): { entries: Entry[]; badLines: TranscriptDamage[] } {
    const entries: Entry[] = [];
    const badLines: TranscriptDamage[] = [];
    for (const f of [this.archiveFile(sessionId), this.file(sessionId)]) {
      if (!fs.existsSync(f)) continue;
      const raw = fs.readFileSync(f, 'utf8');
      const lines = raw.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        if (!line.trim()) continue;
        try {
          entries.push(JSON.parse(line) as Entry);
        } catch {
          badLines.push({
            file: f,
            line: i + 1,
            bytes: Buffer.byteLength(line, 'utf8'),
            why: raw.endsWith('\n') || i < lines.length - 1 ? 'unreadable line' : 'torn tail (crash mid-write)',
          });
        }
      }
    }
    return { entries, badLines };
  }

  /**
   * Walk every transcript and report what is on disk: how many entries parse,
   * which lines do not, and what a repair would cut. With `repair`, torn tails
   * are healed (the only damage a crash can leave — a middle line is never
   * written by `append`, so damage there means something else touched the file
   * and is left for a human to look at).
   */
  verifyAll(opts: { repair?: boolean } = {}): TranscriptReport {
    const report: TranscriptReport = { sessions: [], sessionsWithDamage: 0, badLines: 0, repaired: 0, bytes: 0 };
    if (!fs.existsSync(this.root)) return report;
    for (const row of this.list()) {
      const before = fs.existsSync(this.file(row.id)) ? fs.statSync(this.file(row.id)).size : 0;
      if (opts.repair) this.healTail(this.file(row.id));
      const after = fs.existsSync(this.file(row.id)) ? fs.statSync(this.file(row.id)).size : 0;
      const { entries, badLines } = this.readDetailed(row.id);
      const repaired = before - after;
      report.sessions.push({
        id: row.id,
        entries: entries.length,
        hot: row.hot,
        archived: row.archived,
        badLines: badLines.length,
        repairedBytes: repaired,
        bytes: row.bytes,
      });
      report.bytes += row.bytes;
      report.badLines += badLines.length;
      report.repaired += repaired;
      if (badLines.length) report.sessionsWithDamage += 1;
    }
    return report;
  }

  /**
   * The hot window: the newest `maxEntries` entries of the live file. This is
   * what goes to the model - the disk keeps everything, the prompt stays small.
   */
  readHot(sessionId: string, maxEntries = KEEP): Entry[] {
    const f = this.file(sessionId);
    if (!fs.existsSync(f)) return [];
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
    const out: Entry[] = [];
    for (const line of lines.slice(Math.max(0, lines.length - maxEntries))) {
      try {
        out.push(JSON.parse(line) as Entry);
      } catch {
        /* skip corrupt lines */
      }
    }
    return out;
  }

  /** How much of a session is hot vs archived (used by tests and the panel). */
  archiveStats(sessionId: string): { hot: number; archived: number; total: number } {
    const count = (f: string): number =>
      fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim()).length : 0;
    const hot = count(this.file(sessionId));
    const archived = count(this.archiveFile(sessionId));
    return { hot, archived, total: hot + archived };
  }

  delete(sessionId: string): boolean {
    let ok = false;
    for (const f of [this.file(sessionId), this.archiveFile(sessionId)]) {
      try {
        fs.unlinkSync(f);
        ok = true;
      } catch {
        /* already gone */
      }
    }
    return ok;
  }

  /** Does this conversation exist — live or archive-only? (28.2) */
  exists(sessionId: string): boolean {
    return fs.existsSync(this.file(sessionId)) || fs.existsSync(this.archivePath(sessionId));
  }

  reset(sessionId: string): void {
    for (const f of [this.file(sessionId), this.archiveFile(sessionId)]) {
      if (fs.existsSync(f)) {
        const backup = `${f}.${Date.now()}.bak`;
        fs.renameSync(f, backup);
      }
    }
  }

  list(): { id: string; messages: number; hot: number; archived: number; modified: number; bytes: number }[] {
    if (!fs.existsSync(this.root)) return [];
    return fs
      .readdirSync(this.root)
      .filter((f) => f.endsWith('.jsonl') && !f.endsWith(ARCHIVE_SUFFIX))
      .map((f) => {
        const full = path.join(this.root, f);
        const content = fs.readFileSync(full, 'utf8');
        const hot = content.split('\n').filter((l) => l.trim()).length;
        const archive = this.archiveFile(f.replace(/\.jsonl$/, ''));
        const archivedContent = fs.existsSync(archive) ? fs.readFileSync(archive, 'utf8') : '';
        const archived = archivedContent.split('\n').filter((l) => l.trim()).length;
        return {
          id: f.replace(/\.jsonl$/, ''),
          messages: hot + archived,
          hot,
          archived,
          modified: Math.floor(fs.statSync(full).mtimeMs / 1000),
          bytes: Buffer.byteLength(content, 'utf8') + Buffer.byteLength(archivedContent, 'utf8'),
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
   * Move the oldest lines out of the hot file into the archive file.
   * The hot file stays small (cheap context on mobile); nothing is deleted —
   * `read()` reads archive + live, so the full transcript stays on disk.
   */
  private archiveOverflow(sessionId: string, keep: number): void {
    const f = this.file(sessionId);
    if (!fs.existsSync(f)) return;
    const lines = fs.readFileSync(f, 'utf8').split('\n').filter((l) => l.trim());
    if (lines.length <= keep) return;
    const overflow = lines.slice(0, lines.length - keep);
    const kept = lines.slice(lines.length - keep);
    fs.appendFileSync(this.archiveFile(sessionId), `${overflow.join('\n')}\n`, 'utf8');
    const tmp = `${f}.tmp`;
    fs.writeFileSync(tmp, `${kept.join('\n')}\n`, 'utf8');
    fs.renameSync(tmp, f);
  }

  /**
   * Compact a session: summarise the overflow into a digest file and move those
   * lines to the archive. Nothing is deleted - every original line is still on
   * disk (read() sees archive + live), the digest is what the model reads.
   * Returns the summary text (or empty string if no compaction was needed).
   */
  /** Where this session's digest blocks live (one file per session, newest last). */
  private digestFile(sessionId: string): string {
    return digestFileFor(sessionId);
  }

  /**
   * The lines that should leave the hot window and are not already covered by a
   * digest: everything older than the newest `maxEntries` entries of the whole
   * transcript (archive + hot file), minus what earlier digests stand in for.
   * So compaction is incremental and never summarises the same turn twice.
   */
  private readOverflow(sessionId: string, maxEntries: number): string[] | null {
    const lines: string[] = [];
    for (const f of [this.archiveFile(sessionId), this.file(sessionId)]) {
      if (!fs.existsSync(f)) continue;
      for (const line of fs.readFileSync(f, 'utf8').split('\n')) if (line.trim()) lines.push(line);
    }
    if (!lines.length) return null;
    let already = 0;
    try {
      for (const block of parseDigestFile(fs.readFileSync(this.digestFile(sessionId), 'utf8'))) already += block.covered;
    } catch {
      already = 0; // no digest yet
    }
    const overflow = lines.slice(already, Math.max(already, lines.length - maxEntries));
    if (overflow.length <= 10) return null;
    return overflow;
  }

  /** Write the digest block and move the overflow out of the hot window. */
  private commitCompact(
    sessionId: string,
    covered: number,
    maxEntries: number,
    body: string,
    meta: { by: DigestEngine; model?: string; note?: string },
  ): void {
    const digestFile = this.digestFile(sessionId);
    fs.mkdirSync(path.dirname(digestFile), { recursive: true });
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const engine = `by ${meta.by}${meta.model ? ` ${meta.model}` : ''}`;
    const note = meta.note ? ` — ${meta.note}` : '';
    fs.appendFileSync(
      digestFile,
      `\n\n## Compacted ${timestamp} (${covered} turns, ${engine}${note})\n${body}\n`,
      'utf8',
    );
    // Nothing is deleted: the lines move to the archive and stay readable.
    this.archiveOverflow(sessionId, maxEntries);
  }

  /**
   * The extractive digest only — for callers that cannot await a model. The agent
   * loop uses compactWithModel(), so a configured model does the writing.
   */
  compact(sessionId: string, maxEntries = 60): string {
    const overflow = this.readOverflow(sessionId, maxEntries);
    if (!overflow) return '';
    const body = this.buildDigest(overflow, sessionId);
    this.commitCompact(sessionId, overflow.length, maxEntries, body, { by: 'extractive' });
    return body;
  }

  /**
   * Compact with the best engine available. A configured model summarises the
   * turns leaving the hot window in bounded chunks; the deterministic extractive
   * digest is the documented fallback when there is no model or the model fails.
   * Either way the block records who wrote it and why, and the transcript is only
   * moved — never deleted.
   */
  async compactWithModel(sessionId: string, maxEntries = 60, opts: CompactOpts = {}): Promise<CompactResult> {
    const digestFile = this.digestFile(sessionId);
    const overflow = this.readOverflow(sessionId, maxEntries);
    if (!overflow) {
      return { digest: '', by: 'extractive', covered: 0, chunks: 0, digestFile, note: 'nothing to compact' };
    }
    const rendered = overflow.map(renderEntry).filter((l): l is string => l !== null);

    let by: DigestEngine = 'extractive';
    let model: string | undefined;
    let note: string | undefined;
    let chunks = 0;
    let body = '';

    if (process.env.TCRAB_COMPACT === 'off') {
      // A kill switch for a phone on a metered connection: never call out.
      note = 'TCRAB_COMPACT=off';
    } else if (opts.provider && rendered.length) {
      const chunkChars = Math.max(400, opts.chunkChars ?? 4000);
      const maxChunks = Math.max(1, opts.maxChunks ?? 4);
      const groups = chunkLines(rendered, chunkChars);
      try {
        const parts: string[] = [];
        for (const group of groups.slice(0, maxChunks)) {
          const res = await opts.provider.chat(
            { system: SUMMARY_SYSTEM, messages: [{ role: 'user', content: group.join('\n') }], tools: [] },
            { signal: AbortSignal.timeout(Math.max(1000, opts.timeoutMs ?? 45_000)) },
          );
          const text = (res.text ?? '').trim();
          if (!text) throw new Error('the summariser returned no text');
          parts.push(text);
          chunks++;
        }
        by = 'model';
        model = opts.provider.model;
        body = parts.join('\n');
        const skipped = groups.slice(maxChunks).reduce((n, group) => n + group.length, 0);
        if (skipped > 0) {
          note = `only the first ${maxChunks} of ${groups.length} chunks were summarised`;
          body += `\n\n(${skipped} older turn(s) are not summarised here — the full transcript is on disk.)`;
        }
      } catch (err) {
        // The extractive digest is not a degraded fallback: it is the guarantee.
        by = 'extractive';
        model = undefined;
        chunks = 0;
        note = `model failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      note = 'no model configured';
    }

    if (!body.trim()) body = this.buildDigest(overflow, sessionId);
    this.commitCompact(sessionId, overflow.length, maxEntries, body, { by, model, note });
    return { digest: body, by, model, covered: overflow.length, chunks, note, digestFile };
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

/**
 * The last compacted digest block for a session, for prompt injection.
 * Standalone (not on the class) so the prompt builder can call it without
 * holding a SessionStore.
 */
export function latestDigest(sessionId: string, maxChars = 1500): string {
  const f = path.join(home(), 'memory', 'compacted', `${sanitizeSessionId(sessionId)}.md`);
  if (!fs.existsSync(f)) return '';
  try {
    const text = fs.readFileSync(f, 'utf8');
    const blocks = text.split(/\n## Compacted /).filter((b) => b.trim());
    const last = blocks[blocks.length - 1] ?? '';
    const body = last.replace(/^## Compacted /, '').trim();
    return body.length > maxChars ? `${body.slice(0, maxChars)}\n...` : body;
  } catch {
    return '';
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
  /** Who in the channel is speaking (28.3) — recorded in fact provenance. */
  user?: string;
  enqueuedAt: number;
  /** When the runner picked it up (absent while it is still queued). */
  startedAt?: number;
  /** When an operator stopped it (absent unless it was interrupted). */
  interruptedAt?: number;
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
    primary.startedAt = Date.now();
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
    turn.startedAt = Date.now();
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
    // A stopped turn keeps its `interrupted` status and whatever text the
    // runner settled with (the partial answer — 10.3).
    if (turn.status !== 'interrupted') turn.status = 'done';
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
    turn.interruptedAt = Date.now();
    // The lane stays busy until the runner actually settles: it keeps whatever
    // the model had already said, and the next queued turn starts from a clean
    // transcript (no orphaned work). markDone() preserves the status.
    return true;
  }

  /**
   * The runner's last word after an interrupt: attach the text it kept (final
   * answer + `[interrupted]`) so `termcrab run --wait`, the poll endpoint and
   * the panel all read the same thing (10.3).
   */
  recordInterrupt(sessionId: string, output: string): void {
    const turn = this.running.get(sessionId);
    if (!turn || turn.status !== 'interrupted') return;
    turn.output = output;
    this.notify(sessionId, turn);
  }

  /** Every turn currently running, for `POST /api/stop` and the panel. */
  listRunning(): { sessionId: string; turnId: string; startedAt: number; userMessage: string }[] {
    return [...this.running.entries()].map(([sessionId, turn]) => ({
      sessionId,
      turnId: turn.id,
      startedAt: turn.startedAt ?? turn.enqueuedAt,
      userMessage: turn.userMessage.slice(0, 200),
    }));
  }

  /** Stop every running turn (one tap on the panel, `termcrab stop`). */
  stopAll(): { sessionId: string; turnId: string }[] {
    const stopped: { sessionId: string; turnId: string }[] = [];
    for (const { sessionId, turnId } of this.listRunning()) {
      if (this.interrupt(sessionId)) stopped.push({ sessionId, turnId });
    }
    return stopped;
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
    const busy = new Set<string>(this.running.keys());
    for (const [sessionId, q] of this.queues.entries()) {
      waiting += q.length;
      if (q.length) busy.add(sessionId);
    }
    // Only sessions with work count: an idle session that queued something an
    // hour ago is not busy, so "N waiting" never lies (10.3).
    return { sessions: busy.size, running: this.running.size, waiting };
  }

  /** How many messages are waiting for the session (the run in flight is not waiting). */
  /** Sessions with messages waiting behind a running turn (23.1). */
  listPending(): { sessionId: string; waiting: number }[] {
    return [...this.queues.entries()]
      .map(([sessionId, q]) => ({ sessionId, waiting: q.length }))
      .filter((row) => row.waiting > 0)
      .sort((a, b) => b.waiting - a.waiting);
  }

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
