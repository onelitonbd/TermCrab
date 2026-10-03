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

- **এইমাত্র শেষ (ব্যাচ ৯):** এখন হিসাব আছে — প্রোভাইডার যা রিপোর্ট করে (streaming আর non-streaming দুটোতেই) সেটা প্রতি টার্নে যোগ হয়ে `run:end`-এ যায়, `TCRAB_HOME/usage/<দিন>.jsonl`-এ লেখা হয়, আর প্যানেলে প্রতি উত্তরের নিচে টোকেন ফুটার + উপরে "N tok today" পিল দেখায়; `termcrab usage [--json]` ঠিক একই সংখ্যা দেয়। দাম শুধু তখনই দেখায় যখন দাম জানা (নিজের config বা ডেটাংকা snapshot) — **কোনো সংখ্যা বানানো হয় না**, সার্ভার কিছু না দিলে কিছুই দেখায় না, আর অফলাইন mock-এর সংখ্যা `≈ estimated` লেবেল পায়।
- **সংখ্যায়:** ৪৬৩টা টেস্ট · ০ ফেল · ~২০ সেকেন্ড; census core-এর শেষ সারিটাও গেল — **core lane ~৭ দিন → ~৪ দিন বাকি** (BROKEN আগেই ০)।
- **পরের কাজ (ব্যাচ ১০):** Tier-0 sweep — সাতটা ছোট ফ্লিপ (config যাচাই করে hot-reload, `run --wait`, বাইরে থেকে stop, progress draft, skill precedence, disk budget, release discipline), মোট **~৫.৫ দিন**।
- **কীভাবে নিজে যাচাই করবে:** প্যানেলে একটা মেসেজ দাও — উত্তরের নিচে টোকেন দেখবে; তারপর `termcrab usage`, `node scripts/status.mjs`, `node scripts/census.mjs`, প্যানেলের **Work** পেজ।

---

## 2. Now — batch 9: usage and cost accounting (this commit)

**Why:** the census called this row **ABSENT** and it was the last one in the core lane: no provider parsed `usage`, no event carried it, no surface showed it. On a phone on mobile data the token count is the number that decides whether an always-on agent is affordable — and a number nobody may invent. So the rule for this batch: **measured, never modelled**; absent when the server says nothing; the one estimated number (the offline mock) is labelled as estimated everywhere it appears.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 9.1 | Provider responses carry usage | ✔ done | `test/usage.test.ts` 9.1: a non-streamed body is parsed; a streamed turn reads the final usage frame (and the request asks for it with `stream_options.include_usage`); a server that reports nothing yields `usage: undefined`; the mock reports deterministic numbers with `estimated: true` |
| 9.2 | The loop records usage per turn | ✔ done | 9.2: a real turn sums every provider call (the mock makes two), `run:end` carries the sum, and `TCRAB_HOME/usage/<day>.jsonl` gets one line per turn; a second turn adds to the day. 9.2b: cost comes from `provider.priceInPerM/priceOutPerM` or from a **dated** snapshot, and an unpriced model returns no cost at all |
| 9.3 | The panel shows tokens per turn and per day | ✔ done | 9.3: the transcript footer is rendered from the event *and* persisted on the assistant entry (a reload keeps it); the top bar shows "N tok today" from `/api/usage`; the mock's numbers carry the `≈ estimated` label |
| 9.4 | The CLI reports it | ✔ done | 9.4: `termcrab usage [--json]` is asserted equal to the panel's numbers against a live gateway, and with the panel down it prints "The panel is not running, so there is nothing to measure." and exits non-zero |
| 9.5 | The token row leaves the census | ✔ done | `node scripts/census.mjs` → that row ABSENT → **WORKING**, drift 0, core lane ~7d → **~4d** (probe: `promptTokens\|totalTokens\|completionTokens` present) |

**Extras the tests forced:** the meter had to survive the *whole* turn, not the last call — the number you see is the sum of the tool loop (that is the number you are billed for); and it is written on every exit path (normal, aborted, capped, error), because a turn that burned tokens and then failed still cost money. The offline mock got a deterministic estimator (4 chars ≈ 1 token, marked estimated) so the UI, the CLI and the tests all have the same numbers without a tokeniser.

**Known limits (declared, not hidden):** streaming usage depends on the server honouring `stream_options.include_usage` — when it does not, the turn shows tokens only if a non-streamed retry happened; nothing is inferred from text length. The built-in price table is a snapshot (`PRICING_AS_OF`, shown next to every cost) and prices change; set `provider.priceInPerM`/`priceOutPerM` for exact numbers. There is no daily budget *enforcement* ("stop spending at $X") — that is a separate capability, and it is not invented here. Usage lines are per day and never rotated.

**Next action:** batch 10 step 10.1 — make a bad config unable to break a running agent (Tier-0 sweep).

---

## 3. Next — batch 10: the Tier-0 sweep (7 small flips, ~5.5 days)

Everything left in the core plan is small and each item flips one census row in hours, not weeks. All seven are named in [BEAT-PLAN.md](docs/openclaw/BEAT-PLAN.md) Tier 0 with their own acceptance test.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 10.1 | A broken config never breaks a running agent | ☐ todo | invalid JSON or an unknown key → config stays unchanged, a warning says why (T0.1) |
| 10.2 | `termcrab run --wait <id>` | ☐ todo | a script can wait for a run and read its output + exit code (T0.2) |
| 10.3 | Stop a running turn from outside | ☐ todo | abort mid-run from the panel → `[interrupted]`, no orphaned work (T0.3) |
| 10.4 | Progress drafts while thinking | ☐ todo | at least two partial-text events before the final reply (T0.4) |
| 10.5 | Skill precedence written and tested | ☐ todo | a user skill overrides a bundled one, and the order is documented (T0.5) |
| 10.6 | A disk budget that trims instead of crashing | ☐ todo | over budget → keeps the last N days and prints the freed bytes (T0.6) |
| 10.7 | Release discipline | ☐ todo | a release script writes the notes from CHANGELOG and tags the commit (T0.7) |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 9 | `b3be527` | **Usage, measured**: providers parse `usage` (stream + non-stream, mock deterministic and marked estimated), the loop sums it across the tool loop and emits/persists it per turn, `TCRAB_HOME/usage/<day>.jsonl` is the meter, `/api/usage` + `termcrab usage [--json]` report it, the panel shows a per-turn footer and a daily pill; cost only from known prices (config or a dated snapshot) | `test/usage.test.ts` (6 cases incl. a live gateway + the real CLI binary, and the panel-down path) | census: usage row ABSENT → WORKING, core lane ~7d → **~4d**, drift 0 |
| 8 | `f1283d9` | **One writer per transcript**: `SessionStore.claim()` — writer lock (owner + pid + heartbeat), refused-by-name second writer, stale-claim reclaim, atomic one-line appends with torn-tail healing, and a live writer that never loses an entry; telegram/whatsapp/wake/cron now run through the per-session lane; `docs/ARCHITECTURE.md` fixed and guarded by a test | `test/writer-fence.test.ts` (5 cases: claim/refuse, stale reclaim, torn write, refusal to write, two surfaces one lane) + `test/docs-map.test.ts` (2 cases) | **457 tests · 0 fail · ~19 s**; census **BROKEN 1 → 0**, drift 0, capability 48%, core lane 12d → ~7d |
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
