/**
 * Batch 35 — the tail after the tail.
 *
 * 35.1 is done (0.68.0 tagged and published, asserted from the changelog and
 * the tag itself). 35.4 closes two threads the memory work left open:
 *
 *   1. a stored vector did not record **what made it**, so changing the
 *      embedding model silently made every old vector worse — no error, no note
 *   2. comparing vectors of two different sizes returned `0`, which reads as
 *      *"unrelated"* and is indistinguishable from a real answer
 *
 * The unit behaviour is pinned in `test/embed.test.ts`; here the question is
 * whether the *surfaces* say it — `termcrab embeddings status` and its JSON
 * envelope — and whether 35.2/35.3 are stated rather than quietly dropped.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { embeddingsStatus } from '../src/agent/embed-setup.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function cli(args: string[], env: Record<string, string> = {}): { code: number; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
    timeout: 60_000,
  });
  return { code: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

function writeIndex(home: string, rows: unknown[]): string {
  const file = path.join(home, 'memory', 'index.jsonl');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return file;
}

test('35.4 a stale index is visible in the status, with the fix', { concurrency: false }, async (t) => {
  await t.test('a fresh home has nothing to say', () => {
    tmpHome('t35a-');
    const st = embeddingsStatus();
    assert.equal(st.indexVectors, 0);
    assert.equal(st.staleVectors, 0);
    assert.equal(st.mismatchedVectors, 0);
    assert.equal(st.indexNote, null, 'an empty index is not a warning');
  });

  await t.test('rows made by another model are counted, and mixed sizes explained', () => {
    const home = tmpHome('t35b-');
    writeIndex(home, [
      { id: 'a', text: 'one', vec: [1, 0, 0, 0], provider: 'openai', model: 'text-embedding-3-small' },
      { id: 'b', text: 'two', vec: [1, 0, 0], provider: 'openai', model: 'text-embedding-ada-002' },
    ]);
    const st = embeddingsStatus();
    assert.equal(st.indexVectors, 2);
    // The default config already names a provider, so one row was made by *that*
    // model and one by another — which is the case worth reporting.
    assert.ok(st.staleVectors >= 1, 'a row made by another model is counted');
    assert.deepEqual(st.indexBuiltBy, ['openai:text-embedding-3-small', 'openai:text-embedding-ada-002']);
    assert.deepEqual(st.indexDimensions, [3, 4], 'the sizes on disk are reported');
    assert.match(String(st.indexNote), /another model/);
    assert.match(String(st.indexNote), /re-embed/);
  });

  await t.test('a corrupt index does not break status', () => {
    const home = tmpHome('t35c-');
    const file = path.join(home, 'memory', 'index.jsonl');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{not json\n\n');
    const st = embeddingsStatus();
    assert.equal(typeof st.summary, 'string');
    assert.equal(st.indexVectors, 0, 'unreadable rows are reported as empty, not as a crash');
  });

  await t.test('the CLI prints it, and the JSON envelope carries every field', () => {
    const home = tmpHome('t35d-');
    writeIndex(home, [
      { id: 'a', text: 'one', vec: [1, 0, 0, 0], provider: 'openai', model: 'nomic-embed-text' },
      { id: 'b', text: 'two', vec: [1, 0], provider: 'openai', model: 'nomic-embed-text' },
    ]);
    const json = cli(['embeddings', 'status', '--json'], { TCRAB_HOME: home });
    assert.equal(json.code, 0, json.stderr);
    const data = JSON.parse(json.stdout) as {
      ok: boolean;
      data: { indexVectors: number; staleVectors: number; mismatchedVectors: number; indexNote: string | null; indexDimensions: number[] };
    };
    assert.equal(data.ok, true);
    assert.equal(data.data.indexVectors, 2);
    assert.ok(data.data.mismatchedVectors >= 1, 'the mixed sizes are counted');
    assert.match(String(data.data.indexNote), /different size|another model/);
    assert.deepEqual(data.data.indexDimensions, [2, 4]);

    const human = cli(['embeddings', 'status'], { TCRAB_HOME: home });
    assert.equal(human.code, 0, human.stderr);
    assert.match(human.stdout, /smart memory search/);
    assert.match(human.stdout, /vector\(s\)/, 'the index line is printed for a person too');
    assert.match(human.stdout, /⚠️/, 'and the warning is not buried');
  });
});

test('35.4 the loop that writes the index records the model', { concurrency: false }, async (t) => {
  await t.test('memory.ts adds through the index, so rows carry provenance', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'agent', 'embed.ts'), 'utf8');
    assert.match(src, /provider, model \} = embedderParts\(this\.embedder\)/, 'add() stamps the row');
    assert.match(src, /class DimensionMismatch/, 'the refusal is a type, not a string compare');
    assert.match(src, /throw new DimensionMismatch\(a\.length, b\.length\)/);
    // And nothing else in src/ compares raw vectors by hand.
    const others = fs
      .readdirSync(path.join(ROOT, 'src', 'agent'))
      .filter((f) => f.endsWith('.ts') && f !== 'embed.ts')
      .map((f) => fs.readFileSync(path.join(ROOT, 'src', 'agent', f), 'utf8'))
      .join('\n');
    assert.ok(!/cosine\(/.test(others), 'cosine is called in one place, so the refusal cannot be bypassed');
  });

  await t.test('the docs say what the index knows', () => {
    const cliDoc = fs.readFileSync(path.join(ROOT, 'docs', 'CLI.md'), 'utf8');
    assert.match(cliDoc, /staleVectors/);
    assert.match(cliDoc, /mismatchedVectors/);
    assert.match(cliDoc, /never scored as an unrelated 0/);
  });
});

test('35.1/35.2/35.3 the tail is named, not promised', { concurrency: false }, async (t) => {
  const worklog = fs.readFileSync(path.join(ROOT, 'WORKLOG.md'), 'utf8');

  await t.test('35.1 is closed by a real tag, not by a sentence', () => {
    // The tag for the version being released is created *after* this commit, so
    // the invariant that must hold at every moment is: the newest tag in the
    // repository names a release the changelog actually describes.
    const tags = spawnSync('git', ['tag', '-l'], { cwd: ROOT, encoding: 'utf8' })
      .stdout.split('\n')
      .map((s) => s.trim())
      .filter((s) => /^v\d+\.\d+\.\d+$/.test(s))
      .sort((a, b) => {
        const pa = a.slice(1).split('.').map(Number);
        const pb = b.slice(1).split('.').map(Number);
        return pa[0]! - pb[0]! || pa[1]! - pb[1]! || pa[2]! - pb[2]!;
      });
    assert.ok(tags.length >= 1, 'there is at least one release tag');
    const newest = tags[tags.length - 1]!;
    const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
    assert.match(changelog, new RegExp(`^## ${newest.slice(1)} `, 'm'), `${newest} describes that release`);
    // Batch 35 has moved from §2 (the current batch) into §4 (done) by now, so
    // the invariant is that the tracker still names the published tag.
    assert.match(worklog, new RegExp(`v${newest.slice(1)}`), 'and the tracker names the published tag');
  });

  await t.test('35.2 is one owner command, quoted exactly, and still PARTIAL', () => {
    assert.match(worklog, /35\.2/, 'the row is in the next table');
    assert.match(worklog, /npm run ci:install/, 'the command is the one that installs the workflow');
    assert.ok(!fs.existsSync(path.join(ROOT, '.github')), 'nothing pretends the workflow is installed');
    const census = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'openclaw', 'data', 'census.json'), 'utf8')) as {
      rows?: { name?: string; level?: string }[];
      checks?: { name?: string; level?: string }[];
    };
    const rows = census.rows ?? census.checks ?? [];
    const ci = rows.find((r) => /^ci matrix$/i.test(String(r.name)));
    if (ci) assert.equal(ci.level, 'PARTIAL', 'CI stays PARTIAL until it has really run');
  });

  await t.test('35.3 every leftover is written down with a verdict and a reason', () => {
    assert.match(worklog, /## 3\. Next/, 'the tracker has a section for what is left');
    const section = worklog.slice(worklog.indexOf('## 3. Next'), worklog.indexOf('## 4. Done'));
    for (const [named, re] of [
      ['CI matrix', /CI matrix/],
      ['WhatsApp', /WhatsApp/],
      ['the later lane', /later["']?\s*lane/i],
      ['the missing tags', /v0\.36\.0/],
      ['the raw crawl', /OpenClaw crawl/],
      ['the test skips', /skips/],
    ] as const) {
      assert.match(section, re, `${named} is named in the leftovers, not left implicit`);
    }
    assert.match(section, /Verdict/, 'and there is a verdict column, not prose');
    assert.match(section, /reason/i, 'each leftover carries why, not only that');
  });
});
