# The road to "better than OpenClaw"

**Written:** 2026-10-03 · **Companion to:** [TRACKER.md](TRACKER.md) (measured state), [`sections/`](sections/) (their whole docs site, page by page), [`00-SITE-MAP.md`](00-SITE-MAP.md) (the map).
**Effort numbers** come from the census (`node scripts/census.mjs`), where every capability carries a remaining-effort estimate and a probe.

---

## 0. First, settle what "passing OpenClaw" means

You cannot out-feature them. 2,000 contributors, 390k stars, 164 extensions, 30+ channels, apps for four platforms. Any plan whose success condition is "more features than OpenClaw" is a plan to lose slowly.

But you can beat them on one axis, and the axis picks itself. OpenClaw's 1,335 pages contain **no supported Android path**. Their phone story is: install proot Ubuntu (~3GB), hand-patch a Node shim to stop the Error-13 crash, keep it alive with tmux and hope. Yours is: install natively, zero runtime deps, supervisor, wake-lock, boot scripts, battery-aware heartbeat, offline outbox.

So the finish line is not "parity". It is:

> **An agent that runs natively on a phone someone already owns, survives a week on battery, and can be trusted with real work.**

Measurable form — the five conditions, all of which are either ✅ or reachable inside the parity lane:

| # | Condition | Where it stands | Cost |
|---|---|---|---|
| 1 | **Nothing broken.** No capability in the tree that no code calls. | 7 broken rows | 40d (core lane) |
| 2 | **Safe to expose.** Auth enforced, webhooks signed, approvals gating dangerous tools. | auth + webhook tokens enforced (2026-10-03); approvals still dead | 5d (inside core) |
| 3 | **It doesn't forget.** Memory that returns recent facts; compaction that summarises instead of deleting. | both broken today | 6d (inside core) |
| 4 | **It can be driven from the terminal.** A real TUI with streaming, abort and pickers. | absent | 15d |
| 5 | **It can grow without core edits.** A minimal plugin API for tools and channels. | absent | 15d |

Conditions 1–5 are ~95 days of work. That is the plan. Everything after that is either the moat (§3) or the kill list (§4).

---

## 1. The lanes, honestly costed

| Lane | Checks | Effort | What it means |
|---|---:|---:|---|
| **core** | 13 | **~40d** | finish what is already half-built; every item is a defect, not a feature |
| **parity** | 108 | ~278d | be genuinely competitive on the axes a phone-first agent needs |
| **later** | 28 | ~164d | deferred on purpose — a native companion app alone is 20d, the plugin registry/25 channels are an ecosystem you are deliberately not cloning |
| total | 149 | ~482d | the cost of matching them 1:1, which is the wrong goal |

**Realistic calendar.** Core lane at a focused 3 days/week: **~14 weeks**. Core + parity at the same pace: **~2 years**. Core + parity full-time: **~7–8 months**. Anyone promising you faster is not counting the tests.

---

## 2. Phase 0 — the core lane (~40 days): finish what is already written

Each item below is a defect: the code exists and nothing reaches it. Each has a **done test** — an observable behaviour, not a checkbox.

### 2.1 Security spine (8 days)

| # | Task | Where | Days | Done test |
|---|---|---|---:|---|
| 1 | Enforce `checkToken` on every `/api/*` route | `src/gateway/auth.ts:16` → `src/gateway/server.ts:712` | 1 | `curl :7788/api/memory` without a token → 401 |
| 2 | Re-enable webhook token validation | `src/gateway/server.ts:691` | 0.5 | POST to `/api/hooks/x` with a wrong token → 401 |
| 3 | Gate `exec` (and any destructive tool) behind approvals | `src/core/approvals.ts` → `src/agent/loop.ts` tool dispatch | 5 | With `approvals.enabled`, `exec` waits for a human decision and times out safely |
| 4 | Make the bind guard test-covered | `src/gateway/server.ts:257` | 0.5 | A test asserts non-loopback without token refuses to start |
| 5 | Sandbox doc + honest defaults | `docs/SECURITY.md` | 1 | `SECURITY.md` states exactly what is and is not isolated |

> Why first: a phone agent with an open port on the local network is a worse product than one with fewer features. This week also removes the class of bug (webhook, batch jobs, LAN scans) that would end the project's reputation on day one of any launch.

### 2.2 The agent loop actually being a queue (10 days)

| # | Task | Where | Days | Done test |
|---|---|---|---:|---|
| 6 | Drain the `SessionQueue`: one runner per session | `src/agent/sessions.ts:269-434` + `src/gateway/server.ts:732` | 4 | Two messages sent 100ms apart run **serially**, transcript order is stable |
| 7 | Make `queueMode` real: `followup` (default), `collect` (debounce+coalesce), `interrupt` (abort current) | `src/core/config.ts:56`, `src/agent/loop.ts:124` | 4 | Each mode has an integration test proving its documented effect |
| 8 | Record run identity + expose a wait endpoint | `src/agent/loop.ts:114` | 2 | `GET /api/chat/:turnId` returns terminal state + final text |

`steer` (inject mid-run) is explicitly **not** in Phase 0 — it needs a runtime boundary in the loop, and it is the one queue mode that is genuinely hard. It goes in Phase 1 (§3.2) and until then `steer` should be removed from the config enum rather than silently behaving like `followup`.

### 2.3 Memory and context that don't lose data (6 days)

| # | Task | Where | Days | Done test |
|---|---|---|---:|---|
| 9 | Memory injection: budgeted **tail** + search-selected slice, not `readHead` | `src/agent/prompt.ts` | 2 | Write a fact, restart, ask about it → the agent knows it |
| 10 | Non-destructive compaction: keep `.jsonl`, write summaries to a separate file | `src/agent/sessions.ts:154,187` | 2 | After 3 compactions the original lines are all still on disk |
| 11 | Real summarisation for compaction (local model when configured, else extractive) | `src/agent/dream.ts` pattern reused | 2 | A digest is a summary, not a 200-char truncation |

### 2.4 Trackable state (5 days)

| # | Task | Where | Days | Done test |
|---|---|---|---:|---|
| 12 | Transcript write fencing: a writer claim per session, checked on append | `src/agent/sessions.ts` | 4 | CLI + gateway writing one session cannot interleave lines |
| 13 | Fix or delete the aspirational architecture doc | `docs/ARCHITECTURE.md` | 1 | Every file listed in it exists (a script checks this — see `census.mjs` row "Docs that match the code") |

### 2.5 Cost visibility (3 days)

| # | Task | Where | Days | Done test |
|---|---|---|---:|---|
| 14 | Carry `usage` from the provider response into events + UI | `src/providers/types.ts`, `src/agent/loop.ts`, `ui/index.html` | 3 | The panel shows tokens (and estimated cost) per turn and per day |

### 2.6 Telegram surface (4 days)

| # | Task | Where | Days | Done test |
|---|---|---|---:|---|
| 15 | Telegram command surface: `/help /new /model /status /agents /as /stop` (+ `/queue`) | `src/gateway/server.ts:498-515` | 4 | Every command is listed by `/help` and behaves as documented |

**Phase 0 exit criteria (all measurable):** census shows `BROKEN ≤ 1`, `core` lane effort = 0, and the four done-tests in §2.1/§2.3 pass. Estimated: **40 days ≈ 13 weeks part-time.** After this, TermCrab is a small, honest, trustworthy agent — and the "loopholes everywhere" feeling you described is gone, because the loopholes have names.

---

## 3. Phase 1 — the parity that matters (~90 days of the 282)

Do not do the other 190 days. These are the ones that change what the product can do.

### 3.1 Surfaces (the terminal you named) — 30d
1. **Per-command `--help` and `--json` everywhere** (5d). Today `--help` throws on 21 of 22 commands and only `doctor` speaks JSON. This is the cheapest credibility win in the repo.
2. **Real TUI** (15d): raw mode, streaming pane, tool cards, abort (Esc), session/agent/model pickers, `--local` and gateway-attached modes. Their spec is public and catalogued — see [`sections/`](sections/) `/cli/tui` and `/web/tui`.
3. **Web panel: split the 6,779-line file** (10d) into modules with a build step, keep it mobile-first. The single file is why UI regressions are invisible until runtime.

### 3.2 Agent runtime — 25d
4. **Steering** (5d) — the one hard queue mode, after §2.2 makes the queue real.
5. **Parallel tool batches** (4d) — `loop.ts:245` is sequential; parallelism is a direct latency win on a phone.
6. **Idle watchdog + stuck-session notices** (4d) — "it hung and I didn't know for 20 minutes" is the worst mobile failure mode.
7. **Session lifecycle policies** (4d): `idle`/`daily` resets, `dmScope`, and one `agent:<id>:main` session instead of five silos.
8. **Hooks** (8d): the minimum useful set — `before_tool_call`, `after_tool_call`, `message_received`, `session_start/end`. This is also the escape hatch that replaces half of the plugin API.

### 3.3 Memory — 15d
9. **Hybrid retrieval** (6d): BM25 + embeddings + recency decay, with results injected into the prompt by score. Today memory search is substring counting; the docs pages `/concepts/memory-search` show what "good" looks like.
10. **`USER.md` + provenance** (6d): a separate user model, and an `owner|agent|untrusted|system` tag on every memory write (this is what stops a web-page fetch from permanently poisoning memory).
11. **`/context` introspection** (3d): show what is actually in the prompt, per turn. You cannot debug a memory bug you cannot see.

### 3.4 Reach — 20d
12. **Media in and out** (4d): Telegram photos/documents/voice in, images out. A phone agent that cannot receive a photo is leaving its best sensor unused.
13. **Typing indicators + progress drafts** (4d) — the difference between "thinking" and "dead".
14. **Scheduled delivery to a chat** (3d): cron output routed to a chosen channel.
15. **Native Anthropic + Gemini adapters** (7d), or remove those names from config/onboarding.
16. **Services/ops polish** (2d): a `termcrab service install` that wraps the supervisor for non-Termux hosts.

### 3.5 Growth without core edits — 20d
17. **Minimal plugin API** (15d): `plugins/<name>/plugin.{js,json}`, `registerTool()`, `registerChannel()`, local-only install, no registry. Fifteen days buys you the end of "every new feature is a core edit".
18. **Skill porting sprint** (5d): port 10–15 of their highest-value bundled skills (they publish 49, catalogued in [`sections/`](sections/)); skills are markdown, so this is the cheapest capability-per-day in the whole roadmap.

**Phase 1 exit criteria:** census `parity` lane ≈ 90d consumed, capability score **≥ 65%**, and — the only one that really matters — a stranger on Termux can install it, connect Telegram, run a scheduled task and get the result in a chat without reading the source.

---

## 4. The kill list (the `later` lane, ~164d you will not spend)

Write these down so they stop occupying your head. Every one of them is a deliberate "no", not a "not yet":

| Not building | Why | Their cost |
|---|---|---:|
| Native desktop apps (macOS/Windows/Linux) | you are a phone agent | ~0 for you, huge for them |
| A native companion app (iOS/Android) | Termux:API + the web panel already reaches the hardware; a native app is 20d and a second codebase to maintain | 20d |
| iMessage, Teams, Google Chat, LINE, Feishu, IRC, Nostr, Twitch, Zalo, QQ, … | 25+ channels means 25 maintenance surfaces and optional native deps that don't install on Termux. Ship 3 well. | 25d |
| ClawHub-style registry + signed skill marketplace | their registry is where 1,467 malicious skills appeared (ClawHavoc). No registry = no supply chain = a real security story | 20d |
| Docker / Fly / Nix / Kubernetes deploy paths | the deployment target is the phone in your pocket | 8d |
| Cloud workers, sessions, fleets, workboards | requires a data centre story you do not want | 15d |
| Image / video / music generation | API-cost features with no phone story | 6d |
| ACP / Swarm / Codex harness integrations | ecosystem integrations for developers on desktops | 20d |
| A CPython-class sandbox | `code_exec`'s Node `vm` covers the common cases; a real sandbox is a project of its own | 8d |
| Full provenance/taint system | do the 6-day version in §3.3, not the 10-day OpenClaw one | 4d |

**Rule of thumb to keep the list honest:** if a feature only makes sense on a laptop, or only exists because they have 2,000 contributors, it goes on this list — with a date, so "later" doesn't quietly become "never" or "someday".

---

## 5. Order of operations (one line each)

```
Week 1     auth enforced · webhooks signed · bind guard tested
Week 2-3   approvals gating exec · queue drained (serialization)
Week 4     queue modes followup/collect/interrupt · run identity
Week 5     memory injection · non-destructive compaction · real summaries
Week 6     write fencing · architecture doc fixed · usage accounting
Week 7-8   Telegram commands · per-command --help · --json everywhere
Week 9-12  TUI
Month 4    steering · parallel batches · watchdogs · session policies · hooks
Month 5    memory retrieval · USER.md + provenance · /context · media
Month 6    plugin API · skill sprint · release-quality docs
```

---

## 6. The weekly loop (how you stop losing track)

This is the part that answers "আমি ট্র্যাক রাখতে পারতেছি না".

1. **Monday — measure, don't remember.** `node scripts/census.mjs`. Three numbers matter: capability score, `core` lane days, DRIFT count.
2. **Pick one row, write its done test first.** If you cannot express the finished thing as an observable command, the row is not specified yet.
3. **Touch the tracker once per commit.** If a probe goes DRIFT, re-read the row and re-judge it. Two minutes, every time.
4. **Monthly — diff against them.** `.cache/openclaw` pull + `node scripts/openclaw-docs-report.mjs --docs .cache/openclaw/docs`. Read the *diff* of [`00-SITE-MAP.md`](00-SITE-MAP.md), not the whole site: it lists exactly what they shipped while you worked.
5. **Read the section for the thing you're touching**, not the whole catalogue: [`sections/`](sections/) holds all 1,335 of their pages with a one-line summary, a heading outline and a TermCrab verdict each. Deep-dive judgement is in [`analysis/`](analysis/).
6. **Monthly — one line in the changelog**, in user language. "The agent now remembers what you told it yesterday" is a better progress metric than "50%".

The point of the loop is that the answer to "where am I?" stops living in your head. The head is for judgment; the repo should carry the state.
