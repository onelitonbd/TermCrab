/**
 * Batch 32.1 — embeddings from an endpoint, not only a local model.
 *
 * The point of these tests is not "does the HTTP client work" but the two
 * things a person on a phone actually cares about:
 *
 *   1. a semantic hit that shares no word with the query really shows up in
 *      `searchDetailed()` — i.e. the vectors changed the answer, and
 *   2. when the endpoint is broken or unconfigured, the answer is still a
 *      sentence and an empty result, never a stack trace or a silent lie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { remoteEmbedder, EMBED_PRICES } from '../src/agent/embed-remote.js';
import { embedderPlan, resolveEmbedder } from '../src/agent/embed-provider.js';
import { EmbeddingIndex } from '../src/agent/embed.js';
import { MemoryStore } from '../src/agent/memory.js';
import { validateConfig } from '../src/core/config.js';

const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));
const execFileP = promisify(execFile);

function tmpHome(tag: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `tc32-${tag}-`));
}

/** A config shaped like the real one, with only the fields these tests touch. */
function cfgWith(provider: Record<string, unknown>, memory: Record<string, unknown> = {}) {
  return {
    version: 3,
    provider: { type: 'openai', model: 'gpt-4o-mini', ...provider },
    memory: { embeddings: true, embedProvider: 'auto', ...memory },
  } as never;
}

/**
 * A tiny deterministic "embedding model" — not a keyword matcher: words that
 * *mean* the same thing land on the same axis (eat/breakfast/dish/rice all mean
 * "food"), so a semantic hit can be told apart from a substring match.
 */
const AXES: Record<string, string[]> = {
  food: ['rice', 'eat', 'breakfast', 'dish', 'meal', 'food', 'hungry', 'cook'],
  crab: ['crab', 'crustacean', 'animal', 'pet', 'shellfish'],
  phone: ['phone', 'android', 'termux', 'device', 'handset'],
  work: ['work', 'deadline', 'office', 'job', 'project'],
};
function fakeVector(text: string): number[] {
  const t = text.toLowerCase();
  return Object.values(AXES).map((words) => (words.some((w) => t.includes(w)) ? 1 : 0));
}

// --------------------------------------------------------------------------
// 32.1 the two wire formats, exactly
// --------------------------------------------------------------------------

test('32.1 openai-shaped embeddings: URL, auth header, batched body, order kept', async () => {
  const seen: { url: string; headers: Record<string, string>; body: { model: string; input: string[] } }[] = [];
  const embedder = remoteEmbedder(
    { kind: 'openai', baseUrl: 'https://api.example.com/v1/', apiKey: 'sk-secret', model: 'text-embedding-3-small' },
    async (url, init) => {
      seen.push({
        url,
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: JSON.parse(String(init?.body)) as { model: string; input: string[] },
      });
      return new Response(JSON.stringify({ data: [{ embedding: [1, 0], index: 1 }, { embedding: [0, 1], index: 0 }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  );

  const out = await embedder.embed(['first text', 'second text']);
  assert.equal(seen.length, 1, 'one batch, one request');
  assert.equal(seen[0]!.url, 'https://api.example.com/v1/embeddings', 'trailing slash trimmed, /embeddings appended');
  assert.equal(seen[0]!.headers.authorization, 'Bearer sk-secret');
  assert.equal(seen[0]!.body.model, 'text-embedding-3-small');
  assert.deepEqual(seen[0]!.body.input, ['first text', 'second text']);
  // A gateway that reorders must not scramble which vector belongs to which text.
  assert.deepEqual(out, [
    [0, 1],
    [1, 0],
  ]);
});

test('32.1 gemini-shaped embeddings: batchEmbedContents, key in a header, values parsed', async () => {
  let seen: { url: string; headers: Record<string, string>; body: { requests: { content: { parts: { text: string }[] } }[] } } | null = null;
  const embedder = remoteEmbedder(
    { kind: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'AIza-secret', model: 'text-embedding-004' },
    async (url, init) => {
      seen = {
        url,
        headers: (init?.headers ?? {}) as Record<string, string>,
        body: JSON.parse(String(init?.body)) as { requests: { content: { parts: { text: string }[] } }[] },
      };
      return new Response(JSON.stringify({ embeddings: [{ values: [0.5, 0.5] }] }), { status: 200 });
    },
  );

  const out = await embedder.embed(['hello']);
  assert.ok(seen);
  const s = seen as unknown as { url: string; headers: Record<string, string>; body: { requests: { content: { parts: { text: string }[] } }[] } };
  assert.match(s.url, /:batchEmbedContents$/);
  assert.equal(s.headers['x-goog-api-key'], 'AIza-secret');
  assert.equal(s.headers.authorization, undefined, 'the key never rides in an auth header here');
  assert.equal(s.body.requests[0]!.content.parts[0]!.text, 'hello');
  assert.deepEqual(out, [[0.5, 0.5]]);
});

test('32.1 a broken endpoint is a sentence that never leaks the key', async () => {
  const embedder = remoteEmbedder(
    { kind: 'openai', baseUrl: 'https://api.example.com/v1', apiKey: 'sk-do-not-print', model: 'm' },
    async () =>
      new Response(JSON.stringify({ error: { message: 'invalid api key sk-do-not-print' } }), { status: 401 }),
  );
  await assert.rejects(
    () => embedder.embed(['x']),
    (err: Error) => {
      assert.match(err.message, /answered 401/);
      assert.match(err.message, /api\.example\.com/, 'names the host that failed');
      assert.equal(err.message.includes('sk-do-not-print'), false, 'the key is never echoed back');
      return true;
    },
  );

  // A wrong number of vectors is its own explicit failure, not a silent short list.
  const short = remoteEmbedder(
    { kind: 'openai', baseUrl: 'https://api.example.com/v1', apiKey: '', model: 'm' },
    async () => new Response(JSON.stringify({ data: [{ embedding: [1] }] }), { status: 200 }),
  );
  await assert.rejects(() => short.embed(['a', 'b']), /returned 1 vector\(s\) for 2 input\(s\)/);
});

// --------------------------------------------------------------------------
// 32.1 choosing the provider
// --------------------------------------------------------------------------

test('32.1 the plan follows the config, and says why', async () => {
  // auto + an OpenAI-compatible chat provider → that provider's embeddings.
  const auto = embedderPlan(cfgWith({ type: 'openai', apiKey: 'k' }));
  assert.equal(auto.kind, 'openai');
  assert.equal(auto.model, 'text-embedding-3-small');
  assert.equal(auto.automatic, true);
  assert.match(auto.note, /your chat provider/);
  assert.match(auto.note, /\$0\.02\/1M tokens/);

  // auto + gemini chat → gemini embeddings.
  assert.equal(embedderPlan(cfgWith({ type: 'gemini', apiKey: 'k' })).kind, 'gemini');

  // auto + the offline demo provider → nothing to embed with, and one fix.
  const mock = embedderPlan(cfgWith({ type: 'mock' }));
  assert.equal(mock.kind, null);
  assert.match(mock.note, /offline demo provider/);
  assert.match(String(mock.blocker), /termcrab embeddings setup/);

  // Anthropic has no embeddings API — do not pretend it does.
  assert.equal(embedderPlan(cfgWith({ type: 'anthropic', apiKey: 'k' })).kind, null);

  // An explicit request that cannot be honoured is a blocker, not a fallback.
  const forcedLocal = embedderPlan(cfgWith({ type: 'openai' }, { embedProvider: 'local' }));
  assert.equal(forcedLocal.kind, null);
  assert.match(String(forcedLocal.blocker), /embeddings setup/);

  // embeddings=false wins over everything.
  assert.equal(embedderPlan(cfgWith({ type: 'openai' }, { embeddings: false, embedProvider: 'openai' })).kind, null);

  // A self-hosted endpoint with no key is legitimate (llama.cpp, Ollama).
  const local127 = embedderPlan(cfgWith({ type: 'openai', apiKey: '', baseUrl: 'http://127.0.0.1:8080/v1' }));
  assert.equal(local127.kind, 'openai');
  assert.match(local127.note, /no API key set, which is right for a local server/);

  // The model override and its (unknown) price are handled honestly.
  const custom = embedderPlan(cfgWith({ type: 'openai', apiKey: 'k' }, { embedModel: 'my-model' }));
  assert.equal(custom.model, 'my-model');
  assert.equal(custom.note.includes('$'), false, 'no invented price for a model nobody priced');
  assert.equal(EMBED_PRICES['text-embedding-3-small']!.usdPerM, 0.02);
});

test('32.1 resolveEmbedder loads the remote path without network and can be injected', async () => {
  const dir = tmpHome('resolve');
  const { embedder, plan } = await resolveEmbedder(
    cfgWith({ type: 'openai', apiKey: 'k', baseUrl: 'http://127.0.0.1:9/v1' }),
    dir,
    {
      fetchImpl: async () => new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200 }),
    },
  );
  assert.ok(embedder);
  assert.equal(plan.kind, 'openai');
  assert.deepEqual(await embedder.embed(['x']), [[0.1, 0.2, 0.3]]);

  // A local plan whose package is missing never throws — it reports.
  const localOnly = await resolveEmbedder(cfgWith({ type: 'openai' }, { embedProvider: 'local' }), dir, {
    loader: async () => null,
  });
  assert.equal(localOnly.embedder, null);
  assert.ok(localOnly.error || localOnly.plan.blocker);
});

test('32.1 config validation accepts the three new keys and refuses junk', () => {
  const base = { version: 3, provider: { type: 'openai', model: 'm' } };
  assert.equal(
    validateConfig({ ...base, memory: { embeddings: true, embedProvider: 'openai', embedModel: 'text-embedding-3-small', embedBaseUrl: 'http://127.0.0.1:11434/v1' } })
      .filter((p) => p.severity === 'error').length,
    0,
  );
  const bad = validateConfig({ ...base, memory: { embeddings: true, embedProvider: 'magic' } }).filter((p) => p.severity === 'error');
  assert.equal(bad.length, 1);
  assert.match(bad[0]!.message, /auto \| local \| openai \| gemini/);
  const badUrl = validateConfig({ ...base, memory: { embeddings: true, embedBaseUrl: 'ftp://x' } }).filter((p) => p.severity === 'error');
  assert.equal(badUrl.length, 1);
  assert.match(badUrl[0]!.message, /http/);
});

// --------------------------------------------------------------------------
// 32.1 the reason this exists: the answer changes
// --------------------------------------------------------------------------

test('32.1 semantic search finds a fact that shares no word with the query', async () => {
  const dir = tmpHome('search');
  fs.writeFileSync(path.join(dir, 'MEMORY.md'), ['# Memory', '- The user eats fried rice every morning.', '- The user works from home.'].join('\n'));
  const embedder = {
    name: 'fake',
    embed: async (texts: string[]) => texts.map(fakeVector),
  };
  const index = new EmbeddingIndex(path.join(dir, 'index.jsonl'), embedder);
  await index.add('m1', 'The user eats fried rice every morning.');
  await index.add('m2', 'The user works from home.');

  const memory = new MemoryStore(dir, index);

  // Lexical only would find nothing: the query shares no word with the fact.
  const hits = await memory.searchDetailed('favourite breakfast dish?', 5);
  assert.ok(hits.length >= 1, 'the vector hit is returned');
  assert.equal(hits[0]!.semantic, true, 'and it is labelled as semantic, not passed off as a word match');
  assert.match(hits[0]!.line, /fried rice/);

  // With no index at all, the same query is honestly empty.
  const plain = new MemoryStore(dir);
  const lexical = await plain.searchDetailed('favourite breakfast dish?', 5);
  assert.equal(lexical.filter((h) => /fried rice/.test(h.line)).length, 0, 'the lexical path cannot fake this');
});

// --------------------------------------------------------------------------
// 32.1 the CLI: status and a real end-to-end test against a local server
// --------------------------------------------------------------------------

test('32.1 termcrab embeddings status names the live provider and its cost', async () => {
  const dir = tmpHome('status');
  fs.writeFileSync(
    path.join(dir, 'config.json'),
    JSON.stringify({ version: 3, provider: { type: 'openai', model: 'gpt-4o-mini', apiKey: 'k' }, memory: { embeddings: true, embedProvider: 'openai' } }),
  );
  const { stdout } = await execFileP(process.execPath, [CLI, 'embeddings', 'status', '--json'], {
    env: { ...process.env, TCRAB_HOME: dir },
  });
  const parsed = JSON.parse(stdout) as { ok: boolean; command: string; data: { provider: string; model: string; costNote: string; enabled: boolean } };
  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, 'embeddings');
  assert.equal(parsed.data.provider, 'openai');
  assert.equal(parsed.data.model, 'text-embedding-3-small');
  assert.match(parsed.data.costNote, /0\.02/);
  assert.equal(parsed.data.enabled, true);
});

test('32.1 termcrab embeddings test really embeds, through a local HTTP endpoint', async () => {
  const dir = tmpHome('test');
  let seenBody: { model?: string; input?: string[] } | null = null;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (b: Buffer) => (body += b.toString()));
    req.on('end', () => {
      seenBody = JSON.parse(body) as { model?: string; input?: string[] };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: [{ embedding: [0.25, -0.5, 0.75, 0] }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  try {
    fs.writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({
        version: 3,
        provider: { type: 'openai', model: 'gpt-4o-mini', baseUrl: `http://127.0.0.1:${port}/v1` },
        memory: { embeddings: true, embedProvider: 'openai' },
      }),
    );
    const { stdout } = await execFileP(process.execPath, [CLI, 'embeddings', 'test', 'the crab likes rice', '--json'], {
      env: { ...process.env, TCRAB_HOME: dir },
    });
    const parsed = JSON.parse(stdout) as { ok: boolean; data: { ok: boolean; provider: string; dims: number; chars: number; ms: number } };
    assert.equal(parsed.data.ok, true);
    assert.equal(parsed.data.provider, 'openai');
    assert.equal(parsed.data.dims, 4);
    assert.equal(parsed.data.chars, 'the crab likes rice'.length);
    assert.ok(seenBody);
    const sent = seenBody as unknown as { model?: string; input?: string[] };
    assert.deepEqual(sent.input, ['the crab likes rice']);
    assert.equal(sent.model, 'text-embedding-3-small');

    // The human output says the same thing without JSON.
    const human = await execFileP(process.execPath, [CLI, 'embeddings', 'test', 'hello'], { env: { ...process.env, TCRAB_HOME: dir } });
    assert.match(human.stdout, /openai · text-embedding-3-small/);
    assert.match(human.stdout, /→ 4 dimensions/);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
});

test('32.1 a dead endpoint exits non-zero with the reason, and search still works lexically', async () => {
  const dir = tmpHome('dead');
  fs.writeFileSync(
    path.join(dir, 'config.json'),
    JSON.stringify({
      version: 3,
      provider: { type: 'openai', model: 'gpt-4o-mini', baseUrl: 'http://127.0.0.1:9/v1' },
      memory: { embeddings: true, embedProvider: 'openai' },
    }),
  );
  await assert.rejects(
    () => execFileP(process.execPath, [CLI, 'embeddings', 'test', 'hello', '--json'], { env: { ...process.env, TCRAB_HOME: dir } }),
    (err: Error & { stdout?: string }) => {
      const parsed = JSON.parse(String(err.stdout)) as { ok: boolean; data: { ok: boolean; error: string } };
      assert.equal(parsed.data.ok, false);
      assert.match(parsed.data.error, /could not reach/);
      return true;
    },
  );

  // And the memory store with a broken embedder still answers from the text.
  fs.writeFileSync(path.join(dir, 'MEMORY.md'), '- The crab likes rice.\n');
  const broken = {
    name: 'broken',
    embed: async () => {
      throw new Error('embeddings: could not reach 127.0.0.1 — connection refused');
    },
  };
  const memory = new MemoryStore(dir, new EmbeddingIndex(path.join(dir, 'index.jsonl'), broken));
  const hits = await memory.searchDetailed('rice', 5);
  assert.equal(hits.length, 1, 'lexical search stands on its own when the vector path is broken');
  assert.match(hits[0]!.line, /likes rice/);
});
