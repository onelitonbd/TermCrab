/**
 * Batch 17 — the agent's own inbox, and no repeated reading.
 *
 *   17.1 the agent can look: `inbox_list` / `inbox_read` tools and `/inbox` in
 *        the chat, all reading the same index the intake writes.
 *   17.2 the text learned at arrival is saved once (a sidecar) and reused, so a
 *        second read does not touch the file — proven by removing the file and
 *        still getting the text back.
 *   17.3 the "who can carry files" story is machine-checked: the docs/CHANNELS.md
 *        table and the registered document senders cannot disagree.
 *   17.4 a trimmed arrival still explains itself instead of failing on a path.
 *   17.5 docs + census evidence.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  formatInbox,
  inboxDir,
  inboxIndexPath,
  isInboxName,
  listInbox,
  readArrival,
  recordArrival,
} from '../src/channels/inbox.js';
import { saveIncoming } from '../src/channels/media.js';
import { makeIntake } from '../src/channels/intake.js';
import { buildTools, ToolEnv } from '../src/agent/tools.js';
import { extraTools } from '../src/agent/toolbox.js';
import { defaults } from '../src/core/config.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SkillStore } from '../src/skills/loader.js';
import { channelsWithDocuments, registerDocumentSender } from '../src/channels/conversations.js';
import { enforceDiskBudget } from '../src/core/disk.js';

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

/** The same tool list the loop hands the model. */
async function agentTools(): Promise<{ def: { name: string }; execute: (args: Record<string, unknown>) => Promise<string> }[]> {
  const env: ToolEnv = { config: defaults(), memory: new MemoryStore(), skills: new SkillStore(), extraRoots: [] };
  return [...(await buildTools(env)), ...extraTools(env)];
}

async function call(tools: Awaited<ReturnType<typeof agentTools>>, name: string, args: Record<string, unknown>): Promise<string> {
  const tool = tools.find((t) => t.def.name === name);
  assert.ok(tool, `${name} exists`);
  return tool.execute(args);
}

// --------------------------------------------------------------------- 17.1

test('17.1 the agent can list and read its inbox', async (t) => {
  await t.test('a name with a folder in it is refused (a chat can send anything)', () => {
    assert.equal(isInboxName('2026-10-03-rent.pdf'), true);
    assert.equal(isInboxName('../../config.json'), false);
    assert.equal(isInboxName('sub/dir/file.pdf'), false);
    assert.equal(isInboxName('C:\\evil.pdf'), false);
    assert.equal(isInboxName(''), false);
    const r = readArrival('../../config.json');
    assert.equal(r.ok, false);
    assert.match(r.ok ? '' : r.reason, /not an inbox file name/);
  });

  await t.test('inbox_list shows name, kind, size, age — newest first', async () => {
    tmpHome('t17a-');
    recordArrival({ name: 'old.pdf', bytes: 34 * 1024, kind: 'document', text: 'old text' });
    recordArrival({ name: 'new.jpg', bytes: 2048, kind: 'photo' });
    fs.writeFileSync(path.join(inboxDir(), 'old.pdf'), 'x');
    fs.writeFileSync(path.join(inboxDir(), 'new.jpg'), 'y');

    const tools = await agentTools();
    const listed = await call(tools, 'inbox_list', {});
    const lines = listed.split('\n');
    assert.equal(lines.length, 2);
    assert.match(lines[0]!, /new\.jpg — photo, 2 KB, just now/, 'newest first');
    assert.match(lines[1]!, /old\.pdf — document, 34 KB, .*text saved/);

    const limited = await call(tools, 'inbox_list', { limit: 1 });
    assert.equal(limited.split('\n').length, 1, 'the limit is honoured');
  });

  await t.test('inbox_read returns the text of one arrival', async () => {
    tmpHome('t17b-');
    fs.mkdirSync(inboxDir(), { recursive: true });
    fs.writeFileSync(path.join(inboxDir(), 'note.txt'), 'the rent is 5000 taka\n');
    recordArrival({ name: 'note.txt', bytes: 22, kind: 'document' });

    const tools = await agentTools();
    const text = await call(tools, 'inbox_read', { name: 'note.txt' });
    assert.match(text, /the rent is 5000 taka/);
    assert.match(text, /read from the file just now/, 'a file with no sidecar is read on demand');

    await assert.rejects(() => call(tools, 'inbox_read', { name: 'nope.txt' }), /gone|no reader/);
  });

  await t.test('an empty inbox says so instead of printing nothing', () => {
    tmpHome('t17c-');
    assert.match(formatInbox(listInbox()), /the inbox is empty/);
  });
});

// --------------------------------------------------------------------- 17.2

test('17.2 what arrived is remembered once, and the second read does not need the file', async (t) => {
  await t.test('the intake writes an index row and a sidecar', async () => {
    tmpHome('t17d-');
    const saved = saveIncoming({ name: 'rent.txt', bytes: Buffer.from('Rent due 5000 taka\n'), kind: 'document' });
    const intake = makeIntake({ ...defaults(), provider: { type: 'mock', model: 'mock-1' } } as never);
    const prompt = await intake(saved, { name: 'rent.txt', kind: 'document' });

    assert.match(prompt, /--- text of rent\.txt \(text\) ---/, 'the arrival is read at arrival time');
    const entry = listInbox()[0]!;
    assert.equal(entry.name, path.basename(saved.path));
    assert.equal(entry.kind, 'document');
    assert.match(entry.text ?? '', /\.text\.md$/, 'the sidecar path is recorded');

    const sidecar = fs.readFileSync(path.join(path.dirname(saved.path), path.basename(entry.text!)), 'utf8');
    assert.match(sidecar, /Rent due 5000 taka/, 'the text really is on disk, next to the file');
  });

  await t.test('with the file deleted, the saved text is still the answer', async () => {
    tmpHome('t17e-');
    const saved = saveIncoming({ name: 'gone-soon.txt', bytes: Buffer.from('Remember: pay the plumber\n'), kind: 'document' });
    const intake = makeIntake({ ...defaults(), provider: { type: 'mock', model: 'mock-1' } } as never);
    await intake(saved, { name: 'gone-soon.txt', kind: 'document' });

    // The whole point: no second parse of a file that may not be there.
    fs.rmSync(saved.path);
    const read = readArrival(path.basename(saved.path));
    assert.equal(read.ok, true, 'the sidecar answers even with the file deleted');
    assert.equal(read.ok ? read.gone : false, true, 'and it says the original is gone');
    assert.match(read.ok ? read.text : '', /pay the plumber/);

    const tools = await agentTools();
    const sidecar = await call(tools, 'inbox_read', { name: path.basename(saved.path) });
    assert.match(sidecar, /pay the plumber/, 'the text still comes back');
    assert.match(sidecar, /trimmed by the disk budget/, 'with the truth about the original');
    assert.doesNotMatch(sidecar, /read from the file just now/, 'the sidecar answered, not the file');
  });

  await t.test('the index is capped and one name has one row', () => {
    tmpHome('t17f-');
    for (let i = 0; i < 5; i++) recordArrival({ name: 'same.pdf', bytes: i + 1, kind: 'document' });
    const rows = listInbox();
    assert.equal(rows.length, 1, 'a re-arrival replaces its own row, it does not stack');
    assert.equal(rows[0]!.bytes, 5, 'the newest facts win');
  });
});

// --------------------------------------------------------------------- 17.3

test('17.3 who can carry files is machine-checked, and the docs cannot drift', async (t) => {
  await t.test('the docs table matches the registered document senders', () => {
    const doc = fs.readFileSync('docs/CHANNELS.md', 'utf8');
    // Channels are registered at gateway start-up, so the source of truth for
    // "who can send a file" is the call that registers it.
    const gateway = fs.readFileSync('src/gateway/server.ts', 'utf8');
    const senders = new Set([...gateway.matchAll(/registerDocumentSender\(\s*'([a-z]+)'/g)].map((m) => m[1]!));
    // Only the channel table counts. The doc also carries other tables (the
    // supported surfaces, for one), and a row saying "| **Telegram** | … |"
    // there is not a claim about file sending (batch 25 made that explicit).
    const channelTable = doc
      .split(/\n\n+/)
      .find((block) => block.includes('| Channel |') && block.includes('Files out'));
    assert.ok(channelTable, 'docs/CHANNELS.md still has the channel table with a Files out column');
    // Rows look like: | **Telegram** | ✅ full | … | ✅ `send_file` … |
    const rowRe = /^\|\s*\**([A-Za-z ()+]+?)\**\s*\|(.*)\|\s*$/gm;
    const idOf = (label: string): string => {
      const l = label.toLowerCase();
      if (l.startsWith('telegram')) return 'telegram';
      if (l.startsWith('whatsapp')) return 'whatsapp';
      if (l.startsWith('discord')) return 'discord';
      if (l.startsWith('slack')) return 'slack';
      if (l.startsWith('signal')) return 'signal';
      if (l.startsWith('sms')) return 'sms';
      if (l.startsWith('matrix')) return 'matrix';
      return '';
    };
    let checked = 0;
    for (const m of channelTable.matchAll(rowRe)) {
      const id = idOf(m[1]!);
      if (!id) continue;
      checked++;
      const canSend = /✅\s*`send_file`/.test(m[2]!);
      assert.equal(
        canSend,
        senders.has(id),
        `${id}: the table says ${canSend ? 'yes' : 'no'} and the code says ${senders.has(id) ? 'yes' : 'no'}`,
      );
    }
    assert.equal(checked, 7, 'all seven channels are in the table');
    assert.deepEqual([...senders], ['telegram'], 'exactly one adapter carries files today');

    // …and the runtime registry answers truthfully: a channel that never
    // registered a sender is not listed, one that did is. (Registration happens
    // at gateway start-up, so this test registers a probe — never a fake channel
    // the docs mention.)
    assert.equal(channelsWithDocuments().includes('probe-channel'), false);
    registerDocumentSender('probe-channel', async () => {
      /* a probe sender: this test only asks whether the registry lists it */
    });
    assert.ok(channelsWithDocuments().includes('probe-channel'), 'the registry lists what registered');
    assert.equal(new Set(channelsWithDocuments()).size, channelsWithDocuments().length, 'no duplicates');
  });

  await t.test('the inbox rules are the receiving side of the same file', () => {
    const media = fs.readFileSync('src/channels/media.ts', 'utf8');
    assert.match(media, /BLOCKED_EXTENSIONS/, 'the send rules and the receive rules live together');
    const inbox = fs.readFileSync('src/channels/inbox.ts', 'utf8');
    assert.match(inbox, /isExtractable|readArrival/, 'the inbox reuses the same readers');
  });
});

// --------------------------------------------------------------------- 17.4

test('17.4 a trimmed arrival explains itself', async (t) => {
  await t.test('the index survives the sweep that takes the file', async () => {
    const home = tmpHome('t17g-');
    fs.mkdirSync(inboxDir(), { recursive: true });
    const file = path.join(inboxDir(), 'old-photo.jpg');
    fs.writeFileSync(file, Buffer.alloc(1000, 1));
    recordArrival({ name: 'old-photo.jpg', bytes: 1000, kind: 'photo', text: 'a receipt for 5000 taka' });
    const past = Date.now() - 40 * 86_400_000;
    fs.utimesSync(file, past / 1000, past / 1000);
    for (const f of ['old-photo.jpg.text.md']) fs.utimesSync(path.join(inboxDir(), f), past / 1000, past / 1000);

    const trimmed = enforceDiskBudget(50 * 1024 * 1024, { keepDays: 30, root: home });
    assert.ok(trimmed.removed >= 2, 'the arrival and its sidecar are swept by retention');
    assert.equal(fs.existsSync(file), false);
    assert.equal(fs.existsSync(inboxIndexPath()), true, 'the index is protected from the budget');

    const listed = formatInbox(listInbox());
    assert.match(listed, /GONE — trimmed by the disk budget/);

    const tools = await agentTools();
    await assert.rejects(
      () => call(tools, 'inbox_read', { name: 'old-photo.jpg' }),
      /that file is gone/,
      'a trimmed arrival is a sentence, not a missing-path error',
    );
  });

  await t.test('a sidecar that outlives its file still answers', () => {
    tmpHome('t17h-');
    fs.mkdirSync(inboxDir(), { recursive: true });
    fs.writeFileSync(path.join(inboxDir(), 'kept.txt'), 'x');
    recordArrival({ name: 'kept.txt', bytes: 1, kind: 'document', text: 'the number you wanted: 42' });
    fs.rmSync(path.join(inboxDir(), 'kept.txt'));

    const read = readArrival('kept.txt');
    assert.equal(read.ok, true, 'the saved text answers');
    assert.equal(read.ok ? read.gone : false, true, 'and it says the file itself is gone');
    assert.match(read.ok ? read.text : '', /the number you wanted: 42/);
  });
});

// --------------------------------------------------------------------- 17.5

test('17.5 docs and census carry the batch-17 evidence', async (t) => {
  await t.test('docs/CHANNELS.md documents the browsable inbox', () => {
    const doc = fs.readFileSync('docs/CHANNELS.md', 'utf8');
    assert.match(doc, /inbox_list/);
    assert.match(doc, /inbox_read/);
    assert.match(doc, /\/inbox/);
    assert.match(doc, /17\./);
  });

  await t.test('the census rows for files and disk cite the inbox work', () => {
    const census = JSON.parse(fs.readFileSync('docs/openclaw/data/census.json', 'utf8')) as {
      rows: { capability: string; verdict: string; evidence: string }[];
    };
    const files = census.rows.find((r) => r.capability === 'File operations')!;
    assert.equal(files.verdict, 'WORKING');
    assert.match(files.evidence, /17\.1|17\.4/);
    const disk = census.rows.find((r) => r.capability === 'Disk budget + pruning')!;
    assert.match(disk.evidence, /17\.4|inbox/);
  });
});
