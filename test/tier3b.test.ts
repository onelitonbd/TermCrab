/**
 * Batch 34.4 — the cron scheduler grows up, and one board shows the work.
 *
 * Cron was "does it fire?" and nothing else. A phone goes to sleep, a job is
 * slow, a provider fails — and none of that was visible or handled. This pins:
 *
 *   - catch-up: a run missed while the device was off happens once, coalesced,
 *     and never older than 24h
 *   - overlap: a job still running is skipped, and says so
 *   - run history: every attempt is recorded (ok / error / skipped, how long),
 *     consecutive failures are counted and shown, and `cron show` reads it
 *   - the board: turns, subagents, cron jobs and suggestions in one list with
 *     one status vocabulary, reachable as `termcrab board` and `GET /api/board`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  addCron,
  findDue,
  loadCrons,
  loadCronState,
  markTick,
  recordCronRun,
  saveCronState,
  setCronEnabled,
} from '../src/cron/store.js';
import { buildBoard, formatBoard } from '../src/agent/board.js';
import { spawnTask, clearTasks } from '../src/agent/tasks.js';
import { suggest } from '../src/agent/suggestions.js';
import { startGateway } from '../src/gateway/server.js';
import { defaults } from '../src/core/config.js';
import net from 'node:net';
import http from 'node:http';

const ROOT = process.cwd();

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

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

const cli = (args: string[]): string =>
  execFileSync('node', [path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });

const at = (iso: string): Date => new Date(iso);

// --------------------------------------------------------------------- 34.4

test('34.4 cron: a run missed while the device was off happens once, not twice', async (t) => {
  await t.test('findDue catches up inside the window, coalesces, and respects the limit', () => {
    tmpHome('t34ca-');
    const everyHour = addCron({ name: 'hourly', schedule: '0 * * * *', prompt: 'tick' });

    // First tick ever: only the current minute, never a burst out of nowhere.
    const first = findDue(loadCrons(), at('2026-10-04T10:00:20'), {}, {});
    assert.deepEqual(first.map((d) => d.job.id), [everyHour.id]);
    assert.equal(first[0]!.missed, 1);

    // The device was asleep 09:00 → 12:30. Three hourly runs were missed; the
    // job runs once and says how many it skipped.
    const state = { ...loadCronState(), __tick: Math.floor(at('2026-10-04T09:00:00').getTime() / 60_000) };
    const caught = findDue(loadCrons(), at('2026-10-04T12:30:20'), state, {});
    assert.equal(caught.length, 1, 'one job, one run');
    assert.equal(caught[0]!.missed, 3, '10:00, 11:00 and 12:00 were missed');

    // Off for a week: the catch-up window caps what is replayed.
    const longAgo = Math.floor(at('2026-09-20T09:00:00').getTime() / 60_000);
    const capped = findDue(loadCrons(), at('2026-10-04T12:30:20'), { __tick: longAgo }, {
      catchupLimitMinutes: 24 * 60,
    });
    assert.equal(capped.length, 1);
    assert.ok(capped[0]!.missed <= 24, `a week off must not replay a week (missed ${capped[0]!.missed})`);

    // A job that already ran in the covered window is not run again for that minute.
    const ran = { ...state, [everyHour.id]: Math.floor(at('2026-10-04T12:00:00').getTime() / 60_000) };
    const after = findDue(loadCrons(), at('2026-10-04T12:30:20'), ran, {});
    assert.equal(after.length, 0, 'the 12:00 run was already recorded');

    // A disabled job is never due.
    setCronEnabled(everyHour.id, false);
    assert.equal(findDue(loadCrons(), at('2026-10-04T13:00:20'), { __tick: Math.floor(at('2026-10-04T12:30:00').getTime() / 60_000) }, {}).length, 0);
  });

  await t.test('markTick is what makes catch-up possible, and it round-trips through the file', () => {
    tmpHome('t34cb-');
    addCron({ name: 'daily', schedule: '0 8 * * *', prompt: 'brief me' });
    const state = loadCronState();
    markTick(state, at('2026-10-04T12:30:20'));
    saveCronState(state);
    assert.equal(loadCronState().__tick, Math.floor(at('2026-10-04T12:30:00').getTime() / 60_000));
  });
});

test('34.4 cron: what happened last is recorded, shown, and does not disable anything', async (t) => {
  await t.test('recordCronRun keeps five, counts failures, clears the error on success', () => {
    tmpHome('t34cc-');
    const job = addCron({ name: 'flaky', schedule: '*/5 * * * *', prompt: 'try' });
    for (let i = 0; i < 7; i++) {
      recordCronRun(job.id, { at: Date.now() + i, ms: 10 + i, ok: false, note: `boom ${i}` }, { result: 'error', error: `boom ${i}` });
    }
    let saved = loadCrons()[0]!;
    assert.equal(saved.history!.length, 5, 'only the last five attempts are kept');
    assert.equal(saved.history![0]!.note, 'boom 2');
    assert.equal(saved.failures, 7);
    assert.equal(saved.lastResult, 'error');
    assert.match(saved.lastError!, /boom 6/);

    recordCronRun(job.id, { at: Date.now(), ms: 5, ok: true }, { result: 'ok' });
    saved = loadCrons()[0]!;
    assert.equal(saved.failures, 0, 'a success clears the streak');
    assert.equal(saved.lastError, undefined);
    assert.equal(saved.lastResult, 'ok');
    assert.equal(saved.enabled, true, 'failures are shown, never used to disable a job');
  });

  await t.test('the CLI lists the outcome and shows one job in full', () => {
    tmpHome('t34cd-');
    const job = addCron({ name: 'morning', schedule: '0 8 * * *', prompt: 'give me a briefing', deliver: 'telegram' });
    recordCronRun(job.id, { at: Date.now() - 3_600_000, ms: 4200, ok: true }, { result: 'ok' });
    recordCronRun(job.id, { at: Date.now() - 60_000, ms: 900, ok: false, note: 'provider 429' }, { result: 'error', error: 'provider 429' });

    const ls = cli(['cron', 'ls']);
    assert.match(ls, /morning/);
    assert.match(ls, /last .*error/, 'the list says how it went');

    const lsJson = JSON.parse(cli(['cron', 'ls', '--json'])) as {
      data: { jobs: { name: string; lastResult: string; failures: number; lastError: string | null; deliver: string }[] };
    };
    const row = lsJson.data.jobs.find((j) => j.name === 'morning')!;
    assert.equal(row.lastResult, 'error');
    assert.equal(row.failures, 1);
    assert.match(row.lastError!, /429/);
    assert.equal(row.deliver, 'telegram');

    const show = cli(['cron', 'show', job.id]);
    assert.match(show, /runs as: the cron route · delivers: telegram/);
    assert.match(show, /recent runs/);
    assert.match(show, /provider 429/);

    const showJson = JSON.parse(cli(['cron', 'show', job.id, '--json'])) as {
      data: { job: { id: string; history: { ok: boolean }[] } };
    };
    assert.equal(showJson.data.job.id, job.id);
    assert.equal(showJson.data.job.history.length, 2);
  });
});

test('34.4 the board merges every kind of work into one honest list', async (t) => {
  await t.test('cards, counts and the drawing', async () => {
    tmpHome('t34ce-');
    clearTasks();
    const cronJob = addCron({ name: 'backup-check', schedule: '0 3 * * *', prompt: 'check backups' });
    recordCronRun(cronJob.id, { at: Date.now() - 1000, ms: 100, ok: false, note: 'disk full' }, { result: 'error', error: 'disk full' });
    addCron({ name: 'weekly-review', schedule: '0 18 * * 0', prompt: 'review the week' });
    suggest('tidy the inbox', '412 messages, 3 files');

    // A real background task through the same spawner the agent uses.
    const task = spawnTask({
      sessionId: 'sub',
      prompt: 'write the weekly summary',
      run: () => new Promise<string>((resolve) => setTimeout(() => resolve('summary ready'), 30)),
      timeoutMs: 5000,
    });

    const board = buildBoard();
    const kinds = board.cards.map((c) => c.kind);
    assert.ok(kinds.includes('subagent'), 'the running task is a card');
    assert.ok(kinds.includes('cron'), 'the scheduled job is a card');
    assert.ok(kinds.includes('suggestion'), 'the suggestion is a card');
    assert.equal(board.counts.running >= 1, true, 'the task counts as running');
    assert.equal(board.counts.scheduling, 1, 'the healthy job is scheduled');
    assert.equal(board.counts.failed, 1, 'the job with the stored error is failed');
    assert.equal(board.counts.suggested, 1);

    const cronCard = board.cards.find((c) => c.title.includes('backup-check'))!;
    assert.match(cronCard.title, /backup-check \(0 3 \* \* \*\)/);
    assert.match(cronCard.detail!, /last .*error|disk full/);
    const drawn = formatBoard(board);
    assert.match(drawn, /🧭 Board —/);
    assert.match(drawn, /write the weekly summary|tidy the inbox/);

    await new Promise((r) => setTimeout(r, 60));
    const after = buildBoard();
    const done = after.cards.find((c) => c.id === `subagent:${task.id}`)!;
    assert.equal(done.status, 'done');
    assert.match(done.detail!, /summary ready/);
  });

  await t.test('the CLI prints it, and the panel serves the same object', () => {
    tmpHome('t34cf-');
    suggest('book the dentist', 'you asked twice this week');
    const json = JSON.parse(cli(['board', '--json'])) as {
      ok: boolean;
      data: { counts: Record<string, number>; cards: { kind: string; title: string }[] };
    };
    assert.equal(json.ok, true);
    assert.equal(json.data.counts.suggested, 1);
    assert.equal(json.data.cards[0]!.kind, 'suggestion');
    assert.match(cli(['board']), /book the dentist/);

    const src = fs.readFileSync(path.join(ROOT, 'src', 'gateway', 'server.ts'), 'utf8');
    assert.match(src, /pathname === '\/api\/board'/);
    assert.match(src, /buildBoard\(\)/);
    const help = fs.readFileSync(path.join(ROOT, 'src', 'command-help.ts'), 'utf8');
    assert.match(help, /cmd: 'board'/);
  });

  await t.test('a live gateway serves the board and refuses a bad cron target', async () => {
    const home = tmpHome('t34cg-');
    suggest('water the plants', undefined);
    const config = defaults();
    config.provider = { type: 'mock', model: 'mock-1', apiKey: 'sk-test' };
    config.gateway.token = 'board-token';
    const port = await freePort();
    const handle = await startGateway({ config, host: '127.0.0.1', port });
    const req = async (
      p: string,
      method = 'GET',
      body?: unknown,
    ): Promise<{ status: number; data: Record<string, unknown> }> => {
      const res = await fetch(`http://127.0.0.1:${port}${p}`, {
        method,
        headers: {
          authorization: 'Bearer board-token',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      let data: Record<string, unknown> = {};
      try {
        data = (await res.json()) as Record<string, unknown>;
      } catch {
        /* empty */
      }
      return { status: res.status, data };
    };
    try {
      const board = await req('/api/board');
      assert.equal(board.status, 200);
      const data = board.data as { counts: Record<string, number>; cards: { kind: string }[] };
      assert.equal(data.counts.suggested, 1);
      assert.ok(data.cards.some((c) => c.kind === 'suggestion'));

      // 34.4: the panel can set agent + deliver, and a bad value is a 400 with
      // a sentence — before any job is written.
      const badDeliver = await req('/api/crons', 'POST', { schedule: '0 8 * * *', prompt: 'x', deliver: 'nowhere' });
      assert.equal(badDeliver.status, 400);
      assert.match(String(badDeliver.data.error), /deliver must be/);
      const badAgent = await req('/api/crons', 'POST', { schedule: '0 8 * * *', prompt: 'x', agent: 'ghost' });
      assert.equal(badAgent.status, 400);
      assert.match(String(badAgent.data.error), /no such agent/);
      assert.equal(loadCrons().length, 0, 'nothing was written by the refusals');

      const created = await req('/api/crons', 'POST', {
        name: 'from-panel',
        schedule: '0 9 * * *',
        prompt: 'brief me',
        deliver: 'telegram',
      });
      assert.equal(created.status, 200);
      assert.equal((created.data.cron as { deliver?: string }).deliver, 'telegram');

      const list = await req('/api/crons');
      const crons = (list.data as { crons: { name: string; deliver?: string; lastResult?: string }[] }).crons;
      assert.equal(crons.length, 1);
      assert.equal(crons[0]!.deliver, 'telegram');
      assert.equal(crons[0]!.lastResult, undefined, 'a job that never ran has no result to show');
    } finally {
      await handle.stop();
      void home;
    }
  });
});
