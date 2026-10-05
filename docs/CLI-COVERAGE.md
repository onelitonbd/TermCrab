# CLI command coverage — measured, not claimed

Every command the `switch (cmd)` in `src/cli.ts` can dispatch, and whether the test suite
actually runs it through the built binary. The number below is a recording, not an estimate:
`src/cli.ts` appends its command to `$TCRAB_CLI_COVERAGE` on every dispatch, and
`node scripts/cli-coverage.mjs --run` runs the whole suite with that variable set.

**Measured:** 2026-10-05 · **56 of 64** commands executed end-to-end by `npm test` (88%).

## Run by the suite

| Command | In `src/cli.ts` | Times run |
|---|---|---|
| `termcrab help` | line 412 | 19 |
| `termcrab completion` | line 432 | 3 |
| `termcrab version` | line 449 | 15 |
| `termcrab owner` | line 455 | 2 |
| `termcrab gateway` | line 498 | 14 |
| `termcrab doctor` | line 539 | 9 |
| `termcrab update` | line 575 | 3 |
| `termcrab say` | line 636 | 1 |
| `termcrab agent` | line 710 | 1 |
| `termcrab heartbeat` | line 816 | 2 |
| `termcrab skills` | line 823 | 6 |
| `termcrab cron` | line 1055 | 13 |
| `termcrab approvals` | line 1334 | 3 |
| `termcrab usage` | line 1412 | 4 |
| `termcrab run` | line 1458 | 4 |
| `termcrab wait` | line 1459 | 1 |
| `termcrab stop` | line 1525 | 2 |
| `termcrab runs` | line 1558 | 3 |
| `termcrab presence` | line 1595 | 3 |
| `termcrab events` | line 1639 | 3 |
| `termcrab watch` | line 1679 | 7 |
| `termcrab inbox` | line 1728 | 2 |
| `termcrab extract` | line 1759 | 1 |
| `termcrab embeddings` | line 1784 | 6 |
| `termcrab image` | line 1812 | 1 |
| `termcrab models` | line 1856 | 1 |
| `termcrab auth` | line 1896 | 4 |
| `termcrab orders` | line 2001 | 5 |
| `termcrab logs` | line 2066 | 3 |
| `termcrab backup` | line 2176 | 2 |
| `termcrab restore` | line 2194 | 3 |
| `termcrab service` | line 2262 | 1 |
| `termcrab bootstrap` | line 2285 | 3 |
| `termcrab schema` | line 2317 | 3 |
| `termcrab perf` | line 2339 | 18 |
| `termcrab suite-time` | line 2437 | 2 |
| `termcrab work` | line 2459 | 3 |
| `termcrab disk` | line 2507 | 4 |
| `termcrab status` | line 2546 | 3 |
| `termcrab wake` | line 2586 | 1 |
| `termcrab sessions` | line 2624 | 13 |
| `termcrab subagents` | line 2829 | 3 |
| `termcrab agents` | line 2890 | 6 |
| `termcrab docs` | line 2973 | 17 |
| `termcrab security` | line 3039 | 4 |
| `termcrab board` | line 3062 | 2 |
| `termcrab rooms` | line 3077 | 4 |
| `termcrab browser` | line 3157 | 5 |
| `termcrab transcribe` | line 3224 | 1 |
| `termcrab context` | line 3318 | 1 |
| `termcrab memory` | line 3338 | 9 |
| `termcrab tools` | line 3480 | 4 |
| `termcrab canvas` | line 3535 | 5 |
| `termcrab queue` | line 3592 | 5 |
| `termcrab steer` | line 3624 | 1 |
| `termcrab config` | line 3668 | 4 |

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
