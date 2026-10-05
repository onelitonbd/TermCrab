# The three surfaces — web, Telegram, terminal

You named this as the confusion at the centre of the project: attention goes to Telegram and the web panel, and the terminal gets none. The catalogue makes it measurable, and you were right.

**Their pages:** `/web/control-ui` (9) · `/web/tui` · `/cli/tui` · `/cli` (102 pages!) · `/nodes/talk` · [`../sections/10-*.md`](../sections/) and [`../sections/09-reference.md`](../sections/09-reference.md).

## 1. The asymmetry, in one table

| Surface | TermCrab commands / views | OpenClaw |
|---|---:|---:|
| **CLI** | 23 commands, one `switch` (`src/cli.ts:148-938`), no per-command help, `--json` on **1** command | 101 documented CLI pages, `--json` contract with a documented failure envelope everywhere, shell completion |
| **Web** | 9 views in one 6,779-line `ui/index.html`, no build step | React + Vite dashboard, rebuilt in 2.0, sessions/nodes/config/canvas |
| **Telegram** | **4 slash commands**: `/new /agents /status /heartbeat` (`server.ts:498-515`) | 30+ commands across TUI/webchat, channel-aware rendering, typing indicators, media |
| **Terminal TUI** | **does not exist** — `grep -rn "setRawMode\|1049" src/` returns nothing | full-screen TUI, 10 keyboard shortcuts, 30+ slash commands, `--local` and remote-attached modes |

So the terminal has the **most commands and the least interaction**: `termcrab agent` streams to stdout and exits. There is nothing to keep open. That is the concrete meaning of "টার্মিনালের উপরে আমাদের কোনো ফোকাস যাচ্ছে না" — the surface is not neglected, it is absent as an interactive product.

## 2. What each surface is actually for (this is the confusion to kill)

The three surfaces exist because you are three different people at three different moments. Write this down and stop trying to bring them to feature parity:

| Surface | The moment | What it must do well | What it should never be |
|---|---|---|---|
| **Telegram** | away from the phone's terminal — walking, working, in bed | receive a task in natural language, show progress, deliver the result and a notification | a command console. 4 commands is fine; the *conversation* is the interface. |
| **Web panel** | sitting at the phone, wanting to see state | chat history, memory browsing, provider/model/skill control, logs, config | a real-time debugger |
| **Terminal / TUI** | at the machine, doing dev work beside the agent | live streaming, tool cards, abort, pickers, `--json` for scripts | the only place some capability exists (see §3) |

The confusion disappears when the rule is written down: **capabilities live in the API and channels; each surface is a lens, not a home.** Today the rule is violated in the worst direction: canvas, traces, portal, approvals, provider/model pickers, live voice, auto-update-apply and all 5 slash commands exist **only** as `/api/*` routes with no CLI counterpart. That is why the terminal feels dead — because functionally, it is.

## 3. The terminal work, ordered by cost per win

1. **Per-command `--help` (2d).** Today `termcrab gateway --help` prints `Unknown option '--help'` and suggests `doctor`. That is a bug in 21 of 22 commands and the cheapest credibility win in the repo.
2. **`--json` everywhere + the documented failure envelope (3d).** Their contract is `{"ok":false,"error":{"type":"cli_error","message":…}}`. Copy the shape. This also unlocks scripting the census and the doctor from CI.
3. **Colour/TTY discipline (1d).** `NO_COLOR`, TTY-only ANSI, `--no-color`. Today ANSI is unconditional (`src/core/logger.ts:11-24`), so piping produces garbage.
4. **The TUI (15d).** Their spec is public and catalogued: full-screen, header, chat log with tool cards, status line (agent/session/model/goal/tokens), input editor with autocomplete, `Esc` to abort, `Ctrl+P/G/L` pickers, `Shift+Enter` multiline, `--local` embedded mode and `gateway-attached` remote mode. TermCrab already has the hard half (streaming deltas + an event bus); the TUI is a renderer over `/api/events`, not a second agent.
5. **Then** web-panel modularisation (10d) — split `ui/index.html` so UI regressions stop being invisible until runtime.

## 4. Telegram — small and important

Four commands is the narrowest surface in the product, and Telegram is the surface you use most. The minimum set that stops it feeling like a demo:

`/help` (list) · `/new` · `/model` · `/status` · `/agents` · `/as <name>` · `/stop` (abort the running turn) · `/queue <mode>`.

Each of these already exists behind `/api/slash` (5 commands) or in the CLI — the work is routing, not building. Budget 4 days, and make `/stop` real once the queue can be drained (§[`02-agent-loop-and-queues.md`](02-agent-loop-and-queues.md)). Honest copy beats feature count: the README currently implies more Telegram surface than exists.

## 5. Done tests

- `termcrab <any command> --help` prints that command's flags and exits 0.
- Every command accepts `--json` and prints a single JSON object on stdout, warnings on stderr.
- `termcrab tui` opens a full-screen UI that streams a reply, shows tool cards, aborts with `Esc`, and works both locally and attached to a running gateway.
- Telegram `/help` lists exactly the commands that work; `/stop` aborts an in-flight turn.
