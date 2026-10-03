# OpenClaw gateway — gap report

TermCrab's gateway is a single 1955-line `node:http` server (`src/gateway/server.ts`) serving one
static SPA plus 56 exact-match routes and 9 regex-parameterised route patterns (65 dispatch checks
total, `server.ts:602`–`1806`) over plain HTTP and one SSE stream, with an in-process 31-line
event bus (`src/gateway/events.ts`) and a `Set<Handler>` as its only fan-out mechanism. OpenClaw's gateway is a multi-client control plane: a typed WebSocket protocol with
`req`/`res`/`event` frames, roles and scopes, per-device Ed25519 identity with signed pairing
challenges, idempotency keys, WS+HTTP multiplexed on one port, and six sandbox backends. The
single most important finding in this report is not a missing feature: **the entire `/api`
surface is unauthenticated**, `src/gateway/auth.ts` is dead code with no importers, and the token
the UI sends in every request (`ui/index.html:3162`) is discarded by the server. Two more
unauthenticated endpoints (`POST /api/update/apply`, `POST /api/skills/import`) reach `git` and
`npm` on the host. Everything else in this document is smaller than that.

## Scorecard

Effort = days for one experienced developer. "Absent" means verified against source, with a
`file:line` proof point; the proof point is where the capability would live if it existed.

| Capability | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| Transport | WebSocket + HTTP multiplexed on one port, default `18789` (`protocol/transport`) | Plain `node:http`, no WS server anywhere in `src/`; default `127.0.0.1:7788` (`server.ts:255`, `config.ts:155`) | Different class of thing | 12–20 (only if a WS protocol is actually wanted) |
| Wire protocol | `{type:"req"|"res"\|"event", id, method, params}` + TypeBox schemas, published `@openclaw/gateway-protocol`, versioned with an N-1 node window (`protocol/versioning`) | Hand-written `if (pathname === ...)` ladder: 56 exact matches + 9 regex patterns, 65 dispatch checks (`server.ts:602`–`1806`) | No typed contract, no schema, no version negotiation | 10 |
| Request/response correlation | `req.id` ↔ `res.id`, typed errors `{code,message,details?,retryable?,retryAfterMs?}` (`protocol/transport:88`) | `turnId` from `POST /api/chat` → poll `GET /api/chat/:sid/:turnId` (`server.ts:749`, `768`) | Ad-hoc; no error envelope, no `retryable` | 2 |
| Idempotency keys | Required on side-effecting methods (`protocol/transport:142`) | Absent — verified: `grep -i idempot src/` returns only unrelated comments (`paths.ts:85`, `wake-service.ts:107`) | No replay protection anywhere | 2 |
| Server-push events | `event` frames with outer `seq`, gap detection, reconnect baseline (`protocol/presence`) | One `GET /api/events` SSE stream, no seq, no resume, no replay (`server.ts:713`–`730`) | No gap detection; client must poll | 4 |
| Event bus | In-process diagnostics bus + plugin subscribers, many event families (`protocol/rpc-bootstrap-and-events`) | `Set<Handler>`, one process, one bus (`events.ts:8`) | Fine for single-process; no cross-process, no bounded queues | 1 |
| Auth enforcement | Fail-closed by default; token generated at onboarding even on loopback (`security/network-exposure:84`) | **Nothing is checked.** `server.ts:711` comment: `// Everything else under /api is open (login system removed for now).` No `checkToken` call exists; `auth.ts` has zero importers (verified by grep) | Critical | 2 |
| Auth modes | `token`, `password`, `trusted-proxy`, `none`; Tailscale identity headers (`config-gateway`) | One string `gateway.token` (`config.ts:45`), checked nowhere | Missing 3 of 4 modes | 3 |
| Rate limiting | Pre-auth WS connection cap (128/IP), auth-failure lockouts w/ `Retry-After`, post-auth control-plane write backstop (`security/rate-limiting`) | Absent — `grep -i 'rate.limit\|throttle' src/` returns only a 429 *parser* (`friendly.ts:60`) | No limiter of any kind | 3 |
| Loopback bind guard | `gateway.bind` enum; non-loopback requires auth | Present: refuses non-loopback bind without a token (`server.ts:257`–`262`) | Guard exists but guards nothing, because the token is never verified | 0 (already there) |
| Device identity / pairing | Ed25519 keypair, server nonce `connect.challenge`, signed v3 payload, per-device tokens, 5-min expiry, `deviceAutoApprove` (`protocol/auth`, `pairing`) | Absent — verified: no `deviceId`, `nonce`, `signature`, `attest`, or keypair code in `src/` | No client identity, no revocation, no per-client scope | 8 |
| Operator scopes | 7 scopes + named roles + identity grants + `sessions.others` visibility (`operator-scopes`) | Absent. Every caller is full operator | No least privilege; one token = everything | 6 |
| Secrets (SecretRef) | 4 providers (`env`/`file`/`exec`/`store`), id grammar, egress proxy with traffic allowlist, one-way safety (`secrets/secretref-contract`, `secret-store-and-egress`) | Plaintext secrets in `config.json` (written `0644`, `config.ts:220`); a separate `state/secrets.json` store at `0600` reachable by the agent tool (`agent/secrets.ts:30`, `toolbox.ts:1152`) | Two incoherent stores, no indirection, no egress control | 8 |
| Secret redaction on egress | Prompt/log redaction, `payload.large` events never carry bodies (`health:54`) | Prompt has one instruction line: `Never leak secrets` (`prompt.ts:176`). The `secrets` tool returns raw values to the model (`toolbox.ts:1152`) | Model sees raw secret values | 2 |
| Sandboxing | 6 backends (docker/podman/ssh/openshell/crabbox), mode `off\|non-main\|all`, scope `agent\|session\|shared`, `workspaceAccess`, per-chat opt-out (`sandboxing/*`) | None. `isolation: 'shared'\|'isolated'` in config (`config.ts:63`) is read nowhere — verified: `grep -rn isolation src/` returns no consumer. Only `code_exec` via Node `vm` (`tools.ts:665`), off by default | Absent. `exec` runs raw `sh -c` with `process.env` (`tools.ts:277`, `300`–`301`) | 15 |
| Tool policy / permission modes | Global + per-agent allow/deny, `tools.elevated` escape hatch, permission modes, read-only mode (`security/tool-permissions`, `permission-modes`) | One global boolean `agent.allowExec`, **default `true`** (`config.ts:156`), enforced only inside the `exec` tool (`tools.ts:270`) | No per-agent, no deny list, no read-only mode | 5 |
| Exec approvals | `exec-approvals` gate, `ask: off\|always`, node-local, capability approval requires `operator.admin` (`pairing:172`–`178`) | UI exists, engine does not. `createApproval`/`waitForApproval` are imported at `server.ts:78` and **never called** (verified: only `listApprovals`/`resolveApproval`/`cleanupOldApprovals` appear, at `973`–`981`) | Approvals list is permanently empty; no HITL anywhere | 5 |
| Sandbox SSRF policy | Browser SSRF strict-by-default, private-network opt-in flagged dangerous (`security/browser-control`) | `web_fetch` allows any `http(s)` URL incl. `169.254.169.254`, `redirect: 'follow'` (`tools.ts:140`, `149`) | Metadata-endpoint reachable from the model | 2 |
| Health probes | `/health`, `/healthz`, `/startup`, `/startupz`, `/ready`, `/readyz`, with gated detail, `503 starting`/`draining` (`health:79`–`91`) | One `GET /api/health` returning `{ok, name, version, uptimeSec, provider, telegram}` (`server.ts:648`) | No readiness vs liveness split; no startup/drain signal | 3 |
| Doctor | 21 numbered checks, `--fix`, `--lint`, `--force`, migrations (`doctor/*`) | ~24 checks, read-only, no `--fix`, no migrations (`mobile/doctor.ts:118`–`483`) | Diagnosis only; no repair | 6 |
| Observability / OTel | OTLP/HTTP metrics + traces + logs via `diagnostics-otel` plugin; Prometheus text metrics (`opentelemetry/*`, `prometheus`) | In-process run traces only, 100-run ring buffer, `GET /api/traces` (`core/tracing.ts:30`–`31`, `server.ts:661`). No OTLP, no Prometheus, no log export — verified: `grep -i 'otel\|prometheus\|/metrics' src/` returns only `mdToTelegramHtml` | No exporter at all; traces die with the process | 6 |
| Metrics endpoint | Prometheus text exposition (`prometheus`) | Absent | — | 3 |
| Log redaction | Structured redaction pipeline (`logging`) | `logger.ts` is console-only, 38 lines, no redaction; `/api/logs` reads the supervisor's stdout tee (`supervisor.ts:46`) unauthenticated (`server.ts:954`) | Any caller reads the whole log | 1 |
| Config surface | `openclaw.json` with strict validation, migrations, hot reload, RPC-driven writes, per-key audit (`configuration/*`) | One JSON file, `deepMerge` against defaults (`config.ts:174`), no schema, no validation. Hot reload via `fs.watch` (`server.ts:341` and again at `1837`) | Two watchers on one file; no validation | 4 |
| Config write auth | Post-auth control-plane write backstop + audit ledger | `POST /api/config` writes **any** dotted key unauthenticated (`server.ts:1214`–`1239`) | Critical | 1 |
| Self-update | `openclaw update` with candidate verification against `/startupz`, rollback (`troubleshooting/updates-and-rollbacks`) | `git pull --ff-only` + `npm install` + `npm run build` + respawn (`core/updater.ts:75`–`79`, `server.ts:1904`), triggered by unauthenticated `POST /api/update/apply` | Critical | 2 |
| Session store | SQLite per agent, `sessions.patch`, `sessions.patchMany`, lifecycle revisions, compaction policy (`config-agents/sessions`) | JSONL per session under `~/.termcrab/sessions`, rolling 80-entry trim (`sessions.ts:21`, `148`), `purgeOlderThan`, `rename`, markdown export | No locking, no fork/patch, no revision | 6 |
| Turn queue | Bounded start queue, FIFO + yielding, retryable `UNAVAILABLE` (`protocol/transport:89`–`106`) | `SessionQueue` FIFO per session, in-memory, unbounded (`sessions.ts:269`–`295`); `queueMode` config key is never read — verified: `grep -rn queueMode src/` returns only `config.ts:57` and `:156` | `queueMode` is dead config; queue grows without bound | 3 |
| Interrupt / cancellation | `sessions.abort`, `stopReason: "auth-revoked"` (`authentication:148`) | `POST /api/chat/:sid/interrupt` aborts one running turn (`server.ts:790`) | Present, single-turn only | 0 |
| Ports / networking | `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`; Tailscale Serve; `trustedProxies`; TLS pinning (`config-gateway`, `remote`, `stable-https-url`) | `gateway.host`/`gateway.port` (`config.ts:42`), `--host`/`--port` (`cli.ts:196`), default `7788`. No TLS, no `trustedProxies`, no forwarded-IP handling, no Tailscale | Plaintext HTTP only; cannot sit behind a proxy safely | 8 |
| Discovery | Bonjour/mDNS minimal-vs-full with a sensitive-field inventory (`security/network-exposure:57`–`80`) | Absent — no `discovery`/`mdns` code | Not a gap; absence is safer | 0 |
| Webhooks / ingress | `POST /hooks/agent`, `/hooks/wake`; shared `hooks.token`; `Authorization`/`x-openclaw-token` only (query token → `400`); 256 KiB body cap; 30s read timeout; 20 fails/60s → `429`; `allowedAgentIds`, `allowedSessionKeyPrefixes`, `mappings`, `presets`, `transformsDir` (`config-hooks`) | `POST /api/hooks/:id`, **token in config is never checked** (`server.ts:691`–`692` TODO), no agent allowlist, body cap 1 MB (`server.ts:93`), no limit, no retry | Critical | 3 |
| Portals | Managed Tailscale Serve or wildcard reverse proxy per dev server, separate sandbox origin, documented security model (`portals`) | `portal.json` id→port map, proxy to `127.0.0.1:<port>`, **no auth, no allowlist** (`server.ts:614`–`647`, `portal.ts:34`) | Authenticated LFI/SSRF primitive if the map is ever populated | 3 |
| Skills / plugins | Plugin system with manifests, permissions, install lifecycle, hot reload (`config-extensions`) | Skills = `SKILL.md` folders, 183-line registry (`skills/registry.ts`). No plugin system — verified: `grep -rni plugin src/` returns nothing | No extension point beyond skills | 10 |
| Multi-tenant hosting | Per-cell isolation ladder, "one trust boundary per gateway" (`multi-tenant-hosting`, `security`) | Single tenant by construction | Acceptable; document the boundary | 0 |
| Node fleet | Paired nodes, per-node tokens, capability surfaces, `node.invoke`, host stats (`pairing`) | Absent | Out of scope for Termux-first | n/a |
| Cloud Workers | Crabbox lease, placement, warm images, security model (`cloud-workers/*`) | Absent | Out of scope | n/a |
| Audit ledger | Metadata-only record families, cursors, retention, maintainer invariants (`audit`) | One append-only `state/secrets-audit.log` for secret reads/writes only (`agent/secrets.ts:38`–`44`). No ledger | No record of who did what | 8 |

Pages named in the brief that **do not exist** on docs.openclaw.ai (verified 404):
`gateway/architecture`, `gateway/ports`, `gateway/webhooks`, `gateway/presence`,
`gateway/nodes`, `gateway/plugins`, `gateway/skills`, `gateway/multi-agent`, `gateway/cron`,
`gateway/session-management*`. Nearest equivalents used above: `gateway` (runbook),
`gateway/config-gateway`, `gateway/config-hooks`, `gateway/protocol/presence`,
`gateway/pairing`, `gateway/config-extensions`, `gateway/config-agents/entries-and-multi-agent`,
`gateway/config-automation`, `gateway/config-agents/sessions`.

## Control plane & protocol

| | OpenClaw | TermCrab |
| --- | --- | --- |
| Roles | `operator` and `node` declared at handshake (`protocol/handshake`) | None |
| Scopes | `operator.read/write/admin/approvals/pairing/talk.secrets` + identity grants | None |
| Frames | `{type:"req"\|"res"\|"event"}` with `id`, `method`, `params`, optional `traceparent`, `expectedProfileId` | HTTP request/response; SSE `event: <type>\ndata: <json>` (`server.ts:721`) |
| Keepalive | WS ping/pong, 25s pong window, independent of agent heartbeats (`protocol/transport:190`) | SSE comment ping every 25s (`server.ts:723`) |
| Backpressure | Per-connection + aggregate waiting limits; retryable `UNAVAILABLE` with `retryAfterMs: 250` | None. `res.write` return value is ignored at `server.ts:721` |
| Versioning | Protocol version constants, N-1 node window (`protocol/versioning`) | `version()` reads `package.json` on demand (`server.ts:1948`) |

TermCrab's SSE writer at `server.ts:720`–`722` ignores the `res.write()` boolean. A slow browser
client grows an unbounded buffer in the Node stream with no drop, no `payload.large` event, and no
disconnect. OpenClaw's `maxBufferedBytes` and `payload.large` diagnostics (`protocol/transport:46`)
exist precisely because this fails in production.

Turn identity works and is the one genuinely well-designed piece: `POST /api/chat` returns
`202 {turnId, sessionId, status:"queued"}` (`server.ts:760`), the client polls
`GET /api/chat/:sid/:turnId` for `{status, output, error, queueLength}` (`server.ts:778`), and
`POST /api/chat/:sid/interrupt` aborts via `AbortController` (`server.ts:793`,
`sessions.ts:343`). What is missing is any way to know *whether* you are reading a fresh turn or a
stale one, and no idempotency key so a retried `POST` silently enqueues a second turn
(`protocol/transport:142` requires one; verified absent in `src/`).

## Configuration surface

| Concern | OpenClaw | TermCrab |
| --- | --- | --- |
| File | `openclaw.json`, schema-published, strict validation (`configuration:Strict validation`) | `~/.termcrab/config.json`, `deepMerge(defaults(), raw)`, JSON parse failure silently returns defaults (`config.ts:211`–`213`) |
| Hot reload | Reload modes, drain-before-restart, auth-mode changes need restart (`configuration/hot-reload`, `restart-recovery`) | `fs.watch` + 500ms debounce (`server.ts:301`), **and a second `fs.watch` + 120ms debounce** (`server.ts:1837`) on the same path |
| Write path | `config.rpc`, audited, post-auth backstop (`configuration/config-rpc`) | `POST /api/config` unauthenticated, any dotted key, regex only `/^[a-zA-Z][\w]*(\.[\w]+)+$/` (`server.ts:1218`) |
| Agent entries | `agents.entries.*` with per-agent sandbox/tools/model/workspace (`config-agents/*`) | Named agents = `workspace/agents/<name>/SOUL.md` only (`server.ts:1581`) |
| Channel config | Per-provider, per-account, shared policies, mention gating, commands (`config-channels/*`) | Flat `channels.*` with one allowlist each (`config.ts:71`–`118`) |
| Tool config | `tools.allow/deny`, per-agent overrides, policy inspector CLI (`config-tools/tool-policy`) | One `agent.allowExec` boolean |
| Migration | `doctor --fix` rewrites legacy keys (`doctor/config-migrations`) | `src/migrate/openclaw.ts` (558 lines) is a one-shot import, not a schema migration |

Two `fs.watch` registrations on one file is a real bug, not just untidiness: the 500ms watcher
(`server.ts:301`–`339`) re-resolves the provider, the 120ms watcher (`server.ts:1839`–`1869`)
mutates the live config object and logs token/host/port changes. Both call
`readExternalConfigChange()`, which is guarded against re-reading the process's own writes
(`config.ts:239`), so in practice you get one effective reload — but the ordering between them is
not defined, and the 120ms one can clobber `gateway.host`/`port` restoration against the 500ms
one's copy. Delete one.

`agent.queueMode` (`config.ts:57`) is documented in the config as `followup | steer | collect |
interrupt` and is never read outside `config.ts` itself. It is dead config that will mislead the
next reader. Same for `agent.isolation` (`config.ts:63`) — the comment promises "separate
memory/skills per agent" and nothing implements it.

## Auth, pairing & secrets

`src/gateway/auth.ts` (68 lines) implements exactly the right primitives: `checkToken` with
SHA-256 + `crypto.timingSafeEqual` (`auth.ts:16`–`24`), a `normalize` that strips `Bearer`
(`auth.ts:9`–`13`), a query-param fallback (`auth.ts:55`–`67`), and a genuinely thoughtful
`authHint` that explains *why* a login was refused, including the file-vs-memory token split
(`auth.ts:40`–`47`).

**None of it runs.** `grep -rn "checkToken\|authHint\|extractAuth" src/ ui/` matches only the
definitions inside `auth.ts` itself. The import was replaced by a comment at `server.ts:44`:
`// Auth removed for now — all /api/* endpoints are open.` The UI still sends the header:
`Object.assign({ 'authorization': 'Bearer ' + state.token }, opts.headers)` (`ui/index.html:3162`),
and still puts the token in the SSE query string (`ui/index.html:4151`). So the product presents
a login that does not exist.

Consequences, each independently reachable:

| Endpoint | What an unauthenticated caller gets |
| --- | --- |
| `GET /api/config` | Whole config, secrets masked (`server.ts:1199`; `redactConfig` at `118`) |
| `POST /api/config` | Write **any** dotted key: `gateway.host`, `agent.allowExec`, `channels.telegram.token` (`server.ts:1231`) |
| `GET /api/memory` | `MEMORY.md` up to 500 KB + stats (`server.ts:1136`) |
| `PUT /api/memory` | Overwrite `MEMORY.md` wholesale (`server.ts:1542`) |
| `GET /api/sessions`, `GET /api/sessions/:id` | Every conversation, verbatim (`server.ts:803`, `809`) |
| `GET /api/logs?lines=2000` | Full gateway log (`server.ts:954`) |
| `GET /api/events` | Live agent tool calls, args, and outputs (`server.ts:713`) |
| `POST /api/skills/import` | `git clone` of any URL (`server.ts:1570` → `importer.ts:82`) |
| `POST /api/update/apply` | `git pull` + `npm install` + `npm run build` + respawn (`server.ts:1740` → `updater.ts:75`–`79`) |
| `POST /api/chat` | Run the agent, which by default has shell (`server.ts:732` → `tools.ts:270`, `allowExec` default `true`) |
| `POST /api/hooks/:id` | Feed attacker-controlled text straight into a prompt (`server.ts:701`) |
| `/portal/<id>/...` | Proxy to any registered local port (`server.ts:614`) |
| `POST /api/onboard` | Set provider apiKey/baseUrl/model, agent name, allowExec, port (`server.ts:1744`) |

Pairing is entirely absent. No keypair, no nonce, no signature, no device record, no approval
queue, no revocation — verified by grep across `src/` for `pairing|deviceId|nonce|signature|attest`
(only hits: a WhatsApp QR comment at `channels/whatsapp.ts:14`, a skill "repair" action in
`toolbox.ts:1044`, and an `apiKey-fingerprint` comment in `providers/probe.ts:13`). OpenClaw's
`protocol/auth` describes ~50 lines of subtlety here (nonce binding, v2/v3 payload migration,
`DEVICE_AUTH_*` detail codes, per-role token scoping, `canRetryWithDeviceToken` recovery hints).
None of it has a counterpart.

Secrets are split across two unreconciled stores:

- `config.json` — every provider key, telegram token, discord/slack/signal/sms/matrix tokens,
  gateway token. Written with `fs.writeFileSync(p, raw, 'utf8')` and no `mode`
  (`config.ts:220`) → `0644` under a normal umask, world-readable on a shared host. OpenClaw's
  `security/secrets-and-storage` has an explicit "File permissions" section; TermCrab has no
  equivalent and no `chmod`.
- `state/secrets.json` — a separate store, correctly `0600` (`agent/secrets.ts:30`–`35`), with an
  append audit log (`agent/secrets.ts:38`–`44`). Reached only through the `secrets` agent tool
  (`toolbox.ts:1143`–`1158`), whose `request` action hands the raw value straight back to the
  model with no approval (`toolbox.ts:1152`). So "protected credentials" are protected from the
  filesystem but not from the LLM.

The only masking anywhere is on the way out to the UI (`redactConfig`, `server.ts:118`–`132`), which
masks keys literally named `token`/`apiKey`/`key` (`server.ts:111`). `password`, `secret`,
`accessToken`, `authToken`, and `botToken` are not in that set — `channels.matrix.accessToken`
(`config.ts:113`) and `channels.slack.botToken` (`config.ts:93`) are returned by
`GET /api/config` in full. `maskSecret` (`server.ts:113`) also shows first and last two characters,
which is a reasonable trade; the missing keys are not.

## Sandboxing & isolation

| | OpenClaw | TermCrab |
| --- | --- | --- |
| Backends | docker, podman, ssh, openshell, crabbox (`sandboxing/modes-scope-and-backend:17`) | None |
| Mode | `off` / `non-main` / `all`; `non-main` always sandboxes group/channel sessions | None |
| Scope | `agent` / `session` / `shared` | Config *claims* `isolation: 'shared' \| 'isolated'` (`config.ts:63`), never read |
| Workspace access | `workspaceAccess: none`, read-only binds, per-folder grants (`sandboxing/workspace-access`) | `resolveInRoots` bounds `read_file`/`write_file`/`list_dir` to `[home(), cwd()]` (`tools.ts:183`) |
| Exec | Runs inside the sandbox unless `tools.elevated` | Unbounded `sh -c <command>` with full `process.env` (`tools.ts:277`, `300`–`301`) |
| Container retention/revocation | Verified stop-and-check on access revoke (`modes-scope-and-backend:90`–`105`) | n/a |
| Sandbox inspection | `openclaw sandbox list` / `explain` / `recreate` | None |

The one thing TermCrab does have is worth stating clearly: **file tools are root-bounded**.
`buildTools` computes `roots = [home(), process.cwd(), ...extraRoots]` (`tools.ts:183`) and every
file tool routes through `resolveInRoots` before touching the disk (`tools.ts:207`, `229`, `246`).
That is a real containment boundary and it is more than OpenClaw's default install gives you
without configuring `workspaceAccess`.

But `exec` bypasses it entirely. `allowExec` defaults to `true` (`config.ts:156`), so out of the
box the agent has an unrestricted shell with the full environment — which on Termux includes
`GH_TOKEN`, `OPENAI_API_KEY`, `AWS_*`, and every Termux token. `resolveShell` (`tools.ts:104`–`122`)
walks `$SHELL` → `$PREFIX/bin/bash` → `/system/bin/sh` → `/bin/sh`. The background-process path
(`tools.ts:275`–`286`) spawns detached with `stdio` piped and keeps a 100 KB ring buffer, with no
cap on how many can exist.

`code_exec` (`tools.ts:513`–`527`, `660`–`702`) is a genuine Node `vm` context with no network, no
`require`, no `fs`, and a timeout. It is off by default (`allowCodeExec: false`, `config.ts:156`)
and there is no "sandbox" story attached to it — it is one tool, not a mode. Do not count it as
sandboxing.

OpenClaw is explicit that its own sandboxing is "not a perfect security boundary, but it materially
limits filesystem and process access when the model does something dumb"
(`sandboxing:12`). TermCrab currently has nothing at that level except the file-root bound.

## Observability, health & doctor

| Signal | OpenClaw | TermCrab |
| --- | --- | --- |
| Liveness | `/health`, `/healthz` → `{"ok":true,"status":"live"}` (`health:182`) | `/api/health` → `{ok, name, version, uptimeSec, provider, telegram}` (`server.ts:648`) |
| Startup | `/startupz` `503 starting` / `draining` / `200 started` | None |
| Readiness | `/readyz`, gated detail, `failing: ["state-database", …]`, `retryAfterMs` | None |
| Structured snapshot | `openclaw health --json`, per-channel probes, ingress-pressure warnings (`health:199`–`234`) | `POST /api/doctor` → `Check[]` (`server.ts:1477`) |
| Health monitor | Per-channel restart ladder, then health monitor as last resort (`health:60`–`71`) | Termux supervisor: exponential backoff to 30s, reset after a 60s stable run (`supervisor.ts:63`–`66`) |
| CPU/event loop | `eventLoop.cpuCoreRatio`, `mainThreadCoreRatio`, `workerCoreRatio`, `otherThreadsCoreRatio` (`health:140`–`159`) | None |
| Metrics | Prometheus text (`prometheus`), OTLP (`opentelemetry`) | None |
| Traces | OTel spans, `traceparent` continued onto provider calls (`opentelemetry:23`) | 100-run in-memory ring, `GET /api/traces` (`tracing.ts:30`–`31`) |
| Stability recorder | Snapshot under `logs/stability/` on fatal exits (`health:55`) | None |
| Support bundle | `openclaw gateway diagnostics export` → redacted zip (`diagnostics`) | `termcrab doctor --share` prints a text report (`cli.ts` HELP) |
| Event-loop lag | Sampled, windowed, no measurement → field absent, not zero | None |

`/api/health` is the only probe, and it lies by omission: it reports `ok: true` unconditionally
(`server.ts:650`) even when every channel has failed and the provider key is dead. Worse,
`mobile/doctor.ts:70`–`78` (`probePanelHealth`) reads `data.authRequired` from that response,
and `server.ts:648`–`658` never sets the field — so it always resolves `false`.
`probeGatewayToken` (`doctor.ts:93`–`107`) treats a `401` as "token mismatch", but the server
never returns `401` for `/api/config`, so it always returns `'ok'`. Both are latent lies in the
one diagnostic that is supposed to tell you the truth.

`tracing.ts` is a decent minimal implementation — `startRun`/`addSpan`/`addToolCall`/`endRun`,
token counts, bounded at 100 runs (`tracing.ts:31`, `45`–`48`) — but it is per-process memory.
`GET /api/traces` (`server.ts:661`) is the only consumer. Nothing persists, nothing exports, and
`Span.children` (`tracing.ts:13`) is declared and never populated: `addSpan` always pushes flat
(`tracing.ts:70`).

## Session management in the gateway

| Concern | OpenClaw | TermCrab |
| --- | --- | --- |
| Store | SQLite per agent (`health:52`) | JSONL per session, `~/.termcrab/sessions/*.jsonl` (`sessions.ts:29`, `34`) |
| ID safety | Server-issued keys | `sanitizeSessionId` strips to `[A-Za-z0-9_.:-]`, caps 64 (`sessions.ts:23`–`26`) |
| Retention | Per-store policy, lifecycle revisions | Rolling 80 entries via `maybeTrim` (`sessions.ts:21`, `148`–`156`) |
| Compaction | Config policy, heartbeat-driven | `compact()` summarises into `memory/compacted/<id>.md` (`sessions.ts:164`–`191`). Verified: called from `agent/loop.ts`, not from the gateway |
| Mutate | `sessions.patch` / `patchMany` with `expectedLifecycleRevision` CAS | `rename` (CAS on name collision only, `sessions.ts:133`) |
| Purge | Retention-driven | `purgeOlderThan` — deletes `.jsonl` and `.bak` (`sessions.ts:111`–`130`) |
| Export | Native | `exportMarkdown` (`sessions.ts:94`) |
| Reset | Fork / patch | `reset()` **renames to `.bak`** (`sessions.ts:67`–`73`) — does not free disk until a purge runs |

`reset()` renaming rather than deleting means every "start a new chat" leaves a full copy on disk
(`server.ts:816`). On a phone's internal storage that is the wrong default, and `/api/sessions/purge`
defaults to `olderThanDays: 30` (`server.ts:841`) so recent `.bak` files pile up.

Queue behaviour: `SessionQueue` (`sessions.ts:269`) is per-session FIFO with a `running` map
holding at most one turn per session. That part is sound — `interrupt` correctly finds the
`AbortController` keyed `${sessionId}:${turnId}` (`sessions.ts:346`). What is missing: the queue
arrays have no length cap (`enqueue` at `sessions.ts:277` is an unconditional `push`), `completed`
is capped at 100 but the queued arrays are not (`sessions.ts:284`–`287`), and `clear()` is
test-only. OpenClaw returns retryable `UNAVAILABLE` with `retryAfterMs: 250` when start capacity
is exhausted (`protocol/transport:104`–`106`).

Also note: `POST /api/chat` takes `sessionId` from the request body with no validation
(`server.ts:742`) and no ownership check, so any caller can append to, read, or `DELETE` any
session id including `web:main`. `sanitizeSessionId` prevents path traversal but nothing prevents
cross-session writes.

## Ports, networking & remote access

| | OpenClaw | TermCrab |
| --- | --- | --- |
| Default | `18789` (`config-gateway`) | `7788` (`config.ts:155`, `server.ts:255`) |
| Bind enum | `auto`/`loopback`/`lan`/`tailnet`/`custom` | Free-text `gateway.host`, default `127.0.0.1` (`config.ts:155`) |
| Precedence | `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789` | `--port` > `gateway.port` > `7788`; no env var |
| Non-loopback guard | Requires auth, always | Requires a token to be *set* (`server.ts:257`–`262`) — but the token is never checked, so the guard is decorative |
| TLS | `gateway.tls`, cert renewal, HSTS, `tlsFingerprint` pinning | None. `http.createServer` only (`server.ts:602`) |
| Trusted proxies | `gateway.trustedProxies`, CIDR-aware, IPv4-mapped forms, `proxy_attribution_required` 403 | None. No `X-Forwarded-For` handling at all |
| Tailscale | Serve/funnel, `allowTailscale`, `tailscale whois` identity headers | None |
| Remote client | SSH tunnel with `LaunchAgent`, host-key policy, `edgeAuth` | None |
| Multiple instances | `--profile`, derived port map, isolation checklist (`multiple-gateways`) | None. PID file is written but never checked for a conflict (`server.ts:1828`) |

The `gateway.host` free-text field is the sharp edge. `isLoopback` compares against exactly
`'127.0.0.1'`, `'::1'`, `'localhost'` (`server.ts:257`). Any other value — including `'0.0.0.0'`,
`'::'`, a hostname, or a typo — is treated as non-loopback, which is the safe direction. But
because auth is not enforced, "non-loopback with a token set" is indistinguishable from "no auth
at all". The startup message at `cli.ts:207`–`210` even prints the token to stdout.

Placing TermCrab behind a reverse proxy today is unsafe in a specific way: it will serve whatever
`Host` it is given, has no `allowedOrigins` concept, no forwarded-IP attribution, and no way to
distinguish a loopback proxied request from a genuinely local one. OpenClaw's
`security/network-exposure:126`–`138` and `trusted-proxy-auth` describe exactly the failure modes
you would hit; TermCrab has no defence against any of them.

## Webhooks & ingress

| Field | OpenClaw (`config-hooks`) | TermCrab |
| --- | --- | --- |
| Endpoints | `POST /hooks/agent`, `/hooks/wake`, configurable `hooks.path` | `POST /api/hooks/:id`, fixed path (`server.ts:683`) |
| Enabled | `hooks.enabled: false` by default, requires non-empty token | Always on if a hook id exists in config |
| Credential | `hooks.token`, `Authorization: Bearer` or `x-openclaw-token`; **query `token` → `400`** | `hooks[].token` exists in config (`config.ts:70`) and is **never read** — `server.ts:691`–`692` is a literal `TODO` |
| Body cap | 256 KiB, 30s read timeout | 1 MB (`readBody` default, `server.ts:93`), no timeout |
| Rate limit | 20 fails / 60s → `429` + `Retry-After`, loopback not exempt | None |
| Agent allowlist | `allowedAgentIds` | None |
| Session key policy | `allowRequestSessionKey`, `allowedSessionKeyPrefixes` | Fixed `hook:<id>` (`server.ts:700`) |
| Mapping | Ordered `mappings`, `presets`, `transformsDir` constrained to a root with symlink containment | None — the configured `prompt` is concatenated verbatim (`server.ts:701`) |
| Result | `200 {ok, runId}` or `waitForCompletion` with bounded terminal facts | `202 {ok, turnId, hookId}` |

The `hooks` config has no CLI surface — `termcrab` has no `hooks` subcommand (`cli.ts` case list,
`193`–`938`) — so the only way to create one is
`termcrab config set hooks '[{"id":"x","token":"y","prompt":"z"}]'`, which means nobody will ever
set a token, which means the TODO at `server.ts:692` is not a temporary oversight but the steady
state.

## Security gaps

Ranked by what an attacker actually gets.

1. **`/api` is completely unauthenticated and the auth code is dead.** `server.ts:711` says so in a
   comment. `auth.ts` has no importers. The UI sends a bearer token into the void
   (`ui/index.html:3162`). Every one of the 56 path shapes is public. Effort: 2 days.
2. **Unauthenticated remote code execution, twice over.**
   `POST /api/update/apply` (`server.ts:1721`) → `git pull --ff-only origin <branch>` +
   `npm install` + `npm run build` + detached respawn (`updater.ts:75`–`79`, `server.ts:1904`).
   `POST /api/skills/import` (`server.ts:1562`) → `execFile('git', ['clone', ...])` of an
   attacker-chosen URL (`importer.ts:82`), or a local path walk (`importer.ts:91`), writing
   attacker-controlled Markdown into the system-prompt index (`loader.ts:82`–`85`). Effort: 1 day
   to gate both behind auth; 3 to design the right replacement.
3. **Unauthenticated arbitrary config write.** `POST /api/config` (`server.ts:1214`) accepts any
   key matching `/^[a-zA-Z][\w]*(\.[\w]+)+$/`. A caller can set `agent.allowExec=true`,
   `gateway.host=0.0.0.0`, `gateway.token=""`, or redirect `provider.baseUrl` at a key-harvesting
   endpoint and then `POST /api/chat` to exfiltrate. Effort: 1 day.
4. **Webhook token never checked** (`server.ts:691`–`692`), and the payload is concatenated
   straight into the prompt (`server.ts:701`). That is an unauthenticated prompt-injection
   primitive with a shell behind it. Effort: 0.5 day.
5. **No rate limiting anywhere.** No limit on `POST /api/chat`, no limit on `POST /api/crons/:id/run`
   (which runs an agent turn synchronously, `server.ts:933`), no limit on the SSE connection count
   (`server.ts:713`), no failed-auth limiter because there is no auth. Cost amplification is one
   curl loop. Effort: 3 days.
6. **The portal proxy is unauthenticated.** `/portal/<id>/*` forwards to `127.0.0.1:<portal.port>`
   with no auth and no per-request capability (`server.ts:614`–`647`). `addPortal` is only
   reachable from a CLI path, so today the map is normally empty — but the moment a portal exists,
   every local port in it is internet-reachable through the gateway. OpenClaw runs portals on a
   separate origin behind Tailscale Serve for exactly this reason (`portals:Security model`).
7. **Secrets on disk at `0644`.** `config.json` carries every provider and channel token and is
   written without a mode (`config.ts:220`). On a shared host or a Termux device with other apps in
   the same group, that is readable. Only `state/secrets.json` gets `0600`
   (`agent/secrets.ts:30`). Effort: 0.5 day.
8. **Redaction misses keys.** `SECRET_LEAF_KEYS = {token, apiKey, key}` (`server.ts:111`) omits
   `password`, `secret`, `accessToken`, `authToken`, `botToken`. `channels.matrix.accessToken`
   (`config.ts:113`) and `channels.slack.botToken` (`config.ts:93`) are served in full by
   `GET /api/config`. Effort: 0.5 day.
9. **`web_fetch` has no SSRF guard.** Any `http(s)` URL with `redirect: 'follow'`
   (`tools.ts:140`, `149`). The model can read `http://169.254.169.254/latest/meta-data/` on a
   cloud VM. OpenClaw treats this as a first-class threat with a documented strict-by-default
   policy and a `dangerouslyAllowPrivateNetwork` break-glass (`security/browser-control`).
   Effort: 2 days.
10. **Unbounded SSE backpressure.** `res.write()` return value ignored (`server.ts:721`). One slow
    client grows the process heap without limit. Effort: 1 day.
11. **No TLS, no proxy trust model.** Plain `http.createServer` (`server.ts:602`). Bearer tokens
    and full transcripts cross the wire in cleartext on any LAN bind. OpenClaw's
    `security/network-exposure:174`–`181` is blunt about this; TermCrab has no equivalent knob.
    Effort: 8 days.
12. **Unbounded `exec` with full env, enabled by default.** `tools.ts:277`, `tools.ts:300`,
    `config.ts:156`. Effort: 2 days to make `allowExec` default `false` and add a deny list.
13. **No audit trail for anything that matters.** One append-only log for secret reads/writes
    (`agent/secrets.ts:38`). No record of who called `/api/config`, imported a skill, or approved a
    cron. OpenClaw's `audit` page is a whole subsystem with cursors and retention.
14. **Approval UI with no approval engine.** `createApproval` and `waitForApproval` are imported at
    `server.ts:78` and never invoked. `GET /api/approvals` will always return `[]`; the UI implies
    a human-in-the-loop gate that does not exist.

## Loopholes and correctness bugs

| # | Bug | Evidence |
| --- | --- | --- |
| 1 | `POST /api/sessions/:id/replay` writes outside the sessions directory. `newId = \`replayed:${id}\`` is never passed through `sanitizeSessionId`, then handed to `path.join(sessionsDir(), \`${newId}.jsonl\`)`. `id = "../../evil"` → components `replayed:..`, `..`, `evil.jsonl` → resolves to `~/.termcrab/evil.jsonl`. Requires an existing source session, so it is a write-what-where, not RCE. | `server.ts:830`–`835` |
| 2 | `probeGatewayToken` can never return `'mismatch'`. It maps `401` → `'mismatch'`, but `/api/config` always answers `200`. Doctor reports "ok" for any token, including a wrong one. | `doctor.ts:93`–`107` vs `server.ts:1186` |
| 3 | `probePanelHealth` reads a field that does not exist. Reads `data.authRequired`; `/api/health` never emits it. Always `false`. | `doctor.ts:70`–`78` vs `server.ts:648`–`658` |
| 4 | Two `fs.watch` registrations on `config.json` with different debounces (500ms and 120ms) that both mutate the same live object. Ordering between them is undefined. | `server.ts:341` and `server.ts:1837` |
| 5 | `agent.queueMode` is documented config with no consumer. `grep -rn queueMode src/` → `config.ts:57`, `config.ts:156` only. | `config.ts:57` |
| 6 | `agent.isolation` (`shared`/`isolated`) has no consumer. Same grep result. | `config.ts:63` |
| 7 | `SessionQueue.enqueue` has no length cap and no per-session admission control. A `POST /api/chat` loop grows `this.queues` without bound; only `completed` is capped (100). | `sessions.ts:277`–`288`, `317`–`320` |
| 8 | `sessions.reset()` renames instead of deleting (`f` → `f.<ts>.bak`). `DELETE /api/sessions/:id` calls it (`server.ts:816`), so an API caller labelled "delete" does not free a byte until `POST /api/sessions/purge` runs. | `sessions.ts:67`–`73` |
| 9 | `Span.children` is declared and never populated. `addSpan` always pushes flat, so the trace tree OpenClaw relies on cannot be built. | `tracing.ts:13` vs `tracing.ts:70` |
| 10 | `tracing.ts:3` documents "optional OTel endpoint". There is none. The comment misleads. | `tracing.ts:3`, grep confirms |
| 11 | `supervisor.ts:9` claims "single-instance lock" in its doc comment. There is no lock — no `EADDRINUSE` pre-check, no PID comparison. Two supervisors will fight over one port and one PID file. | `supervisor.ts:8`–`13`, `36`–`70` |
| 12 | The gateway writes `state/gateway.pid` unconditionally after `listen` (`server.ts:1828`) and deletes it in `stop()` (`:1939`). A second instance that fails to bind has already overwritten the first's PID, so `doctor` (`doctor.ts:285`–`286`) reports the wrong process. | `server.ts:1828`, `1939` |
| 13 | `server.ts:695` `JSON.parse(raw)` on the webhook body is unguarded. A malformed body produces a `500` carrying the raw `JSON.parse` message rather than a `400`. | `server.ts:694`–`695` |
| 14 | `config.ts:211`–`213`: a corrupt `config.json` silently returns `defaults()`, and `saveConfig` will then overwrite the user's file with defaults on the next write. Data loss on a syntax error. | `config.ts:211`, `216`–`222` |
| 15 | `loadConfig` does not validate. `gateway.port` is read unvalidated at `server.ts:255`; a string port reaches `server.listen` and throws at `1824`. | `server.ts:255` |
| 16 | `cli.ts:209` prints the gateway token to stdout, and `cli.ts:207` prints the bind address. Both land in `logs/gateway.log` via the supervisor's stdout tee (`supervisor.ts:46`), which is readable via unauthenticated `GET /api/logs` (`server.ts:954`). Token in logs. | `cli.ts:207`–`210`, `supervisor.ts:46` |
| 17 | `auth.ts:18`–`21` returns `true` when no token is configured, with a comment claiming loopback is "enforced at server start". That enforcement is at `server.ts:257` and only gates *binding*, not requests. If this dead code is ever wired up naively it becomes a bypass. | `auth.ts:18`–`21` |
| 18 | `readBody` has no timeout. A client that opens a POST and never finishes holds the socket and the handler indefinitely (1 MB cap only). OpenClaw uses a 30s body-read timeout (`config-hooks`). | `server.ts:93`–`109` |
| 19 | The `browser` tool is a stub that returns placeholder strings for screenshot/click/fill, gated on `allowBrowser` (default `false`). `config.ts:59` advertises "Playwright/CDP, read-only"; the implementation is HTTP-only text extraction. | `tools.ts:589`–`599`, `625`–`656` |
| 20 | `GET /api/logs?level=` filters with `all.filter(l => l.includes(level.toUpperCase()))` — a substring match, so `level=WARN` also matches any line containing "warn" anywhere, and `level=ERROR` misses `error:` lines that were coloured-wrapped. Weakly wrong, not dangerous. | `server.ts:961`–`963` |

## Sequenced worklist

Ordered so each item is independently shippable and reduces risk fastest. Days for one experienced
developer.

### Block 0 — close the holes (4 days, no new features)

| # | Item | Effort |
| --- | --- | --- |
| 1 | Wire `checkToken` into the request handler. One guard at the top of the `pathname.startsWith('/api/')` branch; allowlist `/api/health`, `/api/setup`, `/api/status` as unauthenticated reads. Make the no-token case fail closed unless loopback. Delete the `// Auth removed` comment at `server.ts:711` and the dead-import comment at `:44`. | 2 |
| 2 | Validate `hooks[].token` in the webhook handler (`server.ts:691`); add `hooks.enabled` and reject query-param tokens the way OpenClaw does (400). | 0.5 |
| 3 | Require auth on `POST /api/update/apply` and `POST /api/skills/import`. Both are already behind item 1, so this is a verification pass plus a regression test. | 0.5 |
| 4 | Flip `agent.allowExec` default to `false` (`config.ts:156`) and add an `agent.execAllowlist` denylist hook at `tools.ts:270`. | 1 |

### Block 1 — make the diagnostics honest (3 days)

| # | Item | Effort |
| --- | --- | --- |
| 5 | Add `/healthz` (liveness) and `/readyz` (provider reachable + at least one channel or web enabled + config valid), matching `health:79`–`91`. Return `503` when not ready. | 1.5 |
| 6 | Emit `authRequired` from `/api/health` (`server.ts:648`) so `probePanelHealth` stops lying. Make `probeGatewayToken` compare against the real token when the server exposes a hash, or drop the 401 assumption. | 0.5 |
| 7 | Add `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on `/api/config`, and a `strict` key allowlist for `POST /api/config` — deny writes to `gateway.host`, `gateway.port`, `gateway.token` from HTTP entirely (CLI-only). | 1 |

### Block 2 — containment (6 days)

| # | Item | Effort |
| --- | --- | --- |
| 8 | Private-network SSRF guard on `web_fetch` (`tools.ts:140`): resolve the hostname, reject RFC1918 / link-local / `::1` / `169.254.0.0/16` / unique-local, re-check on every redirect hop (`redirect: 'manual'` + manual loop). Add `browser.dangerouslyAllowPrivateNetwork` as the documented break-glass, matching `security/browser-control`. | 2 |
| 9 | Bounded SSE writes: honour the `res.write()` return value at `server.ts:721`, drop the subscriber when the buffer exceeds N KB, emit a `payload.large` event with byte sizes only. Add a hard cap on concurrent `/api/events` connections. | 1 |
| 10 | Bound `SessionQueue`: max queue length per session and max sessions, return `503 {retryable:true, retryAfterMs:250}` when full (mirrors `protocol/transport:104`). Wire `config.agent.queueMode` or delete the key. | 1.5 |
| 11 | `sessions.reset()` unlinks instead of renaming (`sessions.ts:67`), or change `DELETE /api/sessions/:id` to call a real delete while keeping reset as rename for the `/new` flow. | 0.5 |
| 12 | Fix the replay path traversal: `sanitizeSessionId` the `replayed:` id before `path.join` (`server.ts:833`). One line. | 0.25 |
| 13 | Delete the duplicate `fs.watch` (`server.ts:341`), the dead `agent.isolation` and `agent.queueMode` keys, the misleading `tracing.ts:3` OTel comment, and the false "single-instance lock" comment in `supervisor.ts:9`. | 0.75 |

### Block 3 — observability (8 days)

| # | Item | Effort |
| --- | --- | --- |
| 14 | Replace `logger.ts` with a file-backed structured logger writing `logs/gateway.log` directly (today it is console-only and relies on the supervisor's tee, so `termcrab gateway` without the supervisor writes no log at all while `GET /api/logs` silently returns `[]` at `server.ts:967`). Add level, redaction of token-shaped strings, and rotation. | 2 |
| 15 | Prometheus text endpoint at `/metrics`, auth-gated: run counters, turn latency histogram, queue depth gauge, tool-call duration/count, memory stats. `prometheus.ts` is 526 lines of OpenClaw reference; a 150-line version is enough. | 2 |
| 16 | OTLP/HTTP protobuf exporter for `tracing.ts` spans behind an opt-in config flag. Requires adding two runtime dependencies (currently zero — `package.json` devDeps only), which is a real decision for a "zero native dependencies" project. Consider a push-to-remote-write HTTP exporter instead to stay dependency-free. | 3 |
| 17 | Wire the existing approval primitives into the `exec` tool: `createApproval` → SSE `approval` event → `waitForApproval`, honouring `config.agent.askBeforeExec`. The plumbing is written; only the call sites are missing. | 1 |

### Block 4 — identity & least privilege (14 days)

| # | Item | Effort |
| --- | --- | --- |
| 18 | Real auth modes: split `gateway.token` into `gateway.auth = {mode, token\|password}`, accept `OPENCLAW_GATEWAY_TOKEN`/`_PASSWORD`, reject blank/`undefined`/`null` at startup the way `security/network-exposure:106` requires, and generate a token during `onboard` even on loopback. | 3 |
| 19 | Failed-auth limiter: per-IP and per-credential-class lockouts with `429` + `Retry-After`, `exemptLoopback` default `true`, hot-applied on config change. | 2 |
| 20 | Device identity: Ed25519 keypair in the browser (pure-JS, so it works on plain HTTP per `security/network-exposure:176`), server nonce challenge, signed v2 payload, per-device+role tokens, 5-minute approval expiry, `device.token.rotate`/`revoke`. | 6 |
| 21 | Operator scopes on the 56 existing routes. Cheapest useful cut: three scopes (`operator.read`, `operator.write`, `operator.admin`), `403 {error:{details:{code:"MISSING_SCOPE",missingScope,requiredScopes}}}` per `protocol/transport:128`, `operator.admin` required for `/api/config` writes, `/api/update/*`, `/api/skills/import`, `/api/onboard`. | 3 |

### Block 5 — ingress, network & sandboxing (23 days)

| # | Item | Effort |
| --- | --- | --- |
| 22 | Webhook ingress rebuild: shared `hooks.token` distinct from gateway auth, `hooks.enabled`, `allowedAgentIds`, `allowedSessionKeyPrefixes`, 256 KiB cap, 30s read timeout, 20-fails/60s throttle, per-hook rate limit. `config-hooks` is the spec. | 3 |
| 23 | `trustedProxies` support: CIDR-aware forwarded-client-IP resolution (including IPv4-mapped IPv6), `403 proxy_attribution_required` when proxy headers arrive from an untrusted source, `allowRealIpFallback: false` default. Without this, TermCrab must not be put behind a reverse proxy — write that into the README. | 3 |
| 24 | TLS in the gateway (`https.createServer`, optional cert paths in config) plus `strictTransportSecurity` support. Or document Termux-reality clearly: Tailscale Serve in front, nothing else. | 8 |
| 25 | Portal hardening: per-port capability token, separate path prefix, refuse to proxy to ports not in an explicit allowlist, and never forward `Authorization`. Today `/portal/*` is an open proxy to whatever is in `state/portal.json`. | 2 |
| 26 | Sandbox, minimum viable: Docker backend only, `mode: off\|non-main\|all`, `scope: session`, `workspaceAccess: none` with a read-only bind of the workspace, `exec` and `write_file` routed through the container, everything else host-side. `sandboxing/docker-backend` + `modes-scope-and-backend` are the spec. Do not attempt SSH/podman/openshell/crabbox. | 6 |
| 27 | `/api/traces` persistence: write `RunTrace` to `state/traces/<runId>.json` and add time-bounded retention, so traces survive a restart. Populate `Span.children` (`tracing.ts:13`). | 1 |

Items 1–4 are four days and take the product from "open RCE on the network" to "single-operator
local service". Do those before anything else in this list. Items 20, 21 and 26 are the ones that
make TermCrab honestly comparable to OpenClaw's documented gateway; they are 25 days together and
are not achievable alongside the agent-side work.