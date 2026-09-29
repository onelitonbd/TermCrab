import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { providerSummary, resolveProvider } from '../providers/index.js';
import { ChatResult, Provider, ProviderMessage } from '../providers/types.js';
import { MemoryStore } from './memory.js';
import { buildSystemPrompt } from './prompt.js';
import { Entry, newRunId, SessionStore } from './sessions.js';
import { buildTools, Tool, ToolEnv } from './tools.js';

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
  fetchImpl?: typeof fetch;
}

export interface RunOpts {
  sessionId: string;
  userMessage: string;
  channel?: string;
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
  const { sessionId, userMessage } = opts;

  ctx.sessions.append(sessionId, {
    role: 'user',
    content: userMessage,
    ts: Date.now(),
    channel: opts.channel,
  });
  emit({ type: 'run:start', runId, sessionId });

  const provider = ctx.provider ?? resolveProvider(ctx.config.provider, ctx.fetchImpl);
  const toolEnv: ToolEnv = { config: ctx.config, memory: ctx.memory, skills: ctx.skills };
  const tools = buildTools(toolEnv);
  const toolMap = new Map(tools.map((t) => [t.def.name, t]));
  const system = buildSystemPrompt({ config: ctx.config, memory: ctx.memory, skills: ctx.skills });
  const maxIter = Math.max(1, Math.min(ctx.config.agent.maxIterations || 8, 25));

  let finalText = '';
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
    const message = err instanceof Error ? err.message : String(err);
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
