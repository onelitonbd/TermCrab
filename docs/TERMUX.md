# Termux Guide — running TermCrab on Android

No root, no proot, no Ubuntu container. Native Termux only.

## Requirements

- Android 8+, ~2 GB RAM free (4 GB comfortable)
- **Termux from F-Droid** (the Play Store build is abandoned)
- Optional: **Termux:API** and **Termux:Boot** apps (F-Droid)

## Install

```bash
pkg update && pkg upgrade -y
pkg install nodejs-lts git -y     # Node >= 20.10 required (22 LTS fine)
git clone https://github.com/onelitonbd/claw.git
cd claw
npm install          # fast
npm run build        # the slow step on a phone: 1-3 min, silent while it runs
node dist/src/bin/termcrab.js onboard
```

Make the CLI short:

```bash
mkdir -p ~/.local/bin
cat > ~/.local/bin/termcrab <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec node "$HOME/claw/dist/src/bin/termcrab.js" "$@"
EOF
chmod +x ~/.local/bin/termcrab
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
```

## Stay alive on a phone

Android kills background apps. Three layers defeat it:

```bash
termcrab boot install      # 1. auto-start on reboot (requires Termux:Boot app)
termux-wake-lock           # 2. hold CPU awake (run once per boot)
termcrab supervisor        # 3. auto-restart the gateway if it ever dies
```

Plus: **Settings → Apps → Termux → Battery → Unrestricted** (varies by OEM;
MIUI/HyperOS: also "Autostart" toggle).

## What TermCrab fixes for you automatically

| Android quirk | Fix |
|---|---|
| `os.networkInterfaces()` Error 13 crash | Bionic guard loaded before anything else |
| No `/tmp` | `TMPDIR=$PREFIX/tmp` set at startup |
| No systemd | `termcrab supervisor` + PID file |
| Battery drain | heartbeat pauses below `heartbeat.pauseBelow`% unless charging |
| Dropped mobile data | failed Telegram sends go to an offline outbox and retry |

Verify with: `termcrab doctor`

## Phone as a 24/7 agent server (recommended setup)

1. An old phone, plugged in, charge limit ~80% (AccuBattery or similar)
2. `termcrab boot install && termux-wake-lock`
3. `termcrab supervisor` (boot script launches this for you)
4. Talk to it from Telegram on your *daily* phone (allowlisted user ids!)

## Optional: device APIs

```bash
pkg install termux-api -y     # + Termux:API app
```
Then the agent can do notifications, clipboard, battery, camera, SMS (consent rules
in the `termux-api` skill). See `termcrab skills show termux-api`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "gateway not running" in doctor | `termcrab supervisor` or `termcrab gateway` |
| Telegram channel not starting | allowlist empty → `termcrab config set channels.telegram.allowedUserIds [id]` |
| OOM / process dies on old phone | close other apps; TermCrab idle target is < 90MB |
| Permission denied on termux-* | open Termux:API app, grant permissions, retry once |
| Wrong Termux build | uninstall Play Store Termux, install from F-Droid |
