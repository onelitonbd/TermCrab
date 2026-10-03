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

- **এইমাত্র শেষ (ব্যাচ ১১):** core lane খালি — দুটো সারি বাকি ছিল, দুটোই শেষ। (১) লম্বা চ্যাটের সারসংক্ষেপ এখন **মডেল লেখে**: সীমা ছাড়ানো টার্নগুলো ছোট ছোট টুকরোয় (৪,০০০ অক্ষর, সর্বোচ্চ ৪ কল) মডেলকে দিয়ে সারাংশ লেখানো হয় — লোকাল মডেল থাকলে সেটা, নাহলে যে মডেল উত্তর দিচ্ছে — আর `memory/compacted/<session>.md`-এ লেখা হয় কে লিখল, কত টার্ন ঢাকল (`## Compacted … (240 turns, by model sum-1)`); মডেল নেই/ফেল করলে/`TCRAB_COMPACT=off` দিলে deterministic extractive digest-ই চলে আর **কারণটা ফাইলে লেখা থাকে**, কিছু মুছে যায় না, আর প্রম্পটে স্পষ্ট লেখা থাকে *"the earlier 240 turns are summarised above … the full transcript is on disk"*। (২) `docs/ARCHITECTURE.md`-এর ফাইল-ম্যাপ এখন **ট্রি থেকে জেনারেট** (`scripts/docs-map.mjs`), আর `--check` টেস্ট স্যুটের ভিতরে চলে — ডক আর চুপচাপ মিথ্যা বলতে পারবে না।
- **সংখ্যায়:** ৪৮৩টা টেস্ট · ০ ফেল · ~৩১ সেকেন্ড; census **WORKING ৩৯ → ৪১**, PARTIAL ৫৪ → ৫৩, ABSENT ৪৩ → ৪২, score **৫২% → ৫৩%**, drift ০, BROKEN ০; **core lane ~৪ দিন → ~০ দিন (খালি)**।
- **তুমি নিজে যাচাই করতে (নতুন):** একটা লম্বা সেশন তৈরি করো (যেমন ৫০+ টার্ন), তারপর `termcrab memory compact <session>` — কে লিখল আর কত টার্ন ঢাকল ছাপবে; `memory/compacted/<session>.md` খুলে হেডার দেখো (`by model …` বা `by extractive — model failed: …`); `TCRAB_COMPACT=off termcrab memory compact <session>` দিলে extractive-তে নামবে। `curl -s -H "Authorization: Bearer <token>" localhost:7788/api/status | grep digest` নতুন digest দেখাবে। ডকের জন্য: `node scripts/docs-map.mjs --check` (ম্যাপ ঠিক থাকলে `docs-map: ok`), আর একটা `.ts` ফাইল যোগ করলে ওটা ফেল করবে যতক্ষণ `--write` না চালাও।
- **পরের কাজ (ব্যাচ ১২):** Tier 2-র দাবিগুলো প্রমাণ করা — মাপা সংখ্যা (idle RAM, cold start, restart time, `npm install`), ফোন-হোস্ট-করে-গেটওয়ে end-to-end টেস্ট, `docs/TERMUX.md` সম্প্রসারণ, README ফোন-কেন্দ্রিক, offline outbox ঠিক-একবার। **~২ সপ্তাহ।**

---

## 2. Now — batch 11: the core lane is empty (this commit)

**Why:** the census had exactly two core rows left: the compaction summary was written by slicing raw transcript lines (*"the history is now preserved, the summary quality is what is still missing"*), and the file map in `docs/ARCHITECTURE.md` was hand-written — which is how it once came to name three provider files that never existed. Both are the kind of thing that looks finished until somebody checks, which is why both were done tests-first.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 11.1 | A digest can be written by a model | ✔ done | `test/compaction-llm.test.ts` 11.1: a scripted provider's text is what lands in `memory/compacted/web:summary.md` (header `by model summariser-1`), it saw the turns that left the hot window (`turn 0`), and `compactWithModel` reports `covered ≥ 40`; 11.1b drives a real `runTurn()` and proves the turn compacts through the model, not the extractor. |
| 11.2 | The deterministic digest stays the fallback | ✔ done | 11.2: with no provider the block says `by extractive` and still carries `User: turn 0`; with a provider that throws, the note keeps the reason (`503 …`) both in the result and in the file, `sessions.read()` still returns all 120 lines, and `TCRAB_COMPACT=off` degrades the same way instead of throwing into a turn. |
| 11.3 | Bounded, honest summaries | ✔ done | 11.3: a 240-turn overflow is summarised in chunks (each call ≤ 6 KB), the injected text is capped at 1,200 chars and the system prompt says *the earlier 240 turns are summarised above — showing 1 of 1 block(s); the full transcript is on disk*; 11.3b proves the chunk cap is enforced (exactly `maxChunks` calls) and that the block says `… older turn(s) are not summarised here`. Compaction is incremental, so a turn is never summarised twice. |
| 11.4 | The user can see and force it | ✔ done | 11.4: `lastDigestSummary()` reports the newest block (session, engine, model, covered turns, blocks, file) and is served by `/api/status`; the **real CLI binary** (`termcrab memory compact web:cli-sum`) runs against a live OpenAI-shaped upstream and prints the session, the engine (`model sum-1`) and `N turn(s)`. |
| 11.5 | Both core rows leave the census | ✔ done | `node scripts/census.mjs`: `LLM summarisation for compaction` ABSENT → **WORKING** (probe `compactWithModel`), `Docs that match the code` PARTIAL → **WORKING** (probe: the generated-map marker), **drift 0**, BROKEN 0, **core lane ~4d → ~0d**; the docs map is generated by `scripts/docs-map.mjs` and `--check` runs inside the suite (`test/docs-map.test.ts` 11.5). |

**Extras the work forced:** `readDigest()` now returns the blocks *and* what they cover (so the prompt can tell a summary from the turns themselves), the digest block records the reason it is extractive (so a metered phone's kill switch is visible in the file, not just in a log line), and the six source files with no leading comment got one — the generated map reads them, so the doc and the file cannot disagree about what a file is for.

**Known limits (declared, not hidden):** a summary is lossy by nature — the extractive fallback keeps the first slice of each turn, and the model's own text is taken as-is (no second pass, no contradiction check); the 4-chunk budget means a very long backlog is partly unsummarised, and the block says so rather than pretending; chunk boundaries are line-based, so one absurdly long entry can exceed the chunk size; `memory compact` needs the session to be past the threshold (it says so instead of inventing a digest when it is not).

**Next action:** batch 12 step 12.1 — prove the phone-native beats with measurements: a bench script for idle RAM, cold start, restart time and install time, then the numbers into README/BEAT-PLAN with the script as proof.

---

## 3. Next — batch 12: prove the phone bets with numbers (~2 weeks)

Tier 2 is where the moat lives (the phone *is* the gateway), but a moat you cannot measure is a slogan. Batch 12 turns each Tier-2 claim into a script + a number + a test, and the number goes into the README next to the claim — measured on this machine, and on a phone where the claim is about a phone.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 12.1 | Measure, don't assert | ☐ todo | `scripts/bench.mjs` prints idle RSS, cold start, gateway restart time, `npm install` time and a real turn's latency; the numbers appear in `README.md` with the script named as their source, and re-running the script reproduces them within a stated tolerance |
| 12.2 | The phone hosts the gateway (end-to-end) | ☐ todo | a test drives the whole path offline (`provider.type=mock`, no network): message in → queue → run → answer out, plus the measured install path from `docs/TERMUX.md`; the claim is stated next to OpenClaw's own page ("Android does not host the Gateway") |
| 12.3 | Termux guide grows up | ☐ todo | `docs/TERMUX.md` covers MIUI/ColorOS battery killers, wake-lock, boot install and proot leftovers, each with the command that fixes it; a test fails if a command in the guide is not a real CLI command |
| 12.4 | README says the phone story first | ☐ todo | the first screen answers "what is this, where does it run, what does it cost"; a test checks the README states the zero-dependency install and points at the measured numbers |
| 12.5 | Offline outbox: exactly once | ☐ todo | airplane-mode test: messages sent while the channel is down are delivered once (not zero, not twice) after it returns; a kill/restart mid-flight still ends in exactly one delivery |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 11 | _this commit_ | **The core lane, emptied**: `SessionStore.compactWithModel()` — a configured model (local tier first) writes the compaction digest in bounded chunks, with the extractive digest as the documented fallback and the reason recorded in the entry; incremental coverage so no turn is summarised twice; `readDigest()` + a prompt blurb that says who wrote it, how much it covers and that the full transcript is on disk; `lastDigestSummary()` on `/api/status`; `termcrab memory compact <session>`; `scripts/docs-map.mjs` generates `docs/ARCHITECTURE.md`'s file map and `--check` runs inside the suite | `test/compaction-llm.test.ts` (6 cases, incl. a real `runTurn()` and the real CLI against a live upstream) + `test/docs-map.test.ts` 11.5 (suite now 483 cases) | census **WORKING 39 → 41**, PARTIAL 54 → 53, ABSENT 43 → 42, score **52% → 53%**, drift 0, BROKEN 0; **core lane ~4d → ~0d (empty)** |
| 10 | `31cdf32` | **Tier-0 sweep**: config validation before hot-apply (`config set` refuses too), run ids + `/api/runs/:id` + `termcrab run --wait`, `POST /api/stop` + `termcrab stop` + a panel stop that reaches the server (partial answer kept), `draft` events + persisted drafts, skill precedence documented (`docs/SKILLS.md`) with a config allow-list, `src/core/disk.ts` budget (`termcrab disk`, `/api/disk`, start-up trim), `scripts/release.mjs` with `--check` inside the suite | `test/tier0.test.ts` (7 steps, live gateway + the real CLI binary; suite now 475 cases) | census **WORKING 32 → 39**, PARTIAL 61 → 54, score **49% → 52%**, drift 0, BROKEN 0; core lane ~4d (compaction summary + docs row) |
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
