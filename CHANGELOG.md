# Changelog

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
