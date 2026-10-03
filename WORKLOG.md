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

- **এইমাত্র শেষ (ব্যাচ ১৭):** ইনবক্স এখন এজেন্টের হাতের কাছে। (১) **এজেন্ট নিজে দেখতে পারে**: `inbox_list` (কে কী পাঠিয়েছে — নাম, ধরন, সাইজ, কত আগে) আর `inbox_read` (একটা ফাইলের টেক্সট), চ্যাটে `/inbox` ও `/inbox <নাম>` (17.1)। (২) **দুবার পড়া লাগে না**: যা এসে পড়া হয়েছিল সেটা ফাইলের পাশে `<নাম>.text.md` sidecar হিসেবে একবারই লেখা হয়; ফাইলটা মুছে গেলেও টেক্সটটা থেকে যায় (17.2 — টেস্টে ফাইল ডিলিট করে প্রমাণ করা)। (৩) **তালিকা আর কোড আলাদা হতে পারে না**: `docs/CHANNELS.md`-এর "কে ফাইল পাঠাতে পারে" কলাম আর গেটওয়ের `registerDocumentSender` কল — টেস্ট দুটো মিলিয়ে দেখে (17.3)। (৪) **trim হওয়া ফাইল নিজের কথা বলে**: index থেকে যায় (তাই `.inbox-index.json` budget থেকে সুরক্ষিত), তালিকায় `GONE — trimmed by the disk budget`, আর `inbox_read` বলে "ফাইলটা নেই, এই টেক্সটটা তোলা ছিল" — missing path error নয় (17.4)। (১৭.৫) নিয়ম ও census-এর সাক্ষ্য লেখা।
- **সংখ্যায়:** ৬২৩টা টেস্ট · ০ ফেল · ৩ skipped · ~৩৮ সেকেন্ড; census **একই verdict (WORKING ৫৪ · ABSENT ৩৬ · BROKEN ০ · score ৫৯%)** — কারণ এবার নতুন capability নয়, আগের capability গুলোকে (File operations, Disk budget) সৎভাবে শক্ত করা; census-এ সেই কারণেই verdict বদলায়নি, শুধু সাক্ষ্য বদলেছে।
- **যা টেস্ট ধরল:** `docs-map --check` চুপচাপ পাস করছিল যখন generated row-তে এখনো *"new — describe me"* লেখা থাকত অথচ ফাইলের header comment-এ বর্ণনা ছিল — এখন সেটাও drift; আর  ফাইল হারিয়ে গেলেও উত্তরটা আসে (আগের কোডে শুধু "ফাইল নেই" বলত); আর `docs/CHANNELS.md`-এর টেবিল vs কোড — কেউ একটা চ্যানেল যোগ করলে টেস্ট ফেল করবে।
- **পরের কাজ (ব্যাচ ১৮):** মেমোরি যাকে বিশ্বাস করা যায় — র্যাঙ্ক করা search (BM25-ধাঁচ, recency, exact phrase), কোন কথাটা কোথা থেকে মনে আছে (provenance), একই কথা বারবার লেখা আটকানো, চ্যাটে `/memory search …`। **~৪–৫ দিন** (recon করে চূড়ান্ত)।


---

## 2. Now — batch 17: the agent's own inbox (~half a week)

Batch 16 read a file once, when it arrived. This one gives the inbox a memory, so "the file I sent you yesterday" works — and so a trimmed file is a sentence, not a broken path.

| # | Step | Status | Evidence |
|---|---|---|---|
| 17.1 | The agent can look | ✔ done | `src/channels/inbox.ts` + two tools: **`inbox_list`** (newest first: name, kind, size, age, whether the text was saved, `GONE` when trimmed) and **`inbox_read`** (the saved text, or a fresh read when there is none). The chat gets `/inbox` and `/inbox <name>` (3000-character cap). Names from a chat are never paths: separators, drive letters and `..` are refused before anything is opened. `test/tier2f.test.ts` 17.1 |
| 17.2 | Read once, remembered | ✔ done | The text learned at arrival (document text / transcript / picture description) is written next to the file as `<name>.text.md` and one row is added to `.inbox-index.json`. `inbox_read` answers from the sidecar — proven by deleting the file and still getting the text, with no second parse. One name has one row: a re-arrival replaces its own entry. `test/tier2f.test.ts` 17.2 |
| 17.3 | Docs and code cannot disagree | ✔ done | A test reads `docs/CHANNELS.md`, derives each row's "can send files" cell, and compares it with every `registerDocumentSender(...)` call in the gateway; the runtime registry is probed separately (a channel that never registered is not listed). Adding a channel without touching the docs — or the reverse — now fails the suite. `test/tier2f.test.ts` 17.3 |
| 17.4 | A trimmed arrival explains itself | ✔ done | `.inbox-index.json` is protected from the disk budget (`PROTECTED_NAMES`), the list marks a missing file `GONE — trimmed by the disk budget`, and `inbox_read` still answers when the *sidecar* survived, adding "the file itself was trimmed". When neither is left, the error says when the file was here. `test/tier2f.test.ts` 17.4 (retention sweep included) |
| 17.5 | Docs + census | ✔ done | `docs/CHANNELS.md` gained the inbox table (tools, command, the two promises, the name rule). Census evidence updated for **File operations** (inbox tools) and **Disk budget + pruning** (inbox area, protected index) — verdicts deliberately unchanged: this batch hardened what exists, it did not add a new capability. BEAT-PLAN phase **G** ✔ |

**Limits stated in the open:** the index keeps the last 200 arrivals (older rows are dropped; the files are not); the sidecar is plain text, not a re-readable original; `/inbox <name>` prints at most 3000 characters; the inbox is Telegram's only feeding channel today.

**Next action:** batch 18 step 18.1 — recon then build: memory that can be trusted (ranked search, provenance, duplicate control, `/memory search`), without an embedding model on the phone.


---

## 3. Next — batch 18: memory you can trust (~4–5 days)

The memory store works, but searching it is lexical and unranked, and a fact's origin is a filename. On a phone the memory is the product: batch 18 makes it ranked, sourced and de-duplicated.

| # | Step | Status | Acceptance test |
|---|---|---|---|
| 18.1 | Search that ranks | ☐ todo | scored search (term frequency + exact-phrase boost + recency), snippets, and `memory search --json` carrying the score and the span — no embedding model required to be useful |
| 18.2 | Every fact says where it came from | ☐ todo | a fact/snippet records the session and the turn it was learned in; `memory show` and `/memory` display it, and a search result can be explained |
| 18.3 | The same thing is not stored twice | ☐ todo | a repeated fact merges instead of appending (newest wins, the older occurrence kept as provenance) — one test proves the file does not grow on the second write |
| 18.4 | The agent and the chat can search | ☐ todo | a `memory_search` tool for the loop and `/memory search <query>` in the chat, both from the same ranked function |
| 18.5 | Docs + census | ☐ todo | `Memory search quality` moves with its proof, `Memory provenance / taint` states what is there and what is not |


## 4. Done — batches, commits, and the proof

| Batch | Commit | What shipped | Verified by | Measured |
|---|---|---|---|---|
| 17 | `34a9912` | **The agent's own inbox**: `.inbox-index.json` records every arrival and `<name>.text.md` keeps the text learned about it, so `inbox_list`/`inbox_read` tools and chat `/inbox` (with `/inbox <name>`) answer from memory instead of re-parsing; a trimmed arrival is reported as `GONE` (the index is protected, the sidecar can outlive the file) and names from a chat can never be paths; the docs table and the registered document senders are cross-checked by a test so they cannot drift | `test/tier2f.test.ts` 17.1–17.5 (18 subtests: index/sidecar round-trip with the file deleted, retention sweep keeping the index, docs↔code table check, registry probe, name-traversal refusals) | 623 tests · 0 fail · 3 skipped · ~38 s; census verdicts unchanged (WORKING 54 · ABSENT 36 · BROKEN 0 · score 59%), evidence hardened, drift 0 · release 0.49.0 |
| 16 | `04e792e` | **What arrives should be readable**: zero-dependency readers turn an arriving PDF (content streams + FlateDecode, line-broken on `Td/TD/T*/ET`), DOCX/PPTX/XLSX (small ZIP reader on `node:zlib`) and every text format into capped text with a truncation note, refusing a scan with an OCR sentence; pictures go to a model that can see as a real `image_url` part (`ChatRequest.image`, capability table, 4 MB cap) or the agent is told *I saved it but cannot see it* with the fix; arriving voice notes become the message via whisper.cpp (5 MB cap, honest missing-engine sentence); `workspace/inbox/` is its own disk area under the retention rule while `workspace/` stays untouchable | `test/tier2e.test.ts` 16.1–16.5 (27 subtests: hand-built PDF and ZIP, wire-body assertion on a fake fetch, channel end-to-end through intake, retention aging, docs + census) | 605 tests · 0 fail · 3 skipped · ~38 s; census **WORKING 53 → 54 · ABSENT 37 → 36 · BROKEN 0**, score **58% → 59%**, drift 0 · release 0.48.0 |
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
node scripts/status.mjs --tests  # ...and run the full suite (≈38 s)
node scripts/census.mjs          # the capability map vs OpenClaw, with per-row probes

# batch 16: watch our own reader take the text out of a PDF (no dependency, no network)
node --input-type=module -e "import {extractText} from './dist/src/channels/extract.js'; console.log(extractText('some.pdf'))"
termcrab disk --json | jq '.data.before.byArea.inbox'   # the inbox as its own area
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
