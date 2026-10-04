/**
 * Browser automation, for real (34.1).
 *
 * What stood here before was a stub: it called HTTP endpoints CDP does not have
 * (`/json/navigate`, `/json/evaluate`), so on a machine with Chrome the tool
 * answered "requires WebSocket CDP" and on a machine without one it answered a
 * plausible lie. The replacement speaks the protocol — JSON frames over a
 * WebSocket, `Page.*`, `Runtime.*`, `Input.*`, `Page.captureScreenshot` — and
 * this file proves it two ways:
 *
 *  1. against a **real WebSocket server** written here (handshake, frame codec)
 *     that plays the part of a browser, so the wire path is exercised for real;
 *  2. through the tool and the CLI, so what the agent and the owner call is the
 *     same client that was just verified.
 *
 * A live Chrome would be the third way, and it is a skipped test when there is
 * no browser on this machine — the sandbox has none, a phone has none, and a
 * desktop usually does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { CdpBrowser, browserStatus, isCdpAvailable, startHint } from '../src/agent/cdp.js';
import { buildTools, type ToolEnv } from '../src/agent/tools.js';
import { extraTools } from '../src/agent/toolbox.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { defaults } from '../src/core/config.js';
import { workspaceDir } from '../src/core/paths.js';

const execFileP = promisify(execFile);
const CLI = fileURLToPath(new URL('../src/bin/termcrab.js', import.meta.url));

const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

// ---------------------------------------------------------------------------
// A mini WebSocket server, so the real client is talking to something real
// ---------------------------------------------------------------------------

interface FakeBrowser {
  port: number;
  seen: { method: string; params: Record<string, unknown> }[];
  close: () => Promise<void>;
}

/** Encode a server→client text frame (never masked). */
function encodeFrame(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  }
  const header = Buffer.alloc(4);
  header[0] = 0x81;
  header[1] = 126;
  header.writeUInt16BE(payload.length, 2);
  return Buffer.concat([header, payload]);
}

/** Parse one client frame from `buf`. Returns null while the frame is incomplete. */
function decodeFrame(buf: Buffer): { opcode: number; payload: Buffer; rest: Buffer } | null {
  if (buf.length < 2) return null;
  const opcode = buf[0]! & 0x0f;
  const masked = (buf[1]! & 0x80) !== 0;
  let length = buf[1]! & 0x7f;
  let offset = 2;
  if (length === 126) {
    if (buf.length < 4) return null;
    length = buf.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    if (buf.length < 10) return null;
    length = Number(buf.readBigUInt64BE(2));
    offset = 10;
  }
  const maskLen = masked ? 4 : 0;
  if (buf.length < offset + maskLen + length) return null;
  const mask = masked ? buf.subarray(offset, offset + 4) : null;
  offset += maskLen;
  const payload = Buffer.from(buf.subarray(offset, offset + length));
  if (mask) for (let i = 0; i < payload.length; i++) payload[i] = payload[i]! ^ mask[i % 4]!;
  return { opcode, payload, rest: buf.subarray(offset + length) };
}

/**
 * The browser's side of the protocol. Answers the methods our client sends and
 * records them, so the test can assert what was asked, not just what came back.
 */
function startFakeBrowser(opts: { title?: string; text?: string } = {}): Promise<FakeBrowser> {
  const seen: { method: string; params: Record<string, unknown> }[] = [];
  const title = opts.title ?? 'Fake page';
  const text = opts.text ?? 'Hello from the fake page';

  const server = http.createServer((req, res) => {
    if (req.url === '/json/version') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ Browser: 'Chrome/999.0.0-fake' }));
      return;
    }
    if (req.url === '/json/list') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify([
          { id: 'T1', type: 'page', title, url: `http://127.0.0.1:${port}/`, webSocketDebuggerUrl: `ws://127.0.0.1:${port}/devtools/page/T1` },
          { id: 'T2', type: 'other', title: 'not a page' },
        ]),
      );
      return;
    }
    res.writeHead(404);
    res.end('no');
  });

  let port = 0;
  server.on('upgrade', (req, socket) => {
    const key = String(req.headers['sec-websocket-key'] ?? '');
    const accept = crypto.createHash('sha1').update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );

    let buffer: Buffer = Buffer.alloc(0);
    const send = (obj: unknown): void => {
      socket.write(encodeFrame(JSON.stringify(obj)));
    };

    socket.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const frame = decodeFrame(buffer);
        if (!frame) return;
        buffer = frame.rest;
        if (frame.opcode === 0x8) {
          socket.end();
          return;
        }
        if (frame.opcode !== 0x1) continue;
        const msg = JSON.parse(frame.payload.toString('utf8')) as {
          id: number;
          method: string;
          params?: Record<string, unknown>;
        };
        seen.push({ method: msg.method, params: msg.params ?? {} });
        const reply = (result: unknown): void => send({ id: msg.id, result });
        const expression = String((msg.params as { expression?: string } | undefined)?.expression ?? '');

        if (msg.method === 'Page.enable') reply({});
        else if (msg.method === 'Page.navigate') {
          reply({ frameId: 'F1' });
          setTimeout(() => send({ method: 'Page.loadEventFired', params: { timestamp: Date.now() } }), 5);
        } else if (msg.method === 'Runtime.evaluate') {
          if (expression.includes('__hang__')) return; // the browser never answers
          if (expression.includes('document.body')) reply({ result: { value: text } });
          else if (expression.includes('location.href')) reply({ result: { value: { href: `http://127.0.0.1:${port}/final`, title } } });
          else if (expression.includes('querySelector') && expression.includes('#nope')) {
            reply({ result: { value: { ok: false, error: 'no element matches #nope' } } });
          } else if (expression.includes('querySelector')) reply({ result: { value: { ok: true, what: 'button: Send' } } });
          else if (expression.includes('throw')) reply({ exceptionDetails: { exception: { description: 'Error: boom in the page' } } });
          else reply({ result: { value: null } });
        } else if (msg.method === 'Emulation.setDeviceMetricsOverride') reply({});
        else if (msg.method === 'Page.captureScreenshot') reply({ data: PNG_1PX });
        else if (msg.method === 'Input.dispatchKeyEvent') reply({});
        else send({ id: msg.id, error: { message: `no such method: ${msg.method}` } });
      }
    });
    socket.on('error', () => undefined);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = (server.address() as AddressInfo).port;
      resolve({
        port,
        seen,
        close: () =>
          new Promise<void>((done) => {
            server.closeAllConnections?.();
            server.close(() => done());
          }),
      });
    });
  });
}

// ---------------------------------------------------------------------------

test('34.1 the client speaks CDP over a real WebSocket, against a fake browser', async () => {
  const fake = await startFakeBrowser();
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcdp-'));
  const previousHome = process.env.TCRAB_HOME;
  process.env.TCRAB_HOME = home;
  try {
    // Discovery + status come from the HTTP side of the protocol.
    const status = await browserStatus('127.0.0.1', fake.port);
    assert.equal(status.available, true);
    assert.equal(status.browser, 'Chrome/999.0.0-fake');
    assert.deepEqual(status.tabs, [{ title: 'Fake page', url: `http://127.0.0.1:${fake.port}/` }], 'only real page tabs are listed');
    assert.equal(await isCdpAvailable('127.0.0.1', fake.port), true);

    const browser = await CdpBrowser.attach({ host: '127.0.0.1', port: fake.port });
    try {
      // Navigate: Page.enable first, then Page.navigate, then wait for the load
      // event — and report where the page actually ended up, not where we asked.
      const nav = await browser.navigate('http://127.0.0.1:1/start');
      assert.equal(nav.url, `http://127.0.0.1:${fake.port}/final`);
      assert.equal(nav.title, 'Fake page');
      const methods = fake.seen.map((s) => s.method);
      assert.deepEqual(methods.slice(0, 2), ['Page.enable', 'Page.navigate']);
      assert.equal(fake.seen[1]!.params.url, 'http://127.0.0.1:1/start');

      // Text: the page's own words, truncated to the limit asked for.
      assert.equal(await browser.text(), 'Hello from the fake page');
      assert.equal(await browser.text(5), 'Hello');

      // Click: a page that has no such element is a sentence, not a silent no-op.
      assert.equal(await browser.click('#go'), 'button: Send');
      await assert.rejects(() => browser.click('#nope'), /no element matches #nope/);

      // Fill: with a real Enter key when asked (a form listening for Enter
      // ignores a value assignment).
      const filled = await browser.fill('input[name=q]', 'termux', true);
      assert.equal(filled, 'button: Send');
      const fillExpr = fake.seen.filter((s) => s.method === 'Runtime.evaluate').at(-1)!.params.expression as string;
      assert.match(fillExpr, /querySelector\("input\[name=q\]"\)/, 'the selector is passed as data, not interpolated by hand');
      assert.match(fillExpr, /HTMLInputElement\.prototype/, 'the native setter is used so frameworks see the change');
      assert.match(fillExpr, /new Event\('input'/, 'an input event is fired');
      const keys = fake.seen.filter((s) => s.method === 'Input.dispatchKeyEvent');
      assert.equal(keys.length, 2, 'keyDown and keyUp');
      assert.equal((keys[0]!.params as { key: string }).key, 'Enter');

      // Screenshot: a real file on disk, with a real PNG signature.
      const shot = await browser.screenshot(640, 480);
      assert.equal(shot.width, 640);
      assert.equal(shot.height, 480);
      assert.ok(shot.file.startsWith(path.join(workspaceDir(), 'browser')), 'saved under workspace/browser');
      const bytes = fs.readFileSync(shot.file);
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'a PNG, not a placeholder string');
      const metrics = fake.seen.find((s) => s.method === 'Emulation.setDeviceMetricsOverride')!;
      assert.equal(metrics.params.width, 640);

      // A page that throws surfaces the page's error.
      await assert.rejects(() => browser.evaluate('throw new Error("x")'), /boom in the page/);

      // A browser that never answers hits the deadline with a sentence naming the call.
      await assert.rejects(() => browser.evaluate('__hang__', 200), /Runtime\.evaluate timed out after 0s/);
    } finally {
      await browser.close();
    }

    // The protocol's own error is what the caller sees.
    const b2 = await CdpBrowser.attach({ host: '127.0.0.1', port: fake.port });
    try {
      // An unsupported method comes back as the protocol's own error sentence.
      await assert.rejects(
        () => (b2 as unknown as { t: { send: (m: string) => Promise<unknown> } }).t.send('Nope.nope'),
        /no such method/,
      );
    } finally {
      await b2.close();
    }
  } finally {
    if (previousHome === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previousHome;
    await fake.close();
  }
});

test('34.1 with no browser the tool and the CLI say how to start one', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcdp-none-'));
  const previousHome = process.env.TCRAB_HOME;
  const previousHost = process.env.CDP_HOST;
  process.env.TCRAB_HOME = home;
  // A port nothing listens on: 1 is reserved and never served.
  process.env.CDP_HOST = '127.0.0.1';
  try {
    const config = defaults();
    config.agent.allowBrowser = true;
    const env: ToolEnv = { config, memory: new MemoryStore(), skills: new SkillStore(), extraRoots: [] };
    const tools = [...(await buildTools(env)), ...extraTools(env)];
    const browser = tools.find((t) => t.def.name === 'browser')!;
    assert.ok(browser, 'the tool exists when allowBrowser is on');

    const out = await browser.execute({ action: 'status' });
    assert.match(String(out), /no Chrome\/Chromium found on 127\.0\.0\.1:9222/);
    assert.match(String(out), /--remote-debugging-port=9222/, 'the hint includes the flag that turns it on');

    // The default hint is the same sentence the CLI prints.
    assert.match(startHint(9333), /127\.0\.0\.1:9333/);

    // Two guards worth stating. A URL the tool will not open is refused before a
    // browser is even looked for (so a bad argument never reads as "no browser
    // found"); an action outside the schema is answered by the schema guard as a
    // sentence the model can act on, not as a broken promise.
    await assert.rejects(() => browser.execute({ action: 'navigate', url: 'file:///etc/passwd' }), /only http\/https/);
    const badAction = await browser.execute({ action: 'teleport' });
    assert.match(String(badAction), /action/, 'the schema guard names the field that is wrong');
  } finally {
    if (previousHome === undefined) delete process.env.TCRAB_HOME;
    else process.env.TCRAB_HOME = previousHome;
    if (previousHost === undefined) delete process.env.CDP_HOST;
    else process.env.CDP_HOST = previousHost;
  }
});

test('34.1 the CLI reads a page through the same client, and reports honestly without one', async () => {
  const fake = await startFakeBrowser({ text: 'CLI sees this text' });
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tcdp-cli-'));
  const env = { ...process.env, TCRAB_HOME: home, CDP_PORT: String(fake.port) };
  try {
    const text = JSON.parse((await execFileP(process.execPath, [CLI, 'browser', 'text', '--json'], { env })).stdout) as {
      ok: boolean;
      data: { text: string; chars: number };
    };
    assert.equal(text.ok, true);
    assert.equal(text.data.text, 'CLI sees this text');

    const opened = JSON.parse(
      (await execFileP(process.execPath, [CLI, 'browser', 'open', 'http://example.invalid/', '--json'], { env })).stdout,
    ) as { data: { url: string; title: string } };
    assert.match(opened.data.url, /\/final$/);

    const status = JSON.parse((await execFileP(process.execPath, [CLI, 'browser', 'status', '--json'], { env })).stdout) as {
      data: { available: boolean; browser: string };
    };
    assert.equal(status.data.available, true);
    assert.equal(status.data.browser, 'Chrome/999.0.0-fake');
  } finally {
    await fake.close();
  }

  // Without a browser: exit 1, and the fix in the message.
  const bare = { ...process.env, TCRAB_HOME: home, CDP_HOST: '127.0.0.1', CDP_PORT: '1' };
  const failed = await execFileP(process.execPath, [CLI, 'browser', 'status'], { env: bare }).then(
    () => null,
    (err: { code?: number; stderr?: string }) => err,
  );
  assert.ok(failed, 'a missing browser is a non-zero exit');
  assert.match(String(failed.stderr), /no Chrome\/Chromium found/);
  assert.match(String(failed.stderr), /--remote-debugging-port/);
  const json = JSON.parse((await execFileP(process.execPath, [CLI, 'browser', 'status', '--json'], { env: bare })).stdout) as {
    data: { available: boolean; hint?: string };
  };
  assert.equal(json.data.available, false);
  assert.match(String(json.data.hint), /remote-debugging-port/);
});

test('34.1 a real Chrome is used when this machine has one (skipped otherwise)', async (t) => {
  const previous = process.env.CDP_PORT;
  delete process.env.CDP_PORT;
  try {
    if (!(await isCdpAvailable('127.0.0.1', 9222))) {
      t.skip('no Chrome/Chromium with --remote-debugging-port=9222 on this machine');
      return;
    }
    const browser = await CdpBrowser.attach();
    try {
      const nav = await browser.navigate('data:text/html,<title>live</title><h1 id=h>hello live</h1>');
      assert.equal(nav.url.startsWith('data:text/html'), true);
      const body = await browser.text();
      assert.match(body, /hello live/);
    } finally {
      await browser.close();
    }
  } finally {
    if (previous !== undefined) process.env.CDP_PORT = previous;
  }
});
