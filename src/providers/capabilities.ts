export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ModelThinkingCapability {
  supportsThinking: boolean;
  supportedLevels: ThinkingLevel[];
  defaultLevel: ThinkingLevel;
}

/**
 * Check if a model ID / provider supports model reasoning / thinking.
 */
export function getModelCapabilities(modelId: string, providerName?: string): ModelThinkingCapability {
  const m = (modelId || '').toLowerCase().trim();
  const p = (providerName || '').toLowerCase().trim();

  // OpenAI reasoning models
  if (m.startsWith('o1') || m.startsWith('o3') || m.includes('/o1') || m.includes('/o3')) {
    return {
      supportsThinking: true,
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultLevel: 'medium',
    };
  }

  // Anthropic Claude 3.7+
  if (m.includes('claude-3-7') || m.includes('claude-3.7')) {
    return {
      supportsThinking: true,
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultLevel: 'medium',
    };
  }

  // Gemini Flash Thinking
  if (m.includes('thinking') || m.includes('gemini-2.5') || m.includes('gemini-2-5')) {
    return {
      supportsThinking: true,
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultLevel: 'medium',
    };
  }

  // DeepSeek R1 / Reasoner
  if (m.includes('deepseek-r1') || m.includes('deepseek-reasoner') || m.includes('r1') || p.includes('deepseek')) {
    return {
      supportsThinking: true,
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultLevel: 'medium',
    };
  }

  // OpenRouter reasoning models (e.g. models with :thinking suffix or reasoning tags)
  if (m.includes(':thinking') || m.includes('reasoner') || m.includes('reasoning')) {
    return {
      supportsThinking: true,
      supportedLevels: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
      defaultLevel: 'medium',
    };
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
