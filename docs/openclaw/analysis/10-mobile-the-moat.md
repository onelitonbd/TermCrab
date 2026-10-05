# The mobile layer is the moat

**Their pages:** 26 `/platforms` + 25 `/nodes` + 43 `/install`. Be precise about what that means: they *do* ship an official Android app, but the doc says it plainly — *"Role: companion node app (Android does not host the Gateway). Gateway required: yes (run it on macOS, Linux, or Windows via WSL2)"* (`/platforms/android`). So Android is a **remote control**, and using it means running a gateway on a computer. **Not one of the 1,335 pages installs the agent itself on Android** — for that, users are on their own with community guides, Reddit threads, proot and shims (their Termux scripts SSH to a host: `/help/scripts.md`). The precise head-to-head lives in [BEAT-PLAN.md](../BEAT-PLAN.md).
**Catalogue:** [`../sections/07-platforms.md`](../sections/07-platforms.md), [`../sections/02-install.md`](../sections/02-install.md).

---

## 1. What the comparison actually says

OpenClaw on Android, per the community record: the official installer fails (glibc and systemd assumptions), so you install proot Ubuntu (~3GB, +~800 ms per tool call), hand-patch a Node shim so `os.networkInterfaces()` stops crashing the process ("Error 13"), invent a `TMPDIR` because Android has no `/tmp`, then keep it alive with tmux against an OS that kills background processes.

TermCrab, verified in this repository:

| Capability | Evidence | Status |
|---|---|---|
| bionic guard loaded **first** (`src/bin/termcrab.ts`) — Error 13 impossible by construction | `src/mobile/bionic.ts` | 🏅 BETTER |
| `TMPDIR` defaulting | same guard | 🏅 BETTER |
| Supervisor replaces systemd (lock file, restart watchdog) | `src/mobile/supervisor.ts` | 🏅 BETTER |
| Termux:Boot script installer (`termux-wake-lock` + supervisor) | `src/mobile/boot.ts` | 🏅 BETTER |
| Battery-aware heartbeat, pauses under 20% | `src/mobile/power.ts` | 🏅 BETTER |
| Offline outbox: store-and-forward on flaky mobile networks | `src/mobile/outbox.ts` | 🏅 BETTER |
| Doctor that detects Play-Store Termux, missing wake-lock, battery optimisation, proot leftovers | `src/mobile/doctor.ts` | 🏅 BETTER |
| Offline STT (optional whisper.cpp), TTS, wake-word voice loop | `src/mobile/{stt,whisper,tts,wake}.ts` | 🏅 BETTER |
| 15 Termux:API tools (camera, SMS, clipboard, battery, wifi, contacts, notification, location…) | `src/agent/toolbox.ts` | 🏅 BETTER |
| Zero runtime dependencies → installs on `nodejs-lts` (Node ≥ 20.10) | `package.json` | 🏅 BETTER |
| No native app; Termux:API is the bridge | — | ⚪ (by design) |

**All 13 BETTER rows in the census live in this layer.** It is 79% complete, it is the reason the project exists, and it is the one thing a 2,000-contributor project cannot copy quickly — because their architecture assumes a desktop.

## 2. The uncomfortable corollary

The moat is also the reason the gap in the core hurts more than it would for a desktop agent. A phone agent that loses messages, forgets what it was told, and can be driven by anything on the LAN is worse than a desktop agent with the same defects: you carry it, you depend on it, and you may be paying for the tokens that leaked.

So the sequencing in [ROADMAP.md](../ROADMAP.md) is not a compromise on the moat — **the core lane is what makes the moat credible.**

## 3. The move

1. **Protect the layer with tests.** `test/phone-tools.test.ts` exists; add a soak/behaviour test for the supervisor restart path and the outbox retry path. A moat you cannot regression-test is a moat you will lose in month six.
2. **Make the phone story the README's first paragraph.** It currently opens with "always-on AI agent that lives in your Termux" — good — but the second half is a feature list that reads like a desktop agent's. Rewrite it around what happens *on the device*: "reads your SMS", "takes a photo when you ask", "notifies you when a job finishes", "keeps working when the network drops".
3. **Ship the Termux-specific docs.** `docs/TERMUX.md` exists; extend it into the install path OpenClaw does not have: F-Droid Termux, `pkg install nodejs-lts`, `termcrab onboard`, `termcrab boot install`, battery-exemption steps for MIUI/ColorOS, and what to do when Android kills it anyway. This document is a competitive asset: it is the page their docs do not have.
4. **Measure the claims.** The earlier product plan targets ≤90 MB idle and ≤400 ms cold start. Measure both on a real device and put the numbers (with the phone model) in the README. Unmeasured performance claims are how trust dies.
5. **Do not build the native app** (see ROADMAP §4). Termux:API gives 80% of it for 0% of the maintenance; the 20% (foreground service polish, widgets) can wait until users ask.

## 4. Done tests

- Fresh device, Termux from F-Droid, four commands to a working agent — timed, documented, with screenshots.
- Kill the gateway process; the supervisor restarts it within 30 seconds; `termcrab status` shows the restart count.
- Airplane mode: send a Telegram message, restore connectivity, the reply arrives exactly once.
- Battery: heartbeat frequency visibly changes between charging and 15% battery (log lines as evidence).
