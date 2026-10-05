import path from 'node:path';
import fs from 'node:fs';
import { home } from '../core/paths.js';
import { loadConfig, saveConfig, type Config } from '../core/config.js';
import { writeBackup } from '../core/backup.js';
import { checkForUpdate } from '../core/update.js';
import { sendDocumentTo } from '../channels/conversations.js';
import type { ReportResult } from './chat-reports.js';
import { canvasClear, canvasGet, canvasList } from './canvas.js';
import { parseSwitchValue, switchFor, switchState } from '../agent/tool-catalog.js';
import { listSubagentDirs } from '../agent/subagents.js';
import { listTasks as listSubagentTasks, taskLine as subagentLine } from '../agent/tasks.js';

/**
 * Batch 47 — the verbs.
 *
 * Batch 46 made the *reports* reachable from a chat; this module is the half
 * that changes something: stop, steer, rename, purge, update, back up, watch,
 * queue mode. Same rule: one implementation, called by every surface. What a
 * chat must NOT do (delete a thread without thinking, install an update from a
 * half-read message) is refused with the reason and the terminal command, and
 * the interactive halves get inline confirms in batch 48.
 */

export interface ControlDeps {
  /** The session key this surface's conversation lands in. */
  sessionId: string;
  channel: string;
  chatId: string;
  config: Config;
  saveConfig: (cfg: Config) => void;
  sessions: {
    list: () => { id: string; modified: number; messages: number }[];
    rename: (from: string, to: string) => 'ok' | 'not-found' | 'exists' | 'bad-name';
    purgeOlderThan: (days: number) => { removed: number; freedBytes: number };
  };
  queue: {
    getRunning: (sessionId: string) => { id: string } | null;
    steer: (sessionId: string, message: string) => { id: string } | null;
    interrupt: (sessionId: string) => boolean;
    getMode: () => string;
    setMode: (mode: 'followup' | 'steer' | 'collect' | 'interrupt') => void;
  };
  /** The gateway's own release, for /update. */
  currentVersion: string;
}

const ok = (text: string): ReportResult => ({ ok: true, text });
const fail = (error: string): ReportResult => ({ ok: false, error });

export const QUEUE_MODES = ['followup', 'steer', 'collect', 'interrupt'] as const;

/** `/stop` — cancel the turn running in *this* conversation. */
export function stopCommand(deps: ControlDeps): ReportResult {
  const running = deps.queue.getRunning(deps.sessionId);
  if (!running) return ok('⏹ nothing is running here — nothing to stop');
  const stopped = deps.queue.interrupt(deps.sessionId);
  return stopped
    ? ok(`⏹ stopped the running turn (${running.id}). The partial answer is kept.`)
    : ok('⏹ the turn finished on its own before the stop landed');
}

/** `/steer <text>` — join the running turn instead of queueing behind it. */
export function steerCommand(deps: ControlDeps, text: string): ReportResult {
  const message = text.trim();
  if (!message) return fail('usage: /steer <what to tell it while it works>');
  const running = deps.queue.getRunning(deps.sessionId);
  if (!running) return ok('↪ nothing is running — send it as a normal message instead');
  const steered = deps.queue.steer(deps.sessionId, message);
  return steered
    ? ok(`↪ steered into the running turn (${steered.id}): “${message.slice(0, 80)}”`)
    : ok('↪ the turn finished before the steer landed — send it as a message');
}

/** `/queue [followup|steer|collect|interrupt]` — what a message does mid-turn. */
export function queueCommand(deps: ControlDeps, mode?: string): ReportResult {
  if (!mode) {
    return ok(
      [
        `🔀 queue mode: ${deps.queue.getMode()}`,
        '  followup  messages wait until the running turn finishes (default)',
        '  steer     a message joins the running turn',
        '  collect   a burst is merged into one turn',
        '  interrupt the running turn is cancelled and yours starts',
        '  change: /queue steer (also: /config set agent.queueMode steer)',
      ].join('\n'),
    );
  }
  if (!(QUEUE_MODES as readonly string[]).includes(mode)) {
    return fail(`queue: mode must be one of ${QUEUE_MODES.join(', ')}`);
  }
  deps.queue.setMode(mode as (typeof QUEUE_MODES)[number]);
  const cfg = deps.config;
  cfg.agent.queueMode = mode as Config['agent']['queueMode'];
  deps.saveConfig(cfg);
  return ok(`🔀 queue mode → ${mode} (saved; applies to the next turn)`);
}

/** `/sessions rename <old> <new>` — a stable id is what /sessions shows. */
export function sessionsRenameCommand(deps: ControlDeps, from: string, to: string): ReportResult {
  if (!from || !to) return fail('usage: /sessions rename <old-id> <new-id>');
  const r = deps.sessions.rename(from, to);
  if (r === 'ok') return ok(`✏️ renamed ${from} → ${to}`);
  if (r === 'not-found') return fail(`sessions rename: no conversation called ${from}`);
  if (r === 'exists') return fail(`sessions rename: ${to} already exists`);
  return fail(`sessions rename: "${to}" is not a usable name (letters, digits, . _ - : only)`);
}

/**
 * `/sessions purge <days>` — delete transcripts older than N days.
 * The chat form *requires* a number and says what it will do; the CLI keeps
 * its `--older-than` form for the same function.
 */
export function sessionsPurgeCommand(deps: ControlDeps, arg: string): ReportResult {
  const days = Number(arg);
  if (!Number.isFinite(days) || days < 1) {
    return fail('usage: /sessions purge <days> — deletes transcripts older than that (at least 1)');
  }
  const r = deps.sessions.purgeOlderThan(days);
  return ok(
    r.removed
      ? `🗑 purged ${r.removed} transcript(s) older than ${days} day(s), freed ${(r.freedBytes / 1024).toFixed(1)} KB`
      : `🗑 nothing older than ${days} day(s) — nothing purged`,
  );
}

/** `/update` — check by default; applying is a terminal job (or a confirm, 48). */
export async function updateCommand(deps: ControlDeps, action = 'check'): Promise<ReportResult> {
  if (action !== 'check' && action !== '') return ok(await updateApplyNotice(deps));
  const check = await checkForUpdate(deps.currentVersion);
  if (!check.ok) return ok(`🔄 update check failed: ${check.error ?? 'unknown error'} — try again later`);
  if (!check.updateAvailable) return ok(`🔄 up to date (${check.current}${check.latest ? `, newest ${check.latest}` : ''})`);
  return ok(
    [
      `🔄 update available: ${check.current} → ${check.latest}`,
      check.url ? `     ${check.url}` : '',
      '     install it from a terminal: termcrab update apply',
      '     (a chat never installs code by itself — /update apply comes with a confirm button)',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

async function updateApplyNotice(_deps: ControlDeps): Promise<string> {
  return [
    '🔄 applying an update runs a verified install (checksum, then a swap) — that is a terminal job until the confirm button lands.',
    '     from the phone: open the panel → Work → the update card, or SSH: termcrab update apply',
  ].join('\n');
}

/** `/backup` — write the archive, then hand it to the chat as a document. */
export async function backupCommand(deps: ControlDeps): Promise<ReportResult> {
  const dir = path.join(home(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.tar.gz`);
  try {
    const r = writeBackup(file);
    let sent = '';
    try {
      await sendDocumentTo(deps.channel, deps.chatId, file, 'TermCrab backup');
      sent = ' — sent to this chat';
    } catch {
      sent = ' — (this channel cannot receive files; it is on disk)';
    }
    return ok(`💾 backup written: ${path.basename(file)} (${(r.manifest.bytes / 1024).toFixed(0)} KB, ${r.manifest.files} file(s))${sent}`);
  } catch (err) {
    return fail(`backup failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * `/watch add <path> [suffixes]`, `/watch rm <id>`, `/watch list`.
 * Watchers fire `file.changed`, which hooks hear — the config is the store, so
 * this writes exactly what the CLI writes and the gateway reloads it.
 */
export function watchCommand(deps: ControlDeps, action: string, rest: string): ReportResult {
  const watchers = [...(deps.config.watchers ?? [])];
  if (!action || action === 'list') {
    if (!watchers.length) return ok('👀 no watchers — add one: /watch add ~/notes .md');
    return ok(
      [`👀 ${watchers.length} watcher(s)`, ...watchers.map((w) => `  ${w.id}  ${w.path}${w.match ? ` · ${w.match}` : ''}`)].join('\n'),
    );
  }
  if (action === 'rm' || action === 'remove') {
    const id = rest.trim();
    if (!id) return fail('usage: /watch rm <id>');
    const left = watchers.filter((w) => w.id !== id);
    if (left.length === watchers.length) return fail(`watch: no watcher with id ${id}`);
    deps.config.watchers = left;
    deps.saveConfig(deps.config);
    return ok(`👀 removed watcher ${id} (${watchers.length - left.length} gone)`);
  }
  if (action === 'add') {
    const [rawPath, match] = rest.trim().split(/\s+/);
    if (!rawPath) return fail('usage: /watch add <path> [suffixes like .md,.txt]');
    const id = `w${Date.now().toString(36)}`;
    watchers.push({ id, path: rawPath, ...(match ? { match } : {}) });
    deps.config.watchers = watchers;
    deps.saveConfig(deps.config);
    return ok(
      `👀 watching ${rawPath}${match ? ` (${match})` : ''} as ${id} — a change fires file.changed, which hooks hear\n     remove: /watch rm ${id}`,
    );
  }
  return fail('usage: /watch [list | add <path> [suffixes] | rm <id>]');
}

/** What a widget says in one message when HTML cannot be rendered. */
export function canvasSummary(widget: { id: string; title?: string; html: string; updatedAt: number }): string {
  const text = widget.html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}

/**
 * 53.2 — `/canvas` in a chat: the widgets the agent pushed to the panel,
 * described in words (a phone cannot render the HTML, and pretending otherwise
 * would be worse than saying it). `clear` empties the registry.
 */
export function canvasCommand(action: string): ReportResult {
  const what = (action ?? '').trim().toLowerCase();
  if (what === 'clear') {
    const count = canvasList().length;
    canvasClear();
    return ok(count ? `🖼️ cleared ${count} canvas widget(s)` : '🖼️ the canvas was already empty');
  }
  const widgets = canvasList();
  if (!widgets.length) return ok('🖼️ the canvas is empty — the agent fills it with the `canvas` tool');
  const first = what.startsWith('show ') ? canvasGet(action.trim().slice(5).trim()) : widgets[0]!;
  if (!first) return fail(`canvas: no widget with that id — try /canvas to list them`);
  const when = new Date(first.updatedAt).toISOString().slice(0, 16).replace('T', ' ');
  const body = [
    `🖼️ ${widgets.length} widget(s) on the canvas:`,
    ...widgets.slice(0, 6).map((w) => `  ${w.id}  ${w.title ?? '(untitled)'} · ${(w.html.length / 1024).toFixed(1)} KB · ${new Date(w.updatedAt).toISOString().slice(11, 16)}`),
    '',
    `newest — ${first.title ?? '(untitled)'} (${when}):`,
    canvasSummary(first),
    '',
    'the panel renders it as it is; clear it with /canvas clear',
  ];
  return ok(body.join('\n'));
}

/**
 * 53.1 — `/tools` in a chat: the three switches the config really carries, with
 * the same names and the same keys the panel's checkboxes and `termcrab tools`
 * write. `exec on`, `browser off`, `code on`.
 */
export function toolsCommand(deps: ControlDeps, action: string): ReportResult {
  const args = (action ?? '').trim().split(/\s+/).filter(Boolean);
  const state = switchState(deps.config);
  if (args.length === 0 || args[0] === 'list') {
    const lines = state.map((s) => `  ${s.on ? '✅' : '⛔'} ${s.name.padEnd(8)} ${s.label} — ${s.note}`);
    const off = state.filter((s) => !s.on).map((s) => s.name);
    return ok(
      [
        '🧰 Tools on this device',
        ...lines,
        '',
        'the agent sees the full catalog in `termcrab tools`;',
        off.length ? `switch one on here: /tools ${off[0]} on` : 'everything is on.',
      ].join('\n'),
    );
  }
  const sw = switchFor(args[0]!);
  if (!sw) return fail(`tools: unknown switch "${args[0]}" — try ${state.map((s) => s.name).join(', ')}`);
  const to = parseSwitchValue(args[1] ?? '');
  if (to === undefined) return fail(`tools: say on or off — /tools ${sw.name} on`);
  deps.config.agent[sw.key] = to;
  deps.saveConfig(deps.config);
  return ok(
    `${to ? '✅' : '⛔'} ${sw.name} is now ${to ? 'on' : 'off'} (agent.${sw.key}) — ${sw.note}` +
      (to ? '' : '\n     the tools behind it are hidden from the model until it is on again.'),
  );
}

/** The dispatcher: returns null for anything that is not a control verb. */
export async function runControlCommand(text: string, deps: ControlDeps): Promise<ReportResult | null> {
  const [cmd, ...rest] = text.trim().split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd) {
    case '/stop':
      return stopCommand(deps);
    case '/steer':
      return steerCommand(deps, arg);
    case '/queue':
      return queueCommand(deps, arg || undefined);
    case '/backup':
      return backupCommand(deps);
    case '/watch':
      return watchCommand(deps, rest[0] ?? 'list', rest.slice(1).join(' '));
    case '/tools':
      return toolsCommand(deps, arg);
    case '/canvas':
      return canvasCommand(arg);
    case '/update':
      return updateCommand(deps, rest[0] ?? 'check');
    case '/subagents':
      return subagentsCommand();
    case '/identity':
      return identityCommand();
    default:
      return null;
  }
}

/**
 * `/subagents` — list the spawned subagent runs and their scratch dirs (54.4).
 * The same data the panel's Debug view reads from `/api/subagents`.
 */
export function subagentsCommand(): ReportResult {
  const tasks = listSubagentTasks();
  const dirs = listSubagentDirs();
  const lines = [
    `🤖 ${tasks.length} active subagent task(s):`,
    ...(tasks.length ? tasks.map((t) => `  ${subagentLine(t)}`) : ['  none']),
    '',
    `${dirs.length} scratch dir(s):`,
    ...(dirs.length ? dirs.map((d) => `  ${d.id}  (${d.path})`) : ['  none']),
  ];
  return ok(lines.join('\n'));
}

/** The identity files a chat shows but does not edit as easily as the panel (54.4). */
const IDENTITY_FILES = [
  { name: 'SOUL.md', rel: 'workspace/SOUL.md' },
  { name: 'IDENTITY.md', rel: 'workspace/IDENTITY.md' },
  { name: 'USER.md', rel: 'memory/USER.md' },
] as const;

/**
 * `/identity` — show the SOUL / IDENTITY / USER files the agent answers from
 * (54.4). Editing is the panel's editor (a confirm in a chat is a weaker door);
 * this shows the current text so a chat can read it without leaving the thread.
 */
export function identityCommand(): ReportResult {
  const parts = IDENTITY_FILES.map((f) => {
    const abs = path.join(home(), f.rel);
    let text = '';
    try {
      if (fs.existsSync(abs)) text = fs.readFileSync(abs, 'utf8');
    } catch {
      /* unreadable reads as empty */
    }
    return `🪪 ${f.name}\n${text ? text.slice(0, 1500) : '(empty)'}`;
  });
  return ok(parts.join('\n\n'));
}

export { loadConfig, saveConfig };
