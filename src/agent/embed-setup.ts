/**
 * Embedding-model setup for memory search: status, install, and the checks the
 * doctor reports (`termcrab embeddings ...`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { home, memoryDir, PACKAGE_ROOT } from '../core/paths.js';
import { loadConfig } from '../core/config.js';
import { log } from '../core/logger.js';
import { transformersInstalled, tryLoadEmbedder } from './embed.js';
import { embedderPlan, localPackagePresent, resolveEmbedder } from './embed-provider.js';
import { EMBED_PRICES } from './embed-remote.js';

/**
 * Plain-English setup for hybrid (semantic) memory search.
 * Core stays zero-dep: this feature only activates when the optional
 * `@huggingface/transformers` package is installed by the user.
 */

const PKG = '@huggingface/transformers';
const MODEL_DIR = () => path.join(home(), 'models', 'Xenova', 'all-MiniLM-L6-v2');

export interface EmbeddingsStatus {
  packageInstalled: boolean;
  enabled: boolean;
  indexVectors: number;
  modelCached: boolean;
  /** Which embedder is live: local | openai | gemini | '' (lexical only). */
  provider: string;
  model: string;
  /** Cost line for the chosen model, when the price is known. */
  costNote: string;
  /** A configuration that cannot work as asked, with the one-line fix. */
  blocker?: string;
  /** One sentence + next step, for humans. */
  summary: string;
}

export function embeddingsStatus(): EmbeddingsStatus {
  // Checked without importing (a status command must not load a model).
  const packageInstalled = localPackagePresent();
  const cfg = loadConfig();
  const enabled = cfg.memory?.embeddings !== false;
  const plan = embedderPlan(cfg);
  let indexVectors = 0;
  const idx = path.join(memoryDir(), 'index.jsonl');
  try {
    if (fs.existsSync(idx)) {
      indexVectors = fs.readFileSync(idx, 'utf8').split('\n').filter((l) => l.trim()).length;
    }
  } catch {
    /* unreadable index - report 0 */
  }
  const modelCached = fs.existsSync(MODEL_DIR());
  const price = EMBED_PRICES[plan.model];
  const costNote = price ? `$${price.usdPerM}/1M tokens (${price.note})` : '';
  let summary: string;
  if (!enabled) {
    summary = 'off (memory.embeddings=false) — lexical search only. Turn on: termcrab config set memory.embeddings true';
  } else if (plan.kind === 'local' && !modelCached) {
    summary = 'the local model is selected but not downloaded yet. Run: termcrab embeddings setup';
  } else if (plan.kind) {
    summary = `ready (${plan.kind}) — ${indexVectors} vector(s) indexed`;
  } else {
    summary = `${plan.note}${plan.blocker ? `. ${plan.blocker}` : ''}`;
  }
  return {
    packageInstalled,
    enabled,
    indexVectors,
    modelCached,
    provider: plan.kind ?? '',
    model: plan.kind ? plan.model : '',
    costNote,
    ...(plan.blocker ? { blocker: plan.blocker } : {}),
    summary,
  };
}

export interface EmbeddingsTestResult {
  ok: boolean;
  provider: string;
  model: string;
  dims: number;
  ms: number;
  chars: number;
  /** First few numbers, for a human eyeballing that it is really a vector. */
  preview: string;
  error?: string;
}

/**
 * Embed one string through whatever the config selects — the honest end-to-end
 * proof that smart search will work, without indexing anything.
 */
export async function embeddingsTest(
  text: string,
  opts: { fetchImpl?: (url: string, init?: RequestInit) => Promise<Response> } = {},
): Promise<EmbeddingsTestResult> {
  const cfg = loadConfig();
  const empty: EmbeddingsTestResult = { ok: false, provider: '', model: '', dims: 0, ms: 0, chars: text.length, preview: '' };
  if (cfg.memory?.embeddings === false) {
    return { ...empty, error: 'smart search is switched off (memory.embeddings=false). Turn it on: termcrab config set memory.embeddings true' };
  }
  const { embedder, plan, error } = await resolveEmbedder(cfg, path.join(home(), 'models'), opts.fetchImpl ? { fetchImpl: opts.fetchImpl } : {});
  if (!embedder) return { ...empty, provider: plan.kind ?? '', model: plan.model, error: error || plan.blocker || plan.note };
  const started = Date.now();
  try {
    const [vec] = await embedder.embed([text]);
    if (!vec || !vec.length) return { ...empty, provider: plan.kind ?? '', model: plan.model, error: 'the provider returned an empty vector' };
    return {
      ok: true,
      provider: plan.kind ?? '',
      model: plan.model,
      dims: vec.length,
      ms: Date.now() - started,
      chars: text.length,
      preview: vec.slice(0, 3).map((n) => n.toFixed(4)).join(', ') + (vec.length > 3 ? ', …' : ''),
    };
  } catch (err) {
    return { ...empty, provider: plan.kind ?? '', model: plan.model, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface EmbeddingsSetupResult {
  ok: boolean;
  steps: string[];
  error?: string;
}

function run(cmd: string, args: string[], cwd: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout?.on('data', (b: Buffer) => { out += b.toString(); });
    child.stderr?.on('data', (b: Buffer) => { out += b.toString(); });
    child.on('error', (err) => resolve({ code: 127, out: err.message }));
    child.on('close', (code) => resolve({ code: code ?? 1, out }));
  });
}

/**
 * Full setup: install the optional package (if missing) → download the model
 * into ~/models → verify with a 384-dim probe query. Injectable for tests.
 */
export async function embeddingsSetup(opts: {
  install?: () => Promise<boolean>;
  probe?: () => Promise<number | null>;
} = {}): Promise<EmbeddingsSetupResult> {
  const steps: string[] = [];

  const install =
    opts.install ??
    (async (): Promise<boolean> => {
      steps.push(`installing ${PKG} (one-time, ~10 MB)…`);
      const r = await run('npm', ['install', '--no-save', PKG], PACKAGE_ROOT);
      if (r.code !== 0) {
        log.debug('embeddings install failed:', r.out.slice(0, 400));
        return false;
      }
      return true;
    });

  const probe =
    opts.probe ??
    (async (): Promise<number | null> => {
      const embedder = await tryLoadEmbedder(path.join(home(), 'models'));
      if (!embedder) return null;
      const [vec] = await embedder.embed(['termcrab probe']);
      return vec ? vec.length : null;
    });

  const st = embeddingsStatus();
  if (!st.enabled) {
    return {
      ok: false,
      steps,
      error: 'smart search is switched off (memory.embeddings=false). Turn it on first: termcrab config set memory.embeddings true',
    };
  }

  if (!(await transformersInstalled())) {
    const okInstall = await install();
    if (!okInstall) {
      return {
        ok: false,
        steps,
        error: `could not install ${PKG} — check your connection, then run: npm install --no-save ${PKG} (inside the termcrab folder)`,
      };
    }
    steps.push(`installed ${PKG}`);
  } else {
    steps.push(`${PKG} already installed`);
  }

  steps.push('downloading the small search model (~23 MB, first time only)…');
  let dims: number | null = null;
  try {
    dims = await probe();
  } catch (err) {
    log.debug('embeddings probe error:', err instanceof Error ? err.message : String(err));
  }
  if (dims === null) {
    return {
      ok: false,
      steps,
      error:
        `model download failed (offline?) — you can drop it in by hand: put the Xenova/all-MiniLM-L6-v2 folder inside ` +
        `${path.join(home(), 'models')} and re-run "termcrab embeddings status".`,
    };
  }
  if (dims !== 384) {
    return {
      ok: false,
      steps,
      error: `unexpected model size (${dims} dimensions, expected 384) — the wrong model may be in ${path.join(home(), 'models')}`,
    };
  }
  steps.push('probe query OK (384 dimensions)');
  steps.push('done — restart the gateway to activate smart search');
  return { ok: true, steps };
}
