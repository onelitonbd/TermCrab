# Channels — what each one can actually do

Seven adapters ship in the box. Exactly one of them is load-bearing on a phone:
**Telegram**. The rest are honest, tested, and *bring your own client* — none of
their SDKs is bundled, because a phone install must stay dependency-free.

## The table

| Channel | Inbound text | Files in | Files out | Typing | Groups | Needs |
|---|---|---|---|---|---|---|
| **Telegram** | ✅ full | ✅ photos, documents, voice → `workspace/inbox/` | ✅ `send_file` (≤ 20 MB) | ✅ `typing…` while it works | ✅ mention-only by default | a bot token |
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
  extension on the allowed list) and written to
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

## Config worth knowing

```bash
termcrab config set channels.telegram.allowedUserIds [123456789]   # who may talk to it
termcrab config set channels.telegram.groupPolicy mention          # or: all
termcrab config set channels.telegram.maxFileMb 10                 # smaller inbox
```

A channel with an empty allowlist **stays off** — a bot that answers anybody who
finds it is worse than a bot that answers nobody. The gateway logs which
channels actually started, and `termcrab doctor` checks the same thing.
