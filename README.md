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
npm install          # installs TypeScript + builds
npm test             # (optional) run the test suite

node dist/src/bin/termcrab.js onboard     # interactive wizard
node dist/src/bin/termcrab.js gateway     # start your agent
```

Or with the installer:

```bash
curl -fsSL https://raw.githubusercontent.com/onelitonbd/claw/arena/01a0ec99-claw/install.sh | bash
```

### Anywhere (macOS / Linux / CI)

```bash
npm install && npm run build
node dist/src/bin/termcrab.js onboard --non-interactive --provider mock --name Crabby
node dist/src/bin/termcrab.js agent "hello!"        # works fully offline (mock provider)
```

Then open the control UI at `http://127.0.0.1:7788/` (token printed by
`termcrab config get gateway.token`).

## CLI

```
termcrab onboard        setup wizard (provider, model, telegram, name)
termcrab gateway        run the gateway (HTTP API + SSE + channels + heartbeat + cron)
termcrab supervisor     run the gateway with auto-restart watchdog
termcrab agent [msg] [--as <name>]
                           chat one-shot or interactive REPL (/as <name>, /agents inside)
termcrab say <text>        speak text aloud (termux-tts-speak / espeak / say ...)
termcrab doctor         diagnose the installation (fix suggestions included)
termcrab heartbeat      run one proactive tick now
termcrab cron           manage schedules: ls | add --schedule "0 8 * * *" --prompt "..." | rm | on | off | run
termcrab skills         list / show / import skills (OpenClaw-style SKILL.md folders)
termcrab memory         show / search memory
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
- Constant-time token checks; all `/api/*` routes (except health) require auth
- Telegram allowlist required; file tools are root-bounded; `exec` can be disabled
- Read [SECURITY.md](SECURITY.md) before exposing anything to a network

## Development

```bash
npm install
npm run build        # tsc -> dist/
npm test             # node:test unit + integration tests (33)
TCRAB_HOME=/tmp/tc-dev node dist/src/bin/termcrab.js doctor   # sandboxed state dir
```

## License

MIT — see [LICENSE](LICENSE).
