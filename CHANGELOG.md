# Changelog

# Changelog

## 0.7.0 — 2026-09-29 (The nice-to-haves)

Completes the v0.5 P1 block ("oh, nice") — five quality-of-life upgrades.

### Added
- **💤 Dream history** — Memory panel shows when your crab last "dreamed" and
  what it learned (every `dream:` line from the daily logs); `termcrab dream
  --history` prints the same from the terminal
- **🗂️ Chats panel** — see every conversation with size + date; **export** any
  chat as a readable Markdown file (download or `termcrab sessions export`),
  **rename** it, **clean out** chats older than N days to free space
  (`termcrab sessions ls|export|purge|rename`; purge really deletes,
  unlike reset which only renames)
- **✨ `termcrab skills new <name>`** — writes a working SKILL.md skeleton the
  loader picks up immediately (validated in tests)
- **👥 Agent starter templates** — `termcrab agents new <name> --template
  brief|teacher|researcher` and a template dropdown when creating agents in
  the panel
- **🧠 `termcrab embeddings status|setup`** — plain-English state of smart
  memory search + guided setup (installs the optional package, fetches the
  ~23 MB model, verifies a 384-dim probe; offline = drop-in folder instructions)
- **📡 `docs/REMOTE.md`** — Tailscale / Cloudflare tunnel / SSH recipes with a
  hardening checklist and an explicit "what NOT to do" (no bare public IPs)

### Tests
- 152/152 (24 new: session export/purge/rename round-trip, scaffolds accepted
  by the real loader, embeddings setup paths incl. failure messages, dream
  history parsing, gateway routes for all of the above)

# Changelog

## 0.6.0 — 2026-09-29 (You're in the driver's seat)

Completes web control parity (P0 #0, phase 3): every CLI control now has a
button in the panel.

### Added
- **Wake loop in the panel** — 👂 Start/Stop from *Voice & boot*; live events
  (keyword heard → command → reply) stream into the chat as they happen.
  No mic? Type the command in the box — same state machine, no Termux needed.
  (`GET/POST /api/wake/start|stop|feed`, service runs inside the gateway)
- **Setup wizard** — 🧙‍♂️ three plain-language steps (brain → name → telegram)
  in the panel; applies everything `termcrab onboard` does, seeds the
  workspace, never echoes your API key back. Reachable from the welcome card
  and the start-here panel.
- **"Check for updates" button** — ⬆️ in the start-here panel: asks GitHub,
  reports "you're on the latest (vX)" or the upgrade command. Still never
  auto-updates. (`POST /api/update`)

### Tests
- 128/128 (new phase-3 suite: wake state machine over HTTP with reply event
  on the bus, friendly no-mic answers, idempotent stop, update shape,
  wizard apply/persist/mask + mock reset)

## 0.5.0 — 2026-09-29 (Bring your old setup)

### Added
- **`termcrab import openclaw`** — one command that brings an old OpenClaw setup over:
  personality files (SOUL/IDENTITY/USER/AGENTS/TOOLS) merged into TermCrab's `SOUL.md`,
  memory (daily logs, topic folders, MEMORY.md lines — no duplicates), skills
  (`skills/<name>/SKILL.md`), named agents, and a best-effort config mapping
  (heartbeat, WhatsApp/Telegram allow-lists, gateway port, model/provider/API key)
  with an **unmapped-keys report** so nothing is silently dropped
- **Preview first** — running it without flags only shows the plan (what will be set,
  what keeps your current TermCrab value, what's absent); nothing is written until
  you re-run with `--apply` (and `--force` to replace existing files)
- **Secrets stay hidden** — API keys and tokens are masked (`•••`) in every report
- `--from <dir>` to point at a non-default OpenClaw home (default `~/.openclaw`)
- Doctor-free by design: preview doubles as the safety check

### Tests
- 121/121 (new: migration suite — JSON5-ish parse, preview writes NOTHING,
  apply round-trip moves personality/memory/skills/agents/config, secrets never
  printed, idempotent second pass)

## 0.4.4 — 2026-09-29 (Talk to it)

### Added
- **Dictation in the panel** — 🎤 *Listen* button: tap, speak, words land in the chat box
  (`POST /api/listen`, one-shot `termux-speech-to-text`, 30s timeout; missing tool or
  silence return friendly messages, never HTTP errors)
- Doctor: **voice input (dictation)** check (ok / install hint for Termux:API)

### Changed
- **`install.sh` is now a true one-command install AND upgrade** — re-running it upgrades
  in place ("installed/upgraded 🦀 (vX)"), drops the `termcrab` command into `$PREFIX/bin`
  on Termux (no PATH editing) with `~/.local/bin` fallback elsewhere, prints next steps
  (`onboard`, `status`)

### Tests
- 115/115 (new: dictation suite — never hangs, friendly when tool missing; live API listen route)

## 0.4.3 — 2026-09-29 (Trust & upkeep)

### Added
- **Friendly errors everywhere** — failures now come out as a sentence + a next step:
  "Can't reach the service at 127.0.0.1:54321 — it's not running → start llama-server
  or check the Brain address", bad API key → exact config command, offline → mock mode,
  blocked ports, TLS/proxy inspection, missing termux tools, missing npm packages.
  Technical details hidden (TCRAB_DEBUG=1 reveals them)
- **`termcrab update`** — asks GitHub for the newest release; tells you the upgrade
  command (never auto-updates). Offline = calm message, no drama. Optional startup
  check (`update.checkOnStart`, editable in Settings) + in-panel notice via SSE
- **`termcrab doctor --share`** — copy-paste diagnostic block for asking help:
  checks + environment only, key/token-shaped strings scrubbed ("secrets: none included")
- **First-run welcome card** — when no real brain is configured, the web panel opens
  with a 2-step "wake your crab" guide + button straight to Settings (`GET /api/setup`)

### Changed
- Agent error channel preserves the underlying cause (was: bare "fetch failed")
- `termcrab help` lists `update` and `doctor --share`

### Tests
- 112/112 (new: update semver/network-stub suite, friendly-error suite, share-report scrub suite)

## 0.4.2 — 2026-09-29 (Made for humans)

Plain-language pass over **both** interfaces — built for the owner first, coders later.

### Added
- **`termcrab status`** — one-screen, plain-English overview: brain, web panel, chat apps,
  memory facts, self-check schedule, dream times ("last: Tue 11:16 · next: Wed 11:16"),
  battery, agents — plus pointers to the two commands worth running next
- **"How this works (start here)" panel** in the web UI — live status strip (awake · brain ·
  facts · next dream) + a human explanation of every panel
- **Plain-English Settings** — every config key shows a human name and one-line explanation
  (technical key shown underneath: transparency, no hidden magic)
- **Friendly event messages** — dream/check-in skips now read as sentences
  ("already dreamed recently — next attempt in about 24h" instead of a raw code)
- **Web control parity (phase 1+2)** — every CLI control reachable from the UI:
  `GET/POST /api/config` (secrets masked), `POST /api/doctor`, `GET /api/status`,
  memory search/remember/edit, skills show/import, agents CRUD + active-for-chat,
  `POST /api/say`, `GET/POST /api/boot[/install]` — 11 routes + 6 panels + live-server tests
- **`termcrab help` rewritten** in plain words: "Start here (the 5 commands most people
  ever need)" first, examples in human sentences

### Tests
- 101/101 (new: status report suite + first live-server API suite)

## 0.4.1 — 2026-09-29 (Embeddings taste-tested)

### Added
- **Offline model drop-in** — embedder now resolves `~/.termcrab/models/Xenova/all-MiniLM-L6-v2/`
  from disk before any Hub request (manual installs on flaky networks; sandboxed/air-gapped boxes)
- **Launch kit hardening** — direct HN/Reddit submit links + pre-flight commands in `docs/LAUNCH.md`;
  HN title shortened to 69 chars (limit 80); `docs/V05.md` v0.5 scope

### Changed
- Embedding model dtype `fp32` → **`q8`** (~23MB vs ~90MB: faster phone download,
  ~4× less RAM, negligible retrieval-quality loss for cosine memory search)

### Verified (real end-to-end)
- `@huggingface/transformers` + quantized MiniLM (384-dim) → hybrid search: semantic
  query "which code editor does he like" ranks `[vector] preferred editor is neovim…` #1;
  doctor `2 vector(s) indexed`; `/api/memory` `{enabled:true, vectors:2}`

## 0.4.0 — 2026-09-29 (Smarter Crab)

### Added
- **Tiered inference** — optional `localProvider` config block (OpenAI-compatible
  endpoint: llama.cpp / Ollama / llama-server) + `--tier local` on `termcrab agent`
  and `RunOpts.tier` across channels; lightweight tasks route on-device with
  automatic fallback to the main provider
- **"Dreaming" memory consolidation** — `termcrab dream [--force]`, hourly gateway
  scheduler gated on `dream.enabled` + `everyHours` + battery + "anything new?"
  checks; distills recent session transcripts into durable MEMORY.md facts using
  the local tier when configured; `POST /api/dream` + 💤 button + SSE `dream` event
- **Hybrid embedding search** (optional) — `npm install @huggingface/transformers`
  activates `memory/index.jsonl` vector indexing; `MemoryStore.search()` now merges
  semantic hits (cosine-scored) with lexical matches — **breaking:** `search()` is
  async; without the package everything stays lexical/zero-dep
- **Voice wake loop** — `termcrab wake [--keyword <word>]`: two-phase STT session
  (keyword arms it, next utterance is the command, reply is spoken via TTS chain);
  honest scope: `termux-speech-to-text` loop, not an always-on DSP wakeword
- **Launch kit** — `docs/LAUNCH.md`: Show HN post, r/termux post, 5-minute demo
  script, posting checklist
- Doctor: local model tier, dreaming, and embeddings checks; `/api/memory` reports
  vector index stats

### Changed
- `AgentCtx.localProvider` + tier routing in `runTurn`; dream/heartbeat power
  budget shares `heartbeat.pauseBelow`

## 0.3.0 — 2026-09-29 (Where The Users Live)

### Added
- **WhatsApp channel** — optional Baileys extension (core stays zero-dependency):
  QR pairing in terminal, secure-by-default allowlist (channel off until configured),
  `/new` `/status` `/agents` commands, outbox fallback, graceful "npm install baileys" hint
- **Multi-agent profiles** — named agents as `workspace/agents/<name>/SOUL.md`;
  route with `@name` prefix (Telegram/WhatsApp), `termcrab agent --as <name>`,
  REPL `/as` + `/agents`, `POST /api/chat {agent}`, `GET /api/agents`
- **Cron management UI** — list/add/pause/run/delete schedules from the control panel
- **Voice** — `termcrab say <text>` (termux-tts-speak → espeak-ng → espeak → spd-say → say)
  + `voice` skill for dictation loops (`termux-speech-to-text`); doctor checks
- **Local model docs** — `docs/LOCAL.md` (llama.cpp / Ollama via OpenAI-compatible endpoint)
- Doctor: whatsapp + TTS checks

### Changed
- Outbox is now per-channel (`telegram` / `whatsapp`) with independent flushers

## 0.2.0 — 2026-09-29 (Daily Driver)

### Added
- **Streaming responses**: SSE token streaming for Anthropic + OpenAI-compatible
  providers, delta events → typewriter UI and live terminal output; automatic
  fallback to non-streaming when a stream dies before any output (`provider.stream=false` to disable)
- **Cron scheduler**: dependency-free 5-field cron (`*`, `-`, `/`, lists, `@daily` etc.)
  with `termcrab cron add|ls|rm|on|off|run`, next-run previews, battery-aware skipping,
  gateway loop (20s resolution) and REST API (`/api/crons`)
- **Skills importer**: `termcrab skills import <folder|git-url>` — drop-in compatible
  with OpenClaw-style `SKILL.md` folders; sanitizes hostile names, `--force` to overwrite
- **Android notifications**: ongoing "gateway alive" notification + per-run alerts via
  `termux-notification` (no-op elsewhere), auto-cancelled on shutdown
- **Session picker** in the web control UI (list, switch, load transcripts)
- Cron events surfaced over SSE (`cron` listener in UI)

### Changed
- Roadmap: WhatsApp channel moved to v0.3 (needs a zero-dep-compliant Baileys spike)

## 0.1.0 — 2026-09-29 (Shell Start)

First public milestone.

### Added
- **Gateway**: HTTP API + SSE event stream, loopback bind, constant-time token auth,
  PID file, health endpoint
- **Agent loop**: provider-agnostic tool calling (Anthropic, OpenAI-compatible, offline
  mock), per-session JSONL transcripts with rolling window, run timeouts, event stream
- **Tools**: `exec` (policy-gated, Termux-aware shell resolver), `read_file`,
  `write_file`, `list_dir` (root-bounded), `web_fetch`, `load_skill`, `remember`,
  `search_memory`, `get_time`
- **Skills**: SKILL.md folders with frontmatter, progressive-disclosure prompt index,
  user override, 4 bundled skills (web-research, termux-api, daily-briefing, shell-safety)
- **Memory**: MEMORY.md + daily logs + lexical search
- **Channels**: Web control UI (mobile-first, SSE), CLI REPL, Telegram
  (allowlist, HTML escape, chunking, `/new` `/heartbeat` `/status`, offline outbox)
- **Mobile layer**: Android bionic guard (networkInterfaces + TMPDIR), battery-adaptive
  heartbeat, offline outbox, supervisor watchdog, Termux:Boot installer, `doctor`
- **Onboard**: interactive wizard + scriptable `--non-interactive` flags
- **Quality**: 33 tests (`node --test`), GitHub Actions CI, TypeScript strict mode
- **Docs**: README, PRODUCT plan, ARCHITECTURE, API, TERMUX, SECURITY, OPENCLAW_REPORT
