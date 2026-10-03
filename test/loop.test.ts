import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaults } from '../src/core/config.js';
import { AgentCtx, runTurn, toProviderMessages } from '../src/agent/loop.js';
import { AgentEvent } from '../src/agent/loop.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore, Entry } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';
import { resolveInRoots, htmlToText, resolveShell, buildTools } from '../src/agent/tools.js';

function makeCtx(): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tloop-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  // The offline brain: these tests are about the loop, not about HTTP.
  config.provider = { type: 'mock', model: 'mock-1' };
  const memory = new MemoryStore(path.join(home, 'memory'));
  const sessions = new SessionStore(path.join(home, 'sessions'));
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo skill\n---\n\nSolo body\n');
  const skills = new SkillStore([{ dir: skillRoot, origin: 'user' }]);
  return { ctx: { config, memory, skills, sessions }, home };
}

test('mock provider run: tool executes, transcript persists, events fire', async () => {
  const { ctx } = makeCtx();
  const events: AgentEvent[] = [];
  const reply = await runTurn(ctx, {
    sessionId: 't1',
    userMessage: 'hello agent',
    onEvent: (e) => events.push(e),
  });

  assert.match(reply, /\[mock:mock-1\]/);
  const types = events.map((e) => e.type);
  assert.ok(types.includes('run:start'));
  assert.ok(types.includes('tool:start'));
  assert.ok(types.includes('tool:end'));
  assert.ok(types.includes('run:end'));
  assert.ok(types.includes('delta'));

  const entries = ctx.sessions.read('t1');
  assert.equal(entries[0]!.role, 'user');
  assert.equal(entries[entries.length - 1]!.role, 'assistant');
  // user + assistant(toolCall) + tool + assistant = 4
  assert.equal(entries.length, 4);
});

test('memory integration: remember tool writes MEMORY.md', async () => {
  const { ctx } = makeCtx();
  // Force a memory write via the memory API used by the tool.
  const result = ctx.memory.remember('favorite editor is neovim');
  assert.match(result, /Remembered/);
  assert.match(ctx.memory.readHead(), /neovim/);
});

test('exec tool blocked when allowExec=false', async () => {
  const { ctx } = makeCtx();
  ctx.config.agent.allowExec = false;
  const tools = await buildTools({ config: ctx.config, memory: ctx.memory, skills: ctx.skills });
  const exec = tools.find((t) => t.def.name === 'exec')!;
  await assert.rejects(() => exec.execute({ command: 'echo hi' }), /disabled/);
});

test('path guard blocks traversal outside roots', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'troot-'));
  assert.throws(() => resolveInRoots('/etc/passwd', [root]), /outside allowed roots/);
  const inside = path.join(root, 'ok.txt');
  fs.writeFileSync(inside, 'x');
  assert.ok(resolveInRoots(inside, [root]).endsWith('ok.txt'));
});

test('toProviderMessages drops orphan tool results', () => {
  const entries: Entry[] = [
    { role: 'user', content: 'hi', ts: 1 },
    { role: 'tool', toolCallId: 'ghost', name: 'exec', result: 'orphan', ts: 2 },
    { role: 'assistant', content: '', ts: 3, toolCalls: [{ id: 'real', name: 'exec', args: {} }] },
    { role: 'tool', toolCallId: 'real', name: 'exec', result: 'ok', ts: 4 },
    { role: 'assistant', content: 'done', ts: 5 },
  ];
  const msgs = toProviderMessages(entries);
  assert.equal(msgs.filter((m) => m.role === 'tool').length, 1, 'orphan tool result must be dropped');
  assert.equal(msgs[msgs.length - 1]!.content, 'done');
});

test('htmlToText strips scripts/styles/tags', () => {
  const html = '<html><head><style>.x{color:red}</style><script>alert(1)</script></head><body><h1>Title</h1><p>Hello&nbsp;world &amp; friends</p></body></html>';
  const text = htmlToText(html);
  assert.ok(!text.includes('alert'), 'script removed');
  assert.ok(!text.includes('color:red'), 'style removed');
  assert.match(text, /Hello world & friends/);
  assert.match(text, /Title/);
});

test('resolveShell returns an existing executable', () => {
  const shell = resolveShell();
  assert.ok(shell.startsWith('/'), `expected absolute shell path, got ${shell}`);
  assert.ok(fs.existsSync(shell));
});

test('skills loaded into context via load_skill', async () => {
  const { ctx } = makeCtx();
  const tools = await buildTools({ config: ctx.config, memory: ctx.memory, skills: ctx.skills });
  const load = tools.find((t) => t.def.name === 'load_skill')!;
  const out = await load.execute({ name: 'solo' });
  assert.match(out, /Solo body/);
  await assert.rejects(() => load.execute({ name: 'nope' }), /skill not found/);
});

test('web_fetch rejects non-http URLs', async () => {
  const { ctx } = makeCtx();
  const tools = await buildTools({ config: ctx.config, memory: ctx.memory, skills: ctx.skills });
  const wf = tools.find((t) => t.def.name === 'web_fetch')!;
  await assert.rejects(() => wf.execute({ url: 'file:///etc/passwd' }), /http/);
});

// ---- v0.23.1: empty model replies must never be silent ----

test('empty model reply: retried once, then a loud notice — never a silent blank', async () => {
  const { ctx } = makeCtx();
  let calls = 0;
  ctx.provider = {
    name: 'stub',
    model: 'stub-1',
    chat: async () => {
      calls++;
      return { text: '', toolCalls: [], stopReason: 'end' as const };
    },
  };
  const reply = await runTurn(ctx, { sessionId: 't-empty', userMessage: 'hi' });
  assert.equal(calls, 2, 'one retry before giving up');
  assert.match(reply, /^\[empty reply\]/, 'user sees an explicit notice, not blank');
  const assistants = ctx.sessions.read('t-empty').filter((e) => e.role === 'assistant');
  assert.ok(assistants.length > 0, 'notice is persisted');
  assert.ok(
    assistants.every((e) => e.content.trim().length > 0),
    'no blank assistant entries land in the session',
  );
});

test('empty model reply recovers when the retry produces text', async () => {
  const { ctx } = makeCtx();
  let calls = 0;
  ctx.provider = {
    name: 'stub',
    model: 'stub-1',
    chat: async () => {
      calls++;
      return calls === 1
        ? { text: '', toolCalls: [], stopReason: 'end' as const }
        : { text: 'hello from the retry', toolCalls: [], stopReason: 'end' as const };
    },
  };
  const reply = await runTurn(ctx, { sessionId: 't-empty2', userMessage: 'hi' });
  assert.equal(reply, 'hello from the retry');
  assert.equal(calls, 2, 'exactly one retry');
});

test('empty reply notice names the token-limit case', async () => {
  const { ctx } = makeCtx();
  let calls = 0;
  ctx.provider = {
    name: 'stub',
    model: 'stub-1',
    chat: async () => {
      calls++;
      return { text: '', toolCalls: [], stopReason: 'length' as const };
    },
  };
  const reply = await runTurn(ctx, { sessionId: 't-empty3', userMessage: 'hi' });
  assert.equal(calls, 2);
  assert.match(reply, /reply space/);
});

test('toProviderMessages drops blank assistant turns from old sessions', () => {
  const entries: Entry[] = [
    { role: 'user', content: 'hi', ts: 1 },
    { role: 'assistant', content: '', ts: 2 },
    { role: 'assistant', content: 'done', ts: 3 },
    { role: 'assistant', content: '   ', ts: 4 },
  ];
  const msgs = toProviderMessages(entries);
  assert.equal(msgs.filter((m) => m.role === 'assistant').length, 1, 'blank turns skipped');
  assert.equal(msgs[msgs.length - 1]!.content, 'done');
});

// ---- v0.28.0: the model must know which channel it is replying on ----

test('runTurn tells the model which channel it is replying on', async () => {
  const { ctx } = makeCtx();
  const captured: string[] = [];
  ctx.provider = {
    name: 'stub',
    model: 'stub-1',
    chat: async (req) => {
      captured.push(req.system);
      return { text: 'ok', toolCalls: [], stopReason: 'end' as const };
    },
  };

  await runTurn(ctx, { sessionId: 't-ch-tg', userMessage: 'hi', channel: 'telegram' });
  assert.match(captured[0]!, /# Current channel/);
  assert.match(captured[0]!, /replying via Telegram \(mobile chat app\)/);
  assert.match(captured[0]!, /Never use tables/);

  await runTurn(ctx, { sessionId: 't-ch-web', userMessage: 'hi', channel: 'web' });
  assert.match(captured[1]!, /replying via the web panel/);
  assert.ok(!captured[1]!.includes('Never use tables'), 'web keeps full markdown');

  await runTurn(ctx, { sessionId: 't-ch-cli', userMessage: 'hi', channel: 'cli' });
  assert.match(captured[2]!, /replying via the terminal TUI/);

  await runTurn(ctx, { sessionId: 't-ch-none', userMessage: 'hi' });
  assert.ok(!captured[3]!.includes('# Current channel'), 'no channel -> no section');
});
