# Agent loop and queues

**Their pages** (catalogued in [`../sections/04-agents.md`](../sections/04-agents.md), [`../sections/05-capabilities.md`](../sections/05-capabilities.md)):
`/concepts/agent-loop` · `/concepts/queue` · `/concepts/queue-steering` · `/concepts/streaming` · `/concepts/session` · `/concepts/session-pruning` · `/concepts/compaction` · `/concepts/multi-agent` · `/concepts/retry` · `/concepts/usage-tracking`

---

## 1. What they document (and what it buys them)

OpenClaw's queue page is the single most instructive page on their site for TermCrab, because it describes exactly the machine TermCrab has half-built:

- **Lane-aware FIFO**, one concurrency cap per lane; `main` gets `max(8, cpus×4)`, sub-agents 8 per spawner, swarm collectors 32 per group.
- **Session-key lane** — every runtime (CLI, embedded, Codex) waits in `session:<key>` before taking the session's execution claim, "so changing runtimes cannot start a competing turn".
- **Four modes**: `steer` (inject into the live run, tools never skipped for steering, skipped calls get synthetic error results so the transcript stays valid), `followup`, `collect` (coalesce after a quiet window), `interrupt`.
- **Defaults**: `mode: steer`, 500 ms debounce, `cap: 20`, `drop: summarize`, with per-session `/queue` overrides and a documented precedence chain.
- **Typing indicators fire on enqueue**, so the user sees activity while the run waits.

That is not a feature list; it is a correctness argument about concurrent turns, and it exists because they got it wrong in public first.

## 2. Where TermCrab is

**Real, working:**
- Streaming deltas end-to-end (`src/providers/openai.ts` SSE → `src/agent/loop.ts` → `/api/events`).
- Tool round-trips with start/end events and previews.
- **Failover chain with cooldowns** (`src/providers/index.ts`) — better than many small agents.
- **Repetition detector** (`src/agent/loop.ts:249-264`) — a genuinely good guard.
- Thinking levels + effort mapping (`src/providers/capabilities.ts`).
- Subagents: `sessions_spawn`, `agents_wait`, `sessions_yield` (`src/agent/toolbox.ts:798,853,880`).
- Run ids (`newRunId()`), progress cards, a `tasks.ts` background task registry with `spawnTask`.

**Broken:**
- `SessionQueue` (`src/agent/sessions.ts:269-434`) — complete with modes — and `dequeue()` at `:291` **is called nowhere**. `src/gateway/server.ts:393` passes `skipQueue: true`, and the Telegram path inlines its own turn. Result: the default deployment has **no per-session serialization**; two messages arriving together run concurrently against the same session and transcript.
- `queueMode` (`src/core/config.ts:56`) is read at `loop.ts:124` but has no branch anywhere — every mode behaves like "nothing".
- No abort/stop surface in the web panel, no idle watchdog, no stuck-session notices, sequential tool execution (`loop.ts:245` is a `for await`).

## 3. The gap, sized

| Capability | Theirs | Ours | Days |
|---|---|---|---:|
| Per-session serialization | lane + writer claim | queue object, undrained | 4 |
| `followup` / `collect` / `interrupt` | documented + debounce + cap + drop policy | declared strings only | 4 |
| `steer` | runtime boundary, transcript-valid skipping | nothing | 5 |
| Run identity + terminal wait | `agent.wait`, replay | runIds only | 2 |
| Parallel tool batches | parallel, steering-aware | sequential | 4 |
| Idle watchdog / stuck notices | 120 s/300 s + session notices | single 180 s whole-request timeout | 4 |

## 4. The move

**Do the boring half first.** Draining the queue is ~150 lines: a per-session `for(;;)` runner that dequeues until empty, and passing `skipQueue: false` from the server. That single change makes the product correct under concurrency, which is the state you are in every time you type twice quickly on Telegram.

Then decide the modes by what a phone user needs, not by their table:

- **`followup`** — default. Queue it, run after. Trivially correct.
- **`interrupt`** — abort the running turn. On a phone this is the mode people want when they realise mid-answer that they asked the wrong thing.
- **`collect`** — coalesce burst messages. Telegram users type in bursts; this is the mode that makes the bot feel intelligent.
- **`steer`** — last, and honestly: until the loop has a runtime boundary, ship the product *without* claiming this. Remove `steer` from the config enum rather than accept it and ignore it. A config value that lies is worse than a missing one.

## 5. Done tests (copy into the roadmap when you start)

1. Two messages 100 ms apart produce **serialized** runs and a clean transcript order (`test/queue.test.ts` extension).
2. Each mode has one integration test proving its documented behaviour.
3. `GET /api/chat/:turnId` returns terminal state; a client that disconnects still gets its answer persisted.
4. With the server running, a 3-minute hang produces a `session.stalled`-style event in `/api/events` instead of silence.

## 6. Files that will change

`src/agent/sessions.ts` (queue drain, writer claim) · `src/agent/loop.ts` (mode branches, watchdog, parallel batches) · `src/gateway/server.ts:393,732` (stop skipping the queue) · `src/core/config.ts:56` (enum truth) · `test/queue.test.ts`, `test/loop.test.ts`.
