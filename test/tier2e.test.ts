/**
 * Batch 16 — what arrives should be readable.
 *
 *   16.1 documents: a PDF / DOCX / PPTX / XLSX / text file that arrives is read
 *        by our own zero-dependency readers and its text is handed to the agent,
 *        capped with a truncation note; a scanned PDF is refused with a sentence.
 *   16.2 pictures: a photo is described by a model that can see pictures, over a
 *        real image part on the wire; a model that cannot see produces an honest
 *        "I saved it but cannot see it" with the knob to turn.
 *   16.3 voice: an arriving voice note is transcribed when whisper.cpp is there,
 *        capped by size, and the transcript is what the agent answers.
 *   16.4 inbox hygiene: workspace/inbox is its own area in `termcrab disk` and is
 *        trimmed by the ordinary retention rule, while workspace/ is untouchable.
 *   16.5 the rules are written down and the census moved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { TelegramChannel, TelegramUpdate } from '../src/channels/telegram.js';
import { extractText, extractPdfText, readZip } from '../src/channels/extract.js';
import { canSeeImages, describeImage, MAX_VISION_MB } from '../src/channels/vision.js';
import { intakePrompt, makeIntake } from '../src/channels/intake.js';
import { saveIncoming, type SavedFile } from '../src/channels/media.js';
import type { ArrivalInfo } from '../src/channels/intake.js';
import { diskUsage, enforceDiskBudget } from '../src/core/disk.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { createOpenAi } from '../src/providers/openai.js';
import { findWhisperBin, transcribeFile } from '../src/mobile/whisper.js';

const execFileAsync = promisify(execFile);
const BIN = path.join(process.cwd(), 'dist/src/bin/termcrab.js');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function write(dir: string, name: string, data: Buffer | string): string {
  const p = path.join(dir, name);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
  return p;
}

/** A real (if small) PDF: one page, one FlateDecode content stream. */
function makePdf(lines: string[], opts: { compressed?: boolean; noText?: boolean } = {}): Buffer {
  const ops = opts.noText
    ? 'q 100 0 0 100 0 0 cm /Im0 Do Q'
    : `BT /F1 12 Tf 72 720 Td ${lines.map((l) => `(${l}) Tj 0 -14 Td`).join(' ')} ET`;
  const raw = Buffer.from(ops, 'latin1');
  const body = opts.compressed === false ? raw : zlib.deflateSync(raw);
  const head = Buffer.from(
    `%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n4 0 obj << /Length ${body.length}${opts.compressed === false ? '' : ' /Filter /FlateDecode'} >> stream\n`,
    'latin1',
  );
  const tail = Buffer.from('\nendstream endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
  return Buffer.concat([head, body, tail]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/**
 * A real ZIP (local headers, central directory, EOCD), deflated — the same
 * shape Word/PowerPoint/Excel produce. Written by hand because the whole point
 * of 16.1 is that this needs no dependency.
 */
function makeZip(entries: { name: string; body: string }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = Buffer.from(e.body, 'utf8');
    const data = zlib.deflateRawSync(raw);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const localBuf = Buffer.concat(locals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

const docxOf = (body: string): Buffer =>
  makeZip([
    { name: '[Content_Types].xml', body: '<Types/>' },
    { name: 'word/document.xml', body: `<w:document><w:body>${body}</w:body></w:document>` },
  ]);
const para = (text: string): string => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

/** A channel whose Telegram API is a spy — nothing touches the network. */
function spyChannel(opts: {
  onMessage: (text: string) => Promise<string> | string;
  intake?: (saved: SavedFile, info: ArrivalInfo) => Promise<string>;
  files?: Record<string, Buffer>;
}) {
  let polls = 0;
  let updates: TelegramUpdate[] = [];
  const files = opts.files ?? {};
  const channel = new TelegramChannel({
    cfg: { token: 't', allowedUserIds: [7] },
    getOffset: () => 0,
    setOffset: () => undefined,
    onMessage: async (_u, _c, text) => opts.onMessage(text) as Promise<string>,
    intake: opts.intake,
    api: {
      sendMessage: async () => ({}),
      getUpdates: async () => {
        polls++;
        if (polls === 1) return updates;
        await new Promise((r) => setTimeout(r, 10));
        return [];
      },
      getMe: async () => ({ id: 42, username: 'crab_bot' }),
      getFile: async (fileId: string) => ({ file_id: fileId, file_path: `files/${fileId}` }),
      downloadFile: async (p: string) => {
        const buf = files[p.replace('files/', '')];
        if (!buf) throw new Error('no such file');
        return buf;
      },
    },
  });
  return {
    channel,
    push: (u: TelegramUpdate) => {
      updates = [u];
    },
  };
}

/** Run the poller until the update is delivered (or give up), then stop it. */
async function arrive(
  spy: { channel: TelegramChannel; push: (u: TelegramUpdate) => void },
  update: TelegramUpdate,
  seen: () => string,
): Promise<void> {
  const before = seen();
  spy.push(update);
  spy.channel.start();
  for (let i = 0; i < 400 && seen() === before; i++) await sleep(5);
  await spy.channel.stop();
}

const photoUpdate = (caption?: string, size = 1024): TelegramUpdate => ({
  update_id: 1,
  message: {
    chat: { id: 42, type: 'private' },
    from: { id: 7, username: 'rakib' },
    caption,
    photo: [{ file_id: 'pic', file_size: size }],
  },
});

const docUpdate = (name: string, mime = 'application/pdf'): TelegramUpdate => ({
  update_id: 1,
  message: {
    chat: { id: 42, type: 'private' },
    from: { id: 7, username: 'rakib' },
    document: { file_id: 'doc', file_name: name, mime_type: mime, file_size: 1024 },
  },
});

const voiceUpdate = (): TelegramUpdate => ({
  update_id: 1,
  message: {
    chat: { id: 42, type: 'private' },
    from: { id: 7, username: 'rakib' },
    voice: { file_id: 'voice', file_size: 2048, mime_type: 'audio/ogg' },
  },
});

// --------------------------------------------------------------------- 16.1

test('16.1 a document that arrives is read, not just saved', async (t) => {
  const home = tmpHome('t16a-');

  await t.test('plain text is read and capped with a note', () => {
    const f = write(home, 'notes.md', '# Heading\nline one\nline two\n');
    const r = extractText(f, { maxChars: 1000 });
    assert.equal(r.ok, true);
    assert.equal(r.kind, 'text');
    assert.match(r.text!, /# Heading\nline one\nline two/);

    const big = write(home, 'big.txt', 'x'.repeat(30_000));
    const capped = extractText(big, { maxChars: 1000 });
    assert.equal(capped.text!.length < 1200, true, 'the text is capped');
    assert.match(capped.text!, /\[truncated: showing the first 1000 of 30000 characters\]/);
  });

  await t.test('a PDF is decompressed and its text operators become lines', () => {
    const compressed = extractPdfText(makePdf(['Rent due 5000 taka', 'Paid on Monday']));
    assert.equal(compressed.ok, true);
    assert.match(compressed.text, /Rent due 5000 taka/);
    assert.match(compressed.text, /Paid on Monday/);
    assert.match(compressed.text, /Rent due 5000 taka\nPaid on Monday/, 'each Td starts a line');

    const plain = extractPdfText(makePdf(['uncompressed line'], { compressed: false }));
    assert.equal(plain.ok, true, 'an uncompressed content stream works too');
    assert.match(plain.text, /uncompressed line/);
  });

  await t.test('a PDF with no text layer is refused in one sentence', () => {
    const r = extractPdfText(makePdf([], { noText: true }));
    assert.equal(r.ok, false);
    const viaFile = extractText(write(home, 'scan.pdf', makePdf([], { noText: true })));
    assert.equal(viaFile.ok, false);
    assert.match(viaFile.reason!, /no text layer/);
    assert.match(viaFile.reason!, /OCR/);
  });

  await t.test('DOCX and XLSX come out of a real zip, with no dependency', () => {
    const zip = readZip(docxOf(para('Rent due') + para('Paid on Monday')));
    assert.ok(zip.has('word/document.xml'), 'the zip reader found the document part');

    const docx = extractText(write(home, 'rent.docx', docxOf(para('Rent due 5000 taka') + para('Paid on Monday'))));
    assert.equal(docx.ok, true);
    assert.equal(docx.kind, 'docx');
    assert.match(docx.text!, /Rent due 5000 taka\nPaid on Monday/);

    const xlsx = extractText(
      write(
        home,
        'sheet.xlsx',
        makeZip([{ name: 'xl/sharedStrings.xml', body: '<sst><si><t>Item</t></si><si><t>Price</t></si></sst>' }]),
      ),
    );
    assert.equal(xlsx.ok, true);
    assert.match(xlsx.text!, /Item\nPrice/);
    assert.match(xlsx.text!, /numbers in the grid are not read/);
  });

  await t.test('a file we cannot read says so instead of pretending', () => {
    const zip = extractText(write(home, 'stuff.zip', 'PK\u0003\u0004not really'));
    assert.equal(zip.ok, false);
    assert.match(zip.reason!, /no reader for \.zip/);
    const missing = extractText(path.join(home, 'nope.pdf'));
    assert.equal(missing.ok, false);
    assert.match(missing.reason!, /could not open/);
  });

  await t.test('the arriving document reaches the agent as text (through the channel)', async () => {
    let seen = '';
    const { channel, push } = spyChannel({
      files: { doc: docxOf(para('Rent due 5000 taka')) },
      onMessage: (text) => {
        seen = text;
        return 'ok';
      },
      intake: makeIntake({ ...defaults(), provider: { type: 'mock', model: 'mock-1' } } as never),
    });
    await arrive({ channel, push }, docUpdate('rent.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), () => seen);
    assert.match(seen, /file saved to inbox\//);
    assert.match(seen, /--- text of rent\.docx \(docx\) ---/);
    assert.match(seen, /Rent due 5000 taka/);
  });
});

// --------------------------------------------------------------------- 16.2

test('16.2 a photo is described by a model that can see — or refused honestly', async (t) => {
  await t.test('which models can see', () => {
    assert.equal(canSeeImages({ type: 'openai', model: 'gpt-4o' }), true);
    assert.equal(canSeeImages({ type: 'openai', model: 'openai/gpt-4o-2024-08-06' }), true);
    assert.equal(canSeeImages({ type: 'openai', model: 'qwen2.5-vl-7b' }), true);
    assert.equal(canSeeImages({ type: 'openai', model: 'o1-preview' }), false, 'o1 is text-only');
    assert.equal(canSeeImages({ type: 'openai', model: 'mistral-7b-instruct' }), false);
    assert.equal(canSeeImages({ type: 'mock', model: 'mock-1' }), true, 'the offline brain reports what it was handed');
  });

  await t.test('the picture goes on the wire as an image part, after the text', async () => {
    let body: Record<string, unknown> | null = null;
    const provider = createOpenAi(
      { baseUrl: 'https://api.example.com/v1', apiKey: 'k', model: 'gpt-4o' },
      async (_url, init) => {
        body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'A receipt for 5000 taka.' }, finish_reason: 'stop' }] }),
        } as Response;
      },
    );
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02, 0x03]);
    const r = await describeImage({
      bytes,
      mimeType: 'image/jpeg',
      cfg: { type: 'openai', model: 'gpt-4o' },
      provider,
    });
    assert.equal(r.ok, true);
    assert.match(r.ok ? r.text : '', /receipt for 5000 taka/);

    const messages = (body as unknown as { messages: { role: string; content: unknown }[] }).messages;
    const user = messages.find((m) => m.role === 'user')!;
    assert.ok(Array.isArray(user.content), 'the user message became content parts');
    const parts = user.content as { type: string; text?: string; image_url?: { url: string } }[];
    assert.equal(parts[0]!.type, 'text');
    assert.equal(parts[1]!.type, 'image_url', 'the text comes first, then the picture');
    assert.equal(parts[1]!.image_url!.url, `data:image/jpeg;base64,${bytes.toString('base64')}`);
  });

  await t.test('a model that cannot see is not asked, and the agent is told why', async () => {
    const dir = tmpHome('t16b-');
    const saved = saveIncoming(
      { name: 'pic.jpg', bytes: Buffer.alloc(2048, 1), kind: 'photo', mimeType: 'image/jpeg' },
      { dir: path.join(dir, 'inbox') },
    );
    const blind = await intakePrompt(
      saved,
      { name: 'pic.jpg', kind: 'photo', mimeType: 'image/jpeg' },
      {},
      { describe: (f, mime) => describeImage({ file: f.path, mimeType: mime, cfg: { type: 'openai', model: 'mistral-7b' } }) },
    );
    assert.match(blind, /I saved it but cannot see it/);
    assert.match(blind, /cannot see pictures/);
    assert.match(blind, /termcrab config set provider\.model/);
  });

  await t.test('the offline provider proves the whole path (channel → intake → model)', async () => {
    const dir = tmpHome('t16c-');
    let seen = '';
    const { channel, push } = spyChannel({
      files: { pic: Buffer.alloc(4096, 7) },
      onMessage: (text) => {
        seen = text;
        return 'ok';
      },
      intake: makeIntake({ ...defaults(), provider: { type: 'mock', model: 'mock-1' } } as never),
    });
    process.env.TCRAB_HOME = dir;
    await arrive({ channel, push }, photoUpdate('what is this?'), () => seen);
    assert.match(seen, /\[photo saved to inbox\//);
    assert.match(seen, /What I can see: \[mock:mock-1\] \(offline vision\) I was handed an image: image\/jpeg, 4 KB/);
    assert.match(seen, /what is this\?/, 'the caption still reaches the agent');
  });

  await t.test('an enormous picture is refused before it costs a call', async () => {
    const r = await describeImage({
      bytes: Buffer.alloc(MAX_VISION_MB * 1024 * 1024 + 1),
      mimeType: 'image/jpeg',
      cfg: { type: 'mock', model: 'mock-1' },
      maxMb: MAX_VISION_MB,
    });
    assert.equal(r.ok, false);
    assert.match(r.ok ? '' : r.reason, /too large to send to the model/);
  });

  await t.test('describing pictures can be turned off', async () => {
    const dir = tmpHome('t16d-');
    const saved = saveIncoming(
      { name: 'pic.jpg', bytes: Buffer.alloc(1024, 3), kind: 'photo', mimeType: 'image/jpeg' },
      { dir: path.join(dir, 'inbox') },
    );
    const text = await intakePrompt(saved, { name: 'pic.jpg', kind: 'photo' }, { describePhotos: false });
    assert.match(text, /describing pictures is turned off/);
  });
});

// --------------------------------------------------------------------- 16.3

test('16.3 a voice note becomes the text the agent answers', async (t) => {
  const home = tmpHome('t16e-');

  await t.test('the transcript is what the agent reads', async () => {
    const saved = saveIncoming({ name: 'voice.ogg', bytes: Buffer.alloc(3000, 2), kind: 'audio' }, {});
    const text = await intakePrompt(saved, { name: 'voice.ogg', kind: 'audio' }, {}, {
      transcribe: async () => ({ ok: true, text: 'Remind me to pay the rent on Monday' }),
    });
    assert.match(text, /\[voice note saved to inbox\//);
    assert.match(text, /Transcript:\nRemind me to pay the rent on Monday/);
  });

  await t.test('an engine that is missing is a sentence, not silence', async () => {
    const saved = saveIncoming({ name: 'voice.ogg', bytes: Buffer.alloc(3000, 2), kind: 'audio' }, {});
    const text = await intakePrompt(saved, { name: 'voice.ogg', kind: 'audio' }, {}, {
      transcribe: async () => ({ ok: false, error: 'whisper engine not installed — to transcribe audio files offline: install whisper.cpp' }),
    });
    assert.match(text, /not transcribed: whisper engine not installed/);
  });

  await t.test('a long recording is not chewed up on the phone', async () => {
    const saved = saveIncoming({ name: 'long.ogg', bytes: Buffer.alloc(6 * 1024 * 1024, 1), kind: 'audio' }, {});
    const text = await intakePrompt(saved, { name: 'long.ogg', kind: 'audio' }, {}, {
      transcribe: async () => {
        throw new Error('must not be called');
      },
    });
    assert.match(text, /too long to transcribe on the phone/);
  });

  await t.test('the real (default) path answers honestly with no engine installed', async () => {
    if (findWhisperBin()) return; // a machine with whisper.cpp cannot test the missing case
    const audio = write(home, 'memo.ogg', Buffer.alloc(64, 1));
    const r = await transcribeFile(audio);
    assert.equal(r.ok, false);
    assert.match(r.error!, /whisper engine not installed/);
  });

  await t.test('through the channel, a voice note arrives as a transcript', async () => {
    let seen = '';
    const { channel, push } = spyChannel({
      files: { voice: Buffer.alloc(2048, 5) },
      onMessage: (text) => {
        seen = text;
        return 'ok';
      },
      intake: async (saved, info) => intakePrompt(saved, info, {}, { transcribe: async () => ({ ok: true, text: 'call the plumber' }) }),
    });
    await arrive({ channel, push }, voiceUpdate(), () => seen);
    assert.match(seen, /Transcript:\ncall the plumber/);
  });
});

// --------------------------------------------------------------------- 16.4

test('16.4 the inbox is its own area, and it is the only part of the workspace that gets swept', async (t) => {
  const home = tmpHome('t16f-');

  await t.test('disk usage lists the inbox separately', () => {
    write(home, 'workspace/inbox/shot.jpg', Buffer.alloc(5000, 1));
    write(home, 'workspace/notes.md', Buffer.alloc(2000, 2));
    const usage = diskUsage(home);
    assert.equal(usage.byArea.inbox, 5000);
    assert.equal(usage.byArea.workspace, 2000, 'the workspace total excludes the inbox');
  });

  await t.test('retention removes old inbox files and never touches the workspace', () => {
    const dir = tmpHome('t16g-');
    const old = write(dir, 'workspace/inbox/old.pdf', Buffer.alloc(1000, 1));
    const fresh = write(dir, 'workspace/inbox/new.pdf', Buffer.alloc(1000, 1));
    const mine = write(dir, 'workspace/notes.md', Buffer.alloc(1000, 1));
    const past = Date.now() - 40 * 86_400_000;
    fs.utimesSync(old, past / 1000, past / 1000);
    fs.utimesSync(mine, past / 1000, past / 1000);

    const r = enforceDiskBudget(50 * 1024 * 1024, { keepDays: 30, root: dir });
    assert.equal(r.removed, 1, 'only the old inbox file went');
    assert.equal(fs.existsSync(old), false);
    assert.equal(fs.existsSync(fresh), true, 'a recent arrival stays');
    assert.equal(fs.existsSync(mine), true, 'a file the user wrote is never trimmed');
    assert.match(r.notes.join('; '), /older than 30 day/);
  });

  await t.test('termcrab disk shows the inbox to the user', async () => {
    const dir = tmpHome('t16h-');
    saveConfig(defaults());
    write(dir, 'workspace/inbox/photo.jpg', Buffer.alloc(3000, 1));
    const { stdout } = await execFileAsync(process.execPath, [BIN, 'disk', '--json'], {
      env: { ...process.env, TCRAB_HOME: dir },
      encoding: 'utf8',
    });
    const env = JSON.parse(stdout.trim()) as { ok: boolean; data: { before: { byArea: Record<string, number> } } };
    assert.equal(env.ok, true);
    assert.equal(env.data.before.byArea.inbox, 3000, 'the inbox has its own line in the disk report');
  });
});

// --------------------------------------------------------------------- 16.5

test('16.5 the rules are written down and the census moved', async (t) => {
  await t.test('docs/CHANNELS.md says what happens to what arrives', () => {
    const doc = fs.readFileSync('docs/CHANNELS.md', 'utf8');
    assert.match(doc, /readDocuments|read the text/i);
    assert.match(doc, /transcrib/i);
    assert.match(doc, /Pictures are described/i);
    assert.match(doc, /when it can see them/i);
    assert.match(doc, /workspace\/inbox/);
    assert.match(doc, /no text layer|scanned/i, 'the honest limit is in the doc');
  });

  await t.test('the census rows cite this batch', () => {
    const census = JSON.parse(fs.readFileSync('docs/openclaw/data/census.json', 'utf8')) as {
      rows: { capability: string; verdict: string; evidence: string }[];
    };
    const doc = census.rows.find((r) => r.capability === 'Document extraction')!;
    assert.equal(doc.verdict, 'WORKING');
    assert.match(doc.evidence, /16\.1/);
    assert.match(doc.evidence, /16\.2/);
    const transcription = census.rows.find((r) => r.capability === 'Transcription')!;
    // 33.5 re-judged this row: transcription is proven end to end against real
    // engines (test/tier2y.test.ts), and the one thing not attempted — partial
    // hypotheses while you are still speaking — has to stay written down.
    assert.equal(transcription.verdict, 'WORKING');
    assert.match(transcription.evidence, /partial-hypothesis/);
    assert.match(transcription.evidence, /continuous listening|phrase-by-phrase/);
    const media = census.rows.find((r) => r.capability === 'Media send/receive')!;
    assert.equal(media.verdict, 'WORKING');
  });
});
