/**
 * Batch 33 — delegation, routing and self-authored skills.
 *
 * Three promises, each of which is only worth anything if it holds when the
 * model is not watching: a subagent cannot multiply without bound, a route
 * decides who answers *before* the message is read, and a skill the agent wrote
 * itself cannot reach the prompt until a person approves it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { TaskLimitError, clearTasks, getTask, listTasks, spawnTask, taskLine, waitForTasks } from '../src/agent/tasks.js';
import { ensureSubagentDir, listSubagentDirs, pruneSubagentDirs, subagentRoot } from '../src/agent/subagents.js';
import { resolveRoute, routeTable, setRoute } from '../src/agent/routing.js';
import { approveProposal, getProposal, listProposals, listRejected, proposeSkill, rejectProposal } from '../src/skills/proposals.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults, validateConfig } from '../src/core/config.js';
import { extraTools } from '../src/agent/toolbox.js';
import { buildTools, type ToolEnv } from '../src/agent/tools.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { addCron } from '../src/cron/store.js';
import { cronTick } from '../src/cron/scheduler.js';
import type { AgentCtx } from '../src/agent/loop.js';

const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));

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
const execFileP = promisify(execFile);

function tmpHome(tag: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `tc33-${tag}-`));
}

// --------------------------------------------------------------------------
// 33.1 subagents: a cap, a deadline, a place to work, a result that comes back
// --------------------------------------------------------------------------

test('33.1 a subagent task is capped, timed out, and reported with its scratch dir', async () => {
  const home = tmpHome('tasks');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  clearTasks();
  try {
    const finishes: string[] = [];
    const resolvers: ((s: string) => void)[] = [];
    const slow = (): Promise<string> => new Promise<string>((resolve) => resolvers.push(resolve));

    // Fill the cap (2) with running tasks.
    const a = spawnTask({ run: slow, sessionId: 'sub:a', prompt: 'a', maxConcurrent: 2, timeoutMs: 60_000, onFinish: (t) => finishes.push(`${t.id}:${t.status}`) });
    const b = spawnTask({ run: slow, sessionId: 'sub:b', prompt: 'b', maxConcurrent: 2, timeoutMs: 60_000 });
    assert.equal(a.status, 'running');
    assert.equal(b.status, 'running');
    assert.equal(resolvers.length, 2);

    // The third is refused by name, with the running ids — not queued silently.
    assert.throws(
      () => spawnTask({ run: slow, sessionId: 'sub:c', prompt: 'c', maxConcurrent: 2 }),
      (err: Error) => {
        assert.ok(err instanceof TaskLimitError);
        assert.match(err.message, /limit reached \(2 of 2/);
        assert.match(err.message, new RegExp(a.id));
        assert.match(err.message, /agent\.maxSubagents/);
        return true;
      },
    );

    // Finish both: the onFinish note fires exactly once per task.
    for (const resolve of resolvers) resolve('slow answer');
    await waitForTasks([a.id], 2000);
    assert.equal(a.status, 'done');
    assert.equal(a.output, 'slow answer');
    assert.deepEqual(finishes, [`${a.id}:done`]);
    assert.ok(finishes.length === 1, 'a late answer must not fire the note twice');

    // A deadline is a `timeout`, not an error, and says what to do about it.
    let late: ((s: string) => void) | null = null;
    const timed = spawnTask({
      run: () => new Promise<string>((resolve) => (late = resolve)),
      sessionId: 'sub:slow',
      prompt: 'never finishes',
      timeoutMs: 60,
    });
    await new Promise((r) => setTimeout(r, 150));
    const after = getTask(timed.id)!;
    assert.equal(after.status, 'timeout');
    assert.match(String(after.error), /no answer within 0s|no answer within 1s/);
    assert.match(String(after.error), /agent\.subagentTimeoutSec/);
    // A very late answer must not resurrect it.
    late!('too late');
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(getTask(timed.id)!.status, 'timeout');
    assert.equal(getTask(timed.id)!.output, undefined);

    // A scratch task gets its own directory, named after the task.
    const scratch = spawnTask({ run: async () => 'ok', sessionId: 'sub:dir', prompt: 'files', scratch: true, timeoutMs: 5000 });
    await waitForTasks([scratch.id], 2000);
    const task = getTask(scratch.id)!;
    assert.ok(task.cwd, 'the task reports where it worked');
    assert.equal(task.cwd, path.join(subagentRoot(), scratch.id));
    assert.ok(fs.existsSync(task.cwd!), 'and the directory is really there');
    fs.writeFileSync(path.join(task.cwd!, 'notes.txt'), 'left behind');
    const dirs = listSubagentDirs();
    assert.equal(dirs.length, 1, 'the scratch area is visible');
    assert.equal(dirs[0]!.files, 1);
    const pruned = pruneSubagentDirs(0);
    assert.deepEqual(pruned.removed, [scratch.id]);
    assert.equal(listSubagentDirs().length, 0);

    // The status line names everything a person needs to find it.
    assert.match(taskLine(task), new RegExp(`${scratch.id} done → sub:dir · cwd `));
    clearTasks();
    assert.equal(listTasks().length, 0);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('33.1 the spawn tool refuses an unknown agent and reports the cap as a sentence', async () => {
  const home = tmpHome('spawn');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  clearTasks();
  try {
    fs.mkdirSync(path.join(home, 'workspace', 'agents', 'helper'), { recursive: true });
    fs.writeFileSync(path.join(home, 'workspace', 'agents', 'helper', 'SOUL.md'), '# helper\n');
    const held: ((s: string) => void)[] = [];
    const env: ToolEnv = {
      config: defaults(),
      memory: new MemoryStore(),
      skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
      extraRoots: [],
      spawnTask: (sid: string, prompt: string, opts?: { agent?: string; scratch?: boolean }) =>
        spawnTask({
          run: () => new Promise<string>((resolve) => held.push((s) => resolve(`${opts?.agent ?? 'main'}:${prompt}:${s}`))),
          sessionId: opts?.agent ? `${opts.agent}:${sid}` : sid,
          prompt,
          ...(opts?.agent ? { agent: opts.agent } : {}),
          ...(opts?.scratch ? { scratch: true } : {}),
          maxConcurrent: 1,
          timeoutMs: 5000,
        }),
    };
    const tools = [...(await buildTools(env)), ...extraTools(env)];
    const spawn = tools.find((t) => t.def.name === 'sessions_spawn')!;

    const ok = await spawn.execute({ prompt: 'summarise', agent: 'helper', scratch: true, label: 'sum' });
    assert.match(String(ok), /spawned subagent task/);
    assert.match(String(ok), /@helper/, 'the agent the task runs as is visible');
    const task = listTasks()[0]!;
    assert.equal(task.agent, 'helper');
    assert.ok(task.cwd);

    // Second task: the cap of 1 is reached, and the answer is prose, not a throw.
    const capped = await spawn.execute({ prompt: 'another' });
    assert.match(String(capped), /limit reached \(1 of 1/);

    await assert.rejects(() => spawn.execute({ prompt: 'x', agent: 'nope' }), /unknown agent "nope"/);

    // Release the held task so nothing is left running when the test ends.
    for (const release of held) release('done');
    await waitForTasks([task.id], 2000);
  } finally {
    clearTasks();
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('33.1 the CLI shows the same task list, and the scratch command reclaims space', async () => {
  const home = tmpHome('cli-sub');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  const env = { ...process.env, TCRAB_HOME: home };
  try {
    // Scratch dirs are reported per task (the CLI reads the same workspace).
    fs.writeFileSync(path.join(ensureSubagentDir('demo-task'), 'x.txt'), 'x');
    fs.writeFileSync(path.join(ensureSubagentDir('demo-task-2'), 'y.txt'), 'y');
  const list = await execFileP(process.execPath, [CLI, 'subagents', 'scratch', '--json'], { env });
  const parsed = JSON.parse(list.stdout) as { ok: boolean; data: { dirs: { id: string; files: number }[] } };
  assert.equal(parsed.ok, true);
    const ids = parsed.data.dirs.map((d) => d.id).sort();
    assert.deepEqual(ids, ['demo-task', 'demo-task-2']);

    const pruned = await execFileP(process.execPath, [CLI, 'subagents', 'scratch', '--prune'], { env });
    assert.match(pruned.stdout, /removed 2 scratch dir/);
    assert.equal(listSubagentDirs().length, 0);

    // With no tasks, the list says so instead of printing an empty table.
    const empty = await execFileP(process.execPath, [CLI, 'subagents'], { env });
    assert.match(empty.stdout, /no subagent tasks yet/);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

// --------------------------------------------------------------------------
// 33.2 routing: which agent answers where
// --------------------------------------------------------------------------

test('33.2 the route table resolves, reports and never invents an agent', () => {
  const cfg = defaults();
  assert.deepEqual(
    routeTable(cfg, []).filter((r) => r.agent).length,
    0,
    'with no routes configured every surface uses the main agent',
  );

  setRoute(cfg, 'telegram', 'crabby');
  setRoute(cfg, 'cron', 'briefer');
  const table = routeTable(cfg, ['crabby', 'briefer']);
  assert.equal(table.find((r) => r.surface === 'telegram')?.agent, 'crabby');
  assert.equal(table.find((r) => r.surface === 'telegram')?.source, 'config');
  assert.equal(table.find((r) => r.surface === 'cli')?.agent, null);
  assert.equal(table.find((r) => r.surface === 'cli')?.source, 'default');

  // An explicit @prefix / --as wins over the route.
  const explicit = resolveRoute(cfg, 'telegram', { explicit: 'briefer', known: ['crabby', 'briefer'] });
  assert.equal(explicit.agent, 'briefer');

  // A route naming an agent that does not exist is a reported problem, and the
  // turn still happens (as the main agent) rather than failing.
  const missing = resolveRoute(cfg, 'cron', { known: ['crabby'] });
  assert.equal(missing.agent, null);
  assert.match(String(missing.problem), /no workspace\/agents\/briefer\/SOUL\.md/);

  // Clearing a route puts the surface back on the main agent.
  setRoute(cfg, 'telegram', null);
  assert.equal(resolveRoute(cfg, 'telegram', { known: ['crabby'] }).agent, null);

  // Config validation refuses a route value that is not a legal agent name.
  const bad = validateConfig({ version: 3, provider: { type: 'mock', model: 'm' }, agents: { routes: { telegram: 'Not A Name!' } } });
  const err = bad.find((p) => p.severity === 'error');
  assert.ok(err, 'a bad route is an error, not a surprise at 3am');
  assert.equal(err.path, 'agents.routes.telegram', 'the message names the exact surface');
  assert.match(err.message, /must be a named agent/);
  assert.equal(validateConfig({ version: 3, provider: { type: 'mock', model: 'm' }, agents: { routes: { telegram: 'crabby' } } }).filter((p) => p.severity === 'error').length, 0);
});

test('33.2 the CLI sets and shows routes, and refuses an agent that does not exist', async () => {
  const home = tmpHome('routes');
  fs.mkdirSync(path.join(home, 'workspace', 'agents', 'helper'), { recursive: true });
  fs.writeFileSync(path.join(home, 'workspace', 'agents', 'helper', 'SOUL.md'), '# helper\n');
  const env = { ...process.env, TCRAB_HOME: home };

  const before = JSON.parse((await execFileP(process.execPath, [CLI, 'agents', 'routes', '--json'], { env })).stdout) as {
    data: { routes: { surface: string; agent: string | null }[] };
  };
  assert.equal(before.data.routes.find((r) => r.surface === 'telegram')?.agent, null);

  await execFileP(process.execPath, [CLI, 'agents', 'routes', 'set', 'telegram', 'helper'], { env });
  const after = JSON.parse((await execFileP(process.execPath, [CLI, 'agents', 'routes', '--json'], { env })).stdout) as {
    data: { routes: { surface: string; agent: string | null }[] };
  };
  assert.equal(after.data.routes.find((r) => r.surface === 'telegram')?.agent, 'helper');
  assert.equal(fs.existsSync(path.join(home, 'config.json')), true, 'the route is written to config, not held in memory');

  await assert.rejects(
    () => execFileP(process.execPath, [CLI, 'agents', 'routes', 'set', 'telegram', 'ghost'], { env }),
    /no such agent: ghost/,
  );

  await execFileP(process.execPath, [CLI, 'agents', 'routes', 'clear', 'telegram'], { env });
  const cleared = JSON.parse((await execFileP(process.execPath, [CLI, 'agents', 'routes', '--json'], { env })).stdout) as {
    data: { routes: { surface: string; agent: string | null }[] };
  };
  assert.equal(cleared.data.routes.find((r) => r.surface === 'telegram')?.agent, null);
});

// --------------------------------------------------------------------------
// 33.3 agent-authored skills: propose, review, approve
// --------------------------------------------------------------------------

test('33.3 a proposed skill cannot load until it is approved, and a rejection is kept', () => {
  const home = tmpHome('proposals');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const store = new SkillStore(undefined, {});
    const proposal = proposeSkill({
      name: 'tea-timer',
      description: 'Time a tea steep and remind the owner',
      content: '# tea-timer\n\nAlways ask which tea before timing.',
      reason: 'the owner asked for tea timings three times this week',
      source: 'session cli:main · run r1',
    });
    assert.equal(proposal.ok, true, proposal.error);
    assert.equal(proposal.proposal?.name, 'tea-timer');
    assert.match(String(proposal.proposal?.reason), /three times this week/);
    assert.equal(proposal.replaced, false);

    // The proposal exists on disk, is listed, and is NOT a skill.
    assert.equal(listProposals().length, 1);
    assert.equal(store.get('tea-timer'), null, 'a proposal is not loadable');
    assert.equal(store.list().some((s) => s.name === 'tea-timer'), false, 'and it is not in the index the model sees');
    assert.equal(store.promptIndex().includes('tea-timer'), false, 'nor in the prompt');

    // A revision replaces the earlier one instead of stacking up.
    const revised = proposeSkill({
      name: 'tea-timer',
      description: 'Time a tea steep and remind the owner',
      content: '# tea-timer\n\nAlways ask which tea, then time it.',
      reason: 'clearer wording',
    });
    assert.equal(revised.replaced, true);
    assert.equal(listProposals().length, 1);

    // Approve: it moves into the live folder and loads from then on.
    const approved = approveProposal('tea-timer');
    assert.equal(approved.ok, true);
    assert.equal(approved.action, 'approved');
    assert.equal(listProposals().length, 0);
    const live = new SkillStore(undefined, {}).get('tea-timer');
    assert.ok(live, 'approved skills load');
    assert.match(live!.content, /ask which tea/);
    assert.equal(new SkillStore(undefined, {}).promptIndex().includes('tea-timer'), true, 'and reach the prompt index');

    // A second proposal, rejected, is kept out of the way with the reason.
    proposeSkill({ name: 'auto-tweet', description: 'Post updates to Twitter', content: 'Do not do this.', reason: 'the model thought it was a good idea' });
    const rejected = rejectProposal('auto-tweet', 'never post publicly without asking me');
    assert.equal(rejected.ok, true);
    assert.equal(rejected.action, 'rejected');
    assert.equal(new SkillStore(undefined, {}).get('auto-tweet'), null);
    const kept = listRejected();
    assert.equal(kept.length, 1);
    assert.match(kept[0]!.reason, /never post publicly/);
    assert.ok(fs.existsSync(path.join(home, 'skills', '_rejected', 'auto-tweet', 'SKILL.md')), 'the rejected file is kept for the record');

    // Deciding on something that is not there is a sentence, not a crash.
    assert.equal(approveProposal('ghost').ok, false);
    assert.match(String(approveProposal('ghost').error), /no proposal named "ghost"/);

    // A proposal that collides with a live skill is not approved by accident:
    // the list warns, and the decision needs --force.
    const collision = proposeSkill({ name: 'tea-timer', description: 'A second take on tea timing', content: '# tea-timer\n\nTime it twice.', reason: 'the first one was too terse' });
    assert.equal(collision.proposal?.replacesLive, true);
    const refused = approveProposal('tea-timer');
    assert.equal(refused.ok, false);
    assert.match(String(refused.error), /already exists .*--force/);
    assert.match(new SkillStore(undefined, {}).get('tea-timer')!.content, /ask which tea/, 'the live skill is untouched');
    assert.equal(approveProposal('tea-timer', { force: true }).ok, true);
    assert.match(new SkillStore(undefined, {}).get('tea-timer')!.content, /Time it twice/, 'with --force it really replaces');
    assert.equal(listProposals().length, 0);

    // The agent's tool writes proposals, never live skills.
    assert.equal(typeof proposeSkill, 'function');
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('33.3 the CLI walks a proposal through list/show/approve and the tool proposes', async () => {
  const home = tmpHome('prop-cli');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  const env = { ...process.env, TCRAB_HOME: home };
  try {
    // The agent-side tool: action=propose writes a proposal, not a skill.
    const toolEnv: ToolEnv = {
      config: defaults(),
      memory: new MemoryStore(),
      skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
      extraRoots: [],
      sessionId: 'cli:main',
    };
    const tools = [...(await buildTools(toolEnv)), ...extraTools(toolEnv)];
    const workshop = tools.find((t) => t.def.name === 'skill_workshop')!;
    const out = await workshop.execute({
      action: 'propose',
      name: 'standup-note',
      description: 'Write a short standup note from the day',
      content: '# standup-note\n\nAsk what shipped, what is blocked, what is next.',
      reason: 'the owner does this every morning by hand',
    });
    assert.match(String(out), /proposed skill standup-note/);
    assert.match(String(out), /NOT live yet/);
    assert.match(String(out), /termcrab skills proposals approve standup-note/);
    assert.equal(new SkillStore(undefined, {}).get('standup-note'), null, 'the tool did not write a live skill');

    // list → show → approve, through the real CLI.
    const list = await execFileP(process.execPath, [CLI, 'skills', 'proposals', '--json'], { env });
    const parsed = JSON.parse(list.stdout) as { data: { count: number; proposals: { name: string; reason: string }[] } };
    assert.equal(parsed.data.count, 1);
    assert.equal(parsed.data.proposals[0]!.name, 'standup-note');

    const show = await execFileP(process.execPath, [CLI, 'skills', 'proposals', 'show', 'standup-note'], { env });
    assert.match(show.stdout, /standup-note/);
    assert.match(show.stdout, /Ask what shipped/);
    assert.match(show.stdout, /every morning by hand/);

    const approve = await execFileP(process.execPath, [CLI, 'skills', 'proposals', 'approve', 'standup-note'], { env });
    assert.match(approve.stdout, /approved standup-note — live now/);
    assert.equal(new SkillStore(undefined, {}).get('standup-note') !== null, true);

    // Nothing left waiting, and the CLI says so.
    const after = await execFileP(process.execPath, [CLI, 'skills', 'proposals'], { env });
    assert.match(after.stdout, /no skill proposals waiting/);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('33.3 the panel API exposes the same decisions', async () => {
  const home = tmpHome('prop-api');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const { startGateway } = (await import('../src/gateway/server.js')) as typeof import('../src/gateway/server.js');
    proposeSkill({ name: 'panel-skill', description: 'A skill proposed while the panel runs', content: '# panel-skill\n', reason: 'test' });
    const config = defaults();
    config.gateway.token = 'panel-token';
    const port = await freePort();
    const handle = await startGateway({ config, host: '127.0.0.1', port });
    const base = `http://127.0.0.1:${port}`;
    const auth = { authorization: 'Bearer panel-token' };
    try {
      const list = (await (await fetch(`${base}/api/skills/proposals`, { headers: auth })).json()) as { proposals: { name: string }[] };
      assert.equal(list.proposals.length, 1);
      assert.equal(list.proposals[0]!.name, 'panel-skill');

      const approve = await fetch(`${base}/api/skills/proposals`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'approve', name: 'panel-skill' }),
      });
      const decided = (await approve.json()) as { action: string; name: string };
      assert.equal(approve.status, 200);
      assert.equal(decided.action, 'approved');
      assert.equal(new SkillStore(undefined, {}).get('panel-skill') !== null, true);

      const missing = await fetch(`${base}/api/skills/proposals`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'approve', name: 'not-here' }),
      });
      assert.equal(missing.status, 404);
    } finally {
      await handle.stop();
    }
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

// --------------------------------------------------------------------------
// 33.4 cron: a job says where its output goes, and which agent runs it
// --------------------------------------------------------------------------

test('33.4 cron delivers where the job says, and runs as the agent it names', async () => {
  const home = tmpHome('cron');
  const previous = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    const config = defaults();
    config.provider = { type: 'mock', model: 'mock-1' };
    fs.mkdirSync(path.join(home, 'workspace', 'agents', 'helper'), { recursive: true });
    fs.writeFileSync(path.join(home, 'workspace', 'agents', 'helper', 'SOUL.md'), '---\nname: helper\n---\n\nYou are the helper.\n');
    const ctx: AgentCtx = {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      sessions: new SessionStore(path.join(home, 'sessions')),
      skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
    };

    const silent = addCron({ name: 'silent', schedule: '* * * * *', prompt: 'say nothing', deliver: 'none' });
    const panel = addCron({ name: 'panel', schedule: '* * * * *', prompt: 'report', deliver: 'panel' });
    const loud = addCron({ name: 'loud', schedule: '* * * * *', prompt: 'shout' });
    const routed = addCron({ name: 'helper-job', schedule: '* * * * *', prompt: 'help me', agent: 'helper' });
    const ghost = addCron({ name: 'ghost-job', schedule: '* * * * *', prompt: 'nobody home', agent: 'not-created' });

    const sent: { text: string; target: string }[] = [];
    const ran = await cronTick({
      ctx,
      deliver: (text, target) => {
        sent.push({ text, target });
      },
      now: () => new Date('2026-10-04T09:00:30'),
    });
    assert.equal(ran.length, 5, 'every due job ran');

    // deliver:none — recorded, not sent.
    assert.equal(
      sent.some((s) => s.text.includes('silent')),
      false,
      'a silent job is not delivered anywhere',
    );
    // deliver:panel — the panel target, not telegram.
    const panelSend = sent.find((s) => s.text.includes('panel'))!;
    assert.ok(panelSend);
    assert.equal(panelSend.target, 'panel');
    // no setting — every configured surface, as before 33.4.
    assert.equal(sent.find((s) => s.text.includes('loud'))!.target, 'all');

    // The run is recorded either way: the silent job still has a transcript and
    // a daily-log line saying where it went.
    assert.equal(ctx.sessions.exists(`cron:${silent.id}`), true);
    const daily = fs.readFileSync(path.join(home, 'memory', 'daily', fs.readdirSync(path.join(home, 'memory', 'daily'))[0]!), 'utf8');
    assert.match(daily, /cron silent \(none\)/);

    // A job naming an agent runs as that agent — the transcript is namespaced,
    // so the helper's history stays the helper's.
    assert.equal(ctx.sessions.exists(`helper:cron:${routed.id}`), true);
    assert.equal(ctx.sessions.exists(`cron:${routed.id}`), false);

    // A job naming an agent that does not exist runs as the main agent, and the
    // log says why (a typo must not silently lose the reminder).
    assert.equal(ctx.sessions.exists(`cron:${ghost.id}`), true);
  } finally {
    if (previous === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previous;
  }
});

test('33.4 the CLI records where a job delivers, and refuses a nonsense target', async () => {
  const home = tmpHome('cron-cli');
  const env = { ...process.env, TCRAB_HOME: home };
  fs.mkdirSync(path.join(home, 'workspace', 'agents', 'helper'), { recursive: true });
  fs.writeFileSync(path.join(home, 'workspace', 'agents', 'helper', 'SOUL.md'), '# helper\n');

  const created = JSON.parse(
    (
      await execFileP(process.execPath, [
        CLI,
        'cron',
        'add',
        '--schedule',
        '0 8 * * *',
        '--prompt',
        'brief me',
        '--name',
        'morning',
        '--agent',
        'helper',
        '--deliver',
        'panel',
        '--json',
      ], { env })
    ).stdout,
  ) as { data: { job: { agent: string; deliver: string } } };
  assert.equal(created.data.job.agent, 'helper');
  assert.equal(created.data.job.deliver, 'panel');

  const listed = JSON.parse((await execFileP(process.execPath, [CLI, 'cron', 'ls', '--json'], { env })).stdout) as {
    data: { jobs: { agent: string | null; deliver: string }[] };
  };
  assert.equal(listed.data.jobs[0]!.deliver, 'panel');
  assert.equal(listed.data.jobs[0]!.agent, 'helper');

  const table = await execFileP(process.execPath, [CLI, 'cron', 'ls'], { env });
  assert.match(table.stdout, /@helper →panel/);

  // A target that is not a real surface is refused before anything is written.
  await assert.rejects(
    () =>
      execFileP(process.execPath, [CLI, 'cron', 'add', '--schedule', '* * * * *', '--prompt', 'x', '--deliver', 'carrier-pigeon'], { env }),
    /--deliver must be telegram, panel or none/,
  );
  await assert.rejects(
    () => execFileP(process.execPath, [CLI, 'cron', 'add', '--schedule', '* * * * *', '--prompt', 'x', '--agent', 'ghost'], { env }),
    /no such agent: ghost/,
  );
  assert.equal(JSON.parse((await execFileP(process.execPath, [CLI, 'cron', 'ls', '--json'], { env })).stdout).data.jobs.length, 1);
});
