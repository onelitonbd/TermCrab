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

- **এইমাত্র শেষ (ব্যাচ ৬):** অ্যাপ্রুভাল গেট — যে টুলগুলো বিপজ্জনক (`exec`, `write_file`, `kill_process`) সেগুলো আর নিজে নিজে চলে না; লুপটা থেমে মানুষের উত্তর চায়, প্যানেলে (SSE → Approve/Deny কার্ড) আর টার্মিনালে (`termcrab approvals list/approve/deny`) একই আইডি দিয়ে উত্তর দেওয়া যায়; না দিলে টাইমআউটে ডিফল্ট deny; ফিরিয়ে দিলে সেটা একটা টুল-রেজাল্ট, ক্র্যাশ নয়।
- **সংখ্যায়:** ৪৪৪টা টেস্ট · ০ ফেল · ~১৯ সেকেন্ড; census **BROKEN ৪ → ৩**, drift ০, capability ৪৬%; core lane-এর বাকি কাজ ~১৮ দিন।
- **পরের কাজ (ব্যাচ ৭):** স্মৃতি যা ভোলে না — আজকের লেখা ফ্যাক্ট কালকের প্রম্পটে ঢুকবে, আর compaction কিছু মুছবে না। **~৬ দিন।**
- **কীভাবে নিজে যাচাই করবে:** `node scripts/status.mjs` (এক সেকেন্ড), `node scripts/status.mjs --tests` (স্যুট সহ), `node scripts/census.mjs`, আর প্যানেলের **Work** পেজ।

---

## 2. Now — batch 6: an agent that asks before it acts (this commit)

**Why:** `src/core/approvals.ts` could already create and resolve approvals, and `GET /api/approvals` existed — but `createApproval()` had **zero call sites**. A tool that can delete files, overwrite a file or kill a process ran on the model's say-so alone. The census row said exactly that (`BROKEN: the code exists but nothing reaches it`). Now the tool dispatch asks first, the request travels to whoever can answer it, and the answer decides whether the tool runs.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 6.1 | A gated tool stops **before** it runs | ✔ done | `test/approvals.test.ts` 6.1: the tool body never executes while pending; one `approval` event; it runs only after a human answer |
| 6.2 | Approval reaches the panel; the answer reaches the run | ✔ done | 6.2 + 6.2b: SSE `approval` frame with the pending record, and the panel card (`addApprovalCard`) POSTs `/api/approvals/:id/(approve\|deny)` |
| 6.3 | A refusal is a tool result, not a crash | ✔ done | 6.3: `ok:false` tool result the model can read, no file written, no `error` event |
| 6.4 | Answer without the panel (CLI) | ✔ done | 6.2 + 6.4: the **real** `termcrab approvals list/deny` binary over HTTP against a live gateway — same id, one decision, second answer refused |
| 6.5 | Timeout + default policy, census row leaves BROKEN | ✔ done | 6.5 + 6.5b: 0.3s window → default deny with the reason naming the timeout; `onTimeout:'allow'` runs it and labels the decision; `node scripts/census.mjs` → **BROKEN 4 → 3**, drift 0 |

**Known limits (declared, not hidden):** approvals live inside the running panel process, so `termcrab approvals` says "start the panel" when it is down — it never guesses. There is still no terminal/TUI renderer, so the *Human-in-the-loop* census row stays PARTIAL. Decided history is capped at 50; a pending approval is never trimmed away. The gate is off by default and covers `exec`, `write_file`, `kill_process` (configure with `security.approvals.enabled` / `.tools`).

**Next action:** batch 7 step 7.1 — the failing test that proves a fact written now reaches the next prompt.

---

## 3. Next — batch 7: memory that doesn't forget (core lane, ~6 days, starts after this commit)

The two BROKEN rows that make the agent forget on purpose: `prompt.ts` reads the **head** of `USER.md` (3000 chars) while `remember()` **appends** — so a fact written today can never enter context; and `sessions.ts` rewrites the `.jsonl` in place at `:154,187`, so compaction deletes history instead of summarising it. OpenClaw's rule is *"the full conversation history stays on disk"*. Tests first, as always.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 7.1 | A fact written now reaches the next prompt | ☐ todo | write a fact, run a turn, the prompt contains it (tail-aware, not head-only) |
| 7.2 | Compaction summarises without deleting history | ☐ todo | every original line is still on disk after compaction; the digest is what shrinks |
| 7.3 | The bootstrap injection is budgeted and measured | ☐ todo | the injected block names its byte/token budget; nothing is dropped silently |
| 7.4 | Recalled facts carry provenance | ☐ todo | each injected fact cites the file/session it came from |
| 7.5 | The two memory rows leave BROKEN | ☐ todo | `census.mjs` → BROKEN 3 → 1 (fencing is batch 8), drift 0 |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 6 | `4dd35be` | **An approval gate that really stops the tool**: the loop consults `needsApproval()` before dispatch, emits the pending record over SSE, waits with a timeout + default policy, and the decision is answerable from the panel card or `termcrab approvals`; refusal is a tool result, abort is honoured | `test/approvals.test.ts` (7 cases: gate, refusal, timeout, `onTimeout:allow`, real CLI over HTTP, panel source) | census **BROKEN 4 → 3**, drift 0, core lane 23d → 18d |
| 5 | `5fe6651` | **A queue you can trust**: one lane per session (second message waits, never interleaves); all four modes really work (`followup` FIFO, `steer` into the live run, `collect` merges a burst, `interrupt` cancels then runs); truthful `queueLength`; backlog capped (429); panel "N waiting" chip + a second message while busy; `termcrab status` reports live queue state from the panel | `test/queue-serialize.test.ts` (10 new cases: unit + loop + real HTTP with a slow upstream), `test/queue.test.ts`, full suite | **437 tests · 0 fail · 18.0 s**; census **BROKEN 7 → 4**, drift 0, capability 46% (was 43%) |
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
