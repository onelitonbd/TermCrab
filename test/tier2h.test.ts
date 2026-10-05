/**
 * Batch 19 — context you can see, and context you can shrink.
 *
 *   19.1 tool-result pruning: the newest results stay verbatim, older big ones
 *        become a one-line stub naming the tool, the size and how to re-run it.
 *   19.2 the pruning is real in the loop (a fake provider sees stub bodies).
 *   19.3 context introspection: `termcrab context` / `--json` / `/context`
 *        measure the real prompt sections, tool schemas and hot transcript.
 *   19.4 pluggable context engines: `default` and `compact`, chosen by config,
 *        each describing itself; compact really halves the memory budget.
 *   19.5 the docs and the census moved with the work.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contextEngine, contextReport, listContextEngines, pruneToolResults, renderContext } from '../src/agent/context.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { runTurn } from '../src/agent/loop.js';
import { SessionStore } from '../src/agent/sessions.js';
import type { ProviderMessage } from '../src/providers/types.js';

const execFileAsync = promisify(execFile);
const BIN = path.join(process.cwd(), 'dist/src/bin/termcrab.js');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

const tool = (content: string, name = 'read_file'): ProviderMessage => ({ role: 'tool', content, toolCallId: 'c1', toolName: name });
const user = (content: string): ProviderMessage => ({ role: 'user', content });

// --------------------------------------------------------------------- 19.1

test('19.1 older tool results become one-line stubs', async (t) => {
  await t.test('the newest results are untouched, the oldest are pruned', () => {
    const big = 'x'.repeat(5000);
    const messages: ProviderMessage[] = [tool(big, 'read_file'), user('thanks'), tool(big, 'exec'), tool(big, 'web_fetch')];
    const r = pruneToolResults(messages, { keep: 2 });
    assert.equal(r.pruned, 1, 'only the oldest of three is pruned');
    assert.ok(r.bytesSaved >= 5000);
    assert.match(r.messages[0]!.content, /\[read_file result pruned: 5 KB .*run read_file again if you need it\]/);
    assert.equal(r.messages[2]!.content, big, 'the newest result is verbatim');
  });

  await t.test('small results and non-prunable tools are left alone', () => {
    const messages: ProviderMessage[] = [tool('tiny', 'read_file'), tool('y'.repeat(5000), 'remember'), tool('z'.repeat(5000), 'read_file')];
    const r = pruneToolResults(messages, { keep: 1 });
    assert.equal(r.pruned, 0, 'nothing old enough to prune except a tiny result and a non-prunable tool');
  });

  await t.test('keep: 0 prunes every eligible result but never a user message', () => {
    const messages: ProviderMessage[] = [user('hello'), tool('a'.repeat(1000)), tool('b'.repeat(1000))];
    const r = pruneToolResults(messages, { keep: 0 });
    assert.equal(r.pruned, 2);
    assert.equal(r.messages[0]!.content, 'hello');
    assert.ok(r.messages.every((m) => m.role !== 'user' || m.content === 'hello'));
  });
});

// --------------------------------------------------------------------- 19.2

test('19.2 the loop sends the pruned context, and the engine sets the budget', async (t) => {
  await t.test('a fake provider sees a stub where an old tool result was', async () => {
    const home = tmpHome('t19a-');
    const config = defaults();
    saveConfig(config);
    const sessions = new SessionStore();
    const memory = new MemoryStore();
    const skills = new SkillStore();
    const sid = 'prune-test';
    // Eight old, big tool results, then a user question.
    for (let i = 0; i < 8; i++) {
      sessions.append(sid, { role: 'assistant', content: '', ts: Date.now(), toolCalls: [{ id: `c${i}`, name: 'read_file', args: { path: `f${i}.txt` } }] });
      sessions.append(sid, { role: 'tool', ts: Date.now(), name: 'read_file', toolCallId: `c${i}`, result: `RESULT-${i}-`.repeat(400) });
    }
    sessions.append(sid, { role: 'user', content: 'what did file 0 say?', ts: Date.now() });

    const seen: ProviderMessage[][] = [];
    const provider = {
      name: 'fake',
      model: 'fake-1',
      async chat(req: { messages: ProviderMessage[] }) {
        seen.push(req.messages);
        return { text: 'done', toolCalls: [], stopReason: 'end' as const };
      },
    };
    await runTurn(
      { config, memory, skills, sessions, provider } as never,
      { sessionId: sid, userMessage: 'what did file 0 say?', channel: 'web' },
    );
    const messages = seen.at(-1)!;
    const toolMessages = messages.filter((m) => m.role === 'tool');
    assert.ok(toolMessages.length >= 6);
    assert.match(toolMessages[0]!.content, /result pruned/, 'the oldest result was a stub on the wire');
    assert.match(toolMessages.at(-1)!.content, /RESULT-7-/, 'the newest one was verbatim');
    assert.equal(home, process.env.TCRAB_HOME);
  });

  await t.test('the compact engine halves the memory budget in the real prompt', async () => {
    tmpHome('t19b-');
    const config = defaults();
    config.agent.memoryBudget = 2000;
    saveConfig(config);
    const sessions = new SessionStore();
    const memory = new MemoryStore();
    const skills = new SkillStore();
    for (let i = 0; i < 60; i++) memory.remember(`fact number ${i} about the house and the shop and the car`);

    const systems: string[] = [];
    const provider = {
      name: 'fake',
      model: 'fake-1',
      async chat(req: { system: string }) {
        systems.push(req.system);
        return { text: 'ok', toolCalls: [], stopReason: 'end' as const };
      },
    };
    await runTurn({ config, memory, skills, sessions, provider } as never, { sessionId: 'a', userMessage: 'hi' });
    const defaultSystem = systems.at(-1)!;
    config.agent.contextEngine = 'compact';
    await runTurn({ config, memory, skills, sessions, provider } as never, { sessionId: 'b', userMessage: 'hi' });
    const compactSystem = systems.at(-1)!;
    assert.ok(compactSystem.length <= defaultSystem.length, 'the compact engine never sends a bigger prompt');
    assert.match(compactSystem, /memory budget 1000 bytes/, 'half of 2000');
    assert.ok(systems[0]!.length > systems[1]!.length, 'with this much memory the difference is real');
  });
});

// --------------------------------------------------------------------- 19.3

test('19.3 context introspection measures the real prompt', async (t) => {
  await t.test('the report accounts for sections, tools and the transcript', () => {
    tmpHome('t19c-');
    const memory = new MemoryStore();
    memory.remember('the shop closes at 9pm');
    memory.rememberUser('timezone: Asia/Dhaka');
    const report = contextReport({
      config: defaults(),
      memory,
      skills: new SkillStore(),
      sessionId: 's1',
      channel: 'telegram',
      messages: [user('hello'), tool('x'.repeat(9000), 'read_file')],
      toolCount: 40,
      toolSchemaBytes: 12_000,
    });
    assert.equal(report.engine, 'default');
    assert.ok(report.totalBytes > 0);
    assert.ok(report.sections.some((s) => s.section === 'memory' && s.bytes > 0));
    assert.ok(report.sections.every((s) => s.note.length > 5), 'every section says what it is for');
    assert.equal(report.memory.userBytes > 0, true, 'USER.md is measured');
    assert.equal(report.tools.count, 40);
    assert.equal(report.history.messages, 2);
    assert.ok(report.sections[0]!.bytes >= report.sections.at(-1)!.bytes, 'sections are biggest-first');
  });

  await t.test('the page is readable and names the engine', () => {
    tmpHome('t19d-');
    const report = contextReport({ config: defaults(), memory: new MemoryStore(), skills: new SkillStore(), sessionId: 's', toolCount: 3 });
    const page = renderContext(report);
    assert.match(page, /Context — engine "default"/);
    assert.match(page, /prompt sections/);
    assert.match(page, /tool schemas/);
    assert.match(page, /hot transcript/);
  });

  await t.test('termcrab context --json prints the same numbers', async () => {
    const home = tmpHome('t19e-');
    const config = defaults();
    config.provider = { type: 'mock', model: 'mock-1' } as never;
    saveConfig(config);
    new MemoryStore().remember('the bike service is due in March');
    const { stdout } = await execFileAsync(process.execPath, [BIN, 'context', '--json'], {
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
    });
    const env = JSON.parse(stdout.trim()) as { ok: boolean; command: string; data: { engine: string; sections: unknown[]; totalBytes: number } };
    assert.equal(env.ok, true);
    assert.equal(env.command, 'context');
    assert.equal(env.data.engine, 'default');
    assert.ok(env.data.sections.length >= 4);
    assert.ok(env.data.totalBytes > 100);
  });

  await t.test('the help page lists the command', async () => {
    const { stdout } = await execFileAsync(process.execPath, [BIN, 'help', 'context'], { encoding: 'utf8' });
    assert.match(stdout, /prompt sections|what the model is really sent/i);
    assert.match(stdout, /--json/);
  });
});

// --------------------------------------------------------------------- 19.4

test('19.4 context engines are pluggable, inspectable and honest', async (t) => {
  await t.test('two engines are registered, each with a sentence', () => {
    const engines = listContextEngines();
    assert.deepEqual(engines.map((e) => e.name).sort(), ['compact', 'default']);
    for (const e of engines) assert.ok(e.description.length > 20, `${e.name} describes itself`);
  });

  await t.test('an unknown engine name falls back to default instead of failing', () => {
    assert.equal(contextEngine('nonsense').name, 'default');
    assert.equal(contextEngine(undefined).name, 'default');
    assert.equal(contextEngine('compact').name, 'compact');
  });

  await t.test('compact really is smaller on every knob', () => {
    const config = defaults();
    config.agent.memoryBudget = 3000;
    const d = contextEngine('default');
    const c = contextEngine('compact');
    assert.equal(d.memoryBudget(config), 3000);
    assert.equal(c.memoryBudget(config), 1500);
    assert.ok(c.toolResultWindow() < d.toolResultWindow());
    assert.equal(c.includeExtras(), false);
    assert.equal(d.includeExtras(), true);
  });

  await t.test('the report says which engine is in use', () => {
    tmpHome('t19f-');
    const config = defaults();
    config.agent.contextEngine = 'compact';
    const report = contextReport({ config, memory: new MemoryStore(), skills: new SkillStore(), sessionId: 's' });
    assert.equal(report.engine, 'compact');
    assert.ok(report.notes.some((n) => n.includes('compact')));
  });
});

// --------------------------------------------------------------------- 19.5

test('19.5 docs and census carry the batch-19 evidence', async (t) => {
  await t.test('docs/CLI.md documents the context command', () => {
    const doc = fs.readFileSync('docs/CLI.md', 'utf8');
    assert.match(doc, /termcrab context/);
    assert.match(doc, /sections/);
  });

  await t.test('the census rows cite this batch', () => {
    const census = JSON.parse(fs.readFileSync('docs/openclaw/data/census.json', 'utf8')) as {
      rows: { capability: string; verdict: string; evidence: string }[];
    };
    const byName = (n: string) => census.rows.find((r) => r.capability === n)!;
    assert.equal(byName('Tool-result pruning').verdict, 'WORKING');
    assert.match(byName('Tool-result pruning').evidence, /19\./);
    assert.equal(byName('Context introspection (/context)').verdict, 'WORKING');
    assert.match(byName('Context introspection (/context)').evidence, /19\./);
    assert.equal(byName('Pluggable context engine').verdict, 'WORKING');
    assert.match(byName('Pluggable context engine').evidence, /19\./);
  });
});
