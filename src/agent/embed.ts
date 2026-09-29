import fs from 'node:fs';
import path from 'node:path';
import { log } from '../core/logger.js';

/**
 * Optional embedding search. Zero-dependency core: embeddings activate ONLY when
 * the user installs an on-device feature-extraction package:
 *   npm install @huggingface/transformers   (or @xenova/transformers)
 * Otherwise we stay with lexical search - no behavior change, no bloat.
 */

export interface Embedder {
  name: string;
  dim?: number;
  embed(texts: string[]): Promise<number[][]>;
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

type Pipeline = (texts: string[], opts: { normalize?: boolean; pooling?: string }) => Promise<{ data: ArrayLike<number>; dims: number[] } | ArrayLike<number>>;

async function importTransformers(): Promise<{
  pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<Pipeline>;
  env?: { allowLocalModels?: boolean; localModelPath?: string; cacheDir?: string };
} | null> {
  for (const pkg of ['@huggingface/transformers', '@xenova/transformers']) {
    try {
      const spec = pkg;
      return (await import(spec)) as {
        pipeline: (task: string, model: string, opts?: Record<string, unknown>) => Promise<Pipeline>;
        env?: { allowLocalModels?: boolean; localModelPath?: string; cacheDir?: string };
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function transformersInstalled(): Promise<boolean> {
  return (await importTransformers()) !== null;
}

/**
 * Lazy local embedding pipeline (all-MiniLM-L6-v2, quantized). Loads the model on
 * first use and caches it under the TermCrab home directory.
 */
export async function tryLoadEmbedder(cacheDir: string): Promise<Embedder | null> {
  const mod = await importTransformers();
  if (!mod) return null;
  // Offline/manual installs: look for <cacheDir>/Xenova/all-MiniLM-L6-v2/ on disk
  // FIRST (model folder dropped in by hand), then fall back to downloading from
  // the Hub into the same cache dir. Makes flaky-mobile-network installs possible.
  if (mod.env) {
    mod.env.allowLocalModels = true;
    mod.env.localModelPath = cacheDir;
    mod.env.cacheDir = cacheDir;
  }
  let pipe: Pipeline | null = null;
  const modelName = 'Xenova/all-MiniLM-L6-v2';

  const ensure = async (): Promise<Pipeline> => {
    if (!pipe) {
      fs.mkdirSync(cacheDir, { recursive: true });
      pipe = await mod.pipeline('feature-extraction', modelName, {
        cache_dir: cacheDir,
        // q8 (~23MB): phone-friendly download + RAM; retrieval quality is plenty
        // for cosine memory search. Falls back to whatever the Hub repo ships.
        dtype: 'q8',
      });
    }
    return pipe;
  };

  return {
    name: modelName,
    async embed(texts: string[]): Promise<number[][]> {
      const p = await ensure();
      const out: number[][] = [];
      for (const t of texts) {
        const result = await p([t], { normalize: true, pooling: 'mean' });
        const dims = (result as { dims?: number[] }).dims;
        const data = (result as { data: ArrayLike<number> }).data ?? (result as ArrayLike<number>);
        // transformers.js returns {data, dims:[1,384]} or a flat Tensor-like
        const arr = Array.from(data as ArrayLike<number>);
        void dims;
        out.push(arr);
      }
      return out;
    },
  };
}

interface IndexRow {
  id: string;
  text: string;
  vec: number[];
}

/** Append-only JSONL vector index with in-memory cache. */
export class EmbeddingIndex {
  private rows: IndexRow[] | null = null;

  constructor(
    private readonly file: string,
    private readonly embedder: Embedder | null,
  ) {}

  get available(): boolean {
    return this.embedder !== null;
  }

  private load(): IndexRow[] {
    if (this.rows) return this.rows;
    this.rows = [];
    try {
      if (fs.existsSync(this.file)) {
        for (const line of fs.readFileSync(this.file, 'utf8').split('\n')) {
          if (!line.trim()) continue;
          try {
            const row = JSON.parse(line) as IndexRow;
            if (row && Array.isArray(row.vec)) this.rows.push(row);
          } catch {
            /* skip corrupt */
          }
        }
      }
    } catch {
      /* ignore */
    }
    return this.rows;
  }

  private persist(): void {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const body = this.load()
        .map((r) => JSON.stringify(r))
        .join('\n');
      fs.writeFileSync(this.file, body ? `${body}\n` : '', 'utf8');
    } catch (err) {
      log.debug('embedding index persist failed:', err instanceof Error ? err.message : err);
    }
  }

  size(): number {
    return this.load().length;
  }

  async add(id: string, text: string): Promise<void> {
    if (!this.embedder || !text.trim()) return;
    try {
      const [vec] = await this.embedder.embed([text]);
      if (!vec || !vec.length) return;
      const rows = this.load();
      const existing = rows.findIndex((r) => r.id === id);
      const row: IndexRow = { id, text: text.slice(0, 2000), vec };
      if (existing >= 0) rows[existing] = row;
      else rows.push(row);
      this.persist();
    } catch (err) {
      log.debug('embedding add failed:', err instanceof Error ? err.message : err);
    }
  }

  async search(query: string, k = 5): Promise<{ id: string; text: string; score: number }[]> {
    if (!this.embedder || !this.load().length) return [];
    try {
      const [qv] = await this.embedder.embed([query]);
      if (!qv) return [];
      return this.load()
        .map((r) => ({ id: r.id, text: r.text, score: cosine(qv, r.vec) }))
        .filter((r) => r.score > 0.05)
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    } catch (err) {
      log.debug('embedding search failed:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  clear(): void {
    this.rows = [];
    this.persist();
  }
}
