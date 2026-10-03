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

- **এইমাত্র শেষ (ব্যাচ ১৫):** যে সারফেসটা ফোনে সত্যিই ছোঁয়া হয় — Telegram — সেটা এখন আসল কাজের। (১) **ফাইল আসে**: ছবি/ডকুমেন্ট/ভয়েস note `workspace/inbox/`-এ নামে, এজেন্ট path+caption পায়; সাইজ সীমা (`channels.telegram.maxFileMb`, ডিফল্ট ২০ MB), এক্সটেনশন allow-list, আর **executables (`.apk .dex .exe .sh …`) কখনোই নয়** — কারণটা একটা বাক্যে ফেরত যায় (15.1)। (২) **ফাইল যায়**: এজেন্টের নতুন `send_file` টুল — workspace-এর ভিতরের ফাইল ছবি/PDF হয়ে চ্যাটে যায়; ফেল করলে ফাইলটা outbox-এ থাকে, হারায় না (15.2)। (৩) **গ্রুপ শৃঙ্খলা**: mention বা নিজের মেসেজে reply ছাড়া গ্রুপে চুপ; mention ছেঁটে এজেন্টকে পাঠানো হয়; `groupPolicy="all"` দিলে সব (15.3)। (৪) **চ্যাটে কমান্ড**: `/help /usage /sessions /memory` — সব আসল ডেটা থেকে (মিটার, সেশন স্টোর, মেমোরি ফাইল) (15.4)। (৫) **নিয়ম লেখা**: `docs/CHANNELS.md` — কোন চ্যানেল কী পারে, কোনটা পারে না, সৎভাবে (15.5)।
- **সংখ্যায়:** ৫৭৭টা টেস্ট · ০ ফেল · ১ skipped · ~৪২ সেকেন্ড; census **WORKING ৫১ → ৫৩**, PARTIAL ৪৭ → ৪৬, ABSENT ৩৮ → ৩৭, **BROKEN ০**, drift ০, score **৫৭% → ৫৮%**; channels area ৬৪% → **৭৬%**; core lane ~০ দিন, parity ~২৪০ দিন, later ~১৬৪ দিন।
- **টেস্ট দুটো আসল বাগ ধরল:** outbox-এর `normalize()` নতুন `file` ফিল্ড ফেলে দিচ্ছিল (queue করা documentই খালি টেক্সট হয়ে যেত), আর `learnSelf()` শেষ হওয়ার আগেই প্রথম poll চলত — তাই গ্রুপে নিজের mention-ই চেনা যেত না। দুটোই ঠিক করা হয়েছে।
- **পরের কাজ (ব্যাচ ১৬):** ডেটা-সমৃদ্ধ করতে চ্যানেল থেকে শেখা — এজেন্টকে বলা "এই ফাইলটা বিশ্লেষণ করো" যখন PDF/ছবি আসে (document text extraction), আর দীর্ঘ-মেয়াদি ভয়েস: voice note → transcribe → উত্তর। **~১ সপ্তাহ** (recon করে চূড়ান্ত)।


---

## 2. Now — batch 15: the chat surface people actually use (this commit)

The panel and the CLI are solid; the surface a phone user touches most is Telegram. This batch makes that surface real — media in, media out, group manners, and commands — with the tests that prove each one.

| # | Step | Status | Evidence |
|---|---|---|---|
| 15.1 | Media in | ✔ done | `src/channels/media.ts` owns the rules (size ≤ `maxFileMb` default 20 MB, extension allow-list, executables `.apk/.dex/.exe/.sh/…` refused **by name**); `TelegramApi.getFile()` + `downloadFile()` fetch the bytes; the file lands in `workspace/inbox/<timestamp>-<name>` (so two photos cannot collide) and the agent is asked with `[photo saved to inbox/… (12 KB)] <caption>`. A refused file answers in one sentence and never reaches the disk. `test/tier2d.test.ts` 15.1 (four subtests, spy API, no network) |
| 15.2 | Media out | ✔ done | `TelegramApi.sendDocument()` (multipart), `TelegramChannel.sendDocument()` queues failures, `registerDocumentSender`/`sendDocumentTo` give the agent one door, and the new **`send_file`** tool resolves paths inside the same roots as every other file tool, re-checks the same media rules, and defaults to the most recent chat. `test/tier2d.test.ts` 15.2 (sender + fallback + outbox + tool refusals) |
| 15.3 | Group discipline | ✔ done | `channels.telegram.groupPolicy` (`mention` default, `all` opt-in); in a group the bot answers only when `@username` appears or the message replies to one of its own, and the mention is stripped before the agent sees the text. `learnSelf()` runs **before the first poll**, so the very first mention is recognised. `test/tier2d.test.ts` 15.3 (silence, strip, reply, policy=all, private chat) |
| 15.4 | Commands in chat | ✔ done | `/help`, `/usage` (the real meter: turns, tokens, cost), `/sessions` (the real store), `/memory` (the real files) join `/new`, `/status`, `/agents`, `/providers`, `/heartbeat` — same facts the CLI's `--json` reports. `test/tier2d.test.ts` 15.4 checks each command is wired to the real source, not a stub |
| 15.5 | Docs + census | ✔ done | `docs/CHANNELS.md`: a per-channel table (what can send files, what cannot, what each adapter needs) plus the Telegram rules in plain language. Census: `Media send/receive` PARTIAL → **WORKING**, `Group / ambient events` ABSENT → **PARTIAL**, `Slash commands in chat` PARTIAL → **WORKING** — each citing 15.x. BEAT-PLAN beat T1.9 + phase **F** |

**Extras the work forced:** two real bugs, both caught by the new tests — `outbox normalize()` was dropping the new `file` field (a queued document would have been retried as an empty text), and `learnSelf()` raced the first poll (a group mention in the very first batch of updates was invisible). Also: the `tools/Document extraction` census probe was matching the word "pdf" inside the new inbox allow-list, which was itself a lesson — the probe now names extraction libraries, not the file extension, and drift is 0 again. A third fix came from running the suite while a panel was live: `doctor` called a busy gateway port a failure even when the TermCrab gateway was the thing holding it — it now probes `/api/health` and reports "already running", with `test/gateway.test.ts` pinning both that case and a real stranger on the port.

**Known limits (declared, not hidden):** media is Telegram-only (the other six adapters stay text — `docs/CHANNELS.md` says so per channel); an incoming PDF is saved intact but its text is not parsed out (that is the `Document extraction` row, still ABSENT); voice notes are saved for transcription but not auto-transcribed; the outbox cannot retry a document whose file was deleted meanwhile (it reports the error and keeps the reason).

**Next action:** batch 16 step 16.1 — recon then build: document extraction (a PDF/photo that arrives becomes something the agent can read) and voice-note → transcript, so a phone can hand the agent a page of paper.


---

## 3. Next — batch 16: what arrives should be readable (~1 week)

A phone hands the agent paper and voice. Right now a PDF lands intact and a voice note lands unread. Batch 16 closes that loop — after recon, and with the same rule as always: every step ends in a test a stranger can run.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 16.1 | Extract text from what arrives | ☐ todo | a PDF or DOCX in the inbox is parsed to text (no heavy deps: a small built-in PDF text pass, and refusal-with-reason for what cannot be parsed), capped in size, and handed to the agent instead of just a path |
| 16.2 | Photos the agent can read | ☐ todo | a picture that arrives is described through the configured model when one can see images, and falls back to "I saved it, I cannot see it" instead of pretending |
| 16.3 | Voice notes become text | ☐ todo | an `.ogg`/`.m4a` in the inbox is transcribed through `whisper.cpp` when it is installed (`termcrab transcribe` already exists), and the transcript is what the agent answers |
| 16.4 | Inbox hygiene | ☐ todo | old inbox files are swept by the disk budget with a documented retention, and `termcrab disk` shows them as their own area |
| 16.5 | Docs + census | ☐ todo | `docs/CHANNELS.md` and the `Document extraction` row move with the test as evidence |


## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 15 | `5a33662` | **The chat surface people actually use**: Telegram files in (`getFile`/`downloadFile` → `workspace/inbox/`, size limit, extension allow-list, executables refused by name) and out (`sendDocument` + the `send_file` tool + `registerDocumentSender`/`sendDocumentTo`, failures kept in the outbox with the file); group discipline (`groupPolicy` mention-default, mention stripped, replies to the bot count, `learnSelf` before the first poll); chat commands `/help` `/usage` `/sessions` `/memory` answering from the real meter/store/files; `docs/CHANNELS.md` with an honest per-channel table | `test/tier2d.test.ts` 15.1–15.5 (20 subtests: spy Telegram API, inbox writes, refusals, outbox, tool roots, group silence/strip/reply/policy, command wiring, docs + census) | 577 tests · 0 fail · 3 skipped · ~42 s; census **WORKING 51 → 53 · PARTIAL 47 → 46 · ABSENT 38 → 37 · BROKEN 0**, score **57% → 58%**, channels area 64% → 76%, drift 0 |
| 14 | `9fd9f6b` | **Machine-readable CLI**: `src/core/json-out.ts` — one envelope `{ok, command, data}` on success and `{ok:false, …, error:{message,hint}}` on failure, always exactly one document on stdout; `--json` on status, sessions, skills, cron, memory, approvals, usage, disk, doctor, run/wait and stop; in json mode `setLogToStderr(true)` moves every log line to stderr; `status` split into `statusData()`/`renderStatus()` so the data view and the page cannot disagree, and `configProblems` exposed as `{path, severity}`; `docs/CLI.md` documents the contract and `termcrab help <cmd>` names the keys | `test/tier2c.test.ts` 14.1–14.5 (seven commands parsed as one document, help-vs-data cross-check, logger-in-child-process, a warning planted in config.json, fake-panel timeout at exit 124, docs + census) | 555 tests · 0 fail · 1 skipped · ~42 s; census **WORKING 50 → 51 · PARTIAL 48 → 47 · BROKEN 0**, score 57%, drift 0 |
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
