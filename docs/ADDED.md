# Everything added to TermCrab — start to finish

One inventory of what was built, from the first commit (2026-09-29) to `v0.78.0` (2026-10-04).
Ordered by the project's own record, not by memory: **118 commits · 99 releases · 52 batches**.

**How to verify any line below** — every claim here has a source you can open:

| Source | What it proves |
|---|---|
| `CHANGELOG.md` | release by release, in prose, newest first |
| `WORKLOG.md` §4 | batch by batch: commit hash, what changed, the test that pins it, the numbers |
| `git log --oneline` | the commits themselves |
| `docs/openclaw/*` | the census (what beats OpenClaw, row by row) and the beat plan |
| `node scripts/status.mjs` | the tracker is fresh and the queue is empty |

Scope note: the **three surfaces** are Telegram, the web panel and the terminal UI. Other adapters
(Discord, Slack, Signal, WhatsApp, SMS, Matrix) exist, are tested, and are deliberately *out of scope* —
18 census rows measure them and say so.

---

## 1. The foundation — `0.1.0` (2026-09-29)

The day-one skeleton, all of which still stands:

- **Gateway** — HTTP API + SSE event stream, loopback bind, constant-time token auth, PID file, health endpoint.
- **Agent loop** — provider-agnostic tool calling (Anthropic, OpenAI-compatible, offline mock), per-session JSONL transcripts with a rolling window, run timeouts.
- **Tools** — `exec` (policy-gated, Termux-aware shell resolver), `read_file`, `write_file`, `list_dir` (root-bounded), `web_fetch`, `load_skill`, `remember`, `search_memory`, `get_time`.
- **Skills** — `SKILL.md` folders with frontmatter, progressive-disclosure prompt index, user overrides, 4 bundled skills.
- **Memory** — `MEMORY.md` + daily logs + lexical search.
- **Channels** — web control UI (mobile-first, SSE), CLI REPL, Telegram (allowlist, HTML escape, chunking, offline outbox).
- **Mobile layer** — Android bionic guard, battery-adaptive heartbeat, offline outbox, supervisor watchdog, Termux:Boot installer, `doctor`.
- **Onboard** — interactive wizard + scriptable `--non-interactive` flags.
- **Quality from day one** — 33 tests, strict TypeScript, zero runtime dependencies, CI workflow in the tree.

## 2. The first day, release by release — `0.2.0` → `0.9.0`

- `0.2.0` **Daily driver** — SSE token streaming; dependency-free 5-field cron (lists, ranges, `@daily`); skills importer (`termcrab skills import <folder|git-url>`); Android ongoing notification + per-run alerts; session picker in the panel.
- `0.3.0` **Where the users live** — WhatsApp channel (optional, core stays zero-dep); multi-agent profiles (`workspace/agents/<name>/SOUL.md`); cron management UI; voice out (`termcrab say`, backend chain termux-tts-speak → espeak-ng → espeak → spd-say → say); local-model docs.
- `0.4.0` **Smarter crab** — tiered inference (`localProvider` block); "dreaming" memory consolidation + hourly gateway dream; hybrid embedding search (optional transformers.js); voice wake loop (`termcrab wake`); launch kit.
- `0.4.1`–`0.4.4` — embeddings taste-tested; human-facing polish; trust & upkeep; voice memo verdicts.
- `0.5.0` **Bring your old setup** — `termcrab import openclaw`: preview-first, keys masked in every report.
- `0.6.0` **You're in the driver's seat** — wake loop in the panel with live events; three-step setup wizard; "Check for updates" button.
- `0.7.0` **The nice-to-haves** — dream history; chats panel with size/date + export; `skills new` skeleton writer; agent starter templates; `embeddings status|setup`; `docs/REMOTE.md` (Tailscale/Cloudflare/SSH).
- `0.8.0` **Voice memos & verdicts** — `termcrab transcribe <file>` (whisper.cpp); `docs/SPIKES.md` with the four P2 verdicts and evidence; `CONTRIBUTING.md` with the one-time CI step.
- `0.9.0` **Mobile control panel, redesigned** — phone-first: bottom tabs in the thumb zone, 44–48 px targets, safe-area aware, light "shore station" theme, chat sheets for the token gate and setup, **zero emojis** (clean line-art SVG crab), single-file UI, no dependencies.

## 3. The panel era — `0.10.0` → `0.26.0`

Roughly fifteen releases of front-end work, all against the same single-file, dependency-free panel:

- `0.10.0` OpenClaw look with TermCrab soul · `0.11.0` sidebar navigation + chat history · `0.12.0` three-dot menu, current-chat in the top bar · `0.13.0` every screen has its own address (deep links).
- `0.14.0` chat front and centre · `0.15.0`/`0.15.1` update yourself from the panel · `0.16.0` GitHub-dark theme + real markdown rendering.
- `0.17.0` composer + providers · `0.18.0` providers stay in sync · `0.19.0` black theme, icon sidebar, smarter composer · `0.20.0`/`0.20.1` models page + composer model picker, current provider shows your own name · `0.21.0`–`0.21.2` save button, visible model icon, saving actually reaches the backend.
- `0.22.0` memory page redesign · `0.23.0` homepage becomes the agent's home · `0.23.1` no more silent empty replies · `0.24.0` tools page redesign · `0.25.0`/`0.25.1` tools catalog tab + toggle fix · `0.26.0` every catalog tool became real.

## 4. The batch era — batches `1` → `52`

This is where every change starts carrying a proof: a commit, a test, and a number. One line per batch.

| Batch | Commit | What was added |
|---|---|---|
| 1 | `f1c86b8`, `df69070` | Install stops silently building; config-file watcher stops leaking; the suite gets a 60 s/test bound (a leak probe went from a cancelled 30 023 ms to 36.2 ms). |
| 2 | `0ff408b` | The panel token enforced on **every** `/api/*` route; webhook tokens compared in constant time; offline `--demo` brain restored; census + tracker corrected. |
| 3 | `dd37e60` | **Work tracking**: `WORKLOG.md` + `scripts/status.mjs` + panel **Work** page; a commit that skips the tracker fails the suite. |
| 4 | `8ccb8fd` | **Beat plan**: head-to-head vs OpenClaw, every claim cited, kill list included — the document that drives batch order. |
| 5 | `5fe6651` | **The queue**: one lane per session, all four modes real (`followup`, `steer`, `collect`, `interrupt`), truthful lengths, capped backlog. |
| 6 | `4dd35be` | **The approval gate**: consulted before dispatch, over SSE, timeout + default policy, answerable from the panel card or `termcrab approvals`. |
| 7 | `4562b6c` | **Memory that does not forget**: newest-first budgeted prompt facts with sources; compaction writes a digest and archives instead of deleting. |
| 8 | `f1283d9` | **One writer per transcript**: writer lock with heartbeat, stale-claim reclaim, torn-tail healing; every channel runs through the per-session lane. |
| 9 | `b3be527` | **Usage, measured**: providers parse `usage`, the loop sums it per turn, `usage/<day>.jsonl` is the meter, `/api/usage` + `termcrab usage` + a panel footer. |
| 10 | `31cdf32` | **Tier-0 sweep**: config validation before hot-apply, run ids + `/api/runs/:id` + `run --wait`, `stop` that reaches the server, draft events persisted. |
| 11 | `ef757d3` | Model-written compaction (local tier first) with the extractive digest as the documented fallback; incremental coverage so no turn is summarised twice. |
| 12 | `5456457` | **The phone bets, proven**: `scripts/bench.mjs` (idle RSS, cold start, install, restart, one offline turn) feeding the README numbers, with a staleness check; a fully offline end-to-end test. |
| 13 | `779f7de` | **Cheap flips a finger feels**: Telegram typing indicator; colour discipline (`NO_COLOR`/`FORCE_COLOR`/TTY-only); one help table for all commands + shell completion. |
| 14 | `9fd9f6b` | **Machine-readable CLI**: the `{ok, command, data}` envelope, exactly one JSON document on stdout, `--json` across the command surface. |
| 15 | `5a33662` | **Telegram files both ways**: `getFile` → inbox with size/extension rules and executables refused by name; `sendDocument` + the `send_file` tool; failures kept in the outbox. |
| 16 | `04e792e` | **Zero-dependency readers**: PDF (content streams + FlateDecode), DOCX/PPTX/XLSX (ZIP on `node:zlib`), every text format, capped with a truncation note; OCR refused with a sentence. |
| 17 | `34a9912` | **The agent's own inbox**: an index + `<name>.text.md`, so `inbox_list`/`inbox_read` answer from memory; trimmed arrivals reported as `GONE`. |
| 18 | `5584b8b` | **Memory you can trust**: BM25 + exact-phrase + 30-day recency search with marked snippets; provenance tags and sources on every fact. |
| 19 | `5584b8b` | **Context you can see, and shrink**: `pruneToolResults()` stubs old bulky results before the provider; `contextReport()` measures the real prompt section by section. |
| 20 | `fbccafd` | **Gateway trust**: 5-minute single-use pairing codes, revocable hash-only device tokens, a versioned/sequenced SSE envelope with families declared in code and docs. |
| 21 | `880dfb3` | **Sessions you can lose a phone mid-turn with**: durable appends (fsync, torn-tail healing, `sessions verify --repair`); ranked search across every chat and archive. |
| 22 | `5b159f6` | **Tools that fail politely**: `exec` guard (catastrophe list, owner patterns, real timeout, capped output); schema validation at the boundary; sentences instead of stack traces. |
| 23 | `69c3b84` | **Ops you can see**: a verdict per running turn (working/slow/stuck/failing/queued) + one suggested action; console lines mirrored to `logs/termcrab.jsonl`. |
| 24 | `a312d3e` | **Presence + triggers**: who can reach the agent right now with one freshness ladder; hooks woken by bus events and by watched files. |
| 25 | `67f5c6a` | **The scope, written down**: census can mark rows `scope: 'out'` with the decision and reason; the three-surface choice encoded so it cannot rot. |
| 26 | `f73a9ef` | **Standing orders, lifecycle, watchers, images**: orders on one store (CLI + chat `/orders` + panel palette + `intent` tool), lifecycle hooks, `image` generation. |
| 27 | `0c7c213`, `ff54f6b` | **Providers + loop limits**: native Anthropic and Gemini adapters; model catalog that asks the endpoint and falls back with a note; **parallel tool batches** for read-only calls. |
| 28 | `13dfd46` | **Sessions: one for you, many clients on it**: a rolling shared main session (panel + terminal + Telegram), archived daily; per-conversation SSE attach. |
| 29 | `29e02fb` | **The terminal is a surface**: `termcrab tui` — alternate screen, bracketed paste, raw keys with partial escapes, exact frames, streaming transcript (wide characters counted as two). |
| 30 | `06fd4c0` | **A sandbox you can point at**: bubblewrap (read-only root, one writable workspace, private `/tmp`, no network by default) or proot, with `agent.sandbox = auto\|require\|off`. |
| 31 | `6e36441` | **Storage you can move between phones**: versioned state, numbered migration steps that run before any command, snapshot first, refuse a newer home, adopt a fresh one. |
| 32 | `556503d`, `5d92b62`, `23e7c39` | **Embeddings without the big download** (local model / any OpenAI-compatible `/embeddings` endpoint / graceful lexical fallback); a home that writes `SOUL.md`, `IDENTITY.md`, `AGENTS.md`, `BOOTSTRAP.md`, `MEMORY.md`, `USER.md` once; `install.sh --check` and `service install\|status\|uninstall`. |
| 33 | `541ef54` | **Delegation with a budget**: subagents as real background turns (cap, deadline marked `timeout`, one line back to the parent), agent routing per surface, agent-authored skills that must be approved, cron delivery targets; **voice proven with real executables** (found and fixed two real bugs: the macOS TTS chain and `--json` in `say`/`transcribe`). |
| 34 | 10 commits | **The tail**: a real CDP browser client + `termcrab browser`; fifteen device-specific skills asserted against the CLI (the check caught three invented invocations); ambient room history; cron catch-up/overlap/history + `termcrab board`; the security story made runnable (findings with fixes, any fail exits 1, `auth audit` with masked keys); the docs site as one offline HTML page; coverage measured and floored; `v0.68.0` tagged. |
| 35 | `779ed11`, `4607d08` | **The tail after the tail**: embedding provenance (which model made these vectors) and a refusal to compare vectors of different sizes; the leftovers written down with a verdict each; `v0.69.0`. |
| 36 | `1dead50`, `e02fb88` | **The four things a finished product still owes**: the live Telegram smoke (`npm run smoke:telegram`, token never printed, exit 0 when there is no token); per-release docs copies (newest 5); the docs page naming its own release and build time; CI quoted exactly and left to the owner; `v0.70.0`. |
| 37 | `6eeacfd`, `511db81` | **Earn the numbers back on a phone**: the performance budget with a test behind it (seven ceilings, `--budget` exits 1, every ceiling routes to its owner); a watchdog that names stuck turns; `v0.71.0`. |
| 38 | `56f0419`, `81f55dc` | **One surface at a time**: `termcrab perf [--full] [--json]` with each number next to its ceiling and a machine note; the suite's own clock with a wall/file budget; `v0.72.0`. |
| 39 | `28b9742` | **The numbers a phone feels while using it**: perf history + trend (`↑` slower) in CLI, `/api/perf` and the panel; memory search measured over 10 000 vectors; docs build budget; the loops a phone feels (room write, outbox drain, Telegram poll); a cold checkout measured from nothing; `v0.73.0`. |
| 40 | `73d1572` | **The surfaces keep their own promises**: the panel's own weight budgeted (`panelKb`/`panelMs`); `doctor` reads the last measurement and says never-measured/aging/over; the offline docs page carries a footer with release/counts; `perf --save` files a release's numbers; the queue's numbers with a real lane. **Writing it found a real leak** (`waitForTasks` held its timer after an answer arrived). `v0.74.0`. |
| 41 | `4ade18b` | **The numbers get used, not just reported**: every ceiling gets a fix line (`PERF_ADVICE`) shown in CLI and panel and checked against the doc; `perf --compare <release>`; the suite clock reaches the panel; a busy machine's measurement is **refused** (`--trust` overrides, file carries the load); the docs budget quoted on the docs line. **Found and fixed a real defect in the gate itself**: the coverage parser was averaging the compiled tree — now it walks the tree, keeps `src/`, names `.ts` files, and is unit-tested. `v0.75.0`. |
| 42 | `57865d3` | **The closing batch**: the tracker's numbers are read back from `docs/openclaw/data/*.json` (`final-numbers.mjs --check`); the owner's two actions declared once (`src/core/owner.ts` → `termcrab owner`) and kept equal across help and `docs/OWNER.md`; the queue can end (declaration + tracker rule + `status.mjs` prints `queue empty`); `v0.76.0`. |
| 43 | `c21aed5` | **A defect the closing audit found**: `startContinuousStt` delivered a phrase *after* `stop()` (reproduced 3/3 by probe, 0/3 after the fix; regression test fails 100% against the unfixed build); `listenOnce`'s timeout stopped claiming a hard-coded 30 s; the flaking test stopped using a stopwatch. `v0.76.1`. |
| 44 | `109e7e7` | **The audit's second pass**: a test that let the machine's load decide its verdict is pinned; `scripts/test-files.mjs` declares one deadline per group (heavy measurement files 600 s, everything else 60 s) after proving node's flag **overrides** a test's own deadline — the trap that made two heavy files look flaky. `v0.76.2`. |
| 46 | (this commit) | **The read-only command layer**: `src/gateway/chat-reports.ts` — 16 report functions + `/help`, clamped to 24 lines, secrets redacted by name; one `CHAT_COMMANDS` list (27) serves `/help`, `GET /api/slash` and the registered Telegram Bot menu; `/config set` limited to a whitelist; `/new`//`clear` from a chat resets the real session |
| 47 | (this commit) | **The control half, one dispatcher**: `src/gateway/chat-control.ts` — `/stop` (this session only), `/steer`, `/queue` (four modes, saves `agent.queueMode`), `/sessions rename|purge`, `/update` (check in chat, apply names the terminal), `/backup` (`tar.gz` + document), `/watch add|list|rm`; `runSharedCommand()` is what both `handleChannelMessage` and `POST /api/slash` call; the panel chat intercepts `/…` |
| 52 | (this commit) | **The named ◐ cells**: panel inbox/rooms/watchers/tool switches, security scan + named secret names, session rename/export, a downloaded spoken reply; Telegram proposal decisions and `cron add`; CLI `suite-time` / `work`; register **CLI 51 · Telegram 54 · Web 58 ✅, 0 ❌, 34 named ◐** |
| 51 | (this commit) | **Telegram's tail, and the end of the ❌ register**: `/suite-time`, `/work [full]` (the tracker as a document), `/say` (a real voice note through `speakToFile` → ffmpeg → `sendVoice`), voice replies (`channels.telegram.voiceReplies`), `/embeddings setup` behind an inline confirm, `/controlui` as a `web_app` button from `gateway.publicUrl`, and forum topics keyed `telegram:<chatId>:<threadId>`; audit **CLI 50 / Telegram 52 / Web 51, missing cells 0 of 71** |
| 50 | (this commit) | **The web panel's builder half**: `GET/PUT /api/bootstrap` (SOUL/IDENTITY/USER by name, paths pinned, 32 KB cap), `POST /api/backup` + `GET /api/backups` + `POST /api/restore` (dry-run, then the archive name typed back), `GET /api/service` (read-only card with the exact command), `POST /api/transcribe` (same whisper path as the CLI); audit **CLI 50 / Telegram 45 / Web 51, gaps 7** — the web row has no ❌ left |
| 49 | (this commit) | **The web panel's quick gaps**: `GET /api/sessions?q=` (the CLI's ranked chat search, snippets included) + a search box on the Chats tab; `GET /api/context` serving the prompt-section report into the Debug view; `GET/POST /api/embeddings` — the provider picker writes `memory.embedProvider` and the offline-model install runs behind `confirm:true`; `/api/queue` + `/api/steer` delegating to the shared verbs, with a composer mode chip and a steer box that appears while a turn runs; the audit moves to **CLI 50 / Telegram 45 / Web 48, gaps 11** |
| 48 | (this commit) | **The Telegram interaction layer**: `sendMessage(…, buttons?)` → `reply_markup.inline_keyboard`, `answerCallbackQuery`, `editMessageReplyMarkup`, `setMyCommands`, `sendVoice`, `callback_query` in `allowed_updates`; approvals arrive in the chat with `✅ Allow` / `🚫 Deny` calling the same `resolveApproval()` as the panel and CLI and emitting `approval:decided`; the audit re-measured **CLI 50 / Telegram 45 / Web 42, gaps 12** |
| 45 | (this commit) | **Three surfaces, one product — the audit first**: `scripts/surface-audit.mjs` measures 71 capabilities × 3 surfaces with source probes (`--check` fails the day one stops matching); `test/surface-audit.test.ts` keeps the report honest (every verdict carries a reason, and the scoreboard in `docs/SURFACES.md` must equal the scanner's JSON); the first honest scoreboard — CLI 49 ✅ / 0 missing, Telegram 24 ✅ / **28 missing**, web 41 ✅ / 9 missing — and the gap register + batch order 46–52 that closes them. No feature code: the owner asked for the map before the parity work. |

## 5. Cross-cutting guarantees (the invisible work)

Not features — properties the whole project keeps, each with a test behind it:

- **Zero runtime dependencies** — picked once, never bent (`npm ls --prod` is empty).
- **Machine-readable CLI** — one `{ok, command, data}` envelope, exit codes `0/1/124/130`.
- **Security boundary** — token on every `/api/*` route, constant-time compare, loopback by default, a non-loopback bind without a token refuses to start (tested).
- **Census vs OpenClaw** — every capability row measured with probes, drift-checked, **100%** of 162 in-scope rows (one PARTIAL: the CI matrix, waiting for the owner's push).
- **Coverage floor** — 80% declared, currently **87.43%** of `src/` lines, pinned by a fingerprint of the source tree.
- **Performance budget** — 20 ceilings with reasons and fix lines; the panel, the docs page, the queue and the subagent fan-out all have numbers.
- **Suite clock** — the whole suite recorded, 240 s wall budget; no single file may dominate.
- **Docs map + CLI coverage** — a `src/` file that appears without a doc fails the suite; a CLI command the suite neither runs nor explains fails too.
- **Work tracking** — `WORKLOG.md` is the single tracker; a commit that skips it fails the suite; the numbers line is read back from the artifacts.

## 6. Defects the project's own machinery found (and fixed)

Small in size, large in honesty — each was found *by* the system, not by luck:

| Found by | Defect | Fixed in |
|---|---|---|
| Tracker parser test | An end-anchor written `\Z` (read as a literal capital Z) silently truncated any tracker section whose evidence mentioned "ZIP" | batch 3 |
| Skills-command assertion | Three invented `termcrab …` invocations in bundled skills | batch 34 |
| Voice tests with real executables | The macOS TTS chain was wrong; `say`/`transcribe` ignored `--json` | batch 33 |
| Queue/subagent measurements | `waitForTasks` kept its 60 s deadline timer after an answer arrived, holding a one-shot process alive | batch 40.5 |
| Coverage recording | The parser averaged the compiled `dist/` tree into "source coverage" (55% instead of 87%) and let a temp dir into the worst list | batch 41 |
| A flake taken seriously | Continuous dictation delivered a phrase *after* `stop()` | batch 43 |
| The same audit, again | A test let the machine's load decide its verdict; two heavy files were cancelled mid-measurement while reporting zero failures | batch 44 |

## 7. What reaches which surface

The question *"is the front end good enough to capture every point?"* — answered with a map, not a feeling.
**Backend: 55 CLI commands, ~60 HTTP routes, one SSE bus.** Here is what each surface carries:

| Surface | Carries |
|---|---|
| **Web panel** (11 views: chat · status · board · providers · models · memory · tools · logs · debug · work · settings) | Chat with streaming/drafts/tool cards, approvals as cards, board, run health, presence, models/providers, memory search/remember/dream, skills, cron, sessions, subagents, agents, tools catalog, disk, logs + stream inspector, tracker, docs, perf + suite clock + Telegram runs, config/setup/wake/say/listen/update/devices, and the chat palette (`/new`, `/clear`, `/model`, `/status`, `/orders`, `/help`) |
| **Terminal UI** (`termcrab tui`) | The same chat + tool cards + streaming, with `/sessions`, `/new`, `/status`, `/history`, `/dir`, `/help`, `/quit` |
| **Telegram** | Chat, files in and out, voice notes, typing indicator, markdown, room history, the same chat commands |
| **CLI** (55 commands, 47 driven by the suite) | Everything, including the terminal-native pieces |

**From the panel chat, everything the chat dispatcher knows.** Since batches 46–48 the panel's own chat
box intercepts a leading `/` and runs the shared dispatcher — so `/logs /config /board /disk /perf
/doctor /security /auth /devices /embeddings /dream /docs /skills /cron` plus the control verbs are
reachable by typing, not only by a dedicated view. **What has no panel view of its own** (measured: these
words/routes are absent from `ui/index.html`, and `docs/SURFACES.md` §4.2 tracks them as the web cells
still open):

- `rooms` — ambient room history (the agent tool runs in chat; no view)
- `transcribe` — turning a voice *file* into text (dictation and TTS are on the panel)
- `security audit` / `auth audit` — the text arrives in chat; no view with the fix buttons
- `backup` / `restore` — the archive can be made from chat; restore has no panel flow
- `context` — the prompt-section report (batch 49 adds the view)
- `embeddings setup` — switching the provider (status is shown; batch 49 adds the picker)
- `browser` / `image` — tools the agent uses in chat; no dedicated panel control
- `orders` — editable from the panel chat; no orders *view*
- `schema` — migration status (rarely needed; the panel refuses a bad home anyway)

Terminal-native by nature (correctly not on the panel): `gateway`, `supervisor`, `tui`, `wait`.

So the honest answer in one line: **the backend is complete for the three-surface scope, and the panel
carries every everyday loop — the gaps above are real, small, named per surface in `docs/SURFACES.md`,
and closable one batch at a time (49–52 are queued).** Nothing is hidden behind a claim: each is either measured as present or listed here as
missing.
