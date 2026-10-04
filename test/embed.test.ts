import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cosine,
  DimensionMismatch,
  EmbeddingIndex,
  embedderParts,
  Embedder,
  transformersInstalled,
  tryLoadEmbedder,
} from '../src/agent/embed.js';

/** Deterministic bag-of-letters embedder (no model download needed). */
function vec(text: string): number[] {
  const v = new Array<number>(26).fill(0);
  for (const ch of text.toLowerCase()) {
    const c = ch.charCodeAt(0) - 97;
    if (c >= 0 && c < 26) v[c] = (v[c] ?? 0) + 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return norm ? v.map((x) => x / norm) : v;
}

const fakeEmbedder: Embedder = {
  name: 'fake-bag-of-letters',
  embed: async (texts: string[]) => texts.map(vec),
};

function tmpIndex(): { index: EmbeddingIndex; file: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temb-'));
  const file = path.join(dir, 'index.jsonl');
  return { index: new EmbeddingIndex(file, fakeEmbedder), file };
}

test('cosine: identical=1, orthogonal=0, empty=0', () => {
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9);
  assert.ok(Math.abs(cosine([1, 0], [0, 1])) < 1e-9);
  assert.equal(cosine([], []), 0);
});

test('35.4 two different sizes are a refusal, not a 0 that reads as "unrelated"', () => {
  // A 384-dimension MiniLM vector against a 1536-dimension provider vector used
  // to score 0.0 — indistinguishable from "these two texts have nothing in
  // common". It now refuses with the sentence and the fix.
  assert.throws(
    () => cosine([1, 2], [1]),
    (err: unknown) => {
      assert.ok(err instanceof DimensionMismatch);
      assert.match(err.message, /different sizes \(2 vs 1\)/);
      assert.match(err.message, /re-embedded/);
      assert.match(err.message, /termcrab embeddings setup/);
      return true;
    },
  );
  // Same size still works, whatever the size is.
  assert.ok(Math.abs(cosine([0, 1], [0, 1]) - 1) < 1e-9);
});

test('35.4 every row records what made it, and a model change is visible', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temb-'));
  const file = path.join(dir, 'index.jsonl');

  const old = {
    name: 'openai:text-embedding-3-small',
    provider: 'openai',
    model: 'text-embedding-3-small',
    dim: 4,
    embed: async (texts: string[]) => texts.map(() => [1, 0, 0, 0]),
  } as Embedder;
  const idx = new EmbeddingIndex(file, old);
  await idx.add('a', 'written by the old model');
  const row = JSON.parse(fs.readFileSync(file, 'utf8').trim()) as { provider?: string; model?: string };
  assert.equal(row.provider, 'openai', 'the provider is on the row');
  assert.equal(row.model, 'text-embedding-3-small', 'and the model');

  // The same index, opened by a different model: nothing is deleted, but the
  // user is told instead of quietly getting worse answers.
  const next = {
    name: 'gemini:gemini-embedding-001',
    provider: 'gemini',
    model: 'gemini-embedding-001',
    dim: 4,
    embed: async (texts: string[]) => texts.map(() => [0, 1, 0, 0]),
  } as Embedder;
  const reloaded = new EmbeddingIndex(file, next);
  const info = reloaded.info();
  assert.equal(info.vectors, 1);
  assert.equal(info.stale, 1, 'one row is stale for this model');
  assert.deepEqual(info.builtBy, ['openai:text-embedding-3-small']);
  assert.equal(info.current, 'gemini:gemini-embedding-001');
  assert.match(String(info.note), /another model/);
  assert.match(String(info.note), /termcrab embeddings setup/);
  assert.deepEqual(await reloaded.search('anything'), [], 'a vector at right angles is simply not a hit');

  // Same provider, same model: nothing is stale.
  const same = new EmbeddingIndex(file, old);
  assert.equal(same.info().stale, 0);
  assert.equal(same.info().note, null);
});

test('35.4 a mixed-size index skips the rows it cannot compare, and says how many', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temb-'));
  const file = path.join(dir, 'index.jsonl');
  fs.writeFileSync(
    file,
    [
      JSON.stringify({ id: 'old', text: 'made by a 3 dimension model', vec: [1, 0, 0], provider: 'openai', model: 'small' }),
      JSON.stringify({ id: 'new', text: 'made by a 4 dimension model', vec: [1, 0, 0, 0], provider: 'openai', model: 'big' }),
      '',
    ].join('\n'),
  );
  const embedder = {
    name: 'openai:big',
    provider: 'openai',
    model: 'big',
    dim: 4,
    embed: async (texts: string[]) => texts.map(() => [1, 0, 0, 0]),
  } as Embedder;
  const index = new EmbeddingIndex(file, embedder);
  const hits = await index.search('made by', 5);
  assert.deepEqual(
    hits.map((h) => h.id),
    ['new'],
    'the 3-dimension row is skipped, not scored 0 and returned as a miss',
  );
  const info = index.info();
  assert.deepEqual(info.dimensions, [3, 4]);
  assert.equal(info.mismatched, 1);
  assert.match(String(info.note), /different size than openai:big returns/);
  assert.match(String(info.note), /skipped in search, not scored 0/);
  assert.match(String(info.note), /another model/, 'both facts are reported, not just the first');
});

test('index add/search/persist/reload', async () => {
  const { file } = tmpIndex();
  const index = new EmbeddingIndex(file, fakeEmbedder);
  assert.equal(index.available, true);
  await index.add('a1', 'user likes dark mode everywhere');
  await index.add('a2', 'server runs in dhaka timezone asia dhaka');
  assert.equal(index.size(), 2);

  const hits = await index.search('prefers dark mode', 2);
  assert.ok(hits.length >= 1, 'expected a semantic hit');
  assert.match(hits[0]!.text, /dark mode/);
  assert.ok(hits[0]!.score > 0.05);

  // Persistence: reload from disk keeps rows.
  const reloaded = new EmbeddingIndex(file, fakeEmbedder);
  assert.equal(reloaded.size(), 2);
  assert.ok(fs.existsSync(file));

  reloaded.clear();
  assert.equal(reloaded.size(), 0);
});

test('35.4 embedderParts names both halves without a network call', () => {
  assert.deepEqual(embedderParts(null), { provider: '', model: '' });
  assert.deepEqual(embedderParts({ name: 'local:Xenova/all-MiniLM-L6-v2', embed: async () => [] }), {
    provider: 'local',
    model: 'Xenova/all-MiniLM-L6-v2',
  });
  assert.deepEqual(
    embedderParts({ name: 'named', provider: 'p', model: 'm', embed: async () => [] }),
    { provider: 'p', model: 'm' },
  );
  assert.deepEqual(embedderParts({ name: 'bare', embed: async () => [] }), { provider: '', model: 'bare' });
});

test('index without embedder stays inert (zero-dep fallback)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temb-'));
  const file = path.join(dir, 'index.jsonl');
  const index = new EmbeddingIndex(file, null);
  assert.equal(index.available, false);
  await index.add('x', 'never embedded');
  assert.equal(index.size(), 0);
  assert.deepEqual(await index.search('anything'), []);
});

test('embeddings package absent -> tryLoadEmbedder returns null', async (t) => {
  if (await transformersInstalled()) {
    t.skip('optional @huggingface/transformers installed in this environment');
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'temb-'));
  assert.equal(await tryLoadEmbedder(dir), null);
});
