# Install

<sub>Generated catalogue of **46 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/install`](#install-install) — Install
- [`/install/installer`](#installinstaller-installer-internals) — Installer internals
- [`/install/node`](#installnode-nodejs) — Node.js
- [`/install/node-compatibility`](#installnode-compatibility-nodejs-compatibility) — Node.js compatibility
- [`/install/bun`](#installbun-bun) — Bun
- [`/install/bun-compatibility`](#installbun-compatibility-bun-compatibility) — Bun compatibility
- [`/install/nix`](#installnix-nix) — Nix
- [`/install/backups`](#installbackups-backups) — Backups
- [`/install/updating`](#installupdating-updating) — Updating
- [`/install/updating/update-methods`](#installupdatingupdate-methods-other-update-methods) — Other update methods
- [`/install/updating/automatic-updates`](#installupdatingautomatic-updates-automatic-updates) — Automatic updates
- [`/install/updating/rollback-and-recovery`](#installupdatingrollback-and-recovery-rollback-and-recovery) — Rollback and recovery
- [`/install/update-troubleshooting`](#installupdate-troubleshooting-update-troubleshooting) — Update troubleshooting
- [`/install/migrating`](#installmigrating-migration-guide) — Migration guide
- [`/install/migrating-claude`](#installmigrating-claude-migrating-from-claude) — Migrating from Claude
- [`/install/migrating-hermes`](#installmigrating-hermes-migrating-from-hermes) — Migrating from Hermes
- [`/prose`](#prose-openprose-removal-and-migration) — OpenProse removal and migration
- [`/install/uninstall`](#installuninstall-uninstall) — Uninstall
- [`/install/development-channels`](#installdevelopment-channels-release-channels) — Release channels
- [`/install/docker`](#installdocker-docker) — Docker
- [`/install/docker/environment-variables`](#installdockerenvironment-variables-docker-environment-variables) — Docker environment variables
- [`/install/docker/networking-and-storage`](#installdockernetworking-and-storage-docker-networking-providers-and-storage) — Docker networking, providers, and storage
- [`/install/docker/compose-operations`](#installdockercompose-operations-docker-compose-operations-and-image-maintenance) — Docker Compose operations and image maintenance
- [`/install/docker/sandbox-and-troubleshooting`](#installdockersandbox-and-troubleshooting-docker-agent-sandbox-and-troubleshooting) — Docker agent sandbox and troubleshooting
- [`/install/podman`](#installpodman-podman) — Podman
- [`/vps`](#vps-linux-server) — Linux server
- [`/install/cloudflare`](#installcloudflare-cloudflare-containers) — Cloudflare Containers
- [`/install/daytona`](#installdaytona-daytona) — Daytona
- [`/install/exe-dev`](#installexe-dev-exedev) — exe.dev
- [`/install/fly`](#installfly-flyio) — Fly.io
- [`/install/northflank`](#installnorthflank-northflank) — Northflank
- [`/install/railway`](#installrailway-railway) — Railway
- [`/install/render`](#installrender-render) — Render
- [`/install/upstash`](#installupstash-upstash-box) — Upstash Box
- [`/install/azure`](#installazure-azure) — Azure
- [`/install/digitalocean`](#installdigitalocean-digitalocean) — DigitalOcean
- [`/install/gcp`](#installgcp-gcp) — GCP
- [`/install/hetzner`](#installhetzner-hetzner) — Hetzner
- [`/install/hostinger`](#installhostinger-hostinger) — Hostinger
- [`/install/oracle`](#installoracle-oracle-cloud) — Oracle Cloud
- [`/install/ansible`](#installansible-ansible) — Ansible
- [`/install/docker-vm-runtime`](#installdocker-vm-runtime-docker-vm-runtime) — Docker VM runtime
- [`/install/kubernetes`](#installkubernetes-kubernetes) — Kubernetes
- [`/install/macos-vm`](#installmacos-vm-macos-vms) — macOS VMs
- [`/install/raspberry-pi`](#installraspberry-pi-raspberry-pi) — Raspberry Pi
- [`/start/setup`](#startsetup-setup) — Setup

## Document sections

### `/install` — Install

**Install** · *Install › Install overview*

> Install OpenClaw - desktop app downloads, installer script, npm/pnpm/bun, from source, Docker, and more

<sub>source `docs/install/index.md` · 276 lines · 899 words · 13 code blocks</sub>

**Read when:** You need an install method other than the Getting Started quickstart · You want to download the Windows Hub or macOS desktop app instead of the CLI · You want to deploy to a cloud platform · You need to update, migrate, or uninstall

**Covers:** System requirements · Download the desktop app · Recommended: installer script · Alternative install methods · Verify the install · Next: run onboarding and connect a channel · Hosting and deployment · Back up, update, migrate, or uninstall · Troubleshooting: openclaw not found <sub>(5 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway install`, `openclaw gateway status`, `openclaw onboard`, `openclaw openclaw`, `openclaw update`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install](https://docs.openclaw.ai/install)</sub>

---

### `/install/installer` — Installer internals

**Installer internals** · *Install › Install overview*

> How the installer scripts work (install.sh, install-cli.sh, install.ps1), flags, and automation

<sub>source `docs/install/installer.md` · 605 lines · 3485 words · 29 code blocks</sub>

**Read when:** You want to understand `openclaw.ai/install.sh` · You want to automate installs (CI / headless) · You want to install from a GitHub checkout · You want to install a private Node runtime without reinstalling OpenClaw

**Covers:** Private Node recovery · Source build toolchain · Quick commands · install.sh · install-cli.sh · install.ps1 · CI and automation · Troubleshooting · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway install`, `openclaw is not`, `openclaw not found`, `openclaw onboard`, `openclaw update`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/installer](https://docs.openclaw.ai/install/installer)</sub>

---

### `/install/node` — Node.js

**Node.js** · *Install › Runtimes*

> Install and configure Node.js for OpenClaw - version requirements, install options, and PATH troubleshooting

<sub>source `docs/install/node.md` · 208 lines · 1112 words · 12 code blocks</sub>

**Read when:** You need to install Node.js before installing OpenClaw · You installed OpenClaw but `openclaw` is command not found · npm install -g fails with permissions or PATH issues

**Covers:** Check your version · Install Node · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw update`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/node](https://docs.openclaw.ai/install/node)</sub>

---

### `/install/node-compatibility` — Node.js compatibility

**Node.js compatibility** · *Install › Runtimes*

> Supported Node.js versions, SQLite requirements, platform limits, and release history

<sub>source `docs/install/node-compatibility.md` · 105 lines · 1321 words · 1 code blocks</sub>

**Read when:** You need to check which Node.js versions OpenClaw supports · You want to understand a Node.js minimum version or platform support change

**Covers:** Supported versions · How the gate decides · Why the floors exist · V8 compiler settings · Platform consequences · What the installer provisions · Check your runtime · History across releases · Related

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/node-compatibility](https://docs.openclaw.ai/install/node-compatibility)</sub>

---

### `/install/bun` — Bun

**Bun** · *Install › Runtimes*

> Bun workflow for installs, package scripts, and opt-in runtime use

<sub>source `docs/install/bun.md` · 161 lines · 812 words · 10 code blocks</sub>

**Read when:** You want to install dependencies or run package scripts with Bun · You want to run OpenClaw with Bun 1.4+ · You hit Bun install/patch/lifecycle script issues

**Covers:** Install · Bun-only global install · Lifecycle scripts · Caveats · Known limitations · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway start`, `openclaw status`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/bun](https://docs.openclaw.ai/install/bun)</sub>

---

### `/install/bun-compatibility` — Bun compatibility

**Bun compatibility** · *Install › Runtimes*

> Bun runtime requirements, macOS SQLite selection, limitations, and release history

<sub>source `docs/install/bun-compatibility.md` · 281 lines · 3573 words · 4 code blocks</sub>

**Read when:** You want to check Bun runtime support and limitations · You need to select a SQLite library for Bun on macOS

**Covers:** Requirements · macOS app private runtime · SQLite library selection on macOS · Memory search without an extension-capable library · Browser subprocesses · Bun-only installs · SQLite worker lifecycle · Known limitations · History across releases · Related

**CLI:** `openclaw browser extension`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway start`, `openclaw node install`, `openclaw status`, `openclaw update`, `openclaw update repair`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/bun-compatibility](https://docs.openclaw.ai/install/bun-compatibility)</sub>

---

### `/install/nix` — Nix

**Nix** · *Install › Runtimes*

> Install OpenClaw declaratively with Nix

<sub>source `docs/install/nix.md` · 109 lines · 443 words · 4 code blocks</sub>

**Read when:** You want reproducible, rollback-able installs · You're already using Nix/NixOS/Home Manager · You want everything pinned and managed declaratively

**Covers:** What you get · Quick start · Nix-mode runtime behavior · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw is the`, `openclaw repo`, `openclaw update`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/nix](https://docs.openclaw.ai/install/nix)</sub>

---

### `/install/backups` — Backups

**Backups** · *Install › Maintenance*

> Back up OpenClaw state: archives, per-database snapshots, scheduling, offsite copies, and continuous replication

<sub>source `docs/install/backups.md` · 542 lines · 3351 words · 18 code blocks</sub>

**Read when:** You want a backup routine for an OpenClaw install instead of a one-off archive · You want scheduled, offsite, or continuous backups without copying the whole database every time · You need to restore OpenClaw state from a backup

**Covers:** Choose a path · Full archives · Per-database snapshots · Schedule backups · Copy backups offsite · Versioned backups to a Git repository · Continuous replication with Litestream · Pull replication with sqlite3rsync · Restore · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw backup
verify`, `openclaw backup create`, `openclaw backup disable`, `openclaw backup enable`, `openclaw backup git`, `openclaw backup list`, `openclaw backup record`, `openclaw backup restore`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/backups](https://docs.openclaw.ai/install/backups)</sub>

---

### `/install/updating` — Updating

**Updating** · *Install › Maintenance*

> Updating OpenClaw safely (global install or source), plus rollback strategy

<sub>source `docs/install/updating.md` · 899 lines · 6907 words · 13 code blocks</sub>

**Read when:** Updating OpenClaw · Something breaks after an update

**Covers:** Upgrading very old versions · Recommended: openclaw update · Inspect FreeBSD service discovery · Stale update history · Retire update recovery data · After updating · Detailed topics · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw browser doctor`, `openclaw doctor`, `openclaw gateway call`, `openclaw gateway restart`, `openclaw gateway start`, `openclaw gateway status`, `openclaw gateway stop`, `openclaw health`

**Config:** `gateway.auth.rateLimit`, `plugins.load.paths`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/updating](https://docs.openclaw.ai/install/updating)</sub>

---

### `/install/updating/update-methods` — Other update methods

**Other update methods** · *Install › Updating*

> Switching install types, the source-server script, re-running the installer, and manual npm/pnpm/bun updates

<sub>source `docs/install/updating/update-methods.md` · 551 lines · 4220 words · 17 code blocks</sub>

**Read when:** You want to switch an install between a package manager and a git checkout · You run a gateway directly from a git checkout on a server · You need to update or recover OpenClaw with npm, pnpm, or bun directly

**Covers:** Switch between npm and git installs · Source-checkout servers (reference script) · Alternative: re-run the installer · Homebrew formula installs · Alternative: manual npm, pnpm, or bun <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway run`, `openclaw gateway start`, `openclaw gateway status`, `openclaw gateway stop`, `openclaw openclaw`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/updating/update-methods](https://docs.openclaw.ai/install/updating/update-methods)</sub>

---

### `/install/updating/automatic-updates` — Automatic updates

**Automatic updates** · *Install › Updating*

> The auto-updater, per-channel automatic behavior, and how update campaigns apply and report an update

<sub>source `docs/install/updating/automatic-updates.md` · 233 lines · 1814 words · 2 code blocks</sub>

**Read when:** You want unattended updates on a managed Gateway service · You want to control automatic updates of a headless node host · You need to know when an automatic update applies and how to postpone it · You are turning update checks or automatic updates off

**Covers:** Headless node updates · Auto-updater <sub>(1 sub-sections)</sub>

**CLI:** `openclaw node restart`, `openclaw node run`, `openclaw nodes status`, `openclaw update`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/updating/automatic-updates](https://docs.openclaw.ai/install/updating/automatic-updates)</sub>

---

### `/install/updating/rollback-and-recovery` — Rollback and recovery

**Rollback and recovery** · *Install › Updating*

> Downgrading, automatic schema-neutral rollback, verified pre-update backups, and triage when an update leaves you stuck

<sub>source `docs/install/updating/rollback-and-recovery.md` · 389 lines · 3271 words · 3 code blocks</sub>

**Read when:** Something broke after an update and you need to go back · You want to know when `openclaw update` can roll back automatically · You are creating a verified backup before a significant update · An update failed and you need triage or unattended repair

**Covers:** Downgrade · If you are stuck <sub>(4 sub-sections)</sub>

**CLI:** `openclaw backup create`, `openclaw doctor`, `openclaw gateway start`, `openclaw gateway status`, `openclaw health
openclaw`, `openclaw triage`, `openclaw update`, `openclaw update cleanup`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/updating/rollback-and-recovery](https://docs.openclaw.ai/install/updating/rollback-and-recovery)</sub>

---

### `/install/update-troubleshooting` — Update troubleshooting

**Update troubleshooting** · *Install › Maintenance*

> Recover from failed OpenClaw updates in the Control UI or CLI

<sub>source `docs/install/update-troubleshooting.md` · 638 lines · 5361 words · 3 code blocks</sub>

**Read when:** An OpenClaw update failed · The Gateway did not report a final update result

**Covers:** Recover in the Control UI · Doctor cannot enter maintenance during finalization · Node and global install permissions · Candidate migration rehearsal timeouts · Published 2026.9.4 on large agent fleets · Headless nodes waiting on 2026.9.6 · Plugin repair warnings · Reason codes · Retained legacy session history · CLI fallback · Rollback boundary · Support diagnostics <sub>(5 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway status`, `openclaw gateway stop`, `openclaw node run`, `openclaw plugins disable`, `openclaw plugins reload`, `openclaw triage`, `openclaw update`

**Config:** `plugins.load.paths`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/update-troubleshooting](https://docs.openclaw.ai/install/update-troubleshooting)</sub>

---

### `/install/migrating` — Migration guide

**Migration guide** · *Install › Migrating*

> Migration hub: cross-system imports, machine-to-machine moves, and plugin upgrades

<sub>source `docs/install/migrating.md` · 153 lines · 828 words · 4 code blocks</sub>

**Read when:** You are moving OpenClaw to a new laptop or server · You are coming from another agent system and want to keep state · You are upgrading an in-place plugin

**Covers:** Import from another agent system · Move OpenClaw to a new machine · Upgrade a plugin in place · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw backup`, `openclaw backup create`, `openclaw backup restore`, `openclaw doctor`, `openclaw doctor
    openclaw`, `openclaw gateway stop`, `openclaw migrate`, `openclaw onboard`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/migrating](https://docs.openclaw.ai/install/migrating)</sub>

---

### `/install/migrating-claude` — Migrating from Claude

**Migrating from Claude** · *Install › Migrating*

> Move Claude Code and Claude Desktop local state into OpenClaw with a previewed import

<sub>source `docs/install/migrating-claude.md` · 162 lines · 694 words · 8 code blocks</sub>

**Read when:** You are coming from Claude Code or Claude Desktop and want to keep instructions, MCP servers, and skills · You need to understand what OpenClaw imports automatically and what stays archive-only

**Covers:** Two ways to import · What gets imported · What stays archive-only · Source selection · Recommended flow · Conflict handling · JSON output for automation · Troubleshooting · Related

**CLI:** `openclaw doctor`, `openclaw gateway restart`, `openclaw migrate`, `openclaw migrate apply`, `openclaw migrate claude`, `openclaw onboard`, `openclaw status`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/migrating-claude](https://docs.openclaw.ai/install/migrating-claude)</sub>

---

### `/install/migrating-hermes` — Migrating from Hermes

**Migrating from Hermes** · *Install › Migrating*

> Move from Hermes to OpenClaw with a previewed, reversible import

<sub>source `docs/install/migrating-hermes.md` · 177 lines · 1051 words · 8 code blocks</sub>

**Read when:** You are coming from Hermes and want to keep your model config, prompts, memory, and skills · You want to know what OpenClaw imports automatically and what stays archive-only · You need a clean, scripted migration path (CI, fresh laptop, automation)

**Covers:** Two ways to import · What gets imported · What stays archive-only · Recommended flow · Conflict handling · Secrets · JSON output for automation · Troubleshooting · Related

**CLI:** `openclaw doctor`, `openclaw gateway restart`, `openclaw migrate`, `openclaw migrate apply`, `openclaw migrate hermes`, `openclaw onboard`, `openclaw status`

**Config:** `mcp.servers`, `skills.config`, `skills.disabled`, `tools.include`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/migrating-hermes](https://docs.openclaw.ai/install/migrating-hermes)</sub>

---

### `/prose` — OpenProse removal and migration

**OpenProse removal and migration** · *Install › Migrating*

> OpenClaw no longer bundles OpenProse or the /prose command. Move to the maintained upstream Agent Skill and clean stale plugin configuration.

<sub>source `docs/prose.md` · 51 lines · 205 words · 3 code blocks</sub>

**Read when:** You used the bundled OpenProse plugin or /prose command · You need to clean OpenProse configuration after upgrading OpenClaw · You want to install the maintained upstream OpenProse Agent Skill

**Covers:** Migrate · Related

**CLI:** `openclaw doctor`

<sub>live: [docs.openclaw.ai/prose](https://docs.openclaw.ai/prose)</sub>

---

### `/install/uninstall` — Uninstall

**Uninstall** · *Install › Maintenance*

> Uninstall OpenClaw completely (CLI, service, state, workspace)

<sub>source `docs/install/uninstall.md` · 158 lines · 915 words · 11 code blocks</sub>

**Read when:** You want to remove OpenClaw from a machine · The gateway service is still running after uninstall

**Covers:** Easy path (CLI still installed) · Manual service removal (CLI not installed) · Remove the CLI · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw completion`, `openclaw gateway stop`, `openclaw gateway uninstall`, `openclaw uninstall`

**Config:** `gateway.cmd`, `gateway.vbs`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/uninstall](https://docs.openclaw.ai/install/uninstall)</sub>

---

### `/install/development-channels` — Release channels

**Release channels** · *Install › Maintenance*

> Stable, extended-stable, beta, and dev channels: semantics, switching, pinning, and tagging

<sub>source `docs/install/development-channels.md` · 199 lines · 1330 words · 4 code blocks</sub>

**Read when:** You want to switch between stable/extended-stable/beta/dev · You want to pin a specific version, tag, or SHA · You are tagging or publishing prereleases

**Covers:** Switching channels · One-off version or tag targeting · Dry run · Plugins and channels · Checking current status · Tagging best practices · macOS app availability · Related

**CLI:** `openclaw status`, `openclaw update`, `openclaw update status`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/development-channels](https://docs.openclaw.ai/install/development-channels)</sub>

---

### `/install/docker` — Docker

**Docker** · *Install › Containers*

> Optional Docker-based setup and onboarding for OpenClaw

<sub>source `docs/install/docker.md` · 483 lines · 2643 words · 20 code blocks</sub>

**Read when:** You want a containerized Gateway instead of local installs · You are validating the Docker flow · You are migrating from ClawDock shell helpers

**Covers:** Prerequisites · Containerized Gateway · Detailed topics · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw channels`, `openclaw doctor`, `openclaw update cleanup`

**Config:** `diagnostics.otel.headers`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/docker](https://docs.openclaw.ai/install/docker)</sub>

---

### `/install/docker/environment-variables` — Docker environment variables

**Docker environment variables** · *Install › Docker*

> Every environment variable the Docker setup script and Compose file accept

<sub>source `docs/install/docker/environment-variables.md` · 47 lines · 486 words · 1 code blocks</sub>

**Read when:** You are tuning the Docker build or the gateway container · You need the OTLP or sandbox variable names

**Covers:** Environment variables

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/docker/environment-variables](https://docs.openclaw.ai/install/docker/environment-variables)</sub>

---

### `/install/docker/networking-and-storage` — Docker networking, providers, and storage

**Docker networking, providers, and storage** · *Install › Docker*

> Bind modes, reaching host providers, the Claude CLI backend, Bonjour, and what persists

<sub>source `docs/install/docker/networking-and-storage.md` · 123 lines · 754 words · 6 code blocks</sub>

**Read when:** The container cannot reach a provider running on your host · You are deciding what to mount and back up · You want the Claude CLI backend inside the container

**Covers:** LAN vs loopback · Host local providers · Claude CLI backend in Docker · Bonjour / mDNS · Storage and persistence

**Config:** `gateway.bind`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/docker/networking-and-storage](https://docs.openclaw.ai/install/docker/networking-and-storage)</sub>

---

### `/install/docker/compose-operations` — Docker Compose operations and image maintenance

**Docker Compose operations and image maintenance** · *Install › Docker*

> Day-to-day Compose commands, operational accordions, and image maintenance

<sub>source `docs/install/docker/compose-operations.md` · 174 lines · 1137 words · 6 code blocks</sub>

**Read when:** You removed ClawDock and need the plain Compose commands · You hit EACCES, DNS, or rebuild problems · You want to know how the published images are refreshed

**Covers:** ClawDock migration · Image contents and security scanning · Weekly image refreshes · Running on a VPS?

**CLI:** `openclaw plugins install`

**Config:** `agents.defaults.sandbox.mode`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/docker/compose-operations](https://docs.openclaw.ai/install/docker/compose-operations)</sub>

---

### `/install/docker/sandbox-and-troubleshooting` — Docker agent sandbox and troubleshooting

**Docker agent sandbox and troubleshooting** · *Install › Docker*

> Running agent tools in Docker sandboxes, and fixing a gateway container that misbehaves

<sub>source `docs/install/docker/sandbox-and-troubleshooting.md` · 82 lines · 286 words · 4 code blocks</sub>

**Read when:** You want agent tool execution isolated in containers · The sandbox image or Control UI pairing is not working

**Covers:** Agent sandbox · Troubleshooting <sub>(1 sub-sections)</sub>

**Config:** `agents.defaults.sandbox`, `agents.defaults.sandbox.docker.image`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/docker/sandbox-and-troubleshooting](https://docs.openclaw.ai/install/docker/sandbox-and-troubleshooting)</sub>

---

### `/install/podman` — Podman

**Podman** · *Install › Containers*

> Run OpenClaw in a rootless Podman container

<sub>source `docs/install/podman.md` · 220 lines · 1341 words · 9 code blocks</sub>

**Read when:** You want a containerized gateway with Podman instead of Docker

**Covers:** Prerequisites · Quick start · Agent sandbox backend · Podman and Tailscale · Systemd (Quadlet, optional) · Config, env, and storage · Upgrading images · Useful commands · Troubleshooting · Related

**CLI:** `openclaw dashboard`, `openclaw doctor`, `openclaw doctor
    openclaw`, `openclaw gateway`, `openclaw gateway status`, `openclaw update`

**Config:** `agents.defaults.sandbox.docker.*`, `gateway.controlUi.allowedOrigins`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/podman](https://docs.openclaw.ai/install/podman)</sub>

---

### `/vps` — Linux server

**Linux server** · *Install › Hosting*

> Run OpenClaw on a Linux server or cloud VPS — provider picker, architecture, and tuning

<sub>source `docs/vps.md` · 136 lines · 666 words · 3 code blocks</sub>

**Read when:** You want to run the Gateway on a Linux server or cloud VPS · You need a quick map of hosting guides · You want generic Linux server tuning for OpenClaw

**Covers:** Pick a provider · How cloud setups work · Harden admin access first · Shared company agent on a VPS · Using nodes with a VPS · Startup tuning for small VMs and ARM hosts · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw onboard`

**Config:** `gateway.auth.password`, `gateway.auth.token`

<sub>live: [docs.openclaw.ai/vps](https://docs.openclaw.ai/vps)</sub>

---

### `/install/cloudflare` — Cloudflare Containers

**Cloudflare Containers** · *Install › App platforms*

> Experimental Cloudflare Worker and Container deployment with Litestream backups to R2

<sub>source `docs/install/cloudflare.md` · 290 lines · 1714 words · 14 code blocks</sub>

**Read when:** You want to run OpenClaw on Cloudflare Containers · You are evaluating R2-backed SQLite recovery on ephemeral containers · You need to choose between webhook scale-to-zero and always-on channels

**Covers:** What you need · How it works · Deploy · Verify the deployment · Cost and sizing · Observability · Choose the lifecycle mode · Limits and recovery · Update · Troubleshooting · Related

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/cloudflare](https://docs.openclaw.ai/install/cloudflare)</sub>

---

### `/install/daytona` — Daytona

**Daytona** · *Install › App platforms*

> Run OpenClaw in a Daytona cloud sandbox with SSH access and signed preview URLs

<sub>source `docs/install/daytona.md` · 317 lines · 1050 words · 23 code blocks</sub>

**Read when:** Running OpenClaw in a Daytona sandbox · You want a cloud sandbox for OpenClaw without managing a VPS

**Covers:** What you need · Install the Daytona CLI · Authenticate · Create a sandbox · Connect via SSH · Run onboarding · Allow the preview URL origin · Start the Gateway · Open the dashboard · Security · Channel setup · Updating · Stop and resume the sandbox · Troubleshooting · _+2 more_ <sub>(7 sub-sections)</sub>

**CLI:** `openclaw channels add`, `openclaw channels login`, `openclaw config get`, `openclaw config set`, `openclaw devices approve`, `openclaw devices list`, `openclaw doctor`, `openclaw gateway`

**Config:** `gateway.controlUi.allowedOrigins`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/daytona](https://docs.openclaw.ai/install/daytona)</sub>

---

### `/install/exe-dev` — exe.dev

**exe.dev** · *Install › App platforms*

> Run OpenClaw Gateway on exe.dev (VM + HTTPS proxy) for remote access

<sub>source `docs/install/exe-dev.md` · 209 lines · 455 words · 12 code blocks</sub>

**Read when:** You want a cheap always-on Linux host for the Gateway · You want remote Control UI access without running your own VPS

**Covers:** What you need · Beginner quick path · Automated install with Shelley · Manual installation · Remote channel setup · Remote access · Updating · Related

**CLI:** `openclaw config patch`, `openclaw config set`, `openclaw devices approve`, `openclaw devices list`, `openclaw doctor`, `openclaw gateway auth-token`, `openclaw gateway restart`, `openclaw health`

**Config:** `gateway.auth.mode`, `gateway.auth.password`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/exe-dev](https://docs.openclaw.ai/install/exe-dev)</sub>

---

### `/install/fly` — Fly.io

**Fly.io** · *Install › App platforms*

> Step-by-step Fly.io deployment for OpenClaw with persistent storage and HTTPS

<sub>source `docs/install/fly.md` · 476 lines · 1266 words · 25 code blocks</sub>

**Read when:** Deploying OpenClaw on Fly.io · Setting up Fly volumes, secrets, and first-run config

**Covers:** What you need · Beginner quick path · Troubleshooting · Updating · Private deployment (hardened) · Notes · Cost · Next steps · Related <sub>(13 sub-sections)</sub>

**CLI:** `openclaw update`

**Config:** `channels.discord`, `channels.discord.token`, `gateway.auth.password`, `gateway.controlUi.allowedOrigins`, `plugins.entries.voice-call.config`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/fly](https://docs.openclaw.ai/install/fly)</sub>

---

### `/install/northflank` — Northflank

**Northflank** · *Install › App platforms*

> Deploy OpenClaw on Northflank with one-click template

<sub>source `docs/install/northflank.mdx` · 43 lines · 231 words · 1 code blocks</sub>

**Read when:** Deploying OpenClaw to Northflank · You want a one-click cloud deploy with browser-based Control UI

**Covers:** How to get started · What you get · Connect a channel · Next steps

**CLI:** `openclaw doctor`, `openclaw onboard`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/northflank](https://docs.openclaw.ai/install/northflank)</sub>

---

### `/install/railway` — Railway

**Railway** · *Install › App platforms*

> Deploy OpenClaw on Railway with one-click template

<sub>source `docs/install/railway.mdx` · 79 lines · 290 words · 2 code blocks</sub>

**Read when:** Deploying OpenClaw to Railway · You want a one-click cloud deploy with browser-based Control UI

**Covers:** One-click deploy · What you get · Connect a channel · Backups and migration · Next steps

**CLI:** `openclaw backup create`, `openclaw backup restore`, `openclaw doctor`, `openclaw onboard`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/railway](https://docs.openclaw.ai/install/railway)</sub>

---

### `/install/render` — Render

**Render** · *Install › App platforms*

> Deploy OpenClaw on Render with Infrastructure-as-Code

<sub>source `docs/install/render.mdx` · 159 lines · 786 words · 3 code blocks</sub>

**Read when:** Deploying OpenClaw to Render · You want a declarative cloud deploy with Render Blueprints

**Covers:** Prerequisites · Deploy · The Blueprint · Choosing a plan · After deployment · Custom domain · Scaling · Backups and migration · Troubleshooting · Next steps <sub>(9 sub-sections)</sub>

**CLI:** `openclaw backup create`, `openclaw backup restore`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/render](https://docs.openclaw.ai/install/render)</sub>

---

### `/install/upstash` — Upstash Box

**Upstash Box** · *Install › App platforms*

> Host OpenClaw on Upstash Box with keep-alive and SSH tunnel access

<sub>source `docs/install/upstash.md` · 113 lines · 311 words · 8 code blocks</sub>

**Read when:** Deploying OpenClaw to Upstash Box · You want a managed Linux environment for OpenClaw with SSH-tunneled dashboard access

**Covers:** Prerequisites · Create a Box · Connect with an SSH tunnel · Install OpenClaw · Run onboarding · Start the Gateway · Auto-restart · Troubleshooting · Next steps · Related

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw gateway run`, `openclaw onboard`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/upstash](https://docs.openclaw.ai/install/upstash)</sub>

---

### `/install/azure` — Azure

**Azure** · *Install › Cloud servers*

> Run OpenClaw Gateway 24/7 on an Azure Linux VM with durable state

<sub>source `docs/install/azure.md` · 311 lines · 604 words · 20 code blocks</sub>

**Read when:** You want OpenClaw running 24/7 on Azure with Network Security Group hardening · You want a production-grade, always-on OpenClaw Gateway on your own Azure Linux VM · You want secure administration with Azure Bastion SSH

**Covers:** What you will do · What you need · Configure deployment · Deploy Azure resources · Install OpenClaw · Cost considerations · Cleanup · Next steps · Related

**CLI:** `openclaw doctor`, `openclaw gateway status`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/azure](https://docs.openclaw.ai/install/azure)</sub>

---

### `/install/digitalocean` — DigitalOcean

**DigitalOcean** · *Install › Cloud servers*

> Host OpenClaw on a DigitalOcean Droplet

<sub>source `docs/install/digitalocean.md` · 168 lines · 574 words · 7 code blocks</sub>

**Read when:** Setting up OpenClaw on DigitalOcean · Looking for a simple paid VPS for OpenClaw

**Covers:** Prerequisites · Setup · Persistence and backups · 1 GB RAM tips · Troubleshooting · Next steps · Related

**CLI:** `openclaw backup create`, `openclaw backup restore`, `openclaw config set`, `openclaw doctor`, `openclaw gateway restart`, `openclaw onboard`, `openclaw status
    systemctl`

**Config:** `agents.defaults.model.primary`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/digitalocean](https://docs.openclaw.ai/install/digitalocean)</sub>

---

### `/install/gcp` — GCP

**GCP** · *Install › Cloud servers*

> Run OpenClaw Gateway 24/7 on a GCP Compute Engine VM with Docker

<sub>source `docs/install/gcp.md` · 207 lines · 489 words · 13 code blocks</sub>

**Read when:** You want OpenClaw running 24/7 on GCP · You want a persistent Gateway on a Compute Engine VM · You need GCP provisioning, firewall, or SSH tunnel guidance

**Covers:** What you need · Provision the VM · Configure the Docker runtime · Access the Control UI · Troubleshooting · Use a deployment service account · Next steps · Related <sub>(3 sub-sections)</sub>

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/gcp](https://docs.openclaw.ai/install/gcp)</sub>

---

### `/install/hetzner` — Hetzner

**Hetzner** · *Install › Cloud servers*

> Run OpenClaw Gateway 24/7 on a Hetzner VPS with Docker

<sub>source `docs/install/hetzner.md` · 150 lines · 455 words · 8 code blocks</sub>

**Read when:** You want OpenClaw running 24/7 on a Hetzner VPS · You need Hetzner provisioning, firewall, or SSH tunnel guidance · You want a persistent Docker Gateway on a cloud VM

**Covers:** What you need · Provision and secure the VPS · Configure the Docker runtime · Access the Control UI · Infrastructure as code · Next steps · Related

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/hetzner](https://docs.openclaw.ai/install/hetzner)</sub>

---

### `/install/hostinger` — Hostinger

**Hostinger** · *Install › Cloud servers*

> Host OpenClaw on Hostinger

<sub>source `docs/install/hostinger.md` · 92 lines · 453 words</sub>

**Read when:** Setting up OpenClaw on Hostinger · Looking for a managed VPS for OpenClaw · Using Hostinger 1-Click OpenClaw

**Covers:** Prerequisites · Option A: 1-Click OpenClaw · Option B: OpenClaw on VPS · Verify your setup · Troubleshooting · Next steps · Related

**CLI:** `openclaw pairing approve`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/hostinger](https://docs.openclaw.ai/install/hostinger)</sub>

---

### `/install/oracle` — Oracle Cloud

**Oracle Cloud** · *Install › Cloud servers*

> Host OpenClaw on Oracle Cloud's Always Free ARM tier

<sub>source `docs/install/oracle.md` · 223 lines · 870 words · 10 code blocks</sub>

**Read when:** Setting up OpenClaw on Oracle Cloud · Looking for free VPS hosting for OpenClaw · Want 24/7 OpenClaw on a small server

**Covers:** Prerequisites · Setup · Verify the security posture · ARM notes · Persistence and backups · Fallback: SSH tunnel · Troubleshooting · Next steps · Related

**CLI:** `openclaw backup create`, `openclaw backup restore`, `openclaw config set`, `openclaw doctor`, `openclaw gateway install`, `openclaw security audit`

**Config:** `plugins.entries.diffs.config.viewerBaseUrl`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/oracle](https://docs.openclaw.ai/install/oracle)</sub>

---

### `/install/ansible` — Ansible

**Ansible** · *Install › Self-hosted and local*

> Automated, hardened OpenClaw installation with Ansible, Tailscale VPN, and firewall isolation

<sub>source `docs/install/ansible.md` · 221 lines · 467 words · 15 code blocks</sub>

**Read when:** You want automated server deployment with security hardening · You need firewall-isolated setup with VPN access · You're deploying to remote Debian/Ubuntu servers

**Covers:** Prerequisites · What you get · Quick start · What gets installed · Post-install setup · Security architecture · Manual installation · Updating · Troubleshooting · Advanced configuration · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw channels login`, `openclaw gateway restart`, `openclaw gateway run`, `openclaw user`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/ansible](https://docs.openclaw.ai/install/ansible)</sub>

---

### `/install/docker-vm-runtime` — Docker VM runtime

**Docker VM runtime** · *Install › Self-hosted and local*

> Shared Docker VM runtime steps for long-lived OpenClaw Gateway hosts

<sub>source `docs/install/docker-vm-runtime.md` · 216 lines · 980 words · 12 code blocks</sub>

**Read when:** You are deploying OpenClaw on a cloud VM with Docker · You need the shared setup, binary bake, persistence, and update flow

**Covers:** Before you begin · Prepare persistent host state · Run the maintained Docker setup · Bake required binaries into the image · Verify and administer the Gateway · What persists where · Common pitfall: never file-bind openclaw.json · Update OpenClaw · Related

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/docker-vm-runtime](https://docs.openclaw.ai/install/docker-vm-runtime)</sub>

---

### `/install/kubernetes` — Kubernetes

**Kubernetes** · *Install › Self-hosted and local*

> Deploy OpenClaw Gateway to a Kubernetes cluster with Kustomize

<sub>source `docs/install/kubernetes.md` · 222 lines · 866 words · 18 code blocks</sub>

**Read when:** You want to run OpenClaw on a Kubernetes cluster · You want to test OpenClaw in a Kubernetes environment

**Covers:** Why not Helm · What you need · Quick start · Local testing with Kind · Step by step · What gets deployed · Customization · Re-deploy · Teardown · Architecture notes · File structure · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw deploy`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/kubernetes](https://docs.openclaw.ai/install/kubernetes)</sub>

---

### `/install/macos-vm` — macOS VMs

**macOS VMs** · *Install › Self-hosted and local*

> Run OpenClaw in a sandboxed macOS VM (local or hosted) when you need isolation or iMessage

<sub>source `docs/install/macos-vm.md` · 248 lines · 870 words · 16 code blocks</sub>

**Read when:** You want OpenClaw isolated from your main macOS environment · You want iMessage integration in a sandbox · You want a resettable macOS environment you can clone · You want to compare local vs hosted macOS VM options

**Covers:** Recommended default (most users) · macOS VM options · Quick path (Lume, experienced users) · What you need (Lume) · 1) Install Lume · 2) Create the macOS VM · 3) Complete Setup Assistant · 4) Get the VM IP address · 5) SSH into the VM · 6) Install OpenClaw · 7) Configure channels · 8) Run the VM headlessly · Bonus: iMessage integration · Save a golden image · _+3 more_ <sub>(2 sub-sections)</sub>

**CLI:** `openclaw channels add`, `openclaw channels login`, `openclaw config set`, `openclaw gateway install`, `openclaw gateway status`, `openclaw onboard`, `openclaw openclaw-golden`, `openclaw status`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/macos-vm](https://docs.openclaw.ai/install/macos-vm)</sub>

---

### `/install/raspberry-pi` — Raspberry Pi

**Raspberry Pi** · *Install › Self-hosted and local*

> Host OpenClaw on a Raspberry Pi for always-on self-hosting

<sub>source `docs/install/raspberry-pi.md` · 232 lines · 858 words · 15 code blocks</sub>

**Read when:** Setting up OpenClaw on a Raspberry Pi · Running OpenClaw on ARM devices · Building a cheap always-on personal AI

**Covers:** Hardware compatibility · Prerequisites · Setup · Performance tips · Recommended model setup · ARM binary notes · Persistence and backups · Troubleshooting · Next steps · Related

**CLI:** `openclaw backup create`, `openclaw backup restore`, `openclaw dashboard`, `openclaw doctor`, `openclaw onboard`, `openclaw status
    systemctl`

**TermCrab — install: BETTER.** TermCrab installs natively in Termux (`install.sh`, no proot, zero runtime deps) — the one axis where the Android story beats OpenClaw's.

<sub>live: [docs.openclaw.ai/install/raspberry-pi](https://docs.openclaw.ai/install/raspberry-pi)</sub>

---

### `/start/setup` — Setup

**Setup** · *Install › Advanced setup*

> Advanced setup and development workflows for OpenClaw

<sub>source `docs/start/setup.md` · 207 lines · 1148 words · 9 code blocks</sub>

**Read when:** Setting up a new machine · You want "latest + greatest" without breaking your personal setup

**Covers:** TL;DR · Prereqs (from source) · Tailoring strategy (so updates do not hurt) · Run the Gateway from this repo · Stable workflow (macOS app first) · Bleeding edge workflow (Gateway in a terminal) · Credential storage map · Updating (without wrecking your setup) · Linux (systemd user service) · Related docs <sub>(5 sub-sections)</sub>

**CLI:** `openclaw channels login`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway start`, `openclaw health`, `openclaw setup`, `openclaw setup
pnpm`

**Config:** `channels.slack.*`, `channels.telegram.tokenFile`

<sub>live: [docs.openclaw.ai/start/setup](https://docs.openclaw.ai/start/setup)</sub>

---
