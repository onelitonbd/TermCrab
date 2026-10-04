/**
 * Batch 36 — the four things a finished product still owes.
 *
 *   36.1 CI on a green run          → blocked on the owner's push (asserted in
 *                                     `test/tier3g.test.ts`, not pretended here)
 *   36.2 a live Telegram smoke      → the script is driven against a stub API
 *                                     that plays the real one, including the
 *                                     half that matters: the token must never
 *                                     reach stdout
 *   36.3 the docs page per release  → `termcrab docs --keep`
 *   36.4 the page says when it was built → release + build time in the header,
 *                                     and `/api/docs` can tell a stale page
 *
 * There is no network in this suite: the "Telegram API" here is a local HTTP
 * server that answers the three methods the smoke uses. What that proves is
 * *our* side — the request shapes, the redaction, the exit codes, and the fact
 * that the script drives `src/channels/api.ts` rather than its own fetch.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { buildDocsSite, ensureDocsSite, keptDocsSitePath, KEEP_COPIES } from '../src/docs/site.js';

const ROOT = process.cwd();
const CLI = path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js');
const SMOKE = path.join(ROOT, 'scripts', 'smoke-telegram.mjs');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function runNode(file: string, args: string[], env: Record<string, string> = {}) {
  const res = spawnSync(process.execPath, [file, ...args], {
    encoding: 'utf8',
    cwd: ROOT,
    env: { ...process.env, NO_COLOR: '1', ...env },
    timeout: 60_000,
  });
  return { code: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

/**
 * The same call without blocking this process.
 *
 * The stub Telegram API lives in *this* process, so `spawnSync` would freeze
 * the event loop and the child would wait forever for an answer that cannot be
 * written until the child exits. (test/tier3d.test.ts learned this the hard
 * way; this is the same helper.)
 */
function runNodeAsync(file: string, args: string[], env: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
    execFile(
      process.execPath,
      [file, ...args],
      { encoding: 'utf8', cwd: ROOT, env: { ...process.env, NO_COLOR: '1', ...env }, timeout: 60_000 },
      (err, stdout, stderr) => {
        const code = err && typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : err ? 1 : 0;
        resolve({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
      },
    );
  });
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

/** A Telegram Bot API that answers the three methods the smoke script uses. */
async function fakeTelegram(opts: { token: string; badToken?: boolean; reply?: string | null }) {
  const seen: { method: string; body: Record<string, unknown> }[] = [];
  let updateId = 5;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const method = url.pathname.split('/').pop() ?? '';
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      seen.push({ method, body });
      const send = (payload: unknown, status = 200) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(payload));
      };
      const authorized = req.url?.includes(`/bot${opts.token}/`);
      if (!authorized || opts.badToken) {
        send({ ok: false, description: 'Unauthorized' }, 401);
        return;
      }
      if (method === 'getMe') {
        send({ ok: true, result: { id: 42, username: 'termcrab_smoke_bot', first_name: 'TermCrab' } });
        return;
      }
      if (method === 'sendMessage') {
        send({ ok: true, result: { message_id: 10, chat: { id: body.chat_id } } });
        return;
      }
      if (method === 'getUpdates') {
        // Three shapes, matching what the real Bot API returns:
        //   offset -1 / 0 → the queue as it stands (how the script learns a chat id)
        //   offset > 0    → whatever arrived after that id (the owner's reply)
        if (Number(body.offset) <= 0) {
          send({ ok: true, result: [{ update_id: updateId, message: { message_id: 1, chat: { id: 99 }, text: 'older message' } }] });
          return;
        }
        if (opts.reply === null) {
          send({ ok: true, result: [] });
          return;
        }
        updateId += 1;
        send({
          ok: true,
          result: [
            {
              update_id: updateId,
              message: { message_id: 11, chat: { id: 99 }, from: { id: 7, username: 'owner' }, text: opts.reply ?? 'hello crab' },
            },
          ],
        });
        return;
      }
      send({ ok: false, description: `unknown method ${method}` }, 404);
    });
  });
  const port = await freePort();
  await new Promise<void>((r) => server.listen(port, '127.0.0.1', () => r()));
  return {
    port,
    seen,
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

test('36.2 the live Telegram smoke: skips without a token, works with one, never prints it', { concurrency: false }, async (t) => {
  await t.test('with no token it says skipped and exits 0', () => {
    const env = { ...process.env };
    delete env.TCRAB_TELEGRAM_TOKEN;
    delete env.TCRAB_TELEGRAM_CHAT;
    const r = runNode(SMOKE, [], { ...env, TCRAB_TELEGRAM_TOKEN: '' });
    assert.equal(r.code, 0, 'a phone with no bot is not a failure');
    assert.match(r.stdout, /skipped — no TCRAB_TELEGRAM_TOKEN/);
    assert.match(r.stdout, /@BotFather/, 'and it says where a token comes from');
  });

  await t.test('a token and a chat id: it sends, waits, and reads the reply back', async () => {
    const token = '123456:SMOKE-secret-ABC';
    const tg = await fakeTelegram({ token, reply: 'hello crab' });
    try {
      const r = await runNodeAsync(SMOKE, ['--wait', '5'], {
        TCRAB_TELEGRAM_TOKEN: token,
        TCRAB_TELEGRAM_CHAT: '99',
        TCRAB_TELEGRAM_API: tg.base,
      });
      assert.equal(r.code, 0, r.stderr || r.stdout);
      const all = r.stdout + r.stderr;
      assert.match(r.stdout, /bot is @termcrab_smoke_bot/);
      assert.match(r.stdout, /sent message 10 to chat 99/);
      assert.match(r.stdout, /read back: “hello crab” from owner/);
      assert.match(r.stdout, /telegram smoke: ok/);
      assert.ok(!all.includes(token), 'the token never reaches the output');
      assert.ok(!all.includes('SMOKE-secret-ABC'), 'not even the secret half');

      const methods = tg.seen.map((s) => s.method);
      assert.deepEqual(methods.slice(0, 3), ['getMe', 'getUpdates', 'sendMessage'], 'the real client called the real methods in order');
      const sent = tg.seen.find((s) => s.method === 'sendMessage')!;
      assert.equal(sent.body.chat_id, 99, 'the chat id the owner gave is the one used');
      assert.match(String(sent.body.text), /smoke test/i);
    } finally {
      await tg.close();
    }
  });

  await t.test('a rejected token fails with a sentence, and still hides the token', async () => {
    const token = '999:REJECTED-token';
    const tg = await fakeTelegram({ token, badToken: true });
    try {
      const r = await runNodeAsync(SMOKE, ['--wait', '2'], {
        TCRAB_TELEGRAM_TOKEN: token,
        TCRAB_TELEGRAM_CHAT: '99',
        TCRAB_TELEGRAM_API: tg.base,
      });
      assert.equal(r.code, 1, 'a bad token is a real failure');
      assert.match(r.stderr, /telegram smoke: failed — telegram getMe: Unauthorized/);
      assert.ok(!(r.stdout + r.stderr).includes(token), 'the token is not in the failure either');
    } finally {
      await tg.close();
    }
  });

  await t.test('with no chat id yet it finds the id from the update queue', async () => {
    const token = '321:NOCHAT';
    const tg = await fakeTelegram({ token, reply: null });
    try {
      const r = await runNodeAsync(SMOKE, [], {
        TCRAB_TELEGRAM_TOKEN: token,
        TCRAB_TELEGRAM_CHAT: '',
        TCRAB_TELEGRAM_API: tg.base,
      });
      assert.equal(r.code, 0, r.stderr || r.stdout);
      assert.match(r.stdout, /found 1 chat id/);
      assert.match(r.stdout, /99/, 'the chat id from the queue is printed');
      assert.ok(!tg.seen.some((s) => s.method === 'sendMessage'), 'nothing is sent before there is a chat');
    } finally {
      await tg.close();
    }
  });

  await t.test('the smoke drives our own client, not a second implementation', () => {
    const script = fs.readFileSync(SMOKE, 'utf8');
    assert.match(script, /from '\.\.\/dist\/src\/channels\/api\.js'/, 'it imports TelegramApi');
    assert.match(script, /new TelegramApi\(/, 'and constructs it');
    assert.ok(!/\bfetch\(/.test(script), 'no hand-rolled fetch inside the smoke');
  });
});

test('36.3 the docs page per release', { concurrency: false }, async (t) => {
  const home = tmpHome('t363-');
  const docsDir = path.join(home, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'a.md'), '# A\n\n## A1\n\nhello\n');

  await t.test('--keep writes docs-site-<release>.html beside the live page', () => {
    const r = ensureDocsSite({ docsDir, keep: true, release: '1.2.3', force: true });
    assert.equal(r.rebuilt, true);
    assert.equal(r.release, '1.2.3');
    const kept = keptDocsSitePath('1.2.3');
    assert.ok(fs.existsSync(kept), `${path.basename(kept)} exists`);
    assert.equal(r.kept?.[0], kept);
    assert.equal(fs.readFileSync(kept, 'utf8'), fs.readFileSync(r.file, 'utf8'), 'the copy is the page');
    assert.match(fs.readFileSync(kept, 'utf8'), /name="release" content="1\.2\.3"/);
  });

  await t.test('only the last five releases are kept, oldest pruned first', () => {
    for (const v of ['1.2.4', '1.2.5', '1.3.0', '1.3.1', '1.4.0']) {
      ensureDocsSite({ docsDir, keep: true, release: v, force: true });
    }
    const names = fs
      .readdirSync(path.dirname(keptDocsSitePath('x')))
      .filter((f) => /^docs-site-.*\.html$/.test(f))
      .sort();
    assert.equal(names.length, KEEP_COPIES, `at most ${KEEP_COPIES} copies`);
    assert.ok(!names.includes('docs-site-1.2.3.html'), 'the oldest copy went first');
    assert.ok(names.includes('docs-site-1.4.0.html'), 'the newest stayed');
  });

  await t.test('the CLI exposes it, and names the copy it kept', () => {
    const cliHome = tmpHome('t363cli-'); // its own home: the fake releases above would outrank 0.69.0
    const json = runNode(CLI, ['docs', '--keep', '--json'], { TCRAB_HOME: cliHome });
    assert.equal(json.code, 0, json.stderr);
    const data = JSON.parse(json.stdout) as { data: { release: string; kept?: string[] } };
    assert.equal(data.data.release, JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version);
    const current = path.basename(keptDocsSitePath(data.data.release));
    assert.ok(data.data.kept?.includes(keptDocsSitePath(data.data.release)), `${current} is among the kept copies`);
    assert.ok((data.data.kept?.length ?? 0) <= KEEP_COPIES, 'and the cap holds');

    const human = runNode(CLI, ['docs', '--keep'], { TCRAB_HOME: cliHome });
    assert.match(human.stdout, /kept for this release: docs-site-/);
    assert.match(human.stdout, /release \d+\.\d+\.\d+/);
  });
});

test('36.4 the page says which release it is and when it was built', { concurrency: false }, async (t) => {
  await t.test('the built page carries the release and a readable build time', () => {
    const site = buildDocsSite({ docsDir: path.join(ROOT, 'docs'), now: Date.UTC(2026, 9, 4, 12, 34) });
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { version: string };
    assert.equal(site.release, pkg.version);
    assert.match(site.html, new RegExp(`<meta name="release" content="${pkg.version.replace(/\./g, '\\.')}">`));
    assert.match(site.html, /<span id="stampVersion">\d+\.\d+\.\d+<\/span>/);
    assert.match(site.html, /built 2026-10-04 12:34 UTC/);
    assert.match(site.html, /58 docs, \d+ sections/, 'the header says what is inside');
  });

  await t.test('an explicit release overrides it, so a rebuilt old page can say so', () => {
    const site = buildDocsSite({ docsDir: path.join(ROOT, 'docs'), release: '0.1.0' });
    assert.equal(site.release, '0.1.0');
    assert.match(site.html, /<span id="stampVersion">0\.1\.0<\/span>/);
  });

  await t.test('a rebuilt page reports its own numbers without a second build', () => {
    const home = tmpHome('t364-');
    const docsDir = path.join(home, 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'a.md'), '# A\n\n## A1\n\nhello\n## A2\n\nmore\n');
    const first = ensureDocsSite({ docsDir, force: true, release: '9.9.9' });
    const again = ensureDocsSite({ docsDir });
    assert.equal(again.rebuilt, false);
    assert.equal(again.release, '9.9.9', 'the stamp is read back, not guessed');
    assert.equal(again.docs, first.docs);
    assert.equal(again.sections, first.sections);
  });
});
