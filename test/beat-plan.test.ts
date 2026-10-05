import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * BEAT-PLAN.md is a competitive claim sheet, so it must not be able to lie:
 *  - it has to keep the smallest-to-biggest structure (tiers),
 *  - every beat has an effort and a proof,
 *  - every "we are already better" claim has to name a real census BETTER row,
 *  - every file path it points at has to exist (unless explicitly marked planned).
 * If a competitor claim cannot be checked, it does not belong in the plan.
 */
const root = process.cwd();
const doc = fs.readFileSync(path.join(root, 'docs', 'openclaw', 'BEAT-PLAN.md'), 'utf8');
const census = JSON.parse(
  fs.readFileSync(path.join(root, 'docs', 'openclaw', 'data', 'census.json'), 'utf8'),
) as { rows: { area: string; capability: string; verdict: string }[] };

test('beat plan: structured smallest-to-biggest, with effort and proof per beat', async (t) => {
  await t.test('keeps the tier structure (Tier 0 = hours … Tier 4 = do not fight)', () => {
    for (const need of ['### Tier 0', '### Tier 1', '### Tier 2', '### Tier 3', '### Tier 4']) {
      assert.ok(doc.includes(need), `missing ${need}`);
    }
    assert.match(doc, /smallest to biggest/i, 'states the ordering');
    // Tier 4 is the kill list: no build steps, just "we will not do this".
    const tier4 = doc.slice(doc.indexOf('### Tier 4'));
    assert.ok(!/^\| T4\.\d+/m.test(tier4), 'Tier 4 is a kill list, not a roadmap');
  });

  await t.test('at least 25 numbered beats, each with an effort and a proof column', () => {
    const rows = [...doc.matchAll(/^\| (T\d+\.\d+) \|(.+)$/gm)];
    assert.ok(rows.length >= 25, `expected ≥25 beats, found ${rows.length}`);
    for (const row of rows) {
      const id = row[1]!;
      const rest = row[2]!;
      assert.ok(rest.split('|').length >= 4, `${id} needs a full table row`);
      assert.match(rest, /\d+(\.\d+)?d\b/, `${id} states an effort in days`);
      assert.match(rest, /test|census|script|টেস্ট|প্রমাণ|ডক/i, `${id} names a proof`);
    }
  });

  await t.test('every "already BETTER" claim matches a real census BETTER row', () => {
    const better = new Set(census.rows.filter((r) => r.verdict === 'BETTER').map((r) => r.capability));
    const claims = [...doc.matchAll(/census:\s*([^()|`]+?)\s*🏅/g)].flatMap((m) =>
      (m[1] ?? '').split(',').map((s) => s.trim()),
    );
    assert.ok(claims.length >= 5, `expected several census-backed claims, found ${claims.length}`);
    for (const claim of claims) {
      assert.ok(better.has(claim), `"${claim}" is not a BETTER row in the census — do not claim it`);
    }
  });

  await t.test('every referenced file exists (or is explicitly marked planned)', () => {
    const paths = new Set<string>();
    for (const m of doc.matchAll(/`((?:src|test|scripts|docs)\/[A-Za-z0-9._/-]+)`/g)) paths.add(m[1]!);
    assert.ok(paths.size >= 3, 'the plan points at real files');
    for (const p of paths) {
      const planned = doc.includes('`' + p + '` (planned)');
      if (planned) continue;
      assert.ok(fs.existsSync(path.join(root, p)), `${p} does not exist — fix the claim or mark it planned`);
    }
  });

  await t.test('the plan is reachable from the map and the tracker', () => {
    const tracker = fs.readFileSync(path.join(root, 'docs', 'openclaw', 'TRACKER.md'), 'utf8');
    const worklog = fs.readFileSync(path.join(root, 'WORKLOG.md'), 'utf8');
    assert.match(tracker, /BEAT-PLAN\.md/, 'TRACKER links the beat plan');
    assert.match(worklog, /BEAT-PLAN\.md/, 'WORKLOG links the beat plan');
  });
});
