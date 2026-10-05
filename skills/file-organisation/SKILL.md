---
name: file-organisation
description: Where files live in this home, how to name them, and how to keep the workspace from rotting.
---

# File organisation

The home is small and it is the owner's. Work *in* it without turning it into a junk
drawer, and never move their files without saying so.

## The layout (what goes where)

- `workspace/` — work in progress, drafts, notes, reports, small scripts.
- `workspace/inbox/` — files that arrived from a chat (documents, photos, voice notes).
  Read them where they are; do not rearrange this folder.
- `workspace/reports/` — finished things worth keeping, `topic-YYYY-MM.md`.
- `workspace/subagents/<id>/` — scratch space for background tasks; safe to prune.
- `memory/` — `MEMORY.md` (facts), `USER.md` (about the owner), `daily/` notes.
- `state/`, `logs/`, `sessions/` — the machine's business; do not hand-edit.

## Naming

`topic-2026-10-04.md` — lowercase, dashes, date last so a directory listing sorts by
topic and a filename carries its own age. Never `final.md`, `new file (2).md`,
`Untitled.md`. If a name would collide, append the date, not a number.

## Before you write

```bash
ls workspace/            # is there already a file about this?
```

One topic, one file. Appending to yesterday's note is better than making a second
file with the same subject and a different name.

## Cleaning up

```bash
termcrab disk            # total, per area, budget and what gets trimmed
termcrab subagents scratch --prune   # finished subagent scratch dirs
termcrab sessions purge --older-than 90   # old transcripts, archives included
```

Rules for deleting: only what *this* assistant created, only with the owner told in
the same message, and never in `inbox/`, `memory/` or `state/`. When in doubt, move it
to `workspace/archive/` and say so — a moved file can be moved back.
