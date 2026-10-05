# Security — what this agent can do, and what stops it

One page, honest about both halves: the doors that exist, and the ones that are
not locked yet. Nothing here is a promise about the future; each claim names the
setting or the command that proves it right now.

## The doors, in the order they matter

| Door | Default | What closes it |
|---|---|---|
| **Shell** (`exec`) | allowed, sandbox `auto` | `agent.allowExec false`; `agent.sandbox require` refuses to run when no sandbox binary is installed; bubblewrap/proot argv is built as data, never a shell string (30.x) |
| **Files** | inside the state dir + cwd | path guard on every file tool (`extraRoots` widens it deliberately) |
| **Network from the sandbox** | off (`agent.sandboxNetwork false`) | a shell command inside bubblewrap cannot reach the network; `web_fetch` / `web_search` stay available to the agent itself, on purpose |
| **Browser** | off (`allowBrowser`) | it drives *your* Chrome, with your logins — turn it on only when you mean it |
| **Panel/API** | loopback only | a token is mandatory off-loopback (the process refuses to start without one); every `/api/*` route authenticates, and a full token bucket answers 429 instead of queueing turns |
| **Webhooks** | off by default | each hook carries its own `x-hook-token`, compared in constant time |
| **Channels** | off with an empty allowlist | `channels.telegram.allowedUserIds`; in a group the bot answers only when addressed unless `groupPolicy = "all"` |
| **Dangerous tools** | `exec`, `write_file`, `kill_process` behind the approval gate | `security.approvals.tools` decides which ones pause for your yes; the decision (and who made it) is written into the transcript |
| **Secrets** | keys in `state/` at 0600, never in `config.json` if you use `termcrab auth` | `termcrab auth audit` finds a key-shaped string where it should not be, masked, with the command that moves it |

## Audit it yourself

```bash
termcrab security          # every finding carries its fix; exit 1 when one is a fail
termcrab security --json   # the same, as data
termcrab auth audit        # where the keys are (never what they are)
termcrab doctor            # includes the security policy line with the rest of the health check
termcrab devices           # who holds a token, and when they were last seen
termcrab devices revoke <id|name>
```

Every finding comes from the live config: change a setting, run it again, and
the finding changes. Nothing in this page is maintained by hand separately from
the code that checks it — the audit is derived from the config object, and
`test/tier3c.test.ts` feeds it configurations and asserts the findings.

## What is *not* defended, said plainly

- **No built-in TLS.** A bearer token over plain HTTP is only as private as the
  network. Use a tunnel or Tailscale (`docs/REMOTE.md`), and the token is
  protected by that layer, not by us.
- **No per-route scopes.** A paired device token can do everything the master
  token can; the difference is that it can be revoked individually.
- **No external vault, and no SecretRef indirection.** A key lives in
  `state/auth-profiles.json` (0600) or `state/secrets.json` (0600) on this
  device, and the agent reads it only when the provider call needs it. There is
  no 1Password/Keychain integration — on a phone, the threat that matters is the
  key ending up in a chat log or a backup, and the audit is aimed at that.
- **A prompt injection from a web page or a file is still a prompt injection.**
  The `untrusted` origin marks facts that came in that way, and the approval
  gate is the backstop for anything that writes — but a model that can be talked
  into running a command it was allowed to run is a model doing what it was
  allowed to do. Turn `allowExec` off if that trade is wrong for you.
