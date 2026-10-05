/**
 * When a conversation should start fresh (21.3).
 *
 * "Always remember" is a promise the agent should keep about *memory*, not
 * about a chat's working context: a session that has been running for a week
 * drags a week of tool output into every prompt, and a chat resumed after a
 * month of silence re-reads a conversation the user has forgotten. A reset
 * policy says when the model's *view* starts over — the transcript itself is
 * never deleted, it moves to the archive and stays searchable (21.2).
 *
 * Config: `agent.sessionReset` = `never` (default, the old behaviour),
 * `daily` (a new view on the first turn of a new day) or `idle:<minutes>`
 * (a new view after that long without a word).
 */
import fs from 'node:fs';
import { SessionStore, type Entry } from './sessions.js';

export type ResetPolicy =
  | { kind: 'never'; label: string }
  | { kind: 'daily'; label: string }
  | { kind: 'idle'; minutes: number; label: string };

export const DEFAULT_RESET = 'never';

/** Parse whatever the config holds, forgivingly: junk means the default. */
export function parseResetPolicy(value: unknown): ResetPolicy {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!raw || raw === 'never' || raw === 'off' || raw === 'false') return { kind: 'never', label: 'never' };
  if (raw === 'daily' || raw === 'day') return { kind: 'daily', label: 'daily' };
  const idle = raw.match(/^idle:?\s*(\d{1,5})$/);
  if (idle) {
    const minutes = Math.max(1, Number(idle[1]));
    return { kind: 'idle', minutes, label: `after ${minutes} minute(s) of silence` };
  }
  return { kind: 'never', label: 'never' };
}

export interface ResetDecision {
  reset: boolean;
  /** Plain English, shown by `/status` and `sessions show`. */
  reason: string;
  policy: ResetPolicy;
}

/**
 * Should this session's context start over before the next turn?
 *
 * `entries` is the live transcript (newest last). An empty transcript never
 * resets: there is nothing to start over.
 */
export function shouldReset(
  entries: Entry[],
  policy: ResetPolicy,
  now = Date.now(),
): ResetDecision {
  if (policy.kind === 'never' || !entries.length) {
    return { reset: false, reason: `keeps one thread (policy: ${policy.label})`, policy };
  }
  const last = entries[entries.length - 1]!;
  const lastAt = last.ts ?? 0;
  if (policy.kind === 'idle') {
    const idleMs = Math.max(0, now - lastAt);
    if (idleMs >= policy.minutes * 60_000) {
      return {
        reset: true,
        reason: `quiet for ${Math.round(idleMs / 60_000)} minute(s) (policy: ${policy.label})`,
        policy,
      };
    }
    return { reset: false, reason: `last heard ${Math.round(idleMs / 60_000)} minute(s) ago (policy: ${policy.label})`, policy };
  }
  const sameDay = new Date(lastAt).toDateString() === new Date(now).toDateString();
  return sameDay
    ? { reset: false, reason: `already talking today (policy: ${policy.label})`, policy }
    : { reset: true, reason: `first turn of a new day (policy: ${policy.label})`, policy };
}

export interface ResetOutcome {
  reset: boolean;
  reason: string;
  /** Where the old transcript went, when a reset happened. */
  archivedTo: string | null;
  entries: number;
}

/**
 * Move the live transcript into the archive so the next turn starts clean.
 * Nothing is deleted: `sessions search`, `sessions export` and `sessions show`
 * still see everything, and the archive is the same JSONL format.
 */
export function applyReset(
  store: SessionStore,
  sessionId: string,
  policy: ResetPolicy,
  now = Date.now(),
): ResetOutcome {
  const entries = store.readHot(sessionId, 1_000_000);
  const decision = shouldReset(entries, policy, now);
  if (!decision.reset) return { reset: false, reason: decision.reason, archivedTo: null, entries: 0 };

  const hot = store.transcriptFile(sessionId);
  const archive = store.archivePath(sessionId);
  let moved = 0;
  if (fs.existsSync(hot)) {
    const body = fs.readFileSync(hot, 'utf8');
    moved = body.split('\n').filter((l) => l.trim()).length;
    fs.appendFileSync(archive, body, 'utf8');
    fs.writeFileSync(hot, '', 'utf8');
  }
  return { reset: true, reason: decision.reason, archivedTo: moved ? archive : null, entries: moved };
}

/** One sentence for `/status`, whether or not a reset is due right now. */
export function describePolicy(policy: ResetPolicy, entries: Entry[], now = Date.now()): string {
  const decision = shouldReset(entries, policy, now);
  return `Sessions: ${policy.label}${decision.reset ? ` — next turn starts fresh (${decision.reason})` : ` — ${decision.reason}`}`;
}
