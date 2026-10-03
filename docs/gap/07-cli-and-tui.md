# CLI, TUI, and reference — gap report

TermCrab's CLI is one 1023-line `switch` statement with 22 top-level commands (`src/cli.ts:148`–`1022`) and zero subcommand framework, zero per-command `--help`, and `--json` on exactly one command (`doctor`, `src/cli.ts:238`). There is **no TUI**: the interactive terminal surface is a `readline` line REPL at `src/cli.ts:336`–`375` with four slash commands, and a repo-wide grep proves there is no raw-mode stdin, no alternate-screen buffer, and no cursor control anywhere in `src/` (see "The TUI question" below). OpenClaw, by contrast, ships 101 CLI pages, a full-screen TUI with 30+ slash commands and 10 keyboard shortcuts (`/web/tui`), a `--json` contract with a documented failure envelope (`/cli#json-failures`), and a seven-page `doctor` split by reader job. The asymmetry that matters for you is not feature count — it is that **every capability the web panel has is reachable from the browser and unreachable from the terminal**: providers, models, logs, tool catalog, canvas, traces, portal, approvals, live voice, auto-update-apply, and slash commands all exist only as `/api/*` routes with no CLI counterpart. TermCrab's own comparison doc already miscounts its own surfaces (`docs/openclaw-vs-termcrab.md:22`–`25`) — it claims a TUI and claims "no MCP", both of which are wrong.

## Scorecard

Effort = days for one experienced developer. "Absent" means verified against source with the `file:line` where the capability would live.

### A. CLI surface mechanics

| Capability | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| Top-level command count | 101 documented pages, ~90 commands (`/cli`) | 22 (`src/cli.ts:148`–`1022`) | 68 commands missing | — |
| Command list document | `openclaw --help`, `openclaw <cmd> --help`, `/cli` index table | One `HELP` string, `src/cli.ts:38`–`76`; printed for `help`/`-h`/`--help` and for unknown commands (`:1018`–`1021`) | Single flat text blob; no grouping beyond two prose headers | 0 |
| Per-command `--help` | Every command documents its flags; unknown root options fail with an option error + hint (`/cli`) | None. `parseArgs` is strict and throws `ERR_PARSE_ARGS_UNKNOWN_OPTION`, which surfaces as `[termcrab] Unknown option '--help'` and a fix line pointing at `doctor` (verified: `termcrab gateway --help` → `[termcrab] Unknown option '--help'` / `→ Run: termcrab doctor`) | Broken UX on 21 of 22 commands | 2 |
| Global flags before the command | `--dev`, `--profile`, `--container`, `--log-level`, `--no-color`, `--update`, `-V` (`/cli`) | None. `main()` takes `[cmd, ...rest]` with no global parser (`src/cli.ts:144`). Only `-h`/`-v` are handled, and only in the command position | No `--profile` isolation, no `--no-color`, no `--log-level` | 3 |
| `--` terminator | `openclaw -- config get gateway.port` works (`/cli`) | None | Absent | 0.5 |
| Shell completion | `openclaw completion` (`/cli/completion`) | Absent — verified: `termcrab completion bash` → `unknown command: completion` | Absent | 1 |
| `--json` on bounded commands | Reserved stdout, styling off, warnings to stderr, documented failure envelope `{"ok":false,"error":{"type":"cli_error","message":...}}` (`/cli#output-modes`, `/cli#json-failures`) | Only `doctor --json` (`src/cli.ts:238`, `258`–`260`). Every other command silently ignores the flag — verified: `termcrab status --json` prints the same plain-English table as `status` | Script-hostile; only 1 of 22 commands is machine-readable | 3 |
| Exit codes | Nonzero on failure, 0 on "skipped" update, `policy` check-specific codes (`/cli/policy/findings`) | `process.exitCode = 1` set ad hoc in ~20 branches; no central policy | Works but undocumented and inconsistent | 1 |
| Colour handling | TTY-only ANSI, OSC-8 hyperlinks, OSC 9;4 progress (`/cli#output-modes`) | Unconditional 4-colour log lines (`src/core/logger.ts:11`–`14`) + 2 hardcoded `\x1b[31m` (`src/bin/termcrab.ts:11`, `src/cli.ts:95`). No TTY check, no `NO_COLOR` | Garbage output when piped | 1 |
| `NO_COLOR` / `--no-color` | Supported (`/cli`) | Absent | Absent | 0.5 |
| CLI startup benchmark | `scripts/bench-cli-startup.ts` is a maintained script (`/reference/test/performance`) | Absent | Unmeasured | 0.5 |

### B. TUI — the specific gap you named

| Capability | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| Full-screen TUI | `openclaw tui`; aliases `openclaw chat` and `openclaw terminal` = `tui --local` (`/cli/tui`). Header, chat log, status line, footer with agent/session/model/goal/token counts, input editor with autocomplete (`/web/tui`) | **None.** Verified: `grep -rn setRawMode` over the whole repo (excluding `node_modules`) returns nothing; no `1049`, `?25h`, `?25l`, `?1047` (alternate screen / cursor hide) anywhere; no ANSI besides the 6 escapes listed above | The "Terminal/CLI UI" surface is a line-mode REPL, not a TUI | 12–18 |
| Terminal-only mode (no Gateway) | `--local` embedded runtime, refuses to start if another process owns the state dir (`/cli/tui`) | Already true by accident: `termcrab agent` constructs its own `AgentCtx` in-process (`src/cli.ts:121`–`141`) with no Gateway | Working today, undocumented | 0.5 (docs) |
| Gateway-attached TUI from a second machine | `openclaw tui <url> --token …`, short-ref resolution, TLS pinning, edge auth (`/cli/tui`) | Impossible — the REPL builds its own context locally (`src/cli.ts:300`) and never speaks to a remote Gateway. There is no WebSocket client anywhere in `src/` | Terminal is single-machine only | 6 |
| Slash commands | 30+ (`/web/tui`): `/help /status /gateway-status /agent /session /model /question /think /fast /verbose /trace /reasoning /usage /goal /btw /elevated /activation /queue /new /reset /abort /stop /settings /exit /auth` | 4 (`src/cli.ts:341`–`361`): `exit`/`quit`, `/new`, `/agents`, `/as <name>` | 26 missing. Not even the 5 the web exposes (`/api/slash`, `server.ts:1026`–`1064`: `/new /clear /model /status /help`) | 4 |
| Keyboard shortcuts | 10 documented: Enter, Shift+Enter/Ctrl+J, Esc, Ctrl+C (double-tap exit), Ctrl+D, Ctrl+L (model), Ctrl+G (agent), Ctrl+P (session), Ctrl+O, Ctrl+T (`/web/tui`) | Zero. No keypress handling at all — `readline` line editing only | No abort-mid-turn, no pickers | 6 (with pickers) |
| Streaming token rendering | Streaming deltas with inline image previews and OSC-8 links (`/web/tui`) | `case 'delta': process.stdout.write(ev.text)` (`src/cli.ts:90`–`92`) — plain append, no redraw | Works but looks like a `curl` | 1 |
| Tool-call cards | Tool cards in the chat log; `/verbose full` expands raw output (`/web/tui`) | Two lines per tool: `⚡ name(k=v)` then `✓ preview` (`src/cli.ts:80`–`89`), truncated at 160 chars | Adequate | 0 |
| Abort / steer a running turn | Esc aborts; `/stop`, `/abort`, `/queue steer` (`/web/tui`) | Impossible — `runTurn` is awaited to completion inside a `for(;;)` loop (`src/cli.ts:338`–`372`); no signal handler inside the REPL | Ctrl+C kills the process mid-write; no in-flight steering | 4 |
| Multiline input | Shift+Enter / Ctrl+J inserts a newline (`/web/tui`) | One `readline.question()` = one line (`src/cli.ts:339`) | Absent | 1 |
| Session / agent / model pickers | Ctrl+P / Ctrl+G / Ctrl+L overlays (`/web/tui`) | Manual strings only: `--as`, `--session`, `--tier` (`src/cli.ts:294`–`296`) | Absent | 3 |
| Token / cost counters in the footer | Token counts + `/usage cost` showing session, today, 30-day (`/web/tui`, `/reference/token-use`) | Absent. `printEvents` ignores `usage` events — the `switch` has 4 cases and `default: break` (`src/cli.ts:79`–`100`) | No cost visibility from the terminal at all | 3 |
| Interactive `ask_user` prompts | Overlay with stepper, multi-select, timer, `/question` to reopen (`/web/tui`) | Tool exists (`src/agent/toolbox.ts:894`) but has no terminal renderer | Dead in the terminal | 2 |
| Approval prompts in the terminal | Plugin approval gates prompt in the terminal (`/cli/tui`) | `createApproval`/`waitForApproval` have **zero call sites** (verified: `grep -rn createApproval src/` returns only the definition at `src/core/approvals.ts:14` and the unused import at `src/gateway/server.ts:78`), so `GET /api/approvals` always returns `[]` | No HITL anywhere | 5 |
| A second TUI surface in the browser | `web/tui` is a separate 19 KB guide page | The web panel's 9 views (`ui/index.html:2276`, `2312`, `2335`, `2366`, `2391`, `2549`, `2673`, `2743`, `2770`) are all HTML | n/a | — |

### C. Per-command gaps

| Command | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| `gateway` | 5 pages: running, query (health/status/stability/probe/`call <method>`/SSH), service (install/start/stop/restart/uninstall), restart-and-supervision, Bonjour discovery (`/cli/gateway`) | Bare run only (`src/cli.ts:193`–`228`): `--host`, `--port`, SIGINT/SIGTERM handler, blocks forever | No `status`, `stop`, `restart`, `install`, `call`, `probe`, `discover`, `usage-cost`, `stability`, `diagnostics export` | 6 |
| `models` | `status/list/refresh/set/set-image/scan/aliases/fallbacks/auth`, per-agent, catalog validation, usage windows (`/cli/models`) | **No such command** (verified: `termcrab models` → `unknown command: models`). Only `config set provider.model` (`src/cli.ts:993`) | Entire command missing while the web panel has a full Models page with search, fetch, and save (`ui/index.html:2366`, `/api/models/use` `server.ts:1448`) | 2 |
| `providers` | `models auth list`, `promos`, provider-owned aliases (`/cli/models`) | **No such command.** The web panel has a full Providers page: add provider, add/rotate/delete keys, auto-detect env keys, live probe (`ui/index.html:2335`, `/api/providers` `server.ts:1309`–`1313`, `/api/providers/detect` `:1066`, `/api/probe/all` `:1280`) | Entire command missing; only `config set providers '…'` hand-editing exists | 2 |
| `mcp` | `serve` (OpenClaw as MCP server) + registry `list/show/status/doctor/probe/add/set/configure/tools/login/logout/reload/unset` + OAuth + 6 docs pages (`/cli/mcp`) | MCP **client** exists (`src/providers/mcp.ts:31` `createMcpClient`, wired at `src/gateway/server.ts:345`–`356`) but has **no CLI at all** (verified: `grep -c mcp src/cli.ts` → 0). Servers are only reachable by `config set mcpServers '[…]'` or hand-editing JSON. No HTTP/SSE transport, no OAuth, no `mcp serve` | Config-only, invisible, undiscoverable | 3 (client registry CLI) / 8 (add `serve`) |
| `plugins` | `init/build/validate/list/install/reload/marketplace/uninstall/enable/disable/doctor` + 4 authoring pages (`/cli/plugins`) | No plugin system at all. TermCrab ships `packages/plugin-sdk/index.ts` — let me be precise: **I did not read that file in this pass**; I only verified no `cli plugins` command and no plugin loader in `src/`. Treat the SDK as unverified | Absent | 20+ |
| `policy` | 6 pages; authored `policy.jsonc`, 14 rule namespaces, scoped overlays, attestation hashes, `doctor --lint` integration (`/cli/policy`) | Absent. `agent.allowExec` is one global boolean, default **`true`** (`src/core/config.ts:156`), reported as `info` by doctor (`src/mobile/doctor.ts:318`–`323`) | No conformance layer | 8 |
| `update` | `update`, `update status`, `update repair`, `update cleanup --dry-run`, `update wizard`, `--channel stable/extended-stable/beta/dev`, `--tag`, `--json`, update-run ledger, rollback verification, "skipped" outcome for unmanaged installs (`/cli/update`, 42 KB page + 3 subpages) | **Check only.** `checkForUpdate` hits `api.github.com/…/releases/latest` (`src/core/update.ts:44`) and `renderUpdate` prints "click Auto update in the web Status screen" (`src/core/update.ts:85`) | The CLI cannot update itself. `applyUpdate` exists (`src/core/updater.ts:61`–`84`: `git pull --ff-only` → `npm install` → `npm run build`) but is called **only** from `POST /api/update/apply` (`src/gateway/server.ts:1721`) | 3 |
| `sessions` | `list/import/archive/delete/maintain`, `--agent`, `--all-agents`, `--active`, `--limit`, `--store`, `--json`, width-aware tables, compact token formatting (`/cli/sessions`) | `ls` / `export <id> [file]` / `purge --older-than N` / `rename <old> <new>` (`src/cli.ts:755`–`817`). No `--agent`, no `--json`, no `--limit` | 4 of 8 flag families missing; no per-agent filtering | 1.5 |
| `memory` | `status/index/reset/search/forget/promote/promote-explain/rem-harness/rem-backfill/session-backfill`, provenance-tracked deletion, pluggable memory slot, JSON availability contract (`/cli/memory`, 35 KB) | `memory` (defaults to head dump, `src/cli.ts:919`) and `memory search <q>` (`:907`). The web panel additionally has `remember` (`/api/memory/remember` `server.ts:1523`) and a full `PUT /api/memory` editor (`:1535`) | `memory remember` and `memory edit` exist only in the browser | 2 |
| `skills` | `search/install/update/verify/list/info/check/library/workshop`, ClawHub + `git:` + `skills-sh:` + local sources, per-agent and global install, install-policy acknowledgement (`/cli/skills`) | `list` / `show` / `new` / `import` / `search` / `install` / `publish` / `registry` (`src/cli.ts:386`–`522`). No `verify`, no `check` (missing binaries/env), no `library`, no version pinning | `skills check` is the one that matters — it is the readiness gate | 2 |
| `cron` | `add/create/edit/remove/run`, agent + command + script + system-event payload kinds, `--agent`, `--model`, `--thinking`, `--tools`, `--webhook`, `--timeout-seconds`, session execution styles, retention (`/cli/cron`, 33 KB + 7 subpages) | `ls` / `add --schedule --prompt --name --critical` / `rm` / `on` / `off` / `run` (`src/cli.ts:524`–`611`). **No `edit`** — a job's schedule/prompt can only be destroyed and recreated. No per-job agent/model/tool restriction, no webhook delivery, no timeout | `cron edit` alone is a real gap | 1 (edit) / 4 (payload kinds) |
| `usage` | `openclaw status --usage`, normalised to `X% left`, 7 providers with usage windows (`/cli#usage-tracking`, `/reference/token-use`) | Absent. `printEvents` drops `usage` events (`src/cli.ts:79`–`100`) | No cost/quota anywhere in the terminal | 3 |
| `doctor` | 7 pages: running, recovery, lint, health-contract, state-migrations, sqlite-maintenance, checks. Plus `--fix`, `--json`, `--lint`, `--severity-min`, structured health contract for plugin checks (`/cli/doctor/*`) | 20 checks in one function (`src/mobile/doctor.ts:112`–`492`), `--json`, `--share`. Good coverage of Termux specifics: bionic guard (`:239`), boot script (`:272`), battery (`:257`), TTS/STT/whisper/embeddings probes (`:427`–`489`) | No `--fix`, no `--lint`, no check selection, no exit-code contract beyond `exitCode=1` | 3–5 |
| `agents` | `list/add/delete/bind/unbind/bindings/set-identity/team create`, `--role`, 4 bundled role templates, auth-profile copying rules (`/cli/agents`) | `agents ls` / `agents new <name> --template brief\|teacher\|researcher` (`src/cli.ts:819`–`854`). **No delete, no bindings, no identity, no teams.** Web can create an agent (`POST /api/agents` `server.ts:1606`) | Lifecycle half-missing | 2 |
| `channels` | `list/status --probe/capabilities/resolve/logs/dead-letters/add/login/logout/remove`, 30+ channels (`/cli/channels`) | No `channels` command. 7 channel modules exist (`src/channels/*.ts`: telegram, whatsapp, discord, slack, signal, sms, matrix) but every one is configured by `config set` only | No channel lifecycle from the terminal | 2 |
| `nodes` | `status/pending/approve/reject/remove/rename/describe/invoke/notify/push/location/screen/canvas` (`/cli/nodes`) | Absent — and correctly so: TermCrab has no node concept. Phone capabilities are in-process tools (`src/agent/toolbox.ts:1242` camera, `:1265` location, `:1326` battery) | N/A, not a gap | — |
| `logs` | `openclaw logs --lines --bytes --level --follow` (`/cli/logs`) | **No `logs` command.** Logs exist only as `GET /api/logs?lines=&level=` (`src/gateway/server.ts:954`) + a Logs view (`ui/index.html:2743`) | Terminal cannot read the log file the supervisor writes (`src/mobile/supervisor.ts:17`) | 1 |
| `tools` | Listed via `openclaw status --usage`; catalog in Control UI | No `tools` command. `/api/tools` (`server.ts:1081`) + Tools view (`ui/index.html:2549`) only | No | 0.5 |
| `traces` | `openclaw transcripts`, `audit` (`/cli/transcripts`, `/cli/audit`) | No CLI. `/api/traces` GET/list/DELETE (`server.ts:661`–`681`) + Debug view (`ui/index.html:2770`) | No | 0.5 |
| `docs` | `openclaw docs <query>` (`/cli/docs`) | Absent | No in-terminal help lookup | 1 |
| `health` / `triage` / `status` | `health --verbose`, `triage`, `status --deep` (`/cli/health`, `/cli/triage`, `/cli/status`) | `status` is a plain-English one-screen report (`src/agent/status.ts:38`–`105`) — good UX, no `--json`, no `--deep` probe | `--json` only | 1 |
| `security` / `audit` / `secrets` | `security audit`, `secrets` with 4 providers (`/cli/security`, `/cli/secrets`) | No commands. `secrets` is an agent **tool** that returns raw values to the model (`src/agent/toolbox.ts:1128`) | Terminal has no way to inspect or audit | 3 |
| `daemon` | Legacy alias for `gateway install/start/stop/restart/status/uninstall` with `--runtime node\|bun`, `--wrapper`, systemd/launchd/schtasks (`/cli/daemon`) | `supervisor` only (`src/cli.ts:230`, `src/mobile/supervisor.ts:14`–`77`): in-process watchdog, exponential backoff capped at 30 s, single child, log tee | No service install, no native supervisor on desktop | 4–6 |
| `onboard` | Guided wizard with inference detection first, `--tui`/`--classic`/`--modern`, `--flow quickstart\|manual\|import`, recommendations refresh/acknowledge (`/cli/onboard`, 33 KB + `start/wizard*`) | `readline` wizard with 6 prompts: API key, base URL, model, agent name, allow-exec, Telegram token + allowlist (`src/onboard.ts:92`–`147`). `--non-interactive` supported (`:71`–`90`) | Solid for TermCrab's scope; no inference probe, no recovery flow | 1 |

### D. Reference / specs cluster

| Capability | OpenClaw | TermCrab (file:line) | Gap | Effort |
| --- | --- | --- | --- | --- |
| Config schema doc | `openclaw config schema` prints the live schema; `/gateway/config-*` reference; `OPENCLAW_CONFIG_READONLY=1` / `OPENCLAW_NIX_MODE=1` immutability (`/cli/config`) | `Config` interface is the schema, 109 lines (`src/core/config.ts:36`–`144`). No `config schema`, no `config validate`, no `config patch`, no `config unset`. `config` has 4 subcommands: `path`/`get`/`set`/`list` (`src/cli.ts:938`–`1016`) | No schema output, no validation, no patch | 2 |
| Config backups | `ensureLayout` creates `config-backups/` (`src/core/paths.ts:96`) | **Directory is created and never written to.** Verified: `grep -rn "config-backups" src/` returns only `paths.ts:96` | Dead directory; `saveConfig` (`src/core/config.ts:216`–`222`) does a bare `writeFileSync`, no backup, no atomic temp+rename | 1 |
| Read-only config mode | Two env switches block every writer including doctor repairs (`/cli/config`) | Absent | Absent | 1 |
| Database schema reference | 9 pages: layout, versioning, personal-data, storage-changes, worker-access, agent/state schema history, integrity-and-recovery. Two SQLite DBs (shared state + one per agent), forward-only migrations, older builds refuse newer schemas (`/reference/database-schemas/*`) | None. All state is plain files: `config.json`, `sessions/*.jsonl`, `memory/*.md`, `state/crons.json`, `state/cron-state.json`, `state/outbox.json`, `state/gateway.pid` (`src/core/paths.ts:86`–`99`). **No SQLite anywhere** — verified: `grep -rn sqlite src/` returns nothing | For one-process, ~11k LOC this is a legitimate choice, not a gap. Only matters if multi-agent/multi-process ever lands | 0 now; 25 if it ever does |
| Session compaction | 5-page deep dive: store, maintenance/retention/disk budget, schema/`sessionKey` patterns, compaction providers, `NO_REPLY` silent turns + `memoryFlush` (`/reference/session-management-compaction/*`) | Real implementation: `SessionStore.compact(sessionId, maxEntries=60)` writes a digest to `memory/compacted/<id>.md` (`src/agent/sessions.ts:164`–`~220`); threshold from `agent.compactThreshold`, default 60 (`src/core/config.ts:53`, `156`) | Implementation is fine. Zero documentation, and no CLI surface (`compact` is not a subcommand). No retention/disk-budget config | 1 |
| Queue modes | 4 modes + debounce/cap/drop (`/web/tui`, `/cli/tui`) | Same 4 modes exist (`src/agent/sessions.ts:253`, `src/core/config.ts:57`) — implemented, and documented in neither the CLI nor a doc | Matches; just undocumented | 0.5 |
| Diagnostics flags | 9 flags, wildcard `name.*`, `OPENCLAW_DIAGNOSTICS` env, restart required (`/diagnostics/flags`) | One binary switch: `TCRAB_LOG_LEVEL=debug` (`src/cli.ts:146`), `TCRAB_DEBUG=1` for stack traces (`src/bin/termcrab.ts:13`) | No per-subsystem flags | 2 |
| Templates | 4 roles (coordinator, researcher, writer, reviewer) each with `CLAW.md` + `SOUL.md` + `workspace/AGENTS.md` (`/reference/templates/roles/*`) | 3 SOUL templates: brief, teacher, researcher (`src/skills/scaffold.ts`, `SOUL_TEMPLATES`) + `seedWorkspace` writing `SOUL.md` + `HEARTBEAT.md` (`src/onboard.ts:35`–`46`) | 3 of 4 roles, no coordinator, no team topology | 2 |
| Testing reference | 6 pages: local, lanes (Control UI/TUI/E2E), docker, performance, runner-internals, remote-proof (`/reference/test/*`) | 39 test files under `test/`, run by `node --test dist/test/*.test.js` (`package.json` `scripts.test`). No lane names, no runner internals doc, no coverage | Zero test documentation | 2 |
| Full release validation | 8 pages: continuation, dispatch, evidence, extended-stable, profiles, release-checks, stages (`/reference/full-release-validation/*`) | One GitHub Actions workflow file, and it is **not wired up** — `ci/README.md` says the repo token lacks the `workflows` permission and the file must be copied to `.github/workflows/ci.yml` by hand. Verified: `.github/` does not exist | No CI is running. See report 09 | 1 |
| Release channels | stable / extended-stable / beta / dev, per-channel npm + GHCR tags (`/cli/update`, `/install/updating/update-methods`) | GitHub `releases/latest` only (`src/core/update.ts:44`). `install.sh` accepts `TCRAB_BRANCH` for branch/tag pinning but there is no channel concept | No beta/dev channels | 2 |
| Maturity scorecard / taxonomy | 2 pages, 241 KB + 592 KB | None | n/a (internal OpenClaw process) | — |
| `rich-output-protocol`, `token-use`, `api-usage-costs`, `credits`, `prompt-caching`, `transcript-hygiene`, `secretref-*`, `device-models`, `pull-request-review-flow`, `release-performance-sweep` | Full reference pages | None. TermCrab has no media attachment pipeline, no cost accounting, no prompt caching, no SecretRef indirection, no device DB | Out of scope for a zero-dep Termux agent; do not chase | — |

## Clusters

### The TUI question, answered precisely

You said the CLI/TUI is where you feel most lost. Here is the exact state, verified three ways:

1. **No raw mode.** `grep -rn "setRawMode" .` (excluding `node_modules`) returns zero hits across `src/`, `ui/`, `scripts/`, `install.sh`, and `packages/`.
2. **No alternate screen, no cursor control.** `grep -rn "1049\|?25h\|?25l\|?1047"` returns zero hits. There is no `\x1b[?1049h` (enter alt screen), no `\x1b[?25l` (hide cursor), no `\x1b[2J` (clear).
3. **No rendering library.** The only ANSI in the entire source tree is: four colour constants (`src/core/logger.ts:11`–`14`), one red-bold prefix (`src/bin/termcrab.ts:11`), one red-bold headline (`src/cli.ts:95`). `packages/plugin-sdk/index.ts` exists but contains no TUI code (verified by grep for TUI/ANSI terms across `packages/`).

What actually exists:

| Thing | Where | Behaviour |
| --- | --- | --- |
| Interactive REPL | `src/cli.ts:331`–`376` | `readline.createInterface` (`:336`), `for(;;) { await rl.question('\n> ') }` (`:338`–`339`) |
| Slash commands | `src/cli.ts:341`–`361` | `exit`/`quit`, `/new` (`:342`), `/agents` (`:347`), `/as <name>` (`:352`) |
| Streaming | `src/cli.ts:90`–`92` | `process.stdout.write(ev.text)` per delta — append-only |
| Tool rendering | `src/cli.ts:80`–`89` | `⚡ name(k=v)` + `✓ preview` truncated to 160 chars |
| Abort | — | none. `runTurn` is awaited (`:363`–`370`); Ctrl+C terminates the process |
| Multiline | — | none. One `question()` = one line |

So "Terminal/CLI UI" in TermCrab is a line-mode REPL with four slash commands. It is a *chat client*, not a TUI. That is a coherent product decision — but `docs/openclaw-vs-termcrab.md:22` and `:25` describe it as "TUI/CLI" and "web panel + TUI", which is inaccurate, and `src/agent/prompt.ts:42` tells the model it is talking on "the terminal TUI (a console on this device)" — also inaccurate. Fix the wording or build the TUI; do not leave both claims standing.

### The capability asymmetry between your three surfaces

This is the concrete answer to "how does the CLI differ in capability from the web UI". Web-only, i.e. **zero terminal access**:

| Capability | Web endpoint | Web view | CLI equivalent |
| --- | --- | --- | --- |
| Provider CRUD + key rotation | `GET/POST /api/providers` `server.ts:1309`,`1313`; `POST /api/providers/:id/…` | `ui/index.html:2335` | **none** |
| Model catalogue search/fetch/save | `POST /api/models/use` `server.ts:1448` | `ui/index.html:2366` | **none** |
| Live log tail + level filter | `GET /api/logs` `server.ts:954` | `ui/index.html:2743` | **none** |
| Tool catalogue | `GET /api/tools` `server.ts:1081` | `ui/index.html:2549` | **none** |
| Run traces | `GET/DELETE /api/traces` `server.ts:661`,`676` | `ui/index.html:2770` | **none** |
| Canvas widgets | `GET/POST /api/canvas` `server.ts:1093` | `ui/index.html:2309` | **none** (agent tool only, `toolbox.ts:1413`) |
| Portal reverse proxy | `/portal/:id` `server.ts:613` | agent tool | **none** (agent tool only, `toolbox.ts:544`) |
| Approvals queue | `GET /api/approvals` `server.ts:972`; approve/deny `:978` | approval prompt | **none**, and the queue is always empty anyway |
| Push-to-talk dictation | `POST /api/listen`, `/api/listen/start\|stop` `server.ts:1660`–`1683` | 🎤 button | `termcrab wake` (`cli.ts:717`) — keyboard-wake only, no push-to-talk |
| TTS streaming | `POST /api/say/stream` `server.ts:1645` | speaker | `termcrab say` (`cli.ts:274`) — non-streaming |
| **Auto-update that actually applies** | `POST /api/update/apply` `server.ts:1721` → `applyUpdate` `src/core/updater.ts:61` | "Auto update" button `ui/index.html:2320` | `termcrab update` only *checks* (`cli.ts:268`) |
| Slash command palette | `GET/POST /api/slash` `server.ts:1026`,`1039` | `ui/index.html` `#slashMenu` | 4 different, disjoint commands |
| Memory editing (PUT whole file) | `PUT /api/memory` `server.ts:1535` | `ui/index.html:2391` | **none** |
| Memory remember | `POST /api/memory/remember` `server.ts:1523` | `ui/index.html:2462` | **none** |
| Session replay | `POST /api/sessions/:id/replay` `server.ts:821` | — | **none** |
| Agent creation | `POST /api/agents` `server.ts:1606` | `ui/index.html:2673` | `termcrab agents new` (`cli.ts:827`) — CLI *does* have this one |
| Progress cards / tasks | `GET /api/progress` `server.ts:1130`, `GET /api/tasks` `:1104` | `ui/index.html:2307`–`2308` | **none** |

CLI-only, i.e. **zero browser access**:

| Capability | CLI | Web equivalent |
| --- | --- | --- |
| `doctor --share` redacted paste report | `src/cli.ts:243`, `src/mobile/doctor.ts:525` | none |
| `status` plain-English report | `src/agent/status.ts:38` | `/api/status` `server.ts:1483` returns raw JSON |
| `sessions export <id> file.md` writes to disk | `src/cli.ts:770`–`785` | export returns JSON only (`server.ts:849`) |
| `import openclaw` migration planner | `src/cli.ts:613`–`680`, `src/migrate/openclaw.ts` (558 lines) | none |
| `boot install` / `boot status` | `src/cli.ts:924`, `src/mobile/boot.ts:17` | `POST /api/boot/install` `server.ts:1798` |
| `transcribe <file>` | `src/cli.ts:856`, `src/mobile/whisper.ts` | none |
| `embeddings setup` (downloads model) | `src/cli.ts:884`, `src/agent/embed-setup.ts` | none |
| `config path` | `src/cli.ts:941` | shown in Settings `ui/index.html:2690` |
| `heartbeat` one-shot | `src/cli.ts:379` | `POST /api/heartbeat` `server.ts:1155` |

**The pattern:** roughly 18 capabilities are browser-only and 8 are terminal-only. For a solo developer whose primary stated surface is Telegram + Web + Terminal, the terminal is the *least* capable of the three, and the web UI is where every management operation lives. That is the asymmetry.

### Packaging and distribution (CLI-relevant half; full treatment in report 08)

| Capability | OpenClaw | TermCrab | Gap | Effort |
| --- | --- | --- | --- | --- |
| npm package | Published, `npm i -g openclaw`, `--allow-scripts` guidance, npm 12 lifecycle-script policy documented (`/install`) | `package.json` declares `name: termcrab`, `bin.termcrab`, `files: ["dist/src","skills","ui","docs","install.sh",…]` — the package is *shaped* correctly but **I found no evidence it is published**: no `private: true`, no `publishConfig`, no release workflow (`.github/` does not exist), and `checkForUpdate` reads GitHub releases not npm (`src/core/update.ts:41`) | Correct packaging, unverified publish | 2 |
| Compiled entry | Single bundled launcher | `dist/src/bin/termcrab.js` (tsc output, no bundler — `src/bin/termcrab.ts:2` "no bundler needed"). Requires devDeps + `tsc` at install time; `install.sh` runs `npm install` which pulls typescript via devDependencies | Slower, heavier install than a published tarball | 2 |

## Loopholes and correctness bugs

Ordered by blast radius.

1. **`docs/API.md:5` documents auth that does not exist.** "Auth: `Authorization: Bearer <gateway.token>` — or `?token=` for EventSource/SSE." Verified live: with `gateway.token` set, `GET /api/config` returns `200` with no header and `200` with `Authorization: Bearer wrong`. `src/gateway/auth.ts` has zero importers outside `test/gateway.test.ts:43`; `src/gateway/server.ts:709` says so in a comment. Any user who reads `docs/API.md` and exposes the port on a LAN (exactly what `docs/REMOTE.md` tells them to do) has an unauthenticated agent with `agent.allowExec=true` by default (`src/core/config.ts:156`). **Full analysis in `docs/gap/02-gateway.md`.**

2. **`docs/REMOTE.md:17` repeats the false claim.** "Your token is the front door. Every panel/API request must carry it… No token = turned away, even if the port is open." Same defect, second doc, and this one is the recipe users will actually follow (Tailscale + `gateway.host 0.0.0.0`).

3. **`src/cli.ts:268`–`272`: `termcrab update` cannot update.** `renderUpdate` (`src/core/update.ts:85`) instructs the user to "click Auto update in the web Status screen". On a headless Termux install — TermCrab's stated primary target — there is no browser. The update code (`src/core/updater.ts:61`) exists and is correct; it is just not reachable from the CLI. `install.sh` (the upgrade path) is the only headless option, and it is not referenced from the update message.

4. **`termcrab gateway --help` produces a wrong fix suggestion.** `parseArgs` (`:194`–`197`) is strict; `--help` throws; `src/bin/termcrab.ts:9`–`18` catches it and prints `[termcrab] Unknown option '--help'` followed by `→ Run: termcrab doctor`. The user asked for help and was told to run a diagnostic. Same for `onboard --help`, `cron add --help`, `config set --help`, and `skills import --help`. Only `cron` degrades more gracefully (`unknown cron subcommand: --help`, `:608`).

5. **`termcrab status --json` silently emits prose.** `case 'status'` (`:682`–`686`) ignores `rest` entirely. Verified: `status --help` and `status --json` produce byte-identical plain-English output. Any script that pipes `status --json` into `jq` gets a parse error with no hint.

6. **`doctor`'s password-mismatch diagnosis is unreachable code.** `probeGatewayToken` (`src/mobile/doctor.ts:98`–`110`) sends a Bearer token to `GET /api/config` and maps `401` → `'mismatch'`. Since no auth check exists, `/api/config` always returns `200`, so it always returns `'ok'`. The `fail` branch at `:202`–`209` ("the running panel is using a DIFFERENT password than this file") can never fire. The same root cause makes `probePanelHealth` (`:69`–`82`) always return `{authRequired: false}` — `GET /api/health` (`src/gateway/server.ts:648`–`658`) returns `{ok,name,version,uptimeSec,provider,telegram}` and **no `authRequired` field**, so the branch at `src/cli.ts:958`–`960` is dead too. `CHANGELOG.md:17` (0.30.4) claims "`/api/health` now reports whether a password is required" — the current source contradicts the changelog.

7. **`createApproval` and `waitForApproval` have no call sites.** Verified: `grep -rn "createApproval(" src/` returns only the definition (`src/core/approvals.ts:14`) and the import (`src/gateway/server.ts:78`). No tool ever requests approval. Therefore `GET /api/approvals` (`server.ts:972`) always returns `[]`, the approve/deny routes at `:978` always 404, and any UI approval prompt can never appear. The "approvals" feature is entirely theoretical — and the CLI never had a renderer for it anyway.

8. **`src/core/paths.ts:96` creates `config-backups/` and nothing ever writes to it.** `saveConfig` (`src/core/config.ts:216`–`222`) does a bare `fs.writeFileSync(p, raw)`. A crash mid-write truncates `config.json`; `loadConfig` (`:211`–`213`) then silently returns `defaults()`, so a corrupt config becomes a working-looking config with no provider and no token. There is no `.bak`, no temp-file+rename, and no "your config was unreadable" signal.

9. **`config-backups` implies a safety net that does not exist, and `ensureLayout` runs on every command.** `ensureLayout()` is called at the top of `loadConfig` (`src/core/config.ts:189`), `startGateway` (`server.ts:252`), and `saveConfig` (`:217`). So merely running `termcrab --version` creates nine directories in `~/.termcrab`. Harmless, but it means "the directory exists" carries no information.

10. **Version drift in three places.** `package.json` says `0.36.0`; the top `CHANGELOG.md` entry is `0.34.0` (`CHANGELOG.md:3`); `src/providers/mcp.ts:103` hardcodes `clientInfo.version: '0.34.0'` in the MCP handshake. `install.sh`'s usage comment also suggests `TCRAB_BRANCH=v0.34.0`. Any MCP server that version-gates on `clientInfo.version` sees a version two releases stale. Fix by reading `PACKAGE_ROOT/package.json` in `mcp.ts` the way `server.ts:1948` `version()` already does.

11. **`config set` can silently create a bogus config tree.** `cfgSet` (`src/core/config.ts:272`–`295`) walks/creates any dotted path with no type validation and no key allowlist. Verified: `config set typo.here 1` writes `{"typo":{"here":1}}` and prints `✅ typo.here = 1`. There is no `config validate` and no `config schema`, so typos are undetectable.

12. **`docs/openclaw-vs-termcrab.md` under-reports TermCrab and over-reports one surface.** `:24` says "no MCP" — MCP client support exists (`src/providers/mcp.ts:31`, wired `server.ts:345`–`356`). `:22` and `:25` describe a "TUI" that does not exist. `:23` claims "285 tests" — I did not count the current suite and am **not** asserting a number. Under-selling MCP in your own comparison doc costs you the argument when someone checks.

13. **The REPL cannot be aborted and loses no state gracefully.** `src/cli.ts:338`–`372` awaits `runTurn` with no timeout and no `AbortSignal`. A provider that hangs hangs the terminal forever; Ctrl+C destroys the process (and the `finally { rl.close() }` at `:373` is the only cleanup, so the half-finished turn stays mid-tool-loop in the session file). OpenClaw's TUI has `/stop`, `/abort`, and Esc-abort for exactly this.

14. **`termcrab cron add` has no `edit` and no validation echo.** `src/cli.ts:549`–`578` accepts `--schedule`/`--prompt`/`--name`/`--critical` and nothing else. `addCron` (`src/cron/store.ts:42`) validates the schedule via `parseCron` and stores it, so a valid-but-wrong schedule (`0 8 * * 1-5` meaning something the user did not intend) is silently accepted. `ls` (`:526`–`547`) shows the computed next run, which is the only feedback.

15. **`termcrab sessions purge` default is 30 days and irreversible, with no confirmation and no dry run.** `src/cli.ts:787`–`798` defaults `days = 30` when `--older-than` is absent, and `store.purgeOlderThan` really deletes. `Number(rest[idx+1])` on a non-numeric value yields `NaN`, which the guard at `:791` catches — that part is fine — but `purge` with no flag at all deletes everything older than a month with no prompt. OpenClaw's equivalent has previews and retention policy.

16. **`skills install` / `publish` hardcode a third-party registry with no override path.** `src/skills/registry.ts:26`: `const DEFAULT_REGISTRY = 'https://clawhub.ai/api'`. The `RegistryConfig` parameter exists (`:41`, `:81`, `:101`) but **no caller ever passes it** — verified at the two call sites, `src/cli.ts:455` (`searchSkills(q)`) and `:471` (`installSkill(name)`) and `:494`/`:507`. There is also no `registry` config key in `src/core/config.ts`. So `termcrab skills install` always hits `clawhub.ai` and there is no way to point it at a self-hosted or staging registry. Also: no auth token plumbing (`authHeaders` at `:32` is only reachable via the unused `cfg.token`).

17. **No `termcrab logs`, yet the supervisor writes a log file nothing terminal-side can read.** `src/mobile/supervisor.ts:17` tees child stdout/stderr into `~/.termcrab/logs/gateway.log`, and `GET /api/logs` (`server.ts:954`) can read it — but only from a browser. When `termcrab supervisor` misbehaves on a headless phone, the log is on disk and unreachable without `cat`.

18. **CI is defined but not running.** `ci/github-actions.yml` exists (Node 20/22/24 matrix, `npm test`, offline CLI smoke, `npm pack --dry-run`) but `.github/` does not exist — `ci/README.md` states the repo token lacks the `workflows` permission and the file must be copied by hand. **I cannot verify whether CI has ever run on the remote**; I can only say the workflow is not in the tree. This is also the entire answer to `reference/full-release-validation` — there is no release validation. Full treatment in report 09.

## Sequenced worklist

Days for one experienced developer. Items 1–6 are the highest value-per-day in this report.

1. **Wire up per-command `--help` and a `--` terminator. (2 d)** Add a `HELP_TOPICS` table keyed by command name in `src/cli.ts`, check `rest.includes('--help')` at the top of `main()` before the switch, and route unknown `--x` flags to a per-command usage line instead of `ERR_PARSE_ARGS_UNKNOWN_OPTION`. Ship value: removes bug 4 for 21 commands.
2. **Add `--json` to every bounded reporting command. (3 d)** Start with `status`, `sessions ls`, `cron ls`, `skills list`, `memory search`, `agents ls`, `config list`, `config get`, `doctor` (already done). Adopt OpenClaw's failure envelope `{"ok":false,"error":{"type":"cli_error","message":…}}` on stderr + nonzero exit so scripts have one contract.
3. **Make `termcrab update` actually update. (3 d)** Call `applyUpdate` (`src/core/updater.ts:61`) from `src/cli.ts:268` behind `--apply`, print the three phases (`pull`/`install`/`build` via the existing `onPhase` callback), and change `renderUpdate` (`src/core/update.ts:83`–`90`) to lead with `termcrab update --apply` and mention the web button secondarily. Also delete the "git pull && npm install" line — `applyUpdate` already does that.
4. **Add `termcrab models` and `termcrab providers`. (4 d)** Both already have complete HTTP implementations (`server.ts:1309`–`1313`, `:1448`, `:1066`, `:1246`–`1308`). This is ~300 lines of fetch-and-print that closes the two worst web-only gaps. Add `--json` to both.
5. **Add `termcrab logs`. (1 d)** `tail -n <lines>` on `path.join(logsDir(), 'gateway.log')` with a `--level` filter, reusing the exact logic at `server.ts:956`–`969`. Add `--follow` only if you want the extra dependency-free loop.
6. **Fix the four false claims in your own docs. (0.5 d)** `docs/API.md:5`, `docs/REMOTE.md:17`, `docs/openclaw-vs-termcrab.md:22`/`:24`/`:25`, `CHANGELOG.md:17`. Either implement auth (report 02) or delete the claims. Shipping a doc that says "no token = turned away" when the port is wide open is the worst bug in this report because it actively causes harm.
7. **Upgrade the REPL into a real terminal chat client. (4 d, no raw mode needed)** Keep `readline`; add: `AbortController` wired to `SIGINT` so a turn can be stopped without killing the process; multi-line input via a `\` continuation or `readline` multiline mode; scrollback preserved; a `usage` event case in `printEvents` (`:79`) showing tokens; `/model`, `/status`, `/tools`, `/logs`, `/doctor`, `/help`; and `--json` stream mode for `termcrab agent`. This gets you 80% of what a TUI gives you for 25% of the cost.
8. **Add `termcrab cron edit` + `--agent`/`--model`. (1.5 d)** `edit` is a `setCronEnabled`-shaped mutation in `src/cron/store.ts`; `--agent` needs `CronJob.agent` (`store.ts:7`–`18`) threaded into `runTurn` at `scheduler.ts:45`–`50`. Closes the "destroy and recreate" hole.
9. **Add `termcrab mcp list/status/probe/tools/add`. (3 d)** All the primitives exist in `src/providers/mcp.ts` (`createMcpClient`, `listTools`, `callTool`, `mcpToolsToDefs`). Also add a `registry: {url, token}` key to `src/core/config.ts` and thread it through `src/cli.ts:455`/`:471`/`:494`/`:507` so `skills install` stops hardcoding `clawhub.ai` (bug 16).
10. **Fix `config` durability and validation. (2 d)** Atomic write: `config.json.tmp` + `rename` in `src/core/config.ts:216`. Then real `saveConfig` backups into the already-created `config-backups/` directory. Then `config validate` (walk the merged config against the `Config` interface, reject unknown top-level keys) and `config schema`.
11. **Add `config security` / `doctor --security`. (2 d)** Cheapest win available: doctor already has 20 checks and `buildShareReport` already scrubs secrets (`doctor.ts:514`–`519`). Add a `security` section that reports the auth defect explicitly ("your panel password is set but not enforced"), so users are not misled while bug 1 is open.
12. **Add shell completion. (1 d)** Static completion for 22 commands + subcommands, emitted from the same `HELP_TOPICS` table built in item 1. Add `termcrab completion bash|zsh` and wire it into `install.sh`.
13. **Add `termcrab usage`. (3 d)** Requires a cost model that does not exist. Plumb `usage` events out of `runTurn`, aggregate per session/day, print a table. Do this after items 1–6; it is the only item here that needs new backend work.
14. **Build the full-screen TUI. (12–18 d)** Only if item 7 is not enough. Requires a hand-rolled renderer (zero-dep constraint): alt-screen enter/exit, a status line, a footer with agent/session/model/token counts, Ctrl-key pickers, and an overlay renderer for `ask_user`. Budget for the fact that you will be maintaining a terminal UI forever with no library support. This is the single largest item in all three reports and should not be attempted before the terminal is scriptable (items 1–3).