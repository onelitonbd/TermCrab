/**
 * Batch 15 — the chat surface people actually use.
 *
 *   15.1 media in: a photo / document / voice note sent to the bot is checked
 *        (size, extension, never-executables), saved into workspace/inbox, and
 *        the agent is told the path; a refused file gets a sentence, not a crash.
 *   15.2 media out: `send_document` posts a workspace file through the channel's
 *        registered document sender, with a caption; a failed send keeps the
 *        file in the outbox so the flush can retry it.
 *   15.3 group discipline: in a group the bot answers only when it is mentioned
 *        or replied to (unless groupPolicy = "all"), and the mention is stripped
 *        before the agent sees the text.
 *   15.4 chat commands: /help, /usage, /sessions and /memory answer from the
 *        same data the CLI reports as JSON.
 *   15.5 the rules are written down (docs/CHANNELS.md) and the census moved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TelegramChannel, TelegramUpdate } from '../src/channels/telegram.js';
import { acceptIncoming, BLOCKED_EXTENSIONS, saveIncoming } from '../src/channels/media.js';
import {
  channelsWithDocuments,
  listConversations,
  recordInbound,
  registerDocumentSender,
  sendDocumentTo,
} from '../src/channels/conversations.js';
import { buildTools, ToolEnv } from '../src/agent/tools.js';
import { extraTools } from '../src/agent/toolbox.js';
import { defaults } from '../src/core/config.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

/** The same tool list the loop hands the model (core tools + extras). */
async function agentTools(): Promise<{ def: { name: string }; execute: (args: Record<string, unknown>) => Promise<string> }[]> {
  const env: ToolEnv = {
    config: defaults(),
    memory: new MemoryStore(),
    skills: new SkillStore(),
    extraRoots: [],
  };
  return [...(await buildTools(env)), ...extraTools(env)];
}

/** A channel whose API is a set of spies — nothing touches the network. */
function spyChannel(opts: {
  home?: string;
  cfg?: Partial<{ allowedUserIds: number[]; groupPolicy: 'mention' | 'all'; maxFileMb: number }>;
  onMessage: (text: string) => Promise<string> | string;
  files?: Record<string, Buffer>;
}) {
  const calls: string[] = [];
  let polls = 0;
  let updates: TelegramUpdate[] = [];
  const files = opts.files ?? {};
  const channel = new TelegramChannel({
    cfg: { token: 't', allowedUserIds: opts.cfg?.allowedUserIds ?? [7], ...opts.cfg },
    getOffset: () => 0,
    setOffset: () => undefined,
    onMessage: async (_u, _c, text) => opts.onMessage(text) as Promise<string>,
    api: {
      sendMessage: async (_chatId: number, html: string) => {
        calls.push(`send:${html}`);
        return {};
      },
      getUpdates: async () => {
        polls++;
        if (polls === 1) return updates;
        await sleep(10);
        return [];
      },
      getMe: async () => ({ id: 42, username: 'crab_bot' }),
      sendChatAction: async () => ({}),
      getFile: async (fileId: string) => ({ file_id: fileId, file_path: `files/${fileId}`, file_size: files[fileId]?.byteLength ?? 0 }),
      downloadFile: async (p: string) => {
        const id = p.replace('files/', '');
        const buf = files[id];
        if (!buf) throw new Error('no such file');
        return buf;
      },
      sendDocument: async (_chatId: number, filename: string, bytes: Buffer, caption?: string) => {
        calls.push(`doc:${filename}:${bytes.byteLength}${caption ? `:${caption}` : ''}`);
        return {};
      },
    },
  });
  return {
    channel,
    calls,
    push: (u: TelegramUpdate) => {
      updates = [u];
    },
  };
}

const textUpdate = (text: string, extra: Partial<NonNullable<TelegramUpdate['message']>> = {}): TelegramUpdate => ({
  update_id: 1,
  message: { text, chat: { id: 42, type: 'private' }, from: { id: 7, username: 'rakib' }, ...extra },
});

// --------------------------------------------------------------------- 15.1

test('15.1 an incoming file is checked, saved, and named to the agent', async (t) => {
  await t.test('the rules, in one place', () => {
    assert.equal(acceptIncoming({ name: 'note.txt', size: 10 }).ok, true);
    assert.equal(acceptIncoming({ name: 'photo.JPG', size: 10 }).ok, true, 'case does not matter');
    for (const bad of BLOCKED_EXTENSIONS) {
      const r = acceptIncoming({ name: `thing${bad}`, size: 10 });
      assert.equal(r.ok, false, `${bad} must be refused`);
      assert.match(r.reason ?? '', /executables/);
    }
    const big = acceptIncoming({ name: 'movie.mp4', size: 30 * 1024 * 1024 });
    assert.equal(big.ok, false);
    const unknown = acceptIncoming({ name: 'strange.xyz', size: 10 });
    assert.equal(unknown.ok, false);
    assert.match(unknown.reason ?? '', /not on the allowed list/);
  });

  await t.test('a photo lands in workspace/inbox and the agent sees the path', async () => {
    const home = tmpHome('t15a-');
    const seen: string[] = [];
    const bytes = Buffer.from('fake-jpeg-bytes');
    const spy = spyChannel({
      files: { big: bytes },
      onMessage: (text: string) => {
        seen.push(text);
        return 'I see it';
      },
    });
    spy.push({
      update_id: 1,
      message: {
        chat: { id: 42, type: 'private' },
        from: { id: 7, username: 'rakib' },
        caption: 'what is in this?',
        photo: [
          { file_id: 'small', file_size: 10 },
          { file_id: 'big', file_size: bytes.byteLength },
        ],
      },
    });
    spy.channel.start();
    for (let i = 0; i < 200 && !spy.calls.some((c) => c.startsWith('send:')); i++) await sleep(5);
    await spy.channel.stop();

    assert.equal(seen.length, 1, 'the agent was asked exactly once');
    assert.match(seen[0]!, /^\[photo saved to inbox\//);
    assert.match(seen[0]!, /what is in this\?$/, 'the caption rides along');
    const saved = fs.readdirSync(path.join(home, 'workspace', 'inbox'));
    assert.equal(saved.length, 1, 'exactly one file was written');
    assert.match(saved[0]!, /photo-/);
    assert.deepEqual(fs.readFileSync(path.join(home, 'workspace', 'inbox', saved[0]!)), bytes, 'the bytes are the ones Telegram offered');
    assert.deepEqual(spy.calls, ['send:I see it']);
  });

  await t.test('a blocked or too-large file is refused with a sentence', async () => {
    tmpHome('t15b-');
    const seen: string[] = [];
    const spy = spyChannel({
      cfg: { maxFileMb: 1 },
      onMessage: (text: string) => {
        seen.push(text);
        return 'never';
      },
    });
    spy.push({
      update_id: 1,
      message: {
        chat: { id: 42, type: 'private' },
        from: { id: 7 },
        document: { file_id: 'x', file_name: 'payload.apk', file_size: 1024 },
      },
    });
    spy.channel.start();
    for (let i = 0; i < 200 && !spy.calls.some((c) => c.startsWith('send:')); i++) await sleep(5);
    assert.equal(seen.length, 0, 'the agent never saw it');
    assert.match(spy.calls[0]!, /did not take that file: \.apk files are never accepted/);
    await spy.channel.stop();

    const spy2 = spyChannel({ cfg: { maxFileMb: 1 }, onMessage: () => 'never' });
    spy2.push({
      update_id: 1,
      message: { chat: { id: 42, type: 'private' }, from: { id: 7 }, document: { file_id: 'x', file_name: 'big.pdf', file_size: 2 * 1024 * 1024 } },
    });
    spy2.channel.start();
    for (let i = 0; i < 200 && !spy2.calls.some((c) => c.startsWith('send:')); i++) await sleep(5);
    assert.match(spy2.calls[0]!, /too large/);
    await spy2.channel.stop();
  });

  await t.test('two files with the same name never overwrite each other', () => {
    const home = tmpHome('t15c-');
    const a = saveIncoming({ name: 'note.txt', bytes: Buffer.from('a'), kind: 'document' }, { now: new Date('2026-10-03T10:00:00Z') });
    const b = saveIncoming({ name: 'note.txt', bytes: Buffer.from('b'), kind: 'document' }, { now: new Date('2026-10-03T10:00:01Z') });
    assert.notEqual(a.path, b.path);
    assert.equal(fs.readFileSync(a.path, 'utf8'), 'a');
    assert.equal(fs.readFileSync(b.path, 'utf8'), 'b');
    assert.match(a.relative, /^inbox\//);
    assert.ok(a.path.startsWith(path.join(home, 'workspace')), 'files live under the workspace');
  });
});

// --------------------------------------------------------------------- 15.2

test('15.2 the agent can send a file back through the channel', async (t) => {
  await t.test('sendDocumentTo uses the registered sender and the last chat', async () => {
    tmpHome('t15d-');
    const sent: string[] = [];
    registerDocumentSender('telegram', async (address, filePath, caption) => {
      sent.push(`${address}|${path.basename(filePath)}|${caption ?? ''}`);
    });
    recordInbound('telegram', '4242', 'hello');
    assert.deepEqual(channelsWithDocuments(), ['telegram']);
    const file = path.join(os.tmpdir(), 't15-report.txt');
    fs.writeFileSync(file, 'the report');
    const where = await sendDocumentTo('telegram', undefined, file, 'here it is');
    assert.equal(where.address, '4242', 'no address means the most recent chat');
    assert.deepEqual(sent, ['4242|t15-report.txt|here it is']);
    assert.ok(listConversations().some((c) => c.channel === 'telegram' && c.address === '4242'));
  });

  await t.test('a channel that cannot send files says so, and so does an empty one', async () => {
    tmpHome('t15e-');
    await assert.rejects(() => sendDocumentTo('signal', undefined, '/tmp/x', 'cap'), /cannot send files/);
    registerDocumentSender('slack', async () => undefined);
    await assert.rejects(() => sendDocumentTo('slack', undefined, '/tmp/x', 'cap'), /no known conversation/);
  });

  await t.test('a failed document send waits in the outbox with the file', async () => {
    tmpHome('t15f-');
    const channel = new TelegramChannel({
      cfg: { token: 't', allowedUserIds: [7] },
      getOffset: () => 0,
      setOffset: () => undefined,
      onMessage: async () => '',
      api: {
        sendMessage: async () => ({}),
        getUpdates: async () => [],
        getMe: async () => ({}),
        sendDocument: async () => {
          throw new Error('telegram is down');
        },
      },
    });
    const stray = path.join(os.tmpdir(), 't15-later.txt');
    fs.writeFileSync(stray, 'kept');
    await channel.sendDocument(42, stray, 'later');
    const { outboxPending } = await import('../src/mobile/outbox.js');
    const item = outboxPending('telegram').find((i) => i.file === stray);
    assert.ok(item, 'the file is queued, not lost');
    assert.equal(item!.text, 'later', 'the caption is kept');
    assert.match(item!.lastError ?? '', /telegram is down/);
  });

  await t.test('the send_file tool refuses executables and unknown paths', async () => {
    tmpHome('t15g-');
    const tools = await agentTools();
    const sendFile = tools.find((t) => t.def.name === 'send_file');
    assert.ok(sendFile, 'send_file exists');
    const home = tmpHome('t15g-');
    fs.mkdirSync(path.join(home, 'workspace'), { recursive: true });
    const apk = path.join(home, 'workspace', 'tmp-test-payload.apk');
    fs.writeFileSync(apk, 'not really an apk');
    try {
      await assert.rejects(() => sendFile!.execute({ path: apk }), /refusing to send/);
      await assert.rejects(() => sendFile!.execute({ path: '/nope/nothing.txt' }), /outside allowed roots/);
      await assert.rejects(() => sendFile!.execute({ path: path.join(home, 'workspace', 'ghost.txt') }), /no file at/);
    } finally {
      fs.rmSync(apk, { force: true });
    }
  });
});

// --------------------------------------------------------------------- 15.3

test('15.3 in a group the bot answers only when addressed', async (t) => {
  const groupUpdate = (text: string, from = { id: 7, username: 'rakib' }, replyTo?: { id: number; username?: string }) =>
    textUpdate(text, { chat: { id: 99, type: 'group' }, from, ...(replyTo ? { reply_to_message: { from: replyTo } } : {}) });

  await t.test('silence unless mentioned, then the mention is stripped', async () => {
    tmpHome('t15h-');
    const seen: string[] = [];
    const spy = spyChannel({ onMessage: (text: string) => ((text) => { seen.push(text); return 'ok'; })(text) });
    spy.push(groupUpdate('just chatting about crabs'));
    spy.channel.start();
    await sleep(60);
    await spy.channel.stop();
    assert.deepEqual(seen, [], 'chatter in the group is ignored');

    const seen2: string[] = [];
    const spy2 = spyChannel({
      onMessage: (text: string) => {
        seen2.push(text);
        return 'ok';
      },
    });
    spy2.push(groupUpdate('@crab_bot what is the weather?'));
    spy2.channel.start();
    for (let i = 0; i < 200 && !seen2.length; i++) await sleep(5);
    await spy2.channel.stop();
    assert.deepEqual(seen2, ['what is the weather?'], 'the mention is stripped before the agent sees it');
  });

  await t.test('a reply to the bot counts as addressing it', async () => {
    tmpHome('t15i-');
    const seen: string[] = [];
    const spy = spyChannel({ onMessage: (text: string) => ((text) => { seen.push(text); return 'ok'; })(text) });
    spy.push(groupUpdate('and this one?', { id: 7, username: 'rakib' }, { id: 42, username: 'crab_bot' }));
    spy.channel.start();
    for (let i = 0; i < 200 && !seen.length; i++) await sleep(5);
    await spy.channel.stop();
    assert.deepEqual(seen, ['and this one?']);
  });

  await t.test('groupPolicy "all" answers everything, and private chats always do', async () => {
    tmpHome('t15j-');
    const seen: string[] = [];
    const spy = spyChannel({ cfg: { groupPolicy: 'all' }, onMessage: (text: string) => ((text) => { seen.push(text); return 'ok'; })(text) });
    spy.push(groupUpdate('no mention here'));
    spy.channel.start();
    for (let i = 0; i < 200 && !seen.length; i++) await sleep(5);
    await spy.channel.stop();
    assert.deepEqual(seen, ['no mention here']);

    const priv = spyChannel({ onMessage: (text: string) => ((text) => { seen.push(text); return 'ok'; })(text) });
    priv.push(textUpdate('hello in private'));
    priv.channel.start();
    for (let i = 0; i < 200 && seen.length < 2; i++) await sleep(5);
    await priv.channel.stop();
    assert.equal(seen[1], 'hello in private');
  });
});

// --------------------------------------------------------------------- 15.4

test('15.4 the chat commands answer from the same data the CLI reports', async (t) => {
  await t.test('the slash commands are real in the gateway source', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/gateway/server.ts'), 'utf8');
    // Batch 46 moved /help and the report commands into the shared dispatcher
    // (src/gateway/chat-reports.ts) so Telegram and the panel's chat answer with
    // the same words; the legacy commands stayed in the handler, and the
    // dispatcher call is what proves the moved ones are reachable.
    for (const cmd of ['/usage', '/sessions', '/memory']) {
      assert.ok(src.includes(`text === '${cmd}'`), `${cmd} is handled`);
    }
    assert.match(src, /runReportCommand\(/, 'the shared chat dispatcher is called');
    const reports = fs.readFileSync(path.join(process.cwd(), 'src', 'gateway', 'chat-reports.ts'), 'utf8');
    assert.match(reports, /case '\/help':/, '/help is handled by the dispatcher');
    for (const cmd of ['/logs', '/config', '/board', '/disk', '/perf', '/doctor', '/security', '/auth', '/devices', '/embeddings', '/dream', '/docs', '/skills', '/cron']) {
      assert.ok(reports.includes(`case '${cmd}':`), `${cmd} is handled by the shared dispatcher`);
    }
    assert.match(src, /usageForDay\(\)/, '/usage reads the real meter');
    assert.match(src, /sessions\.list\(\)/, '/sessions reads the real session store');
    assert.match(src, /memory\.readForPrompt\(/, '/memory reads the real memory');
  });

  await t.test('the tools the agent needs are registered', async () => {
    tmpHome('t15k-');
    const tools = await agentTools();
    const names = tools.map((t) => t.def.name);
    for (const name of ['send_file', 'conversations_send', 'conversations_list']) {
      assert.ok(names.includes(name), `${name} is available to the agent`);
    }
  });
});

// --------------------------------------------------------------------- 15.5

test('15.5 the channel rules are written down, and the census says so', async (t) => {
  await t.test('docs/CHANNELS.md is honest per channel', () => {
    const doc = path.join(process.cwd(), 'docs/CHANNELS.md');
    assert.ok(fs.existsSync(doc), 'docs/CHANNELS.md exists');
    const text = fs.readFileSync(doc, 'utf8');
    for (const channel of ['Telegram', 'WhatsApp', 'Discord', 'Slack', 'Signal', 'SMS', 'Matrix']) {
      assert.ok(text.includes(channel), `${channel} has a row`);
    }
    assert.match(text, /groupPolicy/);
    assert.match(text, /inbox\//);
    assert.match(text, /20 MB|20 MB/);
  });

  await t.test('the census rows moved with this test as evidence', () => {
    const census = JSON.parse(
      execFileSync('node', ['-e', "process.stdout.write(JSON.stringify(require('./docs/openclaw/data/census.json')))"], {
        encoding: 'utf8',
      }),
    ) as { rows: { capability: string; verdict: string; evidence: string }[] };
    const media = census.rows.find((r) => r.capability === 'Media send/receive');
    const groups = census.rows.find((r) => r.capability === 'Group / ambient events');
    const slash = census.rows.find((r) => r.capability === 'Slash commands in chat');
    assert.ok(media && groups && slash);
    assert.equal(media!.verdict, 'WORKING');
    // 34.3 moved this row to WORKING; the assertion moves with it, and the
    // evidence must still state the structural limit rather than pretend.
    assert.equal(groups!.verdict, 'WORKING');
    assert.match(groups!.evidence, /cannot fetch messages the bot never received/);
    assert.equal(slash!.verdict, 'WORKING');
    for (const row of [media!, groups!, slash!]) {
      assert.match(row.evidence, /15\.\d/, `${row.capability} cites the batch`);
    }
  });
});
