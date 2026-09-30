# OpenClaw — Full Research Report

**Compiled:** 2026-09-29
**Sources:** official repo (`openclaw/openclaw`), official docs (`docs.openclaw.ai`), openclaw.ai, GitHub REST API (live stats), plus community articles/guides on architecture and Termux deployments (full source list in §6).

**Live snapshot of the repo at time of writing** (GitHub API):

| Metric | Value |
|---|---|
| Repository | `openclaw/openclaw` |
| Stars | **390,752** |
| Forks | 82,173 |
| Open issues/PRs | 8,977 |
| Created | 2025-11-24 |
| Primary language | TypeScript |
| npm package | `openclaw` v`2026.9.6` |
| Node.js engines | `>=24.16.0 <25 \|\| >=26.1.0` |
| License | MIT (package.json / README badge) |
| Package type | ESM (`"type": "module"`) |

---

## 1) What is it, and how was it made?

### 1.1 What it is

OpenClaw (orig. **Clawdbot**, briefly **Moltbot**; mascot "Molty" 🦞) is a **self-hosted, open-source personal AI agent**. It is not a chatbot website — it is a **long-running local daemon called the Gateway** that:

- connects to **30+ messaging apps** (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, etc.),
- routes your messages into an **agentic loop** (LLM reasoning → tool calls → results → reply),
- can **actually do things on your machine**: run shell commands, read/write files, browse the web, control a browser, schedule jobs, send email, generate images/media, etc.,
- keeps **persistent memory as plain Markdown files** on your own disk,
- is controlled from any device you own (CLI, Web Control UI, TUI, macOS/iOS/Android companion apps, "node" devices that expose camera/screen/location).

Positioning: *"The AI that really does things. Any OS. Any Platform."* — data, memory, and credentials stay on your hardware; models (Anthropic, OpenAI, Google, Ollama/local, 35+ providers) are swappable plugins. No paid tier, no hosted service — stewarded since Feb 2026 by the **OpenClaw Foundation**, a 501(c)(3) funded by donors (University of Michigan, OpenAI, Amazon, Red Hat, NVIDIA, Vercel, etc.).

### 1.2 The four core components

Every source converges on the same architecture (Baidu wiki, docs, DeepWiki, community deep-dives):

1. **Gateway** — the control plane. A single Node.js process (default `127.0.0.1:18789`) that owns all channel connections, sessions, routing, auth/pairing, cron/heartbeats, webhooks, HTTP + WebSocket API, and serves the Control UI and Canvas. Strict JSON-Schema-validated wire protocol (`connect` handshake → `req/res/event` frames, idempotency keys for side effects).
2. **Agent runtime** — the brain. Runs the per-session serialized agent loop: *intake → context assembly (system prompt + skills + bootstrap files + memory) → LLM inference → tool execution → streaming → persistence (transcripts)*. Originally built on Mario Zechner's **Pi** agent framework (`pi-agent-core`/`pi-ai`), now vendored in-repo as `@openclaw/agent-core` + `@openclaw/ai`.
3. **Skills** — capabilities as **Markdown, not code**: each skill is a folder with a `SKILL.md` (YAML frontmatter + natural-language instructions). 49 bundled skills ship in the repo; thousands more live in the **ClawHub** registry. Loaded progressively (names/descriptions always, full content on demand) to keep context lean. The agent can **write its own skills** when it discovers a repeatable workflow.
4. **Memory** — human-readable by design: `SOUL.md` (personality), `MEMORY.md` (long-term facts), `HEARTBEAT.md` (proactive checklist), daily logs `memory/YYYY-MM-DD.md`, JSONL transcripts, optional embedding/vector search (sqlite-vec, LanceDB). Older turns are **compacted** (summarized) instead of growing forever. The roadmap concept "dreaming" = consolidating session logs into long-term memory during idle time (like sleep).

### 1.3 How it was made — the story

**Timeline:**

| Date | Event |
|---|---|
| Nov 2025 | Peter Steinberger (Austrian dev, PSPDFKit founder, ex-Antinomic/Amantus Machina) launches **Clawdbot** as a personal "playground project." Viral: ~8k stars in 72h. |
| Dec 2025 | Goes mega-viral (the "Icarus negotiated a $4,200 car discount" demo, Mac mini "Clawdbot shortage" memes, 90k+ stars, 100k+ Discord members by year end). |
| Jan 8–27, 2026 | Anthropic trademark pressure (name too close to "Claude") → renamed **Moltbot** (lasted ~3 days). |
| Jan 24–27, 2026 | Security crisis: **CVE-2026-25253** (zero-click WebSocket hijacking, CVSS 8.8) + **"ClawHavoc"** — 1,467 malicious skills found in the registry. |
| Jan 30, 2026 | Second rename → **OpenClaw**; new repo `openclaw/openclaw`, signed skill manifests, security hardening, new governance plan. |
| Feb 14–15, 2026 | Steinberger **joins OpenAI** to lead personal-agent work; project transferred to the independent **OpenClaw Foundation** (Altman: "OpenClaw will live on as an open-source project in a foundation"). |
| Feb–Mar 2026 | 200k → 250k+ stars: **fastest-growing software repo in GitHub history** (only "awesome lists" outrank it). |
| Apr 2026 | "State of the Claw" keynote: ~30k→295k stars trajectory, ~2,000 contributors, 3.2M monthly active users, 92% retention, 1,142 security advisories in 5 months. |
| Jul 2026 | 100,000 issues+PRs in 222 days — entirely volunteer-driven, no VC money. |
| Sep 2026 | **390k+ stars**; CalVer releases (`2026.9.6`); desktop apps for macOS/Windows/Linux; iOS/Android nodes. |

**How it was engineered:**

- **AI-native development from day one.** Steinberger is an advocate of "agentic engineering": he ran 5–6 parallel coding agents daily, and by 2026 a 3-person team ran **~100 Codex instances concurrently** for PR review, security scanning, issue triage, and fix authoring — **603B tokens / ~$1.3M of API usage in 30 days** (covered by OpenAI). "Ship beats perfect."
- **Monorepo, plugin-first.** Everything is one **pnpm workspace**: core (`src/`), reusable packages (`packages/`), channels/providers/tools as **164 `extensions/`** loaded dynamically, bundled **`skills/`**, native **`apps/`** (macOS, iOS, Android, Linux), Rust **`crates/`**, React **`ui/`**. Core stays lean because even model providers are external packages.
- **Typed everything.** **TypeBox** schemas define the WS protocol → JSON Schema generated → **Swift models code-generated** for Apple apps. Protocol validation, idempotency keys, and pairing (device identity + challenge nonce + approval) are first-class.
- **Configuration = documents.** Personality/rules/memory live in Markdown the user can read and edit; runtime config in `~/.openclaw/openclaw.json`. This "boring, inspectable" choice is widely cited as the project's smartest design decision.
- **Quality infrastructure at absurd scale:** GitHub Actions CI, oxlint/oxfmt, semgrep, shellcheck, swiftlint, knip export budgets, max-lines baselines, contract tests for every channel, deterministic local channel mocks (`crabline`), pre-commit hooks — required to safely absorb ~2k contributors and AI-generated PRs.

---

## 2) What coding languages are used?

### 2.1 Actual language breakdown (GitHub API, live)

| Language | Bytes | Share |
|---|---:|---:|
| **TypeScript** | 421,183,061 | **90.8%** |
| Swift | 18,516,652 | 4.0% (macOS & iOS apps) |
| Kotlin | 9,680,244 | 2.1% (Android app, Wear) |
| JavaScript | 6,014,314 | 1.3% (runners/entry shims) |
| Shell | 2,653,570 | 0.6% (installer, CI, scripts) |
| Rust | 1,921,710 | 0.4% (`crates/`: gateway-client, node-host) |
| CSS | 1,850,615 | 0.4% (Control UI) |
| Python | 1,502,528 | 0.3% (skills, tooling e.g. whisper, debugpy) |
| Go | 346,141 | <0.1% |
| Ruby, PowerShell, HTML, Dockerfile, QML, Objective-C, C, AppleScript | ~246k total | <0.1% |

**Bottom line: it's a TypeScript/Node.js project.** Everything that matters — gateway, agent loop, CLI, channels, skills, memory, plugins — is TypeScript running on Node (ESM).

### 2.2 Runtime & toolchain

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 24.16 (or 26.x recommended); runs as ESM |
| Package mgmt / monorepo | **pnpm** workspaces (`pnpm-workspace.yaml`), `workspace:*` deps |
| Build | `tsdown` (rolldown-based TS bundler), **esbuild**, Babel for parsing/transforms, Node compile-cache fast paths |
| Schema/validation | **TypeBox** (protocol + config), Zod also present, JSON Schema codegen |
| Server | **express 5** + **ws** (single multiplexed port 18789) |
| CLI UX | **commander**, @clack/prompts, Ink-style TUI (`@earendil-works/pi-tui`) |
| DB | SQLite (node-sqlite, Kysely query builder), JSONL transcripts, optional vector indexes |
| Browser automation | **playwright-core** + chrome-devtools-mcp (CDP) |
| Official SDKs | `@anthropic-ai/sdk`, `openai`, `@google/genai`, `@mistralai/mistralai`, MCP SDK, ACP SDK |
| WhatsApp/Telegram | **baileys 7.0.0-rc14** (extensions/whatsapp), **grammY** (extensions/telegram) |
| Native apps | **Swift** (macOS app, iOS node), **Kotlin/Jetpack Compose** (Android app, `apps/android` with Gradle + fastlane), Rust for portable native hosts |
| QA | Vitest-style tests, GitHub Actions, semgrep, oxlint, shellcheck, swiftlint |

---

## 3) What features does it have?

### 3.1 Channels (30+, all through the one Gateway)

**Bundled/in-core:** Telegram, WebChat, A2A (agent-to-agent), Reef (E2E agent messaging).
**Official plugins:** WhatsApp (QR pairing via Baileys), Discord, Slack, Microsoft Teams, Signal (signal-cli), iMessage (native, private API), SMS/MMS (Twilio), LINE, Matrix, Mattermost, Feishu, Google Chat, IRC, Nostr, QQ, Twitch, Synology Chat, Nextcloud Talk, Tlon, Zalo (bot + personal), WeCom/WeChat (external), Buzz, ClickClack, voice-call telephony (Plivo/Telnyx/Twilio).
Media, voice notes, reactions, polls, group join-introductions, DM pairing/approval, access groups, per-room routing.

### 3.2 Agent runtime

- Session-scoped **serialized agent loop** with per-session + global queues; command queue modes (**steer / followup / collect / interrupt**)
- Streaming (assistant deltas, tool events, block streaming), run timeouts/abort, `agent.wait` terminal replay
- **Compaction** of old context; token budget enforcement per model
- **Multi-agent routing** (separate agents on one gateway, `@mention` handoffs, isolated sessions)
- **Thinking levels**, verbose modes, reasoning visibility; **model failover** chains, cooldowns, OAuth/auth profiles
- **Hooks:** internal `HOOK.md` scripts + typed plugin hooks (`before_tool_call`, `after_tool_call`, `before_prompt_build`, `before_agent_reply`, `message_received/sending/sent`, `session_start/end`, `gateway_start/stop`, compaction observers…)
- **MCP** (Model Context Protocol) + **ACP** support; sandboxed execution modes; approval gates for dangerous actions

### 3.3 Memory & context

- Markdown long-term memory (`MEMORY.md`), daily logs, `SOUL.md` personality, `AGENTS.md` roster, `HEARTBEAT.md` checklist
- JSONL append-only transcripts with in-transaction writer claims (corruption-proof)
- Vector/embedding search (sqlite-vec, LanceDB plugins) + keyword/BM25; **"dreaming"** memory consolidation (idle-time log→memory distillation)

### 3.4 Skills & tools

- 49 bundled skills (GitHub, obsidian, notion, trello, weather, camsnap, tmux, summarize, visualize, whisper STT, TTS, pdf, spotify, hue…), **ClawHub** registry with 13k+ community skills, `skill-creator` skill
- **Self-writing skills**: agent authorizes its own `SKILL.md` files for repeatable workflows
- Tools: shell/exec, file ops (fs-safe, root-bounded), **browser control** (CDP, OAuth flows, scraping), **web search & fetch**, code execution (QuickJS `code-mode`), image/video/music generation, document extraction, link understanding, meeting bots

### 3.5 Automation & proactivity

- **Heartbeat** (default ~30 min): agent wakes, reads `HEARTBEAT.md`, acts (check mail, summarize calendar…)
- **Cron jobs**, wakeups, HTTP webhooks, scheduled standing orders
- Proactive outbound messaging (agent initiates conversations)

### 3.6 Surfaces & devices

- **Control UI** (browser dashboard: sessions, config, history, Canvas), **TUI**, **CLI** (`openclaw onboard/gateway/channels/plugins/pairing/doctor…`), **WebChat**
- Desktop apps (macOS/Windows/Linux), **iOS & Android node apps** (camera, screen recording, location, voice, widgets)
- **Canvas/A2UI**: agent-driven visual widgets served by the gateway
- **Voice:** Talk Mode, voice wake words, TTS/STT, voice calls

### 3.7 Security & ops

- Device pairing with challenge/nonces, loopback-first defaults, tokens/passwords, Tailscale/SSH remote access patterns, trusted-proxy modes
- Sandboxing, install policies, signed skill manifests (post-ClawHavoc), security advisories process, telemetry off-by-default-ish (`update.checkOnStart:false` disables even version check)
- Docker/docker-compose/Fly/Nix deploy paths, systemd/launchd supervision, doctor/diagnostics, OTel/Prometheus extensions, hot-reload config

---

## 4) Proper file/folder structure

### 4.1 Repository root (`openclaw/openclaw` — verified via GitHub git-trees API)

```
openclaw/
├── .agents/ .claude/ .openclaw/     # agent-assist configs, repo's own dogfooded workspace
├── .github/                         # CI workflows, issue templates, community health
├── apps/                            # native apps (separate stacks)
│   ├── android/                     #   Kotlin/Gradle app (wear/, benchmark/, fastlane/)
│   ├── ios/                         #   Swift iOS node app
│   ├── macos/ macos-mlx-tts/        #   Swift macOS app + local TTS
│   ├── linux/ shared/ swabble/
├── config/                          # lint/type/test budgets: oxlint, swiftlint, shellcheck, knip, tsconfig/
├── crates/                          # Rust workspace: openclaw-gateway-client, openclaw-node-host
├── custodian-skills/                # maintained/custodial skills
├── deploy/ fly.toml render.yaml docker-compose.yml Dockerfile docker-entrypoint.mjs
├── docs/                            # full docs site source (concepts/, channels/, gateway/, install/, cli/, …)
├── examples/
├── extensions/                      # ★ 164 plugin packages (dynamic load)
│   ├── anthropic/ openai/ google/ ollama/ openrouter/ groq/ xai/ mistral/ …   # model providers
│   ├── telegram/ whatsapp/ discord/ slack/ signal/ msteams/ imessage/ sms/ …   # channels
│   ├── browser/ github/ exa/ tavily/ firecrawl/ duckduckgo/ …                  # tools
│   ├── memory-core/ memory-lancedb/ active-memory/ policy/ vault/ …            # memory & policy
│   ├── talk-voice/ voice-call/ canvas/ device-pair/ bonjour/ diagnostics-*/ …  # platform
├── skills/                          # ★ 49 bundled SKILL.md skills (github, obsidian, whisper, tmux, …)
├── packages/                        # ★ 23 shared workspace packages
│   ├── agent-core/                  #   @openclaw/agent-core (agent loop; dep of record)
│   ├── ai/                          #   @openclaw/ai — provider adapters + streaming runtime
│   ├── llm-core/ gateway-protocol/ gateway-client/ acp-core/ plugin-sdk/ sdk/
│   ├── markdown-core/ media-core/ media-generation-core/ terminal-core/
│   ├── memory-host-sdk/ model-catalog-core/ net-policy/ retry/ tool-call-repair/ …
├── patches/ scripts/ qa/ security/ git-hooks/ test/
├── src/                             # ★ THE CORE (TypeScript) — ~70 modules:
│   ├── entry.ts (compile-cache/respawn fast paths)  index.ts  globals.ts
│   ├── gateway/          # WS/HTTP server, wire protocol, presence, health
│   ├── sessions/ channels/ chat/ routing/ queue logic (state/)
│   ├── agents/ bootstrap/ context-engine/ skills/ memory/ mcp/ acp/ hooks/
│   ├── llm/ model-catalog/ model-picker/ provider-runtime/ routing/
│   ├── cli/ tui/ interactive/ wizard/ commands/ docs/
│   ├── web/ canvas/ boards/ session-cards/ talk/ tts/ image-generation/
│   ├── media/ media-generation/ media-understanding/ link-understanding/ web-fetch/ web-search/
│   ├── cron/ daemon/ process/ worker/ pairing/ security/ secrets/ config/
│   ├── node-host/ meeting-bot/ realtime-transcription/ transcripts/ trajectory/
│   ├── logging/ infra/ utils/ types/ shared/ compat/ snapshot/ status/
│   └── test-fixtures/ test-helpers/ test-utils/ (+ many colocated *.test.ts)
├── ui/                              # React + Vite Control UI (vite/vitest configs, public/)
├── openclaw.mjs                     # npm bin entry (bin: {"openclaw": "openclaw.mjs"})
├── cli-root-options.mjs  node-*.mjs # thin ESM shims: version check, compile cache, sqlite, runtime recovery
├── package.json  pnpm-workspace.yaml  pnpm-lock.yaml  tsconfig*.json
├── tsdown.config.ts                 # bundler config
├── AGENTS.md  VISION.md  README.md  CHANGELOG.md  CONTRIBUTING.md  SECURITY.md  LICENSE (MIT)
└── taxonomy.yaml  .env.example  .npmrc  .oxlintrc.json  .pre-commit-config.yaml
```

### 4.2 Runtime data structure (created on the user's machine)

```
~/.openclaw/
├── openclaw.json            # main config: model, providers, channels, auth token, tools policy
├── workspace/               # the agent's "brain" — all human-readable
│   ├── SOUL.md              # identity/personality
│   ├── MEMORY.md            # long-term facts about user
│   ├── HEARTBEAT.md         # proactive checklist (read every tick)
│   ├── AGENTS.md            # multi-agent roster & handoff rules
│   ├── WORKING.md           # runtime state
│   ├── skills/              # agent self-authored skills
│   └── memory/
│       └── 2026-09-29.md    # daily append-only logs
├── sessions/ (JSONL transcripts) · state (SQLite) · logs/ · plugins/ · pairing store · skills cache
```

**Mental model:** *repo = code* (monorepo: `src` + `packages` + `extensions` + `skills` + `apps`), *`~/.openclaw` = state* (config JSON + Markdown brain + SQLite/JSONL), *Gateway = single daemon that joins the two.*

---

## 5) Building a Termux-native, mobile-first system — same languages & structure, better than OpenClaw

This is the actionable section. The short version: **OpenClaw already *runs* on Android/Termux, but only as a hostile afterthought** (community hacks: proot Ubuntu, "bionic bypass" shims, tmux band-aids). A project built **mobile-first** — same TypeScript/Node stack, same gateway/channels/agent/skills/memory structure — can genuinely beat it on a phone.

### 5.1 What the internet has already learned running OpenClaw on Termux

Community guides (sources 8–13) agree on the pain points:

| # | Pain on Android | Root cause | Evidence |
|---|---|---|---|
| 1 | Official `install.sh` **fails on Android** | glibc assumptions, systemd/launchd absent | ClawPhone notes, Reddit installers |
| 2 | People resort to **proot + Ubuntu** | `/tmp` writes, native modules, bionic quirks | All guides; ~3GB disk, +~800ms tool latency, extra RAM |
| 3 | **"Error 13" crash** (`uv_interface_addresses` / `os.networkInterfaces`) | Android blocks `getifaddrs` for unprivileged apps | "Bionic bypass" preload shim needed |
| 4 | `/tmp/openclaw` missing | Android has no world-writable `/tmp` | Fix: `TMPDIR=$PREFIX/tmp` |
| 5 | Gateway dies on screen-off / in background | Android kills background processes aggressively | `termux-wake-lock`, pin in recents, kill battery optimization, Termux:Boot |
| 6 | `systemd`/daemon install fails; `trim` maintenance errors | No init system; toybox `trim` behaves differently | Run foreground/tmux; `skipSystemCommands: true` |
| 7 | Heavy footprint: **~145MB–1GB idle RAM**, ~1.25s startup | Electron-ish Node dep tree, eager plugin loads | Benchmarks vs Rust agents (8ms / 4MB) |
| 8 | Local LLM on phone is impractical | 100+ GB models; small models often **lack tool-calling** | Reddit: `gemma3 does not support tools` |
| 9 | Battery drain 5–10%/h under load | Always-on WebSocket + heartbeats | Android Termux guides |
| 10 | **No official support** | Docs target macOS/Linux/Windows/VPS | docs.openclaw.ai has no Android path |

Existing projects to learn from (not compete with): `marshallrichards/ClawPhone` (native-first scripts + Termux:API), `iyeoh88-svg/openclaw-android` (automated proot installer), `Mohd-Mursaleen/openclaw-android`, openclaw-termux Flutter wrapper app.

### 5.2 Target architecture — "Clawdroid" (working name) — same 4 layers + a 5th mobile layer

```
                    ┌───────────────────────────────────────────────┐
  Chat apps ───────►│  GATEWAY (Node/TS, ws 127.0.0.1:18789)        │
  (Telegram/        │  sessions · routing · pairing · auth · cron   │
   WhatsApp/        ├───────────────┬───────────────┬───────────────┤
   WebChat)         │ AGENT LOOP    │ SKILLS        │ MEMORY        │
                    │ context→LLM   │ SKILL.md load │ SOUL/MEMORY.md│
                    │ →tools→reply  │ self-authoring│ logs + sqlite │
                    ├───────────────┴───────────────┴───────────────┤
                    │ ★ MOBILE LAYER (new, the differentiator)      │
                    │  termux-bridge (notification/clipboard/camera │
                    │  location/SMS/battery/wifi via termux-api)    │
                    │  supervisor (auto-restart, foreground notif)  │
                    │  power budget (adaptive heartbeat, Doze-aware)│
                    │  offline queue (store-and-forward)            │
                    │  bionic guard (net shim, TMPDIR, no-proot)    │
                    ├───────────────────────────────────────────────┤
                    │ EXTENSIONS (plugins): providers anthropic/    │
                    │ openai/gemini/openrouter/llama.cpp …          │
                    └───────────────────────────────────────────────┘
```

**Same coding:** TypeScript + Node.js on Termux, pnpm monorepo, TypeBox schemas, express+ws, commander CLI, Markdown skills/memory. (MIT licensed — you may reuse OpenClaw code with attribution; **don't reuse the name/logo "OpenClaw"/Molty**, they're trademark-sensitive.)

**Same structure:** mirror the verified layout — `src/` core, `packages/` shared libs, `extensions/` providers+channels, `skills/` bundled skills, `ui/` control panel, `docs/`, plus the `~/.claw/`-style workspace of Markdown brain files. A drop-in-subset compatibility layer can even read `SOUL.md`/`SKILL.md`/`HEARTBEAT.md` unchanged.

### 5.3 Proposed folder structure for *this* repo (`claw/`)

```
claw/
├── package.json  pnpm-workspace.yaml  tsconfig.json  tsdown.config.ts
├── claw.mjs                       # npm bin entry (like openclaw.mjs)
├── src/
│   ├── entry.ts                   # startup: bionic guard FIRST, then compile-cache fast path
│   ├── gateway/                   # WS+HTTP server, handshake, pairing, health
│   ├── sessions/  routing/  state/
│   ├── agent/                     # loop: context assembly → inference → tools → persist
│   ├── skills/                    # SKILL.md loader (progressive disclosure) + self-authoring
│   ├── memory/                    # Markdown memory, daily logs, sqlite index, compaction
│   ├── channels/                  # thin core contracts; impls live in extensions/
│   ├── cli/                       # commander: onboard, gateway, channels, doctor, pairing
│   ├── config/                    # TypeBox schema + Android-aware defaults
│   ├── mobile/                    # ★ everything Android/Termux-specific
│   │   ├── bionic-guard.ts        #   preload shim: os.networkInterfaces() safe-patch, TMPDIR fix
│   │   ├── termux-bridge/         #   wrapper around termux-notification|clipboard|camera|
│   │   │                          #   location|sms|battery-status|wifi-info|contact-list
│   │   ├── supervisor/            #   crash-restart loop, health watchdog, lock file
│   │   ├── power/                 #   battery %, charging state → adaptive heartbeat
│   │   ├── offline/               #   outbox: queue replies/tool jobs when network drops
│   │   └── boot/                  #   generated ~/.termux/boot scripts
│   └── logging/
├── extensions/                    # dynamic-load plugins (copy OpenClaw's pattern)
│   ├── anthropic/ openai/ google/ openrouter/ ollama/   # providers (start with 3)
│   ├── telegram/  whatsapp/  webchat/                   # channels (start with 3)
│   ├── termux-api/                                      # mobile tools as a plugin
│   └── browser/ (phase 2)  github/ (phase 2)
├── skills/                        # bundled: summarize, weather, camsnap, clipboard-notes, …
├── packages/
│   ├── gateway-protocol/          # TypeBox schemas shared by server + clients
│   ├── agent-core/                # (or vendor @openclaw/agent-core — MIT)
│   └── plugin-sdk/
├── ui/                            # Vite React Control UI, mobile-first CSS
├── scripts/
│   ├── install.sh                 # native Termux installer (pkg path — NO proot)
│   └── boot/claw-gateway.sh       # copied to ~/.termux/boot/
├── docs/  test/  .github/workflows/
└── README.md  LICENSE (MIT)  AGENTS.md  SECURITY.md
```

### 5.4 Build plan (phased)

**M0 — Prove the runtime on-device (1 weekend)**
```bash
# On the phone (Termux FROM F-DROID, never Play Store):
pkg update && pkg upgrade -y
pkg install nodejs-lts git openssh termux-api tmux -y
node --version            # need ≥22, ideally 24.x
corepack enable && corepack prepare pnpm@latest --activate
```
Gate: a hello-world WS gateway stays up 24h under real Android process killing.

**M1 — Skeleton gateway + one channel (Telegram)**
- Port/author `src/gateway` (connect handshake, pairing, token auth), `src/agent` minimal loop, `extensions/telegram` (grammY), config schema.
- **Non-negotiable defaults (learned from CVE-2026-25253):** loopback bind only; token required; pairing approval for every new device; no `mode: none`.

**M2 — Mobile hardening (this is where you beat OpenClaw)**
- `bionic-guard` auto-preloaded via `NODE_OPTIONS=-r` in our own bin wrapper → **no Error 13, ever** (fix it in code, not a user-editable hijack.js).
- `TMPDIR` default `$PREFIX/tmp` baked into `claw.mjs`.
- Supervisor + `~/.termux/boot` installer: `termux-wake-lock` → start gateway → restart on crash → write a **persistent notification** ("Claw gateway running · 42 msgs today").
- `power/` module: read `termux-battery-status`; heartbeat every 30 min when charging → 60–120 min on battery → pause when <15%.
- `offline/` outbox so a flaky mobile network never drops replies.
- `doctor` command that detects: wrong Termux build (Play Store), missing wake lock, battery optimization enabled, proot leftovers.

**M3 — Memory + skills parity**
- `SOUL.md`/`MEMORY.md`/`HEARTBEAT.md`/daily logs (Markdown), JSONL transcripts, sqlite index with WAL; compaction.
- SKILL.md loader + progressive disclosure + `skill-creator` self-authoring.

**M4 — Full mobile toolbox (unbeatable-on-phone features)**
- `termux-api` plugin: notifications → chat, SMS/mms send/receive, clipboard, camera snap (`camsnap`), GPS, contacts, wifi info, call log — as ordinary skills/tools the LLM can call.
- Termux:GUI/Kotlin micro-app (optional): foreground service, battery-exemption prompt, lock-screen widget.
- Voice: `termux-speech-to-text` + `termux-tts-speak` first; later sherpa-onnx (STT) bundled.

**M5 — Second channel + provider breadth**
- WhatsApp via **Baileys** (proven on Node; QR pairing) — note Baileys session state is Android-storage friendly if kept under `$PREFIX`.
- Providers: Anthropic/OpenAI/Gemini/OpenRouter + **optional on-device**: `llama.cpp` server from Termux repos for small *tool-capable* models (verify tool-calling; many 1–3B models can't call tools — this is why cloud-first + local-fallback is the right design).

**M6 — Scale-out, polish**
- Control UI (mobile-first), WebChat, multi-agent routing, cron/webhooks, plugin hot-reload, signed skill installs (learned from ClawHavoc), 72h soak test + battery profile.

### 5.5 How to be *better than OpenClaw* on a phone (acceptance targets)

| Axis | OpenClaw on Android today | Our target |
|---|---|---|
| Install | proot or hand-patched shims; installer fails natively | one native `pkg`-based installer, no proot (**0s extra tool latency, −3GB disk**) |
| Boot crash | user must edit `hijack.js` for Error 13 | impossible by construction (guard compiled into entry) |
| Background life | tmux + hope | supervisor + wake-lock + boot script + persistent notification; auto-restart verified by watchdog |
| Idle RAM | ~145MB–1GB | **≤ 90MB** (lazy plugin loading, no eager 100-extension scan, esbuild bundle, compile-cache) |
| Cold start | ~1.25s+ | **≤ 400ms** (`entry.ts` fast paths, pre-warmed dist) |
| Battery | fixed 30-min heartbeat | adaptive heartbeat (charging/battery/doze aware), batched wakeups |
| Network drops | tool calls fail mid-run | offline outbox + resume + idempotency keys |
| Mobile hardware | desktop assumptions | first-class Termux:API skills (SMS, camera, clipboard, location) |
| Local model | hard, often tool-less | graceful tiering: cloud tools-capable model default; tiny local model only for summarize/rewrite tasks |
| Security defaults | learned via CVEs | loopback-only, pairing-by-default, signed skills, `doctor` audits — **secure-by-default day one** |
| Config surface | huge desktop config | Android profile: ~20 sane defaults, everything else opt-in |

### 5.6 Risks & honest limitations

- **Android will still try to kill you**: even with all mitigations, OEM aggressive battery managers (MIUI, ColorOS…) may need manual exemption steps — document them in `doctor` output.
- **No systemd**: the supervisor *is* your init; must handle zombie/orphan guards and single-instance locks.
- **Native modules**: anything needing glibc (some npm postinstall builds) must be avoided or prebuilt for aarch64 — keep the dep tree slim; this is a design constraint, not a cleanup task.
- **Tool-calling small models are weak**: don't promise parity with cloud models on-device; tier tasks instead.
- **WhatsApp/TOS risk** (Baileys is unofficial) exists equally for OpenClaw — offer Telegram as default, WhatsApp as opt-in.
- **Legal**: MIT permits code reuse with the license preserved; avoid the OpenClaw name/mascot in your product.

---

## 6) Sources

**Primary / official**
1. GitHub repo & live API stats — [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw), `api.github.com/repos/openclaw/openclaw` (+ `git/trees`, `languages` endpoints), fetched 2026-09-29
2. Official README — [raw README.md](https://github.com/openclaw/openclaw/blob/main/README.md)
3. Official docs: Gateway architecture — [docs.openclaw.ai/concepts/architecture](https://docs.openclaw.ai/concepts/architecture)
4. Official docs: Agent loop — [docs.openclaw.ai/concepts/agent-loop](https://docs.openclaw.ai/concepts/agent-loop)
5. Official docs: Chat channels — [docs.openclaw.ai/channels](https://docs.openclaw.ai/channels)
6. Docs index / what-is-openclaw — [github.com/openclaw/openclaw/blob/main/docs/index.md](https://github.com/openclaw/openclaw/blob/main/docs/index.md)
7. Project site — [openclaw.ai](https://openclaw.ai/)

**History, growth, how it was made**
8. Peter Steinberger profile — [github.com/steipete](https://github.com/steipete)
9. DigitalOcean: *What is OpenClaw?* — [digitalocean.com/resources/articles/what-is-openclaw](https://www.digitalocean.com/resources/articles/what-is-openclaw)
10. Baidu wiki: OpenClaw entry (architecture, language, timeline) — [baike.baidu.com/en/item/OpenClaw/1461289](https://baike.baidu.com/en/item/OpenClaw/1461289)
11. *State of the Claw* talk summary (growth, dreaming, security) — [websearchapi.ai/blog/openclaw-state-of-the-claw-peter-steinberger](https://websearchapi.ai/blog/openclaw-state-of-the-claw-peter-steinberger)
12. TNW: $1.3M / 100 Codex instances — [thenextweb.com/news/openclaw-peter-steinberger-1-3-million-openai-token-bill](https://thenextweb.com/news/openclaw-peter-steinberger-1-3-million-openai-token-bill)
13. Clawdbot→Moltbot→OpenClaw timeline (CVE, ClawHavoc) — [blink.new/blog/clawdbot-moltbot-openclaw-history-2026](https://blink.new/blog/clawdbot-moltbot-openclaw-history-2026)
14. aimakers: three name changes — [aimakers.co/blog/what-is-clawbot](https://www.aimakers.co/blog/what-is-clawbot/)
15. OpenClaw creator joins OpenAI — [evoailabs.medium.com (via search)](https://evoailabs.medium.com/openclaw-creator-peter-steinberger-joins-openai-from-viral-hit-to-ai-giant-dc70551b52bc)
16. 100k issues+PRs in 222 days — [digg.com/tech/e227ygz9](https://digg.com/tech/e227ygz9)

**Architecture & language detail**
17. *How OpenClaw Works: real architecture* (gateway/loop/skills/memory) — [bibek-poudel.medium.com](https://bibek-poudel.medium.com/how-openclaw-works-understanding-ai-agents-through-a-real-architecture-5d59cc7a4764)
18. *Lessons from OpenClaw's Architecture* (Pi runtime, 4-layer, WS auth) — [blog.agentailor.com](https://blog.agentailor.com/posts/openclaw-architecture-lessons-for-agent-builders)
19. *Deep Dive into OpenClaw: architecture, code, ecosystem* (monorepo packages) — [medium.com/@dingzhanjun](https://medium.com/@dingzhanjun/deep-dive-into-openclaw-architecture-code-ecosystem-e6180f34bd07)
20. testmuai: repo structure (`src/*` modules) — [testmuai.com/blog/openclaw-github-repository](https://www.testmuai.com/blog/openclaw-github-repository/)
21. crewclaw: repo structure & templates — [crewclaw.com/blog/openclaw-ai-agent-github-guide](https://crewclaw.com/blog/openclaw-ai-agent-github-guide)
22. win4r/OpenClaw-Skill (51 reference docs list) — [github.com/win4r/OpenClaw-Skill](https://github.com/win4r/OpenClaw-Skill)

**Termux / Android**
23. *Running OpenClaw on Android with Termux* — [openclaws.io/blog/openclaw-android-termux](https://openclaws.io/blog/openclaw-android-termux)
24. *OpenClaw on Android: Termux guide* (proot, tested device) — [sudonull.com](https://sudonull.com/openclaw-on-android-termux-guide)
25. *The Bionic Bypass* (Error 13 shim, loopback bind) — [sagartamang.com/blog/openclaw-on-android-termux](https://sagartamang.com/blog/openclaw-on-android-termux)
26. ClawPhone (native-first Termux scripts, TMPDIR fix, Termux:API) — [github.com/marshallrichards/ClawPhone](https://github.com/marshallrichards/ClawPhone)
27. Reddit: automated OpenClaw Android installer — [reddit.com/r/termux](https://www.reddit.com/r/termux/comments/1r3ht7x/tool_automated_installer_for_openclaw_on_android/)
28. Honest 2026 setup guide (3 methods, performance reality, battery) — [tryopenclaw.ai](https://www.tryopenclaw.ai/blog/openclaw-android-termux-setup/)
29. Medium: run OpenClaw on Android (proot reason: /tmp) — [medium.com/@monkeyo](https://medium.com/@monkeyo/how-to-run-openclaw-on-android-with-termux-b25d59402158)
30. aiagentspedia: Termux guide (Termux:Boot auto-start) — [aiagentspedia.org/guides/openclaw-termux](https://aiagentspedia.org/guides/openclaw-termux/)
31. Lily's notes: Android gateway + kernel fix video transcript — [lilys.ai](https://lilys.ai/en/notes/openclaw-tutorial-20260204/openclaw-ai-gateway-android-kernel-fix)
32. skywork benchmark table (OpenClaw vs ZeroClaw vs NanoClaw RAM/startup) — [skywork.ai/skypage/en/openclaw-github-ai-agents/2036769039760068608](https://skywork.ai/skypage/en/openclaw-github-ai-agents/2036769039760068608)
33. awesome-openclaw (ecosystem list) — [github.com/SamurAIGPT/awesome-openclaw](https://github.com/SamurAIGPT/awesome-openclaw)

---

*All live repo figures (stars, tree layout, languages, package.json deps) were pulled directly from the GitHub API on 2026-09-29; narrative claims come from the cited articles and official docs.*
