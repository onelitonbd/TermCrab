/**
 * The main rolling session (batch 28.1).
 *
 * Until now every surface had its own thread: the panel talked in `web:main`,
 * Telegram in `telegram:<chatId>`, cron in `cron:<job>`. That is the right
 * shape for a group chat or a scheduled job, and the wrong shape for *you*:
 * asking the phone a question and then opening the panel meant starting over.
 *
 * OpenClaw's "main session" solves that, and this is ours: when
 * `agent.rollingSession` is on (default), the owner's own conversations — the
 * panel, the terminal, a Telegram DM with the owner, the voice surface — write
 * into one session named `main`. Scheduled jobs, other people's chats, group
 * rooms and subagents keep their own keys, because those are not the owner
 * speaking and must not share the owner's thread.
 *
 * "Rolling" is the second half: the main session rolls over on the first turn
 * of a new local day. The old transcript is archived (never deleted — it stays
 * searchable) and the fresh transcript opens with a one-line note saying that
 * it happened and how much was archived, so the model is not confused by
 * starting in the middle of a conversation it cannot see.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../core/config.js';
import { SessionStore, type Entry } from './sessions.js';

/** The one session the owner talks to, across surfaces. */
export const MAIN_SESSION = 'main';

/** Surfaces that count as "the owner speaking". */
const OWNER_SURFACES = new Set(['web', 'cli', 'voice', 'repl', 'terminal']);

/** Channels where the owner is one specific account (config carries the id). */
const OWNER_DM: { channel: string; ownerOf: (config: Config) => string[] }[] = [
  {
    channel: 'telegram',
    ownerOf: (config) => (config.channels?.telegram?.allowedUserIds ?? []).map(String),
  },
];

export interface RollingOptions {
  /** The session key that would have been used without rolling. */
  fallback: string;
  /** Channel the message arrived on (`web`, `telegram`, `cli`, `cron`…). */
  channel: string;
  /** The chat or job id within that channel. */
  chatId: string;
  /** True for a group chat / channel, which never shares the owner's thread. */
  group?: boolean;
}

/**
 * Which session key this message belongs to. Falls back to `<channel>:<chatId>`
 * for anything that is not the owner speaking, so nothing existing changes.
 */
export function rollingSessionKey(config: Config, opts: RollingOptions): string {
  if (config.agent?.rollingSession === false) return opts.fallback;
  if (opts.group) return opts.fallback;
  const channel = opts.channel.toLowerCase();
  if (OWNER_SURFACES.has(channel)) return config.agent?.mainSession || MAIN_SESSION;
  const dm = OWNER_DM.find((d) => d.channel === channel);
  if (dm && dm.ownerOf(config).includes(String(opts.chatId))) return config.agent?.mainSession || MAIN_SESSION;
  return opts.fallback;
}

export interface RollOutcome {
  rolled: boolean;
  /** Where yesterday (or whenever) went. */
  archivedTo: string | null;
  /** How many entries moved. */
  entries: number;
  reason: string;
}

/**
 * Roll the main session over when its last turn was on an earlier local day.
 * The archive is appended, the live file is emptied, and the new thread starts
 * with a system note naming the archive — memory does the rest.
 */
export function rollMainSession(store: SessionStore, sessionId: string, now = Date.now()): RollOutcome {
  const entries = store.readHot(sessionId, 1_000_000);
  if (!entries.length) return { rolled: false, archivedTo: null, entries: 0, reason: 'nothing to roll' };

  const last = entries[entries.length - 1]!;
  const lastDay = new Date(last.ts ?? 0).toDateString();
  const today = new Date(now).toDateString();
  if (lastDay === today) {
    return { rolled: false, archivedTo: null, entries: 0, reason: `already talking today (${entries.length} entries)` };
  }

  const hotFile = store.transcriptFile(sessionId);
  const archive = store.archivePath(sessionId);
  let moved = 0;
  if (fs.existsSync(hotFile)) {
    const body = fs.readFileSync(hotFile, 'utf8');
    moved = body.split('\n').filter((l) => l.trim()).length;
    fs.mkdirSync(path.dirname(archive), { recursive: true });
    fs.appendFileSync(archive, body, 'utf8');
    fs.writeFileSync(hotFile, '', 'utf8');
  }

  const note: Entry = {
    role: 'system',
    content:
      `[rolling] the previous day's conversation (${moved} entries) was archived to ${path.basename(archive)} ` +
      `and this is a fresh thread. It is not lost: search it with \`termcrab sessions search\` ` +
      `(session ${sessionId}), and the facts it taught are already in memory.`,
    ts: now,
  };
  store.append(sessionId, note);
  return { rolled: true, archivedTo: moved ? archive : null, entries: moved, reason: `first turn of a new day` };
}

/** Plain-English line for `/status` and `sessions show`. */
export function rollingLine(config: Config, sessionId: string): string {
  const on = config.agent?.rollingSession !== false;
  if (sessionId !== (config.agent?.mainSession || MAIN_SESSION)) {
    return `session ${sessionId} is its own thread (not the main session)`;
  }
  return on
    ? 'this is the main session: the panel, the terminal and your Telegram DM share it, and it rolls over daily (the archive stays searchable)'
    : 'this is the main session, but rolling is off (agent.rollingSession=false): it keeps one thread';
}
