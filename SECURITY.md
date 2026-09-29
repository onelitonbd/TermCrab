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
