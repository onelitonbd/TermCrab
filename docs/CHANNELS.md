# Channels — what each one can actually do

**Scope (user decision, 2026-10-03): exactly three surfaces are supported — Telegram, the web panel and the terminal (CLI/REPL).** The census marks the other adapters *out of scope*: they stay in the tree, tested and working if you configure them, but no further work goes into them and they are not part of the score. That decision has a section of its own below.

Seven adapters ship in the box. Exactly one of them is load-bearing on a phone:
**Telegram**. The rest are honest, tested, and *bring your own client* — none of
their SDKs is bundled, because a phone install must stay dependency-free.

## The three supported surfaces

- **Telegram** — the phone-in-your-pocket surface: text, files in and out, voice notes, groups when addressed, `/status /usage /sessions /memory /help`. Documented in this file.
- **Web panel** — the control UI the gateway serves (`ui/index.html`): chat, sessions, memory, the work tracker, live status (including presence), approvals. Documented in `docs/API.md` and by itself.
- **Terminal** — `termcrab` in a terminal: one-shot commands, `--json` for scripts, `termcrab agent` REPL, approvals answerable with `y/N`. Documented in `docs/CLI.md`.

Everything the agent does is reachable from all three; the census keeps a check
for each of them so a missing surface shows up as a row, not as a surprise.

## Out of scope (kept, not built on)

WhatsApp, Discord, Slack, Signal, SMS and Matrix are **not supported paths**. The
code stays because removing working, tested adapters would cost real capability
for no gain; they are off unless configured, none of their SDKs is bundled, and
`scripts/census.mjs` excludes them (and the native apps, and the channel-plugin
interface) from the capability score with the reason written next to each row.


## The table

| Channel | Inbound text | Files in | Files out | Typing | Groups | Needs |
|---|---|---|---|---|---|---|
| **Telegram** | ✅ full | ✅ photos, documents, voice → `workspace/inbox/`, then read (`extract.ts`) / transcribed / described | ✅ `send_file` (≤ 20 MB) | ✅ `typing…` while it works | ✅ mention-only by default | a bot token |
| WhatsApp | ✅ allowlisted JIDs | ➖ text only | ➖ text only | ➖ | ✅ mention-only | `baileys` + a phone paired |
| Discord | ✅ allowlisted guilds/users | ➖ | ➖ | ➖ | ✅ channels/users allowlist | `discord.js` |
| Slack | ✅ allowlisted channels/users | ➖ | ➖ | ➖ | ✅ | `@slack/bolt` |
| Signal | ✅ allowlisted numbers | ➖ | ➖ | ➖ | ✅ | `signal-cli` running |
| SMS (Twilio) | ✅ allowlisted numbers | ➖ (MMS not handled) | ➖ | ➖ | n/a | a Twilio account + webhook |
| Matrix | ✅ allowlisted rooms | ➖ | ➖ | ➖ | ✅ | `matrix-js-sdk` |

"➖" means *not implemented*, not broken: the adapter routes and replies, it just
does not carry media. Every one of those cells is covered by
`test/adapters.test.ts` and `test/tier2d.test.ts`.

## Telegram in detail (the one to rely on)

- **Inbound files.** A photo, a document or a voice note is downloaded through
  `getFile`, checked (size ≤ `channels.telegram.maxFileMb`, default **20 MB**;
  extension on the allowed list — pictures, PDFs, text, Office files `.docx
  .xlsx .pptx`, audio and archives) and written to
  `~/.termcrab/workspace/inbox/<timestamp>-<name>` — the agent is told the path
  and the caption, e.g. `[photo saved to inbox/2026-10-03T10-00-00-photo-….jpg] what is this?`
- **Executables are refused, by name.** `.apk .dex .exe .bin .so .sh .bat .cmd
  .msi .jar .dmg .iso` never reach the disk; the reply says why in one sentence.
  The rule lives in `src/channels/media.ts` so the channel, the tool and this
  page cannot disagree.
- **Outbound files.** The agent calls `send_file` (`path`, optional `caption`,
  optional `channel`/`address`). With no address it goes to the most recent
  conversation on that channel. A refused or failed send keeps the file in the
  offline outbox, so a flaky network delays it instead of losing it.
- **Groups.** By default the bot answers only when addressed — `@yourbot …` or a
  reply to one of its messages — and the mention is stripped before the agent
  sees the text. Set `channels.telegram.groupPolicy = "all"` to answer
  everything (not recommended in busy rooms). `allowedUserIds` still applies.
- **Commands in the chat:** `/new` (fresh session), `/status`, `/usage` (today's
  tokens and cost, the same numbers `termcrab usage --json` reports),
  `/sessions`, `/memory`, `/agents`, `/providers`, `/heartbeat`, `/help`.

## What happens to a file that arrives (16.1–16.3)

Saving a file is not an answer, so the intake reads what it can and tells the
agent the truth about the rest:

- **Documents are read.** PDF, DOCX, PPTX, XLSX and every text format have their
  text pulled out by our own readers (`src/channels/extract.ts`, zero
  dependencies: PDF content streams + FlateDecode, Office files through a small
  ZIP reader on `node:zlib`). The text is capped (20 000 characters) and a
  truncation note is appended, so a 400-page PDF cannot blow up the context.
  A **scanned PDF** has no text layer: the agent is told that, plus the fact that
  an OCR app on the phone can read it — no empty answer pretending the document
  was blank. A `.zip` is saved but not opened, and says so.
- **Pictures are described** by the configured model, when it can see them
  (`gpt-4o`, `gpt-4.1`, `gpt-5`, `claude-3/4`, `gemini`, `qwen…-vl`, `llava`,
  `pixtral`, …). The picture goes on the wire as a real image part — see
  `src/channels/vision.ts`. With a text-only model the agent is told *"I saved it
  but cannot see it"* and the exact command to fix it. Pictures above 4 MB are
  refused before they cost a call. The one-shot description is what the agent
  reads; the base64 picture never enters the transcript.
- **Voice notes are transcribed** through whisper.cpp when it is installed
  (`termcrab transcribe` uses the same engine): the transcript *is* the message
  the agent answers. Without the engine the agent is told what to install; a
  recording above 5 MB is not chewed up on the phone and says so.
- **Turn any of it off** with `channels.telegram.readDocuments`,
  `channels.telegram.transcribeVoice`, `channels.telegram.describePhotos` (all
  default `true`).
- **The inbox is swept, your workspace is not.** `workspace/inbox/` is its own
  area in `termcrab disk`, trimmed by the ordinary retention rule
  (`storage.keepDays`, default 30 days) — while everything you wrote into
  `workspace/` is never a trim candidate.
- **The agent can look again (17.1–17.4).** Every arrival is written to an index
  (`.inbox-index.json`, a few KB, protected from the budget) and the text learned
  about it is saved next to the file as `<name>.text.md`. That gives the agent:

  | what | how |
  |---|---|
  | `inbox_list` tool | what was sent, newest first: name, kind, size, age, whether its text was saved |
  | `inbox_read` tool | the text of one arrival — from the saved note, or by reading the file again if there is none |
  | `/inbox` command | the same list in the chat; `/inbox <name>` prints that file's text (trimmed to 3000 characters) |

  Two promises hold this together. **The second read never parses the file
  again** — the sidecar answers even after the file itself is gone. And **a
  trimmed arrival explains itself**: the index keeps the row, the list marks it
  `GONE — trimmed by the disk budget`, and `inbox_read` says the file was
  trimmed instead of failing on a missing path. Names from a chat are never
  paths: separators and `..` are refused before anything is opened.

## Your own thread, and other people's

The owner's own conversations are one thread (28.1): the panel, the terminal
and a DM from an id in `channels.telegram.allowedUserIds` all use the session
`main`, so asking the phone and then opening the laptop continues the same
conversation. It rolls over on the first turn of a new day — the old transcript
is archived, never deleted (`termcrab sessions search` still finds it) and the
fresh thread opens with a note saying so. Turn it off with
`agent.rollingSession = false` or rename it with `agent.mainSession`.

Everything that is *not* the owner keeps its own key: a group chat, a stranger
who somehow got past the allow-list, a cron job, the heartbeat, a subagent.
With `channels.telegram.scoping = "user"` each person gets a thread of their
own instead of one per room — their DM and their mentions in a group follow
them between chats. Facts remember who said them (28.3): the run records the
person, and memory entries carry that as their source, so "who told you that"
has an answer.

## Ambient history: what was said while you were not addressed (34.3)

In a group the bot answers only when it is mentioned — and until 34.3 that also
meant it *forgot* everything else. A room where four people plan a meeting and
only mention the bot at the end left the agent with one sentence and no context.

Now every message a channel adapter receives in a room is written down, whether
or not it was addressed to the bot:

- `state/rooms/<channel>-<room>.jsonl` — one JSON line per message: time, who,
  the text, and whether it ran a turn.
- **Bounded twice**: the last 200 messages, capped at 64 KB per room;
  `state/rooms` is trimmed oldest-first, so a busy group cannot fill the phone.
- **Local and plain**: no database, and nothing is sent anywhere. It is a file
  you can read, grep or delete, like the rest of the home.
- **A torn line is skipped**, not fatal.

The agent reads it with the `room_history` tool — with no arguments it means
*this* room, so "what did I miss?" is a question it can actually answer — and a
person reads it in the chat with `/history` (`/history 20` for more). From a
terminal:

```bash
termcrab rooms                      # every room with history, and how much is unseen
termcrab rooms show telegram:-100123
termcrab rooms clear telegram:-100123   # or: rooms clear --all
```

**The limit, stated plainly:** this is what the bot *saw*, not what was said.
The Telegram Bot API cannot fetch messages the bot never received, so a bot
with privacy mode on (the default for group bots) will see only the messages
that mention it — there is no way around that from inside the Bot API. With
privacy mode off, the room log holds the conversation, which is exactly the
case this was built for. Per-room routing rules (which of several agents answers
in which room) stay out of scope: the three surfaces are Telegram, the panel and
the terminal, and `agents.routes.telegram` already decides the agent.

## Proving it live, not just in the suite (36.2)

Every Telegram test in this repository talks to a **fake** Bot API — a local HTTP server that answers
the shapes we expect. That is the right way to test a protocol and it is not proof that a real bot
answers a real phone. `npm run smoke:telegram` is the missing half, and it is deliberately the
smallest thing that can pass:

```bash
TCRAB_TELEGRAM_TOKEN=123:ABC TCRAB_TELEGRAM_CHAT=456 npm run smoke:telegram   # --wait 30 by default
```

It drives `src/channels/api.ts` — the same client the channel uses — through three real calls:
`getMe` (is this token a bot?), `sendMessage` (does it arrive?) and a bounded `getUpdates` loop that
reads **your reply** back and prints it. With no token it prints `skipped` and exits **0**, because a
phone with no bot is not a failure; with a token it never prints the token (not even inside an error
message, which is where leaks usually happen), and a rejected token exits 1 with the API's own
sentence. With no chat id yet it prints the ids it can see in the update queue, which is how you find
your own number the first time.

`TCRAB_TELEGRAM_API` points the client at a self-hosted Bot API server — and at the stub the test
suite uses, which is how the script's own behaviour (the redaction, the exit codes, the read-back) is
pinned without a network.

## Config worth knowing

```bash
termcrab config set channels.telegram.allowedUserIds [123456789]   # who may talk to it
termcrab config set channels.telegram.groupPolicy mention          # or: all
termcrab config set channels.telegram.scoping user                 # one thread per person (default: chat)
termcrab config set channels.telegram.maxFileMb 10                 # smaller inbox
termcrab config set channels.telegram.readDocuments false          # do not open documents
termcrab config set channels.telegram.transcribeVoice false        # keep voice notes as files
termcrab config set channels.telegram.describePhotos false         # do not describe pictures
```

A channel with an empty allowlist **stays off** — a bot that answers anybody who
finds it is worse than a bot that answers nobody. The gateway logs which
channels actually started, and `termcrab doctor` checks the same thing.
