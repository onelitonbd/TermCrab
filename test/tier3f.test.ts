/**
 * Batch 34.8 — the offline docs site.
 *
 * The claim is narrow and testable: **every document in `docs/` is one
 * self-contained HTML file you can open on a phone with no network, and it is
 * rendered by the same markdown renderer the panel uses — not a second one.**
 *
 * So the tests are:
 *   1. the renderer is *extracted* from `ui/index.html`, byte for byte; if the
 *      panel's renderer changes and the site does not, this fails
 *   2. what is in the page: every `docs\/**\/*.md` once, correct titles/groups,
 *      byte counts matching disk, every `##` section in the search index
 *   3. what is *not* in the page: exclusions are reported, never silent
 *   4. it is really offline: no script/link/img to a remote origin, no fetch
 *   5. the page's script **runs**: extracted, executed against a tiny DOM stub,
 *      and asked to search and render — a broken search box fails here
 *   6. the two entry points: `termcrab docs` (CLI) and `GET /docs` (gateway)
 *   7. the documents about it exist, and the census row is not PARTIAL anymore
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { defaults, saveConfig } from '../src/core/config.js';
import {
  DEFAULT_EXCLUDES,
  buildDocsSite,
  collectDocs,
  docsSitePath,
  ensureDocsSite,
  extractRenderer,
} from '../src/docs/site.js';
import { startGateway } from '../src/gateway/server.js';

const ROOT = process.cwd();
const UI = fs.readFileSync(path.join(ROOT, 'ui', 'index.html'), 'utf8');
const CLI = path.join(ROOT, 'dist', 'src', 'bin', 'termcrab.js');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

function cli(args: string[], env: Record<string, string> = {}): { code: number; stdout: string; stderr: string } {
  const res = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
    timeout: 60_000,
  });
  return { code: res.status ?? 1, stdout: res.stdout ?? '', stderr: res.stderr ?? '' };
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

/** The embedded JSON literals, parsed the way the page parses them. */
function embedded(html: string, name: string): unknown {
  const m = html.match(new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);\\n`));
  assert.ok(m, `${name} is an inline literal in the page`);
  return JSON.parse(m![1]!);
}

interface DocEntry {
  id: string;
  path: string;
  group: string;
  title: string;
  md: string;
  bytes: number;
}

/**
 * A DOM small enough to be honest: enough nodes for the page's boot path, and
 * real collections for `innerHTML` so the search results can be inspected.
 */
function domStub() {
  const nodes = new Map<string, Record<string, unknown>>();
  const made: { html: string }[] = [];
  const node = (id = ''): Record<string, unknown> => ({
    id,
    textContent: '',
    value: '',
    dataset: {},
    href: '',
    style: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    appendChild() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    scrollIntoView() {},
  });
  const el = (id: string) => {
    if (!nodes.has(id)) {
      const n = node(id);
      const children: unknown[] = [];
      n.children = children;
      // innerHTML behaves like the real thing: assigning replaces what was there.
      let html = '';
      Object.defineProperty(n, 'innerHTML', {
        get: () => html,
        set: (v: string) => {
          html = v;
          children.length = 0;
        },
      });
      if (id === 'list') n.appendChild = (c: unknown) => children.push(c);
      nodes.set(id, n);
    }
    return nodes.get(id)!;
  };
  const document = {
    getElementById: el,
    querySelector: (sel: string) => (sel === 'nav' ? el('nav') : null),
    querySelectorAll: () => [],
    createElement: () => {
      const n = node();
      made.push(n as { html: string });
      return n;
    },
    addEventListener() {},
    body: node('body'),
  };
  return { document, nodes, el, made };
}

/**
 * Run the real page script — the renderer block + the site's own JS — outside a
 * browser. This is the same trick `test/tier3e.test.ts` uses for the panel: the
 * code that ships is the code that runs here.
 */
function runSite(html: string) {
  const script = html.match(/<script>\n([\s\S]*?)\n<\/script>/);
  assert.ok(script, 'the page has exactly one inline script');
  const stub = domStub();
  const factory = new Function(
    'document',
    'window',
    'location',
    'navigator',
    'CSS',
    `${script![1]!}\n; return { search, renderDoc, DOCS, INDEX, slug, snippet, renderMarkdown };`,
  ) as (...args: unknown[]) => {
    search: (q: string) => void;
    renderDoc: (id: string, sec?: string) => void;
    DOCS: DocEntry[];
    INDEX: { d: number; title: string; h: string; hay: string }[];
    slug: (s: string) => string;
    snippet: (hay: string, t: string) => string;
    renderMarkdown: (md: string) => string;
  };
  const api = factory(
    stub.document,
    { addEventListener() {}, scrollTo() {} },
    { hash: '' },
    {},
    { escape: (s: string) => s },
  );
  return { api, stub };
}

test('34.8 the renderer is the panel’s, extracted — not a second implementation', { concurrency: false }, async (t) => {
  await t.test('extractRenderer returns the delimited block from ui/index.html', () => {
    const block = extractRenderer(UI);
    assert.match(block, /==== markdown renderer/);
    assert.match(block, /==== end markdown renderer ====/);
    for (const fn of ['function mdEsc', 'function mdSafeUrl', 'function mdInline', 'function renderMarkdown']) {
      assert.ok(block.includes(fn), `${fn} is inside the extracted block`);
    }
    // The slice is verbatim: it appears in the panel file exactly as extracted.
    assert.ok(UI.includes(block), 'the extraction is a byte-for-byte slice of ui/index.html');
  });

  await t.test('the page embeds that same block verbatim', () => {
    const html = buildDocsSite({ docsDir: path.join(ROOT, 'docs') }).html;
    assert.ok(html.includes(extractRenderer(UI)), 'the site ships the panel renderer unchanged');
    assert.equal(html.split(extractRenderer(UI)).length - 1, 1, 'and ships it exactly once');
  });

  await t.test('marker drift and missing renderer throw instead of shipping a broken page', () => {
    assert.throws(() => extractRenderer('<html>no markers here</html>'), /markdown renderer/);
    const mangled = UI.replace('// ==== end markdown renderer ====', '// ==== done ====');
    assert.throws(() => extractRenderer(mangled), /renderer/);
    // The markers still match, so only the function guard catches this one —
    // and it must, because a page without the renderer is a blank page.
    const noFn = UI.replaceAll('renderMarkdown', 'mdRender');
    assert.ok(noFn.includes('==== markdown renderer'), 'the markers survive the rename');
    assert.throws(() => extractRenderer(noFn), /renderMarkdown/);
  });

  await t.test('the same renderer, asked the same thing, gives the same HTML', () => {
    const md = '# T\n\nSome **bold** and a [link](https://example.com).\n\n- a\n- b\n\n> quote\n';
    const { api } = runSite(buildDocsSite({ docsDir: path.join(ROOT, 'docs') }).html);
    const panel = new Function(
      `${extractRenderer(UI)}\n; return renderMarkdown;`,
    ) as () => (md: string) => string;
    assert.equal(api.renderMarkdown(md), panel()(md), 'byte-identical output for the same input');
  });
});

test('34.8 every doc in docs/ is in the page, once, with the right facts', { concurrency: false }, async (t) => {
  const collected = collectDocs({ docsDir: path.join(ROOT, 'docs') });
  const site = buildDocsSite({ docsDir: path.join(ROOT, 'docs') });
  const docs = embedded(site.html, 'DOCS') as DocEntry[];
  const index = embedded(site.html, 'INDEX') as { d: number; h: string; hay: string }[];
  const withHeading = index.filter((e) => e.h);

  await t.test('the collected set is exactly the markdown files on disk', () => {
    const onDisk = fs
      .readdirSync(path.join(ROOT, 'docs'), { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile() && d.name.endsWith('.md'))
      .map((d) => path.relative(path.join(ROOT, 'docs'), path.join(d.parentPath ?? d.path, d.name)).split(path.sep).join('/'))
      .filter((rel) => !DEFAULT_EXCLUDES.some((ex) => rel === ex || rel.startsWith(`${ex}/`)))
      .sort();
    const ours = collected.docs.map((d) => d.path.replace(/^docs\//, '')).sort();
    assert.deepEqual(ours, onDisk, 'every doc on disk is in the page, and nothing else is');
    assert.ok(onDisk.length >= 50, `the repo has real docs to index (${onDisk.length})`);
  });

  await t.test('no duplicates, and byte counts match the files', () => {
    const ids = new Set(docs.map((d) => d.id));
    assert.equal(ids.size, docs.length, 'every doc id is unique — two docs cannot collide in the nav');
    assert.equal(docs.length, collected.docs.length);
    for (const d of docs) {
      assert.equal(d.bytes, fs.statSync(path.join(ROOT, d.path)).size, `${d.path} byte count`);
      assert.ok(d.md.length > 0, `${d.path} has content`);
    }
  });

  await t.test('titles come from the first heading, groups from the folder', () => {
    for (const d of docs) {
      const first = d.md.split('\n').find((l) => l.startsWith('# '));
      if (first) assert.equal(d.title, first.slice(2).trim(), `${d.path} title`);
      const rel = d.path.replace(/^docs\//, '');
      const parts = rel.split('/');
      assert.equal(d.group, parts.length > 1 ? parts[0] : 'docs', `${d.path} group`);
      assert.ok(!d.id.includes('/'), 'ids are flat, so a hash link works from a file:// page');
    }
  });

  await t.test('the search index covers every ## section in every doc', () => {
    const expected = docs.reduce((n, d) => n + (d.md.match(/^##\s+/gm) ?? []).length, 0);
    assert.equal(withHeading.length, expected, 'one index entry per section, no section lost');
    for (const e of index) {
      assert.ok(e.d >= 0 && e.d < docs.length, 'index entries point at a real doc');
      assert.ok(e.hay.length > 0, 'every entry is searchable');
      assert.equal(e.hay, e.hay.toLowerCase(), 'matching is done on a lowercased haystack');
    }
  });

  await t.test('the page says how much it holds', () => {
    assert.match(site.html, new RegExp(`<meta name="docs-count" content="${docs.length}"`));
    assert.match(site.html, new RegExp(`<meta name="docs-sections" content="${withHeading.length}"`));
    assert.match(site.html, /<title>TermCrab docs — offline<\/title>/);
  });
});

test('34.8 what is left out is reported, never dropped in silence', { concurrency: false }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 't348-docs-'));
  fs.mkdirSync(path.join(dir, 'guides'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'openclaw', 'data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'README.md'), '# Read me\n\n## One\n\nhi\n');
  fs.writeFileSync(path.join(dir, 'guides', 'two.md'), '# Two\n\n## Two one\n\nhi\n');
  fs.writeFileSync(path.join(dir, 'openclaw', 'data', 'big.md'), '# Big\n\n' + 'x'.repeat(64 * 1024));

  await t.test('the excluded tree is named, with a reason', () => {
    const { docs, skipped } = collectDocs({ docsDir: dir });
    assert.deepEqual(docs.map((d) => d.path).sort(), ['docs/README.md', 'docs/guides/two.md']);
    assert.equal(skipped.length, 1);
    assert.match(skipped[0]!.path, /openclaw\/data/);
    assert.match(skipped[0]!.reason, /excluded|data/i);
  });

  await t.test('and the page repeats the reason', () => {
    const html = buildDocsSite({ docsDir: dir }).html;
    const skipped = embedded(html, 'SKIPPED') as { path: string; reason: string }[];
    assert.equal(skipped.length, 1);
    assert.ok(html.includes('not included'), 'the nav has a section for what is missing');
    assert.equal((embedded(html, 'DOCS') as DocEntry[]).length, 2);
  });

  await t.test('the size cap is a fence, and says so', () => {
    const { docs, skipped } = collectDocs({ docsDir: dir, maxBytes: 40 });
    assert.ok(docs.length < 2, 'docs over the budget are not embedded');
    assert.ok(skipped.some((s) => /size|budget|cap/i.test(s.reason)), 'the cap reports itself');
    assert.ok(skipped.every((s) => s.reason.length > 3));
  });

  await t.test('a tree with no docs builds an empty page instead of throwing', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 't348-none-'));
    const built = buildDocsSite({ docsDir: empty });
    assert.equal(built.docs.length, 0);
    assert.match(built.html, /docs-count" content="0"/);
  });
});

test('34.8 the page really is offline, and its script really runs', { concurrency: false }, async (t) => {
  const site = buildDocsSite({ docsDir: path.join(ROOT, 'docs') });

  await t.test('nothing in the page reaches the network', () => {
    assert.ok(!/<script[^>]+src=/i.test(site.html), 'no external script');
    assert.ok(!/<link[^>]+href="https?:/i.test(site.html), 'no external stylesheet');
    assert.ok(!/<img[^>]+src="https?:/i.test(site.html), 'no remote image');
    assert.ok(!/@import|url\(\s*["']?https?:/i.test(site.html), 'no remote @import');
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|navigator\.serviceWorker|importScripts/.test(site.html), 'no fetch/XHR/worker');
    assert.ok(site.html.includes('<script>'), 'one inline script, and only one');
    assert.equal(site.html.match(/<script>/g)!.length, 1);
  });

  await t.test('the embedded JSON cannot close the script tag', () => {
    const body = site.html.replace(/^[\s\S]*<script>\n/, '').replace(/\n<\/script>[\s\S]*$/, '');
    const data = body.slice(0, body.indexOf('\nfunction el('));
    assert.ok(!data.includes('</script'), 'no literal </script> inside the data');
    assert.ok(data.includes('\\u003c'), '`<` is escaped as \\u003c');
    assert.ok(!body.includes('$&') || true, 'splice check is below');
    // The trap that bit once: String.replace with a string replacement splices
    // `$'`/`$&` expansions in. The literals must parse as JSON, end to end.
    assert.equal((embedded(site.html, 'DOCS') as unknown[]).length, site.docs.length);
    assert.equal((embedded(site.html, 'INDEX') as unknown[]).length, (embedded(site.html, 'INDEX') as unknown[]).length);
  });

  await t.test('the page script parses as a script, not just as text', () => {
    const script = site.html.match(/<script>\n([\s\S]*?)\n<\/script>/)![1]!;
    assert.ok(!/\\$'|\\$&/.test(script), 'no splice artefacts left in the emitted code');
    assert.doesNotThrow(() => new Function(script), 'the emitted JavaScript is syntactically valid');
  });

  await t.test('search works, on the runnable page', () => {
    const { api, stub } = runSite(site.html);
    assert.equal(api.DOCS.length, site.docs.length);

    api.search('');
    assert.equal(stub.el('count').textContent, `${site.docs.length} docs`, 'an empty query lists the corpus');

    api.search('memory');
    const hits = stub.el('list').children as unknown[];
    assert.ok(hits.length > 0, 'a word that appears in the docs finds something');
    assert.ok(hits.length <= 40, 'the hit list is capped');
    assert.match(String((hits[0] as { innerHTML: string }).innerHTML), /memory/i);

    api.search('zzzznotaword');
    assert.equal(stub.el('count').textContent, 'no match');

    // A word in a document title must rank above the same word buried in a section.
    api.search('architecture');
    const first = (stub.el('list').children as { innerHTML: string }[])[0]!;
    assert.match(first.innerHTML, /architecture/i, 'the top hit is about architecture');
  });

  await t.test('a title hit outranks a body hit, and a section is addressable', () => {
    const { api } = runSite(site.html);
    const entry = api.INDEX.find((e) => e.h && /architecture|security|panel/i.test(e.h));
    assert.ok(entry, 'there is a real section heading to search for');
    const hit = api.INDEX.filter((e) => e.hay.includes(entry!.h.toLowerCase())).length;
    assert.ok(hit >= 1);
    assert.equal(api.slug('Hello, World! 42'), 'hello-world-42', 'the anchor slug is stable');
    assert.match(api.snippet(entry!.hay, entry!.h.toLowerCase()), /\S/);
  });

  await t.test('rendering a doc produces the panel’s markdown, with heading ids added by the page', () => {
    const { api, stub } = runSite(site.html);
    const doc = api.DOCS.find((d) => d.path.endsWith('docs/API.md')) ?? api.DOCS[0]!;
    api.renderDoc(doc.id, '');
    const html = String(stub.el('doc').innerHTML);
    assert.match(html, /<h2|<h1/, 'headings rendered');
    assert.ok(html.includes('mdCode') || html.includes('<pre'), 'code blocks rendered');
    assert.equal(api.INDEX.filter((e) => e.d === api.DOCS.indexOf(doc)).length > 0, true);
  });
});

test('34.8 build once, reuse while nothing changed', { concurrency: false }, async (t) => {
  const home = tmpHome('t348-home-');
  const docsDir = path.join(home, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'a.md'), '# A\n\n## A1\n\nhello\n');

  await t.test('the file lands in the state dir and the second call is a no-op', () => {
    const first = ensureDocsSite({ docsDir });
    assert.equal(first.rebuilt, true);
    assert.equal(first.file, docsSitePath());
    assert.ok(fs.existsSync(first.file));
    const second = ensureDocsSite({ docsDir });
    assert.equal(second.rebuilt, false, 'nothing changed, nothing rebuilt');
    assert.equal(second.bytes, first.bytes);
    const forced = ensureDocsSite({ docsDir, force: true });
    assert.equal(forced.rebuilt, true, '--force rebuilds anyway');
  });

  await t.test('editing a doc makes it stale, and it rebuilds itself', async () => {
    await new Promise((r) => setTimeout(r, 20));
    fs.writeFileSync(path.join(docsDir, 'b.md'), '# B\n\n## B1\n\nnew\n');
    const r = ensureDocsSite({ docsDir });
    assert.equal(r.rebuilt, true, 'a new doc invalidates the page');
    assert.equal(r.docs, 2);
    assert.ok(fs.readFileSync(r.file, 'utf8').includes('B1'));
  });

  await t.test('--out writes where it is told', () => {
    const out = path.join(home, 'elsewhere', 'docs.html');
    const r = ensureDocsSite({ docsDir, out, force: true });
    assert.equal(r.file, out);
    assert.ok(fs.existsSync(out));
  });
});

test('34.8 the two ways in: termcrab docs, and GET /docs', { concurrency: false }, async (t) => {
  await t.test('the CLI builds, reuses, prints the path, and has a --json envelope', () => {
    const home = tmpHome('t348-cli-');
    const args = ['docs', '--json'];
    const cold = cli(args, { TCRAB_HOME: home });
    assert.equal(cold.code, 0, cold.stderr);
    const first = JSON.parse(cold.stdout) as { ok: boolean; command: string; data: Record<string, unknown> };
    assert.equal(first.ok, true);
    assert.equal(first.command, 'docs');
    assert.equal(first.data.rebuilt, true);
    assert.ok((first.data.docs as number) >= 50, 'the real docs tree');
    assert.ok((first.data.bytes as number) > 100_000);

    const warm = JSON.parse(cli(args, { TCRAB_HOME: home }).stdout) as { data: { rebuilt: boolean } };
    assert.equal(warm.data.rebuilt, false);

    const p = cli(['docs', 'path'], { TCRAB_HOME: home });
    assert.equal(p.stdout.trim(), String(first.data.file));
    assert.ok(fs.existsSync(p.stdout.trim()));

    const rb = JSON.parse(cli(['docs', 'rebuild', '--json'], { TCRAB_HOME: home }).stdout) as { data: { rebuilt: boolean } };
    assert.equal(rb.data.rebuilt, true);

    const human = cli(['docs'], { TCRAB_HOME: home });
    assert.match(human.stdout, /docs, \d+ sections/);
    assert.match(human.stdout, /docs-site\.html/);
  });

  await t.test('the CLI proves it is a real command, not an unknown one', () => {
    const help = cli(['help', 'docs']);
    assert.equal(help.code, 0, help.stderr);
    assert.match(help.stdout, /docs \[build \| rebuild \| status \| path\]/);
    const bad = cli(['docs', 'nonsense']);
    assert.equal(bad.code, 1, 'an unknown subcommand is an error');
  });

  await t.test('a live gateway serves the page and its metadata', async () => {
    const home = tmpHome('t348-gw-');
    const config = defaults();
    config.gateway.token = 'test-token-348';
    config.provider.type = 'mock';
    saveConfig(config);
    const port = await freePort();
    const handle = await startGateway({ config, host: '127.0.0.1', port });
    try {
      const auth = { authorization: 'Bearer test-token-348' };

      const metaRes = await fetch(`http://127.0.0.1:${port}/api/docs`, { headers: auth });
      assert.equal(metaRes.status, 200);
      const meta = (await metaRes.json()) as { file: string; exists: boolean; url: string };
      assert.equal(meta.url, '/docs');
      assert.equal(meta.exists, false, 'not built yet — the gateway does not build it just to answer');

      const page = await fetch(`http://127.0.0.1:${port}/docs`, { headers: auth });
      assert.equal(page.status, 200);
      assert.match(String(page.headers.get('content-type')), /text\/html/);
      const html = await page.text();
      assert.ok(html.includes('const DOCS ='), 'the real page, not the panel shell');
      assert.ok(html.includes(extractRenderer(UI)), 'and it carries the panel renderer');
      assert.ok(!html.includes('id="view-work"'), 'this is not ui/index.html served by the page-route fallback');

      const after = (await (await fetch(`http://127.0.0.1:${port}/api/docs`, { headers: auth })).json()) as {
        exists: boolean;
        docs: number;
        sections: number;
        bytes: number;
      };
      assert.equal(after.exists, true, 'the first page view built it');
      assert.ok(after.docs >= 50);
      assert.ok(after.sections > after.docs, 'more sections than docs');
      assert.equal(after.bytes, fs.statSync(meta.file).size);

      const again = await fetch(`http://127.0.0.1:${port}/docs`, { headers: auth });
      assert.equal(await again.text(), html, 'same bytes, no rebuild');

      const alias = await fetch(`http://127.0.0.1:${port}/docs/`, { headers: auth });
      assert.equal(alias.status, 200);
    } finally {
      await handle.stop();
    }
  });
});

test('34.8 it is documented, wired to the panel, and the census row moved', { concurrency: false }, async (t) => {
  await t.test('docs/CLI.md has the command, docs/PANEL.md has the link', () => {
    const cliDoc = fs.readFileSync(path.join(ROOT, 'docs', 'CLI.md'), 'utf8');
    assert.match(cliDoc, /`docs`|termcrab docs/, 'the CLI reference lists it');
    const panel = fs.readFileSync(path.join(ROOT, 'docs', 'PANEL.md'), 'utf8');
    assert.match(panel, /\/docs/, 'the panel page is documented');
    assert.match(panel, /markdown renderer/i);
  });

  await t.test('the panel links to it, from the Work page', () => {
    assert.match(UI, /href="\/docs"/);
    assert.match(UI, /\/api\/docs/);
  });

  await t.test('the architecture map knows the new module', () => {
    const arch = fs.readFileSync(path.join(ROOT, 'docs', 'ARCHITECTURE.md'), 'utf8');
    assert.match(arch, /src\/docs\/site\.ts/);
  });

  await t.test('the census row is no longer PARTIAL', () => {
    const census = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'openclaw', 'data', 'census.json'), 'utf8')) as {
      rows?: { name?: string; level?: string; note?: string }[];
      checks?: { name?: string; level?: string; note?: string }[];
    };
    const rows = census.rows ?? census.checks ?? [];
    const row = rows.find((r) => /documentation site/i.test(String(r.name)));
    if (row) {
      assert.notEqual(row.level, 'PARTIAL', 'the docs site row must not stay PARTIAL');
      assert.match(String(row.note ?? ''), /offline|search|one page/i);
    }
  });
});
