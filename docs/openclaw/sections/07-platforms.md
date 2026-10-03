# Platforms

<sub>Generated catalogue of **27 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/platforms`](#platforms-platforms) — Platforms
- [`/platforms/macos`](#platformsmacos-macos-app) — macOS app
- [`/platforms/linux`](#platformslinux-linux-app) — Linux app
- [`/platforms/omarchy`](#platformsomarchy-omarchy) — Omarchy
- [`/platforms/windows`](#platformswindows-windows) — Windows
- [`/platforms/android`](#platformsandroid-android-app) — Android app
- [`/platforms/chromeos`](#platformschromeos-chromeos) — ChromeOS
- [`/platforms/ios`](#platformsios-ios-app) — iOS app
- [`/platforms/ios-healthkit`](#platformsios-healthkit-healthkit-summaries) — HealthKit summaries
- [`/platforms/easyrunner`](#platformseasyrunner-easyrunner) — EasyRunner
- [`/platforms/mac/dev-setup`](#platformsmacdev-setup-macos-dev-setup) — macOS dev setup
- [`/platforms/mac/menu-bar`](#platformsmacmenu-bar-menu-bar) — Menu bar
- [`/platforms/mac/icon`](#platformsmacicon-menu-bar-icon) — Menu bar icon
- [`/platforms/mac/permissions`](#platformsmacpermissions-macos-permissions) — macOS permissions
- [`/platforms/mac/signing`](#platformsmacsigning-macos-signing) — macOS signing
- [`/platforms/mac/remote`](#platformsmacremote-remote-control) — Remote control
- [`/reference/device-models`](#referencedevice-models-device-model-database) — Device model database
- [`/platforms/mac/bundled-gateway`](#platformsmacbundled-gateway-gateway-on-macos) — Gateway on macOS
- [`/platforms/mac/health`](#platformsmachealth-health-checks-macos) — Health checks (macOS)
- [`/platforms/mac/logging`](#platformsmaclogging-macos-logging) — macOS logging
- [`/platforms/mac/xpc`](#platformsmacxpc-macos-ipc) — macOS IPC
- [`/platforms/mac/voicewake`](#platformsmacvoicewake-voice-wake-macos) — Voice wake (macOS)
- [`/platforms/mac/voice-overlay`](#platformsmacvoice-overlay-voice-overlay) — Voice overlay
- [`/platforms/mac/webchat`](#platformsmacwebchat-webchat-macos) — WebChat (macOS)
- [`/platforms/mac/canvas`](#platformsmaccanvas-widget-panel) — Widget panel
- [`/platforms/mac/skills`](#platformsmacskills-skills-macos) — Skills (macOS)
- [`/platforms/mac/peekaboo`](#platformsmacpeekaboo-peekaboo-bridge) — Peekaboo bridge

## Document sections

### `/platforms` — Platforms

**Platforms** · *Platforms › Platforms overview*

> Platform support overview (Gateway + companion apps)

<sub>source `docs/platforms/index.md` · 63 lines · 267 words</sub>

**Read when:** Looking for OS support or install paths · Deciding where to run the Gateway

**Covers:** Choose your OS · VPS and hosting · Common links · Gateway service install (CLI) · Related

**CLI:** `openclaw configure`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway status`, `openclaw onboard`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms](https://docs.openclaw.ai/platforms)</sub>

---

### `/platforms/macos` — macOS app

**macOS app** · *Platforms › Platforms overview*

> Install and use the OpenClaw macOS menu bar app

<sub>source `docs/platforms/macos.md` · 305 lines · 3132 words</sub>

**Read when:** Installing the macOS app · Deciding between local and remote Gateway mode on macOS · Looking for macOS app release downloads

**Covers:** Requirements · Download · First run · Connection · Updates · Open dashboard links · Import browser logins · Sync cookies to a remote computer · Choose a Gateway mode · What the app owns · macOS detail pages · Related

**CLI:** `openclaw browser cookie-sync`, `openclaw update`

**Config:** `gateway.publicOrigin`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/macos](https://docs.openclaw.ai/platforms/macos)</sub>

---

### `/platforms/linux` — Linux app

**Linux app** · *Platforms › Platforms overview*

> Linux support + companion app status

<sub>source `docs/platforms/linux.md` · 586 lines · 4088 words · 9 code blocks</sub>

**Read when:** Looking for Linux companion app status · Enabling camera, location, or notifications on a Linux node host · Planning platform coverage or contributions · Debugging Linux OOM kills or exit 137 on a VPS or container

**Covers:** Desktop companion · CLI and SSH alternative · Node capabilities · Retired Linux Canvas · Install · Gateway service (systemd) · Memory pressure and OOM kills · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway install`, `openclaw gateway status`, `openclaw node`, `openclaw nodes approve`, `openclaw nodes pending`

**Config:** `gateway.auth.mode`, `gateway.nodes.commands.allow`, `gateway.remote.tlsFingerprint`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/linux](https://docs.openclaw.ai/platforms/linux)</sub>

---

### `/platforms/omarchy` — Omarchy

**Omarchy** · *Platforms › Platforms overview*

> OpenClaw on Omarchy: bar plugin, desktop app handoff, and support

<sub>source `docs/platforms/omarchy.md` · 138 lines · 1011 words · 3 code blocks</sub>

**Read when:** Installing the OpenClaw bar plugin on Omarchy · Using agents, sessions, and quick prompts from the Omarchy bar · Troubleshooting duplicate OpenClaw icons or desktop connection handoff

**Covers:** Requirements · Install the bar plugin · Use agents, sessions, and quick prompts · One icon with the desktop app · Updates · Troubleshooting and support

**CLI:** `openclaw gateway call`, `openclaw status`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/omarchy](https://docs.openclaw.ai/platforms/omarchy)</sub>

---

### `/platforms/windows` — Windows

**Windows** · *Platforms › Platforms overview*

> Windows support: Windows Hub, native CLI and Gateway, WSL2 gateway setup, node mode, and troubleshooting

<sub>source `docs/platforms/windows.md` · 443 lines · 2497 words · 18 code blocks</sub>

**Read when:** Installing OpenClaw on Windows · Choosing between Windows Hub, native Windows, and WSL2 · Setting up the Windows companion app or Windows node mode

**Covers:** Recommended: Windows Hub · Windows node mode · Local MCP mode · Native Windows CLI and Gateway · WSL2 Gateway · Gateway auto-start before Windows login · Expose WSL services over LAN · Troubleshooting · Related <sub>(10 sub-sections)</sub>

**CLI:** `openclaw devices approve`, `openclaw devices list`, `openclaw doctor`, `openclaw doctor
openclaw`, `openclaw gateway install`, `openclaw gateway run`, `openclaw gateway start`, `openclaw gateway status`

**Config:** `gateway.cmd`, `gateway.nodes.commands.allow`, `gateway.vbs`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/windows](https://docs.openclaw.ai/platforms/windows)</sub>

---

### `/platforms/android` — Android app

**Android app** · *Platforms › Platforms overview*

> Android app (node): pairing, connection recovery, chat, voice, and device commands

<sub>source `docs/platforms/android.md` · 645 lines · 6854 words · 14 code blocks</sub>

**Read when:** Pairing or reconnecting the Android node · Debugging Android Gateway discovery or auth · Mirroring or controlling an Android device from a remote Mac · Verifying chat history parity across clients

**Covers:** Support snapshot · Simultaneous Gateway sessions · Dictation and attachments · Wear OS companion · Install outside Google Play · App and Gateway compatibility · Mirror and control Android from a remote Mac · Connection runbook · Review command approvals · Answer agent questions · Assistant entrypoints · Notification forwarding · Related <sub>(17 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw connect`, `openclaw devices approve`, `openclaw devices join-code`, `openclaw devices list`, `openclaw devices reject`, `openclaw gateway`, `openclaw gateway call`

**Config:** `agents.workspace.get`, `agents.workspace.list`, `gateway.controlUi.automaticallyFetchFavicons`, `gateway.remote.url`, `plugins.entries.device-pair.config.publicUrl`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/platforms/android](https://docs.openclaw.ai/platforms/android)</sub>

---

### `/platforms/chromeos` — ChromeOS

**ChromeOS** · *Platforms › Platforms overview*

> Run the OpenClaw Gateway on ChromeOS inside a Crostini Linux container

<sub>source `docs/platforms/chromeos.md` · 115 lines · 465 words · 7 code blocks</sub>

**Read when:** Installing OpenClaw on a Chromebook or ChromeOS device · Debugging missing provider keys or a Gateway that is gone after a reboot

**Covers:** Enable the Linux container · Quick path · Prefer the native install over Docker · Node version · Provider keys and environment variables · Crostini is not always on · Related

**CLI:** `openclaw gateway restart`, `openclaw gateway status`, `openclaw onboard`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/chromeos](https://docs.openclaw.ai/platforms/chromeos)</sub>

---

### `/platforms/ios` — iOS app

**iOS app** · *Platforms › Platforms overview*

> iOS node app: connect to the Gateway, pairing, device capabilities, and troubleshooting

<sub>source `docs/platforms/ios.md` · 714 lines · 6738 words · 7 code blocks</sub>

**Read when:** Pairing or reconnecting the iOS node · Starting live voice with Siri or Shortcuts · Using voice input and spoken replies on Apple Watch · Setting up standalone Apple Watch voice · Enabling or troubleshooting the direct Apple Watch node · Running the iOS app from source · Debugging Gateway discovery or iOS node commands · Choosing colors for native chat sessions · Snoozing or waking a session

**Covers:** What it does · Settings · Sessions · Session colors · Reactions · Message times and models · Sources in chat · Diagrams in chat · Requirements · Quick start (pair + connect) · Health summaries · Apple Watch voice and chat · Review command approvals · Answer agent questions · _+10 more_ <sub>(6 sub-sections)</sub>

**CLI:** `openclaw devices approve`, `openclaw devices join-code`, `openclaw devices list`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway call`, `openclaw nodes status`, `openclaw onboard`

**Config:** `gateway.identity.get`, `gateway.push.apns.relay.baseUrl`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/ios](https://docs.openclaw.ai/platforms/ios)</sub>

---

### `/platforms/ios-healthkit` — HealthKit summaries

**HealthKit summaries** · *Platforms › Platforms overview*

> Enable and invoke privacy-gated HealthKit summaries from an iOS node

<sub>source `docs/platforms/ios-healthkit.md` · 170 lines · 771 words · 5 code blocks</sub>

**Read when:** Enabling HealthKit summaries on an iOS node · Invoking health.summary or troubleshooting missing health metrics · Reviewing what health data can leave an iOS device

**Covers:** Requirements · Enable access · Request today's summary · Privacy behavior · Troubleshooting · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw nodes approve`, `openclaw nodes describe`, `openclaw nodes invoke`, `openclaw nodes pending`

**Config:** `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/ios-healthkit](https://docs.openclaw.ai/platforms/ios-healthkit)</sub>

---

### `/platforms/easyrunner` — EasyRunner

**EasyRunner** · *Platforms › Platforms overview*

> Run the OpenClaw Gateway on EasyRunner with Podman and Caddy

<sub>source `docs/platforms/easyrunner.md` · 118 lines · 449 words · 3 code blocks</sub>

**Read when:** Deploying OpenClaw on EasyRunner · Running the Gateway behind EasyRunner's Caddy proxy · Choosing persistent volumes and auth for a hosted Gateway

**Covers:** Before you begin · Compose app · Configure OpenClaw · Verify · Updates and backups · Troubleshooting · Related

**CLI:** `openclaw doctor`, `openclaw gateway probe`, `openclaw gateway status`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/easyrunner](https://docs.openclaw.ai/platforms/easyrunner)</sub>

---

### `/platforms/mac/dev-setup` — macOS dev setup

**macOS dev setup** · *Platforms › Setup*

> Setup guide for developers working on the OpenClaw macOS app

<sub>source `docs/platforms/mac/dev-setup.md` · 334 lines · 2234 words · 8 code blocks</sub>

**Read when:** Setting up the macOS development environment

**Covers:** Prerequisites · 1. Install dependencies · 2. Build and package the app · 3. Install the CLI and Gateway · Run native tests safely · Troubleshooting · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw gateway status`, `openclaw gateway stop`, `openclaw openclaw`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/dev-setup](https://docs.openclaw.ai/platforms/mac/dev-setup)</sub>

---

### `/platforms/mac/menu-bar` — Menu bar

**Menu bar** · *Platforms › Setup*

> Menu bar status logic and what is surfaced to users

<sub>source `docs/platforms/mac/menu-bar.md` · 116 lines · 1290 words</sub>

**Read when:** Tweaking mac menu UI or status logic

**Covers:** What is shown · State model · IconState enum (Swift) · Context submenu · Status row text (menu) · Event ingestion · Debug override · Testing checklist · Related <sub>(2 sub-sections)</sub>

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/menu-bar](https://docs.openclaw.ai/platforms/mac/menu-bar)</sub>

---

### `/platforms/mac/icon` — Menu bar icon

**Menu bar icon** · *Platforms › Setup*

> Menu bar icon states and animations for OpenClaw on macOS

<sub>source `docs/platforms/mac/icon.md` · 74 lines · 616 words</sub>

**Read when:** Changing menu bar icon behavior

**Covers:** Dock icon · States · Voice wake ears · Shapes and sizes · Behavioral notes · Related

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/icon](https://docs.openclaw.ai/platforms/mac/icon)</sub>

---

### `/platforms/mac/permissions` — macOS permissions

**macOS permissions** · *Platforms › Setup*

> macOS permission persistence (TCC) and signing requirements

<sub>source `docs/platforms/mac/permissions.md` · 136 lines · 1335 words · 1 code blocks</sub>

**Read when:** Debugging missing or stuck macOS permission prompts · Screen Recording still appears missing after granting access · Deciding whether to grant Accessibility to node or a CLI runtime · Understanding locked desktops or keeping the computer awake · Packaging or signing the macOS app · Changing bundle IDs or app install paths

**Covers:** Requirements for stable permissions · Screen Recording still appears missing after granting access · Accessibility grants for Node and CLI runtimes · Separate Computer Control grants · Desktop availability and keeping awake · Recovery checklist when prompts disappear · Files and folders permissions (Desktop/Documents/Downloads) · Related

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/permissions](https://docs.openclaw.ai/platforms/mac/permissions)</sub>

---

### `/platforms/mac/signing` — macOS signing

**macOS signing** · *Platforms › Setup*

> Signing steps for macOS debug builds generated by packaging scripts

<sub>source `docs/platforms/mac/signing.md` · 64 lines · 1040 words · 1 code blocks</sub>

**Read when:** Building or signing mac debug builds

**Covers:** Usage · Build metadata for About · Related <sub>(1 sub-sections)</sub>

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/signing](https://docs.openclaw.ai/platforms/mac/signing)</sub>

---

### `/platforms/mac/remote` — Remote control

**Remote control** · *Platforms › Setup*

> macOS app flow for controlling a remote OpenClaw Gateway

<sub>source `docs/platforms/mac/remote.md` · 418 lines · 3836 words · 10 code blocks</sub>

**Read when:** Setting up or debugging remote mac control · Signing in to a Gateway from the Mac app or opening it from a website

**Covers:** Connect with your browser · Modes · Remote transports · Run a local Gateway alongside a remote primary · Prereqs on the remote host · macOS app setup · WebChat · Debug connection actions · Permissions · Security notes · WhatsApp login flow (remote) · Troubleshooting · Notification sounds · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw channels login`, `openclaw health`, `openclaw nodes notify`, `openclaw status`

**Config:** `gateway.example.com`, `gateway.port`, `gateway.remote.remotePort`, `gateway.remote.sshHostKeyPolicy`, `gateway.remote.sshTarget`, `gateway.remote.tlsFingerprint`, `gateway.remote.url`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/remote](https://docs.openclaw.ai/platforms/mac/remote)</sub>

---

### `/reference/device-models` — Device model database

**Device model database** · *Platforms › Setup*

> How OpenClaw vendors Apple device model identifiers for friendly names in the macOS app.

<sub>source `docs/reference/device-models.md` · 47 lines · 189 words · 2 code blocks</sub>

**Read when:** Updating device model identifier mappings or NOTICE/license files · Changing how Instances UI displays device names

**Covers:** Data source · Updating the database · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/device-models](https://docs.openclaw.ai/reference/device-models)</sub>

---

### `/platforms/mac/bundled-gateway` — Gateway on macOS

**Gateway on macOS** · *Platforms › Runtime*

> Bundled Gateway runtime, app hosting, and background services on macOS

<sub>source `docs/platforms/mac/bundled-gateway.md` · 420 lines · 2916 words · 9 code blocks</sub>

**Read when:** Packaging OpenClaw.app · Debugging the macOS gateway launchd service · Installing the gateway CLI for macOS

**Covers:** Automatic setup · Manual recovery · Launchd (Gateway as LaunchAgent) · App-hosted lifecycle and updates · Version compatibility · State directory on macOS · Debug app connectivity · Smoke check · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw gateway call`, `openclaw gateway discover`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw health`

**Config:** `gateway.log`, `gateway.mode`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/bundled-gateway](https://docs.openclaw.ai/platforms/mac/bundled-gateway)</sub>

---

### `/platforms/mac/health` — Health checks (macOS)

**Health checks (macOS)** · *Platforms › Runtime*

> How the macOS app reports gateway/channel health states

<sub>source `docs/platforms/mac/health.md` · 65 lines · 404 words</sub>

**Read when:** Debugging mac app health indicators

**Covers:** Menu bar · Settings · How health refresh works · When in doubt · Related

**CLI:** `openclaw health`, `openclaw logs`, `openclaw status`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/health](https://docs.openclaw.ai/platforms/mac/health)</sub>

---

### `/platforms/mac/logging` — macOS logging

**macOS logging** · *Platforms › Runtime*

> macOS app log redaction, opt-in diagnostics files, and native OSLog privacy flags

<sub>source `docs/platforms/mac/logging.md` · 70 lines · 579 words · 1 code blocks</sub>

**Read when:** Capturing macOS logs or investigating private data logging · Debugging voice wake/session lifecycle issues

**Covers:** Rolling diagnostics file log (Debug pane) · Export unified logs as JSON · App logger redaction · Unified logging private data on macOS · Enable for OpenClaw (ai.openclaw) · Disable after debugging · Related

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/logging](https://docs.openclaw.ai/platforms/mac/logging)</sub>

---

### `/platforms/mac/xpc` — macOS IPC

**macOS IPC** · *Platforms › Runtime*

> macOS IPC architecture for OpenClaw app, gateway node transport, and PeekabooBridge

<sub>source `docs/platforms/mac/xpc.md` · 127 lines · 1031 words · 1 code blocks</sub>

**Read when:** Editing IPC contracts or menu bar app IPC

**Covers:** Goals · How it works · Operational flows · Hardening notes · Related <sub>(4 sub-sections)</sub>

**Config:** `gateway.add`, `gateway.list`, `gateway.reconnect`, `gateway.remove`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/xpc](https://docs.openclaw.ai/platforms/mac/xpc)</sub>

---

### `/platforms/mac/voicewake` — Voice wake (macOS)

**Voice wake (macOS)** · *Platforms › Features*

> Voice wake and push-to-talk modes plus routing details in the mac app

<sub>source `docs/platforms/mac/voicewake.md` · 79 lines · 953 words</sub>

**Read when:** Working on voice wake or PTT pathways

**Covers:** Requirements · Modes · Runtime behavior (wake-word) · Lifecycle invariants · Push-to-talk specifics · User-facing settings · Forwarding behavior · Forwarding payload · Quick verification · Related

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/voicewake](https://docs.openclaw.ai/platforms/mac/voicewake)</sub>

---

### `/platforms/mac/voice-overlay` — Voice overlay

**Voice overlay** · *Platforms › Features*

> Voice overlay lifecycle when wake-word and push-to-talk overlap

<sub>source `docs/platforms/mac/voice-overlay.md` · 55 lines · 404 words · 1 code blocks</sub>

**Read when:** Adjusting voice overlay behavior

**Covers:** Behavior · Implementation · Logging · Debugging checklist · Related

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/voice-overlay](https://docs.openclaw.ai/platforms/mac/voice-overlay)</sub>

---

### `/platforms/mac/webchat` — WebChat (macOS)

**WebChat (macOS)** · *Platforms › Features*

> Choose the Web or experimental Native Mac experience and use Gateway chat windows

<sub>source `docs/platforms/mac/webchat.md` · 503 lines · 6165 words · 2 code blocks</sub>

**Read when:** Choosing the Web or Native Mac experience · Debugging mac WebChat view or loopback port · Choosing colors for native chat sessions

**Covers:** Conversation in the native window · Message times and models · Thread view options · Online people · Pending questions and approvals · Sources · Diagrams · Session colors · Multiple Gateway windows · Quick Chat bar · Launch and debugging · How it is wired · Security surface · Known limitations · _+1 more_ <sub>(1 sub-sections)</sub>

**Config:** `gateway.remote.tlsFingerprint`, `session.scope`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/webchat](https://docs.openclaw.ai/platforms/mac/webchat)</sub>

---

### `/platforms/mac/canvas` — Widget panel

**Widget panel** · *Platforms › Features*

> Present hosted widgets in the macOS panel

<sub>source `docs/platforms/mac/canvas.md` · 105 lines · 530 words · 3 code blocks</sub>

**Read when:** Showing an agent-created widget on a Mac · Controlling the macOS widget panel from a paired node · Debugging hosted widget navigation

**Covers:** Panel behavior · Agent path · Node commands · A2UI belongs on session dashboards · Migrating documents from a custom root · Related

**CLI:** `openclaw doctor`, `openclaw nodes canvas`

**Config:** `plugins.entries.canvas.config.host.root`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/canvas](https://docs.openclaw.ai/platforms/mac/canvas)</sub>

---

### `/platforms/mac/skills` — Skills (macOS)

**Skills (macOS)** · *Platforms › Features*

> Manage Gateway skills from the macOS app's Dashboard

<sub>source `docs/platforms/mac/skills.md` · 57 lines · 443 words</sub>

**Read when:** Managing skills from the macOS app · Changing skills gating or install behavior

**Covers:** Data source · Install actions · Browse ClawHub · Env/API keys · Remote mode · Related

**Config:** `security.installPolicy`, `skills.changed`, `skills.install`, `skills.install.nodeManager`, `skills.install.preferBrew`, `skills.status`, `skills.update`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/skills](https://docs.openclaw.ai/platforms/mac/skills)</sub>

---

### `/platforms/mac/peekaboo` — Peekaboo bridge

**Peekaboo bridge** · *Platforms › Features*

> PeekabooBridge integration for macOS UI automation

<sub>source `docs/platforms/mac/peekaboo.md` · 161 lines · 1610 words · 2 code blocks</sub>

**Read when:** Hosting PeekabooBridge in OpenClaw.app · Integrating Peekaboo via Swift Package Manager · Changing PeekabooBridge protocol/paths · Deciding between PeekabooBridge, Codex Computer Use, and cua-driver MCP

**Covers:** What this is (and is not) · Relationship to other desktop-control paths · Enable the bridge · Client discovery order · Security and permissions · Snapshot behavior (automation) · Troubleshooting · Related

**CLI:** `openclaw ui`

**TermCrab — platforms: PARTIAL.** Runs on any Node host; no native desktop/mobile companion apps.

<sub>live: [docs.openclaw.ai/platforms/mac/peekaboo](https://docs.openclaw.ai/platforms/mac/peekaboo)</sub>

---
