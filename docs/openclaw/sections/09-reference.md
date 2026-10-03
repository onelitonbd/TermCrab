# Reference

<sub>Generated catalogue of **241 documented pages** on [docs.openclaw.ai](https://docs.openclaw.ai) · source: OpenClaw `docs/` tree · generated 2026-10-03 by `scripts/openclaw-docs-report.mjs`.</sub>

> **This file is generated — do not edit by hand.** `node scripts/openclaw-docs-report.mjs --docs <checkout>/docs` rewrites it. Hand-written judgement about this part of the site lives in [`../analysis/`](../analysis/).

## Contents

- [`/cli`](#cli-cli-reference) — CLI reference
- [`/cli/daemon`](#clidaemon-daemon) — Daemon
- [`/cli/fleet`](#clifleet-fleet) — Fleet
- [`/cli/gateway`](#cligateway-gateway) — Gateway
- [`/cli/gateway/running`](#cligatewayrunning-run-the-gateway) — Run the Gateway
- [`/cli/gateway/restart-and-supervision`](#cligatewayrestart-and-supervision-restart-and-supervision) — Restart and supervision
- [`/cli/gateway/query`](#cligatewayquery-query-a-running-gateway) — Query a running Gateway
- [`/cli/gateway/service`](#cligatewayservice-manage-the-gateway-service) — Manage the Gateway service
- [`/cli/gateway/discovery`](#cligatewaydiscovery-discover-gateways-bonjour) — Discover gateways (Bonjour)
- [`/cli/health`](#clihealth-health) — Health
- [`/cli/logs`](#clilogs-logs) — Logs
- [`/cli/status`](#clistatus-openclaw-status) — openclaw status
- [`/cli/backup`](#clibackup-backup) — Backup
- [`/cli/migrate`](#climigrate-migrate) — Migrate
- [`/cli/onboard`](#clionboard-onboard) — Onboard
- [`/cli/openclaw`](#cliopenclaw-openclaw-setup-agent) — OpenClaw setup agent
- [`/cli/reset`](#clireset-reset) — Reset
- [`/cli/setup`](#clisetup-setup-cli) — Setup CLI
- [`/cli/storage`](#clistorage-storage) — storage
- [`/cli/uninstall`](#cliuninstall-uninstall-cli) — Uninstall CLI
- [`/cli/update`](#cliupdate-update) — Update
- [`/cli/update/status-and-history`](#cliupdatestatus-and-history-update-status-and-run-history) — Update status and run history
- [`/cli/update/repair-and-recovery`](#cliupdaterepair-and-recovery-update-repair-and-recovery) — Update repair and recovery
- [`/cli/update/how-updates-run`](#cliupdatehow-updates-run-how-an-update-runs) — How an update runs
- [`/cli/doctor`](#clidoctor-doctor-cli) — Doctor CLI
- [`/cli/doctor/running`](#clidoctorrunning-run-doctor) — Run doctor
- [`/cli/doctor/recovery`](#clidoctorrecovery-gateway-and-service-recovery) — Gateway and service recovery
- [`/cli/doctor/lint`](#clidoctorlint-lint-and-post-upgrade-modes) — Lint and post-upgrade modes
- [`/cli/doctor/health-contract`](#clidoctorhealth-contract-structured-health-check-contract) — Structured health check contract
- [`/cli/doctor/state-migrations`](#clidoctorstate-migrations-legacy-state-migration) — Legacy state migration
- [`/cli/doctor/sqlite-maintenance`](#clidoctorsqlite-maintenance-sqlite-maintenance-and-session-migration) — SQLite maintenance and session migration
- [`/cli/doctor/checks`](#clidoctorchecks-other-checks-and-repairs) — Other checks and repairs
- [`/cli/secrets`](#clisecrets-secrets-cli) — Secrets CLI
- [`/cli/security`](#clisecurity-security-cli) — Security CLI
- [`/cli/triage`](#clitriage-triage) — Triage
- [`/cli/agent`](#cliagent-agent) — Agent
- [`/cli/agents`](#cliagents-agents) — Agents
- [`/cli/claws`](#cliclaws-claws) — Claws
- [`/cli/infer`](#cliinfer-inference-cli) — Inference CLI
- [`/cli/memory`](#climemory-memory) — Memory
- [`/cli/models`](#climodels-models) — Models
- [`/cli/promos`](#clipromos-promos) — Promos
- [`/cli/sessions`](#clisessions-sessions) — Sessions
- [`/cli/transcripts`](#clitranscripts-transcripts-cli) — Transcripts CLI
- [`/cli/wiki`](#cliwiki-wiki) — Wiki
- [`/cli/audit`](#cliaudit-audit-records) — Audit records
- [`/cli/hooks`](#clihooks-hooks-cli) — Hooks CLI
- [`/cli/message`](#climessage-message) — Message
- [`/cli/system`](#clisystem-system) — System
- [`/cli/channels`](#clichannels-channels) — Channels
- [`/cli/directory`](#clidirectory-directory) — Directory
- [`/cli/pairing`](#clipairing-pairing-cli) — Pairing CLI
- [`/cli/qr`](#cliqr-qr) — QR
- [`/cli/users`](#cliusers-users) — Users
- [`/cli/voicecall`](#clivoicecall-voicecall) — Voicecall
- [`/cli/approvals`](#cliapprovals-approvals) — Approvals
- [`/cli/browser`](#clibrowser-browser) — Browser
- [`/cli/cron`](#clicron-automations-cron) — Automations (cron)
- [`/cli/connect`](#cliconnect-connect) — Connect
- [`/cli/devices`](#clidevices-devices) — Devices
- [`/cli/node`](#clinode-node) — Node
- [`/cli/nodes`](#clinodes-nodes-cli) — Nodes CLI
- [`/cli/sandbox`](#clisandbox-sandbox-cli) — Sandbox CLI
- [`/cli/worker`](#cliworker-worker) — Worker
- [`/cli/config`](#cliconfig-config) — Config
- [`/cli/configure`](#cliconfigure-configure) — Configure
- [`/cli/webhooks`](#cliwebhooks-webhooks) — Webhooks
- [`/cli/plugins`](#cliplugins-plugins-cli) — Plugins CLI
- [`/cli/plugins/authoring`](#clipluginsauthoring-author-plugins) — Author plugins
- [`/cli/plugins/install`](#clipluginsinstall-install-plugins) — Install plugins
- [`/cli/plugins/list`](#clipluginslist-list-installed-plugins) — List installed plugins
- [`/cli/plugins/uninstall-and-update`](#clipluginsuninstall-and-update-uninstall-and-update-plugins) — Uninstall and update plugins
- [`/cli/plugins/inspect-and-diagnose`](#clipluginsinspect-and-diagnose-inspect-and-diagnose-plugins) — Inspect and diagnose plugins
- [`/cli/plugins/marketplace`](#clipluginsmarketplace-marketplace-feeds) — Marketplace feeds
- [`/cli/file-transfer`](#clifile-transfer-file-transfers) — File transfers
- [`/cli/path`](#clipath-path) — Path
- [`/cli/policy`](#clipolicy-policy) — Policy
- [`/cli/policy/authoring`](#clipolicyauthoring-author-a-policy-file) — Author a policy file
- [`/cli/policy/rules`](#clipolicyrules-policy-rule-reference) — Policy rule reference
- [`/cli/policy/scopes`](#clipolicyscopes-scoped-policy-overlays) — Scoped policy overlays
- [`/cli/policy/running-checks`](#clipolicyrunning-checks-run-and-configure-policy-checks) — Run and configure policy checks
- [`/cli/policy/attestation`](#clipolicyattestation-accept-and-watch-policy-state) — Accept and watch policy state
- [`/cli/policy/findings`](#clipolicyfindings-policy-findings-repair-and-exit-codes) — Policy findings, repair, and exit codes
- [`/cli/skills`](#cliskills-skills-cli) — Skills CLI
- [`/cli/workboard`](#cliworkboard-workboard-cli) — Workboard CLI
- [`/cli/attach`](#cliattach-attach-cli) — Attach CLI
- [`/cli/dashboard`](#clidashboard-dashboard-cli) — Dashboard CLI
- [`/cli/resume`](#cliresume-resume) — Resume
- [`/cli/tui`](#clitui-openclaw-tui) — openclaw tui
- [`/cli/acp`](#cliacp-acp) — ACP
- [`/cli/clawbot`](#cliclawbot-clawbot) — Clawbot
- [`/cli/completion`](#clicompletion-completion) — Completion
- [`/cli/dns`](#clidns-dns) — DNS
- [`/cli/docs`](#clidocs-docs) — Docs
- [`/cli/mcp`](#climcp-mcp) — MCP
- [`/cli/mcp/serve`](#climcpserve-run-openclaw-as-an-mcp-server) — Run OpenClaw as an MCP server
- [`/cli/mcp/registry`](#climcpregistry-manage-saved-mcp-servers) — Manage saved MCP servers
- [`/cli/mcp/json-output`](#climcpjson-output-json-output-shapes) — JSON output shapes
- [`/cli/mcp/transports`](#climcptransports-transports-and-oauth) — Transports and OAuth
- [`/cli/mcp/control-ui`](#climcpcontrol-ui-mcp-in-the-control-ui) — MCP in the Control UI
- [`/cli/mcp/apps`](#climcpapps-mcp-apps) — MCP Apps
- [`/cli/proxy`](#cliproxy-proxy) — Proxy
- [`/reference/rpc`](#referencerpc-rpc-adapters) — RPC adapters
- [`/plugins/codex-harness-reference`](#pluginscodex-harness-reference-codex-harness-reference) — Codex harness reference
- [`/plugins/codex-harness-reference/supervision`](#pluginscodex-harness-referencesupervision-codex-session-catalog-and-supervision) — Codex session catalog and supervision
- [`/plugins/codex-harness-reference/app-server-transport`](#pluginscodex-harness-referenceapp-server-transport-codex-app-server-transport) — Codex app-server transport
- [`/plugins/codex-harness-reference/approval-and-sandbox`](#pluginscodex-harness-referenceapproval-and-sandbox-codex-approval-and-sandbox-modes) — Codex approval and sandbox modes
- [`/plugins/codex-harness-reference/auth`](#pluginscodex-harness-referenceauth-codex-auth-and-environment-isolation) — Codex auth and environment isolation
- [`/plugins/codex-harness-reference/dynamic-tools`](#pluginscodex-harness-referencedynamic-tools-codex-dynamic-tools) — Codex dynamic tools
- [`/plugins/codex-harness-reference/timeouts`](#pluginscodex-harness-referencetimeouts-codex-timeouts-and-turn-settlement) — Codex timeouts and turn settlement
- [`/plugins/codex-harness-reference/model-discovery`](#pluginscodex-harness-referencemodel-discovery-codex-model-discovery) — Codex model discovery
- [`/plugins/codex-harness-reference/restricted-turns`](#pluginscodex-harness-referencerestricted-turns-codex-restricted-turns) — Codex restricted turns
- [`/plugins/codex-harness-reference/workspace-bootstrap-files`](#pluginscodex-harness-referenceworkspace-bootstrap-files-codex-workspace-bootstrap-files) — Codex workspace bootstrap files
- [`/plugins/codex-harness-runtime`](#pluginscodex-harness-runtime-codex-harness-runtime) — Codex harness runtime
- [`/plugins/codex-harness-runtime/recovery`](#pluginscodex-harness-runtimerecovery-codex-process-recovery) — Codex process recovery
- [`/plugins/codex-harness-runtime/threads`](#pluginscodex-harness-runtimethreads-codex-thread-bindings-and-supervision) — Codex thread bindings and supervision
- [`/plugins/codex-harness-runtime/replies`](#pluginscodex-harness-runtimereplies-codex-replies-and-final-answers) — Codex replies and final answers
- [`/plugins/codex-harness-runtime/hooks`](#pluginscodex-harness-runtimehooks-codex-hook-boundaries) — Codex hook boundaries
- [`/plugins/codex-harness-runtime/sandbox-streaming`](#pluginscodex-harness-runtimesandbox-streaming-codex-sandbox-process-streaming) — Codex sandbox process streaming
- [`/plugins/codex-harness-runtime/v1-support-contract`](#pluginscodex-harness-runtimev1-support-contract-codex-runtime-v1-support-contract) — Codex runtime v1 support contract
- [`/plugins/codex-harness-runtime/permissions`](#pluginscodex-harness-runtimepermissions-codex-native-permissions-and-elicitations) — Codex native permissions and elicitations
- [`/plugins/codex-harness-runtime/queue-and-feedback`](#pluginscodex-harness-runtimequeue-and-feedback-codex-queue-steering-and-feedback-upload) — Codex queue steering and feedback upload
- [`/plugins/codex-harness-runtime/compaction`](#pluginscodex-harness-runtimecompaction-codex-compaction-and-transcript-mirror) — Codex compaction and transcript mirror
- [`/plugins/plugin-inventory`](#pluginsplugin-inventory-plugin-inventory) — Plugin inventory
- [`/plugins/reference`](#pluginsreference-plugin-reference) — Plugin reference
- [`/plugins/dependency-resolution`](#pluginsdependency-resolution-plugin-dependency-resolution) — Plugin dependency resolution
- [`/plugins/sdk-overview`](#pluginssdk-overview-plugin-sdk-overview) — Plugin SDK overview
- [`/plugins/sdk-overview/imports`](#pluginssdk-overviewimports-plugin-sdk-imports-and-module-layout) — Plugin SDK imports and module layout
- [`/plugins/sdk-overview/capabilities`](#pluginssdk-overviewcapabilities-plugin-sdk-capability-registration) — Plugin SDK capability registration
- [`/plugins/sdk-overview/tools-and-commands`](#pluginssdk-overviewtools-and-commands-plugin-sdk-tools-and-commands) — Plugin SDK tools and commands
- [`/plugins/sdk-overview/infrastructure`](#pluginssdk-overviewinfrastructure-plugin-sdk-infrastructure-registration) — Plugin SDK infrastructure registration
- [`/plugins/sdk-overview/host-hooks`](#pluginssdk-overviewhost-hooks-plugin-sdk-host-hooks-for-workflow-plugins) — Plugin SDK host hooks for workflow plugins
- [`/plugins/sdk-overview/cli-and-discovery`](#pluginssdk-overviewcli-and-discovery-plugin-sdk-cli-and-discovery-registration) — Plugin SDK CLI and discovery registration
- [`/plugins/sdk-overview/memory-and-context`](#pluginssdk-overviewmemory-and-context-plugin-sdk-memory-and-context-slots) — Plugin SDK memory and context slots
- [`/plugins/sdk-overview/events-and-hooks`](#pluginssdk-overviewevents-and-hooks-plugin-sdk-events-and-hook-semantics) — Plugin SDK events and hook semantics
- [`/plugins/manifest`](#pluginsmanifest-plugin-manifest) — Plugin manifest
- [`/plugins/manifest/models`](#pluginsmanifestmodels-manifest-model-fields) — Manifest model fields
- [`/plugins/manifest/providers`](#pluginsmanifestproviders-manifest-provider-fields) — Manifest provider fields
- [`/plugins/manifest/setup-and-auth`](#pluginsmanifestsetup-and-auth-manifest-setup-and-auth-fields) — Manifest setup and auth fields
- [`/plugins/manifest/capabilities`](#pluginsmanifestcapabilities-manifest-capability-fields) — Manifest capability fields
- [`/plugins/manifest/surfaces`](#pluginsmanifestsurfaces-manifest-host-surface-fields) — Manifest host surface fields
- [`/plugins/manifest/config-and-secrets`](#pluginsmanifestconfig-and-secrets-manifest-config-and-secret-fields) — Manifest config and secret fields
- [`/plugins/manifest/package-json`](#pluginsmanifestpackage-json-manifest-versus-packagejson) — Manifest versus package.json
- [`/plugins/sdk-subpaths`](#pluginssdk-subpaths-plugin-sdk-subpaths) — Plugin SDK subpaths
- [`/plugins/sdk-entrypoints`](#pluginssdk-entrypoints-plugin-entry-points) — Plugin entry points
- [`/plugins/sdk-entrypoints/tool-policy-and-sandbox`](#pluginssdk-entrypointstool-policy-and-sandbox-plugin-sdk-tool-policy-and-sandbox-helpers) — Plugin SDK tool policy and sandbox helpers
- [`/plugins/sdk-entrypoints/package-entries`](#pluginssdk-entrypointspackage-entries-plugin-sdk-package-entries) — Plugin SDK package entries
- [`/plugins/sdk-entrypoints/define-tool-plugin`](#pluginssdk-entrypointsdefine-tool-plugin-plugin-sdk-definetoolplugin-helper) — Plugin SDK defineToolPlugin helper
- [`/plugins/sdk-entrypoints/define-plugin-entry`](#pluginssdk-entrypointsdefine-plugin-entry-plugin-sdk-definepluginentry-helper) — Plugin SDK definePluginEntry helper
- [`/plugins/sdk-entrypoints/native-providers`](#pluginssdk-entrypointsnative-providers-plugin-sdk-native-provider-factories) — Plugin SDK native provider factories
- [`/plugins/sdk-entrypoints/define-channel-plugin-entry`](#pluginssdk-entrypointsdefine-channel-plugin-entry-plugin-sdk-definechannelpluginentry-helper) — Plugin SDK defineChannelPluginEntry helper
- [`/plugins/sdk-entrypoints/define-setup-plugin-entry`](#pluginssdk-entrypointsdefine-setup-plugin-entry-plugin-sdk-definesetuppluginentry-helper) — Plugin SDK defineSetupPluginEntry helper
- [`/plugins/sdk-entrypoints/registration-mode`](#pluginssdk-entrypointsregistration-mode-plugin-sdk-registration-mode) — Plugin SDK registration mode
- [`/plugins/sdk-runtime`](#pluginssdk-runtime-plugin-runtime-helpers) — Plugin runtime helpers
- [`/plugins/sdk-runtime/config-and-utilities`](#pluginssdk-runtimeconfig-and-utilities-plugin-runtime-config-and-utilities) — Plugin runtime config and utilities
- [`/plugins/sdk-runtime/agent`](#pluginssdk-runtimeagent-plugin-runtime-agent-helpers) — Plugin runtime agent helpers
- [`/plugins/sdk-runtime/models`](#pluginssdk-runtimemodels-plugin-runtime-model-helpers) — Plugin runtime model helpers
- [`/plugins/sdk-runtime/background-work`](#pluginssdk-runtimebackground-work-plugin-runtime-background-work) — Plugin runtime background work
- [`/plugins/sdk-runtime/gateway-and-nodes`](#pluginssdk-runtimegateway-and-nodes-plugin-runtime-gateway-and-nodes) — Plugin runtime Gateway and nodes
- [`/plugins/sdk-runtime/media`](#pluginssdk-runtimemedia-plugin-runtime-media-helpers) — Plugin runtime media helpers
- [`/plugins/sdk-runtime/state-and-system`](#pluginssdk-runtimestate-and-system-plugin-runtime-state-and-system) — Plugin runtime state and system
- [`/plugins/sdk-runtime/channel`](#pluginssdk-runtimechannel-plugin-runtime-channel-helpers) — Plugin runtime channel helpers
- [`/plugins/sdk-agent-harness`](#pluginssdk-agent-harness-agent-harness-plugins) — Agent harness plugins
- [`/plugins/sdk-agent-harness/core-ownership`](#pluginssdk-agent-harnesscore-ownership-agent-harness-core-ownership) — Agent harness core ownership
- [`/plugins/sdk-agent-harness/registration`](#pluginssdk-agent-harnessregistration-register-an-agent-harness) — Register an agent harness
- [`/plugins/sdk-agent-harness/selection-policy`](#pluginssdk-agent-harnessselection-policy-agent-harness-selection-policy) — Agent harness selection policy
- [`/plugins/sdk-agent-harness/attempt-runtime`](#pluginssdk-agent-harnessattempt-runtime-agent-harness-attempt-runtime) — Agent harness attempt runtime
- [`/plugins/sdk-agent-harness/user-input-and-execution`](#pluginssdk-agent-harnessuser-input-and-execution-agent-harness-user-input-and-execution-authority) — Agent harness user input and execution authority
- [`/plugins/sdk-agent-harness/native-inventories`](#pluginssdk-agent-harnessnative-inventories-agent-harness-native-inventories) — Agent harness native inventories
- [`/plugins/sdk-agent-harness/runtime-config`](#pluginssdk-agent-harnessruntime-config-agent-harness-runtime-configuration) — Agent harness runtime configuration
- [`/plugins/sdk-agent-harness/sessions-and-results`](#pluginssdk-agent-harnesssessions-and-results-agent-harness-sessions-and-results) — Agent harness sessions and results
- [`/plugins/sdk-setup`](#pluginssdk-setup-plugin-setup-and-config) — Plugin setup and config
- [`/plugins/sdk-testing`](#pluginssdk-testing-plugin-testing) — Plugin testing
- [`/plugins/architecture`](#pluginsarchitecture-plugin-internals) — Plugin internals
- [`/plugins/architecture-internals`](#pluginsarchitecture-internals-plugin-architecture-internals) — Plugin architecture internals
- [`/plugins/architecture-internals/load-pipeline`](#pluginsarchitecture-internalsload-pipeline-plugin-load-pipeline-and-registry) — Plugin load pipeline and registry
- [`/plugins/architecture-internals/provider-hooks`](#pluginsarchitecture-internalsprovider-hooks-provider-runtime-hooks-and-catalogs) — Provider runtime hooks and catalogs
- [`/plugins/architecture-internals/runtime-helpers`](#pluginsarchitecture-internalsruntime-helpers-core-runtime-helpers) — Core runtime helpers
- [`/plugins/architecture-internals/gateway-routes`](#pluginsarchitecture-internalsgateway-routes-gateway-routes) — Gateway routes
- [`/plugins/architecture-internals/channel-surfaces`](#pluginsarchitecture-internalschannel-surfaces-channel-surfaces) — Channel surfaces
- [`/plugins/architecture-internals/packaging`](#pluginsarchitecture-internalspackaging-package-packs-and-import-paths) — Package packs and import paths
- [`/plugins/architecture-internals/context-engines`](#pluginsarchitecture-internalscontext-engines-context-engines) — Context engines
- [`/plugins/architecture-internals/new-capability`](#pluginsarchitecture-internalsnew-capability-adding-a-new-capability) — Adding a new capability
- [`/plugins/sdk-migration`](#pluginssdk-migration-plugin-sdk-migration) — Plugin SDK migration
- [`/plugins/sdk-migration/how-to-migrate`](#pluginssdk-migrationhow-to-migrate-how-to-migrate-a-plugin) — How to migrate a plugin
- [`/plugins/sdk-migration/import-paths`](#pluginssdk-migrationimport-paths-import-path-reference) — Import path reference
- [`/plugins/sdk-migration/removed-surfaces`](#pluginssdk-migrationremoved-surfaces-removed-surfaces-and-replacements) — Removed surfaces and replacements
- [`/plugins/sdk-migration/talk`](#pluginssdk-migrationtalk-talk-and-realtime-voice-migration) — Talk and realtime voice migration
- [`/plugins/sdk-migration/compatibility-policy`](#pluginssdk-migrationcompatibility-policy-compatibility-policy-and-records) — Compatibility policy and records
- [`/plugins/sdk-migration/removal-timeline`](#pluginssdk-migrationremoval-timeline-removal-timeline) — Removal timeline
- [`/plugins/compatibility`](#pluginscompatibility-plugin-compatibility) — Plugin compatibility
- [`/plugins/install-overrides`](#pluginsinstall-overrides-plugin-install-overrides) — Plugin install overrides
- [`/plugins/sdk-channel-outbound`](#pluginssdk-channel-outbound-channel-outbound-api) — Channel outbound API
- [`/plugins/sdk-channel-inbound`](#pluginssdk-channel-inbound-channel-inbound-api) — Channel inbound API
- [`/plugins/sdk-channel-ingress`](#pluginssdk-channel-ingress-channel-ingress-api) — Channel ingress API
- [`/plugins/message-presentation`](#pluginsmessage-presentation-message-presentation) — Message presentation
- [`/reference/AGENTS.default`](#referenceagentsdefault-default-agentsmd) — Default AGENTS.md
- [`/reference/templates/AGENTS`](#referencetemplatesagents-agentsmd-template) — AGENTS.md template
- [`/reference/templates/BOOT`](#referencetemplatesboot-bootmd-template) — BOOT.md template
- [`/reference/templates/BOOTSTRAP`](#referencetemplatesbootstrap-bootstrapmd-template) — BOOTSTRAP.md template
- [`/reference/templates/IDENTITY`](#referencetemplatesidentity-identity-template) — IDENTITY template
- [`/reference/templates/SOUL`](#referencetemplatessoul-soulmd-template) — SOUL.md template
- [`/reference/templates/USER`](#referencetemplatesuser-user-template) — USER template
- [`/reference/templates/AGENTS.dev`](#referencetemplatesagentsdev-agentsdev-template) — AGENTS.dev template
- [`/reference/templates/IDENTITY.dev`](#referencetemplatesidentitydev-identitydev-template) — IDENTITY.dev template
- [`/reference/templates/SOUL.dev`](#referencetemplatessouldev-souldev-template) — SOUL.dev template
- [`/reference/templates/USER.dev`](#referencetemplatesuserdev-userdev-template) — USER.dev template
- [`/reference/templates/HEARTBEAT`](#referencetemplatesheartbeat-retired-heartbeatmd-workspace-file) — Retired HEARTBEAT.md workspace file
- [`/reference/templates/TOOLS`](#referencetemplatestools-toolsmd-retired) — TOOLS.md retired
- [`/agent-runtime-architecture`](#agent-runtime-architecture-agent-runtime-architecture) — Agent runtime architecture
- [`/openclaw-agent-runtime`](#openclaw-agent-runtime-openclaw-agent-runtime-workflow) — OpenClaw agent runtime workflow
- [`/reference/openclaw-ai`](#referenceopenclaw-ai-openclawai-package) — @openclaw/ai package
- [`/reference/token-use`](#referencetoken-use-token-use-and-costs) — Token use and costs
- [`/reference/api-usage-costs`](#referenceapi-usage-costs-api-usage-and-costs) — API usage and costs
- [`/concepts/usage-tracking`](#conceptsusage-tracking-usage-tracking) — Usage tracking
- [`/reference/prompt-caching`](#referenceprompt-caching-prompt-caching) — Prompt caching
- [`/reference/session-management-compaction`](#referencesession-management-compaction-session-management-deep-dive) — Session management deep dive
- [`/reference/session-management-compaction/store`](#referencesession-management-compactionstore-session-state-on-disk) — Session state on disk
- [`/reference/session-management-compaction/maintenance`](#referencesession-management-compactionmaintenance-store-maintenance-and-retention) — Store maintenance and retention
- [`/reference/session-management-compaction/schema`](#referencesession-management-compactionschema-session-keys-ids-and-transcript-events) — Session keys, ids, and transcript events
- [`/reference/session-management-compaction/compaction`](#referencesession-management-compactioncompaction-compaction-behavior-and-settings) — Compaction behavior and settings
- [`/reference/session-management-compaction/housekeeping`](#referencesession-management-compactionhousekeeping-silent-turns-and-the-memory-flush) — Silent turns and the memory flush
- [`/reference/transcript-hygiene`](#referencetranscript-hygiene-transcript-hygiene) — Transcript hygiene
- [`/reference/memory-config`](#referencememory-config-memory-configuration-reference) — Memory configuration reference
- [`/reference/database-schemas`](#referencedatabase-schemas-database-schemas) — Database schemas
- [`/reference/database-schemas/layout`](#referencedatabase-schemaslayout-database-layout) — Database layout
- [`/reference/database-schemas/versioning`](#referencedatabase-schemasversioning-versioning-contract) — Versioning contract
- [`/reference/database-schemas/personal-data`](#referencedatabase-schemaspersonal-data-per-person-and-companion-storage) — Per-person and companion storage
- [`/reference/database-schemas/storage-changes`](#referencedatabase-schemasstorage-changes-storage-changes-and-release-preflight) — Storage changes and release preflight
- [`/reference/database-schemas/agent-schema-history`](#referencedatabase-schemasagent-schema-history-agent-schema-history) — Agent schema history
- [`/reference/database-schemas/state-schema-history`](#referencedatabase-schemasstate-schema-history-state-schema-history) — State schema history
- [`/reference/database-schemas/integrity-and-recovery`](#referencedatabase-schemasintegrity-and-recovery-integrity-troubleshooting-and-recovery) — Integrity, troubleshooting, and recovery
- [`/reference/rich-output-protocol`](#referencerich-output-protocol-rich-output-protocol) — Rich output protocol
- [`/reference/secretref-credential-surface`](#referencesecretref-credential-surface-secretref-credential-surface) — SecretRef credential surface
- [`/reference/secret-placeholder-conventions`](#referencesecret-placeholder-conventions-secret-placeholder-conventions) — Secret Placeholder Conventions
- [`/date-time`](#date-time-date-and-time) — Date and time
- [`/concepts/timezone`](#conceptstimezone-timezones) — Timezones
- [`/concepts/typebox`](#conceptstypebox-typebox) — TypeBox
- [`/concepts/markdown-formatting`](#conceptsmarkdown-formatting-markdown-formatting) — Markdown formatting
- [`/reference/credits`](#referencecredits-credits) — Credits
- [`/reference/pull-request-review-flow`](#referencepull-request-review-flow-pull-request-review-flow) — Pull request review flow

## Document sections

### `/cli` — CLI reference

**CLI reference** · *Reference › CLI commands*

> OpenClaw CLI index: command list, global flags, and links to per-command pages

<sub>source `docs/cli/index.md` · 534 lines · 1054 words · 2 code blocks</sub>

**Read when:** Finding the right `openclaw` subcommand · Looking up global flags or output styling rules

**Covers:** Command pages · Global flags · Output modes · Color palette · Command tree · Chat slash commands · Usage tracking · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw channels add`, `openclaw configure`, `openclaw onboard`, `openclaw setup`, `openclaw status`, `openclaw update`, `openclaw voicecall`, `openclaw workboard`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli](https://docs.openclaw.ai/cli)</sub>

---

### `/cli/daemon` — Daemon

**Daemon** · *Reference › Running the service*

> CLI reference for openclaw daemon (legacy alias for gateway service management)

<sub>source `docs/cli/daemon.md` · 53 lines · 534 words · 1 code blocks</sub>

**Read when:** You still use `openclaw daemon ...` in scripts · You need service lifecycle commands (install/start/stop/restart/status)

**Covers:** Usage · Subcommands and options · Notes · Related

**CLI:** `openclaw daemon`, `openclaw daemon install`, `openclaw daemon restart`, `openclaw daemon start`, `openclaw daemon status`, `openclaw daemon stop`, `openclaw daemon uninstall`, `openclaw gateway`

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/daemon](https://docs.openclaw.ai/cli/daemon)</sub>

---

### `/cli/fleet` — Fleet

**Fleet** · *Reference › Running the service*

> CLI reference for provisioning and managing isolated per-tenant OpenClaw cells

<sub>source `docs/cli/fleet.md` · 340 lines · 2805 words · 19 code blocks</sub>

**Read when:** You host multiple tenant trust domains on one machine · You need to create, inspect, upgrade, or remove fleet cells

**Covers:** Quick start · Tenant IDs · fleet create · fleet list · fleet status · fleet logs · fleet start, fleet stop, and fleet restart · fleet upgrade · fleet backup and fleet restore · fleet doctor · fleet rm · Storage and container layout · Security profile · Token handling · _+1 more_ <sub>(4 sub-sections)</sub>

**CLI:** `openclaw fleet`, `openclaw fleet backup`, `openclaw fleet create`, `openclaw fleet doctor`, `openclaw fleet list`, `openclaw fleet logs`, `openclaw fleet ls`, `openclaw fleet restart`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/fleet](https://docs.openclaw.ai/cli/fleet)</sub>

---

### `/cli/gateway` — Gateway

**Gateway** · *Reference › Running the service*

> OpenClaw Gateway CLI (openclaw gateway) — run, query, and discover gateways

<sub>source `docs/cli/gateway.md` · 145 lines · 523 words</sub>

**Read when:** Running the Gateway from the CLI (dev or servers) · Debugging Gateway auth, bind modes, and connectivity · Discovering gateways via Bonjour (local + wide-area DNS-SD) · Integrating an external Gateway process supervisor

**Covers:** Gateway CLI pages · Where each section moved · Related

**CLI:** `openclaw daemon`, `openclaw gateway`, `openclaw gateway install`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/gateway](https://docs.openclaw.ai/cli/gateway)</sub>

---

### `/cli/gateway/running` — Run the Gateway

**Run the Gateway** · *Reference › Gateway*

> openclaw gateway run options, startup behavior, and revealing the configured token

<sub>source `docs/cli/gateway/running.md` · 137 lines · 757 words · 2 code blocks</sub>

**Read when:** Running the Gateway from the CLI (dev or servers) · Debugging Gateway auth, bind modes, and connectivity · Reading the configured shared token on the Gateway host

**Covers:** Run the Gateway · Reveal the configured token <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config get`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway
openclaw`, `openclaw gateway auth-token`, `openclaw gateway restart`, `openclaw onboard`, `openclaw setup`

**Config:** `gateway.auth.token`, `gateway.customBindHost`, `gateway.mode`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/gateway/running](https://docs.openclaw.ai/cli/gateway/running)</sub>

---

### `/cli/gateway/restart-and-supervision` — Restart and supervision

**Restart and supervision** · *Reference › Gateway*

> openclaw gateway restart, install identity, external process supervisors, and Gateway profiling

<sub>source `docs/cli/gateway/restart-and-supervision.md` · 213 lines · 2777 words · 4 code blocks</sub>

**Read when:** Restarting the Gateway safely, forcibly, or with a bounded wait · Integrating an external Gateway process supervisor · Profiling Gateway startup and restart timings

**Covers:** Restart the Gateway <sub>(3 sub-sections)</sub>

**CLI:** `openclaw database ownership`, `openclaw database preflight`, `openclaw doctor`, `openclaw gateway`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway restart-handoff`, `openclaw gateway status`

**Config:** `gateway.auth.password`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/gateway/restart-and-supervision](https://docs.openclaw.ai/cli/gateway/restart-and-supervision)</sub>

---

### `/cli/gateway/query` — Query a running Gateway

**Query a running Gateway** · *Reference › Gateway*

> Query a running Gateway: health, usage-cost, stability, diagnostics export, status, probe, call, suspend, and resume

<sub>source `docs/cli/gateway/query.md` · 486 lines · 2704 words · 11 code blocks</sub>

**Read when:** Checking whether a Gateway is healthy, ready, or reachable · Exporting Gateway diagnostics or a support bundle · Calling a Gateway RPC method or suspending a Gateway

**Covers:** Query a running Gateway <sub>(9 sub-sections)</sub>

**CLI:** `openclaw gateway`, `openclaw gateway call`, `openclaw gateway diagnostics`, `openclaw gateway health`, `openclaw gateway probe`, `openclaw gateway resume`, `openclaw gateway stability`, `openclaw gateway status`

**Config:** `diagnostics.json`, `gateway.auth.mode`, `gateway.auth.token`, `gateway.remote.sshIdentity`, `gateway.remote.sshTarget`, `gateway.restart_close_failed`, `gateway.restart_shutdown_timeout`, `gateway.suspend.status`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/gateway/query](https://docs.openclaw.ai/cli/gateway/query)</sub>

---

### `/cli/gateway/service` — Manage the Gateway service

**Manage the Gateway service** · *Reference › Gateway*

> Install, start, stop, and uninstall the managed Gateway service, including wrappers, heap sizing, and install-time auth

<sub>source `docs/cli/gateway/service.md` · 242 lines · 2850 words · 6 code blocks</sub>

**Read when:** Managing the Gateway as a native OS service · Recovering an unreadable native service definition · Installing the Gateway service through a wrapper

**Covers:** Manage the Gateway service <sub>(5 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw gateway health`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway start`, `openclaw gateway status`, `openclaw gateway stop`

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/gateway/service](https://docs.openclaw.ai/cli/gateway/service)</sub>

---

### `/cli/gateway/discovery` — Discover gateways (Bonjour)

**Discover gateways (Bonjour)** · *Reference › Gateway*

> openclaw gateway discover and the Bonjour beacons and TXT hints it scans for

<sub>source `docs/cli/gateway/discovery.md` · 46 lines · 180 words · 2 code blocks</sub>

**Read when:** Discovering gateways via Bonjour (local + wide-area DNS-SD)

**Covers:** Discover gateways (Bonjour) <sub>(1 sub-sections)</sub>

**CLI:** `openclaw gateway`, `openclaw gateway discover`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/gateway/discovery](https://docs.openclaw.ai/cli/gateway/discovery)</sub>

---

### `/cli/health` — Health

**Health** · *Reference › Running the service*

> CLI reference for openclaw health (gateway health snapshot via RPC)

<sub>source `docs/cli/health.md` · 51 lines · 566 words · 1 code blocks</sub>

**Read when:** You want to quickly check the running Gateway's health

**Covers:** Options · Behavior · Related

**CLI:** `openclaw channels dead-letters`, `openclaw gateway health`, `openclaw health`, `openclaw health
openclaw`, `openclaw status`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/health](https://docs.openclaw.ai/cli/health)</sub>

---

### `/cli/logs` — Logs

**Logs** · *Reference › Running the service*

> CLI reference for openclaw logs (tail gateway logs via RPC)

<sub>source `docs/cli/logs.md` · 75 lines · 573 words · 1 code blocks</sub>

**Read when:** You need to tail Gateway logs remotely (without SSH) · You want JSON log lines for tooling

**Covers:** Options · Shared Gateway RPC options · Examples · Fallback and recovery behavior · Related

**CLI:** `openclaw logs`, `openclaw logs
openclaw`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/logs](https://docs.openclaw.ai/cli/logs)</sub>

---

### `/cli/status` — openclaw status

**openclaw status** · *Reference › Running the service*

> CLI reference for openclaw status (diagnostics, probes, usage snapshots)

<sub>source `docs/cli/status.md` · 274 lines · 2274 words · 3 code blocks</sub>

**Read when:** You want a quick diagnosis of channel health + recent session recipients · You want a pasteable "all" status for debugging

**Covers:** Status timing · Skills diagnosis · Session and model resolution · Usage and quota · Overview and update status · Secrets · Memory · Related

**CLI:** `openclaw channels status`, `openclaw doctor`, `openclaw gateway call`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw health`, `openclaw memory status`, `openclaw plugins inspect`

**Config:** `agents.defaults.systemAgent.agentId`, `gateway.startupPhase`, `memory.search.enabled`, `plugins.slots.memory`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/status](https://docs.openclaw.ai/cli/status)</sub>

---

### `/cli/backup` — Backup

**Backup** · *Reference › Setup and maintenance*

> CLI reference for openclaw backup (local and offsite archives, SQLite snapshots, Git history, and schedules)

<sub>source `docs/cli/backup.md` · 716 lines · 6271 words · 14 code blocks</sub>

**Read when:** You want a first-class backup archive for local OpenClaw state · You need a compact, verified snapshot of one OpenClaw SQLite database · You want scheduled, versioned database backups in an operator-owned Git repository · You want encrypted offsite archives, retention, or external backup status · You want to preview which paths would be included before reset or uninstall · You want to restore from a `.tar.gz` archive previously created by `openclaw backup`

**Covers:** Notes · Offsite archives · Restore a full archive · Private update captures · SQLite snapshots · Versioned Git backups · Schedule backups · Recorded runs and freshness · What gets backed up · Invalid config behavior · Size and performance · Related <sub>(4 sub-sections)</sub>

**CLI:** `openclaw backup`, `openclaw backup create`, `openclaw backup disable`, `openclaw backup enable`, `openclaw backup git`, `openclaw backup list`, `openclaw backup record`, `openclaw backup restore`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/backup](https://docs.openclaw.ai/cli/backup)</sub>

---

### `/cli/migrate` — Migrate

**Migrate** · *Reference › Setup and maintenance*

> CLI reference for openclaw migrate (import state from another agent system)

<sub>source `docs/cli/migrate.md` · 281 lines · 2546 words · 5 code blocks</sub>

**Read when:** You want to migrate from Hermes or another agent system into OpenClaw · You are adding a plugin-owned migration provider

**Covers:** Commands · Safety model · Claude provider · Codex provider · Hermes provider · Plugin contract · Onboarding integration · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw backup create`, `openclaw doctor`, `openclaw migrate`, `openclaw migrate apply`, `openclaw migrate claude`, `openclaw migrate codex`, `openclaw migrate hermes`, `openclaw migrate list`

**Config:** `mcp.servers`, `skills.config`, `skills.disabled`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/migrate](https://docs.openclaw.ai/cli/migrate)</sub>

---

### `/cli/onboard` — Onboard

**Onboard** · *Reference › Setup and maintenance*

> CLI reference for openclaw onboard (interactive onboarding)

<sub>source `docs/cli/onboard.md` · 524 lines · 3870 words · 14 code blocks</sub>

**Read when:** You want to establish inference, then finish setup with OpenClaw

**Covers:** Examples · Flags · Guided flow · Reset · Locale · Non-interactive setup · Provider prefiltering · Web-search follow-ups · Other behaviors · Common follow-up commands · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw agents list`, `openclaw channels add`, `openclaw configure`, `openclaw configure
openclaw`, `openclaw dashboard`, `openclaw doctor`, `openclaw gateway run`, `openclaw migrate`

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.mode`, `gateway.remote`, `gateway.remote.token`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/onboard](https://docs.openclaw.ai/cli/onboard)</sub>

---

### `/cli/openclaw` — OpenClaw setup agent

**OpenClaw setup agent** · *Reference › Setup and maintenance*

> CLI reference and security model for the inference-backed OpenClaw setup and repair helper

<sub>source `docs/cli/openclaw.md` · 461 lines · 3672 words · 12 code blocks</sub>

**Read when:** You finished inference setup and want OpenClaw to configure the rest · You need to inspect or repair OpenClaw with the local setup agent · You are designing or enabling message-channel rescue mode

**Covers:** When it starts · What OpenClaw shows · Examples · Operations and approval · Setup bootstrap · AI conversation · Switching to an agent · Message rescue mode · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw agents list`, `openclaw channels add`, `openclaw chat`, `openclaw config unset`, `openclaw configure`, `openclaw create agent`, `openclaw doctor`

**Config:** `agents.defaults.timeoutSeconds`, `tools.exec.ask`, `tools.exec.security`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/openclaw](https://docs.openclaw.ai/cli/openclaw)</sub>

---

### `/cli/reset` — Reset

**Reset** · *Reference › Setup and maintenance*

> CLI reference for openclaw reset (reset local state/config)

<sub>source `docs/cli/reset.md` · 60 lines · 429 words · 1 code blocks</sub>

**Read when:** You want to wipe local state while keeping the CLI installed · You want a dry-run of what would be removed

**Covers:** Options · Scopes · Notes · Related

**CLI:** `openclaw backup`, `openclaw backup create`, `openclaw onboard`, `openclaw reset`, `openclaw reset
openclaw`, `openclaw uninstall`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/reset](https://docs.openclaw.ai/cli/reset)</sub>

---

### `/cli/setup` — Setup CLI

**Setup CLI** · *Reference › Setup and maintenance*

> CLI reference for openclaw setup (system-agent chat with onboarding fallback)

<sub>source `docs/cli/setup.md` · 165 lines · 1285 words · 1 code blocks</sub>

**Read when:** You want to chat with OpenClaw for setup or repair · You're doing first-run setup with the onboarding wizard · You want to set the default workspace path · You need the baseline-only setup flag for scripts

**Covers:** Options · Examples · Notes · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw channels add`, `openclaw configure`, `openclaw doctor`, `openclaw gateway restart`, `openclaw onboard`, `openclaw setup`, `openclaw setup
openclaw`

**Config:** `gateway.remote.token`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/setup](https://docs.openclaw.ai/cli/setup)</sub>

---

### `/cli/storage` — storage

**storage** · *Reference › Setup and maintenance*

> List, initialize, and test configured storage locations

<sub>source `docs/cli/storage.md` · 62 lines · 318 words · 2 code blocks</sub>

**Read when:** You are connecting a disk or object store as a storage location · You need to check storage access or encryption keys

**Covers:** List · Initialize · Test

**CLI:** `openclaw storage`, `openclaw storage init`, `openclaw storage list`, `openclaw storage test`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/storage](https://docs.openclaw.ai/cli/storage)</sub>

---

### `/cli/uninstall` — Uninstall CLI

**Uninstall CLI** · *Reference › Setup and maintenance*

> CLI reference for openclaw uninstall (remove gateway service + local data)

<sub>source `docs/cli/uninstall.md` · 52 lines · 278 words · 1 code blocks</sub>

**Read when:** You want to remove the gateway service and/or local state · You want a dry-run first

**Covers:** Options · Examples · Notes · Related

**CLI:** `openclaw backup`, `openclaw backup create`, `openclaw uninstall`, `openclaw uninstall
openclaw`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/uninstall](https://docs.openclaw.ai/cli/uninstall)</sub>

---

### `/cli/update` — Update

**Update** · *Reference › Setup and maintenance*

> CLI reference for openclaw update (updates, repair, and recovery cleanup)

<sub>source `docs/cli/update.md` · 571 lines · 4907 words · 2 code blocks</sub>

**Read when:** You want to update a source checkout safely · You are debugging `openclaw update` output or options · You want to inspect or retire migration recovery originals after an update · You need to understand `--update` shorthand behavior

**Covers:** Usage · Candidate-owned admission · Automation and SSH · Native service commands during updates · Options · update wizard · Detailed topics · Related

**CLI:** `openclaw doctor`, `openclaw gateway`, `openclaw update`, `openclaw update
openclaw`, `openclaw update admit`, `openclaw update cleanup`, `openclaw update finalize`, `openclaw update repair`

**Config:** `gateway.*`, `plugins.load.paths`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/update](https://docs.openclaw.ai/cli/update)</sub>

---

### `/cli/update/status-and-history` — Update status and run history

**Update status and run history** · *Reference › Update*

> openclaw update status plus the durable run ledger, reports, and artifacts every update writes

<sub>source `docs/cli/update/status-and-history.md` · 405 lines · 3732 words · 2 code blocks</sub>

**Read when:** You want to check whether an update is available before applying one · You are inspecting a past update run, its reports, or its artifacts

**Covers:** update status · Run history and reports

**CLI:** `openclaw doctor`, `openclaw gateway call`, `openclaw gateway status`, `openclaw status`, `openclaw update`, `openclaw update repair`, `openclaw update status`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/update/status-and-history](https://docs.openclaw.ai/cli/update/status-and-history)</sub>

---

### `/cli/update/repair-and-recovery` — Update repair and recovery

**Update repair and recovery** · *Reference › Update*

> Recovering from a failed openclaw update, plus the update repair and update cleanup subcommands

<sub>source `docs/cli/update/repair-and-recovery.md` · 649 lines · 5706 words · 4 code blocks</sub>

**Read when:** An update or repair failed and you need a working install back · You are running `openclaw update repair` and need its flags or exit codes · You want to inspect or retire migration recovery originals after an update

**Covers:** Recover a failed update · Candidate Doctor stack overflow · update repair · update cleanup <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway start`, `openclaw gateway stop`, `openclaw sessions`, `openclaw status`, `openclaw triage`, `openclaw triage
openclaw`, `openclaw update`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/update/repair-and-recovery](https://docs.openclaw.ai/cli/update/repair-and-recovery)</sub>

---

### `/cli/update/how-updates-run` — How an update runs

**How an update runs** · *Reference › Update*

> How openclaw update switches channels, checks the new version, hands off the restart, and updates a Git checkout

<sub>source `docs/cli/update/how-updates-run.md` · 1242 lines · 12256 words · 2 code blocks</sub>

**Read when:** You want to know what an update does before you run one · You are debugging a restart handoff or a control-plane update response · You maintain a source checkout and need the Git update and plugin sync steps

**Covers:** What it does · Git checkout flow · Plugin sync details · Package-manager installs <sub>(8 sub-sections)</sub>

**CLI:** `openclaw completion`, `openclaw doctor`, `openclaw gateway status`, `openclaw plugins update`, `openclaw status`, `openclaw triage`, `openclaw update`, `openclaw update repair`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/update/how-updates-run](https://docs.openclaw.ai/cli/update/how-updates-run)</sub>

---

### `/cli/doctor` — Doctor CLI

**Doctor CLI** · *Reference › Diagnostics and security*

> CLI reference for openclaw doctor (health checks + guided repairs)

<sub>source `docs/cli/doctor.md` · 82 lines · 651 words</sub>

**Read when:** You have connectivity/auth issues and want guided fixes · You updated and want a sanity check

**Covers:** Doctor pages · Where each section moved · Related

**CLI:** `openclaw channels dead-letters`, `openclaw doctor`, `openclaw policy`, `openclaw secrets reload`, `openclaw status`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor](https://docs.openclaw.ai/cli/doctor)</sub>

---

### `/cli/doctor/running` — Run doctor

**Run doctor** · *Reference › Doctor*

> Doctor postures, example invocations, and the full option table

<sub>source `docs/cli/doctor/running.md` · 246 lines · 2193 words · 2 code blocks</sub>

**Read when:** You want to run `openclaw doctor` and pick the right posture · You need the meaning of a doctor flag or a flag combination rule

**Covers:** Postures · Examples · Options

**CLI:** `openclaw channels capabilities`, `openclaw channels status`, `openclaw doctor`, `openclaw doctor
openclaw`, `openclaw gateway install`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw issue report`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor/running](https://docs.openclaw.ai/cli/doctor/running)</sub>

---

### `/cli/doctor/recovery` — Gateway and service recovery

**Gateway and service recovery** · *Reference › Doctor*

> Recover the Gateway service, a remote Gateway, Control UI assets, and Gateway tokens

<sub>source `docs/cli/doctor/recovery.md` · 202 lines · 1741 words · 1 code blocks</sub>

**Read when:** Doctor reports a missing, stale, or unmanaged Gateway service · You hit persistent unauthorized errors or missing Control UI assets

**Covers:** Gateway service recovery · Remote Gateway recovery · Control UI assets · Invalid Gateway tokens · macOS: launchctl env overrides

**CLI:** `openclaw doctor`, `openclaw gateway install`, `openclaw gateway start`, `openclaw gateway status`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor/recovery](https://docs.openclaw.ai/cli/doctor/recovery)</sub>

---

### `/cli/doctor/lint` — Lint and post-upgrade modes

**Lint and post-upgrade modes** · *Reference › Doctor*

> Read-only lint findings, check selection, and post-upgrade plugin probes

<sub>source `docs/cli/doctor/lint.md` · 173 lines · 1442 words · 4 code blocks</sub>

**Read when:** You want a read-only health report for CI or deployment preflight · You are chaining doctor after a build or upgrade

**Covers:** Lint mode · Check selection · Post-upgrade mode

**CLI:** `openclaw config set`, `openclaw configure`, `openclaw doctor`, `openclaw gateway run`, `openclaw mcp probe`, `openclaw policy`, `openclaw secrets apply`, `openclaw secrets audit`

**Config:** `mcp.servers`, `plugins.load.paths`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor/lint](https://docs.openclaw.ai/cli/doctor/lint)</sub>

---

### `/cli/doctor/health-contract` — Structured health check contract

**Structured health check contract** · *Reference › Doctor*

> The detect/repair contract that doctor checks and plugin health checks implement

<sub>source `docs/cli/doctor/health-contract.md` · 44 lines · 381 words · 1 code blocks</sub>

**Read when:** You are writing or converting a doctor check · You are adding a plugin-backed health check through the plugin SDK

**Covers:** Structured health checks

**CLI:** `openclaw doctor`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor/health-contract](https://docs.openclaw.ai/cli/doctor/health-contract)</sub>

---

### `/cli/doctor/state-migrations` — Legacy state migration

**Legacy state migration** · *Reference › Doctor*

> How doctor --fix migrates legacy file-backed state into SQLite

<sub>source `docs/cli/doctor/state-migrations.md` · 268 lines · 3307 words</sub>

**Read when:** Doctor reports a blocked or interrupted legacy state migration · You need to reconcile a migration conflict before rerunning `doctor --fix`

**Covers:** Legacy state migration · Pending plugin migrations

**CLI:** `openclaw agents add`, `openclaw agents delete`, `openclaw doctor`, `openclaw update repair`

**Config:** `agents.defaults.workspace`, `session.store`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor/state-migrations](https://docs.openclaw.ai/cli/doctor/state-migrations)</sub>

---

### `/cli/doctor/sqlite-maintenance` — SQLite maintenance and session migration

**SQLite maintenance and session migration** · *Reference › Doctor*

> Shared-state compaction plus targeted session SQLite inspection, import, and recovery

<sub>source `docs/cli/doctor/sqlite-maintenance.md` · 515 lines · 4541 words · 3 code blocks</sub>

**Read when:** You are compacting or verifying an OpenClaw SQLite database · You are importing, validating, or recovering legacy session history

**Covers:** Shared state SQLite compaction · Session SQLite migration <sub>(4 sub-sections)</sub>

**CLI:** `openclaw backup create`, `openclaw doctor`, `openclaw gateway start`, `openclaw gateway stop`, `openclaw update cleanup`, `openclaw update status`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/cli/doctor/sqlite-maintenance](https://docs.openclaw.ai/cli/doctor/sqlite-maintenance)</sub>

---

### `/cli/doctor/checks` — Other checks and repairs

**Other checks and repairs** · *Reference › Doctor*

> The remaining doctor checks and repairs, from Nix mode to plugins, sandbox, and channels

<sub>source `docs/cli/doctor/checks.md` · 100 lines · 2779 words</sub>

**Read when:** You want to know whether doctor covers a specific check or repair · Doctor reported a check you do not recognise

**Covers:** Modes and prompting · Config writes and backups · Gateway and service repairs · Session state and cron · Tool and channel policy · Models and auth · Plugins and skills · Sandbox · Secrets and channel credentials

**CLI:** `openclaw config set`, `openclaw config validate`, `openclaw configure`, `openclaw cron list`, `openclaw doctor`, `openclaw gateway install`, `openclaw gateway status`, `openclaw migrate plan`

**Config:** `agents.defaults.model`, `gateway.auth.password`, `gateway.auth.token`, `models.providers.codex`, `models.providers.openai-codex`, `plugins.allow`, `plugins.deny`, `plugins.entries`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/doctor/checks](https://docs.openclaw.ai/cli/doctor/checks)</sub>

---

### `/cli/secrets` — Secrets CLI

**Secrets CLI** · *Reference › Diagnostics and security*

> CLI reference for openclaw secrets (store, reload, audit, configure, apply)

<sub>source `docs/cli/secrets.md` · 265 lines · 1696 words · 12 code blocks</sub>

**Read when:** Re-resolving secret refs at runtime · Managing team-scoped values in the shared secret store · Auditing plaintext residues and unresolved refs · Configuring SecretRefs and applying one-way scrub changes

**Covers:** Shared secret store · Reload runtime snapshot · Audit · Configure (interactive helper) · Apply a saved plan · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config validate`, `openclaw doctor`, `openclaw secrets`, `openclaw secrets apply`, `openclaw secrets audit`, `openclaw secrets configure`, `openclaw secrets reload`, `openclaw secrets store`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/secrets](https://docs.openclaw.ai/cli/secrets)</sub>

---

### `/cli/security` — Security CLI

**Security CLI** · *Reference › Diagnostics and security*

> CLI reference for openclaw security (audit and fix common security footguns)

<sub>source `docs/cli/security.md` · 144 lines · 1024 words · 4 code blocks</sub>

**Read when:** You want to run a quick security audit on config/state · You want to apply safe "fix" suggestions (permissions, tighten defaults)

**Covers:** Audit modes · What it checks · SecretRef behavior · Suppressions · JSON output · What --fix changes · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw sandbox recreate`, `openclaw security`, `openclaw security audit`

**Config:** `gateway.auth.password`, `gateway.auth.token`, `gateway.nodes.commands.allow`, `gateway.nodes.commands.deny`, `hooks.allowedAgentIds`, `hooks.allowedSessionKeyPrefixes`, `hooks.defaultSessionKey`, `hooks.token`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/security](https://docs.openclaw.ai/cli/security)</sub>

---

### `/cli/triage` — Triage

**Triage** · *Reference › Diagnostics and security*

> CLI reference for openclaw triage (sanitized diagnostics and agent handoff)

<sub>source `docs/cli/triage.md` · 187 lines · 4158 words · 4 code blocks</sub>

**Read when:** OpenClaw is misbehaving and you want an agent-ready debugging prompt · An update failed and you want a local coding agent to repair it · You need a sanitized diagnostics bundle without starting an agent

**Covers:** Failed update recovery · Installation target and embedded handoff · Manual handoff · Automatic failure handoff · Output and exit codes · Options

**CLI:** `openclaw doctor`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw health`, `openclaw onboard`, `openclaw status`, `openclaw triage`, `openclaw update repair`

**Config:** `plugins.entries.codex.config.appServer.transport`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/triage](https://docs.openclaw.ai/cli/triage)</sub>

---

### `/cli/agent` — Agent

**Agent** · *Reference › Agents, models, and sessions*

> CLI reference for Gateway-backed openclaw agent turns and isolated agent exec runs

<sub>source `docs/cli/agent.md` · 431 lines · 4375 words · 10 code blocks</sub>

**Read when:** You want to run one agent turn from scripts (optionally deliver reply) · You want a strict, ephemeral one-shot agent run for CI

**Covers:** agent exec · Options · Examples · Notes · JSON failures · JSON delivery status · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw agent exec`, `openclaw gateway status`, `openclaw gateway stop`, `openclaw sessions compact`

**Config:** `agents.defaults.timeoutSeconds`, `models.json`, `session.dmScope`, `session.store`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/agent](https://docs.openclaw.ai/cli/agent)</sub>

---

### `/cli/agents` — Agents

**Agents** · *Reference › Agents, models, and sessions*

> CLI reference for openclaw agents (roles, teams, workspaces, routing, and identity)

<sub>source `docs/cli/agents.md` · 304 lines · 1939 words · 11 code blocks</sub>

**Read when:** You want multiple isolated agents (workspaces + routing + auth) · You want to create an agent from a role or set up a coordinated team

**Covers:** Examples · Command surface · Routing bindings · Identity files · Set identity · Related <sub>(10 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw agents`, `openclaw agents add`, `openclaw agents bind`, `openclaw agents bindings`, `openclaw agents delete`, `openclaw agents list`, `openclaw agents set-identity`

**Config:** `agents.defaults.skills`, `agents.defaults.systemAgent.agentId`, `agents.entries.*.identity`, `agents.entries.*.skills`, `agents.entries.*.workspace`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/agents](https://docs.openclaw.ai/cli/agents)</sub>

---

### `/cli/claws` — Claws

**Claws** · *Reference › Agents, models, and sessions*

> Create, add, update, and remove experimental Claw agent packages

<sub>source `docs/cli/claws.md` · 639 lines · 3431 words · 21 code blocks</sub>

**Read when:** You are authoring or validating a CLAW.md manifest · You want to preview or add one agent from a Claw · You need to inspect Claw ownership, drift, or cleanup behavior

**Covers:** Bundled role Claws · Create a Claw package · Author locally · Inspect and preview · Inspect installed state · Migrate an existing agent · Update an installed Claw · Remove an installed Claw · Export an installed agent · Command reference · See also

**CLI:** `openclaw claws`, `openclaw claws add`, `openclaw claws build`, `openclaw claws create`, `openclaw claws dev`, `openclaw claws export`, `openclaw claws inspect`, `openclaw claws migrate`

**Config:** `mcp.servers`, `memory.search.enabled`, `tools.allow`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/claws](https://docs.openclaw.ai/cli/claws)</sub>

---

### `/cli/infer` — Inference CLI

**Inference CLI** · *Reference › Agents, models, and sessions*

> Infer-first CLI for provider-backed model, image, audio, TTS, video, web, and embedding workflows

<sub>source `docs/cli/infer.md` · 351 lines · 1887 words · 14 code blocks</sub>

**Read when:** Adding or modifying `openclaw infer` commands · Designing stable headless capability automation

**Covers:** Command tree · Common tasks · Behavior · Model · Image · Audio · TTS · Video · Web · Embedding · JSON output · Common pitfalls · Turn infer into a skill · Related

**CLI:** `openclaw agent`, `openclaw capability`, `openclaw infer`, `openclaw infer
  list`, `openclaw infer audio`, `openclaw infer embedding`, `openclaw infer image`, `openclaw infer media`

**Config:** `agents.defaults.imageModel.fallbacks`, `agents.defaults.systemAgent.agentId`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/infer](https://docs.openclaw.ai/cli/infer)</sub>

---

### `/cli/memory` — Memory

**Memory** · *Reference › Agents, models, and sessions*

> CLI reference for openclaw memory (status/index/reset/search/forget/promote/promote-explain/rem-harness/rem-backfill/session-backfill)

<sub>source `docs/cli/memory.md` · 601 lines · 3943 words · 13 code blocks</sub>

**Read when:** You want to index or search semantic memory · You're debugging memory availability or indexing · You want to promote recalled short-term memory into `MEMORY.md` · You need to delete provenance-tracked memories derived from specific sessions or participants

**Covers:** JSON availability · memory status · memory index · memory reset · memory search · memory forget · memory promote · memory promote-explain · memory rem-harness · memory rem-backfill · memory session-backfill · Dreaming · SecretRef gateway dependency · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw cron add`, `openclaw memory`, `openclaw memory forget`, `openclaw memory index`, `openclaw memory promote`, `openclaw memory promote-explain`, `openclaw memory rem-backfill`, `openclaw memory rem-harness`

**Config:** `agents.entries`, `memory.search.extraPaths`, `plugins.entries.memory-core.config.dreaming`, `plugins.slots.memory`, `session.store`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/memory](https://docs.openclaw.ai/cli/memory)</sub>

---

### `/cli/models` — Models

**Models** · *Reference › Agents, models, and sessions*

> CLI reference for openclaw models (status/list/set/scan, aliases, fallbacks, shared auth, personal accounts)

<sub>source `docs/cli/models.md` · 405 lines · 4396 words · 10 code blocks</sub>

**Read when:** You want to change default models or view provider auth status · You want to scan available models/providers and debug auth profiles · You want to sign in to or select a personal model account on a shared Gateway

**Covers:** Common commands · Aliases · Fallbacks · Personal model accounts · Auth profiles · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw config get`, `openclaw config set`, `openclaw connect`, `openclaw doctor`, `openclaw gateway restart`, `openclaw gateway stop`, `openclaw models`, `openclaw models accounts`

**Config:** `agents.defaults.imageModel`, `agents.defaults.imageModel.fallbacks`, `agents.defaults.imageModel.primary`, `agents.defaults.model`, `agents.defaults.model.fallbacks`, `agents.defaults.model.primary`, `agents.defaults.modelPolicy.allow`, `agents.defaults.systemAgent.agentId`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/models](https://docs.openclaw.ai/cli/models)</sub>

---

### `/cli/promos` — Promos

**Promos** · *Reference › Agents, models, and sessions*

> CLI reference for openclaw promos (list and claim promotional model offers)

<sub>source `docs/cli/promos.md` · 71 lines · 354 words · 1 code blocks</sub>

**Read when:** You want to try a free promotional model offer from ClawHub · You are configuring a provider through a promotion instead of onboarding

**Covers:** Commands · openclaw promos list · openclaw promos claim · Model inventory and offers · Related

**CLI:** `openclaw models`, `openclaw models list`, `openclaw models set`, `openclaw onboard`, `openclaw promos`, `openclaw promos claim`, `openclaw promos list`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/promos](https://docs.openclaw.ai/cli/promos)</sub>

---

### `/cli/sessions` — Sessions

**Sessions** · *Reference › Agents, models, and sessions*

> CLI reference for listing, importing, archiving, deleting, and maintaining stored sessions

<sub>source `docs/cli/sessions.md` · 564 lines · 3039 words · 15 code blocks</sub>

**Read when:** You want to list stored sessions and see recent activity · You want to archive or delete sessions from a headless Gateway · You want to preserve native tool transcripts in OpenClaw

**Covers:** Import transcripts · Archive sessions · Delete sessions · Tail trajectory progress · Export a trajectory bundle · Cleanup maintenance · Compact a session · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw channels status`, `openclaw doctor`, `openclaw gateway call`, `openclaw health`, `openclaw memory forget`, `openclaw resume`, `openclaw sessions`

**Config:** `session.dmScope`, `session.maintenance`, `session.maintenance.coldStorage.afterDays`, `session.maintenance.mode`, `session.maintenance.pruneAfter`, `session.store`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/sessions](https://docs.openclaw.ai/cli/sessions)</sub>

---

### `/cli/transcripts` — Transcripts CLI

**Transcripts CLI** · *Reference › Agents, models, and sessions*

> CLI reference for openclaw transcripts (list, show, and export stored transcripts)

<sub>source `docs/cli/transcripts.md` · 509 lines · 3528 words · 12 code blocks</sub>

**Read when:** You want to read stored transcript summaries from the terminal · You need the path to a transcripts markdown summary · You are debugging the core transcripts storage layout · You want an agent or the Control UI to read past meeting notes · You want to browse meetings or configure capture in the Control UI

**Covers:** Read transcripts in the Control UI · Commands · Output · Tool selectors · Gateway and Control UI reads · JSON output · Many sessions per day · Missing summaries · Upgrading the legacy file store · Configuration · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agent`, `openclaw doctor`, `openclaw transcripts`, `openclaw transcripts
list`, `openclaw transcripts list`, `openclaw transcripts path`, `openclaw transcripts show`

**Config:** `channels.discord.accounts`, `channels.discord.defaultAccount`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/transcripts](https://docs.openclaw.ai/cli/transcripts)</sub>

---

### `/cli/wiki` — Wiki

**Wiki** · *Reference › Agents, models, and sessions*

> CLI reference for openclaw wiki (memory-wiki vault status, search, compile, lint, apply, bridge, ChatGPT import, and Obsidian helpers)

<sub>source `docs/cli/wiki.md` · 263 lines · 1338 words · 7 code blocks</sub>

**Read when:** You want to use the memory-wiki CLI · You are documenting or changing `openclaw wiki`

**Covers:** Common commands · Agent selection · Commands · Practical usage guidance · Configuration tie-ins · Related <sub>(15 sub-sections)</sub>

**CLI:** `openclaw gateway restart`, `openclaw memory search`, `openclaw plugins enable`, `openclaw wiki`, `openclaw wiki apply`, `openclaw wiki bridge`, `openclaw wiki chatgpt`, `openclaw wiki compile`

**Config:** `plugins.entries.memory-wiki.config.bridge.*`, `plugins.entries.memory-wiki.config.context.includeCompiledDigestPrompt`, `plugins.entries.memory-wiki.config.ingest.autoCompile`, `plugins.entries.memory-wiki.config.obsidian.*`, `plugins.entries.memory-wiki.config.render.*`, `plugins.entries.memory-wiki.config.search.backend`, `plugins.entries.memory-wiki.config.search.corpus`, `plugins.entries.memory-wiki.config.vault.path`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/wiki](https://docs.openclaw.ai/cli/wiki)</sub>

---

### `/cli/audit` — Audit records

**Audit records** · *Reference › Events and audit records*

> CLI reference for activity records, execution identity, and decision receipts

<sub>source `docs/cli/audit.md` · 383 lines · 2648 words · 5 code blocks</sub>

**Read when:** You need to answer who ran an agent or tool, when it ran, and how it ended · You need content-free inbound or outbound message lifecycle metadata · You need a bounded, redaction-safe activity export

**Covers:** Filters · Discover and explain executions · Recorded events · Gateway RPC · Related

**CLI:** `openclaw agent exec`, `openclaw audit`, `openclaw audit
openclaw`, `openclaw config set`, `openclaw gateway call`, `openclaw gateway restart`

**Config:** `logging.audit.enabled`, `logging.audit.messages`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/audit](https://docs.openclaw.ai/cli/audit)</sub>

---

### `/cli/hooks` — Hooks CLI

**Hooks CLI** · *Reference › Events and audit records*

> CLI reference for internal hook discovery, eligibility, enablement, and hook packs

<sub>source `docs/cli/hooks.md` · 290 lines · 1685 words · 8 code blocks</sub>

**Read when:** You want to inspect internal hooks on a local or remote Gateway · You want to enable or disable a hook in local config · You need hook command flags or JSON report fields

**Covers:** Target and scope · List hooks · Get hook info · Check eligibility · Enable a hook · Disable a hook · Install and update hook packs · Bundled hooks · Notes · Related <sub>(5 sub-sections)</sub>

**CLI:** `openclaw hooks`, `openclaw hooks check`, `openclaw hooks disable`, `openclaw hooks enable`, `openclaw hooks info`, `openclaw hooks install`, `openclaw hooks list`, `openclaw hooks update`

**Config:** `hooks.internal.installs`, `hooks.internal.load.extraDirs`, `hooks.status`, `security.installPolicy`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/hooks](https://docs.openclaw.ai/cli/hooks)</sub>

---

### `/cli/message` — Message

**Message** · *Reference › Events and audit records*

> CLI reference for openclaw message (send + channel actions)

<sub>source `docs/cli/message.md` · 308 lines · 1450 words · 16 code blocks</sub>

**Read when:** Adding or modifying message CLI actions · Changing outbound channel behavior

**Covers:** Channel selection · Agent ownership · Target formats (-t, --target) · Common flags · SecretRef resolution · Actions · Related <sub>(10 sub-sections)</sub>

**CLI:** `openclaw agents list`, `openclaw config set`, `openclaw message`, `openclaw message broadcast`, `openclaw message member`, `openclaw message poll`, `openclaw message send`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/message](https://docs.openclaw.ai/cli/message)</sub>

---

### `/cli/system` — System

**System** · *Reference › Events and audit records*

> CLI reference for openclaw system (system events, heartbeat, presence)

<sub>source `docs/cli/system.md` · 78 lines · 388 words · 1 code blocks</sub>

**Read when:** You want to enqueue a system event without creating a cron job · You need to enable or disable heartbeats · You want to inspect system presence entries

**Covers:** Common commands · system event · system heartbeat last|enable|disable · system presence · Notes · Related

**CLI:** `openclaw system`, `openclaw system event`, `openclaw system heartbeat`, `openclaw system presence`

**Config:** `gateway.remote.url`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/system](https://docs.openclaw.ai/cli/system)</sub>

---

### `/cli/channels` — Channels

**Channels** · *Reference › Channels and messaging*

> CLI reference for openclaw channels (accounts, status, dead letters, capabilities, resolve, logs, login/logout)

<sub>source `docs/cli/channels.md` · 293 lines · 2955 words · 10 code blocks</sub>

**Read when:** You want to add or remove channel accounts (Discord, Google Chat, iMessage, Matrix, Signal, Slack, Telegram, WhatsApp, and more) · You want to check channel status or tail channel logs · You need to inspect or resubmit a failed inbound channel event

**Covers:** Common commands · Status / capabilities / resolve / logs · Inbound dead letters · Add / remove accounts · Login and logout (interactive) · Per-account recovery (non-destructive) · Troubleshooting · Capabilities probe · Resolve names to IDs · Related

**CLI:** `openclaw agents bind`, `openclaw agents bindings`, `openclaw agents unbind`, `openclaw channels`, `openclaw channels add`, `openclaw channels capabilities`, `openclaw channels dead-letters`, `openclaw channels list`

**Config:** `agents.defaults.systemAgent.agentId`, `channels.start`, `channels.stop`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/channels](https://docs.openclaw.ai/cli/channels)</sub>

---

### `/cli/directory` — Directory

**Directory** · *Reference › Channels and messaging*

> CLI reference for openclaw directory (self, peers, groups)

<sub>source `docs/cli/directory.md` · 113 lines · 551 words · 6 code blocks</sub>

**Read when:** You want to look up contacts/groups/self ids for a channel · You are developing a channel directory adapter

**Covers:** Common flags · Notes · Using results with message send · ID formats by channel · Self ("me") · Peers (contacts/users) · Groups · Related

**CLI:** `openclaw directory`, `openclaw directory groups`, `openclaw directory peers`, `openclaw directory self`, `openclaw message send`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/directory](https://docs.openclaw.ai/cli/directory)</sub>

---

### `/cli/pairing` — Pairing CLI

**Pairing CLI** · *Reference › Channels and messaging*

> CLI reference for openclaw pairing (approve/list pairing requests)

<sub>source `docs/cli/pairing.md` · 70 lines · 407 words · 1 code blocks</sub>

**Read when:** You're using pairing-mode DMs and need to approve senders

**Covers:** Commands · pairing list · pairing approve · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw config set`, `openclaw devices`, `openclaw doctor`, `openclaw pairing`, `openclaw pairing approve`, `openclaw pairing list`, `openclaw qr`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/pairing](https://docs.openclaw.ai/cli/pairing)</sub>

---

### `/cli/qr` — QR

**QR** · *Reference › Channels and messaging*

> CLI reference for openclaw qr (generate mobile pairing QR + setup code)

<sub>source `docs/cli/qr.md` · 117 lines · 804 words · 2 code blocks</sub>

**Read when:** You want to pair a mobile node app with a gateway quickly · You need setup-code output for remote/manual sharing

**Covers:** Options · Setup code contents · Gateway URL resolution · Auth resolution (no --remote) · Auth resolution (--remote) · Related

**CLI:** `openclaw clawbot qr`, `openclaw devices approve`, `openclaw devices list`, `openclaw doctor`, `openclaw qr`, `openclaw qr
openclaw`

**Config:** `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.token`, `gateway.publicOrigin`, `gateway.remote.url`, `plugins.entries.device-pair.config.publicUrl`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/qr](https://docs.openclaw.ai/cli/qr)</sub>

---

### `/cli/users` — Users

**Users** · *Reference › Channels and messaging*

> CLI reference for openclaw users (profiles, email aliases, and duplicate merges)

<sub>source `docs/cli/users.md` · 64 lines · 309 words · 3 code blocks</sub>

**Read when:** You need to find a durable Gateway profile ID · You want to link an email alias or merge duplicate profiles

**Covers:** Common options · List profiles · Link an email alias · Merge duplicate profiles

**CLI:** `openclaw users`, `openclaw users link-email`, `openclaw users list`, `openclaw users merge`

**Config:** `gateway.remote.url`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/users](https://docs.openclaw.ai/cli/users)</sub>

---

### `/cli/voicecall` — Voicecall

**Voicecall** · *Reference › Channels and messaging*

> CLI reference for openclaw voicecall (voice-call plugin command surface)

<sub>source `docs/cli/voicecall.md` · 241 lines · 1189 words · 7 code blocks</sub>

**Read when:** You use the voice-call plugin and want every CLI entry point · You need flag tables and defaults for setup, smoke, call, continue, speak, dtmf, end, status, tail, latency, expose, and start

**Covers:** Subcommands · Setup and smoke · Call lifecycle · Logs and metrics · Exposing webhooks · Related <sub>(12 sub-sections)</sub>

**CLI:** `openclaw gateway status`, `openclaw plugins enable`, `openclaw plugins install`, `openclaw voicecall`, `openclaw voicecall call`, `openclaw voicecall continue`, `openclaw voicecall dtmf`, `openclaw voicecall end`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/voicecall](https://docs.openclaw.ai/cli/voicecall)</sub>

---

### `/cli/approvals` — Approvals

**Approvals** · *Reference › Tools and execution*

> CLI reference for openclaw approvals and openclaw exec-policy

<sub>source `docs/cli/approvals.md` · 301 lines · 1881 words · 12 code blocks</sub>

**Read when:** You want to edit exec approvals from the CLI · You need to manage allowlists on gateway or node hosts · You need to list or resolve a pending approval without a chat surface · An agent cannot run commands and you need to distinguish tool access from approvals

**Covers:** Common commands · Pending approvals · Standing grants · Replace approvals from a file · "Never prompt" / YOLO example · Allowlist helpers · Common options · openclaw exec-policy · Notes · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw approvals`, `openclaw approvals allowlist`, `openclaw approvals get`, `openclaw approvals grants`, `openclaw approvals pending`, `openclaw approvals resolve`, `openclaw approvals set`, `openclaw config set`

**Config:** `tools.exec`, `tools.exec.*`, `tools.exec.grantExpiryDays`, `tools.profile`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/cli/approvals](https://docs.openclaw.ai/cli/approvals)</sub>

---

### `/cli/browser` — Browser

**Browser** · *Reference › Tools and execution*

> CLI reference for openclaw browser (lifecycle, profiles, tabs, actions, state, and debugging)

<sub>source `docs/cli/browser.md` · 448 lines · 3025 words · 17 code blocks</sub>

**Read when:** You use `openclaw browser` and want examples for common tasks · You want to control a browser running on another machine via a node host · You want to attach to your local signed-in Chrome via Chrome MCP

**Covers:** Common flags · Quick start (local) · Quick troubleshooting · Lifecycle · If the command is missing · Profiles · Chrome extension relay · Tabs · Snapshot / screenshot / actions · State and storage · Debugging · Existing Chrome via MCP · Remote browser control (node host proxy) · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw browser`, `openclaw browser batch`, `openclaw browser click`, `openclaw browser click-coords`, `openclaw browser close`, `openclaw browser console`, `openclaw browser cookie-sync`, `openclaw browser cookies`

**Config:** `gateway.nodes.browser.mode`, `gateway.nodes.browser.node`, `plugins.allow`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/browser](https://docs.openclaw.ai/cli/browser)</sub>

---

### `/cli/cron` — Automations (cron)

**Automations (cron)** · *Reference › Tools and execution*

> CLI reference for openclaw automations (schedule and run background jobs)

<sub>source `docs/cli/cron.md` · 482 lines · 4036 words · 17 code blocks</sub>

**Read when:** You want scheduled jobs and wakeups · You are debugging automation execution and logs

**Covers:** Create jobs quickly · Schedule types · Sessions · Delivery · Scheduling · Models · Run output and denials · Retention · Migrating older jobs · Common edits · Common admin commands · Related <sub>(12 sub-sections)</sub>

**CLI:** `openclaw automations`, `openclaw automations add`, `openclaw automations create`, `openclaw automations edit`, `openclaw automations enable`, `openclaw automations get`, `openclaw automations list`, `openclaw automations run`

**Config:** `agents.defaults.fastModeDefault`, `agents.defaults.model`, `agents.defaults.systemAgent.agentId`, `agents.entries.*.fastModeDefault`, `cron.failureAlert`, `cron.failureDestination`, `cron.run`, `cron.runs`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/cron](https://docs.openclaw.ai/cli/cron)</sub>

---

### `/cli/connect` — Connect

**Connect** · *Reference › Tools and execution*

> Connect a machine to an OpenClaw Gateway with one pasted command

<sub>source `docs/cli/connect.md` · 201 lines · 1185 words · 10 code blocks</sub>

**Read when:** Pairing a new headless node with a Gateway · Installing a node host from a join URL or setup code

**Covers:** Create a join command · Connect in the foreground · Reconnect a paired node · Environment-managed cloud nodes · Install as a service · Accepted targets · Revocation behavior · Troubleshooting

**CLI:** `openclaw config set`, `openclaw connect`, `openclaw connect https`, `openclaw devices join-code`, `openclaw devices remove`, `openclaw node install`, `openclaw node run`, `openclaw node status`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/connect](https://docs.openclaw.ai/cli/connect)</sub>

---

### `/cli/devices` — Devices

**Devices** · *Reference › Tools and execution*

> CLI reference for openclaw devices (device pairing + token rotation/revocation)

<sub>source `docs/cli/devices.md` · 266 lines · 1652 words · 17 code blocks</sub>

**Read when:** You are approving device pairing requests · You need to rotate or revoke device tokens

**Covers:** Common options · Commands · Notes · Token drift recovery checklist · Paperclip / openclawgateway first-run approval · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw connect`, `openclaw devices`, `openclaw devices approve`, `openclaw devices clear`, `openclaw devices join-code`, `openclaw devices list`, `openclaw devices reject`, `openclaw devices remove`

**Config:** `gateway.nodes.pairing.autoApproveCidrs`, `gateway.nodes.pairing.sshVerify`, `gateway.publicOrigin`, `gateway.remote.url`, `gateway.trustedProxies`, `plugins.entries.device-pair.config.publicUrl`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/devices](https://docs.openclaw.ai/cli/devices)</sub>

---

### `/cli/node` — Node

**Node** · *Reference › Tools and execution*

> CLI reference for openclaw node (headless node host)

<sub>source `docs/cli/node.md` · 411 lines · 2732 words · 10 code blocks</sub>

**Read when:** Running the headless node host · Pairing a non-macOS node for system.run

**Covers:** Why use a node host? · Browser proxy (zero-config) · Run (foreground) · Gateway auth for node host · Service (background) · Automatic updates · Pairing · Exec approvals · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw approvals get`, `openclaw approvals set`, `openclaw config set`, `openclaw connect`, `openclaw devices approve`, `openclaw devices list`, `openclaw doctor`, `openclaw node`

**Config:** `gateway.auth.password`, `gateway.auth.token`, `gateway.cloudflareAccess.clientId`, `gateway.remote.password`, `gateway.remote.token`, `mcp.tools.call.v1`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/node](https://docs.openclaw.ai/cli/node)</sub>

---

### `/cli/nodes` — Nodes CLI

**Nodes CLI** · *Reference › Tools and execution*

> CLI reference for openclaw nodes (status, pairing, invoke, camera/screen/location/notify and the macOS widget panel)

<sub>source `docs/cli/nodes.md` · 106 lines · 960 words · 4 code blocks</sub>

**Read when:** You're managing paired nodes (cameras, screen, or the macOS widget panel) · You need to approve requests or invoke node commands

**Covers:** Status · Pairing · Invoke · Notify, push, location, screen · Related

**CLI:** `openclaw devices approve`, `openclaw nodes`, `openclaw nodes approve`, `openclaw nodes canvas`, `openclaw nodes describe`, `openclaw nodes invoke`, `openclaw nodes list`, `openclaw nodes location`

**Config:** `gateway.nodes.pairing.autoApproveCidrs`, `gateway.nodes.pairing.sshVerify`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/nodes](https://docs.openclaw.ai/cli/nodes)</sub>

---

### `/cli/sandbox` — Sandbox CLI

**Sandbox CLI** · *Reference › Tools and execution*

> Manage sandbox runtimes and inspect effective sandbox policy

<sub>source `docs/cli/sandbox.md` · 148 lines · 734 words · 4 code blocks</sub>

**Covers:** Commands · Why recreate is needed · Common triggers · Registry migration · Configuration · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw agent exec`, `openclaw doctor`, `openclaw sandbox explain`, `openclaw sandbox list`, `openclaw sandbox recreate`

**Config:** `agents.defaults.sandbox`, `agents.defaults.sandbox.*`, `agents.defaults.sandbox.docker.image`, `agents.entries.*.sandbox`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/sandbox](https://docs.openclaw.ai/cli/sandbox)</sub>

---

### `/cli/worker` — Worker

**Worker** · *Reference › Tools and execution*

> Internal operator reference for the restricted cloud worker runtime

<sub>source `docs/cli/worker.md` · 160 lines · 1408 words</sub>

**Read when:** Operating or debugging gateway-launched cloud workers · Verifying worker admission, session assignment, or local tool isolation

**Covers:** Launch contract · Runtime boundary

**CLI:** `openclaw worker`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/worker](https://docs.openclaw.ai/cli/worker)</sub>

---

### `/cli/config` — Config

**Config** · *Reference › Configuration*

> CLI reference for openclaw config (get/set/patch/unset/file/schema/validate)

<sub>source `docs/cli/config.md` · 668 lines · 3286 words · 28 code blocks</sub>

**Read when:** You want to read or edit config non-interactively · You manage config externally and want OpenClaw to leave it unchanged

**Covers:** Externally managed config · Root options · Examples · Values · config set modes · config patch · Dry run · Applying changes · Write safety · Repair loop · Related <sub>(8 sub-sections)</sub>

**CLI:** `openclaw chat`, `openclaw config`, `openclaw config file`, `openclaw config get`, `openclaw config patch`, `openclaw config schema`, `openclaw config set`, `openclaw config unset`

**Config:** `agents.defaults.model`, `agents.defaults.models`, `agents.defaults.params.custom.nested`, `agents.defaults.sessionStore.agentId`, `agents.entries`, `agents.entries.*.model`, `agents.entries.main.skills[0]`, `agents.list[0]`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/config](https://docs.openclaw.ai/cli/config)</sub>

---

### `/cli/configure` — Configure

**Configure** · *Reference › Configuration*

> CLI reference for openclaw configure (interactive configuration prompts)

<sub>source `docs/cli/configure.md` · 89 lines · 1032 words · 1 code blocks</sub>

**Read when:** You want to tweak credentials, devices, or agent defaults interactively

**Covers:** Options · Gateway section · Model section · Web section · Other notes · Related

**CLI:** `openclaw channels add`, `openclaw config`, `openclaw config get`, `openclaw configure`, `openclaw configure
openclaw`, `openclaw gateway status`, `openclaw health`, `openclaw models auth`

**Config:** `agents.defaults.model.primary`, `agents.defaults.modelPolicy.allow`, `agents.defaults.models`, `gateway.auth.allowTailscale`, `gateway.auth.identityScopes`, `gateway.auth.mode`, `gateway.auth.password`, `gateway.auth.rateLimit`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/configure](https://docs.openclaw.ai/cli/configure)</sub>

---

### `/cli/webhooks` — Webhooks

**Webhooks** · *Reference › Configuration*

> CLI reference for openclaw webhooks (Gmail Pub/Sub setup and runner)

<sub>source `docs/cli/webhooks.md` · 144 lines · 1129 words · 4 code blocks</sub>

**Read when:** You want to wire Gmail Pub/Sub events into OpenClaw · You need the full flag list and default values

**Covers:** Subcommands · webhooks gmail setup · webhooks gmail run · Verify forwarding · Related <sub>(6 sub-sections)</sub>

**CLI:** `openclaw config validate`, `openclaw logs`, `openclaw webhooks`, `openclaw webhooks gmail`

**Config:** `hooks.gmail`, `hooks.gmail.*`, `hooks.gmail.account`, `hooks.gmail.hookUrl`, `hooks.gmail.pushToken`, `hooks.gmail.tailscale.path`, `hooks.gmail.tailscale.target`, `hooks.path`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/webhooks](https://docs.openclaw.ai/cli/webhooks)</sub>

---

### `/cli/plugins` — Plugins CLI

**Plugins CLI** · *Reference › Plugins and skills*

> CLI reference for openclaw plugins (init, build, validate, list, install, reload, marketplace, uninstall, enable/disable, doctor)

<sub>source `docs/cli/plugins.md` · 127 lines · 571 words · 1 code blocks</sub>

**Read when:** You want to install or manage Gateway plugins or compatible bundles · You want to scaffold or validate a simple tool plugin · You want to debug plugin load failures

**Covers:** Commands · Plugins pages · Where each section moved · Related

**CLI:** `openclaw plugins`, `openclaw plugins build`, `openclaw plugins disable`, `openclaw plugins doctor`, `openclaw plugins enable`, `openclaw plugins info`, `openclaw plugins init`, `openclaw plugins inspect`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins](https://docs.openclaw.ai/cli/plugins)</sub>

---

### `/cli/plugins/authoring` — Author plugins

**Author plugins** · *Reference › Plugins CLI*

> Scaffold, build, validate, and pack an OpenClaw plugin with openclaw plugins init

<sub>source `docs/cli/plugins/authoring.md` · 88 lines · 508 words · 2 code blocks</sub>

**Read when:** You want to scaffold a tool, feature, or provider plugin · You need the `plugins build`, `validate`, or `pack` contract

**Covers:** Author <sub>(2 sub-sections)</sub>

**CLI:** `openclaw plugins build`, `openclaw plugins init`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins/authoring](https://docs.openclaw.ai/cli/plugins/authoring)</sub>

---

### `/cli/plugins/install` — Install plugins

**Install plugins** · *Reference › Plugins CLI*

> Install sources and locators, trust and install policy, capability consent, and marketplace installs

<sub>source `docs/cli/plugins/install.md` · 344 lines · 3247 words · 8 code blocks</sub>

**Read when:** You want to install a plugin from ClawHub, npm, git, a local path, or a marketplace · You need the rules behind `--force`, `--pin`, or an install-policy warning

**Covers:** Install · Enable installed plugins <sub>(11 sub-sections)</sub>

**CLI:** `openclaw demo-plugin ping`, `openclaw doctor`, `openclaw hooks`, `openclaw plugins disable`, `openclaw plugins enable`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw plugins marketplace`

**Config:** `plugins.allow`, `plugins.deny`, `plugins.load.paths`, `security.installPolicy`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins/install](https://docs.openclaw.ai/cli/plugins/install)</sub>

---

### `/cli/plugins/list` — List installed plugins

**List installed plugins** · *Reference › Plugins CLI*

> plugins list output and options, discovery diagnostics, and the persisted plugin index

<sub>source `docs/cli/plugins/list.md` · 68 lines · 806 words · 1 code blocks</sub>

**Read when:** You want to check whether a plugin is installed, enabled, and discoverable · You are debugging a `plugins.allow` warning or the persisted plugin index

**Covers:** List <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw gateway status`, `openclaw plugins inspect`, `openclaw plugins list`, `openclaw plugins registry`, `openclaw plugins update`

**Config:** `plugins.allow`, `plugins.installedIndex`, `plugins.installedIndex.quarantine`, `plugins.installs`, `plugins.refresh`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins/list](https://docs.openclaw.ai/cli/plugins/list)</sub>

---

### `/cli/plugins/uninstall-and-update` — Uninstall and update plugins

**Uninstall and update plugins** · *Reference › Plugins CLI*

> What plugins uninstall removes, how plugins update resolves sources, channels, pins, and integrity drift, and reloading edited plugins

<sub>source `docs/cli/plugins/uninstall-and-update.md` · 205 lines · 2467 words · 3 code blocks</sub>

**Read when:** You want to remove a plugin and know exactly what uninstall touches · You want to update a plugin and understand pin, channel, and integrity rules · You want to reload an edited plugin without restarting the Gateway

**Covers:** Uninstall · Update · Reload

**CLI:** `openclaw doctor`, `openclaw plugins doctor`, `openclaw plugins install`, `openclaw plugins registry`, `openclaw plugins reload`, `openclaw plugins uninstall`, `openclaw plugins update`, `openclaw update`

**Config:** `plugins.changed`, `plugins.entries`, `plugins.load.paths`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins/uninstall-and-update](https://docs.openclaw.ai/cli/plugins/uninstall-and-update)</sub>

---

### `/cli/plugins/inspect-and-diagnose` — Inspect and diagnose plugins

**Inspect and diagnose plugins** · *Reference › Plugins CLI*

> plugins inspect, plugins doctor, and plugins registry for plugin state, load failures, and the cold registry

<sub>source `docs/cli/plugins/inspect-and-diagnose.md` · 93 lines · 1016 words · 3 code blocks</sub>

**Read when:** You want a plugin's identity, capabilities, hooks, or runtime registrations · You are debugging a plugin load failure or a stale plugin registry

**Covers:** Inspect · Doctor · Registry

**CLI:** `openclaw demo-git ping`, `openclaw doctor`, `openclaw health`, `openclaw nodes`, `openclaw plugins doctor`, `openclaw plugins inspect`, `openclaw plugins install`, `openclaw plugins registry`

**Config:** `plugins.allow`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins/inspect-and-diagnose](https://docs.openclaw.ai/cli/plugins/inspect-and-diagnose)</sub>

---

### `/cli/plugins/marketplace` — Marketplace feeds

**Marketplace feeds** · *Reference › Plugins CLI*

> plugins marketplace entries, list, and refresh, plus hosted feed trust and signed feed profiles

<sub>source `docs/cli/plugins/marketplace.md` · 61 lines · 452 words · 1 code blocks</sub>

**Read when:** You want to browse, list, or refresh an OpenClaw marketplace feed · You are configuring a signed feed profile or pinning a feed payload checksum

**Covers:** Marketplace

**CLI:** `openclaw plugins marketplace`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/plugins/marketplace](https://docs.openclaw.ai/cli/plugins/marketplace)</sub>

---

### `/cli/file-transfer` — File transfers

**File transfers** · *Reference › Plugins and skills*

> CLI reference for openclaw file-transfer (review and migrate standing file-transfer approvals)

<sub>source `docs/cli/file-transfer.md` · 73 lines · 407 words · 1 code blocks</sub>

**Read when:** You upgraded and older file-transfer permissions stopped taking effect · You need the flag surface for `openclaw file-transfer approvals migrate` · You want a scriptable check for unreviewed file-transfer permissions

**Covers:** file-transfer approvals migrate · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw file-transfer`, `openclaw file-transfer approvals`

**Config:** `gateway.mode`, `plugins.entries.file-transfer.config`

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/cli/file-transfer](https://docs.openclaw.ai/cli/file-transfer)</sub>

---

### `/cli/path` — Path

**Path** · *Reference › Plugins and skills*

> CLI reference for openclaw path (inspect and edit workspace files via the oc:// addressing scheme)

<sub>source `docs/cli/path.md` · 528 lines · 2114 words · 22 code blocks</sub>

**Read when:** You want to read or write a leaf inside a workspace file from the terminal · You're scripting against workspace state and want a stable, kind-agnostic addressing scheme · You're debugging a `oc://` path (validate the syntax, see what it resolves to)

**Covers:** Why use it · How it is used · How it works · Subcommands · Global flags · oc:// syntax · Addressing by file kind · Mutation contract · Examples · Recipes by file kind · Subcommand reference · Exit codes · Output mode · Notes · _+1 more_ <sub>(9 sub-sections)</sub>

**CLI:** `openclaw path`, `openclaw path emit`, `openclaw path find`, `openclaw path resolve`, `openclaw path set`, `openclaw path validate`, `openclaw plugins enable`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/path](https://docs.openclaw.ai/cli/path)</sub>

---

### `/cli/policy` — Policy

**Policy** · *Reference › Plugins and skills*

> CLI reference for openclaw policy conformance checks

<sub>source `docs/cli/policy.md` · 79 lines · 339 words</sub>

**Read when:** You want to check OpenClaw settings against an authored policy.jsonc · You want policy findings in doctor lint · You need a policy attestation hash for audit evidence

**Covers:** Detailed topics · Related

**CLI:** `openclaw agent exec`, `openclaw policy`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy](https://docs.openclaw.ai/cli/policy)</sub>

---

### `/cli/policy/authoring` — Author a policy file

**Author a policy file** · *Reference › Policy*

> Enable the Policy plugin and author policy.jsonc, with a minimal example covering every supported section

<sub>source `docs/cli/policy/authoring.md` · 185 lines · 321 words · 2 code blocks</sub>

**Read when:** You are writing `policy.jsonc` for the first time · You want one example that covers every supported policy section · You need the cross-cutting authoring caveats behind the rule tables

**Covers:** Quick start

**CLI:** `openclaw plugins enable`, `openclaw policy`

**Config:** `agents.workspace.denyTools`, `gateway.bind`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy/authoring](https://docs.openclaw.ai/cli/policy/authoring)</sub>

---

### `/cli/policy/rules` — Policy rule reference

**Policy rule reference** · *Reference › Policy*

> Every supported policy.jsonc rule, the OpenClaw state it observes, and when to use it

<sub>source `docs/cli/policy/rules.md` · 222 lines · 1708 words · 1 code blocks</sub>

**Read when:** You need the observed state behind a specific policy rule · You want to scope stricter policy at named agents or channels · You are choosing between channel, gateway, sandbox, secrets, or tool rules

**Covers:** Policy rule reference <sub>(15 sub-sections)</sub>

**CLI:** `openclaw policy`

**Config:** `agents.*`, `agents.*.allowlist[]`, `agents.*.allowlist[].pattern`, `agents.*.autoAllowSkills`, `agents.*.security`, `agents.defaults.sandbox.backend`, `agents.defaults.sandbox.mode`, `agents.defaults.sandbox.workspaceAccess`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy/rules](https://docs.openclaw.ai/cli/policy/rules)</sub>

---

### `/cli/policy/scopes` — Scoped policy overlays

**Scoped policy overlays** · *Reference › Policy*

> Use scopes. to hold specific agents or channels to stricter policy than the baseline

<sub>source `docs/cli/policy/scopes.md` · 103 lines · 293 words · 1 code blocks</sub>

**Read when:** Some agents or channels need stricter policy than the top-level baseline · You want to know which sections accept an `agentIds` or `channelIds` selector · A scoped container posture rule reports unobservable evidence

**Covers:** Scoped overlays

**CLI:** `openclaw policy`

**Config:** `agents.entries.*`, `agents.workspace`, `sandbox.containers.*`, `sandbox.docker.*`, `session.dmScope`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy/scopes](https://docs.openclaw.ai/cli/policy/scopes)</sub>

---

### `/cli/policy/running-checks` — Run and configure policy checks

**Run and configure policy checks** · *Reference › Policy*

> policy check, policy compare, and the plugins.entries.policy.config settings that govern them

<sub>source `docs/cli/policy/running-checks.md` · 119 lines · 396 words · 5 code blocks</sub>

**Read when:** You want to run policy checks while authoring · You want to compare a policy file against an authored baseline · You need to change where the policy artifact lives or hash-lock it

**Covers:** Run checks · Configure policy

**CLI:** `openclaw doctor`, `openclaw policy`, `openclaw policy check`, `openclaw policy compare`

**Config:** `plugins.entries.policy.config`, `plugins.entries.policy.config.enabled`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy/running-checks](https://docs.openclaw.ai/cli/policy/running-checks)</sub>

---

### `/cli/policy/attestation` — Accept and watch policy state

**Accept and watch policy state** · *Reference › Policy*

> Policy evidence, the attestation hash tuple, and policy watch drift detection

<sub>source `docs/cli/policy/attestation.md` · 179 lines · 284 words · 2 code blocks</sub>

**Read when:** You need a policy attestation hash for audit evidence · You want to accept a clean policy state and detect later drift · You are wiring policy into a CI or release gate

**Covers:** Accept policy state

**CLI:** `openclaw doctor`, `openclaw policy`, `openclaw policy check`, `openclaw policy watch`

**Config:** `agents.workspace`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy/attestation](https://docs.openclaw.ai/cli/policy/attestation)</sub>

---

### `/cli/policy/findings` — Policy findings, repair, and exit codes

**Policy findings, repair, and exit codes** · *Reference › Policy*

> Every policy check id, what doctor --fix will and will not repair, and command exit codes

<sub>source `docs/cli/policy/findings.md` · 273 lines · 1546 words · 9 code blocks</sub>

**Read when:** You want to look up what a `policy/...` finding means · You want to know which findings `doctor --fix` can repair automatically · You are scripting against policy command exit codes

**Covers:** Findings · Repair · Exit codes

**CLI:** `openclaw config`, `openclaw policy`, `openclaw policy check`, `openclaw policy compare`

**Config:** `agents.entries.*.tools.deny`, `channels.*`, `channels.defaults.*`, `channels.denyRules`, `gateway.bind`, `gateway.controlUi.*`, `gateway.http.endpoints.*.enabled`, `gateway.nodes.commands.deny`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/policy/findings](https://docs.openclaw.ai/cli/policy/findings)</sub>

---

### `/cli/skills` — Skills CLI

**Skills CLI** · *Reference › Plugins and skills*

> CLI reference for openclaw skills (search/install/update/verify/list/info/check/library/workshop)

<sub>source `docs/cli/skills.md` · 377 lines · 2154 words · 14 code blocks</sub>

**Read when:** You want to see which skills are available and ready to run · You want to search ClawHub or install skills from ClawHub, Git, or local directories · You need to remove an installed ClawHub skill · You want to verify a ClawHub skill with ClawHub · You want to debug missing binaries/env/config for skills

**Covers:** Commands · Release trust · Remove a ClawHub skill · Personal skill library · Skill Workshop · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw plugins`, `openclaw skills`, `openclaw skills check`, `openclaw skills curator`, `openclaw skills info`, `openclaw skills install`, `openclaw skills library`, `openclaw skills list`

**Config:** `security.installPolicy`, `security.scannerReports`, `security.scannerReports.aig`, `security.scannerReports.skillspector`, `skills.install`, `skills.limits.maxSkillFileBytes`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/skills](https://docs.openclaw.ai/cli/skills)</sub>

---

### `/cli/workboard` — Workboard CLI

**Workboard CLI** · *Reference › Plugins and skills*

> CLI reference for openclaw workboard cards, dispatch, and worker runs

<sub>source `docs/cli/workboard.md` · 205 lines · 1221 words · 14 code blocks</sub>

**Read when:** You want to inspect or create Workboard cards from the terminal · You want to dispatch Workboard worker runs from the CLI · You are debugging Workboard CLI or slash command behavior

**Covers:** Usage · list · create · show · move · dispatch · Slash command parity · Permissions · Troubleshooting · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw gateway restart`, `openclaw gateway status`, `openclaw plugins enable`, `openclaw plugins inspect`, `openclaw workboard`, `openclaw workboard create`, `openclaw workboard dispatch`, `openclaw workboard list`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/workboard](https://docs.openclaw.ai/cli/workboard)</sub>

---

### `/cli/attach` — Attach CLI

**Attach CLI** · *Reference › Interfaces*

> CLI reference for openclaw attach (launch Claude Code with a scoped Gateway MCP grant)

<sub>source `docs/cli/attach.md` · 58 lines · 373 words · 2 code blocks</sub>

**Read when:** You want Claude Code to use OpenClaw Gateway MCP tools · You need a temporary session-bound MCP grant for an external harness

**CLI:** `openclaw attach`, `openclaw attach
openclaw`, `openclaw attach movies-a1166b81`, `openclaw tui`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/attach](https://docs.openclaw.ai/cli/attach)</sub>

---

### `/cli/dashboard` — Dashboard CLI

**Dashboard CLI** · *Reference › Interfaces*

> CLI reference for openclaw dashboard (securely open the Control UI)

<sub>source `docs/cli/dashboard.md` · 77 lines · 607 words · 2 code blocks</sub>

**Read when:** You want to open or re-pair the Control UI from the Gateway host · You want to print the URL without launching a browser

**Covers:** Gateway service and state compatibility · Machine-readable output · Related

**CLI:** `openclaw dashboard`, `openclaw dashboard
openclaw`, `openclaw gateway status`

**Config:** `gateway.auth.token`, `gateway.tls.enabled`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/dashboard](https://docs.openclaw.ai/cli/dashboard)</sub>

---

### `/cli/resume` — Resume

**Resume** · *Reference › Interfaces*

> CLI reference for attaching the TUI to a recent Gateway session

<sub>source `docs/cli/resume.md` · 129 lines · 802 words · 2 code blocks</sub>

**Read when:** You want to continue an existing Gateway session in the terminal · You want to find a recent session by key, display name, or label · You connect the TUI to a remote Gateway

**Covers:** Options · Continue from the Control UI · Examples · Related

**CLI:** `openclaw resume`, `openclaw resume
openclaw`, `openclaw resume agent`, `openclaw resume bugfix`, `openclaw sessions`

**Config:** `gateway.controlUi.basePath`, `gateway.mode`, `gateway.port`, `gateway.publicOrigin`, `gateway.remote.tlsFingerprint`, `gateway.remote.url`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/resume](https://docs.openclaw.ai/cli/resume)</sub>

---

### `/cli/tui` — openclaw tui

**openclaw tui** · *Reference › Interfaces*

> CLI reference for openclaw tui (Gateway-backed or local embedded terminal UI)

<sub>source `docs/cli/tui.md` · 155 lines · 976 words · 4 code blocks</sub>

**Read when:** You want a terminal UI for the Gateway (remote-friendly) · You want to pass url/token/session from scripts · You want to run the TUI in local embedded mode without a Gateway · You want to use openclaw chat or openclaw tui --local

**Covers:** Options · Notes · Session target errors · Examples · Config repair loop · Related

**CLI:** `openclaw attach`, `openclaw chat`, `openclaw chat
openclaw`, `openclaw config file`, `openclaw config set`, `openclaw config validate`, `openclaw configure`, `openclaw devices rotate`

**Config:** `agents.defaults.timeoutSeconds`, `gateway.remote.edgeAuth`, `gateway.remote.tlsFingerprint`, `gateway.remote.url`

**TermCrab — tui: ABSENT.** No TUI at all: no raw mode, no alternate screen (grep for `setRawMode`/`1049` over `src/` returns nothing).

<sub>live: [docs.openclaw.ai/cli/tui](https://docs.openclaw.ai/cli/tui)</sub>

---

### `/cli/acp` — ACP

**ACP** · *Reference › Utility*

> Run the ACP bridge for IDE integrations

<sub>source `docs/cli/acp.md` · 319 lines · 1875 words · 12 code blocks</sub>

**Read when:** Setting up ACP-based IDE integrations · Debugging ACP session routing to the Gateway

**Covers:** What this is not · Compatibility matrix · Known limitations · Usage · ACP client (debug) · Protocol smoke testing · How to use this · Selecting agents · Use from acpx (Codex, Claude, other ACP clients) · Zed editor setup · Session mapping · Options · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw acp`, `openclaw acp client`, `openclaw config set`, `openclaw exec`, `openclaw gateway call`, `openclaw mcp serve`, `openclaw sessions ensure`

**Config:** `gateway.auth.*`, `gateway.remote.*`, `gateway.remote.url`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/acp](https://docs.openclaw.ai/cli/acp)</sub>

---

### `/cli/clawbot` — Clawbot

**Clawbot** · *Reference › Utility*

> CLI reference for openclaw clawbot (legacy alias namespace)

<sub>source `docs/cli/clawbot.md` · 16 lines · 56 words</sub>

**Read when:** You maintain older scripts using `openclaw clawbot ...` · You need migration guidance to current commands

**Covers:** Migration · Related

**CLI:** `openclaw clawbot`, `openclaw clawbot qr`, `openclaw qr`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/clawbot](https://docs.openclaw.ai/cli/clawbot)</sub>

---

### `/cli/completion` — Completion

**Completion** · *Reference › Utility*

> CLI reference for openclaw completion (generate/install shell completion scripts)

<sub>source `docs/cli/completion.md` · 69 lines · 594 words · 1 code blocks</sub>

**Read when:** You want shell completions for zsh/bash/fish/PowerShell · You need to cache completion scripts under OpenClaw state

**Covers:** Usage · Options · Install flow · Permission failures · Notes · Related

**CLI:** `openclaw completion`, `openclaw doctor`, `openclaw update`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/completion](https://docs.openclaw.ai/cli/completion)</sub>

---

### `/cli/dns` — DNS

**DNS** · *Reference › Utility*

> CLI reference for openclaw dns (wide-area discovery helpers)

<sub>source `docs/cli/dns.md` · 47 lines · 174 words · 1 code blocks</sub>

**Read when:** You want wide-area discovery (DNS-SD) via Tailscale + CoreDNS · You're setting up split DNS for a custom discovery domain (example: openclaw.internal)

**Covers:** dns setup · Related

**CLI:** `openclaw dns`, `openclaw dns setup`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/dns](https://docs.openclaw.ai/cli/dns)</sub>

---

### `/cli/docs` — Docs

**Docs** · *Reference › Utility*

> CLI reference for openclaw docs (search the live docs index)

<sub>source `docs/cli/docs.md` · 73 lines · 313 words · 3 code blocks</sub>

**Read when:** You want to search the live OpenClaw docs from the terminal · You need to know which hosted search API the docs CLI calls

**Covers:** Usage · Examples · How it works · Output · Exit codes · Related

**CLI:** `openclaw docs`, `openclaw docs browser`, `openclaw docs gateway`, `openclaw docs plugin`, `openclaw docs sandbox`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/docs](https://docs.openclaw.ai/cli/docs)</sub>

---

### `/cli/mcp` — MCP

**MCP** · *Reference › Utility*

> Expose OpenClaw channel conversations over MCP and manage saved MCP server definitions

<sub>source `docs/cli/mcp.md` · 134 lines · 801 words</sub>

**Read when:** Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels · Running `openclaw mcp serve` · Managing OpenClaw-saved MCP server definitions

**Covers:** Choose the right MCP path · MCP pages · Where each section moved · Related

**CLI:** `openclaw acp`, `openclaw attach`, `openclaw mcp`, `openclaw mcp add`, `openclaw mcp serve`, `openclaw mcp status`

**Config:** `mcp.servers`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp](https://docs.openclaw.ai/cli/mcp)</sub>

---

### `/cli/mcp/serve` — Run OpenClaw as an MCP server

**Run OpenClaw as an MCP server** · *Reference › MCP*

> Run OpenClaw as a stdio MCP server so an MCP client can read and send channel conversations

<sub>source `docs/cli/mcp/serve.md` · 330 lines · 1476 words · 6 code blocks</sub>

**Read when:** Connecting Codex, Claude Code, or another MCP client to OpenClaw-backed channels · Running `openclaw mcp serve` · Debugging bridge events, Claude notifications, or missing conversations

**Covers:** OpenClaw as an MCP server · Current limits <sub>(13 sub-sections)</sub>

**CLI:** `openclaw acp`, `openclaw agent`, `openclaw infer model`, `openclaw mcp serve`

**Config:** `gateway.remote.url`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp/serve](https://docs.openclaw.ai/cli/mcp/serve)</sub>

---

### `/cli/mcp/registry` — Manage saved MCP servers

**Manage saved MCP servers** · *Reference › MCP*

> Manage OpenClaw-saved MCP server definitions with the mcp registry subcommands

<sub>source `docs/cli/mcp/registry.md` · 245 lines · 1679 words · 8 code blocks</sub>

**Read when:** Saving a third-party MCP server for OpenClaw-managed agent runs · Looking up what `list`, `show`, `status`, `doctor`, `probe`, `add`, `set`, `configure`, `tools`, `login`, `logout`, `reload`, or `unset` does · Setting the Codex tool approval mode for a saved server

**Covers:** OpenClaw as an MCP client registry <sub>(3 sub-sections)</sub>

**CLI:** `openclaw approvals get`, `openclaw approvals set`, `openclaw mcp add`, `openclaw mcp configure`, `openclaw mcp doctor`, `openclaw mcp list`, `openclaw mcp login`, `openclaw mcp logout`

**Config:** `mcp.servers`, `mcp.sessionIdleTtlMs`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp/registry](https://docs.openclaw.ai/cli/mcp/registry)</sub>

---

### `/cli/mcp/json-output` — JSON output shapes

**JSON output shapes** · *Reference › MCP*

> JSON output shapes for openclaw mcp status, doctor, and probe

<sub>source `docs/cli/mcp/json-output.md` · 133 lines · 237 words · 4 code blocks</sub>

**Read when:** Scripting or building a dashboard on `openclaw mcp --json` output · Checking which fields `status`, `doctor`, or `probe` report

**Covers:** JSON output shapes

**CLI:** `openclaw mcp login`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp/json-output](https://docs.openclaw.ai/cli/mcp/json-output)</sub>

---

### `/cli/mcp/transports` — Transports and OAuth

**Transports and OAuth** · *Reference › MCP*

> Stdio, SSE/HTTP, and Streamable HTTP transport fields plus the MCP OAuth workflow

<sub>source `docs/cli/mcp/transports.md` · 226 lines · 1469 words · 9 code blocks</sub>

**Read when:** Choosing a transport for a saved MCP server · Looking up a transport config field · Running or repairing the MCP OAuth login flow

**Covers:** Stdio transport · SSE / HTTP transport · OAuth workflow · Streamable HTTP transport

**CLI:** `openclaw doctor`, `openclaw mcp doctor`, `openclaw mcp login`, `openclaw mcp logout`, `openclaw mcp set`, `openclaw mcp status`

**Config:** `gateway.publicOrigin`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp/transports](https://docs.openclaw.ai/cli/mcp/transports)</sub>

---

### `/cli/mcp/control-ui` — MCP in the Control UI

**MCP in the Control UI** · *Reference › MCP*

> Edit and inspect MCP servers from the browser Control UI settings page

<sub>source `docs/cli/mcp/control-ui.md` · 47 lines · 440 words</sub>

**Read when:** Editing MCP config from a browser instead of the CLI · Looking for the Control UI MCP inventory or enablement toggles

**Covers:** Control UI

**CLI:** `openclaw mcp doctor`, `openclaw mcp probe`, `openclaw mcp reload`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp/control-ui](https://docs.openclaw.ai/cli/mcp/control-ui)</sub>

---

### `/cli/mcp/apps` — MCP Apps

**MCP Apps** · *Reference › MCP*

> Enable and secure the MCP Apps host bridge that renders server-provided HTML views

<sub>source `docs/cli/mcp/apps.md` · 107 lines · 1327 words · 4 code blocks</sub>

**Read when:** Enabling the MCP Apps host bridge · Reviewing the sandbox origin, listener port, and security boundaries for Apps

**Covers:** MCP Apps · Plugin extensions · Behavior and security boundaries

**CLI:** `openclaw config set`, `openclaw security audit`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/mcp/apps](https://docs.openclaw.ai/cli/mcp/apps)</sub>

---

### `/cli/proxy` — Proxy

**Proxy** · *Reference › Utility*

> CLI reference for openclaw proxy, including operator-managed proxy validation and the local debug proxy capture inspector

<sub>source `docs/cli/proxy.md` · 97 lines · 663 words · 1 code blocks</sub>

**Read when:** You need to validate operator-managed proxy routing before deployment · You need to capture OpenClaw transport traffic locally for debugging · You want to inspect debug proxy sessions, blobs, or built-in query presets

**Covers:** Validate · Debug proxy · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw proxy`, `openclaw proxy blob`, `openclaw proxy coverage`, `openclaw proxy purge`, `openclaw proxy query`, `openclaw proxy run`, `openclaw proxy sessions`, `openclaw proxy start`

**TermCrab — cli: PARTIAL.** 23 commands in one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on one command only.

<sub>live: [docs.openclaw.ai/cli/proxy](https://docs.openclaw.ai/cli/proxy)</sub>

---

### `/reference/rpc` — RPC adapters

**RPC adapters** · *Reference › RPC and API*

> RPC adapters for external CLIs (signal-cli, imsg) and gateway patterns

<sub>source `docs/reference/rpc.md` · 38 lines · 146 words</sub>

**Read when:** Adding or changing external CLI integrations · Debugging RPC adapters (signal-cli, imsg)

**Covers:** Pattern A: HTTP daemon (signal-cli) · Pattern B: stdio child process (imsg) · Adapter guidelines · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/rpc](https://docs.openclaw.ai/reference/rpc)</sub>

---

### `/plugins/codex-harness-reference` — Codex harness reference

**Codex harness reference** · *Reference › Codex runtime reference*

> Configuration, auth, discovery, and app-server reference for the Codex harness

<sub>source `docs/plugins/codex-harness-reference.md` · 116 lines · 494 words · 1 code blocks</sub>

**Read when:** You need every Codex harness config field · You are changing app-server transport, auth, discovery, or timeout behavior · You are debugging Codex harness startup, model discovery, or environment isolation

**Covers:** Plugin config surface · Where each section moved · Related <sub>(9 sub-sections)</sub>

**Config:** `plugins.entries.codex.config`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference](https://docs.openclaw.ai/plugins/codex-harness-reference)</sub>

---

### `/plugins/codex-harness-reference/supervision` — Codex session catalog and supervision

**Codex session catalog and supervision** · *Reference › Codex harness reference*

> Native Codex session discovery and agent-facing supervision settings

<sub>source `docs/plugins/codex-harness-reference/supervision.md` · 140 lines · 942 words · 2 code blocks</sub>

**Read when:** You are enabling or disabling native Codex session discovery · You need the supervision config fields and endpoint fields · You are registering additional local Codex homes

**Covers:** Supervision

**CLI:** `openclaw doctor`

**Config:** `plugins.entries.codex-supervisor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/supervision](https://docs.openclaw.ai/plugins/codex-harness-reference/supervision)</sub>

---

### `/plugins/codex-harness-reference/app-server-transport` — Codex app-server transport

**Codex app-server transport** · *Reference › Codex harness reference*

> App-server transport selection, the appServer field table, and local testing env overrides

<sub>source `docs/plugins/codex-harness-reference/app-server-transport.md` · 278 lines · 2122 words · 6 code blocks</sub>

**Read when:** You are choosing a Codex app-server transport · You need an appServer field default · You are overriding the app-server binary for local testing

**Covers:** App-server transport · Environment overrides

**CLI:** `openclaw doctor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/app-server-transport](https://docs.openclaw.ai/plugins/codex-harness-reference/app-server-transport)</sub>

---

### `/plugins/codex-harness-reference/approval-and-sandbox` — Codex approval and sandbox modes

**Codex approval and sandbox modes** · *Reference › Codex harness reference*

> YOLO and guardian approval presets, and sandboxed native execution paths

<sub>source `docs/plugins/codex-harness-reference/approval-and-sandbox.md` · 153 lines · 903 words · 2 code blocks</sub>

**Read when:** You are choosing between YOLO and guardian approval · You are running Codex native execution inside an OpenClaw sandbox · You are placing Codex execution on a node or cloud worker

**Covers:** Approval and sandbox modes · Sandboxed native execution

**CLI:** `openclaw doctor`, `openclaw update`

**Config:** `agents.defaults.sandbox.mode`, `gateway.nodes.commands.allow`, `tools.exec`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/approval-and-sandbox](https://docs.openclaw.ai/plugins/codex-harness-reference/approval-and-sandbox)</sub>

---

### `/plugins/codex-harness-reference/auth` — Codex auth and environment isolation

**Codex auth and environment isolation** · *Reference › Codex harness reference*

> Codex auth selection order, credential handling, and environment isolation

<sub>source `docs/plugins/codex-harness-reference/auth.md` · 172 lines · 1126 words · 4 code blocks</sub>

**Read when:** You need the Codex auth selection order · You are sharing or isolating the native Codex home · You are migrating Codex credentials or assets into an agent

**Covers:** Auth and environment isolation · Upgrading from 2026.9.4 with Codex sign-in

**CLI:** `openclaw migrate apply`, `openclaw migrate codex`, `openclaw migrate plan`, `openclaw models auth`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/auth](https://docs.openclaw.ai/plugins/codex-harness-reference/auth)</sub>

---

### `/plugins/codex-harness-reference/dynamic-tools` — Codex dynamic tools

**Codex dynamic tools** · *Reference › Codex harness reference*

> How OpenClaw dynamic tools are exposed to Codex app-server turns

<sub>source `docs/plugins/codex-harness-reference/dynamic-tools.md` · 62 lines · 393 words</sub>

**Read when:** You need to know which OpenClaw tools Codex can call · You are changing dynamic tool loading or exclusions · You are debugging the Codex tool payload

**Covers:** Dynamic tools

**Config:** `tools.*`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/dynamic-tools](https://docs.openclaw.ai/plugins/codex-harness-reference/dynamic-tools)</sub>

---

### `/plugins/codex-harness-reference/timeouts` — Codex timeouts and turn settlement

**Codex timeouts and turn settlement** · *Reference › Codex harness reference*

> Dynamic tool timeout order, turn execution budgets, and local settlement

<sub>source `docs/plugins/codex-harness-reference/timeouts.md` · 132 lines · 1085 words</sub>

**Read when:** You need the dynamic tool timeout order · You are changing the turn execution budget · You are debugging a turn that never settles

**Covers:** Timeouts <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.mediaModels.image.timeoutMs`, `agents.defaults.timeoutSeconds`, `tools.media.models[]`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/timeouts](https://docs.openclaw.ai/plugins/codex-harness-reference/timeouts)</sub>

---

### `/plugins/codex-harness-reference/model-discovery` — Codex model discovery

**Codex model discovery** · *Reference › Codex harness reference*

> Codex app-server model discovery, offline hints, and catalog rules

<sub>source `docs/plugins/codex-harness-reference/model-discovery.md` · 166 lines · 1092 words · 2 code blocks</sub>

**Read when:** You are debugging the Codex model picker · You need the offline fallback model hints · You are pointing Codex at a custom catalog or broker

**Covers:** Model discovery

**Config:** `models.list`, `plugins.entries.codex.config.discovery`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/model-discovery](https://docs.openclaw.ai/plugins/codex-harness-reference/model-discovery)</sub>

---

### `/plugins/codex-harness-reference/restricted-turns` — Codex restricted turns

**Codex restricted turns** · *Reference › Codex harness reference*

> When a tool policy restricts the Codex native surface, and what ring zero adds

<sub>source `docs/plugins/codex-harness-reference/restricted-turns.md` · 51 lines · 348 words · 1 code blocks</sub>

**Read when:** You are setting a tool allow or deny policy for Codex · You need the audited safe-deny tool names · You are debugging a turn with no native Code Mode

**Covers:** Restricted turns

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/restricted-turns](https://docs.openclaw.ai/plugins/codex-harness-reference/restricted-turns)</sub>

---

### `/plugins/codex-harness-reference/workspace-bootstrap-files` — Codex workspace bootstrap files

**Codex workspace bootstrap files** · *Reference › Codex harness reference*

> Which workspace bootstrap files reach a Codex turn, and how they are carried

<sub>source `docs/plugins/codex-harness-reference/workspace-bootstrap-files.md` · 128 lines · 1072 words</sub>

**Read when:** You need to know how AGENTS.md reaches Codex · You are debugging persona or memory context in Codex turns · You are hitting prepared-context size limits

**Covers:** Workspace bootstrap files <sub>(1 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-reference/workspace-bootstrap-files](https://docs.openclaw.ai/plugins/codex-harness-reference/workspace-bootstrap-files)</sub>

---

### `/plugins/codex-harness-runtime` — Codex harness runtime

**Codex harness runtime** · *Reference › Codex runtime reference*

> Runtime boundaries, hooks, tools, permissions, and diagnostics for the Codex harness

<sub>source `docs/plugins/codex-harness-runtime.md` · 205 lines · 1462 words</sub>

**Read when:** You need the Codex harness runtime support contract · You are debugging native Codex tools, hooks, compaction, or feedback upload · You are changing plugin behavior across OpenClaw and Codex harness turns

**Covers:** Overview · Media and delivery · Where each section moved · Related <sub>(9 sub-sections)</sub>

**Config:** `agents.defaults.mediaModels.image`, `agents.defaults.mediaModels.video`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime](https://docs.openclaw.ai/plugins/codex-harness-runtime)</sub>

---

### `/plugins/codex-harness-runtime/recovery` — Codex process recovery

**Codex process recovery** · *Reference › Codex harness runtime*

> Orphaned Codex app-server process detection and cleanup after a hard Gateway stop

<sub>source `docs/plugins/codex-harness-runtime/recovery.md` · 52 lines · 445 words</sub>

**Read when:** A Gateway stop left Codex app-server processes behind · A fresh stdio connection refuses to spawn

**Covers:** Recovery after a hard Gateway stop

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/recovery](https://docs.openclaw.ai/plugins/codex-harness-runtime/recovery)</sub>

---

### `/plugins/codex-harness-runtime/threads` — Codex thread bindings and supervision

**Codex thread bindings and supervision** · *Reference › Codex harness runtime*

> How OpenClaw binds native Codex threads, changes models, and continues supervised sessions

<sub>source `docs/plugins/codex-harness-runtime/threads.md` · 80 lines · 711 words</sub>

**Read when:** You are switching models on an attached Codex thread · You are branching or archiving a supervised Codex session

**Covers:** Thread bindings and model changes · Supervision and safe continuation

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/threads](https://docs.openclaw.ai/plugins/codex-harness-runtime/threads)</sub>

---

### `/plugins/codex-harness-runtime/replies` — Codex replies and final answers

**Codex replies and final answers** · *Reference › Codex harness runtime*

> Visible reply delivery, heartbeat turns, and bounded final-answer recovery

<sub>source `docs/plugins/codex-harness-runtime/replies.md` · 78 lines · 633 words</sub>

**Read when:** You are choosing between automatic and message-tool replies · A Codex turn finished tool work without a visible answer

**Covers:** Visible replies and heartbeats · Attachments in a remote workspace · Final answers after settled tool work

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/replies](https://docs.openclaw.ai/plugins/codex-harness-runtime/replies)</sub>

---

### `/plugins/codex-harness-runtime/hooks` — Codex hook boundaries

**Codex hook boundaries** · *Reference › Codex harness runtime*

> Which hook layer owns each Codex turn event, and what the native hook relay can do

<sub>source `docs/plugins/codex-harness-runtime/hooks.md` · 135 lines · 1119 words</sub>

**Read when:** You are writing a plugin hook that must run on Codex turns · You need the native hook relay and approval bridge rules

**Covers:** Hook boundaries

**Config:** `hooks.json`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/hooks](https://docs.openclaw.ai/plugins/codex-harness-runtime/hooks)</sub>

---

### `/plugins/codex-harness-runtime/sandbox-streaming` — Codex sandbox process streaming

**Codex sandbox process streaming** · *Reference › Codex harness runtime*

> Experimental native sandbox execution streaming and node-backed remote exec

<sub>source `docs/plugins/codex-harness-runtime/sandbox-streaming.md` · 49 lines · 406 words</sub>

**Read when:** You are enabling the experimental sandbox exec-server · You are running Codex native execution on a paired node

**Covers:** Experimental sandbox process streaming

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/sandbox-streaming](https://docs.openclaw.ai/plugins/codex-harness-runtime/sandbox-streaming)</sub>

---

### `/plugins/codex-harness-runtime/v1-support-contract` — Codex runtime v1 support contract

**Codex runtime v1 support contract** · *Reference › Codex harness runtime*

> What is and is not supported in Codex runtime v1, with the reason for each boundary

<sub>source `docs/plugins/codex-harness-runtime/v1-support-contract.md` · 33 lines · 636 words</sub>

**Read when:** You need the Codex runtime v1 support contract · You are checking whether a plugin surface works on Codex turns

**Covers:** V1 support contract

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/v1-support-contract](https://docs.openclaw.ai/plugins/codex-harness-runtime/v1-support-contract)</sub>

---

### `/plugins/codex-harness-runtime/permissions` — Codex native permissions and elicitations

**Codex native permissions and elicitations** · *Reference › Codex harness runtime*

> Native permission decisions, remembered approvals, and MCP elicitation limits

<sub>source `docs/plugins/codex-harness-runtime/permissions.md` · 101 lines · 819 words</sub>

**Read when:** You are routing Codex native permission requests through OpenClaw · You need the MCP elicitation form and URL limits

**Covers:** Native permissions and MCP elicitations · Async questions

**TermCrab — security: BROKEN.** Approvals module exists (`src/core/approvals.ts`) and is imported at `src/gateway/server.ts:78`, but `createApproval`/`waitForApproval` have zero call sites — no human-in-the-loop gate anywhere.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/permissions](https://docs.openclaw.ai/plugins/codex-harness-runtime/permissions)</sub>

---

### `/plugins/codex-harness-runtime/queue-and-feedback` — Codex queue steering and feedback upload

**Codex queue steering and feedback upload** · *Reference › Codex harness runtime*

> Active-run queue steering on Codex turns and the Codex feedback upload path

<sub>source `docs/plugins/codex-harness-runtime/queue-and-feedback.md` · 69 lines · 530 words</sub>

**Read when:** You are steering messages into an active Codex run · You are running /diagnostics on a native Codex session

**Covers:** Queue steering · Diagnostic-log warnings · Codex feedback upload

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/queue-and-feedback](https://docs.openclaw.ai/plugins/codex-harness-runtime/queue-and-feedback)</sub>

---

### `/plugins/codex-harness-runtime/compaction` — Codex compaction and transcript mirror

**Codex compaction and transcript mirror** · *Reference › Codex harness runtime*

> Native Codex compaction, the OpenClaw transcript mirror, and continuity projection

<sub>source `docs/plugins/codex-harness-runtime/compaction.md` · 84 lines · 691 words</sub>

**Read when:** You are tuning host mirror compaction against native compaction · You need to know what the transcript mirror records

**Covers:** Compaction and transcript mirror

**Config:** `agents.defaults.compaction.maxActiveTranscriptBytes`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/plugins/codex-harness-runtime/compaction](https://docs.openclaw.ai/plugins/codex-harness-runtime/compaction)</sub>

---

### `/plugins/plugin-inventory` — Plugin inventory

**Plugin inventory** · *Reference › Plugin reference*

> Generated inventory of OpenClaw plugins shipped in core, published externally, or kept source-only

<sub>source `docs/plugins/plugin-inventory.md` · 394 lines · 2925 words · 2 code blocks</sub>

**Read when:** You are deciding whether a plugin ships in the core npm package or installs separately · You are updating bundled plugin package metadata or release automation · You need the canonical internal vs external plugin list

**Covers:** Definitions · Install a plugin · Core npm package · Official external packages · Source checkout only · How this page is built

**CLI:** `openclaw path`, `openclaw plugins inspect`, `openclaw plugins install`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/plugin-inventory](https://docs.openclaw.ai/plugins/plugin-inventory)</sub>

---

### `/plugins/reference` — Plugin reference

**Plugin reference** · *Reference › Plugin reference*

> Pointer to the generated OpenClaw plugin reference pages

<sub>source `docs/plugins/reference.md` · 23 lines · 78 words · 1 code blocks</sub>

**Read when:** You need a reference page for a specific OpenClaw plugin · You are auditing plugin docs coverage

**Covers:** How this page is built

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/reference](https://docs.openclaw.ai/plugins/reference)</sub>

---

### `/plugins/dependency-resolution` — Plugin dependency resolution

**Plugin dependency resolution** · *Reference › Plugin reference*

> How OpenClaw installs plugin packages and resolves plugin dependencies

<sub>source `docs/plugins/dependency-resolution.md` · 331 lines · 2025 words · 7 code blocks</sub>

**Read when:** You are debugging plugin package installs · You are changing plugin startup, doctor, or package-manager install behavior · You are maintaining packaged OpenClaw installs or bundled plugin manifests

**Covers:** Responsibility split · Install roots · Local plugins · Startup and reload · Bundled plugins · Legacy cleanup <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw plugins install`, `openclaw plugins update`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/dependency-resolution](https://docs.openclaw.ai/plugins/dependency-resolution)</sub>

---

### `/plugins/sdk-overview` — Plugin SDK overview

**Plugin SDK overview** · *Reference › Plugin SDK reference*

> Import map, registration API reference, and SDK architecture

<sub>source `docs/plugins/sdk-overview.md` · 150 lines · 917 words</sub>

**Read when:** You need to know which SDK subpath to import from · You want a reference for all registration methods on OpenClawPluginApi · You are looking up a specific SDK export

**Covers:** API stability · What each page covers · Registration API · Where each section moved · Docked link readers · Related <sub>(2 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview](https://docs.openclaw.ai/plugins/sdk-overview)</sub>

---

### `/plugins/sdk-overview/imports` — Plugin SDK imports and module layout

**Plugin SDK imports and module layout** · *Reference › Plugin SDK overview*

> Which plugin SDK subpath to import from, and how to lay out a plugin's own barrels

<sub>source `docs/plugins/sdk-overview/imports.md` · 123 lines · 617 words · 2 code blocks</sub>

**Read when:** You need to know which SDK subpath to import from · You are looking up a specific SDK export · You are deciding how to structure your plugin's internal imports

**Covers:** Import convention · Subpath reference · Internal module convention

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/imports](https://docs.openclaw.ai/plugins/sdk-overview/imports)</sub>

---

### `/plugins/sdk-overview/capabilities` — Plugin SDK capability registration

**Plugin SDK capability registration** · *Reference › Plugin SDK overview*

> Provider, storage, worker, and embedding registration on OpenClawPluginApi

<sub>source `docs/plugins/sdk-overview/capabilities.md` · 320 lines · 4794 words · 1 code blocks</sub>

**Read when:** You are registering an inference, media, search, or transcript provider · You are implementing the cloud-worker provider lifecycle · You are registering an embedding provider · You are implementing a storage location transport

**Covers:** Capability registration · Decision models (contract version 1) <sub>(3 sub-sections)</sub>

**Config:** `agents.defaults.decisionModel`, `models.list.decisionModels`, `plugins.inspect`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/capabilities](https://docs.openclaw.ai/plugins/sdk-overview/capabilities)</sub>

---

### `/plugins/sdk-overview/tools-and-commands` — Plugin SDK tools and commands

**Plugin SDK tools and commands** · *Reference › Plugin SDK overview*

> Registering agent tools, custom commands, node-host commands, and widget presenters

<sub>source `docs/plugins/sdk-overview/tools-and-commands.md` · 131 lines · 922 words · 2 code blocks</sub>

**Read when:** You are registering an agent tool or a custom command · You are exposing a node-host command as an agent tool · You are registering a widget presenter or Computer Use provider

**Covers:** Tools and commands

**CLI:** `openclaw node run`, `openclaw update`

**Config:** `gateway.nodes.commands.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/tools-and-commands](https://docs.openclaw.ai/plugins/sdk-overview/tools-and-commands)</sub>

---

### `/plugins/sdk-overview/infrastructure` — Plugin SDK infrastructure registration

**Plugin SDK infrastructure registration** · *Reference › Plugin SDK overview*

> Hooks, HTTP routes, Gateway methods, services, and the webhook and SQLite helpers

<sub>source `docs/plugins/sdk-overview/infrastructure.md` · 528 lines · 4210 words · 2 code blocks</sub>

**Read when:** You are registering a Gateway HTTP route, RPC method, or background service · You are reading a webhook body or admitting a SQLite write from a plugin · You need per-requester MCP transports for a static server name

**Covers:** Infrastructure <sub>(11 sub-sections)</sub>

**CLI:** `openclaw migrate`, `openclaw nodes`, `openclaw security audit`

**Config:** `mcp.servers`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/infrastructure](https://docs.openclaw.ai/plugins/sdk-overview/infrastructure)</sub>

---

### `/plugins/sdk-overview/host-hooks` — Plugin SDK host hooks for workflow plugins

**Plugin SDK host hooks for workflow plugins** · *Reference › Plugin SDK overview*

> Session extensions, trusted tool policies, Control UI descriptors, and runtime lifecycle

<sub>source `docs/plugins/sdk-overview/host-hooks.md` · 570 lines · 4324 words · 4 code blocks</sub>

**Read when:** You are building a workflow, approval, or policy plugin that participates in the host lifecycle · You are registering a Control UI descriptor or session action · You need trusted tool policy or tool-result middleware

**Covers:** Host hooks for workflow plugins · Sandbox backends · Docked link readers

**Config:** `gateway.controlUi.basePath`, `plugins.changed`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/host-hooks](https://docs.openclaw.ai/plugins/sdk-overview/host-hooks)</sub>

---

### `/plugins/sdk-overview/cli-and-discovery` — Plugin SDK CLI and discovery registration

**Plugin SDK CLI and discovery registration** · *Reference › Plugin SDK overview*

> Gateway discovery services, CLI registrars and descriptors, and CLI backend registration

<sub>source `docs/plugins/sdk-overview/cli-and-discovery.md` · 175 lines · 826 words · 4 code blocks</sub>

**Read when:** You are adding a plugin-owned CLI command or node feature · You are registering a local Gateway discovery advertiser · You own the default config for a local AI CLI backend

**Covers:** Gateway discovery registration · CLI registration metadata · CLI backend registration

**CLI:** `openclaw nodes canvas`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/cli-and-discovery](https://docs.openclaw.ai/plugins/sdk-overview/cli-and-discovery)</sub>

---

### `/plugins/sdk-overview/memory-and-context` — Plugin SDK memory and context slots

**Plugin SDK memory and context slots** · *Reference › Plugin SDK overview*

> The exclusive context-engine and memory-capability slots and their embedding adapters

<sub>source `docs/plugins/sdk-overview/memory-and-context.md` · 257 lines · 2020 words · 2 code blocks</sub>

**Read when:** You are registering a context engine or a memory capability · You need the durable admitted-turn contract for context engines · You are exposing memory embedding or public-artifact adapters · You need to authorize provider memory by owner or conversation audience

**Covers:** Exclusive slots · Memory embedding adapters · Provider-neutral memory runtime · Bundled Memory Core workers <sub>(4 sub-sections)</sub>

**Config:** `memory.get`, `memory.search`, `memory.status`

**TermCrab — context: PARTIAL.** Prompt assembled in `src/agent/prompt.ts`; no context-engine plugin interface, no /context introspection.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/memory-and-context](https://docs.openclaw.ai/plugins/sdk-overview/memory-and-context)</sub>

---

### `/plugins/sdk-overview/events-and-hooks` — Plugin SDK events and hook semantics

**Plugin SDK events and hook semantics** · *Reference › Plugin SDK overview*

> Typed lifecycle hooks and the decision rules each hook applies

<sub>source `docs/plugins/sdk-overview/events-and-hooks.md` · 48 lines · 497 words</sub>

**Read when:** You are subscribing to a typed lifecycle hook from a plugin · You need to know whether a hook result is terminal · You are projecting Gateway cron state into an external scheduler

**Covers:** Events and lifecycle · Hook decision semantics

**Config:** `security.installPolicy`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-overview/events-and-hooks](https://docs.openclaw.ai/plugins/sdk-overview/events-and-hooks)</sub>

---

### `/plugins/manifest` — Plugin manifest

**Plugin manifest** · *Reference › Plugin SDK reference*

> Plugin manifest + JSON schema requirements (strict config validation)

<sub>source `docs/plugins/manifest.md` · 463 lines · 3956 words · 3 code blocks</sub>

**Read when:** You are building an OpenClaw plugin · You need to ship a plugin config schema or debug plugin validation errors

**Covers:** What this file does · Where each field is documented · Minimal example · Rich example · Top-level field reference · Catalog categories · JSON Schema requirements · Validation behavior · Notes · Related <sub>(9 sub-sections)</sub>

**CLI:** `openclaw qa`

**Config:** `channels.*`, `mcp.servers`, `plugins.*`, `plugins.allow`, `plugins.deny`, `plugins.entries`, `plugins.installs`, `plugins.slots.*`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest](https://docs.openclaw.ai/plugins/manifest)</sub>

---

### `/plugins/manifest/models` — Manifest model fields

**Manifest model fields** · *Reference › Plugin manifest*

> Manifest model catalog, shorthand family, id normalization, and pricing fields

<sub>source `docs/plugins/manifest/models.md` · 335 lines · 2928 words · 5 code blocks</sub>

**Read when:** You own a provider plugin and must declare its models · You need catalog rows, aliases, or suppressions read before runtime loads · You are mapping provider models to a published pricing source

**Covers:** modelSupport reference · modelCatalog reference · modelIdNormalization reference · modelPricing reference <sub>(1 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.utilityModel`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/models](https://docs.openclaw.ai/plugins/manifest/models)</sub>

---

### `/plugins/manifest/providers` — Manifest provider fields

**Manifest provider fields** · *Reference › Plugin manifest*

> Manifest generation, media-understanding, endpoint, and request provider metadata

<sub>source `docs/plugins/manifest/providers.md` · 186 lines · 1227 words · 3 code blocks</sub>

**Read when:** You own an image, video, music, or media-understanding provider · You need core to classify a provider endpoint before runtime loads · You are declaring cheap availability signals instead of importing runtime

**Covers:** Generation provider metadata reference · mediaUnderstandingProviderMetadata reference · providerEndpoints reference · providerRequest reference

**Config:** `plugins.entries.example.config`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/providers](https://docs.openclaw.ai/plugins/manifest/providers)</sub>

---

### `/plugins/manifest/setup-and-auth` — Manifest setup and auth fields

**Manifest setup and auth fields** · *Reference › Plugin manifest*

> Manifest setup descriptors, auth choices, conversation discovery, and config UI hints

<sub>source `docs/plugins/manifest/setup-and-auth.md` · 342 lines · 3081 words · 3 code blocks</sub>

**Read when:** You are wiring a plugin into onboarding or provider setup · You need auth choices, CLI flags, or env vars read before runtime loads · You are labelling config fields for the setup and Control UI surfaces

**Covers:** Native conversation discovery · providerAuthChoices reference · setup reference · configGroups reference · uiHints reference <sub>(3 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/setup-and-auth](https://docs.openclaw.ai/plugins/manifest/setup-and-auth)</sub>

---

### `/plugins/manifest/capabilities` — Manifest capability fields

**Manifest capability fields** · *Reference › Plugin manifest*

> Manifest capability ownership, tool availability metadata, and activation planning

<sub>source `docs/plugins/manifest/capabilities.md` · 258 lines · 2705 words · 4 code blocks</sub>

**Read when:** You are declaring which capabilities your plugin owns · You want core to skip importing your runtime to find a tool · You are tuning when the activation planner loads your plugin

**Covers:** contracts reference · Decision models reference · Tool metadata reference · activation reference

**CLI:** `openclaw migrate`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/capabilities](https://docs.openclaw.ai/plugins/manifest/capabilities)</sub>

---

### `/plugins/manifest/surfaces` — Manifest host surface fields

**Manifest host surface fields** · *Reference › Plugin manifest*

> Manifest fields for icons, themes, CLI, MCP, Control UI, dashboard, QA, channel, and backup surfaces

<sub>source `docs/plugins/manifest/surfaces.md` · 684 lines · 4295 words · 17 code blocks</sub>

**Read when:** You are adding plugin branding or compact tool activity artwork · Your plugin contributes a CLI command, MCP server, or dashboard widget · You are shipping native Control UI or a QA runner · Your plugin contributes a theme to the shared appearance catalog · You need backups or transcripts to know about plugin-owned data

**Covers:** Plugin icon · Inline activity icons · Themes · Transcript sources reference · backupResources reference · MCP server reference · UI capabilities · controlUi reference · dashboard reference · catalog reference · cliCommands reference · commandAliases reference · qaRunners reference · channelAccountKeyPolicies reference · _+1 more_ <sub>(1 sub-sections)</sub>

**CLI:** `openclaw backup create`, `openclaw doctor`, `openclaw nodes`, `openclaw plugins build`, `openclaw plugins reload`, `openclaw qa`

**Config:** `channels.chat`, `gateway.controlUi.experimental.customPlugins`, `plugins.allow`, `plugins.entries`, `tools.effective`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/surfaces](https://docs.openclaw.ai/plugins/manifest/surfaces)</sub>

---

### `/plugins/manifest/config-and-secrets` — Manifest config and secret fields

**Manifest config and secret fields** · *Reference › Plugin manifest*

> Manifest dangerous-flag, SecretRef migration, and secret provider preset metadata

<sub>source `docs/plugins/manifest/config-and-secrets.md` · 110 lines · 845 words · 3 code blocks</sub>

**Read when:** You need doctor to flag a dangerous config literal your plugin owns · You are migrating plugin config values to SecretRefs · You are publishing a reusable SecretRef exec provider preset

**Covers:** configContracts reference · secretProviderIntegrations reference <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/config-and-secrets](https://docs.openclaw.ai/plugins/manifest/config-and-secrets)</sub>

---

### `/plugins/manifest/package-json` — Manifest versus package.json

**Manifest versus package.json** · *Reference › Plugin manifest*

> Which pre-runtime metadata lives in package.json, and which duplicate plugin id wins

<sub>source `docs/plugins/manifest/package-json.md` · 135 lines · 1928 words · 2 code blocks</sub>

**Read when:** You are unsure whether metadata belongs in the manifest or package.json · You are declaring entrypoints, install hints, or channel catalog metadata · Two plugin roots share an id and you need to know which one loads

**Covers:** Manifest versus package.json · Discovery precedence (duplicate plugin ids) <sub>(1 sub-sections)</sub>

**CLI:** `openclaw channels add`, `openclaw doctor`, `openclaw plugins install`, `openclaw plugins update`

**Config:** `plugins.allow`, `plugins.load.paths`, `tools.web.search.provider`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/manifest/package-json](https://docs.openclaw.ai/plugins/manifest/package-json)</sub>

---

### `/plugins/sdk-subpaths` — Plugin SDK subpaths

**Plugin SDK subpaths** · *Reference › Plugin SDK reference*

> Plugin SDK subpath catalog: which imports live where, grouped by area

<sub>source `docs/plugins/sdk-subpaths.md` · 682 lines · 8576 words · 2 code blocks</sub>

**Read when:** Choosing the right plugin-sdk subpath for a plugin import · Auditing bundled-plugin subpaths and helper surfaces

**Covers:** Plugin entry · Asynchronous proxy capture · Related <sub>(5 sub-sections)</sub>

**Config:** `gateway.publicOrigin`, `logging.redactPatterns`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-subpaths](https://docs.openclaw.ai/plugins/sdk-subpaths)</sub>

---

### `/plugins/sdk-entrypoints` — Plugin entry points

**Plugin entry points** · *Reference › Plugin SDK reference*

> Reference for defineToolPlugin, definePluginEntry, defineChannelPluginEntry, and defineSetupPluginEntry

<sub>source `docs/plugins/sdk-entrypoints.md` · 285 lines · 2662 words · 1 code blocks</sub>

**Read when:** You need the exact type signature of defineToolPlugin, definePluginEntry, or defineChannelPluginEntry · You want to understand registration mode (full vs setup vs CLI metadata) · You are looking up entry point options

**Covers:** Where each section moved · Plugin shapes · Related · Code Mode executor runtime · Native MCP App adapters · MCP subprocess runtime · Workspace access · Agent workspace context · Tool failure diagnostics · ACP harness turns

**CLI:** `openclaw plugins inspect`

**Config:** `agents.files.set`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints](https://docs.openclaw.ai/plugins/sdk-entrypoints)</sub>

---

### `/plugins/sdk-entrypoints/tool-policy-and-sandbox` — Plugin SDK tool policy and sandbox helpers

**Plugin SDK tool policy and sandbox helpers** · *Reference › Plugin entry points*

> toolPolicy matchers, tool-group expansion, and splitSandboxBindSpec

<sub>source `docs/plugins/sdk-entrypoints/tool-policy-and-sandbox.md` · 96 lines · 688 words</sub>

**Read when:** You are expanding tool groups or building a tool policy matcher · You are parsing a sandbox bind specification

**Covers:** Tool policy vocabulary · Runtime tool allowlists · Sandbox bind parsing · Sandbox filesystem mappings · Directory listing metadata

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/tool-policy-and-sandbox](https://docs.openclaw.ai/plugins/sdk-entrypoints/tool-policy-and-sandbox)</sub>

---

### `/plugins/sdk-entrypoints/package-entries` — Plugin SDK package entries

**Plugin SDK package entries** · *Reference › Plugin entry points*

> package.json openclaw source and runtime entry fields and their resolution order

<sub>source `docs/plugins/sdk-entrypoints/package-entries.md` · 53 lines · 328 words · 1 code blocks</sub>

**Read when:** You are declaring extensions, setupEntry, or their runtime peers · You need the built-JavaScript peer resolution order

**Covers:** Package entries

**Config:** `plugins.load.paths`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/package-entries](https://docs.openclaw.ai/plugins/sdk-entrypoints/package-entries)</sub>

---

### `/plugins/sdk-entrypoints/define-tool-plugin` — Plugin SDK defineToolPlugin helper

**Plugin SDK defineToolPlugin helper** · *Reference › Plugin entry points*

> The tool-only entry helper, its schemas, and generated manifest metadata

<sub>source `docs/plugins/sdk-entrypoints/define-tool-plugin.md` · 96 lines · 292 words · 2 code blocks</sub>

**Read when:** You are writing a plugin that only adds agent tools · You need the defineToolPlugin signature and its manifest output

**Covers:** defineToolPlugin · Input-dependent output schemas

**CLI:** `openclaw plugins build`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/define-tool-plugin](https://docs.openclaw.ai/plugins/sdk-entrypoints/define-tool-plugin)</sub>

---

### `/plugins/sdk-entrypoints/define-plugin-entry` — Plugin SDK definePluginEntry helper

**Plugin SDK definePluginEntry helper** · *Reference › Plugin entry points*

> The general entry helper, its fields, and the session catalog provider contract

<sub>source `docs/plugins/sdk-entrypoints/define-plugin-entry.md` · 294 lines · 2184 words · 2 code blocks</sub>

**Read when:** You are writing a provider, hook, or advanced tool plugin · You are registering an external session catalog provider · You need the definePluginEntry field table

**Covers:** definePluginEntry

**Config:** `gateway.cliAgents.enabled`, `gateway.terminal.enabled`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/define-plugin-entry](https://docs.openclaw.ai/plugins/sdk-entrypoints/define-plugin-entry)</sub>

---

### `/plugins/sdk-entrypoints/native-providers` — Plugin SDK native provider factories

**Plugin SDK native provider factories** · *Reference › Plugin entry points*

> Factory-form speech, transcription, and voice registration, and Computer Use providers

<sub>source `docs/plugins/sdk-entrypoints/native-providers.md` · 51 lines · 259 words · 1 code blocks</sub>

**Read when:** You are registering a speech, transcription, or realtime voice provider · You are building a node-local Computer Use plugin

**Covers:** Native provider factories · Computer Use providers

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/native-providers](https://docs.openclaw.ai/plugins/sdk-entrypoints/native-providers)</sub>

---

### `/plugins/sdk-entrypoints/define-channel-plugin-entry` — Plugin SDK defineChannelPluginEntry helper

**Plugin SDK defineChannelPluginEntry helper** · *Reference › Plugin entry points*

> The channel entry helper, its mode-gated callbacks, and CLI registration

<sub>source `docs/plugins/sdk-entrypoints/define-channel-plugin-entry.md` · 108 lines · 613 words · 1 code blocks</sub>

**Read when:** You are writing a messaging channel plugin · You need to know which callback runs in which registration mode · You are registering plugin-owned root CLI commands

**Covers:** defineChannelPluginEntry

**CLI:** `openclaw nodes`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/define-channel-plugin-entry](https://docs.openclaw.ai/plugins/sdk-entrypoints/define-channel-plugin-entry)</sub>

---

### `/plugins/sdk-entrypoints/define-setup-plugin-entry` — Plugin SDK defineSetupPluginEntry helper

**Plugin SDK defineSetupPluginEntry helper** · *Reference › Plugin entry points*

> The lightweight setup entry helper and the narrow setup helper families

<sub>source `docs/plugins/sdk-entrypoints/define-setup-plugin-entry.md` · 85 lines · 355 words · 2 code blocks</sub>

**Read when:** You are writing a setup-entry.ts file · You need the narrow setup, archive, or secret-file helper imports

**Covers:** defineSetupPluginEntry

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/define-setup-plugin-entry](https://docs.openclaw.ai/plugins/sdk-entrypoints/define-setup-plugin-entry)</sub>

---

### `/plugins/sdk-entrypoints/registration-mode` — Plugin SDK registration mode

**Plugin SDK registration mode** · *Reference › Plugin entry points*

> How api.registrationMode reports the load mode and what to register in each

<sub>source `docs/plugins/sdk-entrypoints/registration-mode.md` · 81 lines · 404 words · 2 code blocks</sub>

**Read when:** You need to know what to register in each registration mode · You are handling cli-metadata, discovery, or setup-runtime loads

**Covers:** Registration mode

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-entrypoints/registration-mode](https://docs.openclaw.ai/plugins/sdk-entrypoints/registration-mode)</sub>

---

### `/plugins/sdk-runtime` — Plugin runtime helpers

**Plugin runtime helpers** · *Reference › Plugin SDK reference*

> api.runtime -- the injected runtime helpers available to plugins

<sub>source `docs/plugins/sdk-runtime.md` · 433 lines · 2663 words · 5 code blocks</sub>

**Read when:** You need to call core helpers from a plugin (TTS, STT, image gen, web search, Gateway, subagent, nodes) · You want to understand what api.runtime exposes · You are accessing config, agent, or media helpers from plugin code · You are implementing model-picker persistence in a channel plugin

**Covers:** What each page covers · Runtime namespaces · Storing runtime references · Plugin lifecycle and cleanup · Browser meeting transport builders · Browser meeting status ownership · Browser meeting participation · Worker provider allocation authority · Other top-level api fields · Where each section moved · Related · Decision model runtime <sub>(2 sub-sections)</sub>

**CLI:** `openclaw plugins reload`

**Config:** `gateway.readSessionFacts`, `plugins.allow`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime](https://docs.openclaw.ai/plugins/sdk-runtime)</sub>

---

### `/plugins/sdk-runtime/config-and-utilities` — Plugin runtime config and utilities

**Plugin runtime config and utilities** · *Reference › Plugin runtime helpers*

> Runtime config reads and writes, plus the shared process, error, and model-picker utilities

<sub>source `docs/plugins/sdk-runtime/config-and-utilities.md` · 314 lines · 2494 words · 3 code blocks</sub>

**Read when:** You are reading or writing OpenClaw config from plugin code · You need a shared process, error, or timing utility instead of a host import · You are wiring model-picker persistence or bot-loop protection

**Covers:** Config loading and writes · Reusable runtime utilities <sub>(1 sub-sections)</sub>

**Config:** `channels.defaults.botLoopProtection`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/config-and-utilities](https://docs.openclaw.ai/plugins/sdk-runtime/config-and-utilities)</sub>

---

### `/plugins/sdk-runtime/agent` — Plugin runtime agent helpers

**Plugin runtime agent helpers** · *Reference › Plugin runtime helpers*

> Agent identity, directories, session store, transcripts, and sandbox authority

<sub>source `docs/plugins/sdk-runtime/agent.md` · 390 lines · 4437 words · 5 code blocks</sub>

**Read when:** You are resolving agent directories, identity, or thinking defaults · You are reading or writing session entries and transcripts from a plugin · You need the effective sandbox workspace authority for a session

**Covers:** Plugin command runtime helpers · Auth-profile resolution · Session transcript hydration · Awaited transcript mutations · Bounded model context · Scoped session visibility · Agent and session namespaces

**Config:** `session.store`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/agent](https://docs.openclaw.ai/plugins/sdk-runtime/agent)</sub>

---

### `/plugins/sdk-runtime/models` — Plugin runtime model helpers

**Plugin runtime model helpers** · *Reference › Plugin runtime helpers*

> Host-owned completions, model-selection policy, and provider auth resolution

<sub>source `docs/plugins/sdk-runtime/models.md` · 275 lines · 1548 words · 6 code blocks</sub>

**Read when:** You need a host-owned text completion without importing provider internals · You are resolving a model reference against an agent allowlist · You are resolving provider credentials or auth profiles

**Covers:** Protected model egress for standalone commands · Prepared simple completions · Low-level completions · Model namespaces · Prepared completion SDK compatibility

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/models](https://docs.openclaw.ai/plugins/sdk-runtime/models)</sub>

---

### `/plugins/sdk-runtime/background-work` — Plugin runtime background work

**Plugin runtime background work** · *Reference › Plugin runtime helpers*

> Hook agent turns and subagent runs

<sub>source `docs/plugins/sdk-runtime/background-work.md` · 173 lines · 948 words · 3 code blocks</sub>

**Read when:** You are dispatching an agent turn for untrusted external content · You are launching or waiting on a background subagent run

**Covers:** Background work namespaces · Native harness completion delivery

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/background-work](https://docs.openclaw.ai/plugins/sdk-runtime/background-work)</sub>

---

### `/plugins/sdk-runtime/gateway-and-nodes` — Plugin runtime Gateway and nodes

**Plugin runtime Gateway and nodes** · *Reference › Plugin runtime helpers*

> In-process Gateway requests, paired node invocation, and Gateway service events

<sub>source `docs/plugins/sdk-runtime/gateway-and-nodes.md` · 570 lines · 3937 words · 8 code blocks</sub>

**Read when:** You are calling another Gateway method from a trusted plugin · You are invoking or streaming to a command on a paired node · You are registering a long-lived Gateway service

**Covers:** Service scheduling · Gateway and node namespaces · Gateway service events <sub>(3 sub-sections)</sub>

**CLI:** `openclaw googlemeet recover-tab`

**Config:** `gateway.nodes.commands.allow`, `nodes.invoke`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/gateway-and-nodes](https://docs.openclaw.ai/plugins/sdk-runtime/gateway-and-nodes)</sub>

---

### `/plugins/sdk-runtime/media` — Plugin runtime media helpers

**Plugin runtime media helpers** · *Reference › Plugin runtime helpers*

> Speech, media understanding, image/video/music generation, web search, and media utilities

<sub>source `docs/plugins/sdk-runtime/media.md` · 224 lines · 344 words · 8 code blocks</sub>

**Read when:** You are synthesizing speech or transcribing inbound audio · You are generating images, video, or music from a plugin · You need MIME detection, resizing, or QR helpers

**Covers:** FFmpeg command discovery · Realtime voice playback · Media and generation namespaces

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/media](https://docs.openclaw.ai/plugins/sdk-runtime/media)</sub>

---

### `/plugins/sdk-runtime/state-and-system` — Plugin runtime state and system

**Plugin runtime state and system** · *Reference › Plugin runtime helpers*

> Config snapshot, SQLite-backed plugin state, system utilities, events, and logging

<sub>source `docs/plugins/sdk-runtime/state-and-system.md` · 534 lines · 4607 words · 9 code blocks</sub>

**Read when:** You need durable keyed or blob storage scoped to your plugin · You maintain a bundled or official plugin that writes through per-agent SQLite handles · You are buffering channel ingress across restarts · You need the config snapshot, system utilities, events, or a scoped logger

**Covers:** SQLite maintenance lifetime · State, config, and system namespaces · Synchronous keyed store migration · Per-agent SQLite writes

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/state-and-system](https://docs.openclaw.ai/plugins/sdk-runtime/state-and-system)</sub>

---

### `/plugins/sdk-runtime/channel` — Plugin runtime channel helpers

**Plugin runtime channel helpers** · *Reference › Plugin runtime helpers*

> Channel-specific runtime helper groups for chunking, routing, pairing, media, and mentions

<sub>source `docs/plugins/sdk-runtime/channel.md` · 192 lines · 1332 words · 3 code blocks</sub>

**Read when:** You are building or maintaining a channel plugin · You need channel media download, mention policy, or inbound kernel helpers

**Covers:** Channel namespaces · Awaited conversation binding mutations

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-runtime/channel](https://docs.openclaw.ai/plugins/sdk-runtime/channel)</sub>

---

### `/plugins/sdk-agent-harness` — Agent harness plugins

**Agent harness plugins** · *Reference › Plugin SDK reference*

> Experimental SDK surface for plugins that replace the low level embedded agent executor

<sub>source `docs/plugins/sdk-agent-harness.md` · 118 lines · 593 words</sub>

**Read when:** You are changing the embedded agent runtime or harness registry · You are registering an agent harness from a bundled or trusted plugin · You need to understand how the Codex plugin relates to model providers

**Covers:** When to use a harness · Where each section moved · Current limitations · Related <sub>(8 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness](https://docs.openclaw.ai/plugins/sdk-agent-harness)</sub>

---

### `/plugins/sdk-agent-harness/core-ownership` — Agent harness core ownership

**Agent harness core ownership** · *Reference › Agent harness plugins*

> What OpenClaw core prepares and owns before a harness runs an attempt, and the contracts a harness can declare to take some of it back

<sub>source `docs/plugins/sdk-agent-harness/core-ownership.md` · 412 lines · 3302 words</sub>

**Read when:** You need to know which attempt inputs core prepares for a harness · You are declaring native tool-policy, auth bootstrap, or session ownership · You are reading the prepared request-transport facts in `supports(ctx)`

**Covers:** What core still owns <sub>(10 sub-sections)</sub>

**Config:** `agents.defaults.userTimezone`, `agents.update`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/core-ownership](https://docs.openclaw.ai/plugins/sdk-agent-harness/core-ownership)</sub>

---

### `/plugins/sdk-agent-harness/registration` — Register an agent harness

**Register an agent harness** · *Reference › Agent harness plugins*

> Register an AgentHarnessV2, plus the optional isolated-completion and delegated-execution capabilities

<sub>source `docs/plugins/sdk-agent-harness/registration.md` · 143 lines · 858 words · 1 code blocks</sub>

**Read when:** You are writing the plugin entry that calls `api.registerAgentHarness` · You are implementing `runIsolatedCompletionV2` · You need to let a trusted plugin execute a session your harness owns

**Covers:** Register a harness <sub>(2 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/registration](https://docs.openclaw.ai/plugins/sdk-agent-harness/registration)</sub>

---

### `/plugins/sdk-agent-harness/selection-policy` — Agent harness selection policy

**Agent harness selection policy** · *Reference › Agent harness plugins*

> How OpenClaw picks a harness after provider and model resolution, and why most harnesses also register a provider

<sub>source `docs/plugins/sdk-agent-harness/selection-policy.md` · 100 lines · 782 words</sub>

**Read when:** You need to know when `auto` selects a plugin harness · A surprising harness was selected and you are debugging it · You are pairing a harness with a provider plugin

**Covers:** Selection policy · Provider plus harness pairing

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/selection-policy](https://docs.openclaw.ai/plugins/sdk-agent-harness/selection-policy)</sub>

---

### `/plugins/sdk-agent-harness/attempt-runtime` — Agent harness attempt runtime

**Agent harness attempt runtime** · *Reference › Agent harness plugins*

> Runtime helpers a selected harness calls during and after an attempt: injection, middleware, outcome classification, usage, and agent-end side effects

<sub>source `docs/plugins/sdk-agent-harness/attempt-runtime.md` · 291 lines · 2191 words</sub>

**Read when:** You are accepting steering or queued input during a live run · You are transforming tool results before they reach the model · You are reporting output tokens or running agent-end side effects

**Covers:** Guarded active-run injection · Tool-result middleware · Reply attachments from a remote workspace · Shared attempt mechanics · Shared host-tool result facts · Workspace-staged attachments · Final tool-argument validation · Terminal outcome classification · Live output-token usage · Agent-end side effects

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/attempt-runtime](https://docs.openclaw.ai/plugins/sdk-agent-harness/attempt-runtime)</sub>

---

### `/plugins/sdk-agent-harness/user-input-and-execution` — Agent harness user input and execution authority

**Agent harness user input and execution authority** · *Reference › Agent harness plugins*

> Blocking user-input surfaces, host tool capabilities, exec review outcomes, and paired-device command authority

<sub>source `docs/plugins/sdk-agent-harness/user-input-and-execution.md` · 316 lines · 2561 words · 2 code blocks</sub>

**Read when:** You are exposing a runtime-level user-input request or `ask_user` · You are binding a tool surface through `params.hostCapabilities` · You are handling exec reviewer decisions or paired-device commands

**Covers:** User input and tool surfaces · Exec reviewer outcomes · Sandbox subprocess cleanup · Paired-device execution

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/user-input-and-execution](https://docs.openclaw.ai/plugins/sdk-agent-harness/user-input-and-execution)</sub>

---

### `/plugins/sdk-agent-harness/native-inventories` — Agent harness native inventories

**Agent harness native inventories** · *Reference › Agent harness plugins*

> Read-only model and MCP catalogs a harness reports from its own native runtime

<sub>source `docs/plugins/sdk-agent-harness/native-inventories.md` · 71 lines · 588 words</sub>

**Read when:** You are reporting native models to the OpenClaw model picker · You own MCP connections outside the in-process MCP runtime · You are implementing catalog readiness or cleanup joins

**Covers:** Native model inventory · Native MCP inventory

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/native-inventories](https://docs.openclaw.ai/plugins/sdk-agent-harness/native-inventories)</sub>

---

### `/plugins/sdk-agent-harness/runtime-config` — Agent harness runtime configuration

**Agent harness runtime configuration** · *Reference › Agent harness plugins*

> Operator config for the native Codex harness mode and for strict provider or model runtime policy

<sub>source `docs/plugins/sdk-agent-harness/runtime-config.md` · 182 lines · 887 words · 4 code blocks</sub>

**Read when:** You are enabling the bundled Codex harness for embedded turns · You want harness selection to fail instead of falling back · You need provider, model, or per-agent `agentRuntime` config examples

**Covers:** Native Codex harness mode · Agents API environment · Agents API HTTP MCP servers · Runtime strictness

**CLI:** `openclaw doctor`

**Config:** `mcp.servers`, `plugins.allow`, `plugins.entries.agentsapi.config.environment`, `plugins.entries.agentsapi.config.hostExecutorSkillDirectories`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/runtime-config](https://docs.openclaw.ai/plugins/sdk-agent-harness/runtime-config)</sub>

---

### `/plugins/sdk-agent-harness/sessions-and-results` — Agent harness sessions and results

**Agent harness sessions and results** · *Reference › Agent harness plugins*

> Native session bindings, the OpenClaw transcript mirror, tool and media result delivery, terminal tool outcomes, and settled-turn finalization

<sub>source `docs/plugins/sdk-agent-harness/sessions-and-results.md` · 292 lines · 2220 words</sub>

**Read when:** You are storing a native session, thread, or resume token · You are returning tool, media, or terminal-outcome results · You are implementing `finalizeSettledTurn`

**Covers:** Native sessions and transcript mirror · Shared native binding lifecycle · Tool and media results · Harness delivery defaults · Terminal tool outcomes · Settled tool finalization

**Config:** `plugins.entries.acpx.config.stateDir`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-agent-harness/sessions-and-results](https://docs.openclaw.ai/plugins/sdk-agent-harness/sessions-and-results)</sub>

---

### `/plugins/sdk-setup` — Plugin setup and config

**Plugin setup and config** · *Reference › Plugin SDK reference*

> Setup wizards, setup-entry.ts, config schemas, and package.json metadata

<sub>source `docs/plugins/sdk-setup.md` · 660 lines · 2835 words · 21 code blocks</sub>

**Read when:** You are adding a setup wizard to a plugin · You need to understand setup-entry.ts vs index.ts · You are defining plugin config schemas or package.json openclaw metadata

**Covers:** Package metadata · Plugin manifest · Setup entry · Config schema · Setup wizards · Publishing and installing · Related <sub>(10 sub-sections)</sub>

**CLI:** `openclaw channels add`, `openclaw doctor`, `openclaw onboard`, `openclaw plugins install`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-setup](https://docs.openclaw.ai/plugins/sdk-setup)</sub>

---

### `/plugins/sdk-testing` — Plugin testing

**Plugin testing** · *Reference › Plugin SDK reference*

> Testing utilities and patterns for OpenClaw plugins

<sub>source `docs/plugins/sdk-testing.md` · 428 lines · 1890 words · 12 code blocks</sub>

**Read when:** You are writing tests for a plugin · You need test utilities from the plugin SDK · You want to understand contract tests for bundled plugins

**Covers:** Test utilities · Testing target resolution · Testing patterns · Contract tests (in-repo plugins) · Lint enforcement (in-repo plugins) · Test configuration · Related <sub>(9 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-testing](https://docs.openclaw.ai/plugins/sdk-testing)</sub>

---

### `/plugins/architecture` — Plugin internals

**Plugin internals** · *Reference › Plugin internals*

> Plugin internals: capability model, ownership, contracts, load pipeline, and runtime helpers

<sub>source `docs/plugins/architecture.md` · 899 lines · 8946 words · 1 code blocks</sub>

**Read when:** Building or debugging native OpenClaw plugins · Understanding the plugin capability model or ownership boundaries · Working on the plugin load pipeline or registry · Implementing provider runtime hooks or channel plugins

**Covers:** Public capability model · Architecture overview · Capability ownership model · Contracts and enforcement · Skill previews · Execution model · Export boundary · Internals and reference · Related <sub>(11 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw plugins doctor`, `openclaw plugins inspect`, `openclaw plugins reload`, `openclaw status`

**Config:** `plugins.allow`, `plugins.changed`, `plugins.load.paths`, `plugins.reload`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture](https://docs.openclaw.ai/plugins/architecture)</sub>

---

### `/plugins/architecture-internals` — Plugin architecture internals

**Plugin architecture internals** · *Reference › Plugin internals*

> Plugin architecture internals: load pipeline, registry, runtime hooks, HTTP routes, and reference tables

<sub>source `docs/plugins/architecture-internals.md` · 100 lines · 503 words</sub>

**Read when:** Implementing provider runtime hooks, channel lifecycle, or package packs · Debugging plugin load order or registry state · Adding a new plugin capability or context engine plugin

**Covers:** What each page covers · Where each section moved · Related <sub>(8 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals](https://docs.openclaw.ai/plugins/architecture-internals)</sub>

---

### `/plugins/architecture-internals/load-pipeline` — Plugin load pipeline and registry

**Plugin load pipeline and registry** · *Reference › Plugin architecture internals*

> How OpenClaw discovers, gates, loads, and registers plugins, and what the plugin cache holds

<sub>source `docs/plugins/architecture-internals/load-pipeline.md` · 287 lines · 2254 words</sub>

**Read when:** Debugging plugin load order or registry state · You need to know when OpenClaw reads manifests instead of loading plugin runtime · You are reasoning about plugin cache generations and what they retain

**Covers:** Load pipeline · Registry model <sub>(2 sub-sections)</sub>

**Config:** `plugins.enabled`, `plugins.refresh`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/load-pipeline](https://docs.openclaw.ai/plugins/architecture-internals/load-pipeline)</sub>

---

### `/plugins/architecture-internals/provider-hooks` — Provider runtime hooks and catalogs

**Provider runtime hooks and catalogs** · *Reference › Plugin architecture internals*

> The provider hook order table, worked provider example, bundled hook shapes, and model catalog registration

<sub>source `docs/plugins/architecture-internals/provider-hooks.md` · 294 lines · 2194 words · 1 code blocks</sub>

**Read when:** Implementing provider runtime hooks · You need the hook order and the decision guide for a model provider plugin · You are publishing model catalog rows from a plugin

**Covers:** Provider runtime hooks · Provider catalogs <sub>(3 sub-sections)</sub>

**Config:** `models.json`, `models.providers`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/provider-hooks](https://docs.openclaw.ai/plugins/architecture-internals/provider-hooks)</sub>

---

### `/plugins/architecture-internals/runtime-helpers` — Core runtime helpers

**Core runtime helpers** · *Reference › Plugin architecture internals*

> Calling core speech, media understanding, subagent, web search, and image generation helpers from a plugin

<sub>source `docs/plugins/architecture-internals/runtime-helpers.md` · 216 lines · 619 words · 8 code blocks</sub>

**Read when:** You are calling core TTS, media understanding, subagent, or web search helpers from a plugin · You are registering a speech, media understanding, or web search provider · You need the ownership split between core orchestration and vendor behavior

**Covers:** Runtime helpers <sub>(1 sub-sections)</sub>

**Config:** `tools.media.audio`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/runtime-helpers](https://docs.openclaw.ai/plugins/architecture-internals/runtime-helpers)</sub>

---

### `/plugins/architecture-internals/gateway-routes` — Gateway routes

**Gateway routes** · *Reference › Plugin architecture internals*

> Registering plugin HTTP routes on the Gateway, and their auth, scope, and lifecycle rules

<sub>source `docs/plugins/architecture-internals/gateway-routes.md` · 55 lines · 945 words · 1 code blocks</sub>

**Read when:** You are exposing an HTTP endpoint or webhook from a plugin · You need the auth and runtime scope rules for plugin routes · You are registering or replacing routes from channel lifecycle code

**Covers:** Gateway HTTP routes

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/gateway-routes](https://docs.openclaw.ai/plugins/architecture-internals/gateway-routes)</sub>

---

### `/plugins/architecture-internals/channel-surfaces` — Channel surfaces

**Channel surfaces** · *Reference › Plugin architecture internals*

> Conversation binding callbacks, message tool schemas, target resolution, config-backed directories, and read-only inspection

<sub>source `docs/plugins/architecture-internals/channel-surfaces.md` · 154 lines · 725 words · 1 code blocks</sub>

**Read when:** Implementing channel lifecycle surfaces · You are resolving channel targets or building config-backed directories · You are adding read-only channel inspection for status and doctor paths

**Covers:** Conversation binding callbacks · Message tool schemas · Channel target resolution · Config-backed directories · Read-only channel inspection

**CLI:** `openclaw channels resolve`, `openclaw channels status`, `openclaw status`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/channel-surfaces](https://docs.openclaw.ai/plugins/architecture-internals/channel-surfaces)</sub>

---

### `/plugins/architecture-internals/packaging` — Package packs and import paths

**Package packs and import paths** · *Reference › Plugin architecture internals*

> Plugin SDK import subpaths, multi-extension package packs, and channel catalog and install metadata

<sub>source `docs/plugins/architecture-internals/packaging.md` · 217 lines · 1235 words · 2 code blocks</sub>

**Read when:** Implementing package packs · You are choosing plugin SDK import subpaths for a new plugin · You are publishing channel catalog or install metadata

**Covers:** Plugin SDK import paths · Package packs <sub>(1 sub-sections)</sub>

**CLI:** `openclaw plugins install`

**Config:** `plugins.installedIndex`, `plugins.load.paths`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/packaging](https://docs.openclaw.ai/plugins/architecture-internals/packaging)</sub>

---

### `/plugins/architecture-internals/context-engines` — Context engines

**Context engines** · *Reference › Plugin architecture internals*

> Registering a context engine plugin that owns session ingest, assembly, and compaction

<sub>source `docs/plugins/architecture-internals/context-engines.md` · 104 lines · 235 words · 2 code blocks</sub>

**Read when:** Adding a context engine plugin · You are replacing or extending the default context pipeline · You need to delegate compaction back to the runtime

**Covers:** Context engine plugins

**Config:** `plugins.slots.contextEngine`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/context-engines](https://docs.openclaw.ai/plugins/architecture-internals/context-engines)</sub>

---

### `/plugins/architecture-internals/new-capability` — Adding a new capability

**Adding a new capability** · *Reference › Plugin architecture internals*

> The sequence, file checklist, and contract-test pattern for adding a capability to the plugin system

<sub>source `docs/plugins/architecture-internals/new-capability.md` · 93 lines · 322 words · 2 code blocks</sub>

**Read when:** Adding a new plugin capability · You are deciding what core should own versus a vendor plugin · You need the file checklist and contract-test pattern for a new capability

**Covers:** Adding a new capability <sub>(2 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/architecture-internals/new-capability](https://docs.openclaw.ai/plugins/architecture-internals/new-capability)</sub>

---

### `/plugins/sdk-migration` — Plugin SDK migration

**Plugin SDK migration** · *Reference › Plugin internals*

> Migrate from the legacy backwards-compatibility layer to the modern plugin SDK

<sub>source `docs/plugins/sdk-migration.md` · 196 lines · 1118 words</sub>

**Read when:** You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25 · You are updating a plugin to the modern plugin architecture · You maintain an external OpenClaw plugin

**Covers:** What changed · Where each topic lives · Related <sub>(7 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration](https://docs.openclaw.ai/plugins/sdk-migration)</sub>

---

### `/plugins/sdk-migration/how-to-migrate` — How to migrate a plugin

**How to migrate a plugin** · *Reference › Plugin SDK migration*

> Ordered steps for moving a plugin off the removed SDK compatibility layer

<sub>source `docs/plugins/sdk-migration/how-to-migrate.md` · 537 lines · 2864 words · 9 code blocks</sub>

**Read when:** You are migrating a plugin to the modern plugin SDK right now · You need the ordered steps for config, middleware, approval, and import changes

**Covers:** Workspace mutation guards · Await session transcript persistence · Managed node workspace acquisition · Migrate durable ingress files through Doctor · How to migrate <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration/how-to-migrate](https://docs.openclaw.ai/plugins/sdk-migration/how-to-migrate)</sub>

---

### `/plugins/sdk-migration/import-paths` — Import path reference

**Import path reference** · *Reference › Plugin SDK migration*

> Which typed-public SDK subpath replaces each legacy import, including the removed channel facades

<sub>source `docs/plugins/sdk-migration/import-paths.md` · 115 lines · 732 words</sub>

**Read when:** You are replacing a broad SDK barrel import with a focused subpath · You need the removed channel facade to channel-outbound mappings

**Covers:** Import path reference <sub>(2 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration/import-paths](https://docs.openclaw.ai/plugins/sdk-migration/import-paths)</sub>

---

### `/plugins/sdk-migration/removed-surfaces` — Removed surfaces and replacements

**Removed surfaces and replacements** · *Reference › Plugin SDK migration*

> Removed SDK surfaces and the replacement for each removed or deprecated API

<sub>source `docs/plugins/sdk-migration/removed-surfaces.md` · 434 lines · 2010 words · 5 code blocks</sub>

**Read when:** A removed export, hook, or manifest field is breaking your plugin · You need the replacement for a specific legacy API

**Covers:** Removed compatibility surfaces · Migration reference <sub>(6 sub-sections)</sub>

**CLI:** `openclaw plugins inspect`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration/removed-surfaces](https://docs.openclaw.ai/plugins/sdk-migration/removed-surfaces)</sub>

---

### `/plugins/sdk-migration/talk` — Talk and realtime voice migration

**Talk and realtime voice migration** · *Reference › Plugin SDK migration*

> Migrating realtime voice, telephony, and meeting code to the unified Talk session API

<sub>source `docs/plugins/sdk-migration/talk.md` · 125 lines · 721 words · 1 code blocks</sub>

**Read when:** You maintain a realtime voice, telephony, or meeting plugin · You are moving off the removed talk.realtime.*, talk.transcription.*, or talk.handoff.* methods

**Covers:** Talk and realtime voice migration

**CLI:** `openclaw doctor`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration/talk](https://docs.openclaw.ai/plugins/sdk-migration/talk)</sub>

---

### `/plugins/sdk-migration/compatibility-policy` — Compatibility policy and records

**Compatibility policy and records** · *Reference › Plugin SDK migration*

> The external-plugin compatibility policy and the dated per-surface compatibility records

<sub>source `docs/plugins/sdk-migration/compatibility-policy.md` · 524 lines · 3786 words · 1 code blocks</sub>

**Read when:** You need to know whether a compatibility surface is still supported · You are checking the removal condition for a specific retained contract

**Covers:** Compatibility policy <sub>(15 sub-sections)</sub>

**CLI:** `openclaw channel plugin`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration/compatibility-policy](https://docs.openclaw.ai/plugins/sdk-migration/compatibility-policy)</sub>

---

### `/plugins/sdk-migration/removal-timeline` — Removal timeline

**Removal timeline** · *Reference › Plugin SDK migration*

> When deprecated plugin SDK surfaces become eligible for removal

<sub>source `docs/plugins/sdk-migration/removal-timeline.md` · 70 lines · 629 words</sub>

**Read when:** You need the removal date or gate for an SDK subpath you import · You are planning migration work around a compatibility window

**Covers:** Removal timeline

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-migration/removal-timeline](https://docs.openclaw.ai/plugins/sdk-migration/removal-timeline)</sub>

---

### `/plugins/compatibility` — Plugin compatibility

**Plugin compatibility** · *Reference › Plugin internals*

> Plugin compatibility contracts, deprecation metadata, and migration expectations

<sub>source `docs/plugins/compatibility.md` · 271 lines · 1725 words · 2 code blocks</sub>

**Read when:** You maintain an OpenClaw plugin · You see a plugin compatibility warning · You are planning a plugin SDK or manifest migration

**Covers:** Compatibility registry · Deprecation policy · Current compatibility areas · Plugin inspector package · Release notes · Related <sub>(7 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/compatibility](https://docs.openclaw.ai/plugins/compatibility)</sub>

---

### `/plugins/install-overrides` — Plugin install overrides

**Plugin install overrides** · *Reference › Plugin internals*

> Test packaged plugin overrides with setup-time install flows

<sub>source `docs/plugins/install-overrides.md` · 73 lines · 308 words · 3 code blocks</sub>

**Read when:** Testing onboarding or setup flows against a locally packed plugin · Verifying a plugin package before publishing it · Replacing an automatic plugin install with a test artifact

**Covers:** Environment · Behavior · Package E2E

**CLI:** `openclaw onboard`, `openclaw plugins install`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/install-overrides](https://docs.openclaw.ai/plugins/install-overrides)</sub>

---

### `/plugins/sdk-channel-outbound` — Channel outbound API

**Channel outbound API** · *Reference › Plugin internals*

> Outbound message lifecycle API for channel plugins: adapters, receipts, durable sends, live preview, and reply pipeline helpers

<sub>source `docs/plugins/sdk-channel-outbound.md` · 480 lines · 3313 words · 3 code blocks</sub>

**Read when:** You are building or refactoring a messaging channel plugin send path · You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy · You are migrating from channel-message or legacy reply dispatch helpers

**Covers:** Durable ingress monitors · Adapter · Progress and preview delivery ownership · Outbound echo suppression · Plain-text sanitization · Delivery Evidence · Existing outbound adapters · Durable sends · Deferred delivery admission · Compatibility dispatch · Related <sub>(5 sub-sections)</sub>

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-outbound](https://docs.openclaw.ai/plugins/sdk-channel-outbound)</sub>

---

### `/plugins/sdk-channel-inbound` — Channel inbound API

**Channel inbound API** · *Reference › Plugin internals*

> Inbound event helpers for channel plugins: context building, shared runner orchestration, session record, and prepared reply dispatch

<sub>source `docs/plugins/sdk-channel-inbound.md` · 360 lines · 2310 words · 5 code blocks</sub>

**Read when:** You are building or refactoring a messaging channel plugin receive path · You need shared inbound context construction, session recording, or prepared reply dispatch · You are migrating old channel turn helpers to inbound/message APIs

**Covers:** Core helpers · Platform-selected history windows · Agent group dispatch · Internal turn sources · Receive acknowledgment policy · Delivery settlement contract · Migration · Related

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-inbound](https://docs.openclaw.ai/plugins/sdk-channel-inbound)</sub>

---

### `/plugins/sdk-channel-ingress` — Channel ingress API

**Channel ingress API** · *Reference › Plugin internals*

> Experimental channel ingress API for inbound message authorization

<sub>source `docs/plugins/sdk-channel-ingress.md` · 319 lines · 1920 words · 3 code blocks</sub>

**Read when:** Building or migrating a messaging channel plugin · Changing DM or group allowlists, route gates, command auth, event auth, or mention activation · Reviewing channel ingress redaction or SDK compatibility boundaries

**Covers:** Runtime resolver · Result · Identifier authentication · Access groups · Event modes · Routes and activation · Redaction · Verification · Related <sub>(2 sub-sections)</sub>

**Config:** `channels.defaults.implicitMentions`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/sdk-channel-ingress](https://docs.openclaw.ai/plugins/sdk-channel-ingress)</sub>

---

### `/plugins/message-presentation` — Message presentation

**Message presentation** · *Reference › Plugin internals*

> Semantic message cards, charts, tables, controls, fallback text, and delivery hints for channel plugins

<sub>source `docs/plugins/message-presentation.md` · 784 lines · 2813 words · 16 code blocks</sub>

**Read when:** Adding or modifying message card, chart, table, button, or select rendering · Building a channel plugin that supports rich outbound messages · Changing message tool presentation or delivery capabilities · Debugging provider-specific card/block/component rendering regressions

**Covers:** Contract · Producer examples · Renderer contract · Core render flow · Degradation rules · Provider mapping · Presentation vs InteractiveReply · Delivery pin · Plugin author checklist · Related docs <sub>(1 sub-sections)</sub>

**CLI:** `openclaw message send`

**TermCrab — plugins: ABSENT.** No plugin API, no dynamic extension loading. `packages/plugin-sdk/index.ts` is a stub. OpenClaw ships 164 extensions.

<sub>live: [docs.openclaw.ai/plugins/message-presentation](https://docs.openclaw.ai/plugins/message-presentation)</sub>

---

### `/reference/AGENTS.default` — Default AGENTS.md

**Default AGENTS.md** · *Reference › Templates*

> Default OpenClaw agent instructions and skills roster for the personal assistant setup

<sub>source `docs/reference/AGENTS.default.md` · 135 lines · 919 words · 5 code blocks</sub>

**Read when:** Starting a new OpenClaw agent session · Enabling or auditing default skills

**Covers:** First run (recommended) · Care defaults · Existing solutions preflight · Session start (required) · Soul (required) · Shared spaces (recommended) · Memory system (recommended) · Tools · Backup tip (recommended) · What OpenClaw does · Core skills (enable in Settings → Skills) · Usage notes · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw browser`

**Config:** `agents.defaults.workspace`, `memory.md`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/AGENTS.default](https://docs.openclaw.ai/reference/AGENTS.default)</sub>

---

### `/reference/templates/AGENTS` — AGENTS.md template

**AGENTS.md template** · *Reference › Templates*

> Workspace template for AGENTS.md

<sub>source `docs/reference/templates/AGENTS.md` · 127 lines · 930 words</sub>

**Read when:** Bootstrapping a workspace manually

**Covers:** First Run · Session Startup · Memory · Red Lines · Existing Solutions Preflight · External vs Internal · Group Chats · Tools · Automations - Be Proactive · Make It Yours · Related <sub>(7 sub-sections)</sub>

**CLI:** `openclaw automations list`, `openclaw automations scratch`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/AGENTS](https://docs.openclaw.ai/reference/templates/AGENTS)</sub>

---

### `/reference/templates/BOOT` — BOOT.md template

**BOOT.md template** · *Reference › Templates*

> Workspace template for BOOT.md

<sub>source `docs/reference/templates/BOOT.md` · 19 lines · 91 words · 1 code blocks</sub>

**Read when:** Adding a BOOT.md checklist

**Covers:** Related

**CLI:** `openclaw hooks enable`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/BOOT](https://docs.openclaw.ai/reference/templates/BOOT)</sub>

---

### `/reference/templates/BOOTSTRAP` — BOOTSTRAP.md template

**BOOTSTRAP.md template** · *Reference › Templates*

> First-run ritual for new agents

<sub>source `docs/reference/templates/BOOTSTRAP.md` · 166 lines · 1115 words · 5 code blocks</sub>

**Read when:** Bootstrapping a workspace manually

**Covers:** 1. Ask What to Call You · 2. Choose Your Vibe · 3. Choose Your Avatar · 4. Finish With Recommendations · Done · Related <sub>(1 sub-sections)</sub>

**CLI:** `openclaw agents set-identity`, `openclaw onboard recommendations`, `openclaw plugins install`, `openclaw skills install`, `openclaw skills verify`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/BOOTSTRAP](https://docs.openclaw.ai/reference/templates/BOOTSTRAP)</sub>

---

### `/reference/templates/IDENTITY` — IDENTITY template

**IDENTITY template** · *Reference › Templates*

> Agent identity record

<sub>source `docs/reference/templates/IDENTITY.md` · 33 lines · 216 words</sub>

**Read when:** Bootstrapping a workspace manually

**Covers:** Related

**CLI:** `openclaw agents set-identity`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/IDENTITY](https://docs.openclaw.ai/reference/templates/IDENTITY)</sub>

---

### `/reference/templates/SOUL` — SOUL.md template

**SOUL.md template** · *Reference › Templates*

> Workspace template for SOUL.md

<sub>source `docs/reference/templates/SOUL.md` · 46 lines · 239 words</sub>

**Read when:** Bootstrapping a workspace manually

**Covers:** Core Truths · Boundaries · Vibe · Continuity · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/SOUL](https://docs.openclaw.ai/reference/templates/SOUL)</sub>

---

### `/reference/templates/USER` — USER template

**USER template** · *Reference › Templates*

> Durable user preference and profile directives

<sub>source `docs/reference/templates/USER.md` · 32 lines · 142 words · 1 code blocks</sub>

**Read when:** Bootstrapping a workspace manually

**Covers:** Directives · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/USER](https://docs.openclaw.ai/reference/templates/USER)</sub>

---

### `/reference/templates/AGENTS.dev` — AGENTS.dev template

**AGENTS.dev template** · *Reference › Dev agent templates*

> Dev agent AGENTS.md (C-3PO)

<sub>source `docs/reference/templates/AGENTS.dev.md` · 107 lines · 611 words · 2 code blocks</sub>

**Read when:** Using the dev gateway templates · Updating the default dev agent identity

**Covers:** Your identity is pre-seeded · Backup tip (recommended) · Care defaults · Existing solutions preflight · Daily memory (recommended) · Automations (optional) · Tools · Customize · C-3PO Origin Memory · Related <sub>(2 sub-sections)</sub>

**CLI:** `openclaw gateway`, `openclaw onboard`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/AGENTS.dev](https://docs.openclaw.ai/reference/templates/AGENTS.dev)</sub>

---

### `/reference/templates/IDENTITY.dev` — IDENTITY.dev template

**IDENTITY.dev template** · *Reference › Dev agent templates*

> Dev agent identity (C-3PO)

<sub>source `docs/reference/templates/IDENTITY.dev.md` · 50 lines · 243 words</sub>

**Read when:** Using the dev gateway templates · Updating the default dev agent identity

**Covers:** Role · Soul · Relationship with Clawd · Quirks · Catchphrase · Related

**CLI:** `openclaw gateway`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/IDENTITY.dev](https://docs.openclaw.ai/reference/templates/IDENTITY.dev)</sub>

---

### `/reference/templates/SOUL.dev` — SOUL.dev template

**SOUL.dev template** · *Reference › Dev agent templates*

> Dev agent soul (C-3PO)

<sub>source `docs/reference/templates/SOUL.dev.md` · 66 lines · 597 words</sub>

**Read when:** Using the dev gateway templates · Updating the default dev agent identity

**Covers:** Who I Am · My Purpose · How I Operate · My Quirks · My Relationship with Clawd · What I will not do · The Golden Rule · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/SOUL.dev](https://docs.openclaw.ai/reference/templates/SOUL.dev)</sub>

---

### `/reference/templates/USER.dev` — USER.dev template

**USER.dev template** · *Reference › Dev agent templates*

> Dev agent user profile (C-3PO)

<sub>source `docs/reference/templates/USER.dev.md` · 23 lines · 111 words</sub>

**Read when:** Using the dev gateway templates · Updating the default dev agent identity

**Covers:** Related

**CLI:** `openclaw gateway`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/USER.dev](https://docs.openclaw.ai/reference/templates/USER.dev)</sub>

---

### `/reference/templates/HEARTBEAT` — Retired HEARTBEAT.md workspace file

**Retired HEARTBEAT.md workspace file** · *Reference › Retired workspace files*

> Migration guide for the retired HEARTBEAT.md workspace file

<sub>source `docs/reference/templates/HEARTBEAT.md` · 24 lines · 94 words · 1 code blocks</sub>

**Read when:** Migrating an older workspace that still has HEARTBEAT.md

**Covers:** Related

**CLI:** `openclaw automations list`, `openclaw automations scratch`, `openclaw doctor`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/HEARTBEAT](https://docs.openclaw.ai/reference/templates/HEARTBEAT)</sub>

---

### `/reference/templates/TOOLS` — TOOLS.md retired

**TOOLS.md retired** · *Reference › Retired workspace files*

> Retired TOOLS.md workspace template

<sub>source `docs/reference/templates/TOOLS.md` · 10 lines · 51 words</sub>

**Read when:** Bootstrapping a workspace manually

**CLI:** `openclaw doctor`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/templates/TOOLS](https://docs.openclaw.ai/reference/templates/TOOLS)</sub>

---

### `/agent-runtime-architecture` — Agent runtime architecture

**Agent runtime architecture** · *Reference › Technical reference*

> How OpenClaw structures the built-in agent runtime: code layout, boundaries, resource manifests, and runtime selection.

<sub>source `docs/agent-runtime-architecture.md` · 97 lines · 869 words · 1 code blocks</sub>

**Covers:** Runtime Layout · Boundaries · Manifests · Runtime Selection · Model Runtime Generations · Compute workers · Related

<sub>live: [docs.openclaw.ai/agent-runtime-architecture](https://docs.openclaw.ai/agent-runtime-architecture)</sub>

---

### `/openclaw-agent-runtime` — OpenClaw agent runtime workflow

**OpenClaw agent runtime workflow** · *Reference › Technical reference*

> Developer workflow for OpenClaw agent runtime: build, test, and live validation

<sub>source `docs/openclaw-agent-runtime.md` · 71 lines · 347 words · 2 code blocks</sub>

**Read when:** Working on OpenClaw agent runtime code or tests · Running agent-runtime lint, typecheck, and live test flows

**Covers:** Type checking and linting · Running Agent Runtime Tests · Manual testing · Clean slate reset · Related

**CLI:** `openclaw agent`, `openclaw doctor`, `openclaw sessions cleanup`

<sub>live: [docs.openclaw.ai/openclaw-agent-runtime](https://docs.openclaw.ai/openclaw-agent-runtime)</sub>

---

### `/reference/openclaw-ai` — @openclaw/ai package

**@openclaw/ai package** · *Reference › Technical reference*

> The @openclaw/ai npm package: reusable model transports, isolated runtimes, and host policy ports

<sub>source `docs/reference/openclaw-ai.md` · 72 lines · 343 words · 1 code blocks</sub>

**Read when:** You want to reuse OpenClaw's model transports in another application · You are changing packages/ai or the AI transport host ports · You are reviewing what the openclaw release publishes to npm besides the root package

**Covers:** Quick start · Design contract · Subpath exports

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/openclaw-ai](https://docs.openclaw.ai/reference/openclaw-ai)</sub>

---

### `/reference/token-use` — Token use and costs

**Token use and costs** · *Reference › Technical reference*

> How OpenClaw builds prompt context and reports token usage + costs

<sub>source `docs/reference/token-use.md` · 342 lines · 2075 words · 4 code blocks</sub>

**Read when:** Explaining token usage, costs, or context windows · Debugging context growth or compaction behavior

**Covers:** How the system prompt is built · What counts in the context window · How to see current token usage · Cost estimation (when shown) · Cache TTL and pruning impact · Tips for reducing token pressure · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw channels list`, `openclaw doctor`, `openclaw status`

**Config:** `agents.defaults.bootstrapMaxChars`, `agents.defaults.bootstrapTotalMaxChars`, `agents.defaults.compaction.postCompactionSections`, `agents.defaults.contextLimits`, `agents.defaults.imageMaxDimensionPx`, `agents.defaults.startupContext`, `agents.entries.*.contextLimits`, `agents.entries.*.params`

**TermCrab — ops: ABSENT.** No token/cost accounting; `ChatResult` carries no usage field into the UI.

<sub>live: [docs.openclaw.ai/reference/token-use](https://docs.openclaw.ai/reference/token-use)</sub>

---

### `/reference/api-usage-costs` — API usage and costs

**API usage and costs** · *Reference › Technical reference*

> Audit what can spend money, which keys are used, and how to view usage

<sub>source `docs/reference/api-usage-costs.md` · 140 lines · 1225 words</sub>

**Read when:** You want to understand which features may call paid APIs · You need to audit keys, costs, and usage visibility · You're explaining /status or /usage cost reporting

**Covers:** Where costs show up · How keys are discovered · Features that can spend keys · Related <sub>(11 sub-sections)</sub>

**CLI:** `openclaw channels list`, `openclaw models scan`, `openclaw models status`, `openclaw status`

**Config:** `agents.defaults.mediaModels`, `memory.search.*`, `memory.search.fallback`, `memory.search.provider`, `models.providers.*.apiKey`, `plugins.entries.*.config.webSearch.apiKey`, `plugins.entries.firecrawl.config.webFetch.apiKey`, `plugins.entries.web-readability.enabled`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/api-usage-costs](https://docs.openclaw.ai/reference/api-usage-costs)</sub>

---

### `/concepts/usage-tracking` — Usage tracking

**Usage tracking** · *Reference › Technical reference*

> Usage tracking surfaces and credential requirements

<sub>source `docs/concepts/usage-tracking.md` · 407 lines · 2568 words · 5 code blocks</sub>

**Read when:** You are wiring provider usage/quota surfaces · You need to explain usage tracking behavior or auth requirements

**Covers:** What it is · Where it shows up · Usage date ranges · Anthropic and OpenAI cost history · Default usage footer mode · Custom /usage full footer · Providers + credentials · Related <sub>(10 sub-sections)</sub>

**CLI:** `openclaw channels list`, `openclaw gateway usage-cost`, `openclaw models list`, `openclaw models status`, `openclaw status`

**Config:** `models.providers.minimax-portal.baseUrl`, `models.providers.minimax.baseUrl`, `session.id`

<sub>live: [docs.openclaw.ai/concepts/usage-tracking](https://docs.openclaw.ai/concepts/usage-tracking)</sub>

---

### `/reference/prompt-caching` — Prompt caching

**Prompt caching** · *Reference › Technical reference*

> Prompt caching knobs, merge order, provider behavior, and tuning patterns

<sub>source `docs/reference/prompt-caching.md` · 407 lines · 4180 words · 7 code blocks</sub>

**Read when:** You want to reduce prompt token costs with cache retention · You need per-agent cache behavior in multi-agent setups · You are tuning heartbeat and cache-ttl pruning together

**Covers:** Keep model settings stable · Primary knobs · Provider behavior · Chat Completions cache markers · System-prompt cache boundary · OpenClaw cache-stability guards · Tuning patterns · Live regression tests · diagnostics.cacheTrace config · Quick troubleshooting · Related <sub>(19 sub-sections)</sub>

**CLI:** `openclaw agent`

**Config:** `agents.defaults.heartbeat`, `agents.defaults.params`, `agents.entries.*.heartbeat`, `agents.entries.*.params`, `diagnostics.cacheTrace`, `diagnostics.cacheTrace.enabled`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/prompt-caching](https://docs.openclaw.ai/reference/prompt-caching)</sub>

---

### `/reference/session-management-compaction` — Session management deep dive

**Session management deep dive** · *Reference › Technical reference*

> Deep dive: session store + transcripts, lifecycle, and (auto)compaction internals

<sub>source `docs/reference/session-management-compaction.md` · 58 lines · 439 words</sub>

**Read when:** You need to debug session ids, transcript events, or session row fields · You are changing auto-compaction behavior or adding "pre-compaction" housekeeping · You want to implement memory flushes or silent system turns

**Covers:** Where each section moved · Troubleshooting checklist · Related

**CLI:** `openclaw status`

**Config:** `agents.defaults.compaction.memoryFlush`, `session.maintenance`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/reference/session-management-compaction](https://docs.openclaw.ai/reference/session-management-compaction)</sub>

---

### `/reference/session-management-compaction/store` — Session state on disk

**Session state on disk** · *Reference › Session management deep dive*

> Where the Gateway keeps session rows and transcripts, and the on-disk paths per agent

<sub>source `docs/reference/session-management-compaction/store.md` · 62 lines · 623 words</sub>

**Read when:** Debugging which store or transcript file a Gateway is actually using · Locating an agent session database or legacy artifacts on the Gateway host

**Covers:** Two persistence layers · On-disk locations

**CLI:** `openclaw doctor`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/reference/session-management-compaction/store](https://docs.openclaw.ai/reference/session-management-compaction/store)</sub>

---

### `/reference/session-management-compaction/maintenance` — Store maintenance and retention

**Store maintenance and retention** · *Reference › Session management deep dive*

> The session.maintenance keys, disk-budget cleanup tiers, cron run retention, and the SQLite downgrade path

<sub>source `docs/reference/session-management-compaction/maintenance.md` · 224 lines · 2477 words · 3 code blocks</sub>

**Read when:** Tuning the per-agent session disk budget or retention cutoffs · Running openclaw sessions cleanup, or downgrading after the SQLite flip

**Covers:** Store maintenance and disk controls · Cron sessions and run logs <sub>(2 sub-sections)</sub>

**CLI:** `openclaw agents delete`, `openclaw doctor`, `openclaw sessions cleanup`, `openclaw update cleanup`

**Config:** `cron.sessionRetention`, `session.maintenance`, `session.maintenance.mode`, `session.maintenance.rotateBytes`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/reference/session-management-compaction/maintenance](https://docs.openclaw.ai/reference/session-management-compaction/maintenance)</sub>

---

### `/reference/session-management-compaction/schema` — Session keys, ids, and transcript events

**Session keys, ids, and transcript events** · *Reference › Session management deep dive*

> sessionKey patterns, sessionId lifecycle, SessionEntry fields, and the transcript event stream

<sub>source `docs/reference/session-management-compaction/schema.md` · 103 lines · 1919 words</sub>

**Read when:** You need to debug session ids, transcript events, or session row fields · Reading or writing SessionEntry fields, forks, or transcript entry types

**Covers:** Session keys (sessionKey) · Session ids (sessionId) · Session store schema · Transcript event structure

**CLI:** `openclaw doctor`

**Config:** `session.idleMinutes`, `session.parentForkMaxTokens`, `session.reset.atHour`, `session.reset.idleMinutes`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/reference/session-management-compaction/schema](https://docs.openclaw.ai/reference/session-management-compaction/schema)</sub>

---

### `/reference/session-management-compaction/compaction` — Compaction behavior and settings

**Compaction behavior and settings** · *Reference › Session management deep dive*

> What compaction does, when auto-compaction runs, its settings, pluggable providers, and where it surfaces

<sub>source `docs/reference/session-management-compaction/compaction.md` · 112 lines · 1803 words · 1 code blocks</sub>

**Read when:** You are changing auto-compaction behavior or adding "pre-compaction" housekeeping · Tuning compaction thresholds, reserves, or a compaction provider plugin

**Covers:** Context windows vs tracked tokens · Compaction: what it is · When auto-compaction happens · Compaction settings · Pluggable compaction providers · User-visible surfaces <sub>(1 sub-sections)</sub>

**CLI:** `openclaw logs`, `openclaw sessions`, `openclaw status`

**Config:** `agents.defaults.compaction.keepRecentTokens`, `agents.defaults.compaction.maxActiveTranscriptBytes`, `agents.defaults.compaction.postCompactionSections`, `agents.defaults.compaction.provider`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/reference/session-management-compaction/compaction](https://docs.openclaw.ai/reference/session-management-compaction/compaction)</sub>

---

### `/reference/session-management-compaction/housekeeping` — Silent turns and the memory flush

**Silent turns and the memory flush** · *Reference › Session management deep dive*

> The NOREPLY silent-turn contract and the pre-compaction memory flush configuration

<sub>source `docs/reference/session-management-compaction/housekeeping.md` · 54 lines · 576 words</sub>

**Read when:** You want to implement memory flushes or silent system turns · Tuning agents.defaults.compaction.memoryFlush

**Covers:** Silent housekeeping (NOREPLY) · Pre-compaction memory flush

**Config:** `agents.defaults.compaction.memoryFlush`

**TermCrab — context: BROKEN.** Compaction is lossy truncation and rewrites the transcript in place (`src/agent/sessions.ts:154,187`) — the opposite of OpenClaw's "history stays on disk".

<sub>live: [docs.openclaw.ai/reference/session-management-compaction/housekeeping](https://docs.openclaw.ai/reference/session-management-compaction/housekeeping)</sub>

---

### `/reference/transcript-hygiene` — Transcript hygiene

**Transcript hygiene** · *Reference › Technical reference*

> Reference: provider-specific transcript sanitization and repair rules

<sub>source `docs/reference/transcript-hygiene.md` · 320 lines · 1849 words</sub>

**Read when:** You are debugging provider request rejections tied to transcript shape · You are changing transcript sanitization or tool-call repair logic · You are investigating tool-call id mismatches across providers

**Covers:** Failed attempts and recovery · Global rule: runtime context is not user transcript · Where this runs · Global rule: image sanitization · Global rule: malformed tool calls · Global rule: tool result pairing · Global rule: incomplete or silent reasoning-only turns · Global rule: inter-session input provenance · Provider matrix (current behavior) · Historical behavior (pre-2026.1.22) · Related

**CLI:** `openclaw doctor`

**Config:** `agents.defaults.imageMaxDimensionPx`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/transcript-hygiene](https://docs.openclaw.ai/reference/transcript-hygiene)</sub>

---

### `/reference/memory-config` — Memory configuration reference

**Memory configuration reference** · *Reference › Technical reference*

> Built-in memory search, admission exclusions, and dreaming configuration

<sub>source `docs/reference/memory-config.md` · 787 lines · 4184 words · 13 code blocks</sub>

**Read when:** You want to configure memory search providers or embedding models · You want to understand hybrid search, MMR, or temporal-decay defaults · You want to enable multimodal memory indexing · You need to exclude specific session sources from automatic dreaming ingestion · You see a memory file-watching pressure warning

**Covers:** Remember across conversations · Provider selection · Remote endpoint config · Provider-specific config · Indexing behavior · Hybrid search config · Additional memory paths · Multimodal memory (Gemini) · Embedding cache · Batch indexing · Session memory search · SQLite vector acceleration (sqlite-vec) · Index storage · Citations · _+3 more_ <sub>(6 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw hooks disable`, `openclaw memory forget`, `openclaw memory index`, `openclaw memory status`, `openclaw models auth`

**Config:** `agents.entries.*.memory.search`, `memory.citations`, `memory.search`, `memory.search.extraPaths`, `memory.search.provider`, `memory.search.query`, `memory.search.rememberAcrossConversations`, `memory.search.remote.baseUrl`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/memory-config](https://docs.openclaw.ai/reference/memory-config)</sub>

---

### `/reference/database-schemas` — Database schemas

**Database schemas** · *Reference › Technical reference*

> OpenClaw SQLite database locations, schema versions, integrity checks, and downgrade recovery

<sub>source `docs/reference/database-schemas.md` · 99 lines · 756 words</sub>

**Read when:** Diagnosing a newer database schema error · Checking database compatibility before an update or downgrade · Proposing a SQLite or persistent-store change · Preparing storage operations for another database backend · Recovering a database for an older OpenClaw release

**Covers:** Related · Where each section moved

**CLI:** `openclaw database preflight`, `openclaw doctor`, `openclaw update`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas](https://docs.openclaw.ai/reference/database-schemas)</sub>

---

### `/reference/database-schemas/layout` — Database layout

**Database layout** · *Reference › Database schemas*

> Which SQLite database holds what, and the tables behind individual features

<sub>source `docs/reference/database-schemas/layout.md` · 502 lines · 4756 words</sub>

**Read when:** Locating the global state database or a per-agent database on disk · Checking which table backs a feature such as the update ledger or meeting transcripts

**Covers:** Database layout · Sandbox runtime reservations · Package-publication recovery receipt <sub>(13 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw update`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/layout](https://docs.openclaw.ai/reference/database-schemas/layout)</sub>

---

### `/reference/database-schemas/versioning` — Versioning contract

**Versioning contract** · *Reference › Database schemas*

> How OpenClaw records schema versions, when a bump is required, and how updaters cross one

<sub>source `docs/reference/database-schemas/versioning.md` · 462 lines · 4536 words</sub>

**Read when:** Deciding whether a storage change needs a schema-version bump · Diagnosing a refused update or a newer schema version error

**Covers:** Versioning contract <sub>(2 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw update`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/versioning](https://docs.openclaw.ai/reference/database-schemas/versioning)</sub>

---

### `/reference/database-schemas/personal-data` — Per-person and companion storage

**Per-person and companion storage** · *Reference › Database schemas*

> Where personal GitHub connections, personal model accounts, and Apple companion journals live

<sub>source `docs/reference/database-schemas/personal-data.md` · 101 lines · 1278 words</sub>

**Read when:** Checking where per-person credentials and selections are stored · Understanding Apple companion delivery journals and their migration behaviour

**Covers:** Personal GitHub connections and publication · Personal model accounts · Apple companion delivery journals

**CLI:** `openclaw doctor`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/personal-data](https://docs.openclaw.ai/reference/database-schemas/personal-data)</sub>

---

### `/reference/database-schemas/storage-changes` — Storage changes and release preflight

**Storage changes and release preflight** · *Reference › Database schemas*

> Proposing a persistent-store change, the review checkpoint, and preflighting a target release

<sub>source `docs/reference/database-schemas/storage-changes.md` · 2294 lines · 21814 words · 2 code blocks</sub>

**Read when:** Proposing a SQLite or persistent-store change, or another database backend · Preflighting a copied state database against a target release before activation

**Covers:** Preparing for another database backend · Review checkpoint for material changes · Preflight a target release <sub>(4 sub-sections)</sub>

**CLI:** `openclaw database preflight`, `openclaw database preflight-agent`

**Config:** `session.members.list`, `session.members.listEvidence`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/storage-changes](https://docs.openclaw.ai/reference/database-schemas/storage-changes)</sub>

---

### `/reference/database-schemas/agent-schema-history` — Agent schema history

**Agent schema history** · *Reference › Database schemas*

> Per-agent database schema versions, their changes, and their first releases

<sub>source `docs/reference/database-schemas/agent-schema-history.md` · 316 lines · 3185 words</sub>

**Read when:** Looking up which release first shipped an agent schema version · Planning the creator namespace or participant identity migration

**Covers:** Agent schema history <sub>(7 sub-sections)</sub>

**CLI:** `openclaw doctor`, `openclaw update repair`

**Config:** `session.maintenance.coldStorage.enabled`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/agent-schema-history](https://docs.openclaw.ai/reference/database-schemas/agent-schema-history)</sub>

---

### `/reference/database-schemas/state-schema-history` — State schema history

**State schema history** · *Reference › Database schemas*

> Shared state database schema versions, their changes, and their first releases

<sub>source `docs/reference/database-schemas/state-schema-history.md` · 258 lines · 2552 words</sub>

**Read when:** Looking up which release first shipped a state schema version · Reading the per-version notes for a recent state schema change

**Covers:** State schema history <sub>(9 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `gateway.auth.identityScopes`, `gateway.roles`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/state-schema-history](https://docs.openclaw.ai/reference/database-schemas/state-schema-history)</sub>

---

### `/reference/database-schemas/integrity-and-recovery` — Integrity, troubleshooting, and recovery

**Integrity, troubleshooting, and recovery** · *Reference › Database schemas*

> Integrity checks, common database errors, and the supported downgrade recovery path

<sub>source `docs/reference/database-schemas/integrity-and-recovery.md` · 701 lines · 7602 words</sub>

**Read when:** Diagnosing a quarantined database or a Gateway that refuses to start · Recovering a database for an older OpenClaw release

**Covers:** Integrity checks · btrfs and NOCOW · Troubleshooting · Downgrade recovery <sub>(10 sub-sections)</sub>

**CLI:** `openclaw database preflight`, `openclaw dist-tags`, `openclaw doctor`, `openclaw gateway call`, `openclaw gateway restart`, `openclaw gateway status`, `openclaw status`, `openclaw update`

**TermCrab — storage: PARTIAL.** Flat files: JSONL transcripts + Markdown + JSON config. No SQLite, no migrations, no WAL.

<sub>live: [docs.openclaw.ai/reference/database-schemas/integrity-and-recovery](https://docs.openclaw.ai/reference/database-schemas/integrity-and-recovery)</sub>

---

### `/reference/rich-output-protocol` — Rich output protocol

**Rich output protocol** · *Reference › Technical reference*

> Rich output protocol for structured media, embeds, audio hints, and replies

<sub>source `docs/reference/rich-output-protocol.md` · 136 lines · 766 words · 5 code blocks</sub>

**Read when:** Changing assistant output rendering in the Control UI · Debugging `[embed ...]`, structured media, reply, or audio presentation directives

**Covers:** Media attachments · Legacy MEDIA: lines · [embed ...] · Stored rendering shape · Related <sub>(2 sub-sections)</sub>

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/rich-output-protocol](https://docs.openclaw.ai/reference/rich-output-protocol)</sub>

---

### `/reference/secretref-credential-surface` — SecretRef credential surface

**SecretRef credential surface** · *Reference › Technical reference*

> Canonical supported vs unsupported SecretRef credential surface

<sub>source `docs/reference/secretref-credential-surface.md` · 218 lines · 852 words</sub>

**Read when:** Verifying SecretRef credential coverage · Auditing whether a credential is eligible for `secrets configure` or `secrets apply` · Verifying why a credential is outside the supported surface

**Covers:** Supported credentials · Unsupported credentials · Related <sub>(3 sub-sections)</sub>

**CLI:** `openclaw doctor`

**Config:** `agents.entries.*.memory.search.remote.apiKey`, `agents.entries.*.tts.personas.*.providers.*.apiKey`, `agents.entries.*.tts.providers.*.apiKey`, `channels.buzz.accounts.*.authTag`, `channels.buzz.accounts.*.privateKey`, `channels.buzz.authTag`, `channels.buzz.privateKey`, `channels.clickclack.accounts.*.token`

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/secretref-credential-surface](https://docs.openclaw.ai/reference/secretref-credential-surface)</sub>

---

### `/reference/secret-placeholder-conventions` — Secret Placeholder Conventions

**Secret Placeholder Conventions** · *Reference › Technical reference*

> Secret-scanner-safe placeholder conventions for docs and examples

<sub>source `docs/reference/secret-placeholder-conventions.md` · 28 lines · 79 words · 1 code blocks</sub>

**Read when:** Writing docs that include tokens, API keys, or credential snippets · Updating examples that may be scanned by secret-detection tooling

**Covers:** Recommended style · Avoid these patterns in docs · Example

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/secret-placeholder-conventions](https://docs.openclaw.ai/reference/secret-placeholder-conventions)</sub>

---

### `/date-time` — Date and time

**Date and time** · *Reference › Technical reference*

> Date and time handling across envelopes, prompts, tools, and connectors

<sub>source `docs/date-time.md` · 104 lines · 319 words · 7 code blocks</sub>

**Read when:** You are changing how timestamps are shown to the model or users · You are debugging time formatting in messages or system prompt output

**Covers:** Message envelopes (local by default) · System prompt: temporal context · System event lines (local by default) · Time format detection · Tool payloads + connectors (raw provider time + normalized fields) · Related docs <sub>(2 sub-sections)</sub>

**Config:** `agents.defaults.userTimezone`

<sub>live: [docs.openclaw.ai/date-time](https://docs.openclaw.ai/date-time)</sub>

---

### `/concepts/timezone` — Timezones

**Timezones** · *Reference › Technical reference*

> Where timezones show up in OpenClaw — envelopes, tool payloads, system prompt

<sub>source `docs/concepts/timezone.md` · 43 lines · 290 words · 1 code blocks</sub>

**Read when:** You want a quick mental model for timezone handling · You are deciding where to set or override a timezone

**Covers:** Three timezone surfaces · Setting the user timezone · Related

**Config:** `agents.defaults.userTimezone`

<sub>live: [docs.openclaw.ai/concepts/timezone](https://docs.openclaw.ai/concepts/timezone)</sub>

---

### `/concepts/typebox` — TypeBox

**TypeBox** · *Reference › Schemas and formatting*

> TypeBox schemas as the single source of truth for the gateway protocol

<sub>source `docs/concepts/typebox.md` · 292 lines · 1317 words · 12 code blocks</sub>

**Read when:** Updating protocol schemas or codegen

**Covers:** Mental model (30 seconds) · Where the schemas live · Current pipeline · How the schemas are used at runtime · Example frames · Minimal client (Node.js) · Worked example: add a method end-to-end · Swift codegen behavior · Versioning and compatibility · Schema patterns and conventions · Live schema JSON · When you change schemas · Related

**Config:** `cron.list`, `cron.run`, `cron.runs`

<sub>live: [docs.openclaw.ai/concepts/typebox](https://docs.openclaw.ai/concepts/typebox)</sub>

---

### `/concepts/markdown-formatting` — Markdown formatting

**Markdown formatting** · *Reference › Schemas and formatting*

> Markdown formatting pipeline for outbound channels

<sub>source `docs/concepts/markdown-formatting.md` · 167 lines · 950 words · 3 code blocks</sub>

**Read when:** You are changing markdown formatting or chunking for outbound channels · You are adding a new channel formatter or style mapping · You are debugging formatting regressions across channels

**Covers:** Pipeline · IR example · Table handling · Chunking rules · Link policy · Spoilers · Collapsible details · Adding or updating a channel formatter · Common gotchas · Related

<sub>live: [docs.openclaw.ai/concepts/markdown-formatting](https://docs.openclaw.ai/concepts/markdown-formatting)</sub>

---

### `/reference/credits` — Credits

**Credits** · *Reference › Project and contributing*

> Project origin, contributors, and license.

<sub>source `docs/reference/credits.md` · 27 lines · 136 words</sub>

**Read when:** You want the project backstory or contributor credits

**Covers:** Credits · Core contributors · License · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/credits](https://docs.openclaw.ai/reference/credits)</sub>

---

### `/reference/pull-request-review-flow` — Pull request review flow

**Pull request review flow** · *Reference › Project and contributing*

> How Barnacle and ClawSweeper feedback helps move OpenClaw pull requests through review.

<sub>source `docs/reference/pull-request-review-flow.md` · 207 lines · 1476 words · 1 code blocks</sub>

**Read when:** Following up after Barnacle or ClawSweeper feedback · Asking ClawSweeper for review · Debugging Barnacle, ClawSweeper, stale labels, or auto-closures

**Covers:** Barnacle · ClawSweeper · Improve a PR during review · Maintainer review artifacts · When automation stays quiet · Troubleshooting · Forking the automation · Related

**TermCrab — reference: PARTIAL.** Reference material only; compare against the corresponding TermCrab module before acting.

<sub>live: [docs.openclaw.ai/reference/pull-request-review-flow](https://docs.openclaw.ai/reference/pull-request-review-flow)</sub>

---
