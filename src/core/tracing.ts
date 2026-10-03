/**
 * Observability: run spans, token counts, tool call latencies.
 * Exported to /api/traces (JSON) and optional OTel endpoint.
 */

export interface Span {
  id: string;
  name: string;
  start: number;
  end?: number;
  durationMs?: number;
  attrs?: Record<string, unknown>;
  children?: Span[];
}

export type RunStatus = 'running' | 'done' | 'error' | 'interrupted';

export interface RunTrace {
  runId: string;
  sessionId: string;
  start: number;
  end?: number;
  durationMs?: number;
  /** How the run ended. 'running' means it has not (yet). */
  status: RunStatus;
  /** Set when status is 'error' or 'interrupted'. */
  error?: string;
  provider?: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  toolCalls?: { name: string; durationMs: number; ok: boolean }[];
  spans: Span[];
}

const runs = new Map<string, RunTrace>();
const MAX_RUNS = 100;

export function startRun(runId: string, sessionId: string, provider?: string, model?: string): RunTrace {
  const trace: RunTrace = {
    runId,
    sessionId,
    start: Date.now(),
    status: 'running',
    provider,
    model,
    spans: [],
    toolCalls: [],
  };
  runs.set(runId, trace);
  // Evict old runs
  if (runs.size > MAX_RUNS) {
    const oldest = runs.keys().next().value;
    if (oldest) runs.delete(oldest);
  }
  return trace;
}

export function endRun(
  runId: string,
  tokensIn?: number,
  tokensOut?: number,
  opts: { status?: RunStatus; error?: string } = {},
): void {
  const trace = runs.get(runId);
  if (!trace) return;
  trace.end = Date.now();
  trace.durationMs = trace.end - trace.start;
  trace.tokensIn = tokensIn;
  trace.tokensOut = tokensOut;
  trace.status = opts.status ?? 'done';
  if (opts.error) trace.error = opts.error;
}

export function addSpan(runId: string, name: string, attrs?: Record<string, unknown>): Span | null {
  const trace = runs.get(runId);
  if (!trace) return null;
  const span: Span = {
    id: Math.random().toString(36).slice(2, 8),
    name,
    start: Date.now(),
    attrs,
  };
  trace.spans.push(span);
  return span;
}

export function endSpan(runId: string, spanId: string): void {
  const trace = runs.get(runId);
  if (!trace) return;
  const span = trace.spans.find((s) => s.id === spanId);
  if (span) {
    span.end = Date.now();
    span.durationMs = span.end - span.start;
  }
}

export function addToolCall(runId: string, name: string, durationMs: number, ok: boolean): void {
  const trace = runs.get(runId);
  if (!trace) return;
  trace.toolCalls!.push({ name, durationMs, ok });
}

export function getRun(runId: string): RunTrace | null {
  return runs.get(runId) ?? null;
}

export function listRuns(): RunTrace[] {
  return [...runs.values()].sort((a, b) => b.start - a.start);
}

export function clearRuns(): void {
  runs.clear();
}
