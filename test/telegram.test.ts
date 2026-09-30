import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdToTelegramHtml, escapeHtml } from '../src/channels/markdown.js';
import { TelegramChannel } from '../src/channels/telegram.js';
import { channelGuide } from '../src/agent/prompt.js';

// ---- converter: markdown -> exactly the tags Telegram understands ----

test('emphasis and inline code become telegram tags', () => {
  const out = mdToTelegramHtml('**b** and *i* and ~~s~~ done');
  assert.match(out, /<b>b<\/b>/);
  assert.match(out, /<i>i<\/i>/);
  assert.match(out, /<s>s<\/s>/);
});

test('inline code keeps < and & escaped, no emphasis inside', () => {
  const out = mdToTelegramHtml('use `a < b && c` here');
  assert.match(out, /<code>a &lt; b &amp;&amp; c<\/code>/);
  assert.ok(!out.includes('<i>'));
});

test('fenced code block with language class stays literal', () => {
  const out = mdToTelegramHtml('intro\n\n```js\nconst a = "<b>x</b>";\n```\n\nafter');
  assert.match(out, /<pre><code class="language-js">const a = "&lt;b&gt;x&lt;\/b&gt;";<\/code><\/pre>/);
  assert.match(out, /intro/);
  assert.match(out, /after/);
});

test('unclosed fence still closes (forgiving parser)', () => {
  const out = mdToTelegramHtml('```\nnever closed');
  assert.match(out, /^<pre>never closed<\/pre>$/);
});

test('headings render as bold lines', () => {
  assert.equal(mdToTelegramHtml('## Two words'), '<b>Two words</b>');
  assert.equal(mdToTelegramHtml('# One'), '<b>One</b>');
});

test('lists: bullets and ordered stay readable', () => {
  const out = mdToTelegramHtml('- alpha\n- beta\n1. first\n2. second');
  assert.match(out, /• alpha\n• beta/);
  assert.match(out, /1\. first\n2\. second/);
});

test('blockquotes wrap in <blockquote>', () => {
  const out = mdToTelegramHtml('> quoted line\n> second line');
  assert.equal(out, '<blockquote>quoted line\nsecond line</blockquote>');
});

test('links: safe scheme converts, javascript: does not', () => {
  const ok = mdToTelegramHtml('see [site](https://example.com/a?b=1&c=2) now');
  assert.match(ok, /<a href="https:\/\/example\.com\/a\?b=1&amp;c=2">site<\/a>/);
  const bad = mdToTelegramHtml('[x](javascript:alert(1))');
  assert.ok(!bad.includes('<a '), 'unsafe scheme never becomes a tag');
  assert.match(bad, /javascript:alert\(1\)/, 'still visible as text');
});

test('bare urls linkify, trailing punctuation stays outside', () => {
  const out = mdToTelegramHtml('go to https://example.com/x. next');
  assert.match(out, /<a href="https:\/\/example\.com\/x">https:\/\/example\.com\/x<\/a>\. next/);
});

test('table block falls back to a monospace pre', () => {
  const out = mdToTelegramHtml('| a | b |\n|---|---|\n| 1 | 2 |');
  assert.match(out, /^<pre>\| a \| b \|\n\|---\|---\|\n\| 1 \| 2 \|<\/pre>$/);
});

test('horizontal rule becomes a drawn bar, never raw dashes', () => {
  const out = mdToTelegramHtml('above\n\n---\n\nbelow');
  assert.ok(!out.includes('---'));
  assert.match(out, /\u2015{5,}/);
});

test('literal html in the reply text is escaped, not sent as tags', () => {
  const out = mdToTelegramHtml('evil <script>alert(1)</script> & more');
  assert.ok(!out.includes('<script>'));
  assert.match(out, /&lt;script&gt;/);
  assert.match(out, /&amp; more/);
});

test('snake_case words are not turned into italics', () => {
  const out = mdToTelegramHtml('foo_bar_baz and kebab-case');
  assert.ok(!out.includes('<i>'));
  assert.match(out, /foo_bar_baz/);
});

test('emphasis inside link text works', () => {
  const out = mdToTelegramHtml('[**big**](https://y.example)');
  assert.equal(out, '<a href="https://y.example"><b>big</b></a>');
});

test('escapeHtml stays available for the plain fallback', () => {
  assert.equal(escapeHtml('a & <b>'), 'a &amp; &lt;b&gt;');
});

// ---- channel delivery: markdown out, plain fallback, never a lost reply ----

function fakeFetchSequence(responses: Array<{ ok: boolean; description?: string }>) {
  const calls: Array<Record<string, unknown>> = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)));
    const next = responses[Math.min(calls.length - 1, responses.length - 1)]!;
    return {
      status: next.ok ? 200 : 400,
      json: async () => (next.ok ? { ok: true, result: {} } : { ok: false, description: next.description }),
    } as Response;
  }) as typeof globalThis.fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

function makeChannel(): TelegramChannel {
  return new TelegramChannel({
    cfg: { token: 'TESTTOKEN', allowedUserIds: [] },
    onMessage: async () => '',
    getOffset: () => 0,
    setOffset: () => {},
  });
}

test('telegram send renders markdown with parse_mode HTML', async () => {
  const fake = fakeFetchSequence([{ ok: true }]);
  try {
    await makeChannel().send(42, 'Hello **world** and `code`');
    assert.equal(fake.calls.length, 1);
    const body = fake.calls[0]!;
    assert.equal(body.parse_mode, 'HTML');
    assert.equal(body.text, 'Hello <b>world</b> and <code>code</code>');
    assert.equal(body.chat_id, 42);
  } finally {
    fake.restore();
  }
});

test('telegram send retries as plain text when the HTML is rejected', async () => {
  const fake = fakeFetchSequence([
    { ok: false, description: "Bad Request: can't parse entities" },
    { ok: true },
  ]);
  try {
    await makeChannel().send(7, 'Hi **there**');
    assert.equal(fake.calls.length, 2, 'second attempt goes out');
    assert.equal(fake.calls[1]!.text, 'Hi **there**', 'fallback is escaped plain text');
    assert.equal(fake.calls[1]!.parse_mode, 'HTML');
  } finally {
    fake.restore();
  }
});

// ---- the model is told which channel it is replying on ----

test('channelGuide describes each channel and formats for it', () => {
  const tg = channelGuide('telegram');
  assert.match(tg, /# Current channel/);
  assert.match(tg, /Telegram \(mobile chat app\)/);
  assert.match(tg, /Never use tables/);
  assert.match(channelGuide('web'), /web panel/);
  assert.match(channelGuide('cli'), /terminal TUI/);
  assert.match(channelGuide('voice'), /spoken aloud/);
  assert.match(channelGuide('whatsapp'), /plain text/);
  assert.equal(channelGuide(undefined), '');
  assert.match(channelGuide('something-new'), /"something-new" channel/);
});
