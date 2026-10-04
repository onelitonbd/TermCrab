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
check('gateway', 'Multi-agent routing', 'per-agent workspace, session, store', 'WORKING',
  'a named agent is workspace/agents/<name>/SOUL.md and it now has a route: agents.routes.<surface> says who answers on web, telegram, cli, cron, voice, wake or subagent, with the precedence stated in one line (explicit @prefix or --as wins, then the route, then the main agent). resolveRoute returns the decision plus a problem when config names an agent that does not exist — the turn still runs as the main agent and the reason is in the log, in `termcrab agents routes` and on the panel (GET /api/agents returns agents and routes; PUT /api/agents/routes sets one). Each agent keeps its own session namespace, so a routed Telegram message and the same agent used with --as are one history, not two. The route is stored in config, so it survives a restart and is readable. test/tier2x.test.ts 33.2 covers precedence, a broken route, config validation naming the exact surface, and the CLI round-trip. Not attempted: per-agent model/store overrides (agent.scoped* settings), because one brain with several personalities is what the owner asked for',
  { pattern: /agents\.routes/, expect: 'present' }, 0);
check('gateway', 'Presence', 'online/typing/presence events', 'WORKING',
  'src/gateway/presence.ts derives one picture from stores that already exist: attached gateway watchers (bus subscribers = the panel, a phone, the CLI), channels configured-vs-running (server builds the rows from live objects, so a channel that failed to start cannot claim to run), paired devices with their last sighting, and people who actually wrote — each with a stated freshness ladder (<=2 min online, <=1 h recent, older idle, never seen unknown). Read by `termcrab presence [--json]`, GET /api/presence, the presence line in /api/status and the chat /status reply; presence changes are bus events (watcher attached/left, device paired, channels started), so a UI can react without polling. Typing indicators are already sent by the telegram channel (src/channels/telegram.ts); a per-keystroke typing protocol is not attempted. Pinned by test/tier2m.test.ts (24.1)',
  { file: 'src/gateway/presence.ts', pattern: 'export function buildPresence', expect: 'present' }, 0);
check('gateway', 'Remote access story', 'Tailscale, SSH, trusted proxy, TLS pinning', 'WORKING',
  'the story is enforced, not just written down (34.5). Three mechanisms: the bind guard refuses to start a non-loopback gateway with no token (exit 1, not a warning — this is what makes the "a token is mandatory off your own device" claim true); every /api/* route authenticates with the master token or a paired per-device token (compared in constant time, revocable one device at a time) and the rate limiter answers 429 instead of queueing; and `termcrab security` judges the exposure from the live config — bound off-loopback is a warn, and a short/guessable/repeated-character token beside it is a fail with the fix, including the one-liner that generates a good token. docs/REMOTE.md names the recipes (Tailscale, SSH tunnel, trusted proxy) and states the structural limit: there is **no built-in TLS terminator**, so the bearer token is only as private as the network it crosses — put a tunnel or WireGuard in front, which is exactly what those recipes are, and docs/SECURITY.md repeats it so it cannot be missed. Pinned by test/tier3c.test.ts 34.5 (weak-token classification incl. the long-guessable-word case) and test/auth.test.ts (401 on every route). Limits stated: no TLS pinning, no nonce/replay protection (a bearer token over TLS is the design), and no proxy trust model — the tunnel is trusted wholesale, as the docs say.',
  { file: 'docs/REMOTE.md', pattern: 'bind guard', expect: 'present' }, 0);
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
check('agent', 'Subagents', 'sessions_spawn, agents_wait, lanes, worktrees', 'WORKING',
  'a subagent is a turn the agent starts and does not wait for: sessions_spawn takes prompt|sessionId|label|agent|scratch, the child writes to its own session (namespaced by the agent it runs as, so its history is its own), and the parent is told once, in one line, when it settles ([subagent <id>] … appended to the parent session, role system — so every surface sees the result without polling). A cap refuses instead of piling up: past agent.maxSubagents (default 4) spawnTask throws TaskLimitError naming the running ids and the setting, and the tool answers in prose rather than blowing up the turn. A deadline (agent.subagentTimeoutSec, default 15 min) marks a task `timeout` — not `error` — and a late answer cannot resurrect it. Task ids, status (running/done/error/timeout), elapsed time, the agent, and the scratch dir are visible from `termcrab subagents [list|show|clear]` and GET /api/subagents, and a scratch task gets workspace/subagents/<id>/ so two tasks never fight over file names. test/tier2x.test.ts 33.1 pins the cap, the timeout (including the late answer), the onFinish note firing exactly once, the scratch dir and its prune, plus the CLI. Not attempted: git worktrees (the owner never asked for one and a phone has no second checkout to spare) and cross-process task persistence, because a restarted gateway has no subagents to report',
  { file: 'src/agent/subagents.ts', pattern: 'export function ensureSubagentDir', expect: 'present' }, 0);
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
check('sessions', 'Multi-user scoping', 'dmScope 4 modes + identity links', 'WORKING',
  'src/agent/rolling.ts + gateway intake: the owner is one identity across surfaces (the panel, the terminal and a Telegram DM from an id in channels.telegram.allowedUserIds all share the rolling main session), while everyone else is scoped by channels.telegram.scoping = chat (default: one thread per room, what a group wants) or user (one thread per person, so their DM and their mentions follow them between chats). Who spoke is recorded, not guessed: runTurn takes a user and the run trace carries it (startRun user, tracing.ts), and memory facts written through the run carry it as their source. Groups, strangers, cron, heartbeat, dream and subagents never touch the owner thread. 4 dmScope modes with identity links (linking two channel accounts as one person) are not implemented; scoping is per-channel config', 
  { file: 'src/agent/rolling.ts', pattern: 'export function rollingSessionKey', expect: 'present' }, 0);
check('sessions', 'Session tools surface', 'sessions_list/history/search/send/status', 'WORKING',
  'src/agent/toolbox.ts:644-880', { pattern: 'sessions_list', expect: 'present' }, 0);
check('sessions', 'Main rolling session', 'agent:<id>:main with background routing', 'WORKING',
  'src/agent/rolling.ts: one main session (agent.rollingSession, default true; name from agent.mainSession, default main) shared by the owner surfaces — panel, CLI/REPL, voice and a Telegram DM whose chat id is an allowed id. It rolls over on the first turn of a new local day: the live transcript is appended to <session>.archive.jsonl, the file is emptied and the fresh thread opens with a [rolling] system note naming the archive and how to search it, so nothing is deleted and the model is not dropped mid-conversation. The loop rolls before the turn writes (so the roll judges yesterday by what was there), emits session:reset with reason rolling, /api/status reports the session plus a plain line, `sessions ls` marks it and `sessions show` explains it, and the panel opens on it. Scheduled and background work (cron, heartbeat, dream, subagents) keeps its own key by routing, not by exclusion', 
  { file: 'src/agent/rolling.ts', pattern: 'export function rollMainSession', expect: 'present' }, 0);
check('sessions', 'Session attachment (multi-client)', 'openclaw attach, projections', 'WORKING',
  'GET /api/sessions/:id/attach (src/gateway/server.ts, 28.2) is a per-conversation SSE stream: the first frame is a state snapshot (last 60 transcript entries, the running turn id, the viewer count) so a tab that just opened catches up in one request, then it is the same versioned wire format as /api/events filtered to that session, so a phone, a laptop and the terminal watch one thread and none of them misses a message (the queue still runs one turn at a time, which is what makes that true). GET /api/sessions reports viewers and running per session, closing a tab releases its viewer, and src/agent/session-view.ts answers what belongs to a conversation (files touched, facts with their provenance, approvals, tools, digest, reset policy, writer fence) through `termcrab sessions show`. No projection/merge protocol for two clients editing one transcript at the same instant: the write fence serialises writers by design',
  { file: 'src/gateway/server.ts', pattern: 'sessionViewers', expect: 'present', min: 5 }, 0);

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
check('context', 'Memory search has a budget (39.2)', 'a vector store with no timing story', 'BETTER',
  'The index is a JSONL file scanned in memory: filter to the rows this model can compare, cosine each, sort, take k. searchMs measures one search over 10 000 vectors (about a year on a phone) with a 200 ms ceiling, with a deterministic local embedder so the number is our scan and not an API. Measured: ~7 ms. The ceiling is the alarm for a search that quietly became quadratic or an index that started hitting the disk per query. docs/PERFORMANCE.md states what it does not claim (not a remote embedder latency, not a phone number). Pinned by test/tier3j.test.ts 39.2',
  { file: 'src/core/perf.ts', pattern: 'searchMs', expect: 'present' }, 0);
check('context', 'Embedding providers', 'OpenAI, Voyage, Gemini, Ollama, local GGUF, FTS-only', 'WORKING',
  'Three routes, chosen in one place (src/agent/embed-provider.ts) and reported by `termcrab embeddings status` with the model and its price: the local transformers.js model when its package is installed (offline, no key), any OpenAI-compatible /embeddings endpoint (OpenAI, OpenRouter, and the self-hosted ones a Termux user actually has - Ollama, llama.cpp, LM Studio, which need no key at all), or Gemini batchEmbedContents with the key in a header. `memory.embedProvider = auto|local|openai|gemini` plus `embedModel`/`embedBaseUrl`; auto prefers the local model and otherwise uses the chat provider the user already configured, so smart search is one config value away instead of a 23 MB download. Errors name the host and the status and redact the key, a broken endpoint falls back to lexical search with the reason logged, and `termcrab embeddings test <text>` embeds a string end to end and prints the dimension. Voyage and GGUF files are not implemented; an OpenAI-compatible GGUF server (llama.cpp) is covered by the openai route. Pinned by test/tier2u.test.ts (10 cases, incl. a real local HTTP endpoint and a semantic hit no word match could find). The index now records what made each vector (35.4): `{provider, model}` is written on every row, `embeddings status` counts and names the stale ones with the re-embed command, and vectors of two different sizes are skipped in search instead of being scored a 0 that reads as unrelated - pinned by test/embed.test.ts and test/tier3g.test.ts',
  { file: 'src/agent/embed-provider.ts', pattern: 'export async function resolveEmbedder', expect: 'present' }, 0);
check('context', 'Dreaming / idle consolidation', 'idle-cycle log → memory distillation', 'WORKING',
  'src/agent/dream.ts + CLI dream + /api/dream — a genuine TermCrab strength', { pattern: 'dream', expect: 'present' }, 0);
check('context', 'Bootstrap file set', 'AGENTS, SOUL, IDENTITY, USER, BOOTSTRAP, MEMORY', 'WORKING',
  'All six names are real files now (32.3). The first command that touches a new home writes workspace/SOUL.md, workspace/IDENTITY.md (pure settings, injected every turn), workspace/AGENTS.md (the surface -> agent table), workspace/BOOTSTRAP.md (the first-run note, injected into the prompt only while it exists, with the agent told to walk the owner through the two questions that matter and then delete it), memory/MEMORY.md and memory/USER.md - and only the missing ones: an existing file is never overwritten, `--force` is the documented exception. `termcrab bootstrap` shows the set and what is missing, the doctor reports it with the one-line fix, and the whole set travels in a backup. Pinned by test/tier2v.test.ts (6 cases, including a real first turn from an empty directory with no setup command)',
  { file: 'src/core/bootstrap.ts', pattern: 'export function runBootstrap', expect: 'present' }, 0);

// ------------------------------------------------------------------ 5. tools
check('tools', 'Shell execution', 'exec with policy + approvals', 'WORKING',
  'src/agent/exec-guard.ts is the guard around `exec`: a short catastrophe list (rm -rf /, mkfs, dd onto a device, fork bomb, chmod -R 777 /, reboot, curl|sh) refuses with one sentence and never spawns, owner patterns are added on top via agent.execDenyPatterns, a real timeout kills the process and reports [killed after Ns] with whatever it printed, output is capped and the cap is stated, and agent.execTimeoutSec sets the default. agent.allowExec still gates the whole tool (off by default) and the same tools can require a human yes/no through the approval queue (22.3). test/tier2k.test.ts 22.1',
  { file: 'src/agent/exec-guard.ts', pattern: 'export async function runCommand', expect: 'present' }, 0);
check('tools', 'File operations', 'root-bounded fs-safe tools', 'WORKING',
  'read_file/write_file/list_dir with allowed roots (tools.ts:22,97), plus the inbox the agent can browse: inbox_list / inbox_read answer from the arrival index and the saved sidecar with the same readers the intake uses, and refuse a name that contains a path (17.1–17.4, src/channels/inbox.ts)', { pattern: 'inbox_read', expect: 'present' }, 0);
check('tools', 'Web fetch + search', 'fetch, search providers, link understanding', 'WORKING',
  'web_fetch (tools.ts) + web_search (toolbox.ts)', { pattern: 'web_search', expect: 'present' }, 0);
check('tools', 'Browser automation', 'CDP + Playwright + OAuth flows', 'WORKING',
  'the browser tool used to be a stub that called HTTP endpoints CDP does not have, so it either answered requires WebSocket CDP or lied; it is now a real client in src/agent/cdp.ts: a WebSocket session with id-matched replies and event waiters, Page.enable + Page.navigate + waiting for Page.loadEventFired, Runtime.evaluate for text and for click/fill (the native setter plus input/change so React and Vue state updates, and a real Input.dispatchKeyEvent Enter when submit is asked for), Emulation.setDeviceMetricsOverride + Page.captureScreenshot writing an actual PNG under workspace/browser/, and the HTTP side (/json/version, /json/list) for status and tabs. No dependency: Node 22+ global WebSocket, and an older Node gets one sentence saying so. The browser is the one the owner already has (Chrome/Chromium started with --remote-debugging-port), because a bundled Playwright + Chromium is hundreds of megabytes on a phone install; `termcrab browser [status|open|text|shot]` uses the same client so a person can check it first, and `allowBrowser` stays off until it is turned on. Proof: test/tier2z.test.ts stands up a real WebSocket server (handshake + frame codec) that plays a browser, and asserts the wire path (method order, the selector passed as data, keyDown/keyUp, a PNG signature on disk, protocol errors, the deadline) plus the tool and the CLI against it; a live Chrome is a test that skips when this machine has none, as the sandbox does. Limits stated: no OAuth consent flow, no password typing, no downloading, and Android Chrome cannot be driven this way (CDP_HOST + adb forward is the documented path)',
  { file: 'src/agent/cdp.ts', pattern: 'export class CdpBrowser', expect: 'present' }, 0);
check('tools', 'Sandboxed code execution', 'QuickJS code-mode with host bindings', 'WORKING',
  'Two layers now. `code_exec` runs JavaScript in a Node vm with no require, no filesystem and no network binding, with a wall-clock timeout and a capped result. `exec` runs inside the real sandbox above (bubblewrap/proot) when the device has one: read-only root, one writable workspace, private /tmp, no network by default, and the transcript records which mode ran. Shell commands shell out through argv arrays, never string interpolation. OpenClaw\'s QuickJS code-mode with typed host bindings is broader as a *language* environment; ours is two engines with a stated boundary each',
  { file: 'src/agent/sandbox.ts', pattern: 'export function sandboxFor', expect: 'present' }, 0);
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
  'the prompt carries the index only — one line per skill, name and description — and the body arrives when the model asks for it: load_skill <name> (src/agent/tools.ts) reads the skill through the same allow-list-aware loader the index is built from, so a skill the config hides cannot be read by naming it. Wrong name lists what does exist, capped so a big library cannot flood a turn, and a capitalised name still resolves (the loader stays case-sensitive; the tool does not need to be). test/skills.test.ts loads a bundled skill through the tool and pins both the failure sentence and the case-insensitive read; test/loop.test.ts pins the path the loop uses.',
  { file: 'src/agent/tools.ts', pattern: "name: 'load_skill'", expect: 'present' }, 0);
check('skills', 'Bundled skill library', '49 bundled + 13k ClawHub', 'WORKING',
  'fifteen skills ship in the repo, and each one is written for this device rather than for a plugin store: shell-safety, chat-replies, memory-keeping, reminders, daily-briefing, evening-review, file-organisation, backup-habits, secrets-hygiene, doctor-first, git-habits, phone-battery, voice, termux-api, web-research. Two rules keep the library from rotting: test/skills.test.ts pins the list of fifteen (adding or deleting one without updating the test fails the suite), and it reads every `termcrab <command>` line in every skill and asserts the command exists in src/cli.ts plus the flags the skills lean on (cron add --deliver, sessions purge --older-than, subagents scratch --prune, auth add --provider/--key), so a skill can never tell the model to run something that is gone. Limits stated: fifteen is fewer than their forty-nine, and there is no marketplace — a registry is a separate row and stays out of scope for a three-surface phone agent; the trade is that every bundled skill here is short, specific and checked against the live CLI.',
  { scope: 'skills', pattern: '\nname: ', expect: 'present', min: 15 }, 0);
check('skills', 'Skill precedence + overrides', 'multi-root precedence, allowlists', 'WORKING',
  'src/skills/loader.ts: roots read left to right, later wins — a user skill replaces a bundled one in list(), get() and the prompt index; skills.allow is an allow-list (empty = all) wired from config in server.ts and the CLI; documented in docs/SKILLS.md and pinned by test/tier0.test.ts 10.5',
  { pattern: 'permitted', expect: 'present' }, 0);
check('skills', 'Agent-authored skills', 'skill-workshop review flow', 'WORKING',
  'the agent can write a skill for itself but cannot install one: skill_workshop action=propose writes skills/_proposals/<name>/ (SKILL.md + PROPOSAL.json with the description, the agent\'s own reason, the session it came from and the time), and the loader skips every `_`- or `.`-prefixed folder, so a proposal can never reach the prompt — including a half-written one. The decision is a person\'s, in the surface they are already using: `termcrab skills proposals list|show|approve|reject` and POST /api/skills/proposals (GET lists). Approve moves the folder to skills/<name>/ and stamps decided/decidedAt on the record; a live skill of the same name is not replaced unless the decision is explicitly made (--force, force:true), and the list warns before that. Reject keeps the text and the reason in skills/_rejected/<name>/REJECTED.md, so "we decided against this" is distinguishable from "never seen". test/tier2x.test.ts 33.3 covers the loader skip, the revision-replaces-earlier behavior, the live-collision refusal, the rejection record, the CLI walk (list → show → approve) and the panel API',
  { file: 'src/skills/proposals.ts', pattern: 'export function proposeSkill', expect: 'present' }, 0);
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
  'src/channels/telegram.ts long-poll over src/channels/api.ts (getMe/getUpdates/sendMessage/sendChatAction/getFile/downloadFile, zero dependencies - global fetch), allowlist (an empty one keeps the channel OFF), chunking, typing indicator, outbox retry, group mention policy with ambient room history, per-user/per-chat scoping, timeouts and abort. Two levels of proof: test/telegram.test.ts (18 cases) + test/tier3h.test.ts drive the client against a real local HTTP stub, and `npm run smoke:telegram` (36.2) drives the same client against the real Bot API in one command - sendMessage, then read the owner reply back - printing `skipped` and exiting 0 with no token, never printing the token itself (errors included); TCRAB_TELEGRAM_API points it at a self-hosted Bot API server. Not implemented: topics/forum threading and grammY (we use the raw Bot API on purpose: grammY would be a runtime dependency on a phone)',
  { pattern: /getUpdates|sendMessage/, expect: 'present' }, 0);
check('channels', 'A live run leaves a record (37.4)', 'n/a — prose and screenshots', 'BETTER',
  'npm run smoke:telegram -- --record appends one line to docs/openclaw/data/telegram-runs.jsonl: what was sent, what came back, how long the reply took, the bot, the chat, and a fingerprint of the token (sha256(api|token), first 8 hex) - never the token, which is what makes the file safe to commit. A skipped run records nothing; a run with no reply is recorded as `sent`, not dressed up as `ok`; the file keeps the newest 20. The panel Work page reads it (GET /api/telegram-runs, token-gated) with a timestamp. Mechanism tested end to end against the same fake Bot API the suite uses (test/tier3i.test.ts 37.4)',
  { file: 'src/channels/telegram-runs.ts', pattern: 'export function recordTelegramRun', expect: 'present' }, 0);
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
check('channels', 'Group / ambient events', 'history reads, mention policy', 'WORKING',
  'two halves, both real. The mention policy (15.3): in a group the bot answers only when it is mentioned or replied to, the mention is stripped before the agent sees the text, and channels.telegram.groupPolicy="all" opts into every message. The ambient history (34.3): every group message a channel adapter receives is now written down whether or not it was addressed — state/rooms/<channel>-<room>.jsonl, one JSON line per message (time, who, text, whether it ran a turn), bounded to the last 200 messages and 64 KB per room and trimmed oldest-first, torn lines skipped, local only. The agent reads it with the room_history tool (no arguments means this room, because the gateway hands the turn its channel and chat id), a person reads it with /history [n] or `termcrab rooms [list|show|clear]`, and roomInfo() reports what arrived since the bot was last addressed so "what did I miss?" has an answer. Limits stated: this is what the bot saw, not what was said — the Bot API cannot fetch messages the bot never received, so with group privacy mode on only mentions land in the log; per-room routing rules stay out of scope (the three surfaces are Telegram, the panel and the terminal, and agents.routes already picks the agent). test/tier3a.test.ts 34.3 (the bounded store incl. a torn tail, the adapter recording an unanswered message and marking an answered one, policy all, the tool with and without room context, the CLI round trip, the /history wiring, the docs)',
  { pattern: /recordRoomMessage/, expect: 'present' }, 0);
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
check('automation', 'Cron scheduler', 'schedules, payloads, delivery, webhooks', 'WORKING',
  'five-field expressions with @macros (src/cron/parser.ts), a JSON store, and a 20s tick that grew the parts a phone needs (34.4): a job that became due while the device was asleep is caught up **once** on the next tick — the minutes missed inside a 24h window are counted and written into its history, never replayed one by one, and the first tick of a fresh state never bursts — a job still running is skipped as `skipped-overlap` instead of piling up on itself, a low-battery skip is recorded as `skipped-battery`, and every attempt lands in the job record (`lastRun`, `lastResult`, `lastError`, a consecutive-failure count that a success clears, the last five runs with durations). Failures are shown, never used to disable a job silently. Delivery and agent selection were 33.4 (`--deliver telegram|panel|none`, `--agent`, now also on POST /api/crons with validation before anything is written). Surfaces: `cron ls` prints the last result and the failure streak, `cron show <id>` prints one job in full. Limits stated: no payload templating language, no per-job timeout (a run is bounded by the model timeout), and inbound webhooks stay their own row. test/tier3b.test.ts 34.4',
  { file: 'src/cron/store.ts', pattern: 'export function findDue', expect: 'present' }, 0);
check('automation', 'Heartbeat / proactive tick', '30-min heartbeat + HEARTBEAT.md', 'WORKING',
  'src/agent/heartbeat.ts + power-aware gating — TermCrab is arguably better here', { pattern: 'heartbeat', expect: 'present' }, 0);
check('automation', 'Event triggers / watchers', 'condition watchers, stream sources', 'WORKING',
  'src/gateway/triggers.ts + config: a hook that names events (`on: ["run.failed"]`, `device.*`, `*`) is woken by what happens inside the gateway — run.failed, run.start, run.end, session.reset, device.paired, file.received, file.changed, cron.finished — and the turn is queued exactly like a webhook\'s, in session hook:<id>, with a self-loop guard and a 60s cooldown per hook. config.watchers adds file/folder watchers (fs.watch with a per-watcher debounce and an optional suffix `match`), so "when a PDF lands in this folder, look at it" works without a rule language. `termcrab events` prints the catalogue, the listeners and the watched paths. Not attempted: condition polling (battery/disk thresholds as events) and stream sources',
  { file: 'src/gateway/triggers.ts', pattern: 'export function watcherMatches', expect: 'present' }, 0);
check('automation', 'Standing orders', 'persistent programs with execute-verify-report', 'WORKING',
  'src/agent/intents.ts (state/intents.json) stores them; the system prompt injects a `# Standing orders` block into every turn with the precedence spelled out (they outrank memory and workspace notes; they never override the safety rules). Surfaces: `termcrab orders [list|add|remove]`, the chat command `/orders [add|remove]`, and the agent\'s own `intent` tool — all one store. The run half is cron (schedule) + event triggers on run.end/run.failed (verify + report), so "every morning brief me, and tell me if it breaks" is expressible today. What is not attempted: a typed program object with phases and approval boundaries. test/tier2n.test.ts covers the CLI round-trip, the prompt block and the precedence line',
  { file: 'src/agent/intents.ts', pattern: 'export function addIntent', expect: 'present' }, 0);
check('automation', 'Task board', 'tasks, taskflow, workboard', 'WORKING',
  'one board for everything in flight (34.4): src/agent/board.ts merges four sources that each had a view of their own — live turns (run-health verdicts with a suggested action), subagent tasks (running/done/error/timeout, with elapsed time or an output excerpt), cron jobs (next run, last result, failure streak) and the agents suggestion cards — into one list with one status vocabulary (running, queued, scheduling, failed, done, suggested) ordered by urgency, and every card names where it came from. It reads only: the board cannot start, cancel or schedule anything. Surfaces: `termcrab board [--limit n] [--json]` and `GET /api/board`, the same object. Limits stated: no dependency graph between cards and no drag-to-reorder (a phone board is a status list, not a project planner), and the suggestion dismiss path stays `/api/tasks`. test/tier3b.test.ts 34.4',
  { file: 'src/agent/board.ts', pattern: 'export function buildBoard', expect: 'present' }, 0);
check('automation', 'Scheduled delivery to channels', 'deliver cron output to a chat', 'WORKING',
  'a job now says where its result goes: cron add --deliver telegram|panel|none (unset = every configured surface, which is what happened before), `cron ls` shows it and the choice is stored in crons.json. The scheduler does not know which surfaces exist — it decides when and hands the target to the gateway, which sends to the paired Telegram chat, emits cron-output on the bus for the panel, or does neither; deliver:none still records the run, the transcript and a daily-log line saying it went nowhere. The same tick resolves which agent runs the job (job.agent, then agents.routes.cron, then main) and logs the reason when a route names an agent that does not exist. test/tier2x.test.ts 33.4 drives all five cases through cronTick with a spy deliver and asserts the transcripts (helper:cron:<id> vs cron:<id>) and the CLI round-trip, including the refusal of a nonsense target and an unknown agent',
  { file: 'src/cron/scheduler.ts', pattern: 'CronTarget', expect: 'present' }, 0);
check('automation', 'Gmail / IMAP watchers', 'PubSub + IMAP integrations', 'ABSENT',
  'no mail integration', { pattern: 'imap|gmail', expect: 'absent' }, 5, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });

// -------------------------------------------------------------- 11. surfaces
check('surfaces', 'Docs page freshness in the panel (37.2)', 'docs site as a static afterthought', 'BETTER',
  'The Work page says which release the offline docs page describes, how long ago it was built (just now / 12 min ago / 3 h ago), and whether a doc has been edited since; a stale note turns red and offers a rebuild button that POSTs /api/docs (forced build + a per-release copy). GET /api/docs reads the page build stamp and mtimes and never builds, so a panel refresh stays cheap; docsSiteFreshness() also watches the release, so a page from an older release is stale even with untouched files. Pinned by test/tier3i.test.ts 37.2 (unit + a real gateway)',
  { file: 'ui/index.html', pattern: 'docsRebuild', expect: 'present' }, 0);
check('surfaces', 'The docs page has a budget (39.3)', 'n/a', 'BETTER',
  'The offline docs page is 60 documents rendered into one HTML file by the panel own markdown renderer, and it now has two ceilings: docsMs 1 500 (a rebuild — `termcrab docs rebuild` or the panel rebuild button — measured at ~49 ms) and docsKb 4 000 (the file a phone has to hold, measured at 2 754 KB). docs/PERFORMANCE.md points at what keeps it small (docs/openclaw/data is excluded: 47 MB of raw crawl) and the README table carries both rows. Pinned by test/tier3j.test.ts 39.3 (the ceilings, a real build, the bench, the doc, the CLI table)',
  { file: 'src/core/perf.ts', pattern: 'docsKb', expect: 'present' }, 0);
check('channels', 'The Telegram loop has a budget (39.4)', 'n/a', 'BETTER',
  'Three numbers only a person using the device feels, measured in a throwaway TCRAB_HOME and against a local Bot API stub: roomWriteMs (~180 ms, 200 group messages into one room at its cap — every append pays the read-and-trim that keeps the log bounded to 200 messages / 64 KB), outboxDrainMs (~257 ms, 200 owed messages queued, claimed, acked and swept — a phone that was offline has to flush without a stall) and telegramPollMs (~63 ms, 50 poll cycles of 50 updates through the real TelegramApi). Ceilings 1500/1500/2000 ms. Pinned by test/tier3j.test.ts 39.4 (the ceilings, the room bound, the real outbox drain, the bench, the CLI table)',
  { file: 'src/mobile/outbox.ts', pattern: 'export function outboxSweep', expect: 'present' }, 0);
check('surfaces', 'The budget on the panel (38.2)', 'n/a', 'BETTER',
  'GET /api/perf returns perfStatus() — age in words, measured/total, the worst metric (furthest along its ceiling, with the percentage), the over list, the machine — read from state/perf.json that `termcrab perf` wrote. The route never measures anything (a measurement boots a gateway and runs a turn, and the Work page asks on every refresh); with nothing measured yet it says "never measured" instead of showing zeros. humanAge has one implementation (src/core/format.ts) shared with the docs freshness. Pinned by test/tier3i.test.ts 38.2 (the never-measured case, a real gateway, a snapshot read back as "1 min ago", the panel markup)',
  { file: 'ui/index.html', pattern: 'perfNote', expect: 'present' }, 0);
check('surfaces', 'Docs freshness on the terminal (38.4)', 'n/a', 'BETTER',
  '`termcrab docs status [--json]` prints the release the offline docs page describes, how long ago it was built, whether a doc changed since and which per-release copies exist — from the same docsSiteFreshness() the panel reads, so the terminal, the panel and the tests cannot disagree. Exit 0 either way: a stale page is a fact, not an error, and the sentence names the fix (`termcrab docs rebuild`). Pinned by test/tier3i.test.ts 38.4 (never built, built, an edited doc reported as stale without failing, --json fields, the help entry and docs/CLI.md)',
  { file: 'src/cli.ts', pattern: "sub === 'status'", expect: 'present' }, 0);
check('surfaces', 'Web control UI', 'React+Vite dashboard, rebuilt in 2.0', 'WORKING',
  'one file, deliberately (34.7): ui/index.html is markup, styles and JavaScript with **no build step, no bundler and no node_modules**, because the panel has to run on the same phone as the gateway and a React+Vite dashboard would put a toolchain and a build artifact inside an install whose promise is zero runtime dependencies. Eleven screens now — Chat, Status, **Board** (new), Providers, Models, Memory, Tools, Logs, Debug, Work and Settings — all reading the same API the CLI does with the same token, and the Board screen is the merged view from 34.4–34.6: `GET /api/board` (the same object `termcrab board` prints) plus `/api/devices` (with a revoke button), `/api/runs/health`, `/api/subagents`, `/api/disk`, `/api/presence` and `/api/skills/proposals`, each rendered as a card that shows a note only when there is one. It only reads; the single write on the screen is revoking a device, behind a button. **How it is tested without a browser:** the panel\'s JavaScript is extracted from the real file and executed in Node (`test/tier3e.test.ts` runs the Board screen\'s pure functions against the payload shapes the API returns, then stands up a **real gateway** and asserts the seven calls answer with the fields the screen reads), the chat screen\'s thinking drawer/streaming/approvals are pinned the same way (test/thinking.test.ts, test/markdown.test.ts), and a **contract scan** fails the suite when a `/api/...` path in the panel is not a route in src/gateway/server.ts — a renamed route breaks the suite, not the phone. Limits stated: no component model and no virtual DOM (screens set innerHTML from JSON, so the logic worth testing lives in small pure functions), no build step or source maps, and it is a page for a phone browser rather than a native app — no theming switch, no offline shell. docs/PANEL.md lists the screens, the endpoints and exactly what is not there.',
  { file: 'ui/index.html', pattern: 'id="view-board"', expect: 'present' }, 0);
check('surfaces', 'Full-screen TUI', 'openclaw tui / chat / terminal', 'WORKING',
  'src/tui/*: `termcrab tui` drives a real screen — the alternate buffer with bracketed paste, entered and left on every exit path (quit, Ctrl-C, EOF, a crash in a turn), raw keys decoded with partial escape sequences and split code points kept for the next read, and a frame that is exactly rows x cols cells (wide characters counted as two). The transcript streams deltas as they arrive, a tool call is one line with its duration, thinking is dimmed, the input box edits with history (Up/Down), Ctrl-U/K/A/E, backspace and a cursor that slides instead of overflowing; /sessions opens an arrow-select picker over every conversation on disk, /new, /status, /history, /dir and /help answer in the transcript, and a resize redraws to the new size. When a gateway is running the screen attaches to the same session (28.2) so a turn from the panel or the phone appears here while it happens, with the surface it came from; opening the screen before the gateway is up retries instead of failing. A pipe or a file is told to use the line REPL rather than drawn into. Pinned by test/tier2r.test.ts 29.1-29.3',
  { file: 'src/tui/app.ts', pattern: 'setRawMode', expect: 'present', min: 2 }, 0);
check('surfaces', 'Interactive REPL', 'TUI --local', 'WORKING',
  'Two ways into the same agent from a terminal: `termcrab agent` is the readline REPL (one-shot message, /as <name>, /agents, /new, exit) and `termcrab tui` is the full screen above — both talk in the rolling main session by default, both honour --as and --tier local, and the REPL prints events as they happen. OpenClaw\'s TUI is richer still in layout (side panels, per-pane scrolling, mouse); ours is one screen that fits a phone',
  { file: 'src/cli.ts', pattern: 'readline', expect: 'present' }, 0);
check('surfaces', 'CLI command coverage', '~90 commands, 101 doc pages', 'WORKING',
  'the surface is measured now, not estimated (34.6): `switch (cmd)` in src/cli.ts can dispatch 52 commands, and the suite is recorded running **44 of them end-to-end** through the built binary — src/cli.ts appends every dispatched command to `$TCRAB_CLI_COVERAGE`, `npm run test:cli` runs the whole suite with that variable set, and docs/CLI-COVERAGE.md is generated from the recording (per-command line number and how many times it ran). The 8 that a test cannot sensibly drive (tui needs a TTY, wake needs termux-api, import needs a Telegram export, pair/devices need a second device, supervisor is a loop, boot is Termux-only, onboard is interactive, dream is a long pass) are listed **with a reason and the test that covers the behaviour instead**; `node scripts/cli-coverage.mjs --check` fails when a command is added that is neither run nor listed, and also when a listed command becomes run, so the list cannot rot in either direction. Limits stated: still fewer words than their ~90 (52 commands, and no 101 doc pages — docs/CLI.md is one table plus `termcrab help <command>`, while test/skills.test.ts greps every `termcrab <cmd>` inside every bundled skill against src/cli.ts so documentation cannot name a command that does not exist). test/tier3d.test.ts 34.6',
  { file: 'docs/CLI-COVERAGE.md', pattern: 'measured, not claimed', expect: 'present' }, 0);
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
check('security', 'Sandboxing', 'sandbox modes, workspace roots, install policy', 'WORKING',
  'src/agent/sandbox.ts fits a real isolation boundary around every shell command: bubblewrap when the device has it (read-only root, the workspace as the only writable path plus agent.sandboxWrites, a private /tmp and a throwaway HOME so ~/.ssh is not writable, --unshare-pid/ipc/uts, --die-with-parent, and no network unless agent.sandboxNetwork says otherwise), proot where unprivileged namespaces are blocked (userspace chroot, and it says plainly that proot cannot drop the network), and an honest sentence naming the package to install when there is neither. agent.sandbox picks the policy: auto (default) runs and writes [sandbox] ran without a sandbox into the transcript, require refuses with the fix rather than running with full access, off is the pre-30 behaviour and is recorded per run. The argv is built as an array and asserted flag by flag, never a shell string; `termcrab doctor` reports the mode, GET /api/status carries it and the panel shows it. Container images, per-tool policies and a filesystem-exfiltration guard beyond the writable-path fence are not implemented. Pinned by test/tier2s.test.ts 30.1-30.3',
  { file: 'src/agent/sandbox.ts', pattern: 'export function sandboxPlan', expect: 'present' }, 0);
check('security', 'Secrets management', 'vault, SecretRef, 1Password, audit', 'WORKING',
  'keys live outside the config and the agent never sees them printed: named profiles in state/auth-profiles.json (mode 0600) plus state/secrets.json for tool secrets, read on request and never returned whole (`termcrab auth list` shows providers and whether a key is set, never the value), and every set/read appended to state/secrets-audit.log. 34.5 added the audit that makes the claim checkable: `termcrab auth audit` walks config.json, memory/ and state/ for key-shaped strings (OpenAI/GitHub/Slack/Google/AWS patterns and private-key blocks), reports where each one is with a masked preview (four characters at each end — the full value never reaches the report), knows the two files that are supposed to hold credentials and checks their mode instead of their content, says plainly which key is expected where (the Telegram bot token belongs in the config, and the fix is keeping the file 0600), and points at the exact command that moves a model key into a profile. Limits stated: no external vault and no SecretRef indirection into arbitrary tools — a key on a phone lives at 0600 on that phone, which is the property this project can actually guarantee; the threat the audit aims at is a key in a chat log, a prompt or a backup, not a compromised device. test/tier3c.test.ts 34.5',
  { file: 'src/agent/security.ts', pattern: 'export function auditSecrets', expect: 'present' }, 0);
check('security', 'Skill supply chain', 'signed manifests after ClawHavoc', 'BETTER',
  'no registry exists to poison; skills are local files', { pattern: 'SKILL.md', expect: 'present' }, 0);
check('security', 'Dependency surface', 'large dependency tree, 1,142 advisories in 5 months', 'BETTER',
  'zero runtime dependencies — package.json has no "dependencies" key at all',
  { file: 'package.json', pattern: /^\s*"dependencies"/m, expect: 'absent' }, 0);
check('security', 'Security audits / doctor', 'openclaw security audit, policy CLI', 'WORKING',
  'the policy half is real now (34.5): `termcrab security [audit] [--json]` derives findings from the live config object — exec policy (off = ok; on with agent.sandbox off = fail; require with no sandbox binary = fail), the approval gate (nothing gated while exec is open = warn, and the detail names which dangerous tools are not gated), the bind address (loopback = ok; off-loopback = warn, plus a fail when the token is short, a guessable word or one repeated character, with the exact fix line), webhook doors without an x-hook-token, the browser tool when enabled, and the mode of config.json. Every finding carries the fix, the worst one sorts first and a fail exits 1, so it works as a gate in a script. The doctor gained a `security` line that runs the same audit and names the command. Limits stated: the checks are about policy and file placement, not about a running attacker — no port scan, no TLS check (there is no built-in TLS; docs/SECURITY.md says the tunnel is the answer), and no per-route scope model. test/tier3c.test.ts 34.5',
  { file: 'src/agent/security.ts', pattern: 'export function securityAudit', expect: 'present' }, 0);
check('security', 'Rate limiting / loop protection', 'bot-loop protection, caps', 'WORKING',
  'src/gateway/ratelimit.ts: a token bucket per key (a device, the master token, or a peer address; per channel chat for messages) with `gateway.rateLimit = {perMinute, burst}` (default 60/10). A full bucket answers immediately — 429 {error, retryAfterMs, limit} + a `retry-after` header on the API, one sentence back into the chat for channels — instead of queueing more turns, and the limiter clamps nonsense config rather than blocking everything. test/tier2i.test.ts 20.3/20.4',
  { file: 'src/gateway/ratelimit.ts', pattern: 'export class RateLimiter', expect: 'present' }, 0);

// --------------------------------------------------------- 13. storage/state
check('storage', 'State layout', 'config JSON + Markdown brain + SQLite state + JSONL', 'WORKING',
  'src/core/paths.ts is the single layout and everything derives from TCRAB_HOME: config.json, workspace/ (SOUL.md, USER.md, skills/, inbox/, agents/), sessions/<id>.jsonl (+ .archive.jsonl + .digest.md), state/ (crons, tasks, intents, approvals, conversations, tracing, outbox), logs/termcrab.jsonl, memory/ (facts.md + index). File-based on purpose (zero deps, greppable on a phone) where they use SQLite + Markdown; documented in docs/ARCHITECTURE.md and pinned by the paths tests',
  { pattern: 'TCRAB_HOME', expect: 'present' }, 0);
check('storage', 'Database + migrations', 'SQLite with schema migrations', 'WORKING',
  'No database, on purpose — the state stays files a person can read, grep and copy. src/core/schema.ts gives the same contract a migration tool gives, without SQLite: state/schema.json carries {version, updatedAt, applied[], release}; SCHEMA_VERSION is bumped when a step is added; three shipped steps carry a real home forward (snake_case config keys renamed in place with the old key deleted, second-precision session timestamps converted to milliseconds, workspace/outbox.json moved to state/outbox.json); every command migrates before it reads (announced on stderr, so --json stdout stays machine-readable) and a fresh home is *adopted* at the current version rather than pretend-migrated. Safety rules: a step either completes or the version stays where it was (stamps are written through a temp file + rename, a failure is reported and retried next start), a non-fresh home is snapshotted into state/backups/<stamp>/ first, --dry-run writes nothing, and a home written by a *newer* release is refused with a sentence instead of being half-understood. `termcrab schema [--json] [--dry-run]` prints every step and whether it ran. Pinned by test/tier2t.test.ts 31.1 (including a step that throws on purpose)',
  { file: 'src/core/schema.ts', pattern: 'export function runMigrations', expect: 'present' }, 0);
check('storage', 'Backup / restore', 'openclaw backup', 'WORKING',
  '`termcrab backup [file.tar]` writes one plain tar of the parts that matter (config.json, workspace/, sessions/, memory/, skills/, state/, logs/, config-backups/) with a manifest.json inside it: format tag, creation time, release, the schema version of the content, file and byte counts. Plain tar on purpose — no dependency, and `tar -xOf home.tar manifest.json` answers what it is without this program. `termcrab restore <file.tar> [--dry-run] [--force]` verifies the manifest first, refuses an archive from a newer release unless forced, and **never overwrites in place**: files that already exist are moved into state/restore-<stamp>/ before anything is written, then the restored home is carried forward to the current schema (31.1). Junk answers a sentence (not a stack trace): a non-tar file, a tar with no manifest, a truncated archive. Pid/lock/tmp files and previous snapshots are skipped, so a backup of a backup cannot grow without bound. Pinned by test/tier2t.test.ts 31.2 (a home round-trips through the archive; the same round trip through the real CLI)',
  { file: 'src/core/backup.ts', pattern: 'export function restoreBackup', expect: 'present' }, 0);
check('storage', 'Atomic updates + rollback', 'guarded upgrades, versioned state', 'WORKING',
  '`termcrab update` checks and never auto-applies; `update --apply` is now reversible: it snapshots the build into state/builds/<release>-<stamp>/ (dist/ without the test build, ui/, skills/, package.json), pulls + installs + builds, then verifies by starting the new build (the CLI must answer --version and read its own state schema — a build that compiles but cannot boot is exactly what rollback is for), and on failure copies the snapshot back and reports how many files it put back. `update --rollback` restores the newest snapshot by hand and the panel update button takes the same verified path. The snapshot is honest: a copy that fails is reported and returns nothing rather than pretending to be a rollback point. Schema versioning (31.1) versions the state too, and a newer state refuses to be half-understood. Pinned by test/tier2t.test.ts 31.3',
  { file: 'src/core/updater.ts', pattern: 'export async function applyVerified', expect: 'present' }, 0);
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
check('mobile', 'First run timed and cut (37.3)', 'n/a', 'BETTER',
  'The launcher compiles the checkout on first run. Two things changed: it now rebuilds when src/ or tsconfig.json is newer than the built entry (before, only a missing dist/ triggered a build, so `git pull` then `./termcrab` ran yesterday code, quietly), and the compile is incremental (tsconfig writes dist/.tsbuildinfo). Measured: cold 5.05 s, rebuild after touching a source 1.57 s on the dev box - the same ~3.4x ratio a phone sees. It prints `built in NNNN ms`, so the wait is never silent, and both numbers sit under ceilings in scripts/bench.mjs (firstRunMs 30000, rebuildMs 8000) enforced by test/tier3i.test.ts',
  { file: 'termcrab', pattern: 'newer than the build', expect: 'present' }, 0);
check('mobile', 'Termux doctor', 'n/a on Android (unsupported)', 'BETTER',
  'src/mobile/doctor.ts checks build source, wake lock, battery optimisation, proot leftovers',
  { pattern: 'doctor', expect: 'present' }, 1);
check('mobile', 'Voice STT/TTS', 'whisper + TTS providers', 'WORKING',
  'both directions are proven against real executables of the engines own shape, not asserted: test/tier2y.test.ts puts a fake termux-speech-to-text / termux-tts-speak / espeak-ng / whisper-cli first on PATH and runs the whole path. Speech out: speak() walks one candidate chain (termux-tts-speak, espeak-ng, espeak, spd-say, say), passes the trimmed text as a single argument, names the backend it used, and returns one sentence naming what to install when there is none; speakStream resolves the same chain (it used to hardcode espeak, which fails on macOS), chunks long text at sentence boundaries (<=200 chars) and calls the backend once per chunk, in order, reporting stt:chunk events for the panel; /api/say and /api/say/stream serve both, and `termcrab say <text> --json` is the same path (say used to swallow the words --json). Speech in: listenOnce takes the first recognized phrase, settles at the deadline instead of hanging, and continuous mode (POST /api/listen/start, /api/listen/stop) emits each phrase as it is recognized and restarts after a 250 ms pause so a silent recognizer cannot spin the battery down. Limits stated: the recognizer is the platform one (Termux:API on Android) so dictation is Android-only, and a machine with no TTS backend gets the install sentence, not a fallback voice',
  { file: 'src/mobile/tts.ts', pattern: 'export function resolveTtsSync', expect: 'present' }, 0);
check('mobile', 'Transcription', 'realtime transcription service', 'WORKING',
  'offline transcription of any audio file through whisper.cpp: findWhisperBin looks on PATH (whisper-cli, whisper) then in the usual checkout builds, findWhisperModel prefers tiny > base > small > large and honours --model and WHISPER_MODEL, transcribeFile spawns the documented argv (-m <model> -f <file> -np [-l lang]), never throws, and answers a missing engine or model with the exact install/download sentence. Voice notes arriving on a channel are transcribed into the message the agent answers, capped at 5 MB so a long recording is not chewed up on the phone (src/channels/intake.ts), and `termcrab transcribe <file> --json` is the same path on the command line with an envelope (it used to print a friendly line instead). Realtime here means phrase-by-phrase: continuous listening emits each phrase as the recognizer returns it (stt:result over SSE) and restarts immediately after it; what is not attempted is partial-hypothesis streaming ASR (words appearing while you are still speaking). test/tier2y.test.ts drives a fake whisper-cli end to end (happy path, argv, CLI JSON, the transcript reaching the agent prompt, missing model, engine failure, deadline)',
  { pattern: 'transcribeFile', expect: 'present' }, 0);
check('mobile', 'Native GUI / foreground service', 'desktop apps + node apps', 'ABSENT',
  'no companion app; a persistent notification is the closest', { pattern: 'foreground service', expect: 'absent' }, 20, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });

// ------------------------------------------------------------ 15. ops / docs
check('ops', 'Install is download-only (no silent build)', 'n/a', 'WORKING',
  'package.json has no `prepare`/`postinstall`; the TypeScript compile is an explicit, visible `npm run build` (measured: 0.5s install, 3.0s build vs 4.5s combined)',
  { file: 'package.json', pattern: /"(prepare|postinstall)"/, expect: 'absent' }, 0, 'core');
check('ops', 'Installer', 'curl install.sh + Docker + Nix + Fly', 'WORKING',
  'install.sh is the one command on Termux, Linux and macOS: it installs Node via pkg when asked on Termux, clones or upgrades an existing checkout (reset to the requested ref, user data in the home is untouched), installs the dev packages, builds, puts `termcrab` on PATH and *proves the command runs* before claiming success. `install.sh --check` answers "what would this do on this machine" and writes nothing (the CI job runs it, and the test asserts it creates no files), and a Node that is too old fails with a sentence before anything is touched. The packaged path is tested end to end too: `npm pack` the tarball, install it in a clean directory, run --version and bootstrap. Docker/Nix/Fly are out of scope (see the container row): a phone agent is not a server fleet',
  { paths: ['install.sh'], expect: 'present' }, 0);
check('ops', 'Container / server deploy', 'Docker, docker-compose, Fly, Nix, systemd', 'ABSENT',
  'Termux/Node host only', { pattern: 'docker|Dockerfile', expect: 'absent' }, 3, { lane: 'later', scope: 'out', why: 'not part of a three-surface phone agent (user decision 2026-10-03: telegram + web + terminal). No plugin ecosystem, no server-fleet deployment, no email surface and no native app are planned' });
check('ops', 'Service install', 'openclaw gateway install (systemd/launchd)', 'WORKING',
  '`termcrab service install|status|uninstall` writes the right thing for the device: a **systemd user unit** on Linux (~/.config/systemd/user/termcrab.service, no root, ExecStart the CLI gateway subcommand, Restart=on-failure, WantedBy=default.target), a **launchd agent** on macOS, and on Android — which has no systemd — the Termux:Boot script that already existed (`termcrab boot`). `--dry-run` prints the path, the exact file and the commands that enable it; the unit content is asserted byte-for-byte in the test through a TCRAB_SERVICE_DIR override, uninstall never touches user data, and the agent can still be run in the foreground or under `termcrab supervisor`',
  { file: 'src/mobile/service.ts', pattern: 'export function installService', expect: 'present' }, 0);
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
check('ops', 'The budget as a command (38.1)', 'benchmarks you have to remember to run', 'BETTER',
  '`termcrab perf [--full] [--json]` runs scripts/bench.mjs — the same measurements the suite gate runs, never a second implementation — prints every number next to its ceiling, writes state/perf.json (numbers + the machine: node/platform/arch/cpus/mem + which ceilings the run did not measure), and exits 1 when anything is over. The ceilings live once, in src/core/perf.ts (PERF_CEILINGS), and bench.mjs imports them from the built file, so the alarm in the suite and the alarm on the phone cannot drift. A checkout without scripts/bench.mjs gets one sentence instead of a stack trace. Pinned by test/tier3i.test.ts 38.1 (envelope + snapshot, human table, a fake bench via TCRAB_PERF_BENCH proving exit 1, the missing-script path)',
  { file: 'src/core/perf.ts', pattern: 'export function measurePerf', expect: 'present' }, 0);
check('ops', 'A suite with a clock (38.3)', 'no timing discipline', 'BETTER',
  'npm run test:time runs the whole suite once with a per-file reporter, records docs/openclaw/data/suite-time.json (wall clock, every file, the five slowest, the budget) and refuses (exit 1) a run over its ceiling (whole run 240 s, no file over 90 s); the slowest files are named in docs/TESTING.md in a generated block, so "the suite got slow" is a failing check rather than a feeling. `--check` reads the record without running anything, which is what test/tier3i.test.ts 38.3 asserts (plus the summariser semantics: nested durations do not double-count, a fabricated over-budget record names both the wall and the file)',
  { file: 'scripts/suite-time.mjs', pattern: 'export const SUITE_BUDGETS', expect: 'present' }, 0);
check('ops', "The owner's two minutes, written down (38.5)", 'a README and hope', 'BETTER',
  'docs/OWNER.md is the short list of things only the person holding the phone can do — the CI push (with the exact four commands and what it closes: the last PARTIAL census row), the live Telegram smoke with --record (and the evidence file with a token fingerprint instead of a token), one real turn through the wizard, and the panel on the phone with the token rule — each with the command, what it should print, and the evidence it leaves. test/tier3i.test.ts 38.5 extracts every `termcrab <command>` on the page and asserts it exists in src/command-help.ts and in `termcrab help`, so the page cannot rot into instructions that no longer run',
  { file: 'docs/OWNER.md', pattern: 'npm run ci:install', expect: 'present' }, 0);
check('ops', 'The budget has a history (39.1)', 'a single number, no memory', 'BETTER',
  'Every `termcrab perf` run appends one line to state/perf-history.jsonl (newest 60, oldest dropped). With two or more runs the command prints the movement and the panel shows it: `coldStartMs ↑ 46% over 4 run(s) (100 ms → 146 ms)`. `↑` means slower or bigger, which for every metric here is worse; a move under 3% reads as flat so jitter is not mistaken for a regression. GET /api/perf carries runs, trend and lastOverAt. TCRAB_PERF_HISTORY points the series elsewhere; a torn line is not a run. Pinned by test/tier3j.test.ts 39.1 (append + bound + torn line, the trend semantics, three real CLI runs, the env override, a real gateway)',
  { file: 'src/core/perf.ts', pattern: 'export function perfTrend', expect: 'present' }, 0);
check('ops', "The panel's own weight has a ceiling (40.1)", 'Control UI is a built web app', 'BETTER',
  'ui/index.html is the whole control panel — one file, inline CSS and JavaScript, no bundler, no CDN, no build step — and it now has two ceilings: panelKb (700 KB, measured 317 KB) so "let us add a framework" cannot be a quiet decision, and panelMs (250 ms, measured ~4 ms) so the shell arrives before any /api call. Both are in FAST_METRICS, so `termcrab perf` and the panel see them; docs/PERFORMANCE.md has a section naming the trips. Pinned by test/tier3k.test.ts 40.1, which serves the file over a real gateway five times, asserts the body is byte-identical to the file, that it contains the Work view, and that there is no <script src> or CDN link',
  { file: 'src/core/perf.ts', pattern: 'panelKb', expect: 'present', min: 2 }, 0);
check('ops', 'The doctor reads the measurement (40.2)', 'a health check with no numbers', 'BETTER',
  '`termcrab doctor` now includes one line about the budget, read from state/perf.json: never measured ("not measured on this home yet" + fix: termcrab perf), aging (info, "measured 33 d ago … this measurement is a month old"), or over (a ⚠️ naming the OVER metrics and pointing at docs/PERFORMANCE.md). The detail carries age, host, the worst metric as a % of its ceiling and how many were skipped. It never measures anything itself — measuring boots a gateway and runs a turn, and a health check has to be cheap. Pinned by test/tier3k.test.ts 40.2 (three states, the text and the JSON envelope)',
  { file: 'src/mobile/doctor.ts', pattern: "id: 'perf'", expect: 'present' }, 0);
check('ops', "The docs page's footer, on every surface (40.3)", 'n/a', 'BETTER',
  'The built offline docs page carries a real footer: the release, the build time in UTC, "60 docs, 317 sections" (the same counts the header claims) and "generated by termcrab docs" — so the copy on the phone says what it is. It survives a rebuild, and `docs status`/the panel report the same release from the same stamp. Pinned by test/tier3k.test.ts 40.3, which rebuilds and re-reads the markup',
  { file: 'src/docs/site.ts', pattern: 'footerVersion', expect: 'present' }, 0);
check('ops', 'A release measurement, checked in (40.4)', 'n/a', 'BETTER',
  '`termcrab perf --save` writes the snapshot to docs/openclaw/data/perf-<release>.json — one file per release, checked in — with the release, the machine and a note pointing at docs/PERFORMANCE.md, and says which happened (written or replaced). "How fast was 0.73?" is now answerable offline, from the repository, on any machine; perf-0.73.0.json is the first. Pinned by test/tier3k.test.ts 40.4 (a stand-in bench for speed, written then replaced, the committed files re-validated against the ceilings they were judged by)',
  { file: 'src/core/perf.ts', pattern: 'export function savePerfSnapshot', expect: 'present' }, 0);
check('ops', 'Every ceiling has a fix line (41.1)', 'a dashboard with numbers and no guidance', 'BETTER',
  'PERF_ADVICE in src/core/perf.ts declares one "where to look" sentence per ceiling; `termcrab perf` prints it under an over-budget line, perfStatus() carries worstAdvice/overAdvice so the panel shows it next to the worst metric (over, or past 80% of its ceiling), and docs/PERFORMANCE.md\'s "when a ceiling trips" list is the human copy checked against the code by test/tier3l.test.ts — the fix a phone shows cannot drift from the document',
  { file: 'src/core/perf.ts', pattern: 'export const PERF_ADVICE', expect: 'present' }, 0);
check('ops', 'perf --compare against a release (41.2)', 'n/a', 'BETTER',
  '`termcrab perf --compare [release]` measures now and puts the result next to the checked-in docs/openclaw/data/perf-<release>.json (default: the newest other release): every metric both runs measured, one line each, with its ceiling and the largest movement named. Metrics the saved run skipped are listed as not compared rather than invented as unchanged, under-3% moves read as steady, the release comes from the file\'s own field or its name, and a machine with nothing saved gets one sentence instead of a crash. test/tier3l.test.ts 41.2 drives the real command against a fabricated 0.73.0 file',
  { file: 'src/core/perf.ts', pattern: 'export function comparePerfSnapshots', expect: 'present' }, 0);
check('ops', "The suite's clock on the phone (41.3)", 'CI dashboards on a web service', 'BETTER',
  'GET /api/suite-time serves the last recorded suite run (docs/openclaw/data/suite-time.json, written by npm run test:time): wall clock, file and case counts, the five slowest files, the budgets and whether the run was over — read-only and cheap, because it reads a recording and never runs the suite. The panel\'s Work page prints `(99 files · 1024 cases · 165.5 s of 240.0 s · slowest tier3j 40.4 s · recorded 7 min ago)`, so "the tests got slow" is a visible fact on the phone. Pinned by test/tier3l.test.ts 41.3 (fabricated record, over-budget flag, the repository\'s own record, a real gateway)',
  { file: 'src/gateway/server.ts', pattern: "/api/suite-time", expect: 'present' }, 0);
check('ops', 'A bad measurement is refused (41.4)', 'n/a', 'BETTER',
  'Every snapshot records what the machine was carrying (`load: {load1, cpus, perCpu}`, `suspect`); above 1 per CPU every timing is an upper bound, not a measurement of the code. `termcrab perf` prints it, perfStatus() carries it, the doctor repeats it with a fix line, and `--save` **refuses** — a misleading number committed to the repository outlives the machine that made it; `--trust` overrides and the file records the load. TCRAB_PERF_LOAD exists so the rule itself is tested without making a machine busy (test/tier3l.test.ts 41.4: the boundary at exactly 1.0, the refusal writing nothing, the trusted save carrying suspect + perCpu, the doctor\'s line)',
  { file: 'src/core/perf.ts', pattern: 'export function perfSuspect', expect: 'present' }, 0);
check('ops', "The docs budget where the docs line is (41.5)", 'n/a', 'BETTER',
  'The panel\'s docs note (release, doc/section counts, size, freshness) now also quotes the docs page\'s own budget from the /api/perf snapshot: `build 43 ms of 1500 · 2777 KB of 4000 KB`, read once and shared, so the two places a person looks quote one measurement. perfStatus() carries metrics and budget for every ceiling, and the test asserts the panel reads those exact fields (test/tier3l.test.ts 41.5)',
  { file: 'ui/index.html', pattern: 'loadDocsBudget', expect: 'present', min: 2 }, 0);
check('ops', 'A load-dependent test is a defect too (44.1)', 'n/a', 'BETTER',
  'Running the suite under two CPU burners turned 40.4 red — not because saving broke, but because batch 41 added the busy-machine rule and the *test* used the machine\'s real load to decide an outcome it did not mean to test (on a phone, which is usually busy, `perf --save` refuses by design). The test now pins the load exactly as the rule\'s own test does, so its verdict is about saving and nothing else. Pinned by test/tier3k.test.ts 40.4 (TCRAB_PERF_LOAD: 0 in the env)',
  { file: 'test/tier3k.test.ts', pattern: 'TCRAB_PERF_LOAD', expect: 'present' }, 0);
check('ops', 'One deadline per group (44.2)', 'a suite that re-runs until it is green', 'BETTER',
  'node cancels a test at `--test-timeout` and **the CLI flag overrides the test\'s own `{ timeout }`** — so the two measuring files (`tier3i`: the real bench; `tier3j`: a real npm install) were cancelled on a loaded machine while their children were still working, and came back `not ok` with zero failing assertions. scripts/test-files.mjs declares the split once (heavy: 600 s with the reason; fast: 60 s so a hung test still fails quickly), `npm test`, the coverage recording, the CLI recording and the suite clock all read it, and test/tier3n.test.ts asserts the override against a throwaway file — so the reason the split exists cannot quietly stop being true',
  { file: 'scripts/test-files.mjs', pattern: 'export function plan', expect: 'present' }, 0);
check('ops', 'Three surfaces, one product (45.1)', 'the backend is not a surface', 'BETTER',
  'The owner\'s rule is that every capability must be reachable from the CLI, Telegram and the web panel — not merely from the API behind them. scripts/surface-audit.mjs measures that with 71 capabilities × 3 surfaces, each cell a regex probe over the file that would have to contain the feature, and prints the verdicts plus `--gaps`; `--check` exits 1 the day a probe stops matching, and test/surface-audit.test.ts also refuses a report (docs/SURFACES.md) whose scoreboard no longer matches the script. First honest measurement: CLI 49 direct / 0 missing, Telegram 24 / **28 missing**, web 41 / 9 missing.',
  { file: 'scripts/surface-audit.mjs', pattern: 'export const CAPABILITIES', expect: 'present' }, 0);
check('ops', 'The audit cannot rot (45.2)', 'a report written once and never true again', 'BETTER',
  'The audit is checked twice: `--check` re-runs every probe against the source (a moved command fails the suite with the file and pattern), and the same test parses the JSON and compares it with the scoreboard table in docs/SURFACES.md, so the numbers cannot drift from what the scanner sees. Row shape is enforced too: every capability carries a verdict for all three surfaces, and every ❌ or ◐ must say why.',
  { file: 'test/surface-audit.test.ts', pattern: '45.3', expect: 'present' }, 0);
check('ops', 'Every surface can decide, inspect and take its own copy (52.x)', 'a capability that answers "partly" with no reason', 'BETTER',
  'The audit\'s named ◐ cells shrank from 44 to 34 as the half-doors closed: the panel gained its inbox (GET /api/inbox + a name-guarded read), rooms (GET /api/rooms), watchers (GET|POST /api/watchers — the same config.watchers /watch writes), tool switches (POST /api/tools/toggle → allowExec/allowBrowser/allowCodeExec), a security scan with fixes (GET /api/security), the named secrets as names only (GET /api/secrets), the chats rail wired to the existing rename/export routes (those two routes existed since v0.5 — the audit's "no rename/export" note was stale, and p1.test.ts caught the duplicate route the first attempt added) and a downloadable spoken reply (POST /api/voice → OGG/Opus, 422 with the install hint when no engine exists). Telegram gained the proposal decision behind an inline confirm (/skills approve + skills:approve: → the CLI\'s approveProposal()) and /cron add. The CLI gained termcrab suite-time and termcrab work [--full], both with --json envelopes, reading the same records the other surfaces serve. Register: CLI 51 ✅ / Telegram 54 ✅ / Web 58 ✅, 0 ❌ of 71, every remaining ◐ named with its reason.',
  { file: 'test/tier3u.test.ts', pattern: '52.1', expect: 'present' }, 0);
check('ops', 'Every capability reaches every surface (51.x)', 'a feature only one surface can reach', 'BETTER',
  'The three-surface audit ends this batch with no missing cell: Telegram gains /suite-time (the tests\' own clock, read from the same record the panel serves), /work [full] (WORKLOG.md rendered for a phone, the whole file attached as a document), /say (a real voice note — speakToFile() writes espeak/say output and pipes it through ffmpeg/opusenc into OGG/Opus, sendVoice delivers it), voice replies (channels.telegram.voiceReplies; a spoken answer up to 600 characters, still delivered as text when no engine exists), /embeddings setup behind an inline confirm that runs the CLI\'s own embeddingsSetup(), /controlui as a web_app button built from gateway.publicUrl, and forum topics as sessions of their own (telegram:<chatId>:<threadId>). The register: CLI 50 / Telegram 52 / Web 51, missing cells 0 of 71.',
  { file: 'test/tier3t.test.ts', pattern: '51.1', expect: 'present' }, 0);
check('ops', 'The panel is whole (50.x)', "a web surface that ends in the terminal", 'BETTER',
  'The four flows that were terminal-only are doors now: GET/PUT /api/bootstrap edits SOUL.md / IDENTITY.md / USER.md by name (paths pinned inside the home, 32 KB cap); POST /api/backup writes with writeBackup(), GET /api/backups lists, and POST /api/restore does a dry-run then demands the archive name typed back before restoreBackup() moves the current files aside; GET /api/service serves the status, the plan and the exact command read-only; POST /api/transcribe lands the bytes in state/uploads and runs the CLI\'s own transcribeFile(). The audit\'s web row has no missing cell left — the seven that remain are all Telegram.',
  { file: 'test/tier3s.test.ts', pattern: '50.1', expect: 'present' }, 0);
check('ops', "The panel's quick gaps, closed (49.x)", 'a web surface that shows less than the terminal', 'BETTER',
  'Search across every chat is GET /api/sessions?q= (the CLI\'s ranked search, snippets included); the prompt-context report is GET /api/context and renders biggest-section-first in Debug; the embedding-provider picker writes memory.embedProvider and runs the offline-model install as one background job behind confirm:true; and /api/queue + /api/steer call the same queueCommand()/steerCommand() the chat dispatcher serves, so the composer\'s mode chip and steer box cannot drift from Telegram or the CLI.',
  { file: 'test/tier3r.test.ts', pattern: '49.1', expect: 'present' }, 0);
check('ops', 'The reports a chat can run (46.1)', 'the CLI is the only place the numbers appear', 'BETTER',
  'Sixteen reports and /help live in src/gateway/chat-reports.ts, clamped to 24 lines and with secrets redacted by name; one CHAT_COMMANDS list (27 entries) is what /help prints, what GET /api/slash serves and what setMyCommands registers as the Telegram Bot menu — so a report is written once and reaches every surface.',
  { file: 'src/gateway/chat-reports.ts', pattern: 'export const CHAT_COMMANDS', expect: 'present' }, 0);
check('ops', 'One dispatcher, every surface (47.2)', 'two implementations that drift apart', 'BETTER',
  'runSharedCommand(text, channel, chatId, sessionId) in src/gateway/server.ts is called by both Telegram\'s handleChannelMessage and the panel\'s POST /api/slash — a command cannot work in one chat and be a prompt in the other. The control verbs (/stop /steer /queue /sessions rename|purge /update /backup /watch) live in src/gateway/chat-control.ts, and the panel chat box intercepts a leading slash and posts it to the same dispatcher.',
  { file: 'src/gateway/server.ts', pattern: 'runSharedCommand', expect: 'present', min: 3 }, 0);
check('ops', 'Approvals decidable inside Telegram (48.3)', 'the panel is the only place a yes/no can be given', 'BETTER',
  'A pending approval whose session starts telegram:<chatId> is delivered with reply_markup.inline_keyboard carrying approve:<id> / deny:<id>; the callback calls the same resolveApproval(id, …, \'telegram\') the panel button and the CLI call, answers the callback, drops the buttons and emits approval:decided. setMyCommands(CHAT_COMMANDS) registers the menu at start and a refusal is tolerated.',
  { file: 'src/channels/api.ts', pattern: 'inline_keyboard', expect: 'present' }, 0);
check('ops', 'The closing numbers, read back (42.1)', 'n/a', 'BETTER',
  'Every number the tracker quotes — the census score, the suite counts, the coverage floor and fingerprint, the CLI command coverage, the suite clock, the performance budget — is *produced* in docs/openclaw/data/*.json. scripts/final-numbers.mjs loads those files, prints each number with the file it came from, and `--check` (and test/tier3m.test.ts 42.1) refuses when WORKLOG.md\'s numbers line no longer quotes them, in the Bengali digits the tracker is written in. A quoted number that nobody re-derives is a number that will one day be wrong',
  { file: 'scripts/final-numbers.mjs', pattern: 'export function checkTrackerNumbers', expect: 'present' }, 0);
check('ops', 'The owner handover, declared once (42.2)', 'an issue tracker with nobody assigned', 'BETTER',
  'After the closing batch exactly two actions need a token or a push, and they live in ONE place: src/core/owner.ts declares each action\'s commands, what it closes, what to expect and where the proof lands; `termcrab owner` prints them, `docs/OWNER.md` is the long version, and test/tier3m.test.ts 42.2 asserts every declared command still appears on the page under its own heading. The handover cannot say one thing on the phone and another in the docs',
  { file: 'src/core/owner.ts', pattern: 'export const OWNER_ACTIONS', expect: 'present' }, 0);
check('ops', 'The queue can end (42.3)', 'a roadmap that only grows', 'BETTER',
  'WORKLOG.md §3 can now be the sentence **Queue empty.** instead of another batch, and the tracker test accepts that only when every row is finished or in progress and none is stranded at a todo nobody will start; scripts/status.mjs prints `queue empty…` instead of a count of zero, and test/tier3m.test.ts 42.3 asserts both the human line and the --json flags. New batches are written when the owner asks for one or something real breaks — not because the table looks empty',
  { file: 'scripts/status.mjs', pattern: 'queue empty', expect: 'present', min: 3 }, 0);
check('ops', 'The handover on the phone (42.5)', 'a runbook in a wiki', 'BETTER',
  '`termcrab owner` prints the two remaining actions from the declared source — the exact commands, what each closes, what to expect, where the proof lands — and `termcrab owner --json` returns {count, doc, actions:[…]} in the standard envelope, so a script or the panel can poll what is left without a shell in the repository. test/tier3m.test.ts 42.5 asserts the CLI output equals the declared text, that no human prose leaks into the JSON run, and that the help entry exists',
  { file: 'src/cli.ts', pattern: "case 'owner'", expect: 'present' }, 0);
check('ops', "The queue's numbers (40.5)", 'n/a', 'BETTER',
  'The parts that make a phone feel slow while the agent is busy now have ceilings: queueDrainMs (500 ms; 24 turns through one real SessionQueue lane measured at 53 ms, 48 of it the runner sleeping), queueWakeMs (120 ms; the worst gap between one queued turn finishing and the next starting, measured at 1 ms) and subagentFanoutMs (600 ms; four 40 ms sleepers measured at 41 ms, which is the proof the four slots are parallel and not a polite queue). All three are in FAST_METRICS. Writing the test found a real defect — waitForTasks left its deadline timer running when an answer arrived first, holding a one-shot process alive for a full minute — and it is fixed. Pinned by test/tier3k.test.ts 40.5 (a real lane of twelve turns, a real four-task fan-out, the doc and the committed snapshot)',
  { file: 'src/agent/tasks.ts', pattern: 'so a settled wait leaves nothing behind', expect: 'present' }, 0);
check('ops', 'Cold checkout timed from nothing (39.5)', 'n/a', 'BETTER',
  'The bench measures the first contact a new person pays, with no shortcuts: a copy of the tree with no dist/ and no node_modules, an isolated npm cache (so it cannot freeload), `npm install` and `./termcrab version` which compiles. Measured here: install 735 ms, end to end 6.35 s. Ceilings: coldInstallMs 60 000, coldCheckoutMs 90 000 — the install half is network (mobile data), the compile half is CPU (the phone), and the --first-run flag is what measures them. Pinned by test/tier3j.test.ts 39.5, which runs the real cold path (empty cache, real npm, the launcher) and asserts both numbers and both ceilings',
  { file: 'scripts/bench.mjs', pattern: 'measureColdCheckout', expect: 'present' }, 0);
check('ops', 'Performance budget with an alarm (37.1)', 'benchmarks exist, nothing enforces them', 'BETTER',
  'scripts/bench.mjs measures the seven numbers the phone story rests on (install, cold start, idle RSS, restart, one turn, first run from a fresh checkout, rebuild after a pull) and `--budget` exits 1 when any of them crosses a ceiling declared in BUDGETS; docs/PERFORMANCE.md explains each ceiling, what to do when one trips ("fix the cause, never edit the ceiling"), and what the numbers are not. test/tier3i.test.ts runs the gate, tests the alarm against a fabricated over-budget number, and fails if the ceilings in the README block or in the doc drift from the code. npm run bench:budget is the one-liner',
  { file: 'scripts/bench.mjs', pattern: 'export const BUDGETS', expect: 'present' }, 0);
check('ops', 'Tests', 'contract tests per channel, 16k-PR CI', 'WORKING',
  'the suite measures itself now (34.6), with no test-time dependency at all — node:test plus the flags Node already ships. `npm run test:coverage` runs every file under `node --experimental-test-coverage` and records the result in docs/openclaw/data/coverage.json and docs/TESTING.md: **900+ cases in 92 files** covering **~86.8% of the lines in src/** (branches and functions recorded too) against a declared **80% floor**. The floor is enforced as a test rather than a note: the snapshot carries a fingerprint of every file in src/, so `node scripts/coverage.mjs --check` fails the suite when the tree has moved since the recording. The command-line surface is measured the same way (docs/CLI-COVERAGE.md, 44/52 commands run by the suite). The tests are written to exercise real things: real HTTP and SSE over a socket with a token, a real WebSocket server playing Chrome for the CDP client, real child processes for every CLI command, real files on disk, and stand-in executables on PATH for voice (which found two real defects in batch 33). Limits stated: no mutation testing and no fuzzing; the panel is checked by extracting its functions and running them in Node (**no browser rendering**); Telegram and WhatsApp are driven against local stand-ins, not a live account; the environment-dependent cases skip visibly rather than pretending (5 on this machine). Their 16k-PR CI is a company; this is a suite one person can run before every commit, in about 70 seconds. test/tier3d.test.ts 34.6',
  { file: 'docs/TESTING.md', pattern: 'What the tests actually do', expect: 'present' }, 0);
check('ops', 'CI matrix', 'lint + types + budgets + swiftlint + semgrep + knip', 'PARTIAL',
  'The workflow is versioned at ci/ci.yml (Node 20/22/24 + the full suite + an offline CLI smoke incl. bootstrap --json + tracker and census checks + an installer job + a packaged-tarball job) and every line of it is asserted by test/tier2w.test.ts, but the installed copy at .github/workflows/ci.yml is one command away rather than in the tree: GitHub refuses a push that creates a workflow file unless the credential carries the workflows permission, and the integration writing this repository has contents:write without it (the API says it plainly: Resource not accessible by integration). `npm run ci:install` copies ci/ci.yml into place byte for byte, `--check` fails when the two drift (the workflow runs that check itself), and after one push from the repo owner the matrix really runs. Until then this stays PARTIAL on purpose - a workflow file in a folder GitHub does not read is not CI',
  { paths: ['ci/ci.yml', 'scripts/install-ci.mjs'], expect: 'present' }, 1);check('ops', 'Documentation site', 'full docs site, thousands of pages', 'WORKING',
  'termcrab docs builds docs/ into ONE self-contained HTML page (62 docs, 337 sections, ~2.9 MB, ~80 ms) that opens offline from the phone file manager and is served at GET /docs; search hits every ## section, and the markdown is rendered by the panel\'s own renderer sliced verbatim out of ui/index.html (byte-identity asserted), so there is no second implementation to drift. Not thousands of separate pages, and no per-version archive: one file, rebuilt when a source changes (mtime stamp), with generated crawl data excluded by path - reported in the page\'s nav, not dropped silently',
  { paths: ['src/docs/site.ts', 'test/tier3f.test.ts'], expect: 'present' }, 0);
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
  // A rounded 100% must not hide a row that is still open: say what is left.
  const openRows = inScope.filter((r) => r.verdict === 'PARTIAL' || r.verdict === 'BROKEN');
  if (openRows.length) {
    console.log(`  open rows        : ${openRows.map((r) => `${r.capability} (${r.verdict}, ~${r.effort}d)`).join(', ')}`);
    console.log(`  exact            : ${((score / inScope.length) * 100).toFixed(1)}% of ${inScope.length} in-scope checks`);
  }
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
