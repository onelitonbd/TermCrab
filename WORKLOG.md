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

- **এখন কী হচ্ছে:** কোনো কাজ চলছে না — ব্যাচ ২ শেষ, পরের ব্যাচ শুরু হয়নি (§2)।
- **এইমাত্র শেষ (ব্যাচ ১ + ২):** ইনস্টল ৪.৫ সেকেন্ড → **০.৫ সেকেন্ড**, টেস্ট ১৫ মিনিটে শেষ হত না → **১৮ সেকেন্ডে ৪১৩টা**, প্যানেলের পাসওয়ার্ড সত্যিই কাজ করে, ওয়েবহুকে নিজের টোকেন, অফলাইন ব্রেইন ফিরেছে।
- **পরের কাজ (ব্যাচ ৩):** কিউ সত্যি করা — একই সেশনে দুটো মেসেজ যেন সমান্তরালে না চলে, আর `followup/steer/collect/interrupt` সব কাজ করুক। **~১০ দিনের কাজ, ৫টা ধাপে।**
- **কীভাবে নিজে যাচাই করবে:** `node scripts/status.mjs` (এক সেকেন্ড), `node scripts/status.mjs --tests` (স্যুট সহ), আর প্যানেলের **Work** পেজ (একই ফাইল দেখায়)।

**নিয়ম (আমার নিজের জন্য, লিখিত):** প্রতিটা কাজের সেশন শেষ হবে এই ফাইল আপডেট করে — কোন ব্যাচ, কোন কমিট, কোন টেস্ট প্রমাণ। টেস্ট নেই = কাজ শেষ নয়।

---

## 2. Now — batch 4: the answer to "how do we beat OpenClaw" (this commit)

**Why:** the level map answered *where we stand*; it did not answer *where we win and in what order we build*. That answer is now a document: [`docs/openclaw/BEAT-PLAN.md`](docs/openclaw/BEAT-PLAN.md) — head-to-head from the smallest beats (Tier 0: hours) through the phone-native moat (Tier 2) up to the structural bets (Tier 3), with the explicit kill list above it, and every OpenClaw claim cited to the page it came from (their own doc says the quiet part: *"Android does not host the Gateway"*).

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 4.1 | Head-to-head, smallest → biggest, with citations to their pages | ✔ done | `BEAT-PLAN.md` §2 (Tier 0–4); precision fix in `analysis/10-mobile-the-moat.md` |
| 4.2 | Each beat carries an effort and a proof (test / script / measured number) | ✔ done | `test/beat-plan.test.ts`: ≥25 beats, every row has effort + proof |
| 4.3 | "Already better" claims cannot be invented | ✔ done | same test: every `census: … 🏅` claim must match a real BETTER row |
| 4.4 | The plan drives the work order, not a wishlist | ✔ done | Phase A starts with the queue (batch 5) because BROKEN rows undermine every moat claim |
| 4.5 | Reachable from the map and the tracker | ✔ done | TRACKER §1 + WORKLOG link it; pinned by the test |

**Next action:** batch 5 step 5.1 — the failing test that proves two messages in one session run one after another.

---

## 3. Next — batch 5: a queue you can trust (core lane, ~10 days, starts after this commit)

`SessionQueue.enqueue()` adds turns and **nothing ever removes them**; two messages for one session run at the same time. The modes are documented, the code exists, nothing reaches it — this is where "the agentic system is not trustworthy" starts. Tests come first: each step below adds a failing test, then the fix.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 5.1 | A second message in the same session **waits** instead of running beside the first | ☐ todo | two turns posted together → second stays `queued`; transcripts never interleave |
| 5.2 | `dequeue()` is actually called: a finished turn leaves the queue | ☐ todo | `queueLength === 0` after a turn completes |
| 5.3 | `queueMode: followup` — while busy, messages queue and run in order | ☐ todo | 3 messages → outputs in order, one at a time |
| 5.4 | `queueMode: steer` — a mid-run message reaches the running turn, no second turn | ☐ todo | message appears in the running transcript; run id unchanged |
| 5.5 | `queueMode: collect` — rapid messages merge into the next turn | ☐ todo | 3 rapid messages → 1 extra turn containing all three |
| 5.6 | `queueMode: interrupt` — a new message cancels the running turn and starts fresh | ☐ todo | old run `[interrupted]` + marked cancelled; new turn runs |
| 5.7 | Panel + CLI show the true queue state (length, running turn, mode) | ☐ todo | `/api/chat/<sid>/<turn>` reports length 0 when idle; composer shows "1 waiting" |
| 5.8 | Census rows leave BROKEN (session queue, queue modes, steering) | ☐ todo | `node scripts/census.mjs` → BROKEN 7 → 5, drift 0 |

**After that** (order fixed, sizes are focused days — and [BEAT-PLAN.md](docs/openclaw/BEAT-PLAN.md) §3 is the authority):

| Batch | What | Size | What proves it |
|---|---|---|---|
| 6 | **Approvals gate** — dangerous tools block until a human approves them in the panel | ~5d | test: tool blocks until approved, refused when denied |
| 7 | **Memory that does not forget** — prompt reads recent facts; compaction summarises instead of deleting | ~6d | test: a fact saved today reaches the prompt; full lines stay on disk |
| 8 | **Transcript fencing** — a writer claim so gateway + CLI cannot interleave one JSONL | ~3d | test: second writer refuses (or appends atomically) |
| 9 | **Usage / token accounting** — real token counts, shown in the panel | ~3d | test: a run reports tokens; the panel shows a number |
| 10 | **Tier 0 quick flips** (BEAT-PLAN §2): hot-reload validation, `run --wait`, panel stop, progress drafts, skill precedence, disk budget, release script | ~5.5d | each row's own test; census WORKING +7 |

---

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 1 | `f1c86b8`, `df69070` | install no longer silently builds (`prepare` removed, two visible steps); config-file watcher no longer leaks/keeps the process alive; suite bounded (60s/test) | `test/lifecycle.test.ts` (listener closed, no FSWatcher, port reusable); leak probe `36.2 ms` (was cancelled at `30,023 ms`) | `npm install` **4,537 ms → 500 ms**; full suite now finishes |
| 4 | *(this commit)* | **Beat plan**: head-to-head vs OpenClaw from hours-scale beats to the structural moat, every claim cited to their page or to a census row, kill list included; the plan now drives the batch order | `test/beat-plan.test.ts` (tiers, ≥25 beats with effort+proof, census cross-check, file paths) | `docs/openclaw/BEAT-PLAN.md`; 5 new tests |
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
