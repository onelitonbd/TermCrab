import crypto from 'node:crypto';
import fs from 'node:fs';
import { configPath, ensureLayout, home } from './paths.js';

export interface ProviderCfg {
  /** anthropic | openai (also openai-compatible: openrouter, groq, deepseek, ollama) | mock */
  type: 'anthropic' | 'openai' | 'mock';
  /** For openai-type: full base ending in /v1 (e.g. https://openrouter.ai/api/v1, http://127.0.0.1:11434/v1). */
  baseUrl?: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  /** Stream tokens over SSE (default true). Set false to force request-per-reply. */
  stream?: boolean;
}

export interface ProviderKeyEntry {
  id: string;
  name: string;
  key: string;
  created: number;
}

/** A saved OpenAI-compatible endpoint (name + base url) with any number of keys. */
export interface ProviderEntry {
  id: string;
  name: string;
  baseUrl: string;
  keys: ProviderKeyEntry[];
  created: number;
}

export interface Config {
  version: number;
  provider: ProviderCfg;
  /** Saved providers (OpenAI-compatible). Managed from the Providers page. */
  providers: ProviderEntry[];
  gateway: {
    host: string;
    port: number;
    /** Bearer token for HTTP/SSE API. Empty only allowed on loopback. */
    token: string;
  };
  agent: {
    name: string;
    allowExec: boolean;
    maxIterations: number;
    timezone: string;
  };
  channels: {
    telegram?: {
      token: string;
      /** Empty allowlist = reject everyone (secure default). */
      allowedUserIds: number[];
      notifyChatId?: number;
    };
    whatsapp?: {
      enabled: boolean;
      /** WhatsApp JIDs or bare phone numbers. Empty = channel stays off. */
      allowedJids: string[];
      /** Auth state dir (default: <home>/state/wa-auth). */
      authDir?: string;
    };
    web: { enabled: boolean };
  };
  heartbeat: {
    enabled: boolean;
    minutes: number;
    /** Skip heartbeat when battery % is below this (mobile power budget). */
    pauseBelow: number;
  };
  /** Optional local model for lightweight tasks (dreaming, summarize) - OpenAI-compatible. */
  localProvider: {
    enabled: boolean;
    baseUrl: string;
    model: string;
    apiKey?: string;
  };
  /** "Dreaming": consolidate sessions/logs into long-term memory during idle windows. */
  dream: {
    enabled: boolean;
    everyHours: number;
  };
  memory: {
    /** Hybrid embedding search when @huggingface/transformers (or @xenova) is installed. */
    embeddings: boolean;
  };
  update: { checkOnStart: boolean };
}

export const DEFAULT_MODEL_HINTS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4o-mini',
  mock: 'mock-1',
};

export function defaults(): Config {
  return {
    version: 1,
    provider: { type: 'mock', model: DEFAULT_MODEL_HINTS.mock! },
    providers: [],
    gateway: { host: '127.0.0.1', port: 7788, token: '' },
    agent: { name: 'Crabby', allowExec: true, maxIterations: 8, timezone: '' },
    channels: { whatsapp: { enabled: false, allowedJids: [] }, web: { enabled: true } },
    heartbeat: { enabled: true, minutes: 60, pauseBelow: 20 },
    localProvider: {
      enabled: false,
      baseUrl: 'http://127.0.0.1:8080/v1',
      model: '',
      apiKey: '',
    },
    dream: { enabled: true, everyHours: 24 },
    memory: { embeddings: true },
    update: { checkOnStart: false },
  };
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return patch as T;
  if (typeof patch !== 'object') return patch as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    out[k] = k in out ? deepMerge((base as Record<string, unknown>)[k], v) : v;
  }
  return out as T;
}

export function loadConfig(): Config {
  ensureLayout();
  const p = configPath();
  if (!fs.existsSync(p)) return defaults();
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<Config>;
    const merged = deepMerge(defaults(), raw);
    // Never keep an invalid provider type.
    const t = merged.provider?.type;
    if (t !== 'anthropic' && t !== 'openai' && t !== 'mock') merged.provider.type = 'mock';
    return merged;
  } catch {
    return defaults();
  }
}

export function saveConfig(cfg: Config): void {
  ensureLayout();
  const p = configPath();
  fs.writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
}

export function generateToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/** Read a nested path like "gateway.port". */
export function cfgGet(cfg: Config, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, cfg);
}

/** Set a nested path with best-effort type coercion. Returns new config. */
export function cfgSet(cfg: Config, dotted: string, value: string): Config {
  const clone = JSON.parse(JSON.stringify(cfg)) as Config;
  const keys = dotted.split('.');
  const last = keys.pop();
  if (!last) return clone;
  let cursor: Record<string, unknown> = clone as unknown as Record<string, unknown>;
  for (const k of keys) {
    if (typeof cursor[k] !== 'object' || cursor[k] === null) cursor[k] = {};
    cursor = cursor[k] as Record<string, unknown>;
  }
  let v: unknown = value;
  if (value === 'true') v = true;
  else if (value === 'false') v = false;
  else if (value !== '' && !Number.isNaN(Number(value)) && /^-?\d+(\.\d+)?$/.test(value)) v = Number(value);
  else if (value.startsWith('[')) {
    try {
      v = JSON.parse(value);
    } catch {
      /* keep string */
    }
  }
  cursor[last] = v;
  return clone;
}

export function configExists(): boolean {
  return fs.existsSync(configPath());
}

export function describeConfigLocation(): string {
  return `${configPath()} (home: ${home()})`;
}
