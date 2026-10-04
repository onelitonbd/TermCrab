import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig, type Config } from '../core/config.js';
import { configPath } from '../core/paths.js';
import { formatLogRecord, structuredLog } from '../core/structured-log.js';
import { diskBudgetBytes, diskKeepDays, diskUsage } from '../core/disk.js';
import { buildBoard, formatBoard } from '../agent/board.js';
import { perfStatus } from '../core/perf.js';
import { runDoctor, renderChecks } from '../mobile/doctor.js';
import { auditSecrets, formatFindings } from '../agent/security.js';
import { securityAudit } from '../agent/security.js';
import { listSecrets } from '../agent/secrets.js';
import { listAuthProfiles } from '../core/auth-profiles.js';
import { detectSandbox } from '../agent/sandbox.js';
import { listDevices } from './devices.js';
import { embedderPlan } from '../agent/embed-provider.js';
import { dreamHistory, readDreamState, runDream } from '../agent/dream.js';
import { collectDocs, docsSiteFreshness } from '../docs/site.js';
import { loadCrons } from '../cron/store.js';
import { addIntent, listIntents, removeIntent } from '../agent/intents.js';
import { nextRun, parseCron } from '../cron/parser.js';
import { listAgents } from '../agent/prompt.js';

/**
 * Batch 46 — the read-only reports, reachable from a chat.
 *
 * The three-surface rule: a capability that only the CLI or only the panel can
 * reach is not reachable. Every function here existed already — in
 * `src/cli.ts` or behind a panel endpoint — and this module is the *second and
 * third door* to the same data, in the same process. Nothing here writes
 * anything except `configSet`, whose whitelist is the point.
 *
 * Output is line-oriented and plain: Telegram renders HTML, and a chat has no
 * table. Long reports are truncated with a pointer to the surface that shows
 * the whole thing, so the phone never receives a wall of text it cannot read.
 */

/** How many lines a chat report may carry before it is cut short. */
export const CHAT_REPORT_LIMIT = 24;

export type ReportResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const ok = (text: string): ReportResult => ({ ok: true, text });
const fail = (error: string): ReportResult => ({ ok: false, error });

/** Cut a list of lines at the chat limit, saying how many were left out. */
export function clampLines(lines: string[], limit = CHAT_REPORT_LIMIT): string[] {
  if (lines.length <= limit) return lines;
  const kept = lines.slice(0, limit);
  kept.push(`… and ${lines.length - limit} more — the panel and \`termcrab …\` show the full list`);
  return kept;
}

function mb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `/logs [n]` — the same ring `termcrab logs` and the panel read. */
export function logsReport(n = 10): ReportResult {
  const records = structuredLog.tail(Math.max(1, Math.min(50, n)));
  if (!records.length) {
    return ok(`🧾 no log records yet — they appear as soon as the agent does anything\nfile: ${structuredLog.path}`);
  }
  const lines = [`🧾 last ${records.length} record(s)`, ...records.map((r) => formatLogRecord(r))];
  return ok(clampLines(lines).join('\n'));
}

/**
 * `/config [key]` — read any key; without one, the keys a person actually
 * wants to see. Secrets are never read back: a key whose name smells of a
 * token prints as set/not-set, not as a value.
 */
const SECRETISH = /(key|token|secret|password|passwd|credential)/i;
const SHOW_KEYS: { key: string; label: string }[] = [
  { key: 'provider.type', label: 'provider' },
  { key: 'provider.model', label: 'model' },
  { key: 'provider.baseUrl', label: 'baseUrl' },
  { key: 'provider.authProfile', label: 'auth profile' },
  { key: 'agent.name', label: 'agent' },
  { key: 'agent.allowExec', label: 'exec' },
  { key: 'agent.allowBrowser', label: 'browser' },
  { key: 'agent.queueMode', label: 'queue mode' },
  { key: 'agent.maxIterations', label: 'max iterations' },
  { key: 'channels.telegram.allowedUserIds', label: 'telegram users' },
  { key: 'channels.telegram.groupPolicy', label: 'group policy' },
  { key: 'memory.embeddings', label: 'embeddings' },
  { key: 'gateway.port', label: 'gateway port' },
  { key: 'gateway.host', label: 'gateway host' },
];

export function getPath(cfg: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, cfg);
}

function renderValue(key: string, value: unknown): string {
  if (value === undefined) return '(not set)';
  if (SECRETISH.test(key)) return value ? '(set — never printed in a chat)' : '(empty)';
  if (value === null) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Keys a chat may change. Everything else is refused with the reason. */
export const CHAT_SET_KEYS = new Set([
  'agent.name',
  'agent.queueMode',
  'agent.allowExec',
  'agent.allowBrowser',
  'agent.maxIterations',
  'agent.compactThreshold',
  'memory.embeddings',
  'channels.telegram.groupPolicy',
]);

export function configReport(key?: string): ReportResult {
  const cfg = loadConfig();
  if (key) {
    if (!/^[a-zA-Z][\w.]*$/.test(key)) return fail(`config: "${key}" is not a key path`);
    const value = getPath(cfg, key);
    return ok(`⚙️ ${key} = ${renderValue(key, value)}`);
  }
  const lines = ['⚙️ config — the keys that matter'];
  for (const { key: k, label } of SHOW_KEYS) {
    lines.push(`  ${label.padEnd(14)} ${renderValue(k, getPath(cfg, k))}`);
  }
  lines.push(`  ${'file'.padEnd(14)} ${configPath()}`);
  lines.push('  one key: /config <key> · change: /config set <key> <value>');
  return ok(lines.join('\n'));
}

/**
 * `/config set <key> <value>` — only the whitelist above, only boolean/number/
 * enum values, and never a key that holds a credential. A chat is a worse place
 * to make a mistake than a terminal, so this door is deliberately narrow; the
 * CLI can set anything.
 */
export function configSet(key: string, raw: string): ReportResult {
  if (!CHAT_SET_KEYS.has(key)) {
    const hint = SECRETISH.test(key)
      ? 'a secret never gets typed into a chat — use: termcrab config set ' + key + ' <value>'
      : `not changeable from a chat — allowed: ${[...CHAT_SET_KEYS].join(', ')}`;
    return fail(`config set: ${hint}`);
  }
  const cfg = loadConfig();
  const before = getPath(cfg, key);
  let value: unknown = raw;
  if (typeof before === 'boolean') {
    if (!/^(true|false|on|off|1|0)$/i.test(raw)) return fail(`config set: ${key} wants true or false`);
    value = /^(true|on|1)$/i.test(raw);
  } else if (typeof before === 'number') {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fail(`config set: ${key} wants a number`);
    value = n;
  } else if (key === 'agent.queueMode') {
    const allowed = ['followup', 'steer', 'collect', 'interrupt'];
    if (!allowed.includes(raw)) return fail(`config set: queue mode must be one of ${allowed.join(', ')}`);
  } else if (key === 'channels.telegram.groupPolicy') {
    if (!['mention', 'all'].includes(raw)) return fail('config set: group policy must be mention or all');
  }
  setPath(cfg as unknown as Record<string, unknown>, key, value);
  saveConfig(cfg);
  return ok(`⚙️ ${key}: ${renderValue(key, before)} → ${renderValue(key, value)}\n     (applies to the next turn; the CLI can set anything else)`);
}

export function setPath(obj: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split('.');
  let cur = obj;
  for (const part of parts.slice(0, -1)) {
    if (!cur[part] || typeof cur[part] !== 'object') cur[part] = {};
    cur = cur[part] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
}

/** `/board` — the same merged view `termcrab board` prints. */
export function boardReport(): ReportResult {
  return ok(formatBoard(buildBoard()));
}

/** `/disk` — usage, budget and the biggest areas. */
export function diskReport(): ReportResult {
  const cfg = loadConfig();
  const usage = diskUsage();
  const budget = diskBudgetBytes(cfg);
  const over = usage.totalBytes > budget;
  const areas = Object.entries(usage.byArea)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([area, bytes]) => `  ${area.padEnd(12)} ${mb(bytes)}`);
  return ok(
    [
      `💾 ${mb(usage.totalBytes)} of ${mb(budget)} budget (${usage.files} file(s), keeping ${diskKeepDays(cfg)} day(s))`,
      ...areas,
      over ? '⚠️ over budget — trim from the terminal: termcrab disk --trim' : 'within budget',
    ].join('\n'),
  );
}

/** `/perf` — the last recorded measurement, one line per over-budget metric. */
export function perfReport(): ReportResult {
  const s = perfStatus();
  if (!s.exists) {
    return ok(`📈 no measurement recorded yet — run: termcrab perf (saves with --save)`);
  }
  const lines = [`📈 perf — ${s.measured}/${s.total} metric(s), measured ${s.age}`];
  if (s.over.length) {
    for (const m of s.over) {
      const cap = s.budget[m];
      const got = s.metrics[m];
      const advice = s.overAdvice.find((a) => a.key === m)?.advice;
      lines.push(`  ⚠️ ${m}: ${got} of ${cap}${advice ? ` — ${advice}` : ''}`);
    }
  } else {
    lines.push('  everything within its ceiling');
  }
  if (s.worst && !s.over.includes(s.worst.key)) {
    lines.push(`  closest: ${s.worst.key} at ${Math.round(s.worst.pct * 100)}% of its ceiling`);
  }
  if (s.suspect && s.load) {
    lines.push(`  ⚠️ measured under load (${s.load.perCpu}/cpu) — treat timings as upper bounds`);
  }
  lines.push('  full table: the panel Work page, or: termcrab perf --full');
  return ok(lines.join('\n'));
}

/** `/doctor` — findings with fixes, the same checks the CLI runs. */
export async function doctorReport(): Promise<ReportResult> {
  const checks = await runDoctor();
  const { text, failed, warned } = renderChecks(checks);
  const keep = text
    .split('\n')
    .filter((l) => !l.startsWith('✅'))
    .filter((l) => l.trim().length > 0)
    .filter((l) => l !== 'TermCrab doctor');
  const head = failed || warned ? `🩺 doctor — ${failed} failure(s), ${warned} warning(s)` : '🩺 doctor — all good';
  return ok([head, ...clampLines(keep, CHAT_REPORT_LIMIT - 1)].join('\n'));
}

/** `/security` — the audit's fail/warn lines with their fixes. */
export function securityReport(): ReportResult {
  const cfg = loadConfig();
  const sandbox = detectSandbox();
  const findings = securityAudit({ config: cfg, sandboxAvailable: sandbox.isolated });
  const notable = findings.filter((f) => f.level === 'fail' || f.level === 'warn');
  if (!notable.length) return ok('🔒 security audit — nothing to fix (details in the terminal: termcrab security)');
  const lines = [`🔒 security audit — ${notable.filter((f) => f.level === 'fail').length} fail, ${notable.filter((f) => f.level === 'warn').length} warn`];
  for (const f of notable.slice(0, 10)) {
    lines.push(`  ${f.level === 'fail' ? '❌' : '⚠️'} ${f.title}`);
    if (f.fix) lines.push(`     fix: ${f.fix}`);
  }
  return ok(clampLines(lines, CHAT_REPORT_LIMIT + 6).join('\n'));
}

/** `/auth` — profile names and where keys live; never a key. */
export function authReport(sub = 'list'): ReportResult {
  if (sub === 'audit') {
    const findings = auditSecrets({ config: loadConfig() });
    const notable = findings.filter((f) => f.level !== 'ok');
    const lines = [`🔑 where your keys are — ${findings.length} check(s)`];
    for (const f of notable.slice(0, 10)) lines.push(`  ${f.level === 'fail' ? '❌' : f.level === 'warn' ? '⚠️' : 'ℹ️'} ${f.title}${f.fix ? `\n     fix: ${f.fix}` : ''}`);
    if (!notable.length) lines.push('  every key sits where it should');
    return ok(clampLines(lines).join('\n'));
  }
  const profiles = listAuthProfiles();
  const secrets = listSecrets();
  const lines = ['🔑 auth'];
  if (profiles.length) {
    for (const p of profiles) lines.push(`  ${p.id.padEnd(14)} ${p.provider}${p.model ? ` · ${p.model}` : ''} (key in state/auth-profiles.json, 0600)`);
  } else {
    lines.push('  no auth profiles — add one from a terminal: termcrab auth add work --provider openai --key sk-…');
  }
  if (secrets.length) lines.push(`  ${secrets.length} named secret(s): ${secrets.map((s) => s.name).join(', ')}`);
  lines.push('  where the keys are (names only): /auth audit');
  return ok(lines.join('\n'));
}

/** `/devices` — who is paired with this gateway right now. */
export function devicesReport(): ReportResult {
  const devices = listDevices();
  if (!devices.length) return ok('📱 no paired devices — make a code in the panel (Devices) or: termcrab pair');
  const lines = [`📱 ${devices.length} paired device(s)`];
  for (const d of devices) {
    const seen = d.seenAgoMs === null ? 'never seen' : `seen ${Math.round(d.seenAgoMs / 60000)} min ago`;
    lines.push(`  ${d.id}  ${d.name}${d.current ? ' (this one)' : ''} · ${seen}`);
  }
  lines.push('  revoke: the panel (Devices → revoke)');
  return ok(lines.join('\n'));
}

/** `/embeddings` — which embedder memory search will use, and why. */
export function embeddingsReport(): ReportResult {
  const cfg = loadConfig();
  const plan = embedderPlan(cfg);
  if (!plan.kind) return ok(`🧠 embeddings — off; ${plan.note}\n     turn on: /config set memory.embeddings true`);
  return ok(
    [
      `🧠 embeddings — ${plan.kind} · ${plan.model}`,
      `     ${plan.note}`,
      plan.automatic
        ? '     (chosen automatically; pin it in the terminal: termcrab embeddings setup)'
        : '     change the provider from a terminal: termcrab embeddings setup',
    ].join('\n'),
  );
}

/** `/dream` — last consolidation, or run one now, in the background. */
export function dreamReport(action?: string): ReportResult {
  if (action === 'now' || action === 'run') {
    return ok('🌙 dream started — it runs in the background; /dream status will show when it is done');
  }
  const state = readDreamState();
  const { lastDreamAt, history } = dreamHistory(5);
  const lines = ['🌙 dreaming — consolidates memory while idle'];
  lines.push(`  last: ${lastDreamAt ? `${Math.round((Date.now() - lastDreamAt) / 3600000)} h ago` : 'never'}`);
  if (state && typeof state === 'object' && 'skipped' in state && state.skipped) lines.push(`  last run skipped: ${String(state.skipped)}`);
  for (const h of history.slice(0, 4)) lines.push(`  ${h.day} ${h.line}`);
  lines.push('  run one now: /dream now (the panel shows progress; the CLI: termcrab dream)');
  return ok(clampLines(lines).join('\n'));
}

/** `/docs` — the offline manual's state, and how to open it. */
export function docsReport(name?: string): ReportResult {
  const d = docsSiteFreshness();
  if (name) {
    // A chat gets a pointer, not a 300 KB page: say which document it is and
    // where it opens. Reading it happens in the docs page (offline, searchable).
    const { docs } = collectDocs();
    const hit = docs.find((doc) => doc.id === name || doc.path === name || doc.path === `docs/${name}.md` || doc.title === name);
    if (!hit) return fail(`docs: no document called "${name}" — the page lists ${docs.length}, or try /docs`);
    return ok(`📖 ${hit.title} — ${hit.sections} section(s), ${Math.max(1, Math.round(hit.bytes / 1024))} KB\n     open it: the panel → Docs (offline, searchable), or: termcrab docs`);
  }
  const lines = [`📖 docs — ${d.docs} document(s), ${d.sections} section(s)`];
  lines.push(`  release: ${d.release || 'unknown'} · built: ${d.builtAt ? new Date(d.builtAt).toISOString().slice(0, 16).replace('T', ' ') : 'never'}`);
  if (d.stale) lines.push(`  ⚠️ ${d.staleDocs} document(s) changed since the build — rebuild: termcrab docs (or the panel Docs button)`);
  lines.push('  open: the panel → Docs, or: termcrab docs');
  return ok(lines.join('\n'));
}

/** `/skills` — what the agent can load, and what is waiting for a decision. */
export function skillsReport(store: { list: () => { name: string; description: string; origin: string }[] }, proposals: { name: string; reason?: string }[] = []): ReportResult {
  const skills = store.list();
  const lines = [`🧩 ${skills.length} skill(s)`];
  for (const s of skills.slice(0, 20)) lines.push(`  ${s.name}${s.origin === 'builtin' ? '' : ` (${s.origin})`}`);
  if (proposals.length) {
    lines.push(`💡 ${proposals.length} proposal(s) waiting: ${proposals.map((p) => p.name).join(', ')}`);
    lines.push('  approve from a terminal: termcrab skills proposals approve <name>');
  }
  return ok(clampLines(lines).join('\n'));
}

/** `/cron` — the scheduled jobs and when they next run. */
export function cronReport(): ReportResult {
  const jobs = loadCrons();
  if (!jobs.length) return ok('⏱ no scheduled jobs — add one: termcrab cron add <name> --every 1h --prompt "…"');
  const lines = [`⏱ ${jobs.length} scheduled job(s)`];
  for (const j of jobs) {
    const when = j.enabled ? `next ${nextRunText(j.schedule)}` : 'paused';
    lines.push(`  ${j.id}  ${j.name}${j.enabled ? '' : ' (disabled)'} · ${j.schedule} · ${when}`);
  }
  lines.push('  run one now / edit: the panel Work page, or: termcrab cron ls');
  return ok(clampLines(lines).join('\n'));
}

/**
 * `/orders` — standing orders from any surface (26.1's promise, now with one
 * implementation instead of two). The read form is a report; add/remove write
 * the same store the prompt injects.
 */
export function ordersReport(action = '', rest = ''): ReportResult {
  if (action === 'add') {
    const text = rest.trim();
    if (!text) return fail('usage: /orders add <what to always do>');
    const added = addIntent(text);
    return ok(`📌 Standing order added: ${added.text}\n(id ${added.id} — /orders remove ${added.id} to drop it)`);
  }
  if (action === 'remove') {
    const id = rest.trim();
    if (!id) return fail('usage: /orders remove <id>');
    return removeIntent(id)
      ? ok(`🗑 Removed standing order ${id}.`)
      : fail(`no standing order with id ${id} — /orders lists them`);
  }
  const list = listIntents();
  if (!list.length) return ok('📌 0 standing order(s) — add one: /orders add always answer in Bengali');
  return ok(`📌 Standing orders (followed in every conversation):\n${list.map((i) => `• ${i.id} — ${i.text}`).join('\n')}`);
}

/** `/agents` already exists; this is the extra line the report wants. */
export function agentCountLine(): string {
  const agents = listAgents();
  return agents.length ? `${agents.length} named agent(s): ${agents.map((a) => `@${a}`).join(', ')}` : 'no named agents';
}

/** Everything the chat surface now understands, for /help and setMyCommands. */
export const CHAT_COMMANDS: { cmd: string; args: string; description: string }[] = [
  { cmd: '/new', args: '', description: 'Start a fresh conversation' },
  { cmd: '/status', args: '', description: 'Is everything running' },
  { cmd: '/stop', args: '', description: 'Cancel the turn that is running' },
  { cmd: '/usage', args: '', description: 'Tokens and cost today' },
  { cmd: '/board', args: '', description: 'Everything in flight' },
  { cmd: '/sessions', args: '[search|show|rename|purge]', description: 'Your conversations' },
  { cmd: '/memory', args: '[search <words>]', description: 'What the agent remembers' },
  { cmd: '/context', args: '', description: 'What the model is sent' },
  { cmd: '/inbox', args: '[name]', description: 'Files people sent you' },
  { cmd: '/orders', args: '[add|remove]', description: 'Standing orders' },
  { cmd: '/agents', args: '', description: 'Named personalities' },
  { cmd: '/history', args: '[n]', description: 'Room history' },
  { cmd: '/providers', args: '', description: 'Pick the model' },
  { cmd: '/heartbeat', args: '', description: 'Run a self-check now' },
  { cmd: '/logs', args: '[n]', description: 'Recent log lines' },
  { cmd: '/config', args: '[key] | set <key> <value>', description: 'Read and change settings' },
  { cmd: '/disk', args: '', description: 'Storage use and budget' },
  { cmd: '/perf', args: '', description: 'Last performance measurement' },
  { cmd: '/doctor', args: '', description: 'Find and fix problems' },
  { cmd: '/security', args: '', description: 'Security findings with fixes' },
  { cmd: '/auth', args: '[audit]', description: 'Keys and where they live' },
  { cmd: '/devices', args: '', description: 'Paired devices' },
  { cmd: '/embeddings', args: '', description: 'Memory search engine' },
  { cmd: '/dream', args: '[now]', description: 'Memory consolidation' },
  { cmd: '/docs', args: '[name]', description: 'The offline manual' },
  { cmd: '/skills', args: '', description: 'Skills and proposals' },
  { cmd: '/cron', args: '', description: 'Scheduled jobs' },
];

/** The text `/help` prints — one list, also used to register the Bot menu. */
export function helpText(): string {
  const width = Math.max(...CHAT_COMMANDS.map((c) => c.cmd.length + (c.args ? c.args.length + 1 : 0)));
  return [
    '🦀 What I understand here:',
    ...CHAT_COMMANDS.map((c) => `  ${(`${c.cmd} ${c.args}`).trim().padEnd(width)}  ${c.description}`),
    'Anything else is a message for the agent.',
  ].join('\n');
}

// ── the bits that need the running gateway ────────────────────────────────

export interface ReportDeps {
  /** The AgentCtx a dream run needs (the panel's /api/dream uses it too). */
  agent: unknown;
  skills: { list: () => { name: string; description: string; origin: string }[] };
  proposals?: () => { name: string; reason?: string }[];
}

/**
 * Run one report command by name. Returns null when the text is not one of
 * ours, so the caller can fall through to the legacy switch and then to the
 * model. This is the single dispatch table both Telegram and the panel chat
 * call — one implementation, two surfaces, no drift.
 */
export async function runReportCommand(text: string, deps: ReportDeps): Promise<ReportResult | null> {
  const [cmd, ...rest] = text.trim().split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd) {
    case '/help':
    case '/?':
      return ok(helpText());
    case '/logs':
      return logsReport(arg ? Number(arg) || 10 : 10);
    case '/config': {
      if (!arg) return configReport();
      if (rest[0] === 'set') {
        const key = rest[1] ?? '';
        const value = rest.slice(2).join(' ');
        if (!key || !value) return fail('usage: /config set <key> <value>');
        return configSet(key, value);
      }
      return configReport(arg);
    }
    case '/board':
      return boardReport();
    case '/disk':
      return diskReport();
    case '/perf':
      return perfReport();
    case '/doctor':
      return doctorReport();
    case '/security':
      return securityReport();
    case '/auth':
      return authReport(arg === 'audit' ? 'audit' : 'list');
    case '/devices':
      return devicesReport();
    case '/embeddings':
      return embeddingsReport();
    case '/dream': {
      if (arg === 'now' || arg === 'run') {
        // Fire-and-forget, exactly like the panel: consolidation can take
        // minutes and a chat must not hang on it.
        void runDream(deps.agent as never, { force: true }).catch(() => {});
        return dreamReport(arg);
      }
      return dreamReport();
    }
    case '/docs':
      return docsReport(arg || undefined);
    case '/skills':
      return skillsReport(deps.skills, deps.proposals?.() ?? []);
    case '/cron':
      return cronReport();
    case '/orders':
      return ordersReport(rest[0] ?? '', rest.slice(1).join(' '));
    default:
      return null;
  }
}

/** `next 2026-10-04 09:00`, or the reason the schedule cannot say. */
export function nextRunText(schedule: string, from = new Date()): string {
  try {
    const at = nextRun(parseCron(schedule), from);
    return at ? at.toISOString().slice(0, 16).replace('T', ' ') : '(no next run in a year)';
  } catch {
    return '(schedule not understood)';
  }
}

export type { Config };
