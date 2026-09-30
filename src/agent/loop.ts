import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { providerSummary, resolveProvider } from '../providers/index.js';
import { ChatResult, Provider, ProviderMessage } from '../providers/types.js';
import { MemoryStore } from './memory.js';
import { buildSystemPrompt, sanitizeAgentName } from './prompt.js';
import { Entry, newRunId, SessionStore } from './sessions.js';
import { buildTools, Tool, ToolEnv } from './tools.js';
import { spawnTask as spawnBgTask } from './tasks.js';

export type AgentEvent =
  | { type: 'run:start'; runId: string; sessionId: string }
  | { type: 'delta'; text: string }
  | { type: 'tool:start'; name: string; args: Record<string, unknown> }
  | { type: 'tool:end'; name: string; ok: boolean; preview: string }
  | { type: 'run:end'; runId: string; text: string; sessionId: string; iterations: number }
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
}

export interface RunOpts {
  sessionId: string;
  userMessage: string;
  channel?: string;
  /** Named agent profile (workspace/agents/<name>/SOUL.md + session namespace). */
  agent?: string;
  /** Model tier: 'local' uses ctx.localProvider when configured (falls back to cloud). */
  tier?: 'cloud' | 'local';
  onEvent?: (ev: AgentEvent) => void;
}

const PROVIDER_TIMEOUT_MS = 180_000;

/**
 * Convert our transcript to provider messages, dropping orphaned tool results
 * (Anthropic rejects tool_result blocks without a matching tool_use).
 */
export function toProviderMessages(entries: Entry[]): ProviderMessage[] {
  const seenToolIds = new Set<string>();
  const out: ProviderMessage[] = [];
  for (const e of entries) {
    if (e.role === 'user') {
      out.push({ role: 'user', content: e.content });
    } else if (e.role === 'assistant') {
      const calls = e.toolCalls ?? [];
      // Never send empty assistant turns upstream: an earlier silent "" reply would
      // become content:null (OpenAI rejects it) or an empty Anthropic block (breaks
      // alternation). Old sessions keep working after v0.23.1.
      if (!calls.length && !e.content.trim()) continue;
      for (const c of calls) seenToolIds.add(c.id);
      out.push({
        role: 'assistant',
        content: e.content,
        toolCalls: calls.length
          ? calls.map((c) => ({ id: c.id, name: c.name, args: (c.args ?? {}) as Record<string, unknown> }))
          : undefined,
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
): Promise<ChatResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await provider.chat(req, { signal: ctrl.signal, onDelta });
  } finally {
    clearTimeout(timer);
  }
}

/** One user turn: loops until the model stops asking for tools. Returns final text. */
export async function runTurn(ctx: AgentCtx, opts: RunOpts): Promise<string> {
  const emit = opts.onEvent ?? (() => undefined);
  const runId = newRunId();
  const { userMessage } = opts;

  // Named agents get their own session namespace: <agent>:<sessionId>
  const agentName = opts.agent ? sanitizeAgentName(opts.agent) ?? undefined : undefined;
  const sessionId = agentName ? `${agentName}:${opts.sessionId}` : opts.sessionId;

  ctx.sessions.append(sessionId, {
    role: 'user',
    content: userMessage,
    ts: Date.now(),
    channel: opts.channel,
  });
  emit({ type: 'run:start', runId, sessionId });

  const provider =
    opts.tier === 'local' && ctx.localProvider
      ? ctx.localProvider
      : (ctx.provider ?? resolveProvider(ctx.config.provider, ctx.fetchImpl));
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
  const tools = buildTools(toolEnv);
  const toolMap = new Map(tools.map((t) => [t.def.name, t]));
  const system = buildSystemPrompt({
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    agentName,
  });
  const maxIter = Math.max(1, Math.min(ctx.config.agent.maxIterations || 8, 25));

  let finalText = '';
  let emptyRetries = 0;
  try {
    for (let i = 0; i < maxIter; i++) {
      const messages = toProviderMessages(ctx.sessions.read(sessionId));
      let streamedChars = 0;
      const result = await chatWithTimeout(provider, { system, messages, tools: tools.map((t) => t.def) }, (chunk) => {
        if (!chunk) return;
        streamedChars += chunk.length;
        emit({ type: 'delta', text: chunk });
      });

      if (result.toolCalls.length) {
        // Persist the assistant tool-call turn, then execute each tool.
        ctx.sessions.append(sessionId, {
          role: 'assistant',
          content: result.text,
          ts: Date.now(),
          toolCalls: result.toolCalls,
        });
        if (result.text && !streamedChars) emit({ type: 'delta', text: result.text });

        for (const call of result.toolCalls) {
          emit({ type: 'tool:start', name: call.name, args: call.args });
          let output: string;
          let ok = true;
          const tool = toolMap.get(call.name);
          try {
            if (!tool) throw new Error(`unknown tool: ${call.name}`);
            output = await tool.execute(call.args);
          } catch (err) {
            ok = false;
            output = err instanceof Error ? err.message : String(err);
          }
          emit({ type: 'tool:end', name: call.name, ok, preview: output.slice(0, 200) });
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
      ctx.sessions.append(sessionId, { role: 'assistant', content: finalText, ts: Date.now() });
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
