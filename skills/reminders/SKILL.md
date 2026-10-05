---
name: reminders
description: Turning "remind me at 7" into a real scheduled job, with the timezone handled.
---

# Reminders and timers

A reminder is a cron job that runs once. Get these three things right and they never
surprise the owner; skip one and the reminder fires at the wrong hour, twice, or in
the wrong chat.

## 1. The time

Cron here is **device local time**. Check what that is before you schedule anything,
because a phone that travelled is a classic wrong-hour bug:

```bash
termcrab status --json | grep -i timezone   # or ask: date +%Z
```

If the owner says "7am" they mean their morning, not UTC. If they say "in 20 minutes",
compute the clock time now and use a one-shot.

## 2. The job

```bash
termcrab cron add --name "dentist" --schedule "0 19 * * *" --prompt "Remind the owner: dentist tomorrow at 10." --deliver telegram
termcrab cron ls
```

- `--deliver telegram` when the reminder must reach the owner away from the terminal;
  `panel` when they are at the machine; leave it off to hit every configured surface.
- Use `--critical` only for things that must fire even on a low battery.
- One-shot reminders stay one-shot: after it fires, turn it off

```bash
termcrab cron off <id>
```

## 3. Say what you scheduled

Answer with the resolved time in the owner's words — *"Set for today 19:00 (in 2h 10m)"* —
and the job id, so a correction is one command. Never just "done".

## Repeating jobs

Same command, a repeating schedule (`0 8 * * 1-5` = weekday mornings). For anything
that must be *checked* rather than *said* (a site, a folder, a file), use an event hook
instead of polling: `termcrab events` lists what can wake one. Polling every minute
costs battery on a phone.

## When it fires

Keep the prompt self-contained — the job runs in its own session and does not
remember the conversation you set it up in. Include the names, the place and the
action: **"Remind the owner: dentist tomorrow at 10, clinic on Gulshan Ave."**
