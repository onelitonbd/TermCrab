# Performance budget — the alarm, not the stopwatch

A README can quote a number for years after it stopped being true. TermCrab's
numbers are measured by `scripts/bench.mjs`, but a measurement on its own is
just a fact about yesterday: nothing fails when it doubles. This file is the
other half — **every number the phone story depends on has a ceiling, and the
suite fails when a measured number crosses it** (37.1).

```bash
npm run bench:budget                   # --quick --budget, the same gate the suite runs
node scripts/bench.mjs                # measure: table, 3 samples each
node scripts/bench.mjs --quick         # 1 sample (what the suite runs)
node scripts/bench.mjs --budget        # measure, then exit 1 if anything is over
node scripts/bench.mjs --quick --budget --json   # machine-readable (stdout is pure JSON)
```

`test/tier3i.test.ts` runs `--quick --budget --json`, asserts `overBudget` is
empty, and checks the ceilings written here match the ones in `BUDGETS` in
`scripts/bench.mjs` — a budget cannot be raised in the code without raising it
in this table too, in the same diff, on purpose.

## The ceilings

Measured 2026-10-04 on the development box (Node v22.22.3, Linux) while these
were written, with the offline `mock` brain — no key, no network, so the numbers
are about TermCrab and not about somebody's API latency.

| metric | measured | ceiling | why the ceiling is where it is |
|---|---|---|---|
| `installMs` — `npm install --omit=dev` | 231 ms | **20000 ms** | zero runtime deps: npm has nothing to fetch, so this is npm's own overhead plus a phone being slow. A dependency sneaking into `dependencies` shows up here as minutes |
| `coldStartMs` — cold start (`termcrab version`) | 133 ms | **1500 ms** | every CLI call pays it. The docs page, the agent, the channels and the embedder must all stay lazily imported; 1.5 s is ~11× the measurement, so crossing it means a module graph moved into startup |
| `idleRssMb` — idle RSS (gateway, offline) | 71 MB | **130 MB** | a 2 GB phone kills hogs. Memory is a *level*, not a sample, so ~1.8× is the tightest honest multiple |
| `restartMs` — stop + start again (`supervisor`) | 136 ms | **2500 ms** | the supervisor restarts after a crash; a restart has to be invisible to the person holding the phone |
| `turnMs` — one real turn (message → answer, offline) | 88 ms | **5000 ms** | the whole loop, offline. A provider call is the user's own network and is excluded by design |
| `coldInstallMs` — `npm install` on a fresh checkout, **empty npm cache** | 742 ms | **60 000 ms** | three dev packages and zero runtime dependencies; on mobile data this is the whole download, and the ceiling is where a phone's patience ends |
| `coldCheckoutMs` — `npm install` → `./termcrab` answers, end to end | 6.5 s | **90 000 ms** | the complete first contact. Measured with an isolated cache so it cannot freeload on whatever npm already downloaded on this machine |
| `roomWriteMs` — 200 group messages recorded into one room | ~180 ms | **1500 ms** | a chatty group: the room log is bounded twice (200 messages, 64 KB) and every append pays the read-and-trim that keeps it bounded. Unbounded growth would show up here first |
| `outboxDrainMs` — 200 owed messages queued, claimed, acked, swept | ~300 ms | **1500 ms** | a phone that was offline for a day has to flush what it owes without a stall; the queue is JSONL on disk, so this is real I/O |
| `telegramPollMs` — 50 poll cycles of 50 updates against a local stub | ~60 ms | **2000 ms** | the plumbing between Telegram and our handlers: JSON parse, offset arithmetic, handler dispatch setup. A local stub on purpose, so the number is ours and not Telegram's |
| `docsMs` — building the offline docs page (60 docs) | 49 ms | **1500 ms** | every doc rendered into one HTML file by the panel's own markdown renderer; `termcrab docs rebuild` and the panel's rebuild button both pay it, so it must stay a blink |
| `docsKb` — the built page on disk | 2754 KB | **4000 KB** | one HTML file a phone has to hold and a browser tab has to parse; 4 MB is where a phone tab starts to complain, and the raw OpenClaw crawl is deliberately *not* in it |
| `searchMs` — one memory search over 10 000 vectors | 7 ms | **200 ms** | the index is a JSONL file scanned in memory — filter, cosine, sort — and 10 000 rows is about a year on a phone. The ceiling is the alarm for a search that quietly became quadratic, or an index that started hitting the disk on every query. Measured with a deterministic local embedder, so the number is about *our* scan and not somebody's API |
| `firstRunMs` — first `./termcrab` from a fresh checkout | 5212 ms | **30000 ms** | the one wait a new user pays, once: the launcher compiles 126 files with `tsc`. A phone is several times slower, which is why the ceiling is 30 s on a box that does it in 5 |
| `rebuildMs` — run again after a `git pull` | 1704 ms | **8000 ms** | "pull, then run" must stay a fraction of a full build, or people stop pulling |

## The cold checkout, from nothing (39.5)

`measureFirstRun` (37.3) symlinks this repository's `node_modules` — it measures the *developer's*
second run. The number a new person pays is different, so the bench measures it separately and honestly:
a copy of the tree with no `dist/`, no `node_modules`, and an **isolated npm cache**, then

```bash
npm install --no-fund --no-audit     # three dev packages, zero runtime dependencies
./termcrab version                   # compiles on first run, then answers
```

Measured here: **install 0.74 s, end to end 6.5 s** (the rest is the first compile). The split matters
on a phone: the install half is a network cost that depends on mobile data, the compile half is a CPU
cost that depends on the phone. `firstRunMs` and `rebuildMs` are the CPU half from then on.

`--first-run` makes the bench measure all of it (`bench --first-run`), and both numbers sit under
ceilings — 60 s and 90 s — which is the alarm for a first contact that got slower, not a claim about
your connection.

## The loops a phone feels (39.4)

Three numbers that only show up while using the device, measured by the bench in a throwaway
`TCRAB_HOME` (so nothing real is touched) and a local Bot API stub (so the poll number is our plumbing,
not Telegram's latency):

- **`roomWriteMs`** — a group that never stops talking. The room log is bounded twice and the trim runs
  on every append, so a busy group is the *worst* case by design; this ceiling is what would catch the
  bound being removed (or made quadratic) for convenience.
- **`outboxDrainMs`** — the phone was offline; now 200 owed messages get queued, claimed, acknowledged
  and swept. This is disk work, and it has to fit in a breath.
- **`telegramPollMs`** — 50 cycles of 50 updates through the real `TelegramApi`: parse, advance the
  offset, hand each to the dispatcher. If a poll cycle ever grows into seconds here, a chatty group
  would make the phone hot before Telegram ever complained.

None of the three talks to the network, none of them touches your real home, and none of them claims a
phone's speed — the alarm is a regression on the machine that runs the suite, like every other ceiling.

## Memory search: why it has a ceiling (39.2)

`EmbeddingIndex.search()` walks every row it can compare, computes `cosine` and sorts. That is a scan,
and a scan is the right shape here: a phone has no vector database, and 10 000 rows of 384 floats is
~30 MB of JSON that loads once and stays in memory. What the ceiling protects is the *shape* — a
linear scan stays in single-digit milliseconds, a quadratic one does not, and the delta only shows up
after a month of use, which is exactly when nobody is looking.

Two properties the measurement does **not** claim:

- It is not a remote embedder's latency. The query vector is produced by a deterministic local
  pseudo-embedder so the number is our filter/cosine/sort, not a network round trip.
- It is not a phone's number. `firstRunMs`/`idleRssMb` already say what a phone does; these ceilings
  are the regression alarm on the machine that runs the suite.

If `searchMs` ever trips: check that `search()` still filters by vector length *before* scoring (it
does, 35.4), that the index is loaded once and cached (it is), and that nothing started re-reading the
JSONL per query. `termcrab embeddings status` says how many rows and of which model the index holds.

## The first run, and the cut behind it (37.3)

The launcher (`./termcrab`) compiles the checkout the first time you run it.
Two things changed when this budget was written:

1. **It rebuilds when the sources are newer than the build.** Before, only a
   *missing* `dist/` triggered a build — so `git pull` followed by
   `./termcrab` ran yesterday's code, quietly. Now the launcher compares
   `src/` and `tsconfig.json` against the built entry point and recompiles when
   they moved. Correctness first; the speed came second.
2. **The recompile is incremental.** `tsconfig.json` sets
   `"incremental": true` with `"tsBuildInfoFile": "dist/.tsbuildinfo"`, so a
   rebuild after a pull reuses the previous type-check.

Measured on the same box as the table above: a cold build is **5.05 s**, the
rebuild after touching a source is **1.57 s** — the same ~3.4× ratio a phone
sees (where a cold build is a minute or two and the rebuild is what you pay
between pulls). `./termcrab` now also prints `built in NNNN ms`, so the wait is
never silent.

## Run it on the phone (38.1)

```bash
termcrab perf            # the fast half: cold start, boot + idle RSS, restart, one mock turn
termcrab perf --full     # also npm install and a first-run compile (~6 s on a dev box)
termcrab perf --json     # the snapshot that was written to state/perf.json
```

It runs `scripts/bench.mjs` — the same measurements the suite's gate runs, not a second
implementation — prints every number next to its ceiling, **exits 1 when one is over**, and writes
`state/perf.json` so the panel can show the last measurement without re-measuring anything.

**Every run is also appended to `state/perf-history.jsonl`** (the newest 60, oldest dropped — no, the
oldest go first, so a year of measurements cannot grow on a phone). With two or more runs the command
prints the movement and the panel shows it:

```
coldStartMs   ↑ 46%      over 4 run(s) (100 ms → 146 ms)
idleRssMb     ↑ 20%      over 4 run(s) (60 MB → 72 MB)
```

`↑` means slower or bigger, which for every metric here is worse; a move under 3% reads as steady, so
jitter is not mistaken for a regression. `TCRAB_PERF_HISTORY` points the series somewhere else, and
`GET /api/perf` carries the same `runs`, `trend` and `lastOverAt` fields the terminal prints.

The snapshot records the machine it came from (`node`, `platform`, `arch`, `cpus`, `totalMemMb`),
because a number from a laptop is not a number from a phone. `skipped` names the ceilings that run did
not measure — an honest "not measured" instead of a zero that looks fast.

## When a ceiling trips

1. `node scripts/bench.mjs` (3 samples) — is it the code or a busy machine? Two
   of the five are wall-clock (`coldStartMs`, `turnMs`) and will move on shared
   CI; RSS and install are steadies.
2. Read the `why` in the table above; it names the route that owns the number:
   - **cold start** → what `src/bin/termcrab.ts` imports at the top; the answer
     is almost always "move a heavy import behind the command that needs it".
   - **idle RSS** → timers and buffers that outlive their work: the schedulers in
     `src/gateway/`, the supervisor, the outbox, the ambient history ring.
   - **turn** → the agent loop in `src/agent/runner.ts`, tool dispatch, or the
     session store growing without a cap.
   - **install** → a real `dependencies` entry appeared. There are none, on
     purpose.
   - **docsMs / docsKb** → which tree `collectDocs()` is embedding
     (`docs/openclaw/data` is excluded by default — 47 MB of raw crawl) and whether the per-doc byte
     cap moved. The page must stay one file a phone can open offline.
   - **restart** → shutdown doing work it should have done at startup.
   - **first run / rebuild** → how much code `tsconfig.json` includes and what
     the launcher rebuilds; the incremental file (`dist/.tsbuildinfo`) is what
     keeps the second number small, so do not delete it by hand and do not
     point it outside `dist/` (it must die with the build).
3. Fix the cause — never edit the ceiling to make a red suite green. The
   ceilings are duplicated in this file *so that* the reason has to be written
   down.

## What the numbers are not

- Not a promise about your phone. A budget measured on a dev box and a phone
  differ by the phone's CPU; `docs/TERMUX.md` is the guide for what a phone
  actually feels. These ceilings catch **regressions on the machine that runs
  the suite**, which is where a regression is cheap to catch.
- Not a benchmark of a provider. The offline `mock` brain keeps the number
  about us: a turn is queue → agent loop → answer. Once a real provider is
  configured, the network dominates and this budget stops describing it.
