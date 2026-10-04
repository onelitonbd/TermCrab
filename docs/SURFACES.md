# Three surfaces, one product — the surface audit

*Written 2026-10-04 against the v0.76.2 tree, shipped with v0.77.0. Scope: the three surfaces the owner declared the
product — **CLI/TUI**, **Telegram**, **web panel**. The map was the map first;
batches 46–48 have since implemented the half of it they cover (see the
scoreboard below and `WORKLOG.md` §4).*

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
(`doctor`, `security`, `auth audit`, `backup`, `perf`, `context`, …).
**No missing cell**: 50 ✅, 15 ◐, 0 ❌. The ◐ cells are coarser controls, not
absent ones (queue modes are `config set agent.queueMode`, not a live control).

**Telegram — the surface that grew up.** The adapter
(`src/channels/telegram.ts`) handles long polling with `callback_query` in
`allowed_updates`, typing refresh, chunked HTML, documents out, files in,
**inline keyboards** and a registered **Bot menu**. Every text message goes
through `handleChannelMessage()` in `src/gateway/server.ts`, which since batch 46
calls one shared dispatcher (`src/gateway/chat-reports.ts` +
`src/gateway/chat-control.ts`) — so the chat understands **31 commands**
(`/help` shows them and `setMyCommands` registers them) and shares the exact
code the CLI and the panel's palette run. Approvals arrive as
`🔐 <tool> wants to run` with `✅ Allow` / `🚫 Deny` buttons that call the same
`resolveApproval()` as the panel and the CLI. Batch 51 closed the tail: the
suite clock and the work tracker answer as reports (`/suite-time`, `/work
[full]` — the whole file as a document), `/say` sends a **real voice note**
(`speakToFile()` → espeak/say → ffmpeg/opusenc → `sendVoice`), a voice message
gets a voice reply when `channels.telegram.voiceReplies` is on, `/embeddings
setup` runs behind an **inline confirm**, `/controlui` opens the panel as a
`web_app` button built from `gateway.publicUrl`, and a **forum topic** is its
own session (`telegram:<chatId>:<threadId>`). Was 24 ✅ / 28 ❌, then 45 ✅ / 7 ❌;
now **54 ✅, 12 ◐, 0 ❌** — batch 52 added the proposal decisions
(`/skills approve` answers with the proposal's own text and an inline **Approve**
button; reject/show/import work too) and `/cron add`.


**Web panel — the surface that caught up.** `ui/index.html` has 11 views
(`chat, status, board, providers, models, memory, tools, logs, debug, work,
settings`) and 61 `/api/*` endpoints, including things Telegram has never heard
of: approvals with Allow/Deny cards, devices, canvas, crons, skills, doctor with
fixes, perf, suite clock, worklog, docs. **51 ✅, 15 ◐, 0 ❌** — no missing cell.
Batch 52 added the views that were still "ask the chat": the **Inbox** (files people
sent, readable in place), **Rooms** (what was said while the bot was not addressed),
**Watchers** (add/remove), **tool switches** (the three config keys, flipped in
place), a **security scan** with its fixes, the **named secrets** (names only,
never a value), **rename/export/delete** on every chat row, and a **Speak** button
that downloads the last answer as OGG/Opus. Since batch 47 the chat box itself runs the shared dispatcher (`ui:!fromChat` →
`POST /api/slash`), so `/status` typed into the panel chat is a command, not a
prompt. Batch 49 closed the quick gaps (ranked **chat search**, the
**prompt-context report**, the **embedding-provider picker**, a **queue-mode chip
plus a steer box**); batch 50 closed the builder half — an **editor for
SOUL.md / IDENTITY.md / USER.md**, **backup + restore with a typed
confirmation**, a **service card** that names the exact install command, and a
**transcribe-upload** box that runs the same whisper path as the CLI.

**Shared backend, three doors.** Everything the CLI does is a library call
inside the same process the gateway runs; everything Telegram and the panel do
is an HTTP call into that process. So a parity implementation is almost never a
new engine — it is exposing an existing function through a second or third door.
Batches 46–48 proved the shape: one dispatcher, three callers.

## 2. Scoreboard
| surface | ✅ direct | ◐ narrower door | ❌ missing | — n/a |
|---|---|---|---|---|
| CLI / TUI | 51 | 14 | **0** | 6 |
| Telegram | 54 | 12 | **0** | 5 |
| Web panel | 58 | 8 | **0** | 5 |

**No row has a ❌ on any surface: 0 of 71 rows have at least one ❌.** Batch 51 closed the last seven (all Telegram),
and batch 52 walked the half-doors: the panel's inbox/rooms/watchers/tool switches/security/secrets,
session rename and export, a downloadable spoken reply, Telegram's proposal decisions and `cron add`,
and the CLI's `suite-time` / `work`. What is left is **34 named ◐ cells** (CLI 14 · Telegram 12 · Web 8),
each with its reason below — several deliberately so (a service install from a chat is a bad idea).

By area (rows each): gateway 17 · ops 12 · channels 9 · context 8 · tools 7 ·
sessions 5 · agent 4 · automation 4 · mobile 4 · skills 1.

## 3. The matrix

| area | capability | CLI | Telegram | Web | note |
|---|---|---|---|---|---|
| gateway | Chat: send text, stream the answer | ✅ | ✅ | ✅ |  |
| gateway | Stop a running turn | ✅ | ✅ | ✅ |  |
| gateway | Queue modes (steer/followup/collect/interrupt) | ◐ | ✅ | ✅ | config set agent.queueMode only |
| gateway | Approvals (human-in-the-loop) | ✅ | ✅ | ✅ |  |
| gateway | Devices: pair, list, revoke | ✅ | ✅ | ✅ |  |
| gateway | Presence: who can reach the agent now | ✅ | ✅ | ✅ |  |
| gateway | Usage/cost: tokens per day | ✅ | ✅ | ✅ |  |
| gateway | Run health: which turn is stuck | ✅ | ✅ | ✅ |  |
| gateway | Run identity + wait for a run | ✅ | — | ◐ | run ids are shown; no wait control |
| gateway | Events: what the bus emitted | ✅ | — | ✅ |  |
| gateway | Logs: console lines with levels | ✅ | ✅ | ✅ |  |
| gateway | Config: read and set | ✅ | ✅ | ✅ |  |
| gateway | Board: everything in flight | ✅ | ✅ | ✅ |  |
| gateway | Canvas / A2UI widgets | ◐ | ◐ | ✅ | the canvas tool the agent can call; no command |
| gateway | Multi-agent routing (@name, per-surface) | ✅ | ✅ | ✅ |  |
| gateway | Health/status at a glance | ✅ | ✅ | ✅ |  |
| gateway | Slash commands typed into the chat | ✅ | ✅ | ✅ |  |
| agent | Tool activity visible while it works | ✅ | ◐ | ✅ | only the typing indicator; tool names never shown |
| agent | Progress drafts / partial answers | ◐ | ◐ | ✅ | streams deltas; no draft markers |
| agent | Subagents: spawn, list, read results | ✅ | ◐ | ✅ | via sessions_spawn tool in chat |
| agent | Steering a live run | ◐ | ✅ | ✅ | config mode=steer only |
| sessions | List / switch conversations | ✅ | ✅ | ✅ |  |
| sessions | Search across conversations | ✅ | ✅ | ✅ |  |
| sessions | Show one transcript | ✅ | ✅ | ✅ |  |
| sessions | Rename / purge / export | ✅ | ✅ | ✅ |  |
| sessions | Start a fresh conversation | ✅ | ✅ | ✅ |  |
| context | Memory: browse what it knows | ✅ | ✅ | ✅ |  |
| context | Memory: search it | ✅ | ✅ | ✅ |  |
| context | Memory: write a fact by hand | ◐ | ◐ | ✅ | memory user <line> writes USER.md only |
| context | Dreaming / idle consolidation | ✅ | ✅ | ✅ |  |
| context | Context report: what the model is sent | ✅ | ✅ | ✅ |  |
| context | Embeddings: status | ✅ | ✅ | ✅ |  |
| context | Embeddings: setup / switch provider | ◐ | ✅ | ✅ | the install runs in the terminal; the provider switch exists here too |
| context | Identity files (SOUL/IDENTITY/USER bootstrap) | ✅ | ◐ | ✅ | "remember …" writes USER.md; SOUL/IDENTITY are not editable from chat |
| tools | Tool catalog: what the agent can do | ◐ | ◐ | ✅ | context lists schemas; no catalog command |
| tools | Tool toggles (enable/disable a tool) | ◐ | ◐ | ✅ | config set agent.allowExec etc. |
| tools | Shell / files / web tools in conversation | ◐ | ◐ | ◐ | the agent's own exec/read/web tools |
| tools | Browser automation | ✅ | ◐ | ◐ | agent tool in chat |
| tools | Image generation | ✅ | ◐ | ◐ | agent tool in chat |
| tools | Send a file back to a chat | ◐ | ✅ | ◐ | needs a channel to send into |
| tools | Document extraction (PDF/DOCX/XLSX in) | ◐ | ✅ | ◐ | no command; agent reads text files only |
| skills | Skills: list / import / create / proposals | ✅ | ✅ | ✅ |  |
| automation | Cron jobs: list / add / run | ✅ | ✅ | ✅ |  |
| automation | Heartbeat: run a self-check now | ✅ | ✅ | ✅ |  |
| automation | Watchers / file triggers | ◐ | ✅ | ✅ | config set only |
| automation | Standing orders | ✅ | ✅ | ✅ |  |
| mobile | Dictation (speech → text) | ✅ | ✅ | ✅ |  |
| mobile | Text to speech | ✅ | ✅ | ✅ |  |
| mobile | Transcribe a voice file | ✅ | ✅ | ✅ |  |
| mobile | Wake word loop | ✅ | — | ✅ |  |
| ops | Doctor: find and fix problems | ✅ | ✅ | ✅ |  |
| ops | Update: check / apply / rollback | ✅ | ◐ | ✅ | check from chat; apply is terminal-only until the confirm lands (48) |
| ops | Backup / restore the home | ✅ | ✅ | ✅ |  |
| ops | Disk usage | ✅ | ✅ | ✅ |  |
| ops | Install as a service | ✅ | — | ◐ | the card shows status + the exact command; installing stays in a terminal on purpose |
| ops | Boot autostart (Termux:Boot) | ✅ | — | ✅ |  |
| ops | Security audit (findings + fixes) | ✅ | ✅ | ✅ |  |
| ops | Secrets: named keys, audit | ✅ | ✅ | ✅ |  |
| ops | Performance budget + history | ✅ | ✅ | ✅ |  |
| ops | Suite clock (the tests' own record) | ✅ | ✅ | ✅ |  |
| ops | Work tracker: what is being built now | ✅ | ✅ | ✅ |  |
| ops | Docs: the offline manual | ✅ | ✅ | ✅ |  |
| channels | Rooms: what was said while unaddressed | ✅ | ✅ | ✅ |  |
| channels | Inbox: files people sent | ◐ | ✅ | ✅ | inbox_list/read tools in a turn |
| channels | Typing indicator | — | ✅ | ✅ |  |
| channels | Media in / out (photos, voice, files) | ◐ | ✅ | ◐ | in: attach only in the panel |
| channels | Telegram inline buttons (rich messages) | — | ✅ | — |  |
| channels | Registered Telegram command menu (setMyCommands) | — | ✅ | — |  |
| channels | Panel inside Telegram (mini app) | — | ✅ | — |  |
| channels | Voice replies in Telegram | — | ✅ | — |  |
| channels | Group / forum topics → separate sessions | — | ✅ | — |  |

## 4. Gap register — what is missing where, and how each one gets built

### 4.0 Closed by batches 46–48 (kept here so the register stays an audit trail)

| id | cell | closed by | how it works now |
|---|---|---|---|
| T1/T10/C4 | `/stop`, `/steer`, queue modes | 47 | `src/gateway/chat-control.ts` drives the same `SessionQueue` the panel and CLI use; `/queue` prints the four modes and saves `agent.queueMode` |
| T2/T20 | Approvals + inline buttons | 48 | `sendMessage(…, buttons)` → `reply_markup.inline_keyboard`; a pending approval for a `telegram:<chatId>` session goes out with `✅ Allow`/`🚫 Deny` calling `resolveApproval(id, …, 'telegram')` |
| T4–T8, T11–T13, T16–T18 | the read-only reports | 46 | `/logs /config /board /disk /perf /doctor /security /auth /devices /embeddings /dream /docs /skills /cron` all resolve through `runReportCommand()` in `src/gateway/chat-reports.ts` |
| T9 | `/sessions rename|purge` | 47 | same store the terminal writes; purge needs days ≥ 1 and reports what it removed |
| T14 (half) | `/update` | 47 | `check` works from chat; `apply` still refuses and names the terminal |
| T15 | `/backup` | 47 | writes `$TCRAB_HOME/backups/backup-<ts>.tar.gz` and sends it as a document |
| T19/C3 | watchers | 47 | `/watch add|list|rm` persists `config.watchers` |
| T21 | Bot command menu | 48 | `setMyCommands(CHAT_COMMANDS)` at gateway start, tolerated when the API refuses |
| W9 (half) | slash commands in the panel chat | 47 | the chat box posts `ui:!fromChat` to `POST /api/slash` and renders the answer |
| W1 | search across conversations | 49 | `GET /api/sessions?q=` runs the same ranked search as `termcrab sessions search` (snippets included) and the Chats tab asks for it |
| W2 | context report | 49 | `GET /api/context` serves the same `contextReport()` the CLI prints; the Debug view renders sections biggest-first |
| W3 | embedding provider | 49 | `GET/POST /api/embeddings` reads `embeddingsStatus()` and writes `memory.embedProvider`; the install runs as one background job the picker polls |
| C4 (half) | queue mode + steer | 49 | `/api/queue` and `/api/steer` call the same `queueCommand()`/`steerCommand()` the chat dispatcher serves; the composer gets a mode chip and a steer box that appears while a turn runs |
| W4 | identity editor | 50 | `GET/PUT /api/bootstrap` maps a *name* (SOUL.md / IDENTITY.md / USER.md) to a fixed path inside the home, 32 KB cap, and the Settings view has a textarea per file |
| W5 | backup / restore | 50 | `POST /api/backup` reuses `writeBackup()`; `GET /api/backups` lists archives; `POST /api/restore` takes a dry-run first and needs the archive name typed back before `restoreBackup()` moves the current files aside |
| W8 | service card | 50 | `GET /api/service` serves `serviceStatus()` + the plan and the exact command; the panel never executes it |
| W9b | transcribe upload | 50 | `POST /api/transcribe` writes the bytes inside `$TCRAB_HOME/state/uploads` and calls the same `transcribeFile()` the CLI does |

### 4.0b Closed by batch 52 — the half-doors (Web 7 + Telegram 2 + CLI 1)

| id | cell | how it works now |
|---|---|---|
| W10 | panel inbox | `GET /api/inbox` + `GET /api/inbox/:name` (name-guarded, same store the `inbox_list` tool reads); the Work view lists and reads |
| W11 | panel rooms | `GET /api/rooms` + `GET /api/rooms/:channel/:room`; the Work view lists what was said while unaddressed |
| W12 | panel watchers | `GET|POST /api/watchers` adds/removes the same `config.watchers` entries `/watch` and `config set` write |
| W13 | tool switches | `POST /api/tools/toggle` → `agent.allowExec` / `allowBrowser` / `allowCodeExec`; the Tools tab renders the three checkboxes |
| W14 | security view | `GET /api/security` → the same findings-with-fixes the chat's `/security` prints; Settings renders them |
| W15 | secrets view | `GET /api/secrets` → names and timestamps only; the Settings card appends them under the masked config keys |
| W16/W17 | rename / export on the rail | the routes existed since v0.5 (the audit's "no rename/export" note was stale — `test/p1.test.ts` proves it); batch 52 wired the chats rail to them and Export now downloads the markdown the route returns |
| W18 | a spoken reply, downloaded | `POST /api/voice` → OGG/Opus bytes (422 + install hint without an engine); the composer's Speak button downloads them |
| T25 | proposal decisions | `/skills approve <name>` shows the proposal and an inline Approve button (`skills:approve:` → `approveProposal()`); `/skills reject|show|import` and `/cron add "…" …` resolve through the shared dispatcher |
| C8 | CLI suite clock + tracker | `termcrab suite-time` and `termcrab work [--full]`, both with `--json` envelopes |

### 4.1 Closed by batch 51 — Telegram's tail (the last seven ❌ in the audit)

| id | cell | how it works now |
|---|---|---|
| T18b | `/suite-time` | `suiteTimeReport()` reads the same `suite-time.json` the panel's `/api/suite-time` serves: wall clock, cases, files, the slowest three, the budget, and a warning when the recorded run was over it — clamped like every chat report |
| T18c | `/work` | `workReport()` renders WORKLOG.md's **Now** and **Next** blocks (bullets *and* table rows, evidence column left to the file); `/work full` attaches the whole tracker as a document through `sendDocument()` |
| T8 | `/embeddings setup` | a description of the install, then an inline **Install and probe** button; the `emb:setup` callback runs the CLI's own `embeddingsSetup()` and reports its steps — nothing installs before the press |
| T22 | Voice replies | a voice note in, a voice note back when `channels.telegram.voiceReplies` is on (default off; the key is in the chat's `/config` whitelist). The reply is spoken up to 600 characters, the rest goes out as text, and a machine with no engine keeps the words plus the install hint |
| T22b | `/say` | `/say <text>` → `speakToFile()` (espeak/say → ffmpeg/opusenc) → `sendVoice`; OGG/Opus as a voice note, anything else as a document, and never at the cost of the text |
| T23 | Mini app | `/controlui` sends the panel address with an inline `web_app` button when `gateway.publicUrl` is set; with no address — or a loopback one — it refuses in plain words and names the exact config line |
| T24 | Forum topics | `message_thread_id` travels with the message (`IncomingContext`) and keys the session through `telegramSessionKey()` as `telegram:<chatId>:<threadId>`; scoping `user` still keys by person, and a plain group's key is unchanged |

Narrower doors that stay (not ❌ because the surface *can* carry them and the
door is named): `/update apply` (terminal on purpose until an inline confirm
exists), `/skills` approve (terminal keeps the write), `/cron` add (panel or
terminal), tool-output visibility, drafts.

### 4.2 Web panel: nothing is missing — the 8 cells that stay ◐

Read back out of the probes (`--json`), not from memory: the web column has
**no ❌ left**, and exactly these eight cells are ◐, each because the *thing
itself* is a conversational or device-bound act rather than a missing door:

| # | ◐ cell | why ◐, and what the panel does have |
|---|---|---|
| W19 | run identity + wait for a run | the run's id and "wait for it to finish" are terminal verbs; the panel shows run health and the live stream instead |
| W20 | shell / files / web tools in conversation | the agent runs them inside a chat turn; the panel renders the tool cards, the switches and the results — it does not offer a raw shell |
| W21 | browser automation | same shape: the tool card and the `allowBrowser` switch are in the panel; driving a browser by hand is not a chat-side act |
| W22 | image generation | the agent's `image` tool runs in a turn; a generate-my-own-image button arrives with batch 53.5 |
| W23 | sending a file back to a chat | the direction the *agent* takes (attachment out); the panel downloads what arrives |
| W24 | document extraction (PDF/DOCX/XLSX in) | batch 53.5 puts the upload in the panel; today the CLI and the chat intake do it |
| W25 | installing as a service | `GET /api/service` serves the status and the exact command; the panel never installs anything on your machine by itself |
| W26 | media in / out (photos, voice, files) | the panel's own upload/download is there (transcribe, backup, voice, attachments); what is missing is the *chat*-shaped media loop of a phone app — batch 53.5 |

Two names that used to sit on this list (`schema`, `orders`) are not cells at
all any more: both answer from the panel chat through the shared dispatcher,
and the audit scores "can a person reach it from this surface" — typing
`/schema` counts.

### 4.3 CLI: the 14 ◐ cells, and what batch 53 does about them

Same read-back, same source. Three of these are terminal-native and should
stay ◐ — `tui`, `supervisor`/`gateway`/`wait`, and "send a file back to a
chat" (the CLI has no chat to send into; `/say` and Telegram's document path
are the real doors). The other eleven are the *authoring* side of capabilities
the panel and Telegram already reach, and they are batch 53's queue:

| # | ◐ cell | what batch 53 writes | step |
|---|---|---|---|
| C1 | tool catalog | `termcrab tools` lists the catalog grouped by class (`--json`), so what the panel shows is readable on a phone terminal | 53.1 |
| C2 | tool toggles | `termcrab tools --enable <name>` / `--disable <name>` writing `agent.allowExec` / `allowBrowser` / `allowCodeExec` — the same keys the panel's checkboxes write | 53.1 |
| C3 | watchers | `termcrab watch add|list|rm` on the same `config.watchers` store `/watch` and the panel's Tools card use | 53.1 |
| C4 | canvas / A2UI | `termcrab canvas [--clear]` renders the current widget tree as text | 53.2 |
| C5 | queue modes | `termcrab queue [steer|followup|collect|interrupt]` shows/switches the mode the panel's picker and `/queue` write | 53.3 |
| C6 | steering a live run | `termcrab steer <text>` against the running gateway session | 53.3 |
| C7 | progress drafts | `--drafts` on the CLI chat shows partial answers the way the panel already renders them | 53.3 |
| C8 | inbox | `termcrab inbox [<name>]` reads `$TCRAB_HOME/inbox` — the same store the panel's Work view lists | 53.5 |
| C9 | memory: write a fact | `termcrab memory add <text>` (today `memory user` writes USER.md only; the distinction stays, and help says so) | 53.4 |
| C10 | document extraction | `termcrab extract <file.pdf|.docx|.xlsx>` printing the text the intake path already computes | 53.5 |
| C11 | embeddings setup | the status block joins `termcrab status`, so the number is visible without hunting | 53.4 |

Telegram's twelve ◐ cells get the same treatment in the same batch, one row
per cell in `WORKLOG.md` §3 — the register and the queue are the same list.

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
Each row was one batch, in dependency order; every batch keeps the repo's rules
(tests + WORKLOG + census row + `final-numbers --check`).

| batch | goal | surfaces touched | closes | state |
|---|---|---|---|---|
| 46 | shared command layer, read-only half | Telegram + web | T4–T8, T11–T13, T16–T18 | **done** |
| 47 | control half + slash in the panel chat | Telegram + web | T1, T9, T10, T14 (half), T15, T19, W9 (half) | **done** |
| 48 | inline keyboards, callbacks, `setMyCommands`, approvals in chat | Telegram | T2, T20, T21 | **done** |
| 49 | panel gaps, quick half: sessions search, context view, embeddings picker, queue/steer | web | W1, W2, W3, C4 (half) | **done** |
| 50 | panel gaps, builder half: identity editor, backup/restore, service card, transcribe upload | web (+ API) | W4, W5, W8, W9b | **done** |
| 51 | voice replies, `/say`, `/suite-time`, `/work`, `/embeddings setup`, mini app, forum topics | Telegram | T8, T18b, T18c, T22, T22b, T23, T24 | **done** |
| 52 | the named ◐s: panel inbox/rooms/watchers/tool toggles, panel security+secrets, Telegram skills/cron authoring, CLI `suite-time`/`work`, session rename/export | web + Telegram + CLI | the half-doors in §4.0b | **done** |
| 53 | the ◐s that are still half-doors: tool catalog on CLI/Telegram, canvas, live runs (queue/steer/tool activity), memory write everywhere, media downloads | CLI + Telegram + web | the rest of §3's ◐ cells | next |

Note the ordering: the CLI started complete, so 46–48 lifted Telegram — that is
where 28 of the 38 missing cells lived. Batches 49–50 closed the web row, 51 the
Telegram tail (the ❌ register is empty on all three since), 52 the first slice
of the ◐s. Batch 53 takes the rest; what remains after it must be a deliberate
"narrower door" note, never a hole.

## 7. Keeping this true

- `--check` is the rot guard and is cheap; batch 46 wires it into the suite
  (`node scripts/surface-audit.mjs --check` from a test) together with a shape
  assertion (`rows ≥ 70`, every row has all three cells, every ❌ has a note).
- The scoreboard belongs in `WORKLOG.md` §1 next to the suite numbers, and the
  census gets one row per batch above, so "parity" is measured like everything
  else instead of asserted.
- A capability is only allowed to move to ✅ with a probe in this file; prose
  claims are what this audit exists to replace.
