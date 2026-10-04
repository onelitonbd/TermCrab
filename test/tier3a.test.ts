/**
 * Batch 34.3 — ambient room history, and the surfaces that read it.
 *
 * A group is a room the bot only hears part of: the mention policy drops
 * everything that was not aimed at it, so "what did I miss?" had no answer.
 * This pins the mechanism end to end:
 *
 *   - the store under `state/rooms/` (bounded twice, torn lines skipped)
 *   - the Telegram adapter recording every group message, addressed or not
 *   - the agent tool `room_history` (this room by default, a sentence without one)
 *   - `termcrab rooms [list|show|clear]`
 *   - the `/history` slash command and the census row that moved
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  clearRoom,
  formatRoomHistory,
  listRooms,
  parseRoomKey,
  readRoom,
  recordRoomMessage,
  roomInfo,
  roomsDir,
} from '../src/channels/rooms.js';
import { TelegramChannel, TelegramUpdate } from '../src/channels/telegram.js';
import { buildTools, ToolEnv } from '../src/agent/tools.js';
import { extraTools } from '../src/agent/toolbox.js';
import { defaults } from '../src/core/config.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';

const ROOT = process.cwd();
const homeDir = (): string => process.env.TCRAB_HOME ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

const cli = (args: string[], extraEnv: Record<string, string> = {}): string =>
  execFileSync('node', [path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnv, NO_COLOR: '1' },
  });

/** A Telegram channel whose API is spies — nothing touches the network. */
function spyChannel(opts: {
  cfg?: Partial<{ allowedUserIds: number[]; groupPolicy: 'mention' | 'all' }>;
  onMessage: (text: string) => Promise<string> | string;
}) {
  const calls: string[] = [];
  const answered: string[] = [];
  let polls = 0;
  let updates: TelegramUpdate[] = [];
  const channel = new TelegramChannel({
    cfg: { token: 't', allowedUserIds: opts.cfg?.allowedUserIds ?? [7], ...opts.cfg },
    getOffset: () => 0,
    setOffset: () => undefined,
    onMessage: async (_u, _c, text) => {
      answered.push(text);
      return opts.onMessage(text) as Promise<string>;
    },
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
    },
  });
  return {
    channel,
    calls,
    answered,
    push: (u: TelegramUpdate) => {
      updates = [u];
    },
  };
}

const groupUpdate = (text: string, extra: Partial<NonNullable<TelegramUpdate['message']>> = {}): TelegramUpdate => ({
  update_id: 1,
  message: {
    text,
    chat: { id: -100123, type: 'group' },
    from: { id: 7, username: 'rakib' },
    ...extra,
  },
});

// --------------------------------------------------------------------- 34.3

test('34.3 the room store is bounded, local and hard to corrupt', async (t) => {
  await t.test('record, read and count what arrived since the last addressed message', () => {
    tmpHome('t34ra-');
    const room = 'telegram:-100123';
    const { channel, room: roomId } = parseRoomKey(room)!;
    recordRoomMessage({ channel, room: roomId, from: 'rakib', text: 'are we still on for tomorrow?', addressed: false });
    recordRoomMessage({ channel, room: roomId, from: 'mira', text: 'I think so', addressed: false });
    recordRoomMessage({ channel, room: roomId, from: 'rakib', text: '@crab_bot summarise', addressed: true });
    recordRoomMessage({ channel, room: roomId, from: 'mira', text: 'and bring the file', addressed: false });

    const info = roomInfo(channel, roomId);
    assert.equal(info.messages, 4);
    assert.equal(info.sinceAddressed, 1, 'one message arrived after the bot was last addressed');
    assert.equal(info.key, room);

    const tail = readRoom(channel, roomId, 2);
    assert.deepEqual(
      tail.map((m) => m.text),
      ['@crab_bot summarise', 'and bring the file'],
      'oldest first, tailed to the limit',
    );
    assert.equal(readRoom(channel, roomId, 0).length, 4, 'limit 0 means everything');
  });

  await t.test('the file is trimmed by count, and a torn line is skipped not fatal', () => {
    tmpHome('t34rb-');
    for (let i = 0; i < 12; i++) {
      recordRoomMessage(
        { channel: 'telegram', room: '1', from: 'u', text: `message ${i}`, addressed: false },
        { maxMessages: 5 },
      );
    }
    const kept = readRoom('telegram', '1', 0);
    assert.equal(kept.length, 5, 'the tail is what stays');
    assert.equal(kept[0]!.text, 'message 7');
    assert.equal(kept[4]!.text, 'message 11');

    const file = path.join(roomsDir(), 'telegram-1.jsonl');
    fs.appendFileSync(file, '{"ts": not json at all\n', 'utf8');
    assert.equal(readRoom('telegram', '1', 0).length, 5, 'a torn tail does not lose the rest');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('{"ts": not json at all\n', ''), 'utf8');
  });

  await t.test('listRooms, clearRoom and the key parser behave', () => {
    tmpHome('t34rc-');
    recordRoomMessage({ channel: 'telegram', room: '-1', from: 'a', text: 'first room', addressed: false });
    recordRoomMessage({ channel: 'whatsapp', room: '8801', from: 'b', text: 'second room', addressed: true });
    const rooms = listRooms();
    assert.equal(rooms.length, 2);
    assert.deepEqual(
      rooms.map((r) => r.key).sort(),
      ['telegram:-1', 'whatsapp:8801'],
    );
    assert.equal(clearRoom('telegram', '-1'), 1);
    assert.equal(listRooms().length, 1);

    assert.deepEqual(parseRoomKey('telegram:-100123'), { channel: 'telegram', room: '-100123' });
    assert.deepEqual(parseRoomKey('whatsapp:8801'), { channel: 'whatsapp', room: '8801' });
    assert.equal(parseRoomKey('telegram'), null);
    assert.equal(parseRoomKey(':x'), null);
    assert.equal(parseRoomKey('telegram:'), null);

    const text = formatRoomHistory('whatsapp', '8801', { limit: 5 });
    assert.match(text, /whatsapp:8801/);
    assert.match(text, /1 message\(s\) seen/);
    assert.match(text, /0 since you were last addressed/);
    assert.match(formatRoomHistory('telegram', 'nothing-here'), /ambient history starts with the first message/);
  });
});

test('34.3 a group message the bot is not addressed in is still remembered', async (t) => {
  await t.test('mention policy: quiet, but written down', async () => {
    tmpHome('t34rd-');
    const spy = spyChannel({ onMessage: () => 'a reply' });
    spy.push(groupUpdate('the meeting moved to 5pm'));
    spy.channel.start();
    const file = path.join(homeDir(), 'state', 'rooms', 'telegram--100123.jsonl');
    for (let i = 0; i < 200 && !fs.existsSync(file); i++) await sleep(5);
    await sleep(30); // let the (ignored) message finish being handled
    await spy.channel.stop();
    assert.equal(spy.answered.length, 0, 'nobody was addressed, so no turn ran');
    assert.equal(spy.calls.length, 0, 'and nothing was sent');

    const seen = readRoom('telegram', '-100123', 10);
    assert.equal(seen.length, 1);
    assert.equal(seen[0]!.text, 'the meeting moved to 5pm');
    assert.equal(seen[0]!.addressed, false);
    assert.equal(seen[0]!.from, 'rakib');
  });

  await t.test('a mention is answered, and marked as addressed (with the mention stripped)', async () => {
    tmpHome('t34re-');
    const spy = spyChannel({ onMessage: (text) => `you said: ${text}` });
    spy.push(groupUpdate('@crab_bot what did I miss?'));
    spy.channel.start();
    for (let i = 0; i < 200 && !spy.answered.length; i++) await sleep(5);
    await spy.channel.stop();
    assert.equal(spy.answered.length, 1);
    assert.equal(spy.answered[0], 'what did I miss?', 'the mention never reaches the agent');
    const seen = readRoom('telegram', '-100123', 10);
    assert.equal(seen[0]!.addressed, true, 'this one ran a turn');
  });

  await t.test('groupPolicy "all" records every message as addressed', async () => {
    tmpHome('t34rf-');
    const spy = spyChannel({ cfg: { groupPolicy: 'all' }, onMessage: () => 'ok' });
    spy.push(groupUpdate('no mention here at all'));
    spy.channel.start();
    for (let i = 0; i < 200 && !spy.answered.length; i++) await sleep(5);
    await spy.channel.stop();
    assert.equal(spy.answered.length, 1, 'everything is answered under policy all');
    assert.equal(readRoom('telegram', '-100123', 10)[0]!.addressed, true);
  });
});

test('34.3 the agent can read the room it is standing in', async (t) => {
  await t.test('room_history defaults to this room, and says what it cannot know', async () => {
    tmpHome('t34rg-');
    recordRoomMessage({ channel: 'telegram', room: '-100123', from: 'rakib', text: 'the meeting moved', addressed: false });
    recordRoomMessage({ channel: 'telegram', room: '-100123', from: 'crab_bot', text: 'noted', addressed: true });
    const env: ToolEnv = {
      config: defaults(),
      memory: new MemoryStore(),
      skills: new SkillStore(),
      extraRoots: [],
      channel: 'telegram',
      chatId: '-100123',
    };
    const tools = [...(await buildTools(env)), ...extraTools(env)];
    const tool = tools.find((x) => x.def.name === 'room_history');
    assert.ok(tool, 'room_history is registered');

    const out = await tool!.execute({});
    assert.match(out, /telegram:-100123/);
    assert.match(out, /the meeting moved/);
    assert.match(out, /\[you answered\]/, 'the turn it did take is marked');

    // A turn from a surface with no room must not pretend it has one.
    const bare: ToolEnv = { config: defaults(), memory: new MemoryStore(), skills: new SkillStore(), extraRoots: [] };
    const bareTool = [...(await buildTools(bare)), ...extraTools(bare)].find((x) => x.def.name === 'room_history')!;
    const noRoom = await bareTool.execute({});
    assert.match(noRoom, /no room context/);
    assert.match(noRoom, /telegram:-100123/, 'it names the rooms that do have history');

    const byKey = await bareTool.execute({ room: 'telegram:-100123', limit: 1 });
    assert.match(byKey, /the meeting moved|noted/);
    const badName = await bareTool.execute({ room: 'nonsense' });
    assert.match(badName, /could not read/);
  });

  await t.test('the CLI reads, shows and clears the same store', () => {
    tmpHome('t34rh-');
    recordRoomMessage({ channel: 'telegram', room: '-100123', from: 'rakib', text: 'hello from the group', addressed: false });
    const listed = JSON.parse(cli(['rooms', '--json'])) as {
      ok: boolean;
      data: { count: number; rooms: { key: string; messages: number; sinceAddressed: number }[] };
    };
    assert.equal(listed.ok, true);
    assert.equal(listed.data.count, 1);
    assert.equal(listed.data.rooms[0]!.key, 'telegram:-100123');
    assert.equal(listed.data.rooms[0]!.messages, 1);

    const shown = JSON.parse(cli(['rooms', 'show', 'telegram:-100123', '--json'])) as {
      data: { count: number; messages: { text: string; addressed: boolean }[] };
    };
    assert.equal(shown.data.count, 1);
    assert.equal(shown.data.messages[0]!.text, 'hello from the group');

    const cleared = JSON.parse(cli(['rooms', 'clear', 'telegram:-100123', '--json'])) as {
      data: { cleared: number; dropped: number; room?: string };
    };
    assert.deepEqual(cleared.data, { cleared: 1, dropped: 1, room: 'telegram:-100123' });
    assert.equal((JSON.parse(cli(['rooms', '--json'])) as { data: { count: number } }).data.count, 0);
  });
});

test('34.3 the surfaces and the census agree', async (t) => {
  await t.test('the gateway has the /history command and hands the room to the turn', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'gateway', 'server.ts'), 'utf8');
    assert.ok(src.includes("text === '/history'"), '/history is handled');
    assert.match(src, /formatRoomHistory\(channel, String\(chatId\)/);
    assert.match(src, /room: String\(chatId\)/, 'the turn is told which room it came from');
    const loop = fs.readFileSync(path.join(ROOT, 'src', 'agent', 'loop.ts'), 'utf8');
    assert.match(loop, /chatId: opts\.room/);
  });

  await t.test('/history is documented for a person in the chat', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'gateway', 'server.ts'), 'utf8');
    assert.match(src, /\/history\s+what was said here/);
    const help = fs.readFileSync(path.join(ROOT, 'src', 'command-help.ts'), 'utf8');
    assert.match(help, /cmd: 'rooms'/);
    const docs = fs.readFileSync(path.join(ROOT, 'docs', 'CHANNELS.md'), 'utf8');
    assert.match(docs, /ambient|room history/i, 'docs/CHANNELS.md explains the room log');
    assert.match(docs, /\/history/);
  });

  await t.test('the census row moved for a measured reason', () => {
    const census = JSON.parse(
      execFileSync('node', ['-e', "process.stdout.write(JSON.stringify(require('./docs/openclaw/data/census.json')))"], {
        encoding: 'utf8',
      }),
    ) as { rows: { capability: string; verdict: string; evidence: string }[] };
    const row = census.rows.find((r) => r.capability === 'Group / ambient events');
    assert.ok(row, 'the row exists');
    assert.equal(row!.verdict, 'WORKING');
    assert.match(row!.evidence, /34\.3/);
    assert.match(row!.evidence, /cannot fetch|never received|mention policy/i, 'the structural limit is stated');
  });
});
