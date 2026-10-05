/**
 * Batch 11 — the compaction summary is written by a model, with the
 * deterministic digest as the documented fallback.
 *
 *   11.1 a configured model writes the digest (the extractive one is not used)
 *   11.2 no model (or a failing one) → the extractive digest, and the entry says
 *        which engine wrote it; nothing is lost from the transcript
 *   11.3 a long overflow is summarised in bounded chunks, and the block injected
 *        into the prompt says what it covers
 *   11.4 the user can see and force it (`termcrab memory compact <session>`,
 *        `/api/status`)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { readDigest, SessionStore, lastDigestSummary } from '../src/agent/sessions.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { buildSystemPrompt } from '../src/agent/prompt.js';
import { defaults } from '../src/core/config.js';
import { AgentCtx, runTurn } from '../src/agent/loop.js';
import { Provider } from '../src/providers/types.js';

const execFileAsync = promisify(execFile);

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

/** A provider that answers every call with a canned summary and records prompts. */
function scriptedSummary(summary = 'The user was talking about the early turns.'): Provider & { calls: string[] } {
  const calls: string[] = [];
  const provider = {
    name: 'summariser',
    model: 'summariser-1',
    calls,
    async chat(req: { messages: { role: string; content?: string }[] }) {
      calls.push(req.messages.map((m) => String(m.content ?? '')).join('\n'));
      return { text: summary, toolCalls: [], stopReason: 'end' as const };
    },
  };
  return provider as unknown as Provider & { calls: string[] };
}

function fill(sessions: SessionStore, id: string, turns: number): void {
  for (let i = 0; i < turns; i++) {
    sessions.append(id, { role: 'user', content: `turn ${i}: ${'detail '.repeat(12)}`, ts: Date.now() });
    sessions.append(id, { role: 'assistant', content: `answer ${i}`, ts: Date.now() });
  }
}

// ------------------------------------------------------------------ 11.1

test('11.1 a configured model writes the digest', async () => {
  const home = tmpHome('tcompact-model-');
  const sessions = new SessionStore();
  const id = 'web:summary';
  fill(sessions, id, 60);

  const provider = scriptedSummary('The first thirty turns were about onboarding.');
  const res = await sessions.compactWithModel(id, 60, { provider });
  assert.equal(res.by, 'model', 'the model wrote it');
  assert.equal(res.model, 'summariser-1');
  assert.ok(res.covered >= 40, `the digest covers the overflow, got ${res.covered}`);

  const md = fs.readFileSync(path.join(home, 'memory', 'compacted', `${id}.md`), 'utf8');
  assert.match(md, /by model summariser-1/, 'the file names the engine');
  assert.match(md, /The first thirty turns were about onboarding\./, 'the model text is what was stored');
  assert.ok(provider.calls.length >= 1, 'the model was actually asked');
  assert.match(provider.calls[0]!, /turn 0/, 'and it saw the turns that left the hot window');

  const view = readDigest(id, 1200);
  assert.equal(view.totalBlocks, 1);
  assert.equal(view.by, 'model');
  assert.ok(view.coveredTurns >= 40);
  fs.rmSync(home, { recursive: true, force: true });
});

test('11.1b a real turn compacts through the model, not the extractor', async () => {
  const home = tmpHome('tcompact-turn-');
  const id = 'web:turn-compact';
  const provider = scriptedSummary('Summary: the session before this one was about taxes.');
  const sessions = new SessionStore();
  fill(sessions, id, 60);

  const ctx: AgentCtx = {
    config: defaults(),
    memory: new MemoryStore(path.join(home, 'memory')),
    skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
    sessions,
    provider: provider as unknown as Provider,
  };
  const reply = await runTurn(ctx, { sessionId: id, userMessage: 'carry on' });
  assert.match(reply, /./, 'the turn answered');
  const md = fs.readFileSync(path.join(home, 'memory', 'compacted', `${id}.md`), 'utf8');
  assert.match(md, /by model summariser-1/, 'the turn used the model summariser');
  assert.match(md, /was about taxes/);
  fs.rmSync(home, { recursive: true, force: true });
});

// ------------------------------------------------------------------ 11.2

test('11.2 without a model — or when it fails — the extractive digest is used and labeled', async () => {
  const home = tmpHome('tcompact-fallback-');
  const sessions = new SessionStore();

  const noModel = 'web:no-model';
  fill(sessions, noModel, 60);
  const a = await sessions.compactWithModel(noModel, 60, {});
  assert.equal(a.by, 'extractive', 'nobody to ask → the extractor');
  const mdA = fs.readFileSync(path.join(home, 'memory', 'compacted', `${noModel}.md`), 'utf8');
  assert.match(mdA, /by extractive/);
  assert.match(mdA, /User: turn 0/, 'the extractive digest still carries the conversation');

  const failing = 'web:failing-model';
  fill(sessions, failing, 60);
  const broken = {
    name: 'broken',
    model: 'broken-1',
    async chat() {
      throw new Error('503 service unavailable');
    },
  } as unknown as Provider;
  const b = await sessions.compactWithModel(failing, 60, { provider: broken });
  assert.equal(b.by, 'extractive', 'a failing model falls back');
  assert.match(b.note ?? '', /503/, 'and the reason is kept');
  const mdB = fs.readFileSync(path.join(home, 'memory', 'compacted', `${failing}.md`), 'utf8');
  assert.match(mdB, /by extractive/);
  assert.match(mdB, /503/, 'the file records why the model was not used');

  assert.equal(sessions.read(failing).length, 120, 'every original line is still readable');
  assert.equal(readDigest(failing, 1200).by, 'extractive');
  fs.rmSync(home, { recursive: true, force: true });
});

// ------------------------------------------------------------------ 11.3

test('11.3 a long overflow is summarised in chunks and the prompt block says what it covers', async () => {
  const home = tmpHome('tcompact-chunks-');
  const sessions = new SessionStore();
  const id = 'web:long';
  fill(sessions, id, 150);

  const provider = scriptedSummary('Part summary.');
  const res = await sessions.compactWithModel(id, 60, { provider, chunkChars: 1500, maxChunks: 4 });
  assert.equal(res.by, 'model');
  assert.ok(provider.calls.length >= 2, `more than one chunk call, got ${provider.calls.length}`);
  for (const call of provider.calls) {
    assert.ok(call.length <= 6000, `each chunk call stays bounded, got ${call.length}`);
  }
  assert.match(res.digest, /Part summary\./);

  assert.ok(res.covered >= 200, `the block count says what it covers, got ${res.covered}`);
  const view = readDigest(id, 1200);
  assert.equal(view.by, 'model');
  assert.ok(view.coveredTurns >= 200);
  assert.ok(view.text.length <= 1200, 'the injected text is capped');

  const system = buildSystemPrompt({
    config: defaults(),
    memory: new MemoryStore(path.join(home, 'memory')),
    skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
    sessionId: id,
  });
  assert.match(system, /Earlier in this conversation/, 'the digest is injected');
  assert.match(system, new RegExp(`${view.coveredTurns} turns`), 'and it says how much it covers');
  assert.match(system, /full transcript is on disk/, 'and where the originals are');
  fs.rmSync(home, { recursive: true, force: true });
});

test('11.3b a huge overflow says what it could not summarise', async () => {
  const home = tmpHome('tcompact-cap-');
  const sessions = new SessionStore();
  const id = 'web:huge';
  fill(sessions, id, 400);
  const provider = scriptedSummary('Condensed.');
  const res = await sessions.compactWithModel(id, 60, { provider, chunkChars: 1000, maxChunks: 3 });
  assert.equal(res.by, 'model');
  assert.equal(provider.calls.length, 3, 'the chunk budget is enforced');
  assert.match(res.note ?? '', /chunk/i, 'the cap is reported, not hidden');
  assert.match(res.digest, /not summarised|older turn/i);
  fs.rmSync(home, { recursive: true, force: true });
});

// ------------------------------------------------------------------ 11.4

test('11.4 the user can see and force it', async (t) => {
  await t.test('lastDigestSummary reports the newest digest', () => {
    const home = tmpHome('tcompact-status-');
    const sessions = new SessionStore();
    const id = 'web:status';
    fill(sessions, id, 60);
    assert.equal(lastDigestSummary(), null, 'nothing compacted yet');

    const provider = scriptedSummary('A short summary for the status view.');
    return sessions.compactWithModel(id, 60, { provider }).then(() => {
      const summary = lastDigestSummary();
      assert.ok(summary, 'a summary is reported');
      assert.equal(summary?.session, id);
      assert.equal(summary?.by, 'model');
      assert.equal(summary?.model, 'summariser-1');
      assert.ok((summary?.coveredTurns ?? 0) >= 40);
      fs.rmSync(home, { recursive: true, force: true });
    });
  });

  await t.test('the CLI compacts a session and names the engine', async () => {
    const home = tmpHome('tcompact-cli-');
    // A real upstream, so this is the actual provider path (not a mock of it).
    const upstream = http.createServer((rq, rs) => {
      const chunks: Buffer[] = [];
      rq.on('data', (c) => chunks.push(c));
      rq.on('end', () => {
        rs.writeHead(200, { 'content-type': 'application/json' });
        rs.end(
          JSON.stringify({
            choices: [
              { message: { role: 'assistant', content: 'CLI wrote this summary of the old turns.' }, finish_reason: 'stop' },
            ],
          }),
        );
      });
    });
    await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
    const port = (upstream.address() as net.AddressInfo).port;

    const config = defaults();
    config.provider = { type: 'openai', baseUrl: `http://127.0.0.1:${port}`, apiKey: 'sk-test', model: 'sum-1', stream: false };
    fs.writeFileSync(path.join(home, 'config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
    const sessions = new SessionStore();
    fill(sessions, 'web:cli-sum', 60);

    const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
    const { stdout } = await execFileAsync(process.execPath, [bin, 'memory', 'compact', 'web:cli-sum'], {
      env: { ...process.env, TCRAB_HOME: home },
      encoding: 'utf8',
      timeout: 30_000,
    });
    assert.match(stdout, /web:cli-sum/, 'names the session');
    assert.match(stdout, /model sum-1/, 'names the engine');
    assert.match(stdout, /\d+ turn/i, 'says how many turns it covers');
    const md = fs.readFileSync(path.join(home, 'memory', 'compacted', 'web:cli-sum.md'), 'utf8');
    assert.match(md, /CLI wrote this summary of the old turns\./);
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
    fs.rmSync(home, { recursive: true, force: true });
  });
});
