import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildTools } from '../src/agent/tools.js';
import { SessionQueue, SessionStore } from '../src/agent/sessions.js';
import { healthLine, runHealth } from '../src/agent/run-health.js';
import { StructuredLog, formatLogRecord, structuredLog } from '../src/core/structured-log.js';
import { log, setLogLevel } from '../src/core/logger.js';
import { defaults, validateConfig } from '../src/core/config.js';
import { addToolCall, addSpan, clearRuns, endRun, startRun } from '../src/core/tracing.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';

/**
 * Batch 23 — ops you can see.
 *
 * 23.1 why is it stuck · 23.2 a log worth reading · 23.3 rotation that is
 * stated, not implied.
 */

function home(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t23-${tag}-`));
  process.env.TCRAB_HOME = dir;
  return dir;
}

function runCli(args: string[], dir: string): { stdout: string; status: number } {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    return {
      stdout: execFileSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { ...process.env, TCRAB_HOME: dir } }),
      status: 0,
    };
  } catch (err) {
    const e = err as { stdout?: string; status?: number };
    return { stdout: e.stdout ?? '', status: e.status ?? 1 };
  }
}

// ---------------------------------------------------------------------------
// 23.1 — why is it stuck
// ---------------------------------------------------------------------------

test('23.1 a healthy run is working, and a long tool call is slow then stuck', () => {
  home('health');
  clearRuns();
  const now = Date.now(); // a real clock, like production
  const run = startRun('run-1', 'web:main', 'mock', 'mock-1');
  addSpan(run.runId, 'tool:web_fetch');
  const queue = {
    listRunning: () => [{ sessionId: 'web:main', turnId: 'run-1', startedAt: now - 10_000, userMessage: 'check the news' }],
    listPending: () => [],
  };

  const fresh = runHealth({ queue, traces: [run], now });
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0]!.verdict, 'working');
  assert.match(fresh[0]!.lastActivity, /in tool web_fetch/);
  assert.equal(fresh[0]!.runId, 'run-1');
  assert.equal(fresh[0]!.suggestion, 'nothing to do — it is mid-step');

  const slow = runHealth({ queue, traces: [run], now: now + 90_000 });
  assert.equal(slow[0]!.verdict, 'slow');
  assert.match(slow[0]!.lastActivity, /in tool web_fetch for 1 minute|in tool web_fetch for 2 minute/);
  assert.match(slow[0]!.suggestion, /termcrab stop web:main/);

  const stuck = runHealth({ queue, traces: [run], now: now + 6 * 60_000 });
  assert.equal(stuck[0]!.verdict, 'stuck');
  assert.match(stuck[0]!.suggestion, /that tool is the problem/);
  clearRuns();
});

test('23.1 a run with no span at all is stuck once the threshold passes', () => {
  home('health-nospan');
  clearRuns();
  const now = Date.now(); // a real clock, like production
  const run = startRun('run-2', 'cli:main', 'openai', 'gpt-ish');
  const queue = {
    listRunning: () => [{ sessionId: 'cli:main', turnId: 'run-2', startedAt: now - 20_000, userMessage: 'hi' }],
    listPending: () => [],
  };
  const early = runHealth({ queue, traces: [run], now });
  assert.equal(early[0]!.verdict, 'working');
  assert.match(early[0]!.lastActivity, /waiting for the model/);

  const late = runHealth({ queue, traces: [run], now: now + 6 * 60_000 });
  assert.equal(late[0]!.verdict, 'stuck');
  assert.match(late[0]!.suggestion, /termcrab doctor/);
  clearRuns();
});

test('23.1 a failed provider is failing, and says to fix the model first', () => {
  home('health-fail');
  clearRuns();
  const now = Date.now(); // a real clock, like production
  const run = startRun('run-3', 'telegram:ops', 'openai', 'gpt-x');
  endRun(run.runId, 10, 0, { status: 'error', error: '401 invalid api key' });
  run.status = 'running'; // pretend the turn has not noticed yet
  const queue = {
    listRunning: () => [{ sessionId: 'telegram:ops', turnId: 'run-3', startedAt: now - 5_000, userMessage: 'book a cab' }],
    listPending: () => [],
  };
  const health = runHealth({ queue, traces: [run], now });
  assert.equal(health[0]!.verdict, 'failing');
  assert.match(health[0]!.lastActivity, /401 invalid api key/);
  assert.match(health[0]!.suggestion, /termcrab doctor/);
  assert.equal(health[0]!.provider, 'openai');
  clearRuns();
});

test('23.1 queued messages are their own verdict, and nothing running is calm', () => {
  home('health-queue');
  clearRuns();
  const queue = {
    listRunning: () => [],
    listPending: () => [{ sessionId: 'web:busy', waiting: 3 }],
  };
  const health = runHealth({ queue });
  assert.equal(health.length, 1);
  assert.equal(health[0]!.verdict, 'queued');
  assert.match(health[0]!.lastActivity, /3 message\(s\) waiting/);
  assert.match(health[0]!.suggestion, /queueMode/);

  const empty = runHealth({ queue: { listRunning: () => [], listPending: () => [] } });
  assert.deepEqual(empty, []);
  assert.equal(healthLine([]), 'Runs: nothing is running right now.');
  assert.match(healthLine(health), /Runs: 1 running/);
});

test('23.1 the real SessionQueue feeds it correctly, including the queued lane', async () => {
  home('health-real');
  clearRuns();
  const queue = new SessionQueue();
  // A turn is only "running" once the loop's runner has claimed it, exactly
  // like production; until then it is queued.
  queue.setRunner(async () => {
    await new Promise((r) => setTimeout(r, 2000));
    return 'done';
  });
  const turn = queue.submit({ sessionId: 'cli:main', userMessage: 'a real turn', channel: 'cli' }).turn;
  await new Promise((r) => setTimeout(r, 40));

  const health = runHealth({ queue, traces: [], now: Date.now() + 6 * 60_000 });
  const running = health.find((h) => h.sessionId === 'cli:main')!;
  assert.equal(running.turnId, turn.id, 'the queue id is the turn id');
  assert.equal(running.request, 'a real turn');
  assert.equal(running.verdict, 'stuck');
  assert.match(running.suggestion, /the model has not answered|died with the process/);

  // Messages waiting behind it are reported separately.
  queue.submit({ sessionId: 'cli:main', userMessage: 'and another', channel: 'cli' });
  const withQueued = runHealth({ queue, traces: [] });
  assert.ok(withQueued.some((h) => h.sessionId === 'cli:main'));
  const pending = queue.listPending();
  assert.deepEqual(pending, [{ sessionId: 'cli:main', waiting: 1 }]);
  queue.interrupt('cli:main');
  clearRuns();
});

test('23.1 a run with a long tool call names the tool and pins how old it is', () => {
  home('health-tool');
  clearRuns();
  const now = Date.now(); // a real clock: spans carry real timestamps
  const run = startRun('run-4', 'web:main', 'mock', 'mock-1');
  const span = addSpan(run.runId, 'tool:exec');
  addToolCall(run.runId, 'exec', 1000, true);
  assert.ok(span);
  const queue = {
    listRunning: () => [{ sessionId: 'web:main', turnId: 'run-4', startedAt: now - 30_000, userMessage: 'run the build' }],
    listPending: () => [],
  };
  const health = runHealth({ queue, traces: [run], now: now + 120_000 });
  assert.equal(health[0]!.toolCalls, 1);
  assert.equal(health[0]!.verdict, 'slow');
  assert.match(health[0]!.lastActivity, /in tool exec/);
  clearRuns();
});

// ---------------------------------------------------------------------------
// 23.2 — a log worth reading
// ---------------------------------------------------------------------------

test('23.2 one JSON object per line, with level and area', () => {
  const dir = home('log');
  const file = path.join(dir, 'logs', 'termcrab.jsonl');
  const logg = new StructuredLog({ file });
  logg.write('info', 'gateway', 'listening on 7788', { port: 7788 });
  logg.write('warn', 'telegram', 'poll failed', { attempt: 2 });

  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  const first = JSON.parse(lines[0]!) as Record<string, unknown>;
  assert.equal(first.level, 'info');
  assert.equal(first.area, 'gateway');
  assert.equal(first.message, 'listening on 7788');
  assert.equal(first.port, 7788, 'extra fields ride along');
  assert.match(String(first.ts), /^\d{4}-\d{2}-\d{2}T/);

  const records = logg.tail(10);
  assert.equal(records.length, 2);
  assert.equal(records[1]!.level, 'warn');
  assert.match(formatLogRecord(records[0]!), /INFO\s+\[gateway\] listening on 7788\s+port=7788/);
});

test('23.2 the console log mirrors into the file, and never throws', () => {
  const dir = home('log-mirror');
  setLogLevel('info');
  log.info('tg:', 'telegram poll failed with a secret token');
  const file = path.join(dir, 'logs', 'termcrab.jsonl');
  assert.equal(fs.existsSync(file), true, 'the console line landed in the log file');
  const record = JSON.parse(fs.readFileSync(file, 'utf8').trim().split('\n').pop()!) as Record<string, unknown>;
  assert.equal(record.area, 'tg', 'a leading `word:` becomes the area');
  assert.equal(record.level, 'info');
  assert.match(String(record.message), /telegram poll failed/);

  // A directory that cannot be written must not break the caller.
  const broken = new StructuredLog({ file: path.join(dir, 'a-file-not-a-dir', 'x.jsonl') });
  fs.writeFileSync(path.join(dir, 'a-file-not-a-dir'), 'nope', 'utf8');
  assert.doesNotThrow(() => broken.write('error', 'x', 'still fine'));
  assert.deepEqual(broken.tail(5), []);
});

test('23.2 tail keeps the newest records, in order', () => {
  const dir = home('log-tail');
  const logg = new StructuredLog({ file: path.join(dir, 'logs', 'x.jsonl') });
  for (let i = 0; i < 12; i++) logg.write('info', 'test', `line ${i}`);
  const tail = logg.tail(3);
  assert.deepEqual(tail.map((r) => r.message), ['line 9', 'line 10', 'line 11']);
});

test('23.2 the CLI reads the same file', () => {
  const dir = home('log-cli');
  const logg = new StructuredLog({ file: path.join(dir, 'logs', 'termcrab.jsonl') });
  logg.write('info', 'gateway', 'hello from the gateway');
  logg.write('error', 'provider', 'boom');

  const text = runCli(['logs', '--json'], dir);
  assert.equal(text.status, 0, text.stdout);
  const parsed = JSON.parse(text.stdout) as {
    data: { count: number; records: Array<{ area: string; message: string }>; limits: { maxBytes: number; maxFiles: number } };
  };
  assert.equal(parsed.data.count, 2);
  assert.equal(parsed.data.records[1]!.message, 'boom');
  assert.ok(parsed.data.limits.maxBytes >= 1024);

  const plain = runCli(['logs', '1'], dir);
  assert.match(plain.stdout, /last 1 record/);
  assert.match(plain.stdout, /\[provider\] boom/);

  const p = runCli(['logs', '--path'], dir);
  assert.match(p.stdout.trim(), /termcrab\.jsonl$/);
});

// ---------------------------------------------------------------------------
// 23.3 — rotation that is stated
// ---------------------------------------------------------------------------

test('23.3 the log rotates at the stated size and keeps the stated number of files', () => {
  const dir = home('rotate');
  const file = path.join(dir, 'logs', 'termcrab.jsonl');
  const logg = new StructuredLog({ file, maxBytes: 2048, maxFiles: 2 });
  assert.deepEqual(logg.limits, { maxBytes: 2048, maxFiles: 2 });

  for (let i = 0; i < 120; i++) logg.write('info', 'test', `record number ${i} with some padding to fill the file`);
  const files = logg.files();
  assert.ok(files.length <= 3, `live + 2 rotated at most (${files.length})`);
  assert.equal(fs.existsSync(`${file}.1`), true, 'the log rotated');
  assert.equal(fs.existsSync(`${file}.3`), false, 'and did not keep more than it promised');
  const usage = logg.usage();
  assert.ok(usage.bytes > 0);
  assert.equal(usage.files, files.length);
  // The live file is the newest; the oldest records are the ones that went.
  const newest = logg.tail(1)[0]!;
  assert.match(newest.message, /record number 119/);
});

test('23.3 rotation limits come from config, and nonsense is refused', () => {
  home('rotate-cfg');
  const config = defaults();
  config.logs = { maxMB: 5, files: 4 };
  const problems = validateConfig(config as unknown as Record<string, unknown>);
  assert.equal(problems.filter((p) => p.severity === 'error').length, 0, JSON.stringify(problems.slice(0, 2)));

  const bad = defaults();
  bad.logs = { maxMB: 0, files: 999 };
  const badProblems = validateConfig(bad as unknown as Record<string, unknown>);
  assert.ok(badProblems.some((p) => p.path === 'logs.maxMB'));
  assert.ok(badProblems.some((p) => p.path === 'logs.files'));

  const logg = new StructuredLog({ file: path.join(home('rotate-limits'), 'x.jsonl') });
  logg.configure({ maxBytes: 3 * 1024 * 1024, maxFiles: 5 });
  assert.deepEqual(logg.limits, { maxBytes: 3 * 1024 * 1024, maxFiles: 5 });
  logg.configure({ maxBytes: -1, maxFiles: 100 });
  assert.deepEqual(logg.limits, { maxBytes: 3 * 1024 * 1024, maxFiles: 50 }, 'nonsense is clamped, not obeyed');
  logg.configure({ maxBytes: -1 });
  assert.equal(logg.limits.maxBytes, 3 * 1024 * 1024, 'an invalid size is ignored, not lowered to 1 KB');
});

test('23.3 the log area is part of the disk picture', () => {
  const dir = home('disk-log');
  const logg = new StructuredLog({ file: path.join(dir, 'logs', 'termcrab.jsonl') });
  logg.write('info', 'test', 'x'.repeat(500));
  // counted by `termcrab disk`: the area prefix `logs/` is in AREAS as trimmable
  const disk = runCli(['disk', '--json'], dir);
  const parsed = JSON.parse(disk.stdout) as { data: { before: { byArea: Record<string, number> } } };
  assert.ok((parsed.data.before.byArea.logs ?? 0) > 0, 'the log bytes show up under logs');
});

// ---------------------------------------------------------------------------
// The same through the binary
// ---------------------------------------------------------------------------

test('23.1 termcrab runs reports health, and is honest when the panel is down', () => {
  const dir = home('runs-cli');
  clearRuns();
  const res = runCli(['runs', '--json'], dir);
  assert.equal(res.status, 0, res.stdout);
  const parsed = JSON.parse(res.stdout) as { data: { count: number; runs: unknown[]; live: boolean } };
  assert.equal(parsed.data.count, 0);
  assert.equal(parsed.data.live, false, 'no panel in this test, and the answer says so');
  const plain = runCli(['runs'], dir);
  assert.match(plain.stdout, /nothing is running/);
});

test('23.1 doctor reports running turns without crying wolf', async () => {
  const dir = home('doctor-runs');
  clearRuns();
  const res = runCli(['doctor', '--json'], dir);
  const parsed = JSON.parse(res.stdout) as { data: { checks: Array<{ id: string; status: string; detail?: string }> } };
  const runs = parsed.data.checks.find((c) => c.id === 'runs');
  assert.ok(runs, 'doctor has a running-turns check');
  assert.equal(runs!.status, 'ok');
  assert.match(String(runs!.detail), /nothing is running|all making progress/);
  void (await buildTools({
    config: defaults(),
    memory: new MemoryStore(),
    skills: new SkillStore(),
    sessions: new SessionStore(),
  }));
});
