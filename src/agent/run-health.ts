/**
 * "Why is it stuck?" (23.1)
 *
 * The data to answer that already exists in three places — the queue knows
 * which turns are running and since when, the run trace knows the last tool
 * call and how long it took, and the provider knows whether its last call
 * failed — but nobody put it together. This module does, and gives each
 * running run one of four plain verdicts with a suggested action, so a user on
 * a phone gets a sentence instead of a stack trace:
 *
 *   working  — a tool or a model call is in flight right now (fine)
 *   slow     — it is taking long, but something is moving (wait or stop)
 *   stuck    — nothing has moved for a long time (stop it and retry)
 *   failing  — the provider is erroring (fix the model/key, then retry)
 */
import type { SessionQueue } from './sessions.js';
import { getRun, listRuns, type RunTrace } from '../core/tracing.js';

export type RunVerdict = 'working' | 'slow' | 'stuck' | 'failing' | 'queued';

export interface RunHealth {
  sessionId: string;
  turnId?: string;
  runId?: string;
  /** What the user asked, trimmed. */
  request: string;
  startedAt: number;
  elapsedMs: number;
  verdict: RunVerdict;
  /** The most recent thing that happened, in plain English. */
  lastActivity: string;
  /** Milliseconds since that activity. */
  idleMs: number;
  /** What to do about it. */
  suggestion: string;
  provider?: string;
  model?: string;
  toolCalls: number;
}

/** How long a turn may make no progress before it is called slow, then stuck. */
export const SLOW_AFTER_MS = 60_000;
export const STUCK_AFTER_MS = 5 * 60_000;

export interface HealthInput {
  queue?: Pick<SessionQueue, 'listRunning'> & Partial<Pick<SessionQueue, 'listPending'>>;
  traces?: RunTrace[];
  now?: number;
  slowAfterMs?: number;
  stuckAfterMs?: number;
}

function traceFor(traces: RunTrace[], sessionId: string, startedAt: number): RunTrace | undefined {
  // Runs share ids with turns (10.2); fall back to "the newest run in this
  // session that started around the same time" when the id is not to hand.
  const sameSession = traces.filter((t) => t.sessionId === sessionId && t.status === 'running');
  if (!sameSession.length) return undefined;
  return sameSession.sort(
    (a, b) => Math.abs(a.start - startedAt) - Math.abs(b.start - startedAt),
  )[0];
}

function lastSpanName(trace: RunTrace): { name: string; at: number } | null {
  const open = trace.spans.filter((s) => !s.end);
  const all = [...trace.spans].sort((a, b) => (b.end ?? b.start) - (a.end ?? a.start));
  const newest = open[open.length - 1] ?? all[0];
  if (!newest) return null;
  return { name: newest.name, at: newest.end ?? newest.start };
}

/** One verdict per running turn. Empty when nothing is running. */
export function runHealth(input: HealthInput = {}): RunHealth[] {
  const now = input.now ?? Date.now();
  const traces = input.traces ?? listRuns();
  const slowAfter = input.slowAfterMs ?? SLOW_AFTER_MS;
  const stuckAfter = input.stuckAfterMs ?? STUCK_AFTER_MS;
  const running = input.queue?.listRunning() ?? [];
  const out: RunHealth[] = [];

  for (const turn of running) {
    const trace = traceFor(traces, turn.sessionId, turn.startedAt);
    const elapsedMs = Math.max(0, now - turn.startedAt);
    const toolCalls = trace?.toolCalls?.length ?? 0;
    const lastTool = trace?.toolCalls?.[trace.toolCalls.length - 1];
    const span = trace ? lastSpanName(trace) : null;
    const lastError = trace?.error;
    // Idle = how long since *anything* moved: the open span is the current
    // step, a finished tool call is the last thing that moved, and with no
    // trace at all the turn's own start is the baseline.
    const lastProgressAt = span?.at ?? lastToolAt(trace, turn.startedAt);
    const idleMs = Math.max(0, now - lastProgressAt);

    let verdict: RunVerdict;
    let lastActivity: string;
    let suggestion: string;

    if (lastError) {
      verdict = 'failing';
      lastActivity = `the provider answered with an error: ${lastError.slice(0, 160)}`;
      suggestion = 'check the model: termcrab doctor (and termcrab providers), then send the message again';
    } else if (span) {
      const where = span.name.startsWith('tool:') ? `tool ${span.name.slice(5)}` : span.name;
      lastActivity = `in ${where} for ${round(idleMs)}`;
      if (idleMs > stuckAfter) {
        verdict = 'stuck';
        suggestion = `stop it (termcrab stop ${turn.sessionId}) and send the message again — if ${where} repeats, that tool is the problem`;
      } else if (idleMs > slowAfter) {
        verdict = 'slow';
        suggestion = `still inside ${where} after ${round(idleMs)} — give it a minute, or stop it with: termcrab stop ${turn.sessionId}`;
      } else {
        verdict = 'working';
        suggestion = 'nothing to do — it is mid-step';
      }
    } else if (elapsedMs > stuckAfter) {
      verdict = 'stuck';
      lastActivity = 'no tool call and no model reply yet';
      if (!trace) {
        suggestion =
          'the run is not even in the trace — it may have died with the process: termcrab stop, then send it again';
      } else {
        suggestion = 'the model has not answered — check the provider with termcrab doctor, or retry with a smaller request';
      }
    } else {
      verdict = elapsedMs > slowAfter ? 'slow' : 'working';
      lastActivity = `waiting for the model (${round(elapsedMs)} so far)`;
      suggestion = verdict === 'slow' ? 'a long model call is normal on a slow link — or stop it and retry smaller' : 'nothing to do';
    }

    out.push({
      sessionId: turn.sessionId,
      turnId: turn.turnId,
      runId: trace?.runId,
      request: turn.userMessage,
      startedAt: turn.startedAt,
      elapsedMs,
      verdict,
      lastActivity,
      idleMs,
      suggestion,
      provider: trace?.provider,
      model: trace?.model,
      toolCalls,
    });
  }

  // Queued-but-not-started work is worth saying out loud too: a full lane is
  // the other way a phone "hangs" without anything being wrong.
  const pending = input.queue?.listPending?.() ?? [];
  for (const row of pending) {
    if (out.some((h) => h.sessionId === row.sessionId)) continue;
    out.push({
      sessionId: row.sessionId,
      request: '(queued)',
      startedAt: now,
      elapsedMs: 0,
      verdict: 'queued',
      lastActivity: `${row.waiting} message(s) waiting behind the running one`,
      idleMs: 0,
      suggestion: 'they run in order; switch queueMode to steer to join them, or termcrab stop to clear them',
      toolCalls: 0,
    });
  }

  return out.sort((a, b) => b.elapsedMs - a.elapsedMs);
}

/** When the last finished tool call ended (the trace only stores durations). */
function lastToolAt(trace: RunTrace | undefined, fallback: number): number {
  const calls = trace?.toolCalls ?? [];
  if (!calls.length) return fallback;
  // `startRun` stamps the trace, and tool-call durations accumulate from there.
  const total = calls.reduce((n, c) => n + (c.durationMs || 0), 0);
  return (trace?.start ?? fallback) + total;
}

function round(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} minute(s)` : `${Math.round(m / 60)}h`;
}

/** The one-line health summary `/status` and the panel header show. */
export function healthLine(health: RunHealth[]): string {
  if (!health.length) return 'Runs: nothing is running right now.';
  const worst = health.find((h) => h.verdict === 'stuck' || h.verdict === 'failing') ?? health[0]!;
  const badge =
    worst.verdict === 'stuck' ? '🔴 stuck' : worst.verdict === 'failing' ? '⚠️ failing' : worst.verdict === 'slow' ? '🟡 slow' : '🟢 working';
  return `Runs: ${health.length} running — ${badge} (${worst.sessionId}, ${worst.lastActivity})`;
}

/** Markdown for `termcrab doctor`: only what is wrong, or one calm line. */
export function formatRunHealth(health: RunHealth[], now = Date.now()): string {
  if (!health.length) return '  ✅ nothing is running — no run can be stuck.';
  const lines: string[] = [];
  for (const h of health) {
    const icon =
      h.verdict === 'stuck' ? '🔴' : h.verdict === 'failing' ? '⚠️ ' : h.verdict === 'slow' ? '🟡' : h.verdict === 'queued' ? '⏳' : '🟢';
    lines.push(`  ${icon} ${h.sessionId}${h.runId ? ` (run ${h.runId})` : ''} — ${h.verdict} after ${round(now - h.startedAt)}`);
    if (h.request && h.request !== '(queued)') lines.push(`       asked: ${h.request.slice(0, 80)}`);
    lines.push(`       doing: ${h.lastActivity}`);
    if (h.verdict !== 'working') lines.push(`       do:    ${h.suggestion}`);
  }
  return lines.join('\n');
}
