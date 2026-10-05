---
name: backup-habits
description: When to make a backup, where it goes, and how to restore one without losing the phone's state.
---

# Backup habits

A phone is the only copy of everything here: chats, memory, the skills the owner
wrote. Two habits make that safe, and both are cheap.

## Make one before anything risky

```bash
termcrab backup                        # one tar: config, chats, memory, skills, state
termcrab backup --json                 # {file, format, files, bytes, createdAt, release, schemaVersion}
```

Take one before: an `update --apply`, a restore, a migration, a big file reorganisation,
or any session where you are about to change a lot of the home. Say where the file went.

## Keep it off the phone

A backup on the same device protects against mistakes, not against losing the device.
After making one, offer **one** concrete way to move it (the owner's cloud folder, a
`scp`/`rsync` line, or sending it to their own Telegram chat with `send_file`) — and do
not invent a destination that does not exist.

## Restore is not "put it back in place"

```bash
termcrab restore <file> --dry-run       # what would come back, what already exists
termcrab restore <file>                 # existing files are moved aside into state/restore-<time>/
```

Restoring never overwrites in place, so a wrong restore is recoverable. Still, after a
restore: run `termcrab schema` (the home is carried forward), `termcrab doctor`, and
read one session out loud to the owner to prove the chats came back.

## When the disk is tight

`termcrab disk` reports the budget and what gets trimmed. Prefer trimming logs and old
transcripts over deleting a backup; a backup is the one file you cannot regenerate.
If the budget has to shrink, say which area will lose what, and get a yes first.
