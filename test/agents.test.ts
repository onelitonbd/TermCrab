import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaults } from '../src/core/config.js';
import { agentExists, buildSystemPrompt, listAgents, sanitizeAgentName } from '../src/agent/prompt.js';
import { AgentCtx, runTurn } from '../src/agent/loop.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';

function setup(): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tagents-'));
  process.env.TCRAB_HOME = home;
  const agentsDir = path.join(home, 'workspace', 'agents', 'brief');
  fs.mkdirSync(agentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, 'SOUL.md'),
    '# SOUL\n\n- Name: Brief\n- You are a ultra-concise briefing agent.\n',
  );
  fs.writeFileSync(path.join(home, 'workspace', 'SOUL.md'), '# SOUL\n\n- Name: Crabby (main)\n');

  const config = defaults();
  config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
  const ctx: AgentCtx = {
    config,
    memory: new MemoryStore(path.join(home, 'memory')),
    sessions: new SessionStore(path.join(home, 'sessions')),
    skills: new SkillStore([]),
  };
  return { ctx, home };
}

test('sanitizeAgentName accepts safe names, rejects traversal', () => {
  assert.equal(sanitizeAgentName('Brief'), 'brief');
  assert.equal(sanitizeAgentName('my-agent_2'), 'my-agent_2');
  assert.equal(sanitizeAgentName('../etc'), null);
  assert.equal(sanitizeAgentName('has space'), null);
  assert.equal(sanitizeAgentName(''), null);
});

test('listAgents discovers folders with SOUL.md', () => {
  setup();
  assert.deepEqual(listAgents(), ['brief']);
  assert.equal(agentExists('brief'), true);
  assert.equal(agentExists('nope'), false);
});

test('system prompt uses agent SOUL and profile note', () => {
  const { ctx } = setup();
  const main = buildSystemPrompt({ config: ctx.config, memory: ctx.memory, skills: ctx.skills });
  assert.match(main, /Crabby \(main\)/);
  assert.ok(!main.includes('ultra-concise'));

  const asBrief = buildSystemPrompt({
    config: ctx.config,
    memory: ctx.memory,
    skills: ctx.skills,
    agentName: 'brief',
  });
  assert.match(asBrief, /ultra-concise/);
  assert.match(asBrief, /named agent "brief"/);
  assert.match(asBrief, /\bBrief\b/);
});

test('runTurn namespaces sessions per agent', async () => {
  const { ctx } = setup();
  await runTurn(ctx, { sessionId: 'cli:main', userMessage: 'hi default', agent: undefined });
  await runTurn(ctx, { sessionId: 'cli:main', userMessage: 'hi brief', agent: 'brief' });

  const sessions = ctx.sessions.list().map((s) => s.id).sort();
  assert.deepEqual(sessions, ['brief:cli:main', 'cli:main']);

  // agent session got its own transcript with distinct content
  const briefLog = ctx.sessions.read('brief:cli:main');
  const mainLog = ctx.sessions.read('cli:main');
  assert.ok(briefLog.some((e) => e.role === 'user' && e.content === 'hi brief'));
  assert.ok(mainLog.some((e) => e.role === 'user' && e.content === 'hi default'));
  assert.ok(!mainLog.some((e) => e.role === 'user' && e.content === 'hi brief'));
});

test('unknown agent name in runTurn falls back to default namespace', async () => {
  const { ctx } = setup();
  await runTurn(ctx, { sessionId: 'x', userMessage: 'yo', agent: '../evil' });
  const ids = ctx.sessions.list().map((s) => s.id);
  assert.deepEqual(ids, ['x'], 'unsafe agent must not create a namespaced session');
});
