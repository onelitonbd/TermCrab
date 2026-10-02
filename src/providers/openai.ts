import {
  ChatOpts,
  ChatRequest,
  ChatResult,
  FetchLike,
  Provider,
  ProviderError,
  readError,
  ToolDef,
  isAbortError,
} from './types.js';
import { sseData } from './sse.js';
import { getModelCapabilities, thinkingLevelToEffort, thinkingLevelToTokens, ThinkingLevel } from './capabilities.js';
import { getModelCaps, getCachedCaps } from './probe.js';

interface OpenAiCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  /** True when baseUrl is a self-hosted / non-well-known host. On such hosts we
   *  trust the user's thinking-level selection and always send reasoning_effort,
   *  because custom proxies and local servers (vLLM, llama.cpp, OpenRouter
   *  fallbacks) silently ignore unknown JSON fields but may host reasoning
   *  models we can't detect by name. */
  isCustomHost?: boolean;
}

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '');
  if (b.endsWith('/chat/completions')) return b;
  if (b.endsWith('/v1')) return `${b}${path}`;
  return `${b}/v1${path}`;
}

function toOpenAiTools(tools: ToolDef[]): unknown[] | undefined {
  if (!tools.length) return undefined;
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.schema },
  }));
}

function buildMessages(req: ChatRequest): unknown[] {
  const messages: unknown[] = [{ role: 'system', content: req.system }];
  for (const m of req.messages) {
    if (m.role === 'user') messages.push({ role: 'user', content: m.content });
    else if (m.role === 'tool') {
      messages.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content.slice(0, 100000) });
    } else {
      const msg: Record<string, unknown> = { role: 'assistant', content: m.content || null };
      if (m.toolCalls?.length) {
        msg.tool_calls = m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
        }));
      }
      messages.push(msg);
    }
  }
  return messages;
}

function parseToolArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

interface ToolAcc {
  id: string;
  name: string;
  args: string;
}

/** Order from none → max, used for clamping. */
const LEVEL_RANK: Record<ThinkingLevel, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  xhigh: 4,
  max: 5,
};

/**
 * Clamp a requested thinking level to the highest level the model supports.
 * If the model supports none of them, returns 'none' (caller should skip).
 */
function clampLevel(requested: ThinkingLevel, supported: readonly ThinkingLevel[]): ThinkingLevel {
  const reqRank = LEVEL_RANK[requested] ?? 0;
  let best: ThinkingLevel = 'none';
  let bestRank = 0;
  for (const lvl of supported) {
    const r = LEVEL_RANK[lvl] ?? 0;
    if (r <= reqRank && r > bestRank) {
      best = lvl;
      bestRank = r;
    }
  }
  return best;
}

/**
 * Works for OpenAI, OpenRouter, Groq, DeepSeek, Ollama (/v1), and most compatible
 * servers - including SSE streaming of text and tool-call fragments.
 */
export function createOpenAi(cfg: OpenAiCfg, fetchImpl: FetchLike = fetch): Provider {

  /**
   * Attach reasoning options when the user picked a thinking level.
   *
   * Decision matrix (most trusted → least trusted):
   *  1. Probed cache (probe.js): we actually sent reasoning_effort to the
   *     server and saw it accept/reject each level. That wins.
   *  2. Heuristic capability detection (capabilities.ts) from model id for
   *     well-known reasoning models (o3-mini, deepseek-r1, …).
   *  3. If we can't identify the model BUT this is a custom/self-hosted host,
   *     trust the user and forward reasoning_effort anyway — most OpenAI-compat
   *     servers ignore unknown JSON fields and the user explicitly picked a
   *     level, which is a strong signal they're using a reasoning model.
   *  4. If it's https://api.openai.com and we don't recognise the model, do
   *     NOT send reasoning_effort — OpenAI returns a hard 400 for plain chat
   *     models, which breaks the entire reply.
   *
   * When we DO send reasoning_effort we also clamp the requested level to the
   * highest one the server actually accepts (per cache/heuristic) and attach a
   * reasoning.max_tokens budget hint (DeepSeek / vLLM / o3/o4 style).
   */
  function applyThinking(body: Record<string, unknown>, req: ChatRequest): void {
    const level = req.thinkingLevel;
    if (!level || level === 'none') return;

    const heuristicCaps = getModelCapabilities(cfg.model, 'openai');
    const cached = getCachedCaps(cfg.baseUrl, cfg.model, cfg.apiKey);
    const isOpenAiOfficial = /^https?:\/\/api\.openai\.com\b/.test(cfg.baseUrl);
    const forceOnCustom = cfg.isCustomHost && !isOpenAiOfficial;

    // If we have a *verified* answer (probe.js tested this server), use it as
    // the source of truth and clamp to the highest level the server accepted.
    // Otherwise fall back to heuristic detection; on custom/self-hosted
    // endpoints we fall back to allowing all levels when the user picked one,
    // because we can't know without probing and most servers ignore unknown
    // fields.
    const supportedLevels: readonly ThinkingLevel[] = cached
      ? cached.supportedLevels
      : (heuristicCaps.supportsThinking || forceOnCustom)
        ? (['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const)
        : ['none'];
    const sendAtAll = cached ? cached.supportsThinking : (heuristicCaps.supportsThinking || forceOnCustom);
    if (!sendAtAll) return;

    // Clamp the requested level to the highest the model supports.
    const effective = clampLevel(level, supportedLevels);
    if (effective === 'none') return;

    const effort = thinkingLevelToEffort(effective);
    if (effort) body.reasoning_effort = effort;

    const tokBudget = thinkingLevelToTokens(effective);
    if (tokBudget) {
      body.reasoning = { max_tokens: tokBudget };
      if (!body.max_tokens || (typeof body.max_tokens === 'number' && body.max_tokens < tokBudget + 256)) {
        body.max_tokens = Math.max((cfg.maxTokens ?? 4096), tokBudget + 2048);
      }
    }
  }

  function finalize(
    text: string,
    tools: Map<number, ToolAcc>,
    finish: string,
    thinking?: string,
  ): ChatResult {
    // If text contains inline <think>...</think> tags, extract them
    let cleanText = text;
    let extractedThinking = thinking || '';
    const thinkMatch = cleanText.match(/<think>([\s\S]*?)<\/think>/i);
    if (thinkMatch && thinkMatch[1]) {
      extractedThinking = (extractedThinking ? extractedThinking + '\n' : '') + thinkMatch[1].trim();
      cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    }

    const toolCalls: ChatResult['toolCalls'] = [...tools.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, t]) => ({ id: t.id || `call_${t.name}`, name: t.name, args: parseToolArgs(t.args) }));
    const stopReason: ChatResult['stopReason'] =
      toolCalls.length || finish === 'tool_calls'
        ? 'tool'
        : finish === 'length'
          ? 'length'
          : finish === 'stop'
            ? 'end'
            : 'unknown';
    return { text: cleanText, toolCalls, stopReason, thinking: extractedThinking || undefined };
  }

  async function basic(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: buildMessages(req),
      max_tokens: req.maxTokens ?? cfg.maxTokens,
      temperature: req.temperature ?? cfg.temperature,
    };
    applyThinking(body, req);
    const tools = toOpenAiTools(req.tools);
    if (tools) body.tools = tools;

    const res = await fetchImpl(joinUrl(cfg.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.apiKey || 'not-needed'}`,
      },
      body: JSON.stringify(body),
      signal: opts?.signal,
    });
    if (!res.ok) throw new ProviderError(`openai HTTP ${res.status}`, res.status, await readError(res));
    const data = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          reasoning_content?: string;
          thinking?: string;
          tool_calls?: { id: string; function: { name: string; arguments: string } }[];
        };
        finish_reason?: string;
      }[];
    };
    const choice = data.choices?.[0];
    const msg = choice?.message;
    let text = msg?.content ?? '';
    if (Array.isArray(text)) text = JSON.stringify(text);
    const thinkingText = msg?.reasoning_content || msg?.thinking || '';
    const toolsOut = new Map<number, ToolAcc>();
    for (const tc of msg?.tool_calls ?? []) {
      toolsOut.set(toolsOut.size, { id: tc.id, name: tc.function.name, args: tc.function.arguments || '{}' });
    }
    return finalize(text || '', toolsOut, choice?.finish_reason ?? '', thinkingText);
  }

  async function stream(req: ChatRequest, opts: ChatOpts): Promise<ChatResult> {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: buildMessages(req),
      max_tokens: req.maxTokens ?? cfg.maxTokens,
      temperature: req.temperature ?? cfg.temperature,
      stream: true,
    };
    applyThinking(body, req);
    const tools = toOpenAiTools(req.tools);
    if (tools) body.tools = tools;

    const res = await fetchImpl(joinUrl(cfg.baseUrl, '/chat/completions'), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${cfg.apiKey || 'not-needed'}`,
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) throw new ProviderError(`openai HTTP ${res.status}`, res.status, await readError(res));
    if (!res.body) throw new ProviderError('openai: empty stream body');

    let text = '';
    let thinkingText = '';
    let finish = '';
    const acc = new Map<number, ToolAcc>();

    for await (const data of sseData(res)) {
      if (data === '[DONE]') break;
      let frame: {
        choices?: {
          delta?: {
            content?: string;
            reasoning_content?: string;
            thinking?: string;
            reasoning?: string;
            tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
          };
          finish_reason?: string | null;
        }[];
      };
      try {
        frame = JSON.parse(data);
      } catch {
        continue;
      }
      const choice = frame.choices?.[0];
      const reasoningChunk = choice?.delta?.reasoning_content || choice?.delta?.thinking || choice?.delta?.reasoning;
      if (reasoningChunk) {
        thinkingText += reasoningChunk;
        opts.onThinkingDelta?.(reasoningChunk);
      }
      if (choice?.delta?.content) {
        text += choice.delta.content;
        opts.onDelta?.(choice.delta.content);
      }
      for (const tc of choice?.delta?.tool_calls ?? []) {
        const i = tc.index ?? 0;
        let a = acc.get(i);
        if (!a) {
          a = { id: '', name: '', args: '' };
          acc.set(i, a);
        }
        if (tc.id) a.id = tc.id;
        if (tc.function?.name) a.name += tc.function.name;
        if (tc.function?.arguments) a.args += tc.function.arguments;
      }
      if (choice?.finish_reason) finish = choice.finish_reason;
    }

    return finalize(text, acc, finish, thinkingText);
  }

  return {
    name: 'openai-compatible',
    model: cfg.model,
    async chat(req, opts) {
      if (opts?.onDelta && cfg.stream !== false) {
        let emitted = 0;
        const counting: ChatOpts = {
          signal: opts.signal,
          onDelta: (chunk) => {
            emitted++;
            opts.onDelta?.(chunk);
          },
          onThinkingDelta: (chunk) => {
            opts.onThinkingDelta?.(chunk);
          },
        };
        try {
          return await stream(req, counting);
        } catch (err) {
          if (isAbortError(err) || emitted > 0) throw err;
          return basic(req, opts);
        }
      }
      return basic(req, opts);
    },
  };
}
