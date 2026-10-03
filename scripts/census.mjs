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
/**
 * `lane` is still a string for the old call sites, but an options object is
 * accepted too: `{ lane, scope: 'out', why }`. A row marked `scope: 'out'` is
 * still measured and still shown — it just stops counting towards the score,
 * because the project has decided not to build it. The decision has to be
 * visible, with its reason, or the score would look like a lie to anyone
 * reading the table (2026-10-03: the user chose three surfaces — telegram, web,
 * terminal — so five extra channels and the native apps are out).
 */
const check = (area, capability, openclaw, verdict, evidence, probe = null, effort = 0, lane = 'parity') => {
  const opts = typeof lane === 'object' && lane !== null ? lane : { lane };
  C.push({
    area,
    capability,
    openclaw,
    verdict,
    evidence,
    probe,
    effort,
    lane: opts.lane ?? 'parity',
    scope: opts.scope ?? 'in',
    why: opts.why ?? '',
  });
};

// ---------------------------------------------------------------- 1. gateway
check('gateway', 'HTTP API + event stream', 'typed WS protocol on :18789', 'WORKING',
  'src/gateway/server.ts:251 startGateway, 77 route handlers', { pattern: "pathname === '/api/event", expect: 'present' }, 0);
check('gateway', 'SSE live event feed', 'WS push + replay', 'WORKING',
  'src/gateway/server.ts:713 GET /api/events (text/event-stream)', { pattern: 'text/event-stream', expect: 'present' }, 0);
check('gateway', 'Request authentication', 'token + device pairing + nonces', 'WORKING',
  'authenticate(config, presented, {ip}) (src/gateway/auth.ts) is the single front door: the owner [1mmaster token [0mcompared in constant time, or a paired device token looked up by hash and stamped with the sighting. Every /api/* route goes through it; a failed check is 401 + www-authenticate, and ui/index.html asks for the password (#pwGate). Nonces are not part of the design: a bearer token over TLS/loopback with per-device revocation covers the threat this project has (a shared password that cannot be taken back from one phone) [0mHTTP nonce replay protection is the row [1m"Remote access story [0maddresses. test/tier2i.test.ts 20.1/20.4',
  { file: 'src/gateway/auth.ts', pattern: 'export function authenticate', expect: 'present' }, 0);
check('gateway', 'Bind-time safety guard', 'loopback-first defaults', 'WORKING',
  'src/gateway/server.ts:257 refuses non-loopback without token', { pattern: 'non-loopback', expect: 'present' }, 0);
check('gateway', 'Pairing / device identity', 'device challenge + approval + store', 'WORKING',
  'src/gateway/devices.ts: `termcrab pair` prints a 6-character code (no 0/O/1/I) that lives 5 minutes, is single use and is stored owner-only; POST /api/pair exchanges it for a per-device token that is shown once and kept only as a sha256 hash. `termcrab devices` lists every device with paired-at, last-seen-at, last IP and a request count, marks the caller (current), and `termcrab devices revoke <id|name>` kills exactly one token while the master password and the other devices keep working. A corrupt store is renamed aside instead of locking the owner out. test/tier2i.test.ts 20.1/20.4',
  { file: 'src/gateway/devices.ts', pattern: 'export function redeemCode', expect: 'present' }, 0);
check('gateway', 'Typed wire protocol + idempotency', 'TypeBox schemas, req/res/event frames', 'WORKING',
  'src/gateway/protocol.ts: WIRE_VERSION = 1; every SSE frame is wrapped into {v, seq, ts, type, …} with a safe-token type (case kept, so `thinkingCaps` and `canvas:update` still match), the ten event families are listed in code and mirrored in docs/API.md, and a test scans the source so a new event type cannot ship undocumented. Request bodies are parsed once with a field name on failure (`parseChatRequest`/`parsePairRequest` → 400 {error, field}). Idempotency: `Idempotency-Key` (header or body) remembers the accepted run for a day and a replay returns the same turnId with replayed: true instead of running the turn twice. TypeBox itself is not used — the shapes are checked by hand, which is what a zero-dependency project can promise',
  { file: 'src/gateway/protocol.ts', pattern: 'export function wrapEvent', expect: 'present' }, 0);
check('gateway', 'Config hot-reload', 'watch + validate + apply', 'WORKING',
  'fs.watch + debounce + merge + provider re-resolve (src/gateway/server.ts:302,346) AND validateConfig() runs first (src/core/config.ts): broken JSON or an error-severity key is refused and reported through /api/config configProblems, warnings apply; `termcrab config set` refuses the same way. test/tier0.test.ts 10.1',
  { pattern: 'validateConfig', expect: 'present' }, 0);
check('gateway', 'Health / status endpoint', 'health + presence + doctor', 'WORKING',
  'src/gateway/server.ts /api/health, /api/status, /api/doctor', { pattern: "/api/doctor", expect: 'present' }, 0);
check('gateway', 'Inbound webhooks', 'authenticated agent hooks', 'WORKING',
  'POST /api/hooks/:id requires the per-hook token via x-hook-token or ?token= (src/gateway/server.ts:698), compared in constant time (src/gateway/auth.ts constantTimeEqual); unknown hook stays 404. Covered by test/auth.test.ts',
  { pattern: 'x-hook-token', expect: 'present' }, 0);
check('gateway', 'Approval queue + endpoint', 'operator approvals, HITL gates', 'WORKING',
  'src/core/approvals.ts is now live: loop.ts consults needsApproval() before a gated tool runs, emits the approval over SSE, waits with a timeout + default policy, and the decision is answerable from the panel (POST /api/approvals/:id/approve|deny) or the CLI (termcrab approvals). Pinned by test/approvals.test.ts (6.1-6.5)',
  { pattern: /needsApproval\(/, expect: 'present' }, 0);
check('gateway', 'Canvas / A2UI widgets', 'agent-driven UI widgets', 'WORKING',
  'src/gateway/canvas.ts + /api/canvas: the `canvas` tool pushes an HTML widget, it is broadcast as canvas:update / canvas:remove over SSE, the panel renders it, and GET /api/canvas returns what exists (with remove). Deliberately not an A2UI typed component protocol — a widget is HTML the agent wrote; test/tier2n.test.ts pins the round-trip',
  { file: 'src/gateway/canvas.ts', pattern: 'export function canvasUpdate', expect: 'present' }, 0);
check('gateway', 'Multi-agent routing', 'per-agent workspace, session, store', 'PARTIAL',
  'workspace/agents/<name>/SOUL.md + parseAgentPrefix (src/gateway/server.ts:48)', { pattern: 'listAgents', expect: 'present' }, 3);
check('gateway', 'Presence', 'online/typing/presence events', 'WORKING',
  'src/gateway/presence.ts derives one picture from stores that already exist: attached gateway watchers (bus subscribers = the panel, a phone, the CLI), channels configured-vs-running (server builds the rows from live objects, so a channel that failed to start cannot claim to run), paired devices with their last sighting, and people who actually wrote — each with a stated freshness ladder (<=2 min online, <=1 h recent, older idle, never seen unknown). Read by `termcrab presence [--json]`, GET /api/presence, the presence line in /api/status and the chat /status reply; presence changes are bus events (watcher attached/left, device paired, channels started), so a UI can react without polling. Typing indicators are already sent by the telegram channel (src/channels/telegram.ts); a per-keystroke typing protocol is not attempted. Pinned by test/tier2m.test.ts (24.1)',
  { file: 'src/gateway/presence.ts', pattern: 'export function buildPresence', expect: 'present' }, 0);
check('gateway', 'Remote access story', 'Tailscale, SSH, trusted proxy, TLS pinning', 'PARTIAL',
  'docs/REMOTE.md documents tunnels; bind guard exists (src/gateway/server.ts:257) but no enforced auth',
  { pattern: /non-loopback/, expect: 'present' }, 3);
check('gateway', 'Usage / token accounting', 'per-run, per-model, per-session', 'WORKING',
  'providers parse `usage` (streaming + non-streaming; the offline mock reports deterministic numbers marked estimated) → the loop sums it across the tool loop, emits it on run:end and stores it on the assistant entry → TCRAB_HOME/usage/<day>.jsonl → GET /api/usage + `termcrab usage [--json]` + a per-turn footer and a daily pill in the panel. Cost appears only from configured prices or a dated snapshot, never invented. Pinned by test/usage.test.ts (9.1-9.4)',
  { pattern: /promptTokens|totalTokens|completionTokens/, expect: 'present' }, 0);
check('gateway', 'Stuck-run diagnostics', 'stalled/stuck session notices, watchdogs', 'WORKING',
  'src/agent/run-health.ts gives every running turn a verdict — working / slow / stuck / failing / queued — from the queue (started when), the run trace (last span, last tool call, provider error) and plain thresholds (60s slow, 5min stuck with nothing new). Each verdict carries a sentence to act on (`termcrab stop <session>`, `termcrab doctor`, retry smaller), surfaced by `termcrab runs`, GET /api/runs/health, the /status line in a chat and a `running turns` check in doctor. test/tier2l.test.ts 23.1',
  { file: 'src/agent/run-health.ts', pattern: 'export function runHealth', expect: 'present' }, 0);

// -------------------------------------------------------------- 2. agent loop
check('agent', 'Streaming assistant deltas', 'block streaming + coalescing', 'WORKING',
  'src/agent/loop.ts emits delta events; src/providers/openai.ts parses SSE', { pattern: "'delta'", expect: 'present' }, 0);
check('agent', 'Tool calling round-trip', 'parallel + serialized batches', 'WORKING',
  'src/agent/loop.ts:245 sequential tool execution', { pattern: 'tool:start', expect: 'present' }, 0);
check('agent', 'Per-session run serialization', 'session lanes + writer claims', 'WORKING',
  'src/agent/sessions.ts SessionQueue.submit/pump/drain runs one turn at a time per session; test/queue-serialize.test.ts 5.1/5.3 pin order and no interleaving inside the process, and the cross-process guarantee is the writer claim (SessionStore.claim) pinned by test/writer-fence.test.ts',
  { pattern: 'private async drain', expect: 'present' }, 0);
check('agent', 'Queue modes steer/followup/collect/interrupt', '4 modes + debounce + cap', 'WORKING',
  'all four modes live in SessionQueue.submit; collect merges a waiting burst into one run; MAX_QUEUED_TURNS caps a backlog (HTTP 429); test/queue-serialize.test.ts 5.3-5.6',
  { pattern: 'MAX_QUEUED_TURNS', expect: 'present' }, 0);
check('agent', 'Run identity + terminal wait', 'runId + agent.wait replay', 'WORKING',
  'one id per run (the queue turn id IS the trace id, server.ts runner) + GET /api/runs/:id returns status/output/error/tokens; `termcrab run --wait <id>` exits 0 done / 1 failed / 124 timeout / 130 stopped. test/tier0.test.ts 10.2',
  { pattern: '/api/runs/', expect: 'present' }, 0);
check('agent', 'Parallel tool batches', 'launched together, results merged', 'WORKING',
  'src/agent/loop.ts runs consecutive read-only calls from one model turn as a bounded batch (Promise.all, agent.parallelTools default 4, 1 = off); a mutating or approval-gated call flushes the batch and runs alone, so ordering is never guessed; transcript entries are written in the model order and tool:start/tool:end keep their per-call ids; one tool failing is that tool result, not a cancelled batch. Safety is opt-in: only the 19 names in PARALLEL_SAFE_TOOLS (src/agent/tools.ts) are batched, and every name there is checked against the live toolbox. Pinned by test/tier2o.test.ts (overlap, ordering, failure isolation, the knob, the table shape)',
  { file: 'src/agent/loop.ts', pattern: /Promise\.all\(/, expect: 'present' }, 0);
check('agent', 'Loop budget + idle watchdog', '172800s budget, 120s/300s idle, overflow recovery', 'WORKING',
  'agent.turnBudgetSec (default 900, 0 = off) bounds a whole turn; agent.idleSec (default 120, 0 = off) resets on every model reply and every finished tool, and a watchdog interval aborts the turn mid-call when the wait itself is the problem. The stop is reported as an error with the reason and what it was waiting on ("no progress for 120s while waiting for anthropic to reply (iteration 2)"), the partial answer is kept, and the run is recorded as error=watchdog so termcrab runs / the panel can see it. Both keys are validated (1 day / 1 hour caps) and both are in docs. Pinned by test/tier2p.test.ts 27.4 (a hanging provider stops in ~1s with the reason, 0 disables both clocks)',
  { file: 'src/agent/loop.ts', pattern: 'watchdogReason', expect: 'present' }, 0);
check('agent', 'Repetition / loop detection', 'repeated-call guards', 'WORKING',
  'src/agent/loop.ts:249-264 repetition detector', { pattern: 'repetition', expect: 'present' }, 0);
check('agent', 'Model failover chain', 'ordered chain + cooldowns + auth profiles', 'WORKING',
  'resolveProviderChain + cooldowns (src/providers/index.ts)', { pattern: 'resolveProviderChain', expect: 'present' }, 1);
check('agent', 'Reasoning / thinking levels', '7 levels incl. minimal/ultra', 'WORKING',
  'src/providers/capabilities.ts 6 levels + effort mapping', { pattern: 'thinking', expect: 'present' }, 1);
check('agent', 'Steering into a live run', 'runtime-boundary steering', 'WORKING',
  "a steered message joins the running turn's transcript inside the same run (loop.ts drains SessionQueue.takeSteers); a 'steer' event is emitted; test/queue-serialize.test.ts 5.4/5.4b",
  { pattern: 'takeSteers', expect: 'present' }, 0);
check('agent', 'Abort / stop a running turn', 'Esc, /stop, /abort', 'WORKING',
  'POST /api/stop (one session or everything) + `termcrab stop` + the panel stop button; the abort reaches the in-flight provider call, the partial answer is kept and marked [interrupted], and the lane stays busy until the runner settles so no work is orphaned. test/tier0.test.ts 10.3',
  { pattern: '/api/stop', expect: 'present' }, 0);
check('agent', 'Lifecycle hooks', '14 typed hooks + HOOK.md', 'WORKING',
  'run.start, run.end and session.reset joined the event-trigger vocabulary (src/gateway/triggers.ts + the bus bridge in server.ts), so a hook that names them is woken with the run/session payload and can act (queue a turn, report). Reactive by design, not intercepting: a hook is told after the fact and cannot rewrite or block a turn — blocking is the job of approvals and the exec guard, which do it in code. No HOOK.md/hook-directory discovery, because the plugin API is out of scope; hooks live in config. test/tier2n.test.ts pins a hook woken by run.end',
  { file: 'src/gateway/triggers.ts', pattern: "'run.end'", expect: 'present' }, 0);
check('agent', 'Subagents', 'sessions_spawn, agents_wait, lanes, worktrees', 'PARTIAL',
  'sessions_spawn/agents_wait/sessions_yield in src/agent/toolbox.ts:798+', { pattern: 'sessions_spawn', expect: 'present' }, 6);
check('agent', 'Progress drafts / partial updates', 'incremental draft messages', 'WORKING',
  "{type:'draft'} events carry the whole partial answer (emitted at most once per round, so a surface replaces instead of appending) and it is saved in the progress card (state/progress/<session>.json) so a reload mid-turn still shows it; the panel paints it and marks the bubble as a draft. test/tier0.test.ts 10.4",
  { pattern: /emitDraft|'draft'/, expect: 'present' }, 0);
check('agent', 'Timeouts + error containment', 'per-phase budgets', 'WORKING',
  'loop.ts containment; tests in test/loop.test.ts', { pattern: 'error', expect: 'present' }, 0);

// -------------------------------------------------------------- 3. sessions
check('sessions', 'Transcript persistence', 'SQLite + archived JSONL + WAL', 'WORKING',
  'append-only JSONL, one whole line per write, fsync before the call returns (SessionStore.append), a torn tail healed before the next append and reported by readDetailed() as a torn tail rather than skipped silently; `termcrab sessions verify [--repair]` walks every transcript and says what is damaged, and a middle line (which append never writes) is reported, never rewritten. There is still no SQLite/WAL: a phone-sized agent keeps its transcript as plain files it can read with any tool',
  { file: 'src/agent/sessions.ts', pattern: 'healTail', expect: 'present' }, 0);
check('sessions', 'Transcript write fencing', 'expectedWriterRunId on every append', 'WORKING',
  'SessionStore.claim() writes a writer lock (owner + pid + heartbeat) before a turn writes anything: a second writer is refused by name (or waits), a dead/expired claim is reclaimed, append() is one O_APPEND write of one line and heals a torn tail, and the gateway/CLI/cron/voice all share it. Pinned by test/writer-fence.test.ts (8.1-8.4)', 
  { pattern: 'WriterHolder', expect: 'present' }, 0);
check('sessions', 'Session search', 'anchored snippet search + redaction', 'WORKING',
  'src/agent/session-search.ts ranks every line of every transcript: BM25-ish weights with a document-frequency table, an all-terms bonus, an exact-phrase boost, a 30-day recency half-life and a down-weight for tool output; the archive file is searched too, so an old conversation is findable, and every hit carries session, role, when, file:line and a snippet with the matched words marked. One function serves `termcrab sessions search`, `/sessions search` and the agent tool `sessions_search`. Redaction of secrets before indexing is not attempted — the transcript is a plain file on the owner device',
  { file: 'src/agent/session-search.ts', pattern: 'export function searchSessions', expect: 'present' }, 0);
check('sessions', 'Lifecycle reset policies', 'mode none|daily|idle + atHour', 'WORKING',
  'src/agent/session-policy.ts: `agent.sessionReset` = never (default) | daily | idle:<minutes>, parsed forgivingly and validated by config. The policy is applied before a turn (the loop calls applyReset), it archives the live transcript into `<session>.archive.jsonl` and never deletes a line, `/status` and `sessions show` state the policy and why a reset is or is not due, and `termcrab sessions reset <id>` does it on demand. An hour-of-day variant (`atHour`) is not implemented; idle and daily are the two the phone needs',
  { file: 'src/agent/session-policy.ts', pattern: 'export function applyReset', expect: 'present' }, 0);
check('sessions', 'Multi-user scoping', 'dmScope 4 modes + identity links', 'PARTIAL',
  'per-chat key `${channel}:${chatId}` (server.ts:496) — isolated by accident', { pattern: 'dmScope', expect: 'absent' }, 3);
check('sessions', 'Session tools surface', 'sessions_list/history/search/send/status', 'WORKING',
  'src/agent/toolbox.ts:644-880', { pattern: 'sessions_list', expect: 'present' }, 0);
check('sessions', 'Main rolling session', 'agent:<id>:main with background routing', 'ABSENT',
  'five separate session keys (web:main, telegram:*, cron:*, heartbeat, dream)', { pattern: "'heartbeat'", expect: 'present' }, 8);
check('sessions', 'Session attachment (multi-client)', 'openclaw attach, projections', 'PARTIAL',
  'src/agent/session-view.ts answers "what belongs to this conversation": files touched (with read/write and counts), facts learned in it (found by their provenance stamp), approvals waiting on it, tools used, the digest, the reset policy and the live writer fence, through `termcrab sessions show <id>` / `/sessions show <id>`. What is not there yet is a projection/merge protocol for two clients writing one session — today the write fence serialises them (one writer at a time) rather than merging two views',
  { file: 'src/agent/session-view.ts', pattern: 'export function sessionView', expect: 'present' }, 8);

// ---------------------------------------------------------- 4. context/memory
check('context', 'Compaction that preserves history', 'summary + full history stays on disk', 'WORKING',
  'compact() writes an extractive digest to memory/compacted/<session>.md and moves the overflow to <session>.archive.jsonl; read() merges archive + live so every original line survives, while the prompt gets the hot window (readHot) plus the last digest block (sessions.ts latestDigest -> prompt.ts). Pinned by test/memory-truth.test.ts 7.2/7.2b and test/compaction.test.ts',
  { pattern: 'archiveOverflow', expect: 'present' }, 0);
check('context', 'LLM summarisation for compaction', 'separate compaction model', 'WORKING',
  'SessionStore.compactWithModel() hands the turns leaving the hot window to a configured model (the local tier when present, else the model answering the turn) in bounded chunks; each block records who wrote it, how much it covers and any reason it could not (TCRAB_COMPACT=off, no model, model failure -> the extractive digest); the prompt blurb says "the earlier N turns are summarised above ... the full transcript is on disk". Pinned by test/compaction-llm.test.ts 11.1-11.4',
  { pattern: 'compactWithModel', expect: 'present' }, 0);
check('context', 'Tool-result pruning', 'contextPruning cache-ttl, provider-side clear', 'WORKING',
  'pruneToolResults() (src/agent/context.ts) keeps the newest N tool results verbatim and replaces older big ones with a one-line stub naming the tool, the size and how to re-run it — wired into the loop before every provider call, so the wire body really is smaller (a fake provider in test/tier2h.test.ts 19.2 sees the stub). The window is agent.keepToolResults (default 6) and the engine can narrow it (19.4). Cache TTLs and provider-side clearing are OpenAI-specific and not applicable here; what a phone needs is that a 20 KB file read ten turns ago is not re-sent on every call',
  { file: 'src/agent/context.ts', pattern: 'export function pruneToolResults', expect: 'present' }, 0);
check('context', 'Pluggable context engine', 'ContextEngine info/ingest/assemble/compact', 'WORKING',
  'a ContextEngine interface with two registered engines (default, compact) chosen by agent.contextEngine: each declares its memory budget, its tool-result window and whether the verbose sections (roster, goals, intents) are included, and each describes itself in one sentence that `termcrab context` prints (19.3/19.4). "Pluggable" here means swappable by config with an inspectable description — loading an engine from a user package is the plugin-API row, which is still ABSENT',
  { file: 'src/agent/context.ts', pattern: 'export interface ContextEngine', expect: 'present' }, 0);
check('context', 'Context introspection (/context)', 'list|detail|map breakdown', 'WORKING',
  '`termcrab context [session] [--json]` and `/context` in a chat print the real prompt section by section (identity, memory, USER.md, skills, environment, intents, goals, roster) with bytes each, the tool-schema bytes, the hot transcript size and how many tool results pruning would stub — measured by promptSectionSizes(), which buildSystemPrompt is written from, so the numbers cannot describe a prompt the model does not get (19.3). test/tier2h.test.ts',
  { file: 'src/agent/context.ts', pattern: 'export function contextReport', expect: 'present' }, 0);
check('context', 'Memory store layout', 'MEMORY.md, USER.md, daily logs, DREAMS.md', 'WORKING',
  'src/agent/memory.ts: MEMORY.md (facts, append-only in shape but merge-on-duplicate), USER.md (the owner model, injected into every prompt), daily/<day>.md logs and compacted/*.md digests; all four are searched by the same ranked search (18.1-18.4); the layout is created on first use and a store always has its files. DREAMS.md is the dreaming feature, which lives in src/agent/dream.ts and is separate. test/tier2g.test.ts',
  { paths: ['src/agent/memory.ts'], expect: 'present' }, 0);
check('context', 'Memory bootstrap injection', 'budgeted, provenance-gated, refreshed', 'WORKING',
  'MemoryStore.readForPrompt(budget) injects the NEWEST facts until the byte budget is spent, renders each with its source (MEMORY.md:<line>) and always names the budget plus how many facts stayed on disk; remember() reports the line it wrote; the budget is configurable (agent.memoryBudget). Pinned by test/memory-truth.test.ts 7.1/7.1b/7.3/7.4',
  { pattern: 'readForPrompt', expect: 'present' }, 0);
check('context', 'USER.md user model', 'separate, imperative, supersede-in-place', 'WORKING',
  'memory/USER.md is a real file: injected into every prompt as "## About the user" (600-character budget, never trimmed by the fact budget), written by the agent through the update_user tool, by the owner through `termcrab memory user <line>` and `/memory user <line>` in a chat, duplicated lines refused, searched like any other memory file (18.4). test/tier2g.test.ts 18.4',
  { pattern: 'readUserBlock', expect: 'present' }, 0);
check('context', 'Memory provenance / taint', 'owner|agent|untrusted|system columns', 'WORKING',
  'every fact line carries its origin ([from:owner|agent|system|untrusted]) and where it was learned ((src: <channel> · session:<id> · run:<id>)); the run decides the origin (a chat is the owner, a subagent is the agent, a background job is the system) and the model can state one explicitly; a prompt holding untrusted facts says so and tells the model to treat them as data, never instructions; search results carry the same columns (18.2-18.1). test/tier2g.test.ts 18.2',
  { file: 'src/agent/memory.ts', pattern: 'export function parseFact', expect: 'present' }, 0);
check('context', 'Memory search quality', 'hybrid vector+BM25, decay, MMR, trigger injection', 'WORKING',
  'searchDetailed(): BM25 with document frequency over MEMORY.md/USER.md/daily/compacted, an all-terms bonus and a 2.2x exact-phrase boost, a 30-day recency half-life from each fact\'s own stamp, untrusted facts ranked lower but never hidden, snippets with the matched terms marked, and the optional embedding index added as explicitly-labelled semantic hits on top (never required). CLI `memory search --json` carries score/snippet/provenance, the chat has /memory search, and the agent has search_memory (18.1). test/tier2g.test.ts',
  { pattern: 'searchDetailed', expect: 'present' }, 0);
check('context', 'Embedding providers', 'OpenAI, Voyage, Gemini, Ollama, local GGUF, FTS-only', 'PARTIAL',
  'local transformers.js only (Xenova/all-MiniLM-L6-v2), optional install', { pattern: 'transformers', expect: 'present' }, 4);
check('context', 'Dreaming / idle consolidation', 'idle-cycle log → memory distillation', 'WORKING',
  'src/agent/dream.ts + CLI dream + /api/dream — a genuine TermCrab strength', { pattern: 'dream', expect: 'present' }, 0);
check('context', 'Bootstrap file set', 'AGENTS, SOUL, IDENTITY, USER, BOOTSTRAP, MEMORY', 'PARTIAL',
  'SOUL.md + AGENTS.md roster + the memory head now includes USER.md (18.4); IDENTITY.md and BOOTSTRAP.md are still not part of the set - the agent\'s identity lives in SOUL.md/config and setup is onboarding, so those two names stay unmatched on purpose',
  { pattern: 'readUserBlock', expect: 'present' }, 2);

// ------------------------------------------------------------------ 5. tools
check('tools', 'Shell execution', 'exec with policy + approvals', 'WORKING',
  'src/agent/exec-guard.ts is the guard around `exec`: a short catastrophe list (rm -rf /, mkfs, dd onto a device, fork bomb, chmod -R 777 /, reboot, curl|sh) refuses with one sentence and never spawns, owner patterns are added on top via agent.execDenyPatterns, a real timeout kills the process and reports [killed after Ns] with whatever it printed, output is capped and the cap is stated, and agent.execTimeoutSec sets the default. agent.allowExec still gates the whole tool (off by default) and the same tools can require a human yes/no through the approval queue (22.3). test/tier2k.test.ts 22.1',
  { file: 'src/agent/exec-guard.ts', pattern: 'export async function runCommand', expect: 'present' }, 0);
check('tools', 'File operations', 'root-bounded fs-safe tools', 'WORKING',
  'read_file/write_file/list_dir with allowed roots (tools.ts:22,97), plus the inbox the agent can browse: inbox_list / inbox_read answer from the arrival index and the saved sidecar with the same readers the intake uses, and refuse a name that contains a path (17.1–17.4, src/channels/inbox.ts)', { pattern: 'inbox_read', expect: 'present' }, 0);
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
check('tools', 'Image / media generation', 'image, video, music generation', 'WORKING',
  'src/media/image.ts: a real PNG is produced either by the configured image endpoint (POST {baseUrl}/images/generations, b64_json or url, model from config.media.imageModel) or, under the mock provider, drawn locally by a hand-rolled PNG encoder on node:zlib — deterministic bytes, no deps, no network. One path behind three doors: the `generate_image` tool (writes workspace/outbox), `termcrab image "prompt" [--size] [--out]`, and POST /api/image for the panel; every result says placeholder: true when nothing was sent out. Video and music are not attempted',
  { file: 'src/media/image.ts', pattern: 'export async function generateImage', expect: 'present' }, 0);
check('tools', 'Document extraction', 'pdf/docx/pptx extraction', 'WORKING',
  'the text of what arrives is read by our own zero-dependency readers (src/channels/extract.ts): PDF content streams with FlateDecode, DOCX/PPTX/XLSX through a small ZIP reader on node:zlib, every text format as-is — capped at 20 000 characters with a truncation note, a scanned PDF refused with a sentence that names OCR, a .zip not opened and said so (16.1); pictures are read by a model that can see them, as a real image part on the wire, or the agent is told "I saved it but cannot see it" with the exact command (16.2, src/channels/vision.ts). Pinned by test/tier2e.test.ts',
  { paths: ['src/channels/extract.ts', 'src/channels/vision.ts'], expect: 'present' }, 3);
check('tools', 'Tool count', '~44 in-loop tools + plugin tools', 'WORKING',
  'more tools than the ~44 they ship in-loop, and every one of ours is reachable: 59 definitions (45 in toolbox.ts + 14 in tools.ts) of which 57 are live under a default config (a few are gated on capability, e.g. an unpaired device), counted at runtime by test/tier2n.test.ts. Their extra count is plugin tools, which are out of scope here. Each tool declares a JSON schema and every call is validated at the boundary (src/agent/tool-schema.ts)',
  { file: 'src/agent/toolbox.ts', pattern: 'def: {', expect: 'present', min: 45 }, 0);
check('tools', 'Tool schema validation', 'TypeBox-validated arguments', 'WORKING',
  'src/agent/tool-schema.ts validates every tool call against the schema the tool already declares (type/required/properties/items/enum/integer, nested included) before execute() runs — buildTools() wraps all tools, so the check holds for the loop, the panel and tests alike. A bad call comes back as `[bad arguments for <tool>] missing required `path` (string)` plus the instruction to resend, which is what a small model can actually act on; a test walks every built-in tool and proves each one answers instead of crashing. TypeBox itself is not used: zero runtime dependencies is a promise this project keeps',
  { file: 'src/agent/tool-schema.ts', pattern: 'export function validateArgs', expect: 'present' }, 0);
check('tools', 'Human-in-the-loop prompts', 'ask_user overlay + timers', 'WORKING',
  'ask_user (toolbox.ts) plus a real approval gate in the loop for any tool listed in security.approvals.tools: the turn pauses *before* the tool runs, the panel shows a card over SSE and now the terminal answers too — `termcrab agent` asks y/N on a TTY, a non-interactive run is told which command approves it, and the timeout default (deny) applies if nobody answers. The decision (approved/denied/timeout, and who) is written into the transcript as a `[approval] <tool> <decision> by <who>` system line, so "who allowed this" is answerable later from the same file. test/tier2k.test.ts 22.3',
  { file: 'src/core/approvals.ts', pattern: 'export function waitForApproval', expect: 'present' }, 0);

// ----------------------------------------------------------------- 6. skills
check('skills', 'SKILL.md loading', 'progressive disclosure + gating', 'WORKING',
  'src/skills/loader.ts + load_skill tool (tools.ts:318)', { pattern: 'load_skill', expect: 'present' }, 0);
check('skills', 'Bundled skill library', '49 bundled + 13k ClawHub', 'PARTIAL',
  '5 bundled: daily-briefing, shell-safety, termux-api, voice, web-research', { pattern: 'SKILL.md', expect: 'present' }, 6);
check('skills', 'Skill precedence + overrides', 'multi-root precedence, allowlists', 'WORKING',
  'src/skills/loader.ts: roots read left to right, later wins — a user skill replaces a bundled one in list(), get() and the prompt index; skills.allow is an allow-list (empty = all) wired from config in server.ts and the CLI; documented in docs/SKILLS.md and pinned by test/tier0.test.ts 10.5',
  { pattern: 'permitted', expect: 'present' }, 0);
check('skills', 'Agent-authored skills', 'skill-workshop review flow', 'PARTIAL',
  'skill_workshop tool (toolbox.ts) + scaffold.ts', { pattern: 'skill_workshop', expect: 'present' }, 3);
check('skills', 'Skill registry / distribution', 'ClawHub + signed manifests', 'ABSENT',
  'no registry by design; termcrab import openclaw is the only path', { pattern: 'clawhub|registry', expect: 'absent' }, 0, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });
check('skills', 'OpenClaw compatibility', 'n/a', 'BETTER',
  'termcrab import openclaw reads their SKILL.md folders and workspace files unchanged (src/migrate/openclaw.ts, 558 lines)',
  { paths: ['src/migrate/openclaw.ts'], expect: 'present' }, 0);

// ---------------------------------------------------------------- 7. plugins
check('plugins', 'Plugin API + lifecycle', '164 extensions, typed SDK, hot reload', 'ABSENT',
  'packages/plugin-sdk/index.ts is a stub; no loader', { pattern: 'registerPlugin|loadPlugin', expect: 'absent' }, 15, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });
check('plugins', 'Channel plugin interface', 'external channel packages', 'ABSENT',
  'channels are compiled in (src/gateway/server.ts:37-48)', { pattern: 'channelPlugin', expect: 'absent' }, 8, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('plugins', 'Provider plugin interface', '35+ model providers as packages', 'ABSENT',
  'one OpenAI-compatible client with host presets (src/providers/index.ts:10)', { pattern: 'providerPlugin', expect: 'absent' }, 6, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });
check('plugins', 'Plugin manifest + permissions', 'manifest, allowlists, install policy', 'ABSENT',
  'nothing to install and no permission model', { pattern: /pluginManifest|plugin\.json/, expect: 'absent' }, 6, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });

// --------------------------------------------------------------- 8. channels
check('channels', 'Telegram', 'grammY bot + groups + topics', 'WORKING',
  'src/channels/telegram.ts long-poll, allowlist, chunking, outbox', { pattern: /getUpdates|sendMessage/, expect: 'present' }, 1);
check('channels', 'WhatsApp', 'Baileys QR pairing', 'PARTIAL',
  'src/channels/whatsapp.ts optional Baileys (npm install baileys)', { pattern: /baileys/i, expect: 'present' }, 3, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'Discord', 'official plugin', 'WORKING',
  'src/channels/discord.ts routes through the same agent handler as Telegram (allowlist, bot-ignore, reply) and queues a failed send in the outbox; discord.js stays optional and injectable. test/adapters.test.ts 13.5',
  { pattern: 'DiscordChannel', expect: 'present' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'Slack', 'official plugin', 'WORKING',
  'src/channels/slack.ts replies through say() with the agent answer, skips subtypes/bots and other channels, and queues failures; @slack/bolt stays optional and injectable. test/adapters.test.ts 13.5',
  { pattern: 'SlackChannel', expect: 'present' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'Signal', 'signal-cli bridge', 'WORKING',
  'src/channels/signal.ts parses signal-cli --json envelopes line by line, routes to the agent, sends with signal-cli send and queues failures; both spawn and send are injectable. test/adapters.test.ts 13.5',
  { pattern: 'SignalChannel', expect: 'present' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'SMS / MMS', 'Twilio plugin', 'WORKING',
  'src/channels/sms.ts turns a Twilio webhook body into an agent turn and answers through the Twilio REST API (basic auth, form body), allowlist included; fetch is injectable. test/adapters.test.ts 13.5 — inbound pictures/MMS are still out of scope',
  { pattern: 'SmsChannel', expect: 'present' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'Matrix', 'official plugin', 'WORKING',
  'src/channels/matrix.ts ignores its own messages and other rooms, routes to the agent and sends via sendTextMessage/sendMessage; matrix-js-sdk stays optional and injectable. test/adapters.test.ts 13.5',
  { pattern: 'MatrixChannel', expect: 'present' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'iMessage / Teams / Google Chat / LINE / Feishu / IRC…', '25+ further channels', 'ABSENT',
  'no further adapters', { pattern: 'imessage|msteams|googlechat', expect: 'absent' }, 25, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('channels', 'Channel routing rules', 'per-room routing, access groups, broadcast groups', 'ABSENT',
  'what is here: a chat-id allowlist + an @agent prefix (src/channels/telegram.ts parseAgentPrefix)',
  { pattern: /broadcastGroup|accessGroup|roomRouting/, expect: 'absent' }, 6, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });
check('channels', 'Group / ambient events', 'history reads, mention policy', 'PARTIAL',
  'groups are first-class now: by default the bot answers in a group only when it is mentioned or replied to, the mention is stripped before the agent sees the text, and channels.telegram.groupPolicy="all" opts into everything (15.3). Still absent: reading room history it was not addressed in, and per-room routing rules. test/tier2d.test.ts 15.3',
  { pattern: /groupPolicy/, expect: 'present' }, 3);
check('channels', 'Slash commands in chat', '30+ TUI / channel commands', 'WORKING',
  'every text channel shares the same commands: /new, /status, /usage (the real meter), /sessions (the real store), /memory (the real memory files), /agents, /providers, /heartbeat, /help (15.4, src/gateway/server.ts handleChannelMessage); the web panel has its own /api/slash set. Fewer words than their 30+, but each one answers from live data — pinned by test/tier2d.test.ts 15.4',
  { pattern: /text === '\/usage'/, expect: 'present' }, 0);
check('channels', 'Typing indicators', 'per-channel, on enqueue', 'WORKING',
  'src/channels/telegram.ts sends sendChatAction(chatId, typing) before the agent turn, refreshes it every 4s (Telegram forgets after ~5s) and clears it with the answer; a failing indicator never costs a reply and a rejected user gets none. test/tier2b.test.ts 13.1',
  { pattern: 'sendChatAction', expect: 'present' }, 0);
check('channels', 'Media send/receive', 'images, audio, documents', 'WORKING',
  'inbound files land in workspace/inbox and the agent is told the path: photos, documents and voice notes through getFile, with a size limit (channels.telegram.maxFileMb, default 20 MB), an extension allow-list and a hard refusal of executables (.apk/.dex/.exe/.sh/…); outbound is the send_file tool through a registered document sender, and a failed send keeps the file in the offline outbox (15.1/15.2, src/channels/media.ts + src/channels/api.ts sendDocument). Telegram only; the other adapters stay text. test/tier2d.test.ts 15.1/15.2',
  { pattern: 'sendDocument', expect: 'present' }, 3);

// ------------------------------------------------------ 9. providers/models
check('providers', 'Model providers', 'OpenAI, Anthropic, Gemini, plus plugin providers', 'WORKING',
  'Three native wire formats behind one Provider contract: OpenAI-compatible /chat/completions (7 host presets + any self-hosted server), Anthropic /v1/messages and Google Gemini generateContent — plus the offline mock brain. provider.type picks the dialect, both native adapters are pinned by tests against fake upstreams, and the failover chain (resolveProviderChain + cooldowns) works across all of them. Provider plugins are out of scope by the three-surface decision, which is why this row is capped here rather than linked to a plugin interface',
  { file: 'src/providers/anthropic.ts', pattern: 'export function createAnthropic', expect: 'present' }, 0);
check('providers', 'Offline brain (no network, no key)', 'none - a provider is required', 'BETTER',
  'src/providers/mock.ts: type:"mock" answers deterministically and still drives one real tool round-trip, so CI, the quick start and docs/LAUNCH.md offline fallback work with no network and no key',
  { paths: ['src/providers/mock.ts'], expect: 'present' }, 0);
check('providers', 'Anthropic native', 'native Claude API support', 'WORKING',
  'src/providers/anthropic.ts: POST {base}/v1/messages with x-api-key + anthropic-version, the system prompt as a top-level field, typed content blocks (text, image as base64 source, tool_use, tool_result in user turns, thinking/redacted_thinking echoed back verbatim), tools as input_schema, SSE streaming with text/thinking deltas, partial input_json reassembly, stop_reason and usage mapping. provider.type: "anthropic" survives config load (no more coercion to openai). Pinned by test/tier2p.test.ts 27.2 (a fake /v1/messages asserting the exact body and headers, and a streaming run)',
  { file: 'src/providers/anthropic.ts', pattern: 'export function createAnthropic', expect: 'present' }, 0);
check('providers', 'Google Gemini native', 'native Gemini API support', 'WORKING',
  'src/providers/gemini.ts: POST {base}/models/<model>:generateContent (streamGenerateContent + alt=sse when streaming) with x-goog-api-key, contents/parts with user|model roles, systemInstruction, functionDeclarations, functionResponse parts merged into one user turn, inlineData images, synthesized stable tool-call ids (Gemini sends none) remembered by name for the tool result, usageMetadata mapping. Pinned by test/tier2p.test.ts 27.2 (exact URL, headers and body against a fake upstream)',
  { file: 'src/providers/gemini.ts', pattern: 'export function createGemini', expect: 'present' }, 0);
check('providers', 'Local model tier', 'run the small model locally, fall back with a reason', 'WORKING',
  'config.localProvider (baseUrl + model) builds a real provider used for the dream pass and for `termcrab agent --tier local`; the gateway builds it too, so a panel run can ask for the local tier. When the tier is requested with nothing configured, the turn still runs on the cloud but writes a [local tier] system note naming config.localProvider and docs/LOCAL.md — no silent data burn. Pinned by test/tier2p.test.ts 27.3 (local answers locally, cloud answers without the tier, and the note exists with the fix named)',
  { file: 'src/agent/loop.ts', pattern: "\[local tier\]", expect: 'present' }, 0);
check('providers', 'Model catalog + pickers', 'live model list + selection in the UI', 'WORKING',
  'src/providers/catalog.ts: listModels() asks the live endpoint (OpenAI-compatible /models, Anthropic /v1/models, Gemini /v1beta/models) and falls back to an offline catalog of 22 known models with a note saying which happened, so termcrab models is never empty; describeModel() gives context window, vision, tools, thinking and dated prices, and capabilityLine() renders it. The panel keeps its live probe picker (src/channels/picker.ts + /api/probe). Pinned by test/tier2p.test.ts 27.3 (offline fallback note, live listing against a fake /models, CLI shape)',
  { file: 'src/providers/catalog.ts', pattern: 'export async function listModels', expect: 'present' }, 0);
check('providers', 'Per-model capability negotiation', 'adapt requests to the model actually chosen', 'WORKING',
  'Three places adapt to the chosen model rather than assuming: the request key for the output limit and the reasoning field (src/providers/capabilities.ts, pinned by earlier tests), whether an image may be sent at all (src/channels/vision.ts canSeeImages — name patterns first, then the catalog, unknown models are treated as blind), and what the user is told is possible (termcrab models prints context/vision/tools/thinking/price per model, and unknown ids say "capabilities unknown" rather than guessing). Not attempted: probing the endpoint for capabilities at runtime',
  { file: 'src/providers/catalog.ts', pattern: 'export function describeModel', expect: 'present' }, 0);
check('providers', 'Auth profiles / credential store', 'named keys, per-profile provider/base/model', 'WORKING',
  'src/core/auth-profiles.ts: termcrab auth add <name> --provider openai|anthropic|gemini --key <key> [--base-url] [--model] stores the key in state/auth-profiles.json (mode 0600, every use appended to state/auth-audit.log), config.json only carries provider.authProfile: "<name>", and resolveAuth() fills the key at the one place a provider is built (src/agent/loop.ts). A missing profile or one written for another vendor is a clear error, never an empty key. Pinned by test/tier2p.test.ts 27.3 (file mode, key never printed, mismatch and missing cases)',
  { file: 'src/core/auth-profiles.ts', pattern: 'export function resolveAuth', expect: 'present' }, 0);
check('providers', 'MCP as tool source', 'MCP + ACP', 'WORKING',
  'src/providers/mcp.ts wired at server.ts:345', { pattern: 'mcpClients', expect: 'present' }, 0);

// ------------------------------------------------------------- 10. automation
check('automation', 'Cron scheduler', 'schedules, payloads, delivery, webhooks', 'PARTIAL',
  'src/cron/{parser,store,scheduler}.ts, 5-field expressions', { pattern: 'cron', expect: 'present' }, 3);
check('automation', 'Heartbeat / proactive tick', '30-min heartbeat + HEARTBEAT.md', 'WORKING',
  'src/agent/heartbeat.ts + power-aware gating — TermCrab is arguably better here', { pattern: 'heartbeat', expect: 'present' }, 0);
check('automation', 'Event triggers / watchers', 'condition watchers, stream sources', 'WORKING',
  'src/gateway/triggers.ts + config: a hook that names events (`on: ["run.failed"]`, `device.*`, `*`) is woken by what happens inside the gateway — run.failed, run.start, run.end, session.reset, device.paired, file.received, file.changed, cron.finished — and the turn is queued exactly like a webhook\'s, in session hook:<id>, with a self-loop guard and a 60s cooldown per hook. config.watchers adds file/folder watchers (fs.watch with a per-watcher debounce and an optional suffix `match`), so "when a PDF lands in this folder, look at it" works without a rule language. `termcrab events` prints the catalogue, the listeners and the watched paths. Not attempted: condition polling (battery/disk thresholds as events) and stream sources',
  { file: 'src/gateway/triggers.ts', pattern: 'export function watcherMatches', expect: 'present' }, 0);
check('automation', 'Standing orders', 'persistent programs with execute-verify-report', 'WORKING',
  'src/agent/intents.ts (state/intents.json) stores them; the system prompt injects a `# Standing orders` block into every turn with the precedence spelled out (they outrank memory and workspace notes; they never override the safety rules). Surfaces: `termcrab orders [list|add|remove]`, the chat command `/orders [add|remove]`, and the agent\'s own `intent` tool — all one store. The run half is cron (schedule) + event triggers on run.end/run.failed (verify + report), so "every morning brief me, and tell me if it breaks" is expressible today. What is not attempted: a typed program object with phases and approval boundaries. test/tier2n.test.ts covers the CLI round-trip, the prompt block and the precedence line',
  { file: 'src/agent/intents.ts', pattern: 'export function addIntent', expect: 'present' }, 0);
check('automation', 'Task board', 'tasks, taskflow, workboard', 'PARTIAL',
  'src/agent/tasks.ts + suggest_task/dismiss_task tools + /api/tasks', { pattern: 'suggest_task', expect: 'present' }, 3);
check('automation', 'Scheduled delivery to channels', 'deliver cron output to a chat', 'PARTIAL',
  'cron runs a prompt in a session; delivery routing is manual', { pattern: 'deliver', expect: 'present' }, 2);
check('automation', 'Gmail / IMAP watchers', 'PubSub + IMAP integrations', 'ABSENT',
  'no mail integration', { pattern: 'imap|gmail', expect: 'absent' }, 5, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });

// -------------------------------------------------------------- 11. surfaces
check('surfaces', 'Web control UI', 'React+Vite dashboard, rebuilt in 2.0', 'PARTIAL',
  'ui/index.html — one 6,779-line file, 9 views, no build step, no component model',
  { pattern: /id="view-chat"/, scope: 'ui', expect: 'present' }, 8);
check('surfaces', 'Full-screen TUI', 'openclaw tui / chat / terminal', 'ABSENT',
  'no raw mode, no alternate screen anywhere in src/', { pattern: 'setRawMode|1049', expect: 'absent' }, 15);
check('surfaces', 'Interactive REPL', 'TUI --local', 'PARTIAL',
  'src/cli.ts:336 readline REPL, 4 slash commands', { pattern: 'readline', expect: 'present' }, 5);
check('surfaces', 'CLI command coverage', '~90 commands, 101 doc pages', 'PARTIAL',
  '29 commands in one switch (src/cli.ts) — still far fewer words than their ~90, but every one of them documents itself (13.3) and completes (13.4)',
  { pattern: 'case \'', expect: 'present' }, 8);
check('surfaces', 'Per-command help', 'every command documents its flags', 'WORKING',
  'src/command-help.ts is one table (usage, summary, flags, example) for every command: `termcrab help <cmd>` and `termcrab <cmd> --help` work on all of them — including commands whose flag parser used to reject --help. The test fails if a command in the CLI switch has no entry, or a documented flag is never parsed. test/tier2b.test.ts 13.3',
  { pattern: 'command-help', expect: 'present' }, 0);
check('surfaces', 'JSON output mode', 'reserved stdout + failure envelope', 'WORKING',
  'one envelope for every structured command: {ok, command, data} on success, {ok:false, command, error:{message, hint}} on failure, exactly one document on stdout (src/core/json-out.ts). `--json` works on status, sessions, skills, cron, memory, approvals, usage, disk, doctor, run/wait and stop; in json mode logs move to stderr (setLogToStderr) so a warning cannot corrupt the document; the exit code keeps the shell convention (0/1/124/130). Documented in docs/CLI.md and in `termcrab help <cmd>`. test/tier2c.test.ts 14.1-14.5',
  { pattern: 'emitJson', expect: 'present' }, 0);
check('surfaces', 'Shell completion', 'openclaw completion bash|zsh|fish', 'WORKING',
  'termcrab completion bash|zsh|fish prints a script generated from the same command table — every command name appears in all three, and an unknown shell exits 1 with the usage line. test/tier2b.test.ts 13.4',
  { pattern: /completionScript\(shell\)|_termcrab/, expect: 'present' }, 0);
check('surfaces', 'Colour / TTY discipline', 'NO_COLOR, TTY-only ANSI, OSC links', 'WORKING',
  'src/core/color.ts: NO_COLOR (non-empty) beats FORCE_COLOR, TCRAB_COLOR=always|never is the explicit override, otherwise colour only on a TTY — pipes, log files and chat bridges stay plain. The logger, the CLI error paths and the bin go through it; test/tier2b.test.ts 13.2 runs the real binary both ways. (OSC 8 hyperlinks: not used.)',
  { pattern: 'NO_COLOR', expect: 'present' }, 0);
check('surfaces', 'Terminal voice loop', 'Talk Mode, wake words', 'BETTER',
  'termcrab wake: keyword → STT → command → TTS (src/mobile/wake.ts) — no desktop equivalent in Termux',
  { pattern: 'wake', expect: 'present' }, 1);
check('surfaces', 'macOS/Windows/Linux apps', 'native desktop apps', 'ABSENT',
  'Termux-first by design', { pattern: 'electron|tauri', expect: 'absent' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });
check('surfaces', 'iOS / Android companion apps', 'paired nodes with camera/screen', 'ABSENT',
  'no native app; Termux:API is the bridge', { pattern: 'android/app|ios/', expect: 'absent' }, 0, { lane: 'later', scope: 'out', why: 'user decision 2026-10-03: only three surfaces are supported — telegram, the web panel and the terminal (CLI/REPL). The code stays, is tested and keeps working if configured; no further work goes into it' });

// ------------------------------------------------------------- 12. security
check('security', 'Loopback-first bind', 'loopback + trusted proxy modes', 'WORKING',
  'src/gateway/server.ts:257', { pattern: 'loopback', expect: 'present' }, 0);
check('security', 'Token enforcement', 'token + pairing required', 'WORKING',
  'one guard in front of every /api/* route: authenticate(config, extractAuth(req)) accepts the master token or a paired device token, and the same call is rate-limited per key (src/gateway/server.ts); an empty token keeps the documented loopback-only default; test/auth.test.ts samples 10 routes anonymously and asserts 401, test/tier2i.test.ts 20.4 does the same for /api/devices and the pair route',
  { pattern: 'export function authenticate', expect: 'present' }, 0);
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
check('security', 'Rate limiting / loop protection', 'bot-loop protection, caps', 'WORKING',
  'src/gateway/ratelimit.ts: a token bucket per key (a device, the master token, or a peer address; per channel chat for messages) with `gateway.rateLimit = {perMinute, burst}` (default 60/10). A full bucket answers immediately — 429 {error, retryAfterMs, limit} + a `retry-after` header on the API, one sentence back into the chat for channels — instead of queueing more turns, and the limiter clamps nonsense config rather than blocking everything. test/tier2i.test.ts 20.3/20.4',
  { file: 'src/gateway/ratelimit.ts', pattern: 'export class RateLimiter', expect: 'present' }, 0);

// --------------------------------------------------------- 13. storage/state
check('storage', 'State layout', 'config JSON + Markdown brain + SQLite state + JSONL', 'WORKING',
  'src/core/paths.ts is the single layout and everything derives from TCRAB_HOME: config.json, workspace/ (SOUL.md, USER.md, skills/, inbox/, agents/), sessions/<id>.jsonl (+ .archive.jsonl + .digest.md), state/ (crons, tasks, intents, approvals, conversations, tracing, outbox), logs/termcrab.jsonl, memory/ (facts.md + index). File-based on purpose (zero deps, greppable on a phone) where they use SQLite + Markdown; documented in docs/ARCHITECTURE.md and pinned by the paths tests',
  { pattern: 'TCRAB_HOME', expect: 'present' }, 0);
check('storage', 'Database + migrations', 'SQLite with schema migrations', 'ABSENT',
  'flat files throughout', { pattern: 'better-sqlite|node:sqlite', expect: 'absent' }, 8);
check('storage', 'Backup / restore', 'openclaw backup', 'PARTIAL',
  'sessions export + manual copying; no backup command', { pattern: 'export', expect: 'present' }, 3);
check('storage', 'Atomic updates + rollback', 'guarded upgrades, versioned state', 'PARTIAL',
  'src/core/updat{er,e}.ts check-only update path (never auto-applies)', { pattern: 'update', expect: 'present' }, 4);
check('storage', 'Disk budget + pruning', 'usage caps, retention', 'WORKING',
  'src/core/disk.ts measures the state dir per area and enforceDiskBudget(maxBytes, keepDays) trims oldest-first (never config/memory/skills/workspace, never a file being written), reporting freed bytes; storage.maxMb/keepDays/autoTrim, `termcrab disk [--trim]`, /api/disk, and a check at gateway start. workspace/inbox is its own area and is trimmable (16.4), while the small .inbox-index.json stays protected so a trimmed arrival can still explain itself (17.4). test/tier0.test.ts 10.6, test/tier2e.test.ts 16.4, test/tier2f.test.ts 17.4',
  { pattern: 'enforceDiskBudget', expect: 'present' }, 0);

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
  'src/mobile/outbox.ts is an ack-after-send queue for flaky mobile networks: a failed send keeps its text, reason and attempt count; an item claimed but never acked (the process died) comes back on the next read; the file is written atomically; delivered items are swept after a week. Guarantee stated honestly as "at-least-once, acked exactly once" — a crash between a successful send and its ack can repeat one message. Pinned by test/tier2.test.ts 12.5 (never dropped, never delivered twice, survives a restart)',
  { pattern: 'outboxAck', expect: 'present' }, 0);
check('mobile', 'Termux doctor', 'n/a on Android (unsupported)', 'BETTER',
  'src/mobile/doctor.ts checks build source, wake lock, battery optimisation, proot leftovers',
  { pattern: 'doctor', expect: 'present' }, 1);
check('mobile', 'Voice STT/TTS', 'whisper + TTS providers', 'PARTIAL',
  'src/mobile/{tts,tts-stream,stt,whisper}.ts — termux-api + optional whisper.cpp', { pattern: 'whisper', expect: 'present' }, 3);
check('mobile', 'Transcription', 'realtime transcription service', 'PARTIAL',
  'a voice note that arrives is transcribed into the message the agent answers, capped at 5 MB so a long recording is not chewed up on the phone, and an engine that is missing is a sentence with the install steps (16.3, src/channels/intake.ts) — plus termcrab transcribe for any file on disk. Still not realtime (no live stream while you are talking): that is what keeps this PARTIAL',
  { pattern: 'transcribe', expect: 'present' }, 3);
check('mobile', 'Native GUI / foreground service', 'desktop apps + node apps', 'ABSENT',
  'no companion app; a persistent notification is the closest', { pattern: 'foreground service', expect: 'absent' }, 20, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });

// ------------------------------------------------------------ 15. ops / docs
check('ops', 'Install is download-only (no silent build)', 'n/a', 'WORKING',
  'package.json has no `prepare`/`postinstall`; the TypeScript compile is an explicit, visible `npm run build` (measured: 0.5s install, 3.0s build vs 4.5s combined)',
  { file: 'package.json', pattern: /"(prepare|postinstall)"/, expect: 'absent' }, 0, 'core');
check('ops', 'Installer', 'curl install.sh + Docker + Nix + Fly', 'PARTIAL',
  'install.sh (Termux-native, re-runnable) + npm install; no container or package-manager paths',
  { paths: ['install.sh'], expect: 'present' }, 2);
check('ops', 'Container / server deploy', 'Docker, docker-compose, Fly, Nix, systemd', 'ABSENT',
  'Termux/Node host only', { pattern: 'docker|Dockerfile', expect: 'absent' }, 3, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });
check('ops', 'Service install', 'openclaw gateway install (systemd/launchd)', 'PARTIAL',
  'Termux supervisor; docs/LOCAL.md covers a systemd path', { pattern: 'systemd', expect: 'present' }, 3);
check('ops', 'Logs + diagnostics', 'seven-page doctor, log levels, OTel, Prometheus', 'WORKING',
  'every console line is mirrored into logs/termcrab.jsonl as one JSON object per line (ts, level, area, message) — `termcrab logs [n]` reads it, `--json` gives the records, `--path` the file, and `termcrab doctor`/`doctor --share` still work. Rotation is built in and stated: 2 MB x 3 files by default, `logs.maxMB` / `logs.files` to change it, and `termcrab disk` already counts the logs area as trimmable. OTel/Prometheus export is not attempted — a phone agent keeps its metrics in the log file and the doctor output',
  { file: 'src/core/structured-log.ts', pattern: 'export class StructuredLog', expect: 'present' }, 0);
check('ops', 'Telemetry stance', 'version check only, opt-out', 'BETTER',
  'no telemetry at all; update check is manual', { pattern: 'telemetry', expect: 'absent' }, 0);
check('ops', 'Release discipline', 'CalVer, release notes, validation programme', 'WORKING',
  'scripts/release.mjs writes package.json and the CHANGELOG section together and --check fails the suite when they drift (test/tier0.test.ts 10.7); --notes feeds `gh release create`, --tag refuses a dirty tree; package.json now carries the same version as the newest CHANGELOG entry',
  { paths: ['scripts/release.mjs', 'CHANGELOG.md'], expect: 'present' }, 0);
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
check('ops', 'Docs that match the code', 'generated docs map, tested examples', 'WORKING',
  'the file map in docs/ARCHITECTURE.md is generated from the tree by scripts/docs-map.mjs (descriptions carried over, undescribed files marked); --check runs inside the suite (test/docs-map.test.ts 11.5) so a file that appears or disappears without the doc noticing fails the build, and 8.5 still fails if either map-style doc names a .ts file that does not exist. The README performance numbers are generated the same way (scripts/bench.mjs) and checked against a fresh run (test/tier2.test.ts 12.1), and every command the phone guide prints is verified against the real CLI (12.3)',
  { file: 'docs/ARCHITECTURE.md', pattern: /BEGIN DOCS MAP \(generated by scripts\/docs-map\.mjs\)/, expect: 'present' }, 0);

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
  const detail = `${occ} match(es)${probe.min ? ` (min ${probe.min})` : ''}${found.length ? ': ' + found.slice(0, 3).join(', ') : ''}`;
  let state = 'ok';

  if (expect === 'present' && found.length === 0) state = 'DRIFT';
  // A count probe: a claim like "44 tool definitions" should break loudly when
  // tools are deleted, not quietly rot into a smaller number.
  if (typeof probe.min === 'number' && occ < probe.min) state = 'DRIFT';
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
  [/Steering into a live run|Per-session run serialization|Queue modes|Compaction that preserves|Memory bootstrap injection|Approval queue|Request authentication|Inbound webhooks|Docs that match the code|Usage \/ token accounting|Transcript write fencing|LLM summarisation|Event triggers/, 'core'],
  [/Shell completion|Colour \/ TTY discipline|Per-command help|JSON output mode|Typing indicators|Tool-result pruning|Context introspection|USER\.md|Memory store layout|Embedding providers|Memory search quality|Bootstrap file set|Lifecycle reset policies|Multi-user scoping|Session search|Session tools surface|CLI command coverage|Interactive REPL|Full-screen TUI|Web control UI|Tool schema validation|Human-in-the-loop|Bundled skill library|Skill precedence|Agent-authored skills|Standing orders|Lifecycle hooks|Parallel tool batches|Reasoning \/ thinking levels|Model failover chain|Model catalog|Per-model capability|Local model tier|Cron scheduler|Task board|Scheduled delivery|Heartbeat|Parallel tool batches|Loop budget|Run identity|Abort \/ stop|Subagents|Progress drafts|MCP client|Browser automation|Sandboxed code execution|Shell execution|File operations|Web fetch|Phone \/ device tools|Telegram|WhatsApp|Group \/ ambient|Slash commands in chat|Media send|Channel routing|In-process|Voice STT|Transcription|Service install|Logs \+ diagnostics|Release discipline|Tests|CI matrix|Documentation site|Installer|Health \/ status|Canvas|Multi-agent routing|Remote access|Memory|Session tools|Repetition|Tool calling|Streaming|State layout|Backup|Atomic updates|Disk budget|Security audits|Secrets management|Doctor|Skills|MCP as tool source|Reasoning/, 'parity'],
  [/companion apps|macOS\/Windows\/Linux apps|iOS \/ Android companion|Container \/ server deploy|25\+ further channels|Skill registry \/ distribution|Plugin API \+ lifecycle|Channel plugin interface|Provider plugin interface|Plugin manifest|Gmail \/ IMAP|Pairing \/ device identity|Typed wire protocol|Database \+ migrations|Cloud|Fleet|workboard|Rate limiting|Image \/ media generation|Document extraction|Anthropic native|Google Gemini native|Auth profiles|Sandboxing|Session attachment|Main rolling session|Context engine|Pluggable context engine|Memory provenance|Native GUI|Stuck-run diagnostics|Group \/ ambient events/, 'later'],
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
// What counts: only what we intend to build. Out-of-scope rows are still
// measured, still shown, and still drift-checked — but they cannot drag (or
// lift) a score for work nobody is doing.
const inScope = rows.filter((r) => r.scope !== 'out');
const outOfScope = rows.filter((r) => r.scope === 'out');
const tally = Object.fromEntries(ORDER.map((v) => [v, inScope.filter((r) => r.verdict === v).length]));
const areas = [...new Set(rows.map((r) => r.area))].sort();
const drift = rows.filter((r) => r.probeResult.state === 'DRIFT');

const WEIGHT = { WORKING: 1, BETTER: 1, PARTIAL: 0.45, BROKEN: 0.1, ABSENT: 0 };
const score = inScope.reduce((a, r) => a + WEIGHT[r.verdict], 0);
const coverage = inScope.length ? Math.round((score / inScope.length) * 100) : 0;
const effortLeft = inScope.reduce((a, r) => a + r.effort, 0);
const laneEffort = (lane) => inScope.filter((r) => r.lane === lane).reduce((a, r) => a + r.effort, 0);
const laneCount = (lane) => inScope.filter((r) => r.lane === lane).length;

function tableFor(list) {
  const lines = [];
  lines.push('| Capability | OpenClaw | TermCrab | Evidence | Lane | Left (d) |');
  lines.push('|---|---|---|---|---|---:|');
  const icon = { WORKING: '✅', BETTER: '🏅', PARTIAL: '🟡', BROKEN: '⛔', ABSENT: '⚪' };
  for (const r of list) {
    const cell = r.scope === 'out' ? '🚫 OUT OF SCOPE' : `${icon[r.verdict]} ${r.verdict}`;
    const why = r.scope === 'out' ? ` — **${r.why}**` : '';
    lines.push(
      `| ${r.capability} | ${r.openclaw} | ${cell} | ${r.evidence}${why} | ${r.lane} | ${r.scope === 'out' ? '—' : r.effort || '—'} |`,
    );
  }
  return lines.join('\n');
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Bengali numerals, because the summary at the top of TRACKER.md is Bengali. */
const bn = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]);

/**
 * The Bengali summary at the top of TRACKER.md, generated from the same tally as
 * the block below it. It used to be hand-written, and it spent three batches
 * claiming "44%, 7 broken" while the code had moved on — the exact rot this file
 * exists to prevent.
 */
function summaryBnBlock() {
  const lines = [];
  lines.push(
    `- **এখনকার স্কোর: ${bn(coverage)}%।** ${bn(rows.length)}টা ক্যাপাবিলিটির মধ্যে ${bn(tally.WORKING)}টা পুরো কাজ করে (WORKING), ${bn(tally.BETTER)}টায় আমরা OpenClaw-এর চেয়ে এগিয়ে (BETTER), ${bn(tally.PARTIAL)}টা আধা (PARTIAL), ${bn(tally.ABSENT)}টা এখনো নেই (ABSENT) — আর **${bn(tally.BROKEN)}টা ভাঙা**।`,
  );
  lines.push(
    `- **core lane: ~${bn(laneEffort('core'))} দিন বাকি** (${bn(laneCount('core'))}টা চেক) — এটাই "এজেন্ট হিসেবে বিশ্বাসযোগ্য হওয়ার" লাইন; parity ~${bn(laneEffort('parity'))} দিন, later ~${bn(laneEffort('later'))} দিন (ইচ্ছাকৃতভাবে ফেলে রাখা, কারণ ১:১ ম্যাচ করলে ফোনে কিছুই লাভ হয় না)।`,
  );
  lines.push(
    `- **যা বানাচ্ছি না, তার হিসাব আলাদা:** ${bn(outOfScope.length)}টা চেক ইচ্ছাকৃতভাবে **out of scope** (মাপা হয়, কিন্তু স্কোরের ভাগ হয় না) — কারণগুলো টেবিলের নিচে লেখা।`,
  );
  lines.push(
    `- **সংখ্যাগুলো কোড থেকে মাপা, মনে করে লেখা নয়:** \`node scripts/census.mjs\` — ${bn(rows.length)}টা probe, drift ${bn(drift.length)}; কোনো probe মিস করলে ওই সারি DRIFT দেখায়, অর্থাৎ কোড সরেছে আর সিদ্ধান্তটা নতুন করে নিতে হবে।`,
  );
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
  lines.push(`| 🚫 OUT OF SCOPE | ${outOfScope.length} | deliberately not planned — measured, not counted |`);
  lines.push(`| | **${inScope.length}** | in-scope capabilities (${rows.length} measured in total) |`);
  lines.push('');
  lines.push(
    `**Capability score ${coverage}%** of in-scope work (WORKING/BETTER = 1, PARTIAL = 0.45, BROKEN = 0.1, ABSENT = 0). Out-of-scope rows are excluded from both halves of that fraction.`,
  );
  if (outOfScope.length) {
    lines.push('');
    lines.push('Out of scope, and why:');
    lines.push('');
    for (const r of outOfScope) lines.push(`- **${r.area} / ${r.capability}** — ${r.why}`);
  }
  lines.push('');
  lines.push('| Lane | Checks | Effort left | What it is |');
  lines.push('|---|---:|---:|---|');
  lines.push(`| **core** | ${laneCount('core')} | ~${laneEffort('core')}d | must exist for TermCrab to be a credible agent at all |`);
  lines.push(`| **parity** | ${laneCount('parity')} | ~${laneEffort('parity')}d | needed to compete on the axes the phone-first bet depends on |`);
  lines.push(`| **later** | ${laneCount('later')} | ~${laneEffort('later')}d | deliberately deferred — matching OpenClaw 1:1 here buys nothing on a phone |`);
  lines.push(`| **total** | ${inScope.length} | ~${effortLeft}d | in-scope only |`);
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
    const mine = list.filter((r) => r.scope !== 'out');
    const sc = mine.reduce((x, r) => x + WEIGHT[r.verdict], 0);
    const outNote = list.length - mine.length ? `, ${list.length - mine.length} out of scope` : '';
    lines.push(`### ${a} — ${mine.length ? Math.round((sc / mine.length) * 100) : 0}% (${mine.length} in-scope checks${outNote})`);
    lines.push('');
    lines.push(tableFor(list));
    lines.push('');
  }
  return lines.join('\n');
}

if (wantJson) {
  console.log(
    JSON.stringify(
      { tally, coverage, effortLeft, areas, rows, drift: drift.length, outOfScope: outOfScope.length, inScope: inScope.length },
      null,
      1,
    ),
  );
} else {
  console.log('TermCrab capability census — %d checks, %d areas', rows.length, areas.length);
  console.log('');
  for (const v of ORDER) if (tally[v]) console.log(`  ${v.padEnd(8)} ${String(tally[v]).padStart(3)}`);
  console.log(`\n  capability score : ${coverage}%`);
  console.log(`  effort remaining : ~${effortLeft} developer-days`);
  console.log(`    core lane      : ~${laneEffort('core')}d across ${laneCount('core')} checks`);
  console.log(`    parity lane    : ~${laneEffort('parity')}d across ${laneCount('parity')} checks`);
  console.log(`    later lane     : ~${laneEffort('later')}d across ${laneCount('later')} checks (deliberately deferred)`);
  console.log(`  out of scope     : ${outOfScope.length} (measured, excluded from the score)`);
  console.log(`  probe drift      : ${drift.length}`);
  if (drift.length) {
    console.log('');
    for (const d of drift) console.log(`  DRIFT  ${d.area}/${d.capability} → ${d.probeResult.detail}`);
  }
  console.log('');
  for (const a of areas) {
    const list = rows.filter((r) => r.area === a && r.scope !== 'out');
    const outHere = rows.filter((r) => r.area === a && r.scope === 'out').length;
    if (!list.length) {
      console.log(`  ${a.padEnd(12)} ${'·'.repeat(20)}  n/a  (all ${outHere} check(s) out of scope)`);
      continue;
    }
    const s = list.reduce((x, r) => x + WEIGHT[r.verdict], 0);
    const bar = '█'.repeat(Math.round((s / list.length) * 20)).padEnd(20, '·');
    const left = list.reduce((x, r) => x + r.effort, 0);
    console.log(`  ${a.padEnd(12)} ${bar} ${String(Math.round((s / list.length) * 100)).padStart(3)}%  (${list.length} in-scope checks, ~${left}d left)`);
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
        inScope: inScope.length,
        outOfScope: outOfScope.length,
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
      let next = text.slice(0, a + BEGIN.length) + '\n' + measuredBlock() + '\n' + text.slice(b);
      // Same numbers, in Bengali, at the top of the file.
      const sb = '<!-- BEGIN SUMMARY-BN -->';
      const se = '<!-- END SUMMARY-BN -->';
      const sa = next.indexOf(sb);
      const sEnd = next.indexOf(se);
      if (sa >= 0 && sEnd > sa) {
        next = next.slice(0, sa + sb.length) + '\n' + summaryBnBlock() + '\n' + next.slice(sEnd);
      }
      fs.writeFileSync(tracker, next);
      console.log('\nTRACKER.md measured + summary blocks refreshed.');
    }
  }
  console.log('docs/openclaw/data/census.json written.');
}
