/**
 * Model capability probe.
 *
 * Heuristic reasoning-model detection by name (src/providers/capabilities.ts) is
 * a best-effort guess. Different OpenAI-compatible servers accept different
 * subsets of reasoning options, and new models ship weekly. The authoritative way
 * to learn what a model actually supports is to *ask it*: send a tiny request
 * with `reasoning_effort` set and see whether the server accepts it or returns
 * 400 with "Unsupported parameter".
 *
 * We send the smallest possible request (max_tokens: 1, single token user message)
 * at each effort level, record whether it was accepted, and cache the answer
 * under ~/.termcrab/state/model-caps.json keyed by (baseUrl, model, apiKey-fingerprint).
 *
 * Costs: one request per level per model, almost all of which return in under a
 * second with 1-3 tokens billed. OpenAI and most proxies also short-circuit the
 * error path before billing, so failed probes are effectively free.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { stateDir, ensureLayout, home } from '../core/paths.js';
import { log } from '../core/logger.js';
import { OPENAI_COMPAT_BASES, providerNameFor } from './index.js';
import { FetchLike } from './types.js';
import {
  getModelCapabilities,
  usesMaxCompletionTokens,
  thinkingLevelToTokens,
  ThinkingLevel,
  THINKING_LEVELS,
  ModelThinkingCapability,
} from './capabilities.js';

const CAPS_FILE = 'model-caps.json';
const PROBE_TIMEOUT_MS = 8000;
const PROBE_USER_MSG = 'ping'; // tiny, low-cost
/** Verified answers older than this are re-probed rather than trusted. */
const PROBE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Error bodies that mean "this reasoning parameter is wrong for this model". */
const BLAMES_REASONING =
  /reasoning_effort|reasoning effort|unsupported parameter|unknown field|unrecognized|invalid.*reasoning|cannot specify both/i;

/**
 * How a server wants the thinking budget expressed.
 *
 * Servers disagree on this, and getting it wrong is a hard 400:
 *  - 'effort'  — `reasoning_effort: 'low'|'medium'|'high'` (OpenAI, Kilo, most
 *               OpenRouter-style gateways)
 *  - 'budget'  — `reasoning: { max_tokens: N }` (DeepSeek, vLLM, llama.cpp)
 *
 * Some (Kilo among them) accept either one alone but 400 when both are sent
 * ("Cannot specify both 'effort' and 'max_tokens' in reasoning parameter"), so
 * this is a choice, not a combination.
 */
export type ReasoningMechanism = 'effort' | 'budget';

interface ProbeResult {
  /** ISO time the probe was last run. */
  probedAt: string;
  /** Server accepted a reasoning control for at least one level. */
  supportsThinking: boolean;
  /** Subset of levels the server accepted, ordered low→high. */
  supportedLevels: ThinkingLevel[];
  /** Highest level accepted (for default choice). */
  defaultLevel: ThinkingLevel;
  /** Which request shape the server accepted. */
  mechanism?: ReasoningMechanism;
  /** Optional: server's exact error string when rejecting (helpful for debugging). */
  rejectReason?: string;
  /** True when this is the offline mock brain: nothing was sent anywhere. */
  offline?: boolean;
}

type CapCache = Record<string, ProbeResult>;

let capsPathCache: { home: string; file: string } | null = null;

function cachePath(): string {
  const h = home();
  // Keyed on home so a TCRAB_HOME change (tests, `termcrab --home`) still works.
  if (capsPathCache && capsPathCache.home === h) return capsPathCache.file;
  ensureLayout();
  capsPathCache = { home: h, file: path.join(stateDir(), CAPS_FILE) };
  return capsPathCache.file;
}

/**
 * In-memory mirror of the cache file, keyed on mtime. getCachedCaps() runs on
 * every single chat request (openai.ts applyThinking) and on every /api/config
 * poll, so re-reading + re-parsing the JSON each time is pure overhead.
 */
let memCache: { home: string; mtimeMs: number; data: CapCache } | null = null;

function loadCache(): CapCache {
  try {
    const file = cachePath();
    const { mtimeMs } = fs.statSync(file);
    if (memCache && memCache.home === home() && memCache.mtimeMs === mtimeMs) return memCache.data;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as CapCache;
    const data = parsed && typeof parsed === 'object' ? parsed : {};
    memCache = { home: home(), mtimeMs, data };
    return data;
  } catch {
    return {};
  }
}

function saveCache(cache: CapCache): void {
  try {
    ensureLayout();
    const file = cachePath();
    // Write-then-rename: a concurrent reader sees either the whole old file or
    // the whole new one. A plain writeFileSync can be observed half-written,
    // which fails JSON.parse and silently drops every cached capability.
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2) + '\n');
    fs.renameSync(tmp, file);
    memCache = { home: home(), mtimeMs: fs.statSync(file).mtimeMs, data: cache };
  } catch (e) {
    log.warn('model caps: failed to save cache:', e instanceof Error ? e.message : String(e));
  }
}

/** Build a stable cache key for a provider config. */
export function modelCapsKey(baseUrl: string, model: string, apiKey = ''): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '') || OPENAI_COMPAT_BASES.openai;
  const fp = apiKey
    ? crypto.createHash('sha1').update(apiKey).digest('hex').slice(0, 8)
    : 'no-key';
  return `${normalizedBase}|${model}|${fp}`;
}

function isExpired(entry: ProbeResult | undefined | null): boolean {
  if (!entry) return true;
  const at = Date.parse(entry.probedAt || '');
  if (Number.isNaN(at)) return true; // heuristic-shaped entry, never authoritative
  return Date.now() - at > PROBE_TTL_MS;
}

/** Look up cached result (no network). Stale entries are treated as absent. */
export function getCachedCaps(baseUrl: string, model: string, apiKey = ''): ProbeResult | null {
  const cache = loadCache();
  const hit = cache[modelCapsKey(baseUrl, model, apiKey)];
  if (!hit || isExpired(hit)) return null;
  return hit;
}

function joinUrl(base: string): string {
  const b = base.replace(/\/+$/, '');
  if (b.endsWith('/chat/completions')) return b;
  if (b.endsWith('/v1')) return `${b}/chat/completions`;
  return `${b}/v1/chat/completions`;
}

interface ProbeOpts {
  baseUrl: string;
  apiKey?: string;
  model: string;
  fetchImpl?: FetchLike;
  /** Force re-probe even if a fresh cache entry exists. */
  force?: boolean;
  /** Which levels to test (default: low/medium/high — 'xhigh' and 'max' are
   *  not valid OpenAI effort values; they map to 'high' so probing high covers
   *  them. The UI will show xhigh/max as aliases of high when supported. */
  levels?: readonly ThinkingLevel[];
  signal?: AbortSignal;
  /**
   * The offline brain: there is nothing to probe, and a phone with no key must
   * not send a packet to find that out. Returns a local result instead.
   */
  offline?: boolean;
}

/**
 * Probe one model: send minuscule requests with reasoning_effort set to each
 * candidate level and record which ones the server accepts. Returns the
 * capability record and writes it to the on-disk cache.
 *
 * A request is "accepted" when the server returns 200 OR a non-400 error that
 * still reached parameter validation (rate limits, billing). A 400 whose body
 * mentions reasoning/reasoning_effort/unsupported parameter/unknown field counts
 * as rejection.
 *
 * 401/403/404 are NOT accepted: the request never got as far as validating
 * parameters, so they say nothing about reasoning support. Recording them as
 * "accepted" would mark a plain model like gpt-4o as reasoning-capable, and
 * applyThinking() trusts this cache above the heuristic — the next real turn
 * would then send reasoning_effort to a model that 400s on it. When a probe
 * hits those we return the heuristic result and cache nothing.
 */
export async function probeModel(opts: ProbeOpts): Promise<ProbeResult> {
  const { baseUrl, apiKey = '', model, fetchImpl = fetch, force = false } = opts;
  if (opts.offline) {
    return {
      probedAt: new Date().toISOString(),
      supportsThinking: false,
      supportedLevels: [],
      defaultLevel: 'none',
      offline: true,
    };
  }
  const key = modelCapsKey(baseUrl, model, apiKey);
  if (!force) {
    const cached = getCachedCaps(baseUrl, model, apiKey);
    if (cached) return cached;
  }

  // We only send low/medium/high because those are the values the OpenAI spec
  // defines for reasoning_effort. xhigh/max collapse to high in our mapping.
  const levels = (opts.levels ?? (['low', 'medium', 'high'] as const)).filter(
    (l): l is Exclude<ThinkingLevel, 'none' | 'xhigh' | 'max'> => l === 'low' || l === 'medium' || l === 'high',
  );

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  if (opts.signal) opts.signal.addEventListener('abort', () => ctrl.abort(), { once: true });

  const accepted = new Set<Exclude<ThinkingLevel, 'none' | 'xhigh' | 'max'>>();
  let rejectReason: string | undefined;
  let inconclusive = false;
  let mechanism: ReasoningMechanism | undefined;

  /** One probe request with the given mechanism's request shape. */
  const probeOnce = (level: ThinkingLevel, via: ReasoningMechanism, signal: AbortSignal) =>
    fetchImpl(joinUrl(baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey || 'not-needed'}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: PROBE_USER_MSG }],
        // Reasoning models hard-reject `max_tokens`, and the resulting
        // "Unsupported parameter" body would be misread as "this level
        // doesn't work" — a false negative for every o3/o4/gpt-5 probe.
        [usesMaxCompletionTokens(model) ? 'max_completion_tokens' : 'max_tokens']: 1,
        // Exactly one reasoning control per request: servers like Kilo answer
        // "Cannot specify both 'effort' and 'max_tokens'" if we send both.
        ...(via === 'effort'
          ? { reasoning_effort: level }
          : { reasoning: { max_tokens: thinkingLevelToTokens(level) ?? 1024 } }),
      }),
      signal,
    });

  try {
    // Run levels sequentially so a 401/403 on low short-circuits the rest.
    for (const level of levels) {
      if (ctrl.signal.aborted) {
        inconclusive = true; // timed out / caller cancelled before an answer
        break;
      }
      let res: Response | undefined;
      let bodyText = '';
      try {
        // Try the shapes we haven't ruled out yet, in preference order.
        const candidates: ReasoningMechanism[] = mechanism ? [mechanism] : ['effort', 'budget'];
        for (const via of candidates) {
          const attempt = await probeOnce(level, via, ctrl.signal).catch((e: unknown) => {
            inconclusive = true;
            log.info(`probe ${model}@${baseUrl} network error:`, e instanceof Error ? e.message : String(e));
            return undefined;
          });
          if (!attempt) break; // network failure — stop entirely
          res = attempt;

          if (attempt.ok) {
            mechanism = via;
            break;
          }

          // Drain/read the body once; it can't be read again.
          bodyText = (await attempt.text().catch(() => '')).slice(0, 500);
          const blames = BLAMES_REASONING.test(bodyText);
          if (!blames) {
            // Not about the reasoning param — keep this shape and let the
            // status-code classification below decide what it means.
            mechanism = via;
            break;
          }
          // This shape is rejected; try the next candidate for this level.
          if (via === 'effort') rejectReason = bodyText.slice(0, 200);
        }
        if (!res) break;
      } catch (e) {
        // Network error — the server never answered, so we know nothing. Skip
        // the remaining levels and do not cache a guess (see the 401 branch).
        inconclusive = true;
        log.info(`probe ${model}@${baseUrl} network error:`, e instanceof Error ? e.message : String(e));
        break;
      }

      if (res.ok) {
        accepted.add(level);
        // Drain the body and wait for it so the underlying TCP connection is
        // cleanly reusable for the next probe (otherwise some servers close
        // the socket mid-response and the next fetch fails ECONNRESET).
        try { await res.arrayBuffer(); } catch { /* ignore */ }
        continue;
      }

      // If the server explicitly says reasoning_effort is bad, this level
      // isn't supported. If any other level was already accepted, the server
      // is granular (rare). If NONE were accepted, we mark unsupported.
      if (BLAMES_REASONING.test(bodyText)) {
        rejectReason = bodyText.slice(0, 200);
        continue; // try the next (lower) level in case server supports only some
      }

      if (res.status === 401 || res.status === 403 || res.status === 404) {
        // The request failed before parameter validation. We learned nothing,
        // and caching a guess here is what makes plain models start 400ing.
        inconclusive = true;
        log.warn(
          `probe ${model}@${baseUrl} HTTP ${res.status} — capability unknown, ` +
            `not caching (check the api key / model name)`,
        );
        break;
      }
      // 429 / 5xx, i.e. an error raised after the parameter was accepted —
      // treat as "accepted" so a rate limit doesn't mislabel the model.
      if (res.status !== 400) {
        accepted.add(level);
        continue;
      }
      // Generic 400 with no mention of reasoning_effort: don't know; skip.
      inconclusive = true;
      break;
    }
  } finally {
    clearTimeout(timer);
  }

  // Build the supported-levels list. 'none' is always supported (no effort
  // sent), and we add whatever effort levels the server accepted.
  const supported: ThinkingLevel[] = ['none'];
  if (accepted.has('low')) supported.push('low');
  if (accepted.has('medium')) supported.push('medium');
  if (accepted.has('high')) {
    // OpenAI only has three levels; xhigh/max are UI buckets that map to high.
    supported.push('high', 'xhigh', 'max');
  }

  const supportsThinking = accepted.size > 0;
  const defaultLevel: ThinkingLevel = supportsThinking
    ? (supported.includes('medium') ? 'medium' : supported[supported.length - 1]! ?? 'low')
    : 'none';

  const result: ProbeResult = {
    probedAt: new Date().toISOString(),
    supportsThinking,
    supportedLevels: supported,
    defaultLevel,
    mechanism,
    rejectReason,
  };

  // Nothing conclusive was learned (401/403/404, network error, timeout). Do
  // not persist it: a wrong "supports thinking" record outranks the heuristic
  // in applyThinking() and would start sending reasoning_effort to plain
  // models. Hand back the heuristic instead and let a later probe retry.
  if (inconclusive) {
    const heuristic = getModelCapabilities(model, providerNameFor(baseUrl));
    return {
      probedAt: result.probedAt,
      supportsThinking: heuristic.supportsThinking,
      supportedLevels: heuristic.supportedLevels,
      defaultLevel: heuristic.defaultLevel,
    };
  }

  const cache = loadCache();
  cache[key] = result;
  saveCache(cache);

  log.info(
    `probe ${model} → supportsThinking=${supportsThinking} levels=[${supported.join(',')}]` +
      (rejectReason ? ` rejection="${rejectReason.slice(0, 80)}"` : ''),
  );
  return result;
}

/**
 * Get capabilities: prefer a probed/verified result, fall back to heuristic
 * detection by model name. Never blocks on network — use probeModel() if you
 * want to re-probe.
 */
export function getModelCaps(
  baseUrl: string,
  model: string,
  apiKey = '',
  heuristic: ModelThinkingCapability,
): ProbeResult {
  const cached = getCachedCaps(baseUrl, model, apiKey);
  if (cached) return cached;
  // Translate the heuristic shape into a ProbeResult so callers get one shape.
  return {
    probedAt: '',
    supportsThinking: heuristic.supportsThinking,
    supportedLevels: heuristic.supportedLevels,
    defaultLevel: heuristic.defaultLevel,
  };
}

/** Probe a list of models in parallel, returning a map of model → result. */
export async function probeModels(
  targets: { baseUrl: string; model: string; apiKey?: string }[],
  opts?: { fetchImpl?: FetchLike; force?: boolean; signal?: AbortSignal; concurrency?: number },
): Promise<Record<string, ProbeResult>> {
  const concurrency = opts?.concurrency ?? 3;
  const out: Record<string, ProbeResult> = {};
  const queue = [...targets];
  const workers: Promise<void>[] = [];
  for (let w = 0; w < concurrency; w++) {
    workers.push((async () => {
      while (queue.length) {
        const t = queue.shift();
        if (!t) return;
        try {
          const r = await probeModel({ ...t, fetchImpl: opts?.fetchImpl, force: opts?.force, signal: opts?.signal });
          out[modelCapsKey(t.baseUrl, t.model, t.apiKey)] = r;
        } catch (e) {
          log.warn(`probe ${t.model} failed:`, e instanceof Error ? e.message : String(e));
        }
      }
    })());
  }
  await Promise.all(workers);
  return out;
}

export function isThinkingLevel(value: unknown): value is ThinkingLevel {
  return typeof value === 'string' && (THINKING_LEVELS as readonly string[]).includes(value);
}

export { CAPS_FILE };
