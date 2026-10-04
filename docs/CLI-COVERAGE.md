# CLI command coverage — measured, not claimed

Every command the `switch (cmd)` in `src/cli.ts` can dispatch, and whether the test suite
actually runs it through the built binary. The number below is a recording, not an estimate:
`src/cli.ts` appends its command to `$TCRAB_CLI_COVERAGE` on every dispatch, and
`node scripts/cli-coverage.mjs --run` runs the whole suite with that variable set.

**Measured:** 2026-10-04 · **44 of 52** commands executed end-to-end by `npm test` (85%).

## Run by the suite

| Command | In `src/cli.ts` | Times run |
|---|---|---|
| `termcrab help` | line 407 | 15 |
| `termcrab completion` | line 427 | 3 |
| `termcrab version` | line 444 | 2 |
| `termcrab gateway` | line 483 | 2 |
| `termcrab doctor` | line 524 | 3 |
| `termcrab update` | line 560 | 3 |
| `termcrab say` | line 621 | 1 |
| `termcrab agent` | line 695 | 1 |
| `termcrab heartbeat` | line 801 | 2 |
| `termcrab skills` | line 808 | 6 |
| `termcrab cron` | line 1040 | 13 |
| `termcrab approvals` | line 1319 | 3 |
| `termcrab usage` | line 1397 | 4 |
| `termcrab run` | line 1443 | 4 |
| `termcrab wait` | line 1444 | 1 |
| `termcrab stop` | line 1510 | 2 |
| `termcrab runs` | line 1543 | 3 |
| `termcrab presence` | line 1580 | 3 |
| `termcrab events` | line 1624 | 3 |
| `termcrab image` | line 1664 | 1 |
| `termcrab models` | line 1708 | 1 |
| `termcrab auth` | line 1748 | 4 |
| `termcrab orders` | line 1853 | 5 |
| `termcrab logs` | line 1918 | 3 |
| `termcrab backup` | line 2028 | 2 |
| `termcrab restore` | line 2046 | 3 |
| `termcrab service` | line 2114 | 1 |
| `termcrab bootstrap` | line 2137 | 3 |
| `termcrab schema` | line 2169 | 3 |
| `termcrab disk` | line 2191 | 4 |
| `termcrab status` | line 2230 | 3 |
| `termcrab wake` | line 2270 | 1 |
| `termcrab sessions` | line 2308 | 13 |
| `termcrab subagents` | line 2513 | 3 |
| `termcrab agents` | line 2574 | 6 |
| `termcrab security` | line 2657 | 4 |
| `termcrab board` | line 2680 | 2 |
| `termcrab rooms` | line 2695 | 4 |
| `termcrab browser` | line 2775 | 5 |
| `termcrab transcribe` | line 2842 | 1 |
| `termcrab embeddings` | line 2876 | 4 |
| `termcrab context` | line 2930 | 1 |
| `termcrab memory` | line 2950 | 6 |
| `termcrab config` | line 3086 | 2 |

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
