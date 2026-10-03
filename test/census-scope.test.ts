import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Batch 25 — the scope decision, pinned.
 *
 * On 2026-10-03 the user chose three surfaces: telegram, the web panel and the
 * terminal. The census now measures everything but scores only what we intend
 * to build, and every excluded row carries the decision and its reason next to
 * it. That is easy to state and easy to get wrong later — this test is what
 * keeps the published number honest: if someone quietly re-includes the extra
 * channels, the score stops matching the arithmetic here.
 */

const root = process.cwd();
const census = JSON.parse(
  fs.readFileSync(path.join(root, 'docs', 'openclaw', 'data', 'census.json'), 'utf8'),
) as {
  tally: Record<string, number>;
  coverage: number;
  inScope: number;
  outOfScope: number;
  rows: { area: string; capability: string; verdict: string; scope?: string; why?: string }[];
};

const WEIGHT: Record<string, number> = { WORKING: 1, BETTER: 1, PARTIAL: 0.45, BROKEN: 0.1, ABSENT: 0 };

test('25.1 the census is scored over in-scope work, and says why the rest is out', () => {
  const out = census.rows.filter((r) => r.scope === 'out');
  const inScope = census.rows.filter((r) => r.scope !== 'out');

  assert.ok(out.length >= 8, `the scope decision covers the channels and the native apps (${out.length} rows)`);
  assert.equal(census.outOfScope, out.length);
  assert.equal(census.inScope, inScope.length);
  assert.ok(inScope.length < census.rows.length, 'some rows really are excluded');

  // Every excluded row says who decided it, when, and why — a bare "out of
  // scope" would be indistinguishable from forgetting the feature.
  for (const r of out) {
    assert.match(r.why ?? '', /2026-10-03/, `${r.capability} names the decision date`);
    assert.match(r.why ?? '', /three surfaces|telegram/i, `${r.capability} names the decision`);
  }

  // The three surfaces the user chose are in scope — including the terminal.
  for (const surface of ['Telegram', 'Web control UI', 'Interactive REPL']) {
    const row = census.rows.find((r) => r.capability === surface);
    assert.ok(row, `${surface} is a tracked capability`);
    assert.notEqual(row.scope, 'out', `${surface} is a supported surface and stays in scope`);
  }

  // The published score is the in-scope arithmetic, not a hand-written number.
  const score = inScope.reduce((a, r) => a + (WEIGHT[r.verdict] ?? 0), 0);
  assert.equal(census.coverage, Math.round((score / inScope.length) * 100));
  assert.equal(census.tally.WORKING, inScope.filter((r) => r.verdict === 'WORKING').length);
  assert.equal(census.tally.ABSENT, inScope.filter((r) => r.verdict === 'ABSENT').length);
});
