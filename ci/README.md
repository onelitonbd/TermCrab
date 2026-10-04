# `ci/` — the workflow source

The GitHub Actions workflow lives here, as **`ci/ci.yml`**, and is copied into
`.github/workflows/ci.yml` — where GitHub actually reads it — by:

```bash
npm run ci:install          # writes .github/workflows/ci.yml, byte for byte
node scripts/install-ci.mjs --check   # exits 1 if it is missing or different
```

**Why the copy step and not just the file?** GitHub refuses a push that creates
or updates anything under `.github/workflows/` unless the credential carries the
`workflows` permission. The integration that writes this repository has
`contents: write` but not `workflows`, so a direct commit is rejected with
*"refusing to allow a GitHub App to create or update workflow"*. Versioning the
workflow here keeps it reviewable and diffable in every commit; installing it is
one command for an account that has the permission.

What the workflow does (all of it asserted by `test/tier2w.test.ts`):

| Job | What it proves |
|---|---|
| `test` (node 20, 22, 24) | the build, the full suite, an offline CLI smoke including `bootstrap --json`, a fresh work tracker, and a census with no drift |
| `installer` | `install.sh --check` explains itself and writes nothing, and it refuses an unsupported Node |
| `package` | `npm pack` → install the tarball in a clean directory → `termcrab --version` and `termcrab bootstrap --json` run from there |

Anything else in this folder is documentation only.
