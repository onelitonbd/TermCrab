# CLI command coverage — measured, not claimed

Every command the `switch (cmd)` in `src/cli.ts` can dispatch, and whether the test suite
actually runs it through the built binary. The number below is a recording, not an estimate:
`src/cli.ts` appends its command to `$TCRAB_CLI_COVERAGE` on every dispatch, and
`node scripts/cli-coverage.mjs --run` runs the whole suite with that variable set.

**Measured:** 2026-10-04 · **45 of 53** commands executed end-to-end by `npm test` (85%).

## Run by the suite

| Command | In `src/cli.ts` | Times run |
|---|---|---|
| `termcrab help` | line 409 | 16 |
| `termcrab completion` | line 429 | 3 |
| `termcrab version` | line 446 | 2 |
| `termcrab gateway` | line 485 | 3 |
| `termcrab doctor` | line 526 | 3 |
| `termcrab update` | line 562 | 3 |
| `termcrab say` | line 623 | 1 |
| `termcrab agent` | line 697 | 1 |
| `termcrab heartbeat` | line 803 | 2 |
| `termcrab skills` | line 810 | 6 |
| `termcrab cron` | line 1042 | 13 |
| `termcrab approvals` | line 1321 | 3 |
| `termcrab usage` | line 1399 | 4 |
| `termcrab run` | line 1445 | 4 |
| `termcrab wait` | line 1446 | 1 |
| `termcrab stop` | line 1512 | 2 |
| `termcrab runs` | line 1545 | 3 |
| `termcrab presence` | line 1582 | 3 |
| `termcrab events` | line 1626 | 3 |
| `termcrab image` | line 1666 | 1 |
| `termcrab models` | line 1710 | 1 |
| `termcrab auth` | line 1750 | 4 |
| `termcrab orders` | line 1855 | 5 |
| `termcrab logs` | line 1920 | 3 |
| `termcrab backup` | line 2030 | 2 |
| `termcrab restore` | line 2048 | 3 |
| `termcrab service` | line 2116 | 1 |
| `termcrab bootstrap` | line 2139 | 3 |
| `termcrab schema` | line 2171 | 3 |
| `termcrab disk` | line 2193 | 4 |
| `termcrab status` | line 2232 | 3 |
| `termcrab wake` | line 2272 | 1 |
| `termcrab sessions` | line 2310 | 13 |
| `termcrab subagents` | line 2515 | 3 |
| `termcrab agents` | line 2576 | 6 |
| `termcrab docs` | line 2659 | 6 |
| `termcrab security` | line 2688 | 4 |
| `termcrab board` | line 2711 | 2 |
| `termcrab rooms` | line 2726 | 4 |
| `termcrab browser` | line 2806 | 5 |
| `termcrab transcribe` | line 2873 | 1 |
| `termcrab embeddings` | line 2907 | 6 |
| `termcrab context` | line 2967 | 1 |
| `termcrab memory` | line 2987 | 6 |
| `termcrab config` | line 3123 | 5 |

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
