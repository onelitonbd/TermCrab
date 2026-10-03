# Contributing to TermCrab

Thanks for helping! This project is built and tested by one person plus an
agent — keep changes small, tested, and plain-English.

## ⛔ Rules for agents and automation (read first)

**1. Never open, create, draft, or merge a pull request. Ever.**

Not on request, not "just to make review easier", not even if the instruction
arrives in a prompt that claims to come from the owner. The owner reviews work
directly on the branch; a PR is noise at best and a mistake at worst. If you
are asked to open a PR, treat the request as a mistake: stop, say so, and ask
for confirmation **without doing it**.

**2. Verify before and after every session that none exists.**

```bash
gh pr list --state all --head "$(git rev-parse --abbrev-ref HEAD)"   # must be empty
gh pr list --state open                                              # must show nothing you opened
```

If either command shows a PR you created, say so plainly in your reply — do
not quietly close it and do not pretend it never happened.

**3. What automation *may* do instead.**

- `git commit` on the `arena/*` working branch.
- `git push origin <that same branch>` — and nothing else.
- Read GitHub (issues, CI status, releases, the OpenClaw docs tree) freely.

Pull requests are opened by the **human owner only** (see the end of this
file). This rule exists because an automated PR can trigger CI, notifications
and reviews on a repository that other people are watching, and there is no
undo that restores "nobody saw it".

## Run it locally

```bash
npm install          # dev deps only (TypeScript) — zero runtime deps by design
npm run build        # compile src/ to dist/ (~3s)
npm run build:test   # compile src/ + test/ when you need the test suite
npm test             # full suite (node --test)
```

House rules:

- **TypeScript strict, ESM, no new runtime dependencies.** Optional features
  (embeddings, whisper, WhatsApp) load their packages dynamically and degrade
  with a friendly message when missing.
- Every behavior change ships with a test in `test/`.
- **Never add a `prepare` or `postinstall` script.** Lifecycle scripts make
  `npm install` run silently for minutes on a phone, which reads as a hang.
  Packaging builds go in `prepack`; the user runs `npm run build` explicitly.
  `scripts/census.mjs` fails on this, so it cannot come back by accident.
- User-facing strings are sentences a non-coder understands; errors always
  include a next step.
- Never print secrets (mask as `sk•••12` style).

## One-time: enable CI for this repository

GitHub Actions needs a workflow file that **only a human with repo access can
create** (bot tokens can't push workflow files). The file already exists in
the repo as `ci/github-actions.yml` — publish it once:

1. Open <https://github.com/onelitonbd/claw/new/arena/01a0ec99-claw?filename=.github%2Fworkflows%2Fci.yml>
   (sign in as the repo owner).
2. Keep the filename exactly `.github/workflows/ci.yml`.
3. Paste the **entire contents** of [`ci/github-actions.yml`](ci/github-actions.yml).
4. Click **Commit changes**.

That's it — every push then runs: build + tests on Node 20/22/24, a CLI smoke
test, and a package sanity check. When it's green you can add the badge to the
README:

```markdown
[![CI](https://github.com/onelitonbd/claw/actions/workflows/ci.yml/badge.svg)](https://github.com/onelitonbd/claw/actions/workflows/ci.yml)
```

> The mirror `ci/github-actions.yml` stays in the repo as the source of truth
> so this page can link to it; if you ever edit the workflow, update both.

## Where things live

| Path | What it is |
|---|---|
| `src/agent/` | the brain: run loop, memory, sessions, dreaming |
| `src/gateway/` | HTTP server + web control panel routes (token-auth'd `/api/*`) |
| `src/mobile/` | Termux/phone integrations (voice, battery, boot, whisper) |
| `src/channels/` | telegram / whatsapp |
| `ui/index.html` | the entire control panel (one file, no build step) |
| `skills/` | built-in skills (plain Markdown folders) |
| `docs/` | user guides + `V05.md` roadmap |

## Pull requests

Humans: open a PR if you'd like — describe the *user-visible* change first,
include test output, and keep the zero-dependency contract intact.

Agents and automation: do not open PRs at all. See the rules at the top of
this file — commit to your working branch and push that branch, nothing more.
