import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TelegramChannel, TelegramUpdate } from '../src/channels/telegram.js';
import { createApproval, getApproval, listApprovals, resolveApproval } from '../src/core/approvals.js';

/**
 * Batch 48 — the interaction layer.
 *
 * The audit's headline gap was that Telegram could not *answer* anything: no
 * inline buttons, no callback handling, no command menu, and approvals — the
 * one place a chat genuinely needs a button — never arrived there at all.
 * OpenClaw approves exec from Telegram; this test drives the whole loop through
 * a fake Bot API: a button press becomes a real approval decision, answered
 * once, with the buttons dropped so it cannot be pressed twice.
 */

interface SentMessage {
  chat_id: number;
  text: string;
  reply_markup?: { inline_keyboard: { text: string; data: string }[][] };
}

function fakeApi() {
  const sent: SentMessage[] = [];
  const answered: { id: string; text?: string }[] = [];
  const edits: { chatId: number; messageId: number; buttons: unknown[] }[] = [];
  let updates: TelegramUpdate[] = [];
  let polls = 0;
  void polls;
  const commands: { command: string; description: string }[][] = [];
  let failCommands = false;

  const api = {
    sendMessage: async (chatId: number, text: string, buttons?: { text: string; data: string }[][]) => {
      sent.push({ chat_id: chatId, text, ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}) });
      return { message_id: sent.length };
    },
    getUpdates: async () => {
      polls++;
      // Deliver whatever was pushed, once (that is what an offset does), then
      // wait a tick so the loop does not spin.
      if (updates.length) {
        const batch = updates;
        updates = [];
        return batch;
      }
      await new Promise((r) => setTimeout(r, 10));
      return [];
    },
    getMe: async () => ({ id: 42, username: 'crab_bot' }),
    answerCallbackQuery: async (id: string, text?: string) => {
      answered.push({ id, ...(text ? { text } : {}) });
      return true;
    },
    editMessageReplyMarkup: async (chatId: number, messageId: number, buttons: { text: string; data: string }[][] = []) => {
      edits.push({ chatId, messageId, buttons: buttons.flat() });
      return true;
    },
    setMyCommands: async (list: { command: string; description: string }[]) => {
      if (failCommands) throw new Error('Bad Request: method not found');
      commands.push(list);
      return true;
    },
  };
  return {
    api,
    sent,
    answered,
    edits,
    commands,
    push: (u: TelegramUpdate) => {
      updates = [u];
    },
    failCommands: () => {
      failCommands = true;
    },
  };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function runChannel(
  fake: ReturnType<typeof fakeApi>,
  onCallback: (userId: number, chatId: number, data: string, queryId: string) => Promise<string>,
): Promise<TelegramChannel> {
  const channel = new TelegramChannel({
    cfg: { token: 't', allowedUserIds: [7] },
    getOffset: () => 0,
    setOffset: () => undefined,
    onMessage: async () => 'ok',
    onCallback,
    api: fake.api,
  });
  channel.start();
  for (let i = 0; i < 200 && !fake.sent.length; i++) await sleep(5);
  return channel;
}

test('48.1 a button press is a real decision, answered once, buttons dropped', async () => {
  process.env.TCRAB_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 't48a-'));
  const fake = fakeApi();
  const approval = createApproval({ tool: 'exec', args: { command: 'rm -rf build' }, sessionId: 'telegram:99' });
  const seen: string[] = [];

  const channel = await runChannel(fake, async (userId, chatId, data, queryId) => {
    seen.push(`${userId}@${chatId}:${data}:#${queryId}`);
    const [action, id] = data.split(':');
    const ok = resolveApproval(id!, action === 'approve', 'telegram');
    return ok ? `✅ approved ${action}` : 'already decided';
  });
  try {
    // 1. the approval arrives as a message with two buttons (this is what the
    //    gateway's bus subscriber sends; here we assert the channel's send API).
    const posted = await channel.sendButtons(99, '🔐 exec wants to run', [
      [
        { text: '✅ Allow', data: `approve:${approval.id}` },
        { text: '🚫 Deny', data: `deny:${approval.id}` },
      ],
    ]);
    assert.equal(posted, true);
    const first = fake.sent[0]!;
    assert.equal(first.chat_id, 99);
    assert.deepEqual(
      first.reply_markup!.inline_keyboard[0]!.map((b) => b.text),
      ['✅ Allow', '🚫 Deny'],
    );

    // 2. pressing Allow arrives as a callback_query and resolves the approval.
    fake.push({
      update_id: 1,
      callback_query: {
        id: 'cb-1',
        data: `approve:${approval.id}`,
        from: { id: 7, username: 'rakib' },
        message: { message_id: 11, chat: { id: 99 } },
      },
    });
    for (let i = 0; i < 200 && !seen.length; i++) await sleep(5);
    assert.deepEqual(seen, [`7@99:approve:${approval.id}:#cb-1`], 'the press reaches the handler with its identity');
    assert.equal(listApprovals(true).find((a) => a.id === approval.id)!.status, 'approved', 'the decision is real');
    assert.equal(fake.answered.length, 1, 'the client spinner is answered');
    assert.match(fake.answered[0]!.text ?? '', /approved/);
    assert.deepEqual(fake.edits[0]!.buttons, [], 'the buttons are dropped after the decision');

    // 3. the same button twice is refused, not re-decided.
    const second = await channel.sendButtons(99, 'again', [[{ text: 'Allow', data: `approve:${approval.id}` }]]);
    assert.equal(second, true);
  } finally {
    await channel.stop();
  }
});

test('48.2 the command menu is registered, and a failure is not fatal', async () => {
  process.env.TCRAB_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 't48b-'));
  const fake = fakeApi();
  const channel = new TelegramChannel({
    cfg: { token: 't', allowedUserIds: [7] },
    getOffset: () => 0,
    setOffset: () => undefined,
    onMessage: async () => 'ok',
    api: fake.api,
  });
  const ok = await channel.registerCommands([
    { cmd: '/status', description: 'Is everything running' },
    { cmd: '/board', description: 'Everything in flight' },
  ]);
  assert.equal(ok, true);
  assert.equal(fake.commands[0]!.length, 2);
  assert.deepEqual(
    fake.commands[0]!.map((c) => c.command),
    ['status', 'board'],
    'the leading slash is stripped for the Bot API',
  );

  const bad = fakeApi();
  bad.failCommands();
  const channel2 = new TelegramChannel({
    cfg: { token: 't', allowedUserIds: [7] },
    getOffset: () => 0,
    setOffset: () => undefined,
    onMessage: async () => 'ok',
    api: bad.api,
  });
  assert.equal(await channel2.registerCommands([{ cmd: '/a', description: 'x' }]), false, 'a refused menu is reported, not thrown');
});

test('48.3 the allowlist covers buttons, not just messages', async () => {
  process.env.TCRAB_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 't48c-'));
  const fake = fakeApi();
  let handlerRan = false;
  const channel = await runChannel(fake, async () => {
    handlerRan = true;
    return 'done';
  });
  try {
    fake.push({
      update_id: 2,
      callback_query: {
        id: 'cb-9',
        data: 'approve:anything',
        from: { id: 999 },
        message: { message_id: 3, chat: { id: 99 } },
      },
    });
    for (let i = 0; i < 100; i++) await sleep(5);
    assert.equal(handlerRan, false, 'a stranger cannot answer an approval');
    assert.equal(fake.answered.length, 1);
    assert.match(fake.answered[0]!.text ?? '', /not authorized/);
  } finally {
    await channel.stop();
  }
});
