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
| `firstRunMs` — first `./termcrab` from a fresh checkout | 5212 ms | **30000 ms** | the one wait a new user pays, once: the launcher compiles 126 files with `tsc`. A phone is several times slower, which is why the ceiling is 30 s on a box that does it in 5 |
| `rebuildMs` — run again after a `git pull` | 1704 ms | **8000 ms** | "pull, then run" must stay a fraction of a full build, or people stop pulling |

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
