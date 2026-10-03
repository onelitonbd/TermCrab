#!/usr/bin/env node
/**
 * census.mjs — measure TermCrab's real surface, and how far it is from OpenClaw.
 *
 * The whole point of this file: the answer to "where am I?" must come from the
 * code, not from memory. Every row below is a claim with two halves:
 *
 *   1. `verdict`  — a judgement, made by reading the code (recorded 2026-10-03,
 *                   commit 56455cd).
 *   2. `probe`    — a machine check that re-reads the source every run.
 *
 * If a probe stops matching, the row is reported as DRIFT: the code moved, so
 * the judgement must be re-made. That is the anti-rot mechanism — the tracker
 * cannot silently go stale the way `docs/ARCHITECTURE.md` did.
 *
 * Usage:
 *   node scripts/census.mjs                     # table + drift report
 *   node scripts/census.mjs --json              # machine-readable dump
 *   node scripts/census.mjs --write             # refresh data/census.json + TRACKER block
 *   node scripts/census.mjs --area gateway      # one area
 *
 * OpenClaw reference counts come from the generated catalogue in
 * docs/openclaw/sections/ (see scripts/openclaw-docs-report.mjs).
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const wantJson = args.includes('--json');
const wantWrite = args.includes('--write');
const onlyArea = args.includes('--area') ? args[args.indexOf('--area') + 1] : null;

// ------------------------------------------------------------------ primitives

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const SRC_FILES = walk(path.join(ROOT, 'src')).filter((f) => f.endsWith('.ts'));
const UI_FILE = path.join(ROOT, 'ui', 'index.html');
const TEST_FILES = walk(path.join(ROOT, 'test')).filter((f) => f.endsWith('.ts'));
const SKILL_FILES = walk(path.join(ROOT, 'skills')).filter((f) => f.endsWith('.md'));

const rel = (f) => path.relative(ROOT, f);
const cache = new Map();
function read(f) {
  if (!cache.has(f)) cache.set(f, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
  return cache.get(f);
}

/** Which source files contain `needle` (plain string or regex). */
function hits(needle, files = SRC_FILES) {
  const re = needle instanceof RegExp ? needle : new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const found = [];
  for (const f of files) {
    const text = read(f);
    const m = re.exec(text);
    if (m) {
      const line = text.slice(0, m.index).split('\n').length;
      found.push(`${rel(f)}:${line}`);
    }
  }
  return found;
}

function countMatches(needle, files = SRC_FILES) {
  const re = needle instanceof RegExp ? needle : new RegExp(needle, 'g');
  let n = 0;
  for (const f of files) n += (read(f).match(re) || []).length;
  return n;
}

// ------------------------------------------------------------------- the checks
//
// verdict:  WORKING  — wired and observable
//           PARTIAL  — exists, narrower than OpenClaw's equivalent
//           BROKEN   — the code exists but nothing reaches it (the worst kind:
//                      it looks like a feature in the file tree and does nothing)
//           ABSENT   — nothing in the tree
//           BETTER   — TermCrab is ahead of OpenClaw here
//
// effort:   remaining days of one focused developer to reach "good enough",
//           used to compute the honest distance-to-parity in ROADMAP.md.

const C = [];
const check = (area, capability, openclaw, verdict, evidence, probe = null, effort = 0, lane = 'parity') =>
  C.push({ area, capability, openclaw, verdict, evidence, probe, effort, lane });

// ---------------------------------------------------------------- 1. gateway
check('gateway', 'HTTP API + event stream', 'typed WS protocol on :18789', 'WORKING',
  'src/gateway/server.ts:251 startGateway, 77 route handlers', { pattern: "pathname === '/api/event", expect: 'present' }, 0);
check('gateway', 'SSE live event feed', 'WS push + replay', 'WORKING',
  'src/gateway/server.ts:713 GET /api/events (text/event-stream)', { pattern: 'text/event-stream', expect: 'present' }, 0);
check('gateway', 'Request authentication', 'token + device pairing + nonces', 'PARTIAL',
  'src/gateway/server.ts:731 every /api/* route requires checkToken(config, extractAuth(req)); 401 + www-authenticate; ui/index.html asks for the password (#pwGate). No device pairing/nonces yet (separate row)',
  { pattern: 'checkToken(config, extractAuth(req))', expect: 'present' }, 0);
check('gateway', 'Bind-time safety guard', 'loopback-first defaults', 'WORKING',
  'src/gateway/server.ts:257 refuses non-loopback without token', { pattern: 'non-loopback', expect: 'present' }, 0);
check('gateway', 'Pairing / device identity', 'device challenge + approval + store', 'ABSENT',
  'no device pairing in src/ (the only "pairing" is WhatsApp QR login in src/channels/whatsapp.ts:14)',
  { pattern: /devicePair|pairingStore|approveDevice/, expect: 'absent' }, 4);
check('gateway', 'Typed wire protocol + idempotency', 'TypeBox schemas, req/res/event frames', 'ABSENT',
  'plain HTTP JSON, no schema layer', { pattern: 'TypeBox|typebox', expect: 'absent' }, 6);
check('gateway', 'Config hot-reload', 'watch + validate + apply', 'PARTIAL',
  'fs.watch + debounce + merge + provider re-resolve (src/gateway/server.ts:302,346), pinned by test/api.test.ts "config file password change hot-applies"; the fresh file is not schema-validated before the merge',
  { pattern: 'fs.watch', expect: 'present' }, 1);
check('gateway', 'Health / status endpoint', 'health + presence + doctor', 'WORKING',
  'src/gateway/server.ts /api/health, /api/status, /api/doctor', { pattern: "/api/doctor", expect: 'present' }, 0);
check('gateway', 'Inbound webhooks', 'authenticated agent hooks', 'WORKING',
  'POST /api/hooks/:id requires the per-hook token via x-hook-token or ?token= (src/gateway/server.ts:698), compared in constant time (src/gateway/auth.ts constantTimeEqual); unknown hook stays 404. Covered by test/auth.test.ts',
  { pattern: 'x-hook-token', expect: 'present' }, 0);
check('gateway', 'Approval queue + endpoint', 'operator approvals, HITL gates', 'WORKING',
  'src/core/approvals.ts is now live: loop.ts consults needsApproval() before a gated tool runs, emits the approval over SSE, waits with a timeout + default policy, and the decision is answerable from the panel (POST /api/approvals/:id/approve|deny) or the CLI (termcrab approvals). Pinned by test/approvals.test.ts (6.1-6.5)',
  { pattern: /needsApproval\(/, expect: 'present' }, 0);
check('gateway', 'Canvas / A2UI widgets', 'agent-driven UI widgets', 'PARTIAL',
  'src/gateway/canvas.ts + /api/canvas', { pattern: 'canvas', expect: 'present' }, 0);
check('gateway', 'Multi-agent routing', 'per-agent workspace, session, store', 'PARTIAL',
  'workspace/agents/<name>/SOUL.md + parseAgentPrefix (src/gateway/server.ts:48)', { pattern: 'listAgents', expect: 'present' }, 3);
check('gateway', 'Presence', 'online/typing/presence events', 'ABSENT',
  'no presence module', { pattern: 'presence', expect: 'absent' }, 2);
check('gateway', 'Remote access story', 'Tailscale, SSH, trusted proxy, TLS pinning', 'PARTIAL',
  'docs/REMOTE.md documents tunnels; bind guard exists (src/gateway/server.ts:257) but no enforced auth',
  { pattern: /non-loopback/, expect: 'present' }, 3);
check('gateway', 'Usage / token accounting', 'per-run, per-model, per-session', 'ABSENT',
  'no usage field in src/providers/types.ts or src/agent/loop.ts; the UI cannot show cost',
  { pattern: /promptTokens|totalTokens|completionTokens/, expect: 'absent' }, 3);
check('gateway', 'Stuck-run diagnostics', 'stalled/stuck session notices, watchdogs', 'ABSENT',
  'no session watchdog', { pattern: 'stalled|stuck', expect: 'absent' }, 3);

// -------------------------------------------------------------- 2. agent loop
check('agent', 'Streaming assistant deltas', 'block streaming + coalescing', 'WORKING',
  'src/agent/loop.ts emits delta events; src/providers/openai.ts parses SSE', { pattern: "'delta'", expect: 'present' }, 0);
check('agent', 'Tool calling round-trip', 'parallel + serialized batches', 'WORKING',
  'src/agent/loop.ts:245 sequential tool execution', { pattern: 'tool:start', expect: 'present' }, 0);
check('agent', 'Per-session run serialization', 'session lanes + writer claims', 'WORKING',
  'src/agent/sessions.ts SessionQueue.submit/pump/drain runs one turn at a time per session; test/queue-serialize.test.ts 5.1/5.3 pin order and no interleaving (transcript write fencing is tracked separately)',
  { pattern: 'private async drain', expect: 'present' }, 0);
check('agent', 'Queue modes steer/followup/collect/interrupt', '4 modes + debounce + cap', 'WORKING',
  'all four modes live in SessionQueue.submit; collect merges a waiting burst into one run; MAX_QUEUED_TURNS caps a backlog (HTTP 429); test/queue-serialize.test.ts 5.3-5.6',
  { pattern: 'MAX_QUEUED_TURNS', expect: 'present' }, 0);
check('agent', 'Run identity + terminal wait', 'runId + agent.wait replay', 'PARTIAL',
  'newRunId() in loop.ts:114; no wait endpoint (only sessions/agents_wait tools)', { pattern: 'newRunId', expect: 'present' }, 2);
check('agent', 'Parallel tool batches', 'launched together, results merged', 'ABSENT',
  'loop.ts:245 is a sequential for-await', { pattern: 'Promise.all\\(.*execute', expect: 'absent' }, 3);
check('agent', 'Loop budget + idle watchdog', '172800s budget, 120s/300s idle, overflow recovery', 'PARTIAL',
  'PROVIDER_TIMEOUT_MS 180s whole-request (loop.ts:53) + maxIter 1000 (loop.ts:197)', { pattern: 'PROVIDER_TIMEOUT_MS', expect: 'present' }, 3);
check('agent', 'Repetition / loop detection', 'repeated-call guards', 'WORKING',
  'src/agent/loop.ts:249-264 repetition detector', { pattern: 'repetition', expect: 'present' }, 0);
check('agent', 'Model failover chain', 'ordered chain + cooldowns + auth profiles', 'WORKING',
  'resolveProviderChain + cooldowns (src/providers/index.ts)', { pattern: 'resolveProviderChain', expect: 'present' }, 1);
check('agent', 'Reasoning / thinking levels', '7 levels incl. minimal/ultra', 'WORKING',
  'src/providers/capabilities.ts 6 levels + effort mapping', { pattern: 'thinking', expect: 'present' }, 1);
check('agent', 'Steering into a live run', 'runtime-boundary steering', 'WORKING',
  "a steered message joins the running turn's transcript inside the same run (loop.ts drains SessionQueue.takeSteers); a 'steer' event is emitted; test/queue-serialize.test.ts 5.4/5.4b",
  { pattern: 'takeSteers', expect: 'present' }, 0);
check('agent', 'Abort / stop a running turn', 'Esc, /stop, /abort', 'PARTIAL',
  'AbortSignal plumbed through providers; no user-facing abort route in the web panel', { pattern: 'AbortController', expect: 'present' }, 2);
check('agent', 'Lifecycle hooks', '14 typed hooks + HOOK.md', 'ABSENT',
  'no hook registry (no api.on / registerHook)', { pattern: 'registerHook|api\\.on\\(', expect: 'absent' }, 12);
check('agent', 'Subagents', 'sessions_spawn, agents_wait, lanes, worktrees', 'PARTIAL',
  'sessions_spawn/agents_wait/sessions_yield in src/agent/toolbox.ts:798+', { pattern: 'sessions_spawn', expect: 'present' }, 6);
check('agent', 'Progress drafts / partial updates', 'incremental draft messages', 'PARTIAL',
  'progress_card tool + src/agent/progress.ts', { pattern: 'progress', expect: 'present' }, 1);
check('agent', 'Timeouts + error containment', 'per-phase budgets', 'WORKING',
  'loop.ts containment; tests in test/loop.test.ts', { pattern: 'error', expect: 'present' }, 0);

// -------------------------------------------------------------- 3. sessions
check('sessions', 'Transcript persistence', 'SQLite + archived JSONL + WAL', 'PARTIAL',
  'JSONL append in src/agent/sessions.ts:39; no DB', { pattern: 'appendFileSync', expect: 'present' }, 0);
check('sessions', 'Transcript write fencing', 'expectedWriterRunId on every append', 'ABSENT',
  'no writer claim anywhere', { pattern: 'expectedWriterRunId', expect: 'absent' }, 4);
check('sessions', 'Session search', 'anchored snippet search + redaction', 'PARTIAL',
  'toolbox.ts substring search over 30 sessions, no anchors', { pattern: 'sessions_search', expect: 'present' }, 3);
check('sessions', 'Lifecycle reset policies', 'mode none|daily|idle + atHour', 'ABSENT',
  'manual /new only (server.ts:498)', { pattern: 'resetByType|identityLinks', expect: 'absent' }, 3);
check('sessions', 'Multi-user scoping', 'dmScope 4 modes + identity links', 'PARTIAL',
  'per-chat key `${channel}:${chatId}` (server.ts:496) — isolated by accident', { pattern: 'dmScope', expect: 'absent' }, 3);
check('sessions', 'Session tools surface', 'sessions_list/history/search/send/status', 'WORKING',
  'src/agent/toolbox.ts:644-880', { pattern: 'sessions_list', expect: 'present' }, 0);
check('sessions', 'Main rolling session', 'agent:<id>:main with background routing', 'ABSENT',
  'five separate session keys (web:main, telegram:*, cron:*, heartbeat, dream)', { pattern: "'heartbeat'", expect: 'present' }, 8);
check('sessions', 'Session attachment (multi-client)', 'openclaw attach, projections', 'ABSENT',
  'CLI builds its own AgentCtx (src/cli.ts:298) and writes the same JSONL the gateway writes',
  { pattern: /attachSession|attachToGateway/, expect: 'absent' }, 8);

// ---------------------------------------------------------- 4. context/memory
check('context', 'Compaction that preserves history', 'summary + full history stays on disk', 'BROKEN',
  'src/agent/sessions.ts:154,187 rewrite the .jsonl in place; buildDigest truncates entries to 200 chars',
  { pattern: 'buildDigest', expect: 'present' }, 4);
check('context', 'LLM summarisation for compaction', 'separate compaction model', 'ABSENT',
  'no summarisation call; truncation only', { pattern: 'compactionModel|compactWith', expect: 'absent' }, 3);
check('context', 'Tool-result pruning', 'contextPruning cache-ttl, provider-side clear', 'ABSENT',
  'no pruning path', { pattern: 'prune', expect: 'absent' }, 3);
check('context', 'Pluggable context engine', 'ContextEngine info/ingest/assemble/compact', 'ABSENT',
  'prompt is assembled inline in src/agent/prompt.ts', { pattern: 'ContextEngine', expect: 'absent' }, 10);
check('context', 'Context introspection (/context)', 'list|detail|map breakdown', 'ABSENT',
  'no /context command or route', { pattern: '/context', expect: 'absent' }, 3);
check('context', 'Memory store layout', 'MEMORY.md, USER.md, daily logs, DREAMS.md', 'PARTIAL',
  'src/agent/memory.ts MEMORY.md + daily/*.md + compacted/*.md; no USER.md', { pattern: 'MEMORY.md', expect: 'present' }, 3);
check('context', 'Memory bootstrap injection', 'budgeted, provenance-gated, refreshed', 'BROKEN',
  'src/agent/prompt.ts readHead(3000) is head-only while remember() appends — new facts can never enter context',
  { pattern: 'readHead', expect: 'present' }, 2);
check('context', 'USER.md user model', 'separate, imperative, supersede-in-place', 'ABSENT',
  'grep USER.md in src/ hits only src/migrate/openclaw.ts', { pattern: 'USER\\.md', expect: 'only-migration' }, 3);
check('context', 'Memory provenance / taint', 'owner|agent|untrusted|system columns', 'ABSENT',
  'no provenance anywhere', { pattern: 'provenance|taint', expect: 'absent' }, 10);
check('context', 'Memory search quality', 'hybrid vector+BM25, decay, MMR, trigger injection', 'PARTIAL',
  'lexical counting + optional cosine (src/agent/embed.ts), no BM25/decay/importance/injection',
  { pattern: 'cosine', expect: 'present' }, 8);
check('context', 'Embedding providers', 'OpenAI, Voyage, Gemini, Ollama, local GGUF, FTS-only', 'PARTIAL',
  'local transformers.js only (Xenova/all-MiniLM-L6-v2), optional install', { pattern: 'transformers', expect: 'present' }, 4);
check('context', 'Dreaming / idle consolidation', 'idle-cycle log → memory distillation', 'WORKING',
  'src/agent/dream.ts + CLI dream + /api/dream — a genuine TermCrab strength', { pattern: 'dream', expect: 'present' }, 0);
check('context', 'Bootstrap file set', 'AGENTS, SOUL, IDENTITY, USER, BOOTSTRAP, MEMORY', 'PARTIAL',
  'SOUL.md + AGENTS.md roster + memory head; IDENTITY.md/BOOTSTRAP.md absent', { pattern: 'SOUL.md', expect: 'present' }, 3);

// ------------------------------------------------------------------ 5. tools
check('tools', 'Shell execution', 'exec with policy + approvals', 'PARTIAL',
  'src/agent/tools.ts:256 exec behind agent.allowExec, no approval gate', { pattern: "name: 'exec'", expect: 'present' }, 2);
check('tools', 'File operations', 'root-bounded fs-safe tools', 'WORKING',
  'read_file/write_file/list_dir with allowed roots (tools.ts:22,97)', { pattern: 'path outside allowed roots', expect: 'present' }, 0);
check('tools', 'Web fetch + search', 'fetch, search providers, link understanding', 'WORKING',
  'web_fetch (tools.ts) + web_search (toolbox.ts)', { pattern: 'web_search', expect: 'present' }, 0);
check('tools', 'Browser automation', 'CDP + Playwright + OAuth flows', 'PARTIAL',
  'CDP browser tool requires system Chrome; off by default', { pattern: 'browser', expect: 'present' }, 6);
check('tools', 'Sandboxed code execution', 'QuickJS code-mode with host bindings', 'PARTIAL',
  'code_exec via Node vm (tools.ts:509+)', { pattern: 'code_exec', expect: 'present' }, 4);
check('tools', 'MCP client', 'MCP + ACP protocols', 'WORKING',
  'src/providers/mcp.ts (stdio JSON-RPC) wired at server.ts:345 into AgentCtx', { pattern: 'createMcpClient', expect: 'present' }, 2);
check('tools', 'Phone / device tools', 'iOS+Android nodes (camera, screen, location)', 'BETTER',
  '15 Termux:API tools in src/agent/toolbox.ts (camera, location, sms, clipboard, battery, wifi, notification…)',
  { pattern: 'battery', expect: 'present' }, 0);
check('tools', 'Image / media generation', 'image, video, music generation', 'ABSENT',
  'no generation tools', { pattern: 'image_gen|generate_image', expect: 'absent' }, 6);
check('tools', 'Document extraction', 'pdf/docx/pptx extraction', 'ABSENT',
  'no document tools', { pattern: 'pdf', expect: 'absent' }, 3);
check('tools', 'Tool count', '~44 in-loop tools + plugin tools', 'PARTIAL',
  '41 in toolbox.ts + 13 in tools.ts', { pattern: "name: '", expect: 'present' }, 0);
check('tools', 'Tool schema validation', 'TypeBox-validated arguments', 'PARTIAL',
  'lightweight hand-rolled argument parsing', { pattern: 'argStr', expect: 'present' }, 3);
check('tools', 'Human-in-the-loop prompts', 'ask_user overlay + timers', 'PARTIAL',
  'ask_user tool exists (toolbox.ts:894) and gated tools now raise a real approval card (panel + CLI) - but there is still no terminal/TUI renderer, so the loop only pauses where a browser or a second terminal can answer',
  { pattern: 'ask_user', expect: 'present' }, 2);

// ----------------------------------------------------------------- 6. skills
check('skills', 'SKILL.md loading', 'progressive disclosure + gating', 'WORKING',
  'src/skills/loader.ts + load_skill tool (tools.ts:318)', { pattern: 'load_skill', expect: 'present' }, 0);
check('skills', 'Bundled skill library', '49 bundled + 13k ClawHub', 'PARTIAL',
  '5 bundled: daily-briefing, shell-safety, termux-api, voice, web-research', { pattern: 'SKILL.md', expect: 'present' }, 6);
check('skills', 'Skill precedence + overrides', 'multi-root precedence, allowlists', 'PARTIAL',
  'src/skills/loader.ts + registry.ts resolve user skills over bundled ones; no gating/allowlists',
  { pattern: /SkillStore|userOverride|resolveSkills/, expect: 'present' }, 2);
check('skills', 'Agent-authored skills', 'skill-workshop review flow', 'PARTIAL',
  'skill_workshop tool (toolbox.ts) + scaffold.ts', { pattern: 'skill_workshop', expect: 'present' }, 3);
check('skills', 'Skill registry / distribution', 'ClawHub + signed manifests', 'ABSENT',
  'no registry by design; termcrab import openclaw is the only path', { pattern: 'clawhub|registry', expect: 'absent' }, 0);
check('skills', 'OpenClaw compatibility', 'n/a', 'BETTER',
  'termcrab import openclaw reads their SKILL.md folders and workspace files unchanged (src/migrate/openclaw.ts, 558 lines)',
  { paths: ['src/migrate/openclaw.ts'], expect: 'present' }, 0);

// ---------------------------------------------------------------- 7. plugins
check('plugins', 'Plugin API + lifecycle', '164 extensions, typed SDK, hot reload', 'ABSENT',
  'packages/plugin-sdk/index.ts is a stub; no loader', { pattern: 'registerPlugin|loadPlugin', expect: 'absent' }, 15);
check('plugins', 'Channel plugin interface', 'external channel packages', 'ABSENT',
  'channels are compiled in (src/gateway/server.ts:37-48)', { pattern: 'channelPlugin', expect: 'absent' }, 8);
check('plugins', 'Provider plugin interface', '35+ model providers as packages', 'ABSENT',
  'one OpenAI-compatible client with host presets (src/providers/index.ts:10)', { pattern: 'providerPlugin', expect: 'absent' }, 6);
check('plugins', 'Plugin manifest + permissions', 'manifest, allowlists, install policy', 'ABSENT',
  'nothing to install and no permission model', { pattern: /pluginManifest|plugin\.json/, expect: 'absent' }, 6);

// --------------------------------------------------------------- 8. channels
check('channels', 'Telegram', 'grammY bot + groups + topics', 'WORKING',
  'src/channels/telegram.ts long-poll, allowlist, chunking, outbox', { pattern: /getUpdates|sendMessage/, expect: 'present' }, 1);
check('channels', 'WhatsApp', 'Baileys QR pairing', 'PARTIAL',
  'src/channels/whatsapp.ts optional Baileys (npm install baileys)', { pattern: /baileys/i, expect: 'present' }, 3);
check('channels', 'Discord', 'official plugin', 'PARTIAL',
  'src/channels/discord.ts needs discord.js', { pattern: 'DiscordChannel', expect: 'present' }, 2);
check('channels', 'Slack', 'official plugin', 'PARTIAL',
  'src/channels/slack.ts needs bolt', { pattern: 'SlackChannel', expect: 'present' }, 2);
check('channels', 'Signal', 'signal-cli bridge', 'PARTIAL',
  'src/channels/signal.ts needs signal-cli', { pattern: 'SignalChannel', expect: 'present' }, 2);
check('channels', 'SMS / MMS', 'Twilio plugin', 'PARTIAL',
  'src/channels/sms.ts needs Twilio creds', { pattern: 'SmsChannel', expect: 'present' }, 2);
check('channels', 'Matrix', 'official plugin', 'PARTIAL',
  'src/channels/matrix.ts', { pattern: 'MatrixChannel', expect: 'present' }, 2);
check('channels', 'iMessage / Teams / Google Chat / LINE / Feishu / IRC…', '25+ further channels', 'ABSENT',
  'no further adapters', { pattern: 'imessage|msteams|googlechat', expect: 'absent' }, 25);
check('channels', 'Channel routing rules', 'per-room routing, access groups, broadcast groups', 'ABSENT',
  'what is here: a chat-id allowlist + an @agent prefix (src/channels/telegram.ts parseAgentPrefix)',
  { pattern: /broadcastGroup|accessGroup|roomRouting/, expect: 'absent' }, 6);
check('channels', 'Group / ambient events', 'history reads, mention policy', 'ABSENT',
  'no ambient-room reading, no mention/participation policy beyond the allowlist',
  { pattern: /ambientRoom|groupHistory|historyRead/, expect: 'absent' }, 4);
check('channels', 'Slash commands in chat', '30+ TUI / channel commands', 'PARTIAL',
  '4 Telegram commands (/new /agents /status /heartbeat, server.ts:498-515) and 5 web commands (/api/slash, server.ts:1026)',
  { pattern: /text === '\/new'/, expect: 'present' }, 4);
check('channels', 'Typing indicators', 'per-channel, on enqueue', 'ABSENT',
  'no typing action calls', { pattern: 'sendChatAction', expect: 'present' }, 1);
check('channels', 'Media send/receive', 'images, audio, documents', 'PARTIAL',
  'markdown/HTML rendering + chunking for outbound (src/channels/markdown.ts, test/markdown.test.ts); inbound is text-only',
  { pattern: /mdToTelegramHtml|chunkText/, expect: 'present' }, 4);

// ------------------------------------------------------ 9. providers/models
check('providers', 'Model providers', '35+ provider plugins + OAuth', 'PARTIAL',
  'OpenAI-compatible client with 7 host presets (src/providers/index.ts:10-18)', { pattern: 'OPENAI_COMPAT_BASES', expect: 'present' }, 8);
check('providers', 'Offline brain (no network, no key)', 'none - a provider is required', 'BETTER',
  'src/providers/mock.ts: type:"mock" answers deterministically and still drives one real tool round-trip, so CI, the quick start and docs/LAUNCH.md offline fallback work with no network and no key',
  { paths: ['src/providers/mock.ts'], expect: 'present' }, 0);
check('providers', 'Anthropic native', 'first-class adapters incl. prompt caching', 'ABSENT',
  'no adapter; src/core/config.ts:205 coerces legacy provider types to openai-compatible',
  { pattern: /from '\.\/anthropic/, expect: 'absent' }, 4);
check('providers', 'Google Gemini native', 'first-class adapter', 'ABSENT',
  'no adapter; same coercion path as Anthropic (src/core/config.ts:205)',
  { pattern: /from '\.\/gemini/, expect: 'absent' }, 3);
check('providers', 'Local model tier', 'Ollama + local runtimes + tiering', 'PARTIAL',
  'ollama base preset + config.localProvider used only by dream (src/agent/dream.ts:145)', { pattern: 'localProvider', expect: 'present' }, 3);
check('providers', 'Model catalog + pickers', 'catalog, capability table, picker UI', 'PARTIAL',
  'liveCatalog/modelMenu/providerMenu in src/channels/picker.ts; probing via /api/probe', { pattern: 'liveCatalog', expect: 'present' }, 2);
check('providers', 'Per-model capability negotiation', 'context windows, tool support flags', 'PARTIAL',
  'src/providers/capabilities.ts heuristics by host/model name', { pattern: 'capabilit', expect: 'present' }, 3);
check('providers', 'Auth profiles / credential store', 'many keys, rotation, SecretRef', 'ABSENT',
  'single key per provider in config.json', { pattern: 'apiKeys|authProfile', expect: 'absent' }, 4);
check('providers', 'MCP as tool source', 'MCP + ACP', 'WORKING',
  'src/providers/mcp.ts wired at server.ts:345', { pattern: 'mcpClients', expect: 'present' }, 0);

// ------------------------------------------------------------- 10. automation
check('automation', 'Cron scheduler', 'schedules, payloads, delivery, webhooks', 'PARTIAL',
  'src/cron/{parser,store,scheduler}.ts, 5-field expressions', { pattern: 'cron', expect: 'present' }, 3);
check('automation', 'Heartbeat / proactive tick', '30-min heartbeat + HEARTBEAT.md', 'WORKING',
  'src/agent/heartbeat.ts + power-aware gating — TermCrab is arguably better here', { pattern: 'heartbeat', expect: 'present' }, 0);
check('automation', 'Event triggers / watchers', 'condition watchers, stream sources', 'ABSENT',
  'time-based only: cron + heartbeat. No file/condition/stream watchers',
  { pattern: /eventTrigger|conditionWatcher|streamSource/, expect: 'absent' }, 5);
check('automation', 'Standing orders', 'persistent programs with execute-verify-report', 'ABSENT',
  'no standing-order concept (the nearest things are cron jobs and HEARTBEAT.md)',
  { pattern: /standingOrder/i, expect: 'absent' }, 5);
check('automation', 'Task board', 'tasks, taskflow, workboard', 'PARTIAL',
  'src/agent/tasks.ts + suggest_task/dismiss_task tools + /api/tasks', { pattern: 'suggest_task', expect: 'present' }, 3);
check('automation', 'Scheduled delivery to channels', 'deliver cron output to a chat', 'PARTIAL',
  'cron runs a prompt in a session; delivery routing is manual', { pattern: 'deliver', expect: 'present' }, 2);
check('automation', 'Gmail / IMAP watchers', 'PubSub + IMAP integrations', 'ABSENT',
  'no mail integration', { pattern: 'imap|gmail', expect: 'absent' }, 5);

// -------------------------------------------------------------- 11. surfaces
check('surfaces', 'Web control UI', 'React+Vite dashboard, rebuilt in 2.0', 'PARTIAL',
  'ui/index.html — one 6,779-line file, 9 views, no build step, no component model',
  { pattern: /id="view-chat"/, scope: 'ui', expect: 'present' }, 8);
check('surfaces', 'Full-screen TUI', 'openclaw tui / chat / terminal', 'ABSENT',
  'no raw mode, no alternate screen anywhere in src/', { pattern: 'setRawMode|1049', expect: 'absent' }, 15);
check('surfaces', 'Interactive REPL', 'TUI --local', 'PARTIAL',
  'src/cli.ts:336 readline REPL, 4 slash commands', { pattern: 'readline', expect: 'present' }, 5);
check('surfaces', 'CLI command coverage', '~90 commands, 101 doc pages', 'PARTIAL',
  '23 commands in one switch (src/cli.ts:148-938)', { pattern: 'case \'', expect: 'present' }, 10);
check('surfaces', 'Per-command help', 'every command documents its flags', 'ABSENT',
  'one flat HELP string (src/cli.ts:38-76); --help throws on 21 of 22 commands', { pattern: 'HELP', expect: 'present' }, 2);
check('surfaces', 'JSON output mode', 'reserved stdout + failure envelope', 'PARTIAL',
  'doctor --json only (src/cli.ts:238)', { pattern: '--json', expect: 'present' }, 3);
check('surfaces', 'Shell completion', 'openclaw completion bash|zsh|fish', 'ABSENT',
  'not implemented (the only "completion" in the tree is chat-completion)',
  { pattern: /shellCompletion|completion bash|__complete/, expect: 'absent' }, 1);
check('surfaces', 'Colour / TTY discipline', 'NO_COLOR, TTY-only ANSI, OSC links', 'ABSENT',
  'unconditional ANSI in src/core/logger.ts:11-24', { pattern: 'NO_COLOR', expect: 'absent' }, 1);
check('surfaces', 'Terminal voice loop', 'Talk Mode, wake words', 'BETTER',
  'termcrab wake: keyword → STT → command → TTS (src/mobile/wake.ts) — no desktop equivalent in Termux',
  { pattern: 'wake', expect: 'present' }, 1);
check('surfaces', 'macOS/Windows/Linux apps', 'native desktop apps', 'ABSENT',
  'Termux-first by design', { pattern: 'electron|tauri', expect: 'absent' }, 0);
check('surfaces', 'iOS / Android companion apps', 'paired nodes with camera/screen', 'ABSENT',
  'no native app; Termux:API is the bridge', { pattern: 'android/app|ios/', expect: 'absent' }, 0);

// ------------------------------------------------------------- 12. security
check('security', 'Loopback-first bind', 'loopback + trusted proxy modes', 'WORKING',
  'src/gateway/server.ts:257', { pattern: 'loopback', expect: 'present' }, 0);
check('security', 'Token enforcement', 'token + pairing required', 'WORKING',
  'one guard in front of every /api/* route (src/gateway/server.ts:731); empty token keeps the documented loopback-only default; test/auth.test.ts samples 10 routes anonymously and asserts 401',
  { pattern: 'checkToken(config, extractAuth(req))', expect: 'present' }, 0);
check('security', 'Sandboxing', 'sandbox modes, workspace roots, install policy', 'ABSENT',
  'exec is allow/deny only; the single "sandbox" is the Node vm used by code_exec (src/agent/tools.ts:509). No filesystem/network isolation for a run',
  { pattern: /sandboxRoot|sandboxMode|containerize/, expect: 'absent' }, 8);
check('security', 'Secrets management', 'vault, SecretRef, 1Password, audit', 'PARTIAL',
  'src/agent/secrets.ts + config.json plaintext', { pattern: 'secrets', expect: 'present' }, 4);
check('security', 'Skill supply chain', 'signed manifests after ClawHavoc', 'BETTER',
  'no registry exists to poison; skills are local files', { pattern: 'SKILL.md', expect: 'present' }, 0);
check('security', 'Dependency surface', 'large dependency tree, 1,142 advisories in 5 months', 'BETTER',
  'zero runtime dependencies — package.json has no "dependencies" key at all',
  { file: 'package.json', pattern: /^\s*"dependencies"/m, expect: 'absent' }, 0);
check('security', 'Security audits / doctor', 'openclaw security audit, policy CLI', 'PARTIAL',
  'src/mobile/doctor.ts checks Termux-specific hazards, not policy', { pattern: 'doctor', expect: 'present' }, 3);
check('security', 'Rate limiting / loop protection', 'bot-loop protection, caps', 'ABSENT',
  'none', { pattern: 'rateLimit|rate_limit', expect: 'absent' }, 2);

// --------------------------------------------------------- 13. storage/state
check('storage', 'State layout', 'config JSON + Markdown brain + SQLite state + JSONL', 'PARTIAL',
  'src/core/paths.ts: config.json, workspace/, sessions/, outbox, logs', { pattern: 'TCRAB_HOME', expect: 'present' }, 0);
check('storage', 'Database + migrations', 'SQLite with schema migrations', 'ABSENT',
  'flat files throughout', { pattern: 'better-sqlite|node:sqlite', expect: 'absent' }, 8);
check('storage', 'Backup / restore', 'openclaw backup', 'PARTIAL',
  'sessions export + manual copying; no backup command', { pattern: 'export', expect: 'present' }, 3);
check('storage', 'Atomic updates + rollback', 'guarded upgrades, versioned state', 'PARTIAL',
  'src/core/updat{er,e}.ts check-only update path (never auto-applies)', { pattern: 'update', expect: 'present' }, 4);
check('storage', 'Disk budget + pruning', 'usage caps, retention', 'PARTIAL',
  'sessions purge --older-than N', { pattern: 'purge', expect: 'present' }, 2);

// ------------------------------------------------------ 14. mobile/platform
check('mobile', 'Android bionic guard', 'community shim, hand-edited', 'BETTER',
  'src/mobile/bionic.ts loaded first in src/bin/termcrab.ts — Error 13 impossible', { pattern: 'bionic', expect: 'present' }, 0);
check('mobile', 'TMPDIR handling', 'user must fix', 'BETTER',
  'TMPDIR defaulting in the bionic guard', { pattern: 'TMPDIR', expect: 'present' }, 0);
check('mobile', 'Process supervision', 'systemd/launchd where available', 'BETTER',
  'src/mobile/supervisor.ts restart watchdog replaces systemd', { pattern: 'supervisor', expect: 'present' }, 0);
check('mobile', 'Boot autostart', 'launchd/systemd unit install', 'BETTER',
  'src/mobile/boot.ts writes ~/.termux/boot/<script> with termux-wake-lock + supervisor',
  { pattern: /termux.*boot/i, expect: 'present' }, 0);
check('mobile', 'Power-aware scheduling', 'fixed heartbeat interval', 'BETTER',
  'src/mobile/power.ts battery-aware heartbeat (pauses under 20%)', { pattern: 'battery', expect: 'present' }, 0);
check('mobile', 'Offline outbox', 'not addressed', 'BETTER',
  'src/mobile/outbox.ts store-and-forward for flaky mobile networks', { pattern: 'outbox', expect: 'present' }, 0);
check('mobile', 'Termux doctor', 'n/a on Android (unsupported)', 'BETTER',
  'src/mobile/doctor.ts checks build source, wake lock, battery optimisation, proot leftovers',
  { pattern: 'doctor', expect: 'present' }, 1);
check('mobile', 'Voice STT/TTS', 'whisper + TTS providers', 'PARTIAL',
  'src/mobile/{tts,tts-stream,stt,whisper}.ts — termux-api + optional whisper.cpp', { pattern: 'whisper', expect: 'present' }, 3);
check('mobile', 'Transcription', 'realtime transcription service', 'PARTIAL',
  'termcrab transcribe (offline whisper.cpp, optional)', { pattern: 'transcribe', expect: 'present' }, 3);
check('mobile', 'Native GUI / foreground service', 'desktop apps + node apps', 'ABSENT',
  'no companion app; a persistent notification is the closest', { pattern: 'foreground service', expect: 'absent' }, 20);

// ------------------------------------------------------------ 15. ops / docs
check('ops', 'Install is download-only (no silent build)', 'n/a', 'WORKING',
  'package.json has no `prepare`/`postinstall`; the TypeScript compile is an explicit, visible `npm run build` (measured: 0.5s install, 3.0s build vs 4.5s combined)',
  { file: 'package.json', pattern: /"(prepare|postinstall)"/, expect: 'absent' }, 0, 'core');
check('ops', 'Installer', 'curl install.sh + Docker + Nix + Fly', 'PARTIAL',
  'install.sh (Termux-native, re-runnable) + npm install; no container or package-manager paths',
  { paths: ['install.sh'], expect: 'present' }, 2);
check('ops', 'Container / server deploy', 'Docker, docker-compose, Fly, Nix, systemd', 'ABSENT',
  'Termux/Node host only', { pattern: 'docker|Dockerfile', expect: 'absent' }, 3);
check('ops', 'Service install', 'openclaw gateway install (systemd/launchd)', 'PARTIAL',
  'Termux supervisor; docs/LOCAL.md covers a systemd path', { pattern: 'systemd', expect: 'present' }, 3);
check('ops', 'Logs + diagnostics', 'seven-page doctor, log levels, OTel, Prometheus', 'PARTIAL',
  'src/core/logger.ts + doctor; /api/logs; no metrics export', { pattern: 'logger', expect: 'present' }, 4);
check('ops', 'Telemetry stance', 'version check only, opt-out', 'BETTER',
  'no telemetry at all; update check is manual', { pattern: 'telemetry', expect: 'absent' }, 0);
check('ops', 'Release discipline', 'CalVer, release notes, validation programme', 'PARTIAL',
  'CHANGELOG.md (47 KB) + 21 tags from v0.1.0 to v0.36.0; no release validation programme',
  { paths: ['CHANGELOG.md'], expect: 'present' }, 2);
check('ops', 'Work tracking (what is being built, right now)', 'n/a', 'WORKING',
  'WORKLOG.md (now/next/done with commits + proofs) + scripts/status.mjs (commit-age freshness, exit 1 when stale) + panel Work page (/api/worklog, token-gated); test/worklog.test.ts fails any commit that skips the tracker',
  { paths: ['WORKLOG.md', 'scripts/status.mjs'], expect: 'present' }, 0, 'core');
check('ops', 'Tests', 'contract tests per channel, 16k-PR CI', 'PARTIAL',
  '437 cases in 50 files (test/*.test.ts), real HTTP endpoint pins, 3 jsdom UI batteries; full run 18s (node:test, --test-timeout=60000)',
  { pattern: /node:test/, scope: 'test', expect: 'present' }, 6);
check('ops', 'CI matrix', 'lint + types + budgets + swiftlint + semgrep + knip', 'PARTIAL',
  'ci/github-actions.yml: node 20/22/24 build + test + offline CLI smoke + npm pack sanity',
  { paths: ['ci/github-actions.yml'], expect: 'present' }, 3);
check('ops', 'Documentation site', 'full docs site, thousands of pages', 'PARTIAL',
  'docs/ markdown + README; no site generator, no search, no versioning',
  { paths: ['docs/ARCHITECTURE.md', 'docs/API.md'], expect: 'present' }, 5);
check('ops', 'Docs that match the code', 'generated docs map, tested examples', 'BROKEN',
  'docs/ARCHITECTURE.md lists files that do not exist (src/providers/gemini.ts, anthropic.ts, ollama.ts). This probe *expects* the stale line until the doc is fixed — when it reports DRIFT, the doc caught up',
  { file: 'docs/ARCHITECTURE.md', pattern: /gemini\.ts/, expect: 'present' }, 2);

// ------------------------------------------------------------------ run them

const SCOPE_FILES = {
  src: () => SRC_FILES,
  test: () => TEST_FILES,
  skills: () => SKILL_FILES,
  ui: () => [UI_FILE],
  repo: () => [], // handled by path probes
};

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

/**
 * A probe is one of:
 *   { pattern, scope, expect }  — grep the given file set
 *   { paths: [...], expect }    — check that files/dirs exist
 *   { file, pattern, expect }   — grep one specific repo file
 */
function runProbe(probe) {
  if (!probe) return { state: 'unprobed', detail: '' };
  const { expect } = probe;

  if (probe.paths) {
    const found = probe.paths.filter(exists);
    const ok = expect === 'present' ? found.length > 0 : found.length === 0;
    return { state: ok ? 'ok' : 'DRIFT', detail: `found: ${found.join(', ') || 'none'}` };
  }

  const files = probe.file
    ? [path.join(ROOT, probe.file)]
    : (SCOPE_FILES[probe.scope || 'src'] || SCOPE_FILES.src)();
  const found = hits(probe.pattern, files);
  const occ = countMatches(probe.pattern, files);
  const detail = `${occ} match(es)${found.length ? ': ' + found.slice(0, 3).join(', ') : ''}`;
  let state = 'ok';

  if (expect === 'present' && found.length === 0) state = 'DRIFT';
  if (expect === 'absent' && found.length > 0) state = 'DRIFT';
  if (expect === 'defined-not-called' || expect === 'only-definition') {
    const distinct = new Set(found.map((f) => f.split(':')[0]));
    if (distinct.size > 1) state = 'DRIFT';
    else if (occ < 1) state = 'DRIFT';
  }
  if (expect === 'only-migration') {
    const outside = found.filter((f) => !f.includes('migrate'));
    if (outside.length > 0) state = 'DRIFT';
  }
  return { state, detail };
}

// Which lane does the remaining work sit in?
//   core   — must exist for TermCrab to be a credible agent at all (wiring defects
//            and the minimum loop/context/security spine). Do these next.
//   parity — needed to compete on the axes the phone-first bet depends on.
//   later  — deliberately out of scope: matching OpenClaw feature-for-feature here
//            would cost years and buys nothing on a phone.
const LANE_BY_CAPABILITY = [
  [/Steering into a live run|Per-session run serialization|Queue modes|Compaction that preserves|Memory bootstrap injection|Approval queue|Request authentication|Inbound webhooks|Docs that match the code|Usage \/ token accounting|Transcript write fencing|LLM summarisation/, 'core'],
  [/Shell completion|Colour \/ TTY discipline|Per-command help|JSON output mode|Typing indicators|Tool-result pruning|Context introspection|USER\.md|Memory store layout|Embedding providers|Memory search quality|Bootstrap file set|Lifecycle reset policies|Multi-user scoping|Session search|Session tools surface|CLI command coverage|Interactive REPL|Full-screen TUI|Web control UI|Tool schema validation|Human-in-the-loop|Bundled skill library|Skill precedence|Agent-authored skills|Reasoning \/ thinking levels|Model failover chain|Model catalog|Per-model capability|Local model tier|Cron scheduler|Task board|Scheduled delivery|Heartbeat|Parallel tool batches|Loop budget|Run identity|Abort \/ stop|Subagents|Progress drafts|MCP client|Browser automation|Sandboxed code execution|Shell execution|File operations|Web fetch|Phone \/ device tools|Telegram|WhatsApp|Group \/ ambient|Slash commands in chat|Media send|Channel routing|In-process|Voice STT|Transcription|Service install|Logs \+ diagnostics|Release discipline|Tests|CI matrix|Documentation site|Installer|Health \/ status|Canvas|Multi-agent routing|Remote access|Memory|Session tools|Repetition|Tool calling|Streaming|State layout|Backup|Atomic updates|Disk budget|Security audits|Secrets management|Doctor|Skills|MCP as tool source|Reasoning/, 'parity'],
  [/companion apps|macOS\/Windows\/Linux apps|iOS \/ Android companion|Container \/ server deploy|25\+ further channels|Skill registry \/ distribution|Plugin API \+ lifecycle|Channel plugin interface|Provider plugin interface|Plugin manifest|Gmail \/ IMAP|Pairing \/ device identity|Typed wire protocol|Database \+ migrations|Cloud|Fleet|workboard|Rate limiting|Presence|Event triggers|Standing orders|Image \/ media generation|Document extraction|Anthropic native|Google Gemini native|Auth profiles|Sandboxing|Session attachment|Main rolling session|Lifecycle hooks|Context engine|Pluggable context engine|Memory provenance|Native GUI|Stuck-run diagnostics|Group \/ ambient events|Parallel tool batches/, 'later'],
];
for (const c of C) {
  for (const [re, lane] of LANE_BY_CAPABILITY) {
    if (re.test(c.capability)) { c.lane = lane; break; }
  }
}

const rows = C.filter((c) => !onlyArea || c.area === onlyArea).map((c) => ({
  ...c,
  probeResult: runProbe(c.probe),
}));

const ORDER = ['WORKING', 'BETTER', 'PARTIAL', 'BROKEN', 'ABSENT'];
const tally = Object.fromEntries(ORDER.map((v) => [v, rows.filter((r) => r.verdict === v).length]));
const areas = [...new Set(rows.map((r) => r.area))].sort();
const drift = rows.filter((r) => r.probeResult.state === 'DRIFT');

const WEIGHT = { WORKING: 1, BETTER: 1, PARTIAL: 0.45, BROKEN: 0.1, ABSENT: 0 };
const score = rows.reduce((a, r) => a + WEIGHT[r.verdict], 0);
const coverage = rows.length ? Math.round((score / rows.length) * 100) : 0;
const effortLeft = rows.reduce((a, r) => a + r.effort, 0);
const laneEffort = (lane) => rows.filter((r) => r.lane === lane).reduce((a, r) => a + r.effort, 0);
const laneCount = (lane) => rows.filter((r) => r.lane === lane).length;

function tableFor(list) {
  const lines = [];
  lines.push('| Capability | OpenClaw | TermCrab | Evidence | Lane | Left (d) |');
  lines.push('|---|---|---|---|---|---:|');
  const icon = { WORKING: '✅', BETTER: '🏅', PARTIAL: '🟡', BROKEN: '⛔', ABSENT: '⚪' };
  for (const r of list) {
    lines.push(
      `| ${r.capability} | ${r.openclaw} | ${icon[r.verdict]} ${r.verdict} | ${r.evidence} | ${r.lane} | ${r.effort || '—'} |`,
    );
  }
  return lines.join('\n');
}

function measuredBlock() {
  const lines = [];
  lines.push('<!-- generated by scripts/census.mjs — do not edit inside this block -->');
  lines.push(
    `_Measured ${new Date().toISOString().slice(0, 10)} against \`src/\` at HEAD. Re-run \`node scripts/census.mjs --write\` after any code change; a row whose probe stops matching is reported as DRIFT, which means the code moved and the judgement must be re-made._`,
  );
  lines.push('');
  lines.push('| Verdict | Count | Meaning |');
  lines.push('|---|---:|---|');
  lines.push(`| ✅ WORKING | ${tally.WORKING} | wired and observable |`);
  lines.push(`| 🏅 BETTER | ${tally.BETTER} | TermCrab is ahead of OpenClaw here |`);
  lines.push(`| 🟡 PARTIAL | ${tally.PARTIAL} | exists, narrower than theirs |`);
  lines.push(`| ⛔ BROKEN | ${tally.BROKEN} | **the code exists but nothing reaches it** |`);
  lines.push(`| ⚪ ABSENT | ${tally.ABSENT} | nothing in the tree |`);
  lines.push(`| | **${rows.length}** | tracked capabilities |`);
  lines.push('');
  lines.push(
    `**Capability score ${coverage}%** (WORKING/BETTER = 1, PARTIAL = 0.45, BROKEN = 0.1, ABSENT = 0).`,
  );
  lines.push('');
  lines.push('| Lane | Checks | Effort left | What it is |');
  lines.push('|---|---:|---:|---|');
  lines.push(`| **core** | ${laneCount('core')} | ~${laneEffort('core')}d | must exist for TermCrab to be a credible agent at all |`);
  lines.push(`| **parity** | ${laneCount('parity')} | ~${laneEffort('parity')}d | needed to compete on the axes the phone-first bet depends on |`);
  lines.push(`| **later** | ${laneCount('later')} | ~${laneEffort('later')}d | deliberately deferred — matching OpenClaw 1:1 here buys nothing on a phone |`);
  lines.push(`| **total** | ${rows.length} | ~${effortLeft}d | |`);
  lines.push('');
  if (drift.length) {
    lines.push(`> ⚠️ **${drift.length} probe(s) drifting** — the code moved under a recorded judgement:`);
    lines.push('>');
    for (const d of drift) lines.push(`> - ${d.area} / ${d.capability} → ${d.probeResult.detail}`);
    lines.push('');
  } else {
    lines.push('> ✅ All probes match their recorded judgements as of this run.');
    lines.push('');
  }
  for (const a of areas) {
    const list = rows.filter((r) => r.area === a);
    const sc = list.reduce((x, r) => x + WEIGHT[r.verdict], 0);
    lines.push(`### ${a} — ${Math.round((sc / list.length) * 100)}% (${list.length} checks)`);
    lines.push('');
    lines.push(tableFor(list));
    lines.push('');
  }
  return lines.join('\n');
}

if (wantJson) {
  console.log(JSON.stringify({ tally, coverage, effortLeft, areas, rows, drift: drift.length }, null, 1));
} else {
  console.log('TermCrab capability census — %d checks, %d areas', rows.length, areas.length);
  console.log('');
  for (const v of ORDER) if (tally[v]) console.log(`  ${v.padEnd(8)} ${String(tally[v]).padStart(3)}`);
  console.log(`\n  capability score : ${coverage}%`);
  console.log(`  effort remaining : ~${effortLeft} developer-days`);
  console.log(`    core lane      : ~${laneEffort('core')}d across ${laneCount('core')} checks`);
  console.log(`    parity lane    : ~${laneEffort('parity')}d across ${laneCount('parity')} checks`);
  console.log(`    later lane     : ~${laneEffort('later')}d across ${laneCount('later')} checks (deliberately deferred)`);
  console.log(`  probe drift      : ${drift.length}`);
  if (drift.length) {
    console.log('');
    for (const d of drift) console.log(`  DRIFT  ${d.area}/${d.capability} → ${d.probeResult.detail}`);
  }
  console.log('');
  for (const a of areas) {
    const list = rows.filter((r) => r.area === a);
    const s = list.reduce((x, r) => x + WEIGHT[r.verdict], 0);
    const bar = '█'.repeat(Math.round((s / list.length) * 20)).padEnd(20, '·');
    const left = list.reduce((x, r) => x + r.effort, 0);
    console.log(`  ${a.padEnd(12)} ${bar} ${String(Math.round((s / list.length) * 100)).padStart(3)}%  (${list.length} checks, ~${left}d left)`);
  }
}

if (wantWrite) {
  const dataDir = path.join(ROOT, 'docs', 'openclaw', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'census.json'),
    JSON.stringify(
      {
        measured: new Date().toISOString(),
        tally,
        coverage,
        effortLeft,
        areas,
        drift: drift.map((d) => ({ area: d.area, capability: d.capability, detail: d.probeResult.detail })),
        rows,
      },
      null,
      1,
    ),
  );

  const tracker = path.join(ROOT, 'docs', 'openclaw', 'TRACKER.md');
  if (fs.existsSync(tracker)) {
    const text = fs.readFileSync(tracker, 'utf8');
    const BEGIN = '<!-- BEGIN MEASURED -->';
    const END = '<!-- END MEASURED -->';
    const a = text.indexOf(BEGIN);
    const b = text.indexOf(END);
    if (a >= 0 && b > a) {
      const next = text.slice(0, a + BEGIN.length) + '\n' + measuredBlock() + '\n' + text.slice(b);
      fs.writeFileSync(tracker, next);
      console.log('\nTRACKER.md measured block refreshed.');
    }
  }
  console.log('docs/openclaw/data/census.json written.');
}
