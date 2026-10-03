# Channels — what each one can actually do

Seven adapters ship in the box. Exactly one of them is load-bearing on a phone:
**Telegram**. The rest are honest, tested, and *bring your own client* — none of
their SDKs is bundled, because a phone install must stay dependency-free.

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

## Config worth knowing

```bash
termcrab config set channels.telegram.allowedUserIds [123456789]   # who may talk to it
termcrab config set channels.telegram.groupPolicy mention          # or: all
termcrab config set channels.telegram.maxFileMb 10                 # smaller inbox
termcrab config set channels.telegram.readDocuments false          # do not open documents
termcrab config set channels.telegram.transcribeVoice false        # keep voice notes as files
termcrab config set channels.telegram.describePhotos false         # do not describe pictures
```

A channel with an empty allowlist **stays off** — a bot that answers anybody who
finds it is worse than a bot that answers nobody. The gateway logs which
channels actually started, and `termcrab doctor` checks the same thing.
