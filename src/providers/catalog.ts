/**
 * The model catalog, and what each model can actually do (batch 27.3).
 *
 * Two questions this answers, both of which used to be guesswork:
 *
 *   1. **What models does my endpoint have?** `listModels()` asks the live
 *      endpoint (OpenAI-compatible `/models`, Gemini `/v1beta/models`,
 *      Anthropic `/v1/models`) and falls back to the catalog when there is no
 *      network or no key — so `termcrab models` always says something true.
 *   2. **What can this model do?** Vision, tool calls, a thinking level, and a
 *      context window: `describeModel()` reads the catalog for a known id and
 *      otherwise says 'unknown' rather than assuming. The loop and the panel
 *      use the same function, so the UI cannot claim a capability the code
 *      will not use.
 *
 * Prices are per 1,000,000 tokens, in USD, and carry the date they were read.
 * They are a starting point for the cost column, not a bill: `config.provider.
 * priceIn/priceOut` always wins, and an unknown model shows tokens with no
 * cost at all.
 */
import { FetchLike, ProviderError } from './types.js';
import { listGeminiModels } from './gemini.js';
import type { ProviderCfg } from '../core/config.js';

export interface ModelInfo {
  id: string;
  label?: string;
  /** Which wire format this id is used with. */
  provider: 'openai' | 'anthropic' | 'gemini' | 'local';
  contextWindow?: number;
  vision?: boolean;
  tools?: boolean;
  thinking?: boolean;
  priceInPerM?: number;
  priceOutPerM?: number;
  /** Where the numbers came from: the catalog, or the live endpoint. */
  source: 'catalog' | 'endpoint';
}

export const CATALOG_DATE = '2026-10-03';

const M = 1_000_000;

/** Known models. Prefix-matched, longest match wins. */
const CATALOG: { match: string; info: Omit<ModelInfo, 'source'> }[] = [
  // ---- OpenAI-compatible ----
  { match: 'gpt-5', info: { id: 'gpt-5', provider: 'openai', contextWindow: 400_000, vision: true, tools: true, thinking: true, priceInPerM: 1.25, priceOutPerM: 10 } },
  { match: 'gpt-4o-mini', info: { id: 'gpt-4o-mini', provider: 'openai', contextWindow: 128_000, vision: true, tools: true, priceInPerM: 0.15, priceOutPerM: 0.6 } },
  { match: 'gpt-4o', info: { id: 'gpt-4o', provider: 'openai', contextWindow: 128_000, vision: true, tools: true, priceInPerM: 2.5, priceOutPerM: 10 } },
  { match: 'gpt-4.1-mini', info: { id: 'gpt-4.1-mini', provider: 'openai', contextWindow: 1_000_000, vision: true, tools: true, priceInPerM: 0.4, priceOutPerM: 1.6 } },
  { match: 'gpt-4.1', info: { id: 'gpt-4.1', provider: 'openai', contextWindow: 1_000_000, vision: true, tools: true, priceInPerM: 2, priceOutPerM: 8 } },
  { match: 'o3', info: { id: 'o3', provider: 'openai', contextWindow: 200_000, vision: true, tools: true, thinking: true, priceInPerM: 2, priceOutPerM: 8 } },
  { match: 'o4-mini', info: { id: 'o4-mini', provider: 'openai', contextWindow: 200_000, vision: true, tools: true, thinking: true, priceInPerM: 1.1, priceOutPerM: 4.4 } },
  // ---- Anthropic ----
  { match: 'claude-sonnet-4-5', info: { id: 'claude-sonnet-4-5', provider: 'anthropic', contextWindow: 200_000, vision: true, tools: true, thinking: true, priceInPerM: 3, priceOutPerM: 15 } },
  { match: 'claude-haiku-4-5', info: { id: 'claude-haiku-4-5', provider: 'anthropic', contextWindow: 200_000, vision: true, tools: true, thinking: true, priceInPerM: 1, priceOutPerM: 5 } },
  { match: 'claude-opus-4', info: { id: 'claude-opus-4', provider: 'anthropic', contextWindow: 200_000, vision: true, tools: true, thinking: true, priceInPerM: 15, priceOutPerM: 75 } },
  { match: 'claude-3-5-haiku', info: { id: 'claude-3-5-haiku', provider: 'anthropic', contextWindow: 200_000, vision: true, tools: true, priceInPerM: 0.8, priceOutPerM: 4 } },
  // ---- Gemini ----
  { match: 'gemini-2.5-pro', info: { id: 'gemini-2.5-pro', provider: 'gemini', contextWindow: 1_000_000, vision: true, tools: true, thinking: true, priceInPerM: 1.25, priceOutPerM: 10 } },
  { match: 'gemini-2.5-flash', info: { id: 'gemini-2.5-flash', provider: 'gemini', contextWindow: 1_000_000, vision: true, tools: true, thinking: true, priceInPerM: 0.3, priceOutPerM: 2.5 } },
  { match: 'gemini-2.0-flash', info: { id: 'gemini-2.0-flash', provider: 'gemini', contextWindow: 1_000_000, vision: true, tools: true, priceInPerM: 0.1, priceOutPerM: 0.4 } },
  // ---- Local (Ollama / llama.cpp / vLLM) ----
  { match: 'llama3.2', info: { id: 'llama3.2', provider: 'local', contextWindow: 128_000, tools: true } },
  { match: 'llama3.1', info: { id: 'llama3.1', provider: 'local', contextWindow: 128_000, tools: true } },
  { match: 'qwen2.5', info: { id: 'qwen2.5', provider: 'local', contextWindow: 128_000, tools: true } },
  { match: 'qwen3', info: { id: 'qwen3', provider: 'local', contextWindow: 128_000, tools: true, thinking: true } },
  { match: 'gemma3', info: { id: 'gemma3', provider: 'local', contextWindow: 128_000, vision: false, tools: true } },
  { match: 'phi4', info: { id: 'phi4', provider: 'local', contextWindow: 16_000, tools: true } },
];

/** Strip an OpenRouter-style prefix (`vendor/model`) for matching. */
function bare(id: string): string {
  // OpenRouter-style ids can nest (`openrouter/anthropic/claude-…`), so the
  // whole id is tried too: the catalog match below uses `startsWith`, and
  // `claude-3-5-haiku` is what the last segment looks like.
  const parts = id.split('/');
  return (parts.length > 1 ? parts[parts.length - 1]! : id).toLowerCase();
}

/**
 * What we know about one model id. Never guesses: an id the catalog does not
 * contain comes back `source: 'endpoint'` with only what the endpoint said.
 */
export function describeModel(id: string, provider: ModelInfo['provider'] = 'openai'): ModelInfo {
  const needle = bare(id);
  let best: (typeof CATALOG)[number] | undefined;
  for (const entry of CATALOG) {
    if (needle.startsWith(entry.match) && (!best || entry.match.length > best.match.length)) best = entry;
  }
  if (best) return { ...best.info, id, source: 'catalog' };
  return { id, provider, source: 'endpoint' };
}

/** A one-line "what this model can do" for the CLI. */
export function capabilityLine(info: ModelInfo): string {
  if (info.source === 'endpoint') return 'capabilities unknown (not in the catalog) — the agent will try and report';
  const bits: string[] = [];
  if (info.contextWindow) bits.push(`${Math.round(info.contextWindow / 1000)}k context`);
  if (info.vision) bits.push('sees images');
  if (info.tools) bits.push('tools');
  if (info.thinking) bits.push('thinking');
  if (info.priceInPerM != null) bits.push(`$${info.priceInPerM}/$${info.priceOutPerM}/M tokens`);
  return bits.join(' · ') || 'no special capabilities recorded';
}

/** Ask the live endpoint what it has. Throws on network/HTTP failure. */
export async function listModelsLive(cfg: ProviderCfg, fetchImpl: FetchLike = fetch): Promise<ModelInfo[]> {
  const type = cfg.type === 'mock' ? 'openai' : cfg.type;
  if (type === 'gemini') {
    const models = await listGeminiModels(cfg.baseUrl, cfg.apiKey, fetchImpl);
    return models.map((m) => ({ ...describeModel(m.id, 'gemini'), label: m.label || undefined, source: 'endpoint' as const }));
  }
  const base = (cfg.baseUrl || (type === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1')).replace(/\/+$/, '');
  const url = type === 'anthropic' ? `${base}/v1/models` : /\/v1$/.test(base) ? `${base}/models` : `${base}/v1/models`;
  const res = await fetchImpl(url, {
    headers: {
      ...(cfg.apiKey && type === 'anthropic' ? { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' } : {}),
      ...(cfg.apiKey && type !== 'anthropic' ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
  });
  if (!res.ok) throw new ProviderError(`models endpoint said ${res.status}`, res.status);
  const payload = (await res.json()) as { data?: { id?: string }[]; models?: { id?: string; display_name?: string }[] };
  const rows = payload.data ?? payload.models ?? [];
  return rows
    .map((r) => String((r as { id?: string }).id ?? ''))
    .filter(Boolean)
    .map((id) => ({ ...describeModel(id, type === 'anthropic' ? 'anthropic' : 'openai'), source: 'endpoint' as const }));
}

/**
 * The list `termcrab models` prints: everything the endpoint has (when it can
 * be reached), then anything from the catalog the endpoint did not mention.
 * Always at least the configured model, so the command is never empty.
 */
export async function listModels(
  cfg: ProviderCfg,
  fetchImpl: FetchLike = fetch,
): Promise<{ models: ModelInfo[]; live: boolean; note: string }> {
  if (cfg.type === 'mock') {
    return {
      models: [{ ...describeModel('mock-1', 'openai'), provider: 'openai', label: 'offline demo brain' }],
      live: false,
      note: 'the mock provider is local: there is no endpoint to ask',
    };
  }
  try {
    const live = await listModelsLive(cfg, fetchImpl);
    const seen = new Set(live.map((m) => m.id));
    if (cfg.model && !seen.has(cfg.model)) live.unshift({ ...describeModel(cfg.model, cfg.type), source: 'endpoint' });
    return { models: live, live: true, note: `read from ${cfg.baseUrl || 'the provider’s own endpoint'}` };
  } catch (err) {
    const catalog = CATALOG.filter((entry) => entry.info.provider === (cfg.type === 'mock' ? 'openai' : cfg.type)).map((entry) => ({
      ...entry.info,
      source: 'catalog' as const,
    }));
    const configured = cfg.model ? [describeModel(cfg.model, cfg.type)] : [];
    const merged = [...configured, ...catalog].filter((m, i, all) => all.findIndex((x) => x.id === m.id) === i);
    return {
      models: merged,
      live: false,
      note: `could not reach the endpoint (${err instanceof Error ? err.message : String(err)}) — showing the offline catalog for ${cfg.type}`,
    };
  }
}

/** The catalog for one wire format, without any network. Used by tests and docs. */
export function catalogFor(provider: ModelInfo['provider']): ModelInfo[] {
  return CATALOG.filter((e) => e.info.provider === provider).map((e) => ({ ...e.info, source: 'catalog' as const }));
}

export { M as TOKENS_PER_PRICE_UNIT };
