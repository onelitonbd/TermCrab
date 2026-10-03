# Capabilities

<sub>Generated catalogue of **216 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/tools`](#tools-overview) — Overview
- [`/tools/plugin`](#toolsplugin-plugins) — Plugins
- [`/plugins/manage-plugins`](#pluginsmanage-plugins-manage-plugins) — Manage plugins
- [`/plugins/community`](#pluginscommunity-community-plugins) — Community plugins
- [`/plugins/bundles`](#pluginsbundles-plugin-bundles) — Plugin bundles
- [`/plugins/agentsapi`](#pluginsagentsapi-agents-api) — Agents API
- [`/plugins/codex-computer-use`](#pluginscodex-computer-use-codex-computer-use) — Codex Computer Use
- [`/plugins/codex-harness`](#pluginscodex-harness-codex-harness) — Codex harness
- [`/plugins/codex-harness/placement`](#pluginscodex-harnessplacement-run-codex-on-another-machine) — Run Codex on another machine
- [`/plugins/codex-harness/routing`](#pluginscodex-harnessrouting-codex-routing-and-deployment) — Codex routing and deployment
- [`/plugins/codex-harness/configuration`](#pluginscodex-harnessconfiguration-codex-harness-configuration) — Codex harness configuration
- [`/plugins/codex-harness/app-server`](#pluginscodex-harnessapp-server-codex-app-server-policy) — Codex app-server policy
- [`/plugins/codex-harness/config-fields`](#pluginscodex-harnessconfig-fields-codex-plugin-config-fields) — Codex plugin config fields
- [`/plugins/codex-harness/commands`](#pluginscodex-harnesscommands-codex-commands-and-diagnostics) — Codex commands and diagnostics
- [`/plugins/codex-harness/runtime-behavior`](#pluginscodex-harnessruntime-behavior-codex-runtime-behavior) — Codex runtime behavior
- [`/plugins/codex-harness/native-features`](#pluginscodex-harnessnative-features-native-codex-state-and-features) — Native Codex state and features
- [`/plugins/codex-harness/troubleshooting`](#pluginscodex-harnesstroubleshooting-codex-harness-troubleshooting) — Codex harness troubleshooting
- [`/plugins/codex-native-plugins`](#pluginscodex-native-plugins-native-codex-plugins) — Native Codex plugins
- [`/plugins/codex-supervision`](#pluginscodex-supervision-supervise-codex-sessions) — Supervise Codex sessions
- [`/specs/codex-supervision`](#specscodex-supervision-codex-supervision) — Codex supervision
- [`/plugins/copilot`](#pluginscopilot-copilot-sdk-harness) — Copilot SDK harness
- [`/plugins/meeting-plugins`](#pluginsmeeting-plugins-meeting-plugins) — Meeting plugins
- [`/plugins/facetime`](#pluginsfacetime-facetime-plugin) — FaceTime plugin
- [`/plugins/facetime-recovery`](#pluginsfacetime-recovery-facetime-recovery-and-removal) — FaceTime recovery and removal
- [`/plugins/google-meet`](#pluginsgoogle-meet-google-meet-plugin) — Google Meet plugin
- [`/plugins/google-meet/transports`](#pluginsgoogle-meettransports-google-meet-transports-and-hosts) — Google Meet transports and hosts
- [`/plugins/google-meet/oauth-and-artifacts`](#pluginsgoogle-meetoauth-and-artifacts-google-meet-oauth-and-artifacts) — Google Meet OAuth and artifacts
- [`/plugins/google-meet/config`](#pluginsgoogle-meetconfig-google-meet-configuration) — Google Meet configuration
- [`/plugins/google-meet/tool-and-modes`](#pluginsgoogle-meettool-and-modes-google-meet-tool-and-modes) — Google Meet tool and modes
- [`/plugins/google-meet/troubleshooting`](#pluginsgoogle-meettroubleshooting-google-meet-troubleshooting) — Google Meet troubleshooting
- [`/plugins/teams-meetings`](#pluginsteams-meetings-microsoft-teams-meetings-plugin) — Microsoft Teams meetings plugin
- [`/plugins/slack-huddles`](#pluginsslack-huddles-slack-huddles-plugin) — Slack huddles plugin
- [`/plugins/voice-call`](#pluginsvoice-call-voice-call-plugin) — Voice call plugin
- [`/plugins/voice-call/configuration`](#pluginsvoice-callconfiguration-voice-call-configuration) — Voice call configuration
- [`/plugins/voice-call/realtime-and-streaming`](#pluginsvoice-callrealtime-and-streaming-voice-call-realtime-and-streaming) — Voice call realtime and streaming
- [`/plugins/voice-call/tts-and-inbound-calls`](#pluginsvoice-calltts-and-inbound-calls-voice-call-tts-and-inbound-calls) — Voice call TTS and inbound calls
- [`/plugins/voice-call/security-and-interfaces`](#pluginsvoice-callsecurity-and-interfaces-voice-call-security-and-interfaces) — Voice call security and interfaces
- [`/plugins/voice-call/troubleshooting`](#pluginsvoice-calltroubleshooting-voice-call-troubleshooting) — Voice call troubleshooting
- [`/plugins/zoom-meetings`](#pluginszoom-meetings-zoom-meetings-plugin) — Zoom meetings plugin
- [`/plugins/apple-fm`](#pluginsapple-fm-apple-foundation-models) — Apple Foundation Models
- [`/plugins/llama-cpp`](#pluginsllama-cpp-llamacpp-provider) — llama.cpp Provider
- [`/plugins/memory-lancedb`](#pluginsmemory-lancedb-memory-lancedb) — Memory LanceDB
- [`/plugins/memory-wiki`](#pluginsmemory-wiki-memory-wiki) — Memory wiki
- [`/plugins/onnx`](#pluginsonnx-local-onnx-decision-models) — Local ONNX decision models
- [`/plugins/typesafe`](#pluginstypesafe-typesafe-ai) — TypeSafe AI
- [`/plugins/onepassword`](#pluginsonepassword-1password-plugin) — 1Password plugin
- [`/plugins/vault`](#pluginsvault-vault-secretrefs) — Vault SecretRefs
- [`/plugins/admin-http-rpc`](#pluginsadmin-http-rpc-admin-http-rpc-plugin) — Admin HTTP RPC plugin
- [`/plugins/beam`](#pluginsbeam-beam-plugin) — Beam plugin
- [`/plugins/cloudflare`](#pluginscloudflare-cloudflare) — Cloudflare
- [`/plugins/geolocation`](#pluginsgeolocation-geolocation-plugin) — Geolocation plugin
- [`/plugins/logbook`](#pluginslogbook-logbook-plugin) — Logbook plugin
- [`/plugins/oc-path`](#pluginsoc-path-oc-path-plugin) — OC Path plugin
- [`/plugins/session-share`](#pluginssession-share-session-share-plugin) — Session Share plugin
- [`/plugins/workboard`](#pluginsworkboard-workboard-plugin) — Workboard plugin
- [`/plugins/zalouser`](#pluginszalouser-zalo-personal-plugin) — Zalo personal plugin
- [`/plugins/building-plugins`](#pluginsbuilding-plugins-building-plugins) — Building plugins
- [`/plugins/feature-plugins`](#pluginsfeature-plugins-feature-plugins) — Feature plugins
- [`/plugins/tool-plugins`](#pluginstool-plugins-tool-plugins) — Tool plugins
- [`/plugins/sdk-channel-plugins`](#pluginssdk-channel-plugins-building-channel-plugins) — Building channel plugins
- [`/plugins/sdk-channel-plugins/message-adapter`](#pluginssdk-channel-pluginsmessage-adapter-channel-message-adapter) — Channel message adapter
- [`/plugins/sdk-channel-plugins/durable-ingress`](#pluginssdk-channel-pluginsdurable-ingress-durable-channel-ingress) — Durable channel ingress
- [`/plugins/sdk-channel-plugins/status-and-media`](#pluginssdk-channel-pluginsstatus-and-media-channel-status-and-media) — Channel status and media
- [`/plugins/sdk-channel-plugins/sessions-and-bindings`](#pluginssdk-channel-pluginssessions-and-bindings-channel-sessions-and-bindings) — Channel sessions and bindings
- [`/plugins/sdk-channel-plugins/approvals`](#pluginssdk-channel-pluginsapprovals-channel-approvals) — Channel approvals
- [`/plugins/sdk-channel-plugins/setup-and-config`](#pluginssdk-channel-pluginssetup-and-config-channel-setup-and-config) — Channel setup and config
- [`/plugins/sdk-channel-plugins/mention-policy`](#pluginssdk-channel-pluginsmention-policy-channel-mention-policy) — Channel mention policy
- [`/plugins/sdk-provider-plugins`](#pluginssdk-provider-plugins-building-provider-plugins) — Building provider plugins
- [`/plugins/sdk-provider-plugins/model-catalogs`](#pluginssdk-provider-pluginsmodel-catalogs-provider-model-catalogs) — Provider model catalogs
- [`/plugins/sdk-provider-plugins/hook-families`](#pluginssdk-provider-pluginshook-families-provider-hook-families) — Provider hook families
- [`/plugins/sdk-provider-plugins/runtime-hooks`](#pluginssdk-provider-pluginsruntime-hooks-provider-hook-wiring) — Provider hook wiring
- [`/plugins/sdk-provider-plugins/voice-and-audio`](#pluginssdk-provider-pluginsvoice-and-audio-provider-voice-capabilities) — Provider voice capabilities
- [`/plugins/sdk-provider-plugins/media-and-search`](#pluginssdk-provider-pluginsmedia-and-search-provider-media-and-search) — Provider media and search
- [`/plugins/cli-backend-plugins`](#pluginscli-backend-plugins-building-cli-backend-plugins) — Building CLI backend plugins
- [`/plugins/hooks`](#pluginshooks-plugin-hooks) — Plugin hooks
- [`/plugins/hooks/reference`](#pluginshooksreference-hook-reference) — Hook reference
- [`/plugins/hooks/tool-policy`](#pluginshookstool-policy-tool-call-policy-hooks) — Tool call policy hooks
- [`/plugins/hooks/prompt-and-session`](#pluginshooksprompt-and-session-prompt-and-session-hooks) — Prompt and session hooks
- [`/plugins/hooks/messages`](#pluginshooksmessages-message-and-delivery-hooks) — Message and delivery hooks
- [`/plugins/hooks/lifecycle`](#pluginshookslifecycle-gateway-and-install-lifecycle-hooks) — Gateway and install lifecycle hooks
- [`/plugins/plugin-permission-requests`](#pluginsplugin-permission-requests-plugin-permission-requests) — Plugin permission requests
- [`/plugins/adding-capabilities`](#pluginsadding-capabilities-adding-capabilities-contributor-guide) — Adding capabilities (contributor guide)
- [`/tools/skills`](#toolsskills-skills) — Skills
- [`/tools/custodian-skills`](#toolscustodian-skills-custodian-skills) — Custodian skills
- [`/tools/skill-workshop`](#toolsskill-workshop-skill-workshop) — Skill Workshop
- [`/tools/skill-workshop/personal-library`](#toolsskill-workshoppersonal-library-personal-library-authoring) — Personal library authoring
- [`/tools/skill-workshop/how-it-works`](#toolsskill-workshophow-it-works-how-skill-workshop-works) — How Skill Workshop works
- [`/tools/skill-workshop/collection-review`](#toolsskill-workshopcollection-review-collection-review) — Collection review
- [`/tools/skill-workshop/authoring`](#toolsskill-workshopauthoring-chat-and-cli-authoring) — Chat and CLI authoring
- [`/tools/skill-workshop/proposals`](#toolsskill-workshopproposals-proposal-content-support-files-and-the-agent-tool) — Proposal content, support files, and the agent tool
- [`/tools/skill-workshop/configuration`](#toolsskill-workshopconfiguration-self-learning-and-approval-settings) — Self-learning and approval settings
- [`/tools/skill-workshop/reference`](#toolsskill-workshopreference-gateway-methods-storage-and-limits) — Gateway methods, storage, and limits
- [`/tools/skill-workshop/troubleshooting`](#toolsskill-workshoptroubleshooting-skill-workshop-troubleshooting) — Skill Workshop troubleshooting
- [`/tools/self-learning`](#toolsself-learning-self-learning) — Self-learning
- [`/tools/creating-skills`](#toolscreating-skills-creating-skills) — Creating skills
- [`/tools/skills-config`](#toolsskills-config-skills-config) — Skills config
- [`/tools/slash-commands`](#toolsslash-commands-slash-commands) — Slash commands
- [`/automation`](#automation-automation) — Automation
- [`/gateway/heartbeat`](#gatewayheartbeat-heartbeat) — Heartbeat
- [`/automation/cron-jobs`](#automationcron-jobs-automations) — Automations
- [`/automation/cron-jobs/how-it-works`](#automationcron-jobshow-it-works-how-automations-work) — How automations work
- [`/automation/cron-jobs/schedules`](#automationcron-jobsschedules-automation-schedules) — Automation schedules
- [`/automation/cron-jobs/payloads`](#automationcron-jobspayloads-automation-payloads) — Automation payloads
- [`/automation/cron-jobs/delivery`](#automationcron-jobsdelivery-automation-delivery) — Automation delivery
- [`/automation/cron-jobs/managing-jobs`](#automationcron-jobsmanaging-jobs-manage-automations) — Manage automations
- [`/automation/cron-jobs/webhooks`](#automationcron-jobswebhooks-inbound-webhooks) — Inbound webhooks
- [`/automation/cron-jobs/gmail`](#automationcron-jobsgmail-gmail-pubsub-triggers) — Gmail PubSub triggers
- [`/automation/cron-jobs/troubleshooting`](#automationcron-jobstroubleshooting-automation-troubleshooting) — Automation troubleshooting
- [`/automation/imap`](#automationimap-imap-email-trigger) — IMAP email trigger
- [`/automation/standing-orders`](#automationstanding-orders-standing-orders) — Standing orders
- [`/automation/hooks`](#automationhooks-hooks) — Hooks
- [`/automation/hooks/writing-hooks`](#automationhookswriting-hooks-writing-hooks) — Writing hooks
- [`/automation/hooks/configuration`](#automationhooksconfiguration-hook-configuration-and-discovery) — Hook configuration and discovery
- [`/automation/hooks/bundled-hooks`](#automationhooksbundled-hooks-bundled-hooks) — Bundled hooks
- [`/automation/hooks/event-types`](#automationhooksevent-types-hook-event-types-and-context) — Hook event types and context
- [`/automation/hooks/troubleshooting`](#automationhookstroubleshooting-hook-troubleshooting) — Hook troubleshooting
- [`/tools/apply-patch`](#toolsapply-patch-applypatch-tool) — applypatch tool
- [`/tools/code-execution`](#toolscode-execution-code-execution) — Code execution
- [`/tools/diffs`](#toolsdiffs-diffs) — Diffs
- [`/tools/elevated`](#toolselevated-elevated-mode) — Elevated mode
- [`/tools/exec`](#toolsexec-exec-tool) — Exec tool
- [`/tools/exec-approvals`](#toolsexec-approvals-exec-approvals) — Exec approvals
- [`/tools/exec-approvals-advanced`](#toolsexec-approvals-advanced-exec-approvals-advanced) — Exec approvals — advanced
- [`/tools/permission-modes`](#toolspermission-modes-permission-modes) — Permission modes
- [`/tools/secrets`](#toolssecrets-secrets) — Secrets
- [`/tools/media-overview`](#toolsmedia-overview-media-overview) — Media overview
- [`/tools/image-generation`](#toolsimage-generation-image-generation) — Image generation
- [`/tools/music-generation`](#toolsmusic-generation-music-generation) — Music generation
- [`/tools/pdf`](#toolspdf-pdf-tool) — PDF tool
- [`/tools/tts`](#toolstts-text-to-speech) — Text-to-speech
- [`/tools/tts/quickstart`](#toolsttsquickstart-text-to-speech-quickstart) — Text-to-speech quickstart
- [`/tools/tts/configuration`](#toolsttsconfiguration-text-to-speech-configuration) — Text-to-speech configuration
- [`/tools/tts/personas`](#toolsttspersonas-text-to-speech-personas) — Text-to-speech personas
- [`/tools/tts/commands`](#toolsttscommands-text-to-speech-commands-and-directives) — Text-to-speech commands and directives
- [`/tools/tts/output`](#toolsttsoutput-text-to-speech-output-and-auto-tts-behavior) — Text-to-speech output and Auto-TTS behavior
- [`/tools/tts/field-reference`](#toolsttsfield-reference-text-to-speech-field-reference) — Text-to-speech field reference
- [`/tools/tts/api`](#toolsttsapi-text-to-speech-agent-tool-and-gateway-rpc) — Text-to-speech agent tool and Gateway RPC
- [`/tools/video-generation`](#toolsvideo-generation-video-generation) — Video generation
- [`/tools/code-mode`](#toolscode-mode-code-mode) — Code Mode
- [`/tools/code-mode/quickstart`](#toolscode-modequickstart-code-mode-quickstart) — Code Mode quickstart
- [`/tools/code-mode/executors`](#toolscode-modeexecutors-code-mode-executors) — Code Mode executors
- [`/tools/code-mode/configuration`](#toolscode-modeconfiguration-code-mode-configuration) — Code Mode configuration
- [`/tools/code-mode/tool-surface`](#toolscode-modetool-surface-code-mode-tool-surface) — Code Mode tool surface
- [`/tools/code-mode/guest-api`](#toolscode-modeguest-api-code-mode-guest-api) — Code Mode guest API
- [`/tools/code-mode/output`](#toolscode-modeoutput-code-mode-output) — Code Mode output
- [`/tools/code-mode/internals`](#toolscode-modeinternals-code-mode-internals) — Code Mode internals
- [`/tools/code-mode/troubleshooting`](#toolscode-modetroubleshooting-code-mode-troubleshooting) — Code Mode troubleshooting
- [`/tools/code-mode/maintainers`](#toolscode-modemaintainers-code-mode-maintainer-notes) — Code Mode maintainer notes
- [`/tools/llm-task`](#toolsllm-task-llm-task) — LLM task
- [`/tools/lobster`](#toolslobster-lobster) — Lobster
- [`/tools/mcp`](#toolsmcp-connect-mcp-servers) — Connect MCP servers
- [`/tools/tool-search`](#toolstool-search-tool-search) — Tool Search
- [`/tools/loop-detection`](#toolsloop-detection-tool-loop-detection) — Tool-loop detection
- [`/tools/thinking`](#toolsthinking-thinking-levels) — Thinking levels
- [`/tools/tokenjuice`](#toolstokenjuice-tokenjuice) — Tokenjuice
- [`/tools/trajectory`](#toolstrajectory-trajectory-bundles) — Trajectory bundles
- [`/tools/ask-user`](#toolsask-user-ask-user) — Ask user
- [`/tools/btw`](#toolsbtw-btw-side-questions) — BTW side questions
- [`/tools/progress-card`](#toolsprogress-card-progress-card) — Progress card
- [`/tools/reactions`](#toolsreactions-reactions) — Reactions
- [`/tools/screen`](#toolsscreen-screen) — Screen
- [`/tools/show-widget`](#toolsshow-widget-show-widget) — Show widget
- [`/tools/theme`](#toolstheme-theme) — Theme
- [`/tools/browser`](#toolsbrowser-browser-openclaw-managed) — Browser (OpenClaw-managed)
- [`/tools/browser/setup`](#toolsbrowsersetup-browser-setup) — Browser setup
- [`/tools/browser/profiles`](#toolsbrowserprofiles-browser-profiles) — Browser profiles
- [`/tools/browser/existing-session`](#toolsbrowserexisting-session-multi-profile-and-existing-session-attach) — Multi-profile and existing-session attach
- [`/tools/browser/configuration`](#toolsbrowserconfiguration-browser-configuration) — Browser configuration
- [`/tools/browser/remote`](#toolsbrowserremote-remote-and-hosted-browsers) — Remote and hosted browsers
- [`/tools/browser/lightweight`](#toolsbrowserlightweight-lightweight-browsers) — Lightweight browsers
- [`/tools/browser/security`](#toolsbrowsersecurity-browser-security) — Browser security
- [`/tools/browser/isolation`](#toolsbrowserisolation-isolation-and-browser-selection) — Isolation and browser selection
- [`/tools/browser/agent-tools`](#toolsbrowseragent-tools-browser-agent-tools) — Browser agent tools
- [`/tools/browser/troubleshooting`](#toolsbrowsertroubleshooting-browser-troubleshooting) — Browser troubleshooting
- [`/tools/browser-control`](#toolsbrowser-control-browser-control-api) — Browser control API
- [`/tools/browser-linux-troubleshooting`](#toolsbrowser-linux-troubleshooting-browser-troubleshooting) — Browser troubleshooting
- [`/tools/browser-login`](#toolsbrowser-login-browser-login) — Browser login
- [`/tools/browser-wsl2-windows-remote-cdp-troubleshooting`](#toolsbrowser-wsl2-windows-remote-cdp-troubleshooting-wsl2-windows-remote-chrome-cdp-troubleshooting) — WSL2 + Windows + remote Chrome CDP troubleshooting
- [`/tools/chrome-extension`](#toolschrome-extension-chrome-extension) — Chrome Extension
- [`/tools/firecrawl`](#toolsfirecrawl-firecrawl) — Firecrawl
- [`/tools/web-fetch`](#toolsweb-fetch-web-fetch) — Web fetch
- [`/tools/web`](#toolsweb-web-search) — Web search
- [`/tools/brave-search`](#toolsbrave-search-brave-search) — Brave search
- [`/tools/duckduckgo-search`](#toolsduckduckgo-search-duckduckgo-search) — DuckDuckGo search
- [`/tools/exa-search`](#toolsexa-search-exa-search) — Exa search
- [`/tools/gemini-search`](#toolsgemini-search-gemini-search) — Gemini search
- [`/tools/grok-search`](#toolsgrok-search-grok-search) — Grok search
- [`/tools/kimi-search`](#toolskimi-search-kimi-search) — Kimi search
- [`/tools/minimax-search`](#toolsminimax-search-minimax-search) — MiniMax search
- [`/tools/ollama-search`](#toolsollama-search-ollama-web-search) — Ollama web search
- [`/tools/parallel-search`](#toolsparallel-search-parallel-search) — Parallel search
- [`/tools/perplexity-search`](#toolsperplexity-search-perplexity-search) — Perplexity search
- [`/tools/searxng-search`](#toolssearxng-search-searxng-search) — SearXNG search
- [`/tools/tavily`](#toolstavily-tavily) — Tavily
- [`/tools/agent-send`](#toolsagent-send-agent-send) — Agent send
- [`/tools/goal`](#toolsgoal-goal) — Goal
- [`/tools/steer`](#toolssteer-steer) — Steer
- [`/tools/subagents`](#toolssubagents-sub-agents) — Sub-agents
- [`/tools/subagents/slash-command`](#toolssubagentsslash-command-sub-agent-slash-command) — Sub-agent slash command
- [`/tools/subagents/tool-reference`](#toolssubagentstool-reference-sub-agent-tool-reference) — Sub-agent tool reference
- [`/tools/subagents/thread-bound-sessions`](#toolssubagentsthread-bound-sessions-thread-bound-sub-agent-sessions) — Thread-bound sub-agent sessions
- [`/tools/subagents/nesting`](#toolssubagentsnesting-nested-sub-agents-and-authentication) — Nested sub-agents and authentication
- [`/tools/subagents/announce`](#toolssubagentsannounce-sub-agent-announce) — Sub-agent announce
- [`/tools/subagents/tool-policy`](#toolssubagentstool-policy-sub-agent-tool-policy) — Sub-agent tool policy
- [`/tools/subagents/operations`](#toolssubagentsoperations-sub-agent-concurrency-recovery-and-stopping) — Sub-agent concurrency, recovery, and stopping
- [`/tools/swarm`](#toolsswarm-swarm) — Swarm
- [`/tools/acp-agents`](#toolsacp-agents-acp-agents) — ACP agents
- [`/tools/acp-agents/quickstart`](#toolsacp-agentsquickstart-acp-agents-quickstart) — ACP agents quickstart
- [`/tools/acp-agents/runbook`](#toolsacp-agentsrunbook-acp-agents-operator-runbook) — ACP agents operator runbook
- [`/tools/acp-agents/bindings`](#toolsacp-agentsbindings-acp-agents-bindings) — ACP agents bindings
- [`/tools/acp-agents/sessions`](#toolsacp-agentssessions-acp-agents-sessions) — ACP agents sessions
- [`/tools/acp-agents/delivery`](#toolsacp-agentsdelivery-acp-agents-delivery-model) — ACP agents delivery model
- [`/tools/acp-agents/controls`](#toolsacp-agentscontrols-acp-agents-controls) — ACP agents controls
- [`/tools/acp-agents/troubleshooting`](#toolsacp-agentstroubleshooting-acp-agents-troubleshooting) — ACP agents troubleshooting
- [`/tools/acp-agents-setup`](#toolsacp-agents-setup-acp-agents-setup) — ACP agents — setup
- [`/tools/multi-agent-sandbox-tools`](#toolsmulti-agent-sandbox-tools-multi-agent-sandbox-and-tools) — Multi-agent sandbox and tools

## Document sections

### `/tools` — Overview

**Overview** · *Capabilities › Overview*

> OpenClaw tools, skills, and plugins overview: what agents can call and how to extend them

<sub>source `docs/tools/index.md` · 223 lines · 1583 words</sub>

**Read when:** You want to understand what tools OpenClaw provides · You are deciding between built-in tools, skills, and plugins · You need the right docs entry point for tool policy, automation, or agent coordination

**Covers:** Start here · Choose tools, skills, or plugins · Built-in tool categories · Plugin-provided tools · Configure access and approvals · Extend capabilities · Troubleshoot missing tools · Related

**CLI:** `openclaw doctor`

**Config:** `tools.allow`, `tools.codeMode`, `tools.deny`, `tools.exec`, `tools.fs`, `tools.toolSearch`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools](https://docs.openclaw.ai/tools)</sub>

---

### `/tools/plugin` — Plugins

**Plugins** · *Capabilities › Plugins*

> Install, configure, and manage OpenClaw plugins

<sub>source `docs/tools/plugin.md` · 461 lines · 2954 words · 12 code blocks</sub>

**Read when:** Installing or configuring plugins · Understanding plugin discovery and load rules · Working with Agent Plugins, Codex, Claude, or Cursor-compatible plugin bundles

**Covers:** Requirements · Quick start · Configuration · Understand plugin formats · Plugin hooks · Verify the active Gateway · Troubleshooting · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw gateway status`, `openclaw health`, `openclaw hooks`, `openclaw hooks list`, `openclaw logs`, `openclaw plugins`

**Config:** `plugins.allow`, `plugins.deny`, `plugins.load.paths`, `security.installPolicy`, `tools.allow`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/plugin](https://docs.openclaw.ai/tools/plugin)</sub>

---

### `/plugins/manage-plugins` — Manage plugins

**Manage plugins** · *Capabilities › Plugins*

> Manage OpenClaw plugins from the Control UI or CLI

<sub>source `docs/plugins/manage-plugins.md` · 499 lines · 3071 words · 14 code blocks</sub>

**Read when:** You want to browse, configure, enable, disable, or reload plugins in the Control UI · You want quick plugin list, install, update, inspect, or uninstall examples · You want to choose a plugin install source · You want the right reference for publishing plugin packages

**Covers:** Use the Control UI · List and search plugins · Enable and disable plugins · Capability consent · Install plugins · Apply changes and inspect · Manage plugins from an agent conversation · Update plugins · Uninstall plugins · Choose a source · Publish plugins · Related

**CLI:** `openclaw claws status`, `openclaw config`, `openclaw doctor`, `openclaw plugins`, `openclaw plugins disable`, `openclaw plugins doctor`, `openclaw plugins enable`, `openclaw plugins inspect`

**Config:** `plugins.allow`, `plugins.deny`, `plugins.load.paths`, `plugins.refresh`, `plugins.reload`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manage-plugins](https://docs.openclaw.ai/plugins/manage-plugins)</sub>

---

### `/plugins/community` — Community plugins

**Community plugins** · *Capabilities › Plugins*

> Find and publish community-maintained OpenClaw plugins

<sub>source `docs/plugins/community.md` · 72 lines · 285 words · 4 code blocks</sub>

**Read when:** You want to find third-party OpenClaw plugins · You want to publish or list your own plugin on ClawHub

**Covers:** Find plugins · Publish plugins · Related

**CLI:** `openclaw plugins`, `openclaw plugins install`, `openclaw plugins search`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/community](https://docs.openclaw.ai/plugins/community)</sub>

---

### `/plugins/bundles` — Plugin bundles

**Plugin bundles** · *Capabilities › Plugins*

> Install and use Agent Plugins, Codex, Claude, and Cursor bundles as OpenClaw plugins

<sub>source `docs/plugins/bundles.md` · 373 lines · 1888 words · 4 code blocks</sub>

**Read when:** You want to install an Agent Plugins, Codex, Claude, or Cursor-compatible bundle · You need to understand how OpenClaw maps bundle content into native features · You are debugging bundle detection or missing capabilities

**Covers:** Why bundles exist · Install a bundle · What OpenClaw maps from bundles · MCP for embedded OpenClaw · Bundle formats · Detection precedence · Runtime dependencies and cleanup · Security · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw mcp set`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw plugins list`, `openclaw plugins marketplace`

**Config:** `mcp.json`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/bundles](https://docs.openclaw.ai/plugins/bundles)</sub>

---

### `/plugins/agentsapi` — Agents API

**Agents API** · *Capabilities › Plugin guides*

> Use the cloud-hosted Agents API harness, powered by Codex, with OpenClaw

<sub>source `docs/plugins/agentsapi.md` · 234 lines · 1396 words · 2 code blocks</sub>

**Read when:** You want to set up Agents API as your OpenClaw agent runtime · You want hosted execution with your chat channels, instructions, and tools

**Covers:** What is Agents API? · Set up Agents API · Continue a task · Work with files and tools · Advanced configuration and reference <sub>(9 sub-sections)</sub>

**CLI:** `openclaw models auth`, `openclaw models status`

**Config:** `mcp.servers`, `plugins.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/agentsapi](https://docs.openclaw.ai/plugins/agentsapi)</sub>

---

### `/plugins/codex-computer-use` — Codex Computer Use

**Codex Computer Use** · *Capabilities › Codex*

> Set up Codex Computer Use for Codex-mode OpenClaw agents

<sub>source `docs/plugins/codex-computer-use.md` · 474 lines · 3502 words · 7 code blocks</sub>

**Read when:** You want Codex-mode OpenClaw agents to use Codex Computer Use · You are deciding between Codex Computer Use, PeekabooBridge, and direct cua-driver MCP · You are configuring computerUse for the bundled Codex plugin · You are troubleshooting /codex computer-use status or install

**Covers:** OpenClaw.app and Peekaboo · iOS app · Direct cua-driver MCP · Quick setup · Commands · Marketplace choices · Bundled macOS marketplace · Remote marketplaces · Configuration reference · What OpenClaw checks · macOS permissions · Troubleshooting · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw codex`, `openclaw mcp set`

**Config:** `plugins.entries.codex.config.computerUse`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-computer-use](https://docs.openclaw.ai/plugins/codex-computer-use)</sub>

---

### `/plugins/codex-harness` — Codex harness

**Codex harness** · *Capabilities › Codex*

> Run OpenClaw embedded agent turns through the official Codex app-server harness

<sub>source `docs/plugins/codex-harness.md` · 770 lines · 6354 words · 6 code blocks</sub>

**Read when:** You want to use the official Codex app-server harness · You need Codex harness config examples · You need explicit Codex runtime policy and fallback rules

**Covers:** Shared output projection · Saved-account usage · Native subagent status · Requirements · Quickstart · Verify Codex runtime · Luna Reserve and credit usage · Where each section moved · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw models auth`, `openclaw plugins install`

**Config:** `plugins.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness](https://docs.openclaw.ai/plugins/codex-harness)</sub>

---

### `/plugins/codex-harness/placement` — Run Codex on another machine

**Run Codex on another machine** · *Capabilities › Codex harness*

> Place Codex native execution on a paired device or a cloud worker

<sub>source `docs/plugins/codex-harness/placement.md` · 158 lines · 1107 words · 2 code blocks</sub>

**Read when:** You want Codex commands to run on another machine · You are approving the Codex node exec-server command · You are placing a Codex session on a cloud worker

**Covers:** Run Codex on a paired device · Run Codex on a cloud worker

**CLI:** `openclaw gateway call`, `openclaw nodes approve`, `openclaw nodes pending`

**Config:** `plugins.allow`, `tools.exec`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/placement](https://docs.openclaw.ai/plugins/codex-harness/placement)</sub>

---

### `/plugins/codex-harness/routing` — Codex routing and deployment

**Codex routing and deployment** · *Capabilities › Codex harness*

> Choose which OpenAI routes select Codex and shape the deployment around them

<sub>source `docs/plugins/codex-harness/routing.md` · 209 lines · 1288 words · 3 code blocks</sub>

**Read when:** You need to know which model refs select the Codex runtime · You want a fail-closed Codex requirement · You are configuring a mixed-provider fleet

**Covers:** Routing and model selection · Deployment patterns <sub>(4 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.imageModel`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/routing](https://docs.openclaw.ai/plugins/codex-harness/routing)</sub>

---

### `/plugins/codex-harness/configuration` — Codex harness configuration

**Codex harness configuration** · *Capabilities › Codex harness*

> Codex harness config map, restricted turns, project instructions, compaction, and long context

<sub>source `docs/plugins/codex-harness/configuration.md` · 333 lines · 1929 words · 5 code blocks</sub>

**Read when:** You need the Codex harness config map · You are tuning compaction or project instructions · You are configuring the direct OpenAI API long-context route

**Covers:** Configuration <sub>(4 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw models auth`

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `agents.defaults.compaction.provider`, `agents.defaults.compaction.timeoutSeconds`, `compaction.model`, `compaction.provider`, `models.providers.*.models[].contextTokens`, `plugins.allow`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/plugins/codex-harness/configuration](https://docs.openclaw.ai/plugins/codex-harness/configuration)</sub>

---

### `/plugins/codex-harness/app-server` — Codex app-server policy

**Codex app-server policy** · *Capabilities › Codex harness*

> App-server transport, approval posture, auth order, and environment isolation

<sub>source `docs/plugins/codex-harness/app-server.md` · 320 lines · 2093 words · 3 code blocks</sub>

**Read when:** You are choosing an app-server transport or approval posture · You need the Codex auth selection order · You are isolating the Codex app-server environment

**Covers:** App-server policy · Auth order · Scheduled app authority · Environment isolation · Local testing env overrides <sub>(1 sub-sections)</sub>

**CLI:** `openclaw audit`, `openclaw automations disable`, `openclaw automations list`, `openclaw doctor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/app-server](https://docs.openclaw.ai/plugins/codex-harness/app-server)</sub>

---

### `/plugins/codex-harness/config-fields` — Codex plugin config fields

**Codex plugin config fields** · *Capabilities › Codex harness*

> Top-level and appServer config fields for the Codex plugin

<sub>source `docs/plugins/codex-harness/config-fields.md` · 107 lines · 1124 words · 1 code blocks</sub>

**Read when:** You need the supported Codex plugin config fields · You are setting an appServer field and want its default · You are enabling Codex managed networking

**Covers:** Config fields

**CLI:** `openclaw doctor`

**Config:** `plugins.entries.codex.config`, `tools.*`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/config-fields](https://docs.openclaw.ai/plugins/codex-harness/config-fields)</sub>

---

### `/plugins/codex-harness/commands` — Codex commands and diagnostics

**Codex commands and diagnostics** · *Capabilities › Codex harness*

> The /codex command surface, Fast mode controls, and local thread inspection

<sub>source `docs/plugins/codex-harness/commands.md` · 134 lines · 1064 words · 1 code blocks</sub>

**Read when:** You need the /codex command surface · You are comparing shared Fast mode with Codex fast mode · You are inspecting a bad Codex run

**Covers:** Commands and diagnostics <sub>(2 sub-sections)</sub>

**Config:** `plugins.entries.codex.config.appServer.serviceTier`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/commands](https://docs.openclaw.ai/plugins/codex-harness/commands)</sub>

---

### `/plugins/codex-harness/runtime-behavior` — Codex runtime behavior

**Codex runtime behavior** · *Capabilities › Codex harness*

> Dynamic tools, web search, image loading, turn liveness, and runtime boundaries

<sub>source `docs/plugins/codex-harness/runtime-behavior.md` · 320 lines · 2678 words</sub>

**Read when:** You want to know which OpenClaw tools reach a Codex turn · You are debugging turn liveness or parallel chats · You need the ownership split between OpenClaw and Codex

**Covers:** Dynamic tools and web search · Inspecting tool output · Background text completions · Image loader ownership · Turn liveness and timeouts · Cyber safety notices · Automatic Daybreak escalation · Parallel chats and thread ownership · Runtime boundaries

**Config:** `agents.defaults.timeoutSeconds`, `plugins.entries.codex.config.appServer.cyberFailover`, `tools.*`, `web.run`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/runtime-behavior](https://docs.openclaw.ai/plugins/codex-harness/runtime-behavior)</sub>

---

### `/plugins/codex-harness/native-features` — Native Codex state and features

**Native Codex state and features** · *Capabilities › Codex harness*

> Share native Codex threads, supervise sessions, and enable native plugins and Computer Use

<sub>source `docs/plugins/codex-harness/native-features.md` · 308 lines · 2172 words · 4 code blocks</sub>

**Read when:** You want OpenClaw to share the native Codex home · You want to use your existing local Codex config.toml and login · You are enabling Codex supervision · You are enabling native Codex plugins or Computer Use

**Covers:** Share threads with Codex Desktop and CLI · Use an existing local config.toml · Supervise Codex sessions · Native Codex plugins · Computer Use · Rich MCP forms <sub>(1 sub-sections)</sub>

**CLI:** `openclaw models auth`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/native-features](https://docs.openclaw.ai/plugins/codex-harness/native-features)</sub>

---

### `/plugins/codex-harness/troubleshooting` — Codex harness troubleshooting

**Codex harness troubleshooting** · *Capabilities › Codex harness*

> Symptoms and fixes for Codex harness selection, app-server, and memory problems

<sub>source `docs/plugins/codex-harness/troubleshooting.md` · 212 lines · 1426 words · 2 code blocks</sub>

**Read when:** Codex is not selected when you expect it · The Codex app-server fails to start or connect · Codex native tools are blocked or use too much memory

**Covers:** Troubleshooting

**CLI:** `openclaw doctor`

**Config:** `agents.max_threads`, `plugins.allow`, `plugins.entries.codex.config.discovery.timeoutMs`, `plugins.entries.codex.enabled`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness/troubleshooting](https://docs.openclaw.ai/plugins/codex-harness/troubleshooting)</sub>

---

### `/plugins/codex-native-plugins` — Native Codex plugins

**Native Codex plugins** · *Capabilities › Codex*

> Configure native Codex plugins for Codex-mode OpenClaw agents

<sub>source `docs/plugins/codex-native-plugins.md` · 785 lines · 5673 words · 10 code blocks</sub>

**Read when:** You want Codex-mode OpenClaw agents to use native Codex plugins · You are migrating source-installed openai-curated Codex plugins · You are discovering or installing a Codex marketplace plugin · You are troubleshooting codexPlugins, app inventory, destructive actions, or plugin app diagnostics · You need the precedence of OpenClaw policy, native app defaults, and per-tool overrides

**Covers:** Requirements · Quickstart · Scheduled automations · Manage plugins from chat · How native plugin setup works · Support boundary · App inventory and ownership · Connected account apps · Thread app config · Approval decision order · Destructive action policy · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw migrate`, `openclaw migrate apply`, `openclaw migrate codex`

**Config:** `plugins.entries.codex.config.appServer.approvalPolicy`, `plugins.entries.codex.config.codexPlugins`, `plugins.entries.codex.config.codexPlugins.enabled`, `plugins.entries.codex.config.codexPlugins.plugins`, `plugins.entries.codex.enabled`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-native-plugins](https://docs.openclaw.ai/plugins/codex-native-plugins)</sub>

---

### `/plugins/codex-supervision` — Supervise Codex sessions

**Supervise Codex sessions** · *Capabilities › Codex*

> Browse non-archived native Codex sessions and paginated transcripts across OpenClaw nodes

<sub>source `docs/plugins/codex-supervision.md` · 690 lines · 5616 words · 4 code blocks</sub>

**Read when:** You want Codex Desktop or CLI sessions to appear in OpenClaw · You need to continue a stored or idle Codex session or archive a local one · You are exposing Codex sessions and transcript history from paired nodes

**Covers:** Before you begin · Enable supervision · Start a new native Codex CLI · Use the operator CLI · Branch from a local session · Fork a message in a supervised Chat · Archive a local session · Understand paired-node limits · Metadata and permissions · Troubleshooting · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw codex archive`, `openclaw codex continue`, `openclaw codex sessions`, `openclaw doctor`, `openclaw nodes approve`, `openclaw nodes list`, `openclaw nodes pending`, `openclaw onboard`

**Config:** `gateway.cliAgents.enabled`, `gateway.nodes.commands.allow`, `plugins.allow`, `plugins.entries.codex.config.supervision`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-supervision](https://docs.openclaw.ai/plugins/codex-supervision)</sub>

---

### `/specs/codex-supervision` — Codex supervision

**Codex supervision** · *Capabilities › Codex*

> Architecture and product boundary for supervising native Codex sessions from OpenClaw.

<sub>source `docs/specs/codex-supervision.md` · 667 lines · 5217 words · 4 code blocks</sub>

**Read when:** Designing Codex session discovery, continuation, or archive behavior · Changing the native session catalog UI or Gateway RPCs · Extending Codex supervision across paired nodes

**Covers:** Goal · Product boundary · Ownership · Catalog flow · Operator CLI boundary · Canonical message forks · Local continuation · Archive behavior · Active thread safety · Paired-node boundary · Permissions · Compatibility · Future work · Acceptance tests · _+1 more_

**CLI:** `openclaw codex archive`, `openclaw codex continue`, `openclaw codex sessions`, `openclaw doctor`

**Config:** `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `plugins.entries.codex-supervisor`, `plugins.entries.codex.config.supervision`

<sub>live: [docs.openclaw.ai/specs/codex-supervision](https://docs.openclaw.ai/specs/codex-supervision)</sub>

---

### `/plugins/copilot` — Copilot SDK harness

**Copilot SDK harness** · *Capabilities › Plugin guides*

> Run OpenClaw embedded agent turns through the external GitHub Copilot SDK harness

<sub>source `docs/plugins/copilot.md` · 389 lines · 2286 words · 3 code blocks</sub>

**Read when:** You want to use the GitHub Copilot SDK harness for an agent · You need configuration examples for the `copilot` runtime · You are wiring an agent to subscription Copilot (github / openclaw / copilot) and want it to run through the Copilot CLI

**Covers:** Requirements · Install · Quickstart · Supported providers · BYOK · Auth · Configuration surface · Compaction · Transcript persistence · Side questions (/btw) · Doctor · Limitations · Permissions and askuser · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw plugins install`

**Config:** `models.json`, `models.providers`, `plugins.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/copilot](https://docs.openclaw.ai/plugins/copilot)</sub>

---

### `/plugins/meeting-plugins` — Meeting plugins

**Meeting plugins** · *Capabilities › Meetings and calls*

> Choose and configure Google Meet, Microsoft Teams, Slack huddles, or Zoom participation

<sub>source `docs/plugins/meeting-plugins.md` · 224 lines · 1949 words · 5 code blocks</sub>

**Read when:** You want an OpenClaw agent to join a video meeting · You are choosing between the Google Meet, Microsoft Teams meetings, Slack huddles, and Zoom meetings plugins · You need the shared Chrome, virtual-audio, or meeting-mode setup

**Covers:** Choose a plugin · Choose a mode · Configure Teams or Zoom · Prepare Chrome and audio · Install or disable plugins · Verify and join · Handle platform policy prompts · Discord voice chat · Platform guides

**CLI:** `openclaw googlemeet join`, `openclaw googlemeet setup`, `openclaw models auth`, `openclaw plugins disable`, `openclaw plugins enable`, `openclaw plugins install`, `openclaw slackhuddles join`, `openclaw slackhuddles setup`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/meeting-plugins](https://docs.openclaw.ai/plugins/meeting-plugins)</sub>

---

### `/plugins/facetime` — FaceTime plugin

**FaceTime plugin** · *Capabilities › Meetings and calls*

> Set up FaceTime voice calls with your OpenClaw agent on a Mac

<sub>source `docs/plugins/facetime.md` · 350 lines · 1641 words · 12 code blocks</sub>

**Read when:** You want to configure FaceTime calls with your OpenClaw agent · You need to install the native helper and configure Mac audio

**Covers:** Requirements · Install the plugin and native companion · Configure owner identities · Prepare the Mac · Inspect and activate · Verify your first call · Place and end calls · Update the integration · Remove the integration · Limits · Troubleshooting · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway call`, `openclaw gateway restart`, `openclaw plugins disable`, `openclaw plugins install`

**Config:** `plugins.allow`, `plugins.entries.facetime`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/facetime](https://docs.openclaw.ai/plugins/facetime)</sub>

---

### `/plugins/facetime-recovery` — FaceTime recovery and removal

**FaceTime recovery and removal** · *Capabilities › Meetings and calls*

> Remove FaceTime native artifacts and restore standard Mac security policy

<sub>source `docs/plugins/facetime-recovery.md` · 59 lines · 311 words · 2 code blocks</sub>

**Read when:** You are uninstalling the experimental FaceTime plugin · Helper injection or the paired audio driver needs recovery

**Covers:** Remove driver and helper artifacts · Restore SIP debugging restrictions · Recover a failed driver update

**CLI:** `openclaw gateway call`, `openclaw plugins disable`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/facetime-recovery](https://docs.openclaw.ai/plugins/facetime-recovery)</sub>

---

### `/plugins/google-meet` — Google Meet plugin

**Google Meet plugin** · *Capabilities › Meetings and calls*

> Google Meet plugin: join explicit Meet URLs through Chrome or Twilio with agent talk-back defaults

<sub>source `docs/plugins/google-meet.md` · 246 lines · 1757 words · 13 code blocks</sub>

**Read when:** You want an OpenClaw agent to join a Google Meet call · You want an OpenClaw agent to create a new Google Meet call · You are configuring Chrome, Chrome node, or Twilio as a Google Meet transport

**Covers:** Quick start · Audio bridge architecture · Where each section moved · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw googlemeet auth`, `openclaw googlemeet create`, `openclaw googlemeet join`, `openclaw googlemeet setup`, `openclaw googlemeet test-listen`, `openclaw googlemeet transcript`, `openclaw plugins disable`, `openclaw plugins install`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/google-meet](https://docs.openclaw.ai/plugins/google-meet)</sub>

---

### `/plugins/google-meet/transports` — Google Meet transports and hosts

**Google Meet transports and hosts** · *Capabilities › Google Meet*

> Google Meet transports: local Chrome, Chrome on a paired node, and Twilio dial-in

<sub>source `docs/plugins/google-meet/transports.md` · 224 lines · 1122 words · 14 code blocks</sub>

**Read when:** You are choosing between local Chrome, a paired Chrome node, and Twilio dial-in · You are giving a macOS VM to the Gateway as a Chrome host · You are installing the host audio tools the Chrome talk-back path needs

**Covers:** Local Gateway + Parallels Chrome · Install notes · Transports <sub>(3 sub-sections)</sub>

**CLI:** `openclaw config validate`, `openclaw devices approve`, `openclaw devices list`, `openclaw googlemeet join`, `openclaw googlemeet setup`, `openclaw googlemeet test-speech`, `openclaw node install`, `openclaw node restart`

**Config:** `gateway.nodes.commands.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/google-meet/transports](https://docs.openclaw.ai/plugins/google-meet/transports)</sub>

---

### `/plugins/google-meet/oauth-and-artifacts` — Google Meet OAuth and artifacts

**Google Meet OAuth and artifacts** · *Capabilities › Google Meet*

> Google Meet OAuth setup, refresh tokens, preflight, and conference artifact exports

<sub>source `docs/plugins/google-meet/oauth-and-artifacts.md` · 299 lines · 1157 words · 20 code blocks</sub>

**Read when:** You are creating Google Cloud credentials for the Google Meet REST API · You are minting or rotating the Google Meet refresh token · You are reading Meet artifacts, attendance, or transcript exports

**Covers:** OAuth and preflight <sub>(6 sub-sections)</sub>

**CLI:** `openclaw googlemeet`, `openclaw googlemeet artifacts`, `openclaw googlemeet attendance`, `openclaw googlemeet auth`, `openclaw googlemeet calendar-events`, `openclaw googlemeet create`, `openclaw googlemeet doctor`, `openclaw googlemeet end-active-conference`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/google-meet/oauth-and-artifacts](https://docs.openclaw.ai/plugins/google-meet/oauth-and-artifacts)</sub>

---

### `/plugins/google-meet/config` — Google Meet configuration

**Google Meet configuration** · *Capabilities › Google Meet*

> Google Meet plugin config defaults, overrides, and provider examples

<sub>source `docs/plugins/google-meet/config.md` · 217 lines · 986 words · 5 code blocks</sub>

**Read when:** You are looking up a Google Meet plugin config key and its default · You are pointing Google Meet at a specific realtime or TTS provider · You are configuring the Twilio dial plan for Google Meet

**Covers:** Config <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw models auth`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/google-meet/config](https://docs.openclaw.ai/plugins/google-meet/config)</sub>

---

### `/plugins/google-meet/tool-and-modes` — Google Meet tool and modes

**Google Meet tool and modes** · *Capabilities › Google Meet*

> The googlemeet tool actions, status fields, and agent versus bidi talk-back modes

<sub>source `docs/plugins/google-meet/tool-and-modes.md` · 194 lines · 1629 words · 7 code blocks</sub>

**Read when:** You are calling the google_meet tool from an agent · You are reading Chrome session health from google_meet status · You are choosing between agent, bidi, and transcribe modes

**Covers:** Tool · Native participation requests · Agent and bidi modes

**CLI:** `openclaw googlemeet speak`, `openclaw googlemeet test-speech`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/google-meet/tool-and-modes](https://docs.openclaw.ai/plugins/google-meet/tool-and-modes)</sub>

---

### `/plugins/google-meet/troubleshooting` — Google Meet troubleshooting

**Google Meet troubleshooting** · *Capabilities › Google Meet*

> Google Meet live test checklist and fixes for join, speech, creation, and Twilio failures

<sub>source `docs/plugins/google-meet/troubleshooting.md` · 274 lines · 1608 words · 18 code blocks</sub>

**Read when:** You are checking a Google Meet setup before an unattended agent joins · An agent joined a Meet call but cannot see, hear, or talk · A Twilio dial-in leg never enters the Meet room

**Covers:** Live test checklist · Troubleshooting <sub>(8 sub-sections)</sub>

**CLI:** `openclaw devices approve`, `openclaw devices list`, `openclaw googlemeet auth`, `openclaw googlemeet doctor`, `openclaw googlemeet join`, `openclaw googlemeet recover-tab`, `openclaw googlemeet setup`, `openclaw googlemeet status`

**Config:** `plugins.allow`, `plugins.entries.voice-call`, `plugins.entries.voice-call.config.publicUrl`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/google-meet/troubleshooting](https://docs.openclaw.ai/plugins/google-meet/troubleshooting)</sub>

---

### `/plugins/teams-meetings` — Microsoft Teams meetings plugin

**Microsoft Teams meetings plugin** · *Capabilities › Meetings and calls*

> Microsoft Teams meetings plugin: join work or consumer meetings as a Chrome browser guest

<sub>source `docs/plugins/teams-meetings.md` · 47 lines · 246 words</sub>

**Read when:** You want an OpenClaw agent to join a Microsoft Teams meeting · You need Teams-specific guest policy or manual-action guidance

**Covers:** Handle Teams policy and manual actions · Tool and Gateway surface · Related

**Config:** `plugins.entries.teams-meetings.config`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/teams-meetings](https://docs.openclaw.ai/plugins/teams-meetings)</sub>

---

### `/plugins/slack-huddles` — Slack huddles plugin

**Slack huddles plugin** · *Capabilities › Meetings and calls*

> Slack huddles plugin: join active huddles through a signed-in Chrome user account

<sub>source `docs/plugins/slack-huddles.md` · 171 lines · 989 words · 5 code blocks</sub>

**Read when:** You want an OpenClaw agent to join a Slack huddle · You need to set up the dedicated Slack user or understand manual actions

**Covers:** Requirements · Install and enable · Configure · Join and manage a huddle · Handle manual actions · Limits · Related

**CLI:** `openclaw plugins enable`, `openclaw plugins install`, `openclaw slackhuddles join`, `openclaw slackhuddles leave`, `openclaw slackhuddles setup`, `openclaw slackhuddles status`

**Config:** `plugins.entries.slack-huddles.config.chromeNode.node`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/slack-huddles](https://docs.openclaw.ai/plugins/slack-huddles)</sub>

---

### `/plugins/voice-call` — Voice call plugin

**Voice call plugin** · *Capabilities › Meetings and calls*

> Place outbound and accept inbound voice calls via Twilio, Telnyx, or Plivo, with optional realtime voice and streaming transcription

<sub>source `docs/plugins/voice-call.md` · 169 lines · 643 words · 5 code blocks</sub>

**Read when:** You want to place an outbound voice call from OpenClaw · You are configuring or developing the voice-call plugin · You need realtime voice or streaming transcription on telephony

**Covers:** Quick start · Where each section moved · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw plugins install`, `openclaw voicecall`, `openclaw voicecall setup`, `openclaw voicecall smoke`

**Config:** `plugins.entries.voice-call.config`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/voice-call](https://docs.openclaw.ai/plugins/voice-call)</sub>

---

### `/plugins/voice-call/configuration` — Voice call configuration

**Voice call configuration** · *Capabilities › Voice call*

> Plugin config keys, the call owner, the config reference table, and session scope

<sub>source `docs/plugins/voice-call/configuration.md` · 189 lines · 984 words · 1 code blocks</sub>

**Read when:** You are setting up voice-call plugin config keys · You need the default for a voice-call config key · You are choosing how call sessions are scoped

**Covers:** Configuration · Session scope <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agents list`, `openclaw doctor`, `openclaw voicecall setup`

**Config:** `plugins.entries.voice-call.config`, `plugins.entries.voice-call.config.agentId`, `plugins.entries.voice-call.config.realtime.providers.*.apiKey`, `plugins.entries.voice-call.config.streaming.providers.*.apiKey`, `plugins.entries.voice-call.config.tts.providers.*.apiKey`, `plugins.entries.voice-call.config.twilio.authToken`, `session.mainKey`, `session.scope`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/voice-call/configuration](https://docs.openclaw.ai/plugins/voice-call/configuration)</sub>

---

### `/plugins/voice-call/realtime-and-streaming` — Voice call realtime and streaming

**Voice call realtime and streaming** · *Capabilities › Voice call*

> Realtime voice conversations, tool policy, agent voice context, and streaming transcription

<sub>source `docs/plugins/voice-call/realtime-and-streaming.md` · 345 lines · 1555 words · 6 code blocks</sub>

**Read when:** You want a full-duplex realtime voice model on a call · You are tuning realtime tool policy or agent consult · You are streaming Twilio call audio to a transcription provider

**Covers:** Realtime voice conversations · Streaming transcription <sub>(6 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/voice-call/realtime-and-streaming](https://docs.openclaw.ai/plugins/voice-call/realtime-and-streaming)</sub>

---

### `/plugins/voice-call/tts-and-inbound-calls` — Voice call TTS and inbound calls

**Voice call TTS and inbound calls** · *Capabilities › Voice call*

> Telephony TTS, inbound policy, per-number routing, and call lifecycle timers

<sub>source `docs/plugins/voice-call/tts-and-inbound-calls.md` · 248 lines · 932 words · 7 code blocks</sub>

**Read when:** You are choosing the TTS voice used on calls · You are enabling inbound calls or per-number routing · You need to tune the stale call reaper or call duration caps

**Covers:** TTS for calls · Inbound calls · Stale call reaper <sub>(5 sub-sections)</sub>

**CLI:** `openclaw doctor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/voice-call/tts-and-inbound-calls](https://docs.openclaw.ai/plugins/voice-call/tts-and-inbound-calls)</sub>

---

### `/plugins/voice-call/security-and-interfaces` — Voice call security and interfaces

**Voice call security and interfaces** · *Capabilities › Voice call*

> Webhook security options and the CLI, agent tool, and Gateway RPC surfaces

<sub>source `docs/plugins/voice-call/security-and-interfaces.md` · 113 lines · 562 words · 2 code blocks</sub>

**Read when:** You are putting a proxy or tunnel in front of the voice webhook · You are looking up a voicecall CLI command · You are calling voice-call over Gateway RPC or the agent tool

**Covers:** Webhook security · CLI · Agent tool · Gateway RPC

**CLI:** `openclaw doctor`, `openclaw voicecall call`, `openclaw voicecall continue`, `openclaw voicecall dtmf`, `openclaw voicecall end`, `openclaw voicecall expose`, `openclaw voicecall latency`, `openclaw voicecall speak`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/voice-call/security-and-interfaces](https://docs.openclaw.ai/plugins/voice-call/security-and-interfaces)</sub>

---

### `/plugins/voice-call/troubleshooting` — Voice call troubleshooting

**Voice call troubleshooting** · *Capabilities › Voice call*

> Fixes for voice-call setup, webhooks, signatures, Meet dial-in, and silent calls

<sub>source `docs/plugins/voice-call/troubleshooting.md` · 195 lines · 939 words · 7 code blocks</sub>

**Read when:** A voice call fails to place or webhooks never arrive · Webhook signature verification fails · A realtime call connects but nobody speaks

**Covers:** Troubleshooting <sub>(7 sub-sections)</sub>

**CLI:** `openclaw googlemeet setup`, `openclaw logs`, `openclaw voicecall setup`, `openclaw voicecall smoke`, `openclaw voicecall status`, `openclaw voicecall tail`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/voice-call/troubleshooting](https://docs.openclaw.ai/plugins/voice-call/troubleshooting)</sub>

---

### `/plugins/zoom-meetings` — Zoom meetings plugin

**Zoom meetings plugin** · *Capabilities › Meetings and calls*

> Zoom meetings plugin: join meetings as a Chrome browser guest

<sub>source `docs/plugins/zoom-meetings.md` · 46 lines · 257 words</sub>

**Read when:** You want an OpenClaw agent to join a Zoom meeting · You need Zoom-specific guest policy or manual-action guidance

**Covers:** Handle Zoom policy and manual actions · Tool and Gateway surface · Related

**Config:** `plugins.entries.zoom-meetings.config`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/zoom-meetings](https://docs.openclaw.ai/plugins/zoom-meetings)</sub>

---

### `/plugins/apple-fm` — Apple Foundation Models

**Apple Foundation Models** · *Capabilities › Models and memory*

> Use on-device Apple Foundation Models for lightweight OpenClaw setup on a Mac

<sub>source `docs/plugins/apple-fm.md` · 116 lines · 863 words · 2 code blocks</sub>

**Read when:** You want to set up OpenClaw on a Mac without an API key · You want to use Apple Intelligence for short local tasks

**Covers:** Requirements · Set up · Runtime behavior · Troubleshooting

**CLI:** `openclaw doctor`, `openclaw onboard`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/apple-fm](https://docs.openclaw.ai/plugins/apple-fm)</sub>

---

### `/plugins/llama-cpp` — llama.cpp Provider

**llama.cpp Provider** · *Capabilities › Models and memory*

> Run GGUF chat with managed or existing llama.cpp servers and managed local embeddings

<sub>source `docs/plugins/llama-cpp.md` · 313 lines · 1620 words · 8 code blocks</sub>

**Read when:** You want OpenClaw to install and manage a local llama.cpp server · You want a local model recommendation for your Gateway hardware · You want OpenClaw to connect to an existing llama-server · You want memory search embeddings from a local GGUF model · You are configuring memory.search.provider = "local

**Covers:** Choose server ownership · Managed local server · Existing llama-server · Requests and local embeddings · Troubleshooting · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw memory status`, `openclaw models list`, `openclaw models set`, `openclaw onboard`, `openclaw plugins install`

**Config:** `agents.defaults.timeoutSeconds`, `memory.search.provider`, `models.providers.llama-cpp.localService`, `models.providers.llama-cpp.models`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/llama-cpp](https://docs.openclaw.ai/plugins/llama-cpp)</sub>

---

### `/plugins/memory-lancedb` — Memory LanceDB

**Memory LanceDB** · *Capabilities › Models and memory*

> Configure the official external LanceDB memory plugin, including local Ollama-compatible embeddings

<sub>source `docs/plugins/memory-lancedb.md` · 431 lines · 1669 words · 14 code blocks</sub>

**Read when:** You are configuring the memory-lancedb plugin · You want LanceDB-backed long-term memory with auto-recall or auto-capture · You are using local OpenAI-compatible embeddings such as Ollama

**Covers:** Installation · Quick start · Embedding config · Ollama embeddings · Recall and capture limits · Commands · Storage · Runtime dependencies and platform support · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw ltm list`, `openclaw ltm query`, `openclaw ltm search`, `openclaw ltm stats`, `openclaw plugins inspect`, `openclaw plugins install`

**Config:** `agents.entries.*`, `memory.search.rememberAcrossConversations`, `models.providers.openai.apiKey`, `plugins.slots.memory`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/memory-lancedb](https://docs.openclaw.ai/plugins/memory-lancedb)</sub>

---

### `/plugins/memory-wiki` — Memory wiki

**Memory wiki** · *Capabilities › Models and memory*

> memory-wiki: compiled knowledge vault with provenance, claims, dashboards, and bridge mode

<sub>source `docs/plugins/memory-wiki.md` · 590 lines · 2637 words · 8 code blocks</sub>

**Read when:** You want persistent knowledge beyond plain MEMORY.md notes · You are configuring the bundled memory-wiki plugin · You need separate wiki vaults for agents in one Gateway · You want to understand wiki_search, wiki_get, or bridge mode

**Covers:** Vault modes · Vault layout · Open Knowledge Format imports · Structured claims and evidence · Agent-facing entity metadata · Compile pipeline · Dashboards and health reports · Search and retrieval · Agent tools · Browsing the wiki in the Control UI · Prompt and context behavior · Configuration · CLI · Obsidian support · _+2 more_ <sub>(2 sub-sections)</sub>

**CLI:** `openclaw plugins enable`, `openclaw wiki apply`, `openclaw wiki bridge`, `openclaw wiki compile`, `openclaw wiki doctor`, `openclaw wiki get`, `openclaw wiki ingest`, `openclaw wiki init`

**Config:** `plugins.entries.memory-wiki.config`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/memory-wiki](https://docs.openclaw.ai/plugins/memory-wiki)</sub>

---

### `/plugins/onnx` — Local ONNX decision models

**Local ONNX decision models** · *Capabilities › Models and memory*

> Run typed decisions locally with verified ONNX classifiers

<sub>source `docs/plugins/onnx.md` · 161 lines · 892 words · 4 code blocks</sub>

**Read when:** You want a local decision model without a hosted API · You are installing or checking ONNX model artifacts

**Covers:** Setup · Models · Question semantics · Lifecycle and runtime <sub>(3 sub-sections)</sub>

**CLI:** `openclaw onnx download`, `openclaw onnx models`, `openclaw onnx probe`, `openclaw onnx verify`, `openclaw plugins install`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/onnx](https://docs.openclaw.ai/plugins/onnx)</sub>

---

### `/plugins/typesafe` — TypeSafe AI

**TypeSafe AI** · *Capabilities › Models and memory*

> Use hosted Jev or a local System One server for typed decisions

<sub>source `docs/plugins/typesafe.md` · 269 lines · 1419 words · 6 code blocks</sub>

**Read when:** Configuring a typed decision model · Using TypeSafe with the decision evaluation tool · Running Kev locally through the System One API

**Covers:** Install · Enable and configure · Local System One server · Decision contract · Agent evaluation tool · Existing external installation <sub>(2 sub-sections)</sub>

**CLI:** `openclaw plugins install`

**Config:** `agents.defaults.decisionModel`, `plugins.allow`, `plugins.entries.typesafe`, `plugins.load.paths`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/typesafe](https://docs.openclaw.ai/plugins/typesafe)</sub>

---

### `/plugins/onepassword` — 1Password plugin

**1Password plugin** · *Capabilities › Secrets and vaults*

> Resolve SecretRefs and give agents curated, audited access to 1Password

<sub>source `docs/plugins/onepassword.md` · 333 lines · 1492 words · 11 code blocks</sub>

**Read when:** You want agents to request curated 1Password secrets · You want OpenClaw config credentials to resolve from 1Password · You need per-secret approval policy and audit history · You are configuring a 1Password service account for OpenClaw

**Covers:** Security model · Before you begin · Configure SecretRefs · Configure registered secrets · Use the agent tool · Policy tiers and approvals · Inspect status and audit history · 1Password CLI behavior · Error codes · Related

**CLI:** `openclaw onepassword audit`, `openclaw onepassword secretref`, `openclaw onepassword status`, `openclaw plugins enable`, `openclaw secrets`, `openclaw secrets apply`, `openclaw secrets audit`, `openclaw secrets reload`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/onepassword](https://docs.openclaw.ai/plugins/onepassword)</sub>

---

### `/plugins/vault` — Vault SecretRefs

**Vault SecretRefs** · *Capabilities › Secrets and vaults*

> Use the bundled Vault plugin to resolve SecretRefs from HashiCorp Vault

<sub>source `docs/plugins/vault.md` · 326 lines · 964 words · 25 code blocks</sub>

**Read when:** You want OpenClaw to read API keys from HashiCorp Vault · You are setting up SecretRefs on a local machine or server · You need to configure Vault-backed model provider credentials

**Covers:** Before you begin · Store a provider key in Vault · Make Vault visible to the Gateway · Generate and apply a SecretRef plan · Configure more provider keys · SecretRef id format · What OpenClaw stores · Containers and managed deployments · Related

**CLI:** `openclaw plugins enable`, `openclaw secrets`, `openclaw secrets apply`, `openclaw secrets audit`, `openclaw secrets reload`, `openclaw vault`, `openclaw vault setup`, `openclaw vault status`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/vault](https://docs.openclaw.ai/plugins/vault)</sub>

---

### `/plugins/admin-http-rpc` — Admin HTTP RPC plugin

**Admin HTTP RPC plugin** · *Capabilities › Automation and integrations*

> Expose selected Gateway control-plane methods through the bundled, opt-in admin-http-rpc plugin

<sub>source `docs/plugins/admin-http-rpc.md` · 208 lines · 980 words · 9 code blocks</sub>

**Read when:** Building host tooling that cannot use the Gateway WebSocket RPC client · Exposing Gateway admin automation behind a private trusted ingress · Auditing the security model for HTTP access to Gateway methods

**Covers:** Before you enable it · Enable · Verify the route · Authentication · Security model · Request · Response · Allowed methods · WebSocket comparison · Troubleshooting · Related

**CLI:** `openclaw plugins disable`, `openclaw plugins enable`, `openclaw plugins reload`

**Config:** `agents.create`, `agents.delete`, `agents.list`, `agents.update`, `channels.logout`, `channels.start`, `channels.status`, `channels.stop`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/admin-http-rpc](https://docs.openclaw.ai/plugins/admin-http-rpc)</sub>

---

### `/plugins/beam` — Beam plugin

**Beam plugin** · *Capabilities › Automation and integrations*

> Publish redacted coding sessions for shared viewing and independent Team continuation

<sub>source `docs/plugins/beam.md` · 214 lines · 1811 words · 8 code blocks</sub>

**Read when:** Sharing a Claude Code or Codex session with trusted Gateway operators · Continuing a beamed conversation with a Team agent · Configuring an authenticated session-ingest endpoint without connecting a node · Auditing what Beam stores and exposes

**Covers:** Enable · Authentication · Request · Continue on the Team Gateway · Storage and visibility · Security boundary · Mirroring · Troubleshooting · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw plugins disable`, `openclaw plugins enable`

**Config:** `logging.redactPatterns`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/beam](https://docs.openclaw.ai/plugins/beam)</sub>

---

### `/plugins/cloudflare` — Cloudflare

**Cloudflare** · *Capabilities › Automation and integrations*

> Configure Cloudflare R2 as an encrypted OpenClaw storage location

<sub>source `docs/plugins/cloudflare.md` · 134 lines · 670 words · 2 code blocks</sub>

**Read when:** You want to store OpenClaw artifacts in Cloudflare R2 · You need to configure an R2 bucket, credentials, or jurisdiction · You are diagnosing R2 storage access

**Covers:** Create a bucket and credentials · Configure a location · Initialize and test · Settings · Troubleshooting

**CLI:** `openclaw storage init`, `openclaw storage list`, `openclaw storage test`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/cloudflare](https://docs.openclaw.ai/plugins/cloudflare)</sub>

---

### `/plugins/geolocation` — Geolocation plugin

**Geolocation plugin** · *Capabilities › Automation and integrations*

> Resolve a connecting client's IP address to a coarse city using a locally cached database, with no per-lookup third-party calls

<sub>source `docs/plugins/geolocation.md` · 154 lines · 1260 words · 6 code blocks</sub>

**Read when:** You want to see where the people using your Gateway are connecting from · You are choosing or replacing the IP-geolocation database and need its license terms · A location is missing, wrong, or stuck and you need to know which layer failed

**Covers:** Quickstart · Why some clients never show a location · Configuration · Data license · How the database is managed · Troubleshooting · Related <sub>(2 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/geolocation](https://docs.openclaw.ai/plugins/geolocation)</sub>

---

### `/plugins/logbook` — Logbook plugin

**Logbook plugin** · *Capabilities › Automation and integrations*

> Optional automatic work journal built from periodic screen snapshots

<sub>source `docs/plugins/logbook.md` · 289 lines · 1668 words · 5 code blocks</sub>

**Read when:** You want a Dayflow-style timeline of your day in the Control UI · You are enabling or configuring the bundled Logbook plugin · You want standup summaries or day recall grounded in screen activity

**Covers:** Before you begin · Quickstart · How it works · Model and data flow · Configuration · Dashboard tab · Gateway methods · Privacy notes · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw dashboard`, `openclaw logs`, `openclaw models auth`, `openclaw node host`, `openclaw nodes describe`, `openclaw nodes status`, `openclaw plugins enable`, `openclaw plugins inspect`

**Config:** `gateway.nodes.commands.deny`, `plugins.allow`, `plugins.entries.logbook.config.visionModel`, `tools.media`, `tools.media.models`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/logbook](https://docs.openclaw.ai/plugins/logbook)</sub>

---

### `/plugins/oc-path` — OC Path plugin

**OC Path plugin** · *Capabilities › Automation and integrations*

> Bundled oc-path plugin: ships the openclaw path CLI for the oc:// workspace-file addressing scheme

<sub>source `docs/plugins/oc-path.md` · 162 lines · 855 words · 4 code blocks</sub>

**Read when:** You want to inspect or edit a single leaf inside a workspace file from the terminal · You are scripting against workspace state and need a stable, kind-agnostic addressing scheme · You are deciding whether to enable the optional `oc-path` plugin on a self-hosted Gateway

**Covers:** Why enable it · Where it runs · Enable · Dependencies · What it provides · Relationship to other plugins · Safety · Related

**CLI:** `openclaw path`, `openclaw path find`, `openclaw path resolve`, `openclaw path set`, `openclaw plugins disable`, `openclaw plugins enable`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/oc-path](https://docs.openclaw.ai/plugins/oc-path)</sub>

---

### `/plugins/session-share` — Session Share plugin

**Session Share plugin** · *Capabilities › Automation and integrations*

> Share selected OpenClaw sessions read-only with a paired team Gateway

<sub>source `docs/plugins/session-share.md` · 149 lines · 1329 words · 5 code blocks</sub>

**Read when:** Sharing personal OpenClaw sessions with a team Gateway · Pairing a node that exposes only session listings and transcripts · Configuring attribution for sessions from another Gateway

**Covers:** Before you begin · Choose sessions on the source · Enable the receiver and pair the source · Read shared sessions · Attribute the source node · Security boundary · Troubleshooting · Related

**CLI:** `openclaw connect`, `openclaw devices approve`, `openclaw devices join-code`, `openclaw devices list`, `openclaw node install`, `openclaw node run`, `openclaw nodes list`, `openclaw plugins enable`

**Config:** `session.store`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/session-share](https://docs.openclaw.ai/plugins/session-share)</sub>

---

### `/plugins/workboard` — Workboard plugin

**Workboard plugin** · *Capabilities › Automation and integrations*

> Optional Workboard boards for agent-owned cards and rule-based session views

<sub>source `docs/plugins/workboard.md` · 648 lines · 4991 words · 6 code blocks</sub>

**Read when:** You want a Kanban-style workboard in the Control UI · You are enabling or disabling the bundled Workboard plugin · You want to track planned agent work without an external project manager · You want sessions grouped by session status, observer health, and pull-request state

**Covers:** Enable it · Configuration · Board appearance · Sessions board · Card fields · Starting work from a card · Agent tools · Dispatch · CLI and slash command · Session lifecycle sync · Control UI workflow · Diagnostics · Permissions · Storage · _+2 more_ <sub>(3 sub-sections)</sub>

**CLI:** `openclaw dashboard`, `openclaw doctor`, `openclaw plugins disable`, `openclaw plugins enable`, `openclaw plugins inspect`, `openclaw workboard create`, `openclaw workboard dispatch`, `openclaw workboard list`

**Config:** `plugins.allow`, `plugins.deny`, `tools.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/workboard](https://docs.openclaw.ai/plugins/workboard)</sub>

---

### `/plugins/zalouser` — Zalo personal plugin

**Zalo personal plugin** · *Capabilities › Automation and integrations*

> Zalo Personal plugin: QR login + messaging via native zca-js (plugin install + channel config + tool)

<sub>source `docs/plugins/zalouser.md` · 92 lines · 225 words · 4 code blocks</sub>

**Read when:** You want Zalo Personal (unofficial) support in OpenClaw · You are configuring or developing the zalouser plugin

**Covers:** Naming · Where it runs · Install · Config · CLI · Agent tool · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw channels login`, `openclaw channels logout`, `openclaw channels status`, `openclaw directory groups`, `openclaw directory peers`, `openclaw directory self`, `openclaw message send`, `openclaw plugins install`

**Config:** `channels.zalouser`, `plugins.entries.*`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/zalouser](https://docs.openclaw.ai/plugins/zalouser)</sub>

---

### `/plugins/building-plugins` — Building plugins

**Building plugins** · *Capabilities › Building plugins*

> Create your first OpenClaw plugin in minutes

<sub>source `docs/plugins/building-plugins.md` · 447 lines · 1596 words · 13 code blocks</sub>

**Read when:** You want to create a new OpenClaw plugin · You need a quick-start for plugin development · You are choosing between channel, provider, CLI backend, tool, or hook docs

**Covers:** Requirements · Choose the plugin shape · Quickstart · Add plugin artwork · Registering tools · Import conventions · Pre-submission checklist · Test against beta releases · Next steps · Related

**CLI:** `openclaw demo-plugin ping`, `openclaw plugins inspect`, `openclaw plugins install`

**Config:** `tools.allow`, `tools.effective`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/building-plugins](https://docs.openclaw.ai/plugins/building-plugins)</sub>

---

### `/plugins/feature-plugins` — Feature plugins

**Feature plugins** · *Capabilities › Building plugins*

> Build plugins with typed operations, native pages, and replaceable Control UI views

<sub>source `docs/plugins/feature-plugins.md` · 430 lines · 2990 words · 6 code blocks</sub>

**Read when:** You want a plugin to add a native Control UI page or customize the workspace · You want the same feature operation available to UI and agent tools · You want an agent to build and propose a local plugin artifact

**Covers:** Enable custom plugin UI · Create a feature plugin · Define operations once · Contribute and replace views · Build and reload · Approve an agent-built artifact <sub>(2 sub-sections)</sub>

**CLI:** `openclaw plugins build`, `openclaw plugins init`, `openclaw plugins install`, `openclaw plugins pack`

**Config:** `plugins.controlUi.status`, `session.hasActiveRun`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/feature-plugins](https://docs.openclaw.ai/plugins/feature-plugins)</sub>

---

### `/plugins/tool-plugins` — Tool plugins

**Tool plugins** · *Capabilities › Building plugins*

> Build simple typed agent tools with defineToolPlugin and openclaw plugins init/build/validate

<sub>source `docs/plugins/tool-plugins.md` · 582 lines · 2131 words · 21 code blocks</sub>

**Read when:** You want to build a simple OpenClaw plugin that only adds agent tools · You want to use defineToolPlugin instead of hand-writing plugin manifest metadata · You need to scaffold, generate, validate, test, or publish a tool-only plugin · You need the plugin tool context's memory audience and currency guards

**Covers:** Requirements · Quickstart · Write a tool · Optional and factory tools · Return values · Output contracts · Configuration · Generated metadata · Package metadata · Validate in CI · Install and inspect locally · Publish · Troubleshooting · See also <sub>(7 sub-sections)</sub>

**CLI:** `openclaw plugins build`, `openclaw plugins init`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw plugins reload`, `openclaw plugins validate`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/tool-plugins](https://docs.openclaw.ai/plugins/tool-plugins)</sub>

---

### `/plugins/sdk-channel-plugins` — Building channel plugins

**Building channel plugins** · *Capabilities › Building plugins*

> Step-by-step guide to building a messaging channel plugin for OpenClaw

<sub>source `docs/plugins/sdk-channel-plugins.md` · 952 lines · 4636 words · 10 code blocks</sub>

**Read when:** You are building a new messaging channel plugin · You want to connect OpenClaw to a messaging platform · You need to understand the ChannelPlugin adapter surface

**Covers:** What your plugin owns · Return to the source conversation · Walkthrough · File structure · Delegated context reads · Scheduled channel administration · Advanced topics · Next steps · Where each section moved · Related <sub>(7 sub-sections)</sub>

**Config:** `channels.acme-chat`, `plugins.entries.acme-chat.config`, `security.collectWarnings`, `security.dm`, `security.dmRouting`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins](https://docs.openclaw.ai/plugins/sdk-channel-plugins)</sub>

---

### `/plugins/sdk-channel-plugins/message-adapter` — Channel message adapter

**Channel message adapter** · *Capabilities › Channel plugins*

> The channel message adapter surface: live and finalizer capabilities, progress visibility, commentary delivery, and native TTS voice delivery

<sub>source `docs/plugins/sdk-channel-plugins/message-adapter.md` · 175 lines · 1242 words</sub>

**Read when:** You are declaring `message` adapter capabilities for a channel · You need progress, quiet-progress, or commentary delivery rules · You are wiring native voice-note delivery for a channel

**Covers:** Message adapter <sub>(5 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/message-adapter](https://docs.openclaw.ai/plugins/sdk-channel-plugins/message-adapter)</sub>

---

### `/plugins/sdk-channel-plugins/durable-ingress` — Durable channel ingress

**Durable channel ingress** · *Capabilities › Channel plugins*

> Durable inbound ingress for channel plugins: the ingress resolver, replay dedupe, transport retention classes, at-least-once side effects, and the reload and restart contract

<sub>source `docs/plugins/sdk-channel-plugins/durable-ingress.md` · 219 lines · 1870 words</sub>

**Read when:** You are moving a channel onto the durable ingress queue · You need transport retention, replay dedupe, or at-least-once rules · You are opting a multi-account channel into account-scoped restarts

**Covers:** Inbound ingress (experimental) · Durable ingress and replay dedupe <sub>(4 sub-sections)</sub>

**Config:** `channels.example.accounts.*.allowFrom`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/durable-ingress](https://docs.openclaw.ai/plugins/sdk-channel-plugins/durable-ingress)</sub>

---

### `/plugins/sdk-channel-plugins/status-and-media` — Channel status and media

**Channel status and media** · *Capabilities › Channel plugins*

> Channel runtime status signals plus media and payload shaping: lifecycle status, typing indicators, media source params, and native payload shaping

<sub>source `docs/plugins/sdk-channel-plugins/status-and-media.md` · 149 lines · 1065 words</sub>

**Read when:** You publish channel account lifecycle status or typing indicators · You need account media limits, hosted media stores, or inbound media facts · You are shaping native cards, blocks, or grouped media payloads

**Covers:** Runtime lifecycle status · Typing indicators · Media source params · Native payload shaping · Progress card handoff · Post-delivery pins

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/status-and-media](https://docs.openclaw.ai/plugins/sdk-channel-plugins/status-and-media)</sub>

---

### `/plugins/sdk-channel-plugins/sessions-and-bindings` — Channel sessions and bindings

**Channel sessions and bindings** · *Capabilities › Channel plugins*

> Session conversation grammar, conversation route ownership, and account-scoped conversation binding support for channel plugins

<sub>source `docs/plugins/sdk-channel-plugins/sessions-and-bindings.md` · 134 lines · 872 words · 1 code blocks</sub>

**Read when:** Your platform stores extra scope inside conversation ids · You need to own conversation route resolution for your channel · You are gating current-conversation bindings per account

**Covers:** Session conversation grammar · Conversation route ownership · Account-scoped conversation binding support

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/sessions-and-bindings](https://docs.openclaw.ai/plugins/sdk-channel-plugins/sessions-and-bindings)</sub>

---

### `/plugins/sdk-channel-plugins/approvals` — Channel approvals

**Channel approvals** · *Capabilities › Channel plugins*

> Approval capabilities for channel plugins: approval auth, payload lifecycle and setup guidance, native approval delivery, and the narrower approval runtime subpaths

<sub>source `docs/plugins/sdk-channel-plugins/approvals.md` · 254 lines · 1747 words</sub>

**Read when:** Your channel exposes native exec or plugin approvals · You need approval auth, setup guidance, or reaction-based decisions · You want the narrow approval runtime subpaths instead of the barrel

**Covers:** Approvals and channel capabilities <sub>(4 sub-sections)</sub>

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/approvals](https://docs.openclaw.ai/plugins/sdk-channel-plugins/approvals)</sub>

---

### `/plugins/sdk-channel-plugins/setup-and-config` — Channel setup and config

**Channel setup and config** · *Capabilities › Channel plugins*

> Setup subpaths, account schemas and inheritance, and the other narrow channel subpaths for config, inbound, targets, and threading

<sub>source `docs/plugins/sdk-channel-plugins/setup-and-config.md` · 193 lines · 1401 words</sub>

**Read when:** You are building a channel setup wizard or setup entry · You need account schema defaults, policy refinement, or config inheritance · You want the narrow channel subpaths for a hot entrypoint

**Covers:** Setup subpaths · Account schemas and inheritance · Other narrow channel subpaths <sub>(1 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/setup-and-config](https://docs.openclaw.ai/plugins/sdk-channel-plugins/setup-and-config)</sub>

---

### `/plugins/sdk-channel-plugins/mention-policy` — Channel mention policy

**Channel mention policy** · *Capabilities › Channel plugins*

> Split inbound mention handling into plugin-owned evidence gathering and shared policy evaluation

<sub>source `docs/plugins/sdk-channel-plugins/mention-policy.md` · 172 lines · 652 words · 2 code blocks</sub>

**Read when:** Your channel decides when a group message should wake the agent · You need reply-to-bot or quoted-bot implicit mention handling

**Covers:** Inbound mention policy · Bot-owned threads

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-plugins/mention-policy](https://docs.openclaw.ai/plugins/sdk-channel-plugins/mention-policy)</sub>

---

### `/plugins/sdk-provider-plugins` — Building provider plugins

**Building provider plugins** · *Capabilities › Building plugins*

> Step-by-step guide to building a model provider plugin for OpenClaw

<sub>source `docs/plugins/sdk-provider-plugins.md` · 568 lines · 2001 words · 8 code blocks</sub>

**Read when:** You are building a new model provider plugin · You want to add an OpenAI-compatible proxy or custom LLM to OpenClaw · You need to understand provider auth, catalogs, and runtime hooks

**Covers:** Import an existing credential during sign-in · Loopback OAuth callbacks · Handle model access after sign-in · Walkthrough · Publish to ClawHub · File structure · Catalog order reference · Next steps · Where each section moved · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw onboard`

**Config:** `models.providers`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-provider-plugins](https://docs.openclaw.ai/plugins/sdk-provider-plugins)</sub>

---

### `/plugins/sdk-provider-plugins/model-catalogs` — Provider model catalogs

**Provider model catalogs** · *Capabilities › Provider plugins*

> Live model discovery, catalog helpers, and provider-owned pricing normalization

<sub>source `docs/plugins/sdk-provider-plugins/model-catalogs.md` · 478 lines · 2615 words · 5 code blocks</sub>

**Read when:** You are opting a provider into shared live model discovery · You need the liveModelDiscovery contract, cache, and failure rules · You are normalizing a provider-owned pricing feed · You want the narrower single-provider plugin entry helper

**Covers:** Live model discovery · Selecting catalog augmentation hooks

**Config:** `models.providers.*`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-provider-plugins/model-catalogs](https://docs.openclaw.ai/plugins/sdk-provider-plugins/model-catalogs)</sub>

---

### `/plugins/sdk-provider-plugins/hook-families` — Provider hook families

**Provider hook families** · *Capabilities › Provider plugins*

> Shared replay, stream, and tool-compat family builders for provider plugins

<sub>source `docs/plugins/sdk-provider-plugins/hook-families.md` · 85 lines · 901 words · 1 code blocks</sub>

**Read when:** You want one builder to wire a whole provider family · You need the current replay and stream family tables · You are going off the common pattern and need the underlying SDK seams

**Covers:** Family builders

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-provider-plugins/hook-families](https://docs.openclaw.ai/plugins/sdk-provider-plugins/hook-families)</sub>

---

### `/plugins/sdk-provider-plugins/runtime-hooks` — Provider hook wiring

**Provider hook wiring** · *Capabilities › Provider plugins*

> Per-hook provider wiring for auth exchange, headers, transport identity, usage, and the hook order table

<sub>source `docs/plugins/sdk-provider-plugins/runtime-hooks.md` · 333 lines · 2225 words · 4 code blocks</sub>

**Read when:** You need a token exchange, custom headers, or native transport identity · You are exposing provider usage and billing data · You want the provider hook order table and runtime fallback notes

**Covers:** Model route policy · Credential lookup cancellation · Hook examples

**Config:** `agents.defaults.compaction.thinkingLevel`, `tools.toolSearch`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-provider-plugins/runtime-hooks](https://docs.openclaw.ai/plugins/sdk-provider-plugins/runtime-hooks)</sub>

---

### `/plugins/sdk-provider-plugins/voice-and-audio` — Provider voice capabilities

**Provider voice capabilities** · *Capabilities › Provider plugins*

> Speech, realtime transcription, realtime voice, and media understanding provider capabilities

<sub>source `docs/plugins/sdk-provider-plugins/voice-and-audio.md` · 473 lines · 2642 words · 5 code blocks</sub>

**Read when:** You are adding text-to-speech to a provider plugin · You are implementing realtime transcription or realtime voice · You need the realtime voice mark, tool-result, and delegation contract · You are registering a media understanding provider

**Covers:** Voice and audio capabilities

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-provider-plugins/voice-and-audio](https://docs.openclaw.ai/plugins/sdk-provider-plugins/voice-and-audio)</sub>

---

### `/plugins/sdk-provider-plugins/media-and-search` — Provider media and search

**Provider media and search** · *Capabilities › Provider plugins*

> Embedding, image and video generation, web fetch, and web search provider capabilities

<sub>source `docs/plugins/sdk-provider-plugins/media-and-search.md` · 254 lines · 789 words · 3 code blocks</sub>

**Read when:** You are registering an embedding provider for memory or search · You are adding image, video, or music generation to a provider plugin · You are wiring a web fetch or web search provider

**Covers:** Media and search capabilities

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-provider-plugins/media-and-search](https://docs.openclaw.ai/plugins/sdk-provider-plugins/media-and-search)</sub>

---

### `/plugins/cli-backend-plugins` — Building CLI backend plugins

**Building CLI backend plugins** · *Capabilities › Building plugins*

> Build a plugin that registers a local AI CLI backend

<sub>source `docs/plugins/cli-backend-plugins.md` · 560 lines · 3126 words · 9 code blocks</sub>

**Read when:** You are building a local AI CLI backend plugin · You want to register a backend for model refs such as acme-cli/model · You need to map a third-party CLI into OpenClaw's text fallback runner

**Covers:** What the plugin owns · Minimal backend plugin · Config shape · Advanced backend hooks · MCP tool bridge · Selecting the backend · Verification · Checklist · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw plugins inspect`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/cli-backend-plugins](https://docs.openclaw.ai/plugins/cli-backend-plugins)</sub>

---

### `/plugins/hooks` — Plugin hooks

**Plugin hooks** · *Capabilities › Building plugins*

> Plugin hooks: intercept agent, tool, message, session, and Gateway lifecycle events

<sub>source `docs/plugins/hooks.md` · 264 lines · 1374 words · 6 code blocks</sub>

**Read when:** You are building a plugin that needs before_tool_call, before_agent_reply, message hooks, or lifecycle hooks · You need to block, rewrite, or require approval for tool calls from a plugin · You are deciding between internal hooks and plugin hooks · You are projecting OpenClaw cron wakes into an external host scheduler

**Covers:** Quick start · Troubleshooting · Upcoming deprecations · Where each section moved · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw plugins enable`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw plugins reload`

**Config:** `plugins.allow`, `plugins.deny`, `plugins.enabled`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/hooks](https://docs.openclaw.ai/plugins/hooks)</sub>

---

### `/plugins/hooks/reference` — Hook reference

**Hook reference** · *Capabilities › Plugin hooks*

> How plugin hooks register and execute, plus the complete typed hook catalog

<sub>source `docs/plugins/hooks/reference.md` · 319 lines · 2506 words · 3 code blocks</sub>

**Read when:** You are wiring a typed handler and need the ordering, timeout, and failure rules · You want to know which typed hook exists for a surface · You are registering a Skill Workshop evaluator or a pairing observer

**Covers:** Registration and execution · Hook catalog <sub>(2 sub-sections)</sub>

**Config:** `hooks.timeoutMs`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/hooks/reference](https://docs.openclaw.ai/plugins/hooks/reference)</sub>

---

### `/plugins/hooks/tool-policy` — Tool call policy hooks

**Tool call policy hooks** · *Capabilities › Plugin hooks*

> Gate, rewrite, and approve tool calls, and rewrite tool results before persistence

<sub>source `docs/plugins/hooks/tool-policy.md` · 290 lines · 1072 words · 4 code blocks</sub>

**Read when:** You need to block a tool call or require approval from a plugin · You are writing sender-aware tool policy in a standalone plugin file · You are contributing environment variables to the exec tool · You are rewriting or blocking a transcript write

**Covers:** Tool call policy <sub>(3 sub-sections)</sub>

**CLI:** `openclaw plugins reload`

**Config:** `plugins.load.paths`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/hooks/tool-policy](https://docs.openclaw.ai/plugins/hooks/tool-policy)</sub>

---

### `/plugins/hooks/prompt-and-session` — Prompt and session hooks

**Prompt and session hooks** · *Capabilities › Plugin hooks*

> Override the model, shape the prompt, and persist plugin-owned session state

<sub>source `docs/plugins/hooks/prompt-and-session.md` · 341 lines · 2351 words · 4 code blocks</sub>

**Read when:** You are overriding the provider or model for an agent turn · You are adding prompt context or narrowing the tool surface for a turn · You need authorized post-policy prompt enrichment · You are persisting session extensions or queuing next-turn injections

**Covers:** Debug runtime hooks · Prompt and model hooks <sub>(3 sub-sections)</sub>

**CLI:** `openclaw sessions`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/hooks/prompt-and-session](https://docs.openclaw.ai/plugins/hooks/prompt-and-session)</sub>

---

### `/plugins/hooks/messages` — Message and delivery hooks

**Message and delivery hooks** · *Capabilities › Plugin hooks*

> Claim inbound messages and rewrite or cancel outbound deliveries

<sub>source `docs/plugins/hooks/messages.md` · 121 lines · 848 words</sub>

**Read when:** You are claiming an inbound message before the normal model dispatch · You are taking over reply generation with reply_dispatch · You need to rewrite or cancel an outbound message or reply payload

**Covers:** Message hooks

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/hooks/messages](https://docs.openclaw.ai/plugins/hooks/messages)</sub>

---

### `/plugins/hooks/lifecycle` — Gateway and install lifecycle hooks

**Gateway and install lifecycle hooks** · *Capabilities › Plugin hooks*

> Plugin install checks, Gateway start and stop, and Gateway-owned cron events

<sub>source `docs/plugins/hooks/lifecycle.md` · 235 lines · 846 words · 1 code blocks</sub>

**Read when:** You are inspecting staged install material from a plugin runtime · You are starting or stopping plugin-owned services with the Gateway · You are projecting OpenClaw cron wakes into an external host scheduler

**Covers:** Install hooks · Gateway lifecycle <sub>(1 sub-sections)</sub>

**Config:** `security.installPolicy`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/hooks/lifecycle](https://docs.openclaw.ai/plugins/hooks/lifecycle)</sub>

---

### `/plugins/plugin-permission-requests` — Plugin permission requests

**Plugin permission requests** · *Capabilities › Building plugins*

> Ask users to approve plugin tool calls and plugin-owned permission prompts

<sub>source `docs/plugins/plugin-permission-requests.md` · 312 lines · 1525 words · 7 code blocks</sub>

**Read when:** You need a plugin hook or tool to ask before a side effect runs · You need to configure where plugin approval prompts are delivered · You are deciding between optional tools, exec approvals, and plugin approvals

**Covers:** Choose the right gate · Request approval before a tool call · Declare approval scope · Decision behavior · Route approval prompts · Codex native permissions · Troubleshooting · Related

**Config:** `tools.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/plugin-permission-requests](https://docs.openclaw.ai/plugins/plugin-permission-requests)</sub>

---

### `/plugins/adding-capabilities` — Adding capabilities (contributor guide)

**Adding capabilities (contributor guide)** · *Capabilities › Building plugins*

> Contributor guide for adding a new shared capability to the OpenClaw plugin system

<sub>source `docs/plugins/adding-capabilities.md` · 127 lines · 716 words</sub>

**Read when:** Adding a new core capability and plugin registration surface · Deciding whether code belongs in core, a vendor plugin, or a feature plugin · Wiring a new runtime helper for channels or tools

**Covers:** When to create a capability · The standard sequence · What goes where · Provider and harness seams · File checklist · Worked example: image generation · Embedding providers · Review checklist · Related

**Config:** `agents.defaults.imageModel`, `agents.defaults.mediaModels.image`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/adding-capabilities](https://docs.openclaw.ai/plugins/adding-capabilities)</sub>

---

### `/tools/skills` — Skills

**Skills** · *Capabilities › Skills*

> Skills teach your agent how to use tools. Learn how they load, how precedence works, and how to configure gating, allowlists, and environment injection.

<sub>source `docs/tools/skills.md` · 971 lines · 5463 words · 9 code blocks</sub>

**Read when:** Adding or modifying skills · Changing skill gating, allowlists, or load rules · Understanding skill precedence and snapshot behavior

**Covers:** Loading order · Node-hosted skills · Per-agent vs shared skills · Personal skills on a shared Gateway · Agent allowlists · Plugins and skills · Reference a skill in a prompt · Skill Workshop · Installing from ClawHub · Security · SKILL.md format · Gating · Config overrides · Environment injection · _+4 more_ <sub>(4 sub-sections)</sub>

**CLI:** `openclaw migrate codex`, `openclaw migrate plan`, `openclaw skills`, `openclaw skills check`, `openclaw skills install`, `openclaw skills update`, `openclaw skills verify`, `openclaw skills workshop`

**Config:** `agents.defaults.sandbox.docker.setupCommand`, `agents.defaults.skills`, `agents.entries.*.skills`, `channels.discord`, `security.installPolicy`, `skills.*`, `skills.entries`, `skills.entries.*.apiKey`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skills](https://docs.openclaw.ai/tools/skills)</sub>

---

### `/tools/custodian-skills` — Custodian skills

**Custodian skills** · *Capabilities › Skills*

> Release-versioned operational skills that only the configured Custodian agent can discover and use.

<sub>source `docs/tools/custodian-skills.md` · 68 lines · 626 words · 1 code blocks</sub>

**Read when:** Configuring or extending the Custodian agent · Reviewing agent-only skill loading · Planning operational skill coverage

**Covers:** Workflow contract · First wave · Roadmap catalog · Add an operator skill · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw config patch`, `openclaw config set`, `openclaw doctor`

**Config:** `agents.defaults.systemAgent.agentId`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/custodian-skills](https://docs.openclaw.ai/tools/custodian-skills)</sub>

---

### `/tools/skill-workshop` — Skill Workshop

**Skill Workshop** · *Capabilities › Skills*

> Index of the Skill Workshop documentation, one page per reader job

<sub>source `docs/tools/skill-workshop.md` · 78 lines · 514 words</sub>

**Read when:** You want the agent to create or update a skill from chat · You need to review, apply, reject, or quarantine a generated skill draft · You are configuring Skill Workshop approval, autonomy, storage, or limits · You are looking for the Skill Workshop page that matches your task

**Covers:** Where each section moved · Related

**CLI:** `openclaw skills`

**Config:** `skills.workshop`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop](https://docs.openclaw.ai/tools/skill-workshop)</sub>

---

### `/tools/skill-workshop/personal-library` — Personal library authoring

**Personal library authoring** · *Capabilities › Skill Workshop*

> Create and update profile-owned personal skills on a shared Gateway

<sub>source `docs/tools/skill-workshop/personal-library.md` · 39 lines · 316 words</sub>

**Read when:** You are creating or updating a personal-library skill on a shared Gateway · You need the personal create, update, read, and file-preservation rules · You want to know why a personal publication was refused

**Covers:** Personal library authoring

**Config:** `skills.library.save`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/personal-library](https://docs.openclaw.ai/tools/skill-workshop/personal-library)</sub>

---

### `/tools/skill-workshop/how-it-works` — How Skill Workshop works

**How Skill Workshop works** · *Capabilities › Skill Workshop*

> Workshop proposal rules, Control UI review, and the proposal state diagram

<sub>source `docs/tools/skill-workshop/how-it-works.md` · 82 lines · 526 words · 1 code blocks</sub>

**Read when:** You want the proposal rules before applying a generated skill · You are reviewing installed skills or suggestions in the Control UI · You need the proposal state transitions

**Covers:** How it works · Review in the Control UI · Lifecycle

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/how-it-works](https://docs.openclaw.ai/tools/skill-workshop/how-it-works)</sub>

---

### `/tools/skill-workshop/collection-review` — Collection review

**Collection review** · *Capabilities › Skill Workshop*

> Weekly Workshop collection review, its change semantics, and backup recovery

<sub>source `docs/tools/skill-workshop/collection-review.md` · 107 lines · 902 words</sub>

**Read when:** You are enabling or debugging the weekly collection review · You need to know what a review can change and what it cannot roll back · You are recovering a Workshop skill from a retained collection backup

**Covers:** Collection review <sub>(2 sub-sections)</sub>

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/collection-review](https://docs.openclaw.ai/tools/skill-workshop/collection-review)</sub>

---

### `/tools/skill-workshop/authoring` — Chat and CLI authoring

**Chat and CLI authoring** · *Capabilities › Skill Workshop*

> Create, revise, and close out Workshop proposals from chat or the CLI

<sub>source `docs/tools/skill-workshop/authoring.md` · 113 lines · 484 words · 5 code blocks</sub>

**Read when:** You want the agent to create or update a skill from chat · You are using /learn to capture recent work · You need the openclaw skills workshop commands and flags

**Covers:** Chat · CLI <sub>(1 sub-sections)</sub>

**CLI:** `openclaw skills workshop`

**Config:** `skills.workshop.approvalPolicy`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/authoring](https://docs.openclaw.ai/tools/skill-workshop/authoring)</sub>

---

### `/tools/skill-workshop/proposals` — Proposal content, support files, and the agent tool

**Proposal content, support files, and the agent tool** · *Capabilities › Skill Workshop*

> Proposal file format, support-file rules, plugin evaluation, and skillworkshop parameters

<sub>source `docs/tools/skill-workshop/proposals.md` · 152 lines · 1038 words · 2 code blocks</sub>

**Read when:** You are writing PROPOSAL.md or its support files · You are building a plugin evaluator or lifecycle hook · You need the skill_workshop action and parameter reference

**Covers:** Plugin evaluation and lifecycle hooks · Proposal content · Support files · Agent tool

**CLI:** `openclaw skills workshop`

**Config:** `skills.proposals.evaluate`, `skills.proposals.events.list`, `tools.allow`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/proposals](https://docs.openclaw.ai/tools/skill-workshop/proposals)</sub>

---

### `/tools/skill-workshop/configuration` — Self-learning and approval settings

**Self-learning and approval settings** · *Capabilities › Skill Workshop*

> Self-learning modes and the skills.workshop approval, autonomy, and size settings

<sub>source `docs/tools/skill-workshop/configuration.md` · 90 lines · 611 words · 1 code blocks</sub>

**Read when:** You are configuring Skill Workshop approval, autonomy, or limits · You want to understand where self-learning proposals are reviewed · You are scanning past sessions from the Control UI

**Covers:** Self-learning · Approval and autonomy <sub>(1 sub-sections)</sub>

**Config:** `skills.workshop.autonomous.mode`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/configuration](https://docs.openclaw.ai/tools/skill-workshop/configuration)</sub>

---

### `/tools/skill-workshop/reference` — Gateway methods, storage, and limits

**Gateway methods, storage, and limits** · *Capabilities › Skill Workshop*

> Skill Workshop Gateway methods, on-disk storage layout, migration, and hard limits

<sub>source `docs/tools/skill-workshop/reference.md` · 206 lines · 1453 words · 1 code blocks</sub>

**Read when:** You are calling the skills.proposals.* or skills.workshop.* Gateway methods · You need the Workshop on-disk layout or its migration behavior · You are hitting a Workshop size or count limit

**Covers:** Gateway methods · Storage · Limits <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `skills.curator.pin`, `skills.curator.restore`, `skills.curator.status`, `skills.curator.unpin`, `skills.proposals.apply`, `skills.proposals.create`, `skills.proposals.historyScan`, `skills.proposals.historyStatus`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/reference](https://docs.openclaw.ai/tools/skill-workshop/reference)</sub>

---

### `/tools/skill-workshop/troubleshooting` — Skill Workshop troubleshooting

**Skill Workshop troubleshooting** · *Capabilities › Skill Workshop*

> Common Skill Workshop errors and the tool-policy doctor check

<sub>source `docs/tools/skill-workshop/troubleshooting.md` · 69 lines · 601 words</sub>

**Read when:** A Workshop proposal fails to create, apply, or appear in the list · The agent cannot call skill_workshop

**Covers:** Troubleshooting <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw plugins inspect`, `openclaw skills workshop`

**Config:** `skills.workshop.maxSkillBytes`, `tools.allow`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skill-workshop/troubleshooting](https://docs.openclaw.ai/tools/skill-workshop/troubleshooting)</sub>

---

### `/tools/self-learning` — Self-learning

**Self-learning** · *Capabilities › Skills*

> Turn corrections and successful work into reusable skills through Skill Workshop

<sub>source `docs/tools/self-learning.md` · 343 lines · 2129 words · 8 code blocks</sub>

**Read when:** You want OpenClaw to learn reusable procedures from completed conversations · You are choosing between off, propose, and auto self-learning modes · You need to understand self-learning safety, cost, privacy, or troubleshooting

**Covers:** Immediate repair · Experience review · Mode policy · Why auto is safe to default · Runtime support · Cost and privacy · Review and revert learning · Configuration reference · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw skills curator`, `openclaw skills workshop`

**Config:** `skills.*`, `skills.workshop.approvalPolicy`, `skills.workshop.autonomous.mode`, `skills.workshop.maxPending`, `skills.workshop.maxSkillBytes`, `tools.allow`, `tools.alsoAllow`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/self-learning](https://docs.openclaw.ai/tools/self-learning)</sub>

---

### `/tools/creating-skills` — Creating skills

**Creating skills** · *Capabilities › Skills*

> Build, test, and publish custom SKILL.md workspace skills or personal skills on a shared Gateway.

<sub>source `docs/tools/creating-skills.md` · 289 lines · 938 words · 15 code blocks</sub>

**Read when:** You are creating a new custom skill · You need a quick starter workflow for SKILL.md-based skills · You want to use Skill Workshop to propose a skill for agent review

**Covers:** Create your first skill · Create a personal skill on a shared Gateway · SKILL.md reference · Adding conditional activation · Propose via Skill Workshop · Publishing to ClawHub · Best practices · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw gateway restart`, `openclaw skills list`, `openclaw skills workshop`

**Config:** `skills.*`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/creating-skills](https://docs.openclaw.ai/tools/creating-skills)</sub>

---

### `/tools/skills-config` — Skills config

**Skills config** · *Capabilities › Skills*

> Full reference for the skills. config schema, agent allowlists, workshop settings, and sandbox env var handling.

<sub>source `docs/tools/skills-config.md` · 482 lines · 1578 words · 7 code blocks</sub>

**Read when:** Configuring skill loading, install, or gating behavior · Setting per-agent skill visibility · Adjusting Skill Workshop limits or approval policy

**Covers:** Loading (skills.load) · Install (skills.install) · Operator Install Policy (security.installPolicy) · Bundled skill allowlist · Per-skill entries (skills.entries) · Agent allowlists (agents) · Workshop (skills.workshop) · Symlinked skill roots · Sandboxed skills and env vars · Loading order reminder · Related

**CLI:** `openclaw doctor`, `openclaw onboard`, `openclaw setup`

**Config:** `agents.defaults.mediaModels.image`, `agents.defaults.skills`, `agents.entries.*.skills`, `sandbox.docker.env`, `security.installPolicy`, `skills.entries`, `skills.install`, `skills.load`

**TermCrab — skills: PARTIAL.** SKILL.md loader + `load_skill` + importer (`src/skills/*`); 5 bundled skills vs 49, no registry, no signing.

<sub>live: [docs.openclaw.ai/tools/skills-config](https://docs.openclaw.ai/tools/skills-config)</sub>

---

### `/tools/slash-commands` — Slash commands

**Slash commands** · *Capabilities › Skills*

> All available slash commands, directives, and inline shortcuts — configuration, routing, and per-surface behavior.

<sub>source `docs/tools/slash-commands.md` · 661 lines · 4244 words · 10 code blocks</sub>

**Read when:** Using or configuring chat commands · Debugging command routing or permissions · Understanding how skill commands are registered

**Covers:** Three command types · Configuration · Command list · /tools: what the agent can use now · /loop: recurring conversation work · /model: model selection · /config: on-disk config writes · /mcp: MCP server config · /debug: runtime-only overrides · /plugins: plugin management · /trace: plugin trace output · /btw: side questions · Surface notes · Provider usage and status · _+1 more_ <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.model`, `agents.defaults.modelPolicy.allow`, `agents.defaults.modelSelectionScope`, `channels.slack.slashCommand`, `channels.slack.slashCommand.sessionPrefix`, `mcp.servers`, `security.installPolicy`, `tools.elevated`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/slash-commands](https://docs.openclaw.ai/tools/slash-commands)</sub>

---

### `/automation` — Automation

**Automation** · *Capabilities › Automation*

> Overview of automation mechanisms: automations, hooks, standing orders, and workflows

<sub>source `docs/automation/index.md` · 130 lines · 798 words · 1 code blocks</sub>

**Read when:** Deciding how to automate work with OpenClaw · Choosing between heartbeat, automations, hooks, and standing orders · Looking for the right automation entry point

**Covers:** Quick decision guide · Core concepts · How they work together · Retired inferred commitments · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw commitments`, `openclaw hooks`

<sub>live: [docs.openclaw.ai/automation](https://docs.openclaw.ai/automation)</sub>

---

### `/gateway/heartbeat` — Heartbeat

**Heartbeat** · *Capabilities › Automation*

> Heartbeat polling messages and notification rules

<sub>source `docs/gateway/heartbeat.md` · 550 lines · 3995 words · 13 code blocks</sub>

**Read when:** Adjusting heartbeat cadence or messaging · Deciding between heartbeat and automations for scheduled work

**Covers:** Quick start (beginner) · Defaults · What the heartbeat prompt is for · Response contract · Config · Delivery behavior · Visibility controls · Monitor scratch (optional) · Manual wake (on-demand) · Cost awareness · Context overflow after heartbeat · Related <sub>(11 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw cron list`, `openclaw cron scratch`, `openclaw doctor`, `openclaw sessions`, `openclaw system event`, `openclaw system heartbeat`

**Config:** `agents.*.heartbeat`, `agents.defaults.heartbeat`, `agents.defaults.heartbeat.agentId`, `agents.defaults.heartbeat.every`, `agents.defaults.heartbeat.prompt`, `agents.defaults.heartbeat.timeoutSeconds`, `agents.defaults.systemAgent.agentId`, `agents.defaults.timeoutSeconds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/heartbeat](https://docs.openclaw.ai/gateway/heartbeat)</sub>

---

### `/automation/cron-jobs` — Automations

**Automations** · *Capabilities › Automation*

> Automations: scheduled jobs, webhooks, and Gmail PubSub triggers for the Gateway scheduler

<sub>source `docs/automation/cron-jobs.md` · 155 lines · 498 words · 3 code blocks</sub>

**Read when:** Scheduling background jobs or wakeups · Wiring external triggers (webhooks, Gmail) into OpenClaw · Deciding between heartbeat and automations for scheduled work

**Covers:** Quick start · Where each section moved · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw automations`, `openclaw automations create`, `openclaw automations get`, `openclaw automations list`, `openclaw automations runs`, `openclaw automations show`, `openclaw cron`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs](https://docs.openclaw.ai/automation/cron-jobs)</sub>

---

### `/automation/cron-jobs/how-it-works` — How automations work

**How automations work** · *Capabilities › Automations*

> Automation runtime model, run lifecycle, and promoting a repeated job into a schedule

<sub>source `docs/automation/cron-jobs/how-it-works.md` · 85 lines · 1477 words</sub>

**Read when:** Deciding whether automations fit a scheduled workload · Debugging run lifecycle, catch-up, or task reconciliation · Turning a repeated request into a stored schedule

**Covers:** How automations work · Promoting a repeated job into an automation

**CLI:** `openclaw agent`

**Config:** `agents.defaults.timeoutSeconds`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/how-it-works](https://docs.openclaw.ai/automation/cron-jobs/how-it-works)</sub>

---

### `/automation/cron-jobs/schedules` — Automation schedules

**Automation schedules** · *Capabilities › Automations*

> Schedule kinds, cron expressions, stream sources, pacing, and condition triggers

<sub>source `docs/automation/cron-jobs/schedules.md` · 146 lines · 2066 words · 5 code blocks</sub>

**Read when:** Choosing between at, every, cron, on-exit, and stream schedules · Writing a cron expression or a timezone-aware schedule · Adding a condition script that gates when a job fires

**Covers:** Schedule types · Event triggers (condition watchers) <sub>(5 sub-sections)</sub>

**CLI:** `openclaw automations add`, `openclaw automations edit`, `openclaw automations list`, `openclaw doctor`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/schedules](https://docs.openclaw.ai/automation/cron-jobs/schedules)</sub>

---

### `/automation/cron-jobs/payloads` — Automation payloads

**Automation payloads** · *Capabilities › Automations*

> Payload kinds, agent-turn flags, command and script payloads, and session execution styles

<sub>source `docs/automation/cron-jobs/payloads.md` · 310 lines · 3916 words · 2 code blocks</sub>

**Read when:** Choosing a system-event, agent-turn, command, or script payload · Setting a per-job model, thinking level, or tool policy · Deciding between main, current, isolated, and custom sessions

**Covers:** Payloads · Authoring recurring jobs · Execution styles <sub>(4 sub-sections)</sub>

**CLI:** `openclaw automations create`, `openclaw cron list`

**Config:** `agents.defaults.fastModeDefault`, `agents.entries.*.fastModeDefault`, `cron.enabled`, `cron.triggers.enabled`, `models.json`, `skills.workshop.autonomous.mode`, `tools.exec`, `tools.exec.mode`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/payloads](https://docs.openclaw.ai/automation/cron-jobs/payloads)</sub>

---

### `/automation/cron-jobs/delivery` — Automation delivery

**Automation delivery** · *Capabilities › Automations*

> Announce, webhook, and none delivery modes, failure alerts, and output language

<sub>source `docs/automation/cron-jobs/delivery.md` · 154 lines · 2677 words · 2 code blocks</sub>

**Read when:** Routing automation output to a channel or a webhook · Tuning failure notifications, thresholds, and cooldowns · Fixing an automation that replies in the wrong language

**Covers:** Delivery and output <sub>(2 sub-sections)</sub>

**CLI:** `openclaw automations edit`, `openclaw automations enable`, `openclaw automations list`, `openclaw doctor`

**Config:** `cron.failureAlert`, `cron.failureDestination`, `gateway.publicOrigin`, `session.message`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/delivery](https://docs.openclaw.ai/automation/cron-jobs/delivery)</sub>

---

### `/automation/cron-jobs/managing-jobs` — Manage automations

**Manage automations** · *Capabilities › Automations*

> CLI examples, job management commands, run history, and cron configuration keys

<sub>source `docs/automation/cron-jobs/managing-jobs.md` · 227 lines · 2005 words · 7 code blocks</sub>

**Read when:** Listing, editing, running, or removing a stored job · Reading run history and completion status · Setting cron configuration keys on the Gateway

**Covers:** CLI examples · Managing jobs · Configuration <sub>(2 sub-sections)</sub>

**CLI:** `openclaw automations add`, `openclaw automations create`, `openclaw automations disable`, `openclaw automations edit`, `openclaw automations enable`, `openclaw automations get`, `openclaw automations list`, `openclaw automations remove`

**Config:** `cron.*`, `cron.add`, `cron.history`, `cron.list`, `cron.run`, `cron.sessionRetention`, `cron.store`, `cron.update`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/managing-jobs](https://docs.openclaw.ai/automation/cron-jobs/managing-jobs)</sub>

---

### `/automation/cron-jobs/webhooks` — Inbound webhooks

**Inbound webhooks** · *Capabilities › Automations*

> Gateway HTTP hooks that let an external service wake an agent or submit a turn

<sub>source `docs/automation/cron-jobs/webhooks.md` · 209 lines · 1464 words · 8 code blocks</sub>

**Read when:** Letting an external service call OpenClaw over HTTP · Enabling, authenticating, and smoke-testing hook endpoints · Debugging a hook request status code

**Covers:** Webhooks <sub>(3 sub-sections)</sub>

**CLI:** `openclaw automations runs`, `openclaw config validate`, `openclaw gateway restart`, `openclaw logs`

**Config:** `hooks.allowedAgentIds`, `hooks.allowedSessionKeyPrefixes`, `hooks.defaultSessionKey`, `hooks.enabled`, `hooks.mappings`, `hooks.path`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/webhooks](https://docs.openclaw.ai/automation/cron-jobs/webhooks)</sub>

---

### `/automation/cron-jobs/gmail` — Gmail PubSub triggers

**Gmail PubSub triggers** · *Capabilities › Automations*

> Wire Gmail inbox events into OpenClaw through Google Pub/Sub and a restricted reader

<sub>source `docs/automation/cron-jobs/gmail.md` · 189 lines · 1226 words · 8 code blocks</sub>

**Read when:** Triggering an agent from new Gmail messages · Building a restricted, sandboxed mail reader agent · Setting up Pub/Sub topics and the Gmail watch

**Covers:** Gmail PubSub integration <sub>(7 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw agents list`, `openclaw config validate`, `openclaw logs`, `openclaw models auth`, `openclaw models status`, `openclaw sandbox explain`, `openclaw security audit`

**Config:** `hooks.gmail`, `hooks.gmail.account`, `hooks.gmail.maxBytes`, `hooks.gmail.pushToken`, `hooks.token`, `tools.agentToAgent`, `tools.agentToAgent.allow`, `tools.alsoAllow`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/gmail](https://docs.openclaw.ai/automation/cron-jobs/gmail)</sub>

---

### `/automation/cron-jobs/troubleshooting` — Automation troubleshooting

**Automation troubleshooting** · *Capabilities › Automations*

> Command ladder and fixes for jobs that do not fire or do not deliver

<sub>source `docs/automation/cron-jobs/troubleshooting.md` · 55 lines · 529 words · 1 code blocks</sub>

**Read when:** An automation did not fire at its scheduled time · A job ran but nothing arrived in chat · Diagnosing timezone or session rollover surprises

**Covers:** Troubleshooting <sub>(1 sub-sections)</sub>

**CLI:** `openclaw automations edit`, `openclaw automations list`, `openclaw automations run`, `openclaw automations runs`, `openclaw automations show`, `openclaw automations status`, `openclaw doctor`, `openclaw logs`

**Config:** `cron.enabled`

**TermCrab — automation: PARTIAL.** Cron parser/store/scheduler (`src/cron/*`) with 5-field expressions; no event triggers, no webhooks, no pacing.

<sub>live: [docs.openclaw.ai/automation/cron-jobs/troubleshooting](https://docs.openclaw.ai/automation/cron-jobs/troubleshooting)</sub>

---

### `/automation/imap` — IMAP email trigger

**IMAP email trigger** · *Capabilities › Automation*

> Watch an IMAP mailbox and route authenticated incoming email to an isolated restricted reader agent

<sub>source `docs/automation/imap.md` · 170 lines · 1060 words · 4 code blocks</sub>

**Read when:** Triggering OpenClaw from Fastmail, iCloud, or another IMAP mailbox · Configuring sender authentication and isolated email reader sessions · Troubleshooting IMAP IDLE, mailbox credentials, or rejected senders

**Covers:** Configure a restricted reader · Sender authentication · Verify the security boundary · Watcher runtime behavior · Troubleshooting · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw agents bindings`, `openclaw agents list`, `openclaw channels dead-letters`, `openclaw config validate`, `openclaw logs`, `openclaw models status`, `openclaw sandbox explain`

**Config:** `hooks.enabled`

<sub>live: [docs.openclaw.ai/automation/imap](https://docs.openclaw.ai/automation/imap)</sub>

---

### `/automation/standing-orders` — Standing orders

**Standing orders** · *Capabilities › Automation*

> Define permanent operating authority for autonomous agent programs

<sub>source `docs/automation/standing-orders.md` · 235 lines · 685 words · 8 code blocks</sub>

**Read when:** Setting up autonomous agent workflows that run without per-task prompting · Defining what the agent can do independently vs. what needs human approval · Structuring multi-program agents with clear boundaries and escalation rules

**Covers:** Why standing orders · How they work · Anatomy of a standing order · Standing orders plus automations · Examples · Execute-verify-report pattern · Multi-program architecture · Best practices · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw agent exec`, `openclaw automations`, `openclaw automations add`, `openclaw cron`

**TermCrab — automation: ABSENT.** Heartbeat + cron exist (`src/agent/heartbeat.ts`), but no standing orders, no task boards.

<sub>live: [docs.openclaw.ai/automation/standing-orders](https://docs.openclaw.ai/automation/standing-orders)</sub>

---

### `/automation/hooks` — Hooks

**Hooks** · *Capabilities › Automation*

> Internal hooks: install, write, and verify automation for commands and lifecycle events

<sub>source `docs/automation/hooks.md` · 205 lines · 1262 words · 3 code blocks</sub>

**Read when:** You want event-driven automation for /new, /reset, /stop, or session and Gateway events · You want to write, install, enable, or debug an internal hook · You need to understand hook discovery, event data, or reply delivery

**Covers:** Choose the right surface · Quick start · Plugin hooks · Best practices · CLI reference · Detailed topics · Where each section moved · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw gateway restart`, `openclaw hooks`, `openclaw hooks check`, `openclaw hooks disable`, `openclaw hooks enable`, `openclaw hooks info`, `openclaw hooks list`

**Config:** `hooks.enabled`, `hooks.internal`

**TermCrab — hooks: ABSENT.** No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).

<sub>live: [docs.openclaw.ai/automation/hooks](https://docs.openclaw.ai/automation/hooks)</sub>

---

### `/automation/hooks/writing-hooks` — Writing hooks

**Writing hooks** · *Capabilities › Hooks*

> Hook directory layout, the handler contract, reply delivery, and the HOOK.md metadata fields

<sub>source `docs/automation/hooks/writing-hooks.md` · 165 lines · 918 words · 4 code blocks</sub>

**Read when:** You are writing a new internal hook and need the file layout · You need the handler signature, event fields, or reply-delivery boundary · You need the `HOOK.md` frontmatter and `metadata.openclaw` contract

**Covers:** Writing hooks <sub>(4 sub-sections)</sub>

**CLI:** `openclaw hooks disable`, `openclaw hooks enable`, `openclaw hooks info`

**TermCrab — hooks: ABSENT.** No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).

<sub>live: [docs.openclaw.ai/automation/hooks/writing-hooks](https://docs.openclaw.ai/automation/hooks/writing-hooks)</sub>

---

### `/automation/hooks/configuration` — Hook configuration and discovery

**Hook configuration and discovery** · *Capabilities › Hooks*

> Selecting and enabling internal hooks, and how the Gateway discovers them across sources

<sub>source `docs/automation/hooks/configuration.md` · 139 lines · 747 words · 4 code blocks</sub>

**Read when:** You are enabling internal hooks or narrowing which ones load · You need the master switch and selection rules for directory hooks · You need discovery precedence across bundled, plugin, managed, extra, and workspace sources

**Covers:** Configuration · Hook discovery <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw plugins install`

**Config:** `hooks.internal.handlers`, `hooks.internal.load.extraDirs`

**TermCrab — hooks: ABSENT.** No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).

<sub>live: [docs.openclaw.ai/automation/hooks/configuration](https://docs.openclaw.ai/automation/hooks/configuration)</sub>

---

### `/automation/hooks/bundled-hooks` — Bundled hooks

**Bundled hooks** · *Capabilities › Hooks*

> The hooks shipped with OpenClaw and the behavior and options of each

<sub>source `docs/automation/hooks/bundled-hooks.md` · 156 lines · 992 words · 1 code blocks</sub>

**Read when:** You want to enable a hook without writing one · You need `boot-md`, `bootstrap-extra-files`, `command-logger`, `compaction-notifier`, or `session-memory` behavior · You are configuring a bundled hook's per-entry options

**Covers:** Bundled hooks <sub>(5 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw hooks enable`

**Config:** `agents.defaults.userTimezone`

**TermCrab — hooks: ABSENT.** No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).

<sub>live: [docs.openclaw.ai/automation/hooks/bundled-hooks](https://docs.openclaw.ai/automation/hooks/bundled-hooks)</sub>

---

### `/automation/hooks/event-types` — Hook event types and context

**Hook event types and context** · *Capabilities › Hooks*

> Every internal event key, its trigger and wait behavior, and the context each producer supplies

<sub>source `docs/automation/hooks/event-types.md` · 146 lines · 1187 words</sub>

**Read when:** You are choosing which event key a handler should subscribe to · You need the trigger and wait behavior of a specific event · You need the context fields a producer supplies to your handler

**Covers:** Event types <sub>(1 sub-sections)</sub>

**TermCrab — hooks: ABSENT.** No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).

<sub>live: [docs.openclaw.ai/automation/hooks/event-types](https://docs.openclaw.ai/automation/hooks/event-types)</sub>

---

### `/automation/hooks/troubleshooting` — Hook troubleshooting

**Hook troubleshooting** · *Capabilities › Hooks*

> Diagnose a hook that is not discovered, not eligible, or not executing

<sub>source `docs/automation/hooks/troubleshooting.md` · 56 lines · 308 words · 2 code blocks</sub>

**Read when:** `openclaw hooks list` does not show your hook · A hook reports as not eligible and you need the blocking reason · A hook is loaded but its side effect never appears

**Covers:** Troubleshooting <sub>(3 sub-sections)</sub>

**CLI:** `openclaw hooks info`, `openclaw hooks list`, `openclaw logs`

**Config:** `hooks.internal.enabled`

**TermCrab — hooks: ABSENT.** No hook system of any kind (no `api.on`, no lifecycle events beyond the internal event bus).

<sub>live: [docs.openclaw.ai/automation/hooks/troubleshooting](https://docs.openclaw.ai/automation/hooks/troubleshooting)</sub>

---

### `/tools/apply-patch` — applypatch tool

**applypatch tool** · *Capabilities › Running code and approvals*

> Apply multi-file patches with the applypatch tool

<sub>source `docs/tools/apply-patch.md` · 83 lines · 494 words · 2 code blocks</sub>

**Read when:** You need structured file edits across multiple files · You want to document or debug patch-based edits

**Covers:** Parameters · Notes · Example · Related

**Config:** `tools.exec.applyPatch.*`, `tools.exec.applyPatch.allowModels`, `tools.exec.applyPatch.workspaceOnly`, `tools.exec.mode`, `tools.fs.workspaceOnly`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/apply-patch](https://docs.openclaw.ai/tools/apply-patch)</sub>

---

### `/tools/code-execution` — Code execution

**Code execution** · *Capabilities › Running code and approvals*

> codeexecution: run sandboxed remote Python analysis with xAI

<sub>source `docs/tools/code-execution.md` · 176 lines · 467 words · 9 code blocks</sub>

**Read when:** You want to enable or configure code_execution · You want remote analysis without local shell access · You want to combine x_search or web_search with remote Python analysis

**Covers:** Setup · How to use it · Errors · Related

**CLI:** `openclaw models auth`, `openclaw onboard`

**Config:** `plugins.entries.xai.config.codeExecution.enabled`, `plugins.entries.xai.config.webSearch.apiKey`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/code-execution](https://docs.openclaw.ai/tools/code-execution)</sub>

---

### `/tools/diffs` — Diffs

**Diffs** · *Capabilities › Running code and approvals*

> Read-only diff viewer and file renderer for agents (optional plugin tool)

<sub>source `docs/tools/diffs.md` · 418 lines · 1561 words · 7 code blocks</sub>

**Read when:** You want agents to show code or markdown edits as diffs · You want a browser-ready viewer URL or a rendered diff file · You need controlled, temporary diff artifacts with secure defaults

**Covers:** Quick start · Disable built-in system guidance · Tool input reference · Syntax highlighting · Output details contract · Plugin defaults · Security config · Artifact lifecycle and storage · Viewer URL and network behavior · Security model · Browser requirements for file mode · Troubleshooting · Operational guidance · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw plugins install`

**Config:** `gateway.publicOrigin`, `gateway.trustedProxies`, `plugins.entries.diffs.hooks.allowPromptInjection`, `security.allowRemoteViewer`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/diffs](https://docs.openclaw.ai/tools/diffs)</sub>

---

### `/tools/elevated` — Elevated mode

**Elevated mode** · *Capabilities › Running code and approvals*

> Elevated exec mode: run commands outside the sandbox from a sandboxed agent

<sub>source `docs/tools/elevated.md` · 129 lines · 604 words · 3 code blocks</sub>

**Read when:** Adjusting elevated mode defaults, allowlists, or slash command behavior · Understanding how sandboxed agents can access the host

**Covers:** Directives · How it works · Resolution order · Availability and allowlists · What elevated does not control · Related

**Config:** `agents.defaults.elevatedDefault`, `agents.entries.*.tools.elevated.allowFrom`, `agents.entries.*.tools.elevated.enabled`, `tools.bash.enabled`, `tools.elevated`, `tools.elevated.allowFrom`, `tools.elevated.enabled`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/elevated](https://docs.openclaw.ai/tools/elevated)</sub>

---

### `/tools/exec` — Exec tool

**Exec tool** · *Capabilities › Running code and approvals*

> Exec tool usage, stdin modes, and TTY support

<sub>source `docs/tools/exec.md` · 340 lines · 4721 words · 11 code blocks</sub>

**Read when:** Using or modifying the exec tool · Debugging stdin or TTY behavior

**Covers:** Parameters · Config · Session overrides (/exec) · Exec approvals (companion app / node host) · Allowlist + safe bins · Examples · applypatch · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw channels login`, `openclaw config get`, `openclaw config set`, `openclaw doctor`, `openclaw security audit`

**Config:** `agents.defaults.timeoutSeconds`, `nodes.run`, `tools.exec.applyPatch`, `tools.exec.applyPatch.allowModels`, `tools.exec.applyPatch.enabled`, `tools.exec.applyPatch.workspaceOnly`, `tools.exec.approvalRunningNoticeMs`, `tools.exec.commandHighlighting`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/exec](https://docs.openclaw.ai/tools/exec)</sub>

---

### `/tools/exec-approvals` — Exec approvals

**Exec approvals** · *Capabilities › Running code and approvals*

> Host exec approvals: policy knobs, allowlists, and the YOLO/strict workflow

<sub>source `docs/tools/exec-approvals.md` · 778 lines · 4788 words · 8 code blocks</sub>

**Read when:** Configuring exec approvals or allowlists · Inspecting or revoking durable MCP tool grants · Implementing exec approval UX in the macOS app · Reviewing host-execution approval prompts from a sandboxed agent and their implications

**Covers:** Where it applies · Inspecting the effective policy · Settings and storage · Policy knobs · YOLO mode (no-approval) · Allowlist (per agent) · MCP tool grants · Standing grants for automations · Auto-allow skill CLIs · Safe bins and approval forwarding · Control UI editing · Approval flow · Approval scope summaries · System events and denials · _+2 more_ <sub>(16 sub-sections)</sub>

**CLI:** `openclaw approvals`, `openclaw approvals get`, `openclaw approvals grants`, `openclaw approvals resolve`, `openclaw approvals set`, `openclaw config set`, `openclaw doctor`, `openclaw exec-policy`

**Config:** `agents.default`, `agents.entries.*.tools.exec.commandHighlighting`, `agents.main`, `mcp.servers`, `skills.bins`, `tools.exec`, `tools.exec.*`, `tools.exec.approvalRunningNoticeMs`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/tools/exec-approvals](https://docs.openclaw.ai/tools/exec-approvals)</sub>

---

### `/tools/exec-approvals-advanced` — Exec approvals — advanced

**Exec approvals — advanced** · *Capabilities › Running code and approvals*

> Advanced exec approvals: safe bins, interpreter binding, approval forwarding, native delivery

<sub>source `docs/tools/exec-approvals-advanced.md` · 510 lines · 3435 words · 6 code blocks</sub>

**Read when:** Configuring safe bins or custom safe-bin profiles · Forwarding approvals to Slack/Discord/Telegram or other chat channels · Implementing a native approval client for a channel

**Covers:** Safe bins (stdin-only) · Interpreter/runtime commands · Minimal scopes for third-party clients · Approval forwarding to chat channels · FAQ · Related <sub>(12 sub-sections)</sub>

**CLI:** `openclaw approvals allowlist`, `openclaw doctor`, `openclaw security audit`

**Config:** `agents.entries.*.tools.exec.safeBinProfiles`, `agents.entries.*.tools.exec.safeBinTrustedDirs`, `agents.entries.*.tools.exec.safeBins`, `channels.discord.execApprovals.*`, `channels.googlechat.defaultTo`, `channels.googlechat.dm.allowFrom`, `channels.matrix.dm.allowFrom`, `channels.qqbot.execApprovals.*`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/tools/exec-approvals-advanced](https://docs.openclaw.ai/tools/exec-approvals-advanced)</sub>

---

### `/tools/permission-modes` — Permission modes

**Permission modes** · *Capabilities › Running code and approvals*

> Permission modes for host exec, Codex Guardian approvals, and ACPX harness sessions

<sub>source `docs/tools/permission-modes.md` · 120 lines · 967 words · 4 code blocks</sub>

**Read when:** Choosing auto, ask, allowlist, full, or deny for command permissions · Configuring Codex Guardian-reviewed approvals through tools.exec.mode · Comparing OpenClaw exec approvals with ACPX harness permissions

**Covers:** Recommended default · OpenClaw host exec modes · Codex Guardian mapping · ACPX harness permissions · Choosing a mode · Related

**CLI:** `openclaw approvals get`, `openclaw config set`, `openclaw exec-policy show`, `openclaw gateway restart`

**Config:** `plugins.entries.acpx.config`, `tools.exec.host`, `tools.exec.mode`, `tools.exec.strictInlineEval`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/tools/permission-modes](https://docs.openclaw.ai/tools/permission-modes)</sub>

---

### `/tools/secrets` — Secrets

**Secrets** · *Capabilities › Running code and approvals*

> How the secrets tool lets the agent request credentials it never sees

<sub>source `docs/tools/secrets.md` · 169 lines · 1503 words</sub>

**Read when:** You want the agent to obtain an API key without it entering the chat · You are answering or debugging a credential request prompt · You need the secrets tool schema, storage, or channel behavior

**Covers:** Actions · Answering a request · Using a stored credential · Related

**CLI:** `openclaw chat`, `openclaw secrets reload`, `openclaw secrets store`, `openclaw tui`

**Config:** `gateway.publicOrigin`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/secrets](https://docs.openclaw.ai/tools/secrets)</sub>

---

### `/tools/media-overview` — Media overview

**Media overview** · *Capabilities › Media and documents*

> Image, video, music, speech, and media-understanding capabilities at a glance

<sub>source `docs/tools/media-overview.md` · 196 lines · 1365 words</sub>

**Read when:** Looking for an overview of OpenClaw's media capabilities · Deciding which media provider to configure · Understanding how async media generation works

**Covers:** Capabilities · Local media files · Provider capability matrix · Async vs synchronous · Speech-to-text and Voice Call · Provider mappings (how vendors split across surfaces) · Related

**Config:** `tools.media.audio`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/media-overview](https://docs.openclaw.ai/tools/media-overview)</sub>

---

### `/tools/image-generation` — Image generation

**Image generation** · *Capabilities › Media and documents*

> Generate and edit images via imagegenerate across OpenAI, Google, fal, Microsoft Foundry, MiniMax, ComfyUI, DeepInfra, OpenRouter, LiteLLM, xAI, Vydra

<sub>source `docs/tools/image-generation.md` · 617 lines · 2710 words · 19 code blocks</sub>

**Read when:** Generating or editing images via the agent · Configuring image-generation providers and models · Understanding the image_generate tool parameters

**Covers:** Quick start · Common routes · Supported providers · Provider capabilities · Tool parameters · Configuration · Provider deep dives · Examples · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw infer image`

**Config:** `agents.defaults.mediaModels.image`, `agents.defaults.mediaModels.image.fallbacks`, `agents.defaults.mediaModels.image.primary`, `agents.defaults.mediaModels.image.timeoutMs`, `models.providers.openai`, `models.providers.openai.baseUrl`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/image-generation](https://docs.openclaw.ai/tools/image-generation)</sub>

---

### `/tools/music-generation` — Music generation

**Music generation** · *Capabilities › Media and documents*

> Generate music via musicgenerate across ComfyUI, fal, Google Lyria, MiniMax, and OpenRouter workflows

<sub>source `docs/tools/music-generation.md` · 380 lines · 1508 words · 11 code blocks</sub>

**Read when:** Generating music or audio via the agent · Configuring music-generation providers and models · Understanding the music_generate tool parameters

**Covers:** Quick start · Supported providers · Tool parameters · Async behavior · Configuration · Provider notes · Choosing the right path · Provider capability modes · Live tests · Related <sub>(4 sub-sections)</sub>

**Config:** `agents.defaults.mediaModels.music`, `agents.defaults.mediaModels.music.fallbacks`, `agents.defaults.mediaModels.music.primary`, `agents.defaults.mediaModels.music.timeoutMs`, `plugins.entries.comfy.config.music`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/music-generation](https://docs.openclaw.ai/tools/music-generation)</sub>

---

### `/tools/pdf` — PDF tool

**PDF tool** · *Capabilities › Media and documents*

> Analyze one or more PDF documents with native provider support and extraction fallback

<sub>source `docs/tools/pdf.md` · 196 lines · 1004 words · 5 code blocks</sub>

**Read when:** You want to analyze PDFs from agents · You need exact pdf tool parameters and limits · You are debugging native PDF mode vs extraction fallback

**Covers:** Availability · Input reference · Supported PDF references · Execution modes · Config · Output details · Error behavior · Examples · Related <sub>(2 sub-sections)</sub>

**Config:** `agents.defaults.imageModel`, `agents.defaults.pdfMaxMb`, `agents.defaults.pdfMaxPages`, `agents.defaults.pdfModel`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/pdf](https://docs.openclaw.ai/tools/pdf)</sub>

---

### `/tools/tts` — Text-to-speech

**Text-to-speech** · *Capabilities › Media and documents*

> Index of the OpenClaw text-to-speech documentation, one page per reader job

<sub>source `docs/tools/tts.md` · 236 lines · 1113 words</sub>

**Read when:** Enabling text-to-speech for replies · Configuring a TTS provider, fallback chain, or persona · Using /tts commands or directives

**Covers:** Where each section moved · Component anchors · Service links · Related

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts](https://docs.openclaw.ai/tools/tts)</sub>

---

### `/tools/tts/quickstart` — Text-to-speech quickstart

**Text-to-speech quickstart** · *Capabilities › Text to speech*

> Turn on text-to-speech, pick a provider, and send a first audio reply

<sub>source `docs/tools/tts/quickstart.md` · 81 lines · 506 words · 1 code blocks</sub>

**Read when:** You are enabling text-to-speech for the first time · You need the list of supported speech providers and their auth env vars · You want to confirm TTS works from chat

**Covers:** Quick start · Supported providers

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.model.primary`, `models.providers.openrouter.apiKey`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/quickstart](https://docs.openclaw.ai/tools/tts/quickstart)</sub>

---

### `/tools/tts/configuration` — Text-to-speech configuration

**Text-to-speech configuration** · *Capabilities › Text to speech*

> The tts config block, per-provider settings, local speech engines, and override precedence

<sub>source `docs/tools/tts/configuration.md` · 507 lines · 557 words · 23 code blocks</sub>

**Read when:** You are writing the tts block in openclaw.json · You need the config snippet for one speech provider · You want a local Speech Swift or speech-core engine · You need per-agent, per-channel, or per-account voice overrides

**Covers:** Configuration <sub>(2 sub-sections)</sub>

**Config:** `agents.entries.*.tts`, `agents.entries.*.tts.persona`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/configuration](https://docs.openclaw.ai/tools/tts/configuration)</sub>

---

### `/tools/tts/personas` — Text-to-speech personas

**Text-to-speech personas** · *Capabilities › Text to speech*

> Persona definitions, provider bindings, resolution order, and fallback policy

<sub>source `docs/tools/tts/personas.md` · 123 lines · 329 words · 2 code blocks</sub>

**Read when:** You want one stable spoken identity across providers · You need the persona and provider resolution order · You are choosing a persona fallback policy

**Covers:** Personas <sub>(5 sub-sections)</sub>

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/personas](https://docs.openclaw.ai/tools/tts/personas)</sub>

---

### `/tools/tts/commands` — Text-to-speech commands and directives

**Text-to-speech commands and directives** · *Capabilities › Text to speech*

> Model-emitted TTS directives, the /tts slash commands, and per-user preferences

<sub>source `docs/tools/tts/commands.md` · 102 lines · 499 words · 4 code blocks</sub>

**Read when:** You want the model to change voice or speed for one reply · You need the /tts command surface · You are looking for where local TTS preferences are stored

**Covers:** Model-driven directives · Slash commands · Per-user preferences

**Config:** `agents.entries.*.tts`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/commands](https://docs.openclaw.ai/tools/tts/commands)</sub>

---

### `/tools/tts/output` — Text-to-speech output and Auto-TTS behavior

**Text-to-speech output and Auto-TTS behavior** · *Capabilities › Text to speech*

> Per-channel audio formats, transcoding, and what Auto-TTS sends

<sub>source `docs/tools/tts/output.md` · 96 lines · 913 words · 1 code blocks</sub>

**Read when:** You need the audio format a channel receives · You are debugging voice-note delivery or transcoding · You want to know when Auto-TTS summarizes or truncates a reply

**Covers:** Output formats · Auto-TTS behavior

**Config:** `agents.defaults.model.primary`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/output](https://docs.openclaw.ai/tools/tts/output)</sub>

---

### `/tools/tts/field-reference` — Text-to-speech field reference

**Text-to-speech field reference** · *Capabilities › Text to speech*

> Every tts. and tts.providers. . configuration field

<sub>source `docs/tools/tts/field-reference.md` · 190 lines · 1236 words</sub>

**Read when:** You need the type, default, or env var for one TTS field · You are checking a legacy field alias · You are validating a provider block

**Covers:** Field reference

**CLI:** `openclaw doctor`, `openclaw infer tts`

**Config:** `agents.defaults.model.primary`, `models.providers.google.apiKey`, `models.providers.openrouter.apiKey`, `providers.microsoft`

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/field-reference](https://docs.openclaw.ai/tools/tts/field-reference)</sub>

---

### `/tools/tts/api` — Text-to-speech agent tool and Gateway RPC

**Text-to-speech agent tool and Gateway RPC** · *Capabilities › Text to speech*

> The tts agent tool and the Gateway TTS RPC methods

<sub>source `docs/tools/tts/api.md` · 53 lines · 263 words · 1 code blocks</sub>

**Read when:** You are calling TTS from an agent tool call · You need the Gateway tts.* RPC method list

**Covers:** Agent tool · Gateway RPC <sub>(1 sub-sections)</sub>

**TermCrab — media: PARTIAL.** Termux TTS/STT + optional whisper.cpp (`src/mobile/tts.ts`, `src/mobile/whisper.ts`); no image/video generation.

<sub>live: [docs.openclaw.ai/tools/tts/api](https://docs.openclaw.ai/tools/tts/api)</sub>

---

### `/tools/video-generation` — Video generation

**Video generation** · *Capabilities › Media and documents*

> Generate videos via videogenerate from text, image, or video references across 18 provider backends

<sub>source `docs/tools/video-generation.md` · 590 lines · 3221 words · 9 code blocks</sub>

**Read when:** Generating videos via the agent · Configuring video-generation providers and models · Understanding the video_generate tool parameters

**Covers:** Quick start · How async generation works · Supported providers · Tool parameters · Actions · Model selection · Provider notes · Provider capability modes · Live tests · Configuration · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config set`

**Config:** `agents.defaults.mediaMaxMb`, `agents.defaults.mediaModels.video`, `agents.defaults.mediaModels.video.fallbacks`, `agents.defaults.mediaModels.video.primary`, `agents.defaults.mediaModels.video.timeoutMs`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/video-generation](https://docs.openclaw.ai/tools/video-generation)</sub>

---

### `/tools/code-mode` — Code Mode

**Code Mode** · *Capabilities › Tool catalogs and workflows*

> Index of the OpenClaw Code Mode documentation, one page per reader job

<sub>source `docs/tools/code-mode.md` · 187 lines · 1309 words</sub>

**Read when:** You want to enable OpenClaw Code Mode for an agent run · You need to explain why Code Mode is different from Codex Code Mode · You are looking for the Code Mode page that matches your task

**Covers:** What it does · Why use it · Technical tour · Where each section moved · Related

**Config:** `tools.codeMode`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode](https://docs.openclaw.ai/tools/code-mode)</sub>

---

### `/tools/code-mode/quickstart` — Code Mode quickstart

**Code Mode quickstart** · *Capabilities › Code Mode*

> Enable OpenClaw Code Mode, override one model, and recover from tool errors

<sub>source `docs/tools/code-mode/quickstart.md` · 295 lines · 1578 words · 9 code blocks</sub>

**Read when:** You want to enable OpenClaw code mode for an agent run · You need the per-agent or per-model override example · A code-mode tool call failed and you need the recovery steps

**Covers:** Enable code mode · Override one model · What the model does · Reuse data across cells · Recover from tool errors · Verify the active surface · Use Swarm for agent fan-out

**CLI:** `openclaw gateway`

**Config:** `agents.defaults.models`, `tools.codeMode`, `tools.codeMode.enabled`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/quickstart](https://docs.openclaw.ai/tools/code-mode/quickstart)</sub>

---

### `/tools/code-mode/executors` — Code Mode executors

**Code Mode executors** · *Capabilities › Code Mode*

> Choose Node or QuickJS for Code Mode and understand their execution and security boundaries

<sub>source `docs/tools/code-mode/executors.md` · 131 lines · 899 words · 1 code blocks</sub>

**Read when:** You want to choose how Code Mode executes JavaScript · You need hardened guest isolation instead of trusted Node execution · You are upgrading a config that explicitly selected QuickJS-WASI

**Covers:** Choose an executor · Set the executor · Understand waits and limits · Upgrade an existing configuration · Related

**CLI:** `openclaw doctor`

**Config:** `plugins.allow`, `plugins.deny`, `plugins.enabled`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/executors](https://docs.openclaw.ai/tools/code-mode/executors)</sub>

---

### `/tools/code-mode/configuration` — Code Mode configuration

**Code Mode configuration** · *Capabilities › Code Mode*

> Code Mode configuration fields, automatic per-model activation, and the activation order

<sub>source `docs/tools/code-mode/configuration.md` · 179 lines · 1323 words</sub>

**Read when:** You are setting Code Mode limits or the runtime · You need the preferred-model list and the compat catalog flag · You need the exact activation precedence for a run

**Covers:** Configuration · Automatic per-model activation · Activation <sub>(4 sub-sections)</sub>

**Config:** `tools.allow`, `tools.codeMode`, `tools.codeMode.enabled`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/configuration](https://docs.openclaw.ai/tools/code-mode/configuration)</sub>

---

### `/tools/code-mode/tool-surface` — Code Mode tool surface

**Code Mode tool surface** · *Capabilities › Code Mode*

> The model-visible exec and wait contracts, the hidden tool catalog, and name collisions

<sub>source `docs/tools/code-mode/tool-surface.md` · 319 lines · 2166 words · 3 code blocks</sub>

**Read when:** You are reviewing the compact tool contract the model sees · You need the exec or wait input and result shapes · You need catalog ordering, Tool Search interaction, or collision rules

**Covers:** Model-visible tools · exec · wait · Tool catalog · Tool Search interaction · Tool names and collisions <sub>(2 sub-sections)</sub>

**Config:** `tools.codeMode.timeoutMs`, `tools.exec.notifyOnExit`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/tool-surface](https://docs.openclaw.ai/tools/code-mode/tool-surface)</sub>

---

### `/tools/code-mode/guest-api` — Code Mode guest API

**Code Mode guest API** · *Capabilities › Code Mode*

> Globals, catalog handles, MCP namespaces, and virtual API declarations inside guest code

<sub>source `docs/tools/code-mode/guest-api.md` · 234 lines · 1292 words · 7 code blocks</sub>

**Read when:** You are writing or reviewing guest JavaScript for Code Mode · You are reviewing the MCP namespace bridge or virtual API declarations · You need to read paginated file data from guest code

**Covers:** Guest runtime API <sub>(1 sub-sections)</sub>

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/guest-api](https://docs.openclaw.ai/tools/code-mode/guest-api)</sub>

---

### `/tools/code-mode/output` — Code Mode output

**Code Mode output** · *Capabilities › Code Mode*

> Declared output contracts for tool results and the guest output API

<sub>source `docs/tools/code-mode/output.md` · 408 lines · 2303 words · 6 code blocks</sub>

**Read when:** You are declaring an outputSchema for a tool used in Code Mode · You need the text, json, and returned-value output rules · You are debugging a raw-first or shaped tool result

**Covers:** Declared output contracts · Input-dependent outputs · Output API

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/output](https://docs.openclaw.ai/tools/code-mode/output)</sub>

---

### `/tools/code-mode/internals` — Code Mode internals

**Code Mode internals** · *Capabilities › Code Mode*

> Code Mode scope, nested tool execution, executor continuations, and security boundaries

<sub>source `docs/tools/code-mode/internals.md` · 234 lines · 1871 words</sub>

**Read when:** You need the runtime status, scope, or vocabulary · You are reviewing the executor boundary, typed tool discovery, or continuation lifecycle · You are validating the security boundary for a high-risk deployment

**Covers:** Runtime status · Scope · Terms · Nested tool execution · Run and snapshot lifecycle · QuickJS-WASI runtime · Node runtime · TypeScript · Security boundary

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/internals](https://docs.openclaw.ai/tools/code-mode/internals)</sub>

---

### `/tools/code-mode/troubleshooting` — Code Mode troubleshooting

**Code Mode troubleshooting** · *Capabilities › Code Mode*

> Code Mode error codes, telemetry fields, and the debug environment variables

<sub>source `docs/tools/code-mode/troubleshooting.md` · 128 lines · 848 words · 2 code blocks</sub>

**Read when:** A Code Mode run failed and you need the error code meaning · You are reading Code Mode telemetry or trajectory output · You need the debug environment variables for a Code Mode session

**Covers:** Error codes · Telemetry · Debugging

**CLI:** `openclaw agent`, `openclaw gateway`

**Config:** `tools.codeMode.executor`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/troubleshooting](https://docs.openclaw.ai/tools/code-mode/troubleshooting)</sub>

---

### `/tools/code-mode/maintainers` — Code Mode maintainer notes

**Code Mode maintainer notes** · *Capabilities › Code Mode*

> Code Mode implementation layout, the validation checklist, and the E2E test plan

<sub>source `docs/tools/code-mode/maintainers.md` · 108 lines · 828 words</sub>

**Read when:** You are changing Code Mode source and need the file layout · You are validating a Code Mode change before landing it · You are writing or reviewing Code Mode E2E coverage

**Covers:** Implementation layout · Validation checklist · E2E test plan

**Config:** `tools.codeMode`

**TermCrab — tools: PARTIAL.** `code_exec` via Node `vm` (`src/agent/tools.ts:509+`) — a JS sandbox, not OpenClaw's QuickJS code-mode contract.

<sub>live: [docs.openclaw.ai/tools/code-mode/maintainers](https://docs.openclaw.ai/tools/code-mode/maintainers)</sub>

---

### `/tools/llm-task` — LLM task

**LLM task** · *Capabilities › Tool catalogs and workflows*

> JSON-only LLM tasks for workflows (optional plugin tool)

<sub>source `docs/tools/llm-task.md` · 177 lines · 723 words · 5 code blocks</sub>

**Read when:** You want a JSON-only LLM step inside workflows · You need schema-validated LLM output for automation

**Covers:** Enable · Config (optional) · Tool parameters · Output · Example: Lobster workflow step · Safety notes · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `tools.allow`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/llm-task](https://docs.openclaw.ai/tools/llm-task)</sub>

---

### `/tools/lobster` — Lobster

**Lobster** · *Capabilities › Tool catalogs and workflows*

> Typed workflow runtime for OpenClaw with resumable approval and input gates.

<sub>source `docs/tools/lobster.md` · 436 lines · 1544 words · 19 code blocks</sub>

**Read when:** You want deterministic multi-step workflows with approvals or structured questions · You need to resume a workflow without re-running earlier steps

**Covers:** Why · How it works · Enable · Pattern: small CLI + JSON pipes + approvals · JSON-only LLM steps (llm-task) · Workflow files (.lobster) · Tool parameters · Output envelope · Approvals · Safety · Troubleshooting · Learn more · Case study: community workflows · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw calls gmail`, `openclaw plugins install`

**Config:** `tools.allow`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/lobster](https://docs.openclaw.ai/tools/lobster)</sub>

---

### `/tools/mcp` — Connect MCP servers

**Connect MCP servers** · *Capabilities › Tool catalogs and workflows*

> Connect MCP servers to OpenClaw from the Control UI, CLI, or config

<sub>source `docs/tools/mcp.md` · 152 lines · 1311 words · 5 code blocks</sub>

**Read when:** Adding an MCP server for OpenClaw agents · Choosing between Settings and `openclaw mcp` · Troubleshooting MCP transport, OAuth, or tool discovery

**Covers:** Add a server from Settings · Add a server from the composer · Add a server from the CLI · Configure a server directly · Interactive apps and plugin extensions · Approvals · Troubleshooting · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw mcp add`, `openclaw mcp configure`, `openclaw mcp doctor`, `openclaw mcp login`, `openclaw mcp probe`, `openclaw mcp reload`, `openclaw mcp serve`, `openclaw mcp status`

**Config:** `mcp.servers`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/mcp](https://docs.openclaw.ai/tools/mcp)</sub>

---

### `/tools/tool-search` — Tool Search

**Tool Search** · *Capabilities › Tool catalogs and workflows*

> Tool Search: compact large OpenClaw tool catalogs behind search, describe, and call

<sub>source `docs/tools/tool-search.md` · 488 lines · 2891 words · 13 code blocks</sub>

**Read when:** You want OpenClaw agents to use a large tool catalog without adding every tool schema to the prompt · You want OpenClaw tools, MCP tools, and client tools exposed through one compact runtime surface · You are implementing or debugging tool discovery for OpenClaw runs

**Covers:** How a turn runs · Modes · Why this exists · Structured controls · Execution policy · Config · Upgrading · Session activity · E2E validation · Failure behavior · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw qa suite`, `openclaw update`

**Config:** `tools.toolSearch`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/tool-search](https://docs.openclaw.ai/tools/tool-search)</sub>

---

### `/tools/loop-detection` — Tool-loop detection

**Tool-loop detection** · *Capabilities › Context and reasoning*

> How to enable guardrails that detect repetitive tool-call loops

<sub>source `docs/tools/loop-detection.md` · 193 lines · 1108 words · 3 code blocks</sub>

**Read when:** A user reports agents getting stuck repeating tool calls · You need to control repetitive-call protection · You are editing agent tool/runtime policies · You hit `compaction_loop_persisted` aborts after a context-overflow retry

**Covers:** Why this exists · Configuration block · Recommended setup · Post-compaction guard · Logs and expected behavior · Related <sub>(1 sub-sections)</sub>

**Config:** `agents.entries.*.tools.loopDetection`, `tools.loopDetection`, `tools.loopDetection.enabled`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/loop-detection](https://docs.openclaw.ai/tools/loop-detection)</sub>

---

### `/tools/thinking` — Thinking levels

**Thinking levels** · *Capabilities › Context and reasoning*

> Directive syntax for /think, /fast, /verbose, /trace, and reasoning visibility

<sub>source `docs/tools/thinking.md` · 193 lines · 2642 words · 1 code blocks</sub>

**Read when:** Adjusting thinking, fast-mode, or verbose directive parsing or defaults

**Covers:** What it does · Resolution order · Setting a model default · Setting a session default · Application by agent · Fast mode (/fast) · Verbose directives (/verbose or /v) · Plugin trace directives (/trace) · Reasoning visibility (/reasoning) · Related · Heartbeats · Web chat UI · Provider profiles

**Config:** `agents.defaults.fastModeDefault`, `agents.defaults.reasoningDefault`, `agents.defaults.thinkingDefault`, `agents.defaults.toolProgressDetail`, `agents.entries.*.fastModeDefault`, `agents.entries.*.reasoningDefault`, `agents.entries.*.thinkingDefault`, `agents.entries.*.toolProgressDetail`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/thinking](https://docs.openclaw.ai/tools/thinking)</sub>

---

### `/tools/tokenjuice` — Tokenjuice

**Tokenjuice** · *Capabilities › Context and reasoning*

> Compact noisy exec and bash tool results with the optional Tokenjuice plugin

<sub>source `docs/tools/tokenjuice.md` · 78 lines · 205 words · 6 code blocks</sub>

**Read when:** You want shorter `exec` or `bash` tool results in OpenClaw · You want to install or enable the Tokenjuice plugin · You need to understand what tokenjuice changes and what it leaves raw

**Covers:** Enable the plugin · What tokenjuice changes · Verify it is working · Disable the plugin · Related

**CLI:** `openclaw config set`, `openclaw plugins disable`, `openclaw plugins enable`, `openclaw plugins install`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/tokenjuice](https://docs.openclaw.ai/tools/tokenjuice)</sub>

---

### `/tools/trajectory` — Trajectory bundles

**Trajectory bundles** · *Capabilities › Context and reasoning*

> Export redacted trajectory bundles for debugging an OpenClaw agent session

<sub>source `docs/tools/trajectory.md` · 203 lines · 1026 words · 7 code blocks</sub>

**Read when:** Debugging why an agent answered, failed, or called tools a certain way · Exporting a support bundle for an OpenClaw session · Investigating prompt context, tool calls, runtime errors, or usage metadata · Disabling trajectory capture

**Covers:** Quick start · Access · What gets recorded · Bundle files · Capture storage · Disable capture · Tune flush timeout · Privacy and limits · Troubleshooting · Related

**CLI:** `openclaw sessions export-trajectory`

**Config:** `session.ended`, `session.started`, `tools.json`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/trajectory](https://docs.openclaw.ai/tools/trajectory)</sub>

---

### `/tools/ask-user` — Ask user

**Ask user** · *Capabilities › Chat and UI tools*

> How askuser pauses an agent turn for a structured human decision

<sub>source `docs/tools/ask-user.md` · 182 lines · 1254 words · 2 code blocks</sub>

**Read when:** You want an agent to ask the user a structured question · You are answering or debugging an ask_user prompt · You need the ask_user schema, timeout, or channel behavior

**Covers:** Answer a question · Platform behavior · Async questions · Timeout and no answer · Tool schema · Model guidance · Related

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/ask-user](https://docs.openclaw.ai/tools/ask-user)</sub>

---

### `/tools/btw` — BTW side questions

**BTW side questions** · *Capabilities › Chat and UI tools*

> Ephemeral side questions with /btw

<sub>source `docs/tools/btw.md` · 124 lines · 876 words · 2 code blocks</sub>

**Read when:** You want to ask a quick side question about the current session · You are implementing or debugging BTW behavior across clients

**Covers:** What it does · What it does not do · Delivery model · Surface behavior · Selection popup (Control UI) · When to use it · Related

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/btw](https://docs.openclaw.ai/tools/btw)</sub>

---

### `/tools/progress-card` — Progress card

**Progress card** · *Capabilities › Chat and UI tools*

> Maintain one durable plan and status card for a session

<sub>source `docs/tools/progress-card.md` · 213 lines · 2897 words · 6 code blocks</sub>

**Read when:** You want an agent to publish durable at-a-glance progress for its current session · You need the progress_card input, limits, rendering, or clearing contract

**Covers:** Adoption · Update a card · Before an active run ends · Pause without marking work complete · Format the note · Limits · Clear a card · Where the card appears · Refresh current work status · Gateway requests · Pin the card to the dashboard · Related

**CLI:** `openclaw dashboard`

**Config:** `tools.deny`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/progress-card](https://docs.openclaw.ai/tools/progress-card)</sub>

---

### `/tools/reactions` — Reactions

**Reactions** · *Capabilities › Chat and UI tools*

> Reaction tool semantics across all supported channels

<sub>source `docs/tools/reactions.md` · 103 lines · 562 words · 1 code blocks</sub>

**Read when:** Working on reactions in any channel · Understanding how emoji reactions differ across platforms

**Covers:** How it works · Channel behavior · Reaction level · Related

**Config:** `channels.signal.reactionAllowlist`, `channels.signal.reactionLevel`, `channels.signal.reactionNotifications`, `channels.telegram.actions.reactions`, `channels.telegram.reactionLevel`, `channels.whatsapp.reactionLevel`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/reactions](https://docs.openclaw.ai/tools/reactions)</sub>

---

### `/tools/screen` — Screen

**Screen** · *Capabilities › Chat and UI tools*

> Let an agent arrange the connected Control UI

<sub>source `docs/tools/screen.md` · 88 lines · 712 words</sub>

**Read when:** You want an agent to split, focus, close, or navigate Control UI panes · You want an agent to show or hide the sidebar, terminal, or browser panels · You need the ui.command capability and requester routing contract

**Covers:** Actions · Routing and security · Related

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/screen](https://docs.openclaw.ai/tools/screen)</sub>

---

### `/tools/show-widget` — Show widget

**Show widget** · *Capabilities › Chat and UI tools*

> Show HTML widgets on supported chat surfaces or pin native data reports to dashboards

<sub>source `docs/tools/show-widget.md` · 403 lines · 4518 words · 5 code blocks</sub>

**Read when:** You want an agent to render an interactive result in web chat, a native app, or Discord · You want to pin a report with metrics, tables, charts, or links to a dashboard · You want widget buttons to send follow-up prompts into the chat · You want to theme widgets with the shared design tokens · You need the show_widget input, security, or retention contract

**Covers:** How widgets work · Design system · Libraries and fonts · Use the tool · Native dashboard reports · Show on a device · Audio and video · Interactive widgets · Dashboard capabilities · Security and storage · Related <sub>(1 sub-sections)</sub>

**Config:** `agents.list`, `cron.list`, `cron.status`, `gateway.controlUi.embedSandbox`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/show-widget](https://docs.openclaw.ai/tools/show-widget)</sub>

---

### `/tools/theme` — Theme

**Theme** · *Capabilities › Chat and UI tools*

> Let an agent select plugin themes or create a personal OpenClaw theme

<sub>source `docs/tools/theme.md` · 163 lines · 956 words · 4 code blocks</sub>

**Read when:** You want an agent to change your OpenClaw theme · You want to create a custom theme and apply it in one call · You need the theme catalog and profile selection contract

**Covers:** Select a theme · Actions · Create and apply a personal theme · Plugin themes and hot reload · Related

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/theme](https://docs.openclaw.ai/tools/theme)</sub>

---

### `/tools/browser` — Browser (OpenClaw-managed)

**Browser (OpenClaw-managed)** · *Capabilities › Browsing and fetching pages*

> Index of the OpenClaw browser documentation, one page per reader job

<sub>source `docs/tools/browser.md` · 91 lines · 710 words</sub>

**Read when:** Adding agent-controlled browser automation · Debugging why openclaw is interfering with your own Chrome · Implementing browser settings + lifecycle in the macOS app · You are looking for the Browser page that matches your task

**Covers:** What you get · Where each section moved · Related

**CLI:** `openclaw browser`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser](https://docs.openclaw.ai/tools/browser)</sub>

---

### `/tools/browser/setup` — Browser setup

**Browser setup** · *Capabilities › Browser*

> Quick start commands, plugin enablement, agent tool policy, and the missing-command fix

<sub>source `docs/tools/browser/setup.md` · 107 lines · 498 words · 4 code blocks</sub>

**Read when:** You are starting the OpenClaw browser for the first time · The agent reports the browser tool as unavailable · The `openclaw browser` command is missing after an upgrade

**Covers:** Quick start · Plugin control · Agent guidance · Missing browser command or tool

**CLI:** `openclaw browser`, `openclaw doctor`, `openclaw doctor
openclaw`, `openclaw open https`, `openclaw plugins enable`, `openclaw snapshot`, `openclaw start
openclaw`, `openclaw status
openclaw`

**Config:** `plugins.allow`, `plugins.entries.browser.enabled`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/setup](https://docs.openclaw.ai/tools/browser/setup)</sub>

---

### `/tools/browser/profiles` — Browser profiles

**Browser profiles** · *Capabilities › Browser*

> The built-in openclaw, user, and chrome profiles and the Control UI Browser panel

<sub>source `docs/tools/browser/profiles.md` · 75 lines · 677 words</sub>

**Read when:** You are choosing between the managed browser and a signed-in Chrome session · You need a profile that works with nobody at the computer · You are using the Browser panel in the Control UI

**Covers:** Browser panel in the Control UI

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/profiles](https://docs.openclaw.ai/tools/browser/profiles)</sub>

---

### `/tools/browser/existing-session` — Multi-profile and existing-session attach

**Multi-profile and existing-session attach** · *Capabilities › Browser*

> Named browser profiles and attaching to a running Chrome session through Chrome DevTools MCP

<sub>source `docs/tools/browser/existing-session.md` · 195 lines · 1478 words · 2 code blocks</sub>

**Read when:** You want the agent to use your signed-in browser session · You are creating extra named browser profiles · You need the Chrome MCP launch overrides or the existing-session limits

**Covers:** Profiles (multi-browser) · Existing session via Chrome DevTools MCP <sub>(1 sub-sections)</sub>

**CLI:** `openclaw browser`, `openclaw doctor`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/existing-session](https://docs.openclaw.ai/tools/browser/existing-session)</sub>

---

### `/tools/browser/configuration` — Browser configuration

**Browser configuration** · *Capabilities › Browser*

> The browser config block, tab cleanup, screenshot vision, ports, SSRF policy, and picking a Chromium binary

<sub>source `docs/tools/browser/configuration.md` · 314 lines · 2004 words · 6 code blocks</sub>

**Read when:** You are writing the browser block in openclaw.json · You need the CDP port ranges or the SSRF policy options · You want a text-only model to read browser screenshots · You want OpenClaw to launch Brave, Edge, or another Chromium browser

**Covers:** Configuration · Use Brave or another Chromium-based browser <sub>(2 sub-sections)</sub>

**CLI:** `openclaw browser`, `openclaw browser create-profile`, `openclaw browser start`, `openclaw browser status`, `openclaw config set`

**Config:** `gateway.port`, `tools.media.models`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/configuration](https://docs.openclaw.ai/tools/browser/configuration)</sub>

---

### `/tools/browser/remote` — Remote and hosted browsers

**Remote and hosted browsers** · *Capabilities › Browser*

> Local versus remote control, the node browser proxy, and hosted CDP providers

<sub>source `docs/tools/browser/remote.md` · 232 lines · 1320 words · 4 code blocks</sub>

**Read when:** The browser runs on a different machine from the Gateway · You are attaching to Browserless, Browserbase, or Notte · You need the accepted CDP URL shapes

**Covers:** Local vs remote control · Node browser proxy (zero-config default) · Browserless (hosted remote CDP) · Direct WebSocket CDP providers <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agent exec`, `openclaw browser doctor`, `openclaw browser start`, `openclaw browser stop`, `openclaw node run`

**Config:** `gateway.nodes.browser.node`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/remote](https://docs.openclaw.ai/tools/browser/remote)</sub>

---

### `/tools/browser/lightweight` — Lightweight browsers

**Lightweight browsers** · *Capabilities › Browser*

> Use an externally managed Lightpanda browser for JavaScript and DOM tasks

<sub>source `docs/tools/browser/lightweight.md` · 357 lines · 2261 words · 10 code blocks</sub>

**Read when:** You want browser tasks to use a lightweight engine instead of Chromium · You run OpenClaw or its browser in Docker · You need the limits of the Lightpanda browser profile

**Covers:** Browser plugin architecture · Licensing and distribution · Alternatives reviewed · Choose where the engine runs · Docker with OpenClaw on the host · Docker Compose with OpenClaw in a container · Native Linux and macOS · Configure an opt-in profile · Session and capability limits · Verification and benchmarks <sub>(4 sub-sections)</sub>

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/lightweight](https://docs.openclaw.ai/tools/browser/lightweight)</sub>

---

### `/tools/browser/security` — Browser security

**Browser security** · *Capabilities › Browser*

> Loopback auth for the browser control API and remote CDP credential handling

<sub>source `docs/tools/browser/security.md` · 28 lines · 195 words</sub>

**Read when:** You are reviewing how the browser control API authenticates · You are handling remote CDP tokens

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/security](https://docs.openclaw.ai/tools/browser/security)</sub>

---

### `/tools/browser/isolation` — Isolation and browser selection

**Isolation and browser selection** · *Capabilities › Browser*

> What the managed profile isolates, which browser binary is picked, and where the control API reference lives

<sub>source `docs/tools/browser/isolation.md` · 42 lines · 189 words</sub>

**Read when:** You need to know what the managed browser keeps separate from your own · You want the local browser detection order per platform · You are looking for the HTTP control API reference

**Covers:** Isolation guarantees · Browser selection · Control API (optional)

**CLI:** `openclaw browser`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/isolation](https://docs.openclaw.ai/tools/browser/isolation)</sub>

---

### `/tools/browser/agent-tools` — Browser agent tools

**Browser agent tools** · *Capabilities › Browser*

> The single browser tool, its actions, and the arguments an agent passes

<sub>source `docs/tools/browser/agent-tools.md` · 78 lines · 626 words · 5 code blocks</sub>

**Read when:** You need the list of browser tool actions · You are writing agent tool arguments for the browser · You need the sandbox and node targeting rules

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/agent-tools](https://docs.openclaw.ai/tools/browser/agent-tools)</sub>

---

### `/tools/browser/troubleshooting` — Browser troubleshooting

**Browser troubleshooting** · *Capabilities › Browser*

> Separating CDP startup failures from navigation SSRF blocks, plus the platform-specific pages

<sub>source `docs/tools/browser/troubleshooting.md` · 82 lines · 671 words · 1 code blocks</sub>

**Read when:** The browser will not start or a page will not load · You need to tell a CDP readiness failure from a policy block

**Covers:** Inspection times out but screenshots work · Output directory errors · CDP startup failure vs navigation SSRF block

**CLI:** `openclaw browser`, `openclaw browser doctor`, `openclaw open https`, `openclaw start
openclaw`, `openclaw tabs
openclaw`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser/troubleshooting](https://docs.openclaw.ai/tools/browser/troubleshooting)</sub>

---

### `/tools/browser-control` — Browser control API

**Browser control API** · *Capabilities › Browsing and fetching pages*

> OpenClaw browser control API, CLI reference, and scripting actions

<sub>source `docs/tools/browser-control.md` · 586 lines · 3661 words · 10 code blocks</sub>

**Read when:** Scripting or debugging the agent browser via the local control API · Looking for the `openclaw browser` CLI reference · Adding custom browser automation with snapshots and refs

**Covers:** Control API (optional) · How it works (internal) · CLI quick reference · Snapshots and refs · Browser batch CLI · Wait power-ups · Debug workflows · JSON output · State and environment knobs · Security and privacy · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw browser`, `openclaw browser batch`, `openclaw browser click`, `openclaw browser click-coords`, `openclaw browser close`, `openclaw browser console`, `openclaw browser cookies`, `openclaw browser create-profile`

**Config:** `gateway.auth.mode`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser-control](https://docs.openclaw.ai/tools/browser-control)</sub>

---

### `/tools/browser-linux-troubleshooting` — Browser troubleshooting

**Browser troubleshooting** · *Capabilities › Browsing and fetching pages*

> Fix Chrome/Brave/Edge/Chromium CDP startup issues for OpenClaw browser control on Linux

<sub>source `docs/tools/browser-linux-troubleshooting.md` · 166 lines · 594 words · 9 code blocks</sub>

**Covers:** Problem: Failed to start Chrome CDP on port 18800 · Problem: No Chrome tabs found for profile="user" · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw browser`, `openclaw browser start`, `openclaw start`

**Config:** `gateway.port`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser-linux-troubleshooting](https://docs.openclaw.ai/tools/browser-linux-troubleshooting)</sub>

---

### `/tools/browser-login` — Browser login

**Browser login** · *Capabilities › Browsing and fetching pages*

> Manual logins for browser automation + X/Twitter posting

<sub>source `docs/tools/browser-login.md` · 83 lines · 278 words · 4 code blocks</sub>

**Read when:** You need to log into sites for browser automation · You want to post updates to X/Twitter

**Covers:** Manual login (recommended) · Which Chrome profile is used? · Sandboxing: allow host browser access · Related

**CLI:** `openclaw browser`, `openclaw browser open`, `openclaw browser start`, `openclaw open https`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser-login](https://docs.openclaw.ai/tools/browser-login)</sub>

---

### `/tools/browser-wsl2-windows-remote-cdp-troubleshooting` — WSL2 + Windows + remote Chrome CDP troubleshooting

**WSL2 + Windows + remote Chrome CDP troubleshooting** · *Capabilities › Browsing and fetching pages*

> Troubleshoot WSL2 Gateway + Windows Chrome remote CDP in layers

<sub>source `docs/tools/browser-wsl2-windows-remote-cdp-troubleshooting.md` · 220 lines · 1103 words · 8 code blocks</sub>

**Read when:** Running OpenClaw Gateway in WSL2 while Chrome lives on Windows · Seeing overlapping browser/control-ui errors across WSL2 and Windows · Deciding between host-local Chrome MCP and raw remote CDP in split-host setups

**Covers:** Choose the right browser mode first · Working architecture · Critical rule for the Control UI · Validate in layers · Common misleading errors · Fast triage checklist · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw browser`

**Config:** `gateway.controlUi.allowedOrigins`

**TermCrab — tools: PARTIAL.** CDP browser tool exists (`src/agent/tools.ts`) but needs a system Chrome and is off by default.

<sub>live: [docs.openclaw.ai/tools/browser-wsl2-windows-remote-cdp-troubleshooting](https://docs.openclaw.ai/tools/browser-wsl2-windows-remote-cdp-troubleshooting)</sub>

---

### `/tools/chrome-extension` — Chrome Extension

**Chrome Extension** · *Capabilities › Browsing and fetching pages*

> Chrome extension: securely automate signed-in tabs with automatic local pairing

<sub>source `docs/tools/chrome-extension.md` · 694 lines · 5011 words · 15 code blocks</sub>

**Read when:** You want an agent to drive your signed-in Chrome without remote-debugging prompts · You are installing, pairing, disabling, or troubleshooting the OpenClaw Chrome extension · You need the Chrome native bootstrap security and platform support model

**Covers:** Requirements · Install · Shared setup controller · Use it · Automatic setup controls · Status and removal · Advanced manual pairing · External CDP clients · Permissions · Native bootstrap security · Troubleshooting <sub>(3 sub-sections)</sub>

**CLI:** `openclaw browser`, `openclaw browser doctor`, `openclaw browser extension`, `openclaw config set`, `openclaw doctor`, `openclaw gateway run`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/chrome-extension](https://docs.openclaw.ai/tools/chrome-extension)</sub>

---

### `/tools/firecrawl` — Firecrawl

**Firecrawl** · *Capabilities › Browsing and fetching pages*

> Firecrawl search, scrape, and webfetch fallback

<sub>source `docs/tools/firecrawl.md` · 180 lines · 788 words · 3 code blocks</sub>

**Read when:** You want Firecrawl-backed web extraction · You want keyless Firecrawl Search (Free) or keyless web_fetch · You need a Firecrawl API key for search or higher limits · You want Firecrawl as a web_search provider · You want anti-bot extraction for web_fetch

**Covers:** Install plugin · Keyless access and API keys · Configure Firecrawl search · Configure Firecrawl webfetch fallback · Firecrawl plugin tools · Stealth / bot circumvention · How webfetch uses Firecrawl · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw doctor`, `openclaw plugins install`

**Config:** `plugins.entries.firecrawl.config.webFetch.*`, `plugins.entries.firecrawl.config.webFetch.apiKey`, `plugins.entries.firecrawl.config.webFetch.baseUrl`, `plugins.entries.firecrawl.config.webSearch.apiKey`, `plugins.entries.firecrawl.config.webSearch.baseUrl`, `tools.web.fetch.firecrawl.*`, `tools.web.fetch.provider`, `tools.web.search.cacheTtlMinutes`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/firecrawl](https://docs.openclaw.ai/tools/firecrawl)</sub>

---

### `/tools/web-fetch` — Web fetch

**Web fetch** · *Capabilities › Browsing and fetching pages*

> webfetch tool -- HTTP fetch with readable content extraction

<sub>source `docs/tools/web-fetch.md` · 313 lines · 1423 words · 6 code blocks</sub>

**Read when:** You want to fetch a URL and extract readable content · You need to configure web_fetch or its Firecrawl fallback · You want to understand web_fetch limits and caching

**Covers:** Quick start · Tool parameters · Result · How it works · Progress updates · Config · Firecrawl fallback · Custom request headers · Trusted env proxy · Limits and safety · Tool profiles · Related

**CLI:** `openclaw doctor`

**Config:** `plugins.entries.firecrawl.config.webFetch`, `plugins.entries.firecrawl.config.webFetch.apiKey`, `tools.web.fetch.firecrawl.*`, `tools.web.fetch.headers`, `tools.web.fetch.maxCharsCap`, `tools.web.fetch.provider`, `tools.web.fetch.ssrfPolicy.allowIpv6UniqueLocalRange`, `tools.web.fetch.ssrfPolicy.allowRfc2544BenchmarkRange`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/web-fetch](https://docs.openclaw.ai/tools/web-fetch)</sub>

---

### `/tools/web` — Web search

**Web search** · *Capabilities › Web search*

> websearch, xsearch, and webfetch -- search the web, search X posts, or fetch page content

<sub>source `docs/tools/web.md` · 706 lines · 3413 words · 13 code blocks</sub>

**Read when:** You want to enable or configure web_search · You want to enable or configure x_search · You need to choose a search provider · You want to understand auto-detection and provider selection

**Covers:** Quick start · Search settings · Choosing a provider · Result shape · Auto-detection · Native OpenAI web search · Native Codex web search · CLI harness search · Network safety · Config · Tool parameters · xsearch · Examples · Tool profiles · _+1 more_ <sub>(5 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw doctor`, `openclaw models auth`, `openclaw onboard`, `openclaw setup`

**Config:** `models.providers.google.apiKey`, `models.providers.google.baseUrl`, `plugins.entries.brave.config.webSearch.apiKey`, `plugins.entries.exa.config.webSearch.apiKey`, `plugins.entries.exa.config.webSearch.baseUrl`, `plugins.entries.firecrawl.config.webFetch.*`, `plugins.entries.firecrawl.config.webSearch.apiKey`, `plugins.entries.google.config.webSearch.apiKey`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/web](https://docs.openclaw.ai/tools/web)</sub>

---

### `/tools/brave-search` — Brave search

**Brave search** · *Capabilities › Web search*

> Brave Search API setup for websearch

<sub>source `docs/tools/brave-search.md` · 140 lines · 535 words · 2 code blocks</sub>

**Read when:** You want to use Brave Search for web_search · You need a BRAVE_API_KEY or plan details

**Covers:** Get an API key · Config example · Tool parameters · Notes · Related

**Config:** `plugins.entries.brave.config.webSearch.*`, `tools.web.search.timeoutSeconds`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/brave-search](https://docs.openclaw.ai/tools/brave-search)</sub>

---

### `/tools/duckduckgo-search` — DuckDuckGo search

**DuckDuckGo search** · *Capabilities › Web search*

> DuckDuckGo web search -- key-free provider (experimental, HTML-based)

<sub>source `docs/tools/duckduckgo-search.md` · 103 lines · 257 words · 4 code blocks</sub>

**Read when:** You want a web search provider that requires no API key · You want to use DuckDuckGo for web_search · You want an explicitly selected key-free search provider

**Covers:** Setup · Config · Tool parameters · Notes · Related

**CLI:** `openclaw configure`, `openclaw plugins install`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/duckduckgo-search](https://docs.openclaw.ai/tools/duckduckgo-search)</sub>

---

### `/tools/exa-search` — Exa search

**Exa search** · *Capabilities › Web search*

> Exa AI search -- neural and keyword search with content extraction

<sub>source `docs/tools/exa-search.md` · 154 lines · 429 words · 4 code blocks</sub>

**Read when:** You want to use Exa for web_search · You need an EXA_API_KEY · You want neural search or content extraction

**Covers:** Install plugin · Get an API key · Config · Base URL override · Tool parameters · Notes · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw plugins install`

**Config:** `plugins.entries.exa.config.webSearch.baseUrl`, `tools.web.search.cacheTtlMinutes`, `tools.web.search.timeoutSeconds`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/exa-search](https://docs.openclaw.ai/tools/exa-search)</sub>

---

### `/tools/gemini-search` — Gemini search

**Gemini search** · *Capabilities › Web search*

> Gemini web search with Google Search grounding

<sub>source `docs/tools/gemini-search.md` · 145 lines · 556 words · 2 code blocks</sub>

**Read when:** You want to use Gemini for web_search · You need a GEMINI_API_KEY or models.providers.google.apiKey · You want Google Search grounding · Your Gemini gateway requires request headers

**Covers:** Get an API key · Config · How it works · Supported parameters · Model selection · Base URL overrides · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw configure`

**Config:** `models.providers.google.apiKey`, `models.providers.google.baseUrl`, `models.providers.google.headers`, `plugins.entries.google.config.webSearch.apiKey`, `plugins.entries.google.config.webSearch.baseUrl`, `plugins.entries.google.config.webSearch.headers`, `plugins.entries.google.config.webSearch.model`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/gemini-search](https://docs.openclaw.ai/tools/gemini-search)</sub>

---

### `/tools/grok-search` — Grok search

**Grok search** · *Capabilities › Web search*

> Grok web search via xAI web-grounded responses

<sub>source `docs/tools/grok-search.md` · 128 lines · 511 words · 3 code blocks</sub>

**Read when:** You want to use Grok for web_search · You want to use xAI OAuth or an XAI_API_KEY for web search

**Covers:** Onboarding and configure · Sign in or get an API key · Config · How it works · Supported parameters · Base URL overrides · Related

**CLI:** `openclaw config set`, `openclaw configure`, `openclaw models auth`, `openclaw onboard`, `openclaw plugins install`

**Config:** `plugins.entries.xai.config.webSearch.apiKey`, `plugins.entries.xai.config.webSearch.baseUrl`, `plugins.entries.xai.config.xSearch.baseUrl`, `tools.web.search.timeoutSeconds`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/grok-search](https://docs.openclaw.ai/tools/grok-search)</sub>

---

### `/tools/kimi-search` — Kimi search

**Kimi search** · *Capabilities › Web search*

> Kimi web search via Moonshot web search

<sub>source `docs/tools/kimi-search.md` · 107 lines · 371 words · 3 code blocks</sub>

**Read when:** You want to use Kimi for web_search · You need a KIMI_API_KEY or MOONSHOT_API_KEY

**Covers:** Setup · Config · Grounding requirement · Tool parameters · Related

**CLI:** `openclaw configure`, `openclaw onboard`, `openclaw plugins install`

**Config:** `models.providers.moonshot.baseUrl`, `plugins.entries.moonshot.config.webSearch`, `tools.web.search.provider`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/kimi-search](https://docs.openclaw.ai/tools/kimi-search)</sub>

---

### `/tools/minimax-search` — MiniMax search

**MiniMax search** · *Capabilities › Web search*

> MiniMax Search via the Token Plan search API

<sub>source `docs/tools/minimax-search.md` · 97 lines · 313 words · 2 code blocks</sub>

**Read when:** You want to use MiniMax for web_search · You need a MiniMax Token Plan key or OAuth token · You want MiniMax CN/global search host guidance

**Covers:** Get a Token Plan credential · Config · Region selection · Supported parameters · Related

**CLI:** `openclaw configure`

**Config:** `models.providers.minimax-portal.baseUrl`, `models.providers.minimax.baseUrl`, `plugins.entries.minimax.config.webSearch.region`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/minimax-search](https://docs.openclaw.ai/tools/minimax-search)</sub>

---

### `/tools/ollama-search` — Ollama web search

**Ollama web search** · *Capabilities › Web search*

> Ollama Web Search via a local Ollama host or the hosted Ollama API

<sub>source `docs/tools/ollama-search.md` · 157 lines · 422 words · 6 code blocks</sub>

**Read when:** You want to use Ollama for web_search · You want a key-free web_search provider · You want to use hosted Ollama Web Search with OLLAMA_API_KEY · You need Ollama Web Search setup guidance

**Covers:** Setup · Config · Auth and request routing · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw configure`

**Config:** `models.providers.ollama.apiKey`, `models.providers.ollama.baseUrl`, `plugins.entries.ollama.config.webSearch.baseUrl`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/ollama-search](https://docs.openclaw.ai/tools/ollama-search)</sub>

---

### `/tools/parallel-search` — Parallel search

**Parallel search** · *Capabilities › Web search*

> Parallel Search -- LLM-optimized dense excerpts from web sources

<sub>source `docs/tools/parallel-search.md` · 163 lines · 668 words · 3 code blocks</sub>

**Read when:** You want web search without an API key · You want Parallel's paid Search API · You want dense excerpts ranked for LLM context efficiency

**Covers:** Install plugin · API key (paid provider) · Config · Base URL override · Tool parameters · Notes · Related

**CLI:** `openclaw configure`, `openclaw plugins install`

**Config:** `plugins.entries.parallel.config.webSearch.baseUrl`, `tools.web.search.maxResults`, `tools.web.search.provider`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/parallel-search](https://docs.openclaw.ai/tools/parallel-search)</sub>

---

### `/tools/perplexity-search` — Perplexity search

**Perplexity search** · *Capabilities › Web search*

> Perplexity Search API and Sonar/OpenRouter compatibility for websearch

<sub>source `docs/tools/perplexity-search.md` · 220 lines · 473 words · 4 code blocks</sub>

**Read when:** You want to use Perplexity Search for web search · You need PERPLEXITY_API_KEY or OPENROUTER_API_KEY setup

**Covers:** Install plugin · Getting a Perplexity API key · OpenRouter compatibility · Config examples · Where to set the key · Tool parameters · Notes · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw plugins install`

**Config:** `plugins.entries.perplexity.config.webSearch.apiKey`, `plugins.entries.perplexity.config.webSearch.baseUrl`, `plugins.entries.perplexity.config.webSearch.model`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/perplexity-search](https://docs.openclaw.ai/tools/perplexity-search)</sub>

---

### `/tools/searxng-search` — SearXNG search

**SearXNG search** · *Capabilities › Web search*

> SearXNG web search -- self-hosted, key-free meta-search provider

<sub>source `docs/tools/searxng-search.md` · 146 lines · 532 words · 7 code blocks</sub>

**Read when:** You want a self-hosted web search provider · You want to use SearXNG for web_search · You need a privacy-focused or air-gapped search option

**Covers:** Setup · Config · Environment variable · Plugin config reference · Notes · Related

**CLI:** `openclaw configure`, `openclaw plugins install`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/searxng-search](https://docs.openclaw.ai/tools/searxng-search)</sub>

---

### `/tools/tavily` — Tavily

**Tavily** · *Capabilities › Web search*

> Tavily search and extract tools

<sub>source `docs/tools/tavily.md` · 174 lines · 824 words · 2 code blocks</sub>

**Read when:** You want Tavily-backed web search · You need a Tavily API key · You want Tavily as a web_search provider · You want content extraction from URLs

**Covers:** Getting started · Tool reference · Choosing the right tool · Advanced configuration · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw plugins install`

**Config:** `plugins.entries.tavily.config.webSearch.apiKey`, `plugins.entries.tavily.config.webSearch.baseUrl`, `tools.web.search.cacheTtlMinutes`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/tavily](https://docs.openclaw.ai/tools/tavily)</sub>

---

### `/tools/agent-send` — Agent send

**Agent send** · *Capabilities › Agent coordination*

> Run agent turns from the CLI and optionally deliver replies to channels

<sub>source `docs/tools/agent-send.md` · 161 lines · 570 words · 5 code blocks</sub>

**Read when:** You want to trigger agent runs from scripts or the command line · You need to deliver agent replies to a chat channel programmatically

**Covers:** Quick start · Flags · Behavior · Examples · Related

**CLI:** `openclaw agent`, `openclaw agent exec`

**Config:** `session.dmScope`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/agent-send](https://docs.openclaw.ai/tools/agent-send)</sub>

---

### `/tools/goal` — Goal

**Goal** · *Capabilities › Agent coordination*

> Session goals: durable per-session objectives, /goal controls, model goal tools, token budgets, and TUI status

<sub>source `docs/tools/goal.md` · 321 lines · 2328 words · 3 code blocks</sub>

**Read when:** You want OpenClaw to keep one objective visible across a long session · You need to pause, resume, block, complete, or clear a session goal · You want to understand the get_goal, create_goal, and update_goal tools · You want to use the Goal composer in the Control UI or see goals in the TUI

**Covers:** Quick start · What goals are for · Command reference · Statuses · Token budgets · Model tools · Goal context on every turn · Control UI · TUI · Channel behavior · Troubleshooting · Related <sub>(1 sub-sections)</sub>

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/goal](https://docs.openclaw.ai/tools/goal)</sub>

---

### `/tools/steer` — Steer

**Steer** · *Capabilities › Agent coordination*

> Steer an active run without changing queue mode

<sub>source `docs/tools/steer.md` · 82 lines · 400 words · 2 code blocks</sub>

**Read when:** Using /steer or /tell while an agent is already running · Comparing /steer with /queue modes · Deciding whether to steer the current run or an ACP session

**Covers:** Current session · Steer vs queue · Sub-agents · ACP sessions · Related

**CLI:** `openclaw chat`, `openclaw tui`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/steer](https://docs.openclaw.ai/tools/steer)</sub>

---

### `/tools/subagents` — Sub-agents

**Sub-agents** · *Capabilities › Agent coordination*

> Index of the OpenClaw sub-agent documentation, one page per reader job

<sub>source `docs/tools/subagents.md` · 147 lines · 796 words</sub>

**Read when:** You want background or parallel work via the agent · You are changing sessions_spawn or sub-agent tool policy · You are implementing or troubleshooting thread-bound subagent sessions · You are looking for the sub-agent page that matches your task

**Covers:** Where each section moved · Related

**Config:** `agents.defaults.subagents.allowAgents`, `agents.defaults.subagents.announceTimeoutMs`, `agents.defaults.subagents.model`, `agents.defaults.subagents.requireAgentId`, `agents.entries.*.subagents.allowAgents`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents](https://docs.openclaw.ai/tools/subagents)</sub>

---

### `/tools/subagents/slash-command` — Sub-agent slash command

**Sub-agent slash command** · *Capabilities › Sub-agents*

> Inspect sub-agent runs with /subagents, use the thread-binding commands, and follow the completion-delivery path

<sub>source `docs/tools/subagents/slash-command.md` · 125 lines · 1392 words · 2 code blocks</sub>

**Read when:** You want to inspect or log a sub-agent run from chat · You need the thread-binding slash commands · You are debugging how a completed child reaches the requester

**Covers:** Slash command <sub>(2 sub-sections)</sub>

**Config:** `agents.entries.*`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/slash-command](https://docs.openclaw.ai/tools/subagents/slash-command)</sub>

---

### `/tools/subagents/tool-reference` — Sub-agent tool reference

**Sub-agent tool reference** · *Capabilities › Sub-agents*

> Context modes and the sessionsspawn, sessionsyield, and subagents tool contracts

<sub>source `docs/tools/subagents/tool-reference.md` · 450 lines · 4662 words · 3 code blocks</sub>

**Read when:** You are calling sessions_spawn and need its parameters · You need to choose between isolated and forked child context · You are waiting for child results with sessions_yield

**Covers:** Context modes · Tool: sessionsspawn · Tool: sessionsyield · Tool: subagents <sub>(4 sub-sections)</sub>

**CLI:** `openclaw agent`

**Config:** `agents.defaults.subagents.delegationMode`, `agents.defaults.subagents.model`, `agents.defaults.subagents.runTimeoutSeconds`, `agents.defaults.subagents.thinking`, `agents.defaults.timeoutSeconds`, `agents.entries.*`, `agents.entries.*.subagents.delegationMode`, `agents.entries.*.subagents.model`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/tool-reference](https://docs.openclaw.ai/tools/subagents/tool-reference)</sub>

---

### `/tools/subagents/thread-bound-sessions` — Thread-bound sub-agent sessions

**Thread-bound sub-agent sessions** · *Capabilities › Sub-agents*

> Bind a sub-agent to a channel thread, and the allowlist, discovery, and auto-archive rules

<sub>source `docs/tools/subagents/thread-bound-sessions.md` · 115 lines · 763 words</sub>

**Read when:** You are implementing or troubleshooting thread-bound subagent sessions · You need the per-agent spawn allowlist or agents_list discovery rules · You need to know when a sub-agent session is archived

**Covers:** Thread-bound sessions <sub>(7 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.subagents.archiveAfterMinutes`, `agents.entries.*`, `agents.entries.*.subagents.requireAgentId`, `session.threadBindings.enabled`, `session.threadBindings.idleHours`, `session.threadBindings.maxAgeHours`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/thread-bound-sessions](https://docs.openclaw.ai/tools/subagents/thread-bound-sessions)</sub>

---

### `/tools/subagents/nesting` — Nested sub-agents and authentication

**Nested sub-agents and authentication** · *Capabilities › Sub-agents*

> Recursive delegation depth, the announce chain, cascade stop, and how sub-agent auth and memory audience resolve

<sub>source `docs/tools/subagents/nesting.md` · 128 lines · 895 words · 1 code blocks</sub>

**Read when:** You are building an orchestrator that spawns its own children · You need the depth caps and per-agent child limits · You need to know which auth profile a sub-agent uses · You need to know how a child inherits memory audience

**Covers:** Nested sub-agents · Authentication <sub>(7 sub-sections)</sub>

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/nesting](https://docs.openclaw.ai/tools/subagents/nesting)</sub>

---

### `/tools/subagents/announce` — Sub-agent announce

**Sub-agent announce** · *Capabilities › Sub-agents*

> How a sub-agent reports its result back, the announce context block, and why sessionshistory is preferred

<sub>source `docs/tools/subagents/announce.md` · 164 lines · 1466 words</sub>

**Read when:** You are debugging a missing or duplicated completion · You need the fields in the announce context block · You are reading a child transcript from inside an agent turn

**Covers:** Announce <sub>(4 sub-sections)</sub>

**Config:** `models.providers.*.models[].cost`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/announce](https://docs.openclaw.ai/tools/subagents/announce)</sub>

---

### `/tools/subagents/tool-policy` — Sub-agent tool policy

**Sub-agent tool policy** · *Capabilities › Sub-agents*

> The sub-agent tool restriction layer and how to narrow it with config

<sub>source `docs/tools/subagents/tool-policy.md` · 83 lines · 364 words · 2 code blocks</sub>

**Read when:** You need to know which tools a sub-agent always loses · You want to allow or deny specific tools for sub-agents

**Covers:** Tool policy <sub>(1 sub-sections)</sub>

**Config:** `tools.profile`, `tools.subagents.tools.allow`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/tool-policy](https://docs.openclaw.ai/tools/subagents/tool-policy)</sub>

---

### `/tools/subagents/operations` — Sub-agent concurrency, recovery, and stopping

**Sub-agent concurrency, recovery, and stopping** · *Capabilities › Sub-agents*

> The subagent queue lane, restart recovery, stop scope, and the standing limitations

<sub>source `docs/tools/subagents/operations.md` · 195 lines · 1728 words</sub>

**Read when:** You are tuning sub-agent concurrency or investigating a delivery backlog · A Gateway restart interrupted a sub-agent run · You need the exact scope of Stop and /stop

**Covers:** Concurrency · Liveness and recovery · Stopping · Limitations

**Config:** `agents.defaults.subagents.maxConcurrent`, `tools.swarm.maxConcurrent`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/subagents/operations](https://docs.openclaw.ai/tools/subagents/operations)</sub>

---

### `/tools/swarm` — Swarm

**Swarm** · *Capabilities › Agent coordination*

> Orchestrate concurrent sub-agents from Code Mode scripts with structured results, bounded fan-out, and live progress

<sub>source `docs/tools/swarm.md` · 618 lines · 2887 words · 10 code blocks</sub>

**Read when:** You want a Code Mode script to fan out work across several agents · You need structured child results, decision gates, or first-completion pipelines · You are disabling Swarm or tuning tools.swarm limits · You want to observe collector children in chat

**Covers:** When to use Swarm · Enable Swarm · Requirements · Write a Swarm script · How collector children behave · Observe a Swarm · Stop a Swarm · Use Swarm from other harnesses · Limits · Related <sub>(4 sub-sections)</sub>

**Config:** `agents.defaults.subagents.maxChildrenPerAgent`, `agents.defaults.subagents.maxConcurrent`, `agents.entries.*.tools.swarm`, `agents.run`, `tools.*`, `tools.codeMode`, `tools.codeMode.maxPendingToolCalls`, `tools.swarm`

**TermCrab — agents: PARTIAL.** `sessions_spawn` / `agents_wait` / `sessions_yield` exist (`src/agent/toolbox.ts:798+`); no lanes, no worktrees, no parallel batch execution.

<sub>live: [docs.openclaw.ai/tools/swarm](https://docs.openclaw.ai/tools/swarm)</sub>

---

### `/tools/acp-agents` — ACP agents

**ACP agents** · *Capabilities › Agent coordination*

> Index of the OpenClaw ACP agents documentation, one page per reader job

<sub>source `docs/tools/acp-agents.md` · 166 lines · 922 words</sub>

**Read when:** Running coding harnesses through ACP · Setting up conversation-bound ACP sessions on messaging channels · Binding a message-channel conversation to a persistent ACP session · Troubleshooting ACP backend, plugin wiring, or completion delivery · Operating /acp commands from chat · You are looking for the ACP agents page that matches your task

**Covers:** Which page do I want? · ACP agents documentation pages · ACP versus sub-agents · How ACP runs Claude Code · acpx harness, plugin setup, and permissions · Where each section moved · Related

**CLI:** `openclaw acp`, `openclaw mcp serve`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents](https://docs.openclaw.ai/tools/acp-agents)</sub>

---

### `/tools/acp-agents/quickstart` — ACP agents quickstart

**ACP agents quickstart** · *Capabilities › ACP agents*

> Install the acpx ACP runtime plugin, confirm it is usable, and pick a harness target id

<sub>source `docs/tools/acp-agents/quickstart.md` · 100 lines · 914 words · 1 code blocks</sub>

**Read when:** You are installing or enabling the ACP runtime plugin · You need the first-run gotchas and runtime prerequisites · You need the supported harness target ids for /acp spawn

**Covers:** Does this work out of the box? · Supported harness targets

**CLI:** `openclaw acp`, `openclaw config set`, `openclaw doctor`, `openclaw plugins install`

**Config:** `agents.entries.*.runtime.acp.agent`, `plugins.allow`, `plugins.entries.acpx.config.stateDir`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/quickstart](https://docs.openclaw.ai/tools/acp-agents/quickstart)</sub>

---

### `/tools/acp-agents/runbook` — ACP agents operator runbook

**ACP agents operator runbook** · *Capabilities › ACP agents*

> Day-to-day /acp flow from chat, ACP session lifecycle, and native Codex versus ACP routing

<sub>source `docs/tools/acp-agents/runbook.md` · 107 lines · 767 words</sub>

**Read when:** You are operating /acp commands from chat · You need the ACP session lifecycle rules · You need to know when a request routes to native Codex instead of ACP

**Covers:** Operator runbook

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/runbook](https://docs.openclaw.ai/tools/acp-agents/runbook)</sub>

---

### `/tools/acp-agents/bindings` — ACP agents bindings

**ACP agents bindings** · *Capabilities › ACP agents*

> Bind a conversation or thread to an ACP session, and configure persistent bindings[] entries

<sub>source `docs/tools/acp-agents/bindings.md` · 247 lines · 1032 words · 2 code blocks</sub>

**Read when:** Binding a message-channel conversation to a persistent ACP session · Setting up conversation-bound ACP sessions on messaging channels · You are configuring top-level bindings[] entries with type acp

**Covers:** Bound sessions · Persistent channel bindings <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.model`, `agents.defaults.model.fallbacks`, `agents.defaults.thinkingDefault`, `agents.entries.*.model.primary`, `agents.entries.*.runtime`, `agents.entries.*.runtime.acp.*`, `agents.entries.*.runtime.acp.agent`, `agents.entries.*.runtime.acp.backend`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/bindings](https://docs.openclaw.ai/tools/acp-agents/bindings)</sub>

---

### `/tools/acp-agents/sessions` — ACP agents sessions

**ACP agents sessions** · *Capabilities › ACP agents*

> Start ACP sessions from sessionsspawn or /acp spawn, with the parameter and mode reference

<sub>source `docs/tools/acp-agents/sessions.md` · 164 lines · 685 words · 2 code blocks</sub>

**Read when:** You are starting an ACP session from an agent turn or from chat · You need the sessions_spawn parameter reference for runtime acp · You need the --bind and --thread mode tables

**Covers:** Start ACP sessions · Spawn bind and thread modes <sub>(1 sub-sections)</sub>

**Config:** `agents.defaults.subagents.model`, `agents.defaults.subagents.runTimeoutSeconds`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/sessions](https://docs.openclaw.ai/tools/acp-agents/sessions)</sub>

---

### `/tools/acp-agents/delivery` — ACP agents delivery model

**ACP agents delivery model** · *Capabilities › ACP agents*

> How ACP output is delivered for interactive and parent-owned sessions, and the sandbox boundary

<sub>source `docs/tools/acp-agents/delivery.md` · 143 lines · 1034 words · 1 code blocks</sub>

**Read when:** Troubleshooting ACP completion delivery or agent-to-agent loops · You are resuming an existing ACP session · You need the ACP sandbox security boundary

**Covers:** Delivery model · Sandbox compatibility

**Config:** `tools.sessions.visibility`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/delivery](https://docs.openclaw.ai/tools/acp-agents/delivery)</sub>

---

### `/tools/acp-agents/controls` — ACP agents controls

**ACP agents controls** · *Capabilities › ACP agents*

> Session target resolution and the full /acp command and runtime option reference

<sub>source `docs/tools/acp-agents/controls.md` · 109 lines · 958 words</sub>

**Read when:** Operating /acp commands from chat · You need the /acp command reference · You need the runtime option mapping for a backend

**Covers:** Session target resolution · ACP controls <sub>(2 sub-sections)</sub>

**Config:** `session.store`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/controls](https://docs.openclaw.ai/tools/acp-agents/controls)</sub>

---

### `/tools/acp-agents/troubleshooting` — ACP agents troubleshooting

**ACP agents troubleshooting** · *Capabilities › ACP agents*

> Symptom, likely cause, and fix for ACP backend, plugin wiring, and delivery failures

<sub>source `docs/tools/acp-agents/troubleshooting.md` · 56 lines · 969 words</sub>

**Read when:** Troubleshooting ACP backend, plugin wiring, or completion delivery · You hit an ACP error message and need the fix · An ACP session stalls, fails early, or leaks internal context

**Covers:** Troubleshooting · Oversized harness messages

**Config:** `plugins.allow`, `plugins.entries.acpx.config.permissionMode`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents/troubleshooting](https://docs.openclaw.ai/tools/acp-agents/troubleshooting)</sub>

---

### `/tools/acp-agents-setup` — ACP agents — setup

**ACP agents — setup** · *Capabilities › Agent coordination*

> Setting up ACP agents: acpx harness config, plugin setup, permissions

<sub>source `docs/tools/acp-agents-setup.md` · 443 lines · 2200 words · 14 code blocks</sub>

**Read when:** Installing or configuring the acpx harness for Claude Code / Codex / Gemini CLI · Enabling the plugin-tools or OpenClaw-tools MCP bridge · Configuring ACP permission modes

**Covers:** acpx harness support (current) · GitHub Copilot CLI in native chat · Permissions for native chat runtimes · Required config · Repair existing bare-session histories · Plugin setup for acpx backend · Permission configuration · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw acp`, `openclaw config set`, `openclaw doctor`, `openclaw plugins install`

**Config:** `agents.defaults.subagents.runTimeoutSeconds`, `plugins.allow`, `plugins.deny`, `plugins.entries.acpx.config.nativeAgents.copilot`, `plugins.entries.acpx.config.timeoutSeconds`, `providers.json`, `tools.exec.mode`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/acp-agents-setup](https://docs.openclaw.ai/tools/acp-agents-setup)</sub>

---

### `/tools/multi-agent-sandbox-tools` — Multi-agent sandbox and tools

**Multi-agent sandbox and tools** · *Capabilities › Agent coordination*

> Per-agent sandbox + tool restrictions, precedence, and examples

<sub>source `docs/tools/multi-agent-sandbox-tools.md` · 472 lines · 974 words · 14 code blocks</sub>

**Covers:** Configuration examples · Configuration precedence · Migration from single agent · Tool restriction examples · Common pitfall: "non-main" · Testing · Troubleshooting · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agents list`, `openclaw doctor`, `openclaw logs`

**Config:** `agents.defaults.*`, `agents.defaults.sandbox.mode`, `agents.entries`, `agents.entries.*.*`, `agents.entries.*.tools.byProvider[provider].profile`, `agents.entries.*.tools.elevated`, `agents.entries.*.tools.profile`, `agents.entries.*.tools.sandbox.tools`

**TermCrab — tools: PARTIAL.** ~54 tools across `src/agent/tools.ts` + `src/agent/toolbox.ts` vs OpenClaw's plugin-provided tool surface.

<sub>live: [docs.openclaw.ai/tools/multi-agent-sandbox-tools](https://docs.openclaw.ai/tools/multi-agent-sandbox-tools)</sub>

---
