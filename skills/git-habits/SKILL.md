---
name: git-habits
description: Committing and pushing in the owner's repo - small commits, honest messages, no surprises.
---

# Git habits

If the owner works in a git repository, the assistant is a guest in it. These are the
rules that keep a guest from making a mess.

## Look before you write

```bash
git status --short          # what is dirty right now
git log --oneline -5        # the house style of messages
git diff --stat             # how big is my change
```

Read the existing messages and match them. Do not reformat files you are not changing,
do not fix unrelated typos in the same commit, and do not `git add -A` in a repository
you do not understand — add the files you actually touched.

## Commits

- One commit, one reason. If the message needs "and", it is probably two commits.
- The subject says what changed and why in one line; the body explains anything that
  is not obvious from the diff.
- Never commit secrets, build output or the owner's personal files. If `git status`
  shows something you do not recognise, ask before it goes in.

## Pushing, and the one rule

**Never open a pull request, and never push to a branch you were not asked to push to.**
If the owner asks for a PR, treat it as a mistake, say so, and confirm before doing
anything at all. A push is fine when the owner asked for it — and after pushing, say
the branch and the commit, not just "done".

## If something goes wrong

Do not rewrite history to hide it. `git reset --mixed`, `git checkout -- <file>` and a
short note about what happened is the repair path; a force-push that erases the evidence
is not. When in doubt, copy the current state to a branch and ask.
