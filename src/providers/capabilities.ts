/**
 * Model thinking / reasoning capabilities for OpenAI-compatible providers.
 *
 * Reasoning budgets are expressed as `reasoning_effort` (low/medium/high) on
 * OpenAI-style endpoints, sometimes combined with a `reasoning: { max_tokens }`
 * block on newer servers (DeepSeek-R1, vLLM, OpenAI o3/o4).
 *
 * Important: plain (non-reasoning) OpenAI models (gpt-4o, gpt-4o-mini) answer
 * `Unsupported parameter: 'reasoning_effort'` with a hard 400, so we only
 * attach the parameter when we recognize the model as a reasoning model —
 * OR when the request is going to a custom/self-hosted base URL (those
 * servers usually ignore unknown JSON fields, and many host reasoning
 * models we cannot identify by name alone).
 */

export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export const THINKING_LEVELS: readonly ThinkingLevel[] = ['none', 'low', 'medium', 'high', 'xhigh', 'max'];

export interface ModelThinkingCapability {
  supportsThinking: boolean;
  supportedLevels: ThinkingLevel[];
  defaultLevel: ThinkingLevel;
}

/** Is this an actual thinking level (used to validate UI input)? */
export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === 'string' && (THINKING_LEVELS as readonly string[]).includes(value);
}

/** Accept only a known level; anything else means "not specified". */
export function normalizeThinkingLevel(value: unknown): ThinkingLevel | undefined {
  return isThinkingLevel(value) ? value : undefined;
}

const ALL: ThinkingLevel[] = [...THINKING_LEVELS];

/**
 * OpenAI's own reasoning models (o1 / o3 / o4 / gpt-5 / codex).
 *
 * Deliberately anchored so plain gpt-4o / gpt-4.1 / gpt-4o-mini never match.
 */
export function isOpenAiReasoningModel(modelId: string): boolean {
  const m = (modelId || '').toLowerCase().trim();
  return (
    /(^|[/:])o[134](-|$|\.)/.test(m) ||
    /(^|[/:])o1$|(^|[/:])o3$|(^|[/:])o4$/.test(m) ||
    /(^|[/:])gpt-5(-|$|\.)/.test(m) ||
    m.includes('codex')
  );
}

/**
 * Which request key carries the output-token limit.
 *
 * OpenAI's reasoning models reject `max_tokens` on Chat Completions with
 *   400 Unsupported parameter: 'max_tokens' is not supported with this model.
 * and require `max_completion_tokens` (which also counts reasoning tokens).
 * Every other model takes `max_tokens` and rejects `max_completion_tokens`,
 * so this is keyed off the model id and is host-independent.
 */
export function usesMaxCompletionTokens(modelId: string): boolean {
  return isOpenAiReasoningModel(modelId);
}

/** True only for OpenAI's own API, where the wire format is fixed. */
export function isOpenAiOfficialHost(baseUrl: string): boolean {
  const raw = (baseUrl || '').trim();
  // Exact hostname match, so a lookalike host (api.openai.com.evil.test) is
  // never mistaken for OpenAI — that would silently strip reasoning params
  // from a self-hosted server.
  try {
    const host = new URL(raw).hostname.toLowerCase();
    // An empty hostname means the URL parsed as something opaque (e.g. the
    // scheme-less "api.openai.com/v1" reads as protocol "api.openai.com:"),
    // so fall through to the regex below.
    if (host) return host === 'openai.com' || host === 'api.openai.com';
  } catch {
    /* not parseable — fall through */
  }
  // Scheme-less spelling such as "api.openai.com/v1".
  return /^(?:https?:\/\/)?(api\.)?openai\.com(?:[/:]|$)/i.test(raw);
}

/**
 * Check if a model ID / provider supports model reasoning / thinking.
 */
export function getModelCapabilities(modelId: string, providerName?: string): ModelThinkingCapability {
  const m = (modelId || '').toLowerCase().trim();
  const p = (providerName || '').toLowerCase().trim();

  const yes = (defaultLevel: ThinkingLevel = 'medium'): ModelThinkingCapability => ({
    supportsThinking: true,
    supportedLevels: ALL,
    defaultLevel,
  });

  // OpenAI reasoning models: o1 / o3 / o4 / gpt-5 families.
  if (isOpenAiReasoningModel(m)) {
    return yes();
  }

  // OpenAI-mini variants of reasoning models (e.g. o3-mini, o4-mini).
  if (/(^|[/:])o[134]-mini/.test(m)) {
    return yes();
  }

  // DeepSeek R1 / Reasoner (deepseek-chat / V3 does not reason).
  if (m.includes('deepseek-r1') || m.includes('deepseek-reasoner') || /(^|[/:])r1(-|$|\.)/.test(m)) {
    return yes();
  }

  // Common reasoning-model name hints across OpenAI-compatible providers:
  //  - Qwen QwQ / Qwen*-Thinking
  //  - :thinking suffix (OpenRouter)
  //  - -reasoner / /reasoner suffix
  //  - model ids containing "reasoning"
  //  - Kimi k1/k2, GLM-4.5-thinking, StepFun, Mistral "thinking" editions, etc.
  if (
    m.includes(':thinking') ||
    m.includes('-reasoner') ||
    m.includes('/reasoner') ||
    m.includes('-thinking') ||
    m.includes('/thinking') ||
    m.includes('qwq') ||
    m.includes('reasoning') ||
    m.includes('kimi-k') || // moonshot kimi-k1 / kimi-k1.5 / kimi-k2
    /(^|[-/:_])k[12](-|$|\.)/.test(m) // Kimi k1/k2 reasoning models
  ) {
    return yes();
  }
  if (p.includes('reason') && (m.includes('think') || m.includes('r1'))) {
    return yes();
  }

  return {
    supportsThinking: false,
    supportedLevels: ['none'],
    defaultLevel: 'none',
  };
}

/**
 * Return token budget number for token-based thinking APIs (Anthropic, Gemini, DeepSeek).
 */
export function thinkingLevelToTokens(level: ThinkingLevel): number | undefined {
  switch (level) {
    case 'low': return 1024;
    case 'medium': return 4096;
    case 'high': return 16384;
    case 'xhigh': return 32768;
    case 'max': return 64000;
    case 'none':
    default:
      return undefined;
  }
}

/**
 * Return reasoning_effort string for OpenAI/OpenRouter effort APIs.
 */
export function thinkingLevelToEffort(level: ThinkingLevel): 'low' | 'medium' | 'high' | undefined {
  switch (level) {
    case 'low': return 'low';
    case 'medium': return 'medium';
    case 'high':
    case 'xhigh':
    case 'max':
      return 'high';
    case 'none':
    default:
      return undefined;
  }
}
