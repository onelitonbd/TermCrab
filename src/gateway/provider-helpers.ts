/**
 * Shared provider helpers: how the gateway resolves the endpoint/key it is
 * wired to, how it renders provider rows, and how it asks an OpenAI-compatible
 * endpoint for its model catalog. Used by the HTTP API and by the telegram
 * provider/model picker (src/channels/picker.ts).
 */
import { Config, ProviderEntry } from '../core/config.js';

/** Short, safe rendering of a stored API key (never the whole secret). */
export function maskApiKey(k: string): string {
  if (k.length >= 8) return `${k.slice(0, 3)}…${k.slice(-4)}`;
  return `…${k.slice(-2)}`;
}

export function providerView(p: ProviderEntry) {
  return {
    id: p.id,
    name: p.name,
    baseUrl: p.baseUrl,
    created: p.created,
    keyCount: p.keys.length,
    modelCount: (p.models || []).length,
  };
}

/** Resolved base url of the provider currently wired into the gateway. */
export function activeBaseUrl(cfg: Config['provider']): string {
  if (cfg.baseUrl) return cfg.baseUrl.replace(/\/+$/, '');
  return 'https://api.openai.com/v1';
}

/** Human name for the current provider (known hosts get their brand name). */
export function activeLabel(cfg: Config['provider'], baseUrl: string): string {
  let host = '';
  try { host = new URL(baseUrl).host; } catch { /* ignore */ }
  const known: Record<string, string> = {
    'api.openai.com': 'OpenAI',
    'openrouter.ai': 'OpenRouter',
    'api.groq.com': 'Groq',
    'api.deepseek.com': 'DeepSeek',
    'api.x.ai': 'xAI',
    'api.mistral.ai': 'Mistral',
    '127.0.0.1:11434': 'Ollama (local)',
    'localhost:11434': 'Ollama (local)',
  };
  if (host && known[host]) return known[host]!;
  if (host) return host;
  return cfg.type;
}

/** Which key to talk to a provider with: the one in use, else the first saved, else a CLI key. */
export function providerOutboundKey(p: ProviderEntry, cfg: Config): string {
  const activeKey = cfg.provider.apiKey || '';
  if (activeKey && p.keys.some((k) => k.key === activeKey)) return activeKey;
  if (p.keys[0]) return p.keys[0].key;
  if (activeKey && activeBaseUrl(cfg.provider) === p.baseUrl) return activeKey;
  return '';
}

/** Ask an OpenAI-compatible endpoint for its model catalog. */
export async function fetchProviderModels(p: ProviderEntry, key: string): Promise<string[]> {
  const url = p.baseUrl.replace(/\/+$/, '') + '/models';
  let res: Response;
  try {
    res = await fetch(url, {
      headers: key ? { authorization: 'Bearer ' + key } : {},
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    throw new Error('could not reach ' + p.baseUrl + ' (' + why.slice(0, 120) + ')');
  }
  if (!res.ok) throw new Error('the provider answered HTTP ' + res.status);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('the provider sent an unreadable answer');
  }
  const d = data as { data?: unknown; models?: unknown };
  const arr = Array.isArray(d.data) ? d.data : Array.isArray(d.models) ? d.models : null;
  if (!arr) throw new Error('the provider sent an unexpected answer');
  const ids: string[] = [];
  for (const m of arr) {
    const id = typeof m === 'string' ? m : m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string'
      ? (m as { id: string }).id
      : '';
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) throw new Error('no models came back from the provider');
  return ids.sort();
}
