/**
 * Batch 27.2–27.4 — the providers and the loop's own limits.
 *
 *   27.2 native wire formats: Anthropic (`/v1/messages`) and Gemini
 *        (`:generateContent`) behind the same Provider contract, with a fake
 *        upstream asserting the exact request body each one sends.
 *   27.3 the catalog and named keys: `termcrab models` answers even offline;
 *        `termcrab auth` keeps keys out of config.json, and a missing or
 *        mismatched profile is a clear error rather than an empty key.
 *   27.4 the watchdog: a turn that stops making progress stops itself, says
 *        why, and leaves the partial answer in place.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { createAnthropic, toAnthropicMessages, readAnthropicMessage, anthropicUrl } from '../src/providers/anthropic.js';
import { createGemini, toGeminiContents, geminiUrl, readGeminiCandidate } from '../src/providers/gemini.js';
import { resolveProvider } from '../src/providers/index.js';
import { describeModel, capabilityLine, listModels, listModelsLive, catalogFor } from '../src/providers/catalog.js';
import { listAuthProfiles, setAuthProfile, removeAuthProfile, resolveAuth, authProfileKey } from '../src/core/auth-profiles.js';
import { defaults, loadConfig, saveConfig } from '../src/core/config.js';
import { AgentCtx, runTurn } from '../src/agent/loop.js';
import { SessionStore } from '../src/agent/sessions.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { Provider } from '../src/providers/types.js';

function home(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t27-${tag}-`));
  process.env.TCRAB_HOME = dir;
  return dir;
}

function runCli(args: string[], dir: string): { stdout: string; status: number; stderr: string } {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  try {
    const stdout = execFileSync(process.execPath, [bin, ...args], {
      encoding: 'utf8',
      env: { ...process.env, TCRAB_HOME: dir },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { stdout, status: 0, stderr: '' };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? '', status: e.status ?? 1, stderr: e.stderr ?? '' };
  }
}

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

/** A fake upstream that records one request and answers with a canned body. */
async function fakeUpstream(
  answer: (req: { url: string; headers: Record<string, string>; body: Record<string, unknown> }) => { status?: number; json?: unknown; text?: string; sse?: string[] },
): Promise<{ port: number; seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[]; close: () => Promise<void> }> {
  const port = await freePort();
  const seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> }[] = [];
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      seen.push({ url: req.url ?? '', headers: req.headers as Record<string, string>, body });
      const out = answer({ url: req.url ?? '', headers: req.headers as Record<string, string>, body });
      res.statusCode = out.status ?? 200;
      if (out.sse) {
        res.setHeader('content-type', 'text/event-stream');
        for (const frame of out.sse) res.write(`event: x\ndata: ${frame}\n\n`);
        res.end();
        return;
      }
      res.setHeader('content-type', 'application/json');
      res.end(out.json !== undefined ? JSON.stringify(out.json) : (out.text ?? '{}'));
    });
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', () => r()));
  return { port, seen, close: () => new Promise<void>((r) => server.close(() => r())) };
}

// --------------------------------------------------------------------------- 27.2

test('27.2 the Anthropic adapter speaks messages, not chat/completions', async () => {
  assert.equal(anthropicUrl(undefined), 'https://api.anthropic.com/v1/messages');
  assert.equal(anthropicUrl('https://api.anthropic.com'), 'https://api.anthropic.com/v1/messages');
  assert.equal(anthropicUrl('http://127.0.0.1:9/v1'), 'http://127.0.0.1:9/v1/messages');

  const upstream = await fakeUpstream(() => ({
    json: {
      content: [
        { type: 'thinking', thinking: 'let me think', signature: 'sig' },
        { type: 'text', text: 'Reading two files.' },
        { type: 'tool_use', id: 'toolu_1', name: 'read_file', input: { path: 'a.txt' } },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 120, output_tokens: 30 },
    },
  }));
  try {
    const provider = createAnthropic({ baseUrl: `http://127.0.0.1:${upstream.port}`, apiKey: 'sk-ant-test', model: 'claude-sonnet-4-5', stream: false });
    const result = await provider.chat({
      system: 'You are Crabby.',
      messages: [
        { role: 'user', content: 'read a.txt — here is a photo', },
        { role: 'assistant', content: 'ok', toolCalls: [{ id: 'toolu_1', name: 'read_file', args: { path: 'a.txt' } }] },
        { role: 'tool', content: 'hello world', toolCallId: 'toolu_1', toolName: 'read_file' },
      ],
      tools: [{ name: 'read_file', description: 'read a file', schema: { type: 'object', properties: { path: { type: 'string' } } } }],
      image: { mimeType: 'image/png', dataBase64: 'aGk=' },
    });

    const seen = upstream.seen[0]!;
    assert.equal(seen.url, '/v1/messages');
    assert.equal(seen.headers['x-api-key'], 'sk-ant-test');
    assert.equal(seen.headers['anthropic-version'], '2023-06-01');
    assert.equal(seen.body.system, 'You are Crabby.', 'the system prompt is a top-level field');
    assert.equal(seen.body.model, 'claude-sonnet-4-5');
    assert.equal(seen.body.max_tokens, 4096);
    assert.equal(seen.body.stream, undefined, 'stream:false sends no stream flag');

    const messages = seen.body.messages as { role: string; content: Record<string, unknown>[] }[];
    assert.equal(messages.length, 3);
    // The image rides the last user turn as a real image block.
    assert.deepEqual(messages[0]!.content[0], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'aGk=' } });
    // The tool call is a tool_use block inside the assistant turn.
    assert.deepEqual(messages[1]!.content.at(-1), { type: 'tool_use', id: 'toolu_1', name: 'read_file', input: { path: 'a.txt' } });
    // The tool result is a *user* turn with tool_result.
    assert.deepEqual(messages[2], { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'hello world' }] });
    // Tools use input_schema, not parameters.
    const tools = seen.body.tools as { name: string; input_schema: unknown }[];
    assert.equal(tools[0]!.name, 'read_file');
    assert.deepEqual(tools[0]!.input_schema, { type: 'object', properties: { path: { type: 'string' } } });

    assert.equal(result.text, 'Reading two files.');
    assert.equal(result.toolCalls[0]!.name, 'read_file');
    assert.deepEqual(result.toolCalls[0]!.args, { path: 'a.txt' });
    assert.equal(result.stopReason, 'tool');
    assert.equal(result.usage!.promptTokens, 120);
    assert.equal(result.usage!.completionTokens, 30);
    assert.equal(result.thinking, 'let me think');
    assert.equal((result.thinkingBlocks ?? []).length, 1, 'thinking blocks are kept to echo back');
  } finally {
    await upstream.close();
  }
});

test('27.2 Anthropic streaming reassembles text, thinking and partial tool JSON', async () => {
  const upstream = await fakeUpstream(() => ({
    sse: [
      JSON.stringify({ type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 0 } } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'hmm' } }),
      JSON.stringify({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Hel' } }),
      JSON.stringify({ type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'lo' } }),
      JSON.stringify({ type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 'toolu_9', name: 'web_search' } }),
      JSON.stringify({ type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"query":' } }),
      JSON.stringify({ type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '"crab"}' } }),
      JSON.stringify({ type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 7 } }),
    ],
  }));
  try {
    const provider = createAnthropic({ baseUrl: `http://127.0.0.1:${upstream.port}`, apiKey: 'k', model: 'claude-sonnet-4-5' });
    const deltas: string[] = [];
    const think: string[] = [];
    const result = await provider.chat(
      { system: 's', messages: [{ role: 'user', content: 'search' }], tools: [] },
      { onDelta: (d) => deltas.push(d), onThinkingDelta: (d) => think.push(d) },
    );
    assert.equal(result.text, 'Hello');
    assert.deepEqual(deltas, ['Hel', 'lo'], 'the typewriter gets the deltas as they arrive');
    assert.deepEqual(think, ['hmm']);
    assert.equal(result.stopReason, 'tool');
    assert.deepEqual(result.toolCalls[0], { id: 'toolu_9', name: 'web_search', args: { query: 'crab' } });
    assert.equal(result.usage!.promptTokens, 10);
    assert.equal(result.usage!.completionTokens, 7);
  } finally {
    await upstream.close();
  }
});

test('27.2 the Gemini adapter speaks contents/parts, and merges function responses', async () => {
  assert.match(geminiUrl(undefined, 'gemini-2.5-flash', { stream: false, apiKey: 'k' }), /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent\?key=k$/);
  assert.match(geminiUrl('http://x/v1beta', 'm', { stream: true, apiKey: 'k' }), /^http:\/\/x\/v1beta\/models\/m:streamGenerateContent\?key=k&alt=sse$/);

  const upstream = await fakeUpstream(() => ({
    json: {
      candidates: [
        {
          content: {
            parts: [
              { text: 'On it. ' },
              { functionCall: { name: 'read_file', args: { path: 'b.txt' } } },
            ],
          },
          finishReason: 'STOP',
        },
      ],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 12, totalTokenCount: 62 },
    },
  }));
  try {
    const provider = createGemini({ baseUrl: `http://127.0.0.1:${upstream.port}/v1beta`, apiKey: 'goog-key', model: 'gemini-2.5-flash', stream: false });
    const result = await provider.chat({
      system: 'You are Crabby.',
      messages: [
        { role: 'user', content: 'look at this', },
        { role: 'assistant', content: 'ok', toolCalls: [{ id: 'x', name: 'read_file', args: { path: 'b.txt' } }] },
        { role: 'tool', content: 'file contents', toolCallId: 'x', toolName: 'read_file' },
      ],
      tools: [{ name: 'read_file', description: 'read', schema: { type: 'object', properties: {} } }],
      image: { mimeType: 'image/jpeg', dataBase64: 'aGk=' },
    });

    const seen = upstream.seen[0]!;
    assert.equal(seen.headers['x-goog-api-key'], 'goog-key');
    assert.deepEqual(seen.body.systemInstruction, { parts: [{ text: 'You are Crabby.' }] });
    const contents = seen.body.contents as { role: string; parts: Record<string, unknown>[] }[];
    assert.equal(contents[0]!.role, 'user');
    assert.deepEqual(contents[0]!.parts[0], { inlineData: { mimeType: 'image/jpeg', data: 'aGk=' } });
    assert.equal(contents[1]!.role, 'model', 'assistant is `model` in Gemini');
    assert.deepEqual(contents[1]!.parts.at(-1), { functionCall: { name: 'read_file', args: { path: 'b.txt' } } });
    assert.deepEqual(contents[2]!.parts[0], { functionResponse: { name: 'read_file', response: { result: 'file contents' } } });
    const decls = (seen.body.tools as { functionDeclarations: { name: string; parameters: unknown }[] }[])[0]!.functionDeclarations;
    assert.equal(decls[0]!.name, 'read_file');
    assert.deepEqual(decls[0]!.parameters, { type: 'object', properties: {} });

    assert.equal(result.text, 'On it. ');
    assert.equal(result.toolCalls[0]!.name, 'read_file', 'the function call becomes a tool call');
    assert.match(result.toolCalls[0]!.id, /^gemini-1-1-read_file$/, 'stable synthesized ids, because Gemini sends none');
    assert.equal(result.usage!.totalTokens, 62);
  } finally {
    await upstream.close();
  }
});

test('27.2 resolveProvider picks the vendor from provider.type, and config accepts all four', () => {
  const anth = resolveProvider({ type: 'anthropic', model: 'claude-haiku-4-5', apiKey: 'k' });
  const gem = resolveProvider({ type: 'gemini', model: 'gemini-2.5-pro', apiKey: 'k' });
  const oa = resolveProvider({ type: 'openai', model: 'gpt-4o-mini', apiKey: 'k' });
  assert.equal(anth.name, 'anthropic');
  assert.equal(gem.name, 'gemini');
  assert.match(oa.name, /openai/, 'the OpenAI-compatible adapter keeps its own label');

  const dir = home('cfg');
  const cfg = defaults();
  cfg.provider = { type: 'anthropic', model: 'claude-sonnet-4-5', apiKey: 'k' };
  saveConfig(cfg);
  assert.equal(loadConfig().provider.type, 'anthropic', 'a native type survives a round-trip');
  cfg.provider = { type: 'gemini', model: 'gemini-2.5-flash', apiKey: 'k' };
  saveConfig(cfg);
  assert.equal(loadConfig().provider.type, 'gemini');
  cfg.provider = { type: 'ollama', model: 'llama3', baseUrl: 'http://127.0.0.1:11434/v1' } as never;
  saveConfig(cfg);
  assert.equal(loadConfig().provider.type, 'openai', 'an old ollama config still means "openai-compatible"');
  void dir;
});

// --------------------------------------------------------------------------- 27.3

test('27.3 the catalog answers offline, and asks the endpoint when it can', async () => {
  const known = describeModel('claude-sonnet-4-5');
  assert.equal(known.source, 'catalog');
  assert.equal(known.vision, true);
  assert.equal(known.tools, true);
  assert.match(capabilityLine(known), /200k context .* sees images .* tools .* \$3\/\$15\/M/);
  assert.match(capabilityLine(describeModel('some-private-model')), /capabilities unknown/);
  assert.equal(describeModel('openrouter/anthropic/claude-3-5-haiku').source, 'catalog', 'vendor prefixes are stripped for matching');

  const offline = await listModels({ type: 'openai', model: 'gpt-4o-mini', baseUrl: 'http://127.0.0.1:1/v1', apiKey: 'x' });
  assert.equal(offline.live, false);
  assert.match(offline.note, /could not reach the endpoint/);
  assert.equal(offline.models[0]!.id, 'gpt-4o-mini', 'the configured model is always listed');
  assert.ok(catalogFor('anthropic').some((m) => m.id === 'claude-opus-4'));

  const upstream = await fakeUpstream(() => ({ json: { data: [{ id: 'gpt-4o-mini' }, { id: 'private-model-x' }] } }));
  try {
    const cfg = { type: 'openai' as const, model: 'gpt-4o-mini', baseUrl: `http://127.0.0.1:${upstream.port}/v1`, apiKey: 'k' };
    const live = await listModelsLive(cfg);
    assert.deepEqual(live.map((m) => m.id), ['gpt-4o-mini', 'private-model-x']);
    assert.equal(live[0]!.source, 'endpoint');
    assert.equal(live[1]!.source, 'endpoint');
    const merged = await listModels(cfg);
    assert.equal(merged.live, true);
    assert.equal(merged.models.length, 2, 'nothing from the catalog is added when the endpoint answered');
  } finally {
    await upstream.close();
  }

  const dir = home('models-cli');
  const cfg = defaults();
  cfg.provider = { type: 'openai', model: 'gpt-4o-mini', baseUrl: 'http://127.0.0.1:1/v1', apiKey: 'x' };
  saveConfig(cfg);
  const cli = runCli(['models', '--json'], dir);
  assert.equal(cli.status, 0, cli.stderr);
  const data = JSON.parse(cli.stdout) as { data: { live: boolean; models: { id: string; capabilities: string }[] } };
  assert.equal(data.data.live, false);
  assert.ok(data.data.models.some((m) => m.id === 'gpt-4o-mini'));
});

test('27.3 named keys never reach config.json, and a wrong name is a clear error', () => {
  const dir = home('auth');
  const cfg = defaults();
  cfg.provider = { type: 'anthropic', model: 'claude-haiku-4-5', authProfile: 'work' };
  saveConfig(cfg);

  assert.equal(runCli(['auth', 'list'], dir).stdout.includes('no auth profiles'), true);
  const added = runCli(['auth', 'add', 'work', '--provider', 'anthropic', '--key', 'sk-ant-secret'], dir);
  assert.equal(added.status, 0, added.stderr);
  assert.match(added.stdout, /saved profile work \(anthropic\)/);
  assert.doesNotMatch(added.stdout, /sk-ant-secret/, 'the key is never echoed');

  // The file that holds it is 0600, and config.json has no key in it.
  const authFile = path.join(dir, 'state', 'auth-profiles.json');
  assert.equal(fs.statSync(authFile).mode & 0o777, 0o600);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'), /sk-ant-secret/);
  // The audit log records use, not values.
  assert.match(fs.readFileSync(path.join(dir, 'state', 'auth-audit.log'), 'utf8'), /set work \(anthropic\)/);

  const list = JSON.parse(runCli(['auth', 'list', '--json'], dir).stdout) as { data: { profiles: { id: string; hasKey: boolean }[] } };
  assert.deepEqual(list.data.profiles, [
    { id: 'work', provider: 'anthropic', createdAt: list.data.profiles[0]!['createdAt' as never] as never, updatedAt: list.data.profiles[0]!['updatedAt' as never] as never, hasKey: true },
  ]);

  const resolved = resolveAuth(loadConfig().provider);
  assert.equal(resolved.apiKey, 'sk-ant-secret', 'the key is filled in where the provider is built');
  assert.equal(authProfileKey('work'), 'sk-ant-secret');

  // A profile for another vendor is a config mistake, not a silent fallback.
  const mismatched = { ...loadConfig().provider, type: 'gemini' as const };
  assert.throws(() => resolveAuth(mismatched), /is for anthropic, but the provider is gemini/);
  const missing = { ...loadConfig().provider, authProfile: 'nope' };
  assert.throws(() => resolveAuth(missing), /auth profile "nope" not found — add it: termcrab auth add nope --provider anthropic --key <key>/);

  assert.equal(removeAuthProfile('work'), true);
  assert.equal(listAuthProfiles().length, 0);
  assert.equal(removeAuthProfile('work'), false, 'removing twice says so');
});

// --------------------------------------------------------------------------- 27.4

test('27.4 a turn that makes no progress stops itself, and keeps what it had said', async () => {
  const dir = home('watchdog');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.agent = { ...config.agent, idleSec: 1, turnBudgetSec: 30 };
  const ctx: AgentCtx = {
    config,
    memory: new MemoryStore(path.join(dir, 'memory')),
    skills: new SkillStore(),
    sessions: new SessionStore(path.join(dir, 'sessions')),
  };

  // A provider that says something, then hangs far past the idle window.
  let call = 0;
  const hanging: Provider = {
    name: 'hang',
    model: 'hang-1',
    async chat(_req, opts) {
      call++;
      if (call === 1) {
        return { text: 'starting the long thing', toolCalls: [{ id: 'c1', name: 'get_time', args: {} }], stopReason: 'tool' };
      }
      // The second call never comes back on its own: exactly the "it just
      // sits there" case the idle clock exists for. Like a real adapter, it
      // honours the signal the loop hands it.
      return await new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('the fake upstream never answered')), 60_000);
        opts?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          },
          { once: true },
        );
      });
    },
  };
  ctx.provider = hanging;

  const started = Date.now();
  const text = await runTurn(ctx, { sessionId: 's-idle', userMessage: 'do the long thing' });
  const elapsed = Date.now() - started;

  assert.ok(elapsed < 20_000, `the watchdog stopped the turn (took ${elapsed}ms, not 60s)`);
  assert.match(text, /no progress for \d+s while waiting for hang to reply/, 'the reason names what it was waiting on');
  assert.match(text, /agent\.idleSec=1/);
  assert.match(text, /starting the long thing/, 'the partial answer is kept, not thrown away');

  // The same run is recorded as an error, so /api/runs and the panel can say so.
  const { listRuns } = await import('../src/core/tracing.js');
  const run = listRuns().find((r) => r.sessionId === 's-idle');
  assert.ok(run, 'the run was recorded');
  assert.equal(run!.status, 'error');
  assert.equal(run!.error, 'watchdog');

  // A budget that has already passed stops the turn before the first call.
  const tiny: AgentCtx = {
    config: { ...config, agent: { ...config.agent, turnBudgetSec: 0, idleSec: 0 } },
    memory: new MemoryStore(path.join(dir, 'memory')),
    skills: new SkillStore(),
    sessions: new SessionStore(path.join(dir, 'sessions')),
  };
  tiny.provider = { name: 'quick', model: 'q', async chat() { return { text: 'hi', toolCalls: [], stopReason: 'end' }; } };
  assert.equal(await runTurn(tiny, { sessionId: 's-zero', userMessage: 'hello' }), 'hi', '0 disables both clocks');
});

// --------------------------------------------------------------------------- 27.3 (cont.)

test('27.3 the local tier is real, and never falls back silently', async () => {
  const dir = home('local');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const ctx: AgentCtx = {
    config,
    memory: new MemoryStore(path.join(dir, 'memory')),
    skills: new SkillStore(),
    sessions: new SessionStore(path.join(dir, 'sessions')),
  };
  const local: Provider = { name: 'local', model: 'llama3.2', async chat() { return { text: 'answered locally', toolCalls: [], stopReason: 'end' }; } };
  const cloud: Provider = { name: 'cloud', model: 'mock-1', async chat() { return { text: 'answered in the cloud', toolCalls: [], stopReason: 'end' }; } };

  ctx.localProvider = local;
  ctx.provider = cloud;
  assert.equal(await runTurn(ctx, { sessionId: 's-local', userMessage: 'hi', tier: 'local' }), 'answered locally');
  assert.equal(await runTurn(ctx, { sessionId: 's-cloud', userMessage: 'hi' }), 'answered in the cloud');
  // A context with no local provider at all: the turn still runs, on the
  // cloud, and says so.
  const cloudOnly: AgentCtx = { ...ctx, provider: cloud, localProvider: undefined };
  assert.equal(await runTurn(cloudOnly, { sessionId: 's-cloud2', userMessage: 'hi', tier: 'local' }), 'answered in the cloud', 'without a local provider the cloud answers…');

  const entries = ctx.sessions.read('s-cloud2');
  const note = entries.find((e) => e.role === 'system' && e.content.includes('[local tier]'));
  assert.ok(note, '…and the transcript says so, instead of burning data quietly');
  if (note?.role === 'system') assert.match(note.content, /config\.localProvider\.enabled/, 'with the fix named');
  else assert.fail('the note must be a system entry');
});

test('27.3 per-model capabilities are read from one catalog, by the code that acts on them', async () => {
  const { canSeeImages } = await import('../src/channels/vision.js');
  assert.equal(canSeeImages({ type: 'openai', model: 'gpt-4o-2024-08-06' }), true, 'a dated id still matches');
  assert.equal(canSeeImages({ type: 'openai', model: 'o1-mini' }), false, 'the not-vision list wins');
  assert.equal(canSeeImages({ type: 'openai', model: 'whatever-9' }), false, 'an unknown model is not assumed to see');
  assert.equal(canSeeImages({ type: 'mock', model: 'mock-1' }), true, 'the offline brain narrates what it was handed');
});
