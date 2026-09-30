import { ProviderCfg } from '../core/config.js';
import { createAnthropic } from './anthropic.js';
import { createMock } from './mock.js';
import { createOpenAi } from './openai.js';
import { ChatOpts, ChatRequest, ChatResult, FetchLike, Provider } from './types.js';
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

// ---------------------------------------------------------------------------
// Failover chain: try providers in order, skip ones in cooldown.
// ---------------------------------------------------------------------------

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 60_000;

function providerKey(cfg: ProviderCfg): string {
  return `${cfg.type}:${cfg.baseUrl || ''}:${cfg.model}`;
}

function isInCooldown(cfg: ProviderCfg): boolean {
  const until = cooldowns.get(providerKey(cfg));
  if (!until) return false;
  if (Date.now() >= until) {
    cooldowns.delete(providerKey(cfg));
    return false;
  }
  return true;
}

function markCooldown(cfg: ProviderCfg): void {
  cooldowns.set(providerKey(cfg), Date.now() + COOLDOWN_MS);
}

/**
 * A provider that tries a chain of providers in order, skipping any that
 * are in cooldown. Falls through on network errors, 429s, and 5xx responses.
 */
class FailoverProvider implements Provider {
  readonly name: string;
  readonly model: string;
  private chain: Provider[];
  private configs: ProviderCfg[];

  constructor(chain: Provider[], configs: ProviderCfg[], names: string[]) {
    this.chain = chain;
    this.configs = configs;
    this.name = `failover(${names.join(' -> ')})`;
    this.model = chain[0]?.model ?? '';
  }

  async chat(req: ChatRequest, opts?: ChatOpts): Promise<ChatResult> {
    let lastError: Error | null = null;
    for (let i = 0; i < this.chain.length; i++) {
      const provider = this.chain[i]!;
      const cfg = this.configs[i]!;
      try {
        return await provider.chat(req, opts);
      } catch (err) {
        if (isAbortError(err)) throw err; // user abort — don't retry
        lastError = err instanceof Error ? err : new Error(String(err));
        // Mark cooldown on rate limits and server errors
        const status = (err as { status?: number }).status;
        if (status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || !status) {
          markCooldown(cfg);
        }
      }
    }
    throw lastError ?? new Error('all providers in chain failed');
  }
}

/**
 * Resolve a failover chain from config. Returns a single provider if
 * failover is disabled or only one provider is configured.
 */
export function resolveProviderChain(
  primary: ProviderCfg,
  fallbacks: ProviderCfg[],
  fetchImpl: FetchLike = fetch,
): Provider {
  const configs = [primary, ...fallbacks];
  const chain: Provider[] = [];
  const validConfigs: ProviderCfg[] = [];
  const names: string[] = [];

  for (const cfg of configs) {
    if (isInCooldown(cfg)) continue;
    try {
      chain.push(resolveProvider(cfg, fetchImpl));
      validConfigs.push(cfg);
      names.push(providerSummary(cfg));
    } catch {
      /* skip invalid configs */
    }
  }

  if (chain.length === 0) {
    // All in cooldown — try primary anyway
    return resolveProvider(primary, fetchImpl);
  }
  if (chain.length === 1) return chain[0]!;
  return new FailoverProvider(chain, validConfigs, names);
}

/** Mark a provider config as in cooldown (called by loop.ts on failure). */
export function markProviderCooldown(cfg: ProviderCfg): void {
  markCooldown(cfg);
}

/** Check if a provider config is currently in cooldown. */
export function providerInCooldown(cfg: ProviderCfg): boolean {
  return isInCooldown(cfg);
}
