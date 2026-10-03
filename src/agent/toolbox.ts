import { formatSessionHits, searchSessions } from './session-search.js';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Tool, ToolEnv } from './tools.js';
import { resolveInRoots } from './tools.js';
import { home, userSkillsDir, stateDir } from '../core/paths.js';
import { notify } from '../mobile/notify.js';
import { canvasUpdate, canvasRemove, canvasList, canvasGet } from '../gateway/canvas.js';
import {
  loadCrons,
  addCron,
  removeCron,
  setCronEnabled,
} from '../cron/store.js';
import { parseCron, CronParseError, nextRun } from '../cron/parser.js';
import { saveConfig } from '../core/config.js';
import { parseFrontmatter } from '../core/frontmatter.js';
import { channelsWithDocuments, sendDocumentTo } from '../channels/conversations.js';
import { formatInbox, listInbox, readArrival } from '../channels/inbox.js';
import { acceptIncoming } from '../channels/media.js';
import {
  listIntents,
  addIntent,
  removeIntent,
} from './intents.js';
import {
  listGoals,
  createGoal,
  getGoal,
  updateGoal,
} from './goals.js';
import { suggest, dismiss, listSuggestions } from './suggestions.js';
import { getProgress, updateProgress, clearProgress } from './progress.js';
import { ask } from './ask.js';
import { listTasks, getTask, waitForTasks } from './tasks.js';
import {
  listSecrets,
  setSecret,
  requestSecret,
  deleteSecret,
} from './secrets.js';
import {
  listConversations,
  sendTo,
  turn as convoTurn,
} from '../channels/conversations.js';
import { listPortals, addPortal, removePortal } from '../gateway/portal.js';

const execFileAsync = promisify(execFile);

/** Local helpers (tools.ts keeps its own private versions). */
function argStr(args: Record<string, unknown>, key: string, required = true): string {
  const v = args[key];
  if (typeof v === 'string' && v.trim()) return v;
  if (required) throw new Error(`missing required argument: ${key}`);
  return '';
}
function clip(text: string, max = 20_000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n... [truncated ${text.length - max} chars]`;
}
function rootsOf(env: ToolEnv): string[] {
  return [home(), process.cwd(), ...(env.extraRoots ?? [])];
}

// ---------------------------------------------------------------------------
// web_search: DuckDuckGo HTML scrape (no API key needed).
// ---------------------------------------------------------------------------

/** Parse DDG HTML results; exported for fixture-based tests. */
export function parseDdgResults(html: string, max = 6): { title: string; url: string; snippet: string }[] {
  const out: { title: string; url: string; snippet: string }[] = [];
  const seen = new Set<string>();
  const anchors = html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi);
  const hrefs: string[] = [];
  const titles: string[] = [];
  for (const m of anchors) {
    hrefs.push(m[1] ?? '');
    titles.push(stripTags(m[2] ?? ''));
  }
  const snippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|td|div|span)>/gi)].map((m) =>
    stripTags(m[1] ?? ''),
  );
  for (let i = 0; i < hrefs.length && out.length < max; i++) {
    let url = hrefs[i] ?? '';
    const uddg = /[?&]uddg=([^&]+)/.exec(url);
    if (uddg) {
      try {
        url = decodeURIComponent(uddg[1] ?? '');
      } catch {
        /* keep raw */
      }
    }
    if (url.startsWith('//')) url = 'https:' + url;
    if (!/^https?:\/\//i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: titles[i] || url, url, snippet: snippets[out.length] ?? '' });
  }
  return out;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function duckDuckGo(query: string): Promise<string> {
  const attempts = [
    { url: 'https://html.duckduckgo.com/html/', body: `q=${encodeURIComponent(query)}` },
    { url: 'https://lite.duckduckgo.com/lite/', body: `q=${encodeURIComponent(query)}` },
  ];
  let lastErr = '';
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'user-agent': 'TermCrab/0.1 (+https://github.com/onelitonbd/claw)',
        },
        body: a.body,
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = (await res.text()).slice(0, 2_000_000);
      const results = parseDdgResults(html);
      if (!results.length) throw new Error('no results parsed');
      return results
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}${r.snippet ? `\n   ${r.snippet}` : ''}`)
        .join('\n');
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`web search failed: ${lastErr}`);
}

// ---------------------------------------------------------------------------
// view_image: header parsing (no native deps).
// ---------------------------------------------------------------------------

export function imageInfo(buf: Buffer, bytes: number): { format: string; width?: number; height?: number } {
  // PNG
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // GIF
  const sig3 = buf.toString('latin1', 0, 3);
  if ((sig3 === 'GIF' || buf.toString('latin1', 0, 6) === 'GIF87a' || buf.toString('latin1', 0, 6) === 'GIF89a') && buf.length > 10) {
    return { format: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  // JPEG
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let off = 2;
    while (off + 9 < buf.length) {
      if (buf[off] !== 0xff) break;
      const marker = buf[off + 1] ?? 0;
      const len = buf.readUInt16BE(off + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'jpeg', height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7) };
      }
      off += 2 + len;
    }
    return { format: 'jpeg' };
  }
  // BMP
  if (buf.length > 26 && buf[0] === 0x42 && buf[1] === 0x4d) {
    return { format: 'bmp', width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)) };
  }
  // WebP
  if (buf.length > 30 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = buf.toString('latin1', 12, 16);
    if (chunk === 'VP8X') {
      const w = 1 + (buf.readUIntLE(24, 3) || 0);
      const h = 1 + (buf.readUIntLE(27, 3) || 0);
      return { format: 'webp', width: w, height: h };
    }
    if (chunk === 'VP8 ') {
      const w = buf.readUInt16LE(26) & 0x3fff;
      const h = buf.readUInt16LE(28) & 0x3fff;
      return { format: 'webp', width: w, height: h };
    }
    if (chunk === 'VP8L') {
      const b = buf.readUInt32LE(21);
      return { format: 'webp', width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    return { format: 'webp' };
  }
  void bytes;
  return { format: 'unknown' };
}

// ---------------------------------------------------------------------------
// helpers for automations/reminders
// ---------------------------------------------------------------------------

function reminderSchedule(at: string): string {
  const trimmed = at.trim();
  let when: Date;
  const rel = /^(\d+)([mhd])$/i.exec(trimmed);
  if (rel) {
    const n = Number(rel[1]);
    const unit = (rel[2] ?? 'm').toLowerCase();
    const ms = unit === 'm' ? n * 60_000 : unit === 'h' ? n * 3_600_000 : n * 86_400_000;
    when = new Date(Date.now() + ms);
  } else {
    when = new Date(trimmed);
    if (Number.isNaN(when.getTime())) {
      throw new Error('at must be an ISO date (2026-10-01T09:00:00) or relative (30m, 2h, 1d)');
    }
  }
  if (when.getTime() <= Date.now()) throw new Error('reminder time is in the past');
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${when.getMinutes()} ${when.getHours()} ${when.getDate()} ${when.getMonth() + 1} *`;
}

function fmtCronJob(c: { id: string; name: string; schedule: string; enabled: boolean; oneShot?: boolean }): string {
  let next = '';
  try {
    const nx = nextRun(parseCron(c.schedule));
    if (nx) next = ` · next ${nx.toLocaleString()}`;
  } catch {
    next = ' · (bad schedule)';
  }
  return `${c.enabled ? '[on] ' : '[off]'} ${c.id} ${c.name} · ${c.schedule}${c.oneShot ? ' · once' : ''}${next}`;
}

// ---------------------------------------------------------------------------
// The toolbox: every user-facing capability the catalog lists.
// ---------------------------------------------------------------------------

export function extraTools(env: ToolEnv): Tool[] {
  const tools: Tool[] = [];
  const roots = rootsOf(env);

  tools.push({
    def: {
      name: 'edit',
      description: 'Exact single-file replacement: replace an exact string in a file. Fails if not found (or ambiguous without all=true).',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          find: { type: 'string', description: 'Exact text to find (must match once unless all=true)' },
          replace: { type: 'string', description: 'Replacement text' },
          all: { type: 'boolean', description: 'Replace every occurrence (default false: exactly one match required)' },
        },
        required: ['path', 'find', 'replace'],
      },
    },
    async execute(args) {
      const target = resolveInRoots(argStr(args, 'path'), roots);
      const find = argStr(args, 'find');
      const replace = String(args.replace ?? '');
      const all = args.all === true;
      const src = fs.readFileSync(target, 'utf8');
      const count = src.split(find).length - 1;
      if (count === 0) throw new Error('find text not present in file');
      if (!all && count > 1) throw new Error(`${count} matches — make find unique or set all=true`);
      const out = all ? src.split(find).join(replace) : src.replace(find, replace);
      fs.writeFileSync(target, out, 'utf8');
      return `replaced ${all ? count : 1} occurrence(s) in ${target}`;
    },
  });

  tools.push({
    def: {
      name: 'apply_patch',
      description: 'Apply a unified diff patch (---/+++/@@ hunks) to files. --- /dev/null creates a new file.',
      schema: {
        type: 'object',
        properties: { patch: { type: 'string', description: 'Unified diff text' } },
        required: ['patch'],
      },
    },
    async execute(args) {
      const patch = argStr(args, 'patch');
      const lines = patch.replace(/\r\n/g, '\n').split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      const applied: string[] = [];
      let i = 0;
      while (i < lines.length) {
        const line = lines[i] ?? '';
        if (!line.startsWith('--- ')) {
          i++;
          continue;
        }
        const oldPath = (line.slice(4).split('\t')[0] ?? '').trim();
        const plus = lines[i + 1] ?? '';
        if (!plus.startsWith('+++ ')) throw new Error('missing +++ header after ---');
        const newPath = (plus.slice(4).split('\t')[0] ?? '').trim();
        if (newPath === '/dev/null') throw new Error('deleting files via patch is not supported');
        i += 2;
        const isNew = oldPath === '/dev/null' || oldPath === '';
        const rel = (isNew ? newPath : oldPath).replace(/^[ab]\//, '');
        const target = resolveInRoots(rel, roots);
        const orig = isNew ? ([] as string[]) : fs.readFileSync(target, 'utf8').split('\n');
        const out: string[] = [];
        let srcIdx = 0;
        while (i < lines.length) {
          const l = lines[i] ?? '';
          if (l.startsWith('@@')) {
            const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(l);
            if (!m) throw new Error(`bad hunk header: ${l}`);
            const startLine = Math.max(1, Number(m[1] || 1));
            while (srcIdx < startLine - 1) {
              out.push(orig[srcIdx] ?? '');
              srcIdx++;
            }
            i++;
            while (i < lines.length) {
              const hl = lines[i] ?? '';
              if (hl.startsWith('@@') || hl.startsWith('--- ') || hl.startsWith('diff ') || hl.startsWith('index ')) break;
              const tag = hl[0];
              const text = hl.slice(1);
              if (tag === '+') {
                out.push(text);
                i++;
              } else if (tag === '-') {
                if (orig[srcIdx] !== text) {
                  throw new Error(`context mismatch at ${rel}:${srcIdx + 1} — expected "${text}", found "${orig[srcIdx] ?? '(eof)'}"`);
                }
                srcIdx++;
                i++;
              } else if (tag === ' ' || hl === '') {
                if (!isNew && (orig[srcIdx] ?? '') !== text) {
                  throw new Error(`context mismatch at ${rel}:${srcIdx + 1} — expected "${text}", found "${orig[srcIdx] ?? '(eof)'}"`);
                }
                out.push(orig[srcIdx] ?? '');
                srcIdx++;
                i++;
              } else if (hl.startsWith('\\')) {
                i++; // "\ No newline at end of file"
              } else {
                break;
              }
            }
            continue;
          }
          if (l.startsWith('--- ') || l.startsWith('diff ') || l.startsWith('index ')) break;
          i++;
        }
        while (srcIdx < orig.length) {
          out.push(orig[srcIdx] ?? '');
          srcIdx++;
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, out.join('\n'), 'utf8');
        applied.push(rel);
      }
      if (!applied.length) throw new Error('no file hunks found in patch');
      return `patched ${applied.length} file(s): ${applied.join(', ')}`;
    },
  });

  tools.push({
    def: {
      name: 'view_image',
      description: 'Inspect an image file: format, dimensions and size (png/jpeg/gif/webp/bmp).',
      schema: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
    async execute(args) {
      const target = resolveInRoots(argStr(args, 'path'), roots);
      const stat = fs.statSync(target);
      if (!stat.isFile()) throw new Error('not a file');
      const fd = fs.openSync(target, 'r');
      const head = Buffer.alloc(4096);
      const n = fs.readSync(fd, head, 0, 4096, 0);
      fs.closeSync(fd);
      const info = imageInfo(head.subarray(0, n), stat.size);
      const dims = info.width && info.height ? `${info.width}x${info.height}` : 'unknown dimensions';
      return `${path.basename(target)}: ${info.format}, ${dims}, ${stat.size} bytes, modified ${new Date(stat.mtimeMs).toISOString()}`;
    },
  });

  tools.push({
    def: {
      name: 'web_search',
      description: 'Search the web (DuckDuckGo) and get titled results with URLs and snippets.',
      schema: {
        type: 'object',
        properties: { query: { type: 'string' }, maxResults: { type: 'number' } },
        required: ['query'],
      },
    },
    async execute(args) {
      const query = argStr(args, 'query');
      const max = Math.max(1, Math.min(10, typeof args.maxResults === 'number' ? args.maxResults : 6));
      const text = await duckDuckGo(query);
      return clip(text.split('\n').filter((l) => /^\d+\./.test(l.trim()) || l.startsWith('   ')).slice(0, max * 3).join('\n') || text, 8000);
    },
  });

  tools.push({
    def: {
      name: 'screen',
      description: 'Read the device status screen (version, provider, counts) or push an on-screen/push notification.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['read', 'notify'] },
          title: { type: 'string', description: 'notify only' },
          text: { type: 'string', description: 'notify only' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'notify') {
        const title = argStr(args, 'title') || 'TermCrab';
        const text = argStr(args, 'text', false) || title;
        await notify(title.slice(0, 100), text.slice(0, 400));
        return `notification sent: ${title}`;
      }
      if (action !== 'read') throw new Error('action must be read or notify');
      const crons = loadCrons().filter((c) => c.enabled).length;
      const sessions = env.sessions ? env.sessions.list().length : 0;
      const tasks = listTasks().filter((t) => t.status === 'running').length;
      const suggestions = listSuggestions('pending').length;
      return [
        `device screen @ ${new Date().toLocaleString()}`,
        `provider: ${env.providerLabel || env.config.provider.type}`,
        `sessions: ${sessions} · active jobs: ${crons} · running tasks: ${tasks}`,
        `pending suggestions: ${suggestions} · memory embeddings: ${env.config.memory.embeddings ? 'on' : 'off'}`,
        `agent: ${env.config.agent.name} · exec: ${env.config.agent.allowExec ? 'allowed' : 'blocked'}`,
      ].join('\n');
    },
  });

  tools.push({
    def: {
      name: 'automations',
      description: 'Manage scheduled jobs and one-shot reminders: list/create/enable/disable/remove/remind.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'create', 'enable', 'disable', 'remove', 'remind'] },
          id: { type: 'string' },
          name: { type: 'string', description: 'create/remind' },
          schedule: { type: 'string', description: 'create: 5-field cron or @daily' },
          prompt: { type: 'string', description: 'create/remind: what the agent should do' },
          at: { type: 'string', description: 'remind: ISO time or 30m/2h/1d' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'list') {
        const jobs = loadCrons();
        if (!jobs.length) return 'no scheduled jobs yet';
        return jobs.map(fmtCronJob).join('\n');
      }
      if (action === 'create') {
        const schedule = argStr(args, 'schedule');
        try {
          parseCron(schedule);
        } catch (e) {
          if (e instanceof CronParseError) throw new Error(`bad schedule: ${e.message}`);
          throw e;
        }
        const job = addCron({ name: argStr(args, 'name'), schedule, prompt: argStr(args, 'prompt') });
        return `created job ${job.id} (${fmtCronJob(job)})`;
      }
      if (action === 'remind') {
        const schedule = reminderSchedule(argStr(args, 'at'));
        const prompt = argStr(args, 'prompt');
        const job = addCron({
          name: argStr(args, 'name') || 'reminder',
          schedule,
          prompt,
          oneShot: true,
        });
        return `reminder set for ${new Date(nextRun(parseCron(schedule)) ?? Date.now()).toLocaleString()} (job ${job.id})`;
      }
      const id = argStr(args, 'id');
      if (action === 'enable') {
        const j = setCronEnabled(id, true);
        if (!j) throw new Error('job not found');
        return `enabled ${j.name}`;
      }
      if (action === 'disable') {
        const j = setCronEnabled(id, false);
        if (!j) throw new Error('job not found');
        return `disabled ${j.name}`;
      }
      if (action === 'remove') {
        if (!removeCron(id)) throw new Error('job not found');
        return `removed ${id}`;
      }
      throw new Error('action must be list/create/enable/disable/remove/remind');
    },
  });

  tools.push({
    def: {
      name: 'dashboard',
      description: 'Manage dashboard widgets: read or set which homepage widgets are visible (hero, chips, progress, tasks).',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['read', 'set'] },
          widgets: { type: 'object', description: 'e.g. {"hero": true, "chips": false}' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      const current = env.config.dashboard?.widgets ?? { hero: true, chips: true, progress: true, tasks: true };
      if (action === 'read') {
        return Object.entries(current).map(([k, v]) => `${v ? 'on' : 'off'} ${k}`).join('\n');
      }
      if (action === 'set') {
        const widgets = (args.widgets ?? {}) as Record<string, unknown>;
        const allowed = new Set(['hero', 'chips', 'progress', 'tasks']);
        const next: Record<string, boolean> = { ...current };
        for (const [k, v] of Object.entries(widgets)) {
          if (!allowed.has(k)) throw new Error(`unknown widget: ${k} (allowed: ${[...allowed].join(', ')})`);
          next[k] = Boolean(v);
        }
        env.config.dashboard = { widgets: next };
        saveConfig(env.config);
        return `dashboard updated: ${Object.entries(next).map(([k, v]) => `${v ? 'on' : 'off'} ${k}`).join(', ')}`;
      }
      throw new Error('action must be read or set');
    },
  });

  tools.push({
    def: {
      name: 'portal',
      description: 'Expose a local HTTP server through the gateway: add/list/remove portals (URL: /portal/<id>/ with ?token=).',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list', 'remove'] },
          id: { type: 'string', description: 'short name, e.g. "notes"' },
          port: { type: 'number', description: 'local port to expose (add)' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'list') {
        const list = listPortals();
        if (!list.length) return 'no portals exposed';
        return list.map((p) => `${p.id} -> 127.0.0.1:${p.port} (use /portal/${p.id}/?token=<gateway token>)`).join('\n');
      }
      if (action === 'add') {
        const port = Number(args.port);
        const p = addPortal(argStr(args, 'id'), port);
        return `portal "${p.id}" exposes 127.0.0.1:${p.port} at /portal/${p.id}/ (add ?token=<gateway token>)`;
      }
      if (action === 'remove') {
        if (!removePortal(argStr(args, 'id'))) throw new Error('portal not found');
        return 'portal removed';
      }
      throw new Error('action must be add/list/remove');
    },
  });

  // ---- conversations ----
  tools.push({
    def: {
      name: 'conversations_list',
      description: 'List external conversation addresses the channels have seen (telegram/whatsapp/...).',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      const list = listConversations();
      if (!list.length) return 'no external conversations yet';
      return list.map((c) => `${c.channel}:${c.address} · last ${new Date(c.lastSeen).toLocaleString()}${c.lastText ? ` · "${c.lastText}"` : ''}`).join('\n');
    },
  });
  tools.push({
    def: {
      name: 'conversations_send',
      description: 'Send a message directly to an external conversation (no reply is waited for).',
      schema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'telegram | whatsapp | ...' },
          address: { type: 'string', description: 'chat id / jid' },
          text: { type: 'string' },
        },
        required: ['channel', 'address', 'text'],
      },
    },
    async execute(args) {
      await sendTo(argStr(args, 'channel'), argStr(args, 'address'), argStr(args, 'text'));
      return 'sent';
    },
  });
  tools.push({
    def: {
      name: 'inbox_list',
      description:
        'List what was sent to you through a chat (photos, documents, voice notes) — newest first, ' +
        'with size, age and whether its text was saved. Use it when the user refers to something ' +
        'they sent earlier instead of asking them for a path.',
      schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'how many arrivals to list (default 10)' },
        },
      },
    },
    async execute(args) {
      const raw = args.limit;
      const limit = typeof raw === 'number' && raw > 0 ? Math.min(50, Math.floor(raw)) : 10;
      return formatInbox(listInbox({ limit }));
    },
  });

  tools.push({
    def: {
      name: 'inbox_read',
      description:
        'Read the text of a file that was sent to you (a PDF/DOCX/photo/voice note in the inbox). ' +
        'Returns the text saved when it arrived, or reads the file again if needed.',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'file name from inbox_list, e.g. 2026-10-03T10-00-00-rent.pdf' },
        },
        required: ['name'],
      },
    },
    async execute(args) {
      const name = argStr(args, 'name');
      const read = readArrival(name);
      if (!read.ok) throw new Error(read.reason);
      if (read.source === 'sidecar') {
        return read.gone
          ? `${read.text}\n\n(the file itself was trimmed by the disk budget — this is the text saved when it arrived)`
          : read.text;
      }
      return `${read.text}\n\n(read from the file just now)`;
    },
  });

  tools.push({
    def: {
      name: 'send_file',
      description:
        'Send a local file (photo, PDF, …) to a chat through a configured channel. ' +
        'With no address it goes to the most recent conversation on that channel.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'file to send (inside the workspace/home)' },
          caption: { type: 'string', description: 'short note to send with it' },
          channel: { type: 'string', description: 'telegram | whatsapp | … (default: the only channel that can send files)' },
          address: { type: 'string', description: 'chat id / jid (default: the last conversation on that channel)' },
        },
        required: ['path'],
      },
    },
    async execute(args) {
      const requested = argStr(args, 'path');
      if (!requested) throw new Error('path is required');
      const file = resolveInRoots(requested, [home(), process.cwd(), ...(env.extraRoots ?? [])]);
      if (!fs.existsSync(file)) throw new Error(`no file at ${requested}`);
      const size = fs.statSync(file).size;
      const allowed = acceptIncoming({ name: path.basename(file), size });
      if (!allowed.ok) throw new Error(`refusing to send ${path.basename(file)}: ${allowed.reason}`);
      const channels = channelsWithDocuments();
      if (!channels.length) throw new Error('no channel on this device can send files yet (Telegram is the one that can)');
      const channel = argStr(args, 'channel') || channels[0]!;
      const address = argStr(args, 'address') || undefined;
      const caption = argStr(args, 'caption') || undefined;
      const sent = await sendDocumentTo(channel, address, file, caption);
      return `sent ${path.basename(file)} (${Math.max(1, Math.round(size / 1024))} KB) to ${sent.channel}:${sent.address}`;
    },
  });
  tools.push({
    def: {
      name: 'conversations_turn',
      description: 'Send a message to an external conversation and wait for the correlated reply.',
      schema: {
        type: 'object',
        properties: {
          channel: { type: 'string' },
          address: { type: 'string' },
          text: { type: 'string' },
          timeoutSec: { type: 'number', description: 'default 60, max 120' },
        },
        required: ['channel', 'address', 'text'],
      },
    },
    async execute(args) {
      const timeoutSec = Math.max(5, Math.min(120, typeof args.timeoutSec === 'number' ? args.timeoutSec : 60));
      const t = convoTurn(argStr(args, 'channel'), argStr(args, 'address'), argStr(args, 'text'), timeoutSec * 1000);
      await t.send;
      const reply = await t.reply;
      return `reply after ~${timeoutSec}s window: ${reply}`;
    },
  });

  // ---- sessions ----
  const requireSessions = () => {
    if (!env.sessions) throw new Error('sessions are unavailable in this context');
    return env.sessions;
  };
  const spawn = (sessionId: string, prompt: string) => {
    if (!env.spawnTask) throw new Error('background spawning is unavailable in this context');
    return env.spawnTask(sessionId, prompt);
  };

  tools.push({
    def: {
      name: 'sessions_list',
      description: 'List visible chat sessions with message counts and sizes.',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      const list = requireSessions().list();
      if (!list.length) return 'no sessions yet';
      return list.map((s) => `${s.id} · ${s.messages} msgs · ${Math.max(1, Math.round(s.bytes / 1024))} KB · ${new Date(s.modified).toISOString().slice(0, 16)}`).join('\n');
    },
  });
  tools.push({
    def: {
      name: 'sessions_history',
      description: 'Read a session\u2019s recent messages (role, time, content).',
      schema: {
        type: 'object',
        properties: { sessionId: { type: 'string' }, limit: { type: 'number' } },
        required: ['sessionId'],
      },
    },
    async execute(args) {
      const store = requireSessions();
      const sid = argStr(args, 'sessionId');
      const entries = store.read(sid);
      if (!entries.length) throw new Error(`no history for session: ${sid}`);
      const limit = Math.max(1, Math.min(40, typeof args.limit === 'number' ? args.limit : 20));
      return entries
        .slice(-limit)
        .map((e) => {
          const body = e.role === 'tool' ? `[tool ${e.name}] ${e.result}` : e.content;
          return `[${e.role} ${new Date(e.ts).toISOString().slice(11, 19)}] ${String(body).slice(0, 400)}`;
        })
        .join('\n');
    },
  });
  tools.push({
    def: {
      name: 'sessions_search',
      description: 'Search past sessions for text; returns session id, role and a snippet per hit.',
      schema: {
        type: 'object',
        properties: { query: { type: 'string' }, sessionId: { type: 'string', description: 'optional: search one session' },
        },
        required: ['query'],
      },
    },
    async execute(args) {
      const store = requireSessions();
      // 21.2: ranked, archive-inclusive search — the same function the CLI and
      // the chat use, so "find that conversation" behaves the same everywhere.
      const query = argStr(args, 'query');
      const hits = searchSessions(query, { limit: 20, sessionId: args.sessionId ? String(args.sessionId) : undefined }, store);
      if (!hits.length) return `no matches for "${query}"`;
      return clip(formatSessionHits(query, hits), 8000);
    },
  });
  tools.push({
    def: {
      name: 'sessions_send',
      description: 'Message another session: queues a background agent turn in that session and returns its task id.',
      schema: {
        type: 'object',
        properties: { sessionId: { type: 'string' }, prompt: { type: 'string' } },
        required: ['sessionId', 'prompt'],
      },
    },
    async execute(args) {
      const sid = argStr(args, 'sessionId');
      const task = spawn(sid, argStr(args, 'prompt'));
      return `queued task ${task.id} in session ${sid} (check with subagents / agents_wait)`;
    },
  });
  tools.push({
    def: {
      name: 'sessions',
      description: 'Session settings: info/reset/delete/rename/set_owner.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['info', 'reset', 'delete', 'rename', 'set_owner'] },
          sessionId: { type: 'string' },
          to: { type: 'string', description: 'rename target / owner agent name' },
        },
        required: ['action', 'sessionId'],
      },
    },
    async execute(args) {
      const store = requireSessions();
      const sid = argStr(args, 'sessionId');
      const action = argStr(args, 'action');
      if (action === 'info') {
        const s = store.list().find((x) => x.id === sid);
        if (!s) throw new Error('session not found');
        const owner = readOwners()[sid] ?? '(none)';
        return `${s.id}\nmessages: ${s.messages} · bytes: ${s.bytes} · modified ${new Date(s.modified).toISOString()}\nowner: ${owner}`;
      }
      if (action === 'reset') {
        store.reset(sid);
        return `session cleared: ${sid}`;
      }
      if (action === 'delete') {
        if (!store.delete(sid)) throw new Error('session not found');
        return `session deleted: ${sid}`;
      }
      if (action === 'rename') {
        const r = store.rename(sid, argStr(args, 'to'));
        if (r !== 'ok') throw new Error(`rename failed: ${r}`);
        return `renamed ${sid} -> ${argStr(args, 'to')}`;
      }
      if (action === 'set_owner') {
        const owners = readOwners();
        owners[sid] = argStr(args, 'to');
        fs.mkdirSync(stateDir(), { recursive: true });
        fs.writeFileSync(path.join(stateDir(), 'session-owners.json'), JSON.stringify(owners, null, 2), 'utf8');
        return `owner of ${sid} set to ${owners[sid]}`;
      }
      throw new Error('action must be info/reset/delete/rename/set_owner');
    },
  });
  tools.push({
    def: {
      name: 'session_status',
      description: 'Current session status: id, provider/model, message usage, time and background task count.',
      schema: {
        type: 'object',
        properties: { sessionId: { type: 'string', description: 'defaults to the current session' } },
      },
    },
    async execute(args) {
      const sid = argStr(args, 'sessionId', false) || env.sessionId || 'default';
      const s = env.sessions ? env.sessions.list().find((x) => x.id === sid) : undefined;
      const running = listTasks().filter((t) => t.status === 'running').length;
      return [
        `session: ${sid}`,
        `provider: ${env.providerLabel || env.config.provider.type} · model: ${env.config.provider.model || '-'}`,
        `messages: ${s?.messages ?? '?'} · size: ${s ? Math.max(1, Math.round(s.bytes / 1024)) : '?'} KB`,
        `last activity: ${s ? new Date(s.modified).toLocaleString() : 'unknown'}`,
        `background tasks running: ${running} · local time: ${new Date().toLocaleString()}`,
      ].join('\n');
    },
  });

  // ---- subagent tasks ----
  tools.push({
    def: {
      name: 'sessions_spawn',
      description: 'Spawn a subagent: run a prompt in its own session in the background; returns the task id.',
      schema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          sessionId: { type: 'string', description: 'target session (default: a fresh one)' },
          label: { type: 'string', description: 'short label for the task list' },
        },
        required: ['prompt'],
      },
    },
    async execute(args) {
      const sid = argStr(args, 'sessionId', false) || `sub:${Date.now().toString(36)}`;
      const task = spawn(sid, argStr(args, 'prompt'));
      if (args.label) task.label = String(args.label).slice(0, 80);
      return `spawned subagent task ${task.id} (session ${sid}) — poll subagents or call agents_wait`;
    },
  });
  tools.push({
    def: {
      name: 'subagents',
      description: 'Subagent status: list tasks or show one task (running/done/error with output).',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'status'] },
          id: { type: 'string', description: 'status only' },
        },
      },
    },
    async execute(args) {
      const action = argStr(args, 'action', false) || 'list';
      if (action === 'status') {
        const t = getTask(argStr(args, 'id'));
        if (!t) throw new Error('task not found');
        return [
          `${t.id} · ${t.status}${t.label ? ` · ${t.label}` : ''}`,
          `session: ${t.sessionId}`,
          `prompt: ${t.prompt.slice(0, 200)}`,
          t.status === 'running' ? `running since ${new Date(t.started).toLocaleTimeString()}` : '',
          t.error ? `error: ${t.error}` : '',
          t.output ? `output: ${t.output.slice(0, 1000)}` : '',
        ].filter(Boolean).join('\n');
      }
      const list = listTasks();
      if (!list.length) return 'no subagent tasks yet';
      return list
        .slice(-20)
        .map((t) => `${t.id} ${t.status}${t.label ? ` (${t.label})` : ''} -> ${t.sessionId} · ${t.prompt.slice(0, 70).replace(/\n/g, ' ')}`)
        .join('\n');
    },
  });
  tools.push({
    def: {
      name: 'agents_wait',
      description: 'Wait for background subagent tasks to finish (all running ones, or specific ids) and return their outputs.',
      schema: {
        type: 'object',
        properties: {
          taskIds: { type: 'array', items: { type: 'string' }, description: 'default: every running task' },
          timeoutSec: { type: 'number', description: 'default 60, max 120' },
        },
      },
    },
    async execute(args) {
      const ids = Array.isArray(args.taskIds) ? args.taskIds.map(String) : undefined;
      const timeoutSec = Math.max(5, Math.min(120, typeof args.timeoutSec === 'number' ? args.timeoutSec : 60));
      const done = await waitForTasks(ids, timeoutSec * 1000);
      if (!done.length) return 'no matching tasks';
      return done
        .map((t) => {
          const head = `${t.id} ${t.status} (${t.sessionId})`;
          if (t.status === 'running') return `${head} — still running after ${timeoutSec}s`;
          if (t.status === 'error') return `${head}\nerror: ${t.error}`;
          return `${head}\noutput: ${(t.output ?? '').slice(0, 1500)}`;
        })
        .join('\n---\n');
    },
  });
  tools.push({
    def: {
      name: 'sessions_yield',
      description: 'End the turn while background tasks keep running: reports what is pending instead of waiting.',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      const running = listTasks().filter((t) => t.status === 'running');
      if (!running.length) return 'nothing pending — turn can end';
      return `ending turn with ${running.length} task(s) still running: ${running.map((t) => `${t.id}(${t.sessionId})`).join(', ')} — poll with subagents or agents_wait later`;
    },
  });

  // ---- session & agent management ----
  tools.push({
    def: {
      name: 'ask_user',
      description: 'Ask the operator a structured question and wait for their answer from the UI.',
      schema: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, description: 'optional choices to show' },
          timeoutSec: { type: 'number', description: 'default 60, max 120' },
        },
        required: ['question'],
      },
    },
    async execute(args) {
      const timeoutSec = Math.max(5, Math.min(120, typeof args.timeoutSec === 'number' ? args.timeoutSec : 60));
      const options = Array.isArray(args.options) ? args.options.map(String) : undefined;
      const answer = await ask(argStr(args, 'question'), options, timeoutSec * 1000);
      return `operator answered: ${answer}`;
    },
  });
  tools.push({
    def: {
      name: 'suggest_task',
      description: 'Record a follow-up task card for the operator (shows above the composer until dismissed).',
      schema: {
        type: 'object',
        properties: { title: { type: 'string' }, detail: { type: 'string' } },
        required: ['title'],
      },
    },
    async execute(args) {
      const s = suggest(argStr(args, 'title'), typeof args.detail === 'string' ? args.detail : undefined);
      return `suggested task ${s.id}: ${s.title}`;
    },
  });
  tools.push({
    def: {
      name: 'dismiss_task',
      description: 'Withdraw a pending suggestion card by id.',
      schema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    async execute(args) {
      if (!dismiss(argStr(args, 'id'))) throw new Error('suggestion not found');
      return 'dismissed';
    },
  });

  // ---- memory & context ----
  tools.push({
    def: {
      name: 'intent',
      description: 'Manage standing intents: durable directives injected into every reply. actions: list/add/remove.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'add', 'remove'] },
          text: { type: 'string', description: 'add' },
          id: { type: 'string', description: 'remove' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'list') {
        const list = listIntents();
        if (!list.length) return 'no standing intents';
        return list.map((i) => `${i.id} · ${i.text}`).join('\n');
      }
      if (action === 'add') {
        const i = addIntent(argStr(args, 'text'));
        return `intent added ${i.id}: ${i.text}`;
      }
      if (action === 'remove') {
        if (!removeIntent(argStr(args, 'id'))) throw new Error('intent not found');
        return 'intent removed';
      }
      throw new Error('action must be list/add/remove');
    },
  });
  tools.push({
    def: {
      name: 'create_goal',
      description: 'Create a tracked goal with an optional progress percentage.',
      schema: {
        type: 'object',
        properties: { title: { type: 'string' }, progress: { type: 'number' } },
        required: ['title'],
      },
    },
    async execute(args) {
      const g = createGoal(argStr(args, 'title'), typeof args.progress === 'number' ? args.progress : 0);
      return `goal created ${g.id}: ${g.title} (${g.progress}%)`;
    },
  });
  tools.push({
    def: {
      name: 'get_goal',
      description: 'List all goals, or fetch one by id/title when given.',
      schema: {
        type: 'object',
        properties: { id: { type: 'string', description: 'optional: id or title' } },
      },
    },
    async execute(args) {
      const id = argStr(args, 'id', false);
      if (id) {
        const g = getGoal(id);
        if (!g) throw new Error('goal not found');
        return `${g.id} "${g.title}" ${g.status} ${g.progress}%${g.notes.length ? `\nnotes: ${g.notes.join(' | ')}` : ''}`;
      }
      const list = listGoals();
      if (!list.length) return 'no goals';
      return list.map((g) => `${g.id} ${g.status === 'open' ? '[open]' : '[done]'} ${g.progress}% ${g.title}`).join('\n');
    },
  });
  tools.push({
    def: {
      name: 'update_goal',
      description: 'Update a goal: progress, status (open/done), title, or append a note.',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          progress: { type: 'number' },
          status: { type: 'string', enum: ['open', 'done'] },
          title: { type: 'string' },
          note: { type: 'string' },
        },
        required: ['id'],
      },
    },
    async execute(args) {
      const g = updateGoal(argStr(args, 'id'), {
        progress: typeof args.progress === 'number' ? args.progress : undefined,
        status: args.status === 'open' || args.status === 'done' ? args.status : undefined,
        title: typeof args.title === 'string' ? args.title : undefined,
        note: typeof args.note === 'string' ? args.note : undefined,
      });
      return `goal ${g.id} -> ${g.status} ${g.progress}%`;
    },
  });

  // ---- skills & configuration ----
  tools.push({
    def: {
      name: 'skill_workshop',
      description: 'Author/update/repair skills: create or overwrite skills/<name>/SKILL.md, check or repair its frontmatter.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'update', 'check', 'repair'] },
          name: { type: 'string', description: 'lowercase-with-dashes' },
          description: { type: 'string' },
          content: { type: 'string', description: 'full SKILL.md incl. frontmatter (create/update)' },
        },
        required: ['action', 'name'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      const name = argStr(args, 'name').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      if (!name) throw new Error('bad skill name');
      const file = path.join(userSkillsDir(), name, 'SKILL.md');
      const exists = fs.existsSync(file);
      if (action === 'create' || action === 'update') {
        if (action === 'create' && exists) throw new Error(`skill exists: ${name} (use update)`);
        let content = argStr(args, 'content');
        if (!content.startsWith('---')) {
          const desc = (typeof args.description === 'string' && args.description) || `Skill ${name}`;
          content = `---\nname: ${name}\ndescription: ${desc}\n---\n\n${content}`;
        }
        const fm = parseFrontmatter(content);
        if (!fm.data.description) throw new Error('frontmatter must include a description');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content.endsWith('\n') ? content : content + '\n', 'utf8');
        env.skills.list(); // rescan happens per call; nothing cached to invalidate
        return `${action === 'create' ? 'created' : 'updated'} skill ${name} at ${file}`;
      }
      if (!exists) throw new Error(`skill not found: ${name}`);
      const raw = fs.readFileSync(file, 'utf8');
      const fm = parseFrontmatter(raw);
      const problems: string[] = [];
      if (!fm.data.name) problems.push('missing frontmatter name');
      if (!fm.data.description) problems.push('missing frontmatter description');
      if (action === 'check') {
        return problems.length ? `${name}: ${problems.join('; ')}` : `${name}: ok`;
      }
      if (action === 'repair') {
        if (!problems.length) return `${name}: nothing to repair`;
        const desc =
          (typeof args.description === 'string' && args.description) ||
          (typeof fm.data.description === 'string' ? fm.data.description : '') ||
          `Skill ${name}`;
        const body = raw.startsWith('---') ? raw.replace(/^---[\s\S]*?---\n?/, '') : raw;
        const out = `---\nname: ${name}\ndescription: ${desc}\n---\n${body.startsWith('\n') ? body : '\n' + body}`;
        fs.writeFileSync(file, out.endsWith('\n') ? out : out + '\n', 'utf8');
        return `repaired ${name}: ${problems.join('; ')} -> frontmatter rewritten`;
      }
      throw new Error('action must be create/update/check/repair');
    },
  });
  tools.push({
    def: {
      name: 'github_identity_status',
      description: 'Inspect GitHub account/credential health (gh CLI auth + git identity) for this device.',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      const parts: string[] = [];
      try {
        const { stdout } = await execFileAsync('gh', ['auth', 'status'], { timeout: 8000 });
        parts.push(`gh auth: ${stdout.trim().split('\n').slice(0, 6).join('\n')}`);
      } catch (e) {
        const err = e as { code?: unknown; message?: string };
        if (err.code === 'ENOENT') parts.push('gh CLI: not installed (pkg install gh / brew install gh)');
        else parts.push(`gh auth: ${(e instanceof Error ? e.message : String(e)).slice(0, 300)}`);
      }
      for (const key of ['user.name', 'user.email']) {
        try {
          const { stdout } = await execFileAsync('git', ['config', '--get', key], { timeout: 4000 });
          parts.push(`git ${key}: ${stdout.trim() || '(unset)'}`);
        } catch {
          parts.push(`git ${key}: (unset)`);
        }
      }
      return parts.join('\n');
    },
  });
  tools.push({
    def: {
      name: 'secrets',
      description: 'Protected credentials: list metadata, request a value (audited), set, or delete.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'set', 'request', 'delete'] },
          name: { type: 'string' },
          value: { type: 'string', description: 'set only' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'list') {
        const list = listSecrets();
        if (!list.length) return 'no secrets stored';
        return list.map((s) => `${s.name} · updated ${new Date(s.updatedAt).toISOString().slice(0, 16)} · ${Math.round((Date.now() - s.updatedAt) / 86_400_000)}d ago`).join('\n');
      }
      if (action === 'set') {
        const meta = setSecret(argStr(args, 'name'), argStr(args, 'value'));
        return `secret saved: ${meta.name} (audited)`;
      }
      if (action === 'request') {
        const v = requestSecret(argStr(args, 'name'));
        if (v === null) throw new Error('secret not found');
        return v;
      }
      if (action === 'delete') {
        if (!deleteSecret(argStr(args, 'name'))) throw new Error('secret not found');
        return 'secret deleted (audited)';
      }
      throw new Error('action must be list/set/request/delete');
    },
  });

  // ---- progress ----
  tools.push({
    def: {
      name: 'progress_card',
      description: 'Maintain the session progress card (todo/doing/done lists shown to the operator).',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['get', 'set', 'clear'] },
          todo: { type: 'array', items: { type: 'string' } },
          doing: { type: 'array', items: { type: 'string' } },
          done: { type: 'array', items: { type: 'string' } },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const sid = env.sessionId || 'default';
      const action = argStr(args, 'action');
      if (action === 'get') {
        const card = getProgress(sid);
        if (!card) return 'no progress card for this session yet';
        return [
          `progress card · ${sid}`,
          `TODO: ${card.todo.length ? card.todo.join(' | ') : '-'}`,
          `DOING: ${card.doing.length ? card.doing.join(' | ') : '-'}`,
          `DONE: ${card.done.length ? card.done.join(' | ') : '-'}`,
        ].join('\n');
      }
      if (action === 'clear') {
        clearProgress(sid);
        return 'progress card cleared';
      }
      if (action === 'set') {
        const card = updateProgress(sid, {
          todo: Array.isArray(args.todo) ? args.todo.map(String) : undefined,
          doing: Array.isArray(args.doing) ? args.doing.map(String) : undefined,
          done: Array.isArray(args.done) ? args.done.map(String) : undefined,
        });
        return `progress card saved: ${card.todo.length} todo, ${card.doing.length} doing, ${card.done.length} done`;
      }
      throw new Error('action must be get/set/clear');
    },
  });

  // ---- phone tools (Termux:API) ----
  const termuxBin = (name: string): string => {
    return process.env.PREFIX ? `${process.env.PREFIX}/bin/${name}` : name;
  };

  tools.push({
    def: {
      name: 'sms_send',
      description: 'Send an SMS message via Termux:API. Requires termux-api package and SMS permission.',
      schema: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Phone number (e.g. +1234567890)' },
          text: { type: 'string', description: 'Message text' },
        },
        required: ['to', 'text'],
      },
    },
    async execute(args) {
      const to = argStr(args, 'to');
      const text = argStr(args, 'text');
      try {
        const { stdout } = await execFileAsync(termuxBin('termux-sms-send'), ['-n', to, text], { timeout: 10_000 });
        return `SMS sent to ${to}: ${stdout.trim() || 'ok'}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`sms_send failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  tools.push({
    def: {
      name: 'camera',
      description: 'Take a photo via Termux:API. Returns the file path of the captured image.',
      schema: {
        type: 'object',
        properties: {
          cameraId: { type: 'string', description: 'Camera ID (0=back, 1=front, default 0)' },
        },
      },
    },
    async execute(args) {
      const cameraId = argStr(args, 'cameraId', false) || '0';
      try {
        const { stdout } = await execFileAsync(termuxBin('termux-camera-photo'), ['-c', cameraId], { timeout: 15_000 });
        return `Photo captured: ${stdout.trim()}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`camera failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  tools.push({
    def: {
      name: 'location',
      description: 'Get current GPS location via Termux:API. Returns latitude, longitude, and address.',
      schema: {
        type: 'object',
        properties: {
          provider: { type: 'string', description: 'Location provider (gps/network, default gps)' },
        },
      },
    },
    async execute(args) {
      const provider = argStr(args, 'provider', false) || 'gps';
      try {
        const { stdout } = await execFileAsync(termuxBin('termux-location'), ['-p', provider], { timeout: 15_000 });
        return `Location: ${stdout.trim()}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`location failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  tools.push({
    def: {
      name: 'clipboard',
      description: 'Get or set clipboard content via Termux:API.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['get', 'set'] },
          text: { type: 'string', description: 'set: text to put on clipboard' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'get') {
        try {
          const { stdout } = await execFileAsync(termuxBin('termux-clipboard-get'), [], { timeout: 5000 });
          return `Clipboard: ${stdout.trim()}`;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`clipboard get failed: ${msg}`);
        }
      }
      if (action === 'set') {
        const text = argStr(args, 'text');
        try {
          await execFileAsync(termuxBin('termux-clipboard-set'), [text], { timeout: 5000 });
          return 'Clipboard set';
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`clipboard set failed: ${msg}`);
        }
      }
      throw new Error('action must be get or set');
    },
  });

  tools.push({
    def: {
      name: 'battery',
      description: 'Get battery status via Termux:API. Returns percentage, charging state, and health.',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      try {
        const { stdout } = await execFileAsync(termuxBin('termux-battery-status'), [], { timeout: 5000 });
        return `Battery: ${stdout.trim()}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`battery failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  tools.push({
    def: {
      name: 'contacts',
      description: 'List device contacts via Termux:API. Returns names and phone numbers.',
      schema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max contacts to return (default 50)' },
        },
      },
    },
    async execute(args) {
      const limit = typeof args.limit === 'number' ? args.limit : 50;
      try {
        const { stdout } = await execFileAsync(termuxBin('termux-contact-list'), [], { timeout: 10_000 });
        const lines = stdout.trim().split('\n').slice(0, limit);
        return `Contacts:\n${lines.join('\n')}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`contacts failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  tools.push({
    def: {
      name: 'wifi_info',
      description: 'Get WiFi connection info via Termux:API. Returns SSID, IP address, signal strength.',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      try {
        const { stdout } = await execFileAsync(termuxBin('termux-wifi-connectioninfo'), [], { timeout: 5000 });
        return `WiFi: ${stdout.trim()}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`wifi_info failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  tools.push({
    def: {
      name: 'notification',
      description: 'Send a notification via Termux:API. Shows in the notification shade.',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          text: { type: 'string' },
          priority: { type: 'string', description: 'low/normal/high (default normal)' },
        },
        required: ['title', 'text'],
      },
    },
    async execute(args) {
      const title = argStr(args, 'title');
      const text = argStr(args, 'text');
      const priority = argStr(args, 'priority', false) || 'normal';
      try {
        await execFileAsync(termuxBin('termux-notification'), ['--title', title, '--content', text, '--priority', priority], { timeout: 5000 });
        return `Notification sent: ${title}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`notification failed: ${msg} (is termux-api installed?)`);
      }
    },
  });

  // ---- canvas tool (agent-driven UI widgets) ----
  tools.push({
    def: {
      name: 'canvas',
      description: 'Push a live HTML widget to the Control UI. Actions: update (create/update), remove, list, get. Widgets are rendered in the browser panel.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['update', 'remove', 'list', 'get'] },
          id: { type: 'string', description: 'update/remove/get: widget id' },
          html: { type: 'string', description: 'update: HTML content' },
          title: { type: 'string', description: 'update: widget title' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = argStr(args, 'action');
      if (action === 'update') {
        const id = argStr(args, 'id');
        const html = argStr(args, 'html');
        const title = typeof args.title === 'string' ? args.title : undefined;
        const widget = canvasUpdate(id, html, title);
        return `canvas widget "${widget.id}" updated (${html.length} chars)`;
      }
      if (action === 'remove') {
        const id = argStr(args, 'id');
        const removed = canvasRemove(id);
        if (!removed) throw new Error(`canvas widget not found: ${id}`);
        return `canvas widget "${id}" removed`;
      }
      if (action === 'list') {
        const list = canvasList();
        if (!list.length) return 'no canvas widgets';
        return list.map((w) => `${w.id} · ${w.title || '(untitled)'} · ${w.html.length} chars`).join('\n');
      }
      if (action === 'get') {
        const id = argStr(args, 'id');
        const widget = canvasGet(id);
        if (!widget) throw new Error(`canvas widget not found: ${id}`);
        return JSON.stringify(widget, null, 2);
      }
      throw new Error('action must be update/remove/list/get');
    },
  });

  return tools;
}

function readOwners(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(path.join(stateDir(), 'session-owners.json'), 'utf8')) as Record<string, string>;
  } catch {
    return {};
  }
}
