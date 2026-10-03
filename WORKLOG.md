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

- **এইমাত্র শেষ (ব্যাচ ৭):** স্মৃতি আর ভোলে না — `remember()` যা লেখে সেটাই এখন প্রম্পটে ঢোকে (নতুন ফ্যাক্ট আগে, বাইট-বাজেট মেনে, প্রতিটার সোর্স লাইন `MEMORY.md:<লাইন>` সহ, আর ব্লকটাই বলে দেয় কতটা বাদ পড়ল); compaction এখন ইতিহাস **মোছে না** — সারমর্ম লিখে বাকি লাইনগুলো `<session>.archive.jsonl`-এ যায়, `read()` পুরো কথোপকথন ফেরত দেয়, আর মডেল আগের অংশের ডাইজেস্ট পায়।
- **সংখ্যায়:** ৪৫০টা টেস্ট · ০ ফেল · ~১৯ সেকেন্ড; census **BROKEN ৩ → ১**, drift ০, capability ৪৬% → ৪৭%; core lane-এ বাকি ~১২ দিন (আগে ~১৮)।
- **পরের কাজ (ব্যাচ ৮):** transcript write fencing — গেটওয়ে আর CLI একই ফাইলে লিখলেও আর মিশবে না। **~৩ দিন।**
- **কীভাবে নিজে যাচাই করবে:** `node scripts/status.mjs` (এক সেকেন্ড), `node scripts/status.mjs --tests` (স্যুট সহ), `node scripts/census.mjs`, আর প্যানেলের **Work** পেজ।

---

## 2. Now — batch 7: memory that doesn't forget (this commit)

**Why:** two rows said BROKEN for the same reason — the code existed but no path reached it. `MEMORY.md` is append-only (`remember()` writes at the bottom) while the prompt injected `readHead(3000)`, the *oldest* 3000 chars, so a fact written today could never enter context. And `compact()` rewrote the session `.jsonl` with only the kept lines (plus a second deletion path in the old rolling window), so summarising *was* deleting — the opposite of OpenClaw's rule that the full history stays on disk.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 7.1 | A fact written now reaches the next prompt | ✔ done | `test/memory-truth.test.ts` 7.1 (newest fact injected, oldest fall out) + 7.1b (a real `runTurn` sends it in the system prompt) |
| 7.2 | Compaction summarises without deleting history | ✔ done | 7.2: 120 entries → digest written, `read()` still returns all 120 in order, overflow in `sessions/<id>.archive.jsonl`, only the hot window shrinks; `test/compaction.test.ts` updated to the new contract |
| 7.3 | The bootstrap injection is budgeted and measured | ✔ done | 7.3: the block fits `agent.memoryBudget` (bytes), names the budget, and says `showing the newest N of M facts` — nothing dropped silently |
| 7.4 | Recalled facts carry provenance | ✔ done | 7.4: every injected fact cites `MEMORY.md:<line>`, and `remember()` reports the line it wrote |
| 7.5 | The two memory rows leave BROKEN | ✔ done | `node scripts/census.mjs` → **BROKEN 3 → 1**, drift 0, core lane 18d → 12d (probes: `readForPrompt`, `archiveOverflow`) |

**Extras the tests forced:** the model now also receives the last compacted digest (`# Earlier in this conversation (compacted)`), so a shrunk window does not mean amnesia; and session totals in `list()` count hot + archived entries, so the panel shows the true conversation length instead of only the hot window.

**Known limits (declared, not hidden):** the digest is extractive (key lines, 200-char slices) — a model-written summary is a separate ABSENT row (batch 9+ candidate). The archive grows and is never deleted; a disk-budget policy for it is deliberately not invented here. The budget is in bytes, not tokens.

**Next action:** batch 8 step 8.1 — the failing test that proves two writers cannot interleave one transcript.

---

## 3. Next — batch 8: one writer per transcript (core lane, ~3 days, starts after this commit)

The last BROKEN row. Today the gateway and the CLI can both append to the same `sessions/<id>.jsonl` (`SessionStore.append`), and the queue only serialises turns *inside one process* — two surfaces (panel + `termcrab agent`) can still interleave lines. The fix is a real writer claim plus an atomic append, not a bigger in-memory queue. Tests first, as always.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 8.1 | A session has one writer at a time | ☐ todo | a second writer's claim is refused (or waits), and it says who holds it |
| 8.2 | The claim survives a crash | ☐ todo | a stale claim (dead pid / old timestamp) is reclaimed instead of wedging the session |
| 8.3 | Appends are atomic per entry | ☐ todo | killing the process mid-turn leaves a file where every line still parses |
| 8.4 | Channel, voice and cron turns go through the lane | ☐ todo | two surfaces on one session id serialise (the declared batch-5 limit) |
| 8.5 | The last BROKEN row leaves the census | ☐ todo | `census.mjs` → **BROKEN 1 → 0**, drift 0 |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 7 | `_this commit_` | **Memory that does not forget**: the prompt gets the newest facts first, budgeted and sourced (`MEMORY.md:<line>`), `remember()` reports where it wrote; compaction writes a digest and archives the overflow instead of deleting it, `read()` returns the whole conversation, and the model still sees the compacted digest; new `agent.memoryBudget` (3000 bytes) | `test/memory-truth.test.ts` (6 cases: newest-fact injection, a real run's system prompt, no-deletion compaction, digest injection, budget honesty, provenance) + `test/compaction.test.ts` | census **BROKEN 3 → 1**, drift 0, core lane 18d → 12d |
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
