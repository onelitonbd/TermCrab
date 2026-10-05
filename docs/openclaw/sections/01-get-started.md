# Get started

<sub>Generated catalogue of **20 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/`](#-openclaw) — OpenClaw
- [`/start/why-openclaw`](#startwhy-openclaw-why-openclaw) — Why OpenClaw
- [`/start/why-openclaw/the-trust-boundary`](#startwhy-openclawthe-trust-boundary-the-trust-boundary) — The trust boundary
- [`/start/why-openclaw/policy-as-code`](#startwhy-openclawpolicy-as-code-policy-as-code) — Policy as code
- [`/start/why-openclaw/identity-and-roles`](#startwhy-openclawidentity-and-roles-identity-and-roles) — Identity and roles
- [`/start/why-openclaw/secrets`](#startwhy-openclawsecrets-secrets) — Secrets
- [`/start/why-openclaw/versioned-state-guarded-upgrades`](#startwhy-openclawversioned-state-guarded-upgrades-versioned-state-guarded-upgrades) — Versioned state, guarded upgrades
- [`/start/why-openclaw/provenance`](#startwhy-openclawprovenance-provenance) — Provenance
- [`/start/why-openclaw/openclaw-and-hermes-agent`](#startwhy-openclawopenclaw-and-hermes-agent-openclaw-and-hermes-agent) — OpenClaw and Hermes Agent
- [`/concepts/features`](#conceptsfeatures-features) — Features
- [`/start/hubs`](#starthubs-docs-hubs) — Docs hubs
- [`/start/docs-directory`](#startdocs-directory-docs-directory) — Docs directory
- [`/start/getting-started`](#startgetting-started-getting-started) — Getting started
- [`/start/onboarding-overview`](#startonboarding-overview-onboarding-overview) — Onboarding overview
- [`/start/wizard`](#startwizard-onboarding-cli) — Onboarding (CLI)
- [`/start/onboarding`](#startonboarding-onboarding-macos-app) — Onboarding (macOS app)
- [`/start/openclaw`](#startopenclaw-personal-assistant-setup) — Personal assistant setup
- [`/start/teams`](#startteams-team-setup) — Team setup
- [`/start/wizard-cli-reference`](#startwizard-cli-reference-cli-setup-reference) — CLI setup reference
- [`/start/wizard-cli-automation`](#startwizard-cli-automation-cli-automation) — CLI automation

## Document sections

### `/` — OpenClaw

**OpenClaw** · *Get started › Overview*

> OpenClaw is an open-source AI assistant that runs on your own hardware and meets you in every chat app you already use.

<sub>source `docs/index.md` · 277 lines · 835 words · 6 code blocks</sub>

**Read when:** Introducing OpenClaw to newcomers

**Covers:** Browse docs · What is OpenClaw? · How it works · Key capabilities · Quick start · Dashboard · Configuration (optional) · Start here · Learn more

**CLI:** `openclaw dashboard`, `openclaw gateway install`, `openclaw onboard`

**Config:** `channels.whatsapp.allowFrom`

<sub>live: [docs.openclaw.ai/](https://docs.openclaw.ai/)</sub>

---

### `/start/why-openclaw` — Why OpenClaw

**Why OpenClaw** · *Get started › Overview*

> The architecture case for OpenClaw: a trusted gateway, untrusted execution, deterministic policy, and versioned state, compared source-by-source with single-process harnesses

<sub>source `docs/start/why-openclaw.md` · 116 lines · 2695 words</sub>

**Read when:** You are evaluating agent harnesses for team or enterprise use · You need to explain to a security team how OpenClaw differs from single-process harnesses · You want the citable version of the trusted-gateway / untrusted-execution argument · You want to know whether OpenClaw's enterprise depth makes it heavyweight for personal use

**Covers:** What an enterprise harness has to prove · How OpenClaw answers · The vendor's harness, as a plugin · Open standards · Working together · Governance · What we do not claim · The hardened setup

**CLI:** `openclaw memory forget`, `openclaw secrets audit`, `openclaw security audit`, `openclaw skills verify`

**Config:** `gateway.roles`, `plugins.allow`

<sub>live: [docs.openclaw.ai/start/why-openclaw](https://docs.openclaw.ai/start/why-openclaw)</sub>

---

### `/start/why-openclaw/the-trust-boundary` — The trust boundary

**The trust boundary** · *Get started › Overview*

> Where OpenClaw's Gateway authority ends and configured sandbox, node, and cloud-worker execution begins

<sub>source `docs/start/why-openclaw/the-trust-boundary.md` · 36 lines · 444 words · 1 code blocks</sub>

**Read when:** You need the source-level detail behind OpenClaw's trusted-gateway / untrusted-execution split · You are deciding between Docker, Podman, SSH, OpenShell, nodes, and cloud workers · You need to know what sandboxing being off by default actually means

**CLI:** `openclaw sandbox explain`, `openclaw security audit`

**Config:** `tools.exec.host`

<sub>live: [docs.openclaw.ai/start/why-openclaw/the-trust-boundary](https://docs.openclaw.ai/start/why-openclaw/the-trust-boundary)</sub>

---

### `/start/why-openclaw/policy-as-code` — Policy as code

**Policy as code** · *Get started › Overview*

> Permission modes, tool policy, and exec approvals as deterministic code-enforced gates rather than prompt requests

<sub>source `docs/start/why-openclaw/policy-as-code.md` · 22 lines · 274 words · 1 code blocks</sub>

**Read when:** You need to know which OpenClaw denials are structural rather than model-dependent · You are configuring permission modes, tool policy, or exec approvals · You need the approval binding and fail-closed rules

**Config:** `tools.elevated`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/start/why-openclaw/policy-as-code](https://docs.openclaw.ai/start/why-openclaw/policy-as-code)</sub>

---

### `/start/why-openclaw/identity-and-roles` — Identity and roles

**Identity and roles** · *Get started › Overview*

> Pairing, operator scopes, role ceilings, and the one-gateway-is-one-trust-domain boundary

<sub>source `docs/start/why-openclaw/identity-and-roles.md` · 8 lines · 257 words</sub>

**Read when:** You are configuring gateway roles, scopes, or an identity-aware front door · You need to know how OpenClaw bounds what a person can reach · You are evaluating OpenClaw for multi-tenant use

**CLI:** `openclaw fleet`

**Config:** `gateway.roles`

<sub>live: [docs.openclaw.ai/start/why-openclaw/identity-and-roles](https://docs.openclaw.ai/start/why-openclaw/identity-and-roles)</sub>

---

### `/start/why-openclaw/secrets` — Secrets

**Secrets** · *Get started › Overview*

> SecretRefs, the protected store, egress sentinels, and the custody limits of each

<sub>source `docs/start/why-openclaw/secrets.md` · 24 lines · 457 words · 1 code blocks</sub>

**Read when:** You are moving credentials behind SecretRefs or an external vault · You need to know what keeps a credential out of model context, and what does not · You are comparing OpenClaw's secret custody with another harness

<sub>live: [docs.openclaw.ai/start/why-openclaw/secrets](https://docs.openclaw.ai/start/why-openclaw/secrets)</sub>

---

### `/start/why-openclaw/versioned-state-guarded-upgrades` — Versioned state, guarded upgrades

**Versioned state, guarded upgrades** · *Get started › Overview*

> Database-first state, schema version contracts, guarded updates, release channels, and the maturity scorecard

<sub>source `docs/start/why-openclaw/versioned-state-guarded-upgrades.md` · 8 lines · 279 words</sub>

**Read when:** You need to know whether an OpenClaw upgrade can break your on-disk state · You are choosing between the stable, extended-stable, beta, and dev channels · You are assessing per-surface readiness before deploying

**CLI:** `openclaw doctor`, `openclaw update`

<sub>live: [docs.openclaw.ai/start/why-openclaw/versioned-state-guarded-upgrades](https://docs.openclaw.ai/start/why-openclaw/versioned-state-guarded-upgrades)</sub>

---

### `/start/why-openclaw/provenance` — Provenance

**Provenance** · *Get started › Overview*

> Memory origin classes, trust gating, deletion boundaries, and the audit ledger's recorded non-claims

<sub>source `docs/start/why-openclaw/provenance.md` · 18 lines · 680 words</sub>

**Read when:** You need to know what OpenClaw records and what it deliberately does not · You are assessing memory poisoning and deletion guarantees · You need the documented limits of forgetting and audit coverage

**CLI:** `openclaw memory forget`

<sub>live: [docs.openclaw.ai/start/why-openclaw/provenance](https://docs.openclaw.ai/start/why-openclaw/provenance)</sub>

---

### `/start/why-openclaw/openclaw-and-hermes-agent` — OpenClaw and Hermes Agent

**OpenClaw and Hermes Agent** · *Get started › Overview*

> Source-by-source comparison of OpenClaw and Hermes Agent at the reviewed August 2026 snapshots, with the property table

<sub>source `docs/start/why-openclaw/openclaw-and-hermes-agent.md` · 36 lines · 1044 words</sub>

**Read when:** You want the side-by-side property table for OpenClaw and Hermes Agent · You need the source citations behind the comparison claims · You are checking which findings are review observations rather than tests

<sub>live: [docs.openclaw.ai/start/why-openclaw/openclaw-and-hermes-agent](https://docs.openclaw.ai/start/why-openclaw/openclaw-and-hermes-agent)</sub>

---

### `/concepts/features` — Features

**Features** · *Get started › Overview*

> OpenClaw capabilities across channels, routing, media, and UX.

<sub>source `docs/concepts/features.md` · 93 lines · 406 words</sub>

**Read when:** You want a full list of what OpenClaw supports

**Covers:** Highlights · Full list · Related

**CLI:** `openclaw channels add`, `openclaw onboard`, `openclaw plugins install`

<sub>live: [docs.openclaw.ai/concepts/features](https://docs.openclaw.ai/concepts/features)</sub>

---

### `/start/hubs` — Docs hubs

**Docs hubs** · *Get started › Overview*

> Hubs that link the main OpenClaw docs

<sub>source `docs/start/hubs.md` · 196 lines · 478 words</sub>

**Read when:** You want a complete map of the documentation

**Covers:** Start here · Installation + updates · Core concepts · Providers + ingress · Gateway + operations · Tools + automation · Nodes, media, voice · Platforms · macOS companion app (advanced) · Plugins · Workspace + templates · Project · Testing + release · Related

<sub>live: [docs.openclaw.ai/start/hubs](https://docs.openclaw.ai/start/hubs)</sub>

---

### `/start/docs-directory` — Docs directory

**Docs directory** · *Get started › Overview*

> Curated links to the most used OpenClaw docs.

<sub>source `docs/start/docs-directory.md` · 71 lines · 178 words</sub>

**Read when:** You want quick access to key docs pages

**Covers:** Start here · Setup and reference · Channels and UX · Companion apps · Operations and safety · Related

<sub>live: [docs.openclaw.ai/start/docs-directory](https://docs.openclaw.ai/start/docs-directory)</sub>

---

### `/start/getting-started` — Getting started

**Getting started** · *Get started › First steps*

> Get OpenClaw installed and run your first chat in minutes.

<sub>source `docs/start/getting-started.md` · 199 lines · 690 words · 10 code blocks</sub>

**Read when:** First time setup from zero · You want the fastest path to a working chat

**Covers:** What you need · Try it in one command · Quick setup · If setup does not work · What to do next · Related

**CLI:** `openclaw configure`, `openclaw dashboard`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw onboard`, `openclaw triage`

**Config:** `gateway.controlUi.root`

<sub>live: [docs.openclaw.ai/start/getting-started](https://docs.openclaw.ai/start/getting-started)</sub>

---

### `/start/onboarding-overview` — Onboarding overview

**Onboarding overview** · *Get started › First steps*

> Overview of OpenClaw onboarding options and flows

<sub>source `docs/start/onboarding-overview.md` · 144 lines · 1035 words · 1 code blocks</sub>

**Read when:** Choosing an onboarding path · Setting up a new environment

**Covers:** Which path should I use? · What onboarding configures · CLI onboarding · macOS app onboarding · Linux app onboarding · Custom or unlisted providers · Related

**CLI:** `openclaw onboard`

<sub>live: [docs.openclaw.ai/start/onboarding-overview](https://docs.openclaw.ai/start/onboarding-overview)</sub>

---

### `/start/wizard` — Onboarding (CLI)

**Onboarding (CLI)** · *Get started › First steps*

> CLI onboarding: quick start with detected AI access or choose custom setup

<sub>source `docs/start/wizard.md` · 346 lines · 2500 words · 5 code blocks</sub>

**Read when:** Running or configuring CLI onboarding · Setting up a new machine

**Covers:** Locale · Guided default · Choose one agent or a team · Classic wizard setup modes · What classic onboarding configures · Add another agent · Full reference · Related docs

**CLI:** `openclaw agent`, `openclaw agents add`, `openclaw agents list`, `openclaw agents team`, `openclaw channels add`, `openclaw configure`, `openclaw configure
openclaw`, `openclaw dashboard`

**Config:** `agents.defaults.systemAgent.agentId`, `agents.defaults.workspace`, `agents.entries.*.agentDir`, `agents.entries.*.name`, `agents.entries.*.workspace`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`

<sub>live: [docs.openclaw.ai/start/wizard](https://docs.openclaw.ai/start/wizard)</sub>

---

### `/start/onboarding` — Onboarding (macOS app)

**Onboarding (macOS app)** · *Get started › First steps*

> First-run setup flow for OpenClaw (macOS app)

<sub>source `docs/start/onboarding.md` · 202 lines · 1426 words</sub>

**Read when:** Setting up the macOS app for the first time · Choosing between a local and a remote Gateway during macOS setup · Connecting an AI provider from the macOS app

**Covers:** Related

**CLI:** `openclaw onboard`

**Config:** `gateway.remote.token`

<sub>live: [docs.openclaw.ai/start/onboarding](https://docs.openclaw.ai/start/onboarding)</sub>

---

### `/start/openclaw` — Personal assistant setup

**Personal assistant setup** · *Get started › Setup guides and reference*

> End-to-end guide for running OpenClaw as a personal assistant with safety cautions

<sub>source `docs/start/openclaw.md` · 256 lines · 1307 words · 11 code blocks</sub>

**Read when:** Onboarding a new assistant instance · Reviewing safety/permission implications

**Covers:** Good defaults first · Prerequisites · The two-phone setup (recommended) · 5-minute quick start · Give the agent a workspace (AGENTS) · The config that turns it into "an assistant" · Sessions and memory · Heartbeats (proactive mode) · Media in and out · Operations checklist · Next steps · Related

**CLI:** `openclaw channels login`, `openclaw dashboard`, `openclaw doctor`, `openclaw gateway`, `openclaw health`, `openclaw onboard`, `openclaw setup`, `openclaw status`

**Config:** `agents.defaults.workspace`, `channels.whatsapp.allowFrom`, `gateway.auth.mode`, `gateway.auth.token`, `session.resetTriggers`, `tools.fs.workspaceOnly`

<sub>live: [docs.openclaw.ai/start/openclaw](https://docs.openclaw.ai/start/openclaw)</sub>

---

### `/start/teams` — Team setup

**Team setup** · *Get started › Setup guides and reference*

> Set up a shared OpenClaw gateway for a team: workspace chat, shared sessions, ownership, and roles

<sub>source `docs/start/teams.md` · 154 lines · 1260 words · 3 code blocks</sub>

**Read when:** Setting up OpenClaw for a team or shared workspace · Adding teammates to an existing gateway · Deciding between one shared gateway and separate gateways

**Covers:** Before you begin · One trust boundary · Step 1: Give the team access to the Gateway · Step 2: Connect the team chat · Step 3: Sign the team in to the Control UI · Step 4: Work in shared sessions · Step 5: Bound what each person can do · Verify · When to split things up · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw pairing approve`, `openclaw security audit`

**Config:** `gateway.auth.allowTailscale`

<sub>live: [docs.openclaw.ai/start/teams](https://docs.openclaw.ai/start/teams)</sub>

---

### `/start/wizard-cli-reference` — CLI setup reference

**CLI setup reference** · *Get started › Setup guides and reference*

> Step-by-step behavior for openclaw onboard: what each step does, config it writes, and internals

<sub>source `docs/start/wizard-cli-reference.md` · 531 lines · 3495 words · 2 code blocks</sub>

**Read when:** You need detailed behavior for a specific openclaw onboard step · You are debugging onboarding results or integrating onboarding clients

**Covers:** What the wizard does · Local flow details · Remote mode details · Auth and model options · Headless and server setup · Outputs and internals · Non-interactive setup · Gateway wizard RPC · Signal setup behavior · Related docs <sub>(1 sub-sections)</sub>

**CLI:** `openclaw agents add`, `openclaw configure`, `openclaw doctor`, `openclaw gateway install`, `openclaw health`, `openclaw models auth`, `openclaw models status`, `openclaw onboard`

**Config:** `agents.defaults.model`, `agents.defaults.skipBootstrap`, `agents.defaults.workspace`, `agents.entries.*`, `channels.discord.token`, `channels.imessage.*`, `channels.matrix.*`, `channels.signal.*`

<sub>live: [docs.openclaw.ai/start/wizard-cli-reference](https://docs.openclaw.ai/start/wizard-cli-reference)</sub>

---

### `/start/wizard-cli-automation` — CLI automation

**CLI automation** · *Get started › Setup guides and reference*

> Scripted onboarding and agent setup for the OpenClaw CLI

<sub>source `docs/start/wizard-cli-automation.md` · 238 lines · 761 words · 16 code blocks</sub>

**Read when:** You are automating onboarding in scripts or CI · You need non-interactive examples for specific providers

**Covers:** Review required plugins · Baseline non-interactive example · Provider-specific examples · Add another agent · Related docs

**CLI:** `openclaw agents add`, `openclaw doctor`, `openclaw onboard`, `openclaw plugins enable`, `openclaw plugins install`, `openclaw secrets audit`, `openclaw secrets configure`, `openclaw secrets store`

**Config:** `agents.entries.*`, `gateway.auth.token`

<sub>live: [docs.openclaw.ai/start/wizard-cli-automation](https://docs.openclaw.ai/start/wizard-cli-automation)</sub>

---
