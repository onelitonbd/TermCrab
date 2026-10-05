# Channels

**Their pages:** 109 under `/channels` — Telegram, WhatsApp, Discord, Slack, Signal, iMessage, Google Chat, Teams, Feishu, Matrix, Mattermost, IRC, LINE, Nostr, QQ, Twitch, Synology, Nextcloud Talk, Tlon, Zalo, WeCom, Buzz, ClickClack, voice calls, plus cross-cutting pages on routing, access groups, broadcast groups, ambient room events, bot-loop protection, pairing.
**Catalogue:** [`../sections/03-channels.md`](../sections/03-channels.md).

## 1. The honest count

| | count |
|---|---:|
| OpenClaw channels documented | 30+ |
| TermCrab adapters in the tree | 7 (`src/gateway/server.ts:37-48`) |
| TermCrab channels that work **on a phone with no extra native build** | **2** — Telegram, WebChat (+ WhatsApp via Baileys, if npm cooperates) |
| TermCrab channels that need a third-party dependency most Termux users cannot install | 4 — Discord (`discord.js`), Slack (`bolt`), Signal (`signal-cli`), SMS (Twilio), Matrix (`matrix-js-sdk`) |

Those last four are the problem, and it is not just a feature gap: they are **six files that make the product look broader than it is**, in exactly the way `docs/ARCHITECTURE.md` does. On a phone, an adapter that cannot be installed is dead weight in the tree, the UI and the README.

## 2. What their channel layer has that ours does not

Not the count — the *policy* layer around it. Their 109 pages spend most of their words on:

- **Routing**: per-room/per-thread sessions, identity links, `dmScope` (main | per-peer | per-channel-peer | per-account-channel-peer).
- **Access**: allowlists, access groups, per-agent policies, DM pairing and approval.
- **Group behaviour**: ambient room events (reading history without being addressed), broadcast groups, bounded follow-up rounds between agents, bot-loop protection with defaults.
- **Presentation**: channel-aware markdown/HTML rendering, media in and out, typing indicators fired on enqueue, voice notes, reactions.

TermCrab has: an allowlist, an `@agent` prefix, markdown→HTML conversion with chunking (`src/channels/markdown.ts`), a first-class outbox that retries on flaky mobile networks (better than theirs), and… that is the list.

## 3. Verdicts per channel

| Channel | Status | Reality |
|---|---|---|
| Telegram | ✅ WORKING | long-poll, allowlist, chunking, HTML escaping, outbox. 4 commands only. |
| WebChat | ✅ WORKING | `/api/chat` + SSE + the panel. |
| WhatsApp | 🟡 PARTIAL | Baileys, optional; QR pairing; the most useful non-Telegram channel for many users. |
| Discord / Slack / Signal / SMS / Matrix | 🟡 PARTIAL | adapters exist, wire up, need native deps. |
| Everything else (24+) | ⚪ ABSENT | deliberately: see ROADMAP §4. |

## 4. The move

**1. Tell the truth in one table.** Add a channel support matrix to `README.md`: ✅ works on Termux with zero extra setup · 🟡 works if you install X · 🧪 untested. Then move the 🧪 ones behind a `channels.experimental` flag so they cannot silently appear as supported. This is a documentation change, and it directly addresses the "everything feels like a loop-hole" feeling — because the fastest way to feel in control of a wide surface is to find out it is narrower than you feared.

**2. Make Telegram genuinely good (4d).** It is your daily driver: commands (`/help /model /stop /queue`), typing indicators (1d — `sendChatAction`, currently absent), and inbound media (photos/documents/voice → the agent, 4d). A phone agent that cannot receive a photo is leaving its best sensor unused.

**3. Pick exactly one more channel and make it first-class.** Recommendation: **WhatsApp** (already written, highest reach for the target user, QR pairing is a phone-native flow). Otherwise delete the other adapters' UI presence.

**4. Then stop.** Every additional channel is a permanent maintenance surface and a new set of trust questions (who may talk to the agent? in a group? with what permissions?). Their 109 pages of channel policy exist because each channel multiplies the policy problem. Two channels done well, with the outbox and mobile guards you already have, is a better story than seven that half-work.

## 5. Done tests

- `README.md` channel table matches `src/gateway/server.ts` imports — and `census.mjs` gets a probe per channel so it cannot drift.
- Sending a photo to the Telegram bot results in the agent describing it (or saying clearly that it cannot).
- A message sent while the phone is offline is delivered when connectivity returns, with no duplicate.
