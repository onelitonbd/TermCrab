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

- **এইমাত্র শেষ (ব্যাচ ৮):** এক ট্রান্সক্রিপ্টে এখন এক লেখক — `SessionStore.claim()` টার্ন শুরুর আগেই owner+pid+heartbeat সহ writer lock নেয়; দ্বিতীয় লেখককে নাম ধরে (owner + pid) ফিরিয়ে দেওয়া হয়, মরা প্রসেস বা বাসি heartbeat-এর claim নিজে থেকে উদ্ধার হয়, append এক লাইনে এক O_APPEND লেখা (মাঝপথে kill করলেও বাকি লাইনগুলো পড়া যায়), আর telegram/whatsapp/voice/cron সব এখন একই per-session lane দিয়ে যায় — অর্থাৎ ব্যাচ ৫-এ যেটাকে "শুধু এক প্রসেসের ভিতরে" সীমা বলে ঘোষণা করা হয়েছিল, সেটা আর নেই।
- **ডকুমেন্টও আর মিথ্যা বলে না:** `docs/ARCHITECTURE.md`-এ যেসব provider ফাইল নেই (`gemini.ts`, `anthropic.ts`, `ollama.ts`) সেগুলো বাদ দেওয়া হয়েছে, আর `test/docs-map.test.ts` এখন ফেল করে যদি ARCHITECTURE.md/API.md-তে এমন `.ts` ফাইলের নাম থাকে যেটা রেপোতে নেই — census-এর শেষ BROKEN সারিটাও তাই গেল।
- **সংখ্যায়:** ৪৫৭টা টেস্ট · ০ ফেল · ~১৯ সেকেন্ড; census **BROKEN ১ → ০**, drift ০, capability ৪৭% → ৪৮%; core lane-এ বাকি ~৭ দিন (আগে ~১২), অর্থাৎ core checklist কার্যত শেষ — এরপর যা বাকি তা parity/later।
- **পরের কাজ (ব্যাচ ৯):** usage/token হিসাব — প্রতি টার্নের টোকেন সংখ্যা (এবং দাম জানা থাকলে খরচ) লুপ থেকে প্যানেল আর CLI পর্যন্ত; এখন কোনো সংখ্যাই নেই। **~৩ দিন।**
- **কীভাবে নিজে যাচাই করবে:** `node scripts/status.mjs` (এক সেকেন্ড), `node scripts/status.mjs --tests` (স্যুট সহ), `node scripts/census.mjs`, আর প্যানেলের **Work** পেজ।

---

## 2. Now — batch 8: one writer per transcript (this commit)

**Why:** this was the last census **BROKEN** row, and it was real. `SessionQueue` serialised turns *inside one process*; the gateway installed its runner with `skipQueue`, and `SessionStore.append` had no writer claim at all — so the panel and a `termcrab agent` (or a cron tick against the same session id) could interleave lines into one `sessions/<id>.jsonl`, and a kill between `open` and `write` could leave a half-written line that every later reader had to guess at. The fix had to live in the store, because CLI/dream/heartbeat/cron all call `runTurn` directly and never touch the queue.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 8.1 | A session has one writer at a time | ✔ done | `test/writer-fence.test.ts` 8.1: a second claim is refused and names the holder (owner + pid); 8.1b: a real `runTurn` on a held session returns `[busy] … cli …`, emits an error event, and writes **nothing** |
| 8.2 | The claim survives a crash | ✔ done | 8.2: a dead pid and a stale heartbeat are both reclaimed; a live holder with a fresh heartbeat is still honoured |
| 8.3 | Appends are atomic per entry | ✔ done | 8.3: a torn tail (`{"role":"assis`) is cut before the next write, every remaining line parses, and one append adds exactly one line (single `O_APPEND` write, no rewrite) |
| 8.4 | Channel, voice and cron turns go through the lane | ✔ done | 8.4: two surfaces on one session id serialise — the provider never sees two calls at once, order is preserved; telegram/whatsapp, the wake loop and cron now submit via `runQueuedTurn`, closing the batch-5 limit |
| 8.5 | The last BROKEN row leaves the census | ✔ done | `node scripts/census.mjs` → **BROKEN 1 → 0**, drift 0 (probes: `WriterHolder`); the remaining BROKEN row was the docs map, so it was fixed for real and is now guarded by `test/docs-map.test.ts` |

**Extras the tests forced:** the fence is re-entrant for the *same* surface in the same process (a tool that starts a nested turn on the same session is not a second writer), and a live writer whose claim lapsed (TTL expiry while stalled) retakes it on its next append instead of losing an entry — losing transcript lines would be worse than a lock that lapsed. Lock files are `sessions/<id>.lock`, so `list()` and `purgeOlderThan()` ignore them by construction and the panel shows no phantom sessions.

**Known limits (declared, not hidden):** the claim is a lock file, not an OS advisory lock — a writer that bypasses `SessionStore.append` can still write the file (nothing in Node can stop that portably); `waitMs` waits synchronously (`Atomics.wait`) because the store is synchronous, so waiting is for short handovers, while queueing remains the mechanism for real work; only the last line of a torn file is healed (a torn line in the middle means something else rewrote the file, which is exactly what the fence prevents).

**Next action:** batch 9 step 9.1 — take the usage numbers the providers already return and stop throwing them away.

---

## 3. Next — batch 9: usage and cost accounting (core lane, ~3 days)

The census calls this row **ABSENT**: `usage` (prompt/completion tokens) is parsed by no provider, carried by no event, shown by no surface. On a phone on mobile data that is the one number the owner needs to trust an always-on agent — and it is also the last core-lane row in the plan.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 9.1 | Provider responses carry usage | ☐ todo | `ChatResult` exposes prompt/completion tokens for every provider, mock included (the mock reports deterministic numbers so tests never guess) |
| 9.2 | The loop records usage per turn | ☐ todo | a finished turn reports its tokens (and cost when the model is priced); `run:end` carries them to the panel |
| 9.3 | The panel shows tokens per turn and per day | ☐ todo | the transcript footer shows the turn's tokens; the header/status line shows today's total, from real events — never an estimate |
| 9.4 | The CLI reports it | ☐ todo | `termcrab usage` prints today's tokens (and cost) for the running panel, or says the panel is down instead of inventing numbers |
| 9.5 | The token row leaves the census | ☐ todo | `census.mjs`: that row ABSENT → PARTIAL/WORKING with a probe on the real code, drift 0 |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 8 | `_this commit_` | **One writer per transcript**: `SessionStore.claim()` — writer lock (owner + pid + heartbeat), refused-by-name second writer, stale-claim reclaim, atomic one-line appends with torn-tail healing, and a live writer that never loses an entry; telegram/whatsapp/wake/cron now run through the per-session lane; `docs/ARCHITECTURE.md` fixed and guarded by a test | `test/writer-fence.test.ts` (5 cases: claim/refuse, stale reclaim, torn write, refusal to write, two surfaces one lane) + `test/docs-map.test.ts` (2 cases) | **457 tests · 0 fail · ~19 s**; census **BROKEN 1 → 0**, drift 0, capability 48%, core lane 12d → ~7d |
| 7 | `4562b6c` | **Memory that does not forget**: the prompt gets the newest facts first, budgeted and sourced (`MEMORY.md:<line>`), `remember()` reports where it wrote; compaction writes a digest and archives the overflow instead of deleting it, `read()` returns the whole conversation, and the model still sees the compacted digest; new `agent.memoryBudget` (3000 bytes) | `test/memory-truth.test.ts` (6 cases: newest-fact injection, a real run's system prompt, no-deletion compaction, digest injection, budget honesty, provenance) + `test/compaction.test.ts` | census **BROKEN 3 → 1**, drift 0, core lane 18d → 12d |
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
