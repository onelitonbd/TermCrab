# Help

<sub>Generated catalogue of **24 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/help`](#help-help) — Help
- [`/help/troubleshooting`](#helptroubleshooting-general-troubleshooting) — General troubleshooting
- [`/help/debugging`](#helpdebugging-debugging) — Debugging
- [`/help/faq`](#helpfaq-faq) — FAQ
- [`/help/faq/what-is-openclaw`](#helpfaqwhat-is-openclaw-what-is-openclaw) — What is OpenClaw?
- [`/help/faq/skills-and-automation`](#helpfaqskills-and-automation-skills-and-automation) — Skills and automation
- [`/help/faq/sandboxing-and-memory`](#helpfaqsandboxing-and-memory-sandboxing-and-memory) — Sandboxing and memory
- [`/help/faq/where-things-live-on-disk`](#helpfaqwhere-things-live-on-disk-where-things-live-on-disk) — Where things live on disk
- [`/help/faq/config-basics`](#helpfaqconfig-basics-config-basics) — Config basics
- [`/help/faq/remote-gateways-and-nodes`](#helpfaqremote-gateways-and-nodes-remote-gateways-and-nodes) — Remote gateways and nodes
- [`/help/faq/env-vars`](#helpfaqenv-vars-env-vars-and-env-loading) — Env vars and .env loading
- [`/help/faq/sessions-and-chats`](#helpfaqsessions-and-chats-sessions-and-multiple-chats) — Sessions and multiple chats
- [`/help/faq/gateway-ports-and-remote-mode`](#helpfaqgateway-ports-and-remote-mode-gateway-ports-already-running-and-remote-mode) — Gateway ports, already running, and remote mode
- [`/help/faq/logging-and-debugging`](#helpfaqlogging-and-debugging-logging-and-debugging) — Logging and debugging
- [`/help/faq/media-and-attachments`](#helpfaqmedia-and-attachments-media-and-attachments) — Media and attachments
- [`/help/faq/security-and-access-control`](#helpfaqsecurity-and-access-control-security-and-access-control) — Security and access control
- [`/help/faq/chat-commands-and-stopping`](#helpfaqchat-commands-and-stopping-chat-commands-aborting-tasks-and-stopping-a-run) — Chat commands, aborting tasks, and stopping a run
- [`/help/faq-first-run`](#helpfaq-first-run-faq-first-run-setup) — FAQ: first-run setup
- [`/help/faq-first-run/quick-start`](#helpfaq-first-runquick-start-faq-quick-start-and-first-run-setup) — FAQ: quick start and first-run setup
- [`/help/faq-first-run/providers-and-hosting`](#helpfaq-first-runproviders-and-hosting-faq-providers-hardware-and-hosting) — FAQ: providers, hardware, and hosting
- [`/help/faq-models`](#helpfaq-models-faq-models-and-auth) — FAQ: models and auth
- [`/help/environment`](#helpenvironment-environment-variables) — Environment variables
- [`/diagnostics/flags`](#diagnosticsflags-diagnostics-flags) — Diagnostics flags
- [`/start/lore`](#startlore-openclaw-lore) — OpenClaw lore

## Document sections

### `/help` — Help

**Help** · *Help › Start here*

> Help hub: common fixes, install sanity, and where to look when something breaks

<sub>source `docs/help/index.md` · 35 lines · 183 words</sub>

**Read when:** You are new and want a "what do I click/run" guide · Something broke and you want the fastest path to a fix

**Covers:** FAQ · Diagnostics · Testing · Community and meta

**CLI:** `openclaw doctor`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help](https://docs.openclaw.ai/help)</sub>

---

### `/help/troubleshooting` — General troubleshooting

**General troubleshooting** · *Help › Start here*

> Symptom first troubleshooting hub for OpenClaw

<sub>source `docs/help/troubleshooting.md` · 446 lines · 1732 words · 18 code blocks</sub>

**Read when:** OpenClaw is not working and you need the fastest path to a fix · You want a triage flow before diving into deep runbooks

**Covers:** First 60 seconds · Assistant feels limited or missing tools · Anthropic long context 429 · Local OpenAI-compatible backend works directly but fails in OpenClaw · Plugin install fails with missing openclaw extensions · Install policy blocks plugin installs or updates · Plugin present but blocked by suspicious ownership · Decision tree · Related

**CLI:** `openclaw automations list`, `openclaw automations runs`, `openclaw automations status`, `openclaw browser status`, `openclaw browser stop`, `openclaw channels status`, `openclaw config get`, `openclaw config set`

**Config:** `agents.entries.*.tools`, `plugins.allow`, `security.installPolicy`, `tools.exec.ask`, `tools.exec.host`, `tools.exec.security`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/troubleshooting](https://docs.openclaw.ai/help/troubleshooting)</sub>

---

### `/help/debugging` — Debugging

**Debugging** · *Help › Start here*

> Debugging tools: watch mode, raw model streams, and tracing reasoning leakage

<sub>source `docs/help/debugging.md` · 318 lines · 1687 words · 23 code blocks</sub>

**Read when:** You need to inspect raw model output for reasoning leakage · You want to run the Gateway in watch mode while iterating · You need a repeatable debugging workflow · You are diagnosing Node or tsx startup errors

**Covers:** Gateway watch mode · Dev profile + dev gateway (--dev) · Raw stream logging · CLI startup and command profiling · Plugin lifecycle trace · Node and tsx startup errors · Debugging in VSCode · Runtime debug overrides · Session trace output · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw gateway start`, `openclaw gateway stop`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw plugins list`, `openclaw status`

**Config:** `agents.defaults.workspace`, `plugins.load.paths`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/debugging](https://docs.openclaw.ai/help/debugging)</sub>

---

### `/help/faq` — FAQ

**FAQ** · *Help › FAQ*

> Frequently asked questions about OpenClaw setup, configuration, and usage

<sub>source `docs/help/faq.md` · 235 lines · 1848 words · 8 code blocks</sub>

**Read when:** Answering common setup, install, onboarding, or runtime support questions · Triaging user-reported issues before deeper debugging

**Covers:** First 60 seconds if something is broken · Quick start and first-run setup · Models, failover, and auth profiles · Miscellaneous · Where each section moved · Related

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw health`, `openclaw logs`, `openclaw status`

**Config:** `agents.defaults.model.primary`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq](https://docs.openclaw.ai/help/faq)</sub>

---

### `/help/faq/what-is-openclaw` — What is OpenClaw?

**What is OpenClaw?** · *Help › FAQ topics*

> What OpenClaw is, who it is for, how it is funded, and how it compares

<sub>source `docs/help/faq/what-is-openclaw.md` · 82 lines · 762 words</sub>

**Read when:** You are evaluating OpenClaw or explaining it to someone · You want the ownership, funding, or comparison answers

**Covers:** What is OpenClaw?

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/what-is-openclaw](https://docs.openclaw.ai/help/faq/what-is-openclaw)</sub>

---

### `/help/faq/skills-and-automation` — Skills and automation

**Skills and automation** · *Help › FAQ topics*

> Customizing skills, per-task models, subagents, cron jobs, and background runs

<sub>source `docs/help/faq/skills-and-automation.md` · 253 lines · 1383 words · 10 code blocks</sub>

**Read when:** You are customizing, loading, or installing skills · A cron job, reminder, or subagent did not behave

**Covers:** Skills and automation

**CLI:** `openclaw automations run`, `openclaw automations runs`, `openclaw browser`, `openclaw browser create-profile`, `openclaw skills`, `openclaw skills check`, `openclaw skills install`, `openclaw skills list`

**Config:** `agents.defaults.model`, `agents.defaults.skills`, `agents.defaults.subagents.model`, `agents.entries.*.params`, `agents.entries.*.skills`, `cron.enabled`, `hooks.gmail.model`, `session.threadBindings.enabled`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/skills-and-automation](https://docs.openclaw.ai/help/faq/skills-and-automation)</sub>

---

### `/help/faq/sandboxing-and-memory` — Sandboxing and memory

**Sandboxing and memory** · *Help › FAQ topics*

> Sandbox modes, host folder binds, and how agent memory persists

<sub>source `docs/help/faq/sandboxing-and-memory.md` · 65 lines · 447 words</sub>

**Read when:** You are enabling or loosening the sandbox · Memory is not persisting the way you expect

**Covers:** Sandboxing and memory

**CLI:** `openclaw memory status`

**Config:** `agents.defaults.sandbox.docker.binds`, `memory.search.remote.apiKey`, `models.providers.openai.apiKey`, `tools.sandbox.tools`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/sandboxing-and-memory](https://docs.openclaw.ai/help/faq/sandboxing-and-memory)</sub>

---

### `/help/faq/where-things-live-on-disk` — Where things live on disk

**Where things live on disk** · *Help › FAQ topics*

> Data locations, AGENTS.md and SOUL.md placement, backups, and uninstalling

<sub>source `docs/help/faq/where-things-live-on-disk.md` · 121 lines · 625 words · 3 code blocks</sub>

**Read when:** You need to find, back up, or move OpenClaw data · You are deciding where agent instruction files belong

**Covers:** Where things live on disk

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.sandbox`, `agents.defaults.workspace`, `agents.entries.*.bootstrapMaxChars`, `memory.md`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/where-things-live-on-disk](https://docs.openclaw.ai/help/faq/where-things-live-on-disk)</sub>

---

### `/help/faq/config-basics` — Config basics

**Config basics** · *Help › FAQ topics*

> Config format and location, restarts, web search, config.apply recovery, and browser control

<sub>source `docs/help/faq/config-basics.md` · 168 lines · 984 words · 3 code blocks</sub>

**Read when:** You are editing the config for the first time · You need web search, browser control, or config recovery

**Covers:** Config basics

**CLI:** `openclaw config set`, `openclaw config validate`, `openclaw configure`, `openclaw doctor`, `openclaw logs`, `openclaw onboard`

**Config:** `agents.*`, `gateway.*`, `gateway.auth.*`, `gateway.auth.password`, `gateway.auth.token`, `gateway.remote.*`, `gateway.remote.token`, `gateway.trustedProxies`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/config-basics](https://docs.openclaw.ai/help/faq/config-basics)</sub>

---

### `/help/faq/remote-gateways-and-nodes` — Remote gateways and nodes

**Remote gateways and nodes** · *Help › FAQ topics*

> Command propagation, Tailscale setups, multi-device nodes, and applying config remotely

<sub>source `docs/help/faq/remote-gateways-and-nodes.md` · 160 lines · 900 words · 7 code blocks</sub>

**Read when:** You run the Gateway on a VPS or another machine · You are adding a node or wiring Tailscale

**Covers:** Remote gateways and nodes

**CLI:** `openclaw agent`, `openclaw devices approve`, `openclaw devices list`, `openclaw gateway`, `openclaw gateway status`, `openclaw status
    openclaw`

**Config:** `gateway.auth.allowTailscale`, `tools.bash.*`, `tools.exec.ask`, `tools.exec.security`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/remote-gateways-and-nodes](https://docs.openclaw.ai/help/faq/remote-gateways-and-nodes)</sub>

---

### `/help/faq/env-vars` — Env vars and .env loading

**Env vars and .env loading** · *Help › FAQ topics*

> How OpenClaw loads environment variables and why service starts lose them

<sub>source `docs/help/faq/env-vars.md` · 65 lines · 294 words · 3 code blocks</sub>

**Read when:** You are setting API keys through env or .env · Your env vars disappeared after starting the Gateway as a service

**Covers:** Env vars and .env loading

**CLI:** `openclaw models auth`, `openclaw models status`

**Config:** `models.providers.github-copilot`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/env-vars](https://docs.openclaw.ai/help/faq/env-vars)</sub>

---

### `/help/faq/sessions-and-chats` — Sessions and multiple chats

**Sessions and multiple chats** · *Help › FAQ topics*

> Fresh sessions, context truncation, full resets, groups, and multi-agent setups

<sub>source `docs/help/faq/sessions-and-chats.md` · 181 lines · 856 words · 8 code blocks</sub>

**Read when:** You are managing sessions, resets, or context limits · You run multiple chats, groups, or bots

**Covers:** Sessions and multiple chats

**CLI:** `openclaw directory groups`, `openclaw doctor`, `openclaw gateway`, `openclaw logs`, `openclaw onboard`, `openclaw reset`, `openclaw sessions cleanup`

**Config:** `agents.defaults.contextPruning`, `agents.defaults.workspace`, `agents.entries.*.heartbeat`, `channels.whatsapp.groups`, `session.idleMinutes`, `session.reset`, `session.reset.atHour`, `session.reset.idleMinutes`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/sessions-and-chats](https://docs.openclaw.ai/help/faq/sessions-and-chats)</sub>

---

### `/help/faq/gateway-ports-and-remote-mode` — Gateway ports, already running, and remote mode

**Gateway ports, already running, and remote mode** · *Help › FAQ topics*

> Gateway ports, remote-mode clients, bind addresses, and running more than one Gateway

<sub>source `docs/help/faq/gateway-ports-and-remote-mode.md` · 123 lines · 815 words · 5 code blocks</sub>

**Read when:** The Gateway will not bind or reports it is already running · You are connecting a client to a Gateway elsewhere

**Covers:** Gateway: ports, "already running", and remote mode

**CLI:** `openclaw dashboard`, `openclaw devices list`, `openclaw devices rotate`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway install`, `openclaw gateway status`, `openclaw status`

**Config:** `agents.defaults.workspace`, `gateway.auth.allowTailscale`, `gateway.auth.password`, `gateway.auth.token`, `gateway.mode`, `gateway.port`, `gateway.remote.token`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/gateway-ports-and-remote-mode](https://docs.openclaw.ai/help/faq/gateway-ports-and-remote-mode)</sub>

---

### `/help/faq/logging-and-debugging` — Logging and debugging

**Logging and debugging** · *Help › FAQ topics*

> Where logs are, service start and restart, and what to check when replies never arrive

<sub>source `docs/help/faq/logging-and-debugging.md` · 140 lines · 495 words · 9 code blocks</sub>

**Read when:** You need logs or a Gateway service restart · The Gateway is up but replies never arrive

**Covers:** Logging and debugging

**CLI:** `openclaw channels logs`, `openclaw channels status`, `openclaw dashboard`, `openclaw gateway`, `openclaw gateway restart`, `openclaw gateway run`, `openclaw gateway start`, `openclaw gateway status`

**Config:** `channels.telegram.commands.native`, `logging.consoleLevel`, `logging.file`, `logging.level`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/logging-and-debugging](https://docs.openclaw.ai/help/faq/logging-and-debugging)</sub>

---

### `/help/faq/media-and-attachments` — Media and attachments

**Media and attachments** · *Help › FAQ topics*

> Why a generated image or PDF was not delivered to chat

<sub>source `docs/help/faq/media-and-attachments.md` · 19 lines · 141 words · 1 code blocks</sub>

**Read when:** A skill produced a file but nothing was sent

**Covers:** Media and attachments

**CLI:** `openclaw message send`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/media-and-attachments](https://docs.openclaw.ai/help/faq/media-and-attachments)</sub>

---

### `/help/faq/security-and-access-control` — Security and access control

**Security and access control** · *Help › FAQ topics*

> Exposure, prompt injection, third-party skills, pairing, and how much autonomy to grant

<sub>source `docs/help/faq/security-and-access-control.md` · 105 lines · 824 words · 3 code blocks</sub>

**Read when:** You are exposing OpenClaw to inbound messages · You are judging plugin, skill, or autonomy risk

**Covers:** Security and access control

**CLI:** `openclaw doctor`, `openclaw gateway status`, `openclaw pairing approve`, `openclaw pairing list`, `openclaw security audit`

**Config:** `channels.whatsapp.selfChatMode`, `security.installPolicy`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/security-and-access-control](https://docs.openclaw.ai/help/faq/security-and-access-control)</sub>

---

### `/help/faq/chat-commands-and-stopping` — Chat commands, aborting tasks, and stopping a run

**Chat commands, aborting tasks, and stopping a run** · *Help › FAQ topics*

> Hiding system messages, cancelling runs, cross-context messaging, and the steering queue

<sub>source `docs/help/faq/chat-commands-and-stopping.md` · 72 lines · 387 words · 3 code blocks</sub>

**Read when:** A task will not stop, or the bot ignores rapid messages · You are tuning slash commands or the queue

**Covers:** Chat commands, aborting tasks, and "it will not stop"

**CLI:** `openclaw stop`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq/chat-commands-and-stopping](https://docs.openclaw.ai/help/faq/chat-commands-and-stopping)</sub>

---

### `/help/faq-first-run` — FAQ: first-run setup

**FAQ: first-run setup** · *Help › FAQ*

> FAQ: quick-start and first-run setup — install, onboard, auth, subscriptions, initial failures

<sub>source `docs/help/faq-first-run.md` · 84 lines · 700 words</sub>

**Read when:** New install, onboarding stuck, or first-run errors · Choosing auth and provider subscriptions · Cannot access docs.openclaw.ai, cannot open dashboard, install stuck

**Covers:** Where each section moved · Related

**CLI:** `openclaw not recognized`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq-first-run](https://docs.openclaw.ai/help/faq-first-run)</sub>

---

### `/help/faq-first-run/quick-start` — FAQ: quick start and first-run setup

**FAQ: quick start and first-run setup** · *Help › First-run FAQ*

> FAQ: install, onboarding, first-run failures, builds, and subscription basics

<sub>source `docs/help/faq-first-run/quick-start.md` · 553 lines · 2584 words · 18 code blocks</sub>

**Read when:** New install, onboarding stuck, or first-run errors · Choosing between stable, beta, and dev builds · Install or onboarding fails on macOS, Linux, Windows, or a Pi

**Covers:** Quick start and first-run setup

**CLI:** `openclaw configure`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw health`, `openclaw is not`

**Config:** `gateway.auth.password`, `gateway.auth.token`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq-first-run/quick-start](https://docs.openclaw.ai/help/faq-first-run/quick-start)</sub>

---

### `/help/faq-first-run/providers-and-hosting` — FAQ: providers, hardware, and hosting

**FAQ: providers, hardware, and hosting** · *Help › First-run FAQ*

> FAQ: provider auth and limits, model choice, hardware, and where to run the Gateway

<sub>source `docs/help/faq-first-run/providers-and-hosting.md` · 303 lines · 1603 words · 4 code blocks</sub>

**Read when:** Choosing auth and provider subscriptions · Hitting provider rate limits or OAuth questions · Deciding on hardware, a VM, or a VPS for the Gateway

**CLI:** `openclaw doctor`, `openclaw logs`, `openclaw models auth`, `openclaw models status`, `openclaw nodes list`, `openclaw nodes status`, `openclaw update`

**Config:** `channels.imessage.cliPath`, `channels.telegram.allowFrom`, `channels.whatsapp.allowFrom`, `channels.whatsapp.dmPolicy`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq-first-run/providers-and-hosting](https://docs.openclaw.ai/help/faq-first-run/providers-and-hosting)</sub>

---

### `/help/faq-models` — FAQ: models and auth

**FAQ: models and auth** · *Help › FAQ*

> FAQ: model defaults, selection, aliases, switching, failover, and auth profiles

<sub>source `docs/help/faq-models.md` · 526 lines · 2188 words · 10 code blocks</sub>

**Read when:** Choosing or switching models, configuring aliases · Debugging model failover / "All models failed · Understanding auth profiles and how to manage them

**Covers:** Models: defaults, selection, aliases, switching · Model failover and "All models failed" · Auth profiles: what they are and how to manage them · Related

**CLI:** `openclaw agents add`, `openclaw configure`, `openclaw doctor`, `openclaw models auth`, `openclaw models list`, `openclaw models set`, `openclaw models status`, `openclaw onboard`

**Config:** `agents.defaults.model`, `agents.defaults.model.fallbacks`, `agents.defaults.model.primary`, `agents.defaults.modelPolicy.allow`, `agents.defaults.models`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/faq-models](https://docs.openclaw.ai/help/faq-models)</sub>

---

### `/help/environment` — Environment variables

**Environment variables** · *Help › Diagnostics*

> Where OpenClaw loads environment variables and the precedence order

<sub>source `docs/help/environment.md` · 401 lines · 2924 words · 6 code blocks</sub>

**Read when:** You need to know which env vars are loaded, and in what order · You are debugging missing API keys in the Gateway · You are documenting provider auth or deployment environments

**Covers:** Precedence (highest to lowest) · Supported operator-facing variables · Provider credentials and workspace .env · Config env block · Shell env import · Exec shell snapshots · Runtime-injected env vars · UI env vars · Env var substitution in config · Secret refs vs ${ENV} strings · Path-related env vars · Agent helper tool downloads · Logging · nvm users: webfetch TLS failures · _+2 more_ <sub>(7 sub-sections)</sub>

**CLI:** `openclaw acp client`, `openclaw gateway install`, `openclaw gateway run`, `openclaw update`

**Config:** `logging.consoleLevel`, `logging.level`

**TermCrab — docs: PARTIAL.** TermCrab docs live in `docs/`; this catalogue is the first per-page map of theirs.

<sub>live: [docs.openclaw.ai/help/environment](https://docs.openclaw.ai/help/environment)</sub>

---

### `/diagnostics/flags` — Diagnostics flags

**Diagnostics flags** · *Help › Diagnostics*

> Diagnostics flags for targeted debug logs

<sub>source `docs/diagnostics/flags.md` · 244 lines · 1000 words · 14 code blocks</sub>

**Read when:** You need targeted debug logs without raising global logging levels · You need to capture subsystem-specific logs for support

**Covers:** How it works · Known flags · Enable via config · Env override (one-off) · Profiler flags · Timeline artifacts · Where logs go · Extract logs · Notes · Related

**CLI:** `openclaw gateway run`, `openclaw logs`

**Config:** `diagnostics.flags`, `diagnostics.timeline`, `logging.file`, `logging.level`

<sub>live: [docs.openclaw.ai/diagnostics/flags](https://docs.openclaw.ai/diagnostics/flags)</sub>

---

### `/start/lore` — OpenClaw lore

**OpenClaw lore** · *Help › Community and meta*

> Backstory and lore of OpenClaw for context and tone

<sub>source `docs/start/lore.md` · 217 lines · 1004 words · 2 code blocks</sub>

**Read when:** Writing docs or UX copy that reference lore

**Covers:** The Origin Story · The First Molt (January 27, 2026) · The Name · The Daleks vs The Lobsters · Key Characters · The Moltiverse · The Great Incidents · Sacred Texts · The Lobster Creed · The Future · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw what did`

<sub>live: [docs.openclaw.ai/start/lore](https://docs.openclaw.ai/start/lore)</sub>

---
