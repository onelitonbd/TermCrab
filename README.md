# TermCrab 🦀

**The always-on AI agent that lives in your Termux.**

TermCrab turns an Android phone (or any Linux box) into a self-hosted personal AI agent:
a local **gateway** that connects an LLM to **your** device — shell, files, skills,
persistent Markdown memory — controllable from a **web control UI** and **Telegram**,
with zero native dependencies and mobile-first power management.

```
🦀 Chat with it   →  Web Control UI (phone browser) + Telegram bot + WhatsApp* + CLI
👥 Team of agents →  named agent profiles (workspace/agents/<name>/SOUL.md, route with @name)
⚡ It does things  →  shell exec, files, web fetch, termux-* device APIs
🧠 It remembers    →  MEMORY.md + daily logs you can open and edit
🌊 It streams      →  token-by-token typewriter replies (Anthropic / OpenAI-compatible)
🫀 It acts on its own → heartbeat + cron schedules + battery-adaptive power budget
🔊 It speaks       →  termcrab say / voice skill (Termux TTS + STT)
💤 It sleeps on it  →  dreaming: idle/charging cycles distill chats into long-term memory
🧠 It thinks local  →  tiered inference: on-device model for light tasks, cloud for heavy
🔎 It finds meaning →  optional semantic memory search (`npm install @huggingface/transformers`)
📦 It just runs     →  zero runtime dependencies, no proot, no systemd needed
```
\* WhatsApp = optional extension: `npm install baileys` (see [docs/WHATSAPP.md](docs/WHATSAPP.md))

## Why TermCrab

Running agent frameworks on a phone is normally a fight: proot containers, hand-edited
"bionic bypass" shims, tmux prayers, and battery killers. TermCrab is **mobile-native by design**:

| Pain on Android | TermCrab's answer |
|---|---|
| `os.networkInterfaces()` crashes (Android Error 13) | **Bionic guard** applied automatically at process start — no manual shims |
| No `/tmp`, no systemd | `$TMPDIR` fixed automatically; **supervisor** replaces systemd; **Termux:Boot** script for auto-start |
| Aggressive background killing | `termux-wake-lock` + boot script + auto-restart watchdog |
| Battery drain from always-on agents | **Power-aware heartbeat** pauses when battery is low, runs normally while charging |
| Flaky mobile data loses replies | **Offline outbox** persists failed sends and retries |
| Giant dependency trees fail to install | **Zero runtime dependencies** — one `tsc` build, global `fetch`, Node ≥ 20.10 |
| Open ports on a LAN | Loopback by default, bearer token required, constant-time checks, non-loopback refuses to start without a token |

## Quick start

### On Termux (Android)

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y

git clone https://github.com/onelitonbd/claw.git
cd claw
npm install          # 3 dev packages, no runtime deps: under a second
npm run build        # compiles TypeScript - 1-3 minutes on a phone, silent while it runs
npm test             # (optional) run the test suite

node dist/src/bin/termcrab.js onboard     # interactive wizard
node dist/src/bin/termcrab.js gateway     # start your agent
```

Or with the one-command installer (re-run the same command later to upgrade):

```bash
curl -fsSL https://raw.githubusercontent.com/onelitonbd/claw/arena/01a0ec99-claw/install.sh | bash
```

### Anywhere (macOS / Linux / CI)

```bash
npm install          # fast: three dev packages, no runtime dependencies
npm run build        # compiles TypeScript (~5s on a laptop)
node dist/src/bin/termcrab.js onboard --non-interactive --provider mock --name Crabby
node dist/src/bin/termcrab.js agent "hello!"        # works fully offline (mock provider)
```

Then open the control UI at `http://127.0.0.1:7788/`. First time? The **setup wizard** (3
plain-language steps) gets your brain, name, and Telegram connected without
touching a file — and the panel has an **⬆️ Check for updates** button and the
**👂 wake loop** (start it, or type commands when you have no mic).

## CLI

```
termcrab status         plain-English overview: brain, memory, schedule, battery
termcrab onboard        setup wizard (provider, model, telegram, name)
termcrab gateway        run the gateway (HTTP API + SSE + channels + heartbeat + cron)
termcrab supervisor     run the gateway with auto-restart watchdog
termcrab agent [msg] [--as <name>] [--tier local]
                           chat one-shot or interactive REPL (/as <name>, /agents inside)
termcrab say <text>        speak text aloud (termux-tts-speak / espeak / say ...)
termcrab doctor [--json|--share]  diagnose the installation (--share = safe paste for help)
termcrab heartbeat      run one proactive tick now
termcrab update         check if a newer TermCrab exists (never auto-updates)
termcrab dream [--force]   sleep on it: consolidate sessions into long-term memory
termcrab wake [--keyword w]  voice loop: say the keyword, then your command (STT + TTS)
termcrab cron           manage schedules: ls | add --schedule "0 8 * * *" --prompt "..." | rm | on | off | run
termcrab skills         list / show / import / new skills (OpenClaw-style SKILL.md folders)
termcrab sessions       ls / export <id> / rename / purge --older-than N (chat history)
termcrab agents         ls / new <name> --template brief|teacher|researcher
termcrab embeddings     status / setup — smart memory search (optional, offline-capable)
termcrab transcribe <f> audio file → text, offline (optional whisper.cpp)
termcrab import openclaw  bring an old OpenClaw setup across (preview first)
termcrab memory         show / search memory (hybrid lexical + semantic when enabled)
termcrab boot install   auto-start on device boot (Termux:Boot)
termcrab config         get/set configuration
```

## Named agents

```bash
mkdir -p ~/.termcrab/workspace/agents/brief
cat > ~/.termcrab/workspace/agents/brief/SOUL.md <<'EOF'
# SOUL
- Name: Brief
- You answer in max 5 bullet points. No preamble, ever.
EOF

termcrab agent --as brief "what's on my plate?"
# in Telegram/WhatsApp:  @brief what's on my plate?
```

Each agent gets its own SOUL + session namespace; memory/skills stay shared.

## Local & offline models

llama.cpp / Ollama plug in through any OpenAI-compatible endpoint — see
[docs/LOCAL.md](docs/LOCAL.md). `termcrab doctor` probes your local endpoint.

### Tiered inference (v0.4)

Lightweight tasks can run on-device while the main provider stays cloud:

```bash
termcrab config set localProvider.enabled true
termcrab config set localProvider.baseUrl http://127.0.0.1:8080/v1   # llama.cpp serve
termcrab config set localProvider.model qwen2.5-1.5b-instruct
termcrab agent "summarize today" --tier local   # falls back to cloud if local is down
```

Dreaming prefers the local tier automatically (cheap + private).

### Dreaming 💤

During idle/charging windows the gateway distills recent sessions into durable
MEMORY.md facts (schedule: `dream.everyHours`, default 24h; power gate shared
with `heartbeat.pauseBelow`):

```bash
termcrab dream           # consolidate now (respects the schedule)
termcrab dream --force   # skip schedule + battery gates
```

Trigger it from the control UI (💤 button) or `POST /api/dream`.

### Semantic memory search 🔎 (optional)

```bash
npm install @huggingface/transformers   # optional extension, ~model download
termcrab memory search "dark mode"      # now lexical + vector hybrid
```

Without the package the core stays zero-dependency and search is purely lexical.
Scored, human-readable index lives at `memory/index.jsonl`.

Offline/manual model install (no Hub access needed): drop the model folder at
`~/.termcrab/models/Xenova/all-MiniLM-L6-v2/` (config + tokenizer + `onnx/model_quantized.onnx`)
— it's picked up before any network call.

## Automate & extend

```bash
# Cron (5-field or @macros) - runs through the agent, delivers to Telegram if paired
termcrab cron add --schedule "0 8 * * 1-5" --prompt "weekday briefing" --name weekday
termcrab cron ls

# Import skills from any folder or git repo (OpenClaw-compatible SKILL.md format)
termcrab skills import https://github.com/org/awesome-skills.git
termcrab skills import ./my-skill-dir --force
```

On Android, cron + heartbeat respect your battery: jobs pause below
`heartbeat.pauseBelow`% unless marked `--critical`.

## Providers

| `provider.type` | Endpoint | Notes |
|---|---|---|
| `anthropic` | api.anthropic.com | Claude models (`--api-key`, `--model`) |
| `openai` | api.openai.com or any OpenAI-compatible `--base-url` | OpenRouter, Groq, DeepSeek, Ollama (`http://127.0.0.1:11434/v1`) |
| `mock` | offline | Deterministic demo — **no API key needed** to try everything |

```bash
termcrab onboard --non-interactive --provider anthropic --model claude-sonnet-4-5 --api-key sk-ant-...
termcrab config set provider.baseUrl https://openrouter.ai/api/v1
termcrab config set provider.apiKey sk-or-...
termcrab config set provider.model some-model-name
```

## Telegram channel (secure by default)

1. Create a bot with **@BotFather**, get the token
2. `termcrab config set channels.telegram.token <token>`
3. `termcrab config set channels.telegram.allowedUserIds [YOUR_TELEGRAM_USER_ID]` —
   the channel **stays off until an allowlist exists** (unknown senders are rejected)
4. Restart the gateway

Commands: `/new` (reset session), `/heartbeat` (run now), `/status`.

## Phone survival kit

```bash
termcrab boot install      # auto-start gateway on reboot (install Termux:Boot app)
termux-wake-lock           # keep CPU awake while plugged in
# Battery > apps > Termux: disable battery optimization
termcrab supervisor         # auto-restart instead of `termcrab gateway`
termcrab doctor             # verify everything above
```

## Coming from OpenClaw?

One command brings your old setup across — preview first, nothing touches your
files until you say so:

```bash
termcrab import openclaw              # shows the plan, changes nothing
termcrab import openclaw --apply      # do it
termcrab import openclaw --apply --force   # also replace files you already have
```

What it carries over: personality (SOUL/IDENTITY/USER/AGENTS/TOOLS merged into
one `SOUL.md`), memory (daily logs, topic notes, MEMORY.md lines — no duplicates),
skills, named agents, and a best-effort config mapping (heartbeat, WhatsApp/Telegram
allow-lists, gateway port, model/provider/key). Anything it can't map is listed
plainly in the report — nothing is guessed, and secrets are always masked (`•••`).
Point it somewhere else with `--from <dir>` (default `~/.openclaw`).

## Reaching it from outside the house

See **[docs/REMOTE.md](docs/REMOTE.md)** — Tailscale / Cloudflare tunnel / SSH
recipes, a 2-minute hardening checklist, and exactly what *not* to do.

## How it fits together

```
Telegram / Web UI / CLI ──► Gateway (127.0.0.1:7788, token auth, SSE events)
                              │
                              ├─ Agent loop: prompt → LLM → tools → reply
                              │    tools: exec · read/write/list · web_fetch ·
                              │            load_skill · remember · search_memory
                              ├─ Skills: folders with SKILL.md (progressive disclosure)
                              ├─ Memory: MEMORY.md + memory/daily/*.md (human-editable)
                              ├─ Sessions: JSONL transcripts, rolling window
                              ├─ Heartbeat: HEARTBEAT.md checklist, battery-aware
                              └─ Mobile layer: bionic guard · supervisor · outbox · boot
```

Full details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
Gateway API: [docs/API.md](docs/API.md) ·
Termux guide: [docs/TERMUX.md](docs/TERMUX.md) ·
Product plan: [PRODUCT.md](PRODUCT.md) ·
OpenClaw research that inspired it: [OPENCLAW_REPORT.md](OPENCLAW_REPORT.md)

## Security

- Loopback bind by default; non-loopback **refuses to start** without a token
- **Login system removed** — all `/api/*` endpoints are open (loopback binding is the only gate)
- Telegram allowlist required; file tools are root-bounded; `exec` can be disabled
- Read [SECURITY.md](SECURITY.md) before exposing anything to a network

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — tests, house rules, and the one-time
CI enablement step.

## Development

```bash
npm install
npm run build        # tsc -> dist/
npm test             # node:test unit + integration tests (33)
TCRAB_HOME=/tmp/tc-dev node dist/src/bin/termcrab.js doctor   # sandboxed state dir
```

## License

MIT — see [LICENSE](LICENSE).
