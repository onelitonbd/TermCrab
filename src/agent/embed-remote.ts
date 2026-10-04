/**
 * Embeddings from an endpoint instead of a 23 MB local model (32.1).
 *
 * The local path (`embed.ts`) is the good default on a phone *when the model is
 * already there* — but downloading ~23 MB of weights over mobile data, or
 * installing a Node package into Termux, is exactly the kind of thing that
 * makes people give up. Almost everybody already has an API key for chat, so:
 *
 *   openai-compatible  POST {base}/embeddings        {model, input:[...]}
 *   gemini             POST {base}/models/{m}:batchEmbedContents
 *
 * Both speak the same `Embedder` interface as the local pipeline, so the index
 * and the ranking above them cannot tell the difference — and the offline
 * fallback is still a plain lexical search.
 */
/*
 * Kept deliberately small: one request per `embed()` call (the input is already
 * a batch), a timeout, and errors that name the status and a short body excerpt
 * but **never the key**.
 */
import type { Embedder } from './embed.js';

export type RemoteKind = 'openai' | 'gemini';

export interface RemoteEmbedCfg {
  kind: RemoteKind;
  /** Base URL; for openai that is the thing ending in /v1. */
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Milliseconds before we give up on the endpoint (default 20s). */
  timeoutMs?: number;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export const REMOTE_DEFAULTS = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'text-embedding-3-small' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'text-embedding-004' },
} as const;

/**
 * Published list prices, USD per 1,000,000 tokens (2026 snapshot). Used for one
 * line of honesty in `termcrab embeddings` — never for billing.
 */
export const EMBED_PRICES: Record<string, { usdPerM: number; note: string }> = {
  'text-embedding-3-small': { usdPerM: 0.02, note: 'roughly one cent per million words' },
  'text-embedding-3-large': { usdPerM: 0.13, note: 'the big one; small is plenty for memory' },
  'text-embedding-004': { usdPerM: 0, note: 'free tier on Google AI Studio' },
};

function trimBase(u: string): string {
  return (u || '').trim().replace(/\/+$/, '');
}

/**
 * A short, safe glimpse of an error body: one line, bounded length, and the
 * configured key redacted — an endpoint that echoes the key back in its own
 * error message must not end up in a log, a chat message or a bug report.
 */
function excerpt(text: string, key: string): string {
  let one = text.replace(/\s+/g, ' ').trim();
  if (key && key.length >= 8) one = one.split(key).join('***');
  return one.slice(0, 180) || '(empty body)';
}

export function remoteEmbedder(cfg: RemoteEmbedCfg, fetchImpl: FetchLike = fetch): Embedder {
  const base = trimBase(cfg.baseUrl) || REMOTE_DEFAULTS[cfg.kind].baseUrl;
  const model = cfg.model || REMOTE_DEFAULTS[cfg.kind].model;
  const timeoutMs = cfg.timeoutMs ?? 20_000;

  const call = async (url: string, headers: Record<string, string>, body: unknown): Promise<Response> => {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      return await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
    } catch (err) {
      const why = err instanceof Error && err.name === 'AbortError' ? `timed out after ${timeoutMs} ms` : err instanceof Error ? err.message : String(err);
      throw new Error(`embeddings: could not reach ${new URL(url).host} — ${why}`);
    } finally {
      clearTimeout(timer);
    }
  };

  const embedOnce = async (texts: string[]): Promise<number[][]> => {
    const input = texts.map((t) => (t.length > 8000 ? t.slice(0, 8000) : t));

    if (cfg.kind === 'gemini') {
      const url = `${base}/models/${encodeURIComponent(model)}:batchEmbedContents`;
      const res = await call(url, cfg.apiKey ? { 'x-goog-api-key': cfg.apiKey } : {}, {
        requests: input.map((text) => ({ model: `models/${model}`, content: { parts: [{ text }] } })),
      });
      if (!res.ok) throw new Error(`embeddings: gemini answered ${res.status} — ${excerpt(await res.text().catch(() => ''), cfg.apiKey)}`);
      const json = (await res.json()) as { embeddings?: { values?: number[] }[] };
      const rows = json.embeddings ?? [];
      if (rows.length !== input.length) throw new Error(`embeddings: gemini returned ${rows.length} vector(s) for ${input.length} input(s)`);
      return rows.map((r) => r.values ?? []);
    }

    const url = `${base}/embeddings`;
    const res = await call(url, cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}, { model, input });
    if (!res.ok) throw new Error(`embeddings: ${new URL(url).host} answered ${res.status} — ${excerpt(await res.text().catch(() => ''), cfg.apiKey)}`);
    const json = (await res.json()) as { data?: { embedding?: number[]; index?: number }[] };
    const rows = json.data ?? [];
    if (rows.length !== input.length) throw new Error(`embeddings: the endpoint returned ${rows.length} vector(s) for ${input.length} input(s)`);
    // Some gateways reorder; `index` says where each vector belongs.
    const out: number[][] = new Array(rows.length);
    rows.forEach((r, i) => {
      out[typeof r.index === 'number' ? r.index : i] = r.embedding ?? [];
    });
    return out;
  };

  return {
    name: `${cfg.kind}:${model}`,
    async embed(texts: string[]): Promise<number[][]> {
      if (!texts.length) return [];
      const vectors = await embedOnce(texts);
      if (vectors.some((v) => !v || !v.length)) throw new Error('embeddings: the endpoint returned an empty vector');
      const dim = vectors[0]!.length;
      if (vectors.some((v) => v.length !== dim)) throw new Error('embeddings: the endpoint returned vectors of different sizes');
      return vectors;
    },
  };
}
