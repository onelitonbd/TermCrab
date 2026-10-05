# CLI command coverage — measured, not claimed

Every command the `switch (cmd)` in `src/cli.ts` can dispatch, and whether the test suite
actually runs it through the built binary. The number below is a recording, not an estimate:
`src/cli.ts` appends its command to `$TCRAB_CLI_COVERAGE` on every dispatch, and
`node scripts/cli-coverage.mjs --run` runs the whole suite with that variable set.

**Measured:** 2026-10-05 · **54 of 62** commands executed end-to-end by `npm test` (87%).

## Run by the suite

| Command | In `src/cli.ts` | Times run |
|---|---|---|
| `termcrab help` | line 410 | 19 |
| `termcrab completion` | line 430 | 3 |
| `termcrab version` | line 447 | 15 |
| `termcrab owner` | line 453 | 2 |
| `termcrab gateway` | line 496 | 14 |
| `termcrab doctor` | line 537 | 9 |
| `termcrab update` | line 573 | 3 |
| `termcrab say` | line 634 | 1 |
| `termcrab agent` | line 708 | 1 |
| `termcrab heartbeat` | line 814 | 2 |
| `termcrab skills` | line 821 | 6 |
| `termcrab cron` | line 1053 | 13 |
| `termcrab approvals` | line 1332 | 3 |
| `termcrab usage` | line 1410 | 4 |
| `termcrab run` | line 1456 | 4 |
| `termcrab wait` | line 1457 | 1 |
| `termcrab stop` | line 1523 | 2 |
| `termcrab runs` | line 1556 | 3 |
| `termcrab presence` | line 1593 | 3 |
| `termcrab events` | line 1637 | 3 |
| `termcrab watch` | line 1677 | 7 |
| `termcrab image` | line 1726 | 1 |
| `termcrab models` | line 1770 | 1 |
| `termcrab auth` | line 1810 | 4 |
| `termcrab orders` | line 1915 | 5 |
| `termcrab logs` | line 1980 | 3 |
| `termcrab backup` | line 2090 | 2 |
| `termcrab restore` | line 2108 | 3 |
| `termcrab service` | line 2176 | 1 |
| `termcrab bootstrap` | line 2199 | 3 |
| `termcrab schema` | line 2231 | 3 |
| `termcrab perf` | line 2253 | 18 |
| `termcrab suite-time` | line 2351 | 2 |
| `termcrab work` | line 2373 | 3 |
| `termcrab disk` | line 2421 | 4 |
| `termcrab status` | line 2460 | 3 |
| `termcrab wake` | line 2500 | 1 |
| `termcrab sessions` | line 2538 | 13 |
| `termcrab subagents` | line 2743 | 3 |
| `termcrab agents` | line 2804 | 6 |
| `termcrab docs` | line 2887 | 17 |
| `termcrab security` | line 2953 | 4 |
| `termcrab board` | line 2976 | 2 |
| `termcrab rooms` | line 2991 | 4 |
| `termcrab browser` | line 3071 | 5 |
| `termcrab transcribe` | line 3138 | 1 |
| `termcrab embeddings` | line 3172 | 6 |
| `termcrab context` | line 3232 | 1 |
| `termcrab memory` | line 3252 | 9 |
| `termcrab tools` | line 3394 | 4 |
| `termcrab canvas` | line 3449 | 5 |
| `termcrab queue` | line 3506 | 5 |
| `termcrab steer` | line 3538 | 1 |
| `termcrab config` | line 3582 | 4 |

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
