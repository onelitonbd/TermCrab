/**
 * Batch 53.5 — every attachment can be downloaded from the panel.
 *
 * `send_file` pushes a file into a chat, and until now that was the end of the
 * story: the panel could show the tool card but not the file. This module is the
 * record the panel reads instead — one JSONL line per file actually sent, with
 * the path that really existed at the time. The download route resolves an *id*
 * from this log, never a path from the request, so the panel can only serve
 * files the agent itself sent.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { home, stateDir, workspaceDir } from '../core/paths.js';

export interface SharedFileRecord {
  /** Stable short id (derived from the path and time) used for downloads. */
  id: string;
  at: number;
  name: string;
  /** Absolute path as it was when the file was sent. */
  path: string;
  bytes: number;
  channel?: string;
  address?: string;
  sessionId?: string;
  /** Where it came from: a chat send, or the panel's own image button. */
  via?: 'send' | 'image';
}

export interface SharedFileEntry extends SharedFileRecord {
  /** Whether the file is still where it was (a cleaned-up temp file is not). */
  exists: boolean;
}

/** Keep the log readable: the newest 200 entries are what the panel shows. */
export const SHARED_FILES_MAX = 200;

export function sharedFilesPath(): string {
  return path.join(stateDir(), 'sent-files.jsonl');
}

/** Short, stable, and safe in a URL. */
export function sharedFileId(at: number, file: string): string {
  return crypto.createHash('sha1').update(`${at}\n${file}`).digest('hex').slice(0, 12);
}

/**
 * Append a record. Serialisation failures are swallowed on purpose: a chat that
 * received its file must not fail because a log could not be written.
 */
export function recordSharedFile(rec: Omit<SharedFileRecord, 'id' | 'at'> & { at?: number }): SharedFileRecord | null {
  const at = rec.at ?? Date.now();
  const record: SharedFileRecord = {
    id: sharedFileId(at, rec.path),
    at,
    name: rec.name,
    path: rec.path,
    bytes: rec.bytes,
    ...(rec.channel ? { channel: rec.channel } : {}),
    ...(rec.address ? { address: rec.address } : {}),
    ...(rec.sessionId ? { sessionId: rec.sessionId } : {}),
    ...(rec.via ? { via: rec.via } : {}),
  };
  try {
    fs.mkdirSync(path.dirname(sharedFilesPath()), { recursive: true });
    fs.appendFileSync(sharedFilesPath(), `${JSON.stringify(record)}\n`, 'utf8');
  } catch {
    return null;
  }
  return record;
}

/** Everything sent, newest first. A corrupt line is skipped, not fatal. */
export function listSharedFiles(opts: { limit?: number } = {}): SharedFileEntry[] {
  let raw = '';
  try {
    raw = fs.readFileSync(sharedFilesPath(), 'utf8');
  } catch {
    return [];
  }
  const out: SharedFileEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line) as SharedFileRecord;
      if (!rec?.path || !rec?.id) continue;
      out.push({ ...rec, exists: fs.existsSync(rec.path) });
    } catch {
      /* a half-written line from a crash: skip it */
    }
  }
  out.reverse();
  return typeof opts.limit === 'number' ? out.slice(0, Math.max(0, opts.limit)) : out;
}

/** Resolve an id from the log — the only way a download names a file. */
export function findSharedFile(id: string): SharedFileEntry | null {
  const wanted = (id ?? '').trim();
  if (!wanted) return null;
  return listSharedFiles().find((r) => r.id === wanted) ?? null;
}

/** Is this path inside one of the roots the agent is allowed to send from? */
export function withinRoots(file: string, roots: string[] = [home(), workspaceDir(), process.cwd()]): boolean {
  const abs = path.resolve(file);
  return roots.some((root) => {
    const r = path.resolve(root);
    return abs === r || abs.startsWith(r.endsWith(path.sep) ? r : r + path.sep);
  });
}
