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

- **এইমাত্র শেষ (ব্যাচ ১৩):** রোজকার হাতের নিচের ছোট জিনিসগুলো — আর পাঁচটা চ্যানেল অ্যাডাপ্টার যেগুলো ফাইল হিসেবে ছিল কিন্তু কোনো টেস্ট ছিল না। (১) **Telegram typing indicator**: এজেন্ট ভাবতে ভাবতে বট `typing…` পাঠায় (প্রতি ৪ সেকেন্ডে রিফ্রেশ, কারণ Telegram ৫ সেকেন্ডে ভুলে যায়) আর উত্তর এলে থামে; indicator ফেল করলে উত্তর ঠিকই যায়, আর reject হওয়া মানুষ typing-ও দেখে না (13.1)। (২) **রঙের শৃঙ্খলা**: `NO_COLOR` (খালি নয়) `FORCE_COLOR`-কে হারায়, `TCRAB_COLOR=always|never` স্পষ্ট ওভাররাইড, নাহলে রঙ কেবল TTY-তে — পাইপ/লগ/চ্যাট ব্রিজ সবসময় সাদা (13.2, আসল বাইনারি দিয়ে টেস্ট)। (৩) **প্রতি-কমান্ড help**: `src/command-help.ts` একটাই টেবিল — `termcrab help <cmd>` ও `termcrab <cmd> --help` সব কমান্ডে চলে (আগে `disk --help` ভাঙত); টেস্ট ফেল করে যদি cli.ts-এর switch-এ কোনো কমান্ডের এন্ট্রি না থাকে বা ডকুমেন্টেড ফ্ল্যাগ কোডে না থাকে (13.3)। (৪) **Shell completion**: `termcrab completion bash|zsh|fish` — একই টেবিল থেকে, প্রতিটা কমান্ড নাম তিনটেতেই (13.4)। (৫) **পাঁচটা অ্যাডাপ্টার আসল কাজ করে + টেস্টেড**: Discord/Slack/Signal/SMS/Matrix এখন Telegram-এর মতোই একই agent হ্যান্ডলারে যায়, allowlist মানে, উত্তর পাঠায় আর ফেল করা পাঠ outbox-এ রাখে — SDK/daemon optional, টেস্ট inject করা transport দিয়ে (13.5)।
- **সংখ্যায়:** ৫২৭টা টেস্ট · ০ ফেল · ৩ skipped · ~৩১ সেকেন্ড; census **WORKING ৪১ → ৫০**, PARTIAL ৫৩ → ৪৮, ABSENT ৪২ → ৩৮, **BROKEN ০**, drift ০, score **৫৩% → ৫৭%**; core lane ~০ দিন, parity lane ~২৪৯ দিন, later ~১৬৪ দিন।
- **তুমি নিজে যাচাই করতে:** `termcrab help agent` বা `termcrab disk --help` — এখন প্রতিটা কমান্ডের নিজের usage; `TCRAB_COLOR=never termcrab help | cat -v` (কোনো escape code নেই); `termcrab completion bash | head`; `node scripts/census.mjs` — ১৫০ probe, drift ০; `node --test dist/test/adapters.test.js` — পাঁচটা অ্যাডাপ্টার, নেটওয়ার্ক ছাড়া।
- **পরের কাজ (ব্যাচ ১৪):** machine-readable surface — `--json` সব কমান্ডে (একটা envelope: stdout-এ শুধু JSON, লগ stderr-এ), JSON output mode PARTIAL → WORKING, docs+completion-এ ফ্ল্যাগ। **~১ সপ্তাহ।**


---

## 2. Now — batch 13: the cheap flips a finger feels (this commit)

Tier 2 proved the phone bets; this batch makes the daily surface nicer and stops the census from carrying five adapters that existed as files with no test behind them. Every step has a test a stranger can run.

| # | Step | Status | Evidence |
|---|---|---|---|
| 13.1 | Typing indicators (Telegram `sendChatAction`) | ✔ done | `TelegramChannel.withTyping()` sends `typing` before the agent turn, refreshes every 4 s (`TYPING_REFRESH_MS`) and clears the moment the answer is ready; a failing indicator is logged and never blocks the reply; a rejected user gets no indicator and no agent turn. `test/tier2b.test.ts` 13.1 (fake Telegram API asserting the order: typing → agent → answer) |
| 13.2 | Colour / TTY discipline | ✔ done | `src/core/color.ts`: `TCRAB_COLOR=always|never` > non-empty `NO_COLOR` > `FORCE_COLOR` > TTY; the logger, the CLI's error paths and the bin go through it. `test/tier2b.test.ts` 13.2 runs the **real binary**: piped → zero escape codes, `TCRAB_COLOR=always` → coloured, `FORCE_COLOR=1 NO_COLOR=1` → plain |
| 13.3 | Per-command help | ✔ done | `src/command-help.ts` is one table (usage, summary, flags, example) for **29 commands**: `termcrab help <cmd>` and `termcrab <cmd> --help` work everywhere — including commands whose `parseArgs` used to reject `--help`. The test walks the CLI switch, requires an entry per command and a real parse site per documented flag, and drives the binary (`help agent`, `disk --help`, `help nonsense` → exit 1). `test/tier2b.test.ts` 13.3 |
| 13.4 | Shell completion | ✔ done | `termcrab completion bash|zsh|fish` prints a script generated from that same table — every command name appears in all three, bash gets `complete -F _termcrab termcrab`, zsh `#compdef`, fish `complete -c`; an unknown shell exits 1 with the usage line. `test/tier2b.test.ts` 13.4 |
| 13.5 | The five adapters get real routing + tests | ✔ done | Discord, Slack, Signal, SMS and Matrix now route inbound text through the same agent handler as Telegram (allowlists honoured, bot/own-message/subtype noise ignored), send the answer back through their transport, and queue a failed send in the offline outbox **with the reason**. Every transport is injectable, so `test/adapters.test.ts` (5 cases, 13 subtests) drives real code with no SDK, no token and no network: signal-cli JSON parsing, Twilio REST form + basic auth (fake fetch), Matrix own-message ignore, Discord/Slack allowlists. Gateway wiring: all five get `onMessage`, a `conversations_*` sender and an outbox flush |

**Extras the work forced:** the outbox item now remembers *why* it is queued (`outboxPush({error})`), so a retry is debuggable and the five channels can prove it; `trySend()` in the WhatsApp adapter returns the failure reason instead of a bare `false`; the unknown-command error obeys the colour rules; `docs/ARCHITECTURE.md`'s generated map picked up the two new files.

**Known limits (declared, not hidden):** the five adapters are still *bring-your-own-client* — Discord needs `discord.js`, Slack `@slack/bolt`, Signal `signal-cli`, Matrix `matrix-js-sdk`, SMS a Twilio account; none is bundled, and the census row says so. Matrix sends plain text (`sendTextMessage`/`sendMessage`), SMS is text only (no MMS), and typing indicators exist for Telegram only, because it is the only channel that can show one without a dependency.

**Next action:** batch 14 step 14.1 — one JSON envelope for the CLI (`{ok,...}` on stdout, logs on stderr) and `--json` on every command that prints structured data.


---

## 3. Next — batch 14: machine-readable output (~1 week)

Everything the CLI prints is written for a human's eyes; scripts and the panel have to scrape it. Batch 14 gives every structured command one honest machine view, without breaking the human one.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 14.1 | One JSON envelope | ☐ todo | `--json` prints exactly one JSON document on stdout: `{ok:true, command, data}` or `{ok:false, command, error:{message, hint}}`; nothing else on stdout, ever |
| 14.2 | `--json` on the structured commands | ☐ todo | status, sessions, skills, cron, memory, approvals, disk, usage and doctor accept `--json` and document their keys in `termcrab help <cmd>` |
| 14.3 | stdout/stderr discipline | ☐ todo | in `--json` mode warnings and logs go to stderr; a test forces a warning (an ignored config key) and still parses stdout as JSON |
| 14.4 | Failures keep exit codes | ☐ todo | a failing `--json` run still exits non-zero (1 failed, 2 usage, 124 timeout) and still prints the envelope, so a script can branch |
| 14.5 | Docs + tracker move with it | ☐ todo | a README/`docs/CLI.md` section shows one real example per command; census JSON-output row PARTIAL → WORKING with the test as evidence; a BEAT-PLAN row for the batch |


## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 13 | _this commit_ | **The cheap flips a finger feels**: Telegram typing indicator (4 s refresh, cleared with the answer, failure-tolerant); `src/core/color.ts` colour discipline (`NO_COLOR` · `FORCE_COLOR` · `TCRAB_COLOR` · TTY-only) wired through the logger, the CLI errors and the bin; `src/command-help.ts` — one table for 29 commands behind `termcrab help <cmd>`, `termcrab <cmd> --help` and `termcrab completion bash|zsh|fish` (generated, so a flag cannot be documented in one place and missing in another); Discord/Slack/Signal/SMS/Matrix now route to the same agent handler as Telegram, reply through their transport and queue failed sends with the reason, each with an injectable transport, a `conversations_*` sender and an outbox flush in the gateway | `test/tier2b.test.ts` 13.1–13.4 (fake Telegram API, the real binary for colour and help, completions for all three shells) + `test/adapters.test.ts` 13.5 (5 adapters, 13 subtests, no network/SDK) | 527 tests · 0 fail · 3 skipped · ~31 s; census **WORKING 41 → 50 · PARTIAL 53 → 48 · ABSENT 42 → 38 · BROKEN 0**, score **53% → 57%**, drift 0 |
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
