# The owner's two minutes — everything only you can do

Everything else in this repository runs and proves itself: 1008 test cases, a coverage floor, a
performance budget with an alarm, an offline docs page that says how fresh it is. This page is the
short list of things **only the person holding the phone can do** — each one a copy-paste command, what
it should print, and the evidence it leaves behind. Two minutes, in order, whenever you feel like it.

Everything here is optional. Nothing below is required for TermCrab to work; each item turns a claim
somebody could doubt into a fact with a timestamp.

## 1. Start the CI workflow (once, ~20 seconds)

GitHub refuses a workflow file from the integration that built this repository, so the one push that
turns CI on is yours. `ci/ci.yml` is versioned, every line is asserted by the suite, and
`npm run ci:install` copies it byte for byte.

```bash
npm run ci:install
git add .github/workflows/ci.yml
git commit -m "ci: install the workflow"
git push
```

**What it should do:** the Actions tab runs the suite on Node 20, 22 and 24 within a few minutes.
**What it leaves:** a green run whose URL is the evidence for the last open census row — *CI matrix* —
which is `PARTIAL` today and becomes `WORKING` the moment that run exists. Nothing else in this
project is waiting on you except this.

## 2. Let the bot answer a real Telegram message (once, ~1 minute)

The suite's Telegram tests talk to a fake Bot API on purpose; `npm run smoke:telegram` is the half that
can only be true on your phone. You need a token from [@BotFather](https://t.me/BotFather) — `/newbot`,
pick a name, copy the token.

```bash
TCRAB_TELEGRAM_TOKEN=123:ABC npm run smoke:telegram              # send + read your reply back
TCRAB_TELEGRAM_TOKEN=123:ABC npm run smoke:telegram -- --record  # …and write it down
```

**What it should print:** `telegram smoke: bot is @your_bot`, then `sent message …`, then, after you
write anything back in Telegram, `read back: "…" from you` and **`telegram smoke: ok`**. With no chat
id yet it prints the ids it can see, which is how you find your own number the first time.
**What it leaves:** with `--record`, one line in `docs/openclaw/data/telegram-runs.jsonl` — what was
sent, what came back, how long it took, and a **fingerprint** of the token (never the token), so the
file is safe to commit. The panel's Work page then shows that line with a timestamp; commit the file
and the tracker can point at it.

## 3. Answer one message from the phone (once, ~1 minute)

The whole point of the project, and the one thing no test can stand in for: the agent running on the
device, answering through your provider.

```bash
./termcrab onboard          # the wizard: provider, key, model (builds on first run — ~1–2 min on a phone)
./termcrab doctor           # everything it checks, with a fix line for each problem
./termcrab                  # the terminal UI: type a message, watch it answer
```

**What it should do:** `doctor` reports no failures, and the first message comes back with an answer
rather than an error. `./termcrab status` and `./termcrab perf` then describe the device you are on
(the second one is the performance budget, exit 1 if anything is over).
**What it leaves:** a real turn in the session store — visible in `./termcrab board` and on the panel.

## 4. Open the panel from the phone's browser (optional, ~5 minutes)

The gateway binds to loopback by default and **refuses to start on a non-loopback address without a
token** — that rule is tested, not a suggestion.

```bash
./termcrab gateway --host 0.0.0.0 --port 7788     # prints the token once
# then open http://<phone-ip>:7788/?token=<token> in the phone's browser,
# or put it behind Tailscale: docs/REMOTE.md
```

**What it should show:** the chat, and on the **Work** page the three things this repository keeps
tracking — the tracker's own freshness, the docs page's release and age, the last Telegram run, and the
performance budget's last measurement.

## What is *not* on this list

- **Nothing that can be automated is here.** If it can be asserted by a test, a probe or a census row,
  it is asserted there — this page is only for tokens, pushes and physical devices.
- **No secrets in the repository.** Every command above passes a token as an environment variable for
  one process; `./termcrab auth audit` finds key-shaped strings if one ever lands somewhere it should
  not.
- **No promise that the numbers are a phone's.** `docs/PERFORMANCE.md` says plainly what the budget
  measures and what it does not.

_Kept honest by `test/tier3i.test.ts` (38.5): every `termcrab <command>` named on this page is checked
to exist in the CLI, so this page cannot rot into instructions that no longer run._
