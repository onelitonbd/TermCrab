/**
 * 37.4 — the record of runs that really happened.
 *
 * The suite proves the Telegram client against a fake Bot API, and
 * `scripts/smoke-telegram.mjs` proves it against the real one — but a live run
 * that leaves no trace is a story somebody has to remember. So every live run
 * may append one line to `docs/openclaw/data/telegram-runs.jsonl`: what was
 * sent, what came back, how long it took, and a *fingerprint* of the token
 * (never the token) so two runs can be told apart without a secret in git.
 *
 * The file is evidence, not state: it is committed, it is read by the panel's
 * Work page, and it holds the newest `RUN_LIMIT` runs so it cannot grow
 * forever. Nothing here is required for the channel to work.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { PACKAGE_ROOT } from '../core/paths.js';

export interface TelegramRun {
  /** When the run finished, ISO-8601 UTC. */
  at: string;
  /** `ok` when the reply was read back, `sent` when the send worked but no reply arrived. */
  status: 'ok' | 'sent';
  /** The bot's @username (or its id) — from `getMe`, never the token. */
  bot: string;
  /** Host of the Bot API that answered, e.g. `api.telegram.org`. */
  api: string;
  /** The chat the message went to. */
  chat: number;
  /** Message id the bot sent, when Telegram returned one. */
  messageId: number | null;
  /** The text we sent (trimmed to 120 characters). */
  sent: string;
  /** What the owner replied (trimmed to 120 characters), or empty. */
  reply: string;
  /** How long the reply took, in ms, or null when nothing came back. */
  replyMs: number | null;
  /** First 8 hex of sha256(api|token) — identifies a bot without carrying its secret. */
  token: string;
}

/** The newest runs kept; older lines are dropped when a new one is appended. */
export const RUN_LIMIT = 20;

/** Where the evidence lives: inside the checkout, next to the other reports. */
export function telegramRunsPath(): string {
  return process.env.TCRAB_TELEGRAM_RUNS || path.join(PACKAGE_ROOT, 'docs', 'openclaw', 'data', 'telegram-runs.jsonl');
}

/** Identify a token without leaking it: the first 8 hex of a salted sha256. */
export function tokenFingerprint(token: string, api = 'https://api.telegram.org'): string {
  return crypto.createHash('sha256').update(`${api}|${token}`).digest('hex').slice(0, 8);
}

/** Parse a file of JSON lines, skipping anything torn — evidence is not worth crashing over. */
export function readTelegramRuns(file = telegramRunsPath()): TelegramRun[] {
  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const runs: TelegramRun[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as TelegramRun;
      if (parsed && typeof parsed.at === 'string') runs.push(parsed);
    } catch {
      /* a half-written line is dropped, not thrown */
    }
  }
  return runs.sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

/** The newest `limit` runs, newest first. */
export function lastTelegramRuns(limit = 5, file = telegramRunsPath()): TelegramRun[] {
  return readTelegramRuns(file).slice(0, Math.max(0, limit));
}

/** Append one run and keep only the newest `RUN_LIMIT` lines. Returns the file. */
export function recordTelegramRun(run: TelegramRun, file = telegramRunsPath()): string {
  const kept = [run, ...readTelegramRuns(file)].slice(0, RUN_LIMIT).reverse();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${kept.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
  return file;
}

/** One line for a person: `2026-10-04 04:52 UTC · ok · reply in 1.2 s · chat 456`. */
export function describeTelegramRun(run: TelegramRun): string {
  const when = run.at.replace('T', ' ').slice(0, 16) + ' UTC';
  const took = run.replyMs === null ? 'no reply' : `reply in ${(run.replyMs / 1000).toFixed(1)} s`;
  return `${when} · ${run.status} · ${took} · chat ${run.chat}`;
}
