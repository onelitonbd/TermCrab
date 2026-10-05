import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, saveConfig, defaults, type Config } from '../src/core/config.js';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore, SessionQueue } from '../src/agent/sessions.js';
import { groupCatalog, groupOf, switchState, TOOL_GROUPS } from '../src/agent/tool-catalog.js';
import { canvasClear, canvasList, canvasUpdate } from '../src/gateway/canvas.js';
import { canvasCommand, runControlCommand, toolsCommand, type ControlDeps } from '../src/gateway/chat-control.js';
import { memoryCommand } from '../src/gateway/chat-reports.js';
import { makeToolActivity, toolStatusText, type ToolStatusPort } from '../src/channels/tool-activity.js';
import { TelegramChannel } from '../src/channels/telegram.js';
import { buildTools } from '../src/agent/tools.js';
import { SkillStore } from '../src/skills/loader.js';

/**
 * Batch 53 — the ◐ cells that stayed half-doors.
 *
 * Each test here answers a "can a person do this from that surface" question
 * with a run, not a description: the catalog is grouped and the switches write
 * the real config keys, the canvas registry is read and cleared from both
 * sides, the queue/steer verbs reach the running gateway, one Telegram status
 * message is edited with the tool names as a real turn runs, a fact written
 * from the CLI and from a chat lands in MEMORY.md, and every attachment has a
 * download that the panel can actually fetch.
 */

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

function cli(args: string[], opts: { env?: Record<string, string>; tolerate?: boolean } = {}): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [CLI, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...(opts.env ?? {}) },
      timeout: 30_000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    if (!opts.tolerate) throw err;
    return { code: e.status ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

/**
 * The CLI against a gateway that lives in *this* process: it must be async.
 * `execFileSync` blocks the event loop, and the gateway in this process then
 * cannot answer the child until the child gives up — a deadlock, not a bug in
 * either side.
 */
async function cliAsync(
  args: string[],
  env: Record<string, string>,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileP(process.execPath, [CLI, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env },
      timeout: 30_000,
    });
    return { code: 0, stdout: stdout as string, stderr: (stderr as string) ?? '' };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: typeof e.code === 'number' ? e.code : 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

function parseJson<T>(out: string): T {
  const start = out.indexOf('{');
  assert.ok(start >= 0, `no JSON in: ${out.slice(0, 200)}`);
  return JSON.parse(out.slice(start)) as T;
}

function controlDeps(config: Config, overrides: Partial<ControlDeps> = {}): ControlDeps {
  return {
    sessionId: 'web:main',
    channel: 'web',
    chatId: 'main',
    config,
    saveConfig,
    sessions: new SessionStore(),
    queue: new SessionQueue(),
    currentVersion: '0.0.0-test',
    ...overrides,
  };
}

/** A gateway on a free port whose config points at it — the CLI half drives this. */
async function withGateway(home: string, fn: (h: GatewayHandle, config: Config) => Promise<void>): Promise<void> {
  const port = await freePort();
  const config = defaults();
  config.gateway.host = '127.0.0.1';
  config.gateway.port = port;
  config.gateway.token = 'test-token-53';
  config.provider = { type: 'mock', model: 'mock-1', baseUrl: '', apiKey: 'sk-test' };
  saveConfig(config);
  const handle = await startGateway({ config, host: '127.0.0.1', port });
  try {
    await fn(handle, config);
  } finally {
    await handle.stop();
  }
}

// ------------------------------------------------------------------ 53.1

test('53.1 the catalog is grouped, and the switches write the keys the panel writes', async (t) => {
  const home = tmpHome('t53a-');
  const config = loadConfig();

  await t.test('every tool in the real catalog has exactly one group', async () => {
    const all = { ...config };
    all.agent = { ...config.agent, allowExec: true, allowBrowser: true, allowCodeExec: true };
    const tools = await buildTools({ config: all, memory: new MemoryStore(path.join(home, 'memory')), skills: new SkillStore() });
    assert.ok(tools.length >= 55, `the catalog is real (${tools.length} tools)`);
    const grouped = groupCatalog(tools.map((tl) => ({ name: tl.def.name, description: tl.def.description })));
    const seen = grouped.flatMap((g) => g.tools.map((x) => x.name));
    assert.equal(seen.length, tools.length, 'nothing is dropped');
    assert.equal(new Set(seen).size, tools.length, 'nothing is counted twice');
    for (const g of grouped) assert.ok((TOOL_GROUPS as readonly string[]).includes(g.group), g.group);
    assert.ok(grouped.some((g) => g.group === 'shell & files'), 'the shell tools are in their group');
    assert.ok(grouped.some((g) => g.group === 'this phone'), 'and so are the phone tools');
    // A tool nobody classified must fail loudly rather than vanish.
    assert.throws(() => groupOf('a_tool_from_the_future'), /no group/);
  });

  await t.test('the three switches are the config keys, with the panel spellings', () => {
    const state = switchState(config);
    assert.deepEqual(state.map((s) => s.name), ['exec', 'browser', 'code']);
    assert.deepEqual(state.map((s) => s.key), ['allowExec', 'allowBrowser', 'allowCodeExec']);
  });

  await t.test('/tools flips a switch and saves it', () => {
    const deps = controlDeps(loadConfig());
    const off = toolsCommand(deps, 'browser off');
    assert.ok(off.ok);
    assert.equal(deps.config.agent.allowBrowser, false);
    assert.match(off.text, /agent\.allowBrowser/);
    assert.equal(loadConfig().agent.allowBrowser, false, 'the file on disk has it');
    const on = toolsCommand(deps, 'browser on');
    assert.ok(on.ok);
    assert.equal(loadConfig().agent.allowBrowser, true);
    const bad = toolsCommand(deps, 'wibble on');
    assert.equal(bad.ok, false);
    assert.match(bad.ok === false ? bad.error : '', /exec, browser, code/);
  });

  await t.test('termcrab tools lists the catalog and writes the same key', () => {
    const list = cli(['tools', '--json'], { env: { TCRAB_HOME: home } });
    assert.equal(list.code, 0, list.stderr);
    const data = parseJson<{ ok: boolean; data: { count: number; groups: { group: string; tools: string[] }[]; switches: { name: string; on: boolean }[] } }>(list.stdout).data;
    assert.ok(data.count >= 55, `count ${data.count}`);
    assert.ok(data.groups.length >= 6, 'grouped');
    assert.equal(data.switches.length, 3);

    const off = cli(['tools', '--disable', 'browser'], { env: { TCRAB_HOME: home } });
    assert.equal(off.code, 0, off.stderr);
    assert.equal(loadConfig().agent.allowBrowser, false, 'the CLI wrote agent.allowBrowser');
    assert.match(off.stdout, /agent\.allowBrowser/);
    const back = cli(['tools', '--enable', 'browser'], { env: { TCRAB_HOME: home } });
    assert.equal(back.code, 0);
    assert.equal(loadConfig().agent.allowBrowser, true);

    const bad = cli(['tools', '--enable', 'wibble'], { env: { TCRAB_HOME: home }, tolerate: true });
    assert.equal(bad.code, 1, 'an unknown switch is refused');
    assert.match(bad.stderr, /unknown switch/);
  });
});

// ------------------------------------------------------------------ 53.2

test('53.2 the canvas is readable and clearable from the CLI and from a chat', async (t) => {
  const home = tmpHome('t53b-');
  canvasClear();

  await t.test('/canvas describes the newest widget in words', async () => {
    canvasUpdate('w1', '<h2>Deploys</h2><p>3 services are green. <b>Nothing failed.</b></p>', 'Deploys');
    await new Promise((r) => setTimeout(r, 5)); // two widgets, two timestamps
    canvasUpdate('w2', '<div><style>.x{color:red}</style><p>Disk is 82% full</p></div>', 'Disk');
    const r = canvasCommand('');
    assert.ok(r.ok);
    assert.match(r.text, /2 widget\(s\)/);
    assert.match(r.text, /w2/, 'both ids are listed');
    assert.match(r.text, /Disk is 82% full/, 'the newest widget is described');
    assert.ok(!/color:red/.test(r.text), 'the markup is stripped out of the summary');
    const shown = canvasCommand('show w1');
    assert.ok(shown.ok);
    assert.match(shown.text, /3 services are green/);
    const missing = canvasCommand('show nope');
    assert.equal(missing.ok, false);
  });

  await t.test('/canvas clear empties the registry', () => {
    const r = canvasCommand('clear');
    assert.ok(r.ok);
    assert.match(r.text, /cleared 2/);
    assert.equal(canvasList().length, 0);
    assert.match(canvasCommand('clear').ok ? '' : 'x', /^$/);
  });

  await t.test('termcrab canvas reads the running gateway, and clears it', async () => {
    canvasUpdate('w3', '<p>From the gateway</p>', 'Gateway');
    await withGateway(home, async () => {
      const env = { TCRAB_HOME: home };
      const list = await cliAsync(['canvas', '--json'], env);
      assert.equal(list.code, 0, list.stderr);
      const data = parseJson<{ data: { count: number; widgets: { id: string; title: string | null }[] } }>(list.stdout).data;
      assert.equal(data.count, 1);
      assert.equal(data.widgets[0]!.id, 'w3');
      assert.equal(data.widgets[0]!.title, 'Gateway');

      const human = await cliAsync(['canvas'], env);
      assert.match(human.stdout, /1 widget\(s\)/);
      assert.match(human.stdout, /Gateway/);

      const cleared = await cliAsync(['canvas', '--clear'], env);
      assert.equal(cleared.code, 0, cleared.stderr);
      assert.match(cleared.stdout, /cleared 1/);
      assert.equal(canvasList().length, 0, 'the registry the gateway holds is empty');
      const empty = await cliAsync(['canvas', '--json'], env);
      assert.equal(parseJson<{ data: { count: number } }>(empty.stdout).data.count, 0);
    });
  });

  await t.test('with no gateway the CLI says where the canvas lives', () => {
    const port = 1; // nothing is listening on 1
    const cfg = loadConfig();
    cfg.gateway.port = port;
    cfg.gateway.host = '127.0.0.1';
    saveConfig(cfg);
    const out = cli(['canvas'], { env: { TCRAB_HOME: home }, tolerate: true });
    assert.equal(out.code, 1);
    assert.match(out.stderr + out.stdout, /Cannot reach the TermCrab panel/);
  });
});

// ------------------------------------------------------------------ 53.3

test('53.3 live runs: queue and steer from the terminal, tool names in Telegram', async (t) => {
  const home = tmpHome('t53c-');

  await t.test('one status message: sent once, edited as tools run, removed at the end', async () => {
    // The tracker serializes its sends/edits through a promise chain; one
    // microtask is not enough to drain it, a macrotask tick is.
    const settle = () => new Promise((r) => setTimeout(r, 0));
    const sent: string[] = [];
    const edits: { id: number; text: string }[] = [];
    const removed: number[] = [];
    let clock = 1000;
    const port: ToolStatusPort = {
      send: async (text) => {
        sent.push(text);
        return 7;
      },
      edit: async (id, text) => {
        edits.push({ id, text });
      },
      remove: async (id) => {
        removed.push(id);
      },
    };
    const activity = makeToolActivity(port, { now: () => clock, minMs: 1000 });
    activity.note('exec');
    await settle();
    assert.equal(sent.length, 1, 'the first tool opens the message');
    assert.match(sent[0]!, /exec/);
    clock += 200;
    activity.note('read_file');
    await settle();
    assert.equal(edits.length, 0, 'inside the throttle window nothing is edited');
    clock += 2000;
    activity.note('write_file');
    await settle();
    assert.equal(edits.length, 1, 'after the window the message is edited, not re-sent');
    assert.equal(edits[0]!.id, 7);
    assert.match(edits[0]!.text, /exec · read_file · write_file/);
    assert.equal(sent.length, 1, 'still one message');
    await activity.finish();
    assert.deepEqual(removed, [7], 'the status message goes away when the turn ends');
    assert.equal(toolStatusText(['a', 'b', 'c', 'd', 'e'], 3), '🛠️ c · d · e (+2)');
  });

  await t.test('the channel port speaks the Bot API: send, edit, delete', async () => {
    const calls: { method: string; args: unknown[] }[] = [];
    const api = {
      getMe: async () => ({ username: 'bot', id: 1 }),
      getUpdates: async () => [],
      sendMessage: async (...args: unknown[]) => {
        calls.push({ method: 'sendMessage', args });
        return { ok: true, result: { message_id: 42 } };
      },
      editMessageText: async (...args: unknown[]) => {
        calls.push({ method: 'editMessageText', args });
        return { ok: true };
      },
      deleteMessage: async (...args: unknown[]) => {
        calls.push({ method: 'deleteMessage', args });
        return { ok: true };
      },
    };
    const channel = new TelegramChannel({
      cfg: { token: 'x', allowedUserIds: [7] },
      onMessage: async () => 'ok',
      getOffset: () => 0,
      setOffset: () => undefined,
      api: api as never,
    });
    const port = channel.toolStatusPort(99);
    assert.ok(port, 'the port exists when the API can edit');
    const id = await port.send('🛠️ exec');
    assert.equal(id, 42, 'the id of the sent message is returned');
    await port.edit(42, '🛠️ exec · read_file');
    await port.remove(42);
    assert.deepEqual(
      calls.map((c) => c.method),
      ['sendMessage', 'editMessageText', 'deleteMessage'],
    );
    assert.equal(calls[0]!.args[0], 99);
    assert.equal(calls[1]!.args[1], 42);
  });

  await t.test('a real Telegram turn edits one message with the tool names', async () => {
    // A provider that asks for one tool, then answers.
    let call = 0;
    const provider = http.createServer((req, res) => {
      let body_ = '';
      req.on('data', (c) => (body_ += c));
      req.on('end', () => {
        const body = JSON.parse(body_) as { tools?: unknown[] };
        // The gateway pings the provider when it starts ("ping"/"pong"); that
        // probe is not a turn and must not eat the tool_calls turn.
        if (!Array.isArray(body.tools) || body.tools.length === 0) {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'pong' } }] }));
          return;
        }
        call += 1;
        const wantsTool = call <= 2;
        const message = wantsTool
          ? {
              role: 'assistant',
              content: null,
              tool_calls: [
                { id: `call_${call}`, type: 'function', function: { name: 'get_time', arguments: '{}' } },
              ],
            }
          : { role: 'assistant', content: 'the time is what it is' };
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message, finish_reason: call === 1 ? 'tool_calls' : 'stop' }] }));
      });
    });
    await new Promise<void>((resolve) => provider.listen(0, '127.0.0.1', resolve));
    const providerPort = (provider.address() as net.AddressInfo).port;

    const sent: { chatId: number; text: string }[] = [];
    const edits: { chatId: number; id: number; text: string }[] = [];
    const removed: { chatId: number; id: number }[] = [];
    let update = 0;
    const api = {
      getMe: async () => ({ username: 'testbot', id: 99 }),
      getUpdates: async () => {
        // A real getUpdates long-polls; a stub that returns instantly would
        // spin this loop at full speed and starve the turn it is meant to run.
        await new Promise((r) => setTimeout(r, 25));
        if (update++) return [];
        return [
          {
            update_id: 1,
            message: { message_id: 5, chat: { id: 4242 }, from: { id: 7 }, text: 'what time is it?' },
          },
        ];
      },
      sendMessage: async (chatId: number, text: string) => {
        sent.push({ chatId, text });
        return { ok: true, result: { message_id: 100 + sent.length } };
      },
      sendChatAction: async () => ({ ok: true }),
      setMyCommands: async () => ({ ok: true }),
      editMessageText: async (chatId: number, id: number, text: string) => {
        edits.push({ chatId, id, text });
        return { ok: true };
      },
      deleteMessage: async (chatId: number, id: number) => {
        removed.push({ chatId, id });
        return { ok: true };
      },
    };

    const port = await freePort();
    const config = defaults();
    config.gateway.host = '127.0.0.1';
    config.gateway.port = port;
    config.gateway.token = 'tg53';
    config.provider = {
      type: 'openai',
      baseUrl: `http://127.0.0.1:${providerPort}/v1`,
      model: 'fake-model',
      apiKey: 'sk-test',
      stream: false,
    };
    // toolActivityMinMs: 0 — every tool edits, so this test sees the edit the
    // real 1500 ms window would (correctly) skip on a turn this fast.
    config.channels.telegram = {
      token: 'tg-token',
      allowedUserIds: [7],
      groupPolicy: 'all',
      toolActivityMinMs: 0,
    } as Config['channels']['telegram'];
    saveConfig(config);

    const handle = await startGateway({ config, host: '127.0.0.1', port, telegramApi: api as never });
    try {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline && (!edits.length || !removed.length)) {
        await new Promise((r) => setTimeout(r, 100));
      }
      const statuses = sent.filter((m) => m.chatId === 4242 && /🛠️/.test(m.text));
      assert.equal(statuses.length, 1, `one status message, not one per tool: ${JSON.stringify(sent)}`);
      assert.match(statuses[0]!.text, /get_time/, 'the status line names the tool');
      assert.ok(edits.length >= 1, 'the status message was edited, not re-sent');
      assert.equal(edits[0]!.chatId, 4242);
      assert.match(edits[0]!.text, /get_time · get_time/, 'the second tool was added to the same line');
      assert.ok(removed.length >= 1, 'the status message was removed at the end');
      assert.ok(
        sent.some((m) => m.chatId === 4242 && /time is what it is/.test(m.text)),
        `the answer arrived: ${JSON.stringify(sent.map((m) => m.text))}`,
      );
    } finally {
      await handle.stop();
      await new Promise<void>((resolve) => provider.close(() => resolve()));
    }
  });

  await t.test('termcrab queue and steer reach the gateway that is running', async () => {
    await withGateway(home, async () => {
      const env = { TCRAB_HOME: home };
      const show = await cliAsync(['queue', '--json'], env);
      assert.equal(show.code, 0, show.stderr);
      const shown = parseJson<{ data: { mode: string; running: number } }>(show.stdout).data;
      assert.equal(shown.running, 0);
      assert.ok(['followup', 'steer', 'collect', 'interrupt'].includes(shown.mode), shown.mode);

      const set = await cliAsync(['queue', 'steer', '--json'], env);
      assert.equal(set.code, 0, set.stderr);
      assert.equal(parseJson<{ data: { mode: string } }>(set.stdout).data.mode, 'steer');
      assert.equal((await cliAsync(['queue', '--json'], env)).stdout.includes('"steer"'), true, 'the mode stuck');

      const back = await cliAsync(['queue', 'followup'], env);
      assert.equal(back.code, 0);

      const steer = await cliAsync(['steer', 'use the staging key', '--json'], env);
      assert.equal(steer.code, 0, steer.stderr);
      const steered = parseJson<{ data: { ok: boolean; message: string } }>(steer.stdout).data;
      assert.equal(steered.ok, true, 'the gateway accepted the steering note');
      assert.match(steered.message, /nothing is running|steer/i);

      const bad = await cliAsync(['queue', 'wibble'], env);
      assert.equal(bad.code, 1);
      assert.match(bad.stderr, /followup, steer, collect, interrupt/);
    });
  });
});

// ------------------------------------------------------------------ 53.4

test('53.4 a fact can be written by hand from every surface', async (t) => {
  const home = tmpHome('t53d-');

  await t.test('/memory add stores a real fact, with its origin', async () => {
    const memory = new MemoryStore(path.join(home, 'memory'));
    const r = await memoryCommand({ memory }, 'add the owner reads Bengali');
    assert.ok(r.ok);
    assert.match(r.text, /Remembered/);
    const hits = await memory.searchDetailed('Bengali');
    assert.ok(hits.length >= 1, 'the fact is searchable');
    assert.equal(hits[0]!.origin, 'owner');
    const body = fs.readFileSync(path.join(home, 'memory', 'MEMORY.md'), 'utf8');
    assert.match(body, /reads Bengali/);
    const empty = await memoryCommand({ memory }, 'add');
    assert.equal(empty.ok, false);
    const tooLong = await memoryCommand({ memory }, `add ${'x'.repeat(2100)}`);
    assert.equal(tooLong.ok, false);
  });

  await t.test('termcrab memory add writes the same store', () => {
    const out = cli(['memory', 'add', 'the owner prefers short answers', '--json'], { env: { TCRAB_HOME: home } });
    assert.equal(out.code, 0, out.stderr);
    const data = parseJson<{ data: { result: string } }>(out.stdout).data;
    assert.match(data.result, /Remembered/);
    const body = fs.readFileSync(path.join(home, 'memory', 'MEMORY.md'), 'utf8');
    assert.match(body, /prefers short answers/);
    const search = cli(['memory', 'search', 'short answers'], { env: { TCRAB_HOME: home } });
    // the hit is rendered with « » around the matched words — the fact is there
    assert.match(search.stdout.replace(/[«»]/g, ''), /prefers short answers/);
    const usage = cli(['memory', 'add'], { env: { TCRAB_HOME: home }, tolerate: true });
    assert.equal(usage.code, 1, 'no fact is a usage error, not a silent success');
  });

  await t.test('the panel chat can write one too (the same shared command)', async () => {
    await withGateway(home, async (_h, config) => {
      const port = config.gateway.port;
      const res = await fetch(`http://127.0.0.1:${port}/api/slash`, {
        method: 'POST',
        headers: { authorization: 'Bearer test-token-53', 'content-type': 'application/json' },
        body: JSON.stringify({ command: '/memory', args: 'add the panel chat writes facts' }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean; message: string };
      assert.equal(body.ok, true);
      assert.match(body.message, /Remembered/);
      const body2 = fs.readFileSync(path.join(home, 'memory', 'MEMORY.md'), 'utf8');
      assert.match(body2, /panel chat writes facts/);
    });
  });
});

// ------------------------------------------------------------------ 53.5

test('53.5 every attachment has a download', async (t) => {
  const home = tmpHome('t53e-');

  await t.test('a PDF upload becomes text through the same extractor', async () => {
    const dir = path.join(home, 'inbox-src');
    fs.mkdirSync(dir, { recursive: true });
    const pdf = path.join(dir, 'demo.pdf');
    fs.writeFileSync(
      pdf,
      Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 20 100 Td (Batch 53 reads PDFs) Tj ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
`),
    );

    await withGateway(home, async (_h, config) => {
      const auth = { authorization: 'Bearer test-token-53' };
      const res = await fetch(`http://127.0.0.1:${config.gateway.port}/api/extract?name=demo.pdf`, {
        method: 'POST',
        headers: auth,
        body: fs.readFileSync(pdf),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean; kind: string; text: string; chars: number };
      assert.equal(body.ok, true);
      assert.equal(body.kind, 'pdf');
      assert.match(body.text, /Batch 53 reads PDFs/);
      assert.equal(body.chars, body.text.length);

      const broken = await fetch(`http://127.0.0.1:${config.gateway.port}/api/extract?name=broken.docx`, {
        method: 'POST',
        headers: auth,
        body: Buffer.from('not a zip at all'),
      });
      assert.equal(broken.status, 422, 'a bad document says why, rather than pretending');
      const problem = (await broken.json()) as { error: string };
      assert.match(problem.error, /docx/i);
    });
  });

  await t.test('an inbox file downloads by name, and a path is refused', async () => {
    const inboxDir = path.join(home, 'workspace', 'inbox');
    fs.mkdirSync(inboxDir, { recursive: true });
    fs.writeFileSync(path.join(inboxDir, 'note.txt'), 'hello from a friend\n');
    const { recordArrival } = await import('../src/channels/inbox.js');
    recordArrival({ name: 'note.txt', bytes: 20, kind: 'document' });

    await withGateway(home, async (_h, config) => {
      const auth = { authorization: 'Bearer test-token-53' };
      const list = await fetch(`http://127.0.0.1:${config.gateway.port}/api/inbox`, { headers: auth });
      const listed = (await list.json()) as { entries: { name: string }[] };
      assert.ok(listed.entries.some((e) => e.name === 'note.txt'));

      const dl = await fetch(`http://127.0.0.1:${config.gateway.port}/api/inbox/note.txt/download`, { headers: auth });
      assert.equal(dl.status, 200);
      assert.match(dl.headers.get('content-disposition') ?? '', /note\.txt/);
      assert.equal(await dl.text(), 'hello from a friend\n');

      const traversal = await fetch(`http://127.0.0.1:${config.gateway.port}/api/inbox/..%2f..%2fconfig.json/download`, {
        headers: auth,
      });
      assert.equal(traversal.status, 400);

      const missing = await fetch(`http://127.0.0.1:${config.gateway.port}/api/inbox/nope.txt/download`, { headers: auth });
      assert.equal(missing.status, 404);
    });
  });

  await t.test('a file the agent sent is listed and downloadable by id', async () => {
    const { recordSharedFile } = await import('../src/channels/shared-files.js');
    const sentFile = path.join(home, 'workspace', 'report.md');
    fs.mkdirSync(path.dirname(sentFile), { recursive: true });
    fs.writeFileSync(sentFile, '# the report\n');
    const rec = recordSharedFile({ name: 'report.md', path: sentFile, bytes: 14, channel: 'telegram', address: '42', via: 'send' });
    assert.ok(rec, 'the record is written');
    const outside = recordSharedFile({ name: 'passwd', path: '/etc/passwd', bytes: 10, via: 'send' });
    assert.ok(outside, 'a record can exist…');

    await withGateway(home, async (_h, config) => {
      const auth = { authorization: 'Bearer test-token-53' };
      const list = await fetch(`http://127.0.0.1:${config.gateway.port}/api/sent-files`, { headers: auth });
      const files = ((await list.json()) as { files: { id: string; name: string; exists: boolean }[] }).files;
      assert.ok(files.some((f) => f.name === 'report.md' && f.exists));

      const dl = await fetch(`http://127.0.0.1:${config.gateway.port}/api/sent-files/${rec!.id}`, { headers: auth });
      assert.equal(dl.status, 200);
      assert.match(dl.headers.get('content-type') ?? '', /text\/markdown/);
      assert.match(dl.headers.get('content-disposition') ?? '', /report\.md/);
      assert.equal(await dl.text(), '# the report\n');

      const unknown = await fetch(`http://127.0.0.1:${config.gateway.port}/api/sent-files/000000000000`, { headers: auth });
      assert.equal(unknown.status, 404);

      // A record pointing outside the home is refused at download time, even
      // though the log has it: the route resolves the id, it never trusts a path.
      const forbidden = await fetch(`http://127.0.0.1:${config.gateway.port}/api/sent-files/${outside!.id}`, { headers: auth });
      assert.equal(forbidden.status, 403);

      fs.rmSync(sentFile);
      const gone = await fetch(`http://127.0.0.1:${config.gateway.port}/api/sent-files/${rec!.id}`, { headers: auth });
      assert.equal(gone.status, 410, 'a cleaned-up file says so instead of 404-ing mysteriously');
    });
  });

  await t.test('the panel wires all of it: documents in, downloads out, a picture button', () => {
    const ui = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
    assert.match(ui, /\.pdf,\.docx,\.pptx,\.xlsx/, 'the attach input accepts documents');
    assert.match(ui, /\/api\/extract\?name=/, 'and sends them to the extractor');
    assert.match(ui, /\/api\/inbox\/' \+ encodeURIComponent\(e\.name\) \+ '\/download'/, 'inbox rows download');
    assert.match(ui, /async function refreshSentFiles\(\)/, 'the files card exists');
    assert.match(ui, /\/api\/sent-files\?limit=/, 'and reads the list');
    assert.match(ui, /\/api\/image/, 'the image button calls the image route');
    assert.match(ui, /async function downloadFrom\(/, 'one download helper');
  });
});
