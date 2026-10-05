import { ProviderCfg } from '../core/config.js';
import { createMock } from './mock.js';
import { createOpenAi } from './openai.js';
import { createAnthropic } from './anthropic.js';
import { createGemini } from './gemini.js';
import { ChatOpts, ChatRequest, ChatResult, FetchLike, Provider } from './types.js';
import { isAbortError } from './types.js';

export * from './types.js';

/** Default base URLs for well-known OpenAI-compatible endpoints. */
export const OPENAI_COMPAT_BASES = {
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq: 'https://api.groq.com/openai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  xai: 'https://api.x.ai/v1',
  mistral: 'https://api.mistral.ai/v1',
  ollama: 'http://127.0.0.1:11434/v1',
} as const;

/** Strip trailing slashes so URL spellings can be compared. */
function normalizeBase(u: string): string {
  return (u || '').trim().replace(/\/+$/, '');
}

function originOf(u: string): string {
  try {
    return new URL(u).origin.toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

/**
 * Is this one of the endpoints we know the exact behaviour of?
 *
 * Compared by origin rather than literal string so the common spelling
 * variants (no /v1 suffix, trailing slash, different casing) all resolve to
 * the same known host. Getting this wrong marks a well-known host as "custom",
 * which makes applyThinking() force reasoning_effort onto models it shouldn't.
 */
export function isWellKnownBase(baseUrl: string): boolean {
  const b = normalizeBase(baseUrl) || OPENAI_COMPAT_BASES.openai;
  const known = Object.values(OPENAI_COMPAT_BASES).map(normalizeBase);
  if (known.some((k) => k === b)) return true;
  return known.some((k) => originOf(k) === originOf(b));
}

/** Short label for a base URL, used for heuristic capability detection. */
export function providerNameFor(baseUrl: string): string {
  const origin = originOf(normalizeBase(baseUrl) || OPENAI_COMPAT_BASES.openai);
  for (const [name, base] of Object.entries(OPENAI_COMPAT_BASES)) {
    if (originOf(normalizeBase(base)) === origin) return name;
  }
  return 'openai-compatible';
}

/**
 * TermCrab only supports OpenAI-compatible Chat Completions APIs.
 * That covers OpenAI, OpenRouter, Groq, DeepSeek, xAI, Mistral, Ollama (/v1),
 * vLLM, llama.cpp, text-generation-webui, Together, Fireworks, Anyscale, and
 * dozens of self-hosted servers — they all speak the same /v1/chat/completions
 * wire format. Set cfg.baseUrl to point at any compatible server.
 */
export function resolveProvider(cfg: ProviderCfg, fetchImpl: FetchLike = fetch): Provider {
  // The offline brain: no network, no key. Kept first so nothing below can
  // turn it into a request to an empty base URL.
  if (cfg.type === 'mock') return createMock(cfg.model);
  // Native wire formats (27.2): same interface, their own request/response
  // mapping. A key with no baseUrl gets that vendor's real endpoint.
  if (cfg.type === 'anthropic') {
    return createAnthropic(
      {
        apiKey: cfg.apiKey || '',
        model: cfg.model,
        ...(cfg.baseUrl ? { baseUrl: cfg.baseUrl } : {}),
        ...(cfg.maxTokens != null ? { maxTokens: cfg.maxTokens } : {}),
        ...(cfg.temperature != null ? { temperature: cfg.temperature } : {}),
        ...(cfg.stream != null ? { stream: cfg.stream } : {}),
      },
      fetchImpl,
    );
  }
  if (cfg.type === 'gemini') {
    return createGemini(
      {
        apiKey: cfg.apiKey || '',
        model: cfg.model,
        ...(cfg.baseUrl ? { baseUrl: cfg.baseUrl } : {}),
        ...(cfg.maxTokens != null ? { maxTokens: cfg.maxTokens } : {}),
        ...(cfg.temperature != null ? { temperature: cfg.temperature } : {}),
        ...(cfg.stream != null ? { stream: cfg.stream } : {}),
      },
      fetchImpl,
    );
  }
  const baseUrl = cfg.baseUrl || OPENAI_COMPAT_BASES.openai;
  return createOpenAi(
    {
      baseUrl,
      apiKey: cfg.apiKey || '',
      model: cfg.model,
      maxTokens: cfg.maxTokens,
      temperature: cfg.temperature,
      stream: cfg.stream,
      // Let the OpenAI client know whether this is a well-known host. We use
      // that to decide how strict to be about thinking/reasoning parameters
      // (unknown hosts often proxy reasoning models too and ignore unknown
      // params silently).
      isCustomHost: !isWellKnownBase(baseUrl),
      providerName: providerNameFor(baseUrl),
    },
    fetchImpl,
  );
}

export function providerSummary(cfg: ProviderCfg): string {
  if (cfg.type === 'mock') return `mock:${cfg.model || 'mock-1'} (offline demo)`;
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
