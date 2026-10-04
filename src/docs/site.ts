/**
 * 34.8 — the documentation site: one self-contained HTML file, offline.
 *
 * The docs were 27 markdown files plus a 47 MB crawl. Reading them on a phone
 * meant opening a file manager and scrolling. This builds **one page** instead:
 *
 *   - every markdown file under `docs/` is embedded (generated crawl data is
 *     excluded by path, and the exclusion is printed, not silent)
 *   - the markdown renderer is **the panel's renderer**, extracted verbatim from
 *     `ui/index.html` at build time — there is no second implementation to
 *     drift, and the test asserts the extraction is byte-identical
 *   - search, navigation and rendering are inline: no network, no CDN, no
 *     service worker, no build tool. One file you can copy to a phone.
 *
 * It is served by the gateway at `GET /docs` (the panel links to it) and written
 * by `termcrab docs` to `state/docs-site.html`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PACKAGE_ROOT, stateDir, ensureLayout } from '../core/paths.js';

const RENDERER_START = '  // ==== markdown renderer (zero-dependency, mobile-first) ====';
const RENDERER_END = '  // ==== end markdown renderer ====';

export interface DocEntry {
  /** Stable id used in the URL hash and by search. */
  id: string;
  /** Path relative to the repo root, e.g. `docs/CLI.md`. */
  path: string;
  /** `docs` for the top level, otherwise the first folder (`openclaw`, `gap`). */
  group: string;
  title: string;
  md: string;
  bytes: number;
  sections: number;
}

export interface SiteOptions {
  /** Repo root (defaults to PACKAGE_ROOT). */
  root?: string;
  /** The markdown tree to embed (defaults to `<root>/docs`). */
  docsDir?: string;
  /** Path to the panel HTML the renderer is taken from. */
  uiPath?: string;
  /** Folders under docs/ to leave out (relative, POSIX separators). */
  exclude?: string[];
  /** Cap on embedded markdown; a doc past it is skipped **and reported**. */
  maxBytes?: number;
  now?: number;
  title?: string;
}

export interface BuiltSite {
  html: string;
  docs: DocEntry[];
  /** Total `##` headings across every included doc. */
  sections: number;
  /** Docs skipped by the byte cap or an exclusion, with the reason. */
  skipped: { path: string; reason: string }[];
  bytes: number;
  rendererBytes: number;
  builtAt: number;
}

/** Slice the markdown renderer out of the panel HTML — the one implementation. */
export function extractRenderer(uiHtml: string): string {
  const start = uiHtml.indexOf(RENDERER_START);
  if (start < 0) throw new Error(`the panel HTML has no renderer start marker (${RENDERER_START.trim()})`);
  const end = uiHtml.indexOf(RENDERER_END, start);
  if (end < 0) throw new Error('the panel HTML has no renderer end marker');
  const block = uiHtml.slice(start, end + RENDERER_END.length);
  if (!block.includes('function renderMarkdown')) {
    throw new Error('the extracted block does not contain renderMarkdown — the markers moved');
  }
  return block;
}

const slug = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'doc';

function firstHeading(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1]!.trim() : '';
}

function walkDocs(dir: string, base = ''): string[] {
  let out: string[] = [];
  let names: string[] = [];
  try {
    names = fs.readdirSync(dir).sort();
  } catch {
    return out;
  }
  for (const name of names) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const abs = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    let st: fs.Stats;
    try {
      st = fs.statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) out = out.concat(walkDocs(abs, rel));
    else if (name.endsWith('.md')) out.push(rel);
  }
  return out;
}

export const DEFAULT_EXCLUDES = ['openclaw/data'];

/** Where the markdown tree is: `<root>/docs`, or an explicit `docsDir`. */
function docsRootOf(opts: SiteOptions): string {
  const root = opts.root ?? PACKAGE_ROOT;
  return opts.docsDir ? path.resolve(opts.docsDir) : path.join(root, 'docs');
}

export function collectDocs(opts: SiteOptions = {}): { docs: DocEntry[]; skipped: { path: string; reason: string }[] } {
  const docsRoot = docsRootOf(opts);
  const exclude = opts.exclude ?? DEFAULT_EXCLUDES;
  const maxBytes = opts.maxBytes ?? 12 * 1024 * 1024;
  const skipped: { path: string; reason: string }[] = [];
  const docs: DocEntry[] = [];
  const seen = new Map<string, number>();
  let total = 0;

  for (const rel of walkDocs(docsRoot)) {
    const excluded = exclude.some((ex) => rel === ex || rel.startsWith(`${ex}/`));
    if (excluded) {
      skipped.push({ path: `docs/${rel}`, reason: `excluded path (${exclude.join(', ')})` });
      continue;
    }
    const abs = path.join(docsRoot, rel);
    let md: string;
    try {
      md = fs.readFileSync(abs, 'utf8');
    } catch {
      skipped.push({ path: `docs/${rel}`, reason: 'unreadable' });
      continue;
    }
    const bytes = Buffer.byteLength(md, 'utf8');
    if (total + bytes > maxBytes) {
      skipped.push({ path: `docs/${rel}`, reason: `over the ${Math.round(maxBytes / 1024 / 1024)} MB embedding cap` });
      continue;
    }
    total += bytes;
    const parts = rel.split('/');
    const group = parts.length > 1 ? parts[0]! : 'docs';
    let id = slug(rel);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    docs.push({
      id,
      path: `docs/${rel}`,
      group,
      title: firstHeading(md) || rel.replace(/\.md$/, ''),
      md,
      bytes,
      sections: (md.match(/^##\s+/gm) ?? []).length,
    });
  }
  docs.sort((a, b) => a.path.localeCompare(b.path));
  return { docs, skipped };
}

/**
 * Substitute the embedded JSON into the page script.
 *
 * Function replacements, not strings: a markdown file here contains shell
 * snippets with `$` in them, and `String.replace` with a string replacement
 * treats `$'`, `` $` `` and `$&` as backreferences — which silently spliced
 * SITE_JS into the middle of the docs JSON the first time this was built.
 */
function embedInto(template: string, data: Record<string, unknown>): string {
  let out = template;
  for (const [key, value] of Object.entries(data)) {
    out = out.replace(`__${key}__`, () => embedJson(value));
  }
  return out;
}

/** JSON that can live inside a `<script>` tag without closing it. */
function embedJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const CSS = `
:root { color-scheme: light dark; --bg:#fbfaf7; --fg:#1c1b19; --mut:#6b675f; --line:#e2ded6; --card:#fff; --accent:#c2410c; --code:#f4f1ea; }
@media (prefers-color-scheme: dark) { :root { --bg:#17161a; --fg:#ecebe6; --mut:#a09b90; --line:#302e33; --card:#1f1e23; --accent:#fb923c; --code:#26242b; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
header { position:sticky; top:0; z-index:5; display:flex; gap:.5rem; align-items:center; padding:.55rem .7rem; background:var(--card); border-bottom:1px solid var(--line); flex-wrap:wrap; }
header strong { font-size:.95rem; white-space:nowrap; }
#menu { border:1px solid var(--line); background:transparent; color:inherit; border-radius:8px; padding:.25rem .55rem; font-size:1rem; }
#q { flex:1 1 12rem; min-width:8rem; padding:.45rem .6rem; border:1px solid var(--line); border-radius:8px; background:var(--bg); color:inherit; font-size:.95rem; }
#count { color:var(--mut); font-size:.8rem; }
main { display:grid; grid-template-columns: 19rem 1fr; min-height:calc(100vh - 3rem); }
nav { border-right:1px solid var(--line); padding:.6rem; overflow:auto; max-height:calc(100vh - 3rem); position:sticky; top:3rem; }
nav h4 { margin:.7rem .35rem .25rem; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:var(--mut); }
nav a { display:block; padding:.25rem .4rem; border-radius:7px; color:inherit; text-decoration:none; font-size:.9rem; }
nav a:hover { background:var(--code); }
nav a.on { background:var(--code); font-weight:600; }
#doc { padding:1rem 1.1rem 4rem; max-width:52rem; overflow-wrap:anywhere; }
#doc .crumbs { color:var(--mut); font-size:.8rem; margin-bottom:.3rem; }
#doc h1 { font-size:1.45rem; margin:.2rem 0 .6rem; }
#doc h2 { font-size:1.15rem; margin:1.5rem 0 .4rem; padding-top:.6rem; border-top:1px solid var(--line); }
#doc h3 { font-size:1rem; margin:1.1rem 0 .3rem; }
#doc pre { background:var(--code); padding:.6rem .7rem; border-radius:9px; overflow:auto; font-size:.84rem; }
#doc code { background:var(--code); padding:.08rem .28rem; border-radius:5px; font-size:.86em; }
#doc pre code { background:none; padding:0; }
#doc table { border-collapse:collapse; width:100%; font-size:.86rem; display:block; overflow-x:auto; }
#doc th, #doc td { border:1px solid var(--line); padding:.3rem .45rem; text-align:left; vertical-align:top; }
#doc blockquote { margin:.5rem 0; padding:.1rem .8rem; border-left:3px solid var(--accent); color:var(--mut); }
#doc a { color:var(--accent); }
.mdCode { border:1px solid var(--line); border-radius:9px; overflow:hidden; margin:.5rem 0; }
.mdCodeBar { display:flex; justify-content:space-between; align-items:center; padding:.2rem .5rem; background:var(--code); font-size:.75rem; color:var(--mut); }
.mdCopy { border:1px solid var(--line); background:transparent; color:inherit; border-radius:6px; font-size:.72rem; }
#list { list-style:none; margin:0; padding:0; }
#list li { padding:.5rem .3rem; border-bottom:1px solid var(--line); cursor:pointer; }
#list li:hover { background:var(--code); }
#list b { display:block; font-size:.92rem; }
#list .h { color:var(--accent); font-size:.8rem; }
#list .s { color:var(--mut); font-size:.82rem; display:block; margin-top:.15rem; }
#nav2 { margin-top:1.6rem; display:flex; justify-content:space-between; gap:1rem; font-size:.85rem; }
.pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:.05rem .5rem; font-size:.72rem; color:var(--mut); }
@media (max-width: 760px) {
  main { grid-template-columns: 1fr; }
  nav { position:static; max-height:none; border-right:none; border-bottom:1px solid var(--line); }
  body.hide > main > nav { display:none; }
}
`;

const SITE_JS = String.raw`
const DOCS = __DOCS__;
const INDEX = __INDEX__;
const SKIPPED = __SKIPPED__;

function el(id) { return document.getElementById(id); }

function renderDoc(id, headingSlug) {
  const doc = DOCS.find((d) => d.id === id) || DOCS[0];
  if (!doc) return;
  const view = el('doc');
  view.innerHTML =
    '<div class="crumbs">' + mdEsc(doc.path) + ' · <span class="pill">' +
    mdEsc(doc.group) + '</span> · ' + doc.bytes + ' B</div>' + renderMarkdown(doc.md);
  // Headings get ids so a search hit can jump at the section.
  const heads = view.querySelectorAll('h2, h3');
  heads.forEach((h) => {
    h.id = doc.id + '~' + h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  });
  const i = DOCS.indexOf(doc);
  const prev = DOCS[i - 1], next = DOCS[i + 1];
  view.innerHTML +=
    '<div id="nav2">' +
    (prev ? '<a href="#' + prev.id + '">← ' + mdEsc(prev.title) + '</a>' : '<span></span>') +
    (next ? '<a href="#' + next.id + '">' + mdEsc(next.title) + ' →</a>' : '<span></span>') +
    '</div>';
  navOn(doc.id);
  el('q').value = '';
  el('list').innerHTML = '';
  el('count').textContent = doc.title + ' · ' + heads.length + ' sections';
  if (headingSlug) {
    const target = view.querySelector('#' + CSS.escape(headingSlug));
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  } else {
    window.scrollTo(0, 0);
  }
}

function navOn(id) {
  document.querySelectorAll('nav a').forEach((a) => a.classList.toggle('on', a.dataset.id === id));
}

function search(q) {
  const list = el('list');
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) { list.innerHTML = ''; el('count').textContent = DOCS.length + ' docs'; return; }
  const hits = [];
  for (const e of INDEX) {
    let score = 0, missed = false;
    for (const t of terms) {
      if (e.title.toLowerCase().includes(t)) score += 6;
      if (e.h && e.h.toLowerCase().includes(t)) score += 3;
      const at = e.hay.indexOf(t);
      if (at >= 0) score += 1;
      else missed = true;
    }
    if (!missed && score > 0) hits.push({ e, score });
  }
  hits.sort((a, b) => b.score - a.score);
  list.innerHTML = '';
  if (!hits.length) { el('count').textContent = 'no match'; return; }
  for (const { e } of hits.slice(0, 40)) {
    const li = document.createElement('li');
    const doc = DOCS[e.d];
    li.innerHTML =
      '<b>' + mdEsc(e.h || doc.title) + '</b>' +
      (e.h ? '<span class="h">' + mdEsc(doc.title) + '</span>' : '') +
      '<span class="s">' + mdEsc(snippet(e.hay, terms[0])) + '</span>';
    li.onclick = () => { location.hash = e.h ? doc.id + '~' + slug(e.h) : doc.id; renderDoc(doc.id, e.h ? slug(e.h) : ''); };
    list.appendChild(li);
  }
  el('count').textContent = hits.length + ' hit(s)';
}

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }

function snippet(hay, term) {
  const at = hay.indexOf(term);
  if (at < 0) return hay.slice(0, 140);
  const from = Math.max(0, at - 50);
  return (from ? '…' : '') + hay.slice(from, from + 150).replace(/\s+/g, ' ') + '…';
}

function buildNav() {
  const nav = document.querySelector('nav');
  const groups = {};
  for (const d of DOCS) (groups[d.group] = groups[d.group] || []).push(d);
  let html = '';
  for (const g of Object.keys(groups)) {
    html += '<h4>' + mdEsc(g) + '</h4>';
    for (const d of groups[g]) html += '<a href="#' + d.id + '" data-id="' + d.id + '">' + mdEsc(d.title) + '</a>';
  }
  if (SKIPPED.length) {
    html += '<h4>not included</h4>';
    for (const s of SKIPPED) html += '<div style="padding:.2rem .4rem;color:var(--mut);font-size:.75rem">' + mdEsc(s.path) + ' — ' + mdEsc(s.reason) + '</div>';
  }
  nav.innerHTML = html;
  nav.addEventListener('click', (ev) => {
    const a = ev.target.closest('a');
    if (a) { renderDoc(a.dataset.id, ''); }
  });
}

document.addEventListener('click', (ev) => {
  const b = ev.target.closest('.mdCopy');
  if (!b) return;
  const code = b.closest('.mdCode') && b.closest('.mdCode').querySelector('code');
  if (!code) return;
  const text = code.textContent || '';
  const done = () => { b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1200); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
  else done();
});

el('menu').onclick = () => document.body.classList.toggle('hide');
el('q').addEventListener('input', (e) => search(e.target.value));
window.addEventListener('hashchange', () => {
  const h = location.hash.replace(/^#/, '');
  const [id, sec] = h.split('~');
  if (id) renderDoc(id, sec || '');
});

buildNav();
const initial = location.hash.replace(/^#/, '').split('~');
renderDoc(initial[0] || (DOCS[0] && DOCS[0].id), initial[1] || '');
el('count').textContent = DOCS.length + ' docs';
`;

/**
 * One search entry per document **and per `##` section**, so a hit can point at
 * the section, not just the file. `title` is the document's title and is carried
 * on every entry because the scorer weights a title match above a body match —
 * leaving it out is not a scoring bug, it is a crash the moment anyone types
 * (caught by the test that executes this page's script for real).
 */
function buildIndex(docs: DocEntry[]): { d: number; title: string; h: string; hay: string }[] {
  const entries: { d: number; title: string; h: string; hay: string }[] = [];
  docs.forEach((doc, d) => {
    const sections = doc.md.split(/^##\s+/m);
    // The first block is the document up to the first `##`.
    entries.push({ d, title: doc.title, h: '', hay: `${doc.title}\n${sections[0]!.slice(0, 1200)}`.toLowerCase() });
    for (const raw of sections.slice(1)) {
      const nl = raw.indexOf('\n');
      const heading = (nl === -1 ? raw : raw.slice(0, nl)).trim();
      const body = (nl === -1 ? '' : raw.slice(nl + 1)).slice(0, 1500);
      entries.push({ d, title: doc.title, h: heading, hay: `${heading}\n${body}`.toLowerCase() });
    }
  });
  return entries;
}

export function buildDocsSite(opts: SiteOptions = {}): BuiltSite {
  const root = opts.root ?? PACKAGE_ROOT;
  const uiPath = opts.uiPath ?? path.join(root, 'ui', 'index.html');
  const renderer = extractRenderer(fs.readFileSync(uiPath, 'utf8'));
  const { docs, skipped } = collectDocs(opts);
  const index = buildIndex(docs);
  const title = opts.title ?? 'TermCrab docs — offline';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="docs-count" content="${docs.length}">
<meta name="docs-sections" content="${docs.reduce((a, d) => a + d.sections, 0)}">
<meta name="built-at" content="${opts.now ?? Date.now()}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<header>
  <button id="menu" type="button" title="toggle the list">☰</button>
  <strong>🦀 TermCrab docs</strong>
  <input id="q" type="search" placeholder="Search ${docs.length} docs…" autocomplete="off">
  <span id="count">${docs.length} docs</span>
</header>
<main>
  <nav></nav>
  <div id="doc">Loading…</div>
</main>
<script>
/* The markdown renderer below is cut verbatim out of ui/index.html at build
   time — the panel and this page cannot drift apart. */
${renderer}
${embedInto(SITE_JS, { DOCS: docs, INDEX: index, SKIPPED: skipped })}
</script>
</body>
</html>
`;
  const bytes = Buffer.byteLength(html, 'utf8');
  return {
    html,
    docs,
    sections: docs.reduce((a, d) => a + d.sections, 0),
    skipped,
    bytes,
    rendererBytes: Buffer.byteLength(renderer, 'utf8'),
    builtAt: opts.now ?? Date.now(),
  };
}

/** Where the built page lives inside the home. */
export function docsSitePath(): string {
  return path.join(stateDir(), 'docs-site.html');
}

export interface EnsureResult {
  file: string;
  bytes: number;
  docs: number;
  sections: number;
  builtAt: number;
  /** True when this call regenerated the file. */
  rebuilt: boolean;
}

/**
 * Build the page into the home, or reuse it when it is newer than every source
 * (the panel serves this; a stale page is the only failure mode worth avoiding).
 */
export function ensureDocsSite(opts: SiteOptions & { force?: boolean; out?: string } = {}): EnsureResult {
  ensureLayout();
  const root = opts.root ?? PACKAGE_ROOT;
  const file = opts.out ?? docsSitePath();
  const docsRoot = docsRootOf(opts);
  const sources = [
    opts.uiPath ?? path.join(root, 'ui', 'index.html'),
    ...collectDocs(opts).docs.map((d) => path.join(docsRoot, d.path.replace(/^docs\//, ''))),
  ];
  let newest = 0;
  for (const s of sources) {
    try {
      newest = Math.max(newest, fs.statSync(s).mtimeMs);
    } catch {
      /* a source that vanished is not a reason to fail */
    }
  }
  try {
    const st = fs.statSync(file);
    if (!opts.force && st.mtimeMs >= newest && st.size > 1024) {
      // Trust the cached page but report the numbers from its own build stamp.
      const head = fs.readFileSync(file, 'utf8').slice(0, 4096);
      const docs = Number(/name="docs-count" content="(\d+)"/.exec(head)?.[1] ?? 0);
      const sections = Number(/name="docs-sections" content="(\d+)"/.exec(head)?.[1] ?? 0);
      const builtAt = Number(/name="built-at" content="(\d+)"/.exec(head)?.[1] ?? 0);
      return { file, bytes: st.size, docs, sections, builtAt, rebuilt: false };
    }
  } catch {
    /* build it */
  }
  const built = buildDocsSite(opts);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, built.html, 'utf8');
  return {
    file,
    bytes: built.bytes,
    docs: built.docs.length,
    sections: built.sections,
    builtAt: built.builtAt,
    rebuilt: true,
  };
}
