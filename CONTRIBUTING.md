# Contributing to TermCrab

Thanks for helping! This project is built and tested by one person plus an
agent — keep changes small, tested, and plain-English.

## Run it locally

```bash
npm install          # dev deps only (TypeScript) — zero runtime deps by design
npm run build        # compile to dist/
npm test             # full suite (node --test)
```

House rules:

- **TypeScript strict, ESM, no new runtime dependencies.** Optional features
  (embeddings, whisper, WhatsApp) load their packages dynamically and degrade
  with a friendly message when missing.
- Every behavior change ships with a test in `test/`.
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

Open a PR if you'd like — describe the *user-visible* change first, include
test output, and keep the zero-dependency contract intact.
