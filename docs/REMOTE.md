# Remote access — reach your crab from anywhere (safely)

> Plain-English guide. Pick **one** recipe. Every recipe assumes you already
> run `termcrab gateway` at home.

## First, the two safety rules

1. **A token is mandatory off your own device.** TermCrab refuses to open
   itself to the network unless `gateway.token` is set — it literally won't
   start. Set one with:
   ```bash
   termcrab config set gateway.token generate
   ```
   (That spells out a fresh random token for you. It's printed in the panel
   URL the first time the gateway starts.)

2. **Your token is the front door.** Every panel/API request must carry it
   (`?token=…` in the URL or `Authorization: Bearer …`). No token = turned
   away, even if the port is open.

## ✅ Recipe A — Tailscale (easiest, private)

Your own private network; only your devices see it.

```bash
pkg install tailscale        # Termux (or install the app on desktop)
tailscale up
tailscale ip -4              # gives you e.g. 100.64.0.12
```

Then start TermCrab open to the network:

```bash
termcrab config set gateway.host 0.0.0.0
termcrab gateway
```

On your other device (same Tailscale account): open
`http://100.64.0.12:7788/?token=YOUR_TOKEN`.

- ✅ Encrypted by Tailscale; nothing is exposed to the public internet.
- ⚠️ Anyone on *your* Tailscale network with the token can use the panel —
  treat the token like a password.

## ✅ Recipe B — Cloudflare quick tunnel (share with a friend, no account)

```bash
termcrab config set gateway.host 127.0.0.1   # keep local; tunnel does the reaching
termcrab gateway                              # leave this running
cloudflared tunnel --url http://127.0.0.1:7788
```

Cloudflare prints a `https://…trycloudflare.com` URL — open it anywhere with
`?token=YOUR_TOKEN` appended.

- ✅ No account, HTTPS included, your home IP stays hidden.
- ⚠️ The URL changes every restart; anyone with the URL **and** token can get
  in. Don't post the pair publicly.

## ✅ Recipe C — SSH port-forward (classic, for people with a VPS)

From your phone/laptop:

```bash
ssh -L 7788:127.0.0.1:7788 you@your-home-server
```

Then open `http://127.0.0.1:7788/?token=YOUR_TOKEN` locally — the SSH tunnel
carries it home. TermCrab itself never leaves loopback, so no token is even
required on the far side (but keep one set anyway; it costs nothing).

- ✅ Encrypted by SSH; zero new attack surface at home.
- ⚠️ Needs an always-on machine at home (a Pi works).

## ❌ What NOT to do

- **Don't expose a bare home IP** (`termcrab config set gateway.host 0.0.0.0`
  and port-forward 7788 on your router). Your panel would sit on the public
  internet, found by scanners within hours. Tunnels (A/B) exist for this.
- **Don't paste the token into screenshots/issues/chats.** `termcrab
  doctor --share` strips it; your eyes are the last line of defense.
- **Don't disable the token** "just to test" on a non-loopback host —
  TermCrab will refuse to start, and that refusal is the feature.

## Hardening checklist (2 minutes)

- [ ] `gateway.token` set to a long random value (required for any recipe)
- [ ] `gateway.host` is `127.0.0.1` unless a tunnel/router needs `0.0.0.0`
- [ ] Router has **no** forwarded port 7788 (unless you know exactly why)
- [ ] Telegram/WhatsApp allow-lists stay empty unless you use them
- [ ] `agent.allowExec` stays `false` if you don't need shell actions
- [ ] After testing, drop back to loopback:
      `termcrab config set gateway.host 127.0.0.1`
- [ ] `termcrab doctor` — all green before you walk away

## If something doesn't work

Run `termcrab doctor --share` and paste the (secret-free) report wherever you
ask for help — it includes bind address, token presence, and port state
without leaking the token itself.
