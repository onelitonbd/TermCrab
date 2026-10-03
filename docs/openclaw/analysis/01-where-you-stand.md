# Where TermCrab actually stands

**Date:** 2026-10-03 · **Method:** every claim below comes from the census probes (`node scripts/census.mjs`) or from OpenClaw's own pages, catalogued in [`../sections/`](../sections/).

---

## 1. The comparison you are actually making

You said the systems are "আকাশ-পাতাল" — worlds apart — and that you cannot yet reach their level. Both statements are true, and both are measuring the wrong thing.

| | OpenClaw | TermCrab |
|---|---|---|
| Age | 11 months (created 2025-11) | ~2 months |
| People | ~2,000 contributors; 933 shipped 2.0 | 1 + AI agents |
| Code | ~421 MB of TypeScript; 70 core modules + 23 packages + 164 extensions | 15k lines across 71 files + one 6.8k-line UI |
| Documented pages | 1,335 | ~20 documents |
| Channels | 30+ | 2 real (Telegram, WebChat) + 5 optional |
| Releases | CalVer, weekly, validation programme | v0.36.0, 21 tags |
| Money | Foundation (501c3), corporate donors | your laptop |

If the goal were "match this", the honest answer would be: **you cannot, and you should not try.** What you *can* do is own the one thing their structure cannot deliver — a personal agent that runs natively on a phone someone already owns, with no proot, no shims, no daemon babysitting.

Their docs never claim Android support. Not one of the 1,335 pages is an Android install path. Community guides exist precisely because it does not work: proot Ubuntu (~3GB, +800 ms tool latency), a hand-edited bionic shim to stop Error 13, tmux to stop it dying. TermCrab's mobile layer is 79% complete and 13 of its capabilities are *better than theirs* — that layer is the whole bet, and it is already real.

## 2. The number that matters is not 41%

The census says **41%** against a feature list written by 2,000 people for desktops. That number will depress you and it should not, because it treats a missing native macOS app and a missing auth check as equal.

The numbers that should drive the next month:

| Number | Value | Why it matters |
|---|---:|---|
| **BROKEN rows** | **10** | code that exists and nothing calls. These are what make you feel like you are further along than you are. |
| **core-lane effort** | **~43 days** | the work that turns "promising" into "trustworthy". |
| **BETTER rows** | 13 | the moat already exists; protect it. |
| **OpenClaw Android pages** | **0** | the strategic hole you are filling. |

## 3. What "আমি কোন লেভেলে আছি" translates to

**You are at the end of the prototype stage, and you are one focused month from the end of the "credible" stage.**

Concretely, today:

- ✅ An agent loop that streams, calls tools, fails over between providers, and has a repetition guard.
- ✅ A real gateway with 77 HTTP routes, SSE events, a canvas, MCP, subagents, cron, heartbeat, dreaming, a voice wake loop and 15 phone tools.
- ✅ A mobile layer that is genuinely better than the incumbent (guard, TMPDIR, supervisor, boot, battery-aware scheduling, offline outbox, doctor).
- ⛔ But: an open API (auth written, never called), an open webhook route, approvals that never fire, a queue that never drains, compaction that deletes history, memory that cannot see its own newest facts, and no TUI at all.

That is the honest picture: **a great skeleton with five load-bearing wires unplugged.** Not immature — unfinished in specific, enumerated, fixable ways. That is a much better position than "immature", and it is the first time the list of what is wrong has had a bottom.

## 4. The trap this project is in

Two months of fast building produced breadth (54 tools, 9 web views, 23 CLI commands, 7 channel adapters, 77 routes) and left the wiring incomplete. The instinct now is to add the next feature — a TUI, channels, plugins. Resist it for one month.

Every additional feature added before the core lane is done increases the surface that has to be re-checked later, and each one deepens the feeling you described — that "এদিকে টার্মিনালের উপরে কোনো ফোকাস যাচ্ছে না", that things are slipping. The tracker exists so that this is not a feeling any more: it is a list of 147 rows, of which 10 are broken and 12 are core.

## 5. What to do Monday

1. Run `node scripts/census.mjs`. Look at three numbers: capability score, core days, drift.
2. Open [ROADMAP.md](../ROADMAP.md) §2.1 and do task #1: enforce `checkToken` at `src/gateway/server.ts:712`. One day, one line, and it changes who can drive your agent.
3. When it is done, run `node scripts/census.mjs --write` and watch the row flip from ⛔ BROKEN to ✅ WORKING in [TRACKER.md](../TRACKER.md).

That loop — one row, its done test, then the tracker — is the answer to "আমি ট্র্যাক রাখতে পারতেছি না". The tracking is no longer in your head; the head is only for judgment.
