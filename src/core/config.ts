import crypto from 'node:crypto';
import fs from 'node:fs';
import { configPath, ensureLayout, home } from './paths.js';

export interface ProviderCfg {
  /**
   * 'openai' — any OpenAI-compatible Chat Completions endpoint (OpenAI,
   * OpenRouter, Groq, DeepSeek, xAI, Mistral, Ollama /v1, vLLM, llama.cpp …).
   * 'mock'   — the offline brain: no network, no key, deterministic replies.
   */
  type: 'openai' | 'mock';
  /** Full base URL ending in /v1 (e.g. https://openrouter.ai/api/v1, http://127.0.0.1:11434/v1). Leave empty for OpenAI proper. */
  baseUrl?: string;
  apiKey?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  /** Stream tokens over SSE (default true). Set false to force request-per-reply. */
  stream?: boolean;
  /**
   * Your provider's prices, per 1,000,000 tokens. Set these to make the cost
   * column exact; when unset, a dated snapshot is used (and labelled), and a
   * model nobody priced shows tokens with no cost at all.
   */
  priceInPerM?: number;
  priceOutPerM?: number;
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
  /** Model ids the user ticked on the Models page (saved on this device). */
  models?: string[];
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
    /** Compact session when entries exceed this threshold (default 60). */
    compactThreshold: number;
    /** Bytes of MEMORY.md injected into the system prompt (newest facts win). */
    memoryBudget: number;
    /** Enable model failover chain (default true). */
    failover: boolean;
    /** Queue mode: followup (default) | steer | collect | interrupt. */
    queueMode: 'followup' | 'steer' | 'collect' | 'interrupt';
    /** Allow browser automation tool (Playwright/CDP, read-only). */
    allowBrowser: boolean;
    /** Allow sandboxed code execution (QuickJS). */
    allowCodeExec: boolean;
    /** Multi-agent isolation: shared (default) | isolated (separate memory/skills per agent). */
    isolation: 'shared' | 'isolated';
  };
  /**
   * Human-in-the-loop safety. `approvals` gates the named tools in the agent
   * loop: a gated call stops before it executes and waits for a person to
   * approve or deny it (panel card, SSE, or `termcrab approvals`).
   * Off by default so nothing changes for existing installs.
   */
  security: {
    approvals: {
      enabled: boolean;
      /** Tool names that must be approved before they run. */
      tools: string[];
      /** Seconds to wait for a decision before `onTimeout` applies. */
      timeoutSec: number;
      /** What happens when nobody answers: deny (safe default) or allow. */
      onTimeout: 'deny' | 'allow';
    };
  };
  /** Fallback providers for failover chain (tried in order when primary fails). */
  fallbackProviders: ProviderCfg[];
  /** MCP servers (stdio JSON-RPC). Tools are exposed as mcp_<server>_<tool>. */
  mcpServers: { name: string; command: string; args?: string[]; env?: Record<string, string> }[];
  /** Inbound webhooks: external services can POST to /api/hooks/:id to trigger agent runs. */
  hooks: { id: string; token: string; prompt: string }[];
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
    discord?: {
      enabled: boolean;
      token: string;
      allowedGuilds: string[];
      allowedUsers: string[];
    };
    slack?: {
      enabled: boolean;
      botToken: string;
      appToken: string;
      allowedChannels: string[];
      allowedUsers: string[];
    };
    signal?: {
      enabled: boolean;
      phoneNumber: string;
      allowedNumbers: string[];
    };
    sms?: {
      enabled: boolean;
      accountSid: string;
      authToken: string;
      fromNumber: string;
      allowedNumbers: string[];
    };
    matrix?: {
      enabled: boolean;
      homeserver: string;
      accessToken: string;
      userId: string;
      allowedRooms: string[];
    };
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
  /** Homepage widget visibility, managed by the dashboard tool. */
  dashboard?: { widgets: Record<string, boolean> };
  update: { checkOnStart: boolean };
}

export const DEFAULT_MODEL_HINTS: Record<string, string> = {
  openai: 'gpt-4o-mini',
};

export function defaults(): Config {
  return {
    version: 1,
    provider: { type: 'openai', model: '', baseUrl: '', apiKey: '' },
    providers: [],
    gateway: { host: '127.0.0.1', port: 7788, token: '' },
    agent: { name: 'Crabby', allowExec: true, maxIterations: 8, timezone: '', compactThreshold: 60, failover: true, queueMode: 'followup', allowBrowser: false, allowCodeExec: false, isolation: 'shared', memoryBudget: 3000 },
    fallbackProviders: [],
    mcpServers: [],
    hooks: [],
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
    security: {
      approvals: {
        enabled: false,
        tools: ['exec', 'write_file', 'kill_process'],
        timeoutSec: 120,
        onTimeout: 'deny',
      },
    },
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

/** Raw file contents this process last read or wrote (detects outside edits). */
let lastPersistedRaw: string | null = null;

export function loadConfig(): Config {
  ensureLayout();
  const p = configPath();
  if (!fs.existsSync(p)) {
    lastPersistedRaw = null;
    return defaults();
  }
  let rawText: string;
  try {
    rawText = fs.readFileSync(p, 'utf8');
  } catch {
    return defaults();
  }
  lastPersistedRaw = rawText;
  try {
    const raw = JSON.parse(rawText) as Partial<Config>;
    const merged = deepMerge(defaults(), raw);
    // Coerce legacy provider types (anthropic / gemini / ollama) to the single
    // supported wire format: OpenAI-compatible. Older configs with apiKey+baseUrl
    // keep working. 'mock' is a real type again (offline demo, CI smoke test),
    // so it is left alone.
    const loadedType = (merged.provider as { type?: string }).type;
    if (loadedType !== 'openai' && loadedType !== 'mock') merged.provider.type = 'openai';
    return merged;
  } catch {
    return defaults();
  }
}

export function saveConfig(cfg: Config): void {
  ensureLayout();
  const p = configPath();
  const raw = `${JSON.stringify(cfg, null, 2)}\n`;
  fs.writeFileSync(p, raw, 'utf8');
  lastPersistedRaw = raw;
}

/**
 * Load the config file only if it changed OUTSIDE this process (another
 * terminal's `termcrab config set`, an editor, the CLI). Returns null when the
 * file still matches what this process last read or wrote — so a long-running
 * gateway ignores its own saves but picks up external ones. A half-written
 * file (JSON not parseable yet) also returns null; the next change event
 * retries it.
 */
export function readExternalConfigChange(): Config | null {
  let rawText: string;
  try {
    rawText = fs.readFileSync(configPath(), 'utf8');
  } catch {
    return null;
  }
  if (lastPersistedRaw !== null && rawText === lastPersistedRaw) return null;
  try {
    JSON.parse(rawText);
  } catch {
    return null;
  }
  return loadConfig();
}

/** Read just the panel password from the config file. Never changes any state. */
export function readConfigFileToken(): string | null {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), 'utf8')) as Partial<Config>;
    const t = raw.gateway?.token;
    return typeof t === 'string' && t ? t : null;
  } catch {
    return null;
  }
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
