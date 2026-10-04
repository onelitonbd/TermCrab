/**
 * tier3j — batch 39: the numbers a phone feels while using it.
 *
 *   39.1 a history, not just a snapshot: every `termcrab perf` run appends to
 *        `state/perf-history.jsonl` (bounded), `perfTrend()` compares the newest
 *        run to the oldest in the window, the CLI prints the movement, the panel
 *        sees it through `GET /api/perf`, and "is it getting slower?" stops
 *        being a feeling.
 *
 * 39.2–39.5 (memory search, the docs page, the Telegram loop, the cold checkout)
 * are added below as they land.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  HISTORY_LIMIT,
  appendPerfHistory,
  describeTrend,
  perfHistoryPath,
  perfStatus,
  perfTrend,
  readPerfHistory,
} from '../src/core/perf.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist/src/bin/termcrab.js');

function tmpHome(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runNodeAsync(
  args: string[],
  timeout: number,
  env: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      { cwd: ROOT, env: { ...process.env, NO_COLOR: '1', ...env }, timeout },
      (err, stdout, stderr) => {
        resolve({ code: err ? ((err as { code?: number }).code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

/** Run any executable in any directory (npm, or the launcher itself). */
function runNodeAsyncIn(
  bin: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
  timeout: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(
      bin,
      args,
      { cwd, env: { ...process.env, ...env }, timeout },
      (err, stdout, stderr) => {
        resolve({ code: err ? ((err as { code?: number }).code ?? 1) : 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

type Snapshot = Parameters<typeof appendPerfHistory>[0];

/**
 * The suite gives every test file 60 seconds, and these measurements are
 * expensive by design (a bench run compiles, boots a gateway and runs a turn).
 * So each heavy command is run **once** and shared: three tests care about
 * different parts of the same bench output, and paying for it three times would
 * be the sort of thing this project's own budget exists to catch.
 */
let benchPromise: Promise<Record<string, number> & { budget: { key: string; max: number }[] }> | null = null;
function benchOnce() {
  benchPromise ??= runNodeAsync(['scripts/bench.mjs', '--quick', '--first-run', '--json'], 600_000).then((res) => {
    assert.equal(res.code, 0, `bench: ${res.stderr}`);
    return JSON.parse(res.stdout);
  });
  return benchPromise;
}

let perfPromise: Promise<string> | null = null;
function perfHumanOnce() {
  perfPromise ??= runNodeAsync([CLI, 'perf'], 300_000, { TCRAB_HOME: tmpHome('t39perf-') }).then((res) => {
    assert.equal(res.code, 0, `perf: ${res.stderr}`);
    return res.stdout;
  });
  return perfPromise;
}

function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    at: '2026-10-04T06:00:00.000Z',
    source: 'checkout',
    bench: 'scripts/bench.mjs',
    machine: { node: 'v22.0.0', platform: 'linux', arch: 'x64', cpus: 2, totalMemMb: 4096 },
    metrics: { coldStartMs: 120, idleRssMb: 70, turnMs: 90, installMs: 300, restartMs: 140 },
    ceilings: {},
    over: [],
    skipped: ['firstRunMs', 'rebuildMs'],
    ...over,
  };
}

// ------------------------------------------------------------------- 39.1

test('39.1 every run is appended, the file is bounded, and a torn line is not a run', () => {
  const dir = tmpHome('t391hist-');
  const file = path.join(dir, 'perf-history.jsonl');
  assert.deepEqual(readPerfHistory(10, file), [], 'no file yet reads as no runs');

  appendPerfHistory(snapshot({ at: '2026-10-04T06:00:00.000Z' }), file);
  appendPerfHistory(snapshot({ at: '2026-10-04T07:00:00.000Z', metrics: { coldStartMs: 130, idleRssMb: 72, turnMs: 95 } }), file);
  const runs = readPerfHistory(10, file);
  assert.equal(runs.length, 2, 'both runs are there');
  assert.equal(runs[0]!.at, '2026-10-04T07:00:00.000Z', 'newest first');
  assert.equal(runs[0]!.metrics.coldStartMs, 130);
  assert.deepEqual(runs[1]!.metrics.coldStartMs, 120);

  // The file is evidence, not a log that grows for a year.
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
    appendPerfHistory(snapshot({ at: `2026-10-05T00:00:${String(i % 60).padStart(2, '0')}.${String(i).padStart(3, '0')}Z` }), file);
  }
  assert.equal(readPerfHistory(Number.MAX_SAFE_INTEGER, file).length, HISTORY_LIMIT, `bounded at ${HISTORY_LIMIT}`);

  fs.appendFileSync(file, '{"at":"2026-10-06T00:00:00.000Z","metrics":{"cold');
  assert.equal(readPerfHistory(Number.MAX_SAFE_INTEGER, file).length, HISTORY_LIMIT, 'the torn line is dropped');
  assert.equal(perfHistoryPath().endsWith('perf-history.jsonl'), true, 'the default path is in the home state dir');
});

test('39.1 the trend compares newest to oldest, and knows what "flat" means', () => {
  const run = (at: string, coldStartMs: number, idleRssMb = 70): { at: string; metrics: Record<string, number>; over: string[] } => ({
    at,
    metrics: { coldStartMs, idleRssMb },
    over: [],
  });
  assert.deepEqual(perfTrend([]), [], 'one run is not a trend');
  assert.deepEqual(perfTrend([run('2026-10-04T06:00:00.000Z', 100)]), [], 'and neither is an empty window');

  const rising = perfTrend([
    run('2026-10-04T08:00:00.000Z', 150),
    run('2026-10-04T06:00:00.000Z', 100),
    run('2026-10-04T07:00:00.000Z', 120),
  ]);
  const cold = rising.find((r) => r.key === 'coldStartMs')!;
  assert.equal(cold.first, 100, 'the oldest value in the window is the baseline');
  assert.equal(cold.last, 150, 'the newest is the last');
  assert.equal(cold.delta, 50);
  assert.equal(cold.deltaPct, 50);
  assert.equal(cold.direction, 'up', 'slower is up');
  assert.equal(cold.samples, 3);
  assert.equal(cold.over, false, '150 ms is still inside the 1500 ms ceiling');

  const falling = perfTrend([run('2026-10-04T06:00:00.000Z', 200), run('2026-10-04T07:00:00.000Z', 100)]);
  assert.equal(falling.find((r) => r.key === 'coldStartMs')!.direction, 'down');
  const jitter = perfTrend([run('2026-10-04T06:00:00.000Z', 100), run('2026-10-04T07:00:00.000Z', 101)]);
  assert.equal(jitter.find((r) => r.key === 'coldStartMs')!.direction, 'flat', 'a 1% wobble is not a trend');
  const over = perfTrend([run('2026-10-04T06:00:00.000Z', 100), run('2026-10-04T07:00:00.000Z', 5000)]);
  assert.equal(over.find((r) => r.key === 'coldStartMs')!.over, true, 'and crossing the ceiling is marked');

  const lines = describeTrend(rising);
  assert.ok(lines.some((l) => /coldStartMs\s+↑ 50%\s+over 3 run\(s\)/.test(l)), `the line reads: ${lines.join(' | ')}`);
});

test('39.1 the CLI records the run and prints the movement; the series is where the panel looks', async () => {
  const home = tmpHome('t391cli-');
  // A seeded history (the documented env override, which is also how a phone can
  // keep the series somewhere else) plus one real run: the command must append,
  // and it must print the movement without being asked twice.
  const history = path.join(home, 'seeded-history.jsonl');
  fs.writeFileSync(
    history,
    [
      JSON.stringify({ at: '2026-10-01T10:00:00.000Z', metrics: { coldStartMs: 100 }, over: [] }),
      JSON.stringify({ at: '2026-10-02T10:00:00.000Z', metrics: { coldStartMs: 300 }, over: [] }),
    ].join('\n') + '\n',
  );
  const env = { TCRAB_HOME: home, NO_COLOR: '1', TCRAB_PERF_HISTORY: history };
  const run = await runNodeAsync([CLI, 'perf'], 300_000, env);
  assert.equal(run.code, 0, `perf: ${run.stderr}`);
  assert.match(run.stdout, /history: .*seeded-history\.jsonl \(3 run\(s\)\)/, 'the run was appended to the series');
  assert.match(run.stdout, /trend \(first → newest in the recorded window\):/, 'and the movement is printed');
  assert.match(run.stdout, /coldStartMs\s+↑ \d+%\s+over 3 run\(s\) \(100 ms → \d+ ms\)/, 'with the oldest and newest values');

  const runs = readPerfHistory(Number.MAX_SAFE_INTEGER, history);
  assert.equal(runs.length, 3, 'three runs are on disk');
  assert.ok(
    Date.parse(runs[0]!.at) > Date.parse('2026-10-02T10:00:00.000Z'),
    'and the newest is the one this command just made',
  );
  const file = JSON.parse(
    fs.readFileSync(path.join(home, 'state', 'perf.json'), 'utf8'),
  ) as { metrics: Record<string, number> };
  assert.equal(runs[0]!.metrics.coldStartMs, file.metrics.coldStartMs, 'the history line matches the snapshot');
});

test('39.1 the panel sees the trend through the gateway, and reads it in the markup', async () => {
  const home = tmpHome('t391api-');
  const history = path.join(home, 'perf-history.jsonl');
  const previous = { home: process.env.TCRAB_HOME, history: process.env.TCRAB_PERF_HISTORY };
  process.env.TCRAB_HOME = home;
  process.env.TCRAB_PERF_HISTORY = history;
  try {
    const { defaults } = await import('../src/core/config.js');
    const { startGateway } = await import('../src/gateway/server.js');
    const port = await freePort();
    const cfg = defaults();
    cfg.gateway = { host: '127.0.0.1', port, token: 'test-token-391' };
    // A snapshot and a history, as if two runs had happened.
    fs.mkdirSync(path.join(home, 'state'), { recursive: true });
    fs.writeFileSync(
      path.join(home, 'state', 'perf.json'),
      JSON.stringify({
        at: new Date().toISOString(),
        source: 'checkout',
        bench: 'scripts/bench.mjs',
        machine: { node: 'v22.0.0', platform: 'linux', arch: 'x64', cpus: 2, totalMemMb: 4096 },
        metrics: { coldStartMs: 130, idleRssMb: 71, turnMs: 90 },
        ceilings: {},
        over: [],
        skipped: [],
      }),
    );
    fs.writeFileSync(
      history,
      [
        JSON.stringify({ at: '2026-10-01T10:00:00.000Z', metrics: { coldStartMs: 100, idleRssMb: 60, turnMs: 80 }, over: [] }),
        JSON.stringify({ at: '2026-10-03T10:00:00.000Z', metrics: { coldStartMs: 140, idleRssMb: 64, turnMs: 100 }, over: ['turnMs'] }),
      ].join('\n') + '\n',
    );

    const status = perfStatus();
    assert.equal(status.runs, 2);
    assert.equal(status.lastOverAt, '2026-10-03T10:00:00.000Z', 'the newest run that was over is named');
    assert.ok(status.trend.length >= 3);
    assert.equal(status.trend[0]!.key, 'coldStartMs', 'the biggest move sorts first');

    const handle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      const body = (await (
        await fetch(`http://127.0.0.1:${port}/api/perf`, { headers: { authorization: 'Bearer test-token-391' } })
      ).json()) as { runs: number; trend: { key: string; direction: string }[]; lastOverAt: string };
      assert.equal(body.runs, 2, 'the route carries the series');
      assert.ok(body.trend.some((r) => r.key === 'coldStartMs' && r.direction === 'up'));
      assert.equal(body.lastOverAt, '2026-10-03T10:00:00.000Z');
    } finally {
      await handle.stop();
    }

    const ui = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
    assert.match(ui, /p\.trend/, 'the panel reads the trend');
    assert.match(ui, /steady over ' \+ p\.runs \+ ' runs/, 'and says steady when nothing moved');
    const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
    assert.match(doc, /perf-history\.jsonl/, 'the budget doc names the history file');
  } finally {
    if (previous.home === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous.home;
    if (previous.history === undefined) delete process.env.TCRAB_PERF_HISTORY;
    else process.env.TCRAB_PERF_HISTORY = previous.history;
  }
});

// ------------------------------------------------------------------- 39.2

test('39.2 one memory search over 10 000 vectors is measured, budgeted, and stays a scan', async () => {
  const { PERF_CEILINGS } = await import('../src/core/perf.js');
  const search = (PERF_CEILINGS as Record<string, { max: number; unit: string; why: string }>).searchMs;
  assert.ok(search, 'searchMs has a ceiling');
  assert.equal(search.unit, 'ms');
  assert.ok(search.max >= 50 && search.max <= 2_000, `the ceiling is a real duration, got ${search.max}`);
  assert.ok(search.why.length > 20, 'and says why it is where it is');

  const { EmbeddingIndex } = await import('../src/agent/embed.js');
  const dim = 384;
  const vecFor = (text: string): number[] => {
    const v = new Array(dim).fill(0);
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    for (let i = 0; i < dim; i++) {
      h ^= h << 13;
      h ^= h >>> 17;
      h ^= h << 5;
      v[i] = ((h >>> 0) / 4294967296) * 2 - 1;
    }
    return v;
  };
  const embedder = { embed: async (texts: string[]) => texts.map(vecFor) } as unknown as ConstructorParameters<typeof EmbeddingIndex>[1];

  const dir = tmpHome('t392idx-');
  const file = path.join(dir, 'index.jsonl');
  const rows: string[] = [];
  for (let i = 0; i < 10_000; i++) {
    const text = `memory row ${i} about battery and charging habits`;
    rows.push(JSON.stringify({ id: `m${i}`, text, vec: vecFor(text), provider: 'probe', model: 'deterministic' }));
  }
  fs.writeFileSync(file, `${rows.join('\n')}\n`);
  const index = new EmbeddingIndex(file, embedder);
  assert.equal(index.size(), 10_000, 'a real 10 000-row index loads');

  const times: number[] = [];
  let top: { id: string; score: number } | undefined;
  for (let i = 0; i < 7; i++) {
    const query = `memory row ${i * 137} about battery and charging habits`;
    const started = performance.now();
    const hits = await index.search(query, 5);
    times.push(performance.now() - started);
    assert.ok(hits.length > 0, 'the search finds its own row');
    if (i === 0) top = hits[0];
  }
  const median = [...times].sort((a, b) => a - b)[Math.floor(times.length / 2)]!;
  assert.equal(top!.id, 'm0', 'and the top hit is the queried row');
  assert.ok(median < search.max, `the median search (${median.toFixed(2)} ms) is inside its ceiling (${search.max} ms)`);

  // The bench reports the same number, from the same code path.
  const measured = await benchOnce();
  assert.ok(typeof measured.searchMs === 'number' && measured.searchMs! > 0, 'the bench measures a memory search');
  assert.ok(measured.searchMs! <= search.max, `and it is inside the ceiling (${measured.searchMs} ms)`);
  assert.equal(measured.budget.find((b) => b.key === 'searchMs')!.max, search.max, 'the bench reports the same ceiling');

  // The command sees it too.
  const human = await perfHumanOnce();
  assert.match(human, /searchMs\s+\d+(\.\d+)? ms of 200 ms\s+ok/, 'termcrab perf prints the search next to its ceiling');

  // The docs carry the ceiling and the reason.
  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  assert.match(doc, /searchMs/, 'docs/PERFORMANCE.md names the metric');
  assert.ok(doc.includes(String(search.max)), 'and its ceiling');
  assert.match(doc, /not a remote embedder's latency/, 'and says what it does not claim');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /one memory search over 10,000 vectors/, 'the README table has the row');
});

// ------------------------------------------------------------------- 39.3

test('39.3 the docs page has a budget: build time and the file a phone has to hold', async () => {
  const { PERF_CEILINGS } = await import('../src/core/perf.js');
  const ceilings = PERF_CEILINGS as Record<string, { max: number; unit: string; why: string }>;
  assert.ok(ceilings.docsMs && ceilings.docsMs.max >= 200, 'docsMs has a real ceiling');
  assert.equal(ceilings.docsMs.unit, 'ms');
  assert.ok(ceilings.docsKb && ceilings.docsKb.max >= 1_000, 'docsKb has a real ceiling');
  assert.equal(ceilings.docsKb.unit, 'KB', 'the page size is budgeted in kilobytes, not milliseconds');

  const { buildDocsSite } = await import('../src/docs/site.js');
  let best = Number.POSITIVE_INFINITY;
  let built: { bytes: number; docs: unknown[] } | null = null;
  for (let i = 0; i < 3; i++) {
    const started = performance.now();
    const site = buildDocsSite({});
    best = Math.min(best, performance.now() - started);
    built = site as unknown as { bytes: number; docs: unknown[] };
  }
  const kb = Math.round(built!.bytes / 1024);
  assert.ok(kb > 100, `the page holds real docs, got ${kb} KB`);
  assert.ok(kb <= ceilings.docsKb!.max, `the built page (${kb} KB) is inside its ceiling (${ceilings.docsKb!.max} KB)`);
  assert.ok(best <= ceilings.docsMs!.max, `the build (${best.toFixed(1)} ms) is inside its ceiling (${ceilings.docsMs!.max} ms)`);

  const measured = await benchOnce();
  assert.ok(typeof measured.docsMs === 'number' && measured.docsMs! > 0, 'the bench measures the docs build');
  assert.ok(typeof measured.docsKb === 'number' && measured.docsKb! > 100, 'and the page size');
  assert.ok(measured.docsKb! <= ceilings.docsKb!.max, 'inside the ceiling');
  assert.equal(measured.budget.find((b) => b.key === 'docsKb')!.max, ceilings.docsKb!.max, 'same ceiling as the code');

  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  for (const key of ['docsMs', 'docsKb']) {
    assert.ok(doc.includes(key), `docs/PERFORMANCE.md names ${key}`);
    assert.ok(doc.includes(String(ceilings[key]!.max)), `and its ceiling (${ceilings[key]!.max})`);
  }
  assert.match(doc, /docs\/openclaw\/data`?\s*\n?\s*is excluded|openclaw\/data/, 'and points at the exclusion that keeps the page small');

  const human = await perfHumanOnce();
  assert.match(human, /docsMs\s+\d+(\.\d+)? ms of 1500 ms\s+ok/);
  assert.match(human, /docsKb\s+\d+ KB of 4000 KB\s+ok/);
});

// ------------------------------------------------------------------- 39.4

test('39.4 the loops a phone feels have ceilings, and the bench measures them in a throwaway home', async () => {
  const { PERF_CEILINGS } = await import('../src/core/perf.js');
  const ceilings = PERF_CEILINGS as Record<string, { max: number; unit: string; why: string }>;
  for (const key of ['roomWriteMs', 'outboxDrainMs', 'telegramPollMs']) {
    assert.ok(ceilings[key], `${key} has a ceiling`);
    assert.equal(ceilings[key]!.unit, 'ms');
    assert.ok(ceilings[key]!.max >= 500, `${key}'s ceiling is a real duration`);
    assert.ok(ceilings[key]!.why.length > 30, `${key} says why`);
  }

  // The room log is bounded — the property the ceiling protects.
  const home = tmpHome('t394room-');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const { ROOM_MAX_MESSAGES, recordRoomMessage, roomInfo } = await import('../src/channels/rooms.js');
    const started = performance.now();
    for (let i = 0; i < ROOM_MAX_MESSAGES + 50; i++) {
      recordRoomMessage({ channel: 'telegram', room: 'group-1', from: 'user', text: `message ${i}`, addressed: false });
    }
    const ms = performance.now() - started;
    const info = roomInfo('telegram', 'group-1');
    assert.ok(info.messages <= ROOM_MAX_MESSAGES, `the room stays bounded, got ${info.messages}`);
    assert.ok(ms < ceilings.roomWriteMs!.max * 3, `250 appends cost ${ms.toFixed(0)} ms over the ceiling's order`);

    const { outboxPush, outboxPending, outboxMarkSending, outboxAck, outboxSweep } = await import('../src/mobile/outbox.js');
    const outboxStarted = performance.now();
    for (let i = 0; i < 200; i++) outboxPush({ channel: 'telegram', chatId: 1, text: `owed ${i}` });
    const pending = outboxPending('telegram', { staleMs: 0 });
    assert.equal(pending.length, 200, 'a queue of 200 is owed');
    for (const item of pending) {
      outboxMarkSending(item.id);
      outboxAck(item.id);
    }
    assert.equal(outboxSweep(0), 200, 'and the sweep forgets the ones that were sent');
    assert.equal(outboxPending('telegram', { staleMs: 0 }).length, 0, 'the queue is empty');
    const outboxMs = performance.now() - outboxStarted;
    assert.ok(outboxMs < ceilings.outboxDrainMs!.max, `the drain (${outboxMs.toFixed(0)} ms) is inside its ceiling`);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }

  // The bench reports all three, in its own temp home.
  const measured = await benchOnce();
  for (const key of ['roomWriteMs', 'outboxDrainMs', 'telegramPollMs']) {
    assert.ok(typeof measured[key] === 'number' && measured[key]! > 0, `the bench measures ${key}`);
    assert.ok(measured[key]! <= ceilings[key]!.max, `${key} (${measured[key]}) is inside its ceiling`);
    assert.equal(measured.budget.find((b) => b.key === key)!.max, ceilings[key]!.max, `${key}'s ceiling matches the code`);
  }

  const human = await perfHumanOnce();
  assert.match(human, /roomWriteMs\s+\d+(\.\d+)? ms of 1500 ms\s+ok/);
  assert.match(human, /outboxDrainMs\s+\d+(\.\d+)? ms of 1500 ms\s+ok/);
  assert.match(human, /telegramPollMs\s+\d+(\.\d+)? ms of 2000 ms\s+ok/);

  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  assert.match(doc, /The loops a phone feels \(39\.4\)/, 'the doc explains them');
  for (const key of ['roomWriteMs', 'outboxDrainMs', 'telegramPollMs']) assert.ok(doc.includes(key), `the doc names ${key}`);
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /a chatty group: 200 messages into one room/, 'the README table carries the rows');
});

// ------------------------------------------------------------------- 39.5

test('39.5 a cold checkout is measured from nothing: empty cache, no node_modules, install to first answer', async () => {
  const { PERF_CEILINGS } = await import('../src/core/perf.js');
  const ceilings = PERF_CEILINGS as Record<string, { max: number; unit: string; why: string }>;
  for (const key of ['coldInstallMs', 'coldCheckoutMs']) {
    assert.ok(ceilings[key], `${key} has a ceiling`);
    assert.equal(ceilings[key]!.unit, 'ms');
    assert.ok(ceilings[key]!.max >= 30_000, `${key} allows for a phone, got ${ceilings[key]!.max}`);
    assert.ok(ceilings[key]!.why.length > 40, `${key} says why`);
  }
  assert.ok(
    ceilings.coldCheckoutMs!.max > ceilings.coldInstallMs!.max,
    'the end-to-end ceiling is larger than the install alone',
  );

  // The real thing, in the small: a copy with no node_modules and an isolated
  // cache, then npm install and the launcher. Slow by test standards (~8 s) and
  // worth every millisecond of it: this is the one path nobody can retry.
  const dir = tmpHome('t395cold-');
  const cache = tmpHome('t395cache-');
  for (const item of ['src', 'ui', 'test/fixtures', 'scripts', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.test.json', 'termcrab']) {
    fs.cpSync(path.join(ROOT, item), path.join(dir, item), { recursive: true });
  }
  fs.chmodSync(path.join(dir, 'termcrab'), 0o755);
  const env = { TCRAB_HOME: tmpHome('t395home-'), NO_COLOR: '1', npm_config_cache: cache, npm_config_update_notifier: 'false' };
  const installStarted = performance.now();
  const install = await runNodeAsyncIn(
    'npm',
    ['install', '--no-fund', '--no-audit'],
    dir,
    env,
    300_000,
  );
  const installMs = performance.now() - installStarted;
  assert.equal(install.code, 0, `npm install from an empty cache: ${install.stderr}`);
  assert.ok(fs.existsSync(path.join(dir, 'node_modules', 'typescript')), 'the dev packages really arrived');

  const version = await runNodeAsyncIn(path.join(dir, 'termcrab'), ['version'], dir, env, 300_000);
  const totalMs = performance.now() - installStarted;
  assert.equal(version.code, 0, `./termcrab version after a cold install: ${version.stderr}`);
  assert.match(version.stdout, /termcrab \d+\.\d+\.\d+ \(node v/, 'the cold checkout answers');
  assert.ok(fs.existsSync(path.join(dir, 'dist/src/bin/termcrab.js')), 'and compiled itself on the way');
  assert.ok(installMs < ceilings.coldInstallMs!.max, `install (${Math.round(installMs)} ms) is inside its ceiling`);
  assert.ok(totalMs < ceilings.coldCheckoutMs!.max, `the whole first contact (${Math.round(totalMs)} ms) is inside its ceiling`);

  // The bench reports both when asked for the slow half.
  const measured = await benchOnce();
  for (const key of ['coldInstallMs', 'coldCheckoutMs']) {
    assert.ok(typeof measured[key] === 'number' && measured[key]! > 10, `the bench measures ${key}`);
    assert.ok(measured[key]! <= ceilings[key]!.max, `${key} (${measured[key]}) is inside its ceiling`);
    assert.equal(measured.budget.find((b) => b.key === key)!.max, ceilings[key]!.max, `${key}'s ceiling matches the code`);
  }
  assert.ok(measured.coldCheckoutMs! >= measured.coldInstallMs!, 'the total includes the install');

  // And the fast command says the slow halves were not measured, rather than zero.
  const human = await perfHumanOnce();
  assert.match(human, /coldInstallMs\s+not measured in this run/, 'the fast run says so instead of zero');
  assert.match(human, /add --full/, 'and names the flag that measures them');

  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  assert.match(doc, /The cold checkout, from nothing \(39\.5\)/, 'the doc explains it');
  assert.match(doc, /isolated npm cache/, 'and says the cache is isolated, so the number is honest');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /a cold checkout, end to end/, 'the README table carries the row');
});
