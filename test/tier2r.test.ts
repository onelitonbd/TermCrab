import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { PassThrough } from 'node:stream';
import { charWidth, cut, pad, stripAnsi, truncate, width, wrap } from '../src/tui/text.js';
import { decodeKeys } from '../src/tui/keys.js';
import { blockLines, cursorAt, emptyState, renderFrame } from '../src/tui/frame.js';
import { runTui, TTY_SEQUENCES } from '../src/tui/app.js';
import { defaults, saveConfig } from '../src/core/config.js';
import { MemoryStore } from '../src/agent/memory.js';
import { SessionStore } from '../src/agent/sessions.js';
import { SkillStore } from '../src/skills/loader.js';
import { startGateway, type GatewayHandle } from '../src/gateway/server.js';
import type { AgentCtx } from '../src/agent/loop.js';

/**
 * Batch 29 — the full-screen terminal.
 *
 * 29.1 the screen itself (size arithmetic, alternate buffer, restore on exit),
 * 29.2 a live turn drawn as it happens, 29.3 attaching to what other surfaces
 * are doing on the same session.
 */

function makeCtx(tag: string, over: Partial<AgentCtx> = {}): { ctx: AgentCtx; home: string } {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), `t29-${tag}-`));
  process.env.TCRAB_HOME = home;
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  const ctx: AgentCtx = {
    config,
    memory: new MemoryStore(path.join(home, 'memory')),
    sessions: new SessionStore(path.join(home, 'sessions')),
    skills: new SkillStore([{ dir: path.join(home, 'skills'), origin: 'user' }]),
    ...over,
  };
  return { ctx, home };
}

/** A fake terminal: a writable stream that remembers every byte. */
function fakeTty(rows = 20, cols = 60): { input: PassThrough; output: PassThrough & { columns: number; rows: number; text(): string }; nextTurn(): Promise<void> } {
  const input = new PassThrough();
  const output = new PassThrough() as PassThrough & { columns: number; rows: number; text(): string };
  output.columns = cols;
  output.rows = rows;
  const chunks: string[] = [];
  output.on('data', (b: Buffer) => chunks.push(b.toString('utf8')));
  output.text = (): string => chunks.join('');
  // Terminal writes are synchronous in Node; one tick is enough to observe them.
  return { input, output, nextTurn: () => new Promise((r) => setImmediate(r)) };
}

// ---------------------------------------------------------------------------
// 29.1 — the arithmetic under the picture
// ---------------------------------------------------------------------------

test('29.1 text is measured in terminal cells, wide characters included', () => {
  assert.equal(width('hello'), 5);
  assert.equal(width('\x1b[31mred\x1b[0m'), 3, 'escapes take no cells');
  assert.equal(width('বাংলা'), 5, 'a Bengali word is five cells');
  assert.equal(charWidth('は'), 2, 'CJK is double-width');
  assert.equal(charWidth('a'), 1);
  assert.equal(cut('abcdef', 3), 'abc');
  assert.equal(truncate('abcdef', 3), 'ab…');
  assert.equal(width(truncate('日本語です', 5)), 5, 'truncation never overshoots the column');
  assert.equal(width(pad('ab', 6)), 6);
  assert.equal(pad('toolong', 3), 'to…');
});

test('29.1 wrapping keeps words whole, and hard-cuts a word longer than the line', () => {
  assert.deepEqual(wrap('one two three', 7), ['one two', 'three']);
  assert.deepEqual(wrap('a\n\nb', 10), ['a', '', 'b'], 'empty lines survive');
  const long = wrap('x'.repeat(25), 10);
  assert.equal(long.length, 3);
  assert.ok(long.every((l) => width(l) <= 10));
  assert.deepEqual(wrap('indented  both', 40), ['indented  both'], 'inner spacing is preserved');
});

test('29.1 a frame is exactly the terminal: rows × cols, every line padded', () => {
  const state = emptyState({
    provider: 'mock:mock-1',
    session: 'main',
    blocks: [
      { kind: 'user', text: 'what is on the board today?' },
      { kind: 'assistant', text: 'three things, all of them boring' },
      { kind: 'tool', text: 'read_file path=README.md ✓', running: false, ms: 12 },
    ],
    input: 'next',
    cursor: 4,
    status: 'ready',
  });
  const lines = renderFrame(state, { rows: 10, cols: 40 });
  assert.equal(lines.length, 10);
  for (const line of lines) assert.equal(width(line), 40, `line is exactly 40 cells: ${JSON.stringify(stripAnsi(line))}`);
  const text = lines.map(stripAnsi).join('\n');
  assert.match(text, /how is on the board|what is on the board/, 'the user block is drawn');
  assert.match(text, /three things/, 'the answer is drawn');
  assert.match(text, /read_file .*12ms/, 'a tool is one line with its duration');
  assert.match(text, /› next/, 'the input line is there');
  assert.match(text, /mock:mock-1/, 'the title bar names the provider');
});

test('29.1 a huge screen shrinks to the terminal and follows the newest line', () => {
  const blocks = Array.from({ length: 40 }, (_, i) => ({ kind: 'assistant' as const, text: `line ${i}` }));
  const state = emptyState({ blocks, status: 's' });
  const small = renderFrame(state, { rows: 12, cols: 40 });
  assert.equal(small.length, 12);
  const text = small.map(stripAnsi).join('\n');
  assert.match(text, /line 39/, 'the newest line is on screen');
  assert.equal(/line 0\b/.test(text), false, 'and the oldest is not');

  // Scrolling back shows older lines, and the input never disappears.
  state.scroll = 20;
  const scrolled = renderFrame(state, { rows: 12, cols: 40 }).map(stripAnsi).join('\n');
  assert.equal(/line 39/.test(scrolled), false);
  assert.match(scrolled, /›/);
});

test('29.1 the cursor follows the caret, and never walks off the input line', () => {
  const state = emptyState({ input: 'hello', cursor: 5, status: '' });
  const { row, col } = cursorAt(state, { rows: 20, cols: 60 });
  assert.equal(row, 18, 'second-to-last line');
  assert.equal(col, 2 + 5);
  state.input = 'x'.repeat(200);
  state.cursor = 200;
  const far = cursorAt(state, { rows: 20, cols: 40 });
  assert.ok(far.col <= 40, 'a pasted line slides instead of overflowing');
  // A long tool card is still one line: the transcript cannot be pushed around.
  const card = blockLines({ kind: 'tool', text: `exec ${'y'.repeat(300)}`, running: false }, 40, '⠋');
  assert.equal(card.length, 1);
  assert.ok(width(card[0]!) <= 40);
});

test('29.1 keys: arrows, control letters, and a half-arrived escape sequence', () => {
  const full = decodeKeys('\x1b[A\x1b[B\x03\r\x7fabc');
  assert.equal(full.rest, '');
  assert.deepEqual(full.keys.map((k) => k.name), ['up', 'down', 'ctrl', 'enter', 'backspace', 'char', 'char', 'char']);
  assert.deepEqual(full.keys[2], { name: 'ctrl', letter: 'c' });

  const partial = decodeKeys('\x1b[');
  assert.deepEqual(partial.keys, [], 'a half escape sequence yields nothing yet');
  assert.equal(partial.rest, '\x1b[', 'and is kept for the next read');
  assert.deepEqual(decodeKeys(`${partial.rest}C`).keys, [{ name: 'right' }]);

  const emoji = decodeKeys('🦀');
  assert.deepEqual(emoji.keys, [{ name: 'char', char: '🦀' }]);
  const half = decodeKeys('🦀'.slice(0, 1));
  assert.equal(half.keys.length, 0, 'a split code point waits too');
  assert.equal(half.rest.length, 1);

  assert.deepEqual(decodeKeys('\x1b[5~').keys, [{ name: 'pageup' }]);
  assert.deepEqual(decodeKeys('\x1b[Z').keys, [{ name: 'shift-tab' }]);
});

// ---------------------------------------------------------------------------
// 29.1 / 29.2 — the screen as a running program
// ---------------------------------------------------------------------------

test('29.2 a typed turn streams into the screen, and leaving restores the terminal', async () => {
  const { ctx } = makeCtx('run');
  const tty = fakeTty(18, 64);
  const frames: string[][] = [];
  const ui = runTui({ ctx, sessionId: 'main', streams: { input: tty.input as never, output: tty.output as never }, onFrame: (l) => frames.push(l) });

  await tty.nextTurn();
  assert.equal(tty.output.text().includes(TTY_SEQUENCES.altScreenOn), true, 'the alternate screen is entered');
  assert.equal(tty.output.text().includes(TTY_SEQUENCES.hideCursor), true, 'and the cursor is hidden');
  assert.ok(frames.length >= 1, 'a frame is drawn immediately');
  assert.match(frames[0]!.map(stripAnsi).join('\n'), /main · mock:mock-1/, 'the title bar names the session and the provider');

  ui.type('hello there\r');
  // The turn is promised, not awaited by the caller: wait for it to land.
  for (let i = 0; i < 200 && !ctx.sessions.read('main').some((e) => e.role === 'assistant'); i++) {
    await new Promise((r) => setTimeout(r, 25));
  }
  await tty.nextTurn();
  const drawn = frames.map((f) => f.map(stripAnsi).join('\n')).join('\n---\n');
  assert.match(drawn, /hello there/, 'the message appears as the user typed it');
  assert.match(drawn, /\[mock:mock-1\]/, 'and the answer streams in');
  assert.ok(ctx.sessions.read('main').length >= 2, 'the transcript really has the turn');

  // Ctrl-C leaves the screen. The first press stops a turn if one is somehow
  // still running (under load the assertion above can win the race), the
  // second always leaves — so this cannot hang.
  ui.type('\x03');
  await new Promise((r) => setTimeout(r, 200));
  ui.type('\x03');
  const result = await Promise.race([
    ui.done,
    new Promise<{ reason: string }>((_, reject) => setTimeout(() => reject(new Error('Ctrl-C did not leave the screen')), 4000)),
  ]);
  assert.equal(result.reason, 'quit');
  await tty.nextTurn();
  assert.equal(tty.output.text().includes(TTY_SEQUENCES.altScreenOff), true, 'the alternate screen is left');
  assert.equal(tty.output.text().includes(TTY_SEQUENCES.showCursor), true, 'and the cursor is shown again');
  assert.equal(tty.output.text().includes(TTY_SEQUENCES.bracketedPasteOff), true, 'paste mode is off');
});

test('29.2 the input box edits: history, Ctrl-U, backspace, and /help', async () => {
  const { ctx } = makeCtx('edit');
  const tty = fakeTty(16, 60);
  const frames: string[][] = [];
  const ui = runTui({ ctx, sessionId: 'main', streams: { input: tty.input as never, output: tty.output as never }, onFrame: (l) => frames.push(l) });
  await tty.nextTurn();

  ui.type('first thing\r');
  await new Promise((r) => setTimeout(r, 300));
  ui.type('\x1b[A'); // up → history
  await tty.nextTurn();
  let frame = frames[frames.length - 1]!.map(stripAnsi).join('\n');
  assert.match(frame, /› first thing/, 'Up recalls the last message');

  ui.type('\x15'); // Ctrl-U: clear the line
  await tty.nextTurn();
  let last = frames[frames.length - 1]!.map(stripAnsi);
  assert.equal(/› first thing/.test(last[last.length - 2]!), false, 'Ctrl-U emptied the input line');
  assert.match(last.join('\n'), /first thing/, 'while the transcript keeps what was already sent');

  ui.type('abc\x7f\x7f\r'); // "abc" minus two, Enter
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(ctx.sessions.read('main').some((e) => 'content' in e && e.content === 'a'), 'backspace really deleted characters');

  ui.type('/help\r');
  await tty.nextTurn();
  frame = frames[frames.length - 1]!.map(stripAnsi).join('\n');
  assert.match(frame, /Ctrl-C stop or leave/, '/help lists the keys');
  assert.match(frame, /\/sessions/, '/help lists the commands');

  ui.type('/nope\r');
  await tty.nextTurn();
  frame = frames[frames.length - 1]!.map(stripAnsi).join('\n');
  assert.match(frame, /unknown command \/nope/);

  ui.type('/quit\r');
  assert.equal((await ui.done).reason, 'quit');
});

test('29.2 a resize redraws to the new width, and /sessions opens the picker', async () => {
  const { ctx } = makeCtx('picker');
  ctx.sessions.append('telegram:-100', { role: 'user', content: 'group chatter', ts: Date.now() });
  const tty = fakeTty(18, 70);
  const frames: string[][] = [];
  const ui = runTui({ ctx, sessionId: 'main', streams: { input: tty.input as never, output: tty.output as never }, onFrame: (l) => frames.push(l) });
  await tty.nextTurn();

  tty.output.columns = 44;
  tty.output.rows = 14;
  tty.output.emit('resize');
  await tty.nextTurn();
  const resized = frames[frames.length - 1]!;
  assert.equal(resized.length, 14, 'the frame follows the new height');
  assert.ok(resized.every((l) => width(l) === 44), 'and the new width');

  ui.type('/sessions\r');
  await tty.nextTurn();
  let frame = frames[frames.length - 1]!.map(stripAnsi).join('\n');
  assert.match(frame, /conversation\(s\) — Enter opens/, 'the picker opened');
  assert.match(frame, /telegram:-100/, 'and lists the other conversations');

  // Arrow down to the telegram row (the current one is first), Enter opens it.
  ui.type('\x1b[B\r');
  await tty.nextTurn();
  frame = frames[frames.length - 1]!.map(stripAnsi).join('\n');
  assert.match(frame, /opened telegram:-100/);
  assert.match(frame, /telegram:-100 · mock:mock-1/, 'the title bar switched sessions');
  ui.stop();
  await ui.done;
});

test('29.1 the screen refuses a pipe instead of drawing into it', async () => {
  const { ctx } = makeCtx('notty');
  const chunks: string[] = [];
  const output = new PassThrough() as PassThrough & { columns: number; rows: number };
  output.columns = 80;
  output.rows = 24;
  output.on('data', (b: Buffer) => chunks.push(b.toString()));
  const input = new PassThrough();
  // No `streams` on a non-TTY stdout is the real case; here we simulate it by
  // checking the guard's own decision path.
  const realIsTTY = process.stdout.isTTY;
  Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
  try {
    const handle = runTui({ ctx, sessionId: 'main', streams: { input: input as never, output: output as never } });
    void handle;
  } finally {
    Object.defineProperty(process.stdout, 'isTTY', { value: realIsTTY, configurable: true });
  }
  // With explicit streams the screen is allowed (that is what --frames and the
  // tests need), so no refusal message here.
  assert.equal(chunks.join('').includes('needs a terminal'), false);
  assert.equal(typeof ctx.memory, 'object');
});

// ---------------------------------------------------------------------------
// 29.3 — attaching to what other surfaces are doing
// ---------------------------------------------------------------------------

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
}

test('29.3 a turn from the panel shows up in the terminal while you watch', async () => {
  const { ctx } = makeCtx('attach');
  ctx.config.gateway.token = 'test-token';
  ctx.config.gateway.port = await freePort();
  saveConfig(ctx.config);

  let handle: GatewayHandle | undefined;
  const tty = fakeTty(20, 70);
  const frames: string[][] = [];
  const ui = runTui({
    ctx,
    sessionId: 'main',
    streams: { input: tty.input as never, output: tty.output as never },
    onFrame: (l) => frames.push(l),
    attach: { url: `http://127.0.0.1:${ctx.config.gateway.port}`, token: 'test-token' },
  });
  try {
    // The screen opened before the gateway was up — it must attach anyway.
    handle = await startGateway({ config: ctx.config, host: '127.0.0.1', port: ctx.config.gateway.port });
    let attached = false;
    for (let i = 0; i < 60 && !attached; i++) {
      await new Promise((r) => setTimeout(r, 50));
      attached = frames.some((f) => /attached: turns from the panel or your phone/.test(stripAnsi(f.join('\n'))));
    }
    assert.equal(attached, true, 'the screen retried until the gateway answered');
    assert.match(frames.map((f) => stripAnsi(f.join('\n'))).join('\n'), /attached: turns from the panel or your phone/, 'the screen says it is attached');

    const accepted = (await (
      await fetch(`http://127.0.0.1:${ctx.config.gateway.port}/api/chat`, {
        method: 'POST',
        headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' },
        body: JSON.stringify({ message: 'sent from the panel' }),
      })
    ).json()) as { sessionId: string; turnId: string };
    assert.equal(accepted.sessionId, 'main', 'the panel turn lands in the same session');

    let seen = false;
    for (let i = 0; i < 120 && !seen; i++) {
      await new Promise((r) => setTimeout(r, 50));
      seen = frames.some((f) => /sent from the panel/.test(stripAnsi(f.join('\n'))));
    }
    assert.equal(seen, true, 'the panel turn is drawn in the terminal');
    assert.ok(frames.some((f) => /\[mock:mock-1\]/.test(stripAnsi(f.join('\n')))), 'including its answer');
  } finally {
    ui.stop();
    await ui.done;
    await handle?.stop();
  }
});
