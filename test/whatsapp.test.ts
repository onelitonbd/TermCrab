import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  defaultBaileysLoader,
  extractText,
  isAllowedJid,
  normalizeAllowed,
  WhatsAppChannel,
  BaileysModule,
} from '../src/channels/whatsapp.js';
import { parseAgentPrefix } from '../src/channels/telegram.js';

test('normalizeAllowed turns bare numbers into JIDs', () => {
  const out = normalizeAllowed(['8801712345678', ' 1234567890@s.whatsapp.net ', '', '  ']);
  assert.deepEqual(out, ['8801712345678@s.whatsapp.net', '1234567890@s.whatsapp.net']);
});

test('isAllowedJid: empty allowlist rejects everyone', () => {
  assert.equal(isAllowedJid('123@s.whatsapp.net', []), false);
  assert.equal(isAllowedJid('123@s.whatsapp.net', ['  ']), false);
});

test('isAllowedJid matches by phone number for DMs', () => {
  const allowed = ['8801712345678'];
  assert.equal(isAllowedJid('8801712345678@s.whatsapp.net', allowed), true);
  assert.equal(isAllowedJid('99999@s.whatsapp.net', allowed), false);
  // group jid with same number part must NOT match bare-number entry
  assert.equal(isAllowedJid('8801712345678@g.us', allowed), false);
});

test('extractText handles common WhatsApp message shapes', () => {
  assert.equal(extractText({ conversation: 'hello' }), 'hello');
  assert.equal(extractText({ extendedTextMessage: { text: 'extended' } }), 'extended');
  assert.equal(extractText({ imageMessage: { caption: 'cap' } }), 'cap');
  assert.equal(extractText({ viewOnceMessage: { message: { conversation: 'v1' } } }), 'v1');
  assert.equal(extractText(undefined), '');
  assert.equal(extractText({}), '');
});

test('default loader gives actionable install hint when baileys missing', async () => {
  await assert.rejects(() => defaultBaileysLoader(), /npm install baileys/);
});

function fakeBaileys(opts: { messages: unknown[] }): { mod: BaileysModule; handlers: Map<string, (d: unknown) => void>; sent: { jid: string; text: string }[] } {
  const handlers = new Map<string, (d: unknown) => void>();
  const sent: { jid: string; text: string }[] = [];
  const mod: BaileysModule = {
    default: () => ({
      ev: {
        on(event: string, cb: (d: unknown) => void) {
          handlers.set(event, cb);
        },
      },
      async sendMessage(jid: string, content: { text: string }) {
        sent.push({ jid, text: content.text });
        return { ok: true };
      },
    }),
    useMultiFileAuthState: async () => ({ state: {}, saveCreds: () => undefined }),
    DisconnectReason: { loggedOut: 401 },
  };
  void opts;
  return { mod, handlers, sent };
}

test('channel: allowlisted inbound message produces an agent reply', async () => {
  const { mod, handlers, sent } = fakeBaileys({ messages: [] });
  let received: string | null = null;
  const ch = new WhatsAppChannel({
    cfg: { enabled: true, allowedJids: ['111222333'] },
    loadModule: async () => mod,
    onMessage: async (_u, _c, text) => {
      received = text;
      return 'agent reply 🦀';
    },
  });
  await ch.start();
  assert.ok(handlers.has('messages.upsert'), 'subscribed to messages.upsert');

  handlers.get('messages.upsert')!({
    type: 'notify',
    messages: [{ key: { remoteJid: '111222333@s.whatsapp.net', fromMe: false }, pushName: 'Owner', message: { conversation: 'hi crab' } }],
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(received, 'hi crab');
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(sent.length, 1);
  assert.match(sent[0]!.text, /agent reply/);
  await ch.stop();
});

test('channel: non-allowlisted sender is rejected with lock notice', async () => {
  const { mod, handlers, sent } = fakeBaileys({ messages: [] });
  let called = 0;
  const ch = new WhatsAppChannel({
    cfg: { enabled: true, allowedJids: ['111222333'] },
    loadModule: async () => mod,
    onMessage: async () => {
      called++;
      return 'should not happen';
    },
  });
  await ch.start();
  handlers.get('messages.upsert')!({
    type: 'notify',
    messages: [{ key: { remoteJid: '444555666@s.whatsapp.net', fromMe: false }, message: { conversation: 'spam' } }],
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(called, 0);
  assert.equal(sent.length, 1);
  assert.match(sent[0]!.text, /Not authorized/);
  await ch.stop();
});

test('channel: empty allowlist refuses to start (secure default)', async () => {
  const { mod, handlers } = fakeBaileys({ messages: [] });
  const ch = new WhatsAppChannel({
    cfg: { enabled: true, allowedJids: [] },
    loadModule: async () => mod,
    onMessage: async () => 'x',
  });
  await ch.start();
  assert.equal(handlers.size, 0, 'no subscriptions when allowlist empty');
  await ch.stop();
});

test('parseAgentPrefix routes @name to known agents only', () => {
  const known = ['brief', 'research'];
  assert.deepEqual(parseAgentPrefix('@brief summarize today', known), {
    agent: 'brief',
    text: 'summarize today',
  });
  const unknown = parseAgentPrefix('@nope hello', known);
  assert.equal(unknown.agent, null);
  assert.equal(unknown.text, '@nope hello');
  const none = parseAgentPrefix('just a message', known);
  assert.equal(none.agent, null);
});
