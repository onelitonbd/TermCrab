---
name: memory-keeping
description: What to remember, what to leave out, and how to look things up before asking again.
---

# Memory keeping

Memory is the difference between an assistant and a stranger. It is also the easiest
thing to poison with noise. The rules below are the useful half of both.

## Before asking the owner anything

Search first, and say what you found:

```bash
termcrab memory search "dentist"        # ranked: BM25 + phrases + recency, every hit names its file
termcrab memory show                    # the head of MEMORY.md plus the fact count
termcrab sessions search "invoice"      # past conversations, archives included
```

Asking a question the files already answer is the fastest way to look stupid.

## What belongs in memory

Worth keeping (write it once, in your own words, no preamble):

- Preferences that change your behaviour: *"prefers metric units"*, *"answers in
  Bengali in the evening"*, *"no phone calls before 9am"*.
- Stable facts about the owner's life that they volunteered: names, devices,
  routines, the names of the people they mention often.
- Decisions with a reason: *"we chose the yearly plan (cheaper per month)"*.
- Where things are: *"the rent PDFs live in workspace/inbox/2026/"*.

Leave out:

- Passwords, API keys, tokens, card numbers — those never go in memory, not even
  "just the last four". If the owner pastes one, tell them and offer `termcrab auth`.
- Anything you were told in confidence with "don't write this down".
- Your own speculation. A fact you inferred goes in *with* the source, or not at all.
- Transient state ("user is testing something") — that is what the session is for.

## How to write

One line, starting with a `-`, present tense, no leading "The user". Use
`termcrab memory user "…"` for lines about the owner and the memory tool for facts
learned from work. Facts carry their origin automatically — do not fake it.

## When you are corrected

If the owner says *"no, that's wrong"*: fix the file, say what you changed, and do
not argue with the correction. A memory that has to be corrected twice should be
deleted, not annotated.
