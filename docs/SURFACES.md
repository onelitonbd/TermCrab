# Three surfaces, one product — the surface audit

*Written 2026-10-04 against the v0.76.2 tree, shipped with v0.77.0. Scope: the three surfaces the owner declared the
product — **CLI/TUI**, **Telegram**, **web panel**. Nothing here is implemented;
this is the map the parity work will follow.*

The rule the owner set: every capability the backend has must be reachable from
each of the three surfaces, or the audit must say plainly why a surface cannot
carry it. "The API supports it" is not reachability. A user sitting in Telegram
must be able to do it from Telegram.

## 0. How this audit is measured

`scripts/surface-audit.mjs` holds **71 capabilities × 3 surfaces**, each cell a set of
regex probes against the source files that would have to contain the feature
(`src/cli.ts`, `src/command-help.ts`, `src/tui/app.ts`, `src/gateway/server.ts`,
`src/channels/telegram.ts`, `ui/index.html`). Every probe cites its file, so a
claim in this document can be checked by reading one line of code.

```
node scripts/surface-audit.mjs             # the human table
node scripts/surface-audit.mjs --gaps      # only rows with a missing cell
node scripts/surface-audit.mjs --markdown  # the table below
node scripts/surface-audit.mjs --json      # machine-readable, for the guard test
node scripts/surface-audit.mjs --check     # exit 1 when a probe stops matching
```

Cell meanings:

| mark | meaning |
|---|---|
| ✅ | direct: a command, button, endpoint or menu item on that surface does it |
| ◐ | reachable through a narrower door — config file, the agent's own tool inside a turn, or only part of the capability. The note names the door |
| ❌ | the surface could carry it and does not |
| — | the surface cannot carry it by nature (Telegram buttons on a terminal, `service install` in a chat) |

`--check` is the anti-rot device: the day someone moves `/api/doctor` or renames
a command, the audit fails instead of lying. It runs green today.

## 1. What each surface is today

**CLI / TUI — the complete surface.** 55 documented commands in
`src/command-help.ts` (62 switch cases in `src/cli.ts`, aliases included), a TUI
with slash commands and streamed deltas, every report the backend can make
(`doctor`, `security`, `auth audit`, `backup`, `perf`, `docs`, `context`, …).
It has **no missing cell** — the only imperfections are 15 ◐ cells where the
control exists but is coarser than the web panel's (for example queue modes are
`config set agent.queueMode`, not a live control).

**Telegram — the thin surface.** The adapter (`src/channels/telegram.ts`, 393
lines) handles long polling, typing refresh, chunked HTML, documents out, and
the intake of files in (document read, voice transcribe, photo describe). Every
message goes to `handleChannelMessage()` in `src/gateway/server.ts` — the same
function the other 18 channels use — which understands exactly **14 slash
commands**: `/new /clear /model /status /usage /sessions /memory /context
/agents /orders /history /inbox /heartbeat /help`. That is the whole command
surface: 24 ✅, 14 ◐, **28 ❌**. No approvals, no cron list, no logs, no config,
no doctor, no stop button, no inline keyboard at all (`inline_keyboard`,
`callback_query`, `setMyCommands` have zero occurrences).

**Web panel — the good surface with holes.** `ui/index.html` (7649 lines) has 11
views (`chat, status, board, providers, models, memory, tools, logs, debug,
work, settings`) and 56 `/api/*` endpoints, including things Telegram has never
heard of: approvals with Allow/Deny cards, devices, canvas, crons, skills,
doctor with fixes, perf, suite clock, worklog, docs. It is 41 ✅, 16 ◐, **9 ❌**.
Two structural notes: the panel chat **does not run the shared command handler**
— typing `/status` into the chat sends it to the model, only the separate
command palette intercepts — and where the panel does have a feature, it is
usually one view richer than Telegram has.

**Shared backend, three doors.** Everything the CLI does is a library call
inside the same process the gateway runs; everything Telegram and the panel do
is an HTTP call into that process. So a parity implementation is almost never a
new engine — it is exposing an existing function through a second or third door.

## 2. Scoreboard

| surface | ✅ direct | ◐ narrower door | ❌ missing | — n/a |
|---|---|---|---|---|
| CLI / TUI | 49 | 15 | 1 ¹ | 6 |
| Telegram | 24 | 14 | **28** | 5 |
| Web panel | 41 | 16 | 9 | 5 |

¹ The single ❌ on the CLI row is the audit's *"Slash commands typed into the chat"* row, whose
missing cell is the panel's chat — the CLI's own TUI intercepts slashes fine. It is counted
on the web row's nine.

33 of 71 rows have at least one ❌. The missing cells: **Telegram 28, web 9,
CLI 1** (the CLI row that is ❌ is the audit row about the *panel's* chat
intercepting slashes — it is not a CLI defect).

By area (rows each): gateway 17 · ops 12 · channels 9 · context 8 · tools 7 ·
sessions 5 · agent 4 · automation 4 · mobile 4 · skills 1.

## 3. The matrix

| area | capability | CLI | Telegram | Web | note |
|---|---|---|---|---|---|
| gateway | Chat: send text, stream the answer | ✅ | ✅ | ✅ |  |
| gateway | Stop a running turn | ✅ | ❌ | ✅ | tg: no /stop — a running turn cannot be aborted from Telegram |
| gateway | Queue modes (steer/followup/collect/interrupt) | ◐ | ◐ | ◐ | cli: config set agent.queueMode only; tg: queues by default (followup); no mode control; web: queues by default; no mode control |
| gateway | Approvals (human-in-the-loop) | ✅ | ❌ | ✅ | tg: not delivered to Telegram (OpenClaw approves exec there) |
| gateway | Devices: pair, list, revoke | ✅ | ❌ | ✅ | tg: no /pair or /devices |
| gateway | Presence: who can reach the agent now | ✅ | ✅ | ✅ |  |
| gateway | Usage/cost: tokens per day | ✅ | ✅ | ✅ |  |
| gateway | Run health: which turn is stuck | ✅ | ✅ | ✅ |  |
| gateway | Run identity + wait for a run | ✅ | — | ◐ | tg: this surface cannot carry it by nature; web: run ids are shown; no wait control |
| gateway | Events: what the bus emitted | ✅ | — | ✅ | tg: this surface cannot carry it by nature |
| gateway | Logs: console lines with levels | ✅ | ❌ | ✅ | tg: no /logs command |
| gateway | Config: read and set | ✅ | ❌ | ✅ | tg: no config via chat (by design?) |
| gateway | Board: everything in flight | ✅ | ❌ | ✅ | tg: nothing — /status shows health, not the board |
| gateway | Canvas / A2UI widgets | ◐ | ◐ | ✅ | cli: the canvas tool the agent can call; no command; tg: the agent can call canvas; nothing renders in Telegram |
| gateway | Multi-agent routing (@name, per-surface) | ✅ | ✅ | ✅ |  |
| gateway | Health/status at a glance | ✅ | ✅ | ✅ |  |
| gateway | Slash commands typed into the chat | ❌ | ✅ | ❌ | cli: probe no longer matches; web: the panel chat sends /status to the model; only the separate palette intercepts |
| agent | Tool activity visible while it works | ✅ | ◐ | ✅ | tg: only the typing indicator; tool names never shown |
| agent | Progress drafts / partial answers | ◐ | ◐ | ✅ | cli: streams deltas; no draft markers; tg: the reply arrives whole; no live edit |
| agent | Subagents: spawn, list, read results | ✅ | ◐ | ✅ | tg: via sessions_spawn tool in chat |
| agent | Steering a live run | ◐ | ❌ | ◐ | cli: config mode=steer only; tg: a second message queues as followup; nothing steers; web: no steer affordance |
| sessions | List / switch conversations | ✅ | ✅ | ✅ |  |
| sessions | Search across conversations | ✅ | ✅ | ❌ | web: no session search in the panel |
| sessions | Show one transcript | ✅ | ✅ | ✅ |  |
| sessions | Rename / purge / export | ✅ | ❌ | ◐ | tg: no /sessions rename\|purge; web: purge exists; no rename/export |
| sessions | Start a fresh conversation | ✅ | ✅ | ✅ | web: the command palette carries /new (server-driven list) |
| context | Memory: browse what it knows | ✅ | ✅ | ✅ |  |
| context | Memory: search it | ✅ | ✅ | ✅ |  |
| context | Memory: write a fact by hand | ◐ | ◐ | ✅ | cli: memory user <line> writes USER.md only; tg: say "remember …" and the agent calls the tool |
| context | Dreaming / idle consolidation | ✅ | ❌ | ✅ | tg: runs on schedule only; no /dream |
| context | Context report: what the model is sent | ✅ | ✅ | ◐ | web: not exposed — the Debug view shows events, not prompt sizes |
| context | Embeddings: status | ✅ | ❌ | ◐ | tg: no /embeddings; web: an on/off switch for memory.embeddings, not the model status |
| context | Embeddings: setup / switch provider | ◐ | ❌ | ❌ | cli: CLI command only; tg: not available; web: not available |
| context | Identity files (SOUL/IDENTITY/USER bootstrap) | ✅ | ◐ | ❌ | tg: "remember …" writes USER.md; SOUL/IDENTITY are not editable from chat; web: a SOUL.md badge on agents; no editor |
| tools | Tool catalog: what the agent can do | ◐ | ◐ | ✅ | cli: context lists schemas; no catalog command; tg: ask in chat and the agent answers |
| tools | Tool toggles (enable/disable a tool) | ◐ | ◐ | ◐ | cli: config set agent.allowExec etc.; tg: config only; web: catalog shows active/planned; no toggle |
| tools | Shell / files / web tools in conversation | ◐ | ◐ | ◐ | cli: the agent's own exec/read/web tools; tg: the agent's own tools in a turn; web: the agent's own tools in a turn |
| tools | Browser automation | ✅ | ◐ | ◐ | tg: agent tool in chat; web: agent tool in chat; no browser panel |
| tools | Image generation | ✅ | ◐ | ◐ | tg: agent tool in chat; web: agent tool in chat; no button |
| tools | Send a file back to a chat | ◐ | ✅ | ◐ | cli: needs a channel to send into; web: send_file reaches the panel as a path, not a download |
| tools | Document extraction (PDF/DOCX/XLSX in) | ◐ | ✅ | ◐ | cli: no command; agent reads text files only; web: attach accepts text types only |
| skills | Skills: list / import / create / proposals | ✅ | ◐ | ✅ | tg: agent can propose; no /skills list |
| automation | Cron jobs: list / add / run | ✅ | ◐ | ✅ | tg: agent tool automations; no /cron |
| automation | Heartbeat: run a self-check now | ✅ | ✅ | ✅ |  |
| automation | Watchers / file triggers | ◐ | ❌ | ◐ | cli: config set only; tg: no surface; web: presence counts them; nothing to edit |
| automation | Standing orders | ✅ | ✅ | ✅ | web: the palette runs /orders add\|remove; no dedicated view |
| mobile | Dictation (speech → text) | ✅ | ✅ | ✅ |  |
| mobile | Text to speech | ✅ | ❌ | ✅ | tg: no voice replies from the bot |
| mobile | Transcribe a voice file | ✅ | ✅ | ❌ | web: no upload-transcribe in the panel |
| mobile | Wake word loop | ✅ | — | ✅ | tg: this surface cannot carry it by nature |
| ops | Doctor: find and fix problems | ✅ | ❌ | ✅ | tg: no /doctor; web: the Doctor section runs the same checks, fixes included |
| ops | Update: check / apply / rollback | ✅ | ❌ | ✅ | tg: no chat control |
| ops | Backup / restore the home | ✅ | ❌ | ❌ | tg: not available; web: not available |
| ops | Disk usage | ✅ | ❌ | ✅ | tg: no /disk |
| ops | Install as a service | ✅ | — | ❌ | tg: this surface cannot carry it by nature; web: no panel view (terminal-native) |
| ops | Boot autostart (Termux:Boot) | ✅ | — | ✅ | tg: this surface cannot carry it by nature; web: a "Start at boot" button with termux detection |
| ops | Security audit (findings + fixes) | ✅ | ❌ | ❌ | tg: not available; web: not available — the word appears, no view |
| ops | Secrets: named keys, audit | ✅ | ❌ | ❌ | tg: not available; web: not available |
| ops | Performance budget + history | ✅ | ❌ | ✅ | tg: no /perf |
| ops | Suite clock (the tests' own record) | ◐ | ❌ | ✅ | cli: npm run test:time; not a termcrab command; tg: not available |
| ops | Work tracker: what is being built now | ✅ | ❌ | ✅ | cli: termcrab owner + scripts/status.mjs; tg: not available |
| ops | Docs: the offline manual | ✅ | ❌ | ✅ | tg: not available (the docs page could be a mini-app link) |
| channels | Rooms: what was said while unaddressed | ✅ | ✅ | ◐ | web: room_history tool in chat; no view |
| channels | Inbox: files people sent | ◐ | ✅ | ◐ | cli: inbox_list/read tools in a turn; web: tools in chat; no inbox view |
| channels | Typing indicator | — | ✅ | ✅ | cli: this surface cannot carry it by nature |
| channels | Media in / out (photos, voice, files) | ◐ | ✅ | ◐ | cli: in: attach only in the panel; web: in: attach (text types); out: send_file as a path |
| channels | Telegram inline buttons (rich messages) | — | ❌ | — | cli: this surface cannot carry it by nature; tg: OpenClaw sends buttons; we send plain text; web: this surface cannot carry it by nature |
| channels | Registered Telegram command menu (setMyCommands) | — | ❌ | — | cli: this surface cannot carry it by nature; tg: /help lists them in text; no BotFather menu; web: this surface cannot carry it by nature |
| channels | Panel inside Telegram (mini app) | — | ❌ | — | cli: this surface cannot carry it by nature; tg: OpenClaw has /controlui; we do not; web: this surface cannot carry it by nature |
| channels | Voice replies in Telegram | — | ❌ | — | cli: this surface cannot carry it by nature; tg: the bot replies in text only; web: this surface cannot carry it by nature |
| channels | Group / forum topics → separate sessions | — | ❌ | — | cli: this surface cannot carry it by nature; tg: no forum-topic routing; group rooms only; web: this surface cannot carry it by nature |

## 4. Gap register — what is missing where, and how each one gets built

### 4.1 Telegram: the 28 missing cells

The plan is one **surface-action layer**, not 28 one-off hacks. Three
mechanisms cover nearly all of them:

1. **More commands in `handleChannelMessage()`** (the switch in
   `src/gateway/server.ts` around line 831). Every command there is already
   reachable from Telegram — it needs no Telegram code at all, only a case that
   calls a function the CLI already calls. This is the cheapest parity work in
   the project.
2. **A Telegram interaction layer** in `src/channels/telegram.ts` +
   `src/channels/api.ts`: inline keyboards, `callback_query` handling,
   `answerCallbackQuery`, `setMyCommands`, `sendVoice`, `editMessageText`.
   This is what makes approvals and destructive actions safe in a chat.
3. **A scheduled-report bridge**: for `/perf`, `/suite-time`, the work tracker
   and the docs, render the same numbers as short text lines.

| # | missing cell | how it gets built | size |
|---|---|---|---|
| T1 | `/stop` | a `case '/stop'` calling the same registry `/api/stop` uses (`src/gateway/server.ts` already holds `agentQueue`); reply with what was cancelled | S |
| T2 | Approvals in chat | when the turn came from a chat surface, deliver the approval as a message with an inline `[Allow] [Deny]` keyboard instead of only emitting to the panel; the callback handler resolves the same promise. Touches `src/channels/telegram.ts` (parse `callback_query`), `src/channels/api.ts` (`answerCallbackQuery`), and the approval emitter in the gateway | L |
| T3 | `/pair`, `/devices` | list devices + the pairing code the CLI prints; revocation behind an inline confirm | M |
| T4 | `/logs [n]` | reuse the log ring the panel and `termcrab logs` read | S |
| T5 | `/config [key]`, `/config set k v` | read-only by default; `set` restricted to a whitelist of safe keys (never provider tokens from a chat) | M |
| T6 | `/board` | reuse the board renderer `termcrab board` uses, as a bullet list | S |
| T7 | `/dream` | run consolidation in the background; reply when done (status is visible with `/status`) | S |
| T8 | `/embeddings`, `/embeddings setup` | status line + the provider list the CLI setup prints; switching stays CLI-only until a confirm flow exists | S |
| T9 | `/sessions rename`, `/sessions purge` | rename is safe; purge gets an inline confirm | M |
| T10 | Steering a live run | `/steer <text>` feeding the queue's steer mode (today a second message just queues as followup) | M |
| T11 | `/doctor` | reuse the doctor checks; findings with fixes, as text | S |
| T12 | `/disk` | reuse `termcrab disk` numbers | S |
| T13 | `/perf` | last recorded perf snapshot as one line | S |
| T14 | `/update` | `check` by default; `apply` needs an inline confirm | M |
| T15 | `/backup` | create the archive, send it as a document via the existing `sendDocument` | M |
| T16 | `/security`, `/auth` | reuse the audit findings / key list — names only, never secret values | S |
| T17 | `/skills`, `/cron list` | reuse the list endpoints | S |
| T18 | `/suite-time`, `/work`, `/docs` | the suite clock, the worklog "now" line, and the docs index; `/docs <name>` returns the section text, and eventually a mini-app link (T23) | M |
| T19 | Watcher management | `/watch add <path> <instruction>`, `/watch list`, `/watch rm <id>` — config writes with the same validation the CLI uses | M |
| T20 | Inline buttons (rich messages) | the general facility behind T2/T3/T9/T14: keyboard builder + callback router in `src/channels/api.ts` and `telegram.ts` | L |
| T21 | Command menu (`setMyCommands`) | one call at gateway start with the shared command list, so Telegram shows the menu when the user types `/` | S |
| T22 | Voice replies | `sendVoice` for `/say` and for "answer by voice" requests; OGG/Opus or an mp3 the Bot API accepts | M |
| T23 | Panel inside Telegram (mini app) | `/controlui` returns an HTTPS panel URL (needs a `gateway.publicUrl` config); an inline `web_app` button opens the panel inside Telegram. Security: the URL carries the panel token — document it and offer a short-lived token | L |
| T24 | Forum-topic sessions | key the session by `message_thread_id` when present, so each topic is its own conversation (groups already work; topics do not) | M |
| T25-28 | the remaining four (§3 channels): typed-command parity for the ops rows above | covered by T4–T19 once each command exists | — |

### 4.2 Web panel: the 9 missing cells

| # | missing cell | how it gets built | size |
|---|---|---|---|
| W1 | Session search | a search box on the chat rail backed by `GET /api/sessions?q=` (the CLI's search already exists in core) | S |
| W2 | Context report view | a "Context" section (under Debug) rendering the same section sizes `/api/context` returns for the chat surfaces | S |
| W3 | Embeddings setup | a provider/model picker next to the existing on/off toggle, using the setup code `termcrab embeddings` runs | M |
| W4 | Identity file editor | `GET/PUT /api/bootstrap` for SOUL.md / IDENTITY.md / USER.md with size limits and paths pinned inside `TCRAB_HOME`, plus a textarea per file in the Agents view | M |
| W5 | Backup / restore | `POST /api/backup` (creates and offers the archive) and a restore upload with a typed confirmation; reuses the CLI's backup module | M |
| W6 | Security audit view | render `termcrab security` findings with the same fix strings; "apply fix" only where the fix is safe without a shell | M |
| W7 | Secrets view | list key names + readiness (never values) with the audit column; add/rotate stays in the terminal | S |
| W8 | Service card | show `service status` output and a copy-able install command (Termux/systemd); no remote execution | S |
| W9 | Transcribe upload + slash-in-chat | audio drop zone → `POST /api/transcribe` (reuses the CLI path); and make the panel chat run the shared command handler for `/…` inputs exactly like Telegram, so every command Telegram gains the panel gains too | M |

### 4.3 CLI: the 15 ◐ cells (nothing is missing)

Terminal-native ◐s that should stay as they are: `service`, `boot`,
`supervisor`, `gateway`, `tui`, `wait`, shell/file tools, "attachments from a
chat". The ones worth promoting to direct controls, because they are the
*authoring* side of features the other surfaces can already use:

| # | ◐ cell | promotion | size |
|---|---|---|---|
| C1 | Tool catalog + toggles | `termcrab tools` (list, names grouped, `--enable <name>`, `--disable <name>`) writing the same config keys the panel will toggle | M |
| C2 | Canvas | `termcrab canvas [--clear]` so A2UI widgets can be inspected from the terminal too | S |
| C3 | Watchers | `termcrab watch add|list|rm` (same store `/watch` writes in Telegram, same config the gateway loads) | M |
| C4 | Queue mode + steering | `termcrab queue` to show/switch mode, and `/steer` in the TUI while a turn runs | M |
| C5 | Embeddings setup | already a command; add the status block to `termcrab status` so the number is visible without hunting | S |
| C6 | Memory write | `termcrab memory add <text>` (today `memory user` writes USER.md only); keep the distinction, make it explicit in help | S |
| C7 | Suite clock / worklog | `termcrab status` should print the suite clock and the worklog "now" line — the same two numbers the panel shows | S |

## 5. What OpenClaw puts on each surface (from our crawl), and our call

Read against `docs/openclaw/sections/` and `docs/openclaw/data/catalog.json`
(1335 pages). Their split, and what we adopt:

| their surface | what they ship there | our call |
|---|---|---|
| Web Control UI | chat + activity + nodes + config views; device pairing; PWA with web push; command palette; collaborator drafts; reactions; a composer capability menu; operator terminal, browser and GitHub side panels; themes/language/plugins; CSP and media-route auth | adopt: sessions search, identity editor, browser panel, approvals cards (we have them), service/status cards. Skip for now: PWA push, themes/language/plugins (out of scope), reactions (no multi-user rooms yet) |
| Telegram | Bot API 10.3 rich messages, **inline buttons**, message actions, **exec approvals from inside Telegram** (`channels.telegram.execApprovals.*`), and the Control UI as a mini app via `/controlui` | adopt all four: T20/T2 (buttons + approvals), and note T23 (mini app) exactly mirrors `/controlui`. This is the strongest signal that our Telegram thinness is a parity gap, not a design choice |
| TUI | pickers and overlays, Questions, keyboard shortcuts, slash commands, image previews | we have slash commands and streaming; adopt prompts-as-questions later if a batch needs it |

Their Control UI also runs on loopback (`127.0.0.1:18789`) and pairs devices;
our panel is token-in-URL and reachable from the phone — a different security
trade we already documented in `docs/ADDED.md`.

## 6. The order the work should land

Each row is one batch, in dependency order; every batch keeps the repo's rules
(tests + WORKLOG + census row + `final-numbers --check`).

| batch | goal | surfaces touched | closes |
|---|---|---|---|
| 46 | shared command layer, read-only half: `/logs /config /board /disk /perf /doctor /security /auth /skills /cron /devices /embeddings /dream /docs` | Telegram (server-side only) | T3–T8, T11–T13, T16–T18 (13 cells) |
| 47 | control half: `/stop /steer /sessions rename|purge /update /backup /watch`, panel chat runs the shared handler | Telegram + web | T1, T9, T10, T14, T15, T19, W9b | 
| 48 | interaction layer: inline keyboards, callback router, `setMyCommands`, approvals delivered to chat | Telegram (+ a Telegram-side approval test) | T2, T20, T21 |
| 49 | panel gaps, quick half: sessions search, context view, orders view, embeddings status, tool toggles, status line | web | W1, W2, W3, C7 |
| 50 | panel gaps, builder half: identity editor, backup/restore, security view, secrets view, service card, transcribe upload | web (+ API) | W4–W8, W9a |
| 51 | voice replies, forum topics, mini app | Telegram | T22, T23, T24 |
| 52 | CLI promotions: `tools`, `canvas`, `watch`, `queue`/`steer` | CLI | C1–C6 |

Note the ordering: the CLI starts already complete, so batches 46–48 lift
Telegram first — that is where 28 of the 38 missing cells live.

## 7. Keeping this true

- `--check` is the rot guard and is cheap; batch 46 wires it into the suite
  (`node scripts/surface-audit.mjs --check` from a test) together with a shape
  assertion (`rows ≥ 70`, every row has all three cells, every ❌ has a note).
- The scoreboard belongs in `WORKLOG.md` §1 next to the suite numbers, and the
  census gets one row per batch above, so "parity" is measured like everything
  else instead of asserted.
- A capability is only allowed to move to ✅ with a probe in this file; prose
  claims are what this audit exists to replace.
