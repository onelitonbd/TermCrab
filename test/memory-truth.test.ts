import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { buildSystemPrompt } from '../src/agent/prompt.js';
import { AgentCtx, runTurn } from '../src/agent/loop.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults } from '../src/core/config.js';
import { Provider } from '../src/providers/types.js';

/**
 * Batch 7 — memory that does not forget.
 *
 * The two BROKEN rows this file has to kill:
 *   - MEMORY.md is injected with readHead(3000) (the *oldest* 3000 chars) while
 *     remember() appends, so a fact written today can never enter the prompt;
 *   - compaction rewrites the .jsonl (and maybeTrim drops lines), so history is
 *     deleted instead of summarised.
 */

function tmpHome(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = dir;
  return dir;
}

function mem(): { store: MemoryStore; root: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tmem-truth-'));
  return { store: new MemoryStore(root), root };
}

function makeCtx(home: string): { ctx: AgentCtx } {
  const memory = new MemoryStore(path.join(home, 'memory'));
  const sessions = new SessionStore(path.join(home, 'sessions'));
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo skill\n---\n\nSolo body\n');
  const skills = new SkillStore([{ dir: skillRoot, origin: 'user' }]);
  return { ctx: { config: defaults(), memory, skills, sessions } };
}

test('7.1 the newest fact is the one that reaches the prompt', () => {
  const { store } = mem();
  for (let i = 0; i < 40; i++) store.remember(`fact ${i} ${'x'.repeat(120)}`);
  const block = store.readForPrompt(1500);
  assert.match(block.text, /fact 39 /, 'the newest fact must be injected');
  assert.doesNotMatch(block.text, /fact 0 /, 'the oldest facts are the ones that may fall out');
  assert.ok(block.text.length <= 1500, `block must respect the budget, got ${block.text.length}`);
});

test('7.1b a fact remembered before a run is in the system prompt that run sends', async () => {
  const home = tmpHome('tmem-run-');
  const { ctx } = makeCtx(home);
  ctx.memory.remember('the launch code is ORANGE-42');

  let systemSeen = '';
  const recorder: Provider = {
    name: 'recorder',
    model: 'recorder-1',
    async chat(req) {
      systemSeen = req.system;
      return { text: 'noted', toolCalls: [], stopReason: 'end' };
    },
  };
  ctx.provider = recorder;

  await runTurn(ctx, { sessionId: 'mem:run', userMessage: 'what is the launch code?' });
  assert.match(systemSeen, /ORANGE-42/, 'the fact written before the run must be in the prompt');
  fs.rmSync(home, { recursive: true, force: true });
});

test('7.2 compaction summarises but deletes nothing', () => {
  const home = tmpHome('tmem-compact-');
  const sessions = new SessionStore();
  const id = 'test:keep';

  for (let i = 0; i < 120; i++) {
    sessions.append(id, { role: 'user', content: `turn ${i}`, ts: 1_700_000_000_000 + i });
  }

  const digest = sessions.compact(id, 60);
  assert.ok(digest.length > 0, 'a digest is produced');
  assert.match(digest, /turn 0\b/, 'the digest covers the oldest turns');

  const all = sessions.read(id);
  assert.equal(all.length, 120, 'every original entry is still readable');
  assert.equal((all[0] as { content: string }).content, 'turn 0', 'and still in order');
  assert.ok(sessions.readHot(id, 60).length <= 60, 'only the prompt window shrinks');

  const archive = path.join(home, 'sessions', `${id}.archive.jsonl`);
  assert.ok(fs.existsSync(archive), 'the overflow lives in an archive file on disk');
  const archived = fs.readFileSync(archive, 'utf8').split('\n').filter((l) => l.trim()).length;
  assert.ok(archived >= 60, `archive must hold the overflow, got ${archived}`);
  fs.rmSync(home, { recursive: true, force: true });
});

test('7.2b after compaction the model still sees the digest', () => {
  const home = tmpHome('tmem-digest-');
  const sessions = new SessionStore();
  const id = 'test:digest';
  for (let i = 0; i < 80; i++) {
    sessions.append(id, { role: 'user', content: `earlier turn ${i}`, ts: 1_700_000_000_000 + i });
  }
  sessions.compact(id, 30);

  const { ctx } = makeCtx(home);
  const system = buildSystemPrompt({
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    channel: 'web',
    sessionId: id,
  });
  assert.match(system, /Earlier in this conversation \(compacted\)/, 'the digest is injected');
  assert.match(system, /earlier turn 0\b/, 'and it carries what the window dropped');
  fs.rmSync(home, { recursive: true, force: true });
});

test('7.3 the injection names its budget and never drops silently', () => {
  const { store } = mem();
  for (let i = 0; i < 60; i++) store.remember(`budget fact ${i} ${'y'.repeat(90)}`);
  const block = store.readForPrompt(800);
  assert.ok(block.bytes <= 800, `bytes ${block.bytes} must fit the budget`);
  assert.match(block.text, /budget/i, 'the block says which budget applied');
  assert.match(block.text, /showing the newest \d+ of \d+ facts/i, 'and how many facts are hidden');
  assert.ok(block.facts < block.totalFacts, 'this setup must actually hide facts');
  assert.equal(block.totalFacts, 60);
});

test('7.4 every injected fact carries its source', () => {
  const { store } = mem();
  for (let i = 0; i < 10; i++) store.remember(`prov fact ${i}`);
  const block = store.readForPrompt(3000);
  assert.match(block.text, /MEMORY\.md:\d+/, 'facts cite the file and line they came from');
  const remembered = store.remember('prov fact brand new');
  assert.match(remembered, /MEMORY\.md:\d+/, 'remember() reports where it stored the fact');
});
