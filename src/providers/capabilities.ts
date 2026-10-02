/**
 * Model thinking / reasoning capabilities.
 *
 * Providers differ in *how* a reasoning budget is expressed (Anthropic budgets,
 * OpenAI reasoning_effort, Gemini thinkingBudget, Ollama think), and — more
 * importantly — non-reasoning models reject those parameters outright (OpenAI
 * answers `Unsupported parameter: 'reasoning_effort'` with a 400). So every
 * provider checks this table before attaching thinking options to a request.
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
  // (Deliberately anchored: plain 4o / gpt-4 must NOT match and get a 400.)
  if (
    /(^|[/:])o[134](-|$|\.)/.test(m) ||
    /(^|[/:])gpt-5(-|$|\.)/.test(m) ||
    m.includes('codex')
  ) {
    return yes();
  }

  // Anthropic extended thinking: Claude 3.7 and the Claude 4 family.
  if (
    m.includes('claude-3-7') || m.includes('claude-3.7') ||
    m.includes('claude-4') || m.includes('claude-sonnet-4') || m.includes('claude-opus-4')
  ) {
    return yes();
  }

  // Google Gemini 2.5 (and other explicitly thinking-tagged models).
  if (m.includes('thinking') || m.includes('gemini-2.5') || m.includes('gemini-2-5')) {
    return yes();
  }

  // DeepSeek R1 / Reasoner (deepseek-chat / V3 does not reason).
  if (m.includes('deepseek-r1') || m.includes('deepseek-reasoner') || /(^|[/:])r1(-|$|\.)/.test(m)) {
    return yes();
  }

  // OpenRouter-style reasoning models (`:thinking`, `-reasoner`, `reasoning`).
  // The provider name is accepted too, for endpoints that proxy reasoning models.
  if (m.includes(':thinking') || m.includes('-reasoner') || m.includes('/reasoner') || m.includes('reasoning')) {
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
