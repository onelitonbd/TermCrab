# Worklog — what is being built right now

**This is the tracker you asked for.** It answers three questions at any moment:

1. **What is being worked on right now?** → §2 *Now*
2. **What is finished, and how do I know?** → §4 *Done* (each batch: commit + the test that proves it)
3. **What comes next, and how big is it?** → §3 *Next*

**Updated:** 2026-10-03
**Verified by:** `node scripts/status.mjs`. Freshness is automatic: the script counts the commits that landed **after the last commit that touched this file**. Any work commit that forgets to update this file makes the count non-zero → `STALE`, exit code 1, and `npm test` fails on it. No hash to hand-maintain.

> Number-visibility lives in [docs/openclaw/TRACKER.md](docs/openclaw/TRACKER.md) (level vs OpenClaw, measured by `scripts/census.mjs`).
> This file is the *work* tracker: what I am doing, in what order, and what proves it is done.

---

## ১. সারসংক্ষেপ (বাংলায়)

- **এইমাত্র শেষ (ব্যাচ ৫):** কিউ এখন সত্যি — একই সেশনে দুটো মেসেজ আর কখনো একসাথে চলে না; `followup` / `steer` / `collect` / `interrupt` চারটাই কাজ করে; কিউয়ের দৈর্ঘ্য সত্যি; প্যানেলের কম্পোজারে "১ waiting" দেখায়; `termcrab status`-এ লাইভ কিউ-অবস্থা আসে।
- **সংখ্যায়:** ৪৩৭টা টেস্ট · ০ ফেল · ~১৮ সেকেন্ড; census **BROKEN ৭ → ৪** (কিউ-এর তিনটা পাল্টা সারি সব WORKING), drift ০, capability ৪৩% → ৪৬%।
- **পরের কাজ (ব্যাচ ৬):** অ্যাপ্রুভাল গেট — বিপজ্জনক টুল নিজে নিজে চলবে না, প্যানেলে অনুমতি চাইবে। **~৫ দিন, ৫টা ধাপ।**
- **কীভাবে নিজে যাচাই করবে:** `node scripts/status.mjs` (এক সেকেন্ড), `node scripts/status.mjs --tests` (স্যুট সহ), `node scripts/census.mjs`, আর প্যানেলের **Work** পেজ।

---

## 2. Now — batch 5: a queue you can trust (this commit)

**Why:** `SessionQueue.enqueue()` only ever pushed; `dequeue()` had zero callers in `src/`; `markRunning()` left the turn in the waiting array so `queueLength` never dropped; and both gateway enqueue sites fired `void processQueuedTurn(...)` immediately — so two messages in one session genuinely ran in parallel. `queueMode` was read but had no effect, `collect`/`steer` were config values with no code path, and nothing capped a backlog. The queue is now the only way in, with one lane per session and a test for every promise.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 5.1 | A second message in the same session **waits** | ✔ done | `test/queue-serialize.test.ts` 5.1 + 5.7 (real HTTP): the second turn stays `queued`, transcripts never interleave |
| 5.2 | A finished turn leaves the queue | ✔ done | 5.2: `queueLength` is 1 while one waits, 0 when the lane is idle (unit + HTTP) |
| 5.3 | `followup` runs messages in order, one at a time | ✔ done | 5.3: three messages → FIFO order, never more than one run in flight |
| 5.4 | `steer` reaches the running turn — no second turn | ✔ done | 5.4 + 5.4b: same turn id, one `run:start`, the steered text lands in the transcript the model answers |
| 5.5 | `collect` merges a burst into one extra turn | ✔ done | 5.5: three rapid messages → exactly one extra run containing all three |
| 5.6 | `interrupt` cancels the old turn; the new one runs | ✔ done | 5.6: old turn `interrupted` + aborted, the cancelled run never finishes, the new turn runs |
| 5.7 | Panel + CLI show the true queue state | ✔ done | the poll reports `queueLength`; the composer shows "N waiting" and a second message queues instead of stopping the run; `termcrab status` asks the running panel (never guesses) |
| 5.8 | Census rows leave BROKEN | ✔ done | `node scripts/census.mjs` → **BROKEN 7 → 4**, drift 0 (probes: `private async drain`, `MAX_QUEUED_TURNS`, `takeSteers`) |

**Two extras the tests forced:** a backlog is now capped (`MAX_QUEUED_TURNS = 32` → HTTP 429) so a runaway webhook cannot grow the process without bound; and `runTurn` no longer treats `steer` as `interrupt` — a `steer` event plus a transcript entry carry the message into the same run.

**Known limit (declared, not hidden):** the lane covers every queue surface — panel chat (`POST /api/chat`), webhooks, and anything that submits through `SessionQueue`. Channel handlers (Telegram/Discord/Slack/Signal/SMS/Matrix), the voice wake loop and cron still call `runTurn` directly, so two messages that land on the *same session id* from two different surfaces can still overlap. Moving them onto the lane belongs with batch 8 (transcript write fencing), where the writer claim is the real fix.

**Next action:** batch 6 step 6.1 — the failing test that proves a dangerous tool blocks until a human answers.

---

## 3. Next — batch 6: an agent that asks before it acts (core lane, ~5 days, starts after this commit)

`src/core/approvals.ts` exists with `createApproval` / `waitForApproval`, and the panel already has `GET /api/approvals` — but nothing ever creates one. A tool that can delete files, push a branch or spend money runs on the model's say-so alone. OpenClaw gates this ("operator approvals, HITL gates"); the census row is BROKEN for exactly this reason. Tests first, as always.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 6.1 | A tool marked `requiresApproval` stops *before* it runs | ☐ todo | with no answer, the tool body never executes and the turn is pending, not finished |
| 6.2 | Approval reaches the panel and the answer reaches the run | ☐ todo | POST answer → the waiting tool runs (approve) or gets a refusal (deny); SSE emits the card |
| 6.3 | A refusal is a result, not a crash | ☐ todo | denying returns a tool result the model can read ("user refused"), the turn completes, nothing is written |
| 6.4 | Answer without the panel (CLI + chat) | ☐ todo | `termcrab approvals` lists/answers a pending one; the same request id works from either surface |
| 6.5 | Timeout + default policy, and the census row leaves BROKEN | ☐ todo | an unanswered approval expires (configurable, default deny) and says so; `census.mjs` → BROKEN 4 → 3, drift 0 |

**After that** (order fixed, sizes are focused days — and [BEAT-PLAN.md](docs/openclaw/BEAT-PLAN.md) §3 is the authority):

| Batch | What | Size | What proves it |
|---|---|---|---|
| 7 | **Memory that does not forget** — prompt reads recent facts; compaction summarises instead of deleting | ~6d | test: a fact saved today reaches the prompt; full lines stay on disk |
| 8 | **Transcript fencing** — a writer claim so gateway + CLI cannot interleave one JSONL | ~3d | test: second writer refuses (or appends atomically) |
| 9 | **Usage / token accounting** — real token counts, shown in the panel | ~3d | test: a run reports tokens; the panel shows a number |
| 10 | **Tier 0 quick flips** (BEAT-PLAN §2): hot-reload validation, `run --wait`, panel stop, progress drafts, skill precedence, disk budget, release script | ~5.5d | each row's own test; census WORKING +7 |

---

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 5 | `291bcf1` | **A queue you can trust**: one lane per session (second message waits, never interleaves); all four modes really work (`followup` FIFO, `steer` into the live run, `collect` merges a burst, `interrupt` cancels then runs); truthful `queueLength`; backlog capped (429); panel "N waiting" chip + a second message while busy; `termcrab status` reports live queue state from the panel | `test/queue-serialize.test.ts` (10 new cases: unit + loop + real HTTP with a slow upstream), `test/queue.test.ts`, full suite | **437 tests · 0 fail · 18.0 s**; census **BROKEN 7 → 4**, drift 0, capability 46% (was 43%) |
| 1 | `f1c86b8`, `df69070` | install no longer silently builds (`prepare` removed, two visible steps); config-file watcher no longer leaks/keeps the process alive; suite bounded (60s/test) | `test/lifecycle.test.ts` (listener closed, no FSWatcher, port reusable); leak probe `36.2 ms` (was cancelled at `30,023 ms`) | `npm install` **4,537 ms → 500 ms**; full suite now finishes |
| 4 | `8ccb8fd` | **Beat plan**: head-to-head vs OpenClaw from hours-scale beats to the structural moat, every claim cited to their page or to a census row, kill list included; the plan now drives the batch order | `test/beat-plan.test.ts` (tiers, ≥25 beats with effort+proof, census cross-check, file paths) | `docs/openclaw/BEAT-PLAN.md`; 5 new tests |
| 3 | `dd37e60` | **Work tracking**: `WORKLOG.md` + `scripts/status.mjs` + panel **Work** page; freshness is commit-count based, so a commit that skips the tracker fails the suite | `test/worklog.test.ts` (structure, git freshness, `/api/worklog` token-gated, panel view) | `node scripts/status.mjs` → FRESH; 8 new tests |
| 2 | `0ff408b` | panel token enforced on every `/api/*` route (+ password sheet); webhook tokens (`x-hook-token`) compared in constant time; offline brain restored (`--demo`, panel button, `config set provider.type mock`); guards/tests tell the truth; census + tracker corrected | `test/auth.test.ts` (10-route matrix, webhook matrix), `test/offline.test.ts` (CLI + reload + panel path), full suite, live panel smoke | **413 tests · 0 fail · 18.3 s**; census **149 probes, 0 drift, BROKEN 10 → 7**, capability 41% → 43% |

---

## 5. How to check my claims yourself (no trust required)

```bash
node scripts/status.mjs          # is this file fresh? what is done, what is next, census drift
node scripts/status.mjs --tests  # ...and run the full suite (≈18 s)
node scripts/census.mjs          # the capability map vs OpenClaw, with per-row probes
```

- Every row in §4 names a **commit** and a **test file** — read the test, run it, watch it fail if the behaviour regresses.
- Every capability claim in `docs/openclaw/TRACKER.md` carries a **probe** (a pattern that must match the source). If the code moves, the row reports `DRIFT` instead of quietly staying green.
- The panel's **Work** page (menu → Work) renders this file, so the tracker is on the same screen you test from.

---

## 6. Rules this file follows (so it stays honest)

1. **No test, no "done".** A step moves to ✔ only with a named test that fails without the change.
2. **No date promises.** Sizes are in focused days; order is fixed, calendar is not.
3. **Stale is loud.** `status.mjs` reports how many commits landed since this file was last updated. Zero is the only healthy number: it prints `STALE` and exits non-zero otherwise, and `test/worklog.test.ts` asserts it — so a commit that skips the tracker fails the suite.
4. **One screen.** If this file grows past a screen of current work, the history moves to §4 and §2 stays small.
5. **Every commit touches this file.** Either it updates §2 (the batch moved) or §4 (a batch shipped). That is what keeps the count at zero without remembering to do it.
