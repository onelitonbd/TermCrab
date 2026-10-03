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

- **এইমাত্র শেষ (ব্যাচ ১২):** Tier-2-র ফোন-দাবিগুলো আর অনুমান নয় — **মাপা আর টেস্ট করা**। (১) `scripts/bench.mjs` এখন আসল সংখ্যা বের করে আর README-র জেনারেটেড ব্লকে বসায়: `npm install` **০.২৬ s** (zero runtime deps), cold start **১০৩ ms**, idle RSS **৬৭ MB**, stop+start **১৬৬ ms**, একটা আসল অফলাইন টার্ন **৮৩ ms** — আর `test/tier2.test.ts` 12.1 ফ্রেশ রান-এর সঙ্গে মিলিয়ে দেখে, নাহলে পুরনো সংখ্যা মিথ্যা হয়ে যায়। (২) **সম্পূর্ণ অফলাইন end-to-end টেস্ট**: mock ব্রেন + নেটওয়ার্ক গার্ড — CLI → প্যানেল → কিউ → রান → ট্রান্সক্রিপ্ট, বাইরের **শূন্য** রিকোয়েস্ট (এমনকি স্টার্টআপে mock-কে probe-ও করা হয় না)। (৩) **অফলাইন outbox আর মেসেজ হারায় না**: ack-after-send কিউ — পাঠানো সফল হলেই কেবল আইটেম সরানো হয়, ক্র্যাশ করলে ফিরে আসে, ফেল করলে কারণ+attempt রাখে; সৎ গ্যারান্টি "at-least-once, acked exactly once"। (৪) `docs/TERMUX.md`-এ OEM-ভিত্তিক ব্যাটারি টেবিল (MIUI/HyperOS · ColorOS/OxygenOS · One UI · Funtouch · EMUI), Termux:Boot-এর গোছা, wake-lock, proot পরিষ্কার — আর গাইডে লেখা **প্রতিটা কমান্ড** আসল কি না টেস্টে মেলানো। (৫) README-র প্রথম স্ক্রিন: কী / কোথায় চলে / খরচ কত + মাপা সংখ্যা।
- **সংখ্যায়:** ৪৯৪টা টেস্ট · ০ ফেল · ৩ skipped · ~৩৫ সেকেন্ড; census **অপরিবর্তিত** (WORKING ৪১ · BETTER ১৪ · PARTIAL ৫৩ · ABSENT ৪২ · **BROKEN ০**), score ৫৩%, drift ০, core lane ~০ দিন — এই ব্যাচ সংখ্যা বাড়ায়নি, **দাবিগুলোর পিছনে প্রমাণ বসিয়েছে**। bonus: TRACKER-এর বাংলা সারসংক্ষেপ এখন census থেকে **জেনারেট** (আগে হাতে লেখা ছিল আর তিন ব্যাচ ধরে ভুল সংখ্যা দেখাচ্ছিল)।
- **তুমি নিজে যাচাই করতে (নতুন):** `node scripts/bench.mjs` (টেবিল) বা `--json` — README-র ব্লকের সংখ্যার সঙ্গে মিলবে; `--write` দিয়ে README আপডেট। `cat docs/TERMUX.md` — নিজের ফোনের ব্র্যান্ড খুঁজে দেখো। `node scripts/census.mjs` — ১৫০ probe, drift ০, core lane ~০ দিন।
- **পরের কাজ (ব্যাচ ১৩):** সস্তা parity ফ্লিপ — আঙুলে লাগা ছোট জিনিস: typing indicator (Telegram `sendChatAction`), রঙ/TTY শৃঙ্খলা (`NO_COLOR`), per-command help, shell completion, আর Discord/Slack/Signal/SMS/Matrix — এই পাঁচটা অ্যাডাপ্টারের আসল টেস্ট (এখন কোনো টেস্ট নেই)। **~১ সপ্তাহ।**

---

## 2. Now — batch 12: prove the phone bets with numbers (this commit)

**Why:** Tier 2 is where the moat lives (the phone *is* the gateway), and a moat you cannot measure is a slogan. Batch 11 finished the core lane; this batch makes the phone claims checkable: numbers the README cannot forge, an offline path that provably never reaches the network, a guide whose commands all exist, and an outbox that stops being wishful about delivery.

| # | Step | Status | Evidence / acceptance test |
|---|---|---|---|
| 12.1 | Measure, don't assert | ✔ done | `scripts/bench.mjs` measures `npm install`, cold start, idle RSS, stop+start and one real offline turn, and `--write` regenerates the README block (markers `BEGIN/END BENCH`) next to the script name, the date and the stated tolerance; `test/tier2.test.ts` 12.1 re-runs the bench, checks every number is a real reading, and fails if the README's idle RSS is not within a 3× band of a live one (a stale number is a lie). Measured here: install **0.26 s** · cold start **103 ms** · idle RSS **67 MB** · restart **166 ms** · turn **83 ms**. |
| 12.2 | The whole loop runs offline | ✔ done | 12.2: with the mock brain and a `fetch` guard that throws on every non-loopback URL, `POST /api/chat` answers the actual question, the transcript keeps the user entry first and the assistant answer last, the **real CLI** (`termcrab run "still awake?"`) prints the same answer, and `probeModel({offline:true})` returns without a request — **zero** external attempts recorded. The test found a real leak: the gateway used to probe `api.openai.com` even for the mock provider; startup/config-change probes now skip it. |
| 12.3 | Every command the guide prints is real | ✔ done | 12.3: every `termcrab <cmd>` in `docs/TERMUX.md` and `README.md` is matched against the real `termcrab help`, every `npm run <script>` against `package.json`, every `node dist/...` against the tree; the guide must cover MIUI/HyperOS, ColorOS/OxygenOS, One UI, Funtouch, wake-lock, Termux:Boot and proot. (The guide's OEM table, the Termux:Boot gotcha and the proot-cleanup section were written for this step.) |
| 12.4 | The first screen answers what / where / what it costs | ✔ done | 12.4: before the first `##`, the README says where it runs (Termux/phone), what it costs (free, MIT, zero runtime deps; you pay only your provider's tokens), that `--demo` needs no key and no network, names `scripts/bench.mjs`, and quotes a real measurement. |
| 12.5 | The outbox delivers exactly once | ✔ done | 12.5: a message queued while the network is down is delivered once when it returns; a claim that died mid-flight (process killed before the send) comes back as pending and is still delivered once; an acked message is never sent again; a failed send keeps its reason and attempt count; `outboxSweep` forgets sent items and never touches pending ones; the **telegram channel's** flush path claims → sends → acks (injected API, no network in the test). |

**Extras the work forced:** the gateway no longer probes the offline brain (the 12.2 guard caught it); `probeModel` grew an `offline` option so "nothing to probe" is an explicit answer rather than a failed request; the outbox file is written atomically (a crash leaves a whole file, never half); the gateway sweeps delivered outbox items weekly; the TRACKER's Bengali summary is now generated by `scripts/census.mjs` (it had been hand-written and had been showing 44% / "7 broken" for three batches).

**Known limits (declared, not hidden):** the delivery guarantee is **at-least-once, acked exactly once** — a crash between a successful send and its ack can repeat that one message (acking first would lose messages instead, which is worse on a phone); a chunked reply that failed halfway can repeat the chunks that had already gone out; the bench is a Linux/Termux measurement (idle RSS is read from `/proc`) and says so with the Node version, the date and a ±40% tolerance — a phone will be slower, and `docs/TERMUX.md` is where that matters.

**Next action:** batch 13 step 13.1 — the cheap parity flips a phone user actually feels: a typing indicator while the agent works, colour/TTY discipline, per-command help, shell completion, and real tests for the five channel adapters that currently have none.

---

## 3. Next — batch 13: the cheap flips a finger feels (~1 week)

Batch 12 proved the phone story; batch 13 makes the daily surface nicer and stops the census from carrying five untested adapters. Every step is small, and every step has a test that a stranger can run.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 13.1 | Typing indicators (Telegram `sendChatAction`) | ☐ todo | while a turn is running the bot sends `typing` to the chat, and it stops when the answer arrives; a fake Telegram API records the actions and asserts the indicator is not sent for ignored users or unknown chats |
| 13.2 | Colour / TTY discipline | ☐ todo | `NO_COLOR=1` (and a pipe instead of a TTY) produces plain output; `termcrab help` under `NO_COLOR` has no escape codes; a test runs the real binary both ways and compares |
| 13.3 | Per-command help | ☐ todo | `termcrab help <cmd>` and `termcrab <cmd> --help` print that command's usage (not the whole list); a test walks every command in the CLI's switch and fails if any has no usage line |
| 13.4 | Shell completion | ☐ todo | `termcrab completion bash|zsh|fish` prints a script; a test checks every command name in the help appears in the generated completions, and that the output is valid shell for at least bash |
| 13.5 | The five adapters get tests (Discord, Slack, Signal, SMS, Matrix) | ☐ todo | each adapter is constructed with an injected fake transport: an allowlist refusal, a send, and a failure path that reaches the outbox or reports honestly; census rows PARTIAL → WORKING for the five |

## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 12 | `5456457` | **The phone bets, proven**: `scripts/bench.mjs` (idle RSS, cold start, install, restart, one offline turn) generating the README's numbers with a stated tolerance and a suite check that they are not stale; a fully offline end-to-end test (CLI → HTTP → queue → run → transcript, zero network attempts, and no startup probe for the mock brain); `docs/TERMUX.md` OEM battery tables + Termux:Boot/wake-lock/proot sections, with every command in the guide verified against the real CLI; the README's first screen answering what/where/cost; and an ack-after-send offline outbox (crash recovery, failed sends keep their reason, weekly sweep) with the telegram flush path tested | `test/tier2.test.ts` (5 steps, incl. the real CLI binary, a network guard and a fake Telegram API; suite now 494 cases) | 494 tests · 0 fail; bench: install 0.26 s · cold start 103 ms · idle RSS 67 MB · restart 166 ms · turn 83 ms; census unchanged at **WORKING 41 · BETTER 14 · PARTIAL 53 · ABSENT 42 · BROKEN 0**, score 53%, drift 0 |
| 11 | `ef757d3` | **The core lane, emptied**: `SessionStore.compactWithModel()` — a configured model (local tier first) writes the compaction digest in bounded chunks, with the extractive digest as the documented fallback and the reason recorded in the entry; incremental coverage so no turn is summarised twice; `readDigest()` + a prompt blurb that says who wrote it, how much it covers and that the full transcript is on disk; `lastDigestSummary()` on `/api/status`; `termcrab memory compact <session>`; `scripts/docs-map.mjs` generates `docs/ARCHITECTURE.md`'s file map and `--check` runs inside the suite | `test/compaction-llm.test.ts` (6 cases, incl. a real `runTurn()` and the real CLI against a live upstream) + `test/docs-map.test.ts` 11.5 (suite now 484 cases, 0 failures, 3 skipped by design) | census **WORKING 39 → 41**, PARTIAL 54 → 53, ABSENT 43 → 42, score **52% → 53%**, drift 0, BROKEN 0; **core lane ~4d → ~0d (empty)** |
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
