import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { providerSummary, resolveProvider, resolveProviderChain } from '../providers/index.js';
import { ChatResult, Provider, ProviderMessage, ThinkingLevel } from '../providers/types.js';
import { MemoryStore } from './memory.js';
import { buildSystemPrompt, sanitizeAgentName } from './prompt.js';
import { Entry, newRunId, SessionQueue, SessionStore } from './sessions.js';
import {
  approvalTimeoutMs,
  ApprovalDecision,
  createApproval,
  needsApproval,
  resolveApproval,
  waitForApproval,
} from '../core/approvals.js';
import { buildTools, Tool, ToolEnv } from './tools.js';
import { spawnTask as spawnBgTask } from './tasks.js';
import { startRun, endRun, addSpan, endSpan, addToolCall } from '../core/tracing.js';

export type AgentEvent =
  | { type: 'run:start'; runId: string; sessionId: string }
  | { type: 'delta'; text: string }
  | { type: 'thinking:delta'; text: string; sessionId?: string }
  | { type: 'tool:start'; name: string; args: Record<string, unknown>; toolCallId?: string; sessionId?: string }
  | { type: 'tool:end'; name: string; ok: boolean; preview: string; result: string; toolCallId?: string; sessionId?: string }
  | { type: 'run:end'; runId: string; text: string; sessionId: string; iterations: number }
  /** A message steered into the running turn (queue mode 'steer'). */
  | { type: 'steer'; text: string; sessionId: string }
  | { type: 'approval'; approval: import('../core/approvals.js').Approval }
  | { type: 'error'; message: string };

export interface AgentCtx {
  config: Config;
  memory: MemoryStore;
  skills: import('../skills/loader.js').SkillStore;
  sessions: SessionStore;
  provider?: Provider;
  /** Optional local-model provider (dreaming/lightweight tiers). */
  localProvider?: Provider;
  fetchImpl?: typeof fetch;
  /** Per-session queue for steer/interrupt/followup/collect modes. */
  queue?: SessionQueue;
  /** MCP clients keyed by server name. */
  mcpClients?: Map<string, import('../providers/mcp.js').McpClient>;
}

export interface RunOpts {
  sessionId: string;
  userMessage: string;
  channel?: string;
  /** Named agent profile (workspace/agents/<name>/SOUL.md + session namespace). */
  agent?: string;
  /** Model tier: 'local' uses ctx.localProvider when configured (falls back to cloud). */
  tier?: 'cloud' | 'local';
  thinkingLevel?: ThinkingLevel;
  onEvent?: (ev: AgentEvent) => void;
  /** Abort signal for interrupt support. */
  signal?: AbortSignal;
  /** Skip the queue (used by subagents and internal calls). */
  skipQueue?: boolean;
}

const PROVIDER_TIMEOUT_MS = 180_000;

/**
 * Convert our transcript to provider messages, dropping orphaned tool results
 * and empty assistant turns that would confuse the model.
 */
export function toProviderMessages(entries: Entry[], _providerName?: string): ProviderMessage[] {
  const seenToolIds = new Set<string>();
  const out: ProviderMessage[] = [];
  for (const e of entries) {
    if (e.role === 'system') {
      out.push({ role: 'system', content: e.content });
    } else if (e.role === 'user') {
      out.push({ role: 'user', content: e.content });
    } else if (e.role === 'assistant') {
      const calls = e.toolCalls ?? [];
      let content = e.content;
      // Strip any legacy mock-prefixed text from pre-0.35 transcripts.
      if (content) {
        content = content.replace(/^\[mock:[^\]]+\]\s*(?:You said:[^.\n]*[.\n]\s*)?(?:Tool said:[^\n]*\n*)?/i, '').trim();
      }
      // Never send empty assistant turns upstream
      if (!calls.length && !content.trim()) continue;
      for (const c of calls) seenToolIds.add(c.id);
      out.push({
        role: 'assistant',
        content,
        toolCalls: calls.length
          ? calls.map((c) => ({ id: c.id, name: c.name, args: (c.args ?? {}) as Record<string, unknown> }))
          : undefined,
        thinkingBlocks: e.thinkingBlocks?.length ? e.thinkingBlocks : undefined,
      });
    } else if (e.role === 'tool') {
      if (!seenToolIds.has(e.toolCallId)) continue;
      out.push({ role: 'tool', content: e.result, toolCallId: e.toolCallId, toolName: e.name });
    }
  }
  // Anthropic requires the conversation to start with a user turn.
  if (out.length && out[0]!.role !== 'user') out.unshift({ role: 'user', content: '(continue)' });
  // Trailing tool results with no assistant turn after them are fine (assistant follows).
  return out;
}

async function chatWithTimeout(
  provider: Provider,
  req: Parameters<Provider['chat']>[0],
  onDelta?: (chunk: string) => void,
  onThinkingDelta?: (chunk: string) => void,
): Promise<ChatResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await provider.chat(req, { signal: ctrl.signal, onDelta, onThinkingDelta });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * What the model reads when a gated tool is not approved. A refusal is a
 * result, not an error: the loop keeps going and the agent can say what it
 * would do instead.
 */
function refusalText(tool: string, decision: ApprovalDecision, timeoutSec: number): string {
  const seconds = Number.isInteger(timeoutSec) ? `${timeoutSec}s` : `${timeoutSec.toFixed(1)}s`;
  const why =
    decision === 'timeout-denied'
      ? `no answer within ${seconds} — denied by default`
      : decision === 'denied'
        ? 'the operator denied it'
        : 'it could not be answered';
  return `[refused] The user refused this ${tool} call (${why}). Do not retry it; explain what you would do instead.`;
}

/** One user turn: loops until the model stops asking for tools. Returns final text. */
export async function runTurn(ctx: AgentCtx, opts: RunOpts): Promise<string> {
  const emit = opts.onEvent ?? (() => undefined);
  const runId = newRunId();
  const { userMessage } = opts;

  // Named agents get their own session namespace: <agent>:<sessionId>
  const agentName = opts.agent ? sanitizeAgentName(opts.agent) ?? undefined : undefined;
  const sessionId = agentName ? `${agentName}:${opts.sessionId}` : opts.sessionId;

  // Queue modes (followup / steer / collect / interrupt) live in SessionQueue:
  // callers submit through the queue, which owns the session's lane (see
  // SessionQueue.submit). A direct runTurn() call while the session is busy
  // runs in parallel, so channels should route through the queue; this note
  // exists so that mistake shows up in the log instead of silently.
  if (ctx.queue && !opts.skipQueue) {
    const running = ctx.queue.getRunning(sessionId);
    if (running) {
      log.info(`session ${sessionId}: turn ${running.id} already running; this turn bypassed the queue`);
    }
  }

  ctx.sessions.append(sessionId, {
    role: 'user',
    content: userMessage,
    ts: Date.now(),
    channel: opts.channel,
  });
  emit({ type: 'run:start', runId, sessionId });

  // Tracing: start a run span
  const providerName = providerLabel(ctx.config);
  startRun(runId, sessionId, providerName, ctx.config.provider.model);

  // Compact session if it grew past the threshold (keeps context lean on mobile)
  const threshold = ctx.config.agent.compactThreshold || 60;
  const sessionSize = ctx.sessions.list().find((s) => s.id === sessionId)?.messages ?? 0;
  if (sessionSize > threshold + 10) {
    const digest = ctx.sessions.compact(sessionId, threshold);
    if (digest) {
      log.info(`session ${sessionId} compacted (${sessionSize} -> ${threshold} entries)`);
    }
  }

  // Resolve provider: local tier > failover chain > single provider
  let provider: Provider;
  if (opts.tier === 'local' && ctx.localProvider) {
    provider = ctx.localProvider;
  } else if (ctx.provider) {
    provider = ctx.provider;
  } else if (ctx.config.agent.failover && ctx.config.fallbackProviders.length > 0) {
    provider = resolveProviderChain(ctx.config.provider, ctx.config.fallbackProviders, ctx.fetchImpl);
  } else {
    provider = resolveProvider(ctx.config.provider, ctx.fetchImpl);
  }
  const toolEnv: ToolEnv = {
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    sessions: ctx.sessions,
    sessionId,
    providerLabel: providerLabel(ctx.config),
    spawnTask: (sid, prompt) =>
      spawnBgTask({
        run: (s2, p2) => runTurn(ctx, { sessionId: s2, userMessage: p2, channel: 'subagent' }),
        sessionId: sid,
        prompt,
      }),
  };
  const tools = await buildTools(toolEnv);
  const toolMap = new Map(tools.map((t) => [t.def.name, t]));
  const system = buildSystemPrompt({
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    agentName,
    channel: opts.channel,
  });
  // No hard iteration cap — the repetition detector below stops runaway loops.
  const maxIter = 1000;

  let finalText = '';
  let emptyRetries = 0;
  let lastCallKey = '';
  let repeatCount = 0;
  const abortCtrl = new AbortController();
  // Link external abort signal (from queue interrupt) to our internal controller
  if (opts.signal) {
    if (opts.signal.aborted) abortCtrl.abort();
    else opts.signal.addEventListener('abort', () => abortCtrl.abort(), { once: true });
  }
  try {
    // Steered messages land in the transcript and are picked up by the next
    // provider call, inside this same run (same run id). Consumed exactly once.
    const drainSteers = (): boolean => {
      if (!ctx.queue) return false;
      const steers = ctx.queue.takeSteers(sessionId);
      for (const text of steers) {
        ctx.sessions.append(sessionId, { role: 'user', content: text, ts: Date.now(), channel: opts.channel });
        emit({ type: 'steer', text, sessionId });
      }
      return steers.length > 0;
    };
    for (let i = 0; i < maxIter; i++) {
      if (abortCtrl.signal.aborted) {
        finalText = '[interrupted] The user cancelled this request.';
        ctx.sessions.append(sessionId, { role: 'assistant', content: finalText, ts: Date.now() });
        emit({ type: 'run:end', runId, text: finalText, sessionId, iterations: i });
        return finalText;
      }
      drainSteers();
      const messages = toProviderMessages(ctx.sessions.read(sessionId), provider.name);
      let streamedChars = 0;
      const result = await chatWithTimeout(
        provider,
        { system, messages, tools: tools.map((t) => t.def), thinkingLevel: opts.thinkingLevel },
        (chunk) => {
          if (!chunk) return;
          streamedChars += chunk.length;
          emit({ type: 'delta', text: chunk });
        },
        (thinkingChunk) => {
          if (!thinkingChunk) return;
          emit({ type: 'thinking:delta', text: thinkingChunk, sessionId });
        },
      );

      if (result.toolCalls.length) {
        // Persist the assistant tool-call turn, then execute each tool.
        ctx.sessions.append(sessionId, {
          role: 'assistant',
          content: result.text,
          ts: Date.now(),
          toolCalls: result.toolCalls,
          thinking: result.thinking,
          thinkingBlocks: result.thinkingBlocks,
        });
        if (result.text && !streamedChars) emit({ type: 'delta', text: result.text });

        for (const call of result.toolCalls) {
          emit({ type: 'tool:start', name: call.name, args: call.args, toolCallId: call.id, sessionId });
          // Repetition detector: same tool + same args over and over.
          // 6th time → warn the AI. 8th time → stop the turn.
          const key = call.name + ':' + JSON.stringify(call.args || {});
          if (key === lastCallKey) repeatCount++;
          else { repeatCount = 1; lastCallKey = key; }
          if (repeatCount === 6) {
            ctx.sessions.append(sessionId, {
              role: 'system',
              content: `You have called ${call.name} with the exact same arguments ${repeatCount} times. Stop repeating. Give a final answer or try a different approach.`,
              ts: Date.now(),
            });
          }
          if (repeatCount >= 8) {
            finalText = `[stopped] You repeated ${call.name} with the same arguments ${repeatCount} times.`;
            ctx.sessions.append(sessionId, { role: 'assistant', content: finalText, ts: Date.now() });
            emit({ type: 'run:end', runId, text: finalText, sessionId, iterations: i });
            return finalText;
          }
          let output: string;
          let ok = true;
          const tool = toolMap.get(call.name);
          const toolStart = Date.now();
          const span = addSpan(runId, `tool:${call.name}`, { args: call.args });
          try {
            if (!tool) throw new Error(`unknown tool: ${call.name}`);
            if (needsApproval(ctx.config, call.name)) {
              // Human-in-the-loop: stop *before* the tool runs and wait for a
              // person. The panel shows the same approval over SSE; the CLI can
              // answer it too. Nobody answering is a decision, not a hang.
              const timeoutMs = approvalTimeoutMs(ctx.config);
              const approval = createApproval({
                tool: call.name,
                args: call.args,
                sessionId,
                timeoutSec: timeoutMs / 1000,
              });
              emit({ type: 'approval', approval });
              const decision = await waitForApproval(
                approval.id,
                timeoutMs,
                ctx.config.security?.approvals?.onTimeout ?? 'deny',
                abortCtrl.signal,
              );
              if (decision === 'aborted') {
                resolveApproval(approval.id, false, 'aborted');
                finalText = '[interrupted] The user cancelled this request.';
                ctx.sessions.append(sessionId, { role: 'assistant', content: finalText, ts: Date.now() });
                emit({ type: 'run:end', runId, text: finalText, sessionId, iterations: i });
                if (span) endSpan(runId, span.id);
                return finalText;
              }
              if (decision === 'approved' || decision === 'timeout-allowed') {
                output = await tool.execute(call.args);
              } else {
                ok = false;
                output = refusalText(call.name, decision, Math.round(timeoutMs / 1000));
              }
            } else {
              output = await tool.execute(call.args);
            }
          } catch (err) {
            ok = false;
            output = err instanceof Error ? err.message : String(err);
          }
          const toolDuration = Date.now() - toolStart;
          if (span) endSpan(runId, span.id);
          addToolCall(runId, call.name, toolDuration, ok);
          emit({ type: 'tool:end', name: call.name, ok, preview: output.slice(0, 200), result: output, toolCallId: call.id, sessionId });
          ctx.sessions.append(sessionId, {
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            result: output,
            ts: Date.now(),
          });
        }
        continue;
      }

      // A message steered in while the model was answering must be answered in
      // this same run, not left for a "next turn" that never comes.
      if (drainSteers()) continue;

      finalText = result.text ?? '';
      if (!finalText.trim()) {
        // Empty completion: retry once (transient provider hiccups happen), then
        // fail LOUDLY — a silent "" reads as a broken UI to the user (v0.23.1).
        if (emptyRetries < 1) {
          emptyRetries++;
          log.warn(
            `empty reply from ${provider.name}/${provider.model} (stop=${result.stopReason}) — retrying once`,
          );
          i--;
          continue;
        }
        finalText =
          result.stopReason === 'length'
            ? '[empty reply] The model ran out of reply space before writing anything — try a shorter ask, or switch models in Providers.'
            : '[empty reply] The model sent back no text. Try again, or open Providers and switch models.';
        log.warn(
          `empty reply from ${provider.name}/${provider.model} (stop=${result.stopReason}) — showing notice`,
        );
        emit({ type: 'error', message: finalText });
      }
      if (finalText && !streamedChars) emit({ type: 'delta', text: finalText });
      ctx.sessions.append(sessionId, {
        role: 'assistant',
        content: finalText,
        ts: Date.now(),
        // Persist the reasoning trace with the reply. Tool-call turns already
        // saved `thinking`; this one didn't, so the drawer the user actually
        // reads was wiped on the next refresh even though the tools survived.
        thinking: result.thinking,
        thinkingBlocks: result.thinkingBlocks,
      });
      endRun(runId);
      emit({ type: 'run:end', runId, text: finalText, sessionId, iterations: i + 1 });
      return finalText;
    }

    finalText = `${finalText}\n\n[stopped: reached max tool iterations (${maxIter})]`.trim();
    ctx.sessions.append(sessionId, { role: 'assistant', content: finalText, ts: Date.now() });
    emit({ type: 'run:end', runId, text: finalText, sessionId, iterations: maxIter });
    return finalText;
  } catch (err) {
    // Keep the cause (ECONNREFUSED, TLS, DNS codes) — the UI prints friendly
    // hints keyed off it, and the plain message alone ("fetch failed") hides it.
    const base = err instanceof Error ? err.message : String(err);
    const c = err instanceof Error ? (err.cause as unknown) : undefined;
    let causeBits = '';
    if (c && typeof c === 'object') {
      const code = 'code' in c ? String((c as { code?: unknown }).code ?? '') : '';
      const cmsg = c instanceof Error ? c.message : '';
      causeBits = [code, cmsg].filter(Boolean).join(' ');
    }
    const message =
      causeBits && !base.includes(causeBits) && !base.includes(causeBits.split(' ')[0] ?? '')
        ? `${base} (${causeBits})`
        : base;
    log.error('agent run failed:', message);
    emit({ type: 'error', message });
    const fallback = `[agent error] ${message}`;
    ctx.sessions.append(sessionId, { role: 'assistant', content: fallback, ts: Date.now() });
    emit({ type: 'run:end', runId, text: fallback, sessionId, iterations: 0 });
    return fallback;
  }
}

export function providerLabel(config: Config): string {
  try {
    return providerSummary(config.provider);
  } catch {
    return config.provider.type;
  }
}
