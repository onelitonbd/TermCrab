# Why ours feels like a chat bot, and OpenClaw feels like an agent management system

**Compiled:** 2026-10-03
**Method:** read both systems' actual code. OpenClaw from the installed package
(`openclaw@2026.9.2`, `/usr/lib/node_modules/openclaw` — shipped `dist` plus its
`docs/`); TermCrab from this repository's `src/` and `ui/`. Every claim below
carries a file reference or a run output. Nothing here is inherited from
`OPENCLAW_REPORT.md` or from the earlier `openclaw-vs-termcrab.md` scoreboard.

This document answers one question. It is not a feature comparison.

> Two agents, both with a gateway, both streaming, both with cron, both with
> memory. One reads as a messaging app with a model behind it. The other reads
> as infrastructure that runs agents. **What is the architectural difference?**

---

## 0. The answer in one paragraph

The difference is **where the agent lives**.

In TermCrab the agent is a **function called from a request handler**. `runTurn()`
is `await`ed inside a route. The agent's lifetime is the HTTP request. Nothing
outside that call can see it, address it, queue behind it, cancel it reliably,
or inherit from it. When the response is written, the agent is gone.

In OpenClaw the agent is a **resource with an identity**. It is *admitted*
through a queue, it is *fenced* against concurrent writers, it is *awaited* by
ID from outside the process, it is *classified* by kind, it is *parented* to the
run that spawned it, and it is *listed* in a console with 35 management pages.

Everything that feels different follows from that one distinction. It is not a
matter of having more features. TermCrab has a real gateway, real SSE streaming,
real cron, real heartbeat, real dreaming, real approvals, real named agents. The
gap is that **the run is not an object.** It is a stack frame.

The rest of this document is the evidence, in the order the difference becomes
visible.

---

## 1. Admission: an ack with an ID, versus a request that is serviced

### OpenClaw

The `agent` RPC **does not run the agent.** It admits it:

> `agent` RPC validates params, resolves the session (`sessionKey`/`sessionId`),
> persists session metadata, and returns `{ runId, acceptedAt }` **immediately**.
> — `docs/concepts/agent-loop.md`

And there is a *separate* call to observe it, usable by anything, from anywhere:

> `agent.wait` (`waitForAgentRun`) waits for **lifecycle end/error** on a `runId`
> and returns `{ status: ok|error|timeout, startedAt, endedAt, error? }`.
> — `docs/concepts/agent-loop.md`

The client holds an identity for the work it submitted. The work outlives the
request that created it.

### TermCrab

`POST /api/chat` (`src/gateway/server.ts:749`) does this:

```ts
const turn = agentQueue.enqueue({ sessionId, userMessage: message, channel: 'web', ... });
void processQueuedTurn(agent, agentQueue, turn.id, sessionId);
json(res, 202, { turnId: turn.id, sessionId: ..., ... });
```

`void processQueuedTurn(...)` is a **detached promise with no owner**. It is
fire-and-forget inside a module-level function closure. Nothing holds it, nothing
awaits it, nothing can time it out, and if it rejects after the response is sent
the only trace is a `markError` on an in-memory object.

The `turnId` is real and the UI does poll it (`GET /api/chat/:sid/:turnId`,
`src/gateway/server.ts:768`). So the *shape* is right. But the difference is that
nothing in TermCrab **owns** the run — it is a promise that was discarded.

---

## 2. The queue is not a queue

This is the most consequential finding, and it is not a stylistic complaint.

`SessionQueue.enqueue()` (`src/agent/sessions.ts:277`) is a pure array append:

```ts
enqueue(turn): QueuedTurn {
  const full = { ...turn, id: ..., enqueuedAt: Date.now(), status: 'queued' };
  const q = this.queues.get(full.sessionId) ?? [];
  q.push(full);                                  // <-- appended, never gated
  this.queues.set(full.sessionId, q);
  return full;
}
```

There is no admission control. And then the decisive check:

```
$ grep -rn "dequeue(" src/ --include=*.ts | grep -v sessions.ts
(no output)
```

**`dequeue()` is never called in production code.** It exists, it is tested in
`test/queue.test.ts`, and nothing uses it. The queue is therefore never *drained
in order* — the only thing that ever starts a turn is `processQueuedTurn`, called
unconditionally and immediately after `enqueue`, bypassing `dequeue` entirely.

The array is a **status registry**, not a queue. Nothing waits.

### Consequence, demonstrated

Two messages sent to one session, run against the real compiled class:

```
$ node -e "...require('./dist/src/agent/sessions.js')..."
  enqueue is pure append, no admission gate:
   queued length: 2 -> both accepted, neither waited
   running map is keyed by sessionId only:
   getRunning -> 3fd573c4 ( B )  <-- turn A is now unreachable/orphaned
   A status: running | B status: running
   interrupt() would abort: B
   => A is neither running nor interruptible: its AbortController was overwritten
```

`SessionQueue.running` is a `Map<sessionId, QueuedTurn>`
(`src/agent/sessions.ts:271`). Two concurrent turns on one session both call
`markRunning`, and the second overwrites the first. Turn A reports
`status: 'running'` while having no reachable `AbortController` and no way to be
interrupted. Its abort signal is orphaned in the map under a key nobody will
look up again.

Both turns then read and append the same transcript concurrently.

---

## 3. All four queue modes are dead code on every real path

`queueMode` is a documented, user-facing config option:

- `src/core/config.ts:57` — `queueMode: 'followup' | 'steer' | 'collect' | 'interrupt'`
- `src/core/config.ts:156` — default `'followup'`

`runTurn` implements it at `src/agent/loop.ts:121-138`:

```ts
if (ctx.queue && !opts.skipQueue) {
  const mode = ctx.config.agent.queueMode || 'followup';
  const running = ctx.queue.getRunning(sessionId);
  if (running && mode === 'interrupt') { ctx.queue.interrupt(sessionId); ... }
  else if (running && mode === 'steer') { ctx.queue.interrupt(sessionId); ... }
  // For 'followup' and 'collect', we just proceed — the queue
  // ensures FIFO ordering via the gateway's enqueue mechanism.
}
```

**Neither branch is reachable.**

| path | why |
|---|---|
| **Web chat** (`server.ts:749`) | the only caller that enqueues is `processQueuedTurn`, which passes `skipQueue: true` (`server.ts:393`) |
| **Telegram / inline** (`server.ts:531`) | `await runTurn(...)` directly, and `markRunning` appears in exactly one place in `src/` — inside `processQueuedTurn` (`server.ts:382`). So `getRunning()` returns `undefined` and both conditions are false |
| **webhook** (`server.ts:699`) | same as web chat — `processQueuedTurn` → `skipQueue: true` |

`markRunning` is called from exactly one line in the entire codebase, and every
turn that passes through it also sets `skipQueue: true`. The block is therefore
unreachable in production, for all four modes.

Setting `queueMode` in config has **no observable effect**.

### Two further defects in the same block

**`steer` is a duplicate of `interrupt`.** Both branches call the identical
`ctx.queue.interrupt(sessionId)`. The comment claims steer *"keeps its partial
output in context"* — no code does that. OpenClaw's steer is a genuinely
different mode: it feeds `resolvePreparedReplyQueueState` a mode-specific action
and, in the `interrupt` case, calls `params.interruptActiveRun()`
(`dist/get-reply-run-queue-*.js`).

**The closing comment is false.** *"the queue ensures FIFO ordering via the
gateway's enqueue mechanism"* — there is no enqueue mechanism. `enqueue` is the
thing that creates the non-FIFO state; `dequeue` is the thing that would fix it,
and it is never called.

---

## 4. No writer fence: two turns can interleave a transcript

### OpenClaw

> Before streaming, an admitted run records its durable `activeWriterRunId`
> claim. Every transcript append or rewrite supplies `expectedWriterRunId`, and
> the synchronous commit transaction **verifies that it still matches the active
> claim. A superseded run therefore cannot commit stale transcript data.** The
> SQLite writer queue orders per-agent mutations, while the Gateway
> state-directory lock prevents another Gateway or `openclaw agent --local`
> process from owning the same state directory concurrently.
> — `docs/concepts/agent-loop.md`

That is four independent mechanisms for one property: *only one writer per
session, ever.* Claim, verify-on-commit, queue, and cross-process lock.

### TermCrab

`src/agent/sessions.ts` — the entire persistence primitive:

```ts
append(sessionId: string, entry: Entry): void {
  const f = this.file(sessionId);
  fs.appendFileSync(f, `${JSON.stringify(entry)}\n`, 'utf8');
  this.maybeTrim(sessionId);
}
```

No claim. No verification. No transaction. No lock. Append order is whatever
order two `await`ed `runTurn`s happen to reach the disk — so with two concurrent
turns you can get:

```
user: A
assistant: <partial reply to B>     <-- interleaved
tool: ...
user: B
assistant: <reply to A>
```

which then replays into the provider as a corrupted transcript.

OpenClaw pays for this with SQLite. TermCrab's `appendFileSync` on a JSONL file
is genuinely simpler, and for the single-writer case it is the right call. The
point is not that the storage format is wrong — it is that **there is no
mechanism making the single-writer assumption true**, and the queue that was
supposed to guarantee it is the thing that isn't working.

---

## 5. Sessions are strings here, and objects there

### OpenClaw: a classified, parented tree

`dist/classify-session-kind-*.js` — real code, shipped:

```js
function classifySessionKind(key, entry) {
  if (key === "global") return "global";
  if (key === "unknown") return "unknown";
  if (isCronSessionKey(key)) return "cron";
  if (entry?.spawnedBy) return "spawn-child";        // <-- parent link
  if (entry?.chatType === "group" || entry?.chatType === "channel") return "group";
  if (key.includes(":group:") || key.includes(":channel:")) return "group";
  return "direct";
}
```

Every session has a **kind** and, if spawned, a **parent**. That makes the
session set a navigable tree: `web:main` → its subagents → their children. The
Control UI renders it as a catalog (`app-sidebar-session-catalog-render`).

An **agent** is a first-class scope, not a label (`docs/concepts/multi-agent.md`):

> An **agent** is the full per-persona scope: workspace files, auth profiles,
> model registry, and session store. A **binding** maps a channel account to one
> of those agents.

Each agent gets its own workspace, its own `agentDir`, and its own
`openclaw-agent.sqlite`. Adding an agent is a configuration entry, not a string
prefix.

### TermCrab: a prefixed string

`src/agent/loop.ts:118-119`:

```ts
const agentName = opts.agent ? sanitizeAgentName(opts.agent) ?? undefined : undefined;
const sessionId = agentName ? `${agentName}:${opts.sessionId}` : opts.sessionId;
```

That is the whole multi-agent model — a namespace prefix on a string. There is no
kind, no parent, no classification function, no per-agent store. `@name` routing
works because `parseAgentPrefix` (`server.ts:529`) rewrites the message; the
"agent" has no workspace of its own, no auth profile, and no memory. `listAgents()`
enumerates `workspace/agents/*/SOUL.md` files and nothing else. (`parseAgentPrefix`
is called at `server.ts:530`.)

### Storage and the ability to inspect it

| | OpenClaw | TermCrab |
|---|---|---|
| store | `openclaw-agent.sqlite` per agent | `~/.termcrab/sessions/*.jsonl` |
| health | `doctor-session-snapshots`, `doctor-session-sqlite`, `doctor-session-sqlite-migration-run`, `doctor-session-transcripts` | none |
| stuck detection | `diagnostic-stuck-session-recovery` | none |
| shutdown | `active-sessions-shutdown-tracker` | none |
| cost | `commands-session-cost` | tracing spans, not per-session cost |

OpenClaw can ask "is any session wedged?" and answer. TermCrab cannot ask the
question.

---

## 6. The console is the product

The single most visible difference is the management surface.

**OpenClaw — 35 Control UI pages:**

```
about  activity  agents  approvals  apps  channels  chat  cloud-workers  config
connection  cron  custodian  dashboards  debug  device  devices  labs
lobsterdex  logs  meetings  memory-import  model-providers  model-setup
permissions  plugin  plugins  portals  profile  secrets  sessions
skill-workshop  skills  tasks  usage  worktrees
```

Read that list as a set of verbs applied to agents: **list, inspect, approve,
cancel, scope, budget, isolate, extend, schedule.** `worktrees` gives each task
its own git worktree. `custodian` is a supervising process. `permissions` and
`approvals` are separate surfaces from `tools`.

**TermCrab — 9 views:**

```
chat  status  providers  models  memory  tools  settings  logs  debug
```

Of those nine, **four are configuration pickers** (`providers`, `models`,
`tools`, `settings`) and two are diagnostics (`logs`, `debug`). Exactly one —
`chat` — is where work happens. `status` is a dashboard, not a control surface.

The API is not the gap; it has 61 routes. The gap is that **the run is never
surfaced as a thing you can look at.** You can poll one turn you just submitted,
and interrupt the current turn on a session. There is no list of runs, no run
detail, no per-agent view, no budget view.

This is why the product *feels* like a chat app: because from the interface, the
only object in existence is a conversation.

---

## 7. The protocol underneath

| | OpenClaw | TermCrab |
|---|---|---|
| transport | WebSocket, typed frames | HTTP + SSE |
| schema | TypeBox → JSON Schema → **generated Swift models** | none |
| frame types | `req` / `res` / `event`, with `seq` and `stateVersion` | request/response; SSE frames |
| identity | device identity per client, pairing store, `connect.challenge` nonce signed, metadata pinned on reconnect | none |
| side effects | idempotency keys required for `send`/`agent`, server-side dedupe cache | none |
| liveness | `presence`, `health`, `tick` events, `hello-ok` snapshot | none |
| event bus | gateway pipeline | `src/gateway/events.ts` — 31 lines, in-process `Set<Handler>` |

TermCrab's event bus is a correct small thing: it fans agent events out to SSE
clients and swallows subscriber errors so a broken client cannot kill a run. For
one process on one port that is enough. It is simply not a control plane.

---

## 8. Why this is *felt* rather than read

The six mechanisms above produce a specific experience:

1. **You type, you wait, text appears.** The only visible unit is the reply,
   because the reply is the only thing with a lifetime you can see.
2. **"What is it doing?" has no answer.** There is no run list. The system's only
   way to report state is to emit more text — so the *only* way to know its state
   is to read its output. That is the chat bot's fundamental constraint: **state
   is expressed as conversation, because conversation is the only channel.**
3. **Interrupting is unreliable.** `interrupt(sessionId)` aborts whatever is in
   `running`, which may not be what the user was looking at, and may be a turn
   whose controller was already overwritten (§2).
4. **Nothing has a name.** Sessions are strings; agents are prefixes. You cannot
   point at a thing and say "that one".
5. **Nothing is inherited.** Subagent output does not appear as a child of its
   parent anywhere you can navigate.
6. **The interface is a transcript.** Nine views, four of them pickers. You are
   looking at a conversation, so it is a chat app.

OpenClaw inverts all six: you get an ack with an ID, the work is admitted behind
a queue, ordering is guaranteed, the writer is fenced, the session is classified
and parented, and there are 35 pages whose job is to let you *manage* the thing
rather than read it.

---

## 9. What TermCrab already has — stated fairly

The earlier self-comparison in `web:main.jsonl` marked most of these as absent.
They are not absent. Verified in source and in the running gateway:

- **Gateway** — `src/gateway/server.ts`, default port 7788, live and serving.
- **Streaming** — SSE at `server.ts:715`; `onDelta` / `onThinkingDelta` threaded
  through `loop.ts:96-109`.
- **Turn identity** — `newRunId()` (`loop.ts:114`), emitted as `run:start`/`run:end`.
- **Named agents** — `@name` routing, per-agent `SOUL.md`, session namespacing.
- **Six thinking levels** — `none|low|medium|high|xhigh|max`
  (`providers/capabilities.ts:16-18`), with provider capability probing.
- **Proactivity** — `src/agent/heartbeat.ts`, `dream.ts`; the gateway logs
  *"cron scheduler: started"*, *"heartbeat scheduled every 60min"*, *"dream
  scheduler: checking every hour"* on every boot.
- **Approvals** — `AgentEvent` carries `approval`; `core/approvals.ts` gates exec.
- **Compaction** — `compactThreshold` in `runTurn` (`loop.ts:153`).
- **Optional vector memory** — `src/agent/embed.ts`, wired at `memory.ts:89`.
- **Tracing** — `startRun`/`addSpan`/`endRun` per run (`core/tracing.ts`).

None of that is nothing. The point of this report is that **all of it operates
per-turn, inside a request, with no resource above it.** The features exist; the
*management layer* does not.

---

## 10. The highest-leverage fix

One change converts most of this, and it is small.

**Make `dequeue()` real.** Implement a per-session FIFO pump: a single worker per
session key that pulls from `queues`, calls `runTurn`, and marks the turn done —
instead of `void processQueuedTurn(...)` firing immediately on every enqueue.
Then, before the append, record an `activeWriterRunId` claim and have
`sessions.append()` verify it, so a superseded turn cannot commit.

That single change:

- makes `dequeue()` live instead of test-only;
- turns `enqueue` from "accept everything, run concurrently" into real admission;
- makes `followup` and `collect` mean something;
- makes `steer` and `interrupt` distinguishable, because a pump has a predecessor
  to steer *into* rather than just something to abort;
- makes `running` hold exactly one turn, which fixes the orphaned-abort bug in §2;
- and gives the UI something true to list.

Nothing in that list requires SQLite. It requires deciding that **a turn is an
object with an owner**, and then making the code match the decision.

The follow-on work is what turns it from a fix into a product: a runs list, a
per-agent view, a cost view, and session kind/parent — the §5 and §6 gaps.

---

## 11. Limits of this report

- I read OpenClaw's **shipped bundle and documentation**, not its source repo.
  Only `dist/` is installed (`src/` is absent), but the bundler preserved
  original module paths in `//#region src/...` markers, so file-level claims
  are reliable; line-level claims about internals are about the shipped code as
  of `2026.9.2`.
- TermCrab claims were checked against `src/` in this worktree and, where noted,
  against the running gateway. The concurrency demonstration in §2 was executed
  against the compiled `dist` class, not reasoned about.
- I did not evaluate OpenClaw's *quality* — only its shape. It has a documented
  CVE history and 1,142 advisories in its first five months; that is a real
  argument against it and is orthogonal to everything above.