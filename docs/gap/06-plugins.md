# OpenClaw plugins — gap report

TermCrab has no plugin system, and this is verifiable rather than assumed: `grep -rn "plugin\|registerHook\|dynamic import" src/ --include=*.ts` across the whole tree returns one hit — `src/channels/discord.ts:26`, a dynamic `import()` of the optional `discord.js` npm package. There is no manifest reader, no registry, no loader, no capability contract, no hook dispatcher, and no SDK. What exists instead is four *hardcoded* seams: a `tools.push()` ladder in `buildTools()` (`src/agent/tools.ts:182`, 13 tools) plus `extraTools()` (`src/agent/toolbox.ts:239`, 41 tools) totalling 54 fixed tools; seven static channel imports and a hand-written instantiation ladder (`src/gateway/server.ts:37`–`:41`, `:46`–`:47`, `:360`–`:457`); 87 method+pathname dispatch guards in a 1,955-line file (`src/gateway/server.ts:602`–`1806`); and Markdown-only `SKILL.md` folders (`src/skills/loader.ts:19`–`49`). The one real dynamic extension path is MCP over stdio (`src/providers/mcp.ts:31`–`149`, wired into the tool list at `src/agent/tools.ts:533`–`553`), which is why every provider, channel, and tool is currently a source edit. OpenClaw's surface is the largest single subsystem in the project: roughly 50 `register*` methods on one `OpenClawPluginApi` object (verified in the shipped bundle at `dist/plugin-entry-BJ7nwfgz.d.ts:20985`–`21135`), 55 distinct typed hook names (counted from `dist/`), ~55 manifest fields (`plugins/manifest.md:216`–`283`), 60 bundled `extensions/` packages, and four importable external bundle formats. **None of that is the target.** A solo developer needs roughly 17 days to reach the point where a third-party `register(api)` can add a tool, a channel, an HTTP route, and a provider client without a fork — and the value of stopping there rather than continuing is larger than the cost of getting there.

## Scorecard

Effort = days for one experienced developer. "Absent" is verified against source with a `file:line`
proof point; the proof point is where the capability would live if it existed.

| Capability | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| Plugin discovery | Manifest-first, from configured paths, workspace roots, global roots, bundled roots; native `openclaw.plugin.json` read **without executing plugin code** (`plugins/architecture.md:107`–`110`) | Absent — verified: no filesystem scan for plugin dirs anywhere in `src/` | Nothing to scan | 2 |
| Manifest | `openclaw.plugin.json`, JSON5-parsed, ~55 fields: `id`, `configSchema` (both required), `activation`, `contracts`, `setup`, `categories`, `mcpServers`, `skills`, `cliCommands`, `themes`, `dashboard`, `backupResources`, `qaRunners`, `doctorContract` (`plugins/manifest.md:216`–`283`, `:407`–`408`) | Absent | Needs ~6 fields, not 55 | 1 |
| Manifest validation before code load | Schema-validated at config read/write and before load; bundled schemas strict (`additionalProperties:false`) (`manifest.md:350`–`372`) | Config is a `deepMerge` against defaults with no schema (`config.ts:174`) | No validation layer to hook into | 1 |
| Plugin entry contract | `export default definePluginEntry({ id, name, register(api) })`, `register` must stay synchronous (`plugins/hooks/reference:14`–`20`, `:26`) | n/a | — | 0.5 |
| Registration API surface | ~50 methods on one object: `registerTool`, `registerHook`, `registerHttpRoute`, `registerService`, `registerCli`, `registerGatewayMethod`, `registerChannel`, `registerProvider`, `registerCliBackend`, `registerEmbeddingProvider`, `registerSpeechProvider`, `registerRealtimeVoiceProvider`, `registerImageGenerationProvider`, `registerWebSearchProvider`, `registerContextEngine`, `registerCompactionProvider`, `registerAgentHarness`, `registerCommand`, `registerModelCatalogProvider`, … (`dist/plugin-entry-BJ7nwfgz.d.ts:20985`–`21135`) | Absent | Minimum viable: **4** (`registerTool`, `registerChannel`, `registerHttpRoute`, `on`) | 5 |
| Typed hooks | 55 names in 7 groups — agent turn, conversation, tools, messages/delivery, sessions/compaction, subagents, lifecycle (`plugins/hooks/reference:132`–`245`) | Absent | Minimum viable: **6** | 3 |
| Hook execution kinds | Modify / Claim / Gate / Observe / Sync-modify / Evaluate, with per-kind ordering, default per-handler timeouts (15 s / 30 s / 2 s / 5 s / 120 s), and fail-closed vs log-and-skip policy (`hooks/reference:24`–`31`, `:88`–`106`) | Absent | Minimum viable: Gate + Observe + one Claim | 1 |
| Hook options | `matcher`, `priority`, `registrationId`, `timeoutMs`, `eligibleTriggers`, `eligibleDispatchKinds`, `requiresToolAuthority` (`hooks/reference:33`–`47`) | n/a | Minimum viable: `matcher` + `priority` | 0.5 |
| Hook budgets | Operator-settable per plugin and per hook, clamped to 600000 ms, override precedence documented (`hooks/reference:63`–`82`) | n/a | One global `hooks.timeoutMs` in config | 0.5 |
| Tool registration | `defineToolPlugin` with static tool list, TypeBox inference, `optional: true` metadata written back into the manifest, `factory` for runtime-dependent tools, `outputSchema`, `executionMode: "sequential"`, `prepareArguments` (`plugins/tool-plugins:72`–`262`) | `Tool[]` built and returned by one function; caller pushes into a local array (`tools.ts:182`, `:555`) | No registration seam — this is the single most-requested extension | 1.5 |
| Tool execution context | `toolContext.signal`, `sandboxed`, `delivery.send`, `memoryAudience` with currency guards `assertInvocationCurrent` / `assertMemoryAudienceCurrent` (`tool-plugins:206`–`262`) | `ToolEnv` carries `config`, `memory`, `skills`, `sessions`, `sessionId`, `providerLabel`, `spawnTask` (`loop.ts:173`–`186`); `execute(args)` takes no signal (`loop.ts:272`) | No abort signal reaches tools at all | 1 |
| Tool naming / collision | Names are the stable API; must be unique across core and plugins (`tool-plugins:118`) | MCP tools namespaced `mcp_<server>_<tool>` (`mcp.ts:156`); core names unnamespaced (`tools.ts`, `toolbox.ts`) | Adopt a `<pluginId>_<tool>` convention | 0.5 |
| Channel plugin contract | `registerChannel()` + a full SDK: inbound/outbound, accounts, threading, media, approvals, setup wizard, account-key policies (`plugins/sdk-channel-plugins`; `dist/` `PluginChannelRegistration`) | Seven classes, seven static imports, a hand-written instantiation ladder (`server.ts:37`–`:41`, `:46`–`:47`, `:360`–`:457`). Slack's handler literally ends `say(\`Echo: ${message.text}\`); // TODO: route to agent` (`channels/slack.ts:48`) | Adding a channel today means editing `server.ts` | 3 |
| Channel event routing | Typed inbound/outbound events, `message_received`/`sending`/`sent`, `inbound_claim`, `before_dispatch`, `reply_dispatch` (`hooks/reference:150`–`161`) | One in-process `Set<Handler>` bus with ad-hoc event names (`gateway/events.ts`, `slack.ts:45` emits `slack:message`) | Adequate for six fixed channels; not extensible | 1 |
| HTTP route registration | `registerHttpRoute()` with operator-scope tagging; routes are first-class registry entries (`dist/plugin-entry-BJ7nwfgz.d.ts:21011`) | 87 hardcoded method+path guards in one function (`server.ts:602`–`1806`) | No route table | 2 |
| Gateway RPC methods | `registerGatewayMethod(name, handler, {scope, profileAccess})` with reserved admin namespaces (`dist/plugin-entry-BJ7nwfgz.d.ts:21024`–`21029`) | Absent | Fold into `registerHttpRoute` for v1 | 0 |
| Provider plugin contract | `registerProvider()` — a first-class capability, not a hook (`plugins/architecture.md:34`; `plugins/sdk-provider-plugins`) | `resolveProvider()` returns `createOpenAi()` unconditionally (`index.ts:63`–`82`) | Needs the client registry from `05-providers.md` Block 4 first | 2 |
| Service lifecycle | `registerService()` + `gateway_start`/`gateway_stop` hooks, 5-second instance shutdown budget, drain-then-dispose (`hooks/reference:246`–`252`) | Channels self-manage `start()`/`running` (`channels/slack.ts:20`–`61`); no shared lifecycle | Needs one small contract | 1 |
| CLI command registration | `registerCli(registrar, opts)` with parse-time `descriptors` so root command names reserve before plugin code loads (`plugins/architecture.md:123`–`127`) | One 1,000-line `switch` (`cli.ts`, 39 KB) | Low value for a solo agent; **skip in v1** | 0 |
| Hot reload / snapshot swap | `PluginCache` → immutable `PluginMetadataSnapshot` → `PluginLookUpTable`; reload drains admitted work under a 60 s pre-stop budget, retains unchanged registrations, republishes or rolls back (`plugins/architecture.md:145`–`230`) | `fs.watch` on `config.json` only (`server.ts:341`) | **Skip in v1.** Reload = gateway restart. Restart is already supervised | 0 (design debt) |
| Plugin shapes & diagnostics | Four shapes — `plain-capability`, `hybrid-capability`, `hook-only`, `non-capability` — surfaced by `plugins inspect <id>` (`architecture.md:78`–`92`) | n/a | `hooks-only` / `has-capability` is enough | 0.5 |
| Capability consent / trust review | Review screen hashing the declared capability surface, integrity-pinned acceptances that force re-consent on capability growth (`plugins/manage-plugins:137`–`180`) | n/a | **Skip.** TermCrab's threat model already trusts the agent's own shell. A user who can `exec` can already `require()` | 0 |
| Sandbox / permission model | Bundled-plugin trust tiers, `contracts.trustedToolPolicies`, `allowConversationAccess` gating on transcript reads (`hooks/reference:198`–`206`, `tool-plugins:206`–`262`) | `agent.allowExec` defaults **true** (`config.ts:156`); no sandbox | Consistent with the existing threat model; **skip** | 0 |
| MCP integration | `mcpServers` contributed by manifest, transport bound to a trusted requester, plugin hosts run their own MCP stdio services (`manifest.md:275`+, `dist/plugin-entry-BJ7nwfgz.d.ts:21015`) | Client exists and works: stdio JSON-RPC 2.0, `initialize`/`tools/list`/`tools/call`, 30 s timeout, atomic line framing, drain of pending calls on close (`mcp.ts:31`–`149`); auto-inits on creation (`mcp.ts:110`) | **Already the strongest extension point.** See gaps below | 3 |
| MCP transports | stdio, HTTP, SSE | stdio only (`mcp.ts:32`–`35`) | HTTP transport for remote servers | 2 |
| MCP protocol surface | Full: tools, resources, prompts, sampling, roots, elicitation | Tools only (`mcp.ts:22`–`27`). No `resources/list`, no `prompts/list`, no sampling | Missing half the protocol | 3 |
| MCP reconnect | Reconnect with backoff on server death | One-shot. `child.on('close')` rejects pending and sets `closed = true` permanently (`mcp.ts:66`–`72`); no restart path. `close()` sends SIGTERM, never SIGKILL (`mcp.ts:142`–`147`) | A crashed MCP server is dead until gateway restart | 1.5 |
| Skills (prompt-level, not plugins) | `skills` dirs declared by plugins, Skill Workshop evaluators via `skill_proposal_evaluate` (`hooks/reference:262`–`270`) | Working: `SKILL.md` frontmatter, builtin+user roots, user overrides builtin, fresh scan each call (`loader.ts:19`–`69`), ClawHub-compatible publish/search/install (`registry.ts:26`) | Good as-is. Skills are the *right* v1 answer for most "extensions" | 0 |
| Skill security review | `skill_proposal_evaluate` evaluator hooks, `before_install` gate, `before_install` inspects staged material (`hooks/reference:249`–`253`) | **`installSkill` never validates the remote skill name** — `path.join(userSkillsDir(), name)` (`registry.ts:88`) then `writeFileSync` (`:90`), with `NAME_RE` (`loader.ts:17`) applied everywhere else but here. Then: no content review, and `skills import` shells out to `git clone` (`importer.ts:82`) | Arbitrary-file-write via a registry-supplied name; unreviewed remote content in the system prompt | **0.5** (name guard) + 2 (review) |
| Bundle format interop | Four: Agent Plugins (`plugin.json`), Codex (`.codex-plugin/plugin.json`), Claude (`.claude-plugin/plugin.json`), Cursor (`.cursor-plugin/plugin.json`) — auto-detected, metadata mapped into skills/commands/MCP/hooks (`plugins/manifest.md:13`–`19`, `plugins/bundles:1`–`60`) | Absent | Skill-only interop is 1 day of the total; full bundle mapping is weeks | 1 (skills-only) |
| Plugin SDK / type exports | `openclaw/plugin-sdk/plugin-entry`, `/tool-plugin`, `/plugin-entry`, `*-runtime` subpaths; ~9 SDK doc pages (`plugins/sdk-overview`, `sdk-subpaths`, `sdk-entrypoints`, `sdk-testing`, …) | TermCrab has **no `dependencies` key at all** in `package.json` — the only entries are `devDependencies` at `package.json:45`–`48`. Hand-written JSON Schema in `ToolDef.schema` (`types.ts:3`–`8`) | A `.d.ts` shipped alongside `dist/`; no TypeBox | 1 |
| Plugin install lifecycle | install / enable / disable / update / uninstall / marketplace / publish, `install-overrides`, dependency resolution | Skills only: `termcrab skills install|search|publish|new|show|import` (`cli.ts:391`–`483`) | Copy a directory into `~/.termcrab/plugins/`; no registry needed for v1 | 1 |
| Publishing | ClawHub, `openclaw plugins publish` (`plugins/building-plugins:23`–`26`, `manage-plugins:452`) | Skills publish to the same ClawHub API (`registry.ts:99`–`133`) | Extend the existing client to `plugins` | 0.5 |
| Deprecation & compat tracking | `src/plugins/compat/registry.ts`, records per surface, deprecation policy, inspector package (`plugins/compatibility:20`–`64`) | n/a | **Skip in v1.** Overkill for one author | 0 |

## What the reference tail actually contains

164 `plugins/reference/*` pages. Reading them individually is not the job; the job is to know that the
surface decomposes into eight capability families and to size only one of them. Grouped:

| Family | Count (approx.) | Members | TermCrab relevance |
| --- | --- | --- | --- |
| Model providers | ~50 | anthropic, openai, google, bedrock(+mantle), ollama, openrouter, groq, mistral, deepseek, cerebras, lmstudio, vllm, sglang, litellm, llama-cpp, together, fireworks, deepinfra, huggingface, novita, nvidia, minimax, moonshot/kimi, qwen, zai, tencent, volcengine, byteplus, xiaomi, alibaba, cohere, chutes, arcee, featherless, gmi, gradium, longcat, meta, perplexity, stepfun, synthetic, venice, vercel-ai-gateway, claude's router `clawrouter`, opencode(+go), kilocode, radius, vydra, voyage, Microsoft Foundry, Anthropic-on-Vertex, Cloudflare AI Gateway | **High but indirect.** All of it lands on TermCrab via OpenAI-compat or via one `registerProvider`. See `05-providers.md`. |
| Channels / messaging | ~32 | telegram, whatsapp, slack(+huddles), discord, signal, imessage, imsg, msteams/teams-meetings, matrix, mattermost, googlechat, feishu, line, irc, nostr, qqbot, tlon, twitch, zalo(+user), buzz, clickclack, nextcloud-talk, synology-chat, smtp/imap, sms, facetime, zoom-meetings, google-meet, raft, reef, visitor-access, x(twitter) | **The highest-value family.** Slack and Matrix are already half-built and unwired (`channels/slack.ts:48` TODO). This is where `registerChannel` earns its 3 days |
| Media gen / understanding / speech | ~18 | fal, comfy, runway, pixverse, kie, elevenlabs, azure-speech, deepgram, fish-audio-speech, inworld, senseaudio, onnx, tts-local-cli, talk-voice, voice-call, apple-fm, canvas, document-extract | Low for Termux. TermCrab already does local TTS/STT (`cli.ts:859`, `termux say`) |
| Web / search / fetch | ~9 | brave, duckduckgo, exa, firecrawl, searxng, tavily, web-readability, document-extract, file-transfer | **Medium.** TermCrab's `web_search` is a DuckDuckGo HTML scrape (`parseDdgResults` at `toolbox.ts:69`–`:98`, `duckDuckGo` at `:114`) with no API key and no rate limit — swapping it is a textbook `registerWebSearchProvider` |
| Memory / context | ~5 | memory-core, memory-lancedb, memory-wiki, active-memory, typesafe | Low. TermCrab's file-based memory (`memory.ts`) is a deliberate phone-first choice |
| Ops / diagnostics / infra | ~13 | admin-http-rpc, diagnostics-otel, diagnostics-prometheus, linux-node, openshell, device-pair, oc-path, qa-lab, qa-channel, tokenjuice, crabbox, raft, policy | Medium for `diagnostics-otel` + `admin-http-rpc`; see `02-gateway.md` |
| Integrations / productivity | ~20 | github, 1password, vault, onepassword, logbook, session-share, team-reports, workboard, geolocation, imap, oc-path, device-pair, diffs, google-meet, meet-* | Low individually; high in aggregate — this is exactly what plugins are *for* |
| Execution / migration / agent runtimes | ~12 | codex (+app-server), acpx, a2a, code-mode-quickjs, cua-computer, browser, beam, migrate-claude, migrate-hermes, llm-task, smart-search | **Skip.** Re-implementing another agent harness is not a Termux project |

**Conclusion from the triage:** 164 pages, and 150 of them are "the same four registration methods,
called with different vendor SDKs." The system's value is not the surface area — it is that the
surface area is uniform. TermCrab needs the uniformity, not the area.

## The minimum plugin system

### The question

> What is the minimum system that lets a solo developer extend TermCrab without forking it?

### The answer, scoped

**17 days.** A directory of plugins, four registration methods, six hooks, no hot reload, no sandbox,
no capability taxonomy, no CLI extension, no bundle interop beyond skills.

Design decisions, each with the reason it is on this list and not a bigger one:

| Decision | Included | Excluded | Reason |
| --- | --- | --- | --- |
| Where plugins live | `~/.termcrab/plugins/<id>/` scanned at gateway start | Workspace roots, global roots, npm-installed, bundled roots | One user, one directory, one scan site. All the extra roots exist to solve multi-agent workspace isolation, which TermCrab does not have |
| Manifest | `termcrab.plugin.json` with 6 fields: `id`, `name`, `description`, `version`, `entry`, `configSchema` | `activation`, `contracts`, `categories`, `setup`, `mcpServers`, `skills`, `themes`, `dashboard`, `backupResources`, `qaRunners`, `doctorContract`, `cliCommands`, `modelCatalog`, ~41 more | Six is what you need to validate config and render a UI row. Everything else in OpenClaw's manifest is a control-plane optimisation for 60 bundled plugins |
| Entry contract | `export default { id, register(api) }`, `register` synchronous, handlers may be async | `definePluginEntry` wrapper, multiple entries per package, `entry-basename` ids | A wrapper adds a runtime dep for no benefit at one author |
| Registration | `registerTool`, `registerChannel`, `registerHttpRoute`, `on` | ~46 others | These four cover every extension TermCrab's hardcoded seams currently block. `registerProvider` is added in v1.1 after `05-providers.md` Block 4 lands the client registry |
| Hooks | 6: `before_tool_call` (Gate+Modify), `after_tool_call` (Observe), `before_prompt_build` (Modify), `before_agent_reply` (Claim), `session_start`/`session_end` (Observe) | 49 others | A hook is worth adding when a plugin must *change* behaviour, not watch it. These six are the changes: block a tool, rewrite the prompt, short-circuit a turn, and bracket a session. The remaining 49 are observability and OpenClaw-specific delivery phases |
| Hook execution | Gate (sequential, block stops the rest), Modify (sequential merge), Claim (first `{handled:true}` wins), Observe (concurrent, return ignored). One `timeoutMs` per plugin, default 15 s | Per-hook timeout overrides, `eligibleTriggers`, `registrationId`, priority tiers beyond an integer, sync-modify, Evaluate | Gate/Modify/Claim/Observe is the whole taxonomy that matters. The 55-name catalog exists because OpenClaw has 32 channels each needing its own delivery-phase seams |
| Tool contract | Reuse the existing `ToolDef` (`src/providers/types.ts:3`–`8`) and `Tool` (`src/agent/tools.ts:37`–`40`), plus the `ToolEnv` from `src/agent/loop.ts:173`–`186`, and an `AbortSignal` threaded into `execute` | TypeBox, `outputSchema`, `factory`, `prepareArguments`, `executionMode`, `memoryAudience`, v2 tool context | The existing shapes are already JSON-Schema-typed and already what MCP tools become (`mcp.ts:154`–`159`). Adding TypeBox breaks the zero-dependency guarantee (no `dependencies` key exists in `package.json`; only `devDependencies` at `:45`–`:48`) |
| Channel contract | `registerChannel({ id, start(env): Promise<void>, stop(): Promise<void> })` where `env` carries the existing event bus and an outbound `send(sessionKey, text)` | Accounts, threads, media, approvals, setup wizards, account-key policies, `createReplyDispatcher` | TermCrab has seven channels that all resolve to "post text to a session key". That is the interface. The other 14 OpenClaw channel concepts describe problems TermCrab's channels do not have |
| Route contract | `registerHttpRoute({ method, path, handler, auth? })`, matched before the hardcoded ladder, sharing the existing `checkToken` | Scopes, operator roles, `registerGatewayMethod` | The gateway has one token (`auth.ts:16`–`24`). A route either requires it or does not |
| Lifecycle | Plugins load at gateway start, before channels. `gateway_stop` hook gives each plugin 5 s to close resources | Hot reload, snapshot swap, drain-and-rollback, retained-work accounting | **This is the single biggest simplification.** OpenClaw spends most of `architecture.md` (lines 145–260) on reload correctness because it supports hot-swapping a provider out from under live agent turns. A gateway restart is already a supervised, normal event for TermCrab (`core/updater.ts`, supervisor) and loses nothing the user cares about |
| Sandbox / consent | None | Capability consent screens, trust tiers, `contracts.trustedToolPolicies`, `allowConversationAccess` | TermCrab's agent runs `sh -c` with `process.env` (`tools.ts:277`, `:300`) and `allowExec` defaults **true** (`config.ts:156`). A consent screen for a plugin is theatre when the model can already run arbitrary commands. This is a deliberate, documented decision, not an oversight |
| Cli commands | None | `registerCli`, `cliCommands` descriptors | `cli.ts` is one 39 KB switch. Adding a plugin command means a subcommand that dispatches to a plugin registry. Low value for a single operator |
| Install / publish | Copy a directory, or `termcrab plugins install <path|tarball>` reusing the existing `git clone` fetch path from `skills/importer.ts:82` | Marketplace, ClawHub plugin publishing, dependency resolution, `install-overrides`, npm version pinning | The skills importer already shells out and knows how to fetch a repo or archive. Reuse it |
| SDK types | Ship `dist/src/plugins/sdk.d.ts`; importable as `termcrab/plugin-sdk` via an `exports` map | Nine SDK doc pages, subpath taxonomy, migration guides, testing harness | One `.d.ts` is enough when there is one author |
| Bundles | Map `SKILL.md` out of an Agent Plugins / Claude / Codex / Cursor bundle into the existing skill loader | Full bundle manifests, command roots, LSP defaults, hook packs, settings.json | Skills-only interop is ~1 day and covers the most common bundle content. The rest is weeks for a format most solo plugins will not use |

### Where each piece plugs into TermCrab

This is the part that determines whether 17 days is honest.

| Piece | Insertion point | Existing code to reuse |
| --- | --- | --- |
| Discovery + manifest | New `src/plugins/registry.ts`; called from `src/gateway/server.ts` before the channel ladder at `:360` | `parseFrontmatter` (`core/frontmatter.ts`), `deepMerge` (`config.ts:174`) |
| `registerTool` | `buildTools()` after `tools.push(...extraTools(env))` (`tools.ts:555`) | `Tool` (`tools.ts:37`–`:40`), `ToolDef` (`types.ts:3`–`:8`), `mcpToolsToDefs` (`mcp.ts:154`), the `mcp_<server>_<tool>` naming convention |
| Abort signal into tools | `tool.execute(call.args)` (`loop.ts:272`) → `execute(args, signal)`; `abortCtrl.signal` already exists at `loop.ts:203` | — |
| `before_tool_call` gate | Immediately before `toolMap.get(call.name)` (`loop.ts:267`), where `addSpan`/`emit({type:'tool:start'})` already run | `core/tracing.ts` spans, the event bus |
| `after_tool_call` observe | After `endSpan(runId, span.id)` (`loop.ts:278`) | `addToolCall` (`loop.ts:279`) |
| `before_prompt_build` | `buildSystemPrompt()` (`prompt.ts:140`–`180`) — append to the returned string | `channelGuide()` (`prompt.ts:67`), the `skills.promptIndex()` block (`loader.ts:81`–`85`) |
| `before_agent_reply` claim | Before `agent.chat(...)` in `runTurn` (`loop.ts:166`–`172` provider resolve, then `:187` tools) | The existing local-tier / failover branch at `loop.ts:164`–`172` |
| `session_start`/`session_end` | Around `runTurn`; `ctx.sessions.append` (`loop.ts:213`, `:281`) is the natural bracket | `SessionQueue` (`sessions.ts:269`), `sessions.ts` lifecycle methods |
| `registerChannel` | A `Map<channelId, ChannelPlugin>` consumed where `server.ts:360`–`457` hardcodes each channel today | The event bus (`gateway/events.ts`) and the `*Channel` class shape (`channels/telegram.ts:35`) |
| `registerHttpRoute` | A route table consulted before the `if (pathname === ...)` ladder at `server.ts:602` | `checkToken` (`auth.ts:16`), `json()` helper (`server.ts`) |
| `registerProvider` (v1.1) | `resolveProvider()` (`index.ts:63`–`82`), which needs the client registry from `05-providers.md` worklist item 12 | `createOpenAi` (`openai.ts:124`), `isWellKnownBase` (`index.ts:40`) |

Every insertion point exists and is a single line or a single function. None requires restructuring a
caller. That is what makes 17 days credible rather than optimistic — the reason TermCrab is cheap to
extend is that it has no framework in the way.

### Build order

| Days | Deliverable | Acceptance test |
| --- | --- | --- |
| 1–2 | `src/plugins/registry.ts`: scan `~/.termcrab/plugins/*/`, read `termcrab.plugin.json`, dynamic `import()` each `entry`, call `register(api)` into a per-plugin record, collect errors without aborting the others | A plugin with a syntax error appears in `GET /api/plugins` with its error and does not stop the gateway |
| 3–4 | `api.registerTool` + AbortSignal into `Tool.execute` | A plugin tool appears in `GET /api/tools` and is callable by the model; `interrupt` aborts it |
| 5–6 | `api.on` with Gate/Modify/Claim/Observe, `matcher`, `priority`, one 15 s `timeoutMs` | A `before_tool_call` gate can block `exec` and the model receives the block reason as the tool result |
| 7–8 | `before_prompt_build` + `before_agent_reply` | A plugin can append a context block, and can short-circuit a turn with a synthetic reply without a model call |
| 9–10 | `api.registerHttpRoute` | `GET /api/plugins/ping` from a plugin returns 200 and respects `checkToken` |
| 11–13 | `api.registerChannel` + refactor one existing channel (Slack is the right candidate — it is already written and unwired, `channels/slack.ts:48`) through the new contract | Slack receives a message, the event reaches the agent, the reply is delivered — with zero edits to `server.ts` |
| 14 | `after_tool_call`, `session_start`, `session_end` | A plugin records tool durations and session boundaries |
| 15 | `termcrab plugins list/enable/disable`, config wiring, `plugins.entries.<id>.enabled`, a `doctor` check for a plugin that fails to load | `termcrab plugins list` shows shape and load status; a broken plugin is reported by `doctor` |
| 16 | `termcrab plugins install <path\|tarball\|git-url>` reusing the `skills/importer.ts` fetch path; Agent-Plugins / Claude / Codex / Cursor `SKILL.md` extraction | Installing a Claude command pack produces working skills |
| 17 | Ship `sdk.d.ts`, one documented example plugin per registration method, `plugins/` docs page | A third party can write a plugin from the docs without reading `src/` |

### What this deliberately does not get you

State it plainly, because "no plugin system" reads like a gap and it is closer to a trade:

- **No hot reload.** `termcrab gateway` restart to pick up a plugin change. Acceptable because
  TermCrab already supervises and self-restarts the gateway.
- **No plugin can change which provider protocol is used** until `05-providers.md` worklist item 12
  (Anthropic client) lands. `registerProvider` is v1.1 and needs the client registry first.
- **No plugin-owned CLI command.** `termcrab <cmd>` stays a fixed switch.
- **No plugin can own a config slot** (`memory`, `context-engine`) the way OpenClaw's `kind` and
  `plugins.slots.*` allow (`plugins/manifest.md:238`). TermCrab's memory is a deliberate design; a
  plugin should not be able to replace it.
- **No sandbox.** Plugins run in the gateway process with the same privileges as the agent. This is
  the same trust level as `exec`, which is already on by default. Document it in one place and move on.
- **No capability consent UI.** Same reasoning.

## Extending what exists: MCP

MCP is the extension point TermCrab already has, and it is genuinely good for what it covers. Verify
this before choosing: `mcp.ts` implements JSON-RPC 2.0 over stdio with correct line framing
(`mcp.ts:42`–`60`), request ids and a pending map (`mcp.ts:37`–`38`), a 30 s per-request timeout with
cleanup (`mcp.ts:29`, `:87`–`90`), rejection of all pending calls on child close and error
(`mcp.ts:66`–`80`), `initialize` + `notifications/initialized` on creation with a swallowed failure so
non-conforming servers still work (`mcp.ts:99`–`112`), and `tools/list` / `tools/call` with
`isError` mapped to a thrown error (`mcp.ts:117`–`140`). Tool names are namespaced
(`mcp.ts:154`–`159`) and a server that fails to list is skipped rather than fatal (`tools.ts:550`–`551`).

Four concrete gaps, 7.5 days total:

| Gap | Location | Effort |
| --- | --- | --- |
| No reconnect. `child.on('close')` sets `closed = true` forever (`mcp.ts:66`–`72`); a crashed server is dead until gateway restart | `mcp.ts:66`–`80` | 1.5 |
| No HTTP/SSE transport. Remote MCP servers are unreachable | `mcp.ts:32`–`35` | 2 |
| Half the protocol missing: no `resources/list`, `prompts/list`, or server-initiated `sampling` | `mcp.ts:22`–`27` | 3 |
| `close()` sends SIGTERM and never SIGKILL (`mcp.ts:142`–`147`); a wedged child holds the port forever | `mcp.ts:142`–`147` | 0.5 |
| `clientInfo.version` is hardcoded `'0.34.0'` (`mcp.ts:103`) while `package.json` says `0.36.0` | `mcp.ts:103` | 0 |
| No `mcpServers` in config discovered by the plugin system — servers come from one runtime-built `Map` (`server.ts:345`) | `server.ts:345` | 0 (falls out of the plugin work) |

**Recommendation:** do items 1, 4, and 5 (2 days) regardless of whether you build a plugin system.
MCP is how a solo TermCrab user will actually get an extension today, and a crashed server that never
comes back is the most likely thing they will hit.

## Security review of the extension surface

Three findings belong in this report rather than the gateway one, because they are extension-mechanism
findings. The first is a live vulnerability, not a missing feature.

1. **`installSkill` is an arbitrary-file-write primitive: the skill name is never validated.** The
   name comes from remote JSON with an unchecked cast — `getSkill` does
   `return (await res.json()) as RegistrySkill` (`registry.ts:69`), no runtime check — and
   `installSkill` then does `path.join(userSkillsDir(), name)` (`registry.ts:88`) followed by
   `fs.writeFileSync(destFile, skill.content, 'utf8')` (`registry.ts:90`). `name` is never passed
   through `NAME_RE`. The guard exists and is used everywhere else in the same subsystem:
   `loader.ts:17` defines it, and `enable`/`disable`/`remove` all test it before performing the *same*
   `path.join(userSkillsDir(), name)` (`loader.ts:88`, `:98`, `:108`). The one call site that writes
   remote content is the one that skips the check. A name of `../../../.termcrab/config.json`
   therefore writes registry-supplied content to that path, with no signature check, no size bound,
   and no user review. Default registry is the third-party `https://clawhub.ai/api`
   (`registry.ts:26`), overridable by config. **This is the highest-severity finding in either gap
   report** and the fix is about ten lines: validate `name` against `NAME_RE` (or `path.basename` it)
   in `installSkill` before the `join`. Nothing else about the function needs to change.
3. **Remote skill content reaches the system prompt unreviewed**, separately from the path bug. Even
   with a valid name, `skill.content` lands verbatim in `~/.termcrab/skills/<name>/SKILL.md`, is read
   back by `SkillStore.get()` (`loader.ts:71`–`:78`), and is injected into the agent's context when the
   model calls `load_skill`. `searchSkills` and `getSkill` swallow every error and return empty or
   `null` (`registry.ts:50`–`:53`, `:69`–`:72`), so a registry outage is indistinguishable from an
   empty registry. Publishing a lookalike skill to `clawhub.ai` is a plausible attack and the victim
   only has to run `termcrab skills install <name>`.
4. **`skills import` shells out to `git`** from a user-supplied string
   (`src/skills/importer.ts:82` — `execFileAsync('git', ['clone', '--depth', '1', ...])`). Git only — there is no
   npm path and no archive/tarball support in this file. The clone itself is the intended feature, but
   it means skill installation runs a subprocess *before* any model involvement, and the imported
   `SKILL.md` then goes into the prompt. Same trust boundary as the gateway's
   `POST /api/skills/import` endpoint, which `02-gateway.md` already flags as unauthenticated.

OpenClaw's answer is a two-layer review: `before_install` inspects staged material, and
`skill_proposal_evaluate` runs third-party evaluators over an immutable candidate bundle with file
hashes (`hooks/reference:249`–`270`). A minimal TermCrab equivalent — show the content, require a
`--yes`, bound the size, record the source — is roughly 2 days and should be done regardless of the
plugin system.

## Loopholes and correctness bugs

1. **`channels/slack.ts` does not route to the agent.** `src/channels/slack.ts:45` emits a
   `slack:message` bus event, then `:48` replies `` Echo: ${message.text} `` with the comment
   `// TODO: route to agent`. Matrix (`channels/matrix.ts:41`) has the same shape. Both channels are
   importable and constructible (`server.ts:360`, `:363`) and will start, connect, authenticate, and
   echo. This is not a plugin gap — it is an unfinished channel shipping as if it worked.
2. **No route table.** All 87 method+path guards live in one function body
   (`server.ts:602`–`1806`) with no table, no prefix matching beyond four hand-written regexes, and no
   extension point. Every new endpoint is a source edit in a 1,955-line file.
3. **No channel registry.** Seven static imports (`server.ts:37`–`:41`, `:46`–`:47`) and an
   instantiation ladder with per-channel `if (config.channels.X)` branches
   (`server.ts:360`–`:457`). Channel startup order is source order, not config order, and adding a
   channel means editing the ladder in three places.
5. **Tools have no abort signal.** `tool.execute(call.args)` (`loop.ts:272`) receives only args. A
   long-running tool — `exec`, `web_fetch` — cannot be cancelled by `abortCtrl` (`loop.ts:203`) even
   though the turn can. `Interrupt` stops the *loop*, not the tool.
6. **MCP `close()` is not a close.** SIGTERM with no timeout and no SIGKILL
   (`mcp.ts:142`–`147`). A child that ignores SIGTERM holds its stdio pipes open, and since
   `sendRequest` rejects only via `closed`, calls into it hang to the 30 s timeout
   (`mcp.ts:29`).
7. **MCP has no reconnect.** `closed = true` on close (`mcp.ts:67`) is permanent for the client's
   lifetime. There is no supervisor, no backoff, no restart.
8. **`clientInfo.version` is stale.** `'0.34.0'` (`mcp.ts:103`) against `package.json` `0.36.0`.
   Trivial, but it is the string an MCP server shows in its own logs, so it makes MCP server-side
   debugging confusing.
9. **`tools push(...extraTools(env))` runs last** (`tools.ts:555`), after MCP tools. A core tool with
   the same name as an MCP tool would be shadowed by MCP, and a plugin tool registered after MCP
   would shadow both. There is no collision detection — `toolMap` is built with
   `new Map(tools.map(t => [t.def.name, t]))` (`loop.ts:188`), so a duplicate silently keeps the last
   one and the earlier tool becomes unreachable with no warning.
10. **`sandbox` / `queueMode` / `isolation` / `maxIterations` are dead config.** Verified:
   `loop.ts:197` hardcodes `maxIter = 1000`; `grep -rn queueMode src/` and `grep -rn isolation src/`
   return only their `config.ts` declarations. Same class of finding as `02-gateway.md`. Not a plugin
   gap, but it means the plugin API must not be built on the assumption that config keys are read.
11. **The HITL approval system can never fire.** `GET /api/approvals` (`server.ts:972`–`976`) and
    `POST /api/approvals/:id/(approve|deny)` (`server.ts:978`–`984`) are implemented and served, and the
    UI has a panel for them — but the only two functions that would ever put an entry in the store,
    `createApproval` (`core/approvals.ts:14`) and `waitForApproval` (`core/approvals.ts:36`), are
    imported at `server.ts:78` and have **zero call sites in `src/`**. The list endpoint is therefore
    permanently `[]` and every approve/deny POST resolves an id that does not exist. This matters here
    specifically: OpenClaw's `before_tool_call` gate is exactly where HITL approvals live
    (`hooks/reference:236`). TermCrab has the store, the HTTP surface, and no producer — so a plugin
    wanting to gate a destructive tool has to build the gate *and* the UI, and the cheapest fix is to
    make the tool layer call `createApproval` rather than to wait for a plugin hook that does not exist.

## Sequenced worklist

### Block 0 — close the live holes, 3.5 days

1. **Validate the skill name in `installSkill`** before `path.join(userSkillsDir(), name)`
   (`registry.ts:88`). Reuse `NAME_RE` from `loader.ts:17` exactly as `loader.ts:88`/`:98`/`:108`
   already do, or `path.basename()` it and reject on change. Today a registry-supplied name containing
   `../` writes registry-supplied content to an arbitrary path, unsigned and unreviewed, from a
   default third-party registry (`registry.ts:26`). Ten lines. **0.5 day.** Do this first; it is the
   only remotely-triggerable write primitive in the codebase.
2. Fix or disable the Slack and Matrix channels. Either wire their bus events to the agent queue
   (`server.ts:699` shows the pattern via `agentQueue.enqueue`) or refuse to construct them and log a
   clear "not implemented". A channel that echoes user text while claiming to be an agent is worse
   than no channel. **1 day.**
3. MCP hardening: SIGKILL after a 2 s grace in `close()` (`mcp.ts:142`), a reconnect supervisor with
   backoff (`mcp.ts:66`), and fix `clientInfo.version` to read from `package.json`
   (`mcp.ts:103`). **2 days.**

### Block 1 — the minimum plugin system, 17 days

Follow the build order in "The minimum plugin system" above. Items are numbered so they can be
tracked independently; each has an acceptance test in that table.

3. Plugin discovery + manifest reader + registry, 2 days.
4. `registerTool` + AbortSignal into `Tool.execute`, 2 days.
5. `api.on` with Gate/Modify/Claim/Observe, `matcher`, `priority`, `timeoutMs`, 2 days.
6. `before_prompt_build` + `before_agent_reply` hooks, 2 days.
7. `registerHttpRoute` + route table consulted before the hardcoded ladder, 2 days.
8. `registerChannel` + refactor Slack through the new contract, 3 days.
9. `after_tool_call`, `session_start`, `session_end`, 1 day.
10. `termcrab plugins list/enable/disable` + `doctor` check + config wiring, 1 day.
12. `termcrab plugins install` reusing `skills/importer.ts`, plus skills-only bundle interop, 1 day.
13. `sdk.d.ts`, four example plugins, `docs/plugins.md`, 1 day.

### Block 2 — fix the skills trust boundary, 2 days

14. Show remote skill content and its source before writing it, require an explicit `--yes`, bound the
    size, and record `state/skills-audit.log`. Do not swallow registry errors into an empty list —
    distinguish "registry unreachable" from "no results" (`registry.ts:50`–`53`, `:69`–`72`).
    **2 days.** Do this even if Block 1 is skipped.

### Block 3 — v1.1, 12 days

15. `registerProvider`, contingent on the Anthropic client from `05-providers.md` worklist item 12.
    **2 days** after that lands.
16. MCP HTTP/SSE transport. **2 days.**
17. MCP `resources/list` and `prompts/list`. **2 days.**
18. MCP server-initiated sampling with a bounded budget. **1 day.**
19. Wire `createApproval`/`waitForApproval` into a real HITL path so a plugin's `before_tool_call`
    gate can require approval. **5 days** (crosses into `02-gateway.md` Block 0 item "exec approvals").

### Explicitly not scheduled

Hot reload (snapshot swap, drain, rollback — 15+ days for a capability a supervised restart already
delivers); capability consent UI (the trust model already grants more than it would gate); plugin-owned
CLI commands; exclusive config slots (`memory`, `context-engine`); the Agent Plugins / Claude / Codex /
Cursor bundle formats beyond `SKILL.md` extraction; plugin-published model catalogs; agent-harness
plugins. Each is defensible to want and none is defensible to build before items 3–13 ship.

Total: 32 days for Blocks 0–2 (19 days of which is the plugin system itself), leaving every item in
"Explicitly not scheduled" as an option taken later rather than a debt incurred now.