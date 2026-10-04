/**
 * The wire between a client and the gateway: a version, an envelope, checked
 * request bodies and idempotent submissions (20.2).
 *
 * Two things a phone client needs that "plain HTTP JSON" does not give it:
 * a frame it can trust (version + monotonic seq + a safe type) and a way to
 * retry without doing the work twice (an Idempotency-Key). Unknown event types
 * are allowed and must be ignored; an unknown `v` may not be ignored.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ensureLayout, stateDir } from '../core/paths.js';

export const WIRE_VERSION = 1;

export interface WireEvent {
  v: number;
  seq: number;
  ts: number;
  type: string;
  [key: string]: unknown;
}

/**
 * The concrete types this gateway emits, grouped into the families the docs
 * promise. A test scans the source for `emit({ type: '…' })` and fails when a
 * type is missing here (so the docs cannot fall behind the code) and fails when
 * docs/API.md does not name a family (so the promise is visible to clients).
 */
export const EVENT_FAMILIES: Array<{ family: string; types: string[]; when: string; payload: string }> = [
  { family: 'turn', types: ['delta', 'draft', 'error', 'approval', 'steer', 'stop'], when: 'a turn streams, wants a yes/no, or is stopped', payload: 'text / tool previews / approval {id, tool, args}' },
  { family: 'tool', types: ['tool:start', 'tool:end'], when: 'one tool call begins and finishes', payload: 'name, args, toolCallId, ok, result (trimmed to 200 chars on the wire)' },
  { family: 'run', types: ['run:start', 'run:end'], when: 'a run starts and ends', payload: 'runId, sessionId, text, iterations, usage, costUsd' },
  { family: 'thinking', types: ['thinking:delta', 'thinkingCaps'], when: 'the model thinks out loud, or the model list changes', payload: 'text / per-model caps' },
  { family: 'voice', types: ['wake', 'tts:chunk', 'stt:result'], when: 'the wake loop hears, speaks or transcribes', payload: 'text, reason' },
  { family: 'canvas', types: ['canvas:update', 'canvas:remove'], when: 'a canvas document changes', payload: 'canvas id, patch' },
  { family: 'channel', types: ['discord:message', 'matrix:message', 'signal:message', 'slack:message', 'sms:message'], when: 'a message arrives on a channel', payload: 'channel, chat, userId, text' },
  { family: 'schedule', types: ['cron', 'cron-output'], when: 'a scheduled job fires or is edited, or a job result is delivered to the panel', payload: 'job id, name, next run / delivered text' },
  { family: 'memory', types: ['dream'], when: 'memory is consolidated', payload: 'file, count, by' },
  { family: 'panel', types: ['update', 'tasks', 'ask'], when: 'the panel reloads config, suggests a task, or asks a question', payload: 'section / suggestions / question' },
  { family: 'presence', types: ['presence'], when: 'who can reach the agent changes (a client attaches or leaves, a device pairs)', payload: 'change, watchers, summary' },
  { family: 'trigger', types: ['trigger'], when: 'an internal event woke a hook', payload: 'event, hooks[]' },
  { family: 'session', types: ['session:reset'], when: 'a conversation\'s working context starts over', payload: 'sessionId, reason (the transcript is archived, not deleted)' },
];

/** Every type the gateway may put on the wire. */
export const EVENT_TYPES: string[] = EVENT_FAMILIES.flatMap((f) => f.types);

let channelSeq = 0;

/**
 * Safe token for an event type. Case is kept exactly: the panel listens for
 * `thinkingCaps` and `canvas:update` by name, and a protocol layer that
 * "helpfully" lowercases them would silently stop those updates arriving.
 */
export function safeEventType(type: string): string {
  const cleaned = String(type ?? '')
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return cleaned || 'unknown';
}

/**
 * Wrap whatever the agent emitted into a frame the protocol promises. The
 * original fields stay where they are (the panel reads them flat), with `v`
 * and `seq` added; a type that is not a safe token is normalised, not dropped.
 */
export function wrapEvent(ev: Record<string, unknown>, seq?: number): WireEvent {
  channelSeq = typeof seq === 'number' ? seq : channelSeq + 1;
  const { ts, ...rest } = ev as { ts?: number } & Record<string, unknown>;
  return {
    v: WIRE_VERSION,
    seq: channelSeq,
    ts: typeof ts === 'number' ? ts : Date.now(),
    ...rest,
    type: safeEventType(String(rest.type ?? 'unknown')),
  };
}

/** Every reason a frame is not something a client was promised. Empty = valid. */
export function checkWireEvent(ev: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (ev.v !== WIRE_VERSION) problems.push(`v is ${String(ev.v)}, expected ${WIRE_VERSION}`);
  if (typeof ev.seq !== 'number' || !Number.isInteger(ev.seq) || ev.seq < 1) {
    problems.push('seq must be a positive integer');
  }
  if (typeof ev.ts !== 'number' || !Number.isFinite(ev.ts)) problems.push('ts must be a number');
  if (typeof ev.type !== 'string' || !ev.type) problems.push('type is required');
  else if (ev.type !== safeEventType(ev.type)) problems.push(`type ${ev.type} is not a safe token`);
  return problems;
}

/** Which documented family does this concrete type belong to? */
export function eventFamily(type: string): string | null {
  const t = safeEventType(type);
  return EVENT_FAMILIES.find((f) => f.types.includes(t))?.family ?? null;
}

// ---------------------------------------------------------------------------
// Request bodies, checked once, with a field name so a client can fix it.
// ---------------------------------------------------------------------------

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; field?: string };

export interface ChatRequest {
  message: string;
  sessionId: string;
  agent?: string;
  thinkingLevel?: string;
  idempotencyKey?: string;
}

const MAX_MESSAGE = 100_000;

export function parseChatRequest(body: unknown, headerKey?: string | null): Parsed<ChatRequest> {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'body must be a JSON object', field: 'body' };
  }
  const b = body as Record<string, unknown>;
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  if (!message) return { ok: false, error: 'message required', field: 'message' };
  if (message.length > MAX_MESSAGE) {
    return { ok: false, error: `message is longer than ${MAX_MESSAGE} characters`, field: 'message' };
  }
  const asString = (v: unknown, max = 120): string | undefined =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
  const fromBody = asString(b.idempotencyKey ?? b.idempotency_key, 200);
  return {
    ok: true,
    value: {
      message,
      sessionId: asString(b.sessionId, 200) ?? 'web:main',
      agent: asString(b.agent, 60),
      thinkingLevel: asString(b.thinkingLevel, 20),
      idempotencyKey: fromBody ?? (headerKey ? headerKey.trim().slice(0, 200) : undefined),
    },
  };
}

export function parsePairRequest(body: unknown): Parsed<{ code: string; name: string }> {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'body must be a JSON object', field: 'body' };
  }
  const b = body as Record<string, unknown>;
  const code = typeof b.code === 'string' ? b.code.trim() : '';
  if (!code) return { ok: false, error: 'pairing code required', field: 'code' };
  const name = typeof b.name === 'string' && b.name.trim() ? b.name.trim().slice(0, 40) : 'device';
  return { ok: true, value: { code, name } };
}

// ---------------------------------------------------------------------------
// Idempotency: the same key returns the same run, for a day.
// ---------------------------------------------------------------------------

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60_000;
const IDEMPOTENCY_CAP = 500;

interface IdemFile {
  entries: Record<string, { at: number; value: unknown }>;
}

export function idempotencyPath(): string {
  return path.join(stateDir(), 'idempotency.json');
}

function readIdem(): IdemFile {
  const file = idempotencyPath();
  if (!fs.existsSync(file)) return { entries: {} };
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<IdemFile>;
    return { entries: raw.entries && typeof raw.entries === 'object' ? raw.entries : {} };
  } catch {
    return { entries: {} };
  }
}

function writeIdem(file: IdemFile): void {
  ensureLayout();
  fs.writeFileSync(idempotencyPath(), `${JSON.stringify(file, null, 2)}\n`, 'utf8');
}

/**
 * Remember what a key produced, or recall it. `recall` prunes expired rows so a
 * long-lived gateway does not accumulate keys forever; the file is capped too.
 */
export function recallIdempotent(key: string, opts: { now?: number } = {}): unknown | null {
  const now = opts.now ?? Date.now();
  if (!key) return null;
  const file = readIdem();
  const hit = file.entries[key];
  if (!hit) return null;
  if (now - hit.at > IDEMPOTENCY_TTL_MS) {
    delete file.entries[key];
    writeIdem(file);
    return null;
  }
  return hit.value ?? null;
}

export function rememberIdempotent(key: string, value: unknown, opts: { now?: number } = {}): void {
  if (!key) return;
  const now = opts.now ?? Date.now();
  const file = readIdem();
  file.entries[key] = { at: now, value };
  const keys = Object.keys(file.entries);
  if (keys.length > IDEMPOTENCY_CAP) {
    keys
      .sort((a, b) => (file.entries[a]!.at ?? 0) - (file.entries[b]!.at ?? 0))
      .slice(0, keys.length - IDEMPOTENCY_CAP)
      .forEach((k) => delete file.entries[k]);
  }
  writeIdem(file);
}
