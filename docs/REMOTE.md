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

## What is enforced, and how to check it yourself (34.5)

The rules above used to be documentation. They are now three mechanisms you can
test without trusting this page:

1. **The bind guard.** `termcrab gateway --host 0.0.0.0` with no `gateway.token`
   refuses to start (exit 1) instead of quietly opening the API. This is not a
   warning; the process does not come up.
2. **The token is checked on every route, and its strength is audited.**
   `termcrab security` fails when the panel is bound off-loopback *and* the token
   is short, a guessable word, or one repeated character — the exact things a
   person types when they are in a hurry to test from the sofa.
3. **The audit reads the live config, not a table.** `termcrab security` prints
   findings with the fix for each one, and exits 1 when any of them is a `fail`:

   ```bash
   termcrab security            # exec policy, sandbox, approvals, bind, tokens, browser, keys
   termcrab security --json     # the same findings as data (for a script or the panel)
   termcrab auth audit          # where the keys are, masked — config.json, memory/, state/
   ```

**What this does *not* do, said plainly:** there is no built-in TLS terminator.
The token crosses the wire as a bearer header or a query parameter, so on a
network you do not control, put a TLS terminator in front (a tunnel gives you
one), or use Tailscale/WireGuard as above — an encrypted network is the thing
that actually protects the token, and pretending a bearer token over plain HTTP
on a café network is safe would be a lie. There is also no per-route scope: a
paired device token can do anything the master token can, which is why
revocation is per device (`termcrab devices revoke`).

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
