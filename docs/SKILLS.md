# Skills — what wins, and why

A skill is a folder with a `SKILL.md` in it: YAML frontmatter (`name`, `description`)
plus the instructions the agent reads. Nothing is executed, nothing is installed
from a registry — a skill is text the model is allowed to read on demand
(`load_skill`), plus one line in the system prompt's index.

This page is the *contract*: which skill you get when two of them have the same
name, and how to keep the agent away from skills you did not ask for. Both rules
are enforced in `src/skills/loader.ts` and pinned by `test/tier0.test.ts` (10.5) —
if the code and this page disagree, the test fails.

## Where skills live

| Root | Path | Origin label |
|---|---|---|
| Bundled | `<package>/skills/` (shipped with TermCrab) | `builtin` |
| Yours | `~/.termcrab/skills/` (`TCRAB_HOME/skills`) | `user` |

Roots are read **left to right, and later roots win**. That is the whole rule:

- `list()` — one entry per name; the entry that survives is the later root's.
- `get('name')` — searched in reverse root order, so your skill's content is the
  one the model reads when it calls `load_skill name`.
- The prompt index — same list, each line tagged `[builtin]` or `[user]`, so the
  model (and you) can see which one is in play.

Practical consequence: **to customise a bundled skill, copy it into
`~/.termcrab/skills/<name>/SKILL.md` and edit it.** No flags, no priority
numbers; your file simply shadows the bundled one. Delete your folder and the
bundled version comes back.

## The allow-list

```jsonc
// ~/.termcrab/config.json
"skills": { "allow": ["web-research", "daily-briefing"] }
```

- **Empty (the default) means "everything the roots contain is allowed".**
- A non-empty list is an *allow-list*: any skill whose name is not listed is not
  loaded at all — it is not in the index, `get()` returns nothing, and
  `termcrab skills list` does not show it.
- It applies to bundled and user skills alike, and it is the control to reach
  for when you import skills from a git repo or migrate a setup and want to
  decide, by name, what the agent may read.

Set it with `termcrab config set skills.allow '["web-research"]'`, or edit the
file — a running panel picks the change up on the next reload. A bad value is
refused before it is written (`termcrab config set`) or refused before it is
applied (`/api/config`), so the agent never runs on a setting that cannot work.

## Names, and what is silently skipped

- A name must match `^[a-z0-9][a-z0-9-_]{0,63}$`. A folder whose `SKILL.md`
  declares an invalid name falls back to the folder name; if that is invalid too,
  the skill is skipped (and never half-loaded).
- A folder without `SKILL.md` is not a skill.
- A folder whose name starts with `_` or `.` is skipped: those names are reserved
  for skills that are not decisions yet (`_proposals/`) or decisions that were
  made against them (`_rejected/`). A half-written proposal must never reach the
  prompt, and this is the whole mechanism that guarantees it.
- `termcrab skills list` shows what is actually loaded, with its origin — it is
  the same `list()` the prompt uses, so it cannot lie about precedence.

## Skills the agent writes for itself (33.3)

The agent can notice a job it keeps doing by hand and write a skill for it. It
cannot *install* one. `skill_workshop` with `action: "propose"` writes the skill
to `skills/_proposals/<name>/` — SKILL.md plus a PROPOSAL.json holding the
description, the agent's reason, where and when it was proposed. Nothing loads
from there.

You decide, in whichever surface you are already using:

```
termcrab skills proposals                    what is waiting, and why
termcrab skills proposals show <name>        the full text before you decide
termcrab skills proposals approve <name> [--force]   move it to skills/<name>/ — live next turn
termcrab skills proposals reject <name> <why>  keep it out; SKILL.md and your reason
                                             stay in skills/_rejected/<name>/ for the record
```

The panel has the same two decisions (`GET /api/skills/proposals`,
`POST /api/skills/proposals {action: "approve"|"reject", name, reason?}`), and
`termcrab skills proposals --json` is the same list for a script.

Three properties that are on purpose:

- **A proposal never overwrites a live skill by accident.** If
  `skills/<name>/` already exists, approval is refused and says so — read both,
  then `termcrab skills proposals approve <name> --force` to replace it. The
  proposal list marks it `⚠` so you see it before you decide.
- **A rejection is not a deletion.** The text and your reason stay, which is how
  you — and the agent — can tell "we decided against this" from "never seen".
- **The reason is the agent's.** It has to say why, in its own words, and that
  sentence is what you read before approving. A proposal with no reason says so.

## The bundled library

Fifteen skills ship in `<package>/skills/`, and every one of them is a working
instruction sheet for *this* agent on *this* device — no filler, no "insert your
workflow here":

| Skill | For |
|---|---|
| `shell-safety` | what the agent may never run, what needs a yes, what to check first |
| `chat-replies` | how to answer on a phone: answer first, short, no tables in chat, long things as a file |
| `memory-keeping` | search before asking; what belongs in memory and what must never |
| `reminders` | "remind me at 7" → a real cron job, timezone checked, self-contained prompt |
| `daily-briefing` | the morning/evening brief from memory, tasks and the web |
| `evening-review` | the day's wrap-up: done, open, cost, one thing for tomorrow |
| `file-organisation` | what lives where in the home, naming, what is safe to delete |
| `backup-habits` | when to back up, where the file goes, how a restore actually works |
| `secrets-hygiene` | keys never printed, never memorised; what to do when one leaks |
| `doctor-first` | the diagnostic order when something breaks, and how to read the answer |
| `git-habits` | small commits in the owner's repo, and the no-pull-request rule |
| `phone-battery` | battery, heat and mobile data: small jobs, no polling |
| `voice` | speaking replies and dictation on Termux or desktop |
| `termux-api` | notifications, clipboard, battery, SMS, camera through Termux:API |
| `web-research` | researching with `web_fetch`: sources, extraction, synthesis |

Two rules keep this honest:

- **The count is pinned.** `test/skills.test.ts` lists all fifteen; adding or
  removing one without updating the list fails the suite, so the library cannot
  drift silently.
- **The commands are checked.** The same test reads every `termcrab <command>`
  line in every skill and asserts it is a real command in `src/cli.ts`, and that
  the flags the skills lean on (`cron add --deliver`, `sessions purge
  --older-than`, `subagents scratch --prune`, `auth add --provider/--key`) still
  exist. A skill that tells the model to run something that no longer exists is
  a test failure, not a surprise in the chat.

The index in the prompt is one line per skill and nothing else; the agent reads
the body with `load_skill <name>` when it decides a skill applies. To change one
of these, copy it into `~/.termcrab/skills/<name>/` and edit there — your copy
wins.

## Commands

```
termcrab skills list              what is loaded, and from where
termcrab skills show <name>       the skill the agent would actually read
termcrab skills new <name>        scaffold a user skill
termcrab skills import <folder|git-url>   bring skills in (then allow-list them if you like)
termcrab skills proposals [list|show|approve|reject]   the agent's own proposals, waiting for your yes
```
