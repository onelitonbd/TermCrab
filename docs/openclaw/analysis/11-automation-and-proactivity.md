# Automation and proactivity

**Their pages:** 18 under `/automation` (cron jobs split into schedules/payloads/delivery/webhooks/gmail, hooks, standing orders, tasks, taskflow, imap) + the hook section of `/plugins`.
**Catalogue:** [`../sections/05-capabilities.md`](../sections/05-capabilities.md).

---

## 1. Where TermCrab stands: 34%, with one real advantage

**Real:** a cron parser/store/scheduler (`src/cron/*`, 5-field expressions, CLI `ls|add|rm|on|off|run`), heartbeat (`src/agent/heartbeat.ts`) with a **battery-adaptive cadence** (`src/mobile/power.ts`), dreaming (`src/agent/dream.ts`), task suggestions (`src/agent/tasks.ts` + `/api/tasks`), and background subagent runs.

**The advantage:** their heartbeat runs on a fixed interval on a machine plugged into the wall. Yours pauses under 20% battery and stretches on battery power. On a phone that is not a detail — it is the difference between an agent that survives a week and one that gets uninstalled. It is a BETTER row and it should be in the README.

**The gaps:** no event triggers (time-only), no standing orders, no inbound webhooks that are safe (the route exists unauthenticated), no delivery routing (a cron job runs in a session; the output does not reliably arrive in the chat you wanted), no mail watchers.

## 2. What their automation model gets right

- **Four distinct mechanisms with a decision guide** (`/automation`): automations (cron), standing orders (persistent programs with an *execute-verify-report* pattern), hooks (event-driven), heartbeat (periodic checklist). Beginners are told which to reach for.
- **Delivery is a first-class concept** (`/automation/cron-jobs/delivery`): output goes to a chosen channel/conversation, with failure notifications and output-language rules.
- **Payload variety**: agent turns, commands, scripts — not only prompts.
- **Promotion path**: a repeated conversational job can be promoted into a durable automation.
- **And the discipline**: they *retired* inferred commitments when the inference was unreliable rather than shipping a lie. Their `/automation` page documents the removal.

## 3. The move (about 15 days for the phone-relevant subset)

1. **Delivery routing (3d).** Give cron jobs a `deliver: { channel, to }` and route the final text there, with failures surfacing in the log and the panel. This is the single most-wanted automation behaviour on a phone: "every morning at 7, send me a briefing on Telegram" — currently the job runs but the result goes nowhere predictable.
2. **Event triggers, minimal (5d).** Two triggers cover most needs: `file.changed` (watch a path) and `webhook` (authenticated, from the core lane). Resist building a general condition language.
3. **Standing orders, simplified (5d).** One markdown file, one schedule, one *verify* step, one report destination — the execute-verify-report loop, without their multi-program architecture. It is the difference between "a job that runs" and "an agent that pursues an outcome".
4. **Honest heartbeat page (1d).** Document what heartbeat actually does today (power-aware tick + HEARTBEAT.md), because that is a better story than pretending to have standing orders.
5. **Then stop.** Gmail/IMAP watchers, taskflow boards and webhook ingestion pipelines are desktop-team features (ROADMAP §4). Their own `/automation` page shows how much design surface this area has — and that they retired a whole concept from it.

## 4. Done tests

- `termcrab cron add --schedule "0 7 * * *" --prompt "brief me" --deliver telegram:12345` arrives at 07:00 in that chat, and a failure to deliver is logged and visible in the panel.
- A webhook trigger with a wrong token is rejected; with the right token it starts a run, and the run's output is delivered to the configured channel.
- A standing order over a week produces one verify-report cycle per run, and its state is inspectable with `termcrab cron show <id>`.
