import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

/**
 * Batch 45 — the three-surface audit is checked, not trusted.
 *
 * The owner's rule is that every capability must be reachable from the CLI, from
 * Telegram and from the web panel, not merely from the backend. The audit in
 * `scripts/surface-audit.mjs` measures that with probes over the real source,
 * and the report in `docs/SURFACES.md` quotes the numbers it prints. Two things
 * can rot silently: a probe that stops matching when a command moves, and a
 * scoreboard that no longer matches the script. This test refuses both.
 *
 * It is deliberately cheap (two node runs of a regex scanner) and runs in the
 * fast group.
 */

interface Cell {
  state: 'yes' | 'partial' | 'no' | 'n/a';
  why: string;
  hits: string[];
  missing: string[];
}
interface Row {
  area: string;
  name: string;
  cli: Cell;
  tg: Cell;
  web: Cell;
}
interface Result {
  rows: Row[];
  totals: { rows: number; cli: number; tg: number; web: number; gaps: number };
}
const SURFACES = ['cli', 'tg', 'web'] as const;

function auditResult(args: string[] = ['--json']): Result {
  const out = execFileSync(process.execPath, ['scripts/surface-audit.mjs', ...args], { encoding: 'utf8' });
  return JSON.parse(out) as Result;
}

test('45.1 the surface audit matches the code it describes', () => {
  // --check exits 1 the day a probe stops matching, with the file and pattern.
  const out = execFileSync(process.execPath, ['scripts/surface-audit.mjs', '--check'], { encoding: 'utf8' });
  assert.match(out, /probe still matches/, 'the check reports what it verified');
  assert.match(out, /Three-surface audit — \d+ capabilities/);
});

test('45.2 every capability carries a verdict for all three surfaces', () => {
  const r = auditResult();
  assert.ok(r.rows.length >= 70, `the audit covers the product (${r.rows.length} rows)`);
  for (const row of r.rows) {
    for (const s of SURFACES) {
      const cell = row[s];
      assert.ok(cell, `${row.area}/${row.name}: ${s} cell exists`);
      assert.ok(
        ['yes', 'partial', 'no', 'n/a'].includes(cell.state),
        `${row.area}/${row.name}: ${s} has a state (${cell.state})`,
      );
      // A missing verdict without a reason is the failure this audit exists to
      // prevent: "--" rows must say what is absent, "~~" rows must name the door.
      if (cell.state === 'no' || cell.state === 'partial') {
        assert.ok(cell.why.trim().length > 0, `${row.area}/${row.name}: ${s} ${cell.state} names why`);
      }
    }
  }
  const missing = r.rows.filter((row) => SURFACES.some((s) => row[s].state === 'no'));
  assert.equal(missing.length, r.totals.gaps, 'the gap count is the rows with a missing cell');
});

test('45.3 the numbers in docs/SURFACES.md are the numbers the script prints', () => {
  const r = auditResult();
  const doc = fs.readFileSync('docs/SURFACES.md', 'utf8');
  const count = (s: (typeof SURFACES)[number], state: Cell['state']): number =>
    r.rows.filter((row) => row[s].state === state).length;

  // The scoreboard table: | CLI / TUI | 49 | 15 | 1 | 6 |
  const rowFor = (label: string): number[] => {
    const line = doc.split('\n').find((l) => l.startsWith(`| ${label} |`));
    assert.ok(line, `docs/SURFACES.md has a scoreboard row for ${label}`);
    return line
      .split('|')
      .slice(2, 6)
      .map((c) => {
        // The table may bold a number or annotate it with a footnote marker;
        // the digits are the claim.
        const m = c.match(/\d+/);
        assert.ok(m, `scoreboard cell carries a number: ${JSON.stringify(c.trim())}`);
        return Number(m[0]);
      });
  };
  assert.deepEqual(
    rowFor('CLI / TUI'),
    [count('cli', 'yes'), count('cli', 'partial'), count('cli', 'no'), count('cli', 'n/a')],
    'CLI row',
  );
  assert.deepEqual(
    rowFor('Telegram'),
    [count('tg', 'yes'), count('tg', 'partial'), count('tg', 'no'), count('tg', 'n/a')],
    'Telegram row',
  );
  assert.deepEqual(
    rowFor('Web panel'),
    [count('web', 'yes'), count('web', 'partial'), count('web', 'no'), count('web', 'n/a')],
    'Web row',
  );
  assert.ok(
    doc.includes(`${r.rows.length} capabilities × 3 surfaces`),
    `the report names the matrix size (${r.rows.length} capabilities × 3 surfaces)`,
  );
  assert.ok(
    doc.includes(`${r.totals.gaps} of ${r.rows.length} rows have at least one ❌`),
    `the report names the gap count (${r.totals.gaps} of ${r.rows.length})`,
  );
});
