# Security

TermCrab gives an LLM real abilities on your device (shell, files, network). That is
inherently powerful — treat it like giving someone your unlocked phone.

## Defaults (secure by design)

- Gateway binds **127.0.0.1** only. Binding a non-loopback host **without** a token
  refuses to start.
- Every `/api/*` route except `/api/health` requires a token (constant-time compare).
- Telegram channel stays **disabled** until an allowlist of user ids exists; messages
  from everyone else are rejected.
- File tools are confined to `TCRAB_HOME` and the current working directory
  (symlink-resolved). Wider access requires `exec`.
- `agent.allowExec` can be turned off entirely (`termcrab config set agent.allowExec false`).
- No telemetry. No auto-update. All state is on your disk.
- The `shell-safety` skill forbids destructive/exfiltration commands at the prompt layer
  (defense in depth — not a sandbox).

## The shell sandbox (batch 30)

`exec` is the sharpest tool the agent has, so it runs inside whatever isolation the
device can provide, and it **tells you which one it used**:

| Mode | What it is | What it protects | What it does not |
|---|---|---|---|
| `bwrap` (bubblewrap) | unprivileged user namespace | read-only root, exactly one writable workspace (+ `agent.sandboxWrites`), private `/tmp` and a throwaway `$HOME`, no network unless `agent.sandboxNetwork` | the command still runs as you; it can read anything world-readable in its own user id outside the binds (kernel/user-namespace availability decides the rest) |
| `proot` | userspace chroot (works where Android blocks user namespaces) | the same writable-path rule, at a speed cost | **network is not restricted** — proot has no flag for it and we say so instead of pretending |
| none | no helper installed | nothing | everything |

`agent.sandbox` chooses the policy when no helper exists:

- `auto` (default) — run anyway, and the transcript starts with `[sandbox] ran without a sandbox: …`;
- `require` — **refuse** to run, answering with the package to install
  (`pkg install bubblewrap` on Termux, `apt install bubblewrap` elsewhere);
- `off` — never sandbox; the transcript records `sandbox is off` so the choice is visible in
  the run, not just in the config file.

`termcrab doctor` reports the mode, `GET /api/status` carries it (the panel shows
`Sandbox: bwrap|proot|none|off` next to the provider), and `test/tier2s.test.ts` pins the
generated argument vectors — a sandbox whose flags are wrong is worse than none, because it
looks like one. Container images, per-tool policies and a filesystem-exfiltration guard are
not implemented; this is a path fence and a network switch, not a jail.

## Threat model highlights

| Threat | Status |
|---|---|
| LAN attacker hitting open port | loopback default + token; do NOT expose to 0.0.0.0 without token + TLS |
| Malicious Telegram user | allowlist required; unknown senders rejected |
| Prompt injection from web content | treat fetched content as untrusted; no secrets in prompts; keep `allowExec` off if you don't need it |
| Supply chain | zero runtime dependencies (your `node_modules` is typescript + types only) |
| Stolen phone | device lock + `TCRAB_HOME` encryption (File-Based Encryption on modern Android) |

## Reporting

Open a GitHub security advisory on this repository, or open an issue titled
`[security]` with no exploit details and ask for a private channel.
