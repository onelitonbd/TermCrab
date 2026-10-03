import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { execFile, execFileSync } from 'node:child_process';
import { startGateway, type GatewayHandle } from '../src/gateway/server.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { bus } from '../src/gateway/events.js';
import { canvasList, canvasRemove, canvasUpdate } from '../src/gateway/canvas.js';
import { planTriggers, watcherMatches } from '../src/gateway/triggers.js';
import { listIntents } from '../src/agent/intents.js';
import { generateImage, placeholderPng } from '../src/media/image.js';
import { imageInfo } from '../src/agent/toolbox.js';
import { buildTools } from '../src/agent/tools.js';
import http from 'node:http';
import { buildSystemPrompt } from '../src/agent/prompt.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';

/**
 * Batch 26 — standing orders, lifecycle hooks, watchers, canvas.
 *
 * Four rows moved this batch; each one is pinned here so the census claim has
 * something to point at.
 */

function home(tag: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `t26-${tag}-`));
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

/** Wait for one bus event whose type matches, or fail with a readable message. */
function waitForEvent<T extends Record<string, unknown>>(
  match: (ev: Record<string, unknown>) => boolean,
  what: string,
  timeoutMs = 6000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      off();
      reject(new Error(`no ${what} within ${timeoutMs}ms`));
    }, timeoutMs);
    const off = bus.subscribe((ev) => {
      if (!match(ev)) return;
      clearTimeout(timer);
      off();
      resolve(ev as T);
    });
  });
}

async function startWith(configure: (c: ReturnType<typeof defaults>) => void): Promise<{
  handle: GatewayHandle;
  base: string;
  auth: Record<string, string>;
  dir: string;
}> {
  const dir = home('gw');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.token = 'test-token';
  config.gateway.port = await freePort();
  configure(config);
  saveConfig(config);
  const handle = await startGateway({ config, host: '127.0.0.1', port: config.gateway.port });
  return { handle, base: `http://127.0.0.1:${config.gateway.port}`, auth: { authorization: 'Bearer test-token' }, dir };
}

// --------------------------------------------------------------------------- 26.1

test('26.1 standing orders: one store behind the CLI, the chat and the prompt', async () => {
  const dir = home('orders');

  const empty = runCli(['orders'], dir);
  assert.equal(empty.status, 0);
  assert.match(empty.stdout, /no standing orders yet/);

  const added = runCli(['orders', 'add', 'always answer in Bengali'], dir);
  assert.equal(added.status, 0);
  assert.match(added.stdout, /Standing order added \(in[0-9a-z]+\): always answer in Bengali/);

  const listed = runCli(['orders', '--json'], dir);
  const parsed = JSON.parse(listed.stdout) as { data: { count: number; orders: { id: string; text: string }[] } };
  assert.equal(parsed.data.count, 1);
  assert.equal(parsed.data.orders[0]!.text, 'always answer in Bengali');
  assert.equal(listIntents().length, 1, 'and the same store the prompt reads');

  // The prompt really carries it, with the precedence spelled out.
  const promptCtx = {
    config: defaults(),
    memory: new MemoryStore(),
    skills: new SkillStore([]),
    sessionId: 'default',
    memoryBudget: 1000,
  };
  const prompt = buildSystemPrompt(promptCtx as never);
  assert.match(prompt, /# Standing orders \(always follow these\)/);
  assert.match(prompt, /- always answer in Bengali/);
  assert.match(prompt, /outrank long-term memory and workspace notes/);
  assert.match(prompt, /never override the safety rules/);

  const removed = runCli(['orders', 'remove', parsed.data.orders[0]!.id], dir);
  assert.equal(removed.status, 0);
  assert.equal(listIntents().length, 0, 'removing stops the effect immediately');
  assert.doesNotMatch(buildSystemPrompt(promptCtx as never), /always answer in Bengali/);

  const missing = runCli(['orders', 'remove', 'nope'], dir);
  assert.equal(missing.status, 1, 'removing something that is not there is an error, not silence');
});

test('26.1 the chat command manages the same standing orders', async () => {
  const { handle, base, auth } = await startWith(() => undefined);
  try {
    // The web panel does slash commands through /api/slash (the command
    // palette reads GET /api/slash for the list).
    const slash = async (command: string, args = ''): Promise<{ status: number; data: Record<string, unknown> }> => {
      const res = await fetch(`${base}/api/slash`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ command, args }),
      });
      return { status: res.status, data: (await res.json()) as Record<string, unknown> };
    };

    const list = await slash('/orders');
    assert.equal(list.status, 200);
    assert.match(String(list.data.message), /0 standing order\(s\)/);

    const added = await slash('/orders', 'add always sign off with 🦀');
    assert.equal(added.status, 200);
    assert.match(String(added.data.message), /Standing order added: always sign off with 🦀/);

    const after = await slash('/orders');
    assert.match(JSON.stringify(after.data.orders), /always sign off with 🦀/);

    const bad = await slash('/orders', 'remove nope');
    assert.equal(bad.status, 404, 'removing something that is not there is honest about it');

    // The palette lists it, so a user can find it without the docs.
    const palette = (await (await fetch(`${base}/api/slash`, { headers: auth })).json()) as {
      commands: { name: string; description: string }[];
    };
    assert.ok(palette.commands.some((c) => c.name === '/orders'), 'the command palette lists /orders');
  } finally {
    await handle.stop();
  }
});

// --------------------------------------------------------------------------- 26.2

test('26.2 a hook is woken by run.end — lifecycle without interception', async () => {
  const { handle, base, auth } = await startWith((c) => {
    c.hooks = [{ id: 'lifecycle', token: 's', prompt: 'log that a turn finished', on: ['run.end'] }];
  });
  try {
    const fired = waitForEvent<{ event: string; hooks: string[] }>((ev) => ev.type === 'trigger' && ev.event === 'run.end', 'run.end trigger');
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'say hi' }),
    });
    assert.ok(res.status === 200 || res.status === 202, `chat accepted the turn (${res.status})`);
    const ev = await fired;
    assert.deepEqual(ev.hooks, ['lifecycle']);

    // The hook's own session exists, so the hook really ran (mock provider).
    const sessions = (await (await fetch(`${base}/api/sessions`, { headers: auth })).json()) as { sessions?: { id: string }[] };
    const ids = (sessions.sessions ?? []).map((s) => s.id).join(',');
    for (let i = 0; i < 30 && !ids.includes('hook:lifecycle'); i++) await new Promise((r) => setTimeout(r, 100));
    const after = (await (await fetch(`${base}/api/sessions`, { headers: auth })).json()) as { sessions?: { id: string }[] };
    assert.ok(
      (after.sessions ?? []).some((s) => s.id.includes('hook:lifecycle')),
      `expected the hook session, saw ${(after.sessions ?? []).map((s) => s.id).join(', ')}`,
    );
  } finally {
    await handle.stop();
  }
});

// --------------------------------------------------------------------------- 26.3

test('26.3 watchers turn a folder change into file.changed', async () => {
  // The matching rule is pure, so it is checked directly first.
  assert.equal(watcherMatches({ id: 'w', path: '/tmp' }, 'anything.txt'), true);
  assert.equal(watcherMatches({ id: 'w', path: '/tmp', match: '.pdf' }, 'a.pdf'), true);
  assert.equal(watcherMatches({ id: 'w', path: '/tmp', match: 'pdf,docx' }, 'a.docx'), true);
  assert.equal(watcherMatches({ id: 'w', path: '/tmp', match: '.pdf' }, 'a.txt'), false);
  const selfLoop = planTriggers([{ id: 'h', prompt: 'p', on: ['file.changed'] }], { event: 'file.changed', fromSession: 'hook:h' }, {});
  assert.deepEqual(selfLoop.map((d) => d.skipped), ['self'], 'the decision is recorded, not silently dropped');

  const watched = fs.mkdtempSync(path.join(os.tmpdir(), 't26-watch-'));
  const { handle, auth, dir } = await startWith((c) => {
    c.watchers = [{ id: 'inboxdrop', path: watched, match: '.txt', debounceMs: 200 }];
    c.hooks = [{ id: 'onfile', token: 's', prompt: 'a text file arrived', on: ['file.changed'] }];
  });
  try {
    const fired = waitForEvent<{ event: string; hooks: string[] }>((ev) => ev.type === 'trigger' && ev.event === 'file.changed', 'file.changed trigger');
    fs.writeFileSync(path.join(watched, 'note.txt'), 'hello');
    const ev = await fired;
    assert.deepEqual(ev.hooks, ['onfile']);

    // And the CLI reports what is being watched.
    const listed = runCli(['events', '--json'], dir);
    const parsed = JSON.parse(listed.stdout) as { data: { watchers: { id: string; path: string; match: string | null }[] } };
    assert.deepEqual(parsed.data.watchers, [{ id: 'inboxdrop', path: watched, match: '.txt' }]);
    assert.ok(auth.authorization);
  } finally {
    await handle.stop();
  }
});

// --------------------------------------------------------------------------- 26.4

test('26.4 the canvas survives a round-trip and says what exists', async () => {
  const { handle, base, auth } = await startWith(() => undefined);
  try {
    const seen = waitForEvent<{ type: string; widget: { id: string } }>((ev) => ev.type === 'canvas:update', 'canvas:update');
    const widget = canvasUpdate('w1', '<b>hello</b>', 'Hello');
    assert.equal(widget.id, 'w1');
    assert.equal((await seen).widget.id, 'w1');

    const list = (await (await fetch(`${base}/api/canvas`, { headers: auth })).json()) as { widgets: { id: string; html: string }[] };
    assert.equal(list.widgets.length, 1);
    assert.equal(list.widgets[0]!.html, '<b>hello</b>');

    const del = await fetch(`${base}/api/canvas/w1`, { method: 'DELETE', headers: auth });
    assert.equal(del.status, 200);
    assert.equal(canvasList().length, 0);
    assert.equal(canvasRemove('w1'), false, 'removing twice says so');
  } finally {
    await handle.stop();
  }
});

// --------------------------------------------------------------------------- 26.5

test('26.5 image generation: a real PNG offline, the provider endpoint when configured', async () => {
  const dir = home('image');

  // The local placeholder is a genuine PNG, not a stub with a .png suffix.
  const png = placeholderPng('a red crab', 128, 96);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(imageInfo(png, png.length), { format: 'png', width: 128, height: 96 });
  assert.deepEqual(placeholderPng('a red crab', 128, 96), png, 'same prompt, same bytes — testable and cacheable');

  // Under the mock provider the CLI draws it and says that it is a placeholder.
  const mockCfg = defaults();
  mockCfg.provider = { type: 'mock', model: 'mock-1' };
  saveConfig(mockCfg);
  const cli = runCli(['image', 'a red crab', '--json'], dir);
  assert.equal(cli.status, 0, cli.stderr);
  const data = JSON.parse(cli.stdout) as { data: { path: string; placeholder: boolean; width: number; width2?: never; bytes: number } };
  assert.equal(data.data.placeholder, true, 'never pretends a placeholder is a generated image');
  const written = fs.readFileSync(data.data.path);
  assert.deepEqual(imageInfo(written, written.length), { format: 'png', width: 1024, height: 1024 });

  // A configured endpoint is actually called, with the model and size asked for.
  const port = await freePort();
  const seen: { url?: string; auth?: string; body?: Record<string, unknown> } = {};
  const server = http.createServer((req, res) => {
    seen.url = req.url ?? '';
    seen.auth = String(req.headers.authorization ?? '');
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      seen.body = JSON.parse(raw) as Record<string, unknown>;
      if (seen.body.prompt === 'explode') {
        res.statusCode = 500;
        res.end('boom');
        return;
      }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ data: [{ b64_json: png.toString('base64') }] }));
    });
  });
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', () => r()));
  try {
    const realCfg = defaults();
    realCfg.provider = { type: 'openai', model: 'gpt-4o-mini', baseUrl: `http://127.0.0.1:${port}/v1`, apiKey: 'sk-test' };
    realCfg.media = { imageModel: 'gpt-image-1', size: '256x256' };
    const result = await generateImage(realCfg, { prompt: 'a blue crab', outDir: dir });
    assert.equal(result.placeholder, false);
    assert.equal(seen.url, '/v1/images/generations');
    assert.equal(seen.auth, 'Bearer sk-test');
    assert.equal(seen.body!.model, 'gpt-image-1');
    assert.equal(seen.body!.size, '256x256');
    assert.equal(seen.body!.response_format, 'b64_json');
    assert.deepEqual(fs.readFileSync(result.path), png, 'the bytes the endpoint returned, unmodified');

    await assert.rejects(
      () => generateImage(realCfg, { prompt: 'explode', outDir: dir }),
      /image endpoint said 500: boom/,
      'a failing endpoint is reported, not swallowed',
    );
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }

  // The agent's own tool is the same path, and it writes into workspace/outbox.
  const tools = await buildTools({ config: mockCfg, memory: new MemoryStore(), skills: new SkillStore(), sessionId: 's' });
  const tool = tools.find((t) => t.def.name === 'generate_image');
  assert.ok(tool, 'generate_image is a live tool');
  const said = await tool!.execute({ prompt: 'signed crab' });
  assert.match(String(said), /image saved: .*workspace\/outbox\//);

  // And the panel can ask for one (POST /api/image).
  const gw = await startWith(() => undefined);
  try {
    const bad = await fetch(`${gw.base}/api/image`, {
      method: 'POST',
      headers: { ...gw.auth, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(bad.status, 400);
    const good = await fetch(`${gw.base}/api/image`, {
      method: 'POST',
      headers: { ...gw.auth, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'a panel crab', size: '256x256' }),
    });
    assert.equal(good.status, 200);
    const body = (await good.json()) as { path: string; placeholder: boolean; width: number };
    assert.equal(body.placeholder, true);
    assert.equal(body.width, 256);
    assert.ok(fs.existsSync(body.path));
  } finally {
    await gw.handle.stop();
  }
});
