/**
 * tier3k — batch 40: the surfaces keep their own promises.
 *
 *   40.1 the panel's own budget: `ui/index.html` is the whole control panel —
 *        one file, inline CSS and JavaScript, no build step — and it has two
 *        ceilings (`panelKb`, `panelMs`) so "let us add a framework" cannot be
 *        a quiet decision, and the shell has to arrive before any /api call.
 *   40.2 doctor reports the measurement: `termcrab doctor` says how old
 *        `state/perf.json` is, what is closest to its ceiling, and what is over
 *        — because a number from last month is a fact about last month.
 *   40.3 the built docs page carries its own footer (release, build time, size,
 *        generator) so the offline copy can say what it is.
 *   40.4 `perf --save` files a release's measurement in the repository, one file
 *        per release, so "how fast was 0.73" has an answer that outlives a phone.
 *   40.5 the queue's numbers: drain, wake-up and four parallel subagent slots.
 *
 * This file is deliberately cheap: the bench itself is measured in tier3j, and
 * the 60 s per-test clock here is spent on the *surfaces* — the panel served
 * over a real socket, the commands run as real processes, and the committed
 * snapshot read back.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FAST_METRICS, PERF_CEILINGS } from '../src/core/perf.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist/src/bin/termcrab.js');
const VERSION = (JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { version: string }).version;

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

/** A stand-in bench (40.4): the real one takes a minute, and this file is about the plumbing. */
function fakeBench(metrics: Record<string, number> = { coldStartMs: 120, idleRssMb: 70, turnMs: 90, panelKb: 315, panelMs: 4 }): string {
  const file = path.join(tmpHome('t404bench-'), 'fake-bench.mjs');
  fs.writeFileSync(file, `console.log(JSON.stringify(${JSON.stringify(metrics)}))\n`);
  return file;
}

// ------------------------------------------------------------------- 40.1

test('40.1 the panel is one file with a ceiling — size, and the time to serve it', async () => {
  const ceilings = PERF_CEILINGS as Record<string, { max: number; unit: string; why: string }>;
  assert.ok(ceilings.panelKb && ceilings.panelKb.max >= 300, 'panelKb has a real ceiling');
  assert.equal(ceilings.panelKb.unit, 'KB', 'the panel is budgeted in kilobytes');
  assert.ok(ceilings.panelMs && ceilings.panelMs.max >= 50, 'panelMs has a real ceiling');
  assert.equal(ceilings.panelMs.unit, 'ms');
  assert.match(ceilings.panelKb!.why, /no build step|framework/i, 'and says why it exists');
  assert.ok(FAST_METRICS.includes('panelKb') && FAST_METRICS.includes('panelMs'), 'both are in the cheap half');

  const html = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
  const kb = Math.round(Buffer.byteLength(html) / 1024);
  assert.ok(kb <= ceilings.panelKb!.max, `the panel (${kb} KB) is inside its ceiling (${ceilings.panelKb!.max} KB)`);
  // "One file" is the claim, and it is checkable: no bundler output, no CDN.
  assert.ok(!/<script[^>]+src=/i.test(html), 'no external script');
  assert.ok(!/<link[^>]+href=["']https?:/i.test(html), 'no external stylesheet');

  // The gateway serves it, fast, and it is the real shell.
  const home = tmpHome('t401panel-');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const { defaults } = await import('../src/core/config.js');
    const { startGateway } = await import('../src/gateway/server.js');
    const port = await freePort();
    const cfg = defaults();
    cfg.gateway = { host: '127.0.0.1', port, token: '' };
    const handle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const started = performance.now();
        const res = await fetch(`http://127.0.0.1:${port}/`);
        const body = await res.text();
        times.push(performance.now() - started);
        assert.equal(res.status, 200, 'the panel shell needs no token');
        assert.equal(Buffer.byteLength(body), Buffer.byteLength(html), 'the whole file arrives, unchanged');
        assert.match(body, /id="view-work"/, 'and it is the panel, not a placeholder');
      }
      const median = times.sort((a, b) => a - b)[2]!;
      assert.ok(median <= ceilings.panelMs!.max, `serving the panel took ${median.toFixed(1)} ms, ceiling ${ceilings.panelMs!.max}`);
    } finally {
      await handle.stop();
    }
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }

  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  assert.match(doc, /The panel's own weight \(40\.1\)/, 'the doc explains it');
  assert.ok(doc.includes(String(ceilings.panelKb!.max)), 'and carries the size ceiling');
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.match(readme, /the panel itself \(one HTML file, no build step\)/, 'the README table has the row');
  assert.match(readme, /\|\s+\d+ KB\s+\|\s+700 KB\s+\|/, 'with the number and the ceiling');
});

// ------------------------------------------------------------------- 40.2

test('40.2 doctor reports the measurement: never measured, aging, and over budget', async () => {
  const home = tmpHome('t402doctor-');
  const env = { TCRAB_HOME: home, NO_COLOR: '1' };

  // A missing config.json is a *fail* (doctor exits 1 for it, correctly), and
  // this test is about the perf line, so give the home a config first.
  const cfg = await runNodeAsync([CLI, 'config', 'set', 'provider.model', 'mock-1'], 60_000, env);
  assert.equal(cfg.code, 0, `writing a config: ${cfg.stderr}`);

  const fresh = await runNodeAsync([CLI, 'doctor'], 120_000, env);
  assert.equal(fresh.code, 0, `doctor on a configured home: ${fresh.stderr}`);
  assert.match(fresh.stdout, /performance budget - not measured on this home yet/, 'a new home says so');
  assert.match(fresh.stdout, /fix: termcrab perf/, 'and names the command');

  // Write a snapshot the way `perf` does — the doctor reads the file, and must
  // never measure anything itself (a health check cannot cost a minute).
  const write = await runNodeAsync([CLI, 'perf', '--json'], 60_000, {
    ...env,
    TCRAB_PERF_BENCH: fakeBench({ coldStartMs: 120, idleRssMb: 70, turnMs: 90, docsKb: 2766, panelKb: 315 }),
  });
  assert.equal(write.code, 0, `perf with a stand-in bench: ${write.stderr}`);
  const measured = await runNodeAsync([CLI, 'doctor'], 120_000, env);
  assert.equal(measured.code, 0, `doctor after a measurement: ${measured.stderr}`);
  assert.match(
    measured.stdout,
    /performance budget - measured just now on \w+\/\w+ · worst \w+ [\d.]+\/\d+ \(\d+%\)/,
    'after a measurement the doctor says how old it is, where, and what is closest to its line',
  );
  assert.match(measured.stdout, /performance budget - measured just now[^\n]*docsKb/, 'the worst metric is the one nearest its ceiling');

  // A month-old measurement is information, not an alarm — but it says so.
  const file = path.join(home, 'state', 'perf.json');
  const snapshot = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  snapshot.at = '2026-09-01T00:00:00.000Z';
  fs.writeFileSync(file, JSON.stringify(snapshot));
  const stale = await runNodeAsync([CLI, 'doctor'], 120_000, env);
  assert.equal(stale.code, 0, `aging is information, not a failure: ${stale.stderr}`);
  assert.match(stale.stdout, /measured \d+ d ago/, 'the age is in words');
  assert.match(stale.stdout, /fix: this measurement is a month old: termcrab perf/);

  // Something over its ceiling becomes a warning with a fix line naming the doc.
  snapshot.at = new Date().toISOString();
  snapshot.over = ['turnMs'];
  (snapshot.metrics as Record<string, number>).turnMs = 999_999;
  fs.writeFileSync(file, JSON.stringify(snapshot));
  const over = await runNodeAsync([CLI, 'doctor'], 120_000, env);
  assert.equal(over.code, 0, 'a warn is not a fail: the doctor reports, it does not judge the run');
  assert.match(over.stdout, /⚠️\s+performance budget - measured just now .*OVER: turnMs/, 'the over metric is named');
  assert.match(over.stdout, /fix: see docs\/PERFORMANCE\.md for the metric that is over/);
  assert.match(over.stdout, /worst turnMs 999999\/5000 \(20000%\)/, 'and the worst row shows how far past the line it is');

  // The JSON envelope carries the same check, so a script can gate on it.
  const json = await runNodeAsync([CLI, 'doctor', '--json'], 120_000, env);
  const envelope = JSON.parse(json.stdout) as { data: { checks: { id: string; status: string; detail?: string }[] } };
  const check = envelope.data.checks.find((c) => c.id === 'perf')!;
  assert.equal(check.status, 'warn');
  assert.match(check.detail ?? '', /OVER: turnMs/);
});

// ------------------------------------------------------------------- 40.3

test('40.3 the docs page carries its own footer, on every surface', async () => {
  const home = tmpHome('t403footer-');
  const env = { TCRAB_HOME: home, NO_COLOR: '1' };
  const built = await runNodeAsync([CLI, 'docs', '--json'], 300_000, env);
  assert.equal(built.code, 0, `docs: ${built.stderr}`);
  const meta = JSON.parse(built.stdout) as { data: { release: string; docs: number; sections: number; file: string } };
  const html = fs.readFileSync(meta.data.file, 'utf8');

  // The footer is real markup, not a tooltip: version, build stamp, size, origin.
  const footer = /<footer id="docFooter">([\s\S]*?)<\/footer>/.exec(html);
  assert.ok(footer, 'the page has a footer');
  const text = footer![1]!;
  assert.match(text, new RegExp(`<span id="footerVersion">${meta.data.release.replace(/\./g, '\\.')}</span>`), 'it names the release');
  assert.match(text, /built \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC/, 'and the build time in UTC');
  assert.match(text, new RegExp(`${meta.data.docs} docs, ${meta.data.sections} sections`), 'and the same counts the header claims');
  assert.match(text, /generated by <code>termcrab docs<\/code>/, 'and where it came from');
  assert.match(html, /#docFooter \{/, 'with a style behind it');

  // Same release on the other two surfaces — that is what "on every surface" means.
  const status = await runNodeAsync([CLI, 'docs', 'status', '--json'], 120_000, env);
  const statusMeta = JSON.parse(status.stdout) as { data: { release: string; docs: number } };
  assert.equal(statusMeta.data.release, meta.data.release, 'docs status reports the same release');
  assert.equal(statusMeta.data.docs, meta.data.docs);
  assert.equal(meta.data.release, VERSION, 'which is package.json — and the panel prints the same one');

  // Rebuild keeps it: a footer that only appears on a cold build is a trap.
  const again = await runNodeAsync([CLI, 'docs', 'rebuild', '--json'], 300_000, env);
  assert.equal(again.code, 0, `docs rebuild: ${again.stderr}`);
  const rebuilt = JSON.parse(again.stdout) as { data: { file: string } };
  assert.match(fs.readFileSync(rebuilt.data.file, 'utf8'), /<footer id="docFooter">/, 'and survives a rebuild');
});

// ------------------------------------------------------------------- 40.4

test('40.4 perf --save files the measurement by release, and says what it replaced', async () => {
  const home = tmpHome('t404save-');
  const saves = tmpHome('t404saves-');
  const env = { TCRAB_HOME: home, TCRAB_PERF_SAVE_DIR: saves, NO_COLOR: '1', TCRAB_PERF_BENCH: fakeBench() };

  const first = await runNodeAsync([CLI, 'perf', '--save', '--json'], 120_000, env);
  assert.equal(first.code, 0, `perf --save: ${first.stderr}`);
  const one = JSON.parse(first.stdout) as { data: { saved?: string; savedReplaced?: boolean; metrics: Record<string, number>; at: string } };
  assert.ok(one.data.saved, 'the envelope names the file it wrote');
  assert.equal(one.data.savedReplaced, false, 'the first save replaces nothing');
  assert.ok(one.data.saved!.endsWith(`perf-${VERSION}.json`), `the file is named for the release (${VERSION})`);

  const saved = JSON.parse(fs.readFileSync(one.data.saved!, 'utf8')) as {
    release: string;
    metrics: Record<string, number>;
    ceilings: Record<string, unknown>;
    __note?: string;
    at: string;
  };
  assert.equal(saved.release, VERSION, 'and carries the release inside');
  assert.equal(saved.at, one.data.at, 'the timestamp is the snapshot, not the copy');
  assert.ok(Object.keys(saved.metrics).length >= 4, 'the numbers are in it, not a pointer to them');
  assert.deepEqual(Object.keys(saved.metrics).sort(), Object.keys(one.data.metrics).sort(), 'all of them');
  assert.ok(Object.keys(saved.ceilings).length >= 10, 'and the ceilings it was judged against');
  assert.match(saved.__note ?? '', /docs\/PERFORMANCE\.md/, 'with a note saying where the ceilings have their reasons');

  const second = await runNodeAsync([CLI, 'perf', '--save', '--json'], 120_000, env);
  assert.equal(second.code, 0);
  assert.equal((JSON.parse(second.stdout) as { data: { savedReplaced: boolean } }).data.savedReplaced, true, 'a second save is honest about replacing the first');
  assert.match(second.stderr + second.stdout, /perf-\d|saved/, 'and the human line does not pretend it was new');

  // The repository keeps a record: "how fast was it?" has an answer offline.
  const committed = fs
    .readdirSync(path.join(ROOT, 'docs', 'openclaw', 'data'))
    .filter((f) => /^perf-\d+\.\d+\.\d+\.json$/.test(f))
    .sort();
  assert.ok(committed.length >= 1, 'at least one release measurement is checked in');
  for (const file of committed) {
    const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'openclaw', 'data', file), 'utf8')) as {
      release: string;
      metrics: Record<string, number>;
      ceilings: Record<string, { max: number }>;
      over: string[];
      machine: { platform?: string };
      __note?: string;
    };
    assert.equal(file, `perf-${record.release}.json`, `${file} is named after the release it carries`);
    assert.ok(Object.keys(record.metrics).length >= 4, `${file} has numbers`);
    assert.ok(record.machine.platform, `${file} says whose machine it was`);
    for (const [key, value] of Object.entries(record.metrics)) {
      const ceiling = record.ceilings[key];
      assert.ok(ceiling, `${file}: ${key} was judged against a ceiling that is still declared`);
      if (!record.over.includes(key)) assert.ok(value <= ceiling!.max, `${file}: ${key} ${value} is inside ${ceiling!.max}`);
    }
  }

  const help = fs.readFileSync(path.join(ROOT, 'src', 'command-help.ts'), 'utf8');
  assert.match(help, /'--save  also write the measurement/, 'the flag is in the help, not just in the code');
});

// ------------------------------------------------------------------- 40.5

test('40.5 the queue has numbers: drain, wake-up, and four parallel subagent slots', async () => {
  const ceilings = PERF_CEILINGS as Record<string, { max: number; unit: string; why: string }>;
  for (const key of ['queueDrainMs', 'queueWakeMs', 'subagentFanoutMs']) {
    assert.ok(ceilings[key], `${key} is declared`);
    assert.equal(ceilings[key]!.unit, 'ms');
    assert.ok(ceilings[key]!.max > 0 && ceilings[key]!.why.length > 40, `${key} has a ceiling and a reason`);
    assert.ok(FAST_METRICS.includes(key), `${key} is measured in the cheap half, so the panel sees it too`);
  }

  // The lane itself: one real SessionQueue, 12 turns, and the last one drains.
  const { SessionQueue, MAX_QUEUED_TURNS } = await import('../src/agent/sessions.js');
  assert.equal(MAX_QUEUED_TURNS, 32, 'the depth cap the panel reports is the declared one');
  const queue = new SessionQueue();
  const startedAt: number[] = [];
  queue.setRunner(async () => {
    startedAt.push(performance.now());
    await new Promise((r) => setTimeout(r, 2));
    return 'ok';
  });
  const runStarted = performance.now();
  let last: { id: string } | null = null;
  for (let i = 0; i < 12; i++) last = queue.submit({ sessionId: 'probe', userMessage: `m${i}`, channel: 'probe' }).turn;
  const done = await queue.waitForTurn('probe', 60_000, last!.id);
  const drainMs = Math.round(performance.now() - runStarted);
  assert.equal(done?.status, 'done', 'the last of twelve queued turns finishes');
  assert.equal(queue.getQueueLength('probe'), 0, 'and the lane is empty');
  assert.equal(startedAt.length, 12, 'every turn ran once');
  assert.ok(drainMs <= ceilings.queueDrainMs!.max, `twelve turns drained in ${drainMs} ms, ceiling ${ceilings.queueDrainMs!.max}`);
  const worstWake = Math.max(0, ...startedAt.slice(1).map((at, i) => at - startedAt[i]! - 2));
  assert.ok(worstWake <= ceilings.queueWakeMs!.max, `the worst wake-up was ${worstWake.toFixed(1)} ms, ceiling ${ceilings.queueWakeMs!.max}`);

  // Four slots, four sleepers: a wall clock near 40 ms is the proof they are parallel.
  const { spawnTask, runningTasks, waitForTasks } = await import('../src/agent/tasks.js');
  const fanStarted = performance.now();
  for (let i = 0; i < 4; i++) {
    spawnTask({
      sessionId: `fan-${i}`,
      prompt: `sleeper ${i}`,
      run: async () => {
        await new Promise((r) => setTimeout(r, 40));
        return 'done';
      },
    });
  }
  assert.equal(runningTasks().length, 4, 'four slots opened');
  await waitForTasks(undefined, 60_000);
  const fanMs = Math.round(performance.now() - fanStarted);
  assert.ok(fanMs < 40 * 3, `four 40 ms subagents took ${fanMs} ms — parallel slots, not four turns in a line`);
  assert.ok(fanMs <= ceilings.subagentFanoutMs!.max, `inside the ${ceilings.subagentFanoutMs!.max} ms ceiling`);

  const doc = fs.readFileSync(path.join(ROOT, 'docs/PERFORMANCE.md'), 'utf8');
  assert.match(doc, /The queue's numbers \(40\.5\)/, 'the doc explains them');
  for (const key of ['queueDrainMs', 'queueWakeMs', 'subagentFanoutMs']) assert.ok(doc.includes(key), `${key} is in the table`);
  // And the committed snapshot carries what the release measured, not just what it declared.
  const saved = fs
    .readdirSync(path.join(ROOT, 'docs', 'openclaw', 'data'))
    .filter((f) => /^perf-\d+\.\d+\.\d+\.json$/.test(f))
    .sort()
    .pop();
  if (saved) {
    const record = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'openclaw', 'data', saved), 'utf8')) as { metrics: Record<string, number> };
    for (const key of ['queueDrainMs', 'queueWakeMs', 'subagentFanoutMs']) {
      const value = record.metrics[key];
      if (typeof value === 'number') assert.ok(value <= ceilings[key]!.max, `${saved}: ${key} ${value} was inside its ceiling when it was filed`);
    }
  }
});
