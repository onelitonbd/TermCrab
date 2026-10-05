/**
 * Which embedder is live, and why (32.1).
 *
 * One place decides, so the CLI (`termcrab embeddings`), the gateway's memory
 * store and the doctor all agree. The order is deliberately boring:
 *
 *   1. `memory.embeddings = false`        → nothing, lexical search only
 *   2. `memory.embedProvider`             → 'local' | 'openai' | 'gemini' (forced)
 *   3. 'auto'                             → the local model if the package is
 *                                            already installed, else the chat
 *                                            provider's own embedding endpoint
 *                                            when it has one, else nothing
 *
 * Nothing here does I/O beyond an `existsSync`, so it is safe to call from a
 * status command. The actual load happens in `resolveEmbedder()`.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../core/config.js';
import { PACKAGE_ROOT } from '../core/paths.js';
import { resolveAuth } from '../core/auth-profiles.js';
import { tryLoadEmbedder, type Embedder } from './embed.js';
import { EMBED_PRICES, REMOTE_DEFAULTS, remoteEmbedder, type FetchLike, type RemoteKind } from './embed-remote.js';

export type EmbedderKind = 'local' | 'openai' | 'gemini';
export type EmbedProviderSetting = 'auto' | 'local' | 'openai' | 'gemini';

export interface EmbedderPlan {
  /** null = lexical search only. */
  kind: EmbedderKind | null;
  model: string;
  /** One sentence for a human: what is live and why. */
  note: string;
  /** True when the choice came from `auto` rather than an explicit setting. */
  automatic: boolean;
  /** A configuration that cannot work as asked (e.g. 'local' with no package). */
  blocker?: string;
}

/** The local package, checked without importing it (status commands must be fast). */
export function localPackagePresent(): boolean {
  for (const pkg of ['@huggingface/transformers', '@xenova/transformers']) {
    if (fs.existsSync(path.join(PACKAGE_ROOT, 'node_modules', pkg))) return true;
  }
  return false;
}

interface MemoryCfg {
  embeddings?: boolean;
  embedProvider?: EmbedProviderSetting;
  embedModel?: string;
  embedBaseUrl?: string;
}

function memoryCfg(cfg: Config): MemoryCfg {
  return (cfg.memory ?? {}) as MemoryCfg;
}

/**
 * The chat provider, seen as an embedding endpoint. Only the two wire formats
 * that *have* an embedding route qualify; Anthropic's API does not (their
 * embeddings come from Voyage), and the mock brain is offline by definition.
 */
export function chatProviderAsRemote(cfg: Config): { kind: RemoteKind; baseUrl: string; apiKey: string } | null {
  const p = cfg.provider;
  if (!p || p.type === 'mock' || p.type === 'anthropic') return null;
  const apiKey = p.apiKey || '';
  if (p.type === 'gemini') return { kind: 'gemini', baseUrl: p.baseUrl || REMOTE_DEFAULTS.gemini.baseUrl, apiKey };
  // openai-compatible: a local server (llama.cpp, ollama) needs no key, so a
  // missing key is not a reason to refuse — it is a reason to say so.
  return { kind: 'openai', baseUrl: p.baseUrl || REMOTE_DEFAULTS.openai.baseUrl, apiKey };
}

/** What `resolveEmbedder()` will do — decided without loading anything. */
export function embedderPlan(cfg: Config): EmbedderPlan {
  const m = memoryCfg(cfg);
  if (m.embeddings === false) {
    return { kind: null, model: '', note: 'off (memory.embeddings=false) — lexical search only', automatic: false };
  }

  const setting: EmbedProviderSetting = m.embedProvider ?? 'auto';
  const local = localPackagePresent();
  const remote = chatProviderAsRemote(cfg);

  const chooseLocal = (automatic: boolean): EmbedderPlan => ({
    kind: 'local',
    model: m.embedModel || 'Xenova/all-MiniLM-L6-v2',
    note: automatic
      ? 'local model (the transformers package is installed) — offline, no key, no per-search cost'
      : 'local model, as asked (memory.embedProvider=local) — offline, no key',
    automatic,
  });

  const chooseRemote = (kind: RemoteKind, automatic: boolean): EmbedderPlan => {
    const model = m.embedModel || REMOTE_DEFAULTS[kind].model;
    const price = EMBED_PRICES[model];
    const cost = price ? ` · $${price.usdPerM}/1M tokens (${price.note})` : '';
    const where = m.embedBaseUrl ? 'your endpoint' : 'your chat provider';
    const keyless = remote && remote.kind === kind && !remote.apiKey ? ' — no API key set, which is right for a local server' : '';
    return {
      kind,
      model,
      note: `${kind} embeddings via ${where}${keyless} · ${model}${cost}`,
      automatic,
    };
  };

  if (setting === 'local') {
    if (!local) {
      return {
        kind: null,
        model: m.embedModel || 'Xenova/all-MiniLM-L6-v2',
        note: 'asked for the local model, but the package is not installed',
        automatic: false,
        blocker: 'run: termcrab embeddings setup   (or set memory.embedProvider to openai|gemini to use your chat provider instead)',
      };
    }
    return chooseLocal(false);
  }
  if (setting === 'openai' || setting === 'gemini') return chooseRemote(setting, false);

  // auto
  if (local) return chooseLocal(true);
  if (remote) return chooseRemote(remote.kind, true);
  const why = cfg.provider?.type === 'mock' ? 'the offline demo provider has no embeddings' : 'no embedding endpoint is configured';
  return {
    kind: null,
    model: '',
    note: `lexical search only — ${why}`,
    automatic: true,
    blocker: 'one command turns on smart search: termcrab embeddings setup   (local, offline) — or point memory.embedProvider at openai|gemini to use your chat key',
  };
}

export interface ResolvedEmbedder {
  embedder: Embedder | null;
  plan: EmbedderPlan;
  /** Set when the plan was fine but loading failed (network, wrong package). */
  error?: string;
}

/**
 * Load the embedder the plan names. Never throws: a phone without the model or
 * without network must still answer searches, just lexically — with the reason
 * available for whoever asks.
 */
export async function resolveEmbedder(
  cfg: Config,
  cacheDir: string,
  opts: { fetchImpl?: FetchLike; loader?: (dir: string) => Promise<Embedder | null> } = {},
): Promise<ResolvedEmbedder> {
  const plan = embedderPlan(cfg);
  if (!plan.kind) return { embedder: null, plan };
  const m = memoryCfg(cfg);
  if (plan.kind === 'local') {
    const loader = opts.loader ?? tryLoadEmbedder;
    try {
      const e = await loader(cacheDir);
      if (!e) return { embedder: null, plan, error: 'the local embedding package is installed but did not load' };
      return { embedder: e, plan };
    } catch (err) {
      return { embedder: null, plan, error: err instanceof Error ? err.message : String(err) };
    }
  }
  // The same credentials the chat uses, resolved the same way (`resolveAuth`
  // reads the stored profile), so an OpenAI-compatible setup configures its
  // embeddings once and nowhere else. A separate memory.embedBaseUrl only
  // changes the URL, not the key.
  let chat = chatProviderAsRemote(cfg);
  if (chat && cfg.provider?.authProfile) {
    try {
      const resolved = resolveAuth(cfg.provider);
      chat = { ...chat, apiKey: resolved.apiKey || chat.apiKey, baseUrl: chat.baseUrl } as typeof chat;
      if (resolved.baseUrl && !m.embedBaseUrl) chat.baseUrl = resolved.baseUrl;
    } catch (err) {
      return { embedder: null, plan, error: err instanceof Error ? err.message : String(err) };
    }
  }
  const baseUrl = m.embedBaseUrl || (chat ? chat.baseUrl : '') || REMOTE_DEFAULTS[plan.kind].baseUrl;
  const apiKey = chat?.apiKey || cfg.provider?.apiKey || '';
  return {
    embedder: remoteEmbedder({ kind: plan.kind, baseUrl, apiKey, model: plan.model }, opts.fetchImpl ?? fetch),
    plan,
  };
}
