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

- **এইমাত্র শেষ (ব্যাচ ১০):** Tier-0 sweep — সাতটা ছোট কিন্তু চোটে লাগা কাজ: ভাঙা `config.json` আর চলমান এজেন্টকে ফেলে দিতে পারে না (যাচাই আগে, তারপর apply; `config set`-ও ভুল মান লিখতে দেয় না), `termcrab run --wait <id>` দিয়ে স্ক্রিপ্ট এজেন্টকে অপেক্ষা করাতে পারে, বাইরে থেকে (প্যানেল/CLI/API) চলমান টার্ন সত্যিই থামে আর **যতটুকু লিখেছিল সেটা রেখে দেয়**, এজেন্ট ভাবতে ভাবতে খসড়া দেখায়, user skill bundled skill-কে হারায় (লেখা আছে `docs/SKILLS.md`-এ), ডিস্ক বাজেট ছাড়ালে নিজে ছাঁটে (`termcrab disk --trim`), আর প্রতিটা রিলিজ নাম্বার+নোট একসাথে লেখা হয় (`npm run release -- minor`); একটাই বাকি ছিল আগের হিসাব — ব্যাচ ৯ (usage/tokens) — সেটা আগের কমিটে।
- **সংখ্যায়:** ৪৭৫টা টেস্ট · ০ ফেল · ~২৬ সেকেন্ড; census **WORKING ৩২ → ৩৯**, PARTIAL ৬১ → ৫৪, score **৪৯% → ৫২%**, drift ০, BROKEN ০; core lane ~৪ দিন (এখন শুধু model-written compaction + docs সারি)।
- **পরের কাজ (ব্যাচ ১১):** core lane খালি করা — compaction digest মডেল দিয়ে লেখা + deterministic fallback, সীমিত/সৎ সারসংক্ষেপ, `termcrab memory compact`, ~৪ দিন।
- **তারপরের কমিটে (ব্যাচ ৯) যা এসেছিল:** এখন হিসাব আছে — প্রোভাইডার যা রিপোর্ট করে (streaming আর non-streaming দুটোতেই) সেটা প্রতি টার্নে যোগ হয়ে `run:end`-এ যায়, `TCRAB_HOME/usage/<দিন>.jsonl`-এ লেখা হয়, আর প্যানেলে প্রতি উত্তরের নিচে টোকেন ফুটার + উপরে "N tok today" পিল দেখায়; `termcrab usage [--json]` ঠিক একই সংখ্যা দেয়। দাম শুধু তখনই দেখায় যখন দাম জানা (নিজের config বা ডেটাংকা snapshot) — **কোনো সংখ্যা বানানো হয় না**, সার্ভার কিছু না দিলে কিছুই দেখায় না, আর অফলাইন mock-এর সংখ্যা `≈ estimated` লেবেল পায়।
- **কীভাবে নিজে যাচাই করবে (নতুন):** প্যানেলে দীর্ঘ কিছু করতে বলো → ভাবতে ভাবতে ✍️ draft দেখবে, সেন্ড বাটন 🟥 হয়ে গেলে এক চাপে (সার্ভার-সাইড) থামবে আর যতটুকু লিখেছিল ততটুকু — `[interrupted]` সহ — থেকে যাবে; `termcrab run "বলে দাও …"` দিলে run id পাবে, `termcrab run --wait <id>` সেই রানের লেখা ছাপবে, `termcrab stop` থামাবে, `termcrab disk` জায়গা দেখাবে, `node scripts/census.mjs` ৪ ঠিকানা, আর `node scripts/status.mjs` FRESH।

---

## 2. Now — batch 10: the Tier-0 sweep (this commit)

**Why:** every Tier-0 item is something a phone owner feels within an hour — a typo in `config.json` silently killing the agent, a script that cannot wait for a run, work that keeps burning tokens after you asked it to stop, an agent that goes quiet for a minute while it thinks, a skill that wins the wrong argument, a state directory that fills the phone, and a release whose notes nobody wrote. All seven were small; this batch closes the whole tier, so what is left in the core lane is measurement and summary quality, not repair.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 10.1 | A broken config can never break a running agent | ✔ done | `test/tier0.test.ts` 10.1: `validateConfig` names the key that is wrong; a torn file written while the gateway runs leaves the live config untouched and shows up in `/api/config` as `configProblems`; a valid edit still hot-applies and the warning clears; `termcrab config set` refuses to write an impossible value. Errors block, warnings inform (an unknown key is kept and reported). |
| 10.2 | A script can wait for a run | ✔ done | 10.2: the run id *is* the queue turn id, `GET /api/runs/:id` reports status/output/error/tokens, and the **real CLI binary** (`termcrab run --wait <id>`) prints the output and exits 0; a run still working when `--timeout 0.2` runs out exits non-zero saying so; `termcrab run "msg"` submits into the panel (and points at `termcrab agent` when there is no panel). |
| 10.3 | Stop a running turn from outside | ✔ done | 10.3: `POST /api/stop` mid-run → the turn becomes `interrupted`, the text it had already written is kept and marked `[interrupted]`, and `/api/status` shows no orphaned work; `termcrab stop` does the same from a shell; the panel's stop button now asks the **server** (the old one only cancelled the browser's fetch). |
| 10.4 | Progress drafts while it works | ✔ done | 10.4: a scripted *non-streaming* provider with two tool rounds emits ≥2 `draft` events carrying the whole partial answer before `run:end`, each naming its session; the draft is saved in the progress card (`state/progress/<session>.json`) so a reload mid-turn still shows it, and the panel paints the bubble with a `✍️ draft` marker. |
| 10.5 | Skill precedence, written and tested | ✔ done | 10.5: the user's skill wins in `list()`, `get()` and the content actually served; a user-only skill loads; `skills.allow` gates loading entirely. The rule and the allow-list are documented in `docs/SKILLS.md` and wired from config in both the gateway and the CLI. |
| 10.6 | A disk budget that trims instead of crashing | ✔ done | 10.6: `diskUsage()` counts real bytes per area; `enforceDiskBudget(1000, {keepDays: 7})` removes the two 30-day-old files, frees ≥3000 bytes and keeps the fresh one; under budget nothing is touched. Surfaces: `termcrab disk [--trim]`, `GET /api/disk`, a check at gateway start, and `storage.maxMb/keepDays/autoTrim`. |
| 10.7 | Release discipline | ✔ done | 10.7: the repo passes its own `scripts/release.mjs --check`; a package.json/CHANGELOG mismatch fails loudly naming **both** versions; `npm run release -- <bump>` writes the next section, `--notes` feeds `gh release create`, `--tag` refuses a dirty tree. |

**Extras the tests forced:** the queue's `interrupt` had to stop meaning "pretend it finished" — the lane now stays busy until the runner actually settles, so the partial text and the status travel together and the next queued turn starts from a clean transcript; the abort now reaches the in-flight provider call (it used to wait for the model to answer first); and the panel got the wiring for all three (stop → server, drafts, config warning band).

**Known limits (declared, not hidden):** a stopped turn keeps only what the provider actually delivered — text it never sent cannot be recovered; the config validator checks shape, not reachability, so a valid-but-unreachable `baseUrl` is still applied; the disk budget never touches `memory/`, `skills/`, `workspace/` or the config, so a runaway workspace can still fill a phone; `release.mjs` publishes nothing by itself (it writes the version, the notes and the tag).

**Next action:** batch 11 step 11.1 — finish the core lane: compaction digests written by a model, with the extractive digest kept as the documented fallback.

---

## 3. Next — batch 11: finish the core lane (model-written compaction, ~4 days)

The core lane is down to one real capability and one honesty row: `LLM summarisation for compaction` (ABSENT, 3d) and `Docs that match the code` (PARTIAL, 1d). Both are named in [BEAT-PLAN.md](docs/openclaw/BEAT-PLAN.md) (Tier 1 / phase B), and both are the kind of thing that looks finished until somebody checks.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 11.1 | A digest can be written by a model | ☐ todo | with a provider configured, `compact()` asks it to summarise the turns leaving the hot window and stores its text in `memory/compacted/<session>.md`; a scripted provider's summary is what lands there |
| 11.2 | The deterministic digest stays the fallback | ☐ todo | no provider (or a failing one) → the extractive digest is used and the entry says which engine wrote it (`by: model <id>` / `by: extractive`), with nothing lost |
| 11.3 | Bounded, honest summaries | ☐ todo | a 200-turn session is summarised in chunks; the block injected into the prompt is capped and says what it covers ("showing the last N of M compacted turns") |
| 11.4 | The user can see and force it | ☐ todo | `termcrab memory compact <session>` prints which engine wrote the digest and how many turns it covers; `/api/status` reports the last digest |
| 11.5 | Both core rows leave the census | ☐ todo | `LLM summarisation` ABSENT → WORKING and `Docs that match the code` PARTIAL → WORKING, drift 0, core lane ~4d → **~0d** |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 10 | `_this commit_` | **Tier-0 sweep**: config validation before hot-apply (`config set` refuses too), run ids + `/api/runs/:id` + `termcrab run --wait`, `POST /api/stop` + `termcrab stop` + a panel stop that reaches the server (partial answer kept), `draft` events + persisted drafts, skill precedence documented (`docs/SKILLS.md`) with a config allow-list, `src/core/disk.ts` budget (`termcrab disk`, `/api/disk`, start-up trim), `scripts/release.mjs` with `--check` inside the suite | `test/tier0.test.ts` (7 steps, live gateway + the real CLI binary; suite now 475 cases) | census **WORKING 32 → 39**, PARTIAL 61 → 54, score **49% → 52%**, drift 0, BROKEN 0; core lane ~4d (compaction summary + docs row) |
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
