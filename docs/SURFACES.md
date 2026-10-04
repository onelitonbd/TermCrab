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
`src/gateway/chat-control.ts`) — so the chat understands **27 commands**
(`/help` shows them and `setMyCommands` registers them) and shares the exact
code the CLI and the panel's palette run. Approvals arrive as
`🔐 <tool> wants to run` with `✅ Allow` / `🚫 Deny` buttons that call the same
`resolveApproval()` as the panel and the CLI. Was 24 ✅ / 28 ❌; now **45 ✅,
14 ◐, 7 ❌**.

**Web panel — the good surface with fewer holes.** `ui/index.html` has 11 views
(`chat, status, board, providers, models, memory, tools, logs, debug, work,
settings`) and 61 `/api/*` endpoints, including things Telegram has never heard
of: approvals with Allow/Deny cards, devices, canvas, crons, skills, doctor with
fixes, perf, suite clock, worklog, docs. **51 ✅, 15 ◐, 0 ❌** — no missing cell.
Since batch 47 the chat box itself runs the shared dispatcher (`ui:!fromChat` →
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
| CLI / TUI | 50 | 15 | **0** | 6 |
| Telegram | 45 | 14 | **7** | 5 |
| Web panel | 51 | 15 | **0** | 5 |

7 of 71 rows have at least one ❌, and **every one of them is Telegram**: `/suite-time`,
`/work`, `/embeddings setup`, voice replies, `/say`, the mini app and forum
topics — batch 51's whole scope. The web panel has no missing cell left.

By area (rows each): gateway 17 · ops 12 · channels 9 · context 8 · tools 7 ·
sessions 5 · agent 4 · automation 4 · mobile 4 · skills 1.

## 3. The matrix

| area | capability | CLI | Telegram | Web | note |
|---|---|---|---|---|---|
| gateway | Chat: send text, stream the answer | ✅ | ✅ | ✅ |  |
| gateway | Stop a running turn | ✅ | ✅ | ✅ |  |
| gateway | Queue modes (steer/followup/collect/interrupt) | ◐ | ✅ | ✅ | cli: config set agent.queueMode only |
| gateway | Approvals (human-in-the-loop) | ✅ | ✅ | ✅ |  |
| gateway | Devices: pair, list, revoke | ✅ | ✅ | ✅ |  |
| gateway | Presence: who can reach the agent now | ✅ | ✅ | ✅ |  |
| gateway | Usage/cost: tokens per day | ✅ | ✅ | ✅ |  |
| gateway | Run health: which turn is stuck | ✅ | ✅ | ✅ |  |
| gateway | Run identity + wait for a run | ✅ | — | ◐ | tg: this surface cannot carry it by nature; web: run ids are shown; no wait control |
| gateway | Events: what the bus emitted | ✅ | — | ✅ | tg: this surface cannot carry it by nature |
| gateway | Logs: console lines with levels | ✅ | ✅ | ✅ |  |
| gateway | Config: read and set | ✅ | ✅ | ✅ |  |
| gateway | Board: everything in flight | ✅ | ✅ | ✅ |  |
| gateway | Canvas / A2UI widgets | ◐ | ◐ | ✅ | cli: the canvas tool the agent can call; no command; tg: the agent can call canvas; nothing renders in Telegram |
| gateway | Multi-agent routing (@name, per-surface) | ✅ | ✅ | ✅ |  |
| gateway | Health/status at a glance | ✅ | ✅ | ✅ |  |
| gateway | Slash commands typed into the chat | ✅ | ✅ | ✅ |  |
| agent | Tool activity visible while it works | ✅ | ◐ | ✅ | tg: only the typing indicator; tool names never shown |
| agent | Progress drafts / partial answers | ◐ | ◐ | ✅ | cli: streams deltas; no draft markers; tg: the reply arrives whole; no live edit |
| agent | Subagents: spawn, list, read results | ✅ | ◐ | ✅ | tg: via sessions_spawn tool in chat |
| agent | Steering a live run | ◐ | ✅ | ✅ | cli: config mode=steer only |
| sessions | List / switch conversations | ✅ | ✅ | ✅ |  |
| sessions | Search across conversations | ✅ | ✅ | ✅ |  |
| sessions | Show one transcript | ✅ | ✅ | ✅ |  |
| sessions | Rename / purge / export | ✅ | ✅ | ◐ | web: purge exists; no rename/export |
| sessions | Start a fresh conversation | ✅ | ✅ | ✅ | web: the chat resets the session; the palette keeps its view action |
| context | Memory: browse what it knows | ✅ | ✅ | ✅ |  |
| context | Memory: search it | ✅ | ✅ | ✅ |  |
| context | Memory: write a fact by hand | ◐ | ◐ | ✅ | cli: memory user <line> writes USER.md only; tg: say "remember …" and the agent calls the tool |
| context | Dreaming / idle consolidation | ✅ | ✅ | ✅ |  |
| context | Context report: what the model is sent | ✅ | ✅ | ✅ |  |
| context | Embeddings: status | ✅ | ✅ | ✅ |  |
| context | Embeddings: setup / switch provider | ◐ | ❌ | ✅ | cli: the install runs in the terminal; the provider switch exists here too; tg: not available |
| context | Identity files (SOUL/IDENTITY/USER bootstrap) | ✅ | ◐ | ✅ | tg: "remember …" writes USER.md; SOUL/IDENTITY are not editable from chat |
| tools | Tool catalog: what the agent can do | ◐ | ◐ | ✅ | cli: context lists schemas; no catalog command; tg: ask in chat and the agent answers |
| tools | Tool toggles (enable/disable a tool) | ◐ | ◐ | ◐ | cli: config set agent.allowExec etc.; tg: config only; web: catalog shows active/planned; no toggle |
| tools | Shell / files / web tools in conversation | ◐ | ◐ | ◐ | cli: the agent's own exec/read/web tools; tg: the agent's own tools in a turn; web: the agent's own tools in a turn |
| tools | Browser automation | ✅ | ◐ | ◐ | tg: agent tool in chat; web: agent tool in chat; no browser panel |
| tools | Image generation | ✅ | ◐ | ◐ | tg: agent tool in chat; web: agent tool in chat; no button |
| tools | Send a file back to a chat | ◐ | ✅ | ◐ | cli: needs a channel to send into; web: send_file reaches the panel as a path, not a download |
| tools | Document extraction (PDF/DOCX/XLSX in) | ◐ | ✅ | ◐ | cli: no command; agent reads text files only; web: attach accepts text types only |
| skills | Skills: list / import / create / proposals | ✅ | ◐ | ✅ | tg: list + proposals; approve/import stay in the terminal |
| automation | Cron jobs: list / add / run | ✅ | ◐ | ✅ | tg: list; adding stays in the terminal or the panel |
| automation | Heartbeat: run a self-check now | ✅ | ✅ | ✅ |  |
| automation | Watchers / file triggers | ◐ | ✅ | ◐ | cli: config set only; web: presence counts them; nothing to edit |
| automation | Standing orders | ✅ | ✅ | ✅ |  |
| mobile | Dictation (speech → text) | ✅ | ✅ | ✅ |  |
| mobile | Text to speech | ✅ | ❌ | ✅ | tg: no voice replies from the bot |
| mobile | Transcribe a voice file | ✅ | ✅ | ✅ |  |
| mobile | Wake word loop | ✅ | — | ✅ | tg: this surface cannot carry it by nature |
| ops | Doctor: find and fix problems | ✅ | ✅ | ✅ |  |
| ops | Update: check / apply / rollback | ✅ | ◐ | ✅ | tg: check from chat; apply is terminal-only until the confirm lands (48) |
| ops | Backup / restore the home | ✅ | ✅ | ✅ |  |
| ops | Disk usage | ✅ | ✅ | ✅ |  |
| ops | Install as a service | ✅ | — | ◐ | tg: this surface cannot carry it by nature; web: the card shows status + the exact command; installing stays in a terminal on purpose |
| ops | Boot autostart (Termux:Boot) | ✅ | — | ✅ | tg: this surface cannot carry it by nature; web: a "Start at boot" button with termux detection |
| ops | Security audit (findings + fixes) | ✅ | ✅ | ◐ | web: the shared text is served, but no panel view yet (batch 50) |
| ops | Secrets: named keys, audit | ✅ | ✅ | ◐ | web: names via /api/slash; no panel view yet (batch 50) |
| ops | Performance budget + history | ✅ | ✅ | ✅ |  |
| ops | Suite clock (the tests' own record) | ◐ | ❌ | ✅ | cli: npm run test:time; not a termcrab command; tg: not available |
| ops | Work tracker: what is being built now | ✅ | ❌ | ✅ | cli: termcrab owner + scripts/status.mjs; tg: not available |
| ops | Docs: the offline manual | ✅ | ✅ | ✅ |  |
| channels | Rooms: what was said while unaddressed | ✅ | ✅ | ◐ | web: room_history tool in chat; no view |
| channels | Inbox: files people sent | ◐ | ✅ | ◐ | cli: inbox_list/read tools in a turn; web: tools in chat; no inbox view |
| channels | Typing indicator | — | ✅ | ✅ | cli: this surface cannot carry it by nature |
| channels | Media in / out (photos, voice, files) | ◐ | ✅ | ◐ | cli: in: attach only in the panel; web: in: attach (text types); out: send_file as a path |
| channels | Telegram inline buttons (rich messages) | — | ✅ | — | cli: this surface cannot carry it by nature; web: this surface cannot carry it by nature |
| channels | Registered Telegram command menu (setMyCommands) | — | ✅ | — | cli: this surface cannot carry it by nature; web: this surface cannot carry it by nature |
| channels | Panel inside Telegram (mini app) | — | ❌ | — | cli: this surface cannot carry it by nature; tg: OpenClaw has /controlui; we do not; web: this surface cannot carry it by nature |
| channels | Voice replies in Telegram | — | ❌ | — | cli: this surface cannot carry it by nature; tg: the bot replies in text only; web: this surface cannot carry it by nature |
| channels | Group / forum topics → separate sessions | — | ❌ | — | cli: this surface cannot carry it by nature; tg: no forum-topic routing; group rooms only; web: this surface cannot carry it by nature |

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

### 4.1 Telegram: the 7 cells left

| # | missing cell | how it gets built | batch |
|---|---|---|---|
| T18b | `/suite-time` — the tests' own clock | one more report line from `scripts/suite-time.mjs`'s record, same clamp | 51 |
| T18c | `/work` — the work tracker | render `WORKLOG.md`'s Now block as ≤ 24 lines; a `/work full` that sends the file as a document | 51 |
| T8 | `/embeddings setup` — switch provider | the provider list the CLI prints, then a two-step: bot shows a keyboard, tapping a provider asks for confirmation and writes the same config | 51 |
| T22 | Voice replies | `sendVoice` (already in the API seam) for `/say` and for replies to voice messages when `voice.replyWithVoice` is on; OGG/Opus via the existing TTS chain | 51 |
| T23 | Panel inside Telegram (mini app) | `/controlui` returns the panel URL when `gateway.publicUrl` is set, as an inline `web_app` button; refuses plainly when it is not | 51 |
| T24 | Forum topics → separate sessions | key the session by `message_thread_id` when present (`telegram:<chatId>:<threadId>`) so each topic is its own conversation | 51 |
| T22b | `/say` shortcut in chat | `/say <text>` → `sendVoice`; `/say off` for text again | 51 |

Narrower doors that stay (not ❌ because the surface *can* carry them and the
door is named): `/update apply` (terminal on purpose until an inline confirm
exists), `/skills` approve (terminal keeps the write), `/cron` add (panel or
terminal), tool-output visibility, drafts.

### 4.2 Web panel: nothing is missing

The web row has **no ❌ left**. The remaining ◐ cells are named doors, not holes:
native dictation vs the wake loop, tool toggles (a batch-52 CLI promotion), the
security/secrets text that already arrives in the panel chat, and `rooms` /
`schema` (rarely needed, and both answer from chat).

### 4.3 CLI: the 15 ◐ cells (nothing is missing)

Terminal-native ◐s that should stay as they are: `service`, `boot`,
`supervisor`, `gateway`, `tui`, `wait`, shell/file tools, "attachments from a
chat". The ones worth promoting to direct controls, because they are the
*authoring* side of features the other surfaces can already use:

| # | ◐ cell | promotion | batch |
|---|---|---|---|
| C1 | Tool catalog + toggles | `termcrab tools` (list, names grouped, `--enable <name>`, `--disable <name>`) writing the same config keys the panel toggles | 52 |
| C2 | Canvas | `termcrab canvas [--clear]` so A2UI widgets can be inspected from the terminal too | 52 |
| C3 | Watchers | `termcrab watch add|list|rm` (same store `/watch` writes in Telegram, same config the gateway loads) | 52 |
| C4 | Queue mode + steering | `termcrab queue` to show/switch mode, and `/steer` in the TUI while a turn runs | 52 |
| C5 | Embeddings setup | already a command; add the status block to `termcrab status` so the number is visible without hunting | 52 |
| C6 | Memory write | `termcrab memory add <text>` (today `memory user` writes USER.md only); keep the distinction, make it explicit in help | 52 |
| C7 | Suite clock / worklog | `termcrab status` should print the suite clock and the worklog "now" line — the same two numbers the panel shows | 52 |

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
| 51 | voice replies, `/say`, `/suite-time`, `/work`, `/embeddings setup`, mini app, forum topics | Telegram | T8, T18b, T18c, T22, T22b, T23, T24 | next |
| 52 | CLI promotions: `tools`, `canvas`, `watch`, `queue`/`steer`, memory add, status numbers | CLI | C1–C7 | queued |

Note the ordering: the CLI started complete, so 46–48 lifted Telegram — that is
where 28 of the 38 missing cells lived. Batches 49–50 close the web row, 51 the
Telegram tail, 52 the CLI ◐s. After 52 every ✅/◐ in §3 must be a deliberate
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
