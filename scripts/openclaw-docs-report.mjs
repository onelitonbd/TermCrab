#!/usr/bin/env node
/**
 * openclaw-docs-report.mjs — turn a checkout of OpenClaw's docs/ tree into a
 * per-document catalogue of the entire docs.openclaw.ai website.
 *
 * Every documented page gets its own section. The catalogue is generated, never
 * hand-edited, so it can be regenerated after every OpenClaw release and the
 * diff is readable.
 *
 * Usage:
 *   node scripts/openclaw-docs-report.mjs --docs /path/to/openclaw/docs
 *   OCLAW_DOCS=/path/to/docs node scripts/openclaw-docs-report.mjs
 *
 * Get the source tree (no build, no deps, ~30 MB):
 *   git clone --filter=blob:none --no-checkout --depth 1 \
 *     https://github.com/openclaw/openclaw.git .cache/openclaw
 *   cd .cache/openclaw && git sparse-checkout set docs && git checkout
 *
 * Outputs (all under docs/openclaw/):
 *   data/catalog.json     machine-readable index of every page
 *   00-SITE-MAP.md        the website's tab/group tree + full route index
 *   sections/*.md         one file per tab (large tabs split by group),
 *                         one section per documented page
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
function flag(name, fallback = null) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
const DOCS_DIR = path.resolve(
  flag('--docs') || process.env.OCLAW_DOCS || path.join(ROOT, '.cache', 'openclaw', 'docs'),
);
const OUT_DIR = path.resolve(flag('--out') || path.join(ROOT, 'docs', 'openclaw'));
const SITE = process.env.OCLAW_SITE || 'https://docs.openclaw.ai';
const FETCHED_AT = new Date().toISOString().slice(0, 10);

if (!fs.existsSync(DOCS_DIR)) {
  console.error(`docs directory not found: ${DOCS_DIR}`);
  console.error('pass --docs <path> or set OCLAW_DOCS');
  process.exit(2);
}

// ---------------------------------------------------------------- frontmatter

/** Minimal YAML frontmatter reader: scalars, block scalars, and simple lists. */
function parseFrontmatter(text) {
  const out = {};
  if (!text.startsWith('---')) return { fm: out, body: text };
  const end = text.indexOf('\n---', 3);
  if (end < 0) return { fm: out, body: text };
  const head = text.slice(3, end);
  const body = text.slice(end + 4);
  let key = null;
  let indent = 0;
  let listKey = null;
  for (const raw of head.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const m = /^(\s*)([A-Za-z0-9_-]+):\s*(.*)$/.exec(raw);
    if (m) {
      const [, spaces, k, v] = m;
      indent = spaces.length;
      key = k;
      listKey = null;
      let val = v.trim();
      if (val === '' || val === '|' || val === '>' || val === '|-' || val === '>-') {
        out[key] = [];
        listKey = key;
      } else {
        val = val.replace(/^["']|["']$/g, '');
        out[key] = val;
      }
      continue;
    }
    const item = /^\s*-\s+(.*)$/.exec(raw);
    if (item && listKey) {
      out[listKey].push(item[1].replace(/^["']|["']$/g, '').trim());
      continue;
    }
    if (key && raw.trim() && typeof out[key] === 'string') out[key] += ' ' + raw.trim();
  }
  for (const k of Object.keys(out)) {
    if (Array.isArray(out[k]) && out[k].length === 0) out[k] = typeof out[k] === 'string' ? out[k] : '';
  }
  return { fm: out, body };
}

// --------------------------------------------------------------------- routes

function routeFor(rel) {
  let r = rel.replace(/\\/g, '/').replace(/\.mdx?$/, '');
  if (r === 'index') return '/';
  r = r.replace(/\/index$/, '');
  return '/' + r;
}

// -------------------------------------------------------------------- content

const COMPONENT_RE = /^<(Card|CardGroup|Columns|Column|Steps|Step|Tabs|Tab|Accordion|AccordionGroup|Note|Warning|Tip|Info|Check|Frame|CodeGroup|Expandable|Icon|Badge|Snippet|Callout|Panel|Tooltip)\b/;

function plain(md) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstParagraph(body) {
  const lines = body.split('\n');
  const buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('#')) {
      if (buf.length) break;
      continue;
    }
    if (!t) {
      if (buf.length) break;
      continue;
    }
    if (COMPONENT_RE.test(t) || t.startsWith('---') || t.startsWith('<p') || t.startsWith('<img')) {
      if (buf.length) break;
      continue;
    }
    buf.push(t);
    if (buf.join(' ').length > 320) break;
  }
  return plain(buf.join(' ')).slice(0, 400);
}

function headings(body) {
  const h2 = [];
  const h3 = [];
  let inCode = false;
  for (const line of body.split('\n')) {
    if (line.trim().startsWith('```')) inCode = !inCode;
    if (inCode) continue;
    const m2 = /^##\s+(.*)$/.exec(line);
    if (m2) {
      h2.push(plain(m2[1]));
      continue;
    }
    const m3 = /^###\s+(.*)$/.exec(line);
    if (m3) h3.push(plain(m3[1]));
  }
  return { h2, h3 };
}

function stats(body) {
  const code = (body.match(/```/g) || []).length >> 1;
  const words = plain(body).split(/\s+/).filter(Boolean).length;
  return { words, codeBlocks: code, lines: body.split('\n').length };
}

const CLI_RE = /\bopenclaw ([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*)?)/g;
const CONFIG_RE = /`((?:agents|channels|gateway|tools|skills|memory|models|providers|hooks|session|compaction|contextPruning|mcp|cron|sandbox|security|plugins|nodes|web|logging|diagnostics)\.[a-zA-Z0-9_.*\[\]-]+)`/g;

function mentions(body) {
  const cli = new Set();
  for (const m of body.matchAll(CLI_RE)) cli.add(m[1].trim());
  const cfg = new Set();
  for (const m of body.matchAll(CONFIG_RE)) cfg.add(m[1]);
  return { cli: [...cli].sort(), config: [...cfg].sort() };
}

// ------------------------------------------------- TermCrab relevance tagging
//
// Each rule maps a page to an area of TermCrab's source and states, from
// verified evidence only, where TermCrab stands. Evidence strings use
// file:line in *this* repository.

const STATUS = {
  WORKING: 'WORKING',
  PARTIAL: 'PARTIAL',
  ABSENT: 'ABSENT',
  BROKEN: 'BROKEN',
  BETTER: 'BETTER',
};

/** @type {{match: RegExp, area: string, status: string, note: string}[]} */
const RULES = [
  // --- channels
  { match: /^\/channels\/telegram/, area: 'channels', status: STATUS.WORKING, note: 'Long-poll bot, allowlist, chunking, offline outbox — `src/channels/telegram.ts`; only 4 slash commands vs OpenClaw\'s documented set.' },
  { match: /^\/channels\/whatsapp/, area: 'channels', status: STATUS.PARTIAL, note: 'Optional Baileys adapter `src/channels/whatsapp.ts`; needs an out-of-tree native install.' },
  { match: /^\/channels\/(discord|slack|signal|sms|matrix)/, area: 'channels', status: STATUS.PARTIAL, note: 'Adapter exists and is wired in `src/gateway/server.ts:37-41`, but each needs an optional third-party dep — not installable from Termux by default.' },
  { match: /^\/channels/, area: 'channels', status: STATUS.ABSENT, note: 'Channel not implemented. TermCrab wires 7 adapters (`src/gateway/server.ts:37-48`) against OpenClaw\'s 30+.' },
  // --- agent / runtime
  { match: /agent-loop|concepts\/queue|queue-steering/, area: 'agent', status: STATUS.BROKEN, note: '`SessionQueue` exists (`src/agent/sessions.ts:269`) but `dequeue()` has no call site — every documented queue mode is inert.' },
  { match: /^\/concepts\/(session|session-state)|session-pruning/, area: 'sessions', status: STATUS.PARTIAL, note: 'JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.' },
  { match: /compaction/, area: 'context', status: STATUS.BROKEN, note: 'Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw\'s "history stays on disk".' },
  { match: /^\/concepts\/memory|memory-search|memory-builtin|active-memory/, area: 'memory', status: STATUS.PARTIAL, note: 'MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.' },
  { match: /system-prompt|context-engine|^\/concepts\/context/, area: 'context', status: STATUS.PARTIAL, note: 'Prompt assembled in `src/agent/prompt.ts`; no context-engine plugin interface, no /context introspection.' },
  // --- tools
  { match: /tools\/browser/, area: 'tools', status: STATUS.PARTIAL, note: 'CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.' },
  { match: /tools\/code-mode|code_exec/, area: 'tools', status: STATUS.PARTIAL, note: '`code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw\'s QuickJS code-mode contract.' },
  { match: /tools\/subagents|tools\/swarm|parallel-specialist/, area: 'agents', status: STATUS.PARTIAL, note: '`sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.' },
  { match: /tools\/skills|skill-workshop|tools\/creating-skills/, area: 'skills', status: STATUS.PARTIAL, note: 'SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.' },
  { match: /tools\/exec-approvals|approvals/, area: 'security', status: STATUS.BROKEN, note: 'Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.' },
  { match: /tools\/tts|tools\/(stt|media|image)/, area: 'media', status: STATUS.PARTIAL, note: 'Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.' },
  { match: /^\/tools/, area: 'tools', status: STATUS.PARTIAL, note: '~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw\'s plugin-provided tool surface.' },
  // --- plugins / extension model
  { match: /^\/plugins/, area: 'plugins', status: STATUS.ABSENT, note: 'No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.' },
  { match: /^\/clawhub/, area: 'plugins', status: STATUS.ABSENT, note: 'No registry, no signing, no publishing path. TermCrab\'s trade-off: no supply chain to poison.' },
  // --- gateway
  { match: /gateway\/(authentication|security|protocol|pairing)/, area: 'gateway', status: STATUS.BROKEN, note: '`checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.' },
  { match: /^\/gateway\/protocol/, area: 'gateway', status: STATUS.ABSENT, note: 'TermCrab speaks HTTP + SSE (`src/gateway/server.ts:713`), not a typed WebSocket wire protocol with idempotency keys.' },
  { match: /^\/gateway/, area: 'gateway', status: STATUS.PARTIAL, note: 'Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.' },
  // --- cli / tui
  { match: /^\/cli\/tui|^\/web\/tui/, area: 'tui', status: STATUS.ABSENT, note: 'No TUI at all: no raw mode, no alternate screen (grep for `setRawMode`/`1049` over `src/` returns nothing).' },
  { match: /^\/cli/, area: 'cli', status: STATUS.PARTIAL, note: '23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.' },
  // --- providers / models
  { match: /^\/providers/, area: 'providers', status: STATUS.PARTIAL, note: 'One OpenAI-compatible client with host presets (`src/providers/openai.ts`, `src/providers/index.ts:10-18`); no native Anthropic/Gemini adapters, no OAuth flows.' },
  { match: /^\/concepts\/models|model-failover|models$/, area: 'providers', status: STATUS.PARTIAL, note: 'Failover chain + cooldowns implemented; no model catalog, no per-model capability table, no usage accounting.' },
  // --- automation
  { match: /^\/automation\/cron|cron-jobs/, area: 'automation', status: STATUS.PARTIAL, note: 'Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.' },
  { match: /^\/automation\/hooks|^\/plugins\/hooks/, area: 'hooks', status: STATUS.ABSENT, note: 'No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).' },
  { match: /standing-orders|taskflow|^\/automation\/tasks/, area: 'automation', status: STATUS.ABSENT, note: 'Heartbeat + cron exist (`src/agent/heartbeat.ts`), but no standing orders, no task boards.' },
  { match: /^\/automation\/webhooks|webhooks/, area: 'automation', status: STATUS.ABSENT, note: 'No inbound webhook endpoint.' },
  // --- install & platforms
  { match: /^\/install/, area: 'install', status: STATUS.BETTER, note: 'TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw\'s.' },
  { match: /^\/platforms\/android|^\/nodes/, area: 'platforms', status: STATUS.BETTER, note: 'Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.' },
  { match: /^\/platforms/, area: 'platforms', status: STATUS.PARTIAL, note: 'Runs on any Node host; no native desktop/mobile companion apps.' },
  { match: /^\/nodes/, area: 'platforms', status: STATUS.PARTIAL, note: 'One device (the host it runs on); no paired node mesh.' },
  // --- web ui
  { match: /^\/web\/(control-ui|dashboards|cron|sessions)/, area: 'web', status: STATUS.PARTIAL, note: 'One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.' },
  { match: /^\/web/, area: 'web', status: STATUS.PARTIAL, note: 'Mobile-first single-file control UI on :7788.' },
  // --- security
  { match: /^\/security|^\/gateway\/security/, area: 'security', status: STATUS.PARTIAL, note: 'Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.' },
  // --- reference / ops
  { match: /reference\/database-schemas/, area: 'storage', status: STATUS.PARTIAL, note: 'Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.' },
  { match: /reference\/(token-use|usage)/, area: 'ops', status: STATUS.ABSENT, note: 'No token/cost accounting; `ChatResult` carries no usage field into the UI.' },
  { match: /^\/reference/, area: 'reference', status: STATUS.PARTIAL, note: 'Reference material only; compare against the corresponding TermCrab module before acting.' },
  // --- economy / infra
  { match: /cloud-workers|cloud-sessions|fleet|workboard/, area: 'scale', status: STATUS.ABSENT, note: 'Single-process, single-device by design. No worker pool, no cloud sessions, no fleet.' },
  { match: /^\/ci|^\/contributing/, area: 'ci', status: STATUS.PARTIAL, note: '`npm test` + one CI workflow (`ci/github-actions.yml`) vs OpenClaw\'s lint/type/test budgets and contract tests per channel.' },
  { match: /^\/help|^\/releases|^\/announcements/, area: 'docs', status: STATUS.PARTIAL, note: 'TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.' },
];

function tagFor(route, title, summary) {
  const hay = `${route} ${title || ''} ${summary || ''}`;
  for (const r of RULES) if (r.match.test(hay)) return r;
  return null;
}

// --------------------------------------------------------------- navigation

function loadNavigation() {
  const p = path.join(DOCS_DIR, 'docs.json');
  if (!fs.existsSync(p)) return { tabs: [], groups: new Map(), order: new Map() };
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const tabs = (j?.navigation?.languages?.[0]?.tabs) || j?.navigation?.tabs || [];
  const groups = new Map(); // route -> {tab, group}
  const order = new Map(); // route -> index
  let i = 0;
  const walk = (nodes, tab, group) => {
    for (const n of nodes || []) {
      if (typeof n === 'string') {
        groups.set(n, { tab, group });
        if (!order.has(n)) order.set(n, i++);
      } else if (n && typeof n === 'object') {
        if (n.group) walk(n.pages, tab, n.group);
        else if (n.pages) walk(n.pages, tab, group);
        else if (n.page) {
          groups.set(n.page, { tab, group });
          if (!order.has(n.page)) order.set(n.page, i++);
        }
      }
    }
  };
  for (const t of tabs) walk(t.groups || t.pages || [], t.tab, null);
  return { tabs, groups, order, redirects: j?.redirects || [] };
}

// -------------------------------------------------------------------- crawl

function loadPages() {
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue; // .i18n, .generated
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.mdx?$/.test(entry.name)) continue;
      const rel = path.relative(DOCS_DIR, full).replace(/\\/g, '/');
      const text = fs.readFileSync(full, 'utf8');
      const { fm, body } = parseFrontmatter(text);
      const route = routeFor(rel);
      const h = headings(body);
      const s = stats(body);
      const title =
        (typeof fm.title === 'string' && fm.title) ||
        (typeof fm.sidebarTitle === 'string' && fm.sidebarTitle) ||
        (/^#\s+(.*)$/m.exec(body)?.[1] ?? route);
      const summary =
        (typeof fm.summary === 'string' && fm.summary) || firstParagraph(body) || '';
      pages.push({
        route,
        slug: rel.replace(/\.mdx?$/, ''),
        file: `docs/${rel}`,
        title: plain(String(title)),
        sidebarTitle: typeof fm.sidebarTitle === 'string' ? fm.sidebarTitle : null,
        summary: plain(String(summary)),
        readWhen: Array.isArray(fm.read_when) ? fm.read_when : [],
        h2: h.h2,
        h3count: h.h3.length,
        words: s.words,
        codeBlocks: s.codeBlocks,
        lines: s.lines,
        mentions: mentions(body),
      });
    }
  };
  walk(DOCS_DIR);
  return pages;
}

// ------------------------------------------------------------------ render

function sectionFor(p, nav) {
  const loc = nav.groups.get(p.slug);
  const bits = [];
  bits.push(`### \`${p.route}\` — ${p.title}`);
  bits.push('');
  const meta = [`**${p.title}**`];
  if (loc) meta.push(`*${loc.tab}${loc.group ? ' › ' + loc.group : ''}*`);
  else meta.push('*not linked from the site navigation*');
  bits.push(meta.join(' · '));
  bits.push('');
  if (p.summary) {
    bits.push(`> ${p.summary.replace(/\n+/g, ' ')}`);
    bits.push('');
  }
  const facts = [`source \`${p.file}\``, `${p.lines} lines`, `${p.words} words`];
  if (p.codeBlocks) facts.push(`${p.codeBlocks} code blocks`);
  bits.push(`<sub>${facts.join(' · ')}</sub>`);
  bits.push('');
  if (p.readWhen.length) {
    bits.push(`**Read when:** ${p.readWhen.join(' · ')}`);
    bits.push('');
  }
  if (p.h2.length) {
    const shown = p.h2.slice(0, 14);
    const extra = p.h2.length - shown.length;
    bits.push(
      `**Covers:** ${shown.join(' · ')}${extra > 0 ? ` · _+${extra} more_` : ''}${
        p.h3count ? ` <sub>(${p.h3count} sub-sections)</sub>` : ''
      }`,
    );
    bits.push('');
  }
  const cli = p.mentions.cli.slice(0, 8);
  if (cli.length) {
    bits.push(`**CLI:** ${cli.map((c) => '`openclaw ' + c + '`').join(', ')}`);
    bits.push('');
  }
  if (p.mentions.config.length) {
    bits.push(`**Config:** ${p.mentions.config.slice(0, 8).map((c) => '`' + c + '`').join(', ')}`);
    bits.push('');
  }
  const tag = tagFor(p.route, p.title, p.summary);
  if (tag) {
    bits.push(`**TermCrab — ${tag.area}: ${tag.status}.** ${tag.note}`);
    bits.push('');
  }
  const url = p.route === '/' ? `${SITE}/` : `${SITE}${p.route}`;
  bits.push(`<sub>live: [${url.replace('https://', '')}](${url})</sub>`);
  bits.push('');
  bits.push('---');
  bits.push('');
  return bits.join('\n');
}

/** GitHub-compatible heading anchor, so the generated table of contents links. */
function githubSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\- ]/g, '')
    .replace(/\s+/g, '-');
}

function chunkTitle(label) {
  return label
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function writeSections(pages, nav) {
  const byTab = new Map();
  for (const p of pages) {
    const loc = nav.groups.get(p.slug);
    const tab = loc?.tab || 'Reference';
    const group = loc?.group || 'Pages outside the navigation';
    if (!byTab.has(tab)) byTab.set(tab, new Map());
    const g = byTab.get(tab);
    if (!g.has(group)) g.set(group, []);
    g.get(group).push(p);
  }
  fs.mkdirSync(path.join(OUT_DIR, 'sections'), { recursive: true });

  // Jobs: one file per website tab, plus a tail file for pages the nav does not
  // link. `--split-groups` breaks large tabs into one file per nav group.
  const splitGroups = argv.includes('--split-groups');
  const jobs = [];
  const tabNames = nav.tabs.length ? nav.tabs.map((t) => t.tab) : [...byTab.keys()];
  for (const tab of tabNames) {
    const groups = byTab.get(tab);
    if (!groups) continue;
    const linked = [...groups.entries()].filter(([g]) => g !== 'Pages outside the navigation');
    const total = linked.reduce((a, [, l]) => a + l.length, 0);
    if (splitGroups && total > 200) {
      for (const [group, list] of linked) jobs.push({ label: `${tab} — ${group}`, list, group });
    } else {
      jobs.push({ label: tab, list: linked.flatMap(([, l]) => l), group: null });
    }
  }
  const orphans = [...byTab.values()].flatMap((g) => g.get('Pages outside the navigation') || []);
  if (orphans.length) {
    jobs.push({ label: 'Pages outside the navigation', list: orphans, group: null, orphans: true });
  }

  const written = [];
  let n = 0;
  for (const job of jobs) {
    n += 1;
    const prefix = String(n).padStart(2, '0');
    const name = `${prefix}-${chunkTitle(job.label)}.md`;
    const lines = [];
    lines.push(`# ${job.label}`);
    lines.push('');
    lines.push(
      `<sub>Generated catalogue of **${job.list.length} documented page${
        job.list.length === 1 ? '' : 's'
      }** on [docs.openclaw.ai](${SITE}) · source: OpenClaw \`docs/\` tree · generated ${FETCHED_AT} by \`scripts/openclaw-docs-report.mjs\`.</sub>`,
    );
    lines.push('');
    lines.push(
      '> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).',
    );
    lines.push('');
    if (job.orphans) {
      lines.push(
        'These pages are published on the site but are not linked from a sidebar — mostly the 163 per-plugin reference pages, reached from the plugin index. They are catalogued separately so nothing on the website goes uncounted.',
      );
      lines.push('');
    }
    const sorted = [...job.list].sort((a, b) => {
      const oa = nav.order.get(a.slug);
      const ob = nav.order.get(b.slug);
      if (oa !== undefined || ob !== undefined) return (oa ?? 1e6) - (ob ?? 1e6);
      return a.route.localeCompare(b.route);
    });
    lines.push('## Contents');
    lines.push('');
    for (const p of sorted) {
      lines.push(`- [\`${p.route}\`](#${githubSlug(`\`${p.route}\` — ${p.title}`)}) — ${p.title}`);
    }
    lines.push('');
    lines.push('## Document sections');
    lines.push('');
    for (const p of sorted) lines.push(sectionFor(p, nav));
    const out = path.join(OUT_DIR, 'sections', name);
    fs.writeFileSync(out, lines.join('\n').replace(/\n{3,}/g, '\n\n'));
    written.push({ file: `sections/${name}`, label: job.label, pages: job.list.length });
  }
  return written;
}

function writeSiteMap(pages, nav, written) {
  const lines = [];
  const routed = pages.filter((p) => nav.groups.has(p.slug));
  const orphans = pages.filter((p) => !nav.groups.has(p.slug));
  lines.push('# docs.openclaw.ai — the whole website, mapped');
  lines.push('');
  lines.push(
    `<sub>Generated ${FETCHED_AT} from the OpenClaw \`docs/\` tree by \`scripts/openclaw-docs-report.mjs\`. Site root: [${SITE}](${SITE}).</sub>`,
  );
  lines.push('');
  lines.push('## Numbers');
  lines.push('');
  lines.push('| | count |');
  lines.push('|---|---:|');
  lines.push(`| documented pages in the tree | **${pages.length}** |`);
  lines.push(`| pages linked from the site navigation | ${routed.length} |`);
  lines.push(`| pages that exist but are not in the nav | ${orphans.length} |`);
  lines.push(`| top-level tabs | ${nav.tabs.length} |`);
  lines.push(`| words of documentation | ${pages.reduce((a, p) => a + p.words, 0).toLocaleString('en-US')} |`);
  lines.push(`| fenced code blocks | ${pages.reduce((a, p) => a + p.codeBlocks, 0).toLocaleString('en-US')} |`);
  lines.push('');
  lines.push('## The tab tree');
  lines.push('');
  for (const t of nav.tabs) {
    const inTab = routed.filter((p) => nav.groups.get(p.slug)?.tab === t.tab);
    lines.push(`### ${t.tab} — ${inTab.length} pages`);
    lines.push('');
    const groups = new Map();
    for (const p of inTab) {
      const g = nav.groups.get(p.slug)?.group || '(ungrouped)';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(p);
    }
    for (const [g, list] of groups) {
      lines.push(`- **${g}** (${list.length}): ` + list.map((p) => `[${p.route}](.)`).join(', '));
    }
    lines.push('');
  }
  lines.push('## Pages outside the navigation');
  lines.push('');
  lines.push(
    `These ${orphans.length} pages are published but not linked from a sidebar — mostly the per-plugin reference pages, which are reached from [\`/plugins\`](${SITE}/plugins).`,
  );
  lines.push('');
  for (const p of orphans.sort((a, b) => a.slug.localeCompare(b.slug))) {
    lines.push(`- \`${p.route}\` — ${p.title}`);
  }
  lines.push('');
  lines.push('## Where each part of the site is catalogued');
  lines.push('');
  lines.push('| catalogue file | pages | website area |');
  lines.push('|---|---:|---|');
  for (const w of written) lines.push(`| [\`${w.file}\`](${w.file}) | ${w.pages} | ${w.label} |`);
  lines.push('');
  lines.push(`Total catalogued: **${written.reduce((a, w) => a + w.pages, 0)} pages**.`);
  lines.push('');
  fs.writeFileSync(path.join(OUT_DIR, '00-SITE-MAP.md'), lines.join('\n').replace(/\n{3,}/g, '\n\n'));
}

// ---------------------------------------------------------------------- main

function main() {
  fs.mkdirSync(path.join(OUT_DIR, 'data'), { recursive: true });
  const nav = loadNavigation();
  const pages = loadPages();
  const written = writeSections(pages, nav);
  writeSiteMap(pages, nav, written);

  const catalog = pages
    .map((p) => {
      const tag = tagFor(p.route, p.title, p.summary);
      return {
        route: p.route,
        slug: p.slug,
        file: p.file,
        title: p.title,
        summary: p.summary,
        tab: nav.groups.get(p.slug)?.tab || null,
        group: nav.groups.get(p.slug)?.group || null,
        inNav: nav.groups.has(p.slug),
        h2: p.h2,
        words: p.words,
        lines: p.lines,
        readWhen: p.readWhen,
        cli: p.mentions.cli,
        config: p.mentions.config,
        termcrab: tag ? { area: tag.area, status: tag.status, note: tag.note } : null,
      };
    })
    .sort((a, b) => a.route.localeCompare(b.route));
  fs.writeFileSync(
    path.join(OUT_DIR, 'data', 'catalog.json'),
    JSON.stringify({ generated: FETCHED_AT, site: SITE, count: catalog.length, pages: catalog }, null, 1),
  );

  console.log(`pages parsed      : ${pages.length}`);
  console.log(`catalogue files   : ${written.length} (docs/openclaw/sections/)`);
  console.log(`site map          : docs/openclaw/00-SITE-MAP.md`);
  console.log(`machine index     : docs/openclaw/data/catalog.json`);
  const tagged = catalog.filter((c) => c.termcrab).length;
  console.log(`pages with a TermCrab tag: ${tagged}`);
}

main();
