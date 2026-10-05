# Gateway & Ops

<sub>Generated catalogue of **218 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/gateway`](#gateway-gateway-runbook) — Gateway runbook
- [`/gateway/configuration`](#gatewayconfiguration-configuration) — Configuration
- [`/gateway/configuration/common-tasks`](#gatewayconfigurationcommon-tasks-common-tasks) — Common tasks
- [`/gateway/configuration/hot-reload`](#gatewayconfigurationhot-reload-config-hot-reload) — Config hot reload
- [`/gateway/configuration/config-rpc`](#gatewayconfigurationconfig-rpc-config-rpc-programmatic-updates) — Config RPC (programmatic updates)
- [`/gateway/configuration/environment-variables`](#gatewayconfigurationenvironment-variables-environment-variables) — Environment variables
- [`/gateway/configuration-reference`](#gatewayconfiguration-reference-configuration-reference) — Configuration reference
- [`/gateway/config-agents`](#gatewayconfig-agents-configuration-agents) — Configuration — agents
- [`/gateway/config-agents/workspace-and-bootstrap`](#gatewayconfig-agentsworkspace-and-bootstrap-configuration-agent-workspace-and-bootstrap) — Configuration — agent workspace and bootstrap
- [`/gateway/config-agents/models`](#gatewayconfig-agentsmodels-configuration-agent-models) — Configuration — agent models
- [`/gateway/config-agents/runtime-and-cli-backends`](#gatewayconfig-agentsruntime-and-cli-backends-configuration-agent-runtime-and-cli-backends) — Configuration — agent runtime and CLI backends
- [`/gateway/config-agents/heartbeat-compaction-and-streaming`](#gatewayconfig-agentsheartbeat-compaction-and-streaming-configuration-agent-heartbeat-compaction-and-streaming) — Configuration — agent heartbeat, compaction, and streaming
- [`/gateway/config-agents/sandbox`](#gatewayconfig-agentssandbox-configuration-agent-sandboxing) — Configuration — agent sandboxing
- [`/gateway/config-agents/entries-and-multi-agent`](#gatewayconfig-agentsentries-and-multi-agent-configuration-per-agent-entries-and-multi-agent-routing) — Configuration — per-agent entries and multi-agent routing
- [`/gateway/config-agents/sessions`](#gatewayconfig-agentssessions-configuration-agent-sessions) — Configuration — agent sessions
- [`/gateway/config-agents/messages-and-talk`](#gatewayconfig-agentsmessages-and-talk-configuration-messages-and-talk) — Configuration — messages and talk
- [`/gateway/config-automation`](#gatewayconfig-automation-configuration-automations-and-media-template-variables) — Configuration — automations and media template variables
- [`/gateway/config-browser-ui-desktop`](#gatewayconfig-browser-ui-desktop-configuration-browser-ui-and-desktop) — Configuration — browser, UI, and desktop
- [`/gateway/config-channels`](#gatewayconfig-channels-configuration-channels) — Configuration — channels
- [`/gateway/config-channels/shared-policies`](#gatewayconfig-channelsshared-policies-configuration-shared-channel-policies) — Configuration — shared channel policies
- [`/gateway/config-channels/personal-messaging`](#gatewayconfig-channelspersonal-messaging-configuration-personal-messaging-channels) — Configuration — personal messaging channels
- [`/gateway/config-channels/workplace-chat`](#gatewayconfig-channelsworkplace-chat-configuration-workplace-chat-channels) — Configuration — workplace chat channels
- [`/gateway/config-channels/community-chat`](#gatewayconfig-channelscommunity-chat-configuration-community-chat-channels) — Configuration — community chat channels
- [`/gateway/config-channels/mention-gating-and-history`](#gatewayconfig-channelsmention-gating-and-history-configuration-group-mention-gating-and-history) — Configuration — group mention gating and history
- [`/gateway/config-channels/commands`](#gatewayconfig-channelscommands-configuration-chat-commands) — Configuration — chat commands
- [`/gateway/config-cloud-workers`](#gatewayconfig-cloud-workers-configuration-cloud-worker-environments) — Configuration — cloud worker environments
- [`/gateway/config-extensions`](#gatewayconfig-extensions-configuration-mcp-skills-and-plugins) — Configuration — MCP, skills, and plugins
- [`/gateway/config-gateway`](#gatewayconfig-gateway-configuration-gateway) — Configuration — gateway
- [`/gateway/config-hooks`](#gatewayconfig-hooks-configuration-hooks) — Configuration — hooks
- [`/gateway/config-observability`](#gatewayconfig-observability-configuration-audit-logging-diagnostics-and-telemetry) — Configuration — audit, logging, diagnostics, and telemetry
- [`/gateway/config-runtime`](#gatewayconfig-runtime-configuration-runtime-basics) — Configuration — runtime basics
- [`/gateway/config-secrets-env`](#gatewayconfig-secrets-env-configuration-environment-secrets-and-includes) — Configuration — environment, secrets, and includes
- [`/gateway/config-tools`](#gatewayconfig-tools-configuration-tools-and-custom-providers) — Configuration — tools and custom providers
- [`/gateway/config-tools/tool-policy`](#gatewayconfig-toolstool-policy-configuration-tool-policy) — Configuration — tool policy
- [`/gateway/config-tools/github-identity`](#gatewayconfig-toolsgithub-identity-configuration-github-identity-for-agent-tools) — Configuration — GitHub identity for agent tools
- [`/gateway/config-tools/built-in-tools`](#gatewayconfig-toolsbuilt-in-tools-configuration-built-in-tool-settings) — Configuration — built-in tool settings
- [`/gateway/config-tools/sessions-and-subagents`](#gatewayconfig-toolssessions-and-subagents-configuration-cross-agent-session-and-subagent-tools) — Configuration — cross-agent, session, and subagent tools
- [`/gateway/config-tools/custom-providers`](#gatewayconfig-toolscustom-providers-configuration-custom-providers-and-base-urls) — Configuration — custom providers and base URLs
- [`/gateway/config-tools/provider-examples`](#gatewayconfig-toolsprovider-examples-configuration-provider-examples) — Configuration — provider examples
- [`/gateway/configuration-examples`](#gatewayconfiguration-examples-configuration-examples) — Configuration examples
- [`/gateway/authentication`](#gatewayauthentication-authentication) — Authentication
- [`/auth-credential-semantics`](#auth-credential-semantics-auth-credential-semantics) — Auth credential semantics
- [`/gateway/secrets`](#gatewaysecrets-secrets-management) — Secrets management
- [`/gateway/secrets/runtime-model`](#gatewaysecretsruntime-model-secrets-runtime-model) — Secrets runtime model
- [`/gateway/secrets/secretref-contract`](#gatewaysecretssecretref-contract-secretref-contract-and-provider-config) — SecretRef contract and provider config
- [`/gateway/secrets/secret-store-and-egress`](#gatewaysecretssecret-store-and-egress-shared-secret-store-and-egress-proxy) — Shared secret store and egress proxy
- [`/gateway/secrets/integration-examples`](#gatewaysecretsintegration-examples-secrets-integration-examples) — Secrets integration examples
- [`/gateway/secrets/operations`](#gatewaysecretsoperations-secrets-operations-and-behavior) — Secrets operations and behavior
- [`/gateway/1password`](#gateway1password-1password) — 1Password
- [`/gateway/secrets-plan-contract`](#gatewaysecrets-plan-contract-secrets-apply-plan-contract) — Secrets apply plan contract
- [`/gateway/trusted-proxy-auth`](#gatewaytrusted-proxy-auth-trusted-proxy-auth) — Trusted proxy auth
- [`/gateway/health`](#gatewayhealth-health-checks) — Health checks
- [`/gateway/doctor`](#gatewaydoctor-doctor) — Doctor
- [`/gateway/doctor/running`](#gatewaydoctorrunning-run-doctor) — Run doctor
- [`/gateway/doctor/checks`](#gatewaydoctorchecks-what-doctor-checks) — What doctor checks
- [`/gateway/doctor/config-migrations`](#gatewaydoctorconfig-migrations-config-and-migration-repairs) — Config and migration repairs
- [`/gateway/doctor/provider-repairs`](#gatewaydoctorprovider-repairs-provider-and-route-repairs) — Provider and route repairs
- [`/gateway/doctor/state-and-sessions`](#gatewaydoctorstate-and-sessions-state-session-and-plugin-repairs) — State, session, and plugin repairs
- [`/gateway/doctor/gateway-and-services`](#gatewaydoctorgateway-and-services-gateway-service-and-security-checks) — Gateway, service, and security checks
- [`/gateway/doctor/workspace-and-dreams`](#gatewaydoctorworkspace-and-dreams-workspace-tips-and-dreams-ui-actions) — Workspace tips and Dreams UI actions
- [`/gateway/audit`](#gatewayaudit-audit-history) — Audit history
- [`/gateway/telemetry`](#gatewaytelemetry-usage-telemetry-and-update-checks) — Usage telemetry and update checks
- [`/logging`](#logging-logging) — Logging
- [`/gateway/opentelemetry`](#gatewayopentelemetry-opentelemetry-export) — OpenTelemetry export
- [`/gateway/opentelemetry/setup`](#gatewayopentelemetrysetup-set-up-opentelemetry-export) — Set up OpenTelemetry export
- [`/gateway/opentelemetry/configuration`](#gatewayopentelemetryconfiguration-opentelemetry-configuration) — OpenTelemetry configuration
- [`/gateway/opentelemetry/privacy-and-trace-context`](#gatewayopentelemetryprivacy-and-trace-context-privacy-and-trace-context) — Privacy and trace context
- [`/gateway/opentelemetry/model-calls-and-metrics`](#gatewayopentelemetrymodel-calls-and-metrics-model-calls-and-exported-metrics) — Model calls and exported metrics
- [`/gateway/opentelemetry/spans-and-events`](#gatewayopentelemetryspans-and-events-exported-spans-and-diagnostic-events) — Exported spans and diagnostic events
- [`/gateway/prometheus`](#gatewayprometheus-prometheus-metrics) — Prometheus metrics
- [`/gateway/logging`](#gatewaylogging-gateway-logging) — Gateway logging
- [`/gateway/diagnostics`](#gatewaydiagnostics-diagnostics-export) — Diagnostics export
- [`/gateway/troubleshooting`](#gatewaytroubleshooting-troubleshooting) — Troubleshooting
- [`/gateway/troubleshooting/updates-and-rollbacks`](#gatewaytroubleshootingupdates-and-rollbacks-updates-and-rollbacks) — Updates and rollbacks
- [`/gateway/troubleshooting/skills-and-model-providers`](#gatewaytroubleshootingskills-and-model-providers-skills-and-model-providers) — Skills and model providers
- [`/gateway/troubleshooting/agent-replies-and-control-ui`](#gatewaytroubleshootingagent-replies-and-control-ui-agent-replies-and-control-ui) — Agent replies and Control UI
- [`/gateway/troubleshooting/gateway-service-and-process`](#gatewaytroubleshootinggateway-service-and-process-gateway-service-and-process) — Gateway service and process
- [`/gateway/troubleshooting/config-validation-and-probes`](#gatewaytroubleshootingconfig-validation-and-probes-config-validation-and-probes) — Config validation and probes
- [`/gateway/troubleshooting/channel-delivery-and-tools`](#gatewaytroubleshootingchannel-delivery-and-tools-channel-delivery-and-tools) — Channel delivery and tools
- [`/gateway/gateway-lock`](#gatewaygateway-lock-gateway-lock) — Gateway lock
- [`/gateway/background-process`](#gatewaybackground-process-background-exec-and-process-tool) — Background exec and process tool
- [`/gateway/restart-recovery`](#gatewayrestart-recovery-restart-recovery) — Restart recovery
- [`/gateway/cloud-sessions`](#gatewaycloud-sessions-cloud-sessions) — Cloud Sessions
- [`/gateway/cloud-workers`](#gatewaycloud-workers-cloud-workers) — Cloud Workers
- [`/gateway/cloud-workers/warm-images`](#gatewaycloud-workerswarm-images-cloud-worker-warm-images) — Cloud worker warm images
- [`/gateway/cloud-workers/per-project-default-profiles`](#gatewaycloud-workersper-project-default-profiles-per-project-default-profiles) — Per-project default profiles
- [`/gateway/cloud-workers/setup-and-bundle-installation`](#gatewaycloud-workerssetup-and-bundle-installation-worker-setup-and-bundle-installation) — Worker setup and bundle installation
- [`/gateway/cloud-workers/verify-the-profile`](#gatewaycloud-workersverify-the-profile-verify-a-cloud-worker-profile) — Verify a cloud worker profile
- [`/gateway/cloud-workers/dispatching-a-session`](#gatewaycloud-workersdispatching-a-session-dispatching-a-cloud-session) — Dispatching a cloud session
- [`/gateway/cloud-workers/placement-and-machine-selection`](#gatewaycloud-workersplacement-and-machine-selection-placement-and-machine-selection) — Placement and machine selection
- [`/gateway/cloud-workers/session-lifecycle`](#gatewaycloud-workerssession-lifecycle-cloud-session-lifecycle-and-durability) — Cloud session lifecycle and durability
- [`/gateway/cloud-workers/desktop`](#gatewaycloud-workersdesktop-cloud-worker-desktop) — Cloud Worker Desktop
- [`/gateway/cloud-workers/security-model`](#gatewaycloud-workerssecurity-model-cloud-worker-security-model) — Cloud worker security model
- [`/gateway/cloud-workers/troubleshooting`](#gatewaycloud-workerstroubleshooting-cloud-worker-troubleshooting) — Cloud worker troubleshooting
- [`/gateway/multiple-gateways`](#gatewaymultiple-gateways-multiple-gateways) — Multiple gateways
- [`/gateway/multi-tenant-hosting`](#gatewaymulti-tenant-hosting-multi-tenant-hosting) — Multi-tenant hosting
- [`/gateway/security`](#gatewaysecurity-security) — Security
- [`/gateway/security/trust-model`](#gatewaysecuritytrust-model-security-trust-model) — Security trust model
- [`/gateway/security/running-the-audit`](#gatewaysecurityrunning-the-audit-running-the-security-audit) — Running the security audit
- [`/gateway/security/audit-checks`](#gatewaysecurityaudit-checks-security-audit-checks) — Security audit checks
- [`/gateway/security/hardened-baseline`](#gatewaysecurityhardened-baseline-hardened-baselines) — Hardened baselines
- [`/gateway/security/access-control`](#gatewaysecurityaccess-control-access-control-and-allowlists) — Access control and allowlists
- [`/gateway/security/prompt-injection`](#gatewaysecurityprompt-injection-prompt-injection) — Prompt injection
- [`/gateway/security/tool-permissions`](#gatewaysecuritytool-permissions-tool-and-agent-permissions) — Tool and agent permissions
- [`/gateway/security/browser-control`](#gatewaysecuritybrowser-control-browser-control-risks) — Browser control risks
- [`/gateway/security/network-exposure`](#gatewaysecuritynetwork-exposure-network-exposure) — Network exposure
- [`/gateway/security/secrets-and-storage`](#gatewaysecuritysecrets-and-storage-secrets-storage-and-logs) — Secrets, storage, and logs
- [`/gateway/security/exposure-runbook`](#gatewaysecurityexposure-runbook-gateway-exposure-runbook) — Gateway exposure runbook
- [`/gateway/security/rate-limiting`](#gatewaysecurityrate-limiting-rate-limiting) — Rate limiting
- [`/gateway/security/operator-incident-response`](#gatewaysecurityoperator-incident-response-operator-incident-response) — Operator incident response
- [`/gateway/security/secure-file-operations`](#gatewaysecuritysecure-file-operations-secure-file-operations) — Secure file operations
- [`/gateway/operator-scopes`](#gatewayoperator-scopes-operator-scopes) — Operator scopes
- [`/gateway/sandboxing`](#gatewaysandboxing-sandboxing) — Sandboxing
- [`/gateway/sandboxing/what-gets-sandboxed`](#gatewaysandboxingwhat-gets-sandboxed-what-gets-sandboxed) — What gets sandboxed
- [`/gateway/sandboxing/modes-scope-and-backend`](#gatewaysandboxingmodes-scope-and-backend-modes-scope-and-backend) — Modes, scope, and backend
- [`/gateway/sandboxing/supported-capability-matrix`](#gatewaysandboxingsupported-capability-matrix-supported-capability-matrix) — Supported capability matrix
- [`/gateway/sandboxing/docker-backend`](#gatewaysandboxingdocker-backend-docker-backend) — Docker backend
- [`/gateway/sandboxing/podman-backend`](#gatewaysandboxingpodman-backend-podman-backend) — Podman backend
- [`/gateway/sandboxing/ssh-backend`](#gatewaysandboxingssh-backend-ssh-backend) — SSH backend
- [`/gateway/sandboxing/openshell-backend`](#gatewaysandboxingopenshell-backend-openshell-backend) — OpenShell backend
- [`/gateway/sandboxing/crabbox-backend`](#gatewaysandboxingcrabbox-backend-crabbox-backend) — Crabbox backend
- [`/gateway/sandboxing/workspace-access`](#gatewaysandboxingworkspace-access-workspace-access) — Workspace access
- [`/gateway/sandboxing/multiple-folders-for-one-agent`](#gatewaysandboxingmultiple-folders-for-one-agent-multiple-folders-for-one-agent) — Multiple folders for one agent
- [`/gateway/sandboxing/images-and-setup`](#gatewaysandboxingimages-and-setup-images-and-setup) — Images and setup
- [`/gateway/sandboxing/setup-command`](#gatewaysandboxingsetup-command-setupcommand-one-time-container-setup) — setupCommand (one-time container setup)
- [`/gateway/openshell`](#gatewayopenshell-openshell) — OpenShell
- [`/gateway/sandbox-vs-tool-policy-vs-elevated`](#gatewaysandbox-vs-tool-policy-vs-elevated-sandbox-vs-tool-policy-vs-elevated) — Sandbox vs tool policy vs elevated
- [`/gateway/permission-modes`](#gatewaypermission-modes-session-permission-modes) — Session permission modes
- [`/gateway/clients`](#gatewayclients-building-a-gateway-client) — Building a Gateway client
- [`/gateway/external-apps`](#gatewayexternal-apps-gateway-integrations-for-external-apps) — Gateway integrations for external apps
- [`/gateway/protocol`](#gatewayprotocol-gateway-protocol) — Gateway protocol
- [`/gateway/protocol/transport`](#gatewayprotocoltransport-gateway-protocol-transport) — Gateway protocol transport
- [`/gateway/protocol/handshake`](#gatewayprotocolhandshake-gateway-protocol-handshake) — Gateway protocol handshake
- [`/gateway/protocol/presence`](#gatewayprotocolpresence-gateway-protocol-presence-and-events) — Gateway protocol presence and events
- [`/gateway/protocol/rpc-methods`](#gatewayprotocolrpc-methods-gateway-protocol-rpc-methods) — Gateway protocol RPC methods
- [`/gateway/protocol/rpc-system-and-channels`](#gatewayprotocolrpc-system-and-channels-gateway-protocol-system-and-channel-methods) — Gateway protocol system and channel methods
- [`/gateway/protocol/rpc-talk-config-and-agents`](#gatewayprotocolrpc-talk-config-and-agents-gateway-protocol-talk-config-and-agent-methods) — Gateway protocol talk, config, and agent methods
- [`/gateway/protocol/rpc-session-control`](#gatewayprotocolrpc-session-control-gateway-protocol-session-control) — Gateway protocol session control
- [`/gateway/protocol/rpc-devices-nodes-and-approvals`](#gatewayprotocolrpc-devices-nodes-and-approvals-gateway-protocol-device-node-and-approval-methods) — Gateway protocol device, node, and approval methods
- [`/gateway/protocol/rpc-bootstrap-and-events`](#gatewayprotocolrpc-bootstrap-and-events-gateway-protocol-session-bootstrap-and-events) — Gateway protocol session bootstrap and events
- [`/gateway/protocol/ledgers`](#gatewayprotocolledgers-gateway-protocol-ledger-rpcs) — Gateway protocol ledger RPCs
- [`/gateway/protocol/operator-methods`](#gatewayprotocoloperator-methods-gateway-protocol-operator-methods) — Gateway protocol operator methods
- [`/gateway/protocol/versioning`](#gatewayprotocolversioning-gateway-protocol-versioning) — Gateway protocol versioning
- [`/gateway/protocol/auth`](#gatewayprotocolauth-gateway-protocol-auth) — Gateway protocol auth
- [`/gateway/embedding`](#gatewayembedding-embedding-openclaw) — Embedding OpenClaw
- [`/gateway/openai-http-api`](#gatewayopenai-http-api-openai-chat-completions) — OpenAI chat completions
- [`/gateway/openresponses-http-api`](#gatewayopenresponses-http-api-openresponses-api) — OpenResponses API
- [`/gateway/tools-invoke-http-api`](#gatewaytools-invoke-http-api-tools-invoke-api) — Tools invoke API
- [`/gateway/cli-backends`](#gatewaycli-backends-cli-backends) — CLI backends
- [`/gateway/local-models`](#gatewaylocal-models-local-models) — Local models
- [`/gateway/local-model-services`](#gatewaylocal-model-services-local-model-services) — Local model services
- [`/network`](#network-network) — Network
- [`/gateway/pairing`](#gatewaypairing-node-pairing) — Node pairing
- [`/gateway/discovery`](#gatewaydiscovery-discovery-and-transports) — Discovery and transports
- [`/gateway/bonjour`](#gatewaybonjour-bonjour-discovery) — Bonjour discovery
- [`/gateway/remote`](#gatewayremote-remote-access) — Remote access
- [`/gateway/stable-https-url`](#gatewaystable-https-url-give-your-gateway-a-stable-https-url) — Give your Gateway a stable HTTPS URL
- [`/gateway/tailscale`](#gatewaytailscale-tailscale) — Tailscale
- [`/gateway/cloudflare-access`](#gatewaycloudflare-access-cloudflare-tunnel-and-access) — Cloudflare Tunnel and Access
- [`/gateway/team-server`](#gatewayteam-server-deploy-a-team-server) — Deploy a team server
- [`/security/network-proxy`](#securitynetwork-proxy-network-proxy) — Network proxy
- [`/security/formal-verification`](#securityformal-verification-formal-verification-security-models) — Formal verification (security models)
- [`/security/incident-response`](#securityincident-response-incident-response) — Incident response
- [`/security/THREAT-MODEL-ATLAS`](#securitythreat-model-atlas-threat-model-mitre-atlas) — Threat model (MITRE ATLAS)
- [`/security/THREAT-MODEL-ATLAS/reconnaissance`](#securitythreat-model-atlasreconnaissance-reconnaissance-amlta0002) — Reconnaissance (AML.TA0002)
- [`/security/THREAT-MODEL-ATLAS/initial-access`](#securitythreat-model-atlasinitial-access-initial-access-amlta0004) — Initial access (AML.TA0004)
- [`/security/THREAT-MODEL-ATLAS/execution`](#securitythreat-model-atlasexecution-execution-amlta0005) — Execution (AML.TA0005)
- [`/security/THREAT-MODEL-ATLAS/persistence`](#securitythreat-model-atlaspersistence-persistence-amlta0006) — Persistence (AML.TA0006)
- [`/security/THREAT-MODEL-ATLAS/defense-evasion`](#securitythreat-model-atlasdefense-evasion-defense-evasion-amlta0007) — Defense evasion (AML.TA0007)
- [`/security/THREAT-MODEL-ATLAS/discovery`](#securitythreat-model-atlasdiscovery-discovery-amlta0008) — Discovery (AML.TA0008)
- [`/security/THREAT-MODEL-ATLAS/collection-and-exfiltration`](#securitythreat-model-atlascollection-and-exfiltration-collection-and-exfiltration-amlta0009-amlta0010) — Collection and exfiltration (AML.TA0009, AML.TA0010)
- [`/security/THREAT-MODEL-ATLAS/impact`](#securitythreat-model-atlasimpact-impact-amlta0011) — Impact (AML.TA0011)
- [`/security/CONTRIBUTING-THREAT-MODEL`](#securitycontributing-threat-model-contributing-to-the-threat-model) — Contributing to the threat model
- [`/nodes`](#nodes-nodes) — Nodes
- [`/nodes/pairing-and-status`](#nodespairing-and-status-node-pairing-and-status) — Node pairing and status
- [`/nodes/node-host`](#nodesnode-host-run-a-node-host) — Run a node host
- [`/nodes/node-exec`](#nodesnode-exec-run-commands-on-a-node) — Run commands on a node
- [`/nodes/mcp-and-skills`](#nodesmcp-and-skills-node-hosted-mcp-servers-and-skills) — Node-hosted MCP servers and skills
- [`/nodes/session-hosting`](#nodessession-hosting-host-openclaw-sessions-on-a-node) — Host OpenClaw sessions on a node
- [`/nodes/session-catalogs`](#nodessession-catalogs-node-session-catalogs) — Node session catalogs
- [`/nodes/file-transfers`](#nodesfile-transfers-node-file-transfers) — Node file transfers
- [`/nodes/command-policy`](#nodescommand-policy-node-command-policy) — Node command policy
- [`/nodes/device-commands`](#nodesdevice-commands-node-device-commands) — Node device commands
- [`/nodes/presence`](#nodespresence-active-computer-presence) — Active computer presence
- [`/nodes/troubleshooting`](#nodestroubleshooting-node-troubleshooting) — Node troubleshooting
- [`/nodes/media-understanding`](#nodesmedia-understanding-media-understanding) — Media understanding
- [`/nodes/media-playback`](#nodesmedia-playback-media-playback) — Media playback
- [`/nodes/images`](#nodesimages-image-and-media-support) — Image and media support
- [`/nodes/audio`](#nodesaudio-audio-and-voice-notes) — Audio and voice notes
- [`/nodes/camera`](#nodescamera-camera-capture) — Camera capture
- [`/nodes/computer-use`](#nodescomputer-use-computer-use) — Computer use
- [`/nodes/talk`](#nodestalk-talk-mode) — Talk mode
- [`/nodes/talk/realtime-sessions`](#nodestalkrealtime-sessions-talk-realtime-sessions-and-delegation) — Talk realtime sessions and delegation
- [`/nodes/talk/session-ownership`](#nodestalksession-ownership-talk-session-ownership) — Talk session ownership
- [`/nodes/talk/macos-relay`](#nodestalkmacos-relay-talk-on-macos-and-the-gateway-relay) — Talk on macOS and the Gateway relay
- [`/nodes/talk/client-ui`](#nodestalkclient-ui-talk-client-ui) — Talk client UI
- [`/nodes/voicewake`](#nodesvoicewake-voice-wake) — Voice wake
- [`/nodes/location-command`](#nodeslocation-command-location-command) — Location command
- [`/web`](#web-web) — Web
- [`/web/control-ui`](#webcontrol-ui-control-ui) — Control UI
- [`/web/control-ui/connect-and-pair`](#webcontrol-uiconnect-and-pair-connect-and-pair) — Connect and pair
- [`/web/control-ui/sessions-and-sidebar`](#webcontrol-uisessions-and-sidebar-sessions-and-sidebar) — Sessions and sidebar
- [`/web/control-ui/chat`](#webcontrol-uichat-chat) — Chat
- [`/web/control-ui/panels`](#webcontrol-uipanels-panels-and-docks) — Panels and docks
- [`/web/control-ui/settings`](#webcontrol-uisettings-settings) — Settings
- [`/web/control-ui/feature-reference`](#webcontrol-uifeature-reference-feature-and-rpc-reference) — Feature and RPC reference
- [`/web/control-ui/offline-and-reconnect`](#webcontrol-uioffline-and-reconnect-offline-and-reconnect) — Offline and reconnect
- [`/web/control-ui/security-model`](#webcontrol-uisecurity-model-security-model) — Security model
- [`/web/control-ui/development`](#webcontrol-uidevelopment-build-and-develop) — Build and develop
- [`/gateway/portals`](#gatewayportals-portals) — Portals
- [`/web/notifications`](#webnotifications-notifications) — Notifications
- [`/web/dashboard`](#webdashboard-dashboard) — Dashboard
- [`/web/dashboards`](#webdashboards-session-dashboards) — Session Dashboards
- [`/web/dashboard-architecture`](#webdashboard-architecture-dashboard-architecture) — Dashboard Architecture
- [`/web/urls`](#weburls-control-ui-urls) — Control UI URLs
- [`/web/webchat`](#webwebchat-webchat) — WebChat
- [`/web/tui`](#webtui-tui) — TUI
- [`/web/lobster`](#weblobster-the-lobster) — The Lobster

## Document sections

### `/gateway` — Gateway runbook

**Gateway runbook** · *Gateway & Ops › Gateway*

> Runbook for the Gateway service, lifecycle, and operations

<sub>source `docs/gateway/index.md` · 425 lines · 2141 words · 16 code blocks</sub>

**Read when:** Running or debugging the gateway process

**Covers:** 5-minute local startup · Runtime model · OpenAI-compatible endpoints · Operator command set · Multiple gateways (same host) · Remote access · Supervision and service lifecycle · Dev profile quick path · Protocol quick reference (operator view) · Operational checks · Common failure signatures · Safety guarantees · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw channels status`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway install`, `openclaw gateway probe`, `openclaw gateway restart`, `openclaw gateway start`, `openclaw gateway status`

**Config:** `agents.defaults.workspace`, `channels.start`, `gateway.auth.password`, `gateway.auth.token`, `gateway.bind`, `gateway.cmd`, `gateway.controlUi.allowedOrigins`, `gateway.mode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway](https://docs.openclaw.ai/gateway)</sub>

---

### `/gateway/configuration` — Configuration

**Configuration** · *Gateway & Ops › Configuration*

> Configuration overview: common tasks, quick setup, and links to the Configuration reference

<sub>source `docs/gateway/configuration.md` · 174 lines · 1125 words · 3 code blocks</sub>

**Read when:** Setting up OpenClaw for the first time · Looking for common configuration patterns · Navigating to specific config sections

**Covers:** Minimal config · Editing config · Strict validation · Configuration pages · Where each section moved · Full reference · Related

**CLI:** `openclaw config`, `openclaw config get`, `openclaw config schema`, `openclaw config set`, `openclaw config unset`, `openclaw configure`, `openclaw doctor`, `openclaw health`

**Config:** `agents.defaults`, `agents.entries`, `gateway.mode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration](https://docs.openclaw.ai/gateway/configuration)</sub>

---

### `/gateway/configuration/common-tasks` — Common tasks

**Common tasks** · *Gateway & Ops › Configuration*

> Task-oriented configuration recipes: channels, models, access, sessions, sandboxing, cron, hooks, routing, and $include

<sub>source `docs/gateway/configuration/common-tasks.md` · 443 lines · 1608 words · 14 code blocks</sub>

**Read when:** Looking for a copy-paste config for a common setup · Setting up a channel, model, access rule, or automation · Splitting one config file into several with $include

**Covers:** Common tasks

**CLI:** `openclaw config set`, `openclaw doctor`

**Config:** `agents.defaults.imageMaxDimensionPx`, `agents.defaults.modelPolicy.allow`, `agents.defaults.models`, `agents.defaults.skills`, `agents.entries.*.skills`, `channels.discord`, `channels.feishu`, `channels.googlechat`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration/common-tasks](https://docs.openclaw.ai/gateway/configuration/common-tasks)</sub>

---

### `/gateway/configuration/hot-reload` — Config hot reload

**Config hot reload** · *Gateway & Ops › Configuration*

> How the Gateway applies config snapshots, which changes hot-apply, and which need a restart

<sub>source `docs/gateway/configuration/hot-reload.md` · 390 lines · 3357 words · 1 code blocks</sub>

**Read when:** A config edit did not take effect and you need to know why · Deciding between hybrid and off reload modes · Checking whether a specific key hot-applies or forces a restart

**Covers:** Config hot reload <sub>(3 sub-sections)</sub>

**CLI:** `openclaw config validate`, `openclaw doctor`, `openclaw onboard`, `openclaw plugins reload`

**Config:** `agents.defaults.heartbeat`, `agents.defaults.mediaMaxMb`, `agents.defaults.models`, `channels.*`, `channels.defaults`, `channels.modelByChannel`, `channels.slack.streaming.mode`, `channels.whatsapp.enabled`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration/hot-reload](https://docs.openclaw.ai/gateway/configuration/hot-reload)</sub>

---

### `/gateway/configuration/config-rpc` — Config RPC (programmatic updates)

**Config RPC (programmatic updates)** · *Gateway & Ops › Configuration*

> Writing config over the gateway API: config.get, config.patch, config.apply, and replacePaths

<sub>source `docs/gateway/configuration/config-rpc.md` · 105 lines · 786 words · 1 code blocks</sub>

**Read when:** Writing config from tooling instead of by hand · Choosing between config.patch and config.apply · Handling baseHash, replacePaths, and deferred reload responses

**Covers:** Config RPC (programmatic updates)

**CLI:** `openclaw channels status`, `openclaw gateway call`

**Config:** `agents.entries.main.skills`, `channels.start`, `channels.status`, `models.providers.custom.models[].input`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration/config-rpc](https://docs.openclaw.ai/gateway/configuration/config-rpc)</sub>

---

### `/gateway/configuration/environment-variables` — Environment variables

**Environment variables** · *Gateway & Ops › Configuration*

> Env var sources and precedence, inline env config, shell env import, substitution, and secret refs

<sub>source `docs/gateway/configuration/environment-variables.md` · 95 lines · 185 words · 4 code blocks</sub>

**Read when:** Deciding where an API key should live · Using ${VAR} substitution inside config values · Pointing a config field at a secret ref

**Covers:** Environment variables

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration/environment-variables](https://docs.openclaw.ai/gateway/configuration/environment-variables)</sub>

---

### `/gateway/configuration-reference` — Configuration reference

**Configuration reference** · *Gateway & Ops › Configuration*

> Gateway config reference for core OpenClaw keys, defaults, and links to dedicated subsystem references

<sub>source `docs/gateway/configuration-reference.md` · 233 lines · 1032 words</sub>

**Read when:** You need exact field-level config semantics or defaults · You are validating channel, model, gateway, or tool config blocks

**Covers:** Pages in this reference set · Channels · Agent defaults, multi-agent, sessions, and messages · worktreeRoot · Tools and custom providers · Models · MCP · Skills · Plugins · Browser · UI · Desktop · Gateway · Cloud worker environments · _+19 more_

**CLI:** `openclaw config schema`, `openclaw configure`

**Config:** `agents.defaults.*`, `agents.entries`, `channels.*`, `cron.failureAlert`, `gateway.reload`, `gateway.tls`, `memory.citations`, `memory.search.*`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration-reference](https://docs.openclaw.ai/gateway/configuration-reference)</sub>

---

### `/gateway/config-agents` — Configuration — agents

**Configuration — agents** · *Gateway & Ops › Configuration*

> Agent defaults, multi-agent routing, session, messages, and talk config

<sub>source `docs/gateway/config-agents.md` · 104 lines · 577 words</sub>

**Read when:** Tuning agent defaults (models, thinking, workspace, heartbeat, media, skills) · Configuring multi-agent routing and bindings · Adjusting session, message delivery, and talk-mode behavior

**Covers:** What each page covers · Where each section moved · Related

**CLI:** `openclaw doctor`, `openclaw onboard`

**Config:** `agents.*`, `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `agents.defaults.compaction`, `agents.defaults.contextInjection`, `agents.defaults.contextLimits`, `agents.defaults.contextPruning`, `agents.defaults.cwd`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents](https://docs.openclaw.ai/gateway/config-agents)</sub>

---

### `/gateway/config-agents/workspace-and-bootstrap` — Configuration — agent workspace and bootstrap

**Configuration — agent workspace and bootstrap** · *Gateway & Ops › Agents*

> Agent workspace paths, bootstrap injection, context budgets, image handling, and timezone

<sub>source `docs/gateway/config-agents/workspace-and-bootstrap.md` · 338 lines · 990 words · 18 code blocks</sub>

**Read when:** Choosing where an agent reads and writes files · Tuning bootstrap injection or a context budget · Adjusting inbound image scaling or the agent timezone

**Covers:** agents.defaults.workspace · agents.defaults.cwd · agents.defaults.repoRoot · agents.defaults.skills · agents.defaults.skipBootstrap · agents.defaults.skipOptionalBootstrapFiles · agents.defaults.contextInjection · agents.defaults.bootstrapMaxChars · agents.defaults.bootstrapTotalMaxChars · Per-agent bootstrap profile overrides · Bootstrap truncation notice · Context budget ownership map · agents.defaults.imageMaxDimensionPx · agents.defaults.imageQuality · _+1 more_ <sub>(5 sub-sections)</sub>

**Config:** `agents.defaults`, `agents.defaults.*`, `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `agents.defaults.contextInjection`, `agents.defaults.contextLimits`, `agents.defaults.contextLimits.*`, `agents.defaults.cwd`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/workspace-and-bootstrap](https://docs.openclaw.ai/gateway/config-agents/workspace-and-bootstrap)</sub>

---

### `/gateway/config-agents/models` — Configuration — agent models

**Configuration — agent models** · *Gateway & Ops › Agents*

> Default model, fallback chain, per-purpose model slots, and model selection scope

<sub>source `docs/gateway/config-agents/models.md` · 169 lines · 2328 words · 2 code blocks</sub>

**Read when:** Setting the default model or its fallback chain · Pointing image, TTS, or summary work at a different model · Choosing how far a model change applies

**Covers:** agents.defaults.model · agents.defaults.modelSelectionScope

**CLI:** `openclaw config set`, `openclaw doctor`

**Config:** `agents.defaults`, `agents.defaults.model`, `agents.defaults.modelSelectionScope`, `agents.defaults.params`, `agents.defaults.timeoutSeconds`, `agents.entries.*.fastModeDefault`, `agents.entries.*.modelPolicy.allow`, `agents.entries.*.params`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/models](https://docs.openclaw.ai/gateway/config-agents/models)</sub>

---

### `/gateway/config-agents/runtime-and-cli-backends` — Configuration — agent runtime and CLI backends

**Configuration — agent runtime and CLI backends** · *Gateway & Ops › Agents*

> Agent runtime policy on providers and models, CLI backend selection, and GPT-5 personality

<sub>source `docs/gateway/config-agents/runtime-and-cli-backends.md` · 90 lines · 546 words · 2 code blocks</sub>

**Read when:** Choosing which harness runs a model · Selecting a registered CLI backend · Setting the OpenAI GPT-5 personality

**Covers:** Runtime policy · CLI backend selection · OpenAI GPT-5 personality

**CLI:** `openclaw doctor`

**Config:** `agents.defaults`, `agents.defaults.agentRuntime`, `agents.defaults.models`, `agents.entries.*`, `agents.entries.*.agentRuntime`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/runtime-and-cli-backends](https://docs.openclaw.ai/gateway/config-agents/runtime-and-cli-backends)</sub>

---

### `/gateway/config-agents/heartbeat-compaction-and-streaming` — Configuration — agent heartbeat, compaction, and streaming

**Configuration — agent heartbeat, compaction, and streaming** · *Gateway & Ops › Agents*

> Heartbeat runs, system agent, compaction, context pruning, block streaming, and typing indicators

<sub>source `docs/gateway/config-agents/heartbeat-compaction-and-streaming.md` · 226 lines · 1731 words · 6 code blocks</sub>

**Read when:** Scheduling heartbeat runs or the system agent · Tuning auto-compaction or context pruning · Changing how partial replies and typing indicators are sent

**Covers:** agents.defaults.heartbeat · agents.defaults.systemAgent · agents.defaults.compaction · agents.defaults.contextPruning · Block streaming · Typing indicators

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw hooks`, `openclaw models`, `openclaw sessions`

**Config:** `agents.defaults.*`, `agents.defaults.authInheritance.agentId`, `agents.defaults.compaction`, `agents.defaults.contextPruning`, `agents.defaults.heartbeat`, `agents.defaults.models`, `agents.defaults.sessionStore.agentId`, `agents.defaults.systemAgent`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/gateway/config-agents/heartbeat-compaction-and-streaming](https://docs.openclaw.ai/gateway/config-agents/heartbeat-compaction-and-streaming)</sub>

---

### `/gateway/config-agents/sandbox` — Configuration — agent sandboxing

**Configuration — agent sandboxing** · *Gateway & Ops › Agents*

> The agents.defaults.sandbox block: image, mounts, workspace mode, and network policy

<sub>source `docs/gateway/config-agents/sandbox.md` · 251 lines · 833 words · 3 code blocks</sub>

**Read when:** Running the embedded agent inside a container · Choosing a sandbox workspace mode or network policy · Building or pinning the sandbox image

**Covers:** agents.defaults.sandbox

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.sandbox`, `plugins.entries.openshell.config`, `sandbox.browser.binds`, `sandbox.browser.enabled`, `sandbox.docker.binds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/sandbox](https://docs.openclaw.ai/gateway/config-agents/sandbox)</sub>

---

### `/gateway/config-agents/entries-and-multi-agent` — Configuration — per-agent entries and multi-agent routing

**Configuration — per-agent entries and multi-agent routing** · *Gateway & Ops › Agents*

> agents.entries overrides, multiAgent bindings, binding match fields, and access profiles

<sub>source `docs/gateway/config-agents/entries-and-multi-agent.md` · 231 lines · 943 words · 5 code blocks</sub>

**Read when:** Overriding defaults for one agent · Routing a channel or account to a specific agent · Writing per-agent tool and sandbox access profiles

**Covers:** agents.entries (per-agent overrides) · Multi-agent routing <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.cwd`, `agents.defaults.fastModeDefault`, `agents.defaults.reasoningDefault`, `agents.defaults.skills`, `agents.defaults.thinkingDefault`, `agents.defaults.utilityModel`, `agents.entries`, `agents.entries.*`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/entries-and-multi-agent](https://docs.openclaw.ai/gateway/config-agents/entries-and-multi-agent)</sub>

---

### `/gateway/config-agents/sessions` — Configuration — agent sessions

**Configuration — agent sessions** · *Gateway & Ops › Agents*

> session. scope, identity links, reset policy, sharing, and retention

<sub>source `docs/gateway/config-agents/sessions.md` · 140 lines · 1605 words · 1 code blocks</sub>

**Read when:** Choosing how conversations map to sessions · Setting session reset or retention policy · Sharing a session with other operators

**Covers:** Session · Cold storage

**CLI:** `openclaw doctor`, `openclaw sessions cleanup`

**Config:** `session.*`, `session.sharing`, `session.sharing.evidence`, `session.suggestion`, `session.visibility.set`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/sessions](https://docs.openclaw.ai/gateway/config-agents/sessions)</sub>

---

### `/gateway/config-agents/messages-and-talk` — Configuration — messages and talk

**Configuration — messages and talk** · *Gateway & Ops › Agents*

> messages. delivery, prefixes, ack reactions, queueing, TTS, and talk. defaults

<sub>source `docs/gateway/config-agents/messages-and-talk.md` · 226 lines · 1199 words · 3 code blocks</sub>

**Read when:** Tuning reply prefixes, ack reactions, or the message queue · Configuring text-to-speech output · Setting Talk mode defaults

**Covers:** Messages · Talk <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.model.primary`, `channels.whatsapp.reactionLevel`, `channels.whatsapp.responsePrefix`, `plugins.allow`, `providers.*.apiKey`, `providers.*.voiceAliases`, `providers.mlx.modelId`, `providers.openai.baseUrl`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-agents/messages-and-talk](https://docs.openclaw.ai/gateway/config-agents/messages-and-talk)</sub>

---

### `/gateway/config-automation` — Configuration — automations and media template variables

**Configuration — automations and media template variables** · *Gateway & Ops › Configuration*

> Automation config under cron plus the media model template variable surface

<sub>source `docs/gateway/config-automation.md` · 117 lines · 841 words · 2 code blocks</sub>

**Read when:** Scheduling a cron automation · Configuring automation failure alerts · Looking up media model template variables

**Covers:** Automations (cron) · Media model template variables <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `cron.*`, `cron.enabled`, `cron.failureAlert`, `cron.failureDestination`, `cron.sessionRetention`, `cron.skipMissedJobs`, `cron.triggers`, `cron.webhook`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-automation](https://docs.openclaw.ai/gateway/config-automation)</sub>

---

### `/gateway/config-browser-ui-desktop` — Configuration — browser, UI, and desktop

**Configuration — browser, UI, and desktop** · *Gateway & Ops › Configuration*

> Browser automation, Control UI presentation, and desktop or paired-node config

<sub>source `docs/gateway/config-browser-ui-desktop.md` · 407 lines · 2876 words · 4 code blocks</sub>

**Read when:** Configuring browser automation or profiles · Adjusting Control UI presentation · Setting up desktop or paired node desktops

**Covers:** Browser · UI · Desktop <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw nodes approve`, `openclaw nodes pending`

**Config:** `agents.entries`, `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `gateway.port`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-browser-ui-desktop](https://docs.openclaw.ai/gateway/config-browser-ui-desktop)</sub>

---

### `/gateway/config-channels` — Configuration — channels

**Configuration — channels** · *Gateway & Ops › Configuration*

> Channel configuration: access control, pairing, per-channel keys across Slack, Discord, Telegram, WhatsApp, Matrix, iMessage, and more

<sub>source `docs/gateway/config-channels.md` · 62 lines · 362 words</sub>

**Read when:** Configuring a channel plugin (auth, access control, multi-account) · Troubleshooting per-channel config keys · Auditing DM policy, group policy, or mention gating

**Covers:** Channels · Other plugin channels · What each page covers · Where each section moved · Related

**CLI:** `openclaw plugins install`

**Config:** `channels.*`, `channels.defaults`, `channels.modelByChannel`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels](https://docs.openclaw.ai/gateway/config-channels)</sub>

---

### `/gateway/config-channels/shared-policies` — Configuration — shared channel policies

**Configuration — shared channel policies** · *Gateway & Ops › Channels*

> Shared channel keys: DM and group access policies, model overrides, channel defaults, and multi-account setup

<sub>source `docs/gateway/config-channels/shared-policies.md` · 132 lines · 891 words · 3 code blocks</sub>

**Read when:** Setting DM policy, group policy, or mention defaults for every channel · Pinning a channel or DM peer to a specific model · Running more than one account on a channel

**Covers:** DM and group access · Channel model overrides · Channel defaults and heartbeat · Multi-account (all channels)

**CLI:** `openclaw channels add`, `openclaw doctor`

**Config:** `channels.defaults`, `channels.defaults.contextVisibility`, `channels.defaults.groupPolicy`, `channels.defaults.heartbeatVisibility.showAlerts`, `channels.defaults.heartbeatVisibility.showOk`, `channels.defaults.heartbeatVisibility.useIndicator`, `channels.defaults.implicitMentions`, `channels.modelByChannel`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels/shared-policies](https://docs.openclaw.ai/gateway/config-channels/shared-policies)</sub>

---

### `/gateway/config-channels/personal-messaging` — Configuration — personal messaging channels

**Configuration — personal messaging channels** · *Gateway & Ops › Channels*

> Per-channel config keys for WhatsApp, Telegram, Signal, iMessage, and LINE

<sub>source `docs/gateway/config-channels/personal-messaging.md` · 218 lines · 1099 words · 6 code blocks</sub>

**Read when:** Configuring WhatsApp, Telegram, Signal, iMessage, or LINE · Troubleshooting bot tokens, pairing, or media limits on a personal messaging channel · Setting up the iMessage SSH wrapper for a remote Messages Mac

**Covers:** WhatsApp · Telegram · Signal · iMessage · LINE

**CLI:** `openclaw channels status`, `openclaw doctor`

**Config:** `channels.*`, `channels.bluebubbles`, `channels.imessage`, `channels.imessage.actions.*`, `channels.imessage.cliPath`, `channels.imessage.configWrites`, `channels.imessage.defaultAccount`, `channels.imessage.groups`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels/personal-messaging](https://docs.openclaw.ai/gateway/config-channels/personal-messaging)</sub>

---

### `/gateway/config-channels/workplace-chat` — Configuration — workplace chat channels

**Configuration — workplace chat channels** · *Gateway & Ops › Channels*

> Per-channel config keys for Google Chat, Slack, Mattermost, and Microsoft Teams

<sub>source `docs/gateway/config-channels/workplace-chat.md` · 235 lines · 1142 words · 5 code blocks</sub>

**Read when:** Configuring Google Chat, Slack, Mattermost, or Microsoft Teams · Setting Slack tokens, thread scope, streaming, or exec approvals · Enabling Mattermost native slash commands

**Covers:** Google Chat · Slack · Mattermost · Microsoft Teams

**CLI:** `openclaw doctor`, `openclaw plugins install`

**Config:** `channels.*`, `channels.googlechat.dangerouslyAllowNameMatching`, `channels.mattermost.configWrites`, `channels.mattermost.defaultAccount`, `channels.mattermost.requireMention`, `channels.msteams`, `channels.msteams.configWrites`, `channels.slack.defaultAccount`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels/workplace-chat](https://docs.openclaw.ai/gateway/config-channels/workplace-chat)</sub>

---

### `/gateway/config-channels/community-chat` — Configuration — community chat channels

**Configuration — community chat channels** · *Gateway & Ops › Channels*

> Per-channel config keys for Discord, Matrix, and IRC

<sub>source `docs/gateway/config-channels/community-chat.md` · 226 lines · 1497 words · 3 code blocks</sub>

**Read when:** Configuring Discord, Matrix, or IRC · Setting Discord guild, voice, presence, or exec approval keys · Choosing Matrix auth, proxy, or auto-join behavior

**Covers:** Discord · Matrix · IRC

**CLI:** `openclaw doctor`

**Config:** `channels.*`, `channels.defaults.botLoopProtection`, `channels.discord.agentComponents.ttlMs`, `channels.discord.autoPresence`, `channels.discord.dangerouslyAllowNameMatching`, `channels.discord.defaultAccount`, `channels.discord.execApprovals`, `channels.discord.intents.messageContent`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels/community-chat](https://docs.openclaw.ai/gateway/config-channels/community-chat)</sub>

---

### `/gateway/config-channels/mention-gating-and-history` — Configuration — group mention gating and history

**Configuration — group mention gating and history** · *Gateway & Ops › Channels*

> Group mention gating, visible reply modes, DM history limits, and self-chat mode

<sub>source `docs/gateway/config-channels/mention-gating-and-history.md` · 130 lines · 1227 words · 4 code blocks</sub>

**Read when:** Deciding when the agent replies in a group or channel · Debugging a group @mention that types then goes silent · Limiting how much DM history the agent sees

**Covers:** Group chat mention gating <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.entries.*.groupChat.mentionPatterns`, `session.identityLinks`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels/mention-gating-and-history](https://docs.openclaw.ai/gateway/config-channels/mention-gating-and-history)</sub>

---

### `/gateway/config-channels/commands` — Configuration — chat commands

**Configuration — chat commands** · *Gateway & Ops › Channels*

> The commands. block: native and text command surfaces, bash, config writes, and owner allowlists

<sub>source `docs/gateway/config-channels/commands.md` · 58 lines · 351 words · 1 code blocks</sub>

**Read when:** Enabling or disabling a chat command surface · Restricting who may run commands on a channel · Auditing `/config`, `/mcp`, `/plugins`, or `!` bash access

**Covers:** Commands (chat command handling)

**Config:** `channels.discord.commands.native`, `channels.telegram.customCommands`, `mcp.servers`, `tools.elevated.enabled`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-channels/commands](https://docs.openclaw.ai/gateway/config-channels/commands)</sub>

---

### `/gateway/config-cloud-workers` — Configuration — cloud worker environments

**Configuration — cloud worker environments** · *Gateway & Ops › Configuration*

> Cloud worker profiles under cloudWorkers, including Crabbox and static SSH development

<sub>source `docs/gateway/config-cloud-workers.md` · 136 lines · 1827 words · 2 code blocks</sub>

**Read when:** Defining a cloud worker environment · Configuring the Crabbox profile · Setting up a static SSH development worker

**Covers:** Cloud worker environments <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `plugins.allow`, `plugins.entries.crabbox.config.warmImages.refreshAfter`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-cloud-workers](https://docs.openclaw.ai/gateway/config-cloud-workers)</sub>

---

### `/gateway/config-extensions` — Configuration — MCP, skills, and plugins

**Configuration — MCP, skills, and plugins** · *Gateway & Ops › Configuration*

> Extension config: MCP servers, skills, plugin entries, and the canvas widget presenter

<sub>source `docs/gateway/config-extensions.md` · 372 lines · 2211 words · 5 code blocks</sub>

**Read when:** Registering an MCP server or plugin entry · Tuning skill discovery or plugin config · Configuring the canvas widget presenter

**Covers:** MCP · Skills · Plugins · Canvas widget presenter <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw mcp list`, `openclaw mcp login`, `openclaw mcp set`, `openclaw plugins reload`

**Config:** `agents.entries.*.memory.search.*`, `gateway.publicOrigin`, `mcp.*`, `mcp.servers`, `mcp.sessionIdleTtlMs`, `memory.citations`, `memory.search.*`, `plugins.*`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-extensions](https://docs.openclaw.ai/gateway/config-extensions)</sub>

---

### `/gateway/config-gateway` — Configuration — gateway

**Configuration — gateway** · *Gateway & Ops › Configuration*

> Gateway config: bind, auth, roles, Control UI, terminal, remote, nodes, TLS, and reload

<sub>source `docs/gateway/config-gateway.md` · 358 lines · 4171 words · 5 code blocks</sub>

**Read when:** Binding or authenticating the gateway · Assigning gateway roles or node pairing · Configuring gateway TLS or reload behavior

**Covers:** Gateway <sub>(5 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw config unset`, `openclaw doctor`, `openclaw gateway`, `openclaw node identity`

**Config:** `agents.defaults`, `gateway.*`, `gateway.auth.*`, `gateway.auth.allowTailscale`, `gateway.auth.identityScopes`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.rateLimit`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-gateway](https://docs.openclaw.ai/gateway/config-gateway)</sub>

---

### `/gateway/config-hooks` — Configuration — hooks

**Configuration — hooks** · *Gateway & Ops › Configuration*

> Hook config: HTTP contract, agent payload, session policy, mapping, retries, and Gmail

<sub>source `docs/gateway/config-hooks.md` · 346 lines · 3170 words · 3 code blocks</sub>

**Read when:** Wiring an inbound hook endpoint · Mapping hook payloads to agents or sessions · Tuning hook retries, fan-out, or the Gmail integration

**Covers:** Hooks <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw security audit`

**Config:** `agents.defaults.sessionStore.agentId`, `gateway.auth.password`, `gateway.auth.token`, `hooks.*`, `hooks.defaultSessionKey`, `hooks.gmail`, `hooks.gmail.account`, `hooks.internal`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-hooks](https://docs.openclaw.ai/gateway/config-hooks)</sub>

---

### `/gateway/config-observability` — Configuration — audit, logging, diagnostics, and telemetry

**Configuration — audit, logging, diagnostics, and telemetry** · *Gateway & Ops › Configuration*

> Observability config: audit, logging, diagnostics, and telemetry keys

<sub>source `docs/gateway/config-observability.md` · 164 lines · 1135 words · 4 code blocks</sub>

**Read when:** Turning on audit or diagnostics capture · Tuning log level, rotation, or redaction · Configuring telemetry export

**Covers:** Audit · Logging · Diagnostics · Telemetry

**CLI:** `openclaw audit`, `openclaw config set`, `openclaw doctor`, `openclaw telemetry off`, `openclaw telemetry on`, `openclaw telemetry show`

**Config:** `diagnostics.*`, `logging.*`, `logging.audit`, `logging.file`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-observability](https://docs.openclaw.ai/gateway/config-observability)</sub>

---

### `/gateway/config-runtime` — Configuration — runtime basics

**Configuration — runtime basics** · *Gateway & Ops › Configuration*

> Runtime config: worktree storage and acceleration, model routing, discovery, updates, ACP, and the wizard

<sub>source `docs/gateway/config-runtime.md` · 225 lines · 1090 words · 9 code blocks</sub>

**Read when:** Choosing where agent worktrees live · Setting model routing or discovery defaults · Auditing update, ACP, or wizard config

**Covers:** worktreeRoot · worktreeAcceleration · Models · Discovery · Update · ACP · Wizard · Bridge (legacy, removed) <sub>(2 sub-sections)</sub>

**CLI:** `openclaw dns setup`, `openclaw doctor`

**Config:** `models.*`, `models.catalogRefresh.enabled`, `models.catalogRefresh.url`, `models.mode`, `models.pricing`, `models.providers`, `models.providers.*.localService`, `models.providers.*.models[].cost`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-runtime](https://docs.openclaw.ai/gateway/config-runtime)</sub>

---

### `/gateway/config-secrets-env` — Configuration — environment, secrets, and includes

**Configuration — environment, secrets, and includes** · *Gateway & Ops › Configuration*

> Environment variables, secret providers, auth storage, and $include config splitting

<sub>source `docs/gateway/config-secrets-env.md` · 221 lines · 1122 words · 8 code blocks</sub>

**Read when:** Setting inline env vars or substitutions · Configuring secret providers or the egress proxy · Splitting config across files with $include

**Covers:** Environment · Secrets · Auth storage · Config includes ($include) <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-secrets-env](https://docs.openclaw.ai/gateway/config-secrets-env)</sub>

---

### `/gateway/config-tools` — Configuration — tools and custom providers

**Configuration — tools and custom providers** · *Gateway & Ops › Configuration*

> Tools config (policy, experimental toggles, provider-backed tools) and custom provider/base-URL setup

<sub>source `docs/gateway/config-tools.md` · 68 lines · 333 words</sub>

**Read when:** Configuring `tools.*` policy, allowlists, or experimental features · Registering custom providers or overriding base URLs · Setting up OpenAI-compatible self-hosted endpoints

**Covers:** What each page covers · Where each section moved · Related

**Config:** `agents.defaults.subagents`, `models.providers`, `tools.*`, `tools.agentToAgent`, `tools.allow`, `tools.byProvider`, `tools.codeMode`, `tools.deny`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools](https://docs.openclaw.ai/gateway/config-tools)</sub>

---

### `/gateway/config-tools/tool-policy` — Configuration — tool policy

**Configuration — tool policy** · *Gateway & Ops › Tools*

> Tool profiles, groups, sandbox tool gates, code mode, and allow/deny policy layers

<sub>source `docs/gateway/config-tools/tool-policy.md` · 264 lines · 1773 words · 8 code blocks</sub>

**Read when:** Choosing a tool profile or expanding it with `tools.allow` · Deciding which tools a provider, sender, or sandboxed session may call · Enabling code mode or elevated exec

**Covers:** Tool profiles · Tool groups · MCP and plugin tools inside sandbox tool policy · tools.codeMode · tools.allow / tools.deny · tools.byProvider · tools.toolsBySender · tools.elevated

**CLI:** `openclaw doctor`

**Config:** `agents.entries.*.tools`, `agents.entries.*.tools.elevated`, `agents.entries.*.tools.toolsBySender`, `mcp.servers`, `tools.allow`, `tools.alsoAllow`, `tools.byProvider`, `tools.codeMode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools/tool-policy](https://docs.openclaw.ai/gateway/config-tools/tool-policy)</sub>

---

### `/gateway/config-tools/github-identity` — Configuration — GitHub identity for agent tools

**Configuration — GitHub identity for agent tools** · *Gateway & Ops › Tools*

> tools.github: the shared managed GitHub CLI identity, its refresh, and its execution boundaries

<sub>source `docs/gateway/config-tools/github-identity.md` · 152 lines · 2700 words · 2 code blocks</sub>

**Read when:** Giving agents a shared managed `gh` identity instead of native credentials · Checking which execution paths receive the launch-bound credential · Setting the Git author for agent commits

**Covers:** tools.github · Sandbox opt-in

**CLI:** `openclaw sandbox recreate`, `openclaw security audit`

**Config:** `gateway.controlUi.github.token`, `tools.github`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools/github-identity](https://docs.openclaw.ai/gateway/config-tools/github-identity)</sub>

---

### `/gateway/config-tools/built-in-tools` — Configuration — built-in tool settings

**Configuration — built-in tool settings** · *Gateway & Ops › Tools*

> Per-tool settings for exec, loop detection, web search and fetch, media understanding, and the plan tool

<sub>source `docs/gateway/config-tools/built-in-tools.md` · 160 lines · 505 words · 5 code blocks</sub>

**Read when:** Tuning `exec` timeouts, approvals, or `apply_patch` · Configuring web search, web fetch, or inbound media understanding · Turning tool-loop detection or `progress_card` on or off

**Covers:** tools.exec · tools.loopDetection · tools.web · tools.media · tools.updatePlan

**CLI:** `openclaw doctor`

**Config:** `agents.entries.*.tools.loopDetection`, `models.providers.*.apiKey`, `tools.allow`, `tools.deny`, `tools.exec`, `tools.exec.grantExpiryDays`, `tools.experimental.planTool`, `tools.loopDetection`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools/built-in-tools](https://docs.openclaw.ai/gateway/config-tools/built-in-tools)</sub>

---

### `/gateway/config-tools/sessions-and-subagents` — Configuration — cross-agent, session, and subagent tools

**Configuration — cross-agent, session, and subagent tools** · *Gateway & Ops › Tools*

> tools.agentToAgent, tools.sessions visibility, sessionsspawn attachments, and subagent defaults

<sub>source `docs/gateway/config-tools/sessions-and-subagents.md` · 157 lines · 1066 words · 5 code blocks</sub>

**Read when:** Restricting which agents may reach each other · Narrowing which sessions the session tools can see · Setting subagent concurrency, timeouts, or attachment limits

**Covers:** tools.agentToAgent · tools.sessions · tools.sessionsspawn · agents.defaults.subagents · tools.swarm

**CLI:** `openclaw agents delete`, `openclaw doctor`

**Config:** `agents.defaults.subagents`, `session.dmScope`, `tools.agentToAgent`, `tools.agentToAgent.allow`, `tools.sessions`, `tools.sessions_spawn`, `tools.subagents.tools.allow`, `tools.subagents.tools.deny`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools/sessions-and-subagents](https://docs.openclaw.ai/gateway/config-tools/sessions-and-subagents)</sub>

---

### `/gateway/config-tools/custom-providers` — Configuration — custom providers and base URLs

**Configuration — custom providers and base URLs** · *Gateway & Ops › Tools*

> models.providers registration, base-URL trust, and the full provider field reference

<sub>source `docs/gateway/config-tools/custom-providers.md` · 141 lines · 1332 words · 1 code blocks</sub>

**Read when:** Registering a custom or self-hosted model provider · Overriding a provider base URL, transport, or TLS settings · Declaring capabilities for a custom endpoint route

**Covers:** Custom providers and base URLs · Provider field details

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw models list`

**Config:** `agents.defaults.modelPolicy.allow`, `models.json`, `models.mode`, `models.providers`, `models.providers.*.api`, `models.providers.*.apiKey`, `models.providers.*.auth`, `models.providers.*.authHeader`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools/custom-providers](https://docs.openclaw.ai/gateway/config-tools/custom-providers)</sub>

---

### `/gateway/config-tools/provider-examples` — Configuration — provider examples

**Configuration — provider examples** · *Gateway & Ops › Tools*

> Worked custom-provider configurations for Cerebras, Kimi, llama.cpp, LM Studio, MiniMax, Moonshot, OpenCode, Synthetic, and Z.AI

<sub>source `docs/gateway/config-tools/provider-examples.md` · 253 lines · 401 words · 8 code blocks</sub>

**Read when:** Copying a working config for a specific provider · Pointing a custom provider id at a local llama-server · Finding the onboarding shortcut for a provider

**Covers:** Provider examples

**CLI:** `openclaw onboard`

**Config:** `models.providers`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/config-tools/provider-examples](https://docs.openclaw.ai/gateway/config-tools/provider-examples)</sub>

---

### `/gateway/configuration-examples` — Configuration examples

**Configuration examples** · *Gateway & Ops › Configuration*

> Schema-accurate configuration examples for common OpenClaw setups

<sub>source `docs/gateway/configuration-examples.md` · 700 lines · 431 words · 11 code blocks</sub>

**Read when:** Learning how to configure OpenClaw · Looking for configuration examples · Setting up OpenClaw for the first time

**Covers:** Quick start · Expanded example (major options) · Common patterns · Tips · Related <sub>(10 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.skills`, `agents.defaults.timeoutSeconds`, `agents.entries`, `agents.entries.*.skills`, `agents.list`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/configuration-examples](https://docs.openclaw.ai/gateway/configuration-examples)</sub>

---

### `/gateway/authentication` — Authentication

**Authentication** · *Gateway & Ops › Authentication and secrets*

> Model authentication: OAuth, API keys, Claude CLI reuse, and Anthropic setup-token

<sub>source `docs/gateway/authentication.md` · 212 lines · 1203 words · 14 code blocks</sub>

**Read when:** Debugging model auth or OAuth expiry · Documenting authentication or credential storage

**Covers:** Recommended setup: API key (any provider) · Anthropic: Claude CLI reuse · Manual token entry · Checking model auth status · API key rotation (gateway) · Removing provider auth while the gateway is running · Controlling which credential is used · Troubleshooting · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw models`, `openclaw models auth`, `openclaw models status`, `openclaw onboard`

**Config:** `models.json`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/authentication](https://docs.openclaw.ai/gateway/authentication)</sub>

---

### `/auth-credential-semantics` — Auth credential semantics

**Auth credential semantics** · *Gateway & Ops › Authentication and secrets*

> Canonical credential eligibility and resolution semantics for auth profiles

<sub>source `docs/auth-credential-semantics.md` · 342 lines · 3457 words</sub>

**Read when:** Working on auth profile resolution or credential routing · Debugging model auth failures or profile order

**Covers:** Stable probe reason codes · Token credentials · Manual API keys · Setup replacements · Agent copy portability · Plugin SDK OAuth validation · Personal model accounts · Config-only auth routes · Explicit auth order filtering · Model catalog discovery · Probe target resolution · External CLI credential discovery · OAuth SecretRef Policy Guard · Legacy-Compatible Messaging · _+1 more_ <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent exec`, `openclaw agents add`, `openclaw doctor`, `openclaw models auth`, `openclaw models status`, `openclaw secrets reload`

**Config:** `models.json`

<sub>live: [docs.openclaw.ai/auth-credential-semantics](https://docs.openclaw.ai/auth-credential-semantics)</sub>

---

### `/gateway/secrets` — Secrets management

**Secrets management** · *Gateway & Ops › Authentication and secrets*

> Secrets management: SecretRef contract, shared secret store, runtime snapshots, and safe one-way scrubbing

<sub>source `docs/gateway/secrets.md` · 93 lines · 517 words</sub>

**Read when:** Configuring SecretRefs for provider credentials and SQLite auth-profile refs · Storing team-wide secrets and environment values in the shared SQLite store · Operating secrets reload, audit, configure, and apply safely in production · Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior

**Covers:** Secrets pages · Where each section moved · Related

**CLI:** `openclaw secrets audit`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets](https://docs.openclaw.ai/gateway/secrets)</sub>

---

### `/gateway/secrets/runtime-model` — Secrets runtime model

**Secrets runtime model** · *Gateway & Ops › Secrets management*

> How the Gateway resolves, injects, and isolates secrets at runtime

<sub>source `docs/gateway/secrets/runtime-model.md` · 98 lines · 1272 words</sub>

**Read when:** Understanding owner isolation, sentinel injection, and the agent-access boundary · Diagnosing inactive-surface filtering or onboarding reference preflight failures

**Covers:** Runtime model · Egress-time injection (sentinels) · Agent-access boundary · Active-surface filtering · Gateway auth surface diagnostics · Onboarding reference preflight

**CLI:** `openclaw secrets audit`

**Config:** `agents.defaults.sandbox.ssh.identityData`, `gateway.auth.password`, `gateway.auth.token`, `gateway.remote.password`, `gateway.remote.token`, `gateway.remote.url`, `gateway.tailscale.mode`, `models.json`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets/runtime-model](https://docs.openclaw.ai/gateway/secrets/runtime-model)</sub>

---

### `/gateway/secrets/secretref-contract` — SecretRef contract and provider config

**SecretRef contract and provider config** · *Gateway & Ops › Secrets management*

> SecretRef sources, id grammar, validation rules, and provider configuration

<sub>source `docs/gateway/secrets/secretref-contract.md` · 202 lines · 871 words · 11 code blocks</sub>

**Read when:** Writing SecretRefs for provider credentials and SQLite auth-profile refs · Configuring the env, file, exec, and store providers

**Covers:** SecretRef contract · Provider config

**CLI:** `openclaw secrets reload`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets/secretref-contract](https://docs.openclaw.ai/gateway/secrets/secretref-contract)</sub>

---

### `/gateway/secrets/secret-store-and-egress` — Shared secret store and egress proxy

**Shared secret store and egress proxy** · *Gateway & Ops › Secrets management*

> The shared secret store, the default-off secret egress proxy, and file-backed API keys

<sub>source `docs/gateway/secrets/secret-store-and-egress.md` · 278 lines · 3024 words · 9 code blocks</sub>

**Read when:** Storing team-wide secrets and environment values in the shared secret store · Enabling the destination-bound secret egress proxy or its traffic allowlist · Running a Crabbox application with a configured model credential kept on the host

**Covers:** Shared secret store · Secret egress proxy · Model credentials for Crabbox commands · File-backed API keys <sub>(4 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw crabbox run`, `openclaw doctor`, `openclaw gateway restart`, `openclaw secrets reload`, `openclaw secrets store`, `openclaw status`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets/secret-store-and-egress](https://docs.openclaw.ai/gateway/secrets/secret-store-and-egress)</sub>

---

### `/gateway/secrets/integration-examples` — Secrets integration examples

**Secrets integration examples** · *Gateway & Ops › Secrets management*

> Exec provider recipes for external secret managers, MCP server environment variables, and sandbox SSH

<sub>source `docs/gateway/secrets/integration-examples.md` · 293 lines · 455 words · 10 code blocks</sub>

**Read when:** Wiring an external secret manager through the exec provider · Passing secrets to MCP servers or sandbox SSH auth material

**Covers:** Exec integration examples · MCP server environment variables · Sandbox SSH auth material

**CLI:** `openclaw secrets audit`

**Config:** `plugins.entries.acpx.config.mcpServers`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets/integration-examples](https://docs.openclaw.ai/gateway/secrets/integration-examples)</sub>

---

### `/gateway/secrets/operations` — Secrets operations and behavior

**Secrets operations and behavior** · *Gateway & Ops › Secrets management*

> Supported surfaces, precedence, activation triggers, degraded signals, and the audit and configure workflow

<sub>source `docs/gateway/secrets/operations.md` · 206 lines · 1584 words · 4 code blocks</sub>

**Read when:** Operating secrets audit, configure, and apply safely in production · Understanding startup fail-fast, activation triggers, and last-known-good behavior

**Covers:** Supported credential surface · Required behavior and precedence · Activation triggers · Degraded and recovered signals · Command-path resolution · Audit and configure workflow · One-way safety policy · Legacy auth compatibility notes · Control UI

**CLI:** `openclaw channels resolve`, `openclaw channels status`, `openclaw doctor`, `openclaw memory`, `openclaw qr`, `openclaw secrets apply`, `openclaw secrets audit`, `openclaw secrets configure`

**Config:** `models.json`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets/operations](https://docs.openclaw.ai/gateway/secrets/operations)</sub>

---

### `/gateway/1password` — 1Password

**1Password** · *Gateway & Ops › Authentication and secrets*

> Use the 1Password plugin, bundled skill, or official MCP with OpenClaw

<sub>source `docs/gateway/1password.md` · 174 lines · 1336 words · 3 code blocks</sub>

**Read when:** You want API keys out of openclaw.json and inside 1Password · You run the Gateway headless and need service account auth for op · A Homebrew upgrade broke a manual 1Password exec provider · You want agents to read, inject, or maintain secrets with 1Password

**Covers:** Requirements · Resolve config secrets with the plugin · The 1password skill for agents · Official 1Password MCP server · Browser sign-in with 1Password for Claude · Security notes · Troubleshooting <sub>(1 sub-sections)</sub>

**CLI:** `openclaw onepassword secretref`, `openclaw onepassword status`, `openclaw plugins enable`, `openclaw secrets apply`, `openclaw secrets audit`, `openclaw secrets reload`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/1password](https://docs.openclaw.ai/gateway/1password)</sub>

---

### `/gateway/secrets-plan-contract` — Secrets apply plan contract

**Secrets apply plan contract** · *Gateway & Ops › Authentication and secrets*

> Contract for secrets apply plans: target validation, path matching, and SQLite auth-profile target scope

<sub>source `docs/gateway/secrets-plan-contract.md` · 153 lines · 693 words · 4 code blocks</sub>

**Read when:** Generating or reviewing `openclaw secrets apply` plans · Debugging `Invalid plan target path` errors · Understanding target type and path validation behavior

**Covers:** Plan file requirements · Plan file shape · Provider upserts and deletes · Supported target scope · Target type behavior · Path validation rules · Failure behavior · Exec provider consent behavior · Runtime and audit scope notes · Operator checks · Related docs

**CLI:** `openclaw secrets apply`, `openclaw secrets configure`

**Config:** `channels.googlechat.accounts.*.serviceAccount`, `channels.googlechat.serviceAccount`, `models.providers.*.apiKey`, `models.providers.apiKey`, `skills.entries.*.apiKey`, `skills.entries.apiKey`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/secrets-plan-contract](https://docs.openclaw.ai/gateway/secrets-plan-contract)</sub>

---

### `/gateway/trusted-proxy-auth` — Trusted proxy auth

**Trusted proxy auth** · *Gateway & Ops › Authentication and secrets*

> Delegate gateway authentication to a trusted reverse proxy (Pomerium, Caddy, nginx + OAuth)

<sub>source `docs/gateway/trusted-proxy-auth.md` · 646 lines · 3881 words · 12 code blocks</sub>

**Read when:** Running OpenClaw behind an identity-aware proxy · Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw · Fixing WebSocket 1008 unauthorized errors with reverse proxy setups · Deciding where to set HSTS and other HTTP hardening headers

**Covers:** When to use · When NOT to use · How it works · Configuration · Per-identity scope grants · Automatic device approval · Control UI pairing behavior · Operator scopes header · TLS termination and HSTS · Proxy setup examples · Mixed token configuration · Restrict a separate Gateway to one owner · Security checklist · Security audit · _+3 more_ <sub>(4 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw doctor`, `openclaw gateway status`, `openclaw security audit`

**Config:** `gateway.allowRealIpFallback`, `gateway.auth.allowTailscale`, `gateway.auth.identityScopes`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.auth.trustedProxy`, `gateway.auth.trustedProxy.allowLoopback`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/trusted-proxy-auth](https://docs.openclaw.ai/gateway/trusted-proxy-auth)</sub>

---

### `/gateway/health` — Health checks

**Health checks** · *Gateway & Ops › Health and diagnostics*

> Health check commands and gateway health monitoring

<sub>source `docs/gateway/health.md` · 245 lines · 2643 words</sub>

**Read when:** Diagnosing channel connectivity or gateway health · Understanding health check CLI commands and options

**Covers:** Quick checks · Deep diagnostics · Health monitor config · Inbound ingress health · HTTP probes · Uptime monitoring · When something fails · Dedicated "health" command · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw channels login`, `openclaw channels logout`, `openclaw channels status`, `openclaw gateway`, `openclaw gateway diagnostics`, `openclaw gateway stability`, `openclaw health`, `openclaw logs`

**Config:** `agents.entries.*.groupChat.mentionPatterns`, `channels.whatsapp.allowFrom`, `channels.whatsapp.groups`, `diagnostics.stability`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/health](https://docs.openclaw.ai/gateway/health)</sub>

---

### `/gateway/doctor` — Doctor

**Doctor** · *Gateway & Ops › Health and diagnostics*

> Doctor command: health checks, config migrations, and repair steps

<sub>source `docs/gateway/doctor.md` · 94 lines · 594 words</sub>

**Read when:** You need to repair stale config, state, or a gateway service · You want to find the doctor page that covers your problem · You are adding or modifying doctor migrations or breaking config changes

**Covers:** Doctor pages · Where each section moved · Related

**CLI:** `openclaw doctor`, `openclaw status`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor](https://docs.openclaw.ai/gateway/doctor)</sub>

---

### `/gateway/doctor/running` — Run doctor

**Run doctor** · *Gateway & Ops › Doctor*

> Run doctor, pick a mode, and read the read-only lint report

<sub>source `docs/gateway/doctor/running.md` · 166 lines · 924 words · 9 code blocks</sub>

**Read when:** You want to run doctor and choose the right flags · You need a read-only health report for CI or preflight automation

**Covers:** Quick start · Read-only lint mode <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway install`, `openclaw update`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/running](https://docs.openclaw.ai/gateway/doctor/running)</sub>

---

### `/gateway/doctor/checks` — What doctor checks

**What doctor checks** · *Gateway & Ops › Doctor*

> Summary of every repair, migration, and health check doctor runs

<sub>source `docs/gateway/doctor/checks.md` · 82 lines · 962 words</sub>

**Read when:** You want an overview of what doctor will touch before running it · You are deciding whether a change belongs in a doctor check

**Covers:** What it does (summary)

**CLI:** `openclaw channels capabilities`, `openclaw doctor`, `openclaw plugins list`, `openclaw skills check`

**Config:** `agents.defaults`, `agents.entries.*`, `gateway.controlUi.toolTitles`, `models.providers.*`, `models.providers.openai-codex`, `models.providers.opencode`, `plugins.allow`, `skills.entries`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/checks](https://docs.openclaw.ai/gateway/doctor/checks)</sub>

---

### `/gateway/doctor/config-migrations` — Config and migration repairs

**Config and migration repairs** · *Gateway & Ops › Doctor*

> Config normalization, legacy config key migrations, and update-time schema publication

<sub>source `docs/gateway/doctor/config-migrations.md` · 747 lines · 7046 words · 2 code blocks</sub>

**Read when:** Doctor reports a legacy config key or a failed config migration · You are adding or modifying a config migration

**Covers:** Runtime config migration · Retention policy · Cron ownership before roster migration · Legacy cron delivery settings · Exec approval policy · Channel account routing during an update · Channel ownership during an update · Sender tool policies · Agent roster migration · Channel webhook listeners · Talk realtime inheritance · ACP agents' model precedence · Missing plugins during migration · Retired TaskFlow Webhooks plugin · _+5 more_

**CLI:** `openclaw channels remove`, `openclaw config set`, `openclaw config validate`, `openclaw doctor`, `openclaw memory status`, `openclaw models`, `openclaw plugins install`, `openclaw update`

**Config:** `agents.defaults`, `agents.defaults.heartbeat.agentId`, `agents.defaults.llm`, `agents.defaults.memorySearch`, `agents.defaults.model`, `agents.defaults.pdfMaxBytesMb`, `agents.defaults.pdfMaxMb`, `agents.defaults.silentReply.internal`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/config-migrations](https://docs.openclaw.ai/gateway/doctor/config-migrations)</sub>

---

### `/gateway/doctor/provider-repairs` — Provider and route repairs

**Provider and route repairs** · *Gateway & Ops › Doctor*

> Provider override, browser, OAuth TLS, and route repairs (checks 2b-2g)

<sub>source `docs/gateway/doctor/provider-repairs.md` · 79 lines · 938 words</sub>

**Read when:** Doctor warns about a provider override, Codex route, or Chrome MCP readiness · You are changing provider or route migration behavior

**Covers:** Checks 2b-2g

**CLI:** `openclaw browser extension`, `openclaw doctor`

**Config:** `agents.defaults`, `agents.entries.*`, `models.providers.*`, `models.providers.openai-codex`, `models.providers.opencode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/provider-repairs](https://docs.openclaw.ai/gateway/doctor/provider-repairs)</sub>

---

### `/gateway/doctor/state-and-sessions` — State, session, and plugin repairs

**State, session, and plugin repairs** · *Gateway & Ops › Doctor*

> Disk layout, cron store, session, model auth, sandbox, and plugin install repairs (checks 3-7b)

<sub>source `docs/gateway/doctor/state-and-sessions.md` · 198 lines · 4848 words</sub>

**Read when:** Doctor reports a state migration, session lock, or plugin install problem · You are changing on-disk state layout or state integrity checks

**Covers:** Checks 3-7b

**CLI:** `openclaw agents list`, `openclaw channels status`, `openclaw doctor`, `openclaw gateway status`, `openclaw models auth`, `openclaw plugins install`, `openclaw status`, `openclaw update`

**Config:** `agents.defaults.sessionStore.agentId`, `cron.webhook`, `hooks.gmail.model`, `plugins.entries`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/state-and-sessions](https://docs.openclaw.ai/gateway/doctor/state-and-sessions)</sub>

---

### `/gateway/doctor/gateway-and-services` — Gateway, service, and security checks

**Gateway, service, and security checks** · *Gateway & Ops › Doctor*

> Gateway service, pairing, security, workspace status, auth, health, and supervisor checks (checks 8-17)

<sub>source `docs/gateway/doctor/gateway-and-services.md` · 274 lines · 3797 words · 4 code blocks</sub>

**Read when:** Doctor reports a gateway service, supervisor, pairing, or auth problem · You are changing gateway service migrations or runtime diagnostics

**Covers:** Checks 8-17

**CLI:** `openclaw completion`, `openclaw devices approve`, `openclaw devices list`, `openclaw devices remove`, `openclaw devices rotate`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway status`

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.port`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/gateway-and-services](https://docs.openclaw.ai/gateway/doctor/gateway-and-services)</sub>

---

### `/gateway/doctor/workspace-and-dreams` — Workspace tips and Dreams UI actions

**Workspace tips and Dreams UI actions** · *Gateway & Ops › Doctor*

> Config write, workspace tips, repointed aliases, and the Control UI Dreams actions

<sub>source `docs/gateway/doctor/workspace-and-dreams.md` · 50 lines · 481 words · 1 code blocks</sub>

**Read when:** Doctor reports a repointed workspace alias or a workspace tip · You are using the Control UI Dreams backfill, reset, or clear actions

**Covers:** Checks 18-20 · Dreams UI backfill and reset

**CLI:** `openclaw doctor`, `openclaw memory rem-backfill`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/doctor/workspace-and-dreams](https://docs.openclaw.ai/gateway/doctor/workspace-and-dreams)</sub>

---

### `/gateway/audit` — Audit history

**Audit history** · *Gateway & Ops › Health and diagnostics*

> Metadata-only activity history plus durable run identity and decision receipts

<sub>source `docs/gateway/audit.md` · 612 lines · 4950 words · 1 code blocks</sub>

**Read when:** You need a durable record of what the Gateway did without storing content · You are deciding whether to enable message lifecycle auditing · You need to explain what audit records do and do not prove · You are changing or reviewing execution identity, admission provenance, or decision receipts

**Covers:** Run identity inspection · Record families · Message lifecycle events · Privacy model · Coverage and proof limits · Storage, retention, and migration · Querying · Maintainer invariants · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw audit`, `openclaw config set`, `openclaw doctor`

**Config:** `logging.audit.enabled`, `logging.audit.executionIdentity`, `logging.audit.messages`, `session.owner`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/audit](https://docs.openclaw.ai/gateway/audit)</sub>

---

### `/gateway/telemetry` — Usage telemetry and update checks

**Usage telemetry and update checks** · *Gateway & Ops › Health and diagnostics*

> Daily update requests, approximate location, optional anonymous feature statistics, and privacy controls

<sub>source `docs/gateway/telemetry.md` · 240 lines · 1279 words · 6 code blocks</sub>

**Read when:** Checking what OpenClaw sends and what the receiver stores · Deciding whether to share anonymous feature statistics · Enabling or disabling anonymous feature statistics · Disabling all automatic update-check requests

**Covers:** Inspect what is sent · Daily update check · Approximate location · Optional anonymous feature statistics · Turn anonymous feature statistics on or off · Automated environments · Disable every automatic update request <sub>(1 sub-sections)</sub>

**CLI:** `openclaw telemetry off`, `openclaw telemetry on`, `openclaw telemetry show`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/telemetry](https://docs.openclaw.ai/gateway/telemetry)</sub>

---

### `/logging` — Logging

**Logging** · *Gateway & Ops › Health and diagnostics*

> File logs, console output, CLI tailing, and the Control UI Logs tab

<sub>source `docs/logging.md` · 1032 lines · 7647 words · 8 code blocks</sub>

**Read when:** You need a beginner-friendly overview of OpenClaw logging · You want to configure log levels, formats, or redaction · You are troubleshooting and need to find logs quickly

**Covers:** Where logs live · How to read logs · Log formats · Configuring logging · Diagnostics and OpenTelemetry · Troubleshooting tips · Related <sub>(24 sub-sections)</sub>

**CLI:** `openclaw channels logs`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway
openclaw`, `openclaw logs`

**Config:** `diagnostics.*`, `diagnostics.flags`, `diagnostics.otel.logsExporter`, `logging.consoleLevel`, `logging.consoleStyle`, `logging.file`, `logging.level`, `logging.maxFileBytes`

<sub>live: [docs.openclaw.ai/logging](https://docs.openclaw.ai/logging)</sub>

---

### `/gateway/opentelemetry` — OpenTelemetry export

**OpenTelemetry export** · *Gateway & Ops › Health and diagnostics*

> Index of the OpenClaw OpenTelemetry export documentation, one page per reader job

<sub>source `docs/gateway/opentelemetry.md` · 76 lines · 503 words</sub>

**Read when:** You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector · You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend · You need the exact metric names, span names, or attribute shapes to build dashboards or alerts

**Covers:** Where each section moved · Related

**Config:** `diagnostics.*`, `diagnostics.otel`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/opentelemetry](https://docs.openclaw.ai/gateway/opentelemetry)</sub>

---

### `/gateway/opentelemetry/setup` — Set up OpenTelemetry export

**Set up OpenTelemetry export** · *Gateway & Ops › OpenTelemetry*

> Install and enable diagnostics-otel, see which processes export, check exporter health, and turn export off

<sub>source `docs/gateway/opentelemetry/setup.md` · 173 lines · 845 words · 7 code blocks</sub>

**Read when:** You want to send OpenClaw model usage, message flow, or session metrics to an OpenTelemetry collector · You need to know whether a Gateway run, a one-shot local run, or `openclaw agent exec` exports telemetry · You are checking exporter health, or turning the export pipeline off

**Covers:** Quick start · Which processes export · Exporter health · Without an exporter · Disable

**CLI:** `openclaw agent`, `openclaw agent exec`, `openclaw doctor`, `openclaw gateway`, `openclaw plugins disable`, `openclaw plugins enable`, `openclaw plugins install`, `openclaw status`

**Config:** `diagnostics.enabled`, `diagnostics.otel`, `diagnostics.otel.protocol`, `logging.file`, `logging.level`, `plugins.allow`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/opentelemetry/setup](https://docs.openclaw.ai/gateway/opentelemetry/setup)</sub>

---

### `/gateway/opentelemetry/configuration` — OpenTelemetry configuration

**OpenTelemetry configuration** · *Gateway & Ops › OpenTelemetry*

> Signal toggles, the diagnostics.otel field reference, OTEL environment variables, and sampling and flushing

<sub>source `docs/gateway/opentelemetry/configuration.md` · 127 lines · 1147 words · 1 code blocks</sub>

**Read when:** You are wiring traces, metrics, or logs into Grafana, Datadog, Honeycomb, New Relic, Tempo, or another OTLP backend · You need the endpoint, protocol, header, prefix, or exporter fields for `diagnostics.otel` · You are setting sampling, flush intervals, or the `OTEL_*` environment fallbacks

**Covers:** Signals exported · Configuration reference · Sampling and flushing <sub>(1 sub-sections)</sub>

**Config:** `diagnostics.otel.*Endpoint`, `diagnostics.otel.enabled`, `diagnostics.otel.endpoint`, `diagnostics.otel.flushIntervalMs`, `diagnostics.otel.logs`, `diagnostics.otel.logsExporter`, `diagnostics.otel.protocol`, `diagnostics.otel.sampleRate`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/opentelemetry/configuration](https://docs.openclaw.ai/gateway/opentelemetry/configuration)</sub>

---

### `/gateway/opentelemetry/privacy-and-trace-context` — Privacy and trace context

**Privacy and trace context** · *Gateway & Ops › OpenTelemetry*

> Continue an upstream W3C trace through the Gateway WebSocket, and control what content leaves the process

<sub>source `docs/gateway/opentelemetry/privacy-and-trace-context.md` · 85 lines · 563 words · 1 code blocks</sub>

**Read when:** You want one OpenTelemetry trace per dataset item to cover the matching OpenClaw execution · You need to know exactly what prompt, response, or tool content is exported · You are approving `captureContent` against a retention policy

**Covers:** Continue an upstream WebSocket trace · Privacy and content capture

**Config:** `diagnostics.otel.captureContent`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/opentelemetry/privacy-and-trace-context](https://docs.openclaw.ai/gateway/opentelemetry/privacy-and-trace-context)</sub>

---

### `/gateway/opentelemetry/model-calls-and-metrics` — Model calls and exported metrics

**Model calls and exported metrics** · *Gateway & Ops › OpenTelemetry*

> What a model-call span measures, Claude Code CLI turn fidelity, and the full exported metric catalog

<sub>source `docs/gateway/opentelemetry/model-calls-and-metrics.md` · 293 lines · 2237 words</sub>

**Read when:** You need the exact metric names and attribute shapes to build dashboards or alerts · You are comparing request-level and turn-level model-call observations · You are reading Claude Code CLI byte, timing, or usage numbers

**Covers:** Model-call observation units · Claude Code CLI model-call fidelity · Exported metrics <sub>(11 sub-sections)</sub>

**Config:** `session.long_running`, `session.recovery.completed`, `session.recovery.requested`, `session.stalled`, `session.stuck`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/opentelemetry/model-calls-and-metrics](https://docs.openclaw.ai/gateway/opentelemetry/model-calls-and-metrics)</sub>

---

### `/gateway/opentelemetry/spans-and-events` — Exported spans and diagnostic events

**Exported spans and diagnostic events** · *Gateway & Ops › OpenTelemetry*

> The exported span catalog with its attributes, and the diagnostic event catalog behind the metrics and spans

<sub>source `docs/gateway/opentelemetry/spans-and-events.md` · 207 lines · 1094 words · 2 code blocks</sub>

**Read when:** You need the exact span names or attribute shapes to build dashboards or alerts · You are subscribing a plugin to public diagnostic events · You need session-correlated usage that the exported metrics intentionally omit

**Covers:** Exported spans · Diagnostic event catalog

**CLI:** `openclaw gateway call`, `openclaw gateway usage-cost`

**Config:** `diagnostics.otel.captureContent`, `diagnostics.stability`, `gateway.event_loop.sample`, `gateway.rpc`, `session.long_running`, `session.stalled`, `session.state`, `session.stuck`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/opentelemetry/spans-and-events](https://docs.openclaw.ai/gateway/opentelemetry/spans-and-events)</sub>

---

### `/gateway/prometheus` — Prometheus metrics

**Prometheus metrics** · *Gateway & Ops › Health and diagnostics*

> Expose OpenClaw diagnostics as Prometheus text metrics through the diagnostics-prometheus plugin

<sub>source `docs/gateway/prometheus.md` · 522 lines · 3203 words · 8 code blocks</sub>

**Read when:** You want Prometheus, Grafana, VictoriaMetrics, or another scraper to collect OpenClaw Gateway metrics · You need the Prometheus metric names and label policy for dashboards or alerts · You want metrics without running an OpenTelemetry collector

**Covers:** Quick start · Metrics exported · Label policy · PromQL recipes · Choosing between Prometheus and OpenTelemetry export · Troubleshooting · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw gateway call`, `openclaw gateway restart`, `openclaw plugins enable`, `openclaw plugins install`, `openclaw plugins list`

**Config:** `diagnostics.enabled`, `session.materialize`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/prometheus](https://docs.openclaw.ai/gateway/prometheus)</sub>

---

### `/gateway/logging` — Gateway logging

**Gateway logging** · *Gateway & Ops › Health and diagnostics*

> Logging surfaces, file logs, WS log styles, and console formatting

<sub>source `docs/gateway/logging.md` · 375 lines · 3096 words · 3 code blocks</sub>

**Read when:** Changing logging output or formats · Debugging CLI or gateway output

**Covers:** File-based logger · Console capture · Redaction · Gateway WebSocket logs · Console formatting (subsystem logging) · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw logs`

**Config:** `cron.list`, `diagnostics.enabled`, `logging.consoleLevel`, `logging.consoleStyle`, `logging.file`, `logging.level`, `logging.maxFileBytes`, `logging.redactPatterns`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/logging](https://docs.openclaw.ai/gateway/logging)</sub>

---

### `/gateway/diagnostics` — Diagnostics export

**Diagnostics export** · *Gateway & Ops › Health and diagnostics*

> Create shareable Gateway diagnostics bundles for bug reports

<sub>source `docs/gateway/diagnostics.md` · 549 lines · 3937 words · 14 code blocks</sub>

**Read when:** Preparing a bug report or support request · Debugging Gateway crashes, restarts, memory pressure, or oversized payloads · Reviewing what diagnostics data is recorded or redacted

**Covers:** Quick start · Chat command · What the export contains · Privacy model · WebSocket disconnect logs · Command-lane diagnostics · Stability recorder · CPU profile · Full heap snapshot · Sampling heap profile · Useful options · Disable diagnostics · Related

**CLI:** `openclaw gateway call`, `openclaw gateway diagnostics`, `openclaw gateway stability`

**Config:** `diagnostics.json`, `logging.level`, `session.discussion.info`, `session.discussion.open`, `session.members.list`, `session.members.listEvidence`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/diagnostics](https://docs.openclaw.ai/gateway/diagnostics)</sub>

---

### `/gateway/troubleshooting` — Troubleshooting

**Troubleshooting** · *Gateway & Ops › Health and diagnostics*

> Index of the deep gateway troubleshooting runbook, grouped by symptom area

<sub>source `docs/gateway/troubleshooting.md` · 171 lines · 723 words · 5 code blocks</sub>

**Read when:** The troubleshooting hub pointed you here for deeper diagnosis · You need stable symptom based runbook sections with exact commands

**Covers:** Command ladder · Symptom index · Where each section moved · If you upgraded and something suddenly broke · Related

**CLI:** `openclaw channels status`, `openclaw config get`, `openclaw devices list`, `openclaw doctor`, `openclaw doctor
openclaw`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway status`

**Config:** `gateway.auth.token`, `gateway.token`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting](https://docs.openclaw.ai/gateway/troubleshooting)</sub>

---

### `/gateway/troubleshooting/updates-and-rollbacks` — Updates and rollbacks

**Updates and rollbacks** · *Gateway & Ops › Troubleshooting*

> Symptoms that appear after an update, a rollback, or a split-brain install of the Gateway

<sub>source `docs/gateway/troubleshooting/updates-and-rollbacks.md` · 98 lines · 538 words · 4 code blocks</sub>

**Read when:** An update finished and the Gateway is down, channels are empty, or model calls return 401 · Logs report a protocol mismatch, a newer-config guard, or a prepared model runtime timeout · You need to tell a version-drift problem apart from a runtime fault

**Covers:** After an update · Prepared model runtime publication timeout · Split brain installs and newer config guard · Protocol mismatch after rollback

**CLI:** `openclaw config get`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw logs`, `openclaw status`, `openclaw update status`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting/updates-and-rollbacks](https://docs.openclaw.ai/gateway/troubleshooting/updates-and-rollbacks)</sub>

---

### `/gateway/troubleshooting/skills-and-model-providers` — Skills and model providers

**Skills and model providers** · *Gateway & Ops › Troubleshooting*

> Skill root containment, Anthropic 429s, upstream 403s, and local OpenAI-compatible backends

<sub>source `docs/gateway/troubleshooting/skills-and-model-providers.md` · 163 lines · 852 words · 6 code blocks</sub>

**Read when:** A skill symlink is skipped as a path escape · Model calls fail with 429 extra-usage or upstream 403 responses · A local OpenAI-compatible backend passes direct probes but agent runs still fail

**Covers:** Skill symlink skipped as path escape · Anthropic 429 extra usage required for long context · Upstream 403 blocked responses · Local OpenAI-compatible backend passes direct probes but agent runs fail

**CLI:** `openclaw config get`, `openclaw infer model`, `openclaw logs`, `openclaw models status`, `openclaw status
openclaw`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting/skills-and-model-providers](https://docs.openclaw.ai/gateway/troubleshooting/skills-and-model-providers)</sub>

---

### `/gateway/troubleshooting/agent-replies-and-control-ui` — Agent replies and Control UI

**Agent replies and Control UI** · *Gateway & Ops › Troubleshooting*

> Storage errors, missing replies, and dashboard or Control UI connectivity and auth codes

<sub>source `docs/gateway/troubleshooting/agent-replies-and-control-ui.md` · 145 lines · 1131 words · 4 code blocks</sub>

**Read when:** An agent run fails with a storage error · Messages arrive but no reply comes back · The dashboard or Control UI will not connect and you need the auth detail codes

**Covers:** Agent run failed with a storage error · No replies · Dashboard control UI connectivity <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config get`, `openclaw devices approve`, `openclaw devices list`, `openclaw devices rotate`, `openclaw doctor
openclaw`, `openclaw gateway auth-token`, `openclaw gateway restart`, `openclaw gateway start`

**Config:** `gateway.controlUi.allowedOrigins`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting/agent-replies-and-control-ui](https://docs.openclaw.ai/gateway/troubleshooting/agent-replies-and-control-ui)</sub>

---

### `/gateway/troubleshooting/gateway-service-and-process` — Gateway service and process

**Gateway service and process** · *Gateway & Ops › Troubleshooting*

> The managed gateway service not running, macOS launchd faults, and high-memory exits

<sub>source `docs/gateway/troubleshooting/gateway-service-and-process.md` · 308 lines · 2168 words · 13 code blocks</sub>

**Read when:** The gateway service is not running or will not stay up · A macOS Gateway stalls until you touch the dashboard, or duplicate LaunchAgents fight each other · The Gateway exits under high memory use and you need heap sizing guidance

**Covers:** Gateway service not running · macOS gateway silently stops responding, then resumes when you touch the dashboard · macOS launchd supervisor loop with duplicate gateway/node LaunchAgents · Native aborts on Linux (SIGABRT) · Gateway exits during high memory use

**CLI:** `openclaw doctor`, `openclaw doctor
openclaw`, `openclaw gateway call`, `openclaw gateway diagnostics`, `openclaw gateway install`, `openclaw gateway run`, `openclaw gateway stability`, `openclaw gateway status`

**Config:** `gateway.log`, `gateway.mode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting/gateway-service-and-process](https://docs.openclaw.ai/gateway/troubleshooting/gateway-service-and-process)</sub>

---

### `/gateway/troubleshooting/config-validation-and-probes` — Config validation and probes

**Config validation and probes** · *Gateway & Ops › Troubleshooting*

> Recovering from a rejected config and reading gateway probe warnings

<sub>source `docs/gateway/troubleshooting/config-validation-and-probes.md` · 105 lines · 693 words · 3 code blocks</sub>

**Read when:** The Gateway rejected an invalid config and you need the recovery path · You need to know what the `.rejected`, `.bak`, and last-known-good copies hold · Gateway probe warnings appear in status or doctor output

**Covers:** Gateway rejected invalid config · Gateway probe warnings

**CLI:** `openclaw config file`, `openclaw config set`, `openclaw config validate`, `openclaw doctor`, `openclaw gateway probe`, `openclaw logs`

**Config:** `gateway.auth.*`, `gateway.remote.*`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting/config-validation-and-probes](https://docs.openclaw.ai/gateway/troubleshooting/config-validation-and-probes)</sub>

---

### `/gateway/troubleshooting/channel-delivery-and-tools` — Channel delivery and tools

**Channel delivery and tools** · *Gateway & Ops › Troubleshooting*

> Channels that connect but do not deliver, cron and heartbeat delivery, and node or browser tool failures

<sub>source `docs/gateway/troubleshooting/channel-delivery-and-tools.md` · 156 lines · 892 words · 4 code blocks</sub>

**Read when:** A channel is connected but messages are not flowing · Cron or heartbeat deliveries do not arrive · A paired node fails on tool calls, or the browser tool fails

**Covers:** Channel connected, messages not flowing · Cron and heartbeat delivery · Node paired, tool fails · Browser tool fails

**CLI:** `openclaw approvals get`, `openclaw automations list`, `openclaw automations runs`, `openclaw automations status`, `openclaw browser profiles`, `openclaw browser start`, `openclaw browser status`, `openclaw browser stop`

**Config:** `agents.defaults.heartbeat.directPolicy`, `plugins.allow`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/troubleshooting/channel-delivery-and-tools](https://docs.openclaw.ai/gateway/troubleshooting/channel-delivery-and-tools)</sub>

---

### `/gateway/gateway-lock` — Gateway lock

**Gateway lock** · *Gateway & Ops › Scaling and operations*

> Gateway singleton guard: file lock plus WebSocket/HTTP bind

<sub>source `docs/gateway/gateway-lock.md` · 69 lines · 1027 words · 3 code blocks</sub>

**Read when:** Running or debugging the gateway process · Investigating single-instance enforcement

**Covers:** Why · Three layers · Operational notes · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw gateway`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/gateway-lock](https://docs.openclaw.ai/gateway/gateway-lock)</sub>

---

### `/gateway/background-process` — Background exec and process tool

**Background exec and process tool** · *Gateway & Ops › Scaling and operations*

> Background exec execution and process management

<sub>source `docs/gateway/background-process.md` · 277 lines · 2553 words · 9 code blocks</sub>

**Read when:** Adding or modifying background exec behavior · Debugging long-running exec tasks

**Covers:** exec tool · Worker environments · Child process bridging · process tool · Examples · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw config set`

**Config:** `agents.defaults.heartbeat.every`, `tools.exec.backgroundMs`, `tools.exec.cleanupMs`, `tools.exec.notifyOnExit`, `tools.exec.notifyOnExitEmptySuccess`, `tools.exec.timeoutSeconds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/background-process](https://docs.openclaw.ai/gateway/background-process)</sub>

---

### `/gateway/restart-recovery` — Restart recovery

**Restart recovery** · *Gateway & Ops › Scaling and operations*

> What survives a gateway restart or crash: eligible interrupted turns resume, native subagents settle, and queued deliveries drain

<sub>source `docs/gateway/restart-recovery.md` · 914 lines · 8294 words · 3 code blocks</sub>

**Read when:** You want to know whether restarting the gateway loses in-progress agent work · An agent run was interrupted by a restart, crash, or config reload · You are debugging automatic session recovery after the gateway comes back up

**Covers:** What survives a restart · Graceful restarts drain first · Host sleep and process freezes · Recovery after a failed update · How interrupted work is detected · Automatic resume · Safety valves and observability · Verify recovery after an update · What is not resumed <sub>(5 sub-sections)</sub>

**CLI:** `openclaw channels status`, `openclaw doctor`, `openclaw gateway call`, `openclaw gateway restart`, `openclaw gateway start`, `openclaw gateway status`, `openclaw status`, `openclaw triage`

**Config:** `channels.start`, `gateway.suspend.*`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/restart-recovery](https://docs.openclaw.ai/gateway/restart-recovery)</sub>

---

### `/gateway/cloud-sessions` — Cloud Sessions

**Cloud Sessions** · *Gateway & Ops › Scaling and operations*

> Run sessions on paired devices or throwaway cloud machines while the Gateway keeps the transcript, workspace, and credentials

<sub>source `docs/gateway/cloud-sessions.md` · 130 lines · 3085 words · 1 code blocks</sub>

**Covers:** Start without a Gateway checkout · Images and attachments · Paired devices: your own hardware as session hosts · Cloud workers: rented machines through Crabbox · Viewing the session desktop · Desktop and computer control · Automatic load balancing across devices · Sleeping and waking: idle suspension and warm images · What stays with the Gateway · Related

**CLI:** `openclaw connect`, `openclaw gateway`

**Config:** `tools.alsoAllow`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-sessions](https://docs.openclaw.ai/gateway/cloud-sessions)</sub>

---

### `/gateway/cloud-workers` — Cloud Workers

**Cloud Workers** · *Gateway & Ops › Scaling and operations*

> Dispatch session work to throwaway cloud machines with OpenClaw worker turns or Codex remote execution

<sub>source `docs/gateway/cloud-workers.md` · 173 lines · 2991 words · 2 code blocks</sub>

**Covers:** What each page covers · What runs where · Requirements · Configuration · Where each section moved · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw connect`, `openclaw crabbox run`, `openclaw gateway restart`, `openclaw qr`, `openclaw worker`

**Config:** `gateway.publicOrigin`, `gateway.trustedProxies`, `plugins.entries.device-pair.config.publicUrl`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers](https://docs.openclaw.ai/gateway/cloud-workers)</sub>

---

### `/gateway/cloud-workers/warm-images` — Cloud worker warm images

**Cloud worker warm images** · *Gateway & Ops › Cloud Workers*

> Capture, reuse, refresh, and recover prepared cloud-worker images

<sub>source `docs/gateway/cloud-workers/warm-images.md` · 327 lines · 5307 words · 5 code blocks</sub>

**Covers:** Warm images <sub>(5 sub-sections)</sub>

**CLI:** `openclaw crabbox warm-images`, `openclaw doctor`

**Config:** `plugins.entries.crabbox.config.warmImages`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/warm-images](https://docs.openclaw.ai/gateway/cloud-workers/warm-images)</sub>

---

### `/gateway/cloud-workers/per-project-default-profiles` — Per-project default profiles

**Per-project default profiles** · *Gateway & Ops › Cloud Workers*

> Map a repository to a default cloud worker profile, and how provision replay adopts a fixed lease

<sub>source `docs/gateway/cloud-workers/per-project-default-profiles.md` · 30 lines · 428 words · 1 code blocks</sub>

**Covers:** Per-project default profiles

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/per-project-default-profiles](https://docs.openclaw.ai/gateway/cloud-workers/per-project-default-profiles)</sub>

---

### `/gateway/cloud-workers/setup-and-bundle-installation` — Worker setup and bundle installation

**Worker setup and bundle installation** · *Gateway & Ops › Cloud Workers*

> The idempotent setup command, Gateway-prepared runtime archives, and building a custom node package

<sub>source `docs/gateway/cloud-workers/setup-and-bundle-installation.md` · 106 lines · 2179 words · 4 code blocks</sub>

**Covers:** The setup command · Bundle installation · Build a complete custom node package <sub>(2 sub-sections)</sub>

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/setup-and-bundle-installation](https://docs.openclaw.ai/gateway/cloud-workers/setup-and-bundle-installation)</sub>

---

### `/gateway/cloud-workers/verify-the-profile` — Verify a cloud worker profile

**Verify a cloud worker profile** · *Gateway & Ops › Cloud Workers*

> Validate config, confirm the profile is advertised, and prove a new cloud worker profile end to end

<sub>source `docs/gateway/cloud-workers/verify-the-profile.md` · 28 lines · 313 words · 2 code blocks</sub>

**Covers:** Verify the profile

**CLI:** `openclaw config validate`, `openclaw gateway call`, `openclaw gateway restart`, `openclaw plugins inspect`

**Config:** `gateway.nodes.commands.allow`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/verify-the-profile](https://docs.openclaw.ai/gateway/cloud-workers/verify-the-profile)</sub>

---

### `/gateway/cloud-workers/dispatching-a-session` — Dispatching a cloud session

**Dispatching a cloud session** · *Gateway & Ops › Cloud Workers*

> Eligibility gates, the Control UI Place picker, cloud child sessions, and runtime support

<sub>source `docs/gateway/cloud-workers/dispatching-a-session.md` · 41 lines · 835 words</sub>

**Covers:** Dispatching a session <sub>(2 sub-sections)</sub>

**CLI:** `openclaw worker`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/dispatching-a-session](https://docs.openclaw.ai/gateway/cloud-workers/dispatching-a-session)</sub>

---

### `/gateway/cloud-workers/placement-and-machine-selection` — Placement and machine selection

**Placement and machine selection** · *Gateway & Ops › Cloud Workers*

> Codex on a paired device, either harness on a cloud profile, and per-session operating system and machine class

<sub>source `docs/gateway/cloud-workers/placement-and-machine-selection.md` · 109 lines · 1639 words · 3 code blocks</sub>

**Covers:** Codex on a paired device · Codex or OpenClaw on a cloud profile · Provider identity in the picker · Choose an operating system and machine class per session

**CLI:** `openclaw gateway call`

**Config:** `gateway.nodes.commands.allow`, `plugins.allow`, `tools.github`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/placement-and-machine-selection](https://docs.openclaw.ai/gateway/cloud-workers/placement-and-machine-selection)</sub>

---

### `/gateway/cloud-workers/session-lifecycle` — Cloud session lifecycle and durability

**Cloud session lifecycle and durability** · *Gateway & Ops › Cloud Workers*

> Dispatch, workspace reconciliation, moves, stop and reclaim, recovery, and what survives a dead machine

<sub>source `docs/gateway/cloud-workers/session-lifecycle.md` · 190 lines · 5709 words · 2 code blocks</sub>

**Covers:** What survives a dead machine

**CLI:** `openclaw gateway call`

**Config:** `tools.github`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/session-lifecycle](https://docs.openclaw.ai/gateway/cloud-workers/session-lifecycle)</sub>

---

### `/gateway/cloud-workers/desktop` — Cloud Worker Desktop

**Cloud Worker Desktop** · *Gateway & Ops › Cloud Workers*

> Watch or control a desktop-capable cloud worker from the Control UI

<sub>source `docs/gateway/cloud-workers/desktop.md` · 164 lines · 2242 words · 1 code blocks</sub>

**Covers:** Ask the agent to open an app · Desktop (interactive) · macOS image prerequisites · Native Windows prerequisites · Desktop size

**CLI:** `openclaw worker`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/desktop](https://docs.openclaw.ai/gateway/cloud-workers/desktop)</sub>

---

### `/gateway/cloud-workers/security-model` — Cloud worker security model

**Cloud worker security model** · *Gateway & Ops › Cloud Workers*

> Worker ingress, tool authority, minted credentials, enrollment binding, and credential boundaries

<sub>source `docs/gateway/cloud-workers/security-model.md` · 18 lines · 896 words</sub>

**Covers:** Security model

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/security-model](https://docs.openclaw.ai/gateway/cloud-workers/security-model)</sub>

---

### `/gateway/cloud-workers/troubleshooting` — Cloud worker troubleshooting

**Cloud worker troubleshooting** · *Gateway & Ops › Cloud Workers*

> Symptoms and fixes for profile advertisement, authorization, bootstrap, enrollment, and teardown

<sub>source `docs/gateway/cloud-workers/troubleshooting.md` · 41 lines · 2717 words</sub>

**Covers:** Troubleshooting

**CLI:** `openclaw crabbox warm-images`, `openclaw doctor`, `openclaw gateway call`, `openclaw gateway restart`

**Config:** `gateway.nodes.commands.allow`, `gateway.trustedProxies`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloud-workers/troubleshooting](https://docs.openclaw.ai/gateway/cloud-workers/troubleshooting)</sub>

---

### `/gateway/multiple-gateways` — Multiple gateways

**Multiple gateways** · *Gateway & Ops › Scaling and operations*

> Run multiple OpenClaw Gateways on one host (isolation, ports, and profiles)

<sub>source `docs/gateway/multiple-gateways.md` · 147 lines · 775 words · 6 code blocks</sub>

**Read when:** Running more than one Gateway on the same machine · You need isolated config/state/ports per Gateway

**Covers:** Rescue-bot quickstart · General multi-gateway setup · Isolation checklist · Port mapping (derived) · Browser/CDP notes (common footgun) · Manual env example · Quick checks · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw gateway`, `openclaw gateway install`, `openclaw gateway status`, `openclaw setup`, `openclaw setup
openclaw`, `openclaw status
openclaw`

**Config:** `agents.defaults.workspace`, `gateway.port`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/multiple-gateways](https://docs.openclaw.ai/gateway/multiple-gateways)</sub>

---

### `/gateway/multi-tenant-hosting` — Multi-tenant hosting

**Multi-tenant hosting** · *Gateway & Ops › Scaling and operations*

> Host multiple tenant trust domains as one isolated OpenClaw Gateway cell per tenant

<sub>source `docs/gateway/multi-tenant-hosting.md` · 101 lines · 1074 words · 5 code blocks</sub>

**Read when:** You are hosting OpenClaw for multiple users or organizations · You need to choose an isolation boundary for tenant workloads

**Covers:** Why each tenant needs a cell · Architecture · Trust boundary · Isolation ladder · Quick start · Current scope · Related

**CLI:** `openclaw fleet`, `openclaw fleet create`, `openclaw fleet rm`, `openclaw fleet status`, `openclaw fleet upgrade`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/multi-tenant-hosting](https://docs.openclaw.ai/gateway/multi-tenant-hosting)</sub>

---

### `/gateway/security` — Security

**Security** · *Gateway & Ops › Security and sandboxing*

> Trust model, safe defaults, and hardening guidance for running OpenClaw

<sub>source `docs/gateway/security/index.md` · 150 lines · 880 words · 1 code blocks</sub>

**Read when:** Adding features that widen access or automation · Reviewing OpenClaw security posture or hardening a deployment

**Covers:** Security pages · Where each section moved

**CLI:** `openclaw policy`, `openclaw security`, `openclaw security audit`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security](https://docs.openclaw.ai/gateway/security)</sub>

---

### `/gateway/security/trust-model` — Security trust model

**Security trust model** · *Gateway & Ops › Security and sandboxing*

> The trust boundary OpenClaw supports, the controls it does and does not provide, and how to report a vulnerability

<sub>source `docs/gateway/security/trust-model.md` · 81 lines · 1175 words</sub>

**Read when:** Deciding whether one Gateway can serve a set of users · Triaging a security report against the documented trust boundary · Reporting a suspected vulnerability in OpenClaw

**Covers:** Scope: one trust boundary per gateway · Trust boundary matrix · Not vulnerabilities by design · Gateway and node trust · Threat model · Reporting security issues

**Config:** `gateway.auth`, `gateway.nodes.pairing.autoApproveCidrs`, `gateway.nodes.pairing.sshVerify`, `tools.agentToAgent`, `tools.agentToAgent.allow`, `tools.agentToAgent.enabled`, `tools.sessions`, `tools.sessions.visibility`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/trust-model](https://docs.openclaw.ai/gateway/security/trust-model)</sub>

---

### `/gateway/security/running-the-audit` — Running the security audit

**Running the security audit** · *Gateway & Ops › Security and sandboxing*

> What openclaw security audit inspects and the order to fix its findings in

<sub>source `docs/gateway/security/running-the-audit.md` · 39 lines · 416 words · 1 code blocks</sub>

**Read when:** You changed config and want to know whether you drifted from safe defaults · You are about to expose a network surface · You have audit findings and need a triage order

**Covers:** openclaw security audit <sub>(2 sub-sections)</sub>

**CLI:** `openclaw security audit`

**Config:** `agents.defaults.sandbox.sessionToolsVisibility`, `gateway.*`, `gateway.bind_no_auth`, `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `hooks.*`, `plugins.*`, `sandbox.*`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/running-the-audit](https://docs.openclaw.ai/gateway/security/running-the-audit)</sub>

---

### `/gateway/security/audit-checks` — Security audit checks

**Security audit checks** · *Gateway & Ops › Security and sandboxing*

> Reference catalog of checkIds emitted by openclaw security audit

<sub>source `docs/gateway/security/audit-checks.md` · 168 lines · 2768 words</sub>

**Read when:** You saw a specific `checkId` in `openclaw security audit` output and want to know what it means · You need the fix key/path for a given finding · You are triaging severity across a security audit run

**Covers:** Related

**CLI:** `openclaw sandbox recreate`, `openclaw security audit`

**Config:** `agents.*.sandbox.docker.binds[]`, `agents.*.sandbox.docker.network`, `agents.*.sandbox.docker.securityOpt`, `agents.*.sandbox.mode`, `agents.*.sandbox.workspaceAccess`, `agents.defaults.sandbox.mode`, `agents.entries.*.sandbox.mode`, `agents.entries.*.tools.deny`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/audit-checks](https://docs.openclaw.ai/gateway/security/audit-checks)</sub>

---

### `/gateway/security/hardened-baseline` — Hardened baselines

**Hardened baselines** · *Gateway & Ops › Security and sandboxing*

> Copy/paste Gateway configurations that keep the deployment private, paired, and tool-restricted

<sub>source `docs/gateway/security/hardened-baseline.md` · 64 lines · 281 words · 2 code blocks</sub>

**Read when:** Setting up a new Gateway and wanting a safe starting config · Tightening an existing deployment back toward defaults

**Covers:** Hardened baseline in 60 seconds · Secure baseline (copy/paste) <sub>(2 sub-sections)</sub>

**Config:** `tools.toolsBySender`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/hardened-baseline](https://docs.openclaw.ai/gateway/security/hardened-baseline)</sub>

---

### `/gateway/security/access-control` — Access control and allowlists

**Access control and allowlists** · *Gateway & Ops › Security and sandboxing*

> Who can reach the agent: DM policy, allowlists, DM session isolation, context visibility, and command authorization

<sub>source `docs/gateway/security/access-control.md` · 77 lines · 713 words · 2 code blocks</sub>

**Read when:** Deciding who can DM or trigger the bot · Isolating DM sessions for a shared or multi-user inbox · Limiting which supplemental context reaches the model

**Covers:** DM access: pairing, allowlist, open, disabled · Context visibility vs trigger authorization · Command authorization <sub>(2 sub-sections)</sub>

**CLI:** `openclaw pairing approve`, `openclaw pairing list`, `openclaw security audit`

**Config:** `agents.entries.*.groupChat.mentionPatterns`, `channels.discord.allowFrom`, `channels.discord.dm.allowFrom`, `channels.discord.guilds`, `channels.imessage.groups`, `channels.slack.allowFrom`, `channels.slack.channels`, `channels.slack.dm.allowFrom`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/access-control](https://docs.openclaw.ai/gateway/security/access-control)</sub>

---

### `/gateway/security/prompt-injection` — Prompt injection

**Prompt injection** · *Gateway & Ops › Security and sandboxing*

> How untrusted content reaches the model, what OpenClaw does about it, and which layers you still have to enforce

<sub>source `docs/gateway/security/prompt-injection.md` · 67 lines · 904 words</sub>

**Read when:** The agent reads web pages, email, attachments, or other untrusted content · Choosing a model for a tool-enabled agent · Reviewing hook or cron payload handling

**Covers:** Prompt injection <sub>(3 sub-sections)</sub>

**CLI:** `openclaw or your`

**Config:** `gateway.http.endpoints.responses.files.urlAllowlist`, `hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`, `tools.agentToAgent.allow`, `tools.exec.strictInlineEval`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/prompt-injection](https://docs.openclaw.ai/gateway/security/prompt-injection)</sub>

---

### `/gateway/security/tool-permissions` — Tool and agent permissions

**Tool and agent permissions** · *Gateway & Ops › Security and sandboxing*

> Cross-provider messaging, control-plane tools, node execution, plugins, sandboxing, and per-agent access profiles

<sub>source `docs/gateway/security/tool-permissions.md` · 209 lines · 1561 words · 5 code blocks</sub>

**Read when:** Deciding which tools an agent may call · Restricting messaging across conversations or channel providers · Sandboxing an agent or a delegated sub-agent run · Giving several agents different levels of access on one Gateway

**Covers:** Control plane tools · Cross-provider messaging · Node execution (system.run) · Dynamic skills (watcher / remote nodes) · Plugins · Sandboxing · Per-agent access profiles (multi-agent) <sub>(5 sub-sections)</sub>

**CLI:** `openclaw security audit`

**Config:** `agents.defaults.sandbox`, `agents.defaults.sandbox.scope`, `agents.defaults.sandbox.workspaceAccess`, `agents.defaults.subagents.allowAgents`, `agents.entries.*.subagents.allowAgents`, `agents.entries.*.tools.elevated`, `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/tool-permissions](https://docs.openclaw.ai/gateway/security/tool-permissions)</sub>

---

### `/gateway/security/browser-control` — Browser control risks

**Browser control risks** · *Gateway & Ops › Security and sandboxing*

> What giving the model a real browser exposes, and the SSRF policy that bounds it

<sub>source `docs/gateway/security/browser-control.md` · 63 lines · 736 words · 1 code blocks</sub>

**Read when:** Enabling browser control or the Chrome extension relay · Deciding which browser profile an agent may drive · Tuning the browser SSRF allow and block lists

**Covers:** Browser control risks <sub>(1 sub-sections)</sub>

**Config:** `tools.web.fetch.ssrfPolicy.blockedHostnames`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/browser-control](https://docs.openclaw.ai/gateway/security/browser-control)</sub>

---

### `/gateway/security/network-exposure` — Network exposure

**Network exposure** · *Gateway & Ops › Security and sandboxing*

> Bind, firewall, discovery, Gateway auth, Tailscale, reverse proxy, and Control UI exposure settings

<sub>source `docs/gateway/security/network-exposure.md` · 217 lines · 1977 words · 8 code blocks</sub>

**Read when:** Binding the Gateway beyond loopback · Putting the Gateway behind a reverse proxy or Tailscale Serve · Auditing which dangerous flags are enabled

**Covers:** Network exposure <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw security audit`

**Config:** `agents.defaults.sandbox.docker.dangerouslyAllowContainerNamespaceJoin`, `agents.defaults.sandbox.docker.dangerouslyAllowExternalBindSources`, `agents.defaults.sandbox.docker.dangerouslyAllowReservedContainerTargets`, `channels.discord.dangerouslyAllowNameMatching`, `channels.googlechat.dangerouslyAllowNameMatching`, `channels.irc.dangerouslyAllowNameMatching`, `channels.mattermost.dangerouslyAllowNameMatching`, `channels.msteams.dangerouslyAllowNameMatching`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/network-exposure](https://docs.openclaw.ai/gateway/security/network-exposure)</sub>

---

### `/gateway/security/secrets-and-storage` — Secrets, storage, and logs

**Secrets, storage, and logs** · *Gateway & Ops › Security and sandboxing*

> What OpenClaw writes to disk, which files hold credentials, and how logs and transcripts are handled

<sub>source `docs/gateway/security/secrets-and-storage.md` · 84 lines · 1134 words · 1 code blocks</sub>

**Read when:** Deciding what to back up or encrypt on the Gateway host · Locking down state and config file permissions · Reviewing what session transcripts and logs can contain

**Covers:** Deployment and host trust · Secrets on disk · Secret scanning <sub>(4 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw status`

**Config:** `channels.slack.*`, `channels.telegram.tokenFile`, `logging.redactPatterns`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/secrets-and-storage](https://docs.openclaw.ai/gateway/security/secrets-and-storage)</sub>

---

### `/gateway/security/exposure-runbook` — Gateway exposure runbook

**Gateway exposure runbook** · *Gateway & Ops › Security and sandboxing*

> Pre-flight and rollback checklist before exposing an OpenClaw Gateway beyond loopback

<sub>source `docs/gateway/security/exposure-runbook.md` · 216 lines · 993 words · 4 code blocks</sub>

**Read when:** Exposing the Gateway over LAN, tailnet, Tailscale Serve, Funnel, or a reverse proxy · Reviewing a deployment before allowing real messaging users · Rolling back a risky remote access or DM configuration

**Covers:** Choose the exposure pattern · Pre-flight inventory · Baseline checks · Minimum safe baseline · DM and group exposure · Reverse proxy checks · Tool and sandbox review · Post-change validation · Rollback plan · Review checklist

**CLI:** `openclaw doctor
openclaw`, `openclaw gateway probe`, `openclaw health`, `openclaw security audit`

**Config:** `gateway.auth.trustedProxy.allowLoopback`, `gateway.auth.trustedProxy.allowUsers`, `gateway.bind`, `gateway.trustedProxies`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/exposure-runbook](https://docs.openclaw.ai/gateway/security/exposure-runbook)</sub>

---

### `/gateway/security/rate-limiting` — Rate limiting

**Rate limiting** · *Gateway & Ops › Security and sandboxing*

> Reference for every Gateway rate limit: pre-auth socket budgets and lockouts, browser and webhook throttles, the control-plane write backstop, ACP session caps, and restart cooldown

<sub>source `docs/gateway/security/rate-limiting.md` · 258 lines · 1616 words · 5 code blocks</sub>

**Read when:** A client sees `rate limit exceeded for <method>`, `AUTH_RATE_LIMITED`, or lockout errors · You want to tune `gateway.auth.rateLimit` · You are reasoning about brute-force protection on an exposed Gateway · You need to know which Gateway surfaces are throttled, at what limits

**Covers:** Unauthenticated WebSocket connections · Authentication attempts (pre-auth) · Control-plane writes (post-auth backstop) · ACP session creation · Restart cooldown · Operational notes <sub>(3 sub-sections)</sub>

**CLI:** `openclaw gateway run`

**Config:** `gateway.auth.rateLimit`, `gateway.restart.request`, `gateway.trustedProxies`, `plugins.install`, `plugins.setEnabled`, `plugins.uninstall`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/rate-limiting](https://docs.openclaw.ai/gateway/security/rate-limiting)</sub>

---

### `/gateway/security/operator-incident-response` — Operator incident response

**Operator incident response** · *Gateway & Ops › Security and sandboxing*

> Contain, rotate, audit, and collect evidence after a suspected compromise of your own Gateway

<sub>source `docs/gateway/security/operator-incident-response.md` · 30 lines · 242 words</sub>

**Read when:** You think your Gateway or a channel account was compromised · You need to rotate Gateway and provider credentials quickly · You are assembling evidence for a security report

**Covers:** Incident response <sub>(4 sub-sections)</sub>

**CLI:** `openclaw gateway`, `openclaw logs`, `openclaw security audit`

**Config:** `gateway.auth`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.bind`, `gateway.remote.token`, `logging.file`, `tools.elevated`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/operator-incident-response](https://docs.openclaw.ai/gateway/security/operator-incident-response)</sub>

---

### `/gateway/security/secure-file-operations` — Secure file operations

**Secure file operations** · *Gateway & Ops › Security and sandboxing*

> How OpenClaw handles local file access safely, including native Windows credential checks

<sub>source `docs/gateway/security/secure-file-operations.md` · 121 lines · 1367 words · 2 code blocks</sub>

**Read when:** Changing file access, archive extraction, workspace storage, or plugin filesystem helpers

**Covers:** Platform defaults · Windows path boundaries · What stays protected without native acceleration · What native acceleration adds · Plugin and core guidance

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/security/secure-file-operations](https://docs.openclaw.ai/gateway/security/secure-file-operations)</sub>

---

### `/gateway/operator-scopes` — Operator scopes

**Operator scopes** · *Gateway & Ops › Security and sandboxing*

> Operator roles, scopes, and approval-time checks for Gateway clients

<sub>source `docs/gateway/operator-scopes.md` · 646 lines · 4727 words · 3 code blocks</sub>

**Read when:** Debugging missing operator scope errors · Reviewing device or node pairing approvals · Adding or classifying Gateway RPC methods

**Covers:** Connection roles · Scope levels · Named operator roles · Identity scope grants · Method scope is only the first gate · Device pairing approvals · Node pairing approvals · Shared-secret auth · Related

**CLI:** `openclaw dashboard`, `openclaw logs`, `openclaw security audit`

**Config:** `gateway.auth.identityScopes`, `gateway.nodes.commands.allow`, `gateway.roles`, `gateway.roles.assignments.byGithubLogin`, `gateway.roles.default`, `plugins.sessionAction`, `session.reactions.list`, `session.reactions.set`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/operator-scopes](https://docs.openclaw.ai/gateway/operator-scopes)</sub>

---

### `/gateway/sandboxing` — Sandboxing

**Sandboxing** · *Gateway & Ops › Security and sandboxing*

> How OpenClaw sandboxing works: modes, scopes, workspace access, and images

<sub>source `docs/gateway/sandboxing.md` · 115 lines · 835 words · 1 code blocks</sub>

**Covers:** Sandboxing pages · Where each section moved · Tool policy and escape hatches · Multi-agent overrides · Minimal enable example · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw sandbox`, `openclaw sandbox explain`, `openclaw sandbox list`, `openclaw sandbox recreate`, `openclaw security audit`

**Config:** `agents.defaults.sandbox`, `agents.entries.*.sandbox`, `agents.entries.*.tools`, `agents.entries.*.tools.sandbox.tools`, `tools.elevated`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing](https://docs.openclaw.ai/gateway/sandboxing)</sub>

---

### `/gateway/sandboxing/what-gets-sandboxed` — What gets sandboxed

**What gets sandboxed** · *Gateway & Ops › Sandboxing*

> Which tool calls move into the sandbox and which stay on the Gateway host

<sub>source `docs/gateway/sandboxing/what-gets-sandboxed.md` · 24 lines · 196 words</sub>

**Covers:** What gets sandboxed

**Config:** `agents.defaults.sandbox.browser`, `tools.elevated`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/what-gets-sandboxed](https://docs.openclaw.ai/gateway/sandboxing/what-gets-sandboxed)</sub>

---

### `/gateway/sandboxing/modes-scope-and-backend` — Modes, scope, and backend

**Modes, scope, and backend** · *Gateway & Ops › Sandboxing*

> The three settings that control when sandboxing applies and how many environments are created

<sub>source `docs/gateway/sandboxing/modes-scope-and-backend.md` · 125 lines · 1147 words</sub>

**Covers:** Modes, scope, and backend <sub>(2 sub-sections)</sub>

**CLI:** `openclaw sandbox recreate`

**Config:** `agents.defaults.sandbox.backend`, `agents.defaults.sandbox.docker`, `agents.defaults.sandbox.mode`, `agents.defaults.sandbox.scope`, `agents.defaults.sandbox.ssh`, `plugins.entries.crabbox.config.sandbox`, `plugins.entries.openshell.config`, `session.scope`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/modes-scope-and-backend](https://docs.openclaw.ai/gateway/sandboxing/modes-scope-and-backend)</sub>

---

### `/gateway/sandboxing/supported-capability-matrix` — Supported capability matrix

**Supported capability matrix** · *Gateway & Ops › Sandboxing*

> What each sandbox backend supports for shell, files, workspace, network, browser, and plugin tools

<sub>source `docs/gateway/sandboxing/supported-capability-matrix.md` · 27 lines · 347 words</sub>

**Covers:** Supported capability matrix

**Config:** `tools.sandbox.tools`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/supported-capability-matrix](https://docs.openclaw.ai/gateway/sandboxing/supported-capability-matrix)</sub>

---

### `/gateway/sandboxing/docker-backend` — Docker backend

**Docker backend** · *Gateway & Ops › Sandboxing*

> Docker backend defaults, the restricted runtime posture, DooD constraints, and the sandboxed browser

<sub>source `docs/gateway/sandboxing/docker-backend.md` · 91 lines · 942 words · 1 code blocks</sub>

**Covers:** Docker backend <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw update`

**Config:** `agents.defaults.sandbox.browser.allowHostControl`, `agents.defaults.sandbox.browser.autoStart`, `agents.defaults.sandbox.browser.cdpSourceRange`, `agents.defaults.sandbox.browser.network`, `agents.defaults.sandbox.docker.gpus`, `sandbox.browser.binds`, `sandbox.docker.binds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/docker-backend](https://docs.openclaw.ai/gateway/sandboxing/docker-backend)</sub>

---

### `/gateway/sandboxing/podman-backend` — Podman backend

**Podman backend** · *Gateway & Ops › Sandboxing*

> Selecting the native Podman CLI, rootless user mapping, and Podman-outside-of-Podman constraints

<sub>source `docs/gateway/sandboxing/podman-backend.md` · 111 lines · 935 words · 3 code blocks</sub>

**Covers:** Podman backend · Changing connections and upgrading existing sandboxes · Host init prerequisite

**CLI:** `openclaw sandbox list`, `openclaw sandbox recreate`

**Config:** `sandbox.browser.enabled`, `sandbox.docker.*`, `sandbox.docker.user`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/podman-backend](https://docs.openclaw.ai/gateway/sandboxing/podman-backend)</sub>

---

### `/gateway/sandboxing/ssh-backend` — SSH backend

**SSH backend** · *Gateway & Ops › Sandboxing*

> Sandboxing tools on an arbitrary SSH-accessible machine, and its remote-canonical workspace

<sub>source `docs/gateway/sandboxing/ssh-backend.md` · 62 lines · 403 words · 1 code blocks</sub>

**Covers:** SSH backend

**CLI:** `openclaw sandbox recreate`

**Config:** `sandbox.docker.*`, `sandbox.ssh.workspaceRoot`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/ssh-backend](https://docs.openclaw.ai/gateway/sandboxing/ssh-backend)</sub>

---

### `/gateway/sandboxing/openshell-backend` — OpenShell backend

**OpenShell backend** · *Gateway & Ops › Sandboxing*

> The OpenShell managed sandbox, its mirror and remote workspace modes, and its lifecycle

<sub>source `docs/gateway/sandboxing/openshell-backend.md` · 40 lines · 170 words · 1 code blocks</sub>

**Covers:** OpenShell backend

**CLI:** `openclaw sandbox list`, `openclaw sandbox recreate`

**Config:** `sandbox.docker.binds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/openshell-backend](https://docs.openclaw.ai/gateway/sandboxing/openshell-backend)</sub>

---

### `/gateway/sandboxing/crabbox-backend` — Crabbox backend

**Crabbox backend** · *Gateway & Ops › Sandboxing*

> Tool-call isolation on a Crabbox-leased machine with fixed runtime identity and repository-owned execution

<sub>source `docs/gateway/sandboxing/crabbox-backend.md` · 58 lines · 634 words · 2 code blocks</sub>

**Covers:** Crabbox backend

**CLI:** `openclaw sandbox list`, `openclaw sandbox recreate`

**Config:** `agents.defaults.sandbox.ssh.workspaceRoot`, `sandbox.docker.binds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/crabbox-backend](https://docs.openclaw.ai/gateway/sandboxing/crabbox-backend)</sub>

---

### `/gateway/sandboxing/workspace-access` — Workspace access

**Workspace access** · *Gateway & Ops › Sandboxing*

> The none, ro, and rw workspace access modes, the role-required cap, and skill mirroring

<sub>source `docs/gateway/sandboxing/workspace-access.md` · 99 lines · 896 words</sub>

**Covers:** Workspace access · Managed project workspaces

**Config:** `agents.defaults.sandbox.workspaceAccess`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/workspace-access](https://docs.openclaw.ai/gateway/sandboxing/workspace-access)</sub>

---

### `/gateway/sandboxing/multiple-folders-for-one-agent` — Multiple folders for one agent

**Multiple folders for one agent** · *Gateway & Ops › Sandboxing*

> Docker bind mounts for extra host folders, their access modes, and the bind security rules

<sub>source `docs/gateway/sandboxing/multiple-folders-for-one-agent.md` · 116 lines · 691 words · 4 code blocks</sub>

**Covers:** Multiple folders for one agent <sub>(1 sub-sections)</sub>

**CLI:** `openclaw sandbox recreate`

**Config:** `agents.defaults.sandbox.browser.binds`, `agents.defaults.sandbox.docker.binds`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/multiple-folders-for-one-agent](https://docs.openclaw.ai/gateway/sandboxing/multiple-folders-for-one-agent)</sub>

---

### `/gateway/sandboxing/images-and-setup` — Images and setup

**Images and setup** · *Gateway & Ops › Sandboxing*

> Building the default, common, and browser sandbox images, and the network and certificate defaults

<sub>source `docs/gateway/sandboxing/images-and-setup.md` · 131 lines · 614 words · 5 code blocks</sub>

**Covers:** Images and setup

**Config:** `agents.defaults.sandbox.docker.image`, `agents.defaults.sandbox.docker.network`, `sandbox.docker.env`, `sandbox.docker.setupCommand`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/images-and-setup](https://docs.openclaw.ai/gateway/sandboxing/images-and-setup)</sub>

---

### `/gateway/sandboxing/setup-command` — setupCommand (one-time container setup)

**setupCommand (one-time container setup)** · *Gateway & Ops › Sandboxing*

> The one-time container setup hook, where it is configured, and its common pitfalls

<sub>source `docs/gateway/sandboxing/setup-command.md` · 33 lines · 290 words</sub>

**Covers:** setupCommand (one-time container setup)

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.sandbox.docker.env`, `agents.defaults.sandbox.docker.setupCommand`, `agents.entries.*.sandbox.docker.setupCommand`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandboxing/setup-command](https://docs.openclaw.ai/gateway/sandboxing/setup-command)</sub>

---

### `/gateway/openshell` — OpenShell

**OpenShell** · *Gateway & Ops › Security and sandboxing*

> Use OpenShell as a managed sandbox backend for OpenClaw agents

<sub>source `docs/gateway/openshell.md` · 570 lines · 2825 words · 11 code blocks</sub>

**Read when:** You want OpenShell-managed local or remote sandboxes · You are setting up the OpenShell plugin · You need to choose between mirror and remote workspace modes

**Covers:** Prerequisites · Quick start · Workspace modes · Configuration reference · Examples · Lifecycle management · Security hardening · Custom image contract · Current limitations · Troubleshooting · How it works · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config validate`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw logs`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw sandbox`, `openclaw sandbox explain`

**Config:** `agents.defaults.sandbox`, `agents.defaults.sandbox.backend`, `agents.defaults.sandbox.docker.env`, `plugins.entries.openshell.config`, `plugins.entries.openshell.config.command`, `plugins.entries.openshell.config.from`, `plugins.entries.openshell.config.gateway`, `plugins.entries.openshell.config.mode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/openshell](https://docs.openclaw.ai/gateway/openshell)</sub>

---

### `/gateway/sandbox-vs-tool-policy-vs-elevated` — Sandbox vs tool policy vs elevated

**Sandbox vs tool policy vs elevated** · *Gateway & Ops › Security and sandboxing*

> Why a tool is blocked: sandbox runtime, tool allow/deny policy, and elevated exec gates

<sub>source `docs/gateway/sandbox-vs-tool-policy-vs-elevated.md` · 155 lines · 1113 words · 2 code blocks</sub>

**Covers:** Quick debug · Sandbox: where tools run · Tool policy: which tools exist/are callable · Elevated: exec-only "run on host" · Common "sandbox jail" fixes · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw logs`, `openclaw sandbox explain`

**Config:** `agents.defaults.sandbox.*`, `agents.defaults.sandbox.mode`, `agents.defaults.sandbox.workspaceAccess`, `agents.entries.*.sandbox.*`, `agents.entries.*.tools.*`, `agents.entries.*.tools.allow`, `agents.entries.*.tools.byProvider[provider].profile`, `agents.entries.*.tools.deny`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated](https://docs.openclaw.ai/gateway/sandbox-vs-tool-policy-vs-elevated)</sub>

---

### `/gateway/permission-modes` — Session permission modes

**Session permission modes** · *Gateway & Ops › Security and sandboxing*

> Session permission modes, workspace boundaries, and escalation reviewers

<sub>source `docs/gateway/permission-modes.md` · 80 lines · 1365 words</sub>

**Read when:** Choosing a permission mode for an agent session · Understanding who reviews an exec escalation · Comparing session permissions with sandbox and tool policy

**Covers:** Session root and defaults · Delegated setup and repair · Change permissions during a task · Policy precedence and clamping

**CLI:** `openclaw doctor`

**Config:** `tools.exec.mode`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/permission-modes](https://docs.openclaw.ai/gateway/permission-modes)</sub>

---

### `/gateway/clients` — Building a Gateway client

**Building a Gateway client** · *Gateway & Ops › Protocols and APIs*

> Build a third-party operator or WebChat client for the Gateway WebSocket protocol

<sub>source `docs/gateway/clients.md` · 350 lines · 2587 words · 3 code blocks</sub>

**Read when:** Building an operator, dashboard, or WebChat client outside the OpenClaw repository · Implementing Gateway reconnect, history, approvals, or device pairing · Updating a third-party client for a new Gateway wire version

**Covers:** Install the packages · Choose scopes and pair the device · Advertise client capabilities · Validate attachments before sending · Recover state after reconnect · Render generated image artifacts · Download inline artifacts over HTTPS · Use history metadata and stable anchors · Subscribe instead of polling usage · Backfill exec approvals · Track protocol versions · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw configure`, `openclaw devices approve`, `openclaw devices list`, `openclaw onboard`

**Config:** `session.message`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/clients](https://docs.openclaw.ai/gateway/clients)</sub>

---

### `/gateway/external-apps` — Gateway integrations for external apps

**Gateway integrations for external apps** · *Gateway & Ops › Protocols and APIs*

> Current integration path for external apps, scripts, dashboards, CI jobs, and IDE extensions

<sub>source `docs/gateway/external-apps.md` · 341 lines · 2200 words · 4 code blocks</sub>

**Read when:** You are building an external app, script, dashboard, CI job, or IDE extension that talks to OpenClaw · You are choosing between Gateway RPC and the Plugin SDK · You are integrating with Gateway agent runs, sessions, events, approvals, models, or tools · You are pairing a hosting controller with an external wake scheduler

**Covers:** What is available today · Recommended path · Cooperative host suspension · App code vs plugin code · Related

**CLI:** `openclaw agent`, `openclaw gateway call`, `openclaw gateway resume`, `openclaw gateway suspend`, `openclaw message`

**Config:** `gateway.restart.request`, `gateway.suspend.*`, `gateway.suspend.handoff`, `gateway.suspend.prepare`, `gateway.suspend.resume`, `gateway.suspend.status`, `gateway.suspension`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/external-apps](https://docs.openclaw.ai/gateway/external-apps)</sub>

---

### `/gateway/protocol` — Gateway protocol

**Gateway protocol** · *Gateway & Ops › Protocols and APIs*

> Gateway WebSocket protocol: handshake, frames, versioning

<sub>source `docs/gateway/protocol.md` · 92 lines · 522 words</sub>

**Read when:** Implementing or updating gateway WS clients · Debugging protocol mismatches or connect failures · Regenerating protocol schema/models

**Covers:** Scope · What each page covers · Where each section moved · Related

**Config:** `models.list`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol](https://docs.openclaw.ai/gateway/protocol)</sub>

---

### `/gateway/protocol/transport` — Gateway protocol transport

**Gateway protocol transport** · *Gateway & Ops › Gateway protocol*

> Gateway WS transport: packages, frame shapes, limits, and WebRTC Talk control

<sub>source `docs/gateway/protocol/transport.md` · 216 lines · 1636 words</sub>

**Read when:** Choosing the gateway protocol or client package to install · Sizing frames, payload limits, or compression behavior · Implementing Gateway-controlled WebRTC Talk

**Covers:** npm packages · Transport and framing · Connection keepalives · Gateway-controlled WebRTC Talk <sub>(1 sub-sections)</sub>

**Config:** `gateway.suspension`, `session.error`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/transport](https://docs.openclaw.ai/gateway/protocol/transport)</sub>

---

### `/gateway/protocol/handshake` — Gateway protocol handshake

**Gateway protocol handshake** · *Gateway & Ops › Gateway protocol*

> Connect frame, hello-ok payload, client capabilities, roles, and scopes

<sub>source `docs/gateway/protocol/handshake.md` · 390 lines · 1904 words · 6 code blocks</sub>

**Read when:** Writing the connect frame for a new client · Debugging a rejected or downgraded handshake · Choosing the role and scopes a client should request

**Covers:** Handshake · Roles and scopes <sub>(4 sub-sections)</sub>

**CLI:** `openclaw worker`

**Config:** `agents.defaults.mediaMaxMb`, `gateway.publicOrigin`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/handshake](https://docs.openclaw.ai/gateway/protocol/handshake)</sub>

---

### `/gateway/protocol/presence` — Gateway protocol presence and events

**Gateway protocol presence and events** · *Gateway & Ops › Gateway protocol*

> Presence snapshots, node host stats, and broadcast event scoping

<sub>source `docs/gateway/protocol/presence.md` · 140 lines · 789 words · 3 code blocks</sub>

**Read when:** Rendering node presence or host stats in a client · Working out which broadcast events a session receives

**Covers:** Presence · Broadcast event scoping <sub>(2 sub-sections)</sub>

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/presence](https://docs.openclaw.ai/gateway/protocol/presence)</sub>

---

### `/gateway/protocol/rpc-methods` — Gateway protocol RPC methods

**Gateway protocol RPC methods** · *Gateway & Ops › Gateway protocol*

> RPC method families, discovery, session list bootstrap, and event families

<sub>source `docs/gateway/protocol/rpc-methods.md` · 49 lines · 336 words</sub>

**Read when:** Looking up a gateway RPC method and its scope · Bootstrapping a session list or subscribing to event families · Implementing node helper methods or exec lifecycle handling

**Covers:** RPC method families · What each page covers · Where each section moved

**Config:** `web.login.start`, `web.login.wait`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/rpc-methods](https://docs.openclaw.ai/gateway/protocol/rpc-methods)</sub>

---

### `/gateway/protocol/rpc-system-and-channels` — Gateway protocol system and channel methods

**Gateway protocol system and channel methods** · *Gateway & Ops › Gateway protocol*

> Gateway RPC families for system status, memory, models, channels, plugins, messaging, and the operator terminal

<sub>source `docs/gateway/protocol/rpc-system-and-channels.md` · 138 lines · 2610 words</sub>

**Read when:** Looking up a system, memory, model, channel, or plugin RPC · Wiring operator terminal or messaging methods · Checking the scope a gateway method requires

**Covers:** System and identity · Models and usage · Memory · Channels and login helpers · Plugin management · Messaging and logs · Operator terminal <sub>(1 sub-sections)</sub>

**Config:** `channels.logout`, `channels.start`, `channels.status`, `channels.stop`, `diagnostics.stability`, `gateway.identity.get`, `gateway.restart.preflight`, `gateway.restart.request`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/rpc-system-and-channels](https://docs.openclaw.ai/gateway/protocol/rpc-system-and-channels)</sub>

---

### `/gateway/protocol/rpc-talk-config-and-agents` — Gateway protocol talk, config, and agent methods

**Gateway protocol talk, config, and agent methods** · *Gateway & Ops › Gateway protocol*

> Gateway RPC families for Talk and TTS, secrets and config, updates, the wizard, and agent workspaces

<sub>source `docs/gateway/protocol/rpc-talk-config-and-agents.md` · 86 lines · 3223 words</sub>

**Read when:** Driving Talk, TTS, or realtime speech over the gateway · Reading or writing secrets, config, or update state · Calling agent and workspace helper methods

**Covers:** Talk and TTS · Secrets, config, update, and wizard · Agent and workspace helpers <sub>(1 sub-sections)</sub>

**Config:** `agents.create`, `agents.delete`, `agents.entries.*.skills`, `agents.files.get`, `agents.files.list`, `agents.files.set`, `agents.list`, `agents.update`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/rpc-talk-config-and-agents](https://docs.openclaw.ai/gateway/protocol/rpc-talk-config-and-agents)</sub>

---

### `/gateway/protocol/rpc-session-control` — Gateway protocol session control

**Gateway protocol session control** · *Gateway & Ops › Gateway protocol*

> The session control RPC family: listing, sending, streaming, forking, and lifecycle methods

<sub>source `docs/gateway/protocol/rpc-session-control.md` · 60 lines · 4610 words</sub>

**Read when:** Listing, filtering, or paginating sessions · Sending, streaming, or interrupting an agent run · Forking, archiving, or deleting a session

**Covers:** Session control

**Config:** `cron.history`, `session.approval`, `session.message`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/rpc-session-control](https://docs.openclaw.ai/gateway/protocol/rpc-session-control)</sub>

---

### `/gateway/protocol/rpc-devices-nodes-and-approvals` — Gateway protocol device, node, and approval methods

**Gateway protocol device, node, and approval methods** · *Gateway & Ops › Gateway protocol*

> Gateway RPC families for device pairing, node invoke, approvals, Control UI commands, and automation

<sub>source `docs/gateway/protocol/rpc-devices-nodes-and-approvals.md` · 83 lines · 1143 words</sub>

**Read when:** Pairing a device or minting a device token · Invoking a node or draining its pending work · Resolving approvals or driving Control UI commands

**Covers:** Device pairing and device tokens · Node pairing, invoke, and pending work · Approval families · Control UI commands · Automation, skills, and tools

**Config:** `cron.add`, `cron.get`, `cron.list`, `cron.remove`, `cron.run`, `cron.runs`, `cron.status`, `cron.update`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/gateway/protocol/rpc-devices-nodes-and-approvals](https://docs.openclaw.ai/gateway/protocol/rpc-devices-nodes-and-approvals)</sub>

---

### `/gateway/protocol/rpc-bootstrap-and-events` — Gateway protocol session bootstrap and events

**Gateway protocol session bootstrap and events** · *Gateway & Ops › Gateway protocol*

> Session list bootstrap, the common event families, and the node helper and exec lifecycle contracts

<sub>source `docs/gateway/protocol/rpc-bootstrap-and-events.md` · 360 lines · 3211 words · 1 code blocks</sub>

**Read when:** Bootstrapping a session list in one subscribe call · Subscribing to a gateway event family · Implementing node helper methods or exec lifecycle handling

**Covers:** Session list bootstrap · Session message subscriptions and narration · Common event families · Node helper methods · Node exec lifecycle events

**CLI:** `openclaw doctor`

**Config:** `plugins.changed`, `plugins.list`, `session.approval`, `session.message`, `session.narration`, `session.observer`, `session.operation`, `session.tool`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/rpc-bootstrap-and-events](https://docs.openclaw.ai/gateway/protocol/rpc-bootstrap-and-events)</sub>

---

### `/gateway/protocol/ledgers` — Gateway protocol ledger RPCs

**Gateway protocol ledger RPCs** · *Gateway & Ops › Gateway protocol*

> Audit ledger RPCs, scopes, cursors, and payloads

<sub>source `docs/gateway/protocol/ledgers.md` · 142 lines · 1051 words</sub>

**Read when:** Reading the audit ledger over the Gateway protocol

**Covers:** Audit ledger RPC

**CLI:** `openclaw audit`

**Config:** `logging.audit.enabled`, `logging.audit.messages`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/ledgers](https://docs.openclaw.ai/gateway/protocol/ledgers)</sub>

---

### `/gateway/protocol/operator-methods` — Gateway protocol operator methods

**Gateway protocol operator methods** · *Gateway & Ops › Gateway protocol*

> Operator helper methods, exec approvals, and agent delivery fallback

<sub>source `docs/gateway/protocol/operator-methods.md` · 278 lines · 2164 words · 1 code blocks</sub>

**Read when:** Building an operator surface on top of the Gateway · Resolving exec approvals from a client · Requesting outbound delivery from an agent run

**Covers:** Operator helper methods · Skill registry details · Exec approvals · Agent delivery fallback <sub>(1 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw models list`

**Config:** `agents.defaults.modelPolicy.allow`, `models.list`, `models.providers.*.models`, `models.snapshot`, `security.installPolicy`, `skills.detail`, `skills.install`, `skills.install.allowUploadedArchives`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/gateway/protocol/operator-methods](https://docs.openclaw.ai/gateway/protocol/operator-methods)</sub>

---

### `/gateway/protocol/versioning` — Gateway protocol versioning

**Gateway protocol versioning** · *Gateway & Ops › Gateway protocol*

> Protocol version constants, the N-1 node window, and client defaults

<sub>source `docs/gateway/protocol/versioning.md` · 62 lines · 458 words</sub>

**Read when:** Debugging a protocol version mismatch · Setting minProtocol and maxProtocol in a client · Checking a client timeout, retry, or buffer default

**Covers:** Versioning <sub>(1 sub-sections)</sub>

**Config:** `agents.defaults.mediaMaxMb`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/versioning](https://docs.openclaw.ai/gateway/protocol/versioning)</sub>

---

### `/gateway/protocol/auth` — Gateway protocol auth

**Gateway protocol auth** · *Gateway & Ops › Gateway protocol*

> Handshake auth paths, device identity, pairing signatures, and TLS pinning

<sub>source `docs/gateway/protocol/auth.md` · 176 lines · 1350 words</sub>

**Read when:** Choosing an auth path for a gateway client · Implementing device identity or signed pairing · Pinning a gateway TLS certificate

**Covers:** Auth · Device identity and pairing · TLS and pinning <sub>(1 sub-sections)</sub>

**Config:** `gateway.auth.password`, `gateway.auth.token`, `gateway.remote.tlsFingerprint`, `gateway.tls`

**TermCrab — gateway: BROKEN.** `checkToken` is exported (`src/gateway/auth.ts:16`) and imported nowhere; bind-time guard only (`src/gateway/server.ts:257`). Any local process can drive the agent.

<sub>live: [docs.openclaw.ai/gateway/protocol/auth](https://docs.openclaw.ai/gateway/protocol/auth)</sub>

---

### `/gateway/embedding` — Embedding OpenClaw

**Embedding OpenClaw** · *Gateway & Ops › Protocols and APIs*

> Supervise the OpenClaw Gateway as a child process from Electron or another host app

<sub>source `docs/gateway/embedding.md` · 161 lines · 980 words · 1 code blocks</sub>

**Read when:** Embedding OpenClaw in a desktop or server application · Supervising the Gateway as a child process · Handling Gateway readiness, restart, shutdown, or invalid config without scraping logs

**Covers:** Start the child with an embedding preset · Handle invalid config by exit code · Wait for protocol readiness · Interpret restart and shutdown · Use RPC instead of state files · Install; do not flatten · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `models.authStatus`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/embedding](https://docs.openclaw.ai/gateway/embedding)</sub>

---

### `/gateway/openai-http-api` — OpenAI chat completions

**OpenAI chat completions** · *Gateway & Ops › Protocols and APIs*

> Expose an OpenAI-compatible /v1/chat/completions HTTP endpoint from the Gateway

<sub>source `docs/gateway/openai-http-api.md` · 341 lines · 2103 words · 10 code blocks</sub>

**Read when:** Integrating tools that expect OpenAI Chat Completions

**Covers:** Enabling the endpoint · Security boundary (important) · Authentication · When to use this endpoint · Agent-first model contract · Session behavior · Request limits · Chat tool contract · Streaming (SSE) · Open WebUI quick setup · Examples · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw agent`

**Config:** `gateway.auth.password`, `gateway.auth.rateLimit`, `gateway.auth.token`, `gateway.http.endpoints.chatCompletions.images`, `gateway.http.endpoints.responses.enabled`, `memory.search.outputDimensionality`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/openai-http-api](https://docs.openclaw.ai/gateway/openai-http-api)</sub>

---

### `/gateway/openresponses-http-api` — OpenResponses API

**OpenResponses API** · *Gateway & Ops › Protocols and APIs*

> Expose an OpenResponses-compatible /v1/responses HTTP endpoint from the Gateway

<sub>source `docs/gateway/openresponses-http-api.md` · 303 lines · 1845 words · 8 code blocks</sub>

**Read when:** Integrating clients that speak the OpenResponses API · You want item-based inputs, client tool calls, or SSE events

**Covers:** Authentication, security, and routing · Session behavior · Request shape · Items (input) · Tools (client-side function tools) · Images (inputimage) · Files (inputfile) · File + image limits · Streaming (SSE) · Usage · Errors · Examples · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw agent`

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.http.endpoints.chatCompletions.enabled`, `gateway.http.endpoints.responses`, `gateway.http.endpoints.responses.enabled`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/openresponses-http-api](https://docs.openclaw.ai/gateway/openresponses-http-api)</sub>

---

### `/gateway/tools-invoke-http-api` — Tools invoke API

**Tools invoke API** · *Gateway & Ops › Protocols and APIs*

> Invoke a single tool directly via the Gateway HTTP endpoint

<sub>source `docs/gateway/tools-invoke-http-api.md` · 162 lines · 1182 words · 3 code blocks</sub>

**Read when:** Calling tools without running a full agent turn · Building automations that need tool policy enforcement

**Covers:** Authentication · Security boundary (important) · Request body · Policy + routing behavior · Responses · Example · Related

**Config:** `gateway.auth.password`, `gateway.auth.rateLimit`, `gateway.auth.token`, `gateway.tools`, `gateway.tools.allow`, `session.mainKey`, `tools.allow`, `tools.byProvider.allow`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/tools-invoke-http-api](https://docs.openclaw.ai/gateway/tools-invoke-http-api)</sub>

---

### `/gateway/cli-backends` — CLI backends

**CLI backends** · *Gateway & Ops › Models and local providers*

> CLI backends: local AI CLI fallback with optional MCP tool bridge

<sub>source `docs/gateway/cli-backends.md` · 593 lines · 5485 words · 12 code blocks</sub>

**Read when:** You want a reliable fallback when API providers fail · You are running local AI CLIs and want to reuse them · You want to understand the MCP loopback bridge for CLI backend tool access

**Covers:** Quick start · Using it as a fallback · Configuration · How it works · Timeouts and long-running work · Sessions · Fallback prelude from claude-cli sessions · Images · Inputs and outputs · Plugin-owned defaults · Text transform overlays · Native compaction ownership · Bundle MCP overlays · Reseed history cap · _+3 more_ <sub>(4 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw approvals allowlist`, `openclaw config set`, `openclaw config unset`, `openclaw logs`, `openclaw models auth`

**Config:** `agents.defaults.model.fallbacks`, `agents.defaults.modelPolicy.allow`, `agents.defaults.models`, `agents.defaults.timeoutSeconds`, `agents.defaults.utilityModel`, `session.reset`, `tools.allow`, `tools.deny`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cli-backends](https://docs.openclaw.ai/gateway/cli-backends)</sub>

---

### `/gateway/local-models` — Local models

**Local models** · *Gateway & Ops › Models and local providers*

> Run OpenClaw with hardware-aware local model setup or an existing model server

<sub>source `docs/gateway/local-models.md` · 363 lines · 2355 words · 10 code blocks</sub>

**Read when:** You want OpenClaw to recommend and install a model for your Gateway hardware · You want to serve models from your own GPU box · You are wiring LM Studio or an OpenAI-compatible proxy · You need the safest local model guidance

**Covers:** Hardware floor · Pick a backend · LM Studio + large local model (Responses API) · Other OpenAI-compatible local proxies · Smaller or stricter backends · Troubleshooting · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw doctor`, `openclaw infer model`, `openclaw models list`, `openclaw onboard`

**Config:** `agents.defaults.timeoutSeconds`, `agents.entries.*.experimental.localModelLean`, `tools.allow`, `tools.alsoAllow`, `tools.deny`, `tools.profile`, `tools.toolSearch`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/local-models](https://docs.openclaw.ai/gateway/local-models)</sub>

---

### `/gateway/local-model-services` — Local model services

**Local model services** · *Gateway & Ops › Models and local providers*

> Start local model servers on demand before OpenClaw model and embedding requests

<sub>source `docs/gateway/local-model-services.md` · 185 lines · 798 words · 3 code blocks</sub>

**Read when:** You want OpenClaw to start a local model server only when its model or embedding provider is selected · You run ds4, llmman, vLLM, llama.cpp, MLX, or another OpenAI-compatible local server · You need to control cold start, readiness, and idle shutdown for local providers

**Covers:** How it works · Managed llama.cpp · Config shape · Fields · llmman example · ds4 example · Related

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/local-model-services](https://docs.openclaw.ai/gateway/local-model-services)</sub>

---

### `/network` — Network

**Network** · *Gateway & Ops › Networking and discovery*

> Network hub: gateway surfaces, pairing, discovery, and security

<sub>source `docs/network.md` · 65 lines · 271 words</sub>

**Read when:** You need the network architecture + security overview · You are debugging local vs tailnet access or pairing · You want the canonical list of networking docs

**Covers:** Core model · Pairing + identity · Discovery + transports · Nodes + transports · Security · Related

**CLI:** `openclaw gateway`

<sub>live: [docs.openclaw.ai/network](https://docs.openclaw.ai/network)</sub>

---

### `/gateway/pairing` — Node pairing

**Node pairing** · *Gateway & Ops › Networking and discovery*

> Node capability approvals: how nodes gain command exposure after device pairing

<sub>source `docs/gateway/pairing.md` · 489 lines · 2936 words · 7 code blocks</sub>

**Read when:** Implementing node pairing approvals without macOS UI · Adding CLI flows for approving remote nodes · Extending gateway protocol with node management

**Covers:** How capability approval works · One-paste node pairing · CLI workflow (headless friendly) · API surface (gateway protocol) · Node command gating (2026.3.31+) · Node event trust boundaries (2026.3.31+) · Silent local pairing · SSH-verified device auto-approval (default) · Manual approval (macOS app) · Auto-approval (macOS app) · Trusted-CIDR device auto-approval · Silent pairing supersede cleanup · Metadata-upgrade auto-approval · QR pairing helpers · _+4 more_ <sub>(1 sub-sections)</sub>

**CLI:** `openclaw devices approve`, `openclaw devices list`, `openclaw devices rotate`, `openclaw doctor`, `openclaw node identity`, `openclaw node restart`, `openclaw node run`, `openclaw nodes approve`

**Config:** `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `gateway.nodes.pairing.autoApproveCidrs`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/gateway/pairing](https://docs.openclaw.ai/gateway/pairing)</sub>

---

### `/gateway/discovery` — Discovery and transports

**Discovery and transports** · *Gateway & Ops › Networking and discovery*

> Node discovery and transports (Bonjour, Tailscale, SSH) for finding the Gateway

<sub>source `docs/gateway/discovery.md` · 169 lines · 1051 words</sub>

**Read when:** Implementing or changing Bonjour discovery/advertising · Adjusting remote connection modes (direct vs SSH) · Designing node discovery + pairing for remote nodes

**Covers:** Terms · Why direct and SSH both exist · Discovery inputs · Transport selection (client policy) · Pairing and auth (direct transport) · Responsibilities by component · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw gateway`, `openclaw plugins enable`

**Config:** `gateway.bind`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/discovery](https://docs.openclaw.ai/gateway/discovery)</sub>

---

### `/gateway/bonjour` — Bonjour discovery

**Bonjour discovery** · *Gateway & Ops › Networking and discovery*

> Bonjour/mDNS discovery + debugging (Gateway beacons, clients, and common failure modes)

<sub>source `docs/gateway/bonjour.md` · 241 lines · 1809 words · 10 code blocks</sub>

**Read when:** Debugging Bonjour discovery issues on macOS/iOS · Changing mDNS service types, TXT records, or discovery UX

**Covers:** Wide-area Bonjour (Unicast DNS-SD) over Tailscale · What advertises · Service types · TXT keys (non-secret hints) · Debugging on macOS · Debugging in Gateway logs · Debugging on iOS node · When to enable Bonjour · When to disable Bonjour · Docker gotchas · Troubleshooting disabled Bonjour · Common failure modes · Escaped instance names (\032) · Enabling / disabling / configuration · _+1 more_ <sub>(4 sub-sections)</sub>

**CLI:** `openclaw dns`, `openclaw dns setup`, `openclaw plugins disable`, `openclaw plugins enable`

**Config:** `gateway.bind`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/bonjour](https://docs.openclaw.ai/gateway/bonjour)</sub>

---

### `/gateway/remote` — Remote access

**Remote access** · *Gateway & Ops › Remote access*

> Remote access using Gateway WS, SSH tunnels, and tailnets

<sub>source `docs/gateway/remote.md` · 395 lines · 2200 words · 11 code blocks</sub>

**Read when:** Running or troubleshooting remote gateway setups

**Covers:** The core idea · Topology options · Command flow (what runs where) · SSH tunnel (CLI + tools) · CLI remote defaults · Gateway behind an identity-aware proxy · Credential precedence · Chat UI remote access · macOS app remote mode · Security rules (remote/VPN) · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw configure`, `openclaw gateway call`, `openclaw gateway health`, `openclaw gateway probe`, `openclaw gateway status`, `openclaw health`, `openclaw status`

**Config:** `gateway.auth.*`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.port`, `gateway.remote.*`, `gateway.remote.edgeAuth`, `gateway.remote.password`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/remote](https://docs.openclaw.ai/gateway/remote)</sub>

---

### `/gateway/stable-https-url` — Give your Gateway a stable HTTPS URL

**Give your Gateway a stable HTTPS URL** · *Gateway & Ops › Remote access*

> Give a loopback-only Gateway a stable, tailnet-only HTTPS URL with Tailscale Serve

<sub>source `docs/gateway/stable-https-url.md` · 164 lines · 917 words · 8 code blocks</sub>

**Read when:** Replacing per-client SSH tunnels with one private Gateway URL · Connecting macOS, iOS, or Android clients to a remote Gateway · Diagnosing a Tailscale Serve URL that works locally but times out remotely

**Covers:** Before you begin · 1. Enable Serve while keeping loopback bind · 2. Allow HTTPS in your tailnet policy · 3. Verify the route and loopback boundary · 4. Use the URL from clients · Troubleshooting · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw gateway restart`

**Config:** `gateway.auth.allowTailscale`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/stable-https-url](https://docs.openclaw.ai/gateway/stable-https-url)</sub>

---

### `/gateway/tailscale` — Tailscale

**Tailscale** · *Gateway & Ops › Remote access*

> Integrated Tailscale Serve/Funnel for the Gateway dashboard

<sub>source `docs/gateway/tailscale.md` · 182 lines · 1821 words · 4 code blocks</sub>

**Read when:** Exposing the Gateway Control UI outside localhost · Automating tailnet or public dashboard access

**Covers:** Modes · Config examples · CLI examples · Auth · Notes · Recover an orphaned foreground claim · Browser control (remote Gateway + local browser) · Learn more · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw config unset`, `openclaw doctor`, `openclaw gateway`, `openclaw qr`

**Config:** `gateway.auth.allowTailscale`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.controlUi.allowedOrigins`, `gateway.controlUi.basePath`, `gateway.tailscale.mode`, `gateway.tailscale.serviceName`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/tailscale](https://docs.openclaw.ai/gateway/tailscale)</sub>

---

### `/gateway/cloudflare-access` — Cloudflare Tunnel and Access

**Cloudflare Tunnel and Access** · *Gateway & Ops › Remote access*

> Publish a loopback Gateway through a Cloudflare Tunnel and authenticate every client with Cloudflare Access

<sub>source `docs/gateway/cloudflare-access.md` · 279 lines · 1758 words · 6 code blocks</sub>

**Read when:** You want a public HTTPS Gateway URL without opening a port · You want Cloudflare Access (SSO) to authenticate the Control UI · Your CLI, TUI, or nodes get HTTP 302 from a Cloudflare-fronted Gateway

**Covers:** Before you begin · How the pieces fit · Step 1: Route the tunnel to loopback · Step 2: Protect the hostname with Access · Step 3: Trust those headers in the Gateway · Step 4: Decide how nodes and workers get in · Step 5: Connect each client · Verify · Production readiness · Troubleshooting · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw connect`, `openclaw connect https`, `openclaw devices approve`, `openclaw tui`

**Config:** `gateway.auth.mode`, `gateway.cloudflareAccess.clientId`, `gateway.example`, `gateway.remote.edgeAuth`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/cloudflare-access](https://docs.openclaw.ai/gateway/cloudflare-access)</sub>

---

### `/gateway/team-server` — Deploy a team server

**Deploy a team server** · *Gateway & Ops › Remote access*

> Deploy a shared team Gateway with Cloudflare Access, verified GitHub identities, roles, session sharing, and recoverable operations

<sub>source `docs/gateway/team-server.md` · 508 lines · 3062 words · 12 code blocks</sub>

**Read when:** Deploying an always-on OpenClaw server for a trusted team · Connecting Cloudflare sign-in to Gateway profiles and GitHub identities · Operating separate collaboration and release Gateways

**Covers:** How we build OpenClaw with OpenClaw · Before you begin · 1. Install under one service account · 2. Configure the public URL and authenticated ingress · 3. Bootstrap administrators and assign roles · 4. Synchronize people with verified GitHub identities · 5. Connect chat and remote clients · 6. Give widgets a separate sandbox origin · 7. Share selected sessions from another Gateway · 8. Verify the complete flow · Keep operations recoverable · Troubleshooting <sub>(3 sub-sections)</sub>

**CLI:** `openclaw backup create`, `openclaw backup restore`, `openclaw config set`, `openclaw config unset`, `openclaw config validate`, `openclaw connect`, `openclaw devices join-code`, `openclaw gateway call`

**Config:** `gateway.auth.identityScopes`, `gateway.auth.token`, `gateway.controlUi.allowedOrigins`, `gateway.controlUi.basePath`, `gateway.controlUi.environment`, `gateway.controlUi.github.token`, `gateway.publicOrigin`, `gateway.remote.edgeAuth`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/team-server](https://docs.openclaw.ai/gateway/team-server)</sub>

---

### `/security/network-proxy` — Network proxy

**Network proxy** · *Gateway & Ops › Security*

> How to route OpenClaw runtime HTTP and WebSocket traffic through an operator-managed filtering proxy

<sub>source `docs/security/network-proxy.md` · 242 lines · 2246 words · 12 code blocks</sub>

**Read when:** You want defense-in-depth against SSRF and DNS rebinding attacks · Configuring an external forward proxy for OpenClaw runtime traffic

**Covers:** Configuration · How routing works · Related proxy terms · Validating the proxy · Recommended blocked destinations · Limits · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw config get`, `openclaw config set`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway run`, `openclaw gateway start`

**Config:** `tools.web.fetch.useTrustedEnvProxy`

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/network-proxy](https://docs.openclaw.ai/security/network-proxy)</sub>

---

### `/security/formal-verification` — Formal verification (security models)

**Formal verification (security models)** · *Gateway & Ops › Security*

> Machine-checked security models for OpenClaw's highest-risk paths.

<sub>source `docs/security/formal-verification.md` · 121 lines · 864 words</sub>

**Read when:** Reviewing formal security model guarantees or limits · Reproducing or updating TLA+/TLC security model checks

**Covers:** What this is · Where the models live · Caveats · Reproducing results · Claims and targets · v1++ models: concurrency, retries, trace correctness · Related <sub>(8 sub-sections)</sub>

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/formal-verification](https://docs.openclaw.ai/security/formal-verification)</sub>

---

### `/security/incident-response` — Incident response

**Incident response** · *Gateway & Ops › Security*

> How OpenClaw triages, responds to, and follows up on security incidents

<sub>source `docs/security/incident-response.md` · 54 lines · 367 words</sub>

**Read when:** Responding to a security report or suspected security incident · Preparing a coordinated disclosure or patched security release · Reviewing post-incident follow-up expectations

**Covers:** 1. Detection and triage · 2. Severity · 3. Response · 4. Communication and disclosure · 5. Recovery and follow-up · Related

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/incident-response](https://docs.openclaw.ai/security/incident-response)</sub>

---

### `/security/THREAT-MODEL-ATLAS` — Threat model (MITRE ATLAS)

**Threat model (MITRE ATLAS)** · *Gateway & Ops › Security*

> OpenClaw threat model mapped to the MITRE ATLAS framework

<sub>source `docs/security/THREAT-MODEL-ATLAS.md` · 310 lines · 1605 words · 4 code blocks</sub>

**Read when:** Reviewing security posture or threat scenarios · Working on security features or audit responses

**Covers:** 1. Scope · 2. System architecture · 3. Threat analysis by ATLAS tactic · 4. ClawHub supply chain analysis · 5. Risk matrix · 6. Recommendations summary · 7. Appendices · Where each section moved · Related <sub>(13 sub-sections)</sub>

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS)</sub>

---

### `/security/THREAT-MODEL-ATLAS/reconnaissance` — Reconnaissance (AML.TA0002)

**Reconnaissance (AML.TA0002)** · *Gateway & Ops › Security*

> OpenClaw reconnaissance threats (AML.TA0002): T-RECON-001, T-RECON-002

<sub>source `docs/security/THREAT-MODEL-ATLAS/reconnaissance.md` · 30 lines · 228 words</sub>

**Read when:** Reviewing reconnaissance threats against an OpenClaw deployment · Working on mitigations for T-RECON-001, T-RECON-002

**Covers:** T-RECON-001: Agent endpoint discovery · T-RECON-002: Channel integration probing

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/reconnaissance](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/reconnaissance)</sub>

---

### `/security/THREAT-MODEL-ATLAS/initial-access` — Initial access (AML.TA0004)

**Initial access (AML.TA0004)** · *Gateway & Ops › Security*

> OpenClaw initial access threats (AML.TA0004): T-ACCESS-001, T-ACCESS-002, T-ACCESS-003

<sub>source `docs/security/THREAT-MODEL-ATLAS/initial-access.md` · 42 lines · 378 words</sub>

**Read when:** Reviewing initial access threats against an OpenClaw deployment · Working on mitigations for T-ACCESS-001, T-ACCESS-002, T-ACCESS-003

**Covers:** T-ACCESS-001: Pairing code interception · T-ACCESS-002: AllowFrom spoofing · T-ACCESS-003: Token theft

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/initial-access](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/initial-access)</sub>

---

### `/security/THREAT-MODEL-ATLAS/execution` — Execution (AML.TA0005)

**Execution (AML.TA0005)** · *Gateway & Ops › Security*

> OpenClaw execution threats (AML.TA0005): T-EXEC-001, T-EXEC-002, T-EXEC-003, T-EXEC-004

<sub>source `docs/security/THREAT-MODEL-ATLAS/execution.md` · 54 lines · 536 words</sub>

**Read when:** Reviewing execution threats against an OpenClaw deployment · Working on mitigations for T-EXEC-001, T-EXEC-002, T-EXEC-003, T-EXEC-004

**Covers:** T-EXEC-001: Direct prompt injection · T-EXEC-002: Indirect prompt injection · T-EXEC-003: Tool argument injection · T-EXEC-004: Exec approval bypass

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/execution](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/execution)</sub>

---

### `/security/THREAT-MODEL-ATLAS/persistence` — Persistence (AML.TA0006)

**Persistence (AML.TA0006)** · *Gateway & Ops › Security*

> OpenClaw persistence threats (AML.TA0006): T-PERSIST-001, T-PERSIST-002, T-PERSIST-003

<sub>source `docs/security/THREAT-MODEL-ATLAS/persistence.md` · 42 lines · 348 words</sub>

**Read when:** Reviewing persistence threats against an OpenClaw deployment · Working on mitigations for T-PERSIST-001, T-PERSIST-002, T-PERSIST-003

**Covers:** T-PERSIST-001: Malicious skill installation · T-PERSIST-002: Skill update poisoning · T-PERSIST-003: Agent configuration tampering

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/persistence](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/persistence)</sub>

---

### `/security/THREAT-MODEL-ATLAS/defense-evasion` — Defense evasion (AML.TA0007)

**Defense evasion (AML.TA0007)** · *Gateway & Ops › Security*

> OpenClaw defense evasion threats (AML.TA0007): T-EVADE-001, T-EVADE-002

<sub>source `docs/security/THREAT-MODEL-ATLAS/defense-evasion.md` · 30 lines · 251 words</sub>

**Read when:** Reviewing defense evasion threats against an OpenClaw deployment · Working on mitigations for T-EVADE-001, T-EVADE-002

**Covers:** T-EVADE-001: Moderation pattern bypass · T-EVADE-002: Content wrapper escape

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/defense-evasion](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/defense-evasion)</sub>

---

### `/security/THREAT-MODEL-ATLAS/discovery` — Discovery (AML.TA0008)

**Discovery (AML.TA0008)** · *Gateway & Ops › Security*

> OpenClaw discovery threats (AML.TA0008): T-DISC-001, T-DISC-002

<sub>source `docs/security/THREAT-MODEL-ATLAS/discovery.md` · 30 lines · 228 words</sub>

**Read when:** Reviewing discovery threats against an OpenClaw deployment · Working on mitigations for T-DISC-001, T-DISC-002

**Covers:** T-DISC-001: Tool enumeration · T-DISC-002: Session data extraction

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/discovery](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/discovery)</sub>

---

### `/security/THREAT-MODEL-ATLAS/collection-and-exfiltration` — Collection and exfiltration (AML.TA0009, AML.TA0010)

**Collection and exfiltration (AML.TA0009, AML.TA0010)** · *Gateway & Ops › Security*

> OpenClaw collection and exfiltration threats (AML.TA0009, AML.TA0010): T-EXFIL-001, T-EXFIL-002, T-EXFIL-003

<sub>source `docs/security/THREAT-MODEL-ATLAS/collection-and-exfiltration.md` · 42 lines · 345 words</sub>

**Read when:** Reviewing collection and exfiltration threats against an OpenClaw deployment · Working on mitigations for T-EXFIL-001, T-EXFIL-002, T-EXFIL-003

**Covers:** T-EXFIL-001: Data theft via webfetch · T-EXFIL-002: Unauthorized message sending · T-EXFIL-003: Credential harvesting

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/collection-and-exfiltration](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/collection-and-exfiltration)</sub>

---

### `/security/THREAT-MODEL-ATLAS/impact` — Impact (AML.TA0011)

**Impact (AML.TA0011)** · *Gateway & Ops › Security*

> OpenClaw impact threats (AML.TA0011): T-IMPACT-001, T-IMPACT-002, T-IMPACT-003

<sub>source `docs/security/THREAT-MODEL-ATLAS/impact.md` · 42 lines · 326 words</sub>

**Read when:** Reviewing impact threats against an OpenClaw deployment · Working on mitigations for T-IMPACT-001, T-IMPACT-002, T-IMPACT-003

**Covers:** T-IMPACT-001: Unauthorized command execution · T-IMPACT-002: Resource exhaustion (DoS) · T-IMPACT-003: Reputation damage

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/THREAT-MODEL-ATLAS/impact](https://docs.openclaw.ai/security/THREAT-MODEL-ATLAS/impact)</sub>

---

### `/security/CONTRIBUTING-THREAT-MODEL` — Contributing to the threat model

**Contributing to the threat model** · *Gateway & Ops › Security*

> How to contribute to the OpenClaw threat model

<sub>source `docs/security/CONTRIBUTING-THREAT-MODEL.md` · 79 lines · 525 words</sub>

**Read when:** You want to contribute security findings or threat scenarios · Reviewing or updating the threat model

**Covers:** Ways to contribute · Framework reference · Review process · Resources · Contact · Recognition · Related

**TermCrab — security: PARTIAL.** Loopback-first + root-bounded file tools; but no auth enforcement, no sandboxing, no signed anything.

<sub>live: [docs.openclaw.ai/security/CONTRIBUTING-THREAT-MODEL](https://docs.openclaw.ai/security/CONTRIBUTING-THREAT-MODEL)</sub>

---

### `/nodes` — Nodes

**Nodes** · *Gateway & Ops › Nodes and media*

> Nodes: pairing, capabilities, permissions, and CLI helpers for camera/screen/device/notifications/system and the macOS widget panel

<sub>source `docs/nodes/index.md` · 122 lines · 757 words</sub>

**Read when:** Pairing iOS/watchOS/Android nodes to a gateway · Enabling isolated OpenClaw session hosting on a paired node · Using node camera or screen capture for agent context · Presenting a hosted widget on a Mac · Adding new node commands or CLI helpers

**Covers:** Node pages · Where each section moved

**CLI:** `openclaw node run`, `openclaw nodes`

**Config:** `gateway.nodes`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes](https://docs.openclaw.ai/nodes)</sub>

---

### `/nodes/pairing-and-status` — Node pairing and status

**Node pairing and status** · *Gateway & Ops › Nodes and media*

> Pair a node to the Gateway, read its status, and upgrade a fleet in the right order

<sub>source `docs/nodes/pairing-and-status.md` · 94 lines · 825 words · 2 code blocks</sub>

**Read when:** Pairing iOS/watchOS/Android nodes to a gateway · Reading node status, host stats, or approval scope · Upgrading a Gateway and its nodes across a protocol window

**Covers:** Pairing + status · Version skew and upgrade order

**CLI:** `openclaw devices approve`, `openclaw devices list`, `openclaw devices reject`, `openclaw node restart`, `openclaw node run`, `openclaw nodes approve`, `openclaw nodes describe`, `openclaw nodes pending`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/pairing-and-status](https://docs.openclaw.ai/nodes/pairing-and-status)</sub>

---

### `/nodes/node-host` — Run a node host

**Run a node host** · *Gateway & Ops › Nodes and media*

> Start a headless or service node host, pair it, and use its system commands

<sub>source `docs/nodes/node-host.md` · 298 lines · 2577 words · 10 code blocks</sub>

**Read when:** Running commands on a machine other than the Gateway host · Installing the node host as a service or over an SSH tunnel · Checking node host identity state or system command behavior

**Covers:** Remote node host (system.run) · System commands (node host / mac node) · Headless node host (cross-platform) · Mac node mode <sub>(9 sub-sections)</sub>

**CLI:** `openclaw connect`, `openclaw connect https`, `openclaw devices approve`, `openclaw devices join-code`, `openclaw devices list`, `openclaw doctor`, `openclaw node install`, `openclaw node restart`

**Config:** `gateway.auth.*`, `gateway.auth.password`, `gateway.auth.token`, `gateway.cloudflareAccess.clientId`, `gateway.cloudflareAccess.clientSecret`, `gateway.nodes.commands.allow`, `gateway.publicOrigin`, `gateway.remote.password`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/node-host](https://docs.openclaw.ai/nodes/node-host)</sub>

---

### `/nodes/node-exec` — Run commands on a node

**Run commands on a node** · *Gateway & Ops › Nodes and media*

> Allowlist node commands, point exec at a node, and invoke commands directly

<sub>source `docs/nodes/node-exec.md` · 114 lines · 549 words · 8 code blocks</sub>

**Read when:** Routing exec tool calls to a paired node · Allowlisting node commands or binding exec to one node · Invoking a node command over raw RPC

**Covers:** Allowlist the commands · Point exec at the node · Invoking commands · Codex sessions on a node · Exec node binding

**CLI:** `openclaw approvals allowlist`, `openclaw config get`, `openclaw config set`, `openclaw config unset`, `openclaw node restart`, `openclaw node run`, `openclaw nodes invoke`, `openclaw plugins enable`

**Config:** `gateway.nodes.commands.allow`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/node-exec](https://docs.openclaw.ai/nodes/node-exec)</sub>

---

### `/nodes/mcp-and-skills` — Node-hosted MCP servers and skills

**Node-hosted MCP servers and skills** · *Gateway & Ops › Nodes and media*

> Publish MCP servers, skills, and local model inference from a paired node

<sub>source `docs/nodes/mcp-and-skills.md` · 94 lines · 569 words · 1 code blocks</sub>

**Read when:** Running MCP servers on a node instead of the Gateway · Publishing skills from a node machine · Exposing local Ollama models from a node

**Covers:** Node-hosted MCP servers · Node-hosted skills · Local model inference

**CLI:** `openclaw config file`, `openclaw node restart`, `openclaw node run`

**Config:** `mcp.tools.call.v1`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/mcp-and-skills](https://docs.openclaw.ai/nodes/mcp-and-skills)</sub>

---

### `/nodes/session-hosting` — Host OpenClaw sessions on a node

**Host OpenClaw sessions on a node** · *Gateway & Ops › Nodes and media*

> Enable worker session hosting on a paired node, choose a device, and isolate workers in containers

<sub>source `docs/nodes/session-hosting.md` · 344 lines · 2941 words · 2 code blocks</sub>

**Read when:** Enabling isolated OpenClaw session hosting on a paired node · Choosing a device or Auto placement in New Session · Isolating hosted worker sessions in containers

**Covers:** Host OpenClaw sessions <sub>(1 sub-sections)</sub>

**CLI:** `openclaw connect`, `openclaw node restart`, `openclaw node run`, `openclaw update`

**Config:** `tools.exec.applyPatch.allowModels`, `tools.exec.applyPatch.enabled`, `tools.fs.workspaceOnly`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/session-hosting](https://docs.openclaw.ai/nodes/session-hosting)</sub>

---

### `/nodes/session-catalogs` — Node session catalogs

**Node session catalogs** · *Gateway & Ops › Nodes and media*

> Discover, import, and continue native session transcripts on the Gateway and paired nodes

<sub>source `docs/nodes/session-catalogs.md` · 247 lines · 1931 words · 2 code blocks</sub>

**Read when:** Browsing Codex or Claude sessions that live on another computer · Resuming a native CLI session in its owning terminal · Preserving native transcripts in OpenClaw before source cleanup · Configuring session catalog visibility or off-switches

**Covers:** Import transcripts · Codex sessions and transcripts · Claude sessions and transcripts · OpenCode and Pi sessions · OpenClaw sessions and transcripts

**CLI:** `openclaw sessions import`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/session-catalogs](https://docs.openclaw.ai/nodes/session-catalogs)</sub>

---

### `/nodes/file-transfers` — Node file transfers

**Node file transfers** · *Gateway & Ops › Nodes and media*

> Upload files into a node terminal and move files with the File Transfer plugin

<sub>source `docs/nodes/file-transfers.md` · 143 lines · 1092 words · 1 code blocks</sub>

**Read when:** Dragging files into a paired-node terminal · Listing, fetching, or writing files on a node · Reading directory fetch limits and transfer policy checks

**Covers:** Terminal file uploads · Agent file transfers <sub>(4 sub-sections)</sub>

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/file-transfers](https://docs.openclaw.ai/nodes/file-transfers)</sub>

---

### `/nodes/command-policy` — Node command policy

**Node command policy** · *Gateway & Ops › Nodes and media*

> Platform default allowlists, dangerous-command opt-ins, and the gateway.nodes configuration

<sub>source `docs/nodes/command-policy.md` · 123 lines · 701 words · 2 code blocks</sub>

**Read when:** Checking which commands a platform allows by default · Opting into dangerous or privacy-heavy node commands · Configuring gateway.nodes and tools.exec

**Covers:** Command policy · Config (openclaw.json) · Permissions map

**CLI:** `openclaw nodes`, `openclaw nodes approve`, `openclaw nodes pending`

**Config:** `gateway.nodes`, `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `mcp.tools.call.v1`, `tools.exec`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/command-policy](https://docs.openclaw.ai/nodes/command-policy)</sub>

---

### `/nodes/device-commands` — Node device commands

**Node device commands** · *Gateway & Ops › Nodes and media*

> CLI helpers for the widget panel, camera, screen, location, SMS, and device data

<sub>source `docs/nodes/device-commands.md` · 142 lines · 604 words · 8 code blocks</sub>

**Read when:** Capturing a photo, clip, or screen recording from a node · Reading location, SMS, or device data from a node · Presenting a hosted widget on a Mac

**Covers:** macOS widget panel · Photos + videos (node camera) · Screen recordings (nodes) · Location (nodes) · SMS (Android nodes) · Device and personal data commands

**CLI:** `openclaw nodes camera`, `openclaw nodes canvas`, `openclaw nodes invoke`, `openclaw nodes location`, `openclaw nodes screen`

**Config:** `gateway.nodes.commands.allow`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/device-commands](https://docs.openclaw.ai/nodes/device-commands)</sub>

---

### `/nodes/presence` — Active computer presence

**Active computer presence** · *Gateway & Ops › Nodes and media*

> Detect the Mac you most recently used and route node alerts there

<sub>source `docs/nodes/presence.md` · 173 lines · 1282 words · 3 code blocks</sub>

**Read when:** You want OpenClaw to identify the active Mac · You are debugging last-input activity or active-node selection · You want to understand node connection notification routing

**Covers:** Requirements · Check the active computer · How activity becomes presence · Privacy and model context · How connection alerts are routed · Troubleshooting · Related

**CLI:** `openclaw nodes describe`, `openclaw nodes status`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/presence](https://docs.openclaw.ai/nodes/presence)</sub>

---

### `/nodes/troubleshooting` — Node troubleshooting

**Node troubleshooting** · *Gateway & Ops › Nodes and media*

> Troubleshoot node pairing, foreground requirements, permissions, and tool failures

<sub>source `docs/nodes/troubleshooting.md` · 208 lines · 1281 words · 8 code blocks</sub>

**Read when:** Node is connected but camera/screen/exec tools fail · You need the node pairing versus approvals mental model

**Covers:** Node goes offline after SSH logout (Linux) · Command ladder · Node runtime version differs from the CLI · Foreground requirements · Permissions matrix · Pairing versus approvals · Common node error codes · Fast recovery loop · Related

**CLI:** `openclaw approvals allowlist`, `openclaw approvals get`, `openclaw devices approve`, `openclaw devices list`, `openclaw doctor
openclaw`, `openclaw logs`, `openclaw node install`, `openclaw node restart`

**Config:** `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/troubleshooting](https://docs.openclaw.ai/nodes/troubleshooting)</sub>

---

### `/nodes/media-understanding` — Media understanding

**Media understanding** · *Gateway & Ops › Media capabilities*

> Inbound image/audio/video understanding (optional) with provider + CLI fallbacks

<sub>source `docs/nodes/media-understanding.md` · 470 lines · 2672 words · 12 code blocks</sub>

**Read when:** Designing or refactoring media understanding · Tuning inbound audio/video/image preprocessing

**Covers:** How it works · Config · Rules and behavior · Capabilities · Provider support matrix · Model selection guidance · Attachment policy · Vision models and image replay cost · Config examples · Status output · Notes · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw capability audio`, `openclaw capability image`, `openclaw doctor`, `openclaw infer image`

**Config:** `agents.defaults.imageModel`, `models.providers.*`, `models.providers.ollama.models[]`, `tools.media`, `tools.media.image.attachments`, `tools.media.image.preferredModel`, `tools.media.models[]`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/media-understanding](https://docs.openclaw.ai/nodes/media-understanding)</sub>

---

### `/nodes/media-playback` — Media playback

**Media playback** · *Gateway & Ops › Media capabilities*

> Inline audio and video playback across the Control UI and native apps

<sub>source `docs/nodes/media-playback.md` · 180 lines · 1266 words · 2 code blocks</sub>

**Read when:** Playing or troubleshooting audio and video attachments in chat · Comparing media format support across OpenClaw clients · Debugging playback metadata, transcoding, or codec availability

**Covers:** Client support · Portable formats · Lazy playback renditions · Managed attachments and access · Metadata and limits · Troubleshooting · Related <sub>(5 sub-sections)</sub>

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/media-playback](https://docs.openclaw.ai/nodes/media-playback)</sub>

---

### `/nodes/images` — Image and media support

**Image and media support** · *Gateway & Ops › Media capabilities*

> Image and media handling rules for send, gateway, and agent replies

<sub>source `docs/nodes/images.md` · 116 lines · 1097 words</sub>

**Read when:** Modifying media pipeline or attachments

**Covers:** Goals · CLI Surface · Message tool attachment metadata · WhatsApp Web channel behavior · Auto-Reply Pipeline · Inbound Media To Commands · Limits and errors · Notes for Tests · Related

**CLI:** `openclaw message send`

**Config:** `agents.defaults.imageQuality`, `channels.whatsapp.mediaMaxMb`, `tools.media.*`, `tools.media.audio.maxBytes`, `tools.media.image.maxBytes`, `tools.media.models`, `tools.media.models[]`, `tools.media.video.maxBytes`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/images](https://docs.openclaw.ai/nodes/images)</sub>

---

### `/nodes/audio` — Audio and voice notes

**Audio and voice notes** · *Gateway & Ops › Media capabilities*

> How inbound audio/voice notes are downloaded, transcribed, and injected into replies

<sub>source `docs/nodes/audio.md` · 316 lines · 1834 words · 12 code blocks</sub>

**Read when:** Changing audio transcription or media handling

**Covers:** What it does · Auto-detection (default) · OpenAI transcription alongside ChatGPT/Codex OAuth · Config examples · Notes and limits · Mention detection in groups · Gotchas · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw capability audio`, `openclaw doctor`, `openclaw models auth`

**Config:** `models.providers.*`, `models.providers.*.apiKey`, `models.providers.openai.apiKey`, `tools.media.audio`, `tools.media.audio.echoTranscript`, `tools.media.audio.enabled`, `tools.media.audio.language`, `tools.media.audio.maxChars`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/audio](https://docs.openclaw.ai/nodes/audio)</sub>

---

### `/nodes/camera` — Camera capture

**Camera capture** · *Gateway & Ops › Media capabilities*

> Camera capture and macOS physical PTZ control on paired nodes

<sub>source `docs/nodes/camera.md` · 223 lines · 1599 words · 5 code blocks</sub>

**Read when:** Adding or modifying camera capture on node platforms · Controlling a USB camera's physical pan, tilt, or zoom on macOS · Extending agent-accessible MEDIA temp-file workflows

**Covers:** iOS node · Android node · macOS app · Linux node host · Safety + practical limits · macOS screen video (OS-level) · Related <sub>(11 sub-sections)</sub>

**CLI:** `openclaw node`, `openclaw nodes approve`, `openclaw nodes camera`, `openclaw nodes pending`, `openclaw nodes screen`

**Config:** `gateway.nodes.commands.allow`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/camera](https://docs.openclaw.ai/nodes/camera)</sub>

---

### `/nodes/computer-use` — Computer use

**Computer use** · *Gateway & Ops › Node features*

> Capability-based control of Gateway and paired node desktops through the computer tool

<sub>source `docs/nodes/computer-use.md` · 349 lines · 5898 words · 11 code blocks</sub>

**Read when:** Letting the Gateway agent see and control its own or a paired desktop · Enablement, permissions, or safety for computer use · Extending the computer.act node command or its fulfillers

**Covers:** Requirements · Gateway desktop · The computer agent tool · CUA Driver provider · The computer.act node command · Authorization · Safety · Troubleshooting · Relationship to other desktop-control paths <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw node run`, `openclaw plugins enable`

**Config:** `gateway.auth.token`, `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `gateway.remote.token`, `tools.alsoAllow`, `tools.sandbox.tools.alsoAllow`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/computer-use](https://docs.openclaw.ai/nodes/computer-use)</sub>

---

### `/nodes/talk` — Talk mode

**Talk mode** · *Gateway & Ops › Node features*

> Talk mode: continuous speech conversations across local STT/TTS and realtime voice

<sub>source `docs/nodes/talk.md` · 228 lines · 2087 words · 2 code blocks</sub>

**Read when:** Implementing Talk mode on macOS/iOS/Android · Using standalone voice on Apple Watch · Changing voice/TTS/interrupt behavior

**Covers:** Talk documentation pages · Where each section moved · Voice directives in replies · Config (~/.openclaw/openclaw.json) · Notes · Related

**Config:** `plugins.allow`, `providers.elevenlabs.apiKey`, `providers.elevenlabs.modelId`, `providers.mlx.modelId`, `providers.mlx.referenceAudioPath`, `providers.mlx.referenceText`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/talk](https://docs.openclaw.ai/nodes/talk)</sub>

---

### `/nodes/talk/realtime-sessions` — Talk realtime sessions and delegation

**Talk realtime sessions and delegation** · *Gateway & Ops › Talk mode*

> Voice selection from chat, realtime delegation, steering, transcripts, and browser Talk behavior

<sub>source `docs/nodes/talk/realtime-sessions.md` · 164 lines · 1776 words</sub>

**Read when:** Wiring a realtime Talk client or a Gateway-controlled call · Changing voice selection, steering, or transcript handling · Debugging browser Talk microphone or transcription errors

**Covers:** Choose a Talk voice from chat

**Config:** `agents.defaults.voiceModel`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/talk/realtime-sessions](https://docs.openclaw.ai/nodes/talk/realtime-sessions)</sub>

---

### `/nodes/talk/session-ownership` — Talk session ownership

**Talk session ownership** · *Gateway & Ops › Talk mode*

> How Talk resolves the owning agent, session key, store, and control authority

<sub>source `docs/nodes/talk/session-ownership.md` · 65 lines · 580 words</sub>

**Read when:** Running Talk on a multi-agent Gateway · Debugging tool authority mismatches or no-active-run responses · Closing or replacing a Talk session

**Covers:** Session ownership

**Config:** `session.scope`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/talk/session-ownership](https://docs.openclaw.ai/nodes/talk/session-ownership)</sub>

---

### `/nodes/talk/macos-relay` — Talk on macOS and the Gateway relay

**Talk on macOS and the Gateway relay** · *Gateway & Ops › Talk mode*

> macOS Talk overlay behavior and the streamed realtime Gateway relay path

<sub>source `docs/nodes/talk/macos-relay.md` · 93 lines · 526 words · 2 code blocks</sub>

**Read when:** Using Talk on macOS · Enabling the realtime Gateway relay on a Mac · Diagnosing a realtime session that will not start

**Covers:** Behavior (macOS) · Realtime Talk over the Gateway relay (macOS) <sub>(1 sub-sections)</sub>

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/talk/macos-relay](https://docs.openclaw.ai/nodes/talk/macos-relay)</sub>

---

### `/nodes/talk/client-ui` — Talk client UI

**Talk client UI** · *Gateway & Ops › Talk mode*

> Talk controls and behavior in the macOS, Apple Watch, and Android clients

<sub>source `docs/nodes/talk/client-ui.md` · 63 lines · 600 words</sub>

**Read when:** Using Talk from the macOS menu bar or overlay · Setting up standalone voice on Apple Watch · Using dictation, voice notes, or Talk on Android

**Covers:** macOS UI · Apple Watch UI · Android UI

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/talk/client-ui](https://docs.openclaw.ai/nodes/talk/client-ui)</sub>

---

### `/nodes/voicewake` — Voice wake

**Voice wake** · *Gateway & Ops › Node features*

> Global voice wake words (Gateway-owned) and how they sync across nodes

<sub>source `docs/nodes/voicewake.md` · 68 lines · 464 words · 1 code blocks</sub>

**Read when:** Changing voice wake words behavior or defaults · Adding new node platforms that need wake word sync

**Covers:** Storage · Protocol · Client behavior · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/voicewake](https://docs.openclaw.ai/nodes/voicewake)</sub>

---

### `/nodes/location-command` — Location command

**Location command** · *Gateway & Ops › Node features*

> Location command for nodes, platform permission modes, and Linux GeoClue setup

<sub>source `docs/nodes/location-command.md` · 132 lines · 688 words · 4 code blocks</sub>

**Read when:** Adding location node support or permissions UI · Designing Android location permissions or foreground behavior

**Covers:** TL;DR · Why a selector (not just a switch) · Settings model · Permissions mapping (node.permissions) · Command: location.get · Background behavior · Linux node host · Model/tooling integration · UX copy (suggested) · Related

**CLI:** `openclaw node`, `openclaw nodes location`

**TermCrab — platforms: BETTER.** Termux:API tool pack baked in (`src/mobile/*`, phone tools in `src/agent/toolbox.ts`); OpenClaw has no official Android path in these docs.

<sub>live: [docs.openclaw.ai/nodes/location-command](https://docs.openclaw.ai/nodes/location-command)</sub>

---

### `/web` — Web

**Web** · *Gateway & Ops › Web interfaces*

> Gateway web surfaces: Control UI, bind modes, and security

<sub>source `docs/web/index.md` · 90 lines · 432 words · 5 code blocks</sub>

**Read when:** You want to access the Gateway over Tailscale · You want the browser Control UI and config editing

**Covers:** Config (default-on) · Webhooks · Admin HTTP RPC · Tailscale access · Security notes · Building the UI

**CLI:** `openclaw gateway`

**Config:** `gateway.auth.mode`, `gateway.controlUi.allowedOrigins`, `gateway.controlUi.basePath`

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web](https://docs.openclaw.ai/web)</sub>

---

### `/web/control-ui` — Control UI

**Control UI** · *Gateway & Ops › Web interfaces*

> Browser-based control UI for the Gateway (chat, activity, nodes, config)

<sub>source `docs/web/control-ui.md` · 376 lines · 4465 words</sub>

**Read when:** You want to operate the Gateway from a browser · You want Tailnet access without SSH tunnels

**Covers:** Take a photo in chat · Watch a desktop in Picture-in-Picture · Quick open (local) · Agents home · What each page covers · Where each section moved · Related

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw gateway auth-token`, `openclaw gateway status`

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.controlUi.basePath`, `gateway.controlUi.enabled`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui](https://docs.openclaw.ai/web/control-ui)</sub>

---

### `/web/control-ui/connect-and-pair` — Connect and pair

**Connect and pair** · *Gateway & Ops › Control UI*

> Pair browsers and phones with the Gateway and reach the Control UI over Tailscale

<sub>source `docs/web/control-ui/connect-and-pair.md` · 170 lines · 2326 words · 3 code blocks</sub>

**Read when:** Connecting a new browser or phone for the first time · Reaching the Control UI from outside the Gateway host · The dashboard loads blank or reports a protocol mismatch

**Covers:** Device pairing (first connection) · Pair a mobile device · Runtime config endpoint · PWA install and web push · Tailnet access (recommended) · Insecure HTTP · Blank Control UI page

**CLI:** `openclaw dashboard`, `openclaw devices approve`, `openclaw devices list`, `openclaw devices remove`, `openclaw devices revoke`, `openclaw doctor`, `openclaw gateway`

**Config:** `gateway.auth.allowTailscale`, `gateway.controlUi.basePath`, `gateway.publicOrigin`, `gateway.trustedProxies`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/connect-and-pair](https://docs.openclaw.ai/web/control-ui/connect-and-pair)</sub>

---

### `/web/control-ui/sessions-and-sidebar` — Sessions and sidebar

**Sessions and sidebar** · *Gateway & Ops › Control UI*

> Sidebar zones, session menus, and the New session page

<sub>source `docs/web/control-ui/sessions-and-sidebar.md` · 569 lines · 12245 words · 1 code blocks</sub>

**Read when:** Finding, grouping, or renaming sessions · Sharing a session with teammates or through a public read-only link · Starting a session on a device, worktree, or cloud profile · Starting a native Codex or Claude Code terminal

**Covers:** New session names · New-session preferences and recents · Systems workspace · Sidebar navigation · Session colors · Direct session shortcuts · Command palette · New session page <sub>(6 sub-sections)</sub>

**CLI:** `openclaw gateway call`

**Config:** `gateway.cliAgents.enabled`, `gateway.controlUi.github.token`, `tools.github`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/sessions-and-sidebar](https://docs.openclaw.ai/web/control-ui/sessions-and-sidebar)</sub>

---

### `/web/control-ui/chat` — Chat

**Chat** · *Gateway & Ops › Control UI*

> Composer controls, transcript rendering, side chat, and hosted embeds

<sub>source `docs/web/control-ui/chat.md` · 802 lines · 15902 words · 4 code blocks</sub>

**Read when:** Using the composer, tool cards, or the session rail · Finding and installing capabilities from chat · Rendering tables, Mermaid diagrams, or hosted embeds · Adjusting transcript layout or message width

**Covers:** Collaborator drafts · Reactions · Session rail and side chat · Session links in messages · Suggested tasks · Composer capability menu · Emoji shortcodes · JSON in chat · Chat behavior · Hosted embeds · Chat transcript layout · Run transcripts · Conversations stopped for review · Chat message width <sub>(4 sub-sections)</sub>

**Config:** `agents.defaults.modelPolicy.allow`, `agents.defaults.models`, `agents.defaults.utilityModel`, `agents.entries.*.utilityModel`, `gateway.controlUi.basePath`, `gateway.controlUi.embedSandbox`, `models.list`, `tools.alsoAllow`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/chat](https://docs.openclaw.ai/web/control-ui/chat)</sub>

---

### `/web/control-ui/panels` — Panels and docks

**Panels and docks** · *Gateway & Ops › Control UI*

> Ask OpenClaw, the Home dock, the operator terminal, and the browser panel

<sub>source `docs/web/control-ui/panels.md` · 199 lines · 4453 words</sub>

**Read when:** Opening a terminal or browser beside a conversation · Using Ask OpenClaw for setup and repair · Using the Home dock

**Covers:** OpenClaw system care · Home dock · Plugin conversation docks · Operator terminal · Browser panel · GitHub side panel

**CLI:** `openclaw configure`, `openclaw onboard`, `openclaw setup`

**Config:** `gateway.terminal.detachedSessionTimeoutSeconds`, `gateway.terminal.enabled`, `gateway.terminal.shell`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/panels](https://docs.openclaw.ai/web/control-ui/panels)</sub>

---

### `/web/control-ui/settings` — Settings

**Settings** · *Gateway & Ops › Control UI*

> Identity, appearance, plugins, updates, MCP, activity, and meetings

<sub>source `docs/web/control-ui/settings.md` · 754 lines · 11131 words · 3 code blocks</sub>

**Read when:** Changing appearance, language, or accent color · Managing plugins, MCP servers, or updates · Editing your profile or importing assistant memory

**Covers:** Environment identity · Community invitation · Personal identity · Gateway host status · Language support · Appearance themes · Opening links · Session sources · Manage plugins · Updates · Apps and extensions · Settings · Custom plugin UI · Import assistant memory · _+3 more_ <sub>(2 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw mcp doctor`, `openclaw mcp login`, `openclaw mcp reload`, `openclaw mcp status`, `openclaw models accounts`, `openclaw plugins`, `openclaw transcripts`

**Config:** `gateway.controlUi.environment`, `gateway.controlUi.experimental.customPlugins`, `gateway.roles`, `logging.audit.executionIdentity`, `mcp.servers`, `session.tool`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/settings](https://docs.openclaw.ai/web/control-ui/settings)</sub>

---

### `/web/control-ui/feature-reference` — Feature and RPC reference

**Feature and RPC reference** · *Gateway & Ops › Control UI*

> What the Control UI can do today, grouped by capability with its Gateway RPC names

<sub>source `docs/web/control-ui/feature-reference.md` · 142 lines · 6369 words</sub>

**Read when:** Checking whether a capability exists in the Control UI · Looking up the Gateway RPC behind a Control UI feature

**Covers:** Feature and RPC reference

**CLI:** `openclaw doctor`, `openclaw nodes approve`

**Config:** `agents.update`, `channels.status`, `cron.*`, `cron.webhook`, `cron.webhookToken`, `gateway.controlUi.toolTitles`, `mcp.servers`, `models.authStatus`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/feature-reference](https://docs.openclaw.ai/web/control-ui/feature-reference)</sub>

---

### `/web/control-ui/offline-and-reconnect` — Offline and reconnect

**Offline and reconnect** · *Gateway & Ops › Control UI*

> What the Control UI keeps when the Gateway connection drops, and how it recovers

<sub>source `docs/web/control-ui/offline-and-reconnect.md` · 383 lines · 3933 words</sub>

**Read when:** The Control UI shows Reconnecting or drops messages · Understanding what happens to queued input while offline

**Covers:** Busy initial connection · Warm reload · Offline page reload · Gateway updates and suspended tabs · Visualizations during a connection loss · Connection loss and reconnect <sub>(1 sub-sections)</sub>

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/offline-and-reconnect](https://docs.openclaw.ai/web/control-ui/offline-and-reconnect)</sub>

---

### `/web/control-ui/security-model` — Security model

**Security model** · *Gateway & Ops › Control UI*

> Content security policy, public transcript boundaries, authenticated media routes, and approval links

<sub>source `docs/web/control-ui/security-model.md` · 134 lines · 1767 words</sub>

**Read when:** Reviewing Control UI browser security · Exposing public session links through a login proxy · Debugging a blocked avatar or assistant media request · Forwarding an approval link

**Covers:** Content security policy · Public transcript boundary · Avatar route auth · Assistant media route auth · Approval links

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/security-model](https://docs.openclaw.ai/web/control-ui/security-model)</sub>

---

### `/web/control-ui/development` — Build and develop

**Build and develop** · *Gateway & Ops › Control UI*

> Build the Control UI, run the dev server, and point it at a remote Gateway

<sub>source `docs/web/control-ui/development.md` · 236 lines · 1877 words · 8 code blocks</sub>

**Read when:** Building or serving the Control UI yourself · Running the Vite dev server against a remote Gateway

**Covers:** Build and develop the UI · Chat input ownership · Chat render scheduling · Talk live smoke test · Debugging/testing: dev server + remote Gateway

**Config:** `gateway.controlUi.allowedOrigins`, `gateway.controlUi.root`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/control-ui/development](https://docs.openclaw.ai/web/control-ui/development)</sub>

---

### `/gateway/portals` — Portals

**Portals** · *Gateway & Ops › Web interfaces*

> Expose agent-run development servers to the operator through the Gateway

<sub>source `docs/gateway/portals.md` · 313 lines · 3005 words · 4 code blocks</sub>

**Read when:** Showing a development server in the Control UI · Declaring workspace development servers for an agent · Troubleshooting portal access or live reload

**Covers:** Quick start · Remote access · Declare development servers · Application contract · Availability and configuration · Security model · Limitations · Troubleshooting <sub>(6 sub-sections)</sub>

**Config:** `gateway.portals.ingress`, `gateway.publicOrigin`, `tools.allow`, `tools.profile`

**TermCrab — gateway: PARTIAL.** Real HTTP gateway on :7788 (`src/gateway/server.ts`); no WS, no pairing, no service install, no config hot-reload.

<sub>live: [docs.openclaw.ai/gateway/portals](https://docs.openclaw.ai/gateway/portals)</sub>

---

### `/web/notifications` — Notifications

**Notifications** · *Gateway & Ops › Web interfaces*

> Enable and test browser or macOS notifications from the Control UI

<sub>source `docs/web/notifications.md` · 138 lines · 2280 words</sub>

**Read when:** Enabling notifications from Settings · Troubleshooting browser or macOS notification permission · Comparing Control UI notifications with mobile push · Enabling browser alerts when another person mentions you

**Covers:** Which surface you get · Enable browser notifications · Enable notifications in the macOS app · Troubleshooting · Related <sub>(11 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `gateway.publicOrigin`

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web/notifications](https://docs.openclaw.ai/web/notifications)</sub>

---

### `/web/dashboard` — Dashboard

**Dashboard** · *Gateway & Ops › Web interfaces*

> Gateway dashboard (Control UI) access and auth

<sub>source `docs/web/dashboard.md` · 131 lines · 1320 words · 1 code blocks</sub>

**Read when:** Changing dashboard authentication or exposure modes

**Covers:** Fast path (recommended) · Auth basics (local vs remote) · Automatic browser handoff · Open in Telegram · If you see "unauthorized" / 1008 · Related

**CLI:** `openclaw dashboard`, `openclaw doctor`, `openclaw gateway auth-token`, `openclaw status`

**Config:** `channels.telegram.allowFrom`, `gateway.auth`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.controlUi.basePath`

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web/dashboard](https://docs.openclaw.ai/web/dashboard)</sub>

---

### `/web/dashboards` — Session Dashboards

**Session Dashboards** · *Gateway & Ops › Web interfaces*

> Session dashboards: agent-built widgets, boards, tabs, and flexible task layouts

<sub>source `docs/web/dashboards.md` · 438 lines · 3602 words · 3 code blocks</sub>

**Read when:** Using or explaining session dashboards in the Control UI · Deciding what agents can do on a board and what needs an operator grant

**Covers:** Find your dashboards · Arrange your task · Build a dashboard by asking · The board · Show a website fullscreen · Share a browser dashboard with your agent · What widgets are allowed to do · MCP apps on the board · A2UI widgets · Retired Workspaces · Good to know <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw workspaces`

**TermCrab — web: PARTIAL.** One 6.8k-line `ui/index.html` with 9 views; no build step, no component model.

<sub>live: [docs.openclaw.ai/web/dashboards](https://docs.openclaw.ai/web/dashboards)</sub>

---

### `/web/dashboard-architecture` — Dashboard Architecture

**Dashboard Architecture** · *Gateway & Ops › Web interfaces*

> Session dashboard architecture: widget hosting, capabilities, board storage, and protocol

<sub>source `docs/web/dashboard-architecture.md` · 614 lines · 5260 words</sub>

**Read when:** Maintaining or reviewing session dashboards and their security boundaries · Changing widget hosting, the widget bridge, or board storage

**Covers:** Vision · Concepts · UX flows · Interaction tiers · Widget model and hosting · Layout: fluid grid · Data model (per-agent DB) · Protocol surface · Agent tools · What this replaces · Current boundaries <sub>(10 sub-sections)</sub>

**Config:** `cron.trigger`

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web/dashboard-architecture](https://docs.openclaw.ai/web/dashboard-architecture)</sub>

---

### `/web/urls` — Control UI URLs

**Control UI URLs** · *Gateway & Ops › Web interfaces*

> Control UI routes, focus presentations, stable session links, and connection handoff parameters

<sub>source `docs/web/urls.md` · 577 lines · 4189 words · 11 code blocks</sub>

**Read when:** You need to bookmark or share a Control UI session · You need to publish or revoke a world-readable session transcript · You run the Control UI behind a login proxy and need social previews to unfurl · You are adding or changing a Control UI route · You need a terminal, desktop, approval, onboarding, or remote Gateway URL

**Covers:** Session and dashboard URLs · Social previews · Public session transcripts · Person activity URLs · Terminal URLs · Focus presentation routes · Beam share URLs · Route table · Other special documents and startup modes · Remote Gateway handoff · Related <sub>(3 sub-sections)</sub>

**Config:** `gateway.controlUi.basePath`, `gateway.publicOrigin`, `gateway.terminal.enabled`, `session.mainKey`

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web/urls](https://docs.openclaw.ai/web/urls)</sub>

---

### `/web/webchat` — WebChat

**WebChat** · *Gateway & Ops › Web interfaces*

> Native and Control UI WebChat usage over the Gateway WebSocket

<sub>source `docs/web/webchat.md` · 127 lines · 2580 words</sub>

**Read when:** Debugging or configuring WebChat access · Understanding human mention delivery and retry behavior

**Covers:** What it is · Quick start · How it works · Human mention delivery · Control UI agents tools panel · Remote use · Configuration reference (WebChat) · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `channels.webchat`, `gateway.auth.allowTailscale`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.bind`, `gateway.port`, `gateway.remote.password`

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web/webchat](https://docs.openclaw.ai/web/webchat)</sub>

---

### `/web/tui` — TUI

**TUI** · *Gateway & Ops › Web interfaces*

> Terminal UI (TUI): connect to the Gateway or run locally in embedded mode

<sub>source `docs/web/tui.md` · 363 lines · 2780 words · 8 code blocks</sub>

**Read when:** You want a beginner-friendly walkthrough of the TUI · You need the complete list of TUI features, commands, and shortcuts

**Covers:** Quick start · What you see · Mental model: agents + sessions · Sending + delivery · Pickers + overlays · Questions · Keyboard shortcuts · Slash commands · Local Chrome setup · Local shell commands · OpenClaw setup and repair helper · Tool output · Image previews · Terminal colors · _+6 more_ <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agents list`, `openclaw chat`, `openclaw config file`, `openclaw config set`, `openclaw config validate`, `openclaw configure`, `openclaw docs`, `openclaw docs gateway`

**Config:** `agents.defaults.modelSelectionScope`, `agents.defaults.timeoutSeconds`, `gateway.remote.url`, `tools.message`

**TermCrab — tui: ABSENT.** No TUI at all: no raw mode, no alternate screen (grep for `setRawMode`/`1049` over `src/` returns nothing).

<sub>live: [docs.openclaw.ai/web/tui](https://docs.openclaw.ai/web/tui)</sub>

---

### `/web/lobster` — The Lobster

**The Lobster** · *Gateway & Ops › Web interfaces*

> A lobster sometimes visits the Control UI. This page explains just enough.

<sub>source `docs/web/lobster.md` · 89 lines · 1150 words</sub>

**Read when:** You saw a small critter around the new-session composer and want answers · You want to turn lobster visits on or off · You right-clicked a lobster and feel bad about it

**Covers:** What you are looking at · When it shows up · Things you can do · Turning visits off (or back on) · The Lobsterdex · Field notes · Privacy · Related

**TermCrab — web: PARTIAL.** Mobile-first single-file control UI on :7788.

<sub>live: [docs.openclaw.ai/web/lobster](https://docs.openclaw.ai/web/lobster)</sub>

---
