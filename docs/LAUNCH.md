# 🦀 TermCrab Launch Kit (v0.4.0)

Ready-to-paste posts + a 5-minute demo script. Update the repo links if the repo moves.

---

## 1. Show HN

**Title (≤80 chars, 69 actual):**

```
TermCrab: an always-on, local-first AI agent for Termux (open source)
```

**Body:**

```text
I've been building TermCrab [0] for a few months — a Termux-native agent with an
architecture inspired by OpenClaw (run loop, tools, skills, heartbeats, cron,
gateway, channels), plus a mobile layer the desktop tools don't have.

What it is
- Always-on agent in Termux: HTTP API + SSE web UI, CLI REPL, Telegram and
  optional WhatsApp channels, proactive heartbeats, cron jobs.
- Voice in both directions: TTS chain (termux-tts-speak/espeak) and a wake
  loop where you say a keyword, then your command.
- "Dreaming": while your phone is idle and charging, it distills the day's
  chats into long-term memory files (short-term → long-term, like sleep).
- Tiered inference: lightweight tasks can route to an on-device model
  (llama.cpp/ollama) while the main provider stays cloud — one config block.
- Embedding memory search: install @huggingface/transformers and MEMORY.md
  becomes hybrid lexical+semantic. Core stays zero-dependency without it.
- Everything is files you can read: memory/MEMORY.md, sessions/*.jsonl,
  skills/*/SKILL.md, state/*. No opaque vector DB in the core.

Design choices people ask about
- Zero runtime dependencies in the core (TypeScript strict, MIT). WhatsApp
  (baileys) and embeddings are opt-in installs.
- Secure by default: gateway refuses non-loopback binds without a token;
  channels have empty allowlists = everyone rejected.
- Mobile-first power budget: heartbeats and dreams pause on low battery.

Honest scope: the wake loop is an STT session (termux-speech-to-text), not an
always-on DSP wakeword — that would eat the battery.

Repo: https://github.com/onelitonbd/claw
Quick start (on your phone):
  pkg install nodejs-lts git
  git clone https://github.com/onelitonbd/claw && cd claw
  npm install -g . && termcrab onboard

I'd love feedback on the dreaming/tier ideas especially — is consolidating
memory during idle windows something people would actually trust a phone
agent to do?
```

---

## 2. r/termux

**Title:**

```
I built TermCrab — an always-on AI agent for Termux with voice, WhatsApp, and "dreaming" memory
```

**Body:**

```text
Hey r/termux — I wanted a personal agent that actually lives on the phone
instead of being a remote API with a Termux sticker on it. TermCrab [0] is
what came out:

🦀 Runs fully inside Termux (Node 20+, no proot, no container tricks)
🌐 Gateway with web UI + REST/SSE API, CLI, Telegram, optional WhatsApp
🫀 Heartbeats + cron: it does things *for* you (summaries, nudges), not just
   when you poke it
🗣️ Voice both ways: speak replies (termux-tts-speak/espeak) + a wake loop
   where you say the keyword, then the command
💤 "Dreaming": on idle/charging it compresses the day's sessions into
   long-term MEMORY.md — short-term to long-term, like you do
🧠 Optional on-device tier: point localProvider at llama.cpp/ollama and
   lightweight tasks (dreaming, drafts) run locally, free and private
🔎 Optional semantic memory search via @huggingface/transformers —
   install it and search goes hybrid; skip it and core stays zero-dep
📁 Everything is plain files under ~/.termcrab — readable, greppable,
   git-able

Secure defaults that should be normal everywhere: no non-loopback bind
without a token, channels with empty allowlists reject everyone.

Quick start:

  pkg install nodejs-lts git
  git clone https://github.com/onelitonbd/claw && cd claw
  npm install -g .
  termcrab onboard     # wizard; works offline with --demo/mock
  termcrab gateway     # web UI + API on 127.0.0.1:7788
  termcrab heartbeat   # one proactive tick
  termcrab dream       # consolidate now
  termcrab wake        # voice loop (needs termux-api)

Honest notes: wake = STT session loop, not a battery-draining always-on
wakeword. WhatsApp needs `npm install baileys` + an allowlist.

Repo: https://github.com/onelitonbd/claw — MIT. Feedback very welcome,
especially on what *you'd* want an always-on phone agent to do overnight.
```

---

## 3. Demo script (5 minutes)

Run from a fresh clone. Everything below works offline with the mock provider —
swap in your API key via `termcrab onboard` for real replies.

```bash
#!/usr/bin/env bash
# TermCrab v0.4 demo - paste into a fresh Termux session (or any Linux box).
set -euo pipefail

# --- 1. Install (zero runtime deps) -------------------------------------
pkg install nodejs-lts git   # Debian/Ubuntu: apt install nodejs npm
git clone https://github.com/onelitonbd/claw
cd claw
npm install -g .

# --- 2. First contact (offline-friendly mock provider) -------------------
termcrab agent "what can you do?" --demo 2>/dev/null \
  || termcrab config set provider.type mock && termcrab agent "what can you do?"

# --- 3. Memory: write, inspect, semantic search --------------------------
termcrab agent "remember that I prefer dark mode everywhere"
termcrab memory show                     # human-readable MEMORY.md
termcrab memory search "dark mode"       # lexical now...
# optional hybrid search:
#   npm install @huggingface/transformers
#   termcrab memory search "dark mode"   # ...now semantic too

# --- 4. Tiering: run one task on-device ----------------------------------
# (start llama.cpp/ollama first, e.g. `ollama serve` with an OpenAI endpoint)
termcrab config set localProvider.enabled true
termcrab config set localProvider.baseUrl http://127.0.0.1:8080/v1
termcrab config set localProvider.model qwen2.5-1.5b-instruct
termcrab agent "summarize today" --tier local   # local tier, auto-fallback if down

# --- 5. Dreaming: sleep on it -------------------------------------------
termcrab dream            # consolidate sessions -> long-term memory
termcrab dream --force    # skip schedule/battery gates
# the gateway also dreams on its own while idle + charging (dream.enabled)

# --- 6. Voice: wake loop -------------------------------------------------
pkg install termux-api    # + the Termux:API app from F-Droid
termcrab wake --keyword crab
# say: "crab ... send my morning briefing"  ->  reply is spoken back

# --- 7. Always-on: gateway + proactive ticks -----------------------------
termcrab gateway &        # http://127.0.0.1:7788 (token from config)
termcrab heartbeat        # one proactive tick
termcrab doctor           # everything it needs, what's optional, what's off

# --- 8. Channels (optional) ----------------------------------------------
# Telegram:  termcrab config set channels.telegram.token <token>
#            termcrab config set channels.telegram.allowedUserIds "[<id>]"
# WhatsApp:  npm install baileys   # then set channels.whatsapp.enabled true
#            termcrab config set channels.whatsapp.allowedJids '["<jid>"]'
```

### Expected highlights

```text
$ termcrab dream
💤 dreaming (consolidating memory) ...
✅ dream complete: 4 fact(s) consolidated (local tier)

$ termcrab memory search "dark mode"
[MEMORY.md] - [2026-09-29 14:02] User prefers dark mode everywhere
[vector]     user likes dark mode everywhere        # only with embeddings

$ termcrab doctor
✅ dreaming (memory consolidation)      every 24h, gated on idle + battery
ℹ️  embedding search (hybrid memory)    lexical only (optional)
   fix: npm install @huggingface/transformers
```

---

## 4. Posting checklist

**Direct submission links** (both need your accounts — paste from §1/§2, takes ~2 min each):

| Post | Submit URL |
|---|---|
| Show HN | https://news.ycombinator.com/submit (title + url = https://github.com/onelitonbd/claw) |
| r/termux | https://www.reddit.com/r/termux/submit |

Pre-flight (run right before posting so the claims are true):

```bash
git pull
npm test                      # expect 86/86
node -p "require('./package.json').version"   # expect 0.4.0
gh release view v0.4.0 --json url -q .url     # release page live
```

- [ ] Show HN on a weekday morning US time; body from §1, link repo, mention MIT + zero-dep
- [ ] r/termux: body from §2; include the honest scope notes (wake ≠ wakeword, WhatsApp opt-in)
- [ ] Reply to every comment in the first 2 hours
- [ ] Cross-post demo GIF (gateway UI: 💤 button → dream SSE event) if possible
- [ ] Track visits: `gh api repos/onelitonbd/claw` stargazers + `/stargazers` over time
