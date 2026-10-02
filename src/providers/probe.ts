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
import { stateDir, ensureLayout } from '../core/paths.js';
import { log } from '../core/logger.js';
import { OPENAI_COMPAT_BASES } from './index.js';
import { FetchLike } from './types.js';
import { ThinkingLevel, THINKING_LEVELS, ModelThinkingCapability } from './capabilities.js';

const CAPS_FILE = 'model-caps.json';
const PROBE_TIMEOUT_MS = 8000;
const PROBE_USER_MSG = 'ping'; // tiny, low-cost

interface ProbeResult {
  /** ISO time the probe was last run. */
  probedAt: string;
  /** Server accepted reasoning_effort for at least one level. */
  supportsThinking: boolean;
  /** Subset of levels the server accepted, ordered low→high. */
  supportedLevels: ThinkingLevel[];
  /** Highest level accepted (for default choice). */
  defaultLevel: ThinkingLevel;
  /** Optional: server's exact error string when rejecting (helpful for debugging). */
  rejectReason?: string;
}

type CapCache = Record<string, ProbeResult>;

function cachePath(): string {
  ensureLayout();
  return path.join(stateDir(), CAPS_FILE);
}

function loadCache(): CapCache {
  try {
    const raw = fs.readFileSync(cachePath(), 'utf8');
    const parsed = JSON.parse(raw) as CapCache;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(cache: CapCache): void {
  try {
    ensureLayout();
    fs.writeFileSync(cachePath(), JSON.stringify(cache, null, 2) + '\n');
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

/** Look up cached result (no network). */
export function getCachedCaps(baseUrl: string, model: string, apiKey = ''): ProbeResult | null {
  const cache = loadCache();
  return cache[modelCapsKey(baseUrl, model, apiKey)] ?? null;
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
}

/**
 * Probe one model: send minuscule requests with reasoning_effort set to each
 * candidate level and record which ones the server accepts. Returns the
 * capability record and writes it to the on-disk cache.
 *
 * A request is "accepted" when the server returns 200 OR a non-400 error (rate
 * limits, billing, etc.). A 400 whose body mentions reasoning/reasoning_effort/
 * unsupported parameter/unknown field counts as rejection; any other 400
 * (auth, billing, content policy) counts as "accepted" because we didn't get
 * told the parameter was bad.
 */
export async function probeModel(opts: ProbeOpts): Promise<ProbeResult> {
  const { baseUrl, apiKey = '', model, fetchImpl = fetch, force = false } = opts;
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

  try {
    // Run levels sequentially so a 401/403 on low short-circuits the rest.
    for (const level of levels) {
      if (ctrl.signal.aborted) break;
      let res: Response;
      try {
        res = await fetchImpl(joinUrl(baseUrl), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey || 'not-needed'}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: PROBE_USER_MSG }],
            max_tokens: 1,
            reasoning_effort: level,
          }),
          signal: ctrl.signal,
        });
      } catch (e) {
        // Network error — can't determine support. Skip further levels; leave
        // cached-as-unknown (return heuristic-based result).
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

      // Error response — check the body to see if it blamed reasoning_effort.
      let bodyText = '';
      try { bodyText = (await res.text()).slice(0, 500); } catch { /* ignore */ }

      // If the server explicitly says reasoning_effort is bad, this level
      // isn't supported. If any other level was already accepted, the server
      // is granular (rare). If NONE were accepted, we mark unsupported.
      const blamesParam =
        /reasoning_effort|reasoning effort|unsupported parameter|unknown field|unrecognized|invalid.*reasoning/i.test(bodyText);

      if (blamesParam) {
        rejectReason = bodyText.slice(0, 200);
        continue; // try the next (lower) level in case server supports only some
      }

      // Non-400-level error (401, 403, 404, 429, 5xx) OR 400 that doesn't
      // name reasoning_effort (billing, content policy, etc.) — treat as
      // "accepted the parameter" so we don't mis-label a model unsupported
      // because the user ran out of credits.
      if (res.status !== 400) {
        accepted.add(level);
        continue;
      }
      // Generic 400 with no mention of reasoning_effort: don't know; skip.
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
    rejectReason,
  };

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
