import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { providerSummary, resolveProvider, resolveProviderChain } from '../providers/index.js';
import { ChatResult, Provider, ProviderMessage, ThinkingLevel, Usage } from '../providers/types.js';
import { MemoryStore } from './memory.js';
import { buildSystemPrompt, sanitizeAgentName } from './prompt.js';
import { contextEngine, pruneToolResults } from './context.js';
import { applyReset, parseResetPolicy } from './session-policy.js';
import { Entry, newRunId, QueueFullError, QueuedTurn, SessionQueue, SessionStore } from './sessions.js';
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
import { clearDraft, saveDraft } from './progress.js';
import { computeCost } from '../core/pricing.js';
import { recordUsage } from '../core/usage.js';

export type AgentEvent =
  | { type: 'run:start'; runId: string; sessionId: string }
  | { type: 'delta'; text: string }
  | { type: 'thinking:delta'; text: string; sessionId?: string }
  | { type: 'tool:start'; name: string; args: Record<string, unknown>; toolCallId?: string; sessionId?: string }
  | { type: 'tool:end'; name: string; ok: boolean; preview: string; result: string; toolCallId?: string; sessionId?: string }
  | {
      type: 'run:end';
      runId: string;
      text: string;
      sessionId: string;
      iterations: number;
      /** Summed over every provider call this turn made (absent when unreported). */
      usage?: Usage;
      /** Only when a price was known for the model. */
      costUsd?: number;
    }
  /**
   * The best partial answer so far, while the turn is still running (10.4).
   * Carries the whole text (not a chunk) so a surface replaces its draft
   * instead of appending, and so a reload can recover it from the progress
   * file. The final answer still arrives as `delta` + `run:end`.
   */
  | { type: 'draft'; text: string; sessionId: string }
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
  /** Use this run id instead of a fresh one (the queue turn id, 10.2). */
  runId?: string;
  /** Abort signal for interrupt support. */
  signal?: AbortSignal;
  /** Skip the queue (used by subagents and internal calls). */
  skipQueue?: boolean;
  /** Surface that takes the transcript write claim (defaults to the channel, else 'agent'). */
  owner?: string;
  /** Wait this long for a busy session before refusing (0 = refuse now). */
  waitMs?: number;
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
  /** The turn's abort signal: stopping the turn must stop the wait on the model. */
  signal?: AbortSignal,
): Promise<ChatResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);
  const onAbort = (): void => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    return await provider.chat(req, { signal: ctrl.signal, onDelta, onThinkingDelta });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
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

/** The fence label for a turn: an explicit owner beats the channel name. */
function turnOwner(opts: RunOpts): string {
  return opts.owner ?? opts.channel ?? 'agent';
}

/**
 * One user turn — the only entry point. Before a single byte is written it
 * claims the session's transcript (SessionStore.claim): a second writer —
 * another process, or another surface in this one — is refused by name
 * instead of interleaving lines into the same JSONL. The claim is released
 * when the turn ends, whether it succeeded, failed or was interrupted.
 */
export async function runTurn(ctx: AgentCtx, opts: RunOpts): Promise<string> {
  const emit = opts.onEvent ?? (() => undefined);
  const agentName = opts.agent ? sanitizeAgentName(opts.agent) ?? undefined : undefined;
  const sessionId = agentName ? `${agentName}:${opts.sessionId}` : opts.sessionId;
  const owner = turnOwner(opts);
  const claim = ctx.sessions.claim(sessionId, owner, { waitMs: opts.waitMs ?? 0 });
  if (!claim.ok) {
    const h = claim.holder;
    const age = h ? Math.max(0, Math.round((Date.now() - h.heartbeatAt) / 1000)) : 0;
    const who = h ? `${h.owner} (pid ${h.pid}, last write ${age}s ago)` : 'another writer';
    const message = `[busy] session ${sessionId} is being written by ${who}; nothing was written. Try again in a moment.`;
    log.warn(message);
    emit({ type: 'error', message });
    return message;
  }
  try {
    return await runTurnUnfenced(ctx, opts, owner);
  } finally {
    claim.release();
  }
}

/**
 * A turn for a surface that is not already inside the queue (channels, the
 * wake/voice loop, cron): submit it to the session's lane and wait for the
 * result. Falls back to a direct run when there is no queue (CLI, tests) —
 * the write fence holds either way. A full backlog is reported, not dropped.
 */
export async function runQueuedTurn(ctx: AgentCtx, opts: RunOpts): Promise<string> {
  const queue = ctx.queue;
  if (!queue) return runTurn(ctx, opts);
  let turn: QueuedTurn;
  try {
    turn = queue.submit({
      sessionId: opts.sessionId,
      userMessage: opts.userMessage,
      channel: opts.channel,
      agent: opts.agent,
      tier: opts.tier,
      thinkingLevel: opts.thinkingLevel,
    }).turn;
  } catch (err) {
    if (err instanceof QueueFullError) return `[busy] ${err.message}`;
    throw err;
  }
  const settled = await queue.waitForTurn(opts.sessionId, 600_000, turn.id);
  if (!settled) return turn.output ?? `[busy] turn ${turn.id} is still running`;
  if (settled.status === 'error') throw new Error(settled.error ?? 'turn failed');
  if (settled.status === 'interrupted') {
    return settled.output ?? '[interrupted] The user cancelled this request.';
  }
  return settled.output ?? '';
}

/** The turn body: everything after the write fence has been taken. */
async function runTurnUnfenced(ctx: AgentCtx, opts: RunOpts, owner: string): Promise<string> {
  const emit = opts.onEvent ?? (() => undefined);
  const runId = opts.runId ?? newRunId();
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

  const appendEntry = (entry: Entry): void => {
    ctx.sessions.append(sessionId, entry, { owner });
  };

  appendEntry({
    role: 'user',
    content: userMessage,
    ts: Date.now(),
    channel: opts.channel,
  });
  emit({ type: 'run:start', runId, sessionId });

  // Tracing: start a run span
  const providerName = providerLabel(ctx.config);
  startRun(runId, sessionId, providerName, ctx.config.provider.model);

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
  const meterProvider = { name: provider.name, model: provider.model };

  // Compact if the session grew past the threshold (keeps context lean on a
  // phone). The turns leaving the hot window are summarised — by the local model
  // when one is configured, else by the model answering this turn, else by the
  // extractive digest — and the full transcript stays on disk. The newest
  // messages (including this turn's) always stay in the hot window.
  const threshold = ctx.config.agent.compactThreshold || 60;
  const sessionSize = ctx.sessions.list().find((s) => s.id === sessionId)?.messages ?? 0;
  if (sessionSize > threshold + 10) {
    const compact = await ctx.sessions.compactWithModel(sessionId, threshold, {
      provider: ctx.localProvider ?? provider,
    });
    if (compact.digest) {
      log.info(
        `session ${sessionId} compacted (${sessionSize} -> ${threshold} entries) by ${compact.by}` +
          `${compact.model ? ` ${compact.model}` : ''}${compact.note ? ` (${compact.note})` : ''}`,
      );
    }
  }
  // 18.2: a fact written in this turn records where the turn came from, and how
  // much it may be trusted. A chat message is the owner speaking; a subagent is
  // the agent itself; background jobs are the system.
  const memoryOrigin: NonNullable<ToolEnv['memoryOrigin']> =
    opts.channel === 'subagent' ? 'agent' : opts.channel ? 'owner' : 'system';
  const toolEnv: ToolEnv = {
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    sessions: ctx.sessions,
    sessionId,
    memoryOrigin,
    runSource: `${opts.channel ?? 'cli'} · session:${opts.sessionId} · run:${sessionId}`,
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
  const engine = contextEngine(ctx.config.agent.contextEngine);
  const system = buildSystemPrompt({
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    agentName,
    channel: opts.channel,
    sessionId,
    memoryBudget: engine.memoryBudget(ctx.config),
    includeExtras: engine.includeExtras(),
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
  // 10.4: whatever text the model has produced so far this turn. A tool loop
  // produces text before each tool round; that text is a *draft*, and the panel
  // shows it (persisted in the progress card) instead of staying silent until
  // the final answer. The queue's `interrupt` also reads it, so stopping a turn
  // from outside keeps what the model had already said (10.3).
  let partial = '';
  let lastDraft = '';
  const emitDraft = (text: string): void => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === lastDraft) return;
    lastDraft = trimmed;
    partial = text;
    try {
      saveDraft(sessionId, text);
    } catch {
      /* a progress card is a convenience, never a reason to fail a turn */
    }
    emit({ type: 'draft', text, sessionId });
  };
  /** The answer to keep when the user stops the turn half-way. */
  const interruptedText = (): string =>
    partial.trim()
      ? `${partial.trim()}\n\n[interrupted] The user cancelled this request.`
      : '[interrupted] The user cancelled this request.';

  // Usage is accumulated across the whole turn: a tool loop makes several
  // provider calls, and the owner cares about the turn, not the call.
  const usageTotals = { promptTokens: 0, completionTokens: 0, totalTokens: 0, calls: 0, estimated: false };
  const noteUsage = (usage?: Usage): void => {
    if (!usage) return;
    usageTotals.promptTokens += usage.promptTokens;
    usageTotals.completionTokens += usage.completionTokens;
    usageTotals.totalTokens += usage.totalTokens;
    usageTotals.calls += 1;
    if (usage.estimated) usageTotals.estimated = true;
  };
  /** Nothing reported by any call → nothing to report. Never a zero-filled guess. */
  const turnUsage = (): Usage | undefined => {
    if (usageTotals.calls === 0) return undefined;
    return {
      promptTokens: usageTotals.promptTokens,
      completionTokens: usageTotals.completionTokens,
      totalTokens: usageTotals.totalTokens,
      ...(usageTotals.estimated ? { estimated: true } : {}),
    };
  };
  const turnCost = (): number | undefined => {
    const usage = turnUsage();
    if (!usage) return undefined;
    return computeCost(meterProvider.model, usage, ctx.config.provider);
  };
  /**
   * The single exit of a turn: report the numbers to the surface and write one
   * meter line for the day. Called on every path (normal, aborted, capped,
   * error) so a turn that burned tokens never goes unaccounted.
   */
  const finishTurn = (
    text: string,
    iterations: number,
    opts: { error?: string; status?: 'done' | 'error' | 'interrupted' } = {},
  ): void => {
    const { error } = opts;
    try {
      clearDraft(sessionId);
    } catch {
      /* ignore */
    }
    const usage = turnUsage();
    const costUsd = turnCost();
    // The trace ends exactly once, here — every exit path (normal, aborted,
    // capped, error) goes through finishTurn, so /api/runs never shows a run
    // that is 'running' an hour after it died.
    endRun(runId, usage?.promptTokens, usage?.completionTokens, {
      status: opts.status ?? (error ? 'error' : 'done'),
      error,
    });
    if (usage) {
      recordUsage({
        sessionId,
        provider: meterProvider.name,
        model: meterProvider.model,
        calls: usageTotals.calls,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        costUsd,
      });
    }
    if (error) emit({ type: 'error', message: error });
    emit({ type: 'run:end', runId, text, sessionId, iterations, usage, costUsd });
  };

  try {
    // Steered messages land in the transcript and are picked up by the next
    // provider call, inside this same run (same run id). Consumed exactly once.
    const drainSteers = (): boolean => {
      if (!ctx.queue) return false;
      const steers = ctx.queue.takeSteers(sessionId);
      for (const text of steers) {
        appendEntry({ role: 'user', content: text, ts: Date.now(), channel: opts.channel });
        emit({ type: 'steer', text, sessionId });
      }
      return steers.length > 0;
    };
    for (let i = 0; i < maxIter; i++) {
      if (abortCtrl.signal.aborted) {
        finalText = interruptedText();
        appendEntry({ role: 'assistant', content: finalText, ts: Date.now() });
        ctx.queue?.recordInterrupt(sessionId, finalText);
        finishTurn(finalText, i, { status: 'interrupted', error: 'interrupted' });
        return finalText;
      }
      drainSteers();
      // The prompt gets the hot window; the archive on disk keeps the rest
      // (compaction summarises the overflow instead of deleting it).
      // 19.2: older tool results are stubbed before they are sent, so a turn
      // that read five big files does not carry all five on every later call.
      const pruned = pruneToolResults(toProviderMessages(ctx.sessions.readHot(sessionId), provider.name), {
        keep: ctx.config.agent.keepToolResults ?? 6,
      });
      let streamedChars = 0;
      const result = await chatWithTimeout(
        provider,
        { system, messages: pruned.messages, tools: tools.map((t) => t.def), thinkingLevel: opts.thinkingLevel },
        (chunk) => {
          if (!chunk) return;
          streamedChars += chunk.length;
          partial += chunk;
          emit({ type: 'delta', text: chunk });
        },
        (thinkingChunk) => {
          if (!thinkingChunk) return;
          emit({ type: 'thinking:delta', text: thinkingChunk, sessionId });
        },
        abortCtrl.signal,
      );
      noteUsage(result.usage);

      if (result.toolCalls.length) {
        // Persist the assistant tool-call turn, then execute each tool.
        appendEntry({
          role: 'assistant',
          content: result.text,
          ts: Date.now(),
          toolCalls: result.toolCalls,
          thinking: result.thinking,
          thinkingBlocks: result.thinkingBlocks,
        });
        if (result.text && !streamedChars) emit({ type: 'delta', text: result.text });
        // The model spoke before calling a tool: that is a draft of the answer,
        // not the answer (10.4).
        if (result.text) emitDraft(result.text);

        for (const call of result.toolCalls) {
          emit({ type: 'tool:start', name: call.name, args: call.args, toolCallId: call.id, sessionId });
          // Repetition detector: same tool + same args over and over.
          // 6th time → warn the AI. 8th time → stop the turn.
          const key = call.name + ':' + JSON.stringify(call.args || {});
          if (key === lastCallKey) repeatCount++;
          else { repeatCount = 1; lastCallKey = key; }
          if (repeatCount === 6) {
            appendEntry({
              role: 'system',
              content: `You have called ${call.name} with the exact same arguments ${repeatCount} times. Stop repeating. Give a final answer or try a different approach.`,
              ts: Date.now(),
            });
          }
          if (repeatCount >= 8) {
            finalText = `[stopped] You repeated ${call.name} with the same arguments ${repeatCount} times.`;
            appendEntry({ role: 'assistant', content: finalText, ts: Date.now() });
            finishTurn(finalText, i);
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
                finalText = interruptedText();
                appendEntry({ role: 'assistant', content: finalText, ts: Date.now() });
                ctx.queue?.recordInterrupt(sessionId, finalText);
                finishTurn(finalText, i, { status: 'interrupted', error: 'interrupted' });
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
          appendEntry({
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
      appendEntry({
        role: 'assistant',
        content: finalText,
        ts: Date.now(),
        // Persist the reasoning trace with the reply. Tool-call turns already
        // saved `thinking`; this one didn't, so the drawer the user actually
        // reads was wiped on the next refresh even though the tools survived.
        thinking: result.thinking,
        thinkingBlocks: result.thinkingBlocks,
        // Same reason for the meter: a reloaded transcript shows the turn's
        // tokens because they are part of the entry, not a live-only event.
        usage: turnUsage(),
        costUsd: turnCost(),
      });
      finishTurn(finalText, i + 1);
      return finalText;
    }

    finalText = `${finalText}\n\n[stopped: reached max tool iterations (${maxIter})]`.trim();
    appendEntry({ role: 'assistant', content: finalText, ts: Date.now() });
    finishTurn(finalText, maxIter);
    return finalText;
  } catch (err) {
    // An abort is a decision, not a failure: the user stopped the turn and must
    // keep whatever the model had said so far (10.3). The queue already knows it
    // was interrupted; hand it the text so `run --wait` / the poll can read it.
    if (abortCtrl.signal.aborted) {
      const text = interruptedText();
      appendEntry({ role: 'assistant', content: text, ts: Date.now() });
      ctx.queue?.recordInterrupt(sessionId, text);
      finishTurn(text, 0, { status: 'interrupted', error: 'interrupted' });
      return text;
    }
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
    const fallback = `[agent error] ${message}`;
    appendEntry({ role: 'assistant', content: fallback, ts: Date.now() });
    // The provider may have billed the calls that did happen before the throw.
    finishTurn(fallback, 0, { error: message });
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
