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

- **এইমাত্র শেষ (ব্যাচ ১৪):** CLI এখন স্ক্রিপ্টের বন্ধু — প্রতিটা structured কমান্ড `--json` নেয়, আর stdout-এ **ঠিক একটা** JSON ডকুমেন্ট দেয়। (১) **একটাই envelope**: `{"ok":true,"command":"status","data":{…}}` — সফল আর ব্যর্থ দুটোতেই, তাই স্ক্রিপ্ট সবসময় parse করতে পারে আর exit code-ও অপরিবর্তিত (0 done · 1 failed · 124 timeout · 130 stopped)। (২) **১১টা কমান্ডে** `--json`: status · sessions (ls/export/purge/rename) · skills · cron · memory (show/search/compact) · approvals · usage · disk · doctor · run/wait · stop. (৩) **শৃঙ্খলা**: `--json` মোডে logger-এর প্রতিটা লাইন stderr-এ চলে যায়, তাই মাঝপথে একটা warning ডকুমেন্ট নষ্ট করতে পারে না; `status --json`-এ config-এর সমস্যা এখন `configProblems` নামে দেখায় (মানুষি বাক্য নয় — path + severity)। (৪) **ব্যর্থতাও data**: panel বন্ধ, সেশন নেই, cron নেই, timeout — সব ক্ষেত্রেই envelope + hint + নন-জিরো exit। (৫) **চুক্তি লেখা আছে**: `docs/CLI.md`-তে সব কমান্ডের key + কপি করার মতো উদাহরণ, আর `termcrab help <cmd>` প্রতিটা কমান্ডের JSON key-ও ছাপায়।
- **সংখ্যায়:** ৫৫৫টা টেস্ট · ০ ফেল · ১ skipped · ~৪২ সেকেন্ড; census **WORKING ৫০ → ৫১**, PARTIAL ৪৮ → ৪৭, **BROKEN ০**, drift ০, score **৫৭%**; core lane ~০ দিন, parity ~২৪৬ দিন, later ~১৬৪ দিন (মোট ~৪১০ দিন)।
- **তুমি নিজে যাচাই করতে:** `termcrab status --json | jq .data.queue`; `termcrab usage --json | jq .data.totalTokens`; panel বন্ধ রেখে `termcrab usage --json; echo $?` — `ok:false` envelope আর exit 1; `termcrab help disk` — `--json` লাইনে কী কী key আছে লেখা; `node --test dist/test/tier2c.test.js`।
- **পরের কাজ (ব্যাচ ১৫):** চ্যাট-সারফেস যেটা ফোনে সবচেয়ে বেশি ছোঁয়া হয় — Telegram-এ **ছবি/ফাইল আসা** (inbox-এ জমা + এজেন্টকে path জানানো), **ফাইল পাঠানো** (`send_document` টুল + outbox), **গ্রুপ শৃঙ্খলা** (mention ছাড়া চুপ, per-chat session), আর চ্যাটে `/usage` `/sessions` `/memory` `/help`। **~১ সপ্তাহ।**


---

## 2. Now — batch 14: machine-readable output (this commit)

Every command printed sentences meant for a human, so a script (or the panel) had to scrape them. This batch adds one honest machine view per command, without touching the human one.

| # | Step | Status | Evidence |
|---|---|---|---|
| 14.1 | One JSON envelope | ✔ done | `src/core/json-out.ts`: `emitJson(cmd, data)` → `{"ok":true,"command":"…","data":…}`, `failJson(cmd, message, hint, code)` → `{"ok":false,"command":"…","error":{message,hint}}` + exit code. Exactly one document on stdout: `test/tier2c.test.ts` 14.1 parses stdout for seven commands and refuses anything that is not one object with the contract keys |
| 14.2 | `--json` on the structured commands | ✔ done | status · sessions (ls/export/purge/rename) · skills (ls/import/new) · cron (ls/add/rm/on/off) · memory (show/search/compact) · approvals (list/decide) · usage · disk · doctor · run/wait · stop. The test checks the documented keys are really in `data` **and** that `termcrab help <cmd>` documents them — help and code cannot drift apart |
| 14.3 | stdout/stderr discipline | ✔ done | `setLogToStderr(true)` runs in `main()` before any command when `--json` is present; the logger writes every level to stderr then (`logStream()` reports it). `test/tier2c.test.ts` 14.3 drives the logger in a child process, then plants an unknown key in `config.json` and proves the machine view carries `configProblems:[{path,severity}]` while the human sentence stays off the document |
| 14.4 | Failures keep exit codes | ✔ done | panel down (`usage`), missing chat (`sessions export`), missing job (`cron rm`) and a run that never finishes (`run --wait --timeout 0` against a fake panel) all print `ok:false` with a hint and exit non-zero — the timeout one keeps exit **124**, so `if termcrab run --wait …` still branches |
| 14.5 | Docs + tracker move with it | ✔ done | `docs/CLI.md` writes the contract down with a real example per command; census row `JSON output mode` flipped PARTIAL → WORKING with this test as evidence; BEAT-PLAN gained beat T1.8 and phase **E**; README's study-numbers table refreshed |

**Extras the work forced:** `status` was refactored into `statusData()` (data) + `renderStatus()` (page) + `statusReport()`, so the JSON view and the human page can never disagree; `LiveQueue` reports `idle`/`busy`/`down`/`unknown` as a *state* instead of a sentence, because "the panel is down" is information a script needs; the doctor path now shares one code path for `--json` and the new envelope.

**Known limits (declared, not hidden):** `agent`, `cron run` and `dream` still stream their answer to stdout — they are conversations, not reports, and they stay human-readable; `--json` on them is not defined yet (batch 15 candidate). `approvals`/`usage`/`stop` need the panel, so their failure envelope always carries the "start the panel" hint rather than inventing numbers.

**Next action:** batch 15 step 15.1 — recon the channel/media rows: what is cheapest to make genuinely useful on a phone (Telegram media in/out, group mention policy, more `/commands`).


---

## 3. Next — batch 15: the chat surface people actually use (~1 week)

The panel and the CLI are solid; the surface a phone user touches most is Telegram. Batch 15 is about making that surface real, chosen after recon of the census's channel rows — and every step still ends in a test a stranger can run.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 15.1 | Media in: a photo or file sent to the bot is saved and named in the reply | ☐ todo | a fake Telegram update with a `photo`/`document` downloads the file through an injected API, stores it under `TCRAB_HOME/workspace/inbox/`, and the agent is told the path; oversize and disallowed types are refused with a sentence, not a crash |
| 15.2 | Media out: the agent can send a file back | ☐ todo | `send_document` tool posts a workspace file to the chat with a caption; a failed send goes to the outbox like any reply; the file is checked against the allowed roots |
| 15.3 | Group discipline | ☐ todo | in a group the bot answers only when mentioned (or replied to) unless `channels.telegram.groupPolicy` says otherwise; the session key is per-chat and the mention is stripped before the agent sees it |
| 15.4 | More `/commands` in chat | ☐ todo | `/usage`, `/sessions`, `/memory` and `/help` answer from the same data the CLI JSON reports; an unknown `/x` gets the list instead of silence |
| 15.5 | Docs + census | ☐ todo | `docs/CHANNELS.md` shows what each channel can and cannot do; the media and group rows move with the test as evidence; BEAT-PLAN gets the beat |


## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 14 | _this commit_ | **Machine-readable CLI**: `src/core/json-out.ts` — one envelope `{ok, command, data}` on success and `{ok:false, …, error:{message,hint}}` on failure, always exactly one document on stdout; `--json` on status, sessions, skills, cron, memory, approvals, usage, disk, doctor, run/wait and stop; in json mode `setLogToStderr(true)` moves every log line to stderr; `status` split into `statusData()`/`renderStatus()` so the data view and the page cannot disagree, and `configProblems` exposed as `{path, severity}`; `docs/CLI.md` documents the contract and `termcrab help <cmd>` names the keys | `test/tier2c.test.ts` 14.1–14.5 (seven commands parsed as one document, help-vs-data cross-check, logger-in-child-process, a warning planted in config.json, fake-panel timeout at exit 124, docs + census) | 555 tests · 0 fail · 1 skipped · ~42 s; census **WORKING 50 → 51 · PARTIAL 48 → 47 · BROKEN 0**, score 57%, drift 0 |
| 13 | `779f7de` | **The cheap flips a finger feels**: Telegram typing indicator (4 s refresh, cleared with the answer, failure-tolerant); `src/core/color.ts` colour discipline (`NO_COLOR` · `FORCE_COLOR` · `TCRAB_COLOR` · TTY-only) wired through the logger, the CLI errors and the bin; `src/command-help.ts` — one table for 29 commands behind `termcrab help <cmd>`, `termcrab <cmd> --help` and `termcrab completion bash|zsh|fish` (generated, so a flag cannot be documented in one place and missing in another); Discord/Slack/Signal/SMS/Matrix now route to the same agent handler as Telegram, reply through their transport and queue failed sends with the reason, each with an injectable transport, a `conversations_*` sender and an outbox flush in the gateway | `test/tier2b.test.ts` 13.1–13.4 (fake Telegram API, the real binary for colour and help, completions for all three shells) + `test/adapters.test.ts` 13.5 (5 adapters, 13 subtests, no network/SDK) | 527 tests · 0 fail · 3 skipped · ~31 s; census **WORKING 41 → 50 · PARTIAL 53 → 48 · ABSENT 42 → 38 · BROKEN 0**, score **53% → 57%**, drift 0 |
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
