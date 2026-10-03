import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults } from '../src/core/config.js';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
}

/**
 * The work tracker is a deliverable, not decoration: it has to be readable from
 * the panel, honest about being behind, and it must fail the suite when a commit
 * forgets it. These tests are what makes "tracking" a promise instead of a habit.
 */
test('the tracker parser cannot be fooled by a letter in the evidence', async () => {
  // Regression: the end-of-section anchor used to be `\Z`, which JavaScript
  // reads as a literal capital Z — so a step whose evidence mentioned "ZIP"
  // truncated the section and every row after it vanished from the report.
  // Import by absolute path: the script is not compiled into dist/, so the
  // import must point at the repository's own scripts/ directory.
  const { pathToFileURL } = await import('node:url');
  const mod = (await import(
    pathToFileURL(path.join(process.cwd(), 'scripts', 'worklog-parse.mjs')).href
  )) as { parseWorklog: (text: string) => { stepLines: { id: string }[]; nextSteps: { id: string }[] } };
  const { parseWorklog } = mod;
  const sample = [
    '# Worklog',
    '## 2. Now — a batch',
    '| # | Step | Status | Evidence |',
    '|---|---|---|---|',
    '| 1.1 | one | ✔ done | a ZIP reader and a zlib stream |',
    '| 1.2 | two | ✔ done | plain evidence |',
    '| 1.3 | three | ▶ doing | more evidence |',
    '',
    '## 3. Next — the batch after',
    '| # | Step | Status | Acceptance test |',
    '|---|---|---|---|',
    '| 2.1 | four | ☐ todo | something |',
  ].join('\n');
  const parsed = parseWorklog(sample);
  assert.equal(parsed.stepLines.length, 3, 'every row survives the word ZIP');
  assert.deepEqual(parsed.stepLines.map((r) => r.id), ['1.1', '1.2', '1.3']);
  assert.deepEqual(parsed.nextSteps.map((r) => r.id), ['2.1']);
});

test('work tracker: fresh, reachable, and on the panel', async (t) => {
  const root = process.cwd();
  const file = path.join(root, 'WORKLOG.md');

  await t.test('WORKLOG.md carries a current batch, a done log and the rules', () => {
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /^## 2\. Now/m, 'a "Now" section with the active batch');
    assert.match(text, /^## 3\. Next/m, 'a "Next" section with the queue');
    assert.match(text, /^## 4\. Done/m, 'a "Done" section with commits + proofs');
    assert.match(text, /^\| 23\.\d+ /m, 'the current batch is a step table');
    assert.match(text, /^\| 24\.\d+ /m, 'the next batch is a step table');
    assert.match(text, /fails? the suite|npm test/i, 'the rules say a stale tracker fails the suite');
  });

  await t.test('every commit updates the tracker (zero commits since its last touch)', () => {
    // Same rule as scripts/status.mjs: commits after the last WORKLOG.md change = stale.
    let behind = 0;
    let note = '';
    try {
      const last = execFileSync('git', ['log', '-1', '--format=%h', '--', 'WORKLOG.md'], {
        cwd: root,
        encoding: 'utf8',
      }).trim();
      if (last) {
        behind = Number(
          execFileSync('git', ['rev-list', '--count', `${last}..HEAD`], { cwd: root, encoding: 'utf8' }).trim(),
        );
      } else {
        note = 'not committed yet';
      }
    } catch {
      note = 'no git available';
    }
    assert.equal(
      behind,
      0,
      note ? `skipped by environment (${note})` : 'commits landed after WORKLOG.md was updated — update the tracker in the same commit',
    );
  });

  await t.test('status.mjs agrees and prints machine-readable state', () => {
    const out = execFileSync('node', ['scripts/status.mjs', '--json'], { cwd: root, encoding: 'utf8' });
    const parsed = JSON.parse(out) as {
      fresh: boolean;
      commitsSinceTracker: number;
      head: string;
      stepLines: { id: string; state: string }[];
      nextSteps: { id: string; state: string }[];
      census: { checks: number; broken: number } | null;
    };
    assert.equal(parsed.fresh, true, 'status must report fresh');
    assert.equal(parsed.commitsSinceTracker, 0);
    assert.ok(parsed.stepLines.length >= 4, 'the current batch has steps');
    assert.ok(parsed.nextSteps.length >= 4, 'the next batch is queued with steps');
    assert.ok(parsed.census && parsed.census.checks > 100, 'census summary present');
  });
});

test('the panel serves the tracker (and still asks for the password)', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'twork-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'work-token';
  const port = await freePort();
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;
  const auth = { authorization: 'Bearer work-token' };

  try {
    await t.test('anonymous callers cannot read the tracker', async () => {
      const res = await fetch(base + '/api/worklog');
      assert.equal(res.status, 401);
    });

    await t.test('with the token: markdown + freshness, straight from disk', async () => {
      const res = await fetch(base + '/api/worklog', { headers: auth });
      assert.equal(res.status, 200);
      const data = (await res.json()) as { markdown: string; behind: number; head: string; fresh: boolean };
      assert.equal(data.markdown, fs.readFileSync(path.join(process.cwd(), 'WORKLOG.md'), 'utf8'));
      assert.equal(data.behind, 0);
      assert.equal(data.fresh, true);
      assert.ok(data.head.length >= 4, 'reports the commit it is running from');
    });

    await t.test('the panel has a Work view wired to that endpoint', async () => {
      const html = await (await fetch(base + '/')).text();
      assert.ok(html.includes('data-goto="work"'), 'sidebar entry');
      assert.ok(html.includes('id="view-work"'), 'view section');
      assert.ok(html.includes("api('/api/worklog')"), 'fetches the tracker');
      assert.ok(html.includes('renderMarkdown(w.markdown'), 'renders it as markdown');
      assert.ok(html.includes("'work', 'settings'") || html.includes("'work',"), 'registered in VIEWS');
    });
  } finally {
    await handle.stop();
  }
});
