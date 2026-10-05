---
name: evening-review
description: The end-of-day wrap-up - what happened, what is still open, and one note for tomorrow.
---

# Evening review

Run this when the owner asks for a wrap-up ("what did we do today?", "wrap up"), or
when a scheduled evening job fires with this skill. It is a *review*, not a report —
the output is short, and one line of it is addressed to tomorrow.

## What to read

```bash
termcrab sessions ls                 # which conversations ran today
termcrab usage                       # turns, tokens, cost — the honest cost line
termcrab runs                        # anything still running, slow or stuck
termcrab cron ls                     # what is scheduled for tonight and tomorrow
termcrab memory show                 # recent facts, in case one needs promoting
```

For the day's detail, `termcrab sessions show <id> --json` on the sessions that matter.
Do not read everything: pick the sessions that were about work, not small talk.

## What to say

Four short parts, nothing else:

1. **Done** — up to five lines, one per thing that actually finished. A thing that was
   discussed but not finished does not belong here.
2. **Still open** — what has a next step, and whose step it is (usually the owner's).
   If nothing is open, say "nothing open" and mean it.
3. **Cost** — one line from `termcrab usage` when the day used a paid provider.
4. **Tomorrow** — one line: the first useful thing to do, or the earliest scheduled job.

## What not to do

- Do not pad with "it was a productive day" or a summary of the summary.
- Do not repeat yesterday's review from memory — read today's sessions.
- Do not offer to fix things in the same message; ask one question at the end if a
  decision is genuinely needed, then stop.

## Write one line down

If the day produced a decision with a reason, promote that single line to memory
(`termcrab memory user "…"` or the memory tool) before the review ends, so tomorrow
does not have to re-derive it.
