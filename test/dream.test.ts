import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaults } from '../src/core/config.js';
import { runDream, startDreamScheduler, latestSourceMtime } from '../src/agent/dream.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';
import { AgentCtx } from '../src/agent/loop.js';

function makeCtx(): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tdream-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const memory = new MemoryStore(path.join(home, 'memory'));
  const sessions = new SessionStore(path.join(home, 'sessions'));
  const skills = new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]);
  return { ctx: { config, memory, skills, sessions }, home };
}

function seedSession(home: string, name = 'chat1.jsonl'): void {
  const dir = path.join(home, 'sessions');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, name),
    [
      JSON.stringify({ role: 'user', content: 'I prefer dark mode in every app', ts: Date.now() }),
      JSON.stringify({ role: 'assistant', content: 'Noted - dark mode everywhere.', ts: Date.now() }),
      '',
    ].join('\n'),
    'utf8',
  );
}

test('dream skips when disabled and not forced', async () => {
  const { ctx } = makeCtx();
  ctx.config.dream.enabled = false;
  const r = await runDream(ctx);
  assert.equal(r.ran, false);
  assert.match(r.reason, /disabled/);
});

test('force dream runs, writes state, and logs the cycle', async () => {
  const { ctx, home } = makeCtx();
  seedSession(home);
  const r = await runDream(ctx, { force: true });
  assert.equal(r.ran, true, `expected dream to run, got: ${r.reason}`);
  assert.equal(typeof r.facts, 'number');
  assert.ok(fs.existsSync(path.join(home, 'state', 'dream.json')), 'dream state file written');
  const dailyDir = path.join(home, 'memory', 'daily');
  const daily = fs.readdirSync(dailyDir).map((f) => fs.readFileSync(path.join(dailyDir, f), 'utf8')).join('\n');
  assert.match(daily, /dream:/);
});

test('force dream with no transcripts is a no-op', async () => {
  const { ctx, home } = makeCtx();
  fs.mkdirSync(path.join(home, 'sessions'), { recursive: true });
  const r = await runDream(ctx, { force: true });
  assert.equal(r.ran, false);
  assert.match(r.reason, /nothing to consolidate/);
});

test('schedule gate: second dream within everyHours window is skipped', async () => {
  const { ctx, home } = makeCtx();
  seedSession(home);
  const first = await runDream(ctx, { force: true });
  assert.equal(first.ran, true);
  const second = await runDream(ctx);
  assert.equal(second.ran, false);
  assert.match(second.reason, /next dream/);
});

test('latestSourceMtime grows when sessions change', () => {
  const { home } = makeCtx();
  const before = latestSourceMtime();
  seedSession(home, 'fresh.jsonl');
  const after = latestSourceMtime();
  assert.ok(after > 0, 'expected a fresh source mtime');
  assert.ok(after >= before, 'mtime must not shrink');
});

test('scheduler returns a stop function', () => {
  const { ctx } = makeCtx();
  const stop = startDreamScheduler(ctx);
  assert.equal(typeof stop, 'function');
  stop();
});
