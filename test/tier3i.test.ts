/**
 * tier3i — batch 37: the numbers a phone user actually feels.
 *
 *   37.1 a performance budget with a test behind it: ceilings in
 *        scripts/bench.mjs, printed in the README, explained in
 *        docs/PERFORMANCE.md, and enforced here. `--budget` exits 1 when a
 *        measured number crosses its ceiling, and checkBudgets() is tested
 *        against a fabricated over-budget number so the alarm itself is known
 *        to fire.
 *
 * The rest of batch 37 (the panel showing docs freshness, the timed first run,
 * the recorded first Telegram run) is added below as it lands.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import { buildDocsSite, docsSiteFreshness, docsSitePath, ensureDocsSite } from '../src/docs/site.js';
import {
  RUN_LIMIT,
  describeTelegramRun,
  lastTelegramRuns,
  readTelegramRuns,
  recordTelegramRun,
  tokenFingerprint,
} from '../src/channels/telegram-runs.js';

/** One recorded live run, as the smoke script writes it. */
type TgRun = Parameters<typeof recordTelegramRun>[0];
/** A ceiling as the bench reports it (`scripts/bench.mjs --json`). */
type Ceiling = { key: string; max: number; why: string };

function restoreEnv(previous: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

/** The fake Bot API tier3h uses for 36.2, reused here so the same path is exercised. */
async function startStubBot(token: string): Promise<{ base: string; close: () => Promise<void> }> {
  const http = await import('node:http');
  let sentMessageId = 0;
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = JSON.parse(raw || '{}') as { offset?: number; text?: string; chat_id?: number };
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const method = url.pathname.split('/').pop();
      const answer = (result: unknown) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, result }));
      };
      if (method !== token.split(':')[1] && !url.pathname.includes(token)) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: false, description: 'Unauthorized' }));
        return;
      }
      if (method === 'getMe') answer({ id: 42, is_bot: true, first_name: 'Crab', username: 'crab_bot' });
      else if (method === 'sendMessage') {
        sentMessageId += 1;
        answer({ message_id: 500 + sentMessageId, chat: { id: body.chat_id ?? 99 }, text: body.text ?? '' });
      } else if (method === 'getUpdates') {
        const offset = Number(body.offset ?? 0);
        if (offset > 0) {
          answer([
            {
              // A different message_id from the one we sent — the script skips
              // its own message, so a reply that echoed the sent id would look
              // like nothing arrived.
              update_id: 1,
              message: { message_id: 9001, chat: { id: 99 }, from: { id: 7, username: 'owner' }, text: 'hello crab' },
            },
          ]);
        } else {
          answer([]);
        }
      } else answer({});
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function runNodeAsync(
  args: string[],
  timeout: number,
  env: Record<string, string> = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const { execFile } = await import('node:child_process');
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

/**
 * Ask a real Node process for the ceilings and for one fabricated verdict.
 * Importing bench.mjs directly would make tsc resolve a script outside the
 * test root; this also proves the module is importable by a stranger.
 */
function askBench(): { budget: Ceiling[]; over: { key: string; ok: boolean }[] } {
  const probe = `
    import('./scripts/bench.mjs').then((m) => {
      const zeroed = Object.fromEntries(Object.keys(m.BUDGETS).map((k) => [k, 0]));
      console.log(JSON.stringify({
        budget: m.checkBudgets(zeroed),
        // every metric at zero, then one pushed past its ceiling
        over: m.checkBudgets({ ...zeroed, coldStartMs: 999999 }),
      }));
    });`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', probe], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return JSON.parse(out) as { budget: Ceiling[]; over: { key: string; ok: boolean }[] };
}

const ROOT = path.resolve(import.meta.dirname, '..', '..');

function tmpHome(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ------------------------------------------------------------------- 37.1

test('37.1 the bench enforces a ceiling per number, and --budget exits 1 when one is crossed', () => {
  const { budget: ceilings, over } = askBench();
  const keys = ceilings.map((c) => c.key);
  assert.ok(keys.length >= 7, `a ceiling for every phone number, got ${keys.length}`);
  for (const wanted of ['firstRunMs', 'rebuildMs']) {
    assert.ok(keys.includes(wanted), `the first-run path is budgeted too (${wanted})`);
  }
  for (const { key, max, why } of ceilings) {
    assert.ok(Number.isFinite(max) && max > 0, `${key} has a positive ceiling`);
    assert.ok(typeof why === 'string' && why.length > 20, `${key} says why the ceiling is where it is`);
  }

  // The alarm has to fire: a number past its ceiling must be reported as over,
  // and a zeroed run must be within every ceiling.
  assert.deepEqual(over.filter((b) => !b.ok).map((b) => b.key), ['coldStartMs'], 'the over-budget metric is named');

  const home = tmpHome('t37bench-');
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, ['scripts/bench.mjs', '--quick', '--budget', '--first-run', '--json'], {
      cwd: ROOT,
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 180_000,
    });
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    code = e.status ?? 1;
    out = e.stdout ?? '';
    assert.fail(`bench --budget exited ${code}: ${e.stderr ?? ''}`);
  }
  assert.equal(code, 0, 'the measured run is within budget');
  const bench = JSON.parse(out) as Record<string, number> & {
    overBudget: string[];
    budget: { key: string; max: number }[];
  };
  assert.deepEqual(bench.overBudget, [], 'overBudget is empty on a real run');
  assert.ok(typeof bench.firstRunMs === 'number' && bench.firstRunMs > 100, 'a fresh checkout was really compiled');
  assert.ok(
    (bench.rebuildMs ?? 0) < (bench.firstRunMs ?? 0),
    `the incremental rebuild (${bench.rebuildMs} ms) is cheaper than the cold build (${bench.firstRunMs} ms)`,
  );
  assert.deepEqual(
    bench.budget.map((b) => b.key).sort(),
    [...keys].sort(),
    'the JSON reports a ceiling for every metric',
  );
  for (const { key, max } of bench.budget) {
    assert.equal(max, ceilings.find((c) => c.key === key)!.max, `${key}'s ceiling survives into the JSON`);
    assert.ok((bench as Record<string, number>)[key]! <= max, `${key} ${bench[key]} <= ${max}`);
  }
});

test("37.1 the budget is written down where a person can read it, and cannot drift from the code", () => {
  const { budget: ceilings } = askBench();
  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  for (const { key, max } of ceilings) {
    assert.ok(doc.includes(key), `docs/PERFORMANCE.md names ${key}`);
    assert.ok(doc.includes(String(max)), `docs/PERFORMANCE.md carries ${key}'s ceiling (${max})`);
  }
  assert.match(doc, /test\/tier3i\.test\.ts/, 'the doc names the test that runs it');
  assert.match(doc, /--budget/, 'and the command that enforces it');
  assert.match(doc, /never edit the ceiling/i, 'and forbids the shortcut');

  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const block = /<!-- BEGIN BENCH[\s\S]*?<!-- END BENCH -->/.exec(readme);
  assert.ok(block, 'the README keeps the generated bench block');
  assert.match(block[0], /budget \(the alarm\)/, 'the table has a budget column');
  for (const { max } of ceilings) {
    assert.ok(block[0].includes(`${max} ms`) || block[0].includes(`${max} MB`), `the README block shows the ${max} ceiling`);
  }
  assert.match(readme, /docs\/PERFORMANCE\.md/, 'and links the page that explains the ceilings');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
  assert.ok(pkg.scripts['bench:budget'], 'there is an npm script to run it');
  assert.match(pkg.scripts['bench:budget'], /--budget/);
});

// ------------------------------------------------------------------- 37.2

test('37.2 the docs page can say how fresh it is — release, age, and what changed since', async () => {
  const home = tmpHome('t37fresh-');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const root = path.join(home, 'proj');
    const docs = path.join(root, 'docs');
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'p', version: '9.9.9' }));
    fs.writeFileSync(path.join(root, 'ui'), '');
    fs.rmSync(path.join(root, 'ui'));
    fs.mkdirSync(path.join(root, 'ui'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'ui/index.html'), path.join(root, 'ui/index.html'));
    fs.writeFileSync(path.join(docs, 'ONE.md'), '# One\n\n## Alpha\n\ntext\n');
    fs.writeFileSync(path.join(docs, 'TWO.md'), '# Two\n\n## Beta\n\ntext\n');

    const opts = { root, docsDir: docs };
    ensureDocsSite({ ...opts, force: true, keep: true });

    const fresh = docsSiteFreshness(opts);
    assert.equal(fresh.exists, true, 'the page exists');
    assert.equal(fresh.docs, 2, 'and knows how many docs it holds');
    assert.equal(fresh.sections, 2, 'and how many sections');
    assert.equal(fresh.release, '9.9.9', 'and which release it describes');
    assert.equal(fresh.currentRelease, '9.9.9', 'which is the release on disk');
    assert.equal(fresh.releaseBehind, false, 'so it is not behind');
    assert.equal(fresh.staleDocs, 0, 'and nothing changed since the build');
    assert.equal(fresh.stale, false, 'so the page is fresh');
    assert.equal(fresh.age, 'just now', 'and it says so in words');
    assert.equal(fresh.kept.length, 1, 'and a per-release copy was kept');
    assert.match(fresh.kept[0]!, /docs-site-9\.9\.9\.html$/);

    // A doc edited after the build must be reported, not averaged away.
    const later = new Date(Date.now() + 5_000);
    fs.utimesSync(path.join(docs, 'TWO.md'), later, later);
    const stale = docsSiteFreshness(opts);
    assert.ok(stale.staleDocs >= 1, `the edited doc is counted, got ${stale.staleDocs}`);
    assert.equal(stale.stale, true, 'and the page is called stale');

    // A page that describes an older release is stale even with untouched files.
    const built = buildDocsSite({ ...opts, release: '0.1.0' });
    fs.writeFileSync(docsSitePath(), built.html, 'utf8');
    const behind = docsSiteFreshness(opts);
    assert.equal(behind.release, '0.1.0', 'the page says 0.1.0');
    assert.equal(behind.releaseBehind, true, 'while the project is on 9.9.9');
    assert.equal(behind.stale, true, 'so it is stale');

    // Never built: the honest answer is "not here yet", not a zero-filled page.
    fs.rmSync(docsSitePath());
    const missing = docsSiteFreshness(opts);
    assert.equal(missing.exists, false);
    assert.equal(missing.age, 'never built');
    assert.equal(missing.stale, true);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('37.2 the gateway answers with that freshness, and one POST rebuilds', async () => {
  const home = tmpHome('t37api-');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const { defaults } = await import('../src/core/config.js');
    const { startGateway } = await import('../src/gateway/server.js');
    const port = await freePort();
    const cfg = defaults();
    cfg.gateway = { host: '127.0.0.1', port, token: 'test-token-372' };
    const handle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      const auth = { authorization: 'Bearer test-token-372' };
      const before = (await (await fetch(`http://127.0.0.1:${port}/api/docs`, { headers: auth })).json()) as {
        exists: boolean;
        currentRelease: string;
        stale: boolean;
      };
      assert.equal(before.exists, false, 'nothing is built yet');
      assert.equal(before.stale, true, 'and that is not fresh');

      const rebuilt = (await (
        await fetch(`http://127.0.0.1:${port}/api/docs`, { method: 'POST', headers: auth })
      ).json()) as { ok: boolean; rebuilt: boolean; docs: number; age: string; stale: boolean };
      assert.equal(rebuilt.ok, true, 'the rebuild ran');
      assert.equal(rebuilt.rebuilt, true, 'and it really rebuilt');
      assert.ok(rebuilt.docs >= 50, `the real docs tree came back, got ${rebuilt.docs}`);
      assert.equal(rebuilt.stale, false, 'and it is fresh now');
      assert.equal(rebuilt.age, 'just now');

      const ui = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
      assert.match(ui, /d\.staleDocs/, 'the panel reads the staleness');
      assert.match(ui, /id="docsRebuild"/, 'and offers a rebuild button');
      assert.match(ui, /api\('\/api\/docs', \{ method: 'POST' \}\)/, 'which POSTs to the same route');
    } finally {
      await handle.stop();
    }
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

// ------------------------------------------------------------------- 37.4

test('37.4 a live run can be recorded: what was sent, what came back, and never the token', () => {
  const dir = tmpHome('t37runs-');
  const file = path.join(dir, 'telegram-runs.jsonl');
  const base = (over: Partial<TgRun> = {}): TgRun => ({
    at: '2026-10-04T05:00:00.000Z',
    status: 'ok',
    bot: 'crab_bot',
    api: 'api.telegram.org',
    chat: 99,
    messageId: 12,
    sent: 'smoke test',
    reply: 'hello crab',
    replyMs: 1200,
    token: tokenFingerprint('123:SECRET', 'https://api.telegram.org'),
    ...over,
  });

  assert.equal(readTelegramRuns(file).length, 0, 'no file yet reads as no runs');
  recordTelegramRun(base(), file);
  recordTelegramRun(base({ at: '2026-10-04T05:10:00.000Z', reply: 'second' }), file);

  const runs = lastTelegramRuns(5, file);
  assert.equal(runs.length, 2, 'both runs are there');
  assert.equal(runs[0]!.reply, 'second', 'newest first');
  assert.equal(runs[0]!.status, 'ok');
  assert.equal(describeTelegramRun(runs[0]!), '2026-10-04 05:10 UTC · ok · reply in 1.2 s · chat 99');
  const raw = fs.readFileSync(file, 'utf8');
  assert.ok(!raw.includes('SECRET'), 'the token is not in the evidence');
  assert.match(raw, /"token":"[0-9a-f]{8}"/, 'only a fingerprint is');
  assert.equal(
    tokenFingerprint('123:SECRET', 'https://api.telegram.org'),
    runs[0]!.token.length === 8 ? tokenFingerprint('123:SECRET', 'https://api.telegram.org') : 'x',
    'the fingerprint is stable for the same token',
  );
  assert.notEqual(tokenFingerprint('123:OTHER'), runs[0]!.token, 'and different for another token');

  // Pruning: the file holds the newest RUN_LIMIT runs, not a year of them.
  for (let i = 0; i < RUN_LIMIT + 3; i++) recordTelegramRun(base({ at: `2026-10-05T00:00:${String(i).padStart(2, '0')}.000Z` }), file);
  const pruned = readTelegramRuns(file);
  assert.equal(pruned.length, RUN_LIMIT, `pruned to ${RUN_LIMIT}`);
  assert.equal(pruned[0]!.at, `2026-10-05T00:00:${String(RUN_LIMIT + 2).padStart(2, '0')}.000Z`, 'newest kept');

  // A torn line (a phone killed mid-write) is dropped, not thrown over.
  fs.appendFileSync(file, '{"at":"2026-10-06T00:00:00.000Z","status":"o');
  assert.equal(readTelegramRuns(file).length, RUN_LIMIT, 'the torn line is simply not a run');
});

test('37.4 the smoke script records a real (stub) exchange end to end, token-free', async () => {
  const home = tmpHome('t37rec-');
  const evidence = path.join(home, 'telegram-runs.jsonl');
  const stub = await startStubBot('987654:RECORDED-TOKEN');
  const previous = { home: process.env.TCRAB_HOME, api: process.env.TCRAB_TELEGRAM_API, runs: process.env.TCRAB_TELEGRAM_RUNS };
  process.env.TCRAB_HOME = home;
  process.env.TCRAB_TELEGRAM_API = stub.base;
  process.env.TCRAB_TELEGRAM_RUNS = evidence;
  try {
    const res = await runNodeAsync(
      ['scripts/smoke-telegram.mjs', '--token', '987654:RECORDED-TOKEN', '--chat', '99', '--wait', '5', '--record'],
      60_000,
    );
    assert.equal(res.code, 0, `the recorded run exits 0: ${res.stderr}`);
    assert.match(res.stdout, /telegram smoke: recorded — \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC · ok · reply in/);
    assert.ok(!res.stdout.includes('RECORDED-TOKEN') && !res.stderr.includes('RECORDED-TOKEN'), 'token never printed');
    const runs = readTelegramRuns(evidence);
    assert.equal(runs.length, 1, 'exactly the one run is recorded');
    assert.equal(runs[0]!.status, 'ok', 'with the reply read back');
    assert.equal(runs[0]!.reply, 'hello crab');
    assert.equal(runs[0]!.chat, 99);
    assert.equal(runs[0]!.bot, 'crab_bot');
    assert.ok(typeof runs[0]!.replyMs === 'number' && runs[0]!.replyMs >= 0, 'and how long it took');
    assert.ok(!fs.readFileSync(evidence, 'utf8').includes('RECORDED-TOKEN'), 'the file never carries the token');
    assert.match(fs.readFileSync(evidence, 'utf8'), /"token":"[0-9a-f]{8}"/, 'only its fingerprint');

    // The skipped path must not record anything: a phone with no bot ran nothing.
    const skipped = await runNodeAsync(['scripts/smoke-telegram.mjs', '--record'], 60_000, { TCRAB_TELEGRAM_TOKEN: '' });
    assert.equal(skipped.code, 0, 'no token is not a failure');
    assert.match(skipped.stdout, /skipped/);
    assert.equal(readTelegramRuns(evidence).length, 1, 'and nothing was recorded');
  } finally {
    await stub.close();
    restoreEnv(previous);
  }
});

test('37.4 the panel can read the record, through the gateway', async () => {
  const home = tmpHome('t37runsapi-');
  const evidence = path.join(home, 'telegram-runs.jsonl');
  recordTelegramRun(
    {
      at: '2026-10-04T05:20:00.000Z',
      status: 'ok',
      bot: 'crab_bot',
      api: 'api.telegram.org',
      chat: 99,
      messageId: 1,
      sent: 'smoke',
      reply: 'hello crab',
      replyMs: 900,
      token: tokenFingerprint('1:2'),
    },
    evidence,
  );
  const previous = { runs: process.env.TCRAB_TELEGRAM_RUNS, home: process.env.TCRAB_HOME };
  process.env.TCRAB_TELEGRAM_RUNS = evidence;
  process.env.TCRAB_HOME = home;
  try {
    const { defaults } = await import('../src/core/config.js');
    const { startGateway } = await import('../src/gateway/server.js');
    const port = await freePort();
    const cfg = defaults();
    cfg.gateway = { host: '127.0.0.1', port, token: 'test-token-374' };
    const handle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      const auth = { authorization: 'Bearer test-token-374' };
      const body = (await (await fetch(`http://127.0.0.1:${port}/api/telegram-runs`, { headers: auth })).json()) as {
        exists: boolean;
        limit: number;
        runs: { reply: string; bot: string }[];
      };
      assert.equal(body.exists, true);
      assert.equal(body.limit, RUN_LIMIT);
      assert.equal(body.runs.length, 1);
      assert.equal(body.runs[0]!.reply, 'hello crab');
      assert.equal(body.runs[0]!.bot, 'crab_bot');

      const ui = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
      assert.match(ui, /id="tgRuns"/, 'the Work page has a place for the record');
      assert.match(ui, /api\('\/api\/telegram-runs'\)/, 'and asks for it');
      const doc = fs.readFileSync(path.join(ROOT, 'docs/CHANNELS.md'), 'utf8');
      assert.match(doc, /smoke:telegram.*--record|--record/, 'the channels doc says how a run gets recorded');
      assert.match(doc, /telegram-runs\.jsonl/, 'and names the evidence file');
    } finally {
      await handle.stop();
    }
  } finally {
    restoreEnv(previous);
  }
});

// ------------------------------------------------------------------- 38.1

test('38.1 termcrab perf measures this machine, writes the snapshot, and exits 1 when over', async () => {
  const home = tmpHome('t381perf-');
  const cli = path.join(ROOT, 'dist/src/bin/termcrab.js');
  const env = { TCRAB_HOME: home, NO_COLOR: '1' };

  const json = await runNodeAsync([cli, 'perf', '--json'], 300_000, env);
  assert.equal(json.code, 0, `perf exits 0 inside the budget: ${json.stderr}`);
  const envelope = JSON.parse(json.stdout) as {
    ok: boolean;
    command: string;
    data: {
      metrics: Record<string, number>;
      ceilings: Record<string, { max: number }>;
      over: string[];
      skipped: string[];
      machine: { node: string; platform: string; cpus: number; totalMemMb: number };
      file: string;
      source: string;
    };
  };
  assert.equal(envelope.ok, true);
  assert.equal(envelope.command, 'perf');
  assert.equal(envelope.data.source, 'checkout', 'the snapshot says where the numbers came from');
  assert.equal(Object.keys(envelope.data.ceilings).length, 7, 'all seven ceilings travel with the snapshot');
  assert.ok(Object.keys(envelope.data.metrics).length >= 5, 'and the fast half was measured');
  assert.deepEqual(envelope.data.over, [], 'nothing is over on this machine');
  assert.deepEqual(envelope.data.skipped, ['firstRunMs', 'rebuildMs'], 'the slow halves are named as not measured');
  for (const [key, value] of Object.entries(envelope.data.metrics)) {
    assert.ok(value >= 0 && value <= envelope.data.ceilings[key]!.max, `${key} ${value} is inside its ceiling`);
  }
  assert.ok(envelope.data.machine.cpus >= 1 && envelope.data.machine.totalMemMb > 100, 'the machine is recorded');
  assert.match(envelope.data.machine.node, /^v\d+/);

  const written = JSON.parse(fs.readFileSync(envelope.data.file, 'utf8')) as typeof envelope.data;
  assert.equal(written.file, undefined, 'the snapshot file itself carries no file pointer');
  assert.deepEqual(written.over, []);
  assert.equal(path.basename(envelope.data.file), 'perf.json');
  assert.equal(path.dirname(envelope.data.file), path.join(home, 'state'), 'the panel reads it from state/');

  const human = await runNodeAsync([cli, 'perf'], 300_000, env);
  assert.equal(human.code, 0, `the human view exits 0: ${human.stderr}`);
  assert.match(human.stdout, /performance budget — 5 of 7 metrics measured/);
  for (const key of Object.keys(written.ceilings)) {
    assert.ok(human.stdout.includes(key), `the table names ${key}`);
  }
  assert.match(human.stdout, /coldStartMs\s+\d+ ms of 1500 ms\s+ok/);
  assert.match(human.stdout, /inside every ceiling it measured/);
  assert.match(human.stdout, /snapshot: .*state\/perf\.json/);

  // The alarm has to fire through the command, not just inside the bench: a
  // fake bench script (the documented test hook) returns a number past its line.
  const fakeBench = path.join(home, 'fake-bench.mjs');
  fs.writeFileSync(
    fakeBench,
    `console.log(JSON.stringify({ installMs: 10, coldStartMs: 999999, idleRssMb: 5, restartMs: 5, turnMs: 5 }));\n`,
  );
  const over = await runNodeAsync([cli, 'perf', '--json'], 60_000, { ...env, TCRAB_PERF_BENCH: fakeBench });
  assert.equal(over.code, 1, 'exit 1 when a measured number is over its ceiling');
  const overEnvelope = JSON.parse(over.stdout) as { ok: boolean; data: { over: string[] } };
  assert.deepEqual(overEnvelope.data.over, ['coldStartMs'], 'and the metric is named');
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, 'state', 'perf.json'), 'utf8')).over[0], 'coldStartMs', 'the snapshot keeps the failure');

  const overHuman = await runNodeAsync([cli, 'perf'], 60_000, { ...env, TCRAB_PERF_BENCH: fakeBench });
  assert.equal(overHuman.code, 1);
  assert.match(overHuman.stdout, /OVER/, 'the table marks it');
  assert.match(overHuman.stdout, /over budget: coldStartMs/);

  // A checkout without the bench script gets one sentence, not a stack trace.
  const missing = await runNodeAsync([cli, 'perf'], 60_000, { ...env, TCRAB_PERF_BENCH: path.join(home, 'nope.mjs') });
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /no bench script at .*nope\.mjs/);
  assert.match(missing.stderr, /does not ship it/);
});

// ------------------------------------------------------------------- 38.2

test('38.2 the panel reads the last measurement — and says so when there is none', async () => {
  const home = tmpHome('t382api-');
  const previous = { home: process.env.TCRAB_HOME, runs: process.env.TCRAB_TELEGRAM_RUNS };
  process.env.TCRAB_HOME = home;
  try {
    const { perfStatus, PERF_CEILINGS } = await import('../src/core/perf.js');
    const before = perfStatus();
    assert.equal(before.exists, false, 'a home with no measurement');
    assert.equal(before.age, 'never measured');
    assert.equal(before.worst, null);
    assert.equal(before.total, Object.keys(PERF_CEILINGS).length, 'the total is the declared ceilings');
    assert.equal(before.measured, 0);

    const { defaults } = await import('../src/core/config.js');
    const { startGateway } = await import('../src/gateway/server.js');
    const port = await freePort();
    const cfg = defaults();
    cfg.gateway = { host: '127.0.0.1', port, token: 'test-token-382' };
    const handle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      const auth = { authorization: 'Bearer test-token-382' };
      const none = (await (await fetch(`http://127.0.0.1:${port}/api/perf`, { headers: auth })).json()) as {
        exists: boolean;
        age: string;
      };
      assert.equal(none.exists, false, 'the route agrees with the function');
      assert.equal(none.age, 'never measured');

      // A snapshot on disk — as `termcrab perf` writes it — is what the panel reads.
      const snapshot = {
        at: new Date(Date.now() - 65_000).toISOString(),
        source: 'checkout',
        bench: 'scripts/bench.mjs',
        machine: { node: 'v22.0.0', platform: 'linux', arch: 'arm64', cpus: 8, totalMemMb: 4096 },
        metrics: { coldStartMs: 120, idleRssMb: 70, restartMs: 140, turnMs: 90, installMs: 300 },
        ceilings: Object.fromEntries(Object.entries(PERF_CEILINGS).map(([k, c]) => [k, { max: c.max, unit: c.unit }])),
        over: [],
        skipped: ['firstRunMs', 'rebuildMs'],
      };
      fs.writeFileSync(path.join(home, 'state', 'perf.json'), JSON.stringify(snapshot));

      const now = (await (await fetch(`http://127.0.0.1:${port}/api/perf`, { headers: auth })).json()) as {
        exists: boolean;
        age: string;
        measured: number;
        total: number;
        over: string[];
        machine: { arch: string };
        worst: { key: string; pct: number };
      };
      assert.equal(now.exists, true);
      assert.equal(now.age, '1 min ago', 'the age is in words');
      assert.equal(now.measured, 5);
      assert.equal(now.total, 7);
      assert.deepEqual(now.over, []);
      assert.equal(now.machine.arch, 'arm64', 'the machine travels with the number');
      assert.equal(now.worst.key, 'idleRssMb', '54% of 130 is the furthest along');
      assert.ok(now.worst.pct >= 50 && now.worst.pct <= 60);

      const ui = fs.readFileSync(path.join(ROOT, 'ui/index.html'), 'utf8');
      assert.match(ui, /id="perfNote"/, 'the Work page has a place for it');
      assert.match(ui, /api\('\/api\/perf'\)/, 'and asks the gateway for it');
      assert.match(ui, /not measured yet — termcrab perf/, 'and says so when there is nothing to show');
      const panelDocs = fs.readFileSync(path.join(ROOT, 'docs/PANEL.md'), 'utf8');
      assert.match(panelDocs, /GET \/api\/perf/, 'the panel docs name the route');
    } finally {
      await handle.stop();
    }
  } finally {
    if (previous.home === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous.home;
    if (previous.runs === undefined) delete process.env.TCRAB_TELEGRAM_RUNS;
    else process.env.TCRAB_TELEGRAM_RUNS = previous.runs;
  }
});
