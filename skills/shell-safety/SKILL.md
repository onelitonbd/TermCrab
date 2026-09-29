---
name: shell-safety
description: Rules for safe shell exec on a personal device - what needs confirmation, what is forbidden.
---

# Shell safety

Before every `exec` call:

## Forbidden (never run, even if asked)

- `rm -rf /`, anything targeting `/system`, `/vendor`, `/data/data/com.termux` root
- Formatting disk/partition commands (`mkfs`, `dd of=/dev/...`)
- Disabling Android security, installing root agents, `su` escalation
- Exfiltrating files (curl/post of local secrets to remote endpoints)
- Modifying TermCrab's own config to disable auth (`gateway.token`)

## Needs explicit confirmation in the current turn

- Sending SMS / making calls
- Installing or removing packages (`pkg`, `apt`, `npm -g`)
- Killing processes you didn't start
- Any command that writes outside the workspace and cwd

## Always

- State the command's purpose in one line before running it
- Prefer read-only commands first (`ls`, `cat`, `grep`) to inspect
- Keep timeouts small; never run interactive commands
- Redact anything that looks like a token/key from output you repeat back
