import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import { startGateway } from '../src/gateway/server.js';
import { runReportCommand } from '../src/gateway/chat-reports.js';
import { TelegramChannel } from '../src/channels/telegram.js';
import { telegramSessionKey } from '../src/agent/rolling.js';
import { inlineKeyboard } from '../src/channels/api.js';

/**
 * Batch 51 — Telegram's tail.
 *
 * Seven cells were the last ❌ in the three-surface audit, all on Telegram:
 * the suite clock, the work tracker, `/embeddings setup`, `/say`, voice
 * replies, forum topics and the mini app. Each test here drives the real code
 * the Bot API would drive (the channel with a stub API, the shared dispatcher,
 * the session-key helper), so a green run means the messages really go out.
 */

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

/** A Bot API stub that records everything a test needs to look at. */
function stubApi() {
  const messages: { chatId: number; text: string; buttons?: unknown }[] = [];
  const voices: { chatId: number; filename: string; bytes: number; caption?: string }[] = [];
  const documents: { chatId: number; filename: string; bytes: number; caption?: string }[] = [];
  return {
    messages,
    voices,
    documents,
    api: {
      getMe: async () => ({ username: 'testbot', id: 99 }),
      getUpdates: async () => [],
      sendMessage: async (chatId: number, text: string, buttons?: unknown) => {
        messages.push({ chatId, text, buttons });
        return { ok: true };
      },
      sendChatAction: async () => ({ ok: true }),
      answerCallbackQuery: async () => ({ ok: true }),
      editMessageReplyMarkup: async () => ({ ok: true }),
      sendDocument: async (chatId: number, filename: string, bytes: Buffer, caption?: string) => {
        documents.push({ chatId, filename, bytes: bytes.byteLength, ...(caption ? { caption } : {}) });
        return { ok: true };
      },
      sendVoice: async (chatId: number, filename: string, bytes: Buffer, caption?: string) => {
        voices.push({ chatId, filename, bytes: bytes.byteLength, ...(caption ? { caption } : {}) });
        return { ok: true };
      },
    },
  };
}

test('51.1 the suite clock and the work tracker answer in a chat', async (t) => {
  tmpHome('t51a-');
  // The suite clock reads whatever `npm run test:time` last recorded; point it
  // at a known record instead of whatever this machine measured.
  const record = path.join(os.tmpdir(), `t51-suite-${process.pid}.json`);
  fs.writeFileSync(
    record,
    JSON.stringify({
      at: new Date().toISOString(),
      wallMs: 165_300,
      totalTests: 1071,
      totalFiles: 108,
      slowest: [{ file: 'tier3j.test.js', ms: 39_400 }],
      budget: { wallMs: 240_000, fileMs: 90_000 },
      over: [],
    }),
    'utf8',
  );
  process.env.TCRAB_SUITE_TIME = record;
  const deps = { agent: {}, skills: { list: () => [] } };

  await t.test('the report carries the recorded numbers, not a new run', async () => {
    const r = await runReportCommand('/suite-time', deps);
    assert.ok(r?.ok, 'the command is handled');
    assert.match(r.text, /165\.3 s/);
    assert.match(r.text, /1071 case/);
    assert.match(r.text, /tier3j\.test\.js 39\.4 s/);
  });

  await t.test('/work shows Now and the queued batch; /work full attaches the file', async () => {
    const now = await runReportCommand('/work', deps);
    assert.ok(now?.ok);
    assert.match(now.text, /WORKLOG\.md/);
    // The ids are read from the tracker itself: whichever batch is Now, its
    // steps are the ones that must reach the chat (and the next batch's too).
    const wl = fs.readFileSync(path.join(process.cwd(), 'WORKLOG.md'), 'utf8');
    const idsIn = (from: string, to: string): string[] =>
      wl
        .slice(wl.indexOf(from), wl.indexOf(to))
        .split('\n')
        .flatMap((l) => {
          const m = /^\|\s*(\d+\.\d+)\s*\|/.exec(l.trim());
          return m ? [m[1]!] : [];
        });
    const nowIds = idsIn('## 2. Now', '## 3. Next');
    const nextIds = idsIn('## 3. Next', '## 4. Done');
    assert.ok(nowIds.length >= 4, 'the tracker queues a batch');
    for (const id of nowIds) assert.ok(now.text.includes(id), `${id} reaches the chat`);
    for (const id of nextIds) assert.ok(now.text.includes(id), `${id} is named as next`);
    assert.match(now.text, /✔ done/);
    assert.match(now.text, /☐ todo/);
    assert.ok(!now.text.includes('npm run ci:install'), 'the owner-action block is not a batch step');
    assert.equal(now.attach, undefined, 'a plain /work sends no file');

    const full = await runReportCommand('/work full', deps);
    assert.ok(full?.ok);
    assert.ok(full.attach, '/work full asks for an attachment');
    assert.match(full.attach.file, /WORKLOG\.md$/);
    assert.ok(fs.existsSync(full.attach.file), 'and the file it names exists');
  });

  await t.test('/say refuses an empty text and caps a long one', async () => {
    const empty = await runReportCommand('/say', deps);
    assert.equal(empty?.ok, false);
    assert.match((empty as { error: string }).error, /usage: \/say/);
    const long = await runReportCommand(`/say ${'x'.repeat(1600)}`, deps);
    assert.equal(long?.ok, false);
  });

  await t.test('the panel reaches both through the same dispatcher', async () => {
    const config = defaults();
    config.provider = { type: 'openai', baseUrl: 'http://127.0.0.1:1/never', apiKey: 'sk-test', model: 'test-model' };
    config.gateway = { ...config.gateway, token: 'tok' };
    saveConfig(config);
    const port = await freePort();
    const handle = await startGateway({ config, host: '127.0.0.1', port });
    try {
      const slash = async (command: string): Promise<Record<string, unknown>> => {
        const res = await fetch(`http://127.0.0.1:${port}/api/slash`, {
          method: 'POST',
          headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
          body: JSON.stringify({ command }),
        });
        return (await res.json()) as Record<string, unknown>;
      };
      const work = await slash('/work');
      assert.equal(work.ok, true);
      assert.match(String(work.message), /WORKLOG\.md/);
      const clock = await slash('/suite-time');
      assert.equal(clock.ok, true);
      assert.match(String(clock.message), /165\.3 s/);
      const list = await (await fetch(`http://127.0.0.1:${port}/api/slash`, { headers: { authorization: 'Bearer tok' } })).json() as {
        commands: { name: string }[];
      };
      for (const cmd of ['/suite-time', '/work', '/say', '/controlui']) {
        assert.ok(list.commands.some((c) => c.name === cmd), `${cmd} is in the palette`);
      }
    } finally {
      await handle.stop();
    }
  });

  delete process.env.TCRAB_SUITE_TIME;
  fs.rmSync(record, { force: true });
});

test('51.2 /say sends a voice note, and a machine without TTS keeps the text', async (t) => {
  tmpHome('t51b-');
  await t.test('an OGG reply goes out through sendVoice', async () => {
    const stub = stubApi();
    const voiceDir = path.join(process.env.TCRAB_HOME!, 'state', 'voice');
    const channel = new TelegramChannel({
      cfg: { token: 'test-token', allowedUserIds: [] },
      onMessage: async () => ({ text: 'hello from the crab', speak: true }),
      getOffset: () => 0,
      setOffset: () => {},
      api: stub.api as never,
      speakFile: async (text, dir) => {
        assert.equal(text, 'hello from the crab');
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'voice-test.ogg');
        fs.writeFileSync(file, Buffer.from('OggS-fake-opus'));
        return { ok: true, file, engine: 'espeak-ng', converter: 'ffmpeg', ogg: true, bytes: 14 };
      },
    });
    await channel.handleUpdate({
      update_id: 1,
      message: { text: '/say hello from the crab', chat: { id: 42, type: 'private' }, from: { id: 7 } },
    });
    assert.equal(stub.voices.length, 1, 'a voice note went out');
    assert.equal(stub.voices[0]!.chatId, 42);
    assert.equal(stub.voices[0]!.bytes, 14);
    assert.equal(stub.messages.length, 0, 'and no duplicate text');
    assert.ok(fs.existsSync(voiceDir), 'the file lives under state/voice');
  });

  await t.test('no engine: the words still arrive, with the reason', async () => {
    const stub = stubApi();
    const channel = new TelegramChannel({
      cfg: { token: 'test-token', allowedUserIds: [] },
      onMessage: async () => ({ text: 'spoken request', speak: true }),
      getOffset: () => 0,
      setOffset: () => {},
      api: stub.api as never,
      speakFile: async () => ({ ok: false, ogg: false, error: 'no TTS backend' }),
    });
    await channel.handleUpdate({
      update_id: 2,
      message: { text: '/say spoken request', chat: { id: 42, type: 'private' }, from: { id: 7 } },
    });
    assert.equal(stub.voices.length, 0);
    assert.equal(stub.messages.length, 1);
    assert.match(stub.messages[0]!.text, /spoken request/);
    assert.match(stub.messages[0]!.text, /espeak-ng/, 'the hint names the fix');
  });

  await t.test('a plain reply is never spoken', async () => {
    const stub = stubApi();
    let spoke = false;
    const channel = new TelegramChannel({
      cfg: { token: 'test-token', allowedUserIds: [] },
      onMessage: async () => 'just text',
      getOffset: () => 0,
      setOffset: () => {},
      api: stub.api as never,
      speakFile: async () => {
        spoke = true;
        return { ok: true, ogg: true };
      },
    });
    await channel.handleUpdate({
      update_id: 3,
      message: { text: 'hi', chat: { id: 42, type: 'private' }, from: { id: 7 } },
    });
    assert.equal(spoke, false);
    assert.equal(stub.messages.length, 1);
  });
});

test('51.3 a voice note in gets a voice note back when the setting is on', async () => {
  tmpHome('t51c-');
  const build = (voiceReplies: boolean) => {
    const stub = stubApi();
    const channel = new TelegramChannel({
      cfg: { token: 'test-token', allowedUserIds: [], voiceReplies },
      onMessage: async (_u, _c, text) => `you said: ${text}`,
      getOffset: () => 0,
      setOffset: () => {},
      api: stub.api as never,
      intake: async () => 'transcribed: turn the lights off',
      saveFile: async (file) => ({
        path: `/tmp/${file.name}`,
        relative: file.name,
        bytes: file.bytes.byteLength,
      }),
      speakFile: async (_text, dir) => {
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, 'voice-reply.ogg');
        fs.writeFileSync(file, Buffer.from('OggS-reply'));
        return { ok: true, file, engine: 'espeak-ng', converter: 'ffmpeg', ogg: true, bytes: 10 };
      },
    });
    const api = stub.api as unknown as { getFile: unknown; downloadFile: unknown };
    api.getFile = async () => ({ file_id: 'f1', file_path: 'voice/file.ogg' });
    api.downloadFile = async () => Buffer.from('ogg-bytes-in');
    return { stub, channel };
  };

  const on = build(true);
  await on.channel.handleUpdate({
    update_id: 10,
    message: {
      voice: { file_id: 'f1', file_size: 11 },
      chat: { id: 7, type: 'private' },
      from: { id: 5 },
    },
  });
  assert.equal(on.stub.voices.length, 1, 'the answer came back spoken');
  assert.match(on.stub.voices[0]!.filename, /\.ogg$/);

  const off = build(false);
  await off.channel.handleUpdate({
    update_id: 11,
    message: {
      voice: { file_id: 'f1', file_size: 11 },
      chat: { id: 7, type: 'private' },
      from: { id: 5 },
    },
  });
  assert.equal(off.stub.voices.length, 0, 'off by default: text reply');
  assert.equal(off.stub.messages.length, 1);
  assert.match(off.stub.messages[0]!.text, /transcribed/);
});

test('51.4 forum topics key their own sessions, and plain groups keep theirs', async () => {
  assert.equal(telegramSessionKey({ chatId: -100, threadId: 7 }), 'telegram:-100:7');
  assert.equal(telegramSessionKey({ chatId: -100, threadId: 8 }), 'telegram:-100:8');
  assert.notEqual(
    telegramSessionKey({ chatId: -100, threadId: 7 }),
    telegramSessionKey({ chatId: -100, threadId: 8 }),
    'two topics, two conversations',
  );
  assert.equal(telegramSessionKey({ chatId: -100 }), 'telegram:-100', "today's key, unchanged");
  assert.equal(telegramSessionKey({ chatId: 42, userId: 7, scoping: 'user' }), 'telegram:u:7');
  assert.equal(telegramSessionKey({ chatId: 42, userId: 7, scoping: 'user', threadId: 3 }), 'telegram:u:7:3');

  // The channel passes the topic through instead of dropping it.
  tmpHome('t51d-');
  const stub = stubApi();
  const seen: (number | undefined)[] = [];
  const channel = new TelegramChannel({
    // a forum is a supergroup, and the default group policy is mention-only —
    // the routing is what is under test here, so the policy answers everything.
    cfg: { token: 'test-token', allowedUserIds: [], groupPolicy: 'all' },
    onMessage: async (_u, _c, _t, _n, ctx) => {
      seen.push(ctx?.threadId);
      return 'ok';
    },
    getOffset: () => 0,
    setOffset: () => {},
    api: stub.api as never,
  });
  await channel.handleUpdate({
    update_id: 20,
    message: { text: 'topic seven', message_thread_id: 7, chat: { id: -100, type: 'supergroup' }, from: { id: 5 } },
  });
  await channel.handleUpdate({
    update_id: 21,
    message: { text: 'topic eight', message_thread_id: 8, chat: { id: -100, type: 'supergroup' }, from: { id: 5 } },
  });
  await channel.handleUpdate({
    update_id: 22,
    message: { text: 'no topic', chat: { id: -100, type: 'group' }, from: { id: 5 } },
  });
  assert.deepEqual(seen, [7, 8, undefined]);
});

test('51.5 /controlui sends a Web App button, or says why it cannot', async (t) => {
  tmpHome('t51e-');
  const deps = { agent: {}, skills: { list: () => [] } };

  await t.test('the report refuses loopback and an unset address', async () => {
    const unset = await runReportCommand('/controlui', deps);
    assert.ok(unset?.ok);
    assert.match(unset.text, /gateway\.publicUrl/);
    assert.match(unset.text, /no public address/);

    const loop = await runReportCommand('/controlui', { ...deps, publicUrl: 'http://127.0.0.1:7788' });
    assert.ok(loop?.ok);
    assert.match(loop.text, /loopback/);

    const good = await runReportCommand('/controlui', { ...deps, publicUrl: 'https://crab.example.com/' });
    assert.ok(good?.ok);
    assert.match(good.text, /https:\/\/crab\.example\.com/);
  });

  await t.test('the button carries web_app, and a real Telegram shape', () => {
    const keyboard = inlineKeyboard([[{ text: '🦀 Open the panel', webApp: 'https://crab.example.com/' }]]);
    assert.deepEqual(keyboard, [[{ text: '🦀 Open the panel', web_app: { url: 'https://crab.example.com/' } }]]);
    const callback = inlineKeyboard([[{ text: '✅ Allow', data: 'approve:abc' }]]);
    assert.deepEqual(callback, [[{ text: '✅ Allow', callback_data: 'approve:abc' }]]);
  });

  await t.test('sendWebApp puts the button on a message', async () => {
    const stub = stubApi();
    const channel = new TelegramChannel({
      cfg: { token: 'test-token', allowedUserIds: [] },
      onMessage: async () => '',
      getOffset: () => 0,
      setOffset: () => {},
      api: stub.api as never,
    });
    const ok = await channel.sendWebApp(42, '📱 the panel lives at https://crab.example.com', '🦀 Open the panel', 'https://crab.example.com');
    assert.equal(ok, true);
    assert.equal(stub.messages.length, 1);
    const buttons = stub.messages[0]!.buttons as { text: string; webApp?: string }[][];
    assert.equal(buttons[0]![0]!.webApp, 'https://crab.example.com');
    assert.match(buttons[0]![0]!.text, /panel/);
  });
});
