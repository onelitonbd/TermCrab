# WhatsApp setup

WhatsApp runs through **Baileys** as an *optional extension* — the TermCrab core keeps
zero runtime dependencies, so you opt in explicitly.

## 1. Install the extension

```bash
cd ~/.local/share/termcrab     # or your clone of this repo
npm install baileys
```

## 2. Configure (secure defaults)

```bash
# your own number, or any number you want to allow (bare digits or full JID)
termcrab config set channels.whatsapp.enabled true
termcrab config set channels.whatsapp.allowedJids ["8801XXXXXXXXX"]
```

> The channel **does not start** with an empty allowlist — same policy as Telegram.

## 3. Pair

Run the gateway in a **visible terminal** and scan the QR:

```bash
termcrab gateway
# ... scan the printed QR: WhatsApp > Linked Devices > Link a Device
```

Auth state persists in `~/.termcrab/state/wa-auth/`. If you are logged out (401),
delete that folder and re-pair.

## 4. Chat

Message your WhatsApp account from another phone (or WhatsApp Web). Commands:
`/new` (reset session), `/status`, `/agents`. Prefix with `@agentname` to route to a
named agent profile.

## Notes

- Group messages are ignored unless the exact group JID is allowlisted (DMs first).
- Failed sends queue in the offline outbox and retry every 30s — mobile networks welcome.
- **ToS warning:** Baileys uses unofficial WhatsApp access. Use a personal number you
  can afford to lose, and don't spam. Telegram remains the recommended daily driver.
- Troubleshooting: `termcrab doctor` reports baileys/allowlist state.
