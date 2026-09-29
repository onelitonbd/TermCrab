import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cosine,
  EmbeddingIndex,
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

test('cosine: identical=1, orthogonal=0, bad input=0', () => {
  assert.ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9);
  assert.ok(Math.abs(cosine([1, 0], [0, 1])) < 1e-9);
  assert.equal(cosine([], []), 0);
  assert.equal(cosine([1, 2], [1]), 0);
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
