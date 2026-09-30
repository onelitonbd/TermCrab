import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cronMatches, nextRun, parseCron, CronParseError } from '../src/cron/parser.js';
import { addCron, findDue, loadCrons, removeCron, setCronEnabled } from '../src/cron/store.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function tempHome(): void {
  process.env.TCRAB_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tcron-'));
}

test('parses and matches basic schedules', () => {
  const expr = parseCron('30 8 * * *');
  assert.ok(cronMatches(expr, new Date(2026, 0, 5, 8, 30)));
  assert.ok(!cronMatches(expr, new Date(2026, 0, 5, 8, 31)));
  assert.ok(!cronMatches(expr, new Date(2026, 0, 5, 9, 30)));
});

test('step and range syntax', () => {
  const step = parseCron('*/15 * * * *');
  for (const m of [0, 15, 30, 45]) assert.ok(cronMatches(step, new Date(2026, 5, 1, 10, m)), `minute ${m}`);
  assert.ok(!cronMatches(step, new Date(2026, 5, 1, 10, 7)));

  const weekdays = parseCron('0 9 * * 1-5');
  assert.ok(cronMatches(weekdays, new Date(2026, 8, 29, 9, 0))); // Wednesday
  assert.ok(!cronMatches(weekdays, new Date(2026, 8, 27, 9, 0))); // Monday? no — 27 Sep 2026 is Sunday
});

test('day-of-month OR day-of-week semantics when both restricted', () => {
  const expr = parseCron('0 0 1 * 1'); // 1st OR Monday
  assert.ok(cronMatches(expr, new Date(2026, 0, 1, 0, 0))); // Jan 1 (Thursday) - dom hit
  assert.ok(cronMatches(expr, new Date(2026, 0, 5, 0, 0))); // Jan 5 Monday - dow hit
  assert.ok(!cronMatches(expr, new Date(2026, 0, 6, 0, 0))); // Jan 6 Tuesday
});

test('macros expand correctly', () => {
  const hourly = parseCron('@hourly');
  assert.ok(cronMatches(hourly, new Date(2026, 3, 1, 13, 0)));
  assert.ok(!cronMatches(hourly, new Date(2026, 3, 1, 13, 1)));
  const daily = parseCron('@daily');
  assert.ok(cronMatches(daily, new Date(2026, 3, 1, 0, 0)));
});

test('invalid expressions throw CronParseError', () => {
  for (const bad of ['', '* * *', '60 * * * *', '* 24 * * *', 'abc * * * *', '*/0 * * * *']) {
    assert.throws(() => parseCron(bad), CronParseError, `should reject: ${bad}`);
  }
});

test('nextRun finds the future occurrence', () => {
  const expr = parseCron('0 8 * * *');
  const from = new Date(2026, 8, 29, 9, 30); // after 8am
  const next = nextRun(expr, from)!;
  assert.equal(next.getHours(), 8);
  assert.equal(next.getMinutes(), 0);
  assert.ok(next.getTime() > from.getTime());
});

test('cron store CRUD + findDue dedupes by state', () => {
  tempHome();
  const job = addCron({ name: 'every-min', schedule: '* * * * *', prompt: 'say hi' });
  assert.ok(job.id);
  assert.equal(loadCrons().length, 1);

  const now = new Date(2026, 8, 29, 12, 0, 30);
  const state = {};
  const due1 = findDue(loadCrons(), now, state);
  assert.equal(due1.length, 1);

  const due2 = findDue(loadCrons(), now, { [job.id]: due1[0]!.minuteKey });
  assert.equal(due2.length, 0, 'same minute must not re-fire');

  setCronEnabled(job.id, false);
  assert.equal(findDue(loadCrons(), now, {}).length, 0, 'disabled jobs never fire');

  setCronEnabled(job.id, true);
  assert.equal(removeCron(job.id), true);
  assert.equal(loadCrons().length, 0);
  assert.equal(removeCron(job.id), false);
});

test('addCron validates schedule and prompt', () => {
  tempHome();
  assert.throws(() => addCron({ name: 'x', schedule: 'not a cron', prompt: 'p' }), CronParseError);
  assert.throws(() => addCron({ name: 'x', schedule: '* * * * *', prompt: '   ' }), /prompt/);
});
