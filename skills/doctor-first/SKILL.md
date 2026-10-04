---
name: doctor-first
description: The first thing to run when something looks broken - and how to read its answer.
---

# Doctor first

When something is wrong ("the panel won't open", "no answer came back", "reminders
stopped"), do not guess and do not start changing config. Run the check that already
knows the usual causes:

```bash
termcrab doctor                # every check, each with the fix in one line
termcrab doctor --json         # {checks:[{name, ok, detail, fix?}], failed}
termcrab doctor --share        # a report safe to paste somewhere (passwords stripped)
termcrab status                # the plain-English overview: brain, memory, schedule, battery
termcrab runs                  # what is running, slow, stuck or failing *right now*
termcrab logs 50               # the last 50 log lines, newest last
```

## How to read it

- A failed check comes with the fix. Do the fix, re-run the doctor, and only then say
  the problem is solved — "should work now" is not a diagnostic.
- `termcrab status` answering with data but the panel not opening usually means the
  gateway is not running: start it and give the owner the URL and token line it prints.
- An empty answer from the model is usually the provider (key, quota, network): the
  doctor's provider check names which.
- If the doctor is clean and the problem is still real, the log is the next stop. Read
  the last lines aloud (they are short) instead of paraphrasing them into vagueness.

## What not to do

- Do not reinstall, reset or delete state to "fix" a problem you have not diagnosed —
  and never reset anything without saying what will be lost.
- Do not edit `config.json` by hand while a gateway is running; use `termcrab config set`,
  which validates before it writes and can hot-apply.
