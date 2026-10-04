# Testing — how the suite works, and what it actually covers

One command runs everything:

```bash
npm test                 # builds the test build, then runs every test file (≈70s here)
node scripts/coverage.mjs --run    # the same run, with coverage recorded (≈80s)
node scripts/cli-coverage.mjs --run  # the same run, measuring which CLI commands were dispatched
```

While working on one thing, skip the wait:

```bash
npm run build:test
node --test dist/test/tier3c.test.js            # one file
node --test --test-name-pattern="gateway" dist/test/*.test.js   # one word across every file
```

No test framework is installed. `node:test` ships with Node, the suite is plain TypeScript
compiled by the project's own `tsconfig`, and **the suite is part of the product's promise**:
zero runtime dependencies means zero test-time dependencies too.

## The measurement

<!-- coverage:begin -->
**Measured 2026-10-04:** **86.98%** of the lines in `src/` are executed by the
suite (77.5% of branches, 87.01% of functions), across
**999 test cases in 96 files**. The floor is 80% and it is enforced:
`node scripts/coverage.mjs --check` also verifies that the recording was made on *this* source.

| Lowest coverage in `src/` | lines |
|---|---|
| `mobile/supervisor.js` | 18.06% |
| `providers/types.js` | 33.33% |
| `channels/discord.js` | 41.67% |
| `channels/slack.js` | 47.12% |
| `channels/matrix.js` | 48.21% |
| `bin/termcrab.js` | 50% |
| `channels/signal.js` | 51.54% |
| `mobile/notify.js` | 55.17% |
| `mobile/boot.js` | 55.56% |
| `channels/cli.js` | 58.03% |
| `core/friendly.js` | 58.59% |
| `mobile/onboard.js` | 61.44% |

Those are the files the suite touches least. They are named here on purpose: on a phone, the
cheapest next step is whichever of them your next bug lands in.
<!-- coverage:end -->

Coverage comes from `node --experimental-test-coverage` — Node's own reporter, no
instrumentation of ours. The number is pinned to the source it measured: the snapshot carries a
fingerprint of every file under `src/`, and `node scripts/coverage.mjs --check` fails when the
tree has moved since the recording, so a badge cannot describe last month's code. The suite runs
that check, which means an edit that lowers coverage below the floor is a **failing test**, not a
note in a report nobody reads.

The command-line surface is measured the same way and reported in
[CLI-COVERAGE.md](CLI-COVERAGE.md): `src/cli.ts` appends the command it dispatched to
`$TCRAB_CLI_COVERAGE`, `npm run test:cli` records a whole suite run, and a command that is
neither run nor listed with a reason fails the check.

## What the tests actually do

The rule in this project is *no test, no "done"*, and the tests are written to make the
behaviours a phone user depends on fail loudly when they regress:

- **Real sockets, not mocks.** The gateway tests start a real server on a free port and speak
  HTTP and SSE over a socket with a real token. The CDP tests stand up a real WebSocket server
  (handshake and frame codec included) and make the browser client talk to it.
- **Real child processes.** Everything in `test/tier*.test.ts` drives the built CLI
  (`dist/src/bin/termcrab.js`) the way a person does, asserts stdout/stderr and the exit code,
  and reads the files it wrote. That is also what makes the CLI coverage recording possible.
- **Real files, real time.** Sessions are appended and torn tails healed on disk; cron catch-up
  is checked across a simulated 24-hour sleep; a watcher fires a hook from a real file change.
- **The panel's JavaScript is extracted and executed.** There is no browser in this sandbox, so
  `test/markdown.test.ts` and friends pull the relevant functions out of `ui/index.html` and run
  them in Node against the same inputs the browser would give them — the exact code, not a copy.
- **Fake executables instead of fake results.** Voice runs against real
  `termux-speech-to-text` / `termux-tts-speak` / `whisper-cli` stand-ins placed at the front of
  `PATH`, so the wiring is exercised rather than asserted.

## What is *not* covered, said plainly

- **No browser rendering.** The panel is tested at the level of its functions and its contract
  with the API, not pixels; layout regressions on a real phone are found by opening it.
- **No real Telegram or WhatsApp network.** The adapters are driven against a local HTTP
  stand-in; a live account is the owner's test.
- **No mutation testing, no property-based fuzzing.** The suite proves the paths it names, not
  that *every* path is named.
- **Environment-dependent cases skip, visibly.** On a machine with no Chrome, no TTY and no
  systemd, some cases report `# skip` rather than pretending: the run above names how many, and
  `node scripts/status.mjs --tests` prints the same counts with the census level.

## Reading a failure

A failing case prints the sentence the user would have seen — the tests assert messages, exit
codes and file contents, not just "it threw". If a census row disagrees with the code, `node
scripts/census.mjs` reports `DRIFT` instead of staying green, and `node scripts/status.mjs`
reports a `WORKLOG.md` that was not updated by the last commit. Both of those are tests too:
`test/census-scope.test.ts`, `test/worklog.test.js` and `test/docs-map.test.ts` run inside the
suite that just measured itself.
