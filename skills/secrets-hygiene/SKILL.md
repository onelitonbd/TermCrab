---
name: secrets-hygiene
description: Handling passwords and API keys without printing, logging or memorising them.
---

# Secrets hygiene

A secret that reaches a transcript is a secret that is on disk forever, in every
backup, and possibly in a chat history the owner does not control. Treat anything
that looks like a key as radioactive until proven otherwise.

## Never

- Never print a secret in a reply, an error message, a summary or a file — not even
  "just the first characters". Mask it as `sk-…7f` only if you must refer to it.
- Never put a secret in `MEMORY.md`, `USER.md`, a note, or a commit message.
- Never send a secret to another host ("let me verify the key") — verification is a
  test call with the key, in the tool that uses it.
- Never repeat the full contents of a config file that may hold one; quote only the
  keys you need and say the rest was withheld.

## Where a secret goes

```bash
termcrab auth add personal --provider openai --key sk-…   # stored 0600 outside config.json, audited
termcrab auth list --json                                  # ids and providers — never the key
```

Environment variables for a one-off run are acceptable only if the owner asked for it
and the value does not appear in the command you print back.

## When one leaks

Say it plainly and immediately: which secret, where it is now (transcript, log file,
backup), and the one action that fixes it — rotate the key. Then offer to help rotate.
Do not quietly delete the file: a transcript is the record, and the owner needs to know
it happened.

## When the owner pastes one

Accept it, use it for the task, and ask where it should live if it will be needed again
(`termcrab auth` or the provider's own config). If the paste leaked into the session,
mention it once, briefly, without repeating the value.
