# Agents

<sub>Generated catalogue of **54 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/concepts/architecture`](#conceptsarchitecture-gateway-architecture) — Gateway architecture
- [`/concepts/agent`](#conceptsagent-agent-runtime) — Agent runtime
- [`/concepts/agent-loop`](#conceptsagent-loop-agent-loop) — Agent loop
- [`/concepts/agent-runtimes`](#conceptsagent-runtimes-agent-runtimes) — Agent runtimes
- [`/concepts/system-prompt`](#conceptssystem-prompt-system-prompt) — System prompt
- [`/concepts/context`](#conceptscontext-context) — Context
- [`/concepts/context-engine`](#conceptscontext-engine-context-engine) — Context engine
- [`/concepts/soul`](#conceptssoul-soulmd-personality-guide) — SOUL.md personality guide
- [`/concepts/agent-workspace`](#conceptsagent-workspace-agent-workspace) — Agent workspace
- [`/concepts/managed-worktrees`](#conceptsmanaged-worktrees-managed-worktrees) — Managed worktrees
- [`/concepts/storage-locations`](#conceptsstorage-locations-storage-locations) — Storage locations
- [`/concepts/oauth`](#conceptsoauth-oauth) — OAuth
- [`/start/bootstrapping`](#startbootstrapping-agent-bootstrapping) — Agent bootstrapping
- [`/concepts/experimental-features`](#conceptsexperimental-features-experimental-features) — Experimental features
- [`/concepts/main-session`](#conceptsmain-session-the-main-session) — The main session
- [`/concepts/multi-user`](#conceptsmulti-user-multi-user-mode) — Multi-user mode
- [`/concepts/session`](#conceptssession-session-management) — Session management
- [`/concepts/session-attachment`](#conceptssession-attachment-session-synchronization-and-attachment) — Session synchronization and attachment
- [`/concepts/session-search`](#conceptssession-search-session-search) — Session search
- [`/concepts/session-pruning`](#conceptssession-pruning-session-pruning) — Session pruning
- [`/concepts/session-state`](#conceptssession-state-session-state-awareness) — Session state awareness
- [`/concepts/session-tool`](#conceptssession-tool-session-tools) — Session tools
- [`/concepts/memory`](#conceptsmemory-memory-overview) — Memory overview
- [`/concepts/memory-architecture`](#conceptsmemory-architecture-memory-architecture) — Memory architecture
- [`/concepts/memory-provenance`](#conceptsmemory-provenance-memory-provenance-and-deletion) — Memory provenance and deletion
- [`/concepts/user-model`](#conceptsuser-model-user-model) — User model
- [`/concepts/standing-intents`](#conceptsstanding-intents-standing-intents) — Standing intents
- [`/concepts/memory-builtin`](#conceptsmemory-builtin-builtin-memory-engine) — Builtin memory engine
- [`/concepts/memory-honcho`](#conceptsmemory-honcho-honcho-memory) — Honcho memory
- [`/concepts/memory-search`](#conceptsmemory-search-memory-search) — Memory search
- [`/concepts/active-memory`](#conceptsactive-memory-active-memory) — Active memory
- [`/concepts/active-memory/enabling`](#conceptsactive-memoryenabling-enabling-active-memory) — Enabling active memory
- [`/concepts/active-memory/how-it-works`](#conceptsactive-memoryhow-it-works-how-active-memory-works) — How active memory works
- [`/concepts/active-memory/session-controls`](#conceptsactive-memorysession-controls-session-controls) — Session controls
- [`/concepts/active-memory/tuning`](#conceptsactive-memorytuning-query-modes-prompts-and-models) — Query modes, prompts, and models
- [`/concepts/active-memory/memory-tools`](#conceptsactive-memorymemory-tools-memory-tools) — Memory tools
- [`/concepts/active-memory/advanced-options`](#conceptsactive-memoryadvanced-options-advanced-overrides-and-transcripts) — Advanced overrides and transcripts
- [`/concepts/active-memory/configuration`](#conceptsactive-memoryconfiguration-configuration-reference) — Configuration reference
- [`/concepts/active-memory/recommended-setup`](#conceptsactive-memoryrecommended-setup-recommended-setup) — Recommended setup
- [`/concepts/active-memory/troubleshooting`](#conceptsactive-memorytroubleshooting-troubleshooting-active-memory) — Troubleshooting active memory
- [`/concepts/dreaming`](#conceptsdreaming-dreaming) — Dreaming
- [`/concepts/compaction`](#conceptscompaction-compaction) — Compaction
- [`/concepts/multi-agent`](#conceptsmulti-agent-multi-agent-routing) — Multi-agent routing
- [`/concepts/agent-bindings`](#conceptsagent-bindings-agent-bindings) — Agent bindings
- [`/concepts/parallel-specialist-lanes`](#conceptsparallel-specialist-lanes-parallel-specialist-lanes) — Parallel specialist lanes
- [`/concepts/presence`](#conceptspresence-presence) — Presence
- [`/concepts/delegate-architecture`](#conceptsdelegate-architecture-delegate-architecture) — Delegate architecture
- [`/concepts/messages`](#conceptsmessages-messages) — Messages
- [`/concepts/streaming`](#conceptsstreaming-streaming-and-chunking) — Streaming and chunking
- [`/concepts/typing-indicators`](#conceptstyping-indicators-typing-indicators) — Typing indicators
- [`/concepts/progress-drafts`](#conceptsprogress-drafts-progress-drafts) — Progress drafts
- [`/concepts/retry`](#conceptsretry-retry-policy) — Retry policy
- [`/concepts/queue`](#conceptsqueue-command-queue) — Command queue
- [`/concepts/queue-steering`](#conceptsqueue-steering-steering-queue) — Steering queue

## Document sections

### `/concepts/architecture` — Gateway architecture

**Gateway architecture** · *Agents › Agent runtime*

> WebSocket gateway architecture, components, and client flows

<sub>source `docs/concepts/architecture.md` · 179 lines · 941 words · 2 code blocks</sub>

**Read when:** Working on gateway protocol, clients, or transports

**Covers:** Overview · Components and flows · Connection lifecycle (single client) · Wire protocol (summary) · Pairing and local trust · Protocol typing and codegen · Remote access · Operations snapshot · Invariants · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw gateway`

**Config:** `gateway.auth.*`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`

<sub>live: [docs.openclaw.ai/concepts/architecture](https://docs.openclaw.ai/concepts/architecture)</sub>

---

### `/concepts/agent` — Agent runtime

**Agent runtime** · *Agents › Agent runtime*

> Agent runtime, workspace contract, and session bootstrap

<sub>source `docs/concepts/agent.md` · 156 lines · 1004 words · 1 code blocks</sub>

**Read when:** Changing agent runtime, workspace bootstrap, or session behavior

**Covers:** Workspace (required) · Bootstrap files (injected) · Built-in tools · Skills · Runtime boundaries · Sessions · Steering while streaming · Model refs · Configuration (minimal) · Related

**CLI:** `openclaw doctor`, `openclaw setup`

**Config:** `agents.defaults.blockStreamingBreak`, `agents.defaults.blockStreamingChunk`, `agents.defaults.blockStreamingCoalesce`, `agents.defaults.model`, `agents.defaults.models`, `agents.defaults.sandbox`, `agents.defaults.sandbox.workspaceRoot`, `agents.defaults.workspace`

<sub>live: [docs.openclaw.ai/concepts/agent](https://docs.openclaw.ai/concepts/agent)</sub>

---

### `/concepts/agent-loop` — Agent loop

**Agent loop** · *Agents › Agent runtime*

> Agent loop lifecycle, streams, and wait semantics

<sub>source `docs/concepts/agent-loop.md` · 273 lines · 3101 words</sub>

**Read when:** You need an exact walkthrough of the agent loop or lifecycle events · You are changing session queueing, writer claims, or transcript write fencing

**Covers:** Entry points · Run sequence · Queueing and concurrency · Session and workspace preparation · Prompt assembly · Hooks · Streaming · Tool execution · Reply shaping · Compaction and retries · Event streams · Chat channel handling · Timeouts · Where things can end early · _+1 more_ <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agent`

**Config:** `agents.defaults.timeoutSeconds`, `security.installPolicy`, `session.long_running`, `session.stalled`, `session.stuck`

**TermCrab — agent: BROKEN.** `SessionQueue` exists (`src/agent/sessions.ts:269`) but `dequeue()` has no call site — every documented queue mode is inert.

<sub>live: [docs.openclaw.ai/concepts/agent-loop](https://docs.openclaw.ai/concepts/agent-loop)</sub>

---

### `/concepts/agent-runtimes` — Agent runtimes

**Agent runtimes** · *Agents › Agent runtime*

> How OpenClaw separates model providers, models, channels, and agent runtimes

<sub>source `docs/concepts/agent-runtimes.md` · 311 lines · 2309 words · 3 code blocks</sub>

**Read when:** You are choosing between OpenClaw, Codex, ACP, or another native agent runtime · You are confused by provider/model/runtime labels in status or config · You are documenting support parity for a native harness

**Covers:** Codex surfaces · Runtime ownership · Runtime selection · GitHub Copilot agent runtime · Compatibility contract · Status labels · Related

**CLI:** `openclaw doctor`

<sub>live: [docs.openclaw.ai/concepts/agent-runtimes](https://docs.openclaw.ai/concepts/agent-runtimes)</sub>

---

### `/concepts/system-prompt` — System prompt

**System prompt** · *Agents › Agent runtime*

> What the OpenClaw system prompt contains and how it is assembled

<sub>source `docs/concepts/system-prompt.md` · 236 lines · 3400 words · 1 code blocks</sub>

**Read when:** Editing system prompt text, tools list, or temporal sections · Changing workspace bootstrap or skills injection behavior

**Covers:** Structure · Prompt modes · Prompt snapshots · Workspace bootstrap injection · Time handling · Skills · Documentation · Related

**CLI:** `openclaw channels add`, `openclaw configure`, `openclaw status`, `openclaw update`

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `agents.defaults.contextLimits.*`, `agents.defaults.skills`, `agents.defaults.subagents.delegationMode`, `agents.defaults.userTimezone`, `agents.defaults.workspace`, `agents.entries.*.contextLimits.*`

**TermCrab — context: PARTIAL.** Prompt assembled in `src/agent/prompt.ts`; no context-engine plugin interface, no /context introspection.

<sub>live: [docs.openclaw.ai/concepts/system-prompt](https://docs.openclaw.ai/concepts/system-prompt)</sub>

---

### `/concepts/context` — Context

**Context** · *Agents › Agent runtime*

> Context: what the model sees, how it is built, and how to inspect it

<sub>source `docs/concepts/context.md` · 234 lines · 1446 words · 2 code blocks</sub>

**Read when:** You want to understand what "context" means in OpenClaw · You are debugging why the model "knows" something (or forgot it) · You want to reduce context overhead (/context, /status, /compact)

**Covers:** Quick start (inspect context) · Example output · What counts toward the context window · How OpenClaw builds the system prompt · Injected workspace files (Project Context) · Skills: injected vs loaded on-demand · Tools: there are two costs · Commands, directives, and "inline shortcuts" · Sessions, compaction, and pruning (what persists) · What /context actually reports · Related <sub>(3 sub-sections)</sub>

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `plugins.slots.contextEngine`

**TermCrab — context: PARTIAL.** Prompt assembled in `src/agent/prompt.ts`; no context-engine plugin interface, no /context introspection.

<sub>live: [docs.openclaw.ai/concepts/context](https://docs.openclaw.ai/concepts/context)</sub>

---

### `/concepts/context-engine` — Context engine

**Context engine** · *Agents › Agent runtime*

> Context engine: pluggable context assembly, compaction, and subagent lifecycle

<sub>source `docs/concepts/context-engine.md` · 500 lines · 2720 words · 8 code blocks</sub>

**Read when:** You want to understand how OpenClaw assembles model context · You are switching between the legacy engine and a plugin engine · You are building a context engine plugin

**Covers:** Quick start · How it works · The legacy engine · Plugin engines · Configuration reference · Relationship to compaction and memory · Tips · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw plugins install`

**Config:** `plugins.slots.contextEngine`, `plugins.slots.memory`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/concepts/context-engine](https://docs.openclaw.ai/concepts/context-engine)</sub>

---

### `/concepts/soul` — SOUL.md personality guide

**SOUL.md personality guide** · *Agents › Agent runtime*

> Use SOUL.md to give your OpenClaw agent an actual voice instead of generic assistant sludge

<sub>source `docs/concepts/soul.md` · 77 lines · 296 words · 1 code blocks</sub>

**Read when:** You want your agent to sound less generic · You are editing SOUL.md · You want a stronger personality without breaking safety or brevity

**Covers:** What belongs in SOUL.md · Why this works · The Molty prompt · What good looks like · One warning · Related

<sub>live: [docs.openclaw.ai/concepts/soul](https://docs.openclaw.ai/concepts/soul)</sub>

---

### `/concepts/agent-workspace` — Agent workspace

**Agent workspace** · *Agents › Agent workspace*

> Agent workspace: location, layout, and backup strategy

<sub>source `docs/concepts/agent-workspace.md` · 244 lines · 1330 words · 8 code blocks</sub>

**Read when:** You need to explain the agent workspace or its file layout · You want to back up or migrate an agent workspace

**Covers:** Default location · Extra workspace folders · Workspace file map · What is NOT in the workspace · Git backup (recommended, private) · Do not commit secrets · Moving the workspace to a new machine · Advanced notes · Related

**CLI:** `openclaw agents list`, `openclaw configure`, `openclaw doctor`, `openclaw onboard`, `openclaw setup`

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `agents.defaults.sandbox`, `agents.defaults.sandbox.workspaceRoot`, `agents.defaults.workspace`, `agents.entries.*.workspace`, `agents.entries.main.workspace`, `skills.load.extraDirs`

<sub>live: [docs.openclaw.ai/concepts/agent-workspace](https://docs.openclaw.ai/concepts/agent-workspace)</sub>

---

### `/concepts/managed-worktrees` — Managed worktrees

**Managed worktrees** · *Agents › Agent workspace*

> Run agent tasks in isolated git checkouts with automatic snapshots and cleanup

<sub>source `docs/concepts/managed-worktrees.md` · 545 lines · 8144 words · 16 code blocks</sub>

**Read when:** You want an isolated branch and checkout for an agent task · You are configuring Workboard cards with worktree workspaces · You want to store managed worktrees on another disk or in a custom folder · You need to restore or clean up an OpenClaw-managed worktree

**Covers:** Sandboxed sessions · Choose where worktrees are stored · Filesystem acceleration · Repository source profiles · Layout and names · Capacity and disk space · Provision ignored files · Run repository setup · Session worktrees · Troubleshoot creation · Snapshots, cleanup, and restore · Retire an already removed snapshot early · Exact-state detached retirement · CLI · _+3 more_

**CLI:** `openclaw worktrees create`, `openclaw worktrees gc`, `openclaw worktrees list`, `openclaw worktrees recover-removal`, `openclaw worktrees remove`, `openclaw worktrees restore`, `openclaw worktrees retire-snapshot`

<sub>live: [docs.openclaw.ai/concepts/managed-worktrees](https://docs.openclaw.ai/concepts/managed-worktrees)</sub>

---

### `/concepts/storage-locations` — Storage locations

**Storage locations** · *Agents › Agent workspace*

> Named storage destinations, explicit initialization, encryption, and provider configuration

<sub>source `docs/concepts/storage-locations.md` · 155 lines · 998 words · 2 code blocks</sub>

**Read when:** Configuring an external disk or another storage destination · Choosing storage encryption and initializing a location · Diagnosing unavailable storage or a wrong encryption key

**Covers:** Configure and initialize a directory · Configuration reference · Choose encryption deliberately · Share a location across installations · Diagnose a location

**CLI:** `openclaw storage init`, `openclaw storage list`, `openclaw storage test`

<sub>live: [docs.openclaw.ai/concepts/storage-locations](https://docs.openclaw.ai/concepts/storage-locations)</sub>

---

### `/concepts/oauth` — OAuth

**OAuth** · *Agents › Agent workspace*

> OAuth in OpenClaw: token exchange, storage, and multi-account patterns

<sub>source `docs/concepts/oauth.md` · 294 lines · 1806 words · 5 code blocks</sub>

**Read when:** You want to understand OpenClaw OAuth end-to-end · You hit token invalidation / logout issues · You want Claude CLI or OAuth auth flows · You want multiple accounts or profile routing

**Covers:** The token sink (why it exists) · Storage (where tokens live) · Anthropic Claude CLI reuse · OAuth exchange (how login works) · Refresh + expiry · Multiple accounts (profiles) + routing · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw agents add`, `openclaw doctor`, `openclaw models accounts`, `openclaw models auth`, `openclaw onboard`

<sub>live: [docs.openclaw.ai/concepts/oauth](https://docs.openclaw.ai/concepts/oauth)</sub>

---

### `/start/bootstrapping` — Agent bootstrapping

**Agent bootstrapping** · *Agents › Agent workspace*

> Agent bootstrapping ritual that seeds the workspace and identity files

<sub>source `docs/start/bootstrapping.md` · 74 lines · 439 words · 1 code blocks</sub>

**Read when:** Understanding what happens on the first agent run · Explaining where bootstrapping files live · Debugging onboarding identity setup

**Covers:** What happens · Embedded and local model runs · Skipping bootstrapping · Where it runs · Related docs

**CLI:** `openclaw agents set-identity`, `openclaw onboard`, `openclaw plugins install`

<sub>live: [docs.openclaw.ai/start/bootstrapping](https://docs.openclaw.ai/start/bootstrapping)</sub>

---

### `/concepts/experimental-features` — Experimental features

**Experimental features** · *Agents › Agent workspace*

> What experimental flags mean in OpenClaw and which ones are currently documented

<sub>source `docs/concepts/experimental-features.md` · 241 lines · 1842 words · 2 code blocks</sub>

**Read when:** You see an `.experimental` config key and want to know whether it is stable · You want to try preview runtime features without confusing them with normal defaults · You want one place to find the currently documented experimental flags

**Covers:** Currently documented flags · Control UI Labs · Decision assistance · Local model lean mode · Experimental does not mean hidden · Related <sub>(2 sub-sections)</sub>

**Config:** `agents.defaults.decisionModel`, `gateway.controlUi.experimental.customPlugins`, `plugins.entries.codex.config.appServer.experimental.sandboxExecServer`, `tools.codeMode`, `tools.codeMode.enabled`, `tools.toolSearch`, `tools.toolSearch.enabled`

<sub>live: [docs.openclaw.ai/concepts/experimental-features](https://docs.openclaw.ai/concepts/experimental-features)</sub>

---

### `/concepts/main-session` — The main session

**The main session** · *Agents › Sessions and memory*

> One rolling conversation across all your channels: the personal-agent default

<sub>source `docs/concepts/main-session.md` · 145 lines · 1138 words · 1 code blocks</sub>

**Read when:** You want to understand where your agent "lives · You expect the same context whether you write on Telegram, WhatsApp, or the web · You want your agent to know what happens in groups and side threads

**Covers:** Home · What flows into the main session · Memory across resets and conversations · A rolling session with durable history · When you want isolation instead · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw security audit`

**Config:** `session.dmScope`, `session.groupScope`, `session.mainKey`, `session.maintenance.maxDiskBytes`, `tools.agentToAgent`

<sub>live: [docs.openclaw.ai/concepts/main-session](https://docs.openclaw.ai/concepts/main-session)</sub>

---

### `/concepts/multi-user` — Multi-user mode

**Multi-user mode** · *Agents › Sessions and memory*

> How session ownership, presence, and human mentions work when several people operate one agent

<sub>source `docs/concepts/multi-user.md` · 277 lines · 5389 words</sub>

**Read when:** You share one OpenClaw agent with other operators · You want to hand a session to another person or agent, or filter sessions by owner · You want to mention a person or find mentions addressed to you · You are deciding whether one shared agent provides enough isolation

**Covers:** Trust boundary · World-readable session links · The three ownership layers · Assigning an owner · Per-person model accounts · Finding sessions by owner · Reading the avatars · People cards · Reactions · Mentioning people · Mentions Inbox · Agent-spawned sessions · Identity-scoped convenience state · Drafts · _+2 more_ <sub>(6 sub-sections)</sub>

**CLI:** `openclaw models accounts`, `openclaw models auth`

**Config:** `gateway.roles`

<sub>live: [docs.openclaw.ai/concepts/multi-user](https://docs.openclaw.ai/concepts/multi-user)</sub>

---

### `/concepts/session` — Session management

**Session management** · *Agents › Sessions and memory*

> How OpenClaw manages conversation sessions

<sub>source `docs/concepts/session.md` · 413 lines · 2898 words · 4 code blocks</sub>

**Read when:** You want to understand session routing and isolation · You want to configure DM scope for multi-user setups · You are debugging daily or idle session resets

**Covers:** How messages are routed · DM isolation · Retired channel docking · Group and room routing · Incognito sessions · Remember across conversations · Session lifecycle · Gateway restart recovery · Where state lives · Session maintenance · Inspecting sessions · Related

**CLI:** `openclaw doctor`, `openclaw security audit`, `openclaw sessions`, `openclaw sessions cleanup`, `openclaw status`

**Config:** `session.dmScope`, `session.groupScope`, `session.identityLinks`, `session.idleMinutes`, `session.maintenance`, `session.maintenance.maxDiskBytes`, `session.reset`, `session.reset.atHour`

**TermCrab — sessions: PARTIAL.** JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.

<sub>live: [docs.openclaw.ai/concepts/session](https://docs.openclaw.ai/concepts/session)</sub>

---

### `/concepts/session-attachment` — Session synchronization and attachment

**Session synchronization and attachment** · *Agents › Sessions and memory*

> How Gateway-owned sessions continue across the Control UI, terminal, CLI, mobile clients, and coding harnesses

<sub>source `docs/concepts/session-attachment.md` · 226 lines · 1705 words · 6 code blocks</sub>

**Read when:** You want to continue a Control UI session in the terminal · You want to attach a coding harness to an existing session · You are troubleshooting session links, remote pairing, or attachment failures

**Covers:** One Gateway, many clients · Session URLs and short links · Choose how to continue · Pair once per Gateway origin · Failure taxonomy · Related pages <sub>(3 sub-sections)</sub>

**CLI:** `openclaw attach`, `openclaw attach deploy-monitor-6db92d48`, `openclaw attach https`, `openclaw chat`, `openclaw devices approve`, `openclaw devices list`, `openclaw devices rotate`, `openclaw https`

**Config:** `gateway.remote.url`

**TermCrab — sessions: PARTIAL.** JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.

<sub>live: [docs.openclaw.ai/concepts/session-attachment](https://docs.openclaw.ai/concepts/session-attachment)</sub>

---

### `/concepts/session-search` — Session search

**Session search** · *Agents › Sessions and memory*

> Search past session transcripts and reopen the matching context

<sub>source `docs/concepts/session-search.md` · 89 lines · 725 words</sub>

**Read when:** You need to find something discussed in an earlier session · You want to understand session search privacy or indexing

**Covers:** Visibility and output · Control UI search · Index lifecycle · Session search vs. memory search · Related

**CLI:** `openclaw doctor`

**Config:** `tools.agentToAgent`

**TermCrab — sessions: PARTIAL.** JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.

<sub>live: [docs.openclaw.ai/concepts/session-search](https://docs.openclaw.ai/concepts/session-search)</sub>

---

### `/concepts/session-pruning` — Session pruning

**Session pruning** · *Agents › Sessions and memory*

> Trimming old tool results to keep context lean and caching efficient

<sub>source `docs/concepts/session-pruning.md` · 159 lines · 1310 words · 2 code blocks</sub>

**Read when:** You want to reduce context growth from tool outputs · You want to understand Anthropic prompt cache optimization

**Covers:** Why it matters · How it works · Legacy image cleanup · Smart defaults · Enable or disable · Pruning vs compaction · Further reading · Related <sub>(2 sub-sections)</sub>

**Config:** `agents.defaults.contextPruning`, `agents.defaults.contextPruning.hardClear.placeholder`, `agents.defaults.contextPruning.mode`, `agents.defaults.heartbeat.every`, `contextPruning.*`, `contextPruning.mode`, `contextPruning.ttl`, `tools.allow`

**TermCrab — sessions: PARTIAL.** JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.

<sub>live: [docs.openclaw.ai/concepts/session-pruning](https://docs.openclaw.ai/concepts/session-pruning)</sub>

---

### `/concepts/session-state` — Session state awareness

**Session state awareness** · *Agents › Sessions and memory*

> Durable session state signal log: state versions, watchers, stale-state notices, and reconciliation

<sub>source `docs/concepts/session-state.md` · 136 lines · 1607 words · 2 code blocks</sub>

**Read when:** You want agents to notice when humans or other agents change a session behind their back · You are debugging state-change notices, watch cursors, or session_status changesSince · You want to understand how parent agents stay synchronized with child sessions

**Covers:** The signal log · Watchers · Notices: one, not many · Reconciling · Storage and limits · Related

**Config:** `session.dmScope`, `session.notifyOnCreate`, `session.store`

**TermCrab — sessions: PARTIAL.** JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.

<sub>live: [docs.openclaw.ai/concepts/session-state](https://docs.openclaw.ai/concepts/session-state)</sub>

---

### `/concepts/session-tool` — Session tools

**Session tools** · *Agents › Sessions and memory*

> Agent tools for cross-session status, recall, messaging, and sub-agent orchestration

<sub>source `docs/concepts/session-tool.md` · 391 lines · 6169 words · 1 code blocks</sub>

**Read when:** You want to understand what session tools the agent has · You want to configure cross-session access or sub-agent spawning · You want to inspect spawned sub-agent status

**Covers:** Available tools · Listing and reading sessions · Managing session settings and groups · Sessions versus conversations · Sending cross-session messages · Status and orchestration helpers · Session state changes · Spawning sub-agents · Visibility · Related

**Config:** `tools.agentToAgent`

**TermCrab — sessions: PARTIAL.** JSONL transcripts + manual /new; no reset policies, no write fencing, no pruning.

<sub>live: [docs.openclaw.ai/concepts/session-tool](https://docs.openclaw.ai/concepts/session-tool)</sub>

---

### `/concepts/memory` — Memory overview

**Memory overview** · *Agents › Memory*

> How OpenClaw remembers things across sessions

<sub>source `docs/concepts/memory.md` · 358 lines · 1917 words · 6 code blocks</sub>

**Read when:** You want to understand how memory works · You want to know what memory files to write

**Covers:** How it works · What goes where · Import from coding assistants · Action-sensitive memories · Memory tools · Memory search · Memory engines · Knowledge wiki layer · Automatic memory flush · Dreaming · Grounded backfill and live promotion · CLI · Further reading · Related

**CLI:** `openclaw doctor`, `openclaw memory`, `openclaw memory index`, `openclaw memory rem-backfill`, `openclaw memory search`, `openclaw memory status`

**Config:** `memory.search.provider`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/memory](https://docs.openclaw.ai/concepts/memory)</sub>

---

### `/concepts/memory-architecture` — Memory architecture

**Memory architecture** · *Agents › Memory*

> End-to-end architecture of OpenClaw memory: tiers, provenance, dreaming, recall lanes, the user model, and standing intents

<sub>source `docs/concepts/memory-architecture.md` · 447 lines · 3332 words · 3 code blocks</sub>

**Read when:** You want the complete picture of how OpenClaw memory works end to end · You want to understand why memory behaves differently for trusted and untrusted content · You are deciding which memory surface a new feature or plugin should write to

**Covers:** Design principles · The tier model · Provenance: every memory knows where it came from · Trust boundaries and limits · The write path · Dreaming: consolidation with gates · Recall: two lanes · Project-scoped memory · The user model · Standing intents: prospective memory · The security model · A day in the life · Configuration map · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw memory forget`

**Config:** `agents.defaults.compaction.memoryFlush`, `memory.search`, `memory.search.rememberAcrossConversations`, `plugins.entries.active-memory`, `plugins.entries.memory-core.config.dreaming`, `plugins.entries.memory-core.config.memoryPolicy`, `plugins.slots.memory`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/memory-architecture](https://docs.openclaw.ai/concepts/memory-architecture)</sub>

---

### `/concepts/memory-provenance` — Memory provenance and deletion

**Memory provenance and deletion** · *Agents › Memory*

> Trace session-derived memories, control ingestion, and preview or delete tracked memory artifacts

<sub>source `docs/concepts/memory-provenance.md` · 293 lines · 1943 words · 5 code blocks</sub>

**Read when:** You want to exclude a source from automatic memory ingestion · You need to remove memories derived from specific sessions or participants · You are reviewing memory provenance, deletion coverage, or retained data

**Covers:** Preview and forget a session · What lineage is recorded · Admission: keeping sources out of memory · Deletion: purging what a session produced · What deletion does not cover · Purging a person or a source end to end · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw memory forget`, `openclaw memory index`, `openclaw sessions`

**Config:** `session.store`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/memory-provenance](https://docs.openclaw.ai/concepts/memory-provenance)</sub>

---

### `/concepts/user-model` — User model

**User model** · *Agents › Memory*

> Manage durable user preferences and your Gateway profile identity

<sub>source `docs/concepts/user-model.md` · 400 lines · 6096 words · 5 code blocks</sub>

**Read when:** You want stable preferences to guide future sessions · You need to update a preference without leaving contradictory history · You are deciding whether something belongs in USER.md or MEMORY.md · You want verified GitHub identity and optional commit credit on your Gateway profile · You want to connect a personal or shared GitHub account for publication

**Covers:** Personal USER files on a shared Gateway · Gateway profile and GitHub credit · Merging duplicate profiles · Channel identity links · GitHub connections · Profile appearance preferences · Write directives, not observations · Supersede in place · Choose the right file · Keep it compact · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw users`, `openclaw users link-email`, `openclaw users list`, `openclaw users merge`

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.entries.*.bootstrapMaxChars`, `gateway.auth.identityScopes`, `gateway.controlUi.github.token`, `gateway.roles`, `session.identityLinks`, `tools.github`

<sub>live: [docs.openclaw.ai/concepts/user-model](https://docs.openclaw.ai/concepts/user-model)</sub>

---

### `/concepts/standing-intents` — Standing intents

**Standing intents** · *Agents › Memory*

> Remember event-conditioned future actions without relying on long conversational context

<sub>source `docs/concepts/standing-intents.md` · 94 lines · 758 words · 2 code blocks</sub>

**Read when:** You want the agent to act when a future event appears · You are choosing between a scheduled task and an event trigger · You want to inspect or cancel a standing intent

**Covers:** Choose the right intention tier · Create an event-based intent · How matching works · List and cancel · Lifecycle states · Related

<sub>live: [docs.openclaw.ai/concepts/standing-intents](https://docs.openclaw.ai/concepts/standing-intents)</sub>

---

### `/concepts/memory-builtin` — Builtin memory engine

**Builtin memory engine** · *Agents › Memory*

> The default SQLite-based memory backend with keyword, vector, and hybrid search

<sub>source `docs/concepts/memory-builtin.md` · 378 lines · 2281 words · 8 code blocks</sub>

**Read when:** You want to understand the default memory backend · You want to configure embedding providers or hybrid search · You are migrating from the removed QMD memory backend

**Covers:** What it provides · When to use · Getting started · Supported embedding providers · How indexing works · Migrating from QMD · Troubleshooting · Configuration · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw memory index`, `openclaw memory reset`, `openclaw memory status`, `openclaw onboard`, `openclaw plugins install`

**Config:** `memory.backend`, `memory.qmd`, `memory.search.extraPaths`, `memory.search.provider`, `memory.search.qmd`, `memory.search.sources`, `models.providers.openai.apiKey`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/memory-builtin](https://docs.openclaw.ai/concepts/memory-builtin)</sub>

---

### `/concepts/memory-honcho` — Honcho memory

**Honcho memory** · *Agents › Memory*

> AI-native cross-session memory via the Honcho plugin

<sub>source `docs/concepts/memory-honcho.md` · 139 lines · 527 words · 3 code blocks</sub>

**Read when:** You want persistent memory that works across sessions and channels · You want AI-powered recall and user modeling

**Covers:** What it provides · Available tools · Getting started · Configuration · Migrating existing memory · How it works · Honcho vs builtin memory · CLI commands · Further reading · Related

**CLI:** `openclaw gateway`, `openclaw honcho ask`, `openclaw honcho search`, `openclaw honcho setup`, `openclaw honcho status`, `openclaw plugins install`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/memory-honcho](https://docs.openclaw.ai/concepts/memory-honcho)</sub>

---

### `/concepts/memory-search` — Memory search

**Memory search** · *Agents › Memory*

> How memory search finds relevant notes using embeddings and hybrid retrieval

<sub>source `docs/concepts/memory-search.md` · 230 lines · 1273 words · 4 code blocks</sub>

**Read when:** You want to understand how memory_search works · You want to choose an embedding provider · You want to tune search quality

**Covers:** Quick start · Supported providers · How search works · Deterministic trigger recall · Improving search quality · Multimodal memory · Session memory search · Troubleshooting · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw memory index`, `openclaw memory status`, `openclaw plugins install`

**Config:** `memory.search.extraPaths`, `session.dmScope`, `tools.agentToAgent`, `tools.sessions.visibility`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/memory-search](https://docs.openclaw.ai/concepts/memory-search)</sub>

---

### `/concepts/active-memory` — Active memory

**Active memory** · *Agents › Memory*

> Deep conversation-history recall that escalates only when deterministic memory recall is insufficient

<sub>source `docs/concepts/active-memory.md` · 74 lines · 487 words</sub>

**Read when:** You want to understand what active memory is for · You want to turn active memory on for a conversational agent · You want to tune active memory behavior without enabling it everywhere

**Covers:** Where each section moved · Related pages

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory](https://docs.openclaw.ai/concepts/active-memory)</sub>

---

### `/concepts/active-memory/enabling` — Enabling active memory

**Enabling active memory** · *Agents › Active memory*

> Two ways to turn active memory on: the per-agent rememberAcrossConversations product setting, and the advanced plugin quick start.

<sub>source `docs/concepts/active-memory/enabling.md` · 110 lines · 442 words · 4 code blocks</sub>

**Read when:** You want cross-conversation recall for a personal agent · You want a safe advanced starter config for the plugin

**Covers:** Remember across conversations · Advanced Active Memory quick start

**CLI:** `openclaw doctor`, `openclaw gateway restart`

**Config:** `plugins.entries.*`, `session.dmScope`, `tools.sessions.visibility`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/enabling](https://docs.openclaw.ai/concepts/active-memory/enabling)</sub>

---

### `/concepts/active-memory/how-it-works` — How active memory works

**How active memory works** · *Agents › Active memory*

> The escalation flow, which surfaces run active memory, the two targeting paths, and the session types the advanced path allows.

<sub>source `docs/concepts/active-memory/how-it-works.md` · 121 lines · 625 words · 4 code blocks</sub>

**Read when:** You want to understand the deep-recall flow · You are checking whether a conversation is eligible

**Covers:** How it works · When it runs <sub>(1 sub-sections)</sub>

**Config:** `memory.search.rememberAcrossConversations`, `plugins.entries.active-memory.config.agents`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/how-it-works](https://docs.openclaw.ai/concepts/active-memory/how-it-works)</sub>

---

### `/concepts/active-memory/session-controls` — Session controls

**Session controls** · *Agents › Active memory*

> Pause or resume active memory per session or globally, and surface its status, debug summary, and raw hidden prefix in a chat.

<sub>source `docs/concepts/active-memory/session-controls.md` · 77 lines · 195 words · 6 code blocks</sub>

**Read when:** You want to pause active memory for one conversation · You want to see what active memory injected

**Covers:** Session toggle · How to see it

**Config:** `memory.search.rememberAcrossConversations`, `plugins.entries.active-memory.config.enabled`, `plugins.entries.active-memory.enabled`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/session-controls](https://docs.openclaw.ai/concepts/active-memory/session-controls)</sub>

---

### `/concepts/active-memory/tuning` — Query modes, prompts, and models

**Query modes, prompts, and models** · *Agents › Active memory*

> How much conversation the sub-agent sees, how eager it is about returning memory, and how its model is resolved.

<sub>source `docs/concepts/active-memory/tuning.md` · 145 lines · 419 words · 7 code blocks</sub>

**Read when:** You are tuning recall quality against latency · You want a dedicated fast recall model

**Covers:** Query modes · Prompt styles · Model fallback policy <sub>(1 sub-sections)</sub>

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/tuning](https://docs.openclaw.ai/concepts/active-memory/tuning)</sub>

---

### `/concepts/active-memory/memory-tools` — Memory tools

**Memory tools** · *Agents › Active memory*

> The concrete recall tools the blocking sub-agent may call, and per-provider setups for built-in memory, LanceDB, and Lossless Claw.

<sub>source `docs/concepts/active-memory/memory-tools.md` · 145 lines · 533 words · 3 code blocks</sub>

**Read when:** You are choosing which recall tools active memory may call · You are wiring active memory to a specific memory provider

**Covers:** Memory tools <sub>(3 sub-sections)</sub>

**CLI:** `openclaw plugins install`

**Config:** `agents.entries.main.tools.alsoAllow`, `memory.search.rememberAcrossConversations`, `tools.allow`, `tools.alsoAllow`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/memory-tools](https://docs.openclaw.ai/concepts/active-memory/memory-tools)</sub>

---

### `/concepts/active-memory/advanced-options` — Advanced overrides and transcripts

**Advanced overrides and transcripts** · *Agents › Active memory*

> Escape hatches for thinking, fast mode, and the sub-agent prompt, plus exporting blocking sub-agent transcripts for debugging.

<sub>source `docs/concepts/active-memory/advanced-options.md` · 85 lines · 305 words · 6 code blocks</sub>

**Read when:** You need to override the sub-agent prompt or thinking level · You want blocking sub-agent transcripts on disk

**Covers:** Advanced escape hatches · Transcript persistence

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/advanced-options](https://docs.openclaw.ai/concepts/active-memory/advanced-options)</sub>

---

### `/concepts/active-memory/configuration` — Configuration reference

**Configuration reference** · *Agents › Active memory*

> Every plugins.entries.active-memory key: type, meaning, range, and default, plus the extra tuning fields.

<sub>source `docs/concepts/active-memory/configuration.md` · 42 lines · 585 words</sub>

**Read when:** You need the type or default for an active memory key

**Covers:** Configuration

**Config:** `plugins.entries.active-memory`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/configuration](https://docs.openclaw.ai/concepts/active-memory/configuration)</sub>

---

### `/concepts/active-memory/recommended-setup` — Recommended setup

**Recommended setup** · *Agents › Active memory*

> The starter configuration to begin with, and the cold-start grace budget to set when upgrading from v2026.4.x.

<sub>source `docs/concepts/active-memory/recommended-setup.md` · 76 lines · 275 words · 2 code blocks</sub>

**Read when:** You want a starting configuration to tune from · Your first recall after a gateway restart times out

**Covers:** Recommended setup <sub>(1 sub-sections)</sub>

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/recommended-setup](https://docs.openclaw.ai/concepts/active-memory/recommended-setup)</sub>

---

### `/concepts/active-memory/troubleshooting` — Troubleshooting active memory

**Troubleshooting active memory** · *Agents › Active memory*

> A checklist for when active memory does not run, and the common recall failures with their causes.

<sub>source `docs/concepts/active-memory/troubleshooting.md` · 95 lines · 569 words</sub>

**Read when:** Active memory is not showing up where you expect · Recall is slow, empty, inconsistent, or policy-disabled

**Covers:** Debugging · Common issues

**CLI:** `openclaw doctor`, `openclaw plugins inspect`, `openclaw status`

**Config:** `memory.search.fallback`, `memory.search.provider`, `memory.search.rememberAcrossConversations`, `plugins.entries.active-memory.enabled`, `tools.alsoAllow`

**TermCrab — memory: PARTIAL.** MEMORY.md + daily logs + lexical search (+ optional local embeddings); prompt injects only `readHead(3000)` (`src/agent/prompt.ts`), so new facts fall out of context.

<sub>live: [docs.openclaw.ai/concepts/active-memory/troubleshooting](https://docs.openclaw.ai/concepts/active-memory/troubleshooting)</sub>

---

### `/concepts/dreaming` — Dreaming

**Dreaming** · *Agents › Memory*

> Background memory consolidation with light, deep, and REM phases plus a Dream Diary

<sub>source `docs/concepts/dreaming.md` · 354 lines · 2179 words · 7 code blocks</sub>

**Read when:** You want memory promotion to run automatically · You want to understand what each dreaming phase does · You want to tune consolidation without polluting MEMORY.md

**Covers:** What dreaming writes · Phase model · Session transcript ingestion · Consolidation safety · Dream Diary · Deep ranking signals · Scheduling · Quick start · Slash command · CLI workflow · Key defaults · Dreams UI · Related

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw memory promote`, `openclaw memory promote-explain`, `openclaw memory rem-backfill`, `openclaw memory rem-harness`, `openclaw memory session-backfill`, `openclaw memory status`

**Config:** `plugins.entries.memory-core.config.dreaming`, `plugins.entries.memory-core.subagent.allowedModels`

<sub>live: [docs.openclaw.ai/concepts/dreaming](https://docs.openclaw.ai/concepts/dreaming)</sub>

---

### `/concepts/compaction` — Compaction

**Compaction** · *Agents › Sessions and memory*

> How OpenClaw summarizes long conversations to stay within model limits

<sub>source `docs/concepts/compaction.md` · 283 lines · 2276 words · 6 code blocks</sub>

**Read when:** You want to understand auto-compaction and /compact · You are debugging long sessions hitting context limits

**Covers:** How it works · Auto-compaction · Manual compaction · Configuration · Provider and engine behavior · Pluggable compaction providers · Compaction vs pruning · Troubleshooting · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw agent`

**Config:** `agents.defaults.compaction`, `agents.defaults.compaction.keepRecentTokens`, `agents.defaults.compaction.maxActiveTranscriptBytes`, `agents.defaults.compaction.memoryFlush.model`, `agents.defaults.compaction.mode`, `agents.defaults.compaction.model`, `agents.defaults.models`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/concepts/compaction](https://docs.openclaw.ai/concepts/compaction)</sub>

---

### `/concepts/multi-agent` — Multi-agent routing

**Multi-agent routing** · *Agents › Multi-agent*

> Multi-agent routing: agent boundaries, channel accounts, and bindings

<sub>source `docs/concepts/multi-agent.md` · 745 lines · 2613 words · 19 code blocks</sub>

**Covers:** What is one agent · Paths · Agent helper · Team preset · Quick start · Multiple agents, multiple personas · Per-agent Memory Wiki vaults · Cross-agent memory search · One WhatsApp number, multiple people (DM split) · Routing rules · Multiple accounts / phone numbers · Concepts · Platform examples · Common patterns · _+2 more_ <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw agents`, `openclaw agents add`, `openclaw agents list`, `openclaw agents team`, `openclaw channels login`, `openclaw channels status`, `openclaw claws add`

**Config:** `agents.defaults.skills`, `agents.defaults.subagents`, `agents.defaults.systemAgent.agentId`, `agents.defaults.workspace`, `agents.entries`, `agents.entries.*.agentDir`, `agents.entries.*.groupChat.mentionPatterns`, `agents.entries.*.skills`

<sub>live: [docs.openclaw.ai/concepts/multi-agent](https://docs.openclaw.ai/concepts/multi-agent)</sub>

---

### `/concepts/agent-bindings` — Agent bindings

**Agent bindings** · *Agents › Multi-agent*

> Route channel accounts and conversations to the right OpenClaw agent

<sub>source `docs/concepts/agent-bindings.md` · 126 lines · 649 words · 3 code blocks</sub>

**Read when:** Routing channel accounts to different agents · Sending one conversation to a specialized agent · Deciding whether one agent is sufficient

**Covers:** When to use a binding · Route an account to an agent · Match a specific conversation · Match fields and precedence · Common mistakes · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agents list`, `openclaw channels status`

**Config:** `agents.entries`, `gateway.reload.mode`, `session.dmScope`, `session.groupScope`

<sub>live: [docs.openclaw.ai/concepts/agent-bindings](https://docs.openclaw.ai/concepts/agent-bindings)</sub>

---

### `/concepts/parallel-specialist-lanes` — Parallel specialist lanes

**Parallel specialist lanes** · *Agents › Multi-agent*

> Run parallel specialist agents without clogging shared model and tool capacity

<sub>source `docs/concepts/parallel-specialist-lanes.md` · 133 lines · 493 words · 2 code blocks</sub>

**Read when:** You route group chats to dedicated agents · You want parallel work without one long task blocking every chat · You are designing a multi-agent operations setup

**Covers:** First principles · Recommended rollout · Minimal lane contract template · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agents team`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/concepts/parallel-specialist-lanes](https://docs.openclaw.ai/concepts/parallel-specialist-lanes)</sub>

---

### `/concepts/presence` — Presence

**Presence** · *Agents › Multi-agent*

> How OpenClaw presence entries are produced, merged, and displayed

<sub>source `docs/concepts/presence.md` · 289 lines · 2009 words · 4 code blocks</sub>

**Read when:** Debugging live status on the Control UI Devices page · Investigating duplicate or stale instance rows · Changing gateway WS connect or system-event beacons

**Covers:** Ask the agent about presence · Presence fields (what shows up) · Who can see presence · Producers (where presence comes from) · Connection rows and beacon deduplication · Online and recent activity · TTL and bounded size · Remote/tunnel caveat (loopback IPs) · Consumers · Debugging tips · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw gateway call`

<sub>live: [docs.openclaw.ai/concepts/presence](https://docs.openclaw.ai/concepts/presence)</sub>

---

### `/concepts/delegate-architecture` — Delegate architecture

**Delegate architecture** · *Agents › Multi-agent*

> Delegate architecture: running OpenClaw as a named agent on behalf of an organization

<sub>source `docs/concepts/delegate-architecture.md` · 312 lines · 1300 words · 9 code blocks</sub>

**Covers:** What is a delegate · Why delegates · Capability tiers · Prerequisites: isolation and hardening · Setting up a delegate · Example: organizational assistant · Scaling pattern · Related <sub>(11 sub-sections)</sub>

**CLI:** `openclaw agents add`, `openclaw models auth`

<sub>live: [docs.openclaw.ai/concepts/delegate-architecture](https://docs.openclaw.ai/concepts/delegate-architecture)</sub>

---

### `/concepts/messages` — Messages

**Messages** · *Agents › Messages and delivery*

> Message flow, sessions, queueing, and reasoning visibility

<sub>source `docs/concepts/messages.md` · 182 lines · 1775 words · 2 code blocks</sub>

**Read when:** Explaining how inbound messages become replies · Clarifying sessions, queueing modes, or streaming behavior · Documenting reasoning visibility and usage implications

**Covers:** Inbound dedupe · Inbound debouncing · Sessions and devices · Prompt bodies and history context · Tool result metadata · Queueing and followups · Channel run ownership · Streaming, chunking, and batching · Reasoning visibility and tokens · Prefixes, threading, and replies · Silent replies · Related

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.*`, `agents.defaults.blockStreamingBreak`, `agents.defaults.blockStreamingChunk`, `agents.defaults.blockStreamingCoalesce`, `agents.defaults.blockStreamingDefault`, `agents.defaults.humanDelay`, `agents.defaults.silentReply.group`, `channels.qqbot.streaming.mode`

<sub>live: [docs.openclaw.ai/concepts/messages](https://docs.openclaw.ai/concepts/messages)</sub>

---

### `/concepts/streaming` — Streaming and chunking

**Streaming and chunking** · *Agents › Messages and delivery*

> Streaming + chunking behavior (block replies, channel preview streaming, mode mapping)

<sub>source `docs/concepts/streaming.md` · 508 lines · 3507 words · 4 code blocks</sub>

**Read when:** Explaining how streaming or chunking works on channels · Changing block streaming or channel chunking behavior · Debugging duplicate/early block replies or channel preview streaming

**Covers:** Control UI startup status · Block streaming (channel messages) · Chunking algorithm (low/high bounds) · Coalescing (merge streamed blocks) · Human-like pacing between blocks · "Stream chunks or everything" · Preview streaming modes · Runtime behavior · Tool-progress preview updates · Progress draft rendering · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults`, `agents.defaults.blockStreamingDefault`, `agents.defaults.humanDelay.mode`, `agents.entries.*.humanDelay`, `channels.discord`, `channels.discord.maxLinesPerMessage`, `channels.discord.streaming`, `channels.matrix`

<sub>live: [docs.openclaw.ai/concepts/streaming](https://docs.openclaw.ai/concepts/streaming)</sub>

---

### `/concepts/typing-indicators` — Typing indicators

**Typing indicators** · *Agents › Messages and delivery*

> When OpenClaw shows typing indicators and how to tune them

<sub>source `docs/concepts/typing-indicators.md` · 79 lines · 435 words · 2 code blocks</sub>

**Read when:** Changing typing indicator behavior or defaults

**Covers:** Defaults · Modes · Configuration · Notes · Related

**Config:** `agents.defaults.typingIntervalSeconds`, `agents.defaults.typingMode`

<sub>live: [docs.openclaw.ai/concepts/typing-indicators](https://docs.openclaw.ai/concepts/typing-indicators)</sub>

---

### `/concepts/progress-drafts` — Progress drafts

**Progress drafts** · *Agents › Messages and delivery*

> Progress drafts: one visible work-in-progress message that updates while an agent runs

<sub>source `docs/concepts/progress-drafts.md` · 506 lines · 2305 words · 15 code blocks</sub>

**Read when:** Configuring visible progress updates for long-running chat turns · Choosing between partial, block, and progress streaming modes · Explaining how OpenClaw updates one channel message while work is in progress · Troubleshooting progress drafts, standalone progress messages, or finalization fallback

**Covers:** Quick start · What users see · Choose a mode · Configure labels · Control progress lines · Channel behavior · Finalization · Troubleshooting · Related <sub>(6 sub-sections)</sub>

<sub>live: [docs.openclaw.ai/concepts/progress-drafts](https://docs.openclaw.ai/concepts/progress-drafts)</sub>

---

### `/concepts/retry` — Retry policy

**Retry policy** · *Agents › Messages and delivery*

> Retry policy for outbound provider calls

<sub>source `docs/concepts/retry.md` · 112 lines · 1386 words</sub>

**Read when:** Updating provider retry behavior or defaults · Debugging provider send errors or rate limits

**Covers:** Goals · Defaults · Behavior · Configuration · Notes · Related <sub>(5 sub-sections)</sub>

<sub>live: [docs.openclaw.ai/concepts/retry](https://docs.openclaw.ai/concepts/retry)</sub>

---

### `/concepts/queue` — Command queue

**Command queue** · *Agents › Messages and delivery*

> Auto-reply queue modes, shared background capacity, and per-session overrides

<sub>source `docs/concepts/queue.md` · 219 lines · 2526 words · 1 code blocks</sub>

**Read when:** Changing auto-reply execution or concurrency · Explaining /queue modes or message steering behavior · Inspecting background work and command-lane diagnostics

**Covers:** Why · How it works · Defaults · Queue modes · Queue options · Steer and streaming · Answering a pending question · Precedence · Per-session overrides · Queued-turn cancellation · Input durability · Lanes and scope · Background work · Troubleshooting · _+1 more_

**CLI:** `openclaw chat`, `openclaw tui`

**Config:** `agents.defaults.maxConcurrent`, `agents.defaults.subagents.maxConcurrent`, `diagnostics.lanes`, `session.long_running`, `session.stalled`, `session.stuck`, `tools.swarm.maxConcurrent`

**TermCrab — agent: BROKEN.** `SessionQueue` exists (`src/agent/sessions.ts:269`) but `dequeue()` has no call site — every documented queue mode is inert.

<sub>live: [docs.openclaw.ai/concepts/queue](https://docs.openclaw.ai/concepts/queue)</sub>

---

### `/concepts/queue-steering` — Steering queue

**Steering queue** · *Agents › Messages and delivery*

> How active-run steering queues messages at runtime boundaries

<sub>source `docs/concepts/queue-steering.md` · 152 lines · 1849 words</sub>

**Read when:** Explaining how steer behaves while an agent is using tools · Explaining why steering does not cancel an already-running tool · Changing active-run queue behavior or runtime steering integration · Comparing steering with followup, collect, and interrupt queue modes

**Covers:** Runtime boundary · Tool launch boundaries · Modes · Burst example · Scope · Canceling a pending steer · Debounce · Related

**TermCrab — agent: BROKEN.** `SessionQueue` exists (`src/agent/sessions.ts:269`) but `dequeue()` has no call site — every documented queue mode is inert.

<sub>live: [docs.openclaw.ai/concepts/queue-steering](https://docs.openclaw.ai/concepts/queue-steering)</sub>

---
