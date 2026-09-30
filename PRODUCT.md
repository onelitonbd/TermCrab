# TermCrab — Product Plan

> A real, publishable product: the mobile-native personal AI agent.
> This document is the "how do we get there" roadmap. Updated 2026-09-29.

## 1. The bet

OpenClaw proved the category: **people want an agent that runs on their own machine,
answers in their chat apps, and actually does things.** It got 390k+ stars — but it is a
desktop/server product wearing a phone as a remote control. The community runs it on
Android only through proot Ubuntu, hand-patched shims, and battery hacks
(see [OPENCLAW_REPORT.md](OPENCLAW_REPORT.md) §5).

**TermCrab's bet:** the best place for a personal agent in the developing world (and for
millions of idle phones) is **Termux-native** — no cloud bill, no proot, no dependency
hell. We build the same architecture (gateway → agent loop → skills → markdown memory)
with a **mobile-first execution layer** nobody else has.

## 2. Positioning

| | OpenClaw | TermCrab |
|---|---|---|
| Target | laptops, Mac mini, VPS | **phones first** (Termux), then any Node host |
| Install | npm/pnpm + native deps + install.sh | `git clone && npm install` → **zero runtime deps** |
| Android | unofficial, community hacks | **first-class**: bionic guard, TMPDIR, boot, supervisor |
| Power | fixed heartbeat | **battery-adaptive heartbeat** (pauses on low battery) |
| Network | assumes stable link | **offline outbox** + retries |
| Footprint | 145MB–1GB idle | target **< 90MB** (measured: gateway idle ≈ 45–60MB) |
| Security | learned via CVEs | secure defaults from day one (loopback, tokens, allowlists) |

**Name/brand:** "TermCrab" (crab = carries its home everywhere; not affiliated with the
OpenClaw project or its trademarks). Renameable before first public launch.

**IAP/ICP:** (1) Termux power users & self-hosters, (2) people repurposing old Android
phones as always-on servers, (3) privacy-first users who refuse cloud assistants,
(4) developers in low-data markets where a free phone beats a $20/mo VPS.

## 3. What ships TODAY (v0.1.0 — done in this repo)

- [x] Gateway: HTTP API + SSE events, loopback + token auth (constant-time), health
- [x] Agent loop: tool-calling across providers (Anthropic / OpenAI-compatible / mock),
      transcript JSONL with rolling window, timeouts, error containment
- [x] Tools: `exec` (policy-gated), file ops (root-bounded), `web_fetch`, `load_skill`,
      `remember`, `search_memory`, `get_time`
- [x] Skills: SKILL.md folders, progressive disclosure, user override, 4 bundled
- [x] Memory: MEMORY.md + daily logs + lexical search, human-editable
- [x] Channels: Web control UI (mobile-first PWA-ish page), CLI REPL, Telegram
      (allowlist-enforced, HTML-safe, chunked, commands)
- [x] Mobile layer: bionic guard, TMPDIR fix, power-aware heartbeat, offline outbox,
      supervisor (systemd replacement), Termux:Boot installer, doctor
- [x] Onboard wizard (interactive + fully scriptable flags)
- [x] Tests: 33 unit/integration tests (`node --test`), CI workflow
- [x] Docs: README, ARCHITECTURE, API, TERMUX, SECURITY, CHANGELOG

## 4. Roadmap — how we get there

### v0.2 — "Daily driver" ✅ SHIPPED (2026-09-29, this release)
- [x] **Provider streaming** → typewriter UI + live CLI output (Anthropic & OpenAI-compatible SSE)
- [x] **Cron scheduler** — user-defined schedules (`termcrab cron add …`), battery-aware,
      REST API + next-run previews
- [x] **OpenClaw-style skills import** — `termcrab skills import <folder|git-url>`
      (instant access to existing SKILL.md ecosystems, zero lock-in)
- [x] **Termux notifications** — ongoing gateway status + per-run alerts
- [x] Session picker + transcript loading in the control UI

### v0.3 — "Where the users live" ✅ SHIPPED (2026-09-29, this release)
- [x] **WhatsApp channel** — optional Baileys extension (core stays zero-dep),
      QR pairing, allowlist-secure, outbox-backed, `/new` `/status` `/agents`
- [x] **Multi-agent profiles** — `workspace/agents/<name>/SOUL.md`, `@name` routing
      in channels, `--as` / `/as` in CLI, `POST /api/chat {agent}`
- [x] **Cron management UI** — list/add/pause/run/delete from the control panel
- [x] **Voice** — `termcrab say` TTS chain (Termux→espeak→mac say) + `voice` skill
- [x] **Local models guide** (`docs/LOCAL.md`) + localhost endpoint probe in doctor
- [x] Signal (signal-cli): evaluated — external daemon dependency; deferred until
      demand justifies the ops burden (documented in doctor output)

### v0.4 — "Smarter crab" ✅ SHIPPED (2026-09-29, this release)
- [x] **Tiered inference** — `localProvider` config + `--tier local` / `RunOpts.tier`:
      lightweight tasks (dreaming, drafts) route to llama.cpp/Ollama on-device,
      automatic fallback to the cloud provider when local is off/down
- [x] **"Dreaming" consolidation** — idle/charging-gated dream cycles distill recent
      sessions into long-term MEMORY.md facts (`termcrab dream`, scheduler, 💤 UI button)
- [x] **Embedding memory search** — optional `@huggingface/transformers` extension,
      hybrid lexical + vector ranking (score merge), core stays zero-dependency
- [x] **Voice wake loop** — `termcrab wake` two-phase STT session (keyword arms,
      next utterance = command, reply spoken); honest scope: not an always-on
      DSP wakeword (battery), not claimed as one
- [x] **Launch kit** — `docs/LAUNCH.md` (Show HN post, r/termux post, 5-min demo)
- [x] Doctor: local-tier / dreaming / embeddings checks; hybrid index in `/api/memory`
- [x] **0.4.1** — offline model drop-in (`~/.termcrab/models/Xenova/…`), q8 default

### v0.5 — "Works everywhere" 🔜 (scope: [docs/V05.md](docs/V05.md))
- P0 #0: **web control parity** — every CLI control exposed in the control UI
  (config/doctor/memory/skills/agents/say/boot/status), phased; wake/onboard/update in phase 3
- P0: `termcrab update` (release-channel self-update), `doctor --share`,
      `import openclaw` migration, 5-minute fresh-install path (pinned installer)
- P1: memory editor + dream history UI, session export/purge, skills scaffold,
      `embeddings setup`, remote-access guide
- P2 spikes (timeboxed): real wake word, whisper.cpp dictation, Signal re-eval, CI enablement

### v1.0 — "Publish" (month 2–3)
- npm publish (`termcrab`), versioned releases, signed install script
- F-Droid-friendly wrapper APK (Termux + bootstrapped TermCrab) — one-tap install
- Website + demo video + docs site; compatibility layer: `termcrab import openclaw`
  (migrate `~/.openclaw` workspace/config)
- Plugin SDK: publish channels/tools as packages (OpenClaw-style `extensions/`)

### Distribution (go-to-market)
1. **Dev communities:** Show HN, r/termux, r/LocalLLaMA, r/selfhosted, X/Twitter build-in-public thread
2. **Content:** "Turn your old phone into a private AI assistant" tutorial (dev.to / Medium / YouTube)
3. **Ecosystem:** submit to awesome-selfhosted, awesome-termux, ClawHub-adjacent lists (as a *reader*)
4. **Loops:** `termcrab doctor --share` (redacted report) for issue triage; template
   SOUL.md gallery ("assistant for students / devs / families")

### Monetization (honest options, in order of likelihood)
1. **Open-core:** core stays MIT; optional paid **CrabCloud** — relay/tunnel so you can
   reach your gateway from outside the LAN without networking skills (like Tailscale
   Serve, hosted + usage-based)
2. **Pro packs:** advanced skills/templates + priority support for teams/families
3. **Sponsorships & bounties:** channel implementations (Teams, LINE…), device OEM tie-ins
4. **Hosted managed gateway** for non-technical users (monthly, bridges to their phone)

## 5. Success metrics

| Horizon | Metric |
|---|---|
| Week 2 | 100 GitHub stars, 10 issues, 3 external contributors |
| Month 1 | 1k stars, 50 "ran it on my old phone" reports, <10min first-run success |
| Month 3 | npm downloads 5k/mo, v1.0, first CrabCloud paid pilot |

North-star: **weekly active gateways** (a gateway that answered ≥1 message/day).

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Android OEM kills background processes | doctor checks + boot script + foreground notification + docs for each OEM |
| WhatsApp/ToS risk on unofficial APIs | Telegram-first; WhatsApp opt-in with warnings |
| Small local models can't call tools | tiered tasks (cloud reasons, local summarizes); don't promise parity |
| OpenClaw ecosystem gravity | read their skills/config formats — interop instead of war |
| Security incident (the category's track record) | loopback default, tokens, allowlists, no auto-update, SECURITY.md, slow privileged defaults |
| Maintainer bandwidth | tests + CI from day one; scope discipline (v0.2 list is deliberately small) |

## 7. Why this team can win

Mobile-native is a **focus** problem, not a funding problem: every feature in §3 exists
because a phone demanded it (bionic guard, power budget, outbox, zero deps). Desktop
projects will always treat Android as a port. We treat it as the home field.
