import crypto from 'node:crypto';
import fs from 'node:fs';
import { configPath, ensureLayout, home } from './paths.js';

export interface ProviderCfg {
  /**
   * 'openai' — any OpenAI-compatible Chat Completions endpoint (OpenAI,
   * OpenRouter, Groq, DeepSeek, xAI, Mistral, Ollama /v1, vLLM, llama.cpp …).
   * 'mock'   — the offline brain: no network, no key, deterministic replies.
   */
  type: 'openai' | 'mock' | 'anthropic' | 'gemini';
  /** Full base URL ending in /v1 (e.g. https://openrouter.ai/api/v1, http://127.0.0.1:11434/v1). Leave empty for OpenAI proper. */
  baseUrl?: string;
  apiKey?: string;
  /**
   * Name of a stored auth profile to take the key from (27.3). Keeping the
   * key out of config.json means the file you copy around has no secret in it.
   * `termcrab auth add <name> --provider <type> --key <key>`.
   */
  authProfile?: string;
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
  /**
   * Media generation (26.2): which model to ask for images and the default
   * size. The endpoint is the active provider's, so no second key is needed.
   */
  media?: {
    /** e.g. `gpt-image-1`, `dall-e-3`, `flux`. */
    imageModel?: string;
    /** e.g. `1024x1024`, `1536x1024`. */
    size?: string;
  };
  gateway: {
    host: string;
    port: number;
    /** Bearer token for HTTP/SSE API. Empty only allowed on loopback. */
    token: string;
    /**
     * Per-key token bucket for the HTTP surface and channel messages (20.3):
     * `perMinute` is the sustained rate, `burst` how many may arrive at once.
     * Omitted = 60/minute with a burst of 10.
     */
    rateLimit?: { perMinute: number; burst: number };
  };
  /**
   * `logs/termcrab.jsonl` (23.2/23.3): rotate at `maxMB` megabytes, keep
   * `files` rotated copies. Omitted = 2 MB / 3 files.
   */
  logs?: { maxMB?: number; files?: number };
  agent: {
    name: string;
    allowExec: boolean;
    maxIterations: number;
    timezone: string;
    /** Seconds a shell command may run before it is killed (default 30). */
    execTimeoutSec?: number;
    /** Extra regexes (on top of the built-in catastrophe list) that exec refuses. */
    execDenyPatterns?: string[];
    /** Escape hatch: run even a refused command. Off by default, on purpose. */
    execAllowDangerous?: boolean;
    /**
     * How shell commands are isolated (30.1):
     *   auto (default) — bubblewrap/proot when the device has one, otherwise
     *                    the command runs and the transcript says it did not;
     *   require        — never run outside a sandbox: refuse with the package
     *                    to install instead;
     *   off            — never sandbox (the pre-30 behaviour), recorded in the run.
     */
    sandbox?: 'auto' | 'require' | 'off';
    /** Keep the network reachable inside the sandbox (default false: no network). */
    sandboxNetwork?: boolean;
    /** Extra directories a sandboxed command may write to (the workspace is always one). */
    sandboxWrites?: string[];
    /** Compact session when entries exceed this threshold (default 60). */
    compactThreshold: number;
    /** Bytes of MEMORY.md injected into the system prompt (newest facts win). */
    memoryBudget: number;
    /**
     * When a session's working context starts over (21.3): `never` (default),
     * `daily`, or `idle:<minutes>`. The transcript is archived, never deleted.
     */
    sessionReset?: string;
    /**
     * Which context engine builds the prompt: `default` (everything) or
     * `compact` (half the memory budget, fewer verbatim tool results, no roster
     * or goals) for long chats on a small phone (19.3).
     */
    contextEngine?: 'default' | 'compact';
    /** How many tool results stay verbatim in the prompt (default 6). */
    keepToolResults?: number;
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
    /**
     * How many read-only tool calls from one model turn may run at once
     * (27.1). 1 turns batching off entirely; a mutating or approval-gated
     * tool is never batched whatever this says. Default 4.
     */
    parallelTools?: number;
    /**
     * The owner's rolling main session (28.1). On (the default), the panel,
     * the terminal and a Telegram DM with the owner share one session named
     * `main` (or `mainSession` below), and it rolls over on the first turn of
     * a new day — the old transcript is archived, not deleted. Groups, other
     * people, cron jobs and subagents keep their own keys. Off restores one
     * thread per surface.
     */
    rollingSession?: boolean;
    /** Name of that session. Default `main`. */
    mainSession?: string;
    /**
     * The longest one turn may run, in seconds (27.4). When it is reached the
     * turn stops with a plain sentence rather than hanging a phone's battery
     * away. Default 900 (15 minutes); 0 disables the cap.
     */
    turnBudgetSec?: number;
    /**
     * How long a turn may make no progress before it is stopped (27.4): the
     * clock resets on every model reply and every finished tool. Default 120;
     * 0 disables the watchdog.
     */
    idleSec?: number;
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
  /**
   * Hooks work in both directions: external services can POST to
   * /api/hooks/:id, and (24.2) a hook with `on` is also woken by the named
   * internal events — see src/gateway/triggers.ts for the list.
   */
  hooks: { id: string; token: string; prompt: string; on?: string[] }[];
  /**
   * Watched files/folders (24.2 / 26.x): a change under the path fires the
   * `file.changed` event, which any hook with `on: ['file.changed']` hears.
   * `path` may be absolute or `~/…`; `match` is a comma list of suffixes.
   */
  watchers?: { id: string; path: string; match?: string; debounceMs?: number }[];
  channels: {
    telegram?: {
      token: string;
      /** Empty allowlist = reject everyone (secure default). */
      allowedUserIds: number[];
      notifyChatId?: number;
      /** Groups: answer only when addressed (default) or to everything. */
      groupPolicy?: 'mention' | 'all';
      /**
       * What a session key is scoped to (28.3): `chat` (default) — one thread
       * per room, which is what a group wants; `user` — one thread per person,
       * so their DM and their mentions follow them between chats. The owner's
       * own messages go to the rolling main session either way.
       */
      scoping?: 'chat' | 'user';
      /** Largest file accepted from a chat, in MB (default 20). */
      maxFileMb?: number;
      /** Read the text out of a document that arrives (default true). */
      readDocuments?: boolean;
      /** Transcribe a voice note that arrives (default true; needs whisper.cpp). */
      transcribeVoice?: boolean;
      /** Describe a photo that arrives with a model that can see (default true). */
      describePhotos?: boolean;
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
    /** Hybrid embedding search (lexical search always works; this adds vectors). */
    embeddings: boolean;
    /**
     * Where the vectors come from (32.1).
     *   auto    — the local model if its package is installed, else the chat
     *             provider's embedding endpoint, else lexical search only.
     *   local   — the on-device model (offline, no key, no per-search cost).
     *   openai  — any OpenAI-compatible /embeddings endpoint (OpenAI, Ollama,
     *             llama.cpp, LM Studio, OpenRouter …).
     *   gemini  — Google's batchEmbedContents.
     */
    embedProvider?: 'auto' | 'local' | 'openai' | 'gemini';
    /** Model id to ask for; defaults to a small, cheap one per provider. */
    embedModel?: string;
    /** Endpoint to use instead of the chat provider's (e.g. http://127.0.0.1:8080/v1). */
    embedBaseUrl?: string;
  };
  /**
   * Disk budget (batch 10). When the state directory grows past maxMb, the
   * oldest trimmable files (old transcripts, logs, usage lines) are removed
   * instead of letting the phone fill up. `autoTrim: false` disables it.
   */
  storage: {
    maxMb: number;
    keepDays: number;
    autoTrim: boolean;
  };
  /**
   * Which skills the agent may use at all. Empty means "every skill the roots
   * contain" (the default); a non-empty list is an allow-list, so a skill that
   * arrives from a git repo or a migrated setup cannot reach the prompt until
   * it is named here (10.5).
   */
  skills: { allow: string[] };
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
    media: { imageModel: '', size: '1024x1024' },
    gateway: { host: '127.0.0.1', port: 7788, token: '' },
    agent: { name: 'Crabby', allowExec: true, maxIterations: 8, timezone: '', compactThreshold: 60, failover: true, queueMode: 'followup', allowBrowser: false, allowCodeExec: false, isolation: 'shared', memoryBudget: 3000, parallelTools: 4, turnBudgetSec: 900, idleSec: 120, rollingSession: true, mainSession: 'main' },
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
    memory: { embeddings: true, embedProvider: 'auto' },
    storage: { maxMb: 500, keepDays: 30, autoTrim: true },
    skills: { allow: [] },
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

/** What the last loadConfig() thought of the file on disk (see validateConfig). */
let lastConfigProblems: ConfigProblem[] = [];

export function loadConfig(): Config {
  ensureLayout();
  const p = configPath();
  if (!fs.existsSync(p)) {
    lastPersistedRaw = null;
    lastConfigProblems = [];
    return defaults();
  }
  let rawText: string;
  try {
    rawText = fs.readFileSync(p, 'utf8');
  } catch (err) {
    lastConfigProblems = [
      { path: '(file)', severity: 'error', message: `cannot read the config file: ${err instanceof Error ? err.message : String(err)}` },
    ];
    return defaults();
  }
  lastPersistedRaw = rawText;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    lastConfigProblems = [
      { path: '(file)', severity: 'error', message: `not valid JSON (${err instanceof Error ? err.message : String(err)}) — the file was ignored` },
    ];
    return defaults();
  }
  lastConfigProblems = validateConfig(parsed);
  try {
    const raw = parsed as Partial<Config>;
    const merged = deepMerge(defaults(), raw);
    // Wire formats we speak natively (27.2): openai-compatible, anthropic,
    // gemini and the offline mock. Anything else in an old config (ollama, a
    // typo) is treated as OpenAI-compatible, which is what such a config meant
    // when it was written.
    const loadedType = (merged.provider as { type?: string }).type;
    if (loadedType !== 'openai' && loadedType !== 'mock' && loadedType !== 'anthropic' && loadedType !== 'gemini') {
      merged.provider.type = 'openai';
    }
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
  } catch (err) {
    // Half-written or broken: never applied, and never silent (10.1). The
    // panel reads this via configProblems() and shows it beside the editor.
    lastConfigProblems = [
      {
        path: '(file)',
        severity: 'error',
        message: `not valid JSON (${err instanceof Error ? err.message : String(err)}) — the file was ignored`,
      },
    ];
    return null;
  }
  const fresh = loadConfig();
  // A file that parses but cannot work is refused as a whole, so a typo can
  // never reach a running agent. Warnings are reported and applied.
  if (lastConfigProblems.some((p) => p.severity === 'error')) return null;
  return fresh;
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


/**
 * Structural check of a config file's contents, used before anything is applied
 * (10.1). `error` means "do not apply this" — the running agent keeps its
 * previous settings; `warn` is reported to the panel but still applied, so a
 * newer key or a typo can never lock somebody out of their own agent.
 */
export interface ConfigProblem {
  /** Dotted path, e.g. gateway.port — the key to fix. */
  path: string;
  message: string;
  severity: 'error' | 'warn';
}

const KNOWN_TOP = new Set([
  'version',
  'logs',
  'provider',
  'providers',
  'gateway',
  'agent',
  'security',
  'fallbackProviders',
  'mcpServers',
  'hooks',
  'watchers',
  'media',
  'channels',
  'heartbeat',
  'localProvider',
  'dream',
  'memory',
  'skills',
  'dashboard',
  'update',
  'storage',
]);

/** Provider types we accept: today's two, plus the legacy names loadConfig coerces. */
const PROVIDER_TYPES = new Set(['openai', 'mock', 'anthropic', 'gemini']);

export function validateConfig(raw: unknown): ConfigProblem[] {
  const problems: ConfigProblem[] = [];
  const err = (path: string, message: string): void => void problems.push({ path, message, severity: 'error' });
  const warn = (path: string, message: string): void => void problems.push({ path, message, severity: 'warn' });
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    err('(root)', 'the config must be a JSON object');
    return problems;
  }
  const root = raw as Record<string, unknown>;

  for (const key of Object.keys(root)) {
    if (!KNOWN_TOP.has(key)) warn(key, `unknown key "${key}" — it is kept but nothing reads it`);
  }

  const objAt = (parent: Record<string, unknown>, key: string, known?: Set<string>): Record<string, unknown> | null => {
    const v = parent[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) {
      err(key, `must be a JSON object, got ${Array.isArray(v) ? 'array' : typeof v}`);
      return null;
    }
    const o = v as Record<string, unknown>;
    if (known) for (const k of Object.keys(o)) if (!known.has(k)) warn(`${key}.${k}`, `unknown key "${key}.${k}"`);
    return o;
  };
  const str = (o: Record<string, unknown>, prefix: string, key: string): void => {
    const v = o[key];
    if (v !== undefined && typeof v !== 'string') err(`${prefix}${key}`, `must be a string, got ${typeof v}`);
  };
  const bool = (o: Record<string, unknown>, prefix: string, key: string): void => {
    const v = o[key];
    if (v !== undefined && typeof v !== 'boolean') err(`${prefix}${key}`, `must be true or false, got ${typeof v}`);
  };
  const numIn = (o: Record<string, unknown>, prefix: string, key: string, lo: number, hi: number, integer = false): void => {
    const v = o[key];
    if (v === undefined) return;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi || (integer && !Number.isInteger(v))) {
      err(`${prefix}${key}`, `must be ${integer ? 'a whole number' : 'a number'} between ${lo} and ${hi}, got ${JSON.stringify(v)}`);
    }
  };
  const oneOf = (o: Record<string, unknown>, prefix: string, key: string, allowed: string[]): void => {
    const v = o[key];
    if (v === undefined) return;
    if (typeof v !== 'string' || !allowed.includes(v)) err(`${prefix}${key}`, `must be one of ${allowed.join(' | ')}, got ${JSON.stringify(v)}`);
  };
  const strArr = (o: Record<string, unknown>, prefix: string, key: string): void => {
    const v = o[key];
    if (v === undefined) return;
    if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) err(`${prefix}${key}`, 'must be an array of strings');
  };

  const logs = objAt(root, 'logs', new Set(['maxMB', 'files']));
  if (logs) {
    numIn(logs, 'logs.', 'maxMB', 1, 1000);
    numIn(logs, 'logs.', 'files', 1, 50, true);
  }

  const gateway = objAt(root, 'gateway', new Set(['host', 'port', 'token', 'rateLimit']));
  if (gateway) {
    str(gateway, 'gateway.', 'host');
    str(gateway, 'gateway.', 'token');
    numIn(gateway, 'gateway.', 'port', 1, 65535, true);
  }

  const provider = objAt(
    root,
    'provider',
    new Set([
      'type',
      'baseUrl',
      'apiKey',
      'model',
      'maxTokens',
      'temperature',
      'stream',
      'priceInPerM',
      'priceOutPerM',
    ]),
  );
  if (provider) {
    const t = provider.type;
    if (t !== undefined && (typeof t !== 'string' || !PROVIDER_TYPES.has(t))) {
      err('provider.type', `must be one of ${[...PROVIDER_TYPES].join(' | ')}, got ${JSON.stringify(t)}`);
    }
    str(provider, 'provider.', 'model');
    str(provider, 'provider.', 'apiKey');
    str(provider, 'provider.', 'authProfile');
    str(provider, 'provider.', 'baseUrl');
    const base = provider.baseUrl;
    if (typeof base === 'string' && base && !/^https?:\/\//.test(base)) {
      err('provider.baseUrl', `must start with http:// or https://, got ${JSON.stringify(base)}`);
    }
    bool(provider, 'provider.', 'stream');
    numIn(provider, 'provider.', 'maxTokens', 1, 1_000_000, true);
    numIn(provider, 'provider.', 'temperature', 0, 2);
    numIn(provider, 'provider.', 'priceInPerM', 0, 100_000);
    numIn(provider, 'provider.', 'priceOutPerM', 0, 100_000);
  }

  const agent = objAt(
    root,
    'agent',
    new Set([
      'name',
      'allowExec',
      'maxIterations',
      'timezone',
      'compactThreshold',
      'memoryBudget',
      'contextEngine',
      'keepToolResults',
      'sessionReset',
      'execTimeoutSec',
      'execDenyPatterns',
      'execAllowDangerous',
      'sandbox',
      'sandboxNetwork',
      'sandboxWrites',
      'failover',
      'queueMode',
      'allowBrowser',
      'allowCodeExec',
      'isolation',
      'parallelTools',
      'turnBudgetSec',
      'idleSec',
      'rollingSession',
      'mainSession',
    ]),
  );
  if (agent) {
    str(agent, 'agent.', 'name');
    str(agent, 'agent.', 'timezone');
    bool(agent, 'agent.', 'allowExec');
    bool(agent, 'agent.', 'failover');
    bool(agent, 'agent.', 'allowBrowser');
    bool(agent, 'agent.', 'allowCodeExec');
    numIn(agent, 'agent.', 'maxIterations', 1, 100, true);
    numIn(agent, 'agent.', 'compactThreshold', 5, 10_000, true);
    numIn(agent, 'agent.', 'memoryBudget', 0, 1_000_000, true);
    numIn(agent, 'agent.', 'parallelTools', 1, 8);
    numIn(agent, 'agent.', 'turnBudgetSec', 0, 86_400);
    numIn(agent, 'agent.', 'idleSec', 0, 3_600);
    bool(agent, 'agent.', 'rollingSession');
    str(agent, 'agent.', 'mainSession');
    numIn(agent, 'agent.', 'execTimeoutSec', 1, 3600);
    oneOf(agent, 'agent.', 'sandbox', ['auto', 'require', 'off']);
    bool(agent, 'agent.', 'sandboxNetwork');
    strArr(agent, 'agent.', 'sandboxWrites');
    bool(agent, 'agent.', 'execAllowDangerous');
    strArr(agent, 'agent.', 'execDenyPatterns');
    oneOf(agent, 'agent.', 'queueMode', ['followup', 'steer', 'collect', 'interrupt']);
    const reset = agent.sessionReset;
    if (reset !== undefined && reset !== 'never' && reset !== 'daily' && !(typeof reset === 'string' && /^idle:\d{1,5}$/.test(reset))) {
      err('agent.sessionReset', `must be never, daily or idle:<minutes>, got ${JSON.stringify(reset)}`);
    }
    oneOf(agent, 'agent.', 'isolation', ['shared', 'isolated']);
  }

  const memory = objAt(root, 'memory', new Set(['embeddings', 'embedProvider', 'embedModel', 'embedBaseUrl']));
  if (memory) {
    bool(memory, 'memory.', 'embeddings');
    oneOf(memory, 'memory.', 'embedProvider', ['auto', 'local', 'openai', 'gemini']);
    str(memory, 'memory.', 'embedModel');
    str(memory, 'memory.', 'embedBaseUrl');
    if (memory.embedBaseUrl !== undefined && !/^https?:\/\//.test(String(memory.embedBaseUrl))) {
      err('memory.embedBaseUrl', `must start with http:// or https://, got ${JSON.stringify(memory.embedBaseUrl)}`);
    }
  }

  const security = objAt(root, 'security', new Set(['approvals']));
  const approvals = security ? objAt(security, 'approvals', new Set(['enabled', 'tools', 'timeoutSec', 'onTimeout'])) : null;
  if (approvals) {
    bool(approvals, 'security.approvals.', 'enabled');
    strArr(approvals, 'security.approvals.', 'tools');
    numIn(approvals, 'security.approvals.', 'timeoutSec', 1, 86_400);
    oneOf(approvals, 'security.approvals.', 'onTimeout', ['deny', 'allow']);
  }

  const heartbeat = objAt(root, 'heartbeat', new Set(['enabled', 'minutes', 'pauseBelow']));
  if (heartbeat) {
    bool(heartbeat, 'heartbeat.', 'enabled');
    numIn(heartbeat, 'heartbeat.', 'minutes', 1, 10_080);
    numIn(heartbeat, 'heartbeat.', 'pauseBelow', 0, 100);
  }

  // Added by batch 10: the disk budget (see src/core/disk.ts). Optional — a
  // config written before this batch keeps working with the defaults.
  const storage = objAt(root, 'storage', new Set(['maxMb', 'keepDays', 'autoTrim']));
  if (storage) {
    numIn(storage, 'storage.', 'maxMb', 1, 10_000_000);
    numIn(storage, 'storage.', 'keepDays', 0, 3650);
    bool(storage, 'storage.', 'autoTrim');
  }

  const skills = objAt(root, 'skills', new Set(['allow']));
  if (skills) strArr(skills, 'skills.', 'allow');

  const mcp = root.mcpServers;
  if (mcp !== undefined) {
    if (!Array.isArray(mcp)) err('mcpServers', 'must be an array');
    else
      mcp.forEach((row, i) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          err(`mcpServers[${i}]`, 'must be an object with name + command');
          return;
        }
        const r = row as Record<string, unknown>;
        if (typeof r.name !== 'string' || !r.name) err(`mcpServers[${i}].name`, 'must be a non-empty string');
        if (typeof r.command !== 'string' || !r.command) err(`mcpServers[${i}].command`, 'must be a non-empty string');
        if (r.args !== undefined && (!Array.isArray(r.args) || r.args.some((a) => typeof a !== 'string'))) {
          err(`mcpServers[${i}].args`, 'must be an array of strings');
        }
      });
  }

  return problems;
}

/** What the last loadConfig() thought of the file: errors block, warnings inform. */
export function configProblems(): ConfigProblem[] {
  return lastConfigProblems.map((p) => ({ ...p }));
}

/** The first blocking problem, or null when the file may be applied. */
export function configBlockedBy(): ConfigProblem | null {
  return lastConfigProblems.find((p) => p.severity === 'error') ?? null;
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
