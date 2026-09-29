# Changelog

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
