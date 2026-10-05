/**
 * Batch 6 — "an agent that asks before it acts".
 *
 * `src/core/approvals.ts` existed with createApproval/waitForApproval and the
 * panel had `GET /api/approvals`, but nothing ever created an approval: a tool
 * that deletes files, runs shell commands or kills processes ran on the model's
 * say-so alone. These tests pin the gate that makes human-in-the-loop real:
 *
 *   6.1 a gated tool stops *before* it runs (the body never executes)
 *   6.2 the approval reaches the panel over SSE, and the answer reaches the run
 *   6.3 a refusal is a tool *result* the model can read, not a crash
 *   6.4 the same request id is answerable without the browser (CLI)
 *   6.5 an unanswered approval expires: configurable, default deny, and says so
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { Approval, listApprovals, resolveApproval } from '../src/core/approvals.js';
import { AgentCtx, AgentEvent, runTurn } from '../src/agent/loop.js';
import { SessionStore } from '../src/agent/sessions.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { Config, defaults, saveConfig } from '../src/core/config.js';
import { GatewayHandle, startGateway } from '../src/gateway/server.js';
import { Provider } from '../src/providers/types.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitFor<T>(fn: () => T | null | undefined, ms = 3000, every = 20): Promise<T> {
  const deadline = Date.now() + ms;
  for (;;) {
    const v = fn();
    if (v) return v;
    assert.ok(Date.now() < deadline, 'timed out waiting for the condition');
    await sleep(every);
  }
}

/** A provider that asks for one tool call, then answers once it sees a result. */
function scriptedToolProvider(tool: string, args: Record<string, unknown>, finalText = 'all done'): Provider {
  return {
    name: 'scripted',
    model: 'scripted-1',
    async chat(req) {
      const sawToolResult = req.messages.some((m) => m.role === 'tool');
      if (sawToolResult) return { text: finalText, toolCalls: [], stopReason: 'end' };
      return { text: '', toolCalls: [{ id: 'call-1', name: tool, args }], stopReason: 'tool' };
    },
  };
}

function makeCtx(approvals: Partial<Config['security']['approvals']> = {}): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tappr-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.security.approvals = { ...config.security.approvals, enabled: true, ...approvals };
  const skillRoot = path.join(home, 'skills');
  fs.mkdirSync(path.join(skillRoot, 'solo'), { recursive: true });
  fs.writeFileSync(path.join(skillRoot, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: solo\n---\n\nbody\n');
  return {
    home,
    ctx: {
      config,
      memory: new MemoryStore(path.join(home, 'memory')),
      skills: new SkillStore([{ dir: skillRoot, origin: 'user' }]),
      sessions: new SessionStore(path.join(home, 'sessions')),
    },
  };
}

/** The approval the running turn is waiting on, matched to its session. */
function pendingFor(sessionId: string): Approval | undefined {
  return listApprovals().find((a) => a.sessionId === sessionId);
}

test('6.1 a gated tool does not run until a human approves it', async () => {
  const { ctx, home } = makeCtx({ tools: ['write_file'], timeoutSec: 30 });
  const target = path.join(home, 'approved.txt');
  ctx.provider = scriptedToolProvider('write_file', { path: target, content: 'written after approval' });

  const events: AgentEvent[] = [];
  const turn = runTurn(ctx, { sessionId: 's-approve', userMessage: 'write the file', onEvent: (e) => events.push(e) });

  const approval = await waitFor(() => pendingFor('s-approve'));
  assert.equal(approval.tool, 'write_file');
  assert.equal(approval.status, 'pending');
  assert.deepEqual(approval.args, { path: target, content: 'written after approval' });
  assert.equal(events.filter((e) => e.type === 'approval').length, 1, 'the panel is told');
  assert.equal(fs.existsSync(target), false, '6.1: the tool body never ran');
  assert.equal(events.some((e) => e.type === 'tool:end'), false, 'no tool result yet');

  resolveApproval(approval.id, true, 'test');
  const reply = await turn;

  assert.equal(reply, 'all done');
  assert.equal(fs.readFileSync(target, 'utf8'), 'written after approval', 'the tool ran after approval');
  assert.ok(events.some((e) => e.type === 'tool:end' && e.ok), 'the tool result reached the loop');
});

test('6.2b the panel renders a pending approval and can answer it', () => {
  const ui = fs.readFileSync(path.join(process.cwd(), 'ui/index.html'), 'utf8');
  assert.match(ui, /addEventListener\('approval'/, 'the panel listens for the approval event');
  assert.match(ui, /function addApprovalCard/, 'the panel has a card for it');
  assert.match(ui, /\/api\/approvals\//, 'the card answers through the approvals API');
  assert.match(ui, /refreshApprovals/, 'a page refresh re-lists gates that are still waiting');
  assert.match(ui, /security\.approvals\.enabled/, 'Settings - Safety can turn the gate on and off');
});

test('6.3 a refusal is a tool result the model can read, not a crash', async () => {
  const { ctx, home } = makeCtx({ tools: ['write_file'], timeoutSec: 30 });
  const target = path.join(home, 'denied.txt');
  ctx.provider = scriptedToolProvider('write_file', { path: target, content: 'should never exist' });

  const events: AgentEvent[] = [];
  const turn = runTurn(ctx, { sessionId: 's-deny', userMessage: 'write the file', onEvent: (e) => events.push(e) });
  const approval = await waitFor(() => pendingFor('s-deny'));

  resolveApproval(approval.id, false, 'test');
  const reply = await turn;

  assert.equal(reply, 'all done', 'the turn finished instead of crashing');
  assert.equal(fs.existsSync(target), false, 'nothing was written');
  const end = events.find((e) => e.type === 'tool:end');
  assert.ok(end && end.type === 'tool:end');
  assert.equal(end.ok, false);
  assert.match(end.result, /refus|denied|not approved/i, 'the model is told why');
  assert.equal(events.filter((e) => e.type === 'error').length, 0, 'a refusal is not an agent error');
});

test('6.5 an unanswered approval expires: default deny, and it says so', async () => {
  const { ctx, home } = makeCtx({ tools: ['write_file'], timeoutSec: 0.3, onTimeout: 'deny' });
  const target = path.join(home, 'timeout.txt');
  ctx.provider = scriptedToolProvider('write_file', { path: target, content: 'too late' });

  const events: AgentEvent[] = [];
  const turn = runTurn(ctx, { sessionId: 's-timeout', userMessage: 'write it', onEvent: (e) => events.push(e) });
  const approval = await waitFor(() => pendingFor('s-timeout'));
  assert.equal(approval.timeoutSec, 0.3, 'the wait window comes from config');

  const reply = await turn;
  assert.equal(reply, 'all done');
  assert.equal(fs.existsSync(target), false, 'timeout denied by default');
  const end = events.find((e) => e.type === 'tool:end');
  assert.ok(end && end.type === 'tool:end');
  assert.match(end.result, /no answer|timed out/i, 'the reason names the timeout');
  assert.match(end.result, /denied/i);
  assert.equal(pendingFor('s-timeout'), undefined, 'it is no longer pending');
});

test('6.5b onTimeout=allow runs the tool, but still labels the decision', async () => {
  const { ctx, home } = makeCtx({ tools: ['write_file'], timeoutSec: 0.3, onTimeout: 'allow' });
  const target = path.join(home, 'late.txt');
  ctx.provider = scriptedToolProvider('write_file', { path: target, content: 'better late' });

  const reply = await runTurn(ctx, { sessionId: 's-late', userMessage: 'write it' });
  assert.equal(reply, 'all done');
  assert.equal(fs.readFileSync(target, 'utf8'), 'better late');
});

/**
 * Run the real CLI against a home. Async on purpose: `execFileSync` would block
 * this process' event loop — and the gateway under test lives *in* this process,
 * so a synchronous child could never reach it.
 */
const execFileAsync = promisify(execFile);
async function runCli(args: string[], home: string): Promise<string> {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    const { stdout } = await execFileAsync(process.execPath, [bin, ...args], {
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
    });
    return stdout;
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(`termcrab ${args.join(' ')} exited non-zero:\n${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`);
  }
}

test('6.2 + 6.4 the panel and the CLI answer the same pending approval', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tappr-gw-'));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  // Gate a harmless tool on purpose: the plumbing is what is under test.
  config.security.approvals = { enabled: true, tools: ['get_time'], timeoutSec: 20, onTimeout: 'deny' };
  config.gateway.token = 'appr-token';
  const port = await new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
  config.gateway.port = port;
  saveConfig(config);
  const handle: GatewayHandle = await startGateway({ config, host: '127.0.0.1', port });
  const base = `http://127.0.0.1:${port}`;
  const auth = { authorization: 'Bearer appr-token', 'content-type': 'application/json' };

  try {
    await t.test('the approval arrives over SSE and is listed for the panel', async () => {
      const controller = new AbortController();
      const sse = (async () => {
        const res = await fetch(base + '/api/events', { headers: auth, signal: controller.signal });
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) throw new Error('SSE stream ended');
            buf += decoder.decode(value, { stream: true });
            for (const frame of buf.split('\n\n')) {
              const m = /^event: (\w+)\ndata: (.*)$/m.exec(frame);
              if (m && m[1] === 'approval') return JSON.parse(m[2]!) as { approval: Approval };
            }
          }
        } finally {
          controller.abort();
        }
      })();
      await sleep(80); // let the subscription attach before the run starts

      const post = await fetch(base + '/api/chat', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ message: 'what time is it?', sessionId: 'web:main' }),
      });
      assert.equal(post.status, 202);
      const { turnId } = (await post.json()) as { turnId: string };

      const frame = await sse;
      assert.equal(frame.approval.tool, 'get_time', '6.2: the panel was told what wants to run');

      const listed = (await (await fetch(base + '/api/approvals', { headers: auth })).json()) as { approvals: Approval[] };
      assert.equal(listed.approvals.length, 1);
      assert.equal(listed.approvals[0]!.id, frame.approval.id);

      // 6.4: the same id, answered from the terminal instead of the browser.
      const cli = await runCli(['approvals', 'list'], home);
      assert.match(cli, new RegExp(frame.approval.id), 'termcrab approvals lists the pending id');
      assert.match(cli, /get_time/);
      const denied = await runCli(['approvals', 'deny', frame.approval.id], home);
      assert.match(denied, /denied/i);

      // The decision reached the waiting run: it finishes with a refusal result.
      let status = 'queued';
      const deadline = Date.now() + 8000;
      let output = '';
      while (Date.now() < deadline) {
        const turn = (await (
          await fetch(`${base}/api/chat/${encodeURIComponent('web:main')}/${turnId}`, { headers: auth })
        ).json()) as { status: string; output?: string };
        status = turn.status;
        if (status === 'done' || status === 'error') {
          output = turn.output ?? '';
          break;
        }
        await sleep(25);
      }
      assert.equal(status, 'done', 'the run completed after the refusal');
      assert.match(output, /refus|denied|not approved/i, 'the model was told about the refusal');

      const after = (await (await fetch(base + '/api/approvals', { headers: auth })).json()) as { approvals: Approval[] };
      assert.equal(after.approvals.length, 0, 'nothing is left pending');
    });
  } finally {
    await handle.stop();
  }
});
