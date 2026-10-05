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
./termcrab onboard    # the launcher: builds on first run if you skipped the step above
                      # (~1-2 min on a phone; later runs are instant, and after a
                      #  `git pull` it recompiles incrementally, not from scratch — see
                      #  docs/PERFORMANCE.md for the numbers and the ceilings)
```

Get the bare `termcrab` command (after `npm install` alone there is none — that is
the "No command `termcrab` found" you may have seen):

```bash
npm link             # one symlink into $PREFIX/bin, which is already on PATH
termcrab --version   # → termcrab 0.58.0
```

If `npm link` is not available, either run `./termcrab` from the checkout, or drop a
two-line shim yourself:

```bash
mkdir -p ~/.local/bin
printf '#!/usr/bin/env bash\nexec node "$HOME/claw/dist/src/bin/termcrab.js" "$@"\n' > ~/.local/bin/termcrab
chmod +x ~/.local/bin/termcrab
echo 'export PATH=$PATH:~/.local/bin' >> ~/.bashrc
```

## The full-screen terminal

`termcrab tui` draws the whole screen: the transcript, one line per tool call,
the input box and a status bar. On a phone it is the nicest way to watch a long
turn, and it is the same conversation as the panel and your Telegram DM.

```bash
termcrab tui              # opens on the main session
termcrab tui --session work
termcrab tui --no-attach  # do not watch the gateway for turns from other surfaces
```

Two phone-sized notes: **Termux's extra keys row** is the easy way to send ↑ ↓
and Ctrl-C (long-press the keyboard to enable it, then tap the arrow), and if the
screen looks wrong after a rotation, `Ctrl-L` redraws it. Leave with `/quit` or
Ctrl-C; a stray Ctrl-C while a turn runs stops the turn first, and the second
one leaves — the terminal is restored either way.

## Stay alive on a phone

Android kills background apps. Three layers defeat it:

```bash
termcrab boot install      # 1. auto-start on reboot (requires Termux:Boot app)
termux-wake-lock           # 2. hold CPU awake (run once per boot)
termcrab supervisor        # 3. auto-restart the gateway if it ever dies
```

Plus **Settings → Apps → Termux → Battery → Unrestricted**. Every OEM hides that switch
somewhere else, and a phone that "keeps killing the agent" is almost always one of these:

| Phone | What to switch off | Where it hides |
|---|---|---|
| Xiaomi / Redmi / POCO (MIUI, HyperOS) | Autostart for **Termux** and **Termux:Boot**, plus No restrictions | Settings → Apps → Manage apps → Termux → Battery saver; Recents → lock the card |
| Oppo / Realme / OnePlus (ColorOS, OxygenOS) | Allow background activity, Auto-launch, and Sleep standby optimization | Settings → Battery → App battery management → Termux |
| Samsung (One UI) | Adaptive battery for Termux | Settings → Battery → Background usage limits → Never sleeping apps |
| Vivo / iQOO (Funtouch, OriginOS) | High background power consumption + Autostart | Settings → Battery → Background power consumption management |
| Huawei / Honor (EMUI, MagicOS) | "Manage automatically" off, then allow all three toggles | Settings → Battery → App launch |

After changing anything, check with `termcrab doctor` and `termcrab boot status`.

## Finding your way around

```bash
termcrab help              # every command, one line each
termcrab help gateway      # one command in detail (same as: termcrab gateway --help)
termcrab completion bash   # tab-completion for your shell (bash | zsh | fish)
```

## Moving the agent to a new phone

Everything the agent knows is one directory, and one command copies it out:

```bash
termcrab backup                 # → termcrab-backup-<date>.tar in this folder
termcrab backup /sdcard/tc.tar  # or straight to shared storage
termcrab restore <file> --dry-run   # see what an archive would do, writing nothing
termcrab restore <file>             # on the new phone, after installing
```

The archive is a plain `tar` — no compression to unpack, no dependency — with a `manifest.json`
inside it (`tar -xOf termcrab-backup.tar manifest.json` tells you the release and the state
schema it holds without TermCrab). It carries config, chats, memory, skills, state and logs, and
skips pid/lock files and old snapshots. **Restoring never overwrites in place**: files that
already exist are moved into `state/restore-<time>/` first, so a wrong archive is itself
recoverable. The state carries a version (`termcrab schema`), so an archive from an older build
is carried forward on the next start, and an archive from a *newer* build is refused with a
sentence instead of being half-read. A backup holds your API key — treat the file like a password.

## As a service (survive a reboot)

```bash
termcrab service status     # what is installed on this device
termcrab service install    # write it
termcrab service --help     # what it writes, per platform
```

On Android the "service" is the **Termux:Boot** script — Android has no systemd — so
`service install` writes `~/.termux/boot/start-termcrab` (the same file `termcrab boot install`
writes: wake-lock, then the supervisor). On Linux it writes a **systemd user unit** at
`~/.config/systemd/user/termcrab.service` and prints the two commands that enable it; on macOS a
launchd agent. No root, no sudo, and `--dry-run` prints the path, the exact file and the steps
without writing anything. Uninstalling never touches your data — it is a file in your own
`.config` (or `.termux/boot`), nothing more.

## Keep it up for weeks

```bash
termcrab boot install     # writes ~/.termux/boot/start-termcrab (wake-lock + supervisor)
termcrab boot status      # says whether the script is there, and whether we are on Termux
termcrab supervisor       # restart-on-crash loop, logs in ~/.termcrab/logs/
```

Two gotchas worth knowing:

1. **Termux:Boot must be opened once** after installing it from F-Droid, otherwise Android
   never fires the boot broadcast and nothing auto-starts.
2. `termux-wake-lock` is held by the boot script (and by `termcrab supervisor`); if the CPU is
   still sleeping, run it once by hand and in the Termux notification tap **Acquire wakelock**.

## Coming from proot / Ubuntu containers

You do not need them, and they cost gigabytes:

```bash
proot-distro remove ubuntu     # if you installed one while following an older guide
pkg uninstall proot-distro     # and the tool itself, if you want the space back
```

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
