/**
 * The inbox the agent can browse (17.1–17.4).
 *
 * Arrivals used to be a one-shot sentence. Now every arrival is remembered in
 * `.inbox-index.json` (small, protected from the disk budget) and the text
 * learned about it is saved next to the file as `<name>.text.md`, so the agent
 * can list what came in, read it again without re-parsing, and say "that file
 * is gone" honestly after the retention rule trims it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { workspaceDir } from '../core/paths.js';
import { DEFAULT_MAX_CHARS, extractText, isExtractable } from './extract.js';

export interface InboxEntry {
  /** File name inside the inbox (no directory). */
  name: string;
  /** Workspace-relative path, i.e. what the agent is told. */
  relative: string;
  bytes: number;
  /** ISO timestamp of the arrival. */
  at: string;
  kind: 'photo' | 'document' | 'audio';
  /** Workspace-relative path of the text sidecar, when one was written. */
  text?: string;
  /** Sidecar path is known but its file is no longer on disk. */
  textGone?: boolean;
  /** The arrival itself is no longer on disk (trimmed by the disk budget). */
  gone?: boolean;
}

export const INBOX_INDEX_NAME = '.inbox-index.json';
/** How many arrivals the index remembers (oldest are dropped, files are not). */
export const INBOX_INDEX_MAX = 200;

export function inboxDir(): string {
  return path.join(workspaceDir(), 'inbox');
}

export function inboxIndexPath(): string {
  return path.join(inboxDir(), INBOX_INDEX_NAME);
}

/** The sidecar path for an arrival: `<name>.text.md` next to the file. */
export function sidecarPath(name: string): string {
  const safe = path.basename(name);
  return path.join(inboxDir(), `${safe}.text.md`);
}

export function relativeToWorkspace(target: string): string {
  return path.relative(workspaceDir(), target).split(path.sep).join('/');
}

/**
 * Is this a plain name inside the inbox (not a path)? A chat can send anything,
 * so anything with a separator, a drive letter or `..` is refused here rather
 * than resolved.
 */
export function isInboxName(name: string): boolean {
  const n = (name ?? '').trim();
  if (!n || n === '.' || n === '..') return false;
  if (n.includes('/') || n.includes('\\') || n.includes(':')) return false;
  return path.basename(n) === n;
}

function readRawIndex(): InboxEntry[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(inboxIndexPath(), 'utf8')) as { entries?: InboxEntry[] };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

/** Write the index, newest last, capped. Failures are silent: no arrival
 *  should fail because its bookkeeping could not be written. */
function writeRawIndex(entries: InboxEntry[]): void {
  try {
    fs.mkdirSync(inboxDir(), { recursive: true });
    const trimmed = entries.slice(-INBOX_INDEX_MAX);
    fs.writeFileSync(inboxIndexPath(), `${JSON.stringify({ version: 1, entries: trimmed }, null, 1)}\n`, 'utf8');
  } catch {
    /* the file is still on disk; only the note is missing */
  }
}

/** Save the text learned at arrival as a sidecar and return its relative path. */
export function saveSidecar(name: string, text: string): string | undefined {
  if (!isInboxName(name) || !text.trim()) return undefined;
  try {
    const target = sidecarPath(name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${text.trimEnd()}\n`, 'utf8');
    return relativeToWorkspace(target);
  } catch {
    return undefined;
  }
}

/** Read the sidecar text for an arrival, or undefined when there is none. */
export function readSidecar(name: string): string | undefined {
  try {
    return fs.readFileSync(sidecarPath(name), 'utf8');
  } catch {
    return undefined;
  }
}

export interface RecordInput {
  name: string;
  bytes: number;
  kind: InboxEntry['kind'];
  /** The text learned at arrival (extracted / transcribed / described). */
  text?: string;
  at?: Date;
}

/** Remember one arrival: sidecar text + index row (newest last, one row per name). */
export function recordArrival(input: RecordInput): InboxEntry | undefined {
  if (!isInboxName(input.name)) return undefined;
  const file = path.join(inboxDir(), input.name);
  const text = input.text && input.text.trim() ? saveSidecar(input.name, input.text) : undefined;
  const entry: InboxEntry = {
    name: input.name,
    relative: relativeToWorkspace(file),
    bytes: input.bytes,
    at: (input.at ?? new Date()).toISOString(),
    kind: input.kind,
    ...(text ? { text } : {}),
  };
  const others = readRawIndex().filter((e) => e.name !== entry.name);
  writeRawIndex([...others, entry]);
  return entry;
}

/**
 * The index as the agent should see it: newest first, with `gone` flags set
 * from what is actually on disk right now (the disk budget may have trimmed a
 * file while its note stayed behind).
 */
export function listInbox(opts: { limit?: number } = {}): InboxEntry[] {
  const rows = readRawIndex()
    .map((e) => {
      const fileGone = !fs.existsSync(path.join(inboxDir(), e.name));
      const textGone = e.text ? !fs.existsSync(path.join(workspaceDir(), e.text)) : false;
      return { ...e, gone: fileGone, ...(textGone ? { textGone: true } : {}) };
    })
    .reverse();
  const limit = opts.limit ?? rows.length;
  return rows.slice(0, Math.max(0, limit));
}

/** `34 KB · 2 hours ago` — the same words a person would use. */
export function humanAge(iso: string, now = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'unknown age';
  const min = Math.max(0, Math.round((now - then) / 60_000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** One line per arrival — used by the `inbox_list` tool and `/inbox`. */
export function formatInbox(entries: InboxEntry[], now = Date.now()): string {
  if (!entries.length) return 'the inbox is empty (nothing has been sent to you yet)';
  return entries
    .map((e) => {
      const flags = [e.kind, humanSize(e.bytes), humanAge(e.at, now)];
      if (e.text && !e.textGone) flags.push('text saved');
      if (e.gone) flags.push('GONE — trimmed by the disk budget');
      else if (e.textGone) flags.push('text note gone');
      return `${e.relative} — ${flags.join(', ')}`;
    })
    .join('\n');
}

export type ReadArrival =
  | {
      ok: true;
      text: string;
      source: 'sidecar' | 'extracted';
      /** The text came from the saved note because the file itself is gone. */
      gone?: boolean;
    }
  | { ok: false; reason: string };

/**
 * The text of one arrival (17.1/17.2): the sidecar if it is there, otherwise the
 * file is read again with the same readers the intake used. A trimmed file gets
 * a sentence that says so (17.4) instead of a missing-path error.
 */
export function readArrival(name: string, opts: { maxChars?: number } = {}): ReadArrival {
  if (!isInboxName(name)) {
    return { ok: false, reason: 'that is not an inbox file name (names have no folders or / in them)' };
  }
  const file = path.join(inboxDir(), name);
  const known = readRawIndex().find((e) => e.name === name);
  const sidecar = readSidecar(name);
  const fileGone = !fs.existsSync(file);
  // The text saved at arrival outlives the file it came from: if the disk
  // budget trimmed the arrival, the answer is still the text, with a note
  // saying the original is gone (17.4). Only when neither is left is it an
  // error — and that error says when the file was here.
  if (sidecar) return { ok: true, text: sidecar, source: 'sidecar', ...(fileGone ? { gone: true } : {}) };
  if (fileGone) {
    const when = known ? ` (it arrived ${humanAge(known.at)})` : '';
    return { ok: false, reason: `that file is gone${when} — the disk budget trims old inbox files` };
  }
  const read = extractText(file, { maxChars: opts.maxChars ?? DEFAULT_MAX_CHARS, name });
  if (read.ok && read.text) return { ok: true, text: read.text, source: 'extracted' };
  if (!isExtractable(name)) {
    return { ok: false, reason: `there is no reader for ${path.extname(name) || 'that file type'} — the file itself is at ${relativeToWorkspace(file)}` };
  }
  return { ok: false, reason: read.reason ?? 'no text found in that file' };
}
