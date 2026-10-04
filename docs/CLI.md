# The CLI's machine view (`--json`)

Scripts should never have to scrape the pretty output. Every command that prints
structured data takes `--json`, and then **stdout carries exactly one JSON
document and nothing else** — logs, warnings and progress lines move to stderr.

## The envelope

Success:

```json
{
  "ok": true,
  "command": "status",
  "data": { "name": "Crabby", "brain": "mock:mock-1 (offline demo)", "queue": { "state": "idle", "waiting": 0, "running": 0 } }
}
```

Failure — the same shape, plus the fix:

```json
{
  "ok": false,
  "command": "usage",
  "error": { "message": "The panel is not running...", "hint": "the meter lives in the running panel: start it with `termcrab gateway`" }
}
```

The **exit code still carries the shell convention**, so `if termcrab run ...; then`
keeps working: `0` done · `1` failed · `124` timed out · `130` stopped.

## The screen (`termcrab tui`)

Interactive, so it writes no JSON envelope — but it is scriptable in the two ways
that matter: `--frames <file>` appends every drawn frame (plain text, one
`―` separator) for a bug report or a test, and everything it does to the
terminal goes through a stream, so a test can drive it without a TTY. It opens on
the rolling main session unless `--session <id>` says otherwise, and attaches to
the gateway (`--no-attach` turns that off) so turns from the panel or the phone
appear on the same screen.

```
🦀 TermCrab 0.61.0                        main · openai:gpt-4o-mini
› what is on the board today?
⏺ read_file workspace/board.md ✓ 12ms
⏺ Two things: the plumber at 11, and the invoice is still unpaid.
› _                                        (from telegram)
⏺ attached: turns from the panel or your phone on main show up here
main session · shared with the panel and your Telegram DM · /help for keys
```

Keys: `Enter` send · `↑`/`↓` history (or scroll when the transcript is scrolled) ·
`Ctrl-U` clear before the cursor · `Ctrl-K` clear after it · `Ctrl-A`/`Ctrl-E`
start/end · `Ctrl-L` clear the screen · `Ctrl-C` stop a running turn, press again
to leave · `PgDn` back to the newest line. Commands: `/sessions` (arrow-select) ·
`/new` · `/status` · `/history` · `/dir` · `/help` · `/quit`.

## Which commands, and what is inside

| Command | `data` |
|---|---|
| `termcrab status --json` | `{name, brain, localBrain, panel, queue, channels, memory, heartbeat, cron, dream, agents, configProblems}` |
| `termcrab sessions ls --json` | `{count, main, rolling, sessions:[{id, messages, bytes, modified}]}` — the human list marks the shared `main` session |
| `termcrab sessions export <id> --json` | `{id, file, bytes}` |
| `termcrab sessions purge --older-than <days> --json` | `{purged, freedBytes, olderThanDays}` |
| `termcrab sessions rename <old> <new> --json` | `{from, to, renamed}` |
| `termcrab say <text> --json` | `{spoken, backend, chars}` — which device backend spoke (termux-tts-speak / espeak-ng / say), and on failure what to install |
| `termcrab transcribe <file> --json` | `{file, text, engine, model, ms}` — offline whisper.cpp transcription, or an error naming the missing engine or model |
| `termcrab browser status --json` | `{available, browser, host, port, tabs:[{title, url}], hint}` — the owner's own Chrome over CDP (`--remote-debugging-port=9222`); no bundled browser, so `available:false` comes with the line that starts one |
| `termcrab browser open <url>\|text\|shot --json` | `{url, loaded, title}` / `{url, chars, text}` / `{file, bytes, width, height}` — navigates, reads the page as text, or writes a PNG under `workspace/browser/`. `shot` is a real screenshot of the real page (`Page.captureScreenshot`), not a saved HTML. With no browser running every subcommand exits 1 with the start hint on stderr, so a script can test `$?` |
| `termcrab rooms list --json` | `{count, rooms:[{key, channel, room, messages, sinceAddressed, lastAt, bytes}]}` — the ambient history the channels keep per room: what was said while the bot was not addressed, bounded to 200 messages / 64 KB per room |
| `termcrab rooms show <channel:chat> --json` | `{room, count, messages:[{ts, from, fromId?, text, addressed}]}` — oldest first; `--limit <n>` for fewer |
| `termcrab rooms clear <channel:chat>\|--all --json` | `{cleared, dropped, room?}` — forgetting is local and immediate |
| `termcrab skills ls --json` | `{count, skills:[{name, origin, description}]}` |
| `termcrab skills import <src> --json` | `{source, count, results:[{name, action}]}` |
| `termcrab skills new <name> --json` | `{created, path}` |
| `termcrab skills proposals --json` | `{count, proposals:[{name, description, reason, source, by, createdAt, path, replacesLive}], rejected:[{name, reason, decidedAt}]}` — skills the agent wrote for itself, waiting for a yes; nothing here is live, and `approve … --force` is needed to replace an existing skill |
| `termcrab cron ls --json` | `{count, jobs:[{id, name, schedule, enabled, critical, nextRun, prompt, agent, deliver}]}` — `deliver` is `telegram`, `panel`, `none`, or `all` (unset) |
| `termcrab cron add … --json` | `{job, nextRun}` — `--agent <name>` runs the job as that agent, `--deliver telegram\|panel\|none` says where its result goes |
| `termcrab subagents --json` | `{count, running, tasks:[{id, sessionId, prompt, label, agent, cwd, status, started, finished, elapsedMs, output, error}]}` — status is running / done / error / timeout |
| `termcrab subagents scratch --json` | `{count, dirs:[{id, path, files, bytes, modified}], freed?}` — one working directory per task under `workspace/subagents/`; `--prune` deletes the old ones |
| `termcrab agents routes --json` | `{routes:[{surface, agent, source:'config'\|'default', problem?}]}` — which agent answers on web, telegram, cli, cron, voice, wake, subagent |
| `termcrab cron rm <id> --json` | `{removed}` |
| `termcrab memory show --json` | `{text, facts, totalFacts, bytes, budget, stats, files}` |
| `termcrab memory search <q> --json` | `{query, count, hits:[{file, line, score, snippet, origin, when, source, semantic}]}` — ranked (BM25 + exact phrase + 30-day recency), and every hit says where it came from |
| `termcrab memory user [line] --json` | `{file, text}` (or `{file, added, result}` when a line was added) |
| `termcrab context [session] --json` | `{engine, sections:[{section, bytes, note}], totalBytes, tools:{count, schemaBytes}, history:{messages, bytes, pruned}, memory:{facts, totalFacts, budget, userBytes}, skills:{count, bytes}, notes}` |
| `termcrab pair --json` | `{code, expiresAt, ttlMs, name, howTo}` |
| `termcrab devices --json` | `{count, devices:[{id, name, createdAt, lastSeenAt, seenAgoMs, seenCount}], pendingCodes}` |
| `termcrab devices revoke <id\|name> --json` | `{revoked:{id, name}}` |
| `termcrab runs --json` | `{count, live, runs:[{sessionId, turnId, runId, request, elapsedMs, verdict, lastActivity, idleMs, suggestion}]}` — verdicts: working / slow / stuck / failing / queued |
| `termcrab logs [n] --json` | `{path, limits:{maxBytes, maxFiles}, usage:{bytes, files}, count, records:[{ts, level, area, message, …}]}` |
| `termcrab logs --path` | the log file path on its own |
| `termcrab presence --json` | `{count, live, watchers, summary, entries:[{kind, id, label, state, lastSeenAt, seenAgoMs, detail}]}` — states: online (≤2 min) / recent (≤1 h) / idle / unknown (never seen) / off (configured but not running) |
| `termcrab events --json` | `{count, events:[{name, what, hooks:[id]}], watchers:[{id, path, match}]}` — the internal events that can wake a hook, who listens, and which paths are watched |
| `termcrab orders --json` | `{count, orders:[{id, text, createdAt}]}` — standing orders: injected into every turn ahead of memory, never over the safety rules |
| `termcrab image "<prompt>" --json` | `{path, bytes, width, height, prompt, provider, model, placeholder}` — a real PNG, drawn locally under the mock provider (`placeholder: true`) or fetched from the provider's image endpoint |
| `termcrab models --json` | `{live, note, provider, current, count, models:[{id, …capabilities}]}` — asks the endpoint first, falls back to the offline catalog and says which |
| `termcrab auth list --json` | `{count, profiles:[{id, provider, baseUrl, model, hasKey}]}` — never the key itself; `add`/`remove` change the store |
| `termcrab orders --json` | `{count, orders:[{id, text, createdAt}]}` — standing orders: injected into every turn, ahead of memory, never over the safety rules |
| `termcrab sessions search <words> --json` | `{query, count, hits:[{sessionId, part, line, role, when, score, snippet}]}` — ranked across every transcript, archive included |
| `termcrab sessions show <id> --json` | `{id, file, archive, entries, bytes, firstAt, lastAt, roles, digest, fence, policy, resetDue, resetReason, attachment:{files, facts, approvals, tools}}` |
| ↳ | `rolling` is a plain-English line: is this the shared main session, and does it roll? |
| `termcrab sessions verify --json` | `{sessions:[{id, entries, hot, archived, badLines, repairedBytes, bytes}], sessionsWithDamage, badLines, repaired, bytes, repairedNow}` |
| `termcrab sessions reset <id> --json` | `{id, archivedTo, entries}` |
| `termcrab config set agent.execTimeoutSec 30` | seconds a shell command may run before it is killed (default 30) |
| `termcrab config set agent.execDenyPatterns '^curl '` | extra refusals on top of the built-in catastrophe list |
| `termcrab config set agent.execAllowDangerous true` | escape hatch: run even a refused command (off by default) |
| `termcrab memory compact <session> --json` | `{session, compacted, coveredTurns, by, model, note, file}` |
| `termcrab approvals --json` | `{count, approvals:[{id, tool, args, sessionId, createdAt}]}` |
| `termcrab approvals approve\|deny <id> --json` | `{id, decision, by, ok}` |
| `termcrab usage --json` | `{day, turns, calls, promptTokens, completionTokens, totalTokens, costUsd, priced, byModel, pricingAsOf, priceConfigured}` |
| `termcrab disk --json` | `{before:{root, totalBytes, files, byArea}, budgetBytes, keepDays, trim, overBudget}` |
| `termcrab backup [file.tar] --json` | `{file, format, formatVersion, createdAt, release, schemaVersion, files, bytes, platform, node}` |
| `termcrab restore <file.tar> --json` | `{restored, bytes, movedTo, from, schema:{from,to,migrated}}` · `--dry-run` → `{dryRun, manifest, files:[{rel,bytes,exists}], tooNew}` |
| `termcrab schema --json` | `{current, home, stamp:{version,updatedAt,applied,release}, from, to, applied, adopted, backupDir}` · `--dry-run` lists steps without writing |
| `termcrab service status --json` | `{ok, platform:'systemd'\|'launchd'\|'termux', file, installed, action, steps}` · `install` writes the unit (or the Termux:Boot script), `--dry-run` prints it and writes nothing |
| `termcrab bootstrap --json` | `{home, complete, missing:[rel], present:[{rel,bytes,why}], stage:'empty'\|'first-run'\|'done', nextStep}` · `--write` writes only what is missing, `--force` rewrites the templates |
| `termcrab embeddings status --json` | `{packageInstalled, enabled, indexVectors, modelCached, provider, model, costNote, blocker?, summary}` |
| `termcrab embeddings test [text] --json` | `{ok, provider, model, dims, ms, chars, preview}` — embeds one string through whatever provider the config selects |
| `termcrab doctor --json` | `{checks:[…], failed}` — including the shell-sandbox mode this device can offer |
| `termcrab run "…" --json` | `{turnId, sessionId, status, …}` |
| `termcrab run --wait <id> --json` | the finished run: `{runId, status, output, error, durationMs, tokensIn, tokensOut}` |
| `termcrab stop --json` | `{count, stopped:[runId], sessions:[…]}` |

`termcrab help <cmd>` prints the same list for one command, next to its flags.

## Examples a script can copy

```bash
# is anything running, as a number?
termcrab status --json | jq '.data.queue.running'

# today's tokens, parsed — not scraped
termcrab usage --json | jq '.data.totalTokens'

# queue a job and keep the id, or stop with 124 after 30s
termcrab run "summarise today" --no-wait --json | jq -r '.data.turnId'
termcrab run --wait "$ID" --timeout 30 --json || echo "exit $?"

# what is this install complaining about?
termcrab doctor --json | jq '.data.checks[] | select(.status != "ok")'
```

## Rules the code follows

1. **One document.** If `--json` is present, nothing but the envelope is written
   to stdout — `setLogToStderr(true)` runs before any command (`src/core/json-out.ts`).
2. **Failure is data.** A failing command still prints an envelope (`ok:false`)
   and sets a non-zero exit code; a script can parse and branch either way.
3. **No invented values.** `status` reports the queue as `down`/`unknown` rather
   than guessing when the panel is not there to ask.
4. **The human view is not sacrificed.** Without `--json` every command prints
   the same sentence-shaped output it always did.
