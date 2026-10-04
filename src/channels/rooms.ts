/**
 * 34.3 — ambient room history.
 *
 * A group chat where the bot is only mentioned is a room the agent hears a
 * fraction of: everything else was dropped by the mention policy before any
 * session saw it. That is the gap this closes. Every message a channel adapter
 * receives in a room is appended here (bounded, local, plain JSONL), together
 * with whether it was *addressed* to the bot — and the agent can then answer
 * "what did I miss?" with the messages it never got a turn for.
 *
 * Deliberately small:
 *   - flat files under `state/rooms/<channel>-<room>.jsonl`, one line per message
 *   - bounded twice (message count and bytes), trimmed oldest-first
 *   - one writer (the channel adapter), append-only; a torn tail is skipped
 *   - nothing here is a transcript: sessions stay the record of conversations
 *     the agent actually had
 */
import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';

export interface RoomRecord {
  ts: number;
  channel: string;
  room: string;
  from: string;
  fromId?: string;
  text: string;
  /** True when this message ran an agent turn (mentioned, replied to, or policy all). */
  addressed: boolean;
}

export interface RoomInfo {
  key: string;
  channel: string;
  room: string;
  messages: number;
  sinceAddressed: number;
  lastAt: number;
  bytes: number;
}

export const ROOM_MAX_MESSAGES = 200;
export const ROOM_MAX_BYTES = 64 * 1024;
/** Per message we keep at most this many characters — a room log is not a document store. */
const TEXT_LIMIT = 4000;

export function roomsDir(): string {
  return path.join(stateDir(), 'rooms');
}

/** `telegram:-100123` — the form the CLI, the tool and `/history` all speak. */
export function roomKey(channel: string, room: string): string {
  return `${channel}:${room}`;
}

function fileName(channel: string, room: string): string {
  const safe = `${channel}-${String(room)}`.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  return `${safe || 'room'}.jsonl`;
}

function fileFor(channel: string, room: string): string {
  return path.join(roomsDir(), fileName(channel, room));
}

function parseLine(line: string): RoomRecord | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const v = JSON.parse(trimmed) as Partial<RoomRecord>;
    if (typeof v.ts !== 'number' || typeof v.text !== 'string' || !v.text) return null;
    return {
      ts: v.ts,
      channel: typeof v.channel === 'string' ? v.channel : '',
      room: typeof v.room === 'string' ? v.room : '',
      from: typeof v.from === 'string' ? v.from : '',
      ...(typeof v.fromId === 'string' ? { fromId: v.fromId } : {}),
      text: v.text,
      addressed: v.addressed === true,
    };
  } catch {
    return null; // a torn or hand-edited line is skipped, never fatal
  }
}

function readAll(file: string): RoomRecord[] {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map(parseLine)
      .filter((r): r is RoomRecord => r !== null);
  } catch {
    return [];
  }
}

/** Keep the tail: count first, then bytes (a few huge messages must not fill the state dir). */
function trimFile(file: string, maxMessages: number, maxBytes: number): void {
  let lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim());
  let changed = false;
  if (lines.length > maxMessages) {
    lines = lines.slice(-maxMessages);
    changed = true;
  }
  let bytes = Buffer.byteLength(lines.join('\n'), 'utf8');
  while (lines.length > 1 && bytes > maxBytes) {
    lines = lines.slice(Math.max(1, Math.ceil(lines.length * 0.2)));
    bytes = Buffer.byteLength(lines.join('\n'), 'utf8');
    changed = true;
  }
  if (changed) fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

export interface RecordOptions {
  maxMessages?: number;
  maxBytes?: number;
}

/** Append one observed message. Never throws: a full disk must not cost a reply. */
export function recordRoomMessage(
  input: Omit<RoomRecord, 'ts'> & { ts?: number },
  opts: RecordOptions = {},
): boolean {
  const text = input.text.replace(/\s+/g, ' ').trim().slice(0, TEXT_LIMIT);
  if (!text) return false;
  try {
    const file = fileFor(input.channel, input.room);
    fs.mkdirSync(roomsDir(), { recursive: true });
    const record: RoomRecord = {
      ts: input.ts ?? Date.now(),
      channel: input.channel,
      room: input.room,
      from: input.from,
      ...(input.fromId ? { fromId: input.fromId } : {}),
      text,
      addressed: input.addressed === true,
    };
    fs.appendFileSync(file, JSON.stringify(record) + '\n', 'utf8');
    const bytes = fs.statSync(file).size;
    const maxMessages = opts.maxMessages ?? ROOM_MAX_MESSAGES;
    const maxBytes = opts.maxBytes ?? ROOM_MAX_BYTES;
    if (bytes > maxBytes || readAll(file).length > maxMessages) trimFile(file, maxMessages, maxBytes);
    return true;
  } catch {
    return false;
  }
}

/** The last `limit` messages of a room, oldest first. */
export function readRoom(channel: string, room: string, limit = 50): RoomRecord[] {
  const all = readAll(fileFor(channel, room));
  return limit > 0 ? all.slice(-limit) : all;
}

export function roomInfo(channel: string, room: string): RoomInfo {
  const all = readRoom(channel, room, 0);
  let lastAddressedIdx = -1;
  for (let i = 0; i < all.length; i++) if (all[i]!.addressed) lastAddressedIdx = i;
  const bytes = (() => {
    try {
      return fs.statSync(fileFor(channel, room)).size;
    } catch {
      return 0;
    }
  })();
  return {
    key: roomKey(channel, room),
    channel,
    room,
    messages: all.length,
    sinceAddressed: lastAddressedIdx < 0 ? all.length : all.length - lastAddressedIdx - 1,
    lastAt: all.length ? all[all.length - 1]!.ts : 0,
    bytes,
  };
}

/** Every room that has history, newest activity first. */
export function listRooms(): RoomInfo[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(roomsDir()).filter((f) => f.endsWith('.jsonl'));
  } catch {
    return [];
  }
  const out: RoomInfo[] = [];
  for (const f of files) {
    const all = readAll(path.join(roomsDir(), f));
    if (!all.length) continue;
    // The records carry the real names; the file name is only a fallback.
    const withNames = all.find((r) => r.channel && r.room);
    const fallback = f.replace(/\.jsonl$/, '');
    const dash = fallback.indexOf('-');
    const channel = withNames?.channel || (dash > 0 ? fallback.slice(0, dash) : '');
    const room = withNames?.room || (dash > 0 ? fallback.slice(dash + 1) : fallback);
    out.push(roomInfo(channel, room));
  }
  return out.sort((a, b) => b.lastAt - a.lastAt);
}

/** Forget one room's history. Returns how many messages were dropped. */
export function clearRoom(channel: string, room: string): number {
  const info = roomInfo(channel, room);
  try {
    fs.rmSync(fileFor(channel, room));
  } catch {
    /* nothing to remove */
  }
  return info.messages;
}

/** `telegram:-100123` back to its parts; null when the key is not a room key. */
export function parseRoomKey(key: string): { channel: string; room: string } | null {
  const idx = key.indexOf(':');
  if (idx <= 0 || idx === key.length - 1) return null;
  return { channel: key.slice(0, idx), room: key.slice(idx + 1) };
}

function clock(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface FormatOptions {
  limit?: number;
  /** Cap each line so a chat reply cannot become a wall. */
  lineChars?: number;
}

/**
 * What the agent (or a person in a chat) sees: the last messages of a room,
 * with the count of the ones that arrived while the bot was not addressed.
 */
export function formatRoomHistory(channel: string, room: string, opts: FormatOptions = {}): string {
  const limit = opts.limit ?? 12;
  const lineChars = opts.lineChars ?? 160;
  const info = roomInfo(channel, room);
  if (!info.messages) {
    return `No messages recorded for ${roomKey(channel, room)} yet — ambient history starts with the first message the bot sees there.`;
  }
  const messages = readRoom(channel, room, limit);
  const header =
    `🏠 ${roomKey(channel, room)} — ${info.messages} message(s) seen, ` +
    `${info.sinceAddressed} since you were last addressed` +
    (messages.length < info.messages ? ` (showing the last ${messages.length})` : '');
  const lines = messages.map((m) => {
    const who = m.from || m.fromId || 'someone';
    const text = m.text.length > lineChars ? `${m.text.slice(0, lineChars - 1)}…` : m.text;
    return `  ${clock(m.ts)} ${who}: ${text}${m.addressed ? '  [you answered]' : ''}`;
  });
  return [header, ...lines].join('\n');
}
