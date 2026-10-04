/**
 * Batch 34.7 — the web panel.
 *
 * There is no browser in this sandbox, so the panel is tested the way the rest
 * of this repository tests things: the JavaScript is **extracted from the real
 * `ui/index.html` and executed in Node**, and the endpoints it calls are served
 * by a **real gateway** on a real port. A screen that reads a field the API does
 * not send fails here instead of showing a red toast on a phone.
 *
 * Three levels:
 *   1. the Board screen's pure functions, fed the payload shapes the API returns
 *   2. the markup/plumbing: the view exists, the nav reaches it, the router knows it
 *   3. a contract scan: every /api/... path in the panel is a route in the gateway,
 *      and the endpoints the panel is *expected* to reach really are reached — plus
 *      a live server answering the seven calls the Board screen makes
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';

const ROOT = process.cwd();
const HTML = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
const SERVER = fs.readFileSync(path.join(ROOT, 'src', 'gateway', 'server.ts'), 'utf8');

interface BoardUi {
  boardGroups: (b: unknown) => { status: string; label: string; count: number; cards: unknown[] }[];
  boardSummary: (b: unknown) => string;
  boardCardLines: (c: Record<string, unknown>) => { title: string; where: string; detail: string };
  devicesRows: (p: unknown) => { id: string; name: string; kind: string; lastSeen: string }[];
  housekeepingRows: (d: unknown) => { label: string; value: string; note: string }[];
  bytesText: (n: number) => string;
  boardEsc: (s: unknown) => string;
}

function loadBoard(): BoardUi {
  const m = HTML.match(/\/\/ ==== board view[^\n]*====([\s\S]*?)\/\/ ==== end board view ====/);
  assert.ok(m, 'the board block is marked in ui/index.html so it can be run outside a browser');
  const factory = new Function(
    `${m![1]}\n; return { boardGroups, boardSummary, boardCardLines, devicesRows, housekeepingRows, bytesText, boardEsc };`,
  ) as () => BoardUi;
  return factory();
}

const ui = loadBoard();

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as { port: number }).port;
      srv.close(() => resolve(port));
    });
  });
}

// --------------------------------------------------------------------- 34.7

test('34.7 the Board screen thinks in pure functions, and they run in Node', { concurrency: false }, async (t) => {
  await t.test('cards group into the board’s own order, with an honest "other"', () => {
    const groups = ui.boardGroups({
      cards: [
        { status: 'done', title: 'd' },
        { status: 'running', title: 'r' },
        { status: 'suggested', title: 's' },
        { status: 'weird', title: 'w' },
        { status: 'failed', title: 'f' },
        { status: 'running', title: 'r2' },
      ],
    });
    assert.deepEqual(
      groups.map((g) => [g.status, g.count]),
      [['running', 2], ['failed', 1], ['done', 1], ['suggested', 1], ['other', 1]],
      'the order is urgency, and an unknown status is shown rather than dropped',
    );
    assert.equal(groups[0]!.label, 'Running now');
    assert.deepEqual(ui.boardGroups({}), []);
    assert.deepEqual(ui.boardGroups(null), []);
  });

  await t.test('the one-line summary counts what is actually there', () => {
    assert.equal(ui.boardSummary({ counts: { running: 1, failed: 0, suggested: 2 } }), '1 running · 2 suggested');
    assert.equal(ui.boardSummary({ counts: {} }), 'nothing in flight');
    assert.equal(ui.boardSummary(null), 'nothing in flight');
  });

  await t.test('a card keeps its title, source and detail, and never returns undefined', () => {
    const full = ui.boardCardLines({ title: 'Review the inbox', from: 'cron', agent: 'main', detail: 'next run 07:00' });
    assert.deepEqual(full, { title: 'Review the inbox', where: 'cron · main', detail: 'next run 07:00' });
    const bare = ui.boardCardLines({ id: 'task-1' });
    assert.deepEqual(bare, { title: 'task-1', where: '', detail: '' });
    assert.equal(ui.boardCardLines({}).title, '(untitled)');
  });

  await t.test('devices render with a kind, a last-seen line, and never a raw timestamp', () => {
    const rows = ui.devicesRows({
      devices: [
        { id: 'd1', name: 'Pixel', lastSeenAt: 1_700_000_000_000, current: true },
        { id: 'd2' },
      ],
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.kind, 'this device');
    assert.equal(rows[1]!.kind, 'paired');
    assert.equal(rows[1]!.name, 'd2', 'a device with no name is shown by id, not as "undefined"');
    assert.equal(rows[1]!.lastSeen, 'never used');
    assert.ok(!/\d{13}/.test(rows[0]!.lastSeen), 'the epoch number is formatted, not printed');
    assert.deepEqual(ui.devicesRows({}), []);
  });

  await t.test('the system rows read the five payloads and survive all of them missing', () => {
    const rows = ui.housekeepingRows({
      runs: { runs: [{ verdict: 'working' }, { verdict: 'stuck' }] },
      subagents: { count: 3, running: 1, scratch: ['/tmp/x'] },
      disk: { totalBytes: 5_242_880, files: 120, byArea: { sessions: 4_194_304, memory: 1024 }, overBudget: false, budgetBytes: 10_485_760 },
      presence: { summary: '2 watchers, 1 device', count: 3 },
      proposals: { proposals: [{ name: 'weekly-review' }] },
    });
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map((r) => r.label), ['Live turns', 'Background tasks', 'State on disk', 'Reachable from', 'Skill proposals']);
    assert.equal(rows[0]!.value, '2 running');
    assert.match(rows[0]!.note, /needs a look: stuck/);
    assert.equal(rows[1]!.value, '3 total, 1 running');
    assert.match(rows[2]!.value, /5\.0 MB in 120 files/);
    assert.match(rows[2]!.note, /largest: sessions/);
    assert.equal(rows[3]!.value, '2 watchers, 1 device');
    assert.match(rows[4]!.value, /1 waiting for a decision/);
    assert.match(rows[4]!.note, /weekly-review/);

    const over = ui.housekeepingRows({ disk: { totalBytes: 9_000_000, budgetBytes: 1_000_000, overBudget: true } });
    assert.match(over[2]!.note, /over the/);

    const empty = ui.housekeepingRows({});
    assert.deepEqual(empty.map((r) => r.value), [
      'none running',
      '0 total',
      '0 B',
      'nobody right now',
      'none waiting',
    ]);
    assert.deepEqual(ui.housekeepingRows(null).length, 5, 'a panel that throws on an empty gateway is worse than one that says "none"');
  });

  await t.test('byte sizes are readable, and escaping is real', () => {
    assert.equal(ui.bytesText(512), '512 B');
    assert.equal(ui.bytesText(2048), '2.0 KB');
    assert.equal(ui.bytesText(5_242_880), '5.0 MB');
    assert.equal(ui.bytesText(3 * 1024 ** 3), '3.00 GB');
    assert.equal(ui.bytesText(-1), '');
    assert.equal(ui.boardEsc('<b title="x">&'), '&lt;b title=&quot;x&quot;&gt;&amp;');
  });
});

test('34.7 the screen is wired in: nav, view, router, containers', { concurrency: false }, async (t) => {
  await t.test('the Board view exists, is in the view list, and the menu reaches it', () => {
    assert.match(HTML, /const VIEWS = \[[^\]]*'board'[^\]]*\];/, 'VIEWS includes board');
    assert.match(HTML, /data-goto="board"/, 'the menu has a Board button');
    assert.match(HTML, /<section class="view" id="view-board" hidden>/, 'the section exists');
    assert.match(HTML, /if \(name === 'board'\) refreshBoard\(\);/, 'switching to it loads it');
    assert.match(HTML, /id="boardReload"/, 'and it can be reloaded without a page reload');
  });

  await t.test('the three containers, and the seven calls the screen makes', () => {
    for (const id of ['boardBody', 'devBody', 'sysBody']) assert.ok(HTML.includes(`id="${id}"`), `${id} exists`);
    for (const endpoint of [
      '/api/board',
      '/api/devices',
      '/api/runs/health',
      '/api/subagents',
      '/api/disk',
      '/api/presence',
      '/api/skills/proposals',
    ]) {
      assert.ok(HTML.includes(endpoint), `the panel calls ${endpoint}`);
    }
    assert.match(HTML, /\/api\/devices\/revoke/, 'revoking a device is the one write on the screen');
    assert.match(HTML, /It only reads|only reads/i, 'and the screen says so');
  });

  await t.test('every /api path in the panel is a route in the gateway', () => {
    const uiPaths = new Set<string>();
    for (const m of HTML.matchAll(/['`](\/api\/[^'`\s]*)['`]/g)) {
      uiPaths.add(((m[1] ?? '').split('?')[0] ?? '').replace(/\$\{[^}]*\}/g, '*'));
    }
    assert.ok(uiPaths.size > 40, `found ${uiPaths.size} API paths in the panel — the scan is looking at the right file`);
    const exact = new Set([...SERVER.matchAll(/pathname === '([^']+)'/g)].map((m) => m[1] ?? ''));
    const prefix = new Set([...SERVER.matchAll(/pathname\.startsWith\('([^']+)'\)/g)].map((m) => m[1] ?? ''));
    const missing = [...uiPaths].filter((p) => {
      if (exact.has(p)) return false;
      if (p.endsWith('*')) {
        const base = p.slice(0, -1);
        return ![...exact, ...prefix].some((route) => route.startsWith(base) || base.startsWith(route));
      }
      return ![...prefix].some((route) => p.startsWith(route));
    });
    assert.deepEqual(missing, [], 'a panel button pointing at a renamed route must fail here, not on the phone');
  });
});

test('34.7 a live gateway answers all seven board calls with the fields the screen reads', { concurrency: false }, async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 't347-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.gateway.token = 'test-token-347';
  config.provider.type = 'mock';
  config.provider.model = 'mock-1';
  saveConfig(config);

  const port = await freePort();
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  const get = async (p: string) => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, {
      headers: { authorization: 'Bearer test-token-347' },
    });
    assert.equal(res.status, 200, `${p} → ${res.status}`);
    return (await res.json()) as Record<string, unknown>;
  };

  try {
    const board = await get('/api/board');
    assert.ok(Array.isArray(board.cards), 'board.cards is the array the screen groups');
    assert.equal(typeof board.counts, 'object');

    const devices = (await get('/api/devices')) as { devices: { id: string }[] };
    assert.ok(Array.isArray(devices.devices));

    const runs = (await get('/api/runs/health')) as { runs: unknown[] };
    assert.ok(Array.isArray(runs.runs));

    const subagents = (await get('/api/subagents')) as { count: number; tasks: unknown[] };
    assert.equal(typeof subagents.count, 'number');
    assert.ok(Array.isArray(subagents.tasks));

    const disk = await get('/api/disk');
    assert.equal(typeof disk.totalBytes, 'number');
    assert.equal(typeof disk.byArea, 'object');

    const presence = await get('/api/presence');
    assert.equal(typeof presence.summary, 'string', 'the screen prints presence.summary as a sentence');

    const proposals = (await get('/api/skills/proposals')) as { proposals: unknown[] };
    assert.ok(Array.isArray(proposals.proposals));

    // The screen's pure functions accept exactly what the server sent.
    const rows = ui.housekeepingRows({ runs, subagents, disk, presence, proposals });
    assert.equal(rows.length, 5);
    assert.ok(!/undefined|NaN/.test(JSON.stringify(rows)), `no hole in the rendered rows: ${JSON.stringify(rows)}`);
  } finally {
    await handle.stop();
  }
});

test('34.7 the panel is documented, and the doc says what it is not', { concurrency: false }, async (t) => {
  await t.test('docs/PANEL.md lists the screens and the Board calls', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs', 'PANEL.md'), 'utf8');
    for (const screen of ['Chat', 'Status', 'Board', 'Providers', 'Models', 'Memory', 'Tools', 'Logs', 'Work', 'Settings']) {
      assert.ok(doc.includes(`**${screen}`), `${screen} is in the screen table`);
    }
    assert.match(doc, /GET \/api\/board/);
    assert.match(doc, /No component model/);
    assert.match(doc, /no build step|No build step/i);
    assert.match(doc, /extracted from the real file and executed in Node|extracted from the real\s+`ui\/index\.html`/);
  });

  await t.test('the README points at it', () => {
    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    assert.match(readme, /docs\/PANEL\.md/);
  });
});
