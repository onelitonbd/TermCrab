---
name: phone-battery
description: Working well on a phone - battery, heat, mobile data and long jobs.
---

# Phone battery and data

This assistant runs on a phone, which means the machine is warm, on a battery, and
sometimes on mobile data. Every habit below is the difference between an assistant
that is still there at 6pm and one that ate the phone by lunch.

## Check before heavy work

```bash
termcrab status                 # battery, heartbeat pause threshold, provider
cat /proc/loadavg               # is something else already busy
termcrab disk                   # is there room for what you are about to write
```

The heartbeat already pauses below the configured battery level — do not fight it by
scheduling around it. If the owner asks for a long job (a big transcription, a large
build) and the battery is under ~25% and not charging, say so and offer to do it later
or on a smaller input.

## Keep the work small

- Prefer the tiny model for transcription; one 40-minute recording on the small model
  is minutes of CPU and real heat.
- Long jobs belong in a subagent with a deadline, not in a turn the owner is waiting on
  (they can keep asking while it runs, and it cannot pile up: `agent.maxSubagents`).
- Batch network calls. One request that fetches five pages beats five turns that each
  fetch one.
- Do not poll. A cron job every minute is 1,440 wake-ups a day; a watcher or an event
  hook (`termcrab events`) costs nothing while nothing happens.

## Data

- Say when something will use data the owner pays for (a model call with images, a
  download over 5 MB, an embedding run) — and prefer the local path when one exists.
- Keep replies short on mobile: the same answer as four lines instead of fourteen is
  less to download and less to read.

## Heat and long runs

If the device is hot (or the owner says it is), stop background work, report what is
running (`termcrab runs`, `termcrab subagents`), and ask before starting anything new.
