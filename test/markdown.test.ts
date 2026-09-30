import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * v0.16.0: the AI replies render markdown (zero-dependency renderer that lives
 * inside ui/index.html). These tests extract the renderer from the real page
 * and run it in Node — the exact code the browser executes.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const html = fs.readFileSync(path.join(repoRoot, 'ui', 'index.html'), 'utf8');

function loadRenderer(): (s: string) => string {
  const m = html.match(
    /\/\/ ==== markdown renderer \(zero-dependency, mobile-first\) ====([\s\S]*?)\/\/ ==== end markdown renderer ====/
  );
  assert.ok(m, 'renderer markers present in ui/index.html');
  const factory = new Function(`${m[1]}\n; return renderMarkdown;`) as () => (s: string) => string;
  return factory();
}

const md = loadRenderer();

test('headings, emphasis, strike and inline code', () => {
  const out = md('# Title\n\nSome **bold** and *italic* and ~~gone~~ and `x < y`.');
  assert.match(out, /<h1>Title<\/h1>/);
  assert.match(out, /<strong>bold<\/strong>/);
  assert.match(out, /<em>italic<\/em>/);
  assert.match(out, /<del>gone<\/del>/);
  assert.match(out, /<code>x &lt; y<\/code>/);
  assert.match(md('### Sub'), /<h3>Sub<\/h3>/);
});

test('fenced code blocks render with a language label and stay escaped', () => {
  const out = md('Intro\n\n```js\nconst a = "<b>";\nalert(a);\n```\n\nAfter');
  assert.match(out, /class="mdCode"/);
  assert.match(out, /<span>js<\/span>/);
  assert.match(out, /class="mdCopy"/);
  assert.match(out, /&lt;b&gt;/, 'code content must be escaped');
  assert.ok(!out.includes('<b>'), 'raw HTML inside code must never render');
  assert.match(out, /<p>After<\/p>/);
});

test('unterminated fence (still streaming) still shows as code', () => {
  const out = md('thinking...\n```python\nprint("hi"');
  assert.match(out, /class="mdCode"/);
  assert.match(out, /<span>python<\/span>/);
  assert.match(out, /print\(&quot;hi&quot;/);
});

test('xss: raw html in the reply is shown as text', () => {
  const out = md('hi <script>alert(1)</script> and <img src=x onerror=alert(1)>');
  assert.ok(!out.includes('<script>'), 'no script tag may pass through');
  assert.ok(!/<img src=x/.test(out), 'no raw img may pass through');
  assert.match(out, /&lt;script&gt;/);
});

test('xss: dangerous link protocols are dropped', () => {
  const out = md('[click](javascript:alert(1))');
  assert.ok(!out.includes('href="javascript'), 'javascript: links must be dropped');
  assert.match(out, /click/);
});

test('safe links open with noopener', () => {
  const out = md('[docs](https://example.com/a?b=1&c=2)');
  assert.match(out, /<a href="https:\/\/example\.com\/a\?b=1&amp;c=2"/);
  assert.match(out, /target="_blank"/);
  assert.match(out, /rel="noopener noreferrer"/);
});

test('bare urls become links', () => {
  const out = md('see https://example.com/x for more');
  assert.match(out, /<a href="https:\/\/example\.com\/x"/);
});

test('lists: unordered, ordered, task items', () => {
  const ul = md('- one\n- two');
  assert.match(ul, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
  const ol = md('1. first\n2. second');
  assert.match(ol, /<ol><li>first<\/li><li>second<\/li><\/ol>/);
  const task = md('- [x] done\n- [ ] todo');
  assert.match(task, /<input type="checkbox" disabled checked>/);
  assert.match(task, /todo/);
});

test('nested lists indent', () => {
  const out = md('- outer\n  - inner\n  - inner2');
  assert.match(out, /<ul><li>outer<ul><li>inner<\/li><li>inner2<\/li><\/ul><\/li><\/ul>/);
});

test('blockquote renders with a rail', () => {
  const out = md('> wise words\n> over two lines');
  assert.match(out, /<blockquote>/);
  assert.match(out, /wise words/);
});

test('tables get a scroll wrapper with header and rows', () => {
  const out = md('| Name | Value |\n| --- | --- |\n| a | 1 |\n| b | 2 |');
  assert.match(out, /<div class="mdTable">/);
  assert.match(out, /<th>Name<\/th>/);
  assert.match(out, /<td>2<\/td>/);
});

test('horizontal rule', () => {
  assert.match(md('before\n\n---\n\nafter'), /<hr>/);
});

test('soft line breaks become line breaks (chat behaviour)', () => {
  assert.match(md('line one\nline two'), /line one<br>line two/);
});

test('images render safely with escaped alt', () => {
  const out = md('![alt <x>](https://e.com/i.png)');
  assert.match(out, /<img src="https:\/\/e\.com\/i\.png"/);
  assert.match(out, /alt="alt &lt;x&gt;"/);
  assert.match(out, /loading="lazy"/);
});

test('empty and plain input is safe', () => {
  assert.equal(md(''), '');
  assert.equal(md(null as unknown as string), '');
  assert.match(md('plain reply'), /<p>plain reply<\/p>/);
});
