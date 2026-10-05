# Install, ops and documentation

**Their pages:** 43 `/install` (macOS/Linux/WSL2, Windows, npm/pnpm/bun, Docker, Nix, Fly, from source) + 20 `/ci` + 38 `/help` + 13 `/security` + the release-notes archive.
**Catalogue:** [`../sections/02-install.md`](../sections/02-install.md), [`../sections/10-releases.md`](../sections/10-releases.md), [`../sections/12-help.md`](../sections/12-help.md).

---

## 1. Where TermCrab stands: 43%, and the honest split

| | OpenClaw | TermCrab |
|---|---|---|
| Install | installer script + 7 package managers + Docker + Nix + Fly | `install.sh` (Termux-native, re-runnable) + `npm install` |
| Runtime deps | large tree; Node ≥ 24.16/26.1 | **zero**; Node ≥ 20.10 |
| Tests | contract tests per channel, 16k-PR CI, lint/type/budget gates | 330 cases in 46 files, real HTTP endpoint pins, 3 jsdom UI batteries, CI matrix on Node 20/22/24 |
| Docs | a full searchable site, 1,335 pages, versioned releases | `docs/` (~20 files) + README |
| Telemetry | version check, opt-out | none at all |
| Release cadence | CalVer, weekly, validation programme | v0.36.0, 21 tags, changelog maintained |

**Where you are genuinely ahead:** the install floor (Node ≥ 20.10 vs ≥ 24.16 — on Termux that is the difference between "installed" and "forum thread"), the dependency surface (zero runtime deps vs a tree that needed a security programme), and telemetry (none vs a version check to turn off).

**Where you are honestly behind:** documentation as a product. Not the *volume* — the *trustworthiness*. `docs/ARCHITECTURE.md` lists `src/providers/gemini.ts`, `anthropic.ts` and `ollama.ts`; none of those files exist. Their docs are generated from the same tree as the code and carry a generated docs map precisely so this cannot happen.

## 2. The one fix that changes everything about tracking

You said you cannot keep track of anything. Part of the reason is that your documents describe a system that partly does not exist — so your mental model and the tree disagree, and every plan is built on a soft map.

**Make the docs a build artifact wherever possible:**

1. **Delete the file-tree section from `ARCHITECTURE.md`** (or generate it). Keep the prose (the design rationale is good); remove the inventory that rots. 1 day.
2. **Add a `docs:check` script** which fails CI if `ARCHITECTURE.md`/`README.md` mention files that do not exist. ~30 lines. This is the census pattern generalised: *if it can rot, it gets a probe.*
3. **Generated command reference**: `termcrab help --all --json` → `docs/CLI.md`. Then per-command `--help` (core lane) automatically documents itself.
4. **One page per surface, not per feature**: install (Termux, Linux, macOS), channels (with the support matrix), tools (with "use it when…"), and troubleshooting (the `doctor` output explained). Their 38 help pages are exhaustive because 2,000 people ask; your four pages can be because you are one person who knows the answers.

## 3. CI, sized for one person

Their CI absorbs 16,000-PR months. Yours should do five things, all cheap:

- build on Node 20/22/24 (already there),
- `npm test` (already there),
- the offline CLI smoke test (already there — keep it, it is the best 10 lines in `ci/github-actions.yml`),
- **`node scripts/census.mjs` and fail on DRIFT** — this is the guard that keeps the tracker honest,
- **`docs:check`** — docs cannot reference files that do not exist.

Two jobs, no matrix explosion, and the project's claims become enforced rather than aspirational.

## 4. Release discipline

Their CalVer + validation programme is overkill for you; the *habit* is not. What is worth copying:

- **A release note a user can act on** ("the agent now remembers what you told it yesterday"), not a commit log.
- **A "Breaking/Changed/Fixed" structure** in `CHANGELOG.md` — yours already exists; keep it.
- **One soak test before a release tag**: 24 hours on a phone with the agent running, one scheduled job, one Telegram conversation, then check the log for restarts, then check `termcrab status` for memory growth. Their `/reference/full-release-validation` shows the industrial version; yours is a checklist of five lines.

## 5. The three sentences to be able to defend

1. "It installs natively on a phone with zero runtime dependencies and runs on the Node you already have."
2. "There is no telemetry, no registry, no lockfile, and the API answers only to a token on the device." *(true after the one-day auth fix)*
3. "Everything the README claims is checked by `census.mjs`; if a claim stops being true, CI fails."

The third sentence is the one that would make this project unusual — and it is the direct answer to the tracking problem that started this whole effort.
