import { ProviderCfg } from '../core/config.js';
import { createAnthropic } from './anthropic.js';
import { createMock } from './mock.js';
import { createOpenAi } from './openai.js';
import { FetchLike, Provider } from './types.js';
import { isAbortError } from './types.js';

export * from './types.js';

/** Default bases for openai-compatible endpoints (set provider.baseUrl to override). */
export const OPENAI_COMPAT_BASES = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://127.0.0.1:11434/v1',
} as const;

export function resolveProvider(cfg: ProviderCfg, fetchImpl: FetchLike = fetch): Provider {
  if (cfg.type === 'mock') return createMock(cfg.model);

  if (cfg.type === 'anthropic') {
    if (!cfg.apiKey) throw new Error('provider.apiKey is required for the anthropic provider');
    return createAnthropic(
      {
        baseUrl: cfg.baseUrl || 'https://api.anthropic.com',
        apiKey: cfg.apiKey,
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
        stream: cfg.stream,
      },
      fetchImpl,
    );
  }

  return createOpenAi(
    {
      baseUrl: cfg.baseUrl || OPENAI_COMPAT_BASES.openai,
      apiKey: cfg.apiKey || '',
      model: cfg.model,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      stream: cfg.stream,
    },
    fetchImpl,
  );
}

export function providerSummary(cfg: ProviderCfg): string {
  const base = cfg.baseUrl ? ` @ ${cfg.baseUrl}` : '';
  return `${cfg.type}:${cfg.model}${base}`;
}
