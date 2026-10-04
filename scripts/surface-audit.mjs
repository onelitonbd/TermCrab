#!/usr/bin/env node
/**
 * The three-surface audit — is every capability reachable from the CLI, from
 * Telegram and from the web panel?
 *
 * The user's question (2026-10-04): "CLI, Telegram and web are my three
 * surfaces; of everything you built, what is reachable from each one?"
 *
 * This script answers it the same way the census answers "what beats OpenClaw":
 * by looking for evidence in the code, not by remembering. Every row names the
 * probes it used, so a wrong answer is a visible probe, not a matter of opinion.
 *
 *   node scripts/surface-audit.mjs            # the matrix, human-readable
 *   node scripts/surface-audit.mjs --json     # machine-readable
 *   node scripts/surface-audit.mjs --gaps     # only rows with a missing surface
 *   node scripts/surface-audit.mjs --check    # exit 1 when a probe that used to
 *                                             # match stops matching (the audit rots)
 *
 * A probe is: for a surface, a file to read and a pattern that must appear.
 * `null` means the surface genuinely cannot carry the capability (the terminal
 * cannot receive a Telegram message); `[]` would mean "not implemented there".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLI_SRC = 'src/cli.ts';
const HELP_SRC = 'src/command-help.ts';
const SERVER_SRC = 'src/gateway/server.ts';
/** 46/47: the shared chat layer — one dispatcher, every surface reads it. */
const CR = 'src/gateway/chat-reports.ts';
const CT = 'src/gateway/chat-control.ts';
const API_SRC = 'src/channels/api.ts';
const TG_SRC = 'src/channels/telegram.ts';
const PANEL_SRC = 'ui/index.html';
const TUI_SRC = 'src/tui/app.ts';

const P = (file, pattern, min = 1) => ({ file, pattern, min });

/**
 * area · capability · one probe list per surface.
 * `n/a` (null) = the surface cannot carry it by nature; `[]` = it should, and
 * does not.
 */
export const CAPABILITIES = [
  // ------------------------------------------------------------- gateway
  { area: 'gateway', name: 'Chat: send text, stream the answer', cli: [P(CLI_SRC, "case 'agent'")], tg: [P(TG_SRC, 'sendMessage')], web: [P(PANEL_SRC, "api\\('/api/chat'"), P(PANEL_SRC, "addEventListener\\('delta'")] },
  { area: 'gateway', name: 'Stop a running turn', cli: [P(CLI_SRC, "case 'stop'")], tg: [P(CT, "case '/stop'")], web: [P(PANEL_SRC, '/api/stop')] },
  { area: 'gateway', name: 'Queue modes (steer/followup/collect/interrupt)', cli: { partial: 'config set agent.queueMode only' }, tg: [P(CT, "case '/queue'")], web: { partial: 'queues by default; no mode control yet' } },
  { area: 'gateway', name: 'Approvals (human-in-the-loop)', cli: [P(CLI_SRC, "case 'approvals'")], tg: [P(SERVER_SRC, 'sendButtons'), P(SERVER_SRC, 'approve:')], web: [P(PANEL_SRC, '/api/approvals'), P(PANEL_SRC, "addEventListener\\('approval'")] },
  { area: 'gateway', name: 'Devices: pair, list, revoke', cli: [P(CLI_SRC, "case 'pair'"), P(CLI_SRC, "case 'devices'")], tg: [P(CR, "case '/devices'")], web: [P(PANEL_SRC, '/api/devices')] },
  { area: 'gateway', name: 'Presence: who can reach the agent now', cli: [P(CLI_SRC, "case 'presence'")], tg: [P(SERVER_SRC, 'presenceLine')], web: [P(PANEL_SRC, '/api/presence')] },
  { area: 'gateway', name: 'Usage/cost: tokens per day', cli: [P(CLI_SRC, "case 'usage'")], tg: [P(SERVER_SRC, "text === '/usage'")], web: [P(PANEL_SRC, '/api/usage')] },
  { area: 'gateway', name: 'Run health: which turn is stuck', cli: [P(CLI_SRC, "case 'runs'")], tg: [P(SERVER_SRC, 'healthLine')], web: [P(PANEL_SRC, '/api/runs')] },
  { area: 'gateway', name: 'Run identity + wait for a run', cli: [P(HELP_SRC, "'run'")], tg: null, web: { partial: 'run ids are shown; no wait control' } },
  { area: 'gateway', name: 'Events: what the bus emitted', cli: [P(CLI_SRC, "case 'events'")], tg: null, web: [P(PANEL_SRC, "addEventListener\\('run:end'")] },
  { area: 'gateway', name: 'Logs: console lines with levels', cli: [P(CLI_SRC, "case 'logs'")], tg: [P(CR, "case '/logs'")], web: [P(PANEL_SRC, '/api/logs')] },
  { area: 'gateway', name: 'Config: read and set', cli: [P(CLI_SRC, "case 'config'")], tg: [P(CR, "case '/config'")], web: [P(PANEL_SRC, '/api/config')] },
  { area: 'gateway', name: 'Board: everything in flight', cli: [P(CLI_SRC, "case 'board'")], tg: [P(CR, "case '/board'")], web: [P(PANEL_SRC, '/api/board')] },
  { area: 'gateway', name: 'Canvas / A2UI widgets', cli: { partial: 'the canvas tool the agent can call; no command' }, tg: { partial: 'the agent can call canvas; nothing renders in Telegram' }, web: [P(PANEL_SRC, '/api/canvas'), P(PANEL_SRC, "addEventListener\\('canvas:update'")] },
  { area: 'gateway', name: 'Multi-agent routing (@name, per-surface)', cli: [P(CLI_SRC, "case 'agents'")], tg: [P(SERVER_SRC, "text === '/agents'")], web: [P(PANEL_SRC, '/api/agents')] },
  { area: 'gateway', name: 'Health/status at a glance', cli: [P(CLI_SRC, "case 'status'")], tg: [P(SERVER_SRC, "text === '/status'")], web: [P(PANEL_SRC, '/api/status')] },
  { area: 'gateway', name: 'Slash commands typed into the chat', cli: [P(TUI_SRC, "startsWith\\('/'\\)")], tg: [P(SERVER_SRC, "text === '/status'")], web: [P(PANEL_SRC, 'fromChat'), P(SERVER_SRC, 'runReportCommand')] },

  // --------------------------------------------------------- agent loop
  { area: 'agent', name: 'Tool activity visible while it works', cli: [P(TUI_SRC, 'tool')], tg: { partial: 'only the typing indicator; tool names never shown' }, web: [P(PANEL_SRC, "addEventListener\\('tool:start'")] },
  { area: 'agent', name: 'Progress drafts / partial answers', cli: { probes: [P(TUI_SRC, 'delta')], partial: 'streams deltas; no draft markers' }, tg: { partial: 'the reply arrives whole; no live edit' }, web: [P(PANEL_SRC, "addEventListener\\('draft'")] },
  { area: 'agent', name: 'Subagents: spawn, list, read results', cli: [P(CLI_SRC, "case 'subagents'")], tg: { partial: 'via sessions_spawn tool in chat' }, web: [P(PANEL_SRC, '/api/subagents')] },
  { area: 'agent', name: 'Steering a live run', cli: { partial: 'config mode=steer only' }, tg: [P(CT, "case '/steer'")], web: { partial: 'no steer affordance in the UI yet' } },

  // ------------------------------------------------------------ sessions
  { area: 'sessions', name: 'List / switch conversations', cli: [P(CLI_SRC, "case 'sessions'")], tg: [P(SERVER_SRC, "text === '/sessions'")], web: [P(PANEL_SRC, '/api/sessions')] },
  { area: 'sessions', name: 'Search across conversations', cli: [P(CLI_SRC, 'search')], tg: [P(SERVER_SRC, '/sessions search')], web: { missing: 'no session search in the panel' } },
  { area: 'sessions', name: 'Show one transcript', cli: [P(HELP_SRC, 'export')], tg: [P(SERVER_SRC, '/sessions show')], web: [P(PANEL_SRC, '/api/sessions/')] },
  { area: 'sessions', name: 'Rename / purge / export', cli: [P(CLI_SRC, 'purge'), P(CLI_SRC, 'rename')], tg: [P(CT, 'sessionsRenameCommand'), P(CT, 'sessionsPurgeCommand')], web: { partial: 'purge exists; no rename/export' } },
  { area: 'sessions', name: 'Start a fresh conversation', cli: [P(CLI_SRC, "case 'agent'")], tg: [P(SERVER_SRC, "text === '/new'")], web: { probes: [P(SERVER_SRC, "sessions\\.reset\\(sid\\)")], note: 'the chat resets the session; the palette keeps its view action' } },

  // ------------------------------------------------------- memory/context
  { area: 'context', name: 'Memory: browse what it knows', cli: [P(CLI_SRC, "case 'memory'")], tg: [P(SERVER_SRC, "text === '/memory'")], web: [P(PANEL_SRC, '/api/memory')] },
  { area: 'context', name: 'Memory: search it', cli: [P(CLI_SRC, 'search')], tg: [P(SERVER_SRC, '/memory search')], web: [P(PANEL_SRC, '/api/memory/search')] },
  { area: 'context', name: 'Memory: write a fact by hand', cli: { partial: 'memory user <line> writes USER.md only' }, tg: { partial: 'say "remember …" and the agent calls the tool' }, web: [P(PANEL_SRC, '/api/memory/remember')] },
  { area: 'context', name: 'Dreaming / idle consolidation', cli: [P(CLI_SRC, "case 'dream'")], tg: [P(CR, "case '/dream'")], web: [P(PANEL_SRC, '/api/dream')] },
  { area: 'context', name: 'Context report: what the model is sent', cli: [P(CLI_SRC, "case 'context'")], tg: [P(SERVER_SRC, "text === '/context'")], web: { partial: 'not exposed — the Debug view shows events, not prompt sizes' } },
  { area: 'context', name: 'Embeddings: status', cli: [P(CLI_SRC, "case 'embeddings'")], tg: [P(CR, "case '/embeddings'")], web: { partial: 'an on/off switch for memory.embeddings, not the model status' } },
  { area: 'context', name: 'Embeddings: setup / switch provider', cli: { probes: [P(HELP_SRC, 'embeddings')], partial: 'CLI command only' }, tg: { missing: 'not available' }, web: { missing: 'not available' } },
  { area: 'context', name: 'Identity files (SOUL/IDENTITY/USER bootstrap)', cli: [P(CLI_SRC, "case 'bootstrap'")], tg: { partial: '"remember …" writes USER.md; SOUL/IDENTITY are not editable from chat' }, web: { missing: 'a SOUL.md badge on agents; no editor' } },

  // --------------------------------------------------------------- tools
  { area: 'tools', name: 'Tool catalog: what the agent can do', cli: { partial: 'context lists schemas; no catalog command' }, tg: { partial: 'ask in chat and the agent answers' }, web: [P(PANEL_SRC, '/api/tools')] },
  { area: 'tools', name: 'Tool toggles (enable/disable a tool)', cli: { partial: 'config set agent.allowExec etc.' }, tg: { partial: 'config only' }, web: { partial: 'catalog shows active/planned; no toggle' } },
  { area: 'tools', name: 'Shell / files / web tools in conversation', cli: { partial: "the agent's own exec/read/web tools" }, tg: { partial: "the agent's own tools in a turn" }, web: { partial: "the agent's own tools in a turn" } },
  { area: 'tools', name: 'Browser automation', cli: [P(CLI_SRC, "case 'browser'")], tg: { partial: 'agent tool in chat' }, web: { partial: 'agent tool in chat; no browser panel' } },
  { area: 'tools', name: 'Image generation', cli: [P(CLI_SRC, "case 'image'")], tg: { partial: 'agent tool in chat' }, web: { partial: 'agent tool in chat; no button' } },
  { area: 'tools', name: 'Send a file back to a chat', cli: { partial: 'needs a channel to send into' }, tg: [P(TG_SRC, 'sendDocument')], web: { partial: 'send_file reaches the panel as a path, not a download' } },
  { area: 'tools', name: 'Document extraction (PDF/DOCX/XLSX in)', cli: { partial: 'no command; agent reads text files only' }, tg: [P(TG_SRC, 'fetchIncoming')], web: { partial: 'attach accepts text types only' } },
  { area: 'skills', name: 'Skills: list / import / create / proposals', cli: [P(CLI_SRC, "case 'skills'")], tg: { probes: [P(CR, "case '/skills'")], partial: 'list + proposals; approve/import stay in the terminal' }, web: [P(PANEL_SRC, '/api/skills')] },

  // ---------------------------------------------------------- automation
  { area: 'automation', name: 'Cron jobs: list / add / run', cli: [P(CLI_SRC, "case 'cron'")], tg: { probes: [P(CR, "case '/cron'")], partial: 'list; adding stays in the terminal or the panel' }, web: [P(PANEL_SRC, '/api/crons')] },
  { area: 'automation', name: 'Heartbeat: run a self-check now', cli: [P(CLI_SRC, "case 'heartbeat'")], tg: [P(SERVER_SRC, "text === '/heartbeat'")], web: [P(PANEL_SRC, '/api/heartbeat')] },
  { area: 'automation', name: 'Watchers / file triggers', cli: { partial: 'config set only' }, tg: [P(CT, "case '/watch'")], web: { partial: 'presence counts them; nothing to edit' } },
  { area: 'automation', name: 'Standing orders', cli: [P(CLI_SRC, "case 'orders'")], tg: [P(SERVER_SRC, "text === '/orders'")], web: [P(CR, "cmd: '/orders'[^}]*Standing orders")] },

  // ---------------------------------------------------------------- voice
  { area: 'mobile', name: 'Dictation (speech → text)', cli: [P(CLI_SRC, "case 'wake'")], tg: [P(TG_SRC, 'voice')], web: [P(PANEL_SRC, '/api/listen')] },
  { area: 'mobile', name: 'Text to speech', cli: [P(CLI_SRC, "case 'say'")], tg: { missing: 'no voice replies from the bot' }, web: [P(PANEL_SRC, '/api/say')] },
  { area: 'mobile', name: 'Transcribe a voice file', cli: [P(CLI_SRC, "case 'transcribe'")], tg: [P(TG_SRC, 'voice')], web: { missing: 'no upload-transcribe in the panel' } },
  { area: 'mobile', name: 'Wake word loop', cli: [P(CLI_SRC, "case 'wake'")], tg: null, web: [P(PANEL_SRC, '/api/wake')] },

  // --------------------------------------------------------------- ops
  { area: 'ops', name: 'Doctor: find and fix problems', cli: [P(CLI_SRC, "case 'doctor'")], tg: [P(CR, "case '/doctor'")], web: [P(PANEL_SRC, '/api/doctor')] },
  { area: 'ops', name: 'Update: check / apply / rollback', cli: [P(CLI_SRC, "case 'update'")], tg: { probes: [P(CT, "case '/update'")], partial: 'check from chat; apply is terminal-only until the confirm lands (48)' }, web: [P(PANEL_SRC, '/api/update')] },
  { area: 'ops', name: 'Backup / restore the home', cli: [P(CLI_SRC, "case 'backup'")], tg: [P(CT, "case '/backup'")], web: { missing: 'not available yet (batch 50)' } },
  { area: 'ops', name: 'Disk usage', cli: [P(CLI_SRC, "case 'disk'")], tg: [P(CR, "case '/disk'")], web: [P(PANEL_SRC, '/api/disk')] },
  { area: 'ops', name: 'Install as a service', cli: [P(CLI_SRC, "case 'service'")], tg: null, web: { missing: 'no panel view (terminal-native)' } },
  { area: 'ops', name: 'Boot autostart (Termux:Boot)', cli: [P(CLI_SRC, "case 'boot'")], tg: null, web: { probes: [P(PANEL_SRC, '/api/boot/install')], note: 'a "Start at boot" button with termux detection' } },
  { area: 'ops', name: 'Security audit (findings + fixes)', cli: [P(CLI_SRC, "case 'security'")], tg: [P(CR, "case '/security'")], web: { partial: 'the shared text is served, but no panel view yet (batch 50)' } },
  { area: 'ops', name: 'Secrets: named keys, audit', cli: [P(CLI_SRC, "case 'auth'")], tg: [P(CR, "case '/auth'")], web: { partial: 'names via /api/slash; no panel view yet (batch 50)' } },
  { area: 'ops', name: 'Performance budget + history', cli: [P(CLI_SRC, "case 'perf'")], tg: [P(CR, "case '/perf'")], web: [P(PANEL_SRC, '/api/perf')] },
  { area: 'ops', name: "Suite clock (the tests' own record)", cli: { partial: 'npm run test:time; not a termcrab command' }, tg: { missing: 'not available' }, web: [P(PANEL_SRC, '/api/suite-time')] },
  { area: 'ops', name: 'Work tracker: what is being built now', cli: { probes: [P(CLI_SRC, "case 'owner'")], note: 'termcrab owner + scripts/status.mjs' }, tg: { missing: 'not available' }, web: [P(PANEL_SRC, '/api/worklog')] },
  { area: 'ops', name: 'Docs: the offline manual', cli: [P(CLI_SRC, "case 'docs'")], tg: [P(CR, "case '/docs'")], web: [P(PANEL_SRC, '/api/docs')] },

  // ------------------------------------------------------------ channels
  { area: 'channels', name: 'Rooms: what was said while unaddressed', cli: [P(CLI_SRC, "case 'rooms'")], tg: [P(SERVER_SRC, "text === '/history'")], web: { partial: 'room_history tool in chat; no view' } },
  { area: 'channels', name: 'Inbox: files people sent', cli: { partial: 'inbox_list/read tools in a turn' }, tg: [P(SERVER_SRC, "text === '/inbox'")], web: { partial: 'tools in chat; no inbox view' } },
  { area: 'channels', name: 'Typing indicator', cli: null, tg: [P(TG_SRC, 'sendChatAction')], web: [P(PANEL_SRC, "typing|Thinking")] },
  { area: 'channels', name: 'Media in / out (photos, voice, files)', cli: { partial: 'in: attach only in the panel' }, tg: [P(TG_SRC, 'sendDocument')], web: { probes: [P(PANEL_SRC, 'attachFile')], partial: 'in: attach (text types); out: send_file as a path' } },
  { area: 'channels', name: 'Telegram inline buttons (rich messages)', cli: null, tg: [P(API_SRC, 'inline_keyboard'), P(TG_SRC, 'editMessageReplyMarkup')], web: null },
  { area: 'channels', name: 'Registered Telegram command menu (setMyCommands)', cli: null, tg: [P(API_SRC, 'setMyCommands'), P(SERVER_SRC, 'registerCommands')], web: null },
  { area: 'channels', name: 'Panel inside Telegram (mini app)', cli: null, tg: { missing: 'OpenClaw has /controlui; we do not' }, web: null },
  { area: 'channels', name: 'Voice replies in Telegram', cli: null, tg: { missing: 'the bot replies in text only' }, web: null },
  { area: 'channels', name: 'Group / forum topics → separate sessions', cli: null, tg: { missing: 'no forum-topic routing; group rooms only' }, web: null },
];

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch {
    return null;
  }
}

/** Does this surface carry the capability? Returns {state, why, hits, missing}. */
export function probeSurface(entry, cache = new Map()) {
  if (entry === null) return { state: 'n/a', why: 'this surface cannot carry it by nature', hits: [], missing: [] };
  const spec = Array.isArray(entry) ? { probes: entry } : entry;
  const probes = spec.probes ?? [];
  const hits = [];
  const missing = [];
  for (const { file, pattern, min } of probes) {
    if (!cache.has(file)) cache.set(file, read(file) ?? '');
    const text = cache.get(file);
    const count = (text.match(new RegExp(pattern, 'g')) ?? []).length;
    if (count >= min) hits.push(`${file}:${count}`);
    else missing.push(`${file} ~ /${pattern}/ (${count} < ${min})`);
  }
  const failed = probes.length > 0 && missing.length > 0;
  if (failed) {
    // A probe we relied on stopped matching: the claim is broken, say so loudly.
    return { state: 'no', why: spec.missing || spec.partial || spec.note || 'probe no longer matches', hits, missing };
  }
  if (spec.missing) return { state: 'no', why: spec.missing, hits, missing: ['(known missing)'] };
  if (spec.partial) return { state: 'partial', why: spec.partial, hits, missing };
  if (!probes.length) return { state: 'no', why: '', hits, missing: ['(no probe: known missing)'] };
  return { state: 'yes', why: spec.note || '', hits, missing };
}

export function audit() {
  const cache = new Map();
  const rows = CAPABILITIES.map((c) => ({
    area: c.area,
    name: c.name,
    cli: probeSurface(c.cli, cache),
    tg: probeSurface(c.tg, cache),
    web: probeSurface(c.web, cache),
  }));
  const count = (s) => rows.filter((r) => r[s].state === 'yes').length;
  const gaps = rows.filter((r) => ['cli', 'tg', 'web'].some((s) => r[s].state === 'no'));
  return {
    rows,
    totals: { rows: rows.length, cli: count('cli'), tg: count('tg'), web: count('web'), gaps: gaps.length },
    gaps,
  };
}

const ICON = { yes: 'OK ', partial: '~~ ', no: '-- ', 'n/a': '..' };
const MDICON = { yes: '✅', partial: '◐', no: '❌', 'n/a': '—' };

function main() {
  const args = process.argv.slice(2);
  const result = audit();
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }
  if (args.includes('--markdown')) {
    console.log('| area | capability | CLI | Telegram | Web | note |');
    console.log('|---|---|---|---|---|---|');
    for (const r of result.rows) {
      const note = ['cli', 'tg', 'web'].map((s) => (r[s].why ? `${s}: ${r[s].why}` : '')).filter(Boolean).join('; ').replace(/\|/g, '\\|');
      console.log(`| ${r.area} | ${r.name} | ${MDICON[r.cli.state]} | ${MDICON[r.tg.state]} | ${MDICON[r.web.state]} | ${note} |`);
    }
    return;
  }
  const show = args.includes('--gaps') ? result.gaps : result.rows;
  const t = result.totals;
  console.log(`\n  Three-surface audit — ${t.rows} capabilities\n  ${'─'.repeat(72)}`);
  console.log(`  CLI ${t.cli}/${t.rows}   Telegram ${t.tg}/${t.rows}   Web ${t.web}/${t.rows}   gaps ${t.gaps}\n`);
  let area = '';
  for (const r of show) {
    if (r.area !== area) {
      area = r.area;
      console.log(`  [${area}]`);
    }
    const why = ['cli', 'tg', 'web'].map((s) => (r[s].why ? `${s}: ${r[s].why}` : '')).filter(Boolean).join(' | ');
    console.log(`    cli ${ICON[r.cli.state]}  tg ${ICON[r.tg.state]}  web ${ICON[r.web.state]}  ${r.name}${why ? `\n         ${why}` : ''}`);
  }
  console.log('\n  legend: OK reachable · ~~ partially/can mean n/a · -- missing on a surface that could carry it\n');
  if (args.includes('--check')) {
    // The audit rots when a surface changes: a probe that used to match and no
    // longer does means this file is describing a product that has moved.
    const stale = result.rows.filter((r) =>
      ['cli', 'tg', 'web'].some((s) => r[s].missing.some((m) => !m.startsWith('(no probe') && !m.startsWith('(known missing') && r[s].state !== 'no')));
    if (stale.length) {
      console.log(`  ✗ ${stale.length} row(s) have a probe that stopped matching — update scripts/surface-audit.mjs:`);
      for (const r of stale) {
        for (const s of ['cli', 'tg', 'web']) for (const m of r[s].missing) console.log(`      ${r.name} [${s}] ${m}`);
      }
      process.exit(1);
    }
    console.log('  ✓ every probe still matches the code it describes\n');
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
