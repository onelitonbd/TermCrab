#!/usr/bin/env node
/**
 * 36.2 — the live Telegram smoke.
 *
 * Every Telegram test in this repository talks to a **fake** Bot API: a local
 * HTTP server that answers the shapes we expect. That is the right way to test
 * a protocol, and it is not proof that the real bot answers on a real phone.
 * This script is the missing half, and it is deliberately the smallest thing
 * that can pass: one `getMe`, one `sendMessage`, and a bounded wait for a
 * message coming back.
 *
 *   TCRAB_TELEGRAM_TOKEN=123:ABC TCRAB_TELEGRAM_CHAT=456 npm run smoke:telegram
 *
 * Rules it keeps:
 *   - the token is never printed, never written to a file, never put in a URL
 *     that ends up in the output
 *   - with no token it says `skipped` and exits **0** — a phone with no bot is
 *     not a failure, exactly like the voice tests where there is no engine
 *   - the replies it reads come from the *real* owner pressing send, so it waits
 *     with a timeout and says plainly when nothing arrived
 *   - it drives `src/channels/api.ts`, the same client the channel uses, so what
 *     is proven here is our code and not a second curl-shaped implementation
 */
import { TelegramApi } from '../dist/src/channels/api.js';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const token = flag('--token') || process.env.TCRAB_TELEGRAM_TOKEN || '';
const chat = Number(flag('--chat') || process.env.TCRAB_TELEGRAM_CHAT || 0) || 0;
const waitSec = Number(flag('--wait') ?? 30) || 30;
const apiBase = process.env.TCRAB_TELEGRAM_API || 'https://api.telegram.org';

/** Never print a token, even by accident (a stray error string can carry one). */
const redact = (s) => String(s).replaceAll(token || '\u0000', '«token»');

if (!token) {
  console.log('telegram smoke: skipped — no TCRAB_TELEGRAM_TOKEN');
  console.log('   get a token from @BotFather, then:');
  console.log('   TCRAB_TELEGRAM_TOKEN=123:ABC TCRAB_TELEGRAM_CHAT=<your chat id> npm run smoke:telegram');
  process.exit(0);
}

const api = new TelegramApi(token, apiBase);
const out = [];
const say = (line) => {
  out.push(line);
  console.log(line);
};

try {
  const me = await api.getMe();
  say(`telegram smoke: bot is @${me.username ?? me.id} (${me.first_name ?? 'no name'})`);
  say(`   api: ${new URL(apiBase).host} · token: ${token.length} characters, not printed here`);

  if (!chat) {
    // No chat id yet: show what the bot has seen, because a fresh bot's first
    // message is exactly how the owner discovers the number.
    const updates = await api.getUpdates(0, 0);
    const chats = [...new Set(updates.map((u) => u.message?.chat?.id).filter(Boolean))];
    if (chats.length) {
      say(`   found ${chats.length} chat id(s) in the update queue — set TCRAB_TELEGRAM_CHAT to one of:`);
      for (const id of chats) say(`     ${id}`);
      say('   then send the bot a message and run this again with --wait');
      process.exit(0);
    }
    say('   no chat id yet: open Telegram, send your bot any message, then run this again');
    process.exit(0);
  }

  const before = await api.getUpdates(-1, 0);
  const lastId = before.length ? Math.max(...before.map((u) => u.update_id)) : 0;

  const sent = await api.sendMessage(chat, '🦀 TermCrab smoke test — reply to me and this script will read it back.');
  const messageId = sent?.message_id;
  say(`   sent message ${messageId ?? '?'} to chat ${chat}`);

  say(`   waiting up to ${waitSec}s for a message from you (send the bot anything)…`);
  const deadline = Date.now() + waitSec * 1000;
  let seen = null;
  while (Date.now() < deadline && !seen) {
    const remaining = Math.max(5, Math.ceil((deadline - Date.now()) / 1000));
    const updates = await api.getUpdates(lastId + 1, Math.min(30, remaining));
    const incoming = updates.find((u) => u.message && u.message.chat?.id === chat && u.message.message_id !== messageId);
    if (incoming) {
      seen = incoming;
      break;
    }
  }

  if (seen) {
    const text = seen.message?.text ?? '(no text)';
    say(`   read back: “${String(text).slice(0, 120)}” from ${seen.message?.from?.username ?? seen.message?.from?.id}`);
    say('telegram smoke: ok — the bot answered, and this process read the reply through src/channels/api.ts');
  } else {
    say(`telegram smoke: sent ok, no reply read within ${waitSec}s`);
    say('   the send half works; to check the read half, reply in Telegram and run again (or raise --wait)');
  }
} catch (err) {
  console.error(`telegram smoke: failed — ${redact(err instanceof Error ? err.message : err)}`);
  process.exit(1);
}
