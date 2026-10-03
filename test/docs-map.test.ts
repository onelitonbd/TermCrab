import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Batch 8 — the docs map is checked, not trusted.
 *
 * The census kept a BROKEN row for weeks: `docs/ARCHITECTURE.md` listed
 * `gemini.ts`, `anthropic.ts` and `ollama.ts` under `src/providers/`, and none
 * of those files has ever existed (one OpenAI-compatible client does the work).
 * A reader tracking the system from the map was tracking a system that isn't
 * there. This test fails when a `.ts` file named in the two map-style docs is
 * not present in the repo — the drift can no longer be silent.
 */

const DOCS = ['docs/ARCHITECTURE.md', 'docs/API.md'];

/** Files that are not part of the tree a doc may name (skip globs, plans, etc.). */
function knownBasenames(): Set<string> {
  const names = new Set<string>();
  for (const dir of ['src', 'test', 'scripts', 'packages', 'skills', 'ci']) {
    const walk = (d: string): void => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.ts')) names.add(e.name);
      }
    };
    walk(dir);
  }
  return names;
}

test('8.5 docs name only files that exist (ARCHITECTURE.md / API.md)', () => {
  const known = knownBasenames();
  const problems: string[] = [];
  for (const doc of DOCS) {
    assert.ok(fs.existsSync(doc), `${doc} exists`);
    const lines = fs.readFileSync(doc, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(/(^|[^*\w.])([A-Za-z0-9_-]+\.ts)\b/g)) {
        const name = m[2]!;
        if (known.has(name)) continue;
        problems.push(`${doc}:${i + 1} names ${name} — no such file in the repo`);
      }
    });
  }
  assert.deepEqual(problems, [], `docs must not name files that do not exist:\n${problems.join('\n')}`);
});

test('8.5 the provider tree in ARCHITECTURE.md matches src/providers', () => {
  const doc = fs.readFileSync('docs/ARCHITECTURE.md', 'utf8');
  const start = doc.indexOf('providers/');
  assert.ok(start > 0, 'provider section located');
  const block = doc.slice(start, doc.indexOf('skills/loader.ts', start));
  const onDisk = fs
    .readdirSync('src/providers')
    .filter((f) => f.endsWith('.ts'))
    .sort();
  const named = [...new Set([...block.matchAll(/([A-Za-z0-9_-]+\.ts)\b/g)].map((m) => m[1]!))].sort();
  assert.deepEqual(named, onDisk, 'every provider file is listed, and nothing extra');
});
