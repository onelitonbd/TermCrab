# CLI command coverage — measured, not claimed

Every command the `switch (cmd)` in `src/cli.ts` can dispatch, and whether the test suite
actually runs it through the built binary. The number below is a recording, not an estimate:
`src/cli.ts` appends its command to `$TCRAB_CLI_COVERAGE` on every dispatch, and
`node scripts/cli-coverage.mjs --run` runs the whole suite with that variable set.

**Measured:** 2026-10-04 · **49 of 57** commands executed end-to-end by `npm test` (86%).

## Run by the suite

| Command | In `src/cli.ts` | Times run |
|---|---|---|
| `termcrab help` | line 409 | 19 |
| `termcrab completion` | line 429 | 3 |
| `termcrab version` | line 446 | 15 |
| `termcrab owner` | line 452 | 2 |
| `termcrab gateway` | line 495 | 15 |
| `termcrab doctor` | line 536 | 9 |
| `termcrab update` | line 572 | 3 |
| `termcrab say` | line 633 | 1 |
| `termcrab agent` | line 707 | 1 |
| `termcrab heartbeat` | line 813 | 2 |
| `termcrab skills` | line 820 | 6 |
| `termcrab cron` | line 1052 | 13 |
| `termcrab approvals` | line 1331 | 3 |
| `termcrab usage` | line 1409 | 4 |
| `termcrab run` | line 1455 | 4 |
| `termcrab wait` | line 1456 | 1 |
| `termcrab stop` | line 1522 | 2 |
| `termcrab runs` | line 1555 | 3 |
| `termcrab presence` | line 1592 | 3 |
| `termcrab events` | line 1636 | 3 |
| `termcrab image` | line 1676 | 1 |
| `termcrab models` | line 1720 | 1 |
| `termcrab auth` | line 1760 | 4 |
| `termcrab orders` | line 1865 | 5 |
| `termcrab logs` | line 1930 | 3 |
| `termcrab backup` | line 2040 | 2 |
| `termcrab restore` | line 2058 | 3 |
| `termcrab service` | line 2126 | 1 |
| `termcrab bootstrap` | line 2149 | 3 |
| `termcrab schema` | line 2181 | 3 |
| `termcrab perf` | line 2203 | 18 |
| `termcrab suite-time` | line 2301 | 2 |
| `termcrab work` | line 2323 | 3 |
| `termcrab disk` | line 2371 | 4 |
| `termcrab status` | line 2410 | 3 |
| `termcrab wake` | line 2450 | 1 |
| `termcrab sessions` | line 2488 | 13 |
| `termcrab subagents` | line 2693 | 3 |
| `termcrab agents` | line 2754 | 6 |
| `termcrab docs` | line 2837 | 17 |
| `termcrab security` | line 2903 | 4 |
| `termcrab board` | line 2926 | 2 |
| `termcrab rooms` | line 2941 | 4 |
| `termcrab browser` | line 3021 | 5 |
| `termcrab transcribe` | line 3088 | 1 |
| `termcrab embeddings` | line 3122 | 6 |
| `termcrab context` | line 3182 | 1 |
| `termcrab memory` | line 3202 | 6 |
| `termcrab config` | line 3338 | 7 |

## Not run by the suite — and what covers it instead

| Command | Why not | Covered instead by |
|---|---|---|
| `termcrab onboard` | an interactive question-and-answer wizard on stdin; the prompts are asserted directly | `test/tier.test.ts` |
| `termcrab supervisor` | supervise-and-restart is a loop with no exit condition — spawning it would hang the suite | `test/tier2s.test.ts` |
| `termcrab tui` | needs a real TTY (alternate screen + raw keys); the suite drives it through a fake TTY instead | `test/tier2r.test.ts` |
| `termcrab import` | reads a Telegram desktop export; the suite builds the same files and imports them through the library | `test/import.test.ts` |
| `termcrab pair` | the pairing code is printed for a device that has to answer — the HTTP flow is tested live instead | `test/tier2i.test.ts` |
| `termcrab devices` | same flow: the paired-device list and revocation are asserted over a real socket | `test/tier2i.test.ts` |
| `termcrab dream` | a long background consolidation pass; the same store is exercised by the library tests | `test/dream.test.ts` |
| `termcrab boot` | termscrab boot writes the Termux:Boot script; the machine it runs on has no Termux prefix | `test/tier2w.test.ts` |

## What this measures, and what it does not

- It measures **the CLI surface**: whether the command was dispatched at all by a test that
  spawns the real binary. It says nothing about how much of the command ran.
- Library-level coverage is measured separately and reported in `docs/TESTING.md`
  (`npm run test:coverage`).
- A command that is added to `src/cli.ts` and neither run nor listed in `scripts/cli-coverage.mjs`
  fails `node scripts/cli-coverage.mjs --check`, and so does a listing whose command is now run —
  the list may not rot in either direction.
