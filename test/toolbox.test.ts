import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolated home for every state file these tools touch.
process.env.TCRAB_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tbox-'));

import { buildTools, Tool, ToolEnv } from '../src/agent/tools.js';
import { defaults } from '../src/core/config.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { SessionStore } from '../src/agent/sessions.js';
import { parseDdgResults, imageInfo } from '../src/agent/toolbox.js';
import { spawnTask, listTasks, waitForTasks, getTask } from '../src/agent/tasks.js';
import { listIntents, addIntent, removeIntent } from '../src/agent/intents.js';
import { createGoal, updateGoal, listGoals } from '../src/agent/goals.js';
import { suggest, dismiss, listSuggestions } from '../src/agent/suggestions.js';
import { ask, answer, listAsks } from '../src/agent/ask.js';
import { registerSender, recordInbound, turn as convoTurn, listConversations } from '../src/channels/conversations.js';
import { buildSystemPrompt } from '../src/agent/prompt.js';

let env: ToolEnv;
let sessions: SessionStore;

before(() => {
  sessions = new SessionStore(path.join(process.env.TCRAB_HOME!, 'sessions'));
  env = { config: defaults(), memory: new MemoryStore(), skills: new SkillStore(), sessions, sessionId: 'tb-main', providerLabel: 'mock:mock-1' };
});

async function get(name: string): Promise<Tool> {
  const t = (await buildTools(env)).find((x) => x.def.name === name);
  assert.ok(t, `tool registered: ${name}`);
  return t!;
}

async function run(name: string, args: Record<string, unknown> = {}): Promise<string> {
  return (await get(name)).execute(args);
}

function tmpFile(name: string, content: string): string {
  const p = path.join(process.env.TCRAB_HOME!, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// ---- registry ----

test('every catalog capability is a registered tool', async () => {
  const names = (await buildTools(env)).map((t) => t.def.name);
  const expected = [
    'edit', 'apply_patch', 'process', 'terminal', 'web_search', 'view_image',
    'screen', 'automations', 'dashboard', 'portal',
    'conversations_list', 'conversations_send', 'conversations_turn',
    'sessions_list', 'sessions_history', 'sessions_search', 'sessions_send', 'sessions', 'subagents', 'agents_wait', 'sessions_yield',
    'session_status', 'ask_user', 'suggest_task', 'dismiss_task',
    'intent', 'create_goal', 'get_goal', 'update_goal',
    'skill_workshop', 'github_identity_status', 'secrets', 'progress_card',
    'read_file', 'write_file', 'exec', 'web_fetch', 'load_skill', 'remember', 'search_memory', 'get_time', 'list_dir',
  ];
  for (const n of expected) assert.ok(names.includes(n), `registered: ${n}`);
  for (const t of await buildTools(env)) {
    assert.ok(t.def.description.length > 10, `${t.def.name} has a real description`);
  }
});

// ---- edit ----

test('edit: exact replacement, guards, and all=true', async () => {
  const f = tmpFile('edit/a.txt', 'hello world hello');
  await assert.rejects(() => run('edit', { path: f, find: 'missing', replace: 'x' }), /not present/);
  await assert.rejects(() => run('edit', { path: f, find: 'hello', replace: 'x' }), /matches/);
  const out = await run('edit', { path: f, find: 'world', replace: 'there' });
  assert.match(out, /replaced 1/);
  assert.equal(fs.readFileSync(f, 'utf8'), 'hello there hello');
  await run('edit', { path: f, find: 'hello', replace: 'hi', all: true });
  assert.equal(fs.readFileSync(f, 'utf8'), 'hi there hi');
});

test('edit: refuses paths outside allowed roots', async () => {
  await assert.rejects(() => run('edit', { path: '/etc/hostname', find: 'a', replace: 'b' }), /outside allowed roots/);
});

// ---- apply_patch ----

test('apply_patch: modifies an existing file with context checks', async () => {
  const f = tmpFile('patch/b.txt', 'line1\nline2\nline3\n');
  const patch = `--- ${f}\n+++ ${f}\n@@ -1,3 +1,3 @@\n line1\n-line2\n+line2 changed\n line3\n`;
  const out = await run('apply_patch', { patch });
  assert.match(out, /patched 1 file/);
  assert.equal(fs.readFileSync(f, 'utf8'), 'line1\nline2 changed\nline3\n');
});

test('apply_patch: creates a new file from /dev/null', async () => {
  const newTarget = path.join(process.env.TCRAB_HOME!, 'patch/new.txt');
  const patch = `--- /dev/null\n+++ ${newTarget}\n@@ -0,0 +1,2 @@\n+alpha\n+beta\n`;
  await run('apply_patch', { patch });
  assert.equal(fs.readFileSync(path.join(process.env.TCRAB_HOME!, 'patch/new.txt'), 'utf8'), 'alpha\nbeta');
});

test('apply_patch: context mismatch fails loudly', async () => {
  const c = tmpFile('patch/c.txt', 'totally\ndifferent\ncontent\n');
  const patch = `--- ${c}\n+++ ${c}\n@@ -1,3 +1,3 @@\n totally\n-not-what-the-file-has\n+changed\n content\n`;
  await assert.rejects(() => run('apply_patch', { patch }), /context mismatch/);
});

// ---- view_image ----

test('view_image: parses png/jpeg/gif/bmp headers and rejects junk', async () => {
  // minimal PNG: signature + IHDR length/type + width/height
  const png = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
  png.writeUInt32BE(13, 8);
  png.write('IHDR', 12, 'latin1');
  png.writeUInt32BE(640, 16);
  png.writeUInt32BE(480, 20);
  fs.writeFileSync(path.join(process.env.TCRAB_HOME!, 'img.png'), png);
  assert.match(await run('view_image', { path: path.join(process.env.TCRAB_HOME!, 'img.png') }), /png, 640x480, 32 bytes/);

  const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.from([0x20, 0x00, 0x10, 0x00, 0, 0, 0, 0])]);
  assert.deepEqual(imageInfo(gif, gif.length), { format: 'gif', width: 32, height: 16 });

  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x00, 0x02, 0x80, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(imageInfo(jpg, jpg.length), { format: 'jpeg', height: 256, width: 640 });

  const junk = tmpFile('img.bin', 'definitely not an image');
  assert.match(await run('view_image', { path: junk }), /unknown, unknown dimensions/);
});

// ---- web_search (parser is fixture-tested; live is verified manually) ----

test('web_search: parses DuckDuckGo HTML results incl. redirect URLs', () => {
  const html = `
    <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fpage&amp;rut=x">Example Title</a>
    <a class="result__snippet">A snippet about the thing.</a>
    <a rel="nofollow" class="result__a" href="https://direct.example.org/">Second</a>
    <a class="result__snippet">Second snippet.</a>`;
  const res = parseDdgResults(html);
  assert.equal(res.length, 2);
  assert.equal(res[0]!.url, 'https://example.com/page');
  assert.equal(res[0]!.title, 'Example Title');
  assert.equal(res[1]!.url, 'https://direct.example.org/');
  assert.ok(res[0]!.snippet.includes('snippet'));
});

// ---- process + exec background ----

test('process: background exec lists, captures output, kills', async () => {
  const started = await run('exec', { command: 'echo bg-marker-42', background: true });
  const id = /id=(\w+)/.exec(started)?.[1];
  assert.ok(id, 'got process id');
  let out = '';
  for (let i = 0; i < 20; i++) {
    out = await run('process', { action: 'output', id });
    if (out.includes('bg-marker-42')) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.match(out, /bg-marker-42/);
  const listed = await run('process', { action: 'list' });
  assert.match(listed, new RegExp(`${id}`));

  const sleeper = await run('exec', { command: 'sleep 5', background: true });
  const sid = /id=(\w+)/.exec(sleeper)?.[1]!;
  assert.match(await run('process', { action: 'kill', id: sid }), /SIGTERM/);
});

// ---- terminal ----

test('terminal: spawn, read output, close', async () => {
  const opened = await run('terminal', { action: 'spawn', command: 'echo term-ready; sleep 5' });
  const id = /terminal (\w+) open/.exec(opened)?.[1];
  assert.ok(id, 'terminal id');
  let fresh = '';
  for (let i = 0; i < 20; i++) {
    fresh = await run('terminal', { action: 'read', id });
    if (fresh.includes('term-ready')) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.match(fresh, /term-ready/);
  assert.match(await run('terminal', { action: 'write', id, input: 'x' }), /wrote 1 bytes/);
  assert.match(await run('terminal', { action: 'close', id }), /closed/);
  await assert.rejects(() => run('terminal', { action: 'read', id }), /not found/);
});

// ---- automations ----

test('automations: create/list/enable/disable/remove + one-shot reminder', async () => {
  const created = await run('automations', { action: 'create', name: 'tb-job', schedule: '0 8 * * *', prompt: 'say hi' });
  assert.match(created, /created job/);
  const id = /job (\w+)/.exec(created)?.[1]!;
  assert.match(await run('automations', { action: 'list' }), /tb-job/);
  assert.match(await run('automations', { action: 'disable', id }), /disabled/);
  assert.match(await run('automations', { action: 'enable', id }), /enabled/);
  const remind = await run('automations', { action: 'remind', name: 'tb-remind', at: '2h', prompt: 'check oven' });
  assert.match(remind, /reminder set/);
  const remindId = /job (\w+)/.exec(remind)?.[1]!;
  assert.match(await run('automations', { action: 'list' }), /tb-remind · .* · once/);
  await assert.rejects(() => run('automations', { action: 'create', name: 'bad', schedule: 'not cron', prompt: 'x' }), /bad schedule|Invalid|cron/i);
  assert.match(await run('automations', { action: 'remove', id }), /removed/);
  assert.match(await run('automations', { action: 'remove', id: remindId }), /removed/);
});

// ---- screen ----

test('screen: read snapshot + notify without crashing', async () => {
  const snap = await run('screen', { action: 'read' });
  assert.match(snap, /device screen @/);
  assert.match(snap, /provider: mock:mock-1/);
  assert.match(await run('screen', { action: 'notify', title: 'tb note', text: 'hi' }), /notification sent/);
});

// ---- dashboard ----

test('dashboard: read and set widget visibility (persisted to config)', async () => {
  const beforeRead = await run('dashboard', { action: 'read' });
  assert.match(beforeRead, /on hero/);
  const set = await run('dashboard', { action: 'set', widgets: { hero: false } });
  assert.match(set, /off hero/);
  const after = await run('dashboard', { action: 'read' });
  assert.match(after, /off hero/);
  const saved = JSON.parse(fs.readFileSync(path.join(process.env.TCRAB_HOME!, 'config.json'), 'utf8'));
  assert.equal(saved.dashboard.widgets.hero, false);
  await run('dashboard', { action: 'set', widgets: { hero: true } });
  await assert.rejects(() => run('dashboard', { action: 'set', widgets: { bogus: true } }), /unknown widget/);
});

// ---- portal ----

test('portal: add/list/remove registry', async () => {
  assert.match(await run('portal', { action: 'add', id: 'notes', port: 8080 }), /8080/);
  assert.match(await run('portal', { action: 'list' }), /notes -> 127.0.0.1:8080/);
  assert.match(await run('portal', { action: 'remove', id: 'notes' }), /removed/);
  await assert.rejects(() => run('portal', { action: 'add', id: 'bad id!', port: 1 }), /alphanumeric/);
  await assert.rejects(() => run('portal', { action: 'add', id: 'x', port: 99999 }), /port/);
});

// ---- conversations ----

test('conversations: registry, send via registered channel, correlated turn', async () => {
  const sent: { address: string; text: string }[] = [];
  registerSender('tbchan', async (address, text) => {
    sent.push({ address, text });
  });
  await run('conversations_send', { channel: 'tbchan', address: '42', text: 'ping' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.text, 'ping');

  await assert.rejects(() => run('conversations_send', { channel: 'nope', address: '1', text: 'x' }), /not configured/);

  // correlated reply: inbound arrives while waiting
  const t = convoTurn('tbchan', '42', 'question?', 2000);
  await t.send;
  setTimeout(() => recordInbound('tbchan', '42', 'the reply'), 120);
  assert.equal(await t.reply, 'the reply');

  // timeout path (short)
  const t2 = convoTurn('tbchan', '42', 'nobody answers', 700);
  await t2.send;
  assert.equal(await t2.reply, '(no reply in time)');

  recordInbound('tbchan', '42', 'hello there');
  assert.match(await run('conversations_list'), /tbchan:42/);
  assert.ok(listConversations().some((c) => c.channel === 'tbchan'));
});

// ---- sessions family ----

test('sessions: list/history/search/info/reset/delete/rename/set_owner + status', async () => {
  sessions.append('tb-s1', { role: 'user', content: 'remember the zebra fact', ts: Date.now() });
  sessions.append('tb-s1', { role: 'assistant', content: 'zebra noted', ts: Date.now() });
  sessions.append('tb-s2', { role: 'user', content: 'other topic', ts: Date.now() });

  assert.match(await run('sessions_list'), /tb-s1/);
  assert.match(await run('sessions_history', { sessionId: 'tb-s1', limit: 5 }), /remember the zebra fact/);
  assert.match(await run('sessions_search', { query: 'zebra' }), /tb-s1/);
  assert.match(await run('sessions_search', { query: 'nothingmatches' }), /no matches/);

  assert.match(await run('sessions', { action: 'info', sessionId: 'tb-s1' }), /messages: 2/);
  assert.match(await run('sessions', { action: 'set_owner', sessionId: 'tb-s1', to: 'researcher' }), /researcher/);
  assert.match(await run('sessions', { action: 'info', sessionId: 'tb-s1' }), /owner: researcher/);
  assert.match(await run('sessions', { action: 'rename', sessionId: 'tb-s2', to: 'tb-s2-renamed' }), /renamed/);
  assert.match(await run('session_status', { sessionId: 'tb-s1' }), /session: tb-s1/);
  assert.match(await run('session_status', { sessionId: 'tb-s1' }), /provider: mock:mock-1/);
  assert.match(await run('sessions', { action: 'reset', sessionId: 'tb-s2-renamed' }), /cleared/);
  assert.equal(sessions.read('tb-s2-renamed').length, 0);
  assert.match(await run('sessions', { action: 'delete', sessionId: 'tb-s1' }), /deleted/);
  await assert.rejects(() => run('sessions', { action: 'info', sessionId: 'tb-s1' }), /not found/);
});

// ---- subagent tasks ----

test('sessions_spawn / agents_wait / subagents / sessions_yield / sessions_send', async () => {
  const spawnEnv: ToolEnv = {
    ...env,
    spawnTask: (sessionId: string, prompt: string) =>
      spawnTask({ run: async () => `done: ${prompt}`, sessionId, prompt }),
  };
  const orig = env;
  // temporarily swap: build tools with spawn-capable env
  const tool = async (name: string): Promise<Tool> => {
    const t = (await buildTools(spawnEnv)).find((x) => x.def.name === name);
    assert.ok(t, name);
    return t!;
  };
  void orig;

  const spawned = await (await tool('sessions_spawn')).execute({ prompt: 'collect weather', sessionId: 'tb-sub', label: 'weather' });
  assert.match(spawned, /spawned subagent task (\w+)/);
  const taskId = /task (\w+)/.exec(spawned)?.[1]!;

  const status = await (await tool('subagents')).execute({ action: 'status', id: taskId });
  assert.match(status, /running|done/);

  const waited = await (await tool('agents_wait')).execute({ timeoutSec: 5 });
  assert.match(waited, /done: collect weather/);
  assert.equal(getTask(taskId)?.status, 'done');

  const yieldOut = await (await tool('sessions_yield')).execute({});
  assert.match(yieldOut, /nothing pending/);

  const queued = await (await tool('sessions_send')).execute({ sessionId: 'tb-s3', prompt: 'continue the report' });
  assert.match(queued, /queued task \w+ in session tb-s3/);
  await waitForTasks(undefined, 10_000);
  const list = await (await tool('subagents')).execute({ action: 'list' });
  assert.match(list, /done|running/);
  assert.ok(listTasks().length >= 2);
});

// ---- ask_user ----

test('ask_user: operator answers from the UI path', async () => {
  const pending = run('ask_user', { question: 'Ship it?', options: ['yes', 'no'], timeoutSec: 5 });
  let id = '';
  for (let i = 0; i < 30 && !id; i++) {
    const asks = listAsks();
    if (asks.length) id = asks[asks.length - 1]!.id;
    else await new Promise((r) => setTimeout(r, 50));
  }
  assert.ok(id, 'ask registered');
  assert.ok(answer(id, 'yes'));
  assert.match(await pending, /operator answered: yes/);
  assert.ok(!answer(id, 'again'), 'ask is consumed');
});

// ---- suggest / dismiss ----

test('suggest_task / dismiss_task lifecycle', async () => {
  const s = await run('suggest_task', { title: 'Backup the photos', detail: 'weekly' });
  assert.match(s, /suggested task (\w+)/);
  const id = /task (\w+)/.exec(s)?.[1]!;
  assert.ok(listSuggestions('pending').some((x) => x.id === id));
  assert.match(await run('dismiss_task', { id }), /dismissed/);
  assert.ok(!listSuggestions('pending').some((x) => x.id === id));
  await assert.rejects(() => run('dismiss_task', { id: 'nope' }), /not found/);
  void suggest;
  void dismiss;
});

// ---- intent / goals / prompt ----

test('intent: list/add/remove and prompt injection', async () => {
  assert.match(await run('intent', { action: 'list' }), /no standing orders/);
  assert.match(await run('intent', { action: 'add', text: 'Always answer in Banglish' }), /intent added/);
  assert.match(await run('intent', { action: 'list' }), /Always answer in Banglish/);
  const prompt = buildSystemPrompt({ config: env.config, memory: env.memory, skills: env.skills });
  assert.match(prompt, /Standing orders/);
  assert.match(prompt, /Always answer in Banglish/);
  assert.match(prompt, /outrank long-term memory and workspace notes/, 'the precedence over memory is in the prompt itself');
  const id = listIntents()[0]!.id;
  assert.match(await run('intent', { action: 'remove', id }), /removed/);
  assert.equal(listIntents().length, 0);
  assert.ok(!buildSystemPrompt({ config: env.config, memory: env.memory, skills: env.skills }).includes('Standing orders'));
});

test('goals: create/get/update + open goals in prompt', async () => {
  const created = await run('create_goal', { title: 'Ship the toolbox', progress: 10 });
  assert.match(created, /goal created/);
  assert.match(await run('get_goal'), /Ship the toolbox/);
  assert.match(await run('update_goal', { id: 'Ship the toolbox', progress: 50, note: 'halfway' }), /50%/);
  const prompt = buildSystemPrompt({ config: env.config, memory: env.memory, skills: env.skills });
  assert.match(prompt, /# Active goals/);
  assert.match(prompt, /\[50%\] Ship the toolbox/);
  assert.match(await run('update_goal', { id: listGoals()[0]!.id, status: 'done' }), /done/);
  assert.ok(!buildSystemPrompt({ config: env.config, memory: env.memory, skills: env.skills }).includes('# Active goals'));
  void createGoal;
  void updateGoal;
});

// ---- skill_workshop ----

test('skill_workshop: create/check/repair/update', async () => {
  const created = await run('skill_workshop', {
    action: 'create',
    name: 'tb-skill',
    content: 'Do the thing carefully.',
    description: 'A test skill',
  });
  assert.match(created, /created skill tb-skill/);
  const file = path.join(process.env.TCRAB_HOME!, 'skills/tb-skill/SKILL.md');
  assert.ok(fs.existsSync(file));
  assert.match(fs.readFileSync(file, 'utf8'), /^---\nname: tb-skill\ndescription: A test skill/);
  assert.ok(env.skills.list().some((s) => s.name === 'tb-skill'), 'visible in skill store');

  assert.match(await run('skill_workshop', { action: 'check', name: 'tb-skill' }), /ok/);
  await assert.rejects(() => run('skill_workshop', { action: 'create', name: 'tb-skill', content: 'x', description: 'd' }), /exists/);
  assert.match(await run('skill_workshop', { action: 'update', name: 'tb-skill', content: '---\nname: tb-skill\ndescription: Better one\n---\n\nv2' }), /updated/);
  assert.match(fs.readFileSync(file, 'utf8'), /Better one/);

  // strip frontmatter, then repair
  fs.writeFileSync(file, 'bare body without header\n', 'utf8');
  assert.match(await run('skill_workshop', { action: 'check', name: 'tb-skill' }), /missing frontmatter/);
  assert.match(await run('skill_workshop', { action: 'repair', name: 'tb-skill' }), /repaired/);
  const repaired = fs.readFileSync(file, 'utf8');
  assert.match(repaired, /name: tb-skill/);
  assert.match(repaired, /description:/);
});

// ---- github identity ----

test('github_identity_status: reports gh auth and git identity without throwing', async () => {
  const out = await run('github_identity_status');
  assert.match(out, /gh (CLI|auth)/);
  assert.match(out, /git user\.(name|email)/);
});

// ---- secrets ----

test('secrets: set/list metadata/request/delete, values never in list', async () => {
  assert.match(await run('secrets', { action: 'set', name: 'tb-key', value: 'hunter2-secret' }), /saved/);
  const listed = await run('secrets', { action: 'list' });
  assert.match(listed, /tb-key/);
  assert.ok(!listed.includes('hunter2-secret'), 'list must not leak values');
  assert.equal(await run('secrets', { action: 'request', name: 'tb-key' }), 'hunter2-secret');
  assert.match(await run('secrets', { action: 'delete', name: 'tb-key' }), /deleted/);
  await assert.rejects(() => run('secrets', { action: 'request', name: 'tb-key' }), /not found/);
  const audit = fs.readFileSync(path.join(process.env.TCRAB_HOME!, 'state/secrets-audit.log'), 'utf8');
  assert.match(audit, /set tb-key/);
  assert.match(audit, /request tb-key/);
});

// ---- progress card ----

test('progress_card: set/get/clear for the current session', async () => {
  assert.match(await run('progress_card', { action: 'get' }), /no progress card/);
  assert.match(
    await run('progress_card', { action: 'set', todo: ['write tests'], doing: ['wiring'], done: ['design'] }),
    /1 todo, 1 doing, 1 done/,
  );
  const got = await run('progress_card', { action: 'get' });
  assert.match(got, /TODO: write tests/);
  assert.match(got, /DOING: wiring/);
  assert.match(got, /DONE: design/);
  assert.match(await run('progress_card', { action: 'clear' }), /cleared/);
});

// ---- exec gate still respected ----

test('exec still honors allowExec=false', async () => {
  const locked: ToolEnv = { ...env, config: { ...env.config, agent: { ...env.config.agent, allowExec: false } } };
  const execTool = (await buildTools(locked)).find((t) => t.def.name === 'exec')!;
  const out = await execTool.execute({ command: 'echo hi' });
  assert.match(out, /exec is disabled/, '22.1: refused with a sentence, never spawned');
});
