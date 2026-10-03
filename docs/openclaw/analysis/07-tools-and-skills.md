# Tools and skills

**Their pages:** 117 under `/tools` (browser, code-mode, exec approvals, subagents, skills, skill-workshop, TTS, ACP agents, swarm) + 337 under `/plugins` (including 163 generated plugin-reference pages).
**Catalogue:** [`../sections/05-capabilities.md`](../sections/05-capabilities.md), [`../sections/09-reference.md`](../sections/09-reference.md).

## 1. Where TermCrab stands — and it is better than you think

| | OpenClaw | TermCrab |
|---|---|---|
| In-loop tools | ~44 core tools + everything plugins add | **~54** (41 in `src/agent/toolbox.ts` + 13 in `src/agent/tools.ts`) |
| Bundled skills | 49 + 13,000+ in a registry | 5, loadable, user-overridable, OpenClaw-compatible |
| Code execution | QuickJS code-mode with host bindings | Node `vm` sandbox (`tools.ts:509+`), off by default |
| Browser | CDP + Playwright + OAuth flows | CDP-only, needs system Chrome |
| Protocols | MCP **and** ACP | MCP (stdio) — wired at `server.ts:345`, passed into `AgentCtx` |
| Phone hardware | iOS/Android **companion apps** | 15 Termux:API tools in-process |

**The genuinely underrated asset:** those 15 phone tools (`camera`, `location`, `sms_send`, `clipboard`, `battery`, `contacts`, `wifi_info`, `notification`, `screen`, …). They are the only capability in this comparison that OpenClaw *cannot* have on a phone without writing a native app — and they already work. They are buried half-way down `toolbox.ts` and mentioned in one README line.

**The genuinely overrated asset:** tool *count*. 54 tools with vague descriptions perform worse than 25 with good ones, because every tool costs context tokens and every ambiguous name costs a wrong call. Their 44 core tools are curated against thousands of real traces; yours grew feature by feature.

## 2. The skill system is the cheapest capability multiplier you have

A skill is a markdown file with YAML frontmatter. No dependencies, no build, no registry, no security surface. TermCrab's loader already does progressive disclosure (names in the prompt, body on demand via `load_skill`), user overrides, and — uniquely — **imports OpenClaw's SKILL.md folders unchanged** (`src/migrate/openclaw.ts`, `termcrab import openclaw`).

That means their 49 bundled skills are a shopping list you can copy legally (MIT, with attribution). Porting one is an afternoon of reading their skill, rewriting the commands for Termux, and testing it. Fifteen of them is 5–8 days for a visible capability jump that costs nothing at runtime.

**Which to port first (by phone value):**
`github` (issue/PR triage from the phone) · `summarize` · `weather` · `pdf` (document extraction) · `screenshot`/`camsnap` (you already have camera) · `reminders`/`todo` · `tmux` (already native to Termux) · `whisper` (you have offline STT) · `obsidian`/`notion` (note apps) · `spotify`/`hue` (fun, but prove the pattern).

## 3. The gaps that matter

| Gap | Why it matters | Days |
|---|---|---:|
| `ask_user` has no terminal renderer | a clarifying question from the agent dies in the CLI | 2 |
| Tool descriptions are inconsistent | drives wrong tool choice; worth one review pass with the model in the loop | 2 |
| No tool-result pruning | long runs blow the context window; their `contextPruning` shows the shape | 3 |
| Browser needs system Chrome | on Termux this means most users can't use it; either ship a CDP helper script or mark it clearly | 6 |
| `code_exec` is `vm`, not isolated | honest docs first; a real sandbox is 8d and can wait | docs 1 |
| No document extraction | PDFs are how real tasks arrive | 3 |
| Skill gating/allowlists | per-agent skill sets; needed once you have a plugin API | 2 |

## 4. The move

1. **Curate the tool list (2d).** For each of the 54 tools write one sentence: *when* the model should call it. Delete or merge anything without a clear answer. This is a quality change with a measurable effect (fewer wrong calls), not a cosmetic one.
2. **Fix `ask_user` in the CLI (2d)** and make it a first-class pattern in the prompt: agents that ask one good question beat agents that guess.
3. **Port 15 skills (5–8d).** Mark them in the README with the source skill and licence.
4. **Write the phone-tools section of the README (0.5d).** "Your agent can read an SMS, take a photo, check the battery, and post a notification" is the most distinctive sentence this project can say. Put it above the fold.
5. **Add MCP + skills to the docs (1d)** — MCP is wired and undocumented; users cannot use a feature they cannot find.

## 5. Done tests

- `census.mjs` gains a probe per bundled skill, so README counts cannot drift.
- A new user can see, in one README table, every tool with a one-line "use it when…".
- `termcrab import openclaw` followed by `termcrab skills ls` shows their skills loaded, and one of them actually runs on Termux.
