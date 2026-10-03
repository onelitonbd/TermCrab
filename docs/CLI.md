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

## Which commands, and what is inside

| Command | `data` |
|---|---|
| `termcrab status --json` | `{name, brain, localBrain, panel, queue, channels, memory, heartbeat, cron, dream, agents, configProblems}` |
| `termcrab sessions ls --json` | `{count, sessions:[{id, messages, bytes, modified}]}` |
| `termcrab sessions export <id> --json` | `{id, file, bytes}` |
| `termcrab sessions purge --older-than <days> --json` | `{purged, freedBytes, olderThanDays}` |
| `termcrab sessions rename <old> <new> --json` | `{from, to, renamed}` |
| `termcrab skills ls --json` | `{count, skills:[{name, origin, description}]}` |
| `termcrab skills import <src> --json` | `{source, count, results:[{name, action}]}` |
| `termcrab skills new <name> --json` | `{created, path}` |
| `termcrab cron ls --json` | `{count, jobs:[{id, name, schedule, enabled, critical, nextRun, prompt}]}` |
| `termcrab cron add … --json` | `{job, nextRun}` |
| `termcrab cron rm <id> --json` | `{removed}` |
| `termcrab memory show --json` | `{text, facts, totalFacts, bytes, budget, stats, files}` |
| `termcrab memory search <q> --json` | `{query, count, hits:[{file, line, score, snippet, origin, when, source, semantic}]}` — ranked (BM25 + exact phrase + 30-day recency), and every hit says where it came from |
| `termcrab memory user [line] --json` | `{file, text}` (or `{file, added, result}` when a line was added) |
| `termcrab context [session] --json` | `{engine, sections:[{section, bytes, note}], totalBytes, tools:{count, schemaBytes}, history:{messages, bytes, pruned}, memory:{facts, totalFacts, budget, userBytes}, skills:{count, bytes}, notes}` |
| `termcrab pair --json` | `{code, expiresAt, ttlMs, name, howTo}` |
| `termcrab devices --json` | `{count, devices:[{id, name, createdAt, lastSeenAt, seenAgoMs, seenCount}], pendingCodes}` |
| `termcrab devices revoke <id\|name> --json` | `{revoked:{id, name}}` |
| `termcrab sessions search <words> --json` | `{query, count, hits:[{sessionId, part, line, role, when, score, snippet}]}` — ranked across every transcript, archive included |
| `termcrab sessions show <id> --json` | `{id, file, archive, entries, bytes, firstAt, lastAt, roles, digest, fence, policy, resetDue, resetReason, attachment:{files, facts, approvals, tools}}` |
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
| `termcrab doctor --json` | `{checks:[…], failed}` |
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
