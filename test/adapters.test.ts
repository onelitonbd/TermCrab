/**
 * Batch 13.5 — the five optional chat adapters, tested without the services.
 *
 * Discord (discord.js), Slack (@slack/bolt), Signal (signal-cli), SMS (Twilio)
 * and Matrix (matrix-js-sdk) are all "bring your own client" integrations. Each
 * one takes an injected transport, so these tests drive the real routing code —
 * allowlists, the agent call, the reply, and the offline outbox on failure —
 * with no network, no tokens and no installed SDKs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DiscordChannel, DiscordMessageLike } from '../src/channels/discord.js';
import { SlackChannel, SlackMessageLike } from '../src/channels/slack.js';
import { SignalChannel, parseSignalLine } from '../src/channels/signal.js';
import { SmsChannel } from '../src/channels/sms.js';
import { MatrixChannel } from '../src/channels/matrix.js';
import { outboxPending } from '../src/mobile/outbox.js';

const stateHome = fs.mkdtempSync(path.join(os.tmpdir(), 't13a-'));
process.env.TCRAB_HOME = stateHome;

const pending = (channel: string) => outboxPending(channel as 'telegram');

// ------------------------------------------------------------------ Discord

test('13.5 discord routes to the agent, honours the allowlist and queues on failure', async (t) => {
  await t.test('an allowed message is answered by the agent', async () => {
    const seen: string[] = [];
    const replies: string[] = [];
    const channel = new DiscordChannel({
      cfg: { enabled: true, token: 't', allowedGuilds: ['g1'], allowedUsers: ['u1'] },
      onMessage: async (userId, chatId, text, name) => {
        seen.push(`${userId}/${chatId}/${name}: ${text}`);
        return 'crabby answer';
      },
      client: {
        on: () => undefined,
        login: async () => undefined,
        sendTo: async () => undefined,
      },
    });
    const msg: DiscordMessageLike = {
      author: { bot: false, id: 'u1', username: 'rakib' },
      guildId: 'g1',
      channelId: 'c1',
      content: 'hello crab',
      reply: async (text: string) => {
        replies.push(text);
      },
    };
    assert.equal(await channel.handleMessage(msg), 'crabby answer');
    assert.deepEqual(seen, ['u1/c1/rakib: hello crab']);
    assert.deepEqual(replies, ['crabby answer']);
  });

  await t.test('bots and other guilds/users are ignored silently', async () => {
    let called = 0;
    const channel = new DiscordChannel({
      cfg: { enabled: true, token: 't', allowedGuilds: ['g1'], allowedUsers: ['u1'] },
      onMessage: async () => {
        called++;
        return 'nope';
      },
    });
    const base = {
      guildId: 'g1',
      channelId: 'c1',
      content: 'hi',
      reply: async () => undefined,
    };
    assert.equal(await channel.handleMessage({ ...base, author: { bot: true, id: 'u1' } }), null);
    assert.equal(await channel.handleMessage({ ...base, author: { id: 'u1' }, guildId: 'other' }), null);
    assert.equal(await channel.handleMessage({ ...base, author: { id: 'intruder' } }), null);
    assert.equal(called, 0);
  });

  await t.test('a send with no client connection lands in the outbox', async () => {
    const channel = new DiscordChannel({
      cfg: { enabled: true, token: 't', allowedGuilds: [], allowedUsers: [] },
      onMessage: async () => 'x',
    });
    await channel.send('c9', 'kept for later');
    const items = pending('discord').filter((i) => i.chatId === 'c9');
    assert.equal(items.length, 1);
    assert.equal(items[0]!.text, 'kept for later');
  });
});

// -------------------------------------------------------------------- Slack

test('13.5 slack routes to the agent and queues on failure', async (t) => {
  await t.test('the handler the app registers answers through say()', async () => {
    const said: string[] = [];
    const channel = new SlackChannel({
      cfg: { enabled: true, botToken: 'b', appToken: 'a', allowedChannels: ['C1'], allowedUsers: ['U1'] },
      onMessage: async (userId, chatId, text) => `${userId}@${chatId}: ${text}`,
    });
    const message: SlackMessageLike = { channel: 'C1', user: 'U1', text: 'status?' };
    const reply = await channel.handleMessage(message, async (text) => {
      said.push(text);
    });
    assert.equal(reply, 'U1@C1: status?');
    assert.deepEqual(said, ['U1@C1: status?']);
  });

  await t.test('subtypes, bots and other channels are ignored', async () => {
    let called = 0;
    const channel = new SlackChannel({
      cfg: { enabled: true, botToken: 'b', appToken: 'a', allowedChannels: ['C1'], allowedUsers: [] },
      onMessage: async () => {
        called++;
        return 'no';
      },
    });
    const say = async () => undefined;
    assert.equal(await channel.handleMessage({ channel: 'C1', user: 'U1', text: 'x', subtype: 'bot_message' }, say), null);
    assert.equal(await channel.handleMessage({ channel: 'C1', user: 'U1', text: 'x', bot_id: 'B1' }, say), null);
    assert.equal(await channel.handleMessage({ channel: 'C2', user: 'U1', text: 'x' }, say), null);
    assert.equal(called, 0);
  });

  await t.test('an unconnected app queues instead of losing the reply', async () => {
    const channel = new SlackChannel({
      cfg: { enabled: true, botToken: 'b', appToken: 'a', allowedChannels: [], allowedUsers: [] },
      onMessage: async () => 'x',
    });
    await channel.send('C9', 'slack later');
    assert.ok(pending('slack').some((i) => i.chatId === 'C9' && i.text === 'slack later'));
  });
});

// ------------------------------------------------------------------- Signal

test('13.5 signal parses signal-cli JSON and answers the sender', async (t) => {
  await t.test('parseSignalLine reads the text and the sender, and ignores noise', () => {
    const line = JSON.stringify({
      envelope: { source: '+8801700000000', sourceName: 'Rakib', dataMessage: { message: 'hello', timestamp: 1 } },
    });
    assert.deepEqual(parseSignalLine(line), { from: '+8801700000000', name: 'Rakib', text: 'hello' });
    assert.equal(parseSignalLine('not json at all'), null);
    assert.equal(parseSignalLine('{"envelope":{}}'), null);
    assert.equal(parseSignalLine('{"unrelated":true}'), null);
    assert.equal(parseSignalLine(JSON.stringify({ envelope: { source: '+1', dataMessage: {} } })), null);
  });

  await t.test('an allowlisted sender gets the agent answer back', async () => {
    const sent: string[] = [];
    const channel = new SignalChannel({
      cfg: { enabled: true, phoneNumber: '+8801000000000', allowedNumbers: ['+8801700000000'] },
      onMessage: async (_userId, _chatId, text, name) => `for ${name}: ${text}`,
      sendText: async (to, text) => {
        sent.push(`${to}:${text}`);
      },
    });
    assert.equal(await channel.handleMessage('+8801700000000', 'Rakib', 'ping'), 'for Rakib: ping');
    assert.deepEqual(sent, ['+8801700000000:for Rakib: ping']);
  });

  await t.test('a stranger is refused and a failed send is queued', async () => {
    let called = 0;
    const refused = new SignalChannel({
      cfg: { enabled: true, phoneNumber: '+8801000000000', allowedNumbers: ['+8801700000000'] },
      onMessage: async () => {
        called++;
        return 'never';
      },
    });
    assert.equal(await refused.handleMessage('+8801999999999', 'stranger', 'let me in'), null);
    assert.equal(called, 0);

    const failing = new SignalChannel({
      cfg: { enabled: true, phoneNumber: '+8801000000000', allowedNumbers: [] },
      onMessage: async () => 'answer',
      sendText: async () => {
        throw new Error('signal-cli not reachable');
      },
    });
    await failing.send('+8801700000000', 'signal later');
    const item = pending('signal').find((i) => i.chatId === '+8801700000000');
    assert.ok(item);
    assert.match(item!.lastError ?? '', /signal-cli not reachable/);
  });
});

// ---------------------------------------------------------------------- SMS

test('13.5 sms turns a Twilio webhook into an agent turn', async (t) => {
  await t.test('the answer goes out through the Twilio REST API', async () => {
    const calls: { url: string; auth: string; body: string }[] = [];
    const channel = new SmsChannel({
      cfg: {
        enabled: true,
        accountSid: 'AC123',
        authToken: 'secret',
        fromNumber: '+15550001111',
        allowedNumbers: ['+8801700000000'],
      },
      onMessage: async (userId, _chatId, text) => `${userId} asked: ${text}`,
      fetchImpl: (async (url: string | URL, init?: RequestInit) => {
        calls.push({
          url: String(url),
          auth: String((init?.headers as Record<string, string>).authorization),
          body: String(init?.body),
        });
        return { ok: true, status: 201 } as Response;
      }) as typeof fetch,
    });

    const twiml = await channel.handleIncoming({ From: '+8801700000000', Body: 'are you up?' });
    assert.equal(twiml, '<Response/>');
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /api\.twilio\.com\/2010-04-01\/Accounts\/AC123\/Messages\.json/);
    assert.equal(calls[0]!.auth, `Basic ${Buffer.from('AC123:secret').toString('base64')}`);
    assert.match(calls[0]!.body, /To=%2B8801700000000/);
    assert.match(calls[0]!.body, /From=%2B15550001111/);
    assert.match(calls[0]!.body, /Body=%2B8801700000000\+asked/);
  });

  await t.test('a stranger is ignored and a rejected send is queued', async () => {
    let called = 0;
    const channel = new SmsChannel({
      cfg: { enabled: true, accountSid: 'AC1', authToken: 's', fromNumber: '+1', allowedNumbers: ['+8801700000000'] },
      onMessage: async () => {
        called++;
        return 'no';
      },
    });
    assert.equal(await channel.handleIncoming({ From: '+1999', Body: 'hi' }), '<Response/>');
    assert.equal(called, 0);

    const failing = new SmsChannel({
      cfg: { enabled: true, accountSid: 'AC1', authToken: 's', fromNumber: '+1', allowedNumbers: [] },
      onMessage: async () => 'answer',
      fetchImpl: (async () => ({ ok: false, status: 500 }) as Response) as typeof fetch,
    });
    await failing.send('+8801700000000', 'sms later');
    const item = pending('sms').find((i) => i.text === 'sms later');
    assert.ok(item);
    assert.match(item!.lastError ?? '', /twilio send failed: 500/);
  });
});

// ------------------------------------------------------------------- Matrix

test('13.5 matrix routes room messages and never answers itself', async (t) => {
  await t.test('an allowed room gets the answer back through the client', async () => {
    const sent: string[] = [];
    const channel = new MatrixChannel({
      cfg: { enabled: true, homeserver: 'https://m.example', accessToken: 'tok', userId: '@crab:m.example', allowedRooms: ['!room1'] },
      onMessage: async (_u, roomId, text) => `${roomId} says ${text}`,
      client: {
        on: () => undefined,
        startClient: async () => undefined,
        sendMessage: async (roomId: string, content: { body: string }) => {
          sent.push(`${roomId}:${content.body}`);
        },
      },
    });
    assert.equal(await channel.handleEvent({ roomId: '!room1', sender: '@rakib:m.example', content: { body: 'ping' } }), '!room1 says ping');
    assert.deepEqual(sent, ['!room1:!room1 says ping']);
  });

  await t.test('own messages and other rooms are ignored; a failed send is queued', async () => {
    let called = 0;
    const channel = new MatrixChannel({
      cfg: { enabled: true, homeserver: 'https://m.example', accessToken: 'tok', userId: '@crab:m.example', allowedRooms: ['!room1'] },
      onMessage: async () => {
        called++;
        return 'x';
      },
    });
    assert.equal(await channel.handleEvent({ roomId: '!room1', sender: '@crab:m.example', content: { body: 'my own words' } }), null);
    assert.equal(await channel.handleEvent({ roomId: '!other', sender: '@rakib:m.example', content: { body: 'hi' } }), null);
    assert.equal(await channel.handleEvent({ roomId: '!room1', sender: '@rakib:m.example', content: {} }), null);
    assert.equal(called, 0);

    await channel.send('!room1', 'matrix later');
    assert.ok(pending('matrix').some((i) => i.chatId === '!room1' && i.text === 'matrix later'));
  });
});
