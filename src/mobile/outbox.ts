import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { outboxPath, stateDir } from '../core/paths.js';
import type { ChannelName } from '../channels/api.js';

/**
 * Offline outbox: outbound messages that could not be sent (flaky mobile data)
 * are persisted and retried instead of being lost.
 *
 * The first version of this file took the queued items *out* of the JSON file
 * before sending them, so a crash mid-send silently deleted a reply, and a
 * half-written file made every queued message disappear. It is now an
 * acknowledge-after-send queue: an item is only removed once a send has
 * succeeded (`outboxAck`), a failed send keeps the item with its reason and
 * attempt count, and an item that was claimed but never acked (the process
 * died) comes back on the next read. The file is written atomically, so a crash
 * can leave a whole file or the previous one — never half of one.
 *
 * Delivery guarantee, stated honestly: **at least once, acked exactly once**.
 * If a send succeeds and the process dies before the ack is written, that one
 * message can be sent again after the restart; that window is one write, and
 * the alternative (ack first) loses messages instead, which is worse on a
 * phone. `test/tier2.test.ts` 12.5 pins both the "not zero" and the "not twice"
 * halves.
 */
export interface OutboxItem {
  id: string;
  channel: ChannelName;
  chatId: number | string;
  text: string;
  ts: number;
  attempts: number;
  state: 'pending' | 'sending' | 'sent';
  lastAttemptAt?: number;
  sentAt?: number;
  lastError?: string;
}

/** A claim older than this was interrupted by a crash, not by a slow network. */
const STALE_SENDING_MS = 60_000;
/** Sent items are kept for a week (so a phone can be inspected), then swept. */
const KEEP_SENT_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 200;

type LegacyItem = Partial<OutboxItem> & Pick<OutboxItem, 'channel' | 'chatId' | 'text'>;

function normalize(item: LegacyItem): OutboxItem {
  return {
    id: item.id ?? crypto.randomUUID(),
    channel: item.channel,
    chatId: item.chatId,
    text: item.text,
    ts: item.ts ?? Date.now(),
    attempts: item.attempts ?? 0,
    state: item.state ?? 'pending',
    lastAttemptAt: item.lastAttemptAt,
    sentAt: item.sentAt,
    lastError: item.lastError,
  };
}

function load(): OutboxItem[] {
  try {
    if (!fs.existsSync(outboxPath())) return [];
    const raw = JSON.parse(fs.readFileSync(outboxPath(), 'utf8')) as LegacyItem[];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalize);
  } catch {
    return [];
  }
}

function save(items: OutboxItem[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  const file = outboxPath();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(items.slice(-MAX_ITEMS), null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function update(id: string, patch: (item: OutboxItem) => OutboxItem): void {
  const items = load();
  let changed = false;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    changed = true;
    return patch(item);
  });
  if (changed) save(next);
}

/** Queue a message. Returns the stored item (with its id) so callers can ack it. */
export function outboxPush(item: {
  channel: OutboxItem['channel'];
  chatId: number | string;
  text: string;
  ts?: number;
  /** Why the send failed, kept on the item so a retry has context. */
  error?: string;
}): OutboxItem {
  const { error, ...rest } = item;
  const stored = normalize({ ...rest, attempts: 0, state: 'pending', ...(error ? { lastError: error } : {}) });
  const items = load();
  items.push(stored);
  save(items);
  return stored;
}

/**
 * Everything still owed. Items claimed by a run that died (state `sending` and
 * old) are handed back as pending, so a crash can delay a reply but never drop
 * it. Pass `{ staleMs: 0 }` to make a just-claimed item visible (used by tests).
 */
export function outboxPending(
  channel?: OutboxItem['channel'],
  opts: { staleMs?: number } = {},
): OutboxItem[] {
  const staleMs = opts.staleMs ?? STALE_SENDING_MS;
  const now = Date.now();
  let changed = false;
  const items = load().map((item) => {
    const stale = item.state === 'sending' && now - (item.lastAttemptAt ?? 0) >= staleMs;
    if (!stale) return item;
    changed = true;
    return { ...item, state: 'pending' as const, lastError: item.lastError ?? 'interrupted by a restart' };
  });
  if (changed) save(items);
  return items.filter((i) => i.state !== 'sent' && (!channel || i.channel === channel));
}

/** Claim an item for sending (persisted first, so a crash is visible). */
export function outboxMarkSending(id: string): void {
  update(id, (item) => ({
    ...item,
    state: 'sending',
    attempts: item.attempts + 1,
    lastAttemptAt: Date.now(),
    lastError: undefined,
  }));
}

/** The send succeeded: this message is done and will never be queued again. */
export function outboxAck(id: string): void {
  update(id, (item) => ({ ...item, state: 'sent', sentAt: Date.now(), lastError: undefined }));
}

/** The send failed: keep it (with the reason) for the next flush. */
export function outboxFail(id: string, error?: string): void {
  update(id, (item) => ({ ...item, state: 'pending', lastError: error ?? 'send failed' }));
}

/** Forget sent items older than `keepMs`; pending items are never touched. */
export function outboxSweep(keepMs = KEEP_SENT_MS): number {
  const items = load();
  const cutoff = Date.now() - keepMs;
  // Strictly newer than the cutoff: with `keepMs = 0` this means "every sent
  // message", regardless of whether the ack and the sweep landed in the same
  // millisecond (which they do in tests).
  const kept = items.filter((i) => i.state !== 'sent' || (i.sentAt ?? i.ts) > cutoff);
  const removed = items.length - kept.length;
  if (removed > 0) save(kept);
  return removed;
}

export function outboxPeek(): OutboxItem[] {
  return load();
}

export function outboxFile(): string {
  return path.basename(outboxPath());
}
