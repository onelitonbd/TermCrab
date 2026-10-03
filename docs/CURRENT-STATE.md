# TermCrab — current state census

**Compiled:** 2026-10-03
**Purpose:** an honest, source-verified answer to "where am I actually?" — the
baseline the OpenClaw gap reports are measured against.

Every number and claim here was read out of this repository or measured, not
recalled. Where something is broken rather than merely missing, it says so.

This document contains **no comparison to OpenClaw.** The per-area comparisons
live in `docs/gap/`, and the plan lives in `docs/GAP-ROADMAP.md`.

---

## 1. Size

| | lines | files |
|---|---:|---:|
| `src/` total | 14,915 | 71 |
| `src/agent/` | 4,580 | 18 |
| `src/gateway/` | 2,442 | 7 |
| `src/mobile/` | 1,559 | 12 |
| `src/providers/` | 1,521 | 7 |
| `src/channels/` | 1,216 | 11 |
| `src/core/` | 948 | 9 |
| `src/skills/` | 519 | 4 |
| `src/migrate/` | 558 | 1 |
| `src/cron/` | 358 | 3 |
| `src/bin/` | 19 | 1 |
| `src/*.ts` (root) | 1,195 | 2 |
| `ui/index.html` | 6,769 | 1 |
| `test/` | 6,548 | 46 |

**330 test cases** across 46 files.

Two structural notes that matter for planning:

- **The entire UI is one 6,769-line HTML file.** No build step, no components,
  no CSS modules — one `<style>` block and one inline `<script>`. That is why
  UI work is fast and why regressions are invisible until runtime.
- **`src/mobile/` (1,559 lines) exists** and has no counterpart in the concepts
  docs. Whatever it is, it is a real subsystem, not a stub.

---

## 2. The three-surface problem

This is the single biggest source of confusion, and it is measurable.

| surface | commands / views | richest area |
|---|---:|---|
| **CLI** (`src/cli.ts`) | **23 commands** | widest by far |
| **Web** (`ui/index.html`) | **9 views** | chat + memory |
| **Telegram** | **4 slash commands** | narrowest |
| **TUI** | **does not exist** | — |

**CLI commands** (`src/cli.ts:148-938`, the `switch (cmd)` dispatch):
`help`, `version`, `onboard`, `gateway`, `supervisor`, `doctor`, `update`, `say`,
`agent`, `heartbeat`, `skills`, `cron`, `import`, `status`, `dream`, `wake`,
`sessions`, `agents`, `transcribe`, `embeddings`, `memory`, `boot`, `config`.

**Web views** (`id="view-…"`): `chat`, `status`, `providers`, `models`,
`memory`, `tools`, `settings`, `logs`, `debug`. Cron is exposed inside the
**tools** view (`ui/index.html:2595`).

**Telegram slash commands** — the entire set: `/agents`, `/heartbeat`, `/new`,
`/status` (`src/gateway/server.ts`, matched as `text === '/…'`).

### There is no TUI

The terminal is a **one-shot command interface**, not an interactive terminal UI.
Grepping for `setRawMode`, alternate-screen (`1049`), or interactive ANSI finds
only colour codes in the logger (`src/core/logger.ts:11-24`) and two error
prints. There is no full-screen mode, no live streaming pane, no key handling,
no pane layout.

This is the concrete meaning of "no focus on the terminal version": the terminal
has the **most commands and the least interaction**. `termcrab agent` streams
deltas to stdout and exits. There is nothing to keep open.

### The asymmetry, stated plainly

- `transcribe`, `embeddings`, `supervisor`, `wake`, `import`, `dream`, `update`,
  `boot` — **CLI only.** No web or Telegram equivalent.
- `cron`, `sessions`, `skills`, `memory`, `doctor`, `agents` — **CLI and web,
  not Telegram.**
- Everything else is reachable everywhere.

So the three surfaces are not three views of one product. They are three
different products sharing a backend, and the overlap is accidental rather than
designed.

---

## 3. Channels: 7 files, 2 working

`src/channels/` contains seven integrations and `src/gateway/server.ts:37-48`
imports all of them. They are **not** equivalent.

**Tier 1 — fully wired to the agent** (inbound → `runTurn` → reply):

| channel | file | gateway call site |
|---|---|---|
| Telegram | `telegram.ts` (169) | `server.ts:406` |
| WhatsApp | `whatsapp.ts` (246) | `server.ts:455-462` |

**Tier 2 — stubs that never reach the agent.** These connect, receive, and reply
with a literal echo:

```
src/channels/discord.ts:50   const reply = `Echo: ${msg.content}`; // TODO: route to agent
src/channels/slack.ts:48     await say(`Echo: ${message.text}`);   // TODO: route to agent
```

They are started unconditionally when configured (`server.ts:364-365`). A user
who enables Discord gets a **live connection that answers every message with
"Echo: …"** and never invokes the agent, its tools, or its memory.

**Tier 3 — transport shells, no inbound agent wiring.** `signal.ts` (42),
`sms.ts` (38), `matrix.ts` (60). `matrix.ts` declares an `on(...)` signature at
line 29 and little else.

**Config gating** (`src/core/config.ts:78-111`, defaults at `:160`): every
channel except `web` defaults to `enabled: false`. So the echo stubs are off by
default — but nothing warns a user who turns one on, and nothing reports the
channel as degraded afterwards.

`api.ts` (49) is a separate HTTP surface; its role is not yet characterised.

### Why this matters more than a missing feature

A missing feature is visible. This is worse: the system reports success. There
is no health signal per channel, so "connected" and "working" are
indistinguishable from the outside. **This is the clearest example of the class
of bug that erodes trust in the whole product**, and it is 2 lines of code to fix
or 2 lines to remove.

---

## 4. Verified loopholes

These are correctness problems, not missing features. Each was confirmed by
running or by exhaustive grep, not by reading.

### 4.1 The session queue is never drained

`grep -rn "dequeue(" src/ --include=*.ts | grep -v sessions.ts` returns
**nothing**. `dequeue()` exists (`src/agent/sessions.ts:291`) and is tested in
`test/queue.test.ts`, but no production code calls it.

`enqueue()` (`sessions.ts:277`) is a bare `q.push()` with no admission gate,
and the only thing that starts a turn — `void processQueuedTurn(...)` at
`src/gateway/server.ts:758` — is invoked unconditionally and immediately,
bypassing `dequeue` entirely.

**The queue is a status registry, not a queue. Nothing waits.**

### 4.2 All four queue modes are unreachable

`queueMode` is user-configurable — `src/core/config.ts:57`, default
`'followup'` at `:156` — and has **no observable effect**.

- Web chat is the only path that enqueues, and its runner passes
  `skipQueue: true` (`server.ts:393`), skipping the block entirely.
- Telegram calls `runTurn` inline (`server.ts:531`) and never calls
  `markRunning`. `markRunning` appears in exactly one place in `src/`
  (`server.ts:382`), inside the function that sets `skipQueue: true`.

So `getRunning()` always returns `undefined` on every real path, and the
`steer`/`interrupt`/`followup`/`collect` block at
`src/agent/loop.ts:121-138` never fires.

### 4.3 Two concurrent turns orphan an abort controller

`SessionQueue.running` is keyed by `sessionId` alone (`sessions.ts:271`).
Running the compiled class with two turns on one session:

```
getRunning -> 3fd573c4 ( B )        <-- turn A is now unreachable
A status: running | B status: running
interrupt() would abort: B
=> A's AbortController was overwritten; A cannot be interrupted
```

Turn A reports `status: 'running'` with no reachable abort signal. Both then
read and append the same transcript.

### 4.4 No writer fence

`sessions.append()` (`src/agent/sessions.ts`) is:

```ts
fs.appendFileSync(f, `${JSON.stringify(entry)}\n`, 'utf8');
```

No claim, no verification, no transaction, no lock. Combined with 4.3, two
concurrent turns can interleave a transcript into an order the provider will
later read as a corrupted conversation.

### 4.5 `steer` is a duplicate of `interrupt`

`src/agent/loop.ts:127-135` — both branches call the identical
`ctx.queue.interrupt(sessionId)`. The comment claims steer *"keeps its partial
output in context"*; no code does that.

### 4.6 A comment describing a system that does not exist

`src/agent/loop.ts:136-137`:

> `// For 'followup' and 'collect', we just proceed — the queue`
> `// ensures FIFO ordering via the gateway's enqueue mechanism.`

There is no enqueue mechanism. `enqueue` is what creates the non-FIFO state.

---

## 5. What is genuinely strong

Not padding — these are real and should not be sacrificed to chase parity.

- **Capability probing.** `src/providers/probe.ts` — `probeOnce`,
  `ReasoningMechanism`, `BLAMES_REASONING`, 7-day TTL. The provider layer
  *detects* what a server accepts rather than hardcoding per host. This is more
  sophisticated than most integrations do.
- **Thinking levels with correct per-provider translation.**
  `src/providers/capabilities.ts:16-18` (`none|low|medium|high|xhigh|max`),
  `thinkingLevelToEffort` at `:162`, and `applyThinking` in `openai.ts` sends
  exactly one of effort/budget after discovering which the server takes. The
  Kilo 400 (`Cannot specify both 'effort' and 'max_tokens'`) is fixed by
  measurement, not by guesswork.
- **Three-layer reasoning extraction.** `basic()` in `openai.ts` reads
  `reasoning`, `reasoning_content`, and `thinking`; streaming reads all three.
  Measured 471 chars returned vs 0 extracted before the fix.
- **Optional vector memory that degrades cleanly.** `src/agent/embed.ts` keeps
  a zero-dependency core and activates embeddings only if the user installs a
  feature-extraction package (`memory.ts:89`).
- **Real observability primitives.** `src/core/tracing.ts` —
  `startRun`/`addSpan`/`endRun`/`addToolCall`, wired into `loop.ts:150`.
- **A real gateway with a real protocol surface.** 61 `/api` routes, SSE
  streaming, turn identity (`newRunId()`), turn polling, and interrupt —
  `server.ts:255`, `:715`, `:749`, `:768`, `:793`.
- **Genuine proactive subsystems.** `src/agent/heartbeat.ts`, `dream.ts`,
  `src/cron/scheduler.ts` — all three call `runTurn` directly, and the gateway
  logs confirm all three start on boot.
- **Thinking persistence end-to-end.** Persisted on the final assistant append
  (`loop.ts` ~`:314`), typed on `Entry`, and rendered on history replay in the UI.

---

## 6. The honest summary

TermCrab is not a chat bot with a model attached. It has a gateway, streaming,
session persistence, six thinking levels, a provider layer that probes server
capabilities, cron, heartbeat, memory consolidation, optional embeddings,
subagents, approvals, seven channel files, a 23-command CLI, and 330 tests.

What it does not have is **the layer above all of that.** The run is a function
call, not a resource. Nothing owns a turn, orders turns, watches for stuck ones,
lets you list what is running, or guarantees a single writer. The queue that
would have provided all four exists, is tested, and is never drained.

That single fact explains the three-surface confusion: each surface was built by
calling `runTurn` directly, so each one re-implements admission, streaming, and
state on its own, and none of them agree.

Fixing §4 is a small, bounded piece of work with an outsized effect. It is the
first item in `docs/GAP-ROADMAP.md`.