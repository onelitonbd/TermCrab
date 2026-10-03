# Changelog

## 0.38.0 - 2026-10-03

- **Dangerous tools now ask first.** `exec`, `write_file` and `kill_process` (configurable via `security.approvals`) no longer run on the model's word alone: the loop stops *before* dispatch, raises an approval, and continues only when an answer arrives. `src/core/approvals.ts` finally has call sites — the census row that said "the code exists but nothing reaches it" is gone (**BROKEN 4 → 3**).
- **The question reaches both surfaces.** The panel receives an SSE `approval` frame and renders a card with the tool, its arguments and **Approve / Deny** buttons (POST `/api/approvals/:id/approve|deny`); a page refresh re-lists anything still pending so a gate can never hide behind a reload. The terminal answers the *same* request id: `termcrab approvals list` / `approve <id>` / `deny <id>` (`--json` for scripts) — it talks to the running panel with the same token every other command uses, and says "start the panel" when it is down instead of guessing.
- **A refusal is a normal tool result, and a timeout is a decision.** Denying returns `ok:false` to the model ("the user refused this … do not retry it"), the turn completes, and nothing is executed or written. If nobody answers within `security.approvals.timeoutSec` (default 120 s) the default is deny, with the reason naming the timeout; `onTimeout: 'allow'` can allow it and still labels the decision. Every decision is recorded (`decidedBy: panel | cli | timeout | aborted`), and stopping a run answers any gate it was waiting on, so a stopped run never leaves an approval hanging.
- Tests: **444 cases, 0 failures** (7 new in `test/approvals.test.ts`: gate-before-run, refusal-as-result, timeout default-deny, allow-on-timeout, the real CLI binary answered over HTTP against a live gateway, panel card wiring). Full run ~19 s. Census: **BROKEN 4 → 3**, drift 0, capability 46%, core-lane work left ~18 focused days.

## 0.37.0 - 2026-10-03

- **The session queue is a queue now, not a list.** One lane per session: with two messages posted to the same session, the second **stays `queued`** until the first finishes, and the transcripts can no longer interleave. Before this, both gateway enqueue sites fired the run immediately, so two messages genuinely ran in parallel against one session; `dequeue()` had zero callers and `markRunning()` left the turn in the waiting array, so `queueLength` never dropped.
- **All four queue modes actually work.** `followup` runs messages in order, one at a time. `steer` puts a mid-run message into the **running** turn — same run id, appended to the transcript (a `steer` event reaches the panel), no second turn. `collect` merges a burst of waiting messages into a single extra turn (debounce, so three quick messages cost one model call, not three). `interrupt` cancels the running turn (marked `interrupted`, aborted) and the new one takes the lane. Previously `steer` was an alias for `interrupt` and `collect` did not exist.
- **You can see the truth from both surfaces.** The turn-status endpoint reports the real waiting count; the panel's composer shows a **"N waiting"** chip and, while the agent is working, typing and sending a message queues it (with a per-message badge) instead of doing nothing — the button is Stop only when the box is empty. `termcrab status` asks the *running panel* for live queue state (`/api/status` now carries `queue: {sessions, running, waiting}`) and says "not running" rather than inventing a number.
- **A runaway backlog is refused instead of absorbed.** `MAX_QUEUED_TURNS = 32` per session; the 33rd message gets HTTP **429** with a plain-English reason, so a broken webhook retrying twice a second cannot grow the process without bound.
- Tests: **437 cases, 0 failures** (10 new: order/no-interleave, truthful `queueLength`, all four modes, a steered message inside one real `runTurn`, the cap, and a real HTTP test with a slow upstream proving the second POST waits). Full run ~18 s. Census: **BROKEN 7 → 4** (`session queue`, `queue modes`, `steering` leave the list; drift 0), capability 43% → **46%**, core-lane work left ~23 focused days.

## 0.36.2 - 2026-10-03

- **A competitive plan that starts where the advantage is real.** `docs/openclaw/BEAT-PLAN.md` is the head-to-head against OpenClaw, ordered smallest to biggest: Tier 0 (hours-scale wins, each flipping a tracked row), Tier 1 (the queue/memory/approval defects that would undermine any win), Tier 2 (the phone-native moat), Tier 3 (structural: zero deps, no registry, honest docs), and Tier 4 — the written kill list of things we will not build.
- The plan is precise about the sharpest difference, from OpenClaw's own docs: their Android app is a *companion node* — "Android does not host the Gateway" — so using a phone means running a gateway on a computer. TermCrab's gateway is the phone.
- Claims are checkable by design: `test/beat-plan.test.ts` requires ≥25 numbered beats, an effort and a proof per beat, and every "we are already better" claim to match a real census BETTER row. File references must exist (or be marked planned).
- Tests: **427 cases, 0 failures** (6 new).

## 0.36.1 - 2026-10-03

- **You can now see what is being built, from anywhere.** `WORKLOG.md` is the work tracker: the current batch with each step's status and the test that proves it, what is queued next with sizes, and every finished batch with its commit. `node scripts/status.mjs` prints the same thing in one screen (`--tests` also runs the suite), and the panel has a new **Work** page that renders it.
- **The tracker cannot silently fall behind.** Freshness is computed from git — how many commits landed after the last commit that touched `WORKLOG.md`. Zero is the only healthy number: anything else prints `STALE`, exits non-zero, and fails `test/worklog.test.ts`. No hash to hand-maintain.
- `/api/worklog` is served behind the panel password like every other API route (the tracker is content, not a public endpoint).
- Tests: **421 cases, 0 failures** (8 new for the tracker: file structure, commit-age freshness, token-gated endpoint, panel view wiring); 3 skipped only when a panel already occupies the default port in the test environment.

## 0.36.0 - 2026-10-03

- **The panel password finally does something.** Every `/api/*` route now requires the token when one is configured (`401` + `www-authenticate: Bearer realm="TermCrab"`). The panel notices the 401 and asks for the password in a sheet, stores it on that device and reloads; with **no** password set the loopback-only default is unchanged, so nothing about a local, open panel breaks. `doctor` tells you which of the two you are running.
- **Webhooks got their own key.** `POST /api/hooks/:id` no longer accepts anonymous callers: send `x-hook-token: <hook.token>` (or `?token=`) or get a `401` that names both options. Tokens are compared in constant time, and an unknown hook id is still a `404` so you can tell the two apart.
- **The offline brain is back, and it is a first-class setup again.** Type `mock` answers deterministically with no network and no key and still drives one real tool round-trip, so the quick start, `docs/LAUNCH.md` and the CI smoke test work on a plane. Three ways in: `termcrab onboard --demo`, `termcrab agent "hello" --demo` (one run — this one never writes `config.json`), or the panel's new **Run offline demo** button on the Providers page. `termcrab config set provider.type mock` also sticks now; previously `loadConfig` coerced it back to `openai` and the documented offline path was silently broken.
- The README provider table no longer promises an Anthropic-native adapter that does not exist: legacy names (`anthropic`, `gemini`, `ollama`) are aliases for the OpenAI-compatible wire format, and `mock` is the offline one.
- Panel polish: the mobile browser chrome colour (`theme-color`) now matches the pastel canvas instead of painting a black bar above a light app, and the provider picker consistently says *endpoint* everywhere.
- Config hot-reload is documented as what it is (watch + debounce + merge + provider re-resolve, pinned by a test); the watcher no longer keeps a headless process alive.
- Tests: **413 cases, 0 failures, full run ~18 s** (before this round the suite could not finish in 15 minutes). Census: 149 probes, 0 drift, **7 broken rows** (was 10), capability 43%.

## 0.34.0 - 2026-10-02

- The thinking level picker actually opens now. It was rendered as a plain block at the bottom of the page (its sheet styles were never wired up), so tapping the Think button looked like nothing happened - or pushed the composer around. It is a normal rounded sheet like every other popup, with a dark backdrop; tap outside, press Escape, or pick a level to close it, and focus returns to the button.
- The Think chip in the composer no longer spills its label out of a bare circle. It sizes to its text like the model chip beside it, lights up in the accent colour when a level is active, and drops the "Think:" prefix on narrow phones so the composer row can never overflow.
- The picker says what you are choosing for: it names the model in use and, when that model has no reasoning mode, says so plainly and marks the levels it will ignore ("current model ignores this") instead of pretending they do something.
- Fixed: picking a level used to break plain models. `reasoning_effort` was attached to every OpenAI-compatible request, and non-reasoning models (gpt-4o and friends) reject that parameter with a 400 - so the whole reply failed. Thinking options now go only to models known to accept them.
- Levels are wired through every provider, not just OpenAI-compatible ones: Anthropic gets extended thinking (budget clamped to 32K, max_tokens raised above the budget, temperature left at its default so the call is accepted), Gemini 2.5 gets a thinkingBudget clamped to its 24K ceiling with thought parts kept out of the reply and streamed to the trace drawer, and Ollama reasoning models get `think: true`. Anthropic thinking blocks are stored with their signatures and echoed back on the next turn - required, or the follow-up tool call is rejected.
- The chat page works on an open (no-password) panel: the model chip, its picker and the Providers list no longer sit empty just because no token was stored.
- Only the six known levels are accepted from the UI; a stray value is treated as auto instead of reaching a provider request.
- Tests: 10 new ones pin the capability table, per-provider request shapes (no `reasoning_effort` for gpt-4o, clamped budgets, `think` only for reasoning models), the thinking-block round trip, an end-to-end check that the picked level reaches the real provider request, `/api/config`'s capability block, and the picker markup (modal styles, chip sizing, Escape to close).


## 0.30.4 - 2026-09-30

- The panel can now run with NO password, on request: clear it with `termcrab config set gateway.token ""` and the login screen walks straight in - no gate, no typing. The choice is yours per device.
- The login screen asks the panel first (/api/health now reports whether a password is required) and only shows the gate when one actually is; a stored password from earlier keeps working as before.
- `termcrab config get gateway.token` on an empty password never locks a panel that is deliberately running open: it asks the running panel first. It only creates a password when there is no config yet AND no panel running (the fresh-install dead end from 0.30.3).
- `termcrab gateway` no longer force-creates a password on a fresh home - it starts open on this device and says so in the log. Binding to the network (other devices) still refuses to start without a password, and clearing the password while bound to the network logs a loud warning.
- Doctor: no password on a device-only panel = info ("runs without a login"), no password on a network-exposed panel = warning.
- Tests: 293 total (292 pass, 1 skip) - fresh-open E2E (health says authRequired=false, API answers without a password, config get cannot lock it), deliberate-open stays empty, doctor choice branch, UI gate pin.


## 0.30.3 - 2026-09-30

- Fresh installs are no longer a dead end: `termcrab config get gateway.token` used to print an empty line when no password existed yet (nothing had created one). It now generates a password, saves it, prints it, and says what it did.
- Starting `termcrab gateway` on a fresh home now creates and saves a password first - the panel never runs passwordless, and the startup log shows the generated password.
- Onboarding's next-steps text now points at `termcrab config get gateway.token` for the login password instead of the vague "(token in config)".
- Tests: 290 total (289 pass, 1 skip) - spawn tests prove both fresh-install paths create, save and reprint the same 48-character password.


## 0.30.2 - 2026-09-30

- When the login screen refuses a password, it now says WHY instead of a generic "invalid token". The panel compares what you pasted against the settings file and its own running password, and shows one plain-English line: you pasted only part of the password (it tells you the letter counts), the panel was started before the password changed (restart it), the panel and the settings file disagree (restart it), or simply wrong (run termcrab config get gateway.token).
- `termcrab doctor` now has a "web panel password" check: it asks the running panel if it accepts the saved password, and also notices when the panel is still running an older version than what is installed (the classic "I updated but forgot to restart" trap) - each with the exact fix command.
- Tests: 288 total (287 pass, 1 skip) - new coverage for every refusal explanation, the doctor check, and the hint the login screen receives.


## 0.30.1 - 2026-09-30

- Fixed: the web panel password you get from `termcrab config get gateway.token` could be rejected by a panel that was already running. The gateway used to read its settings once at startup and never again, so a password changed from a terminal (or anywhere outside the running panel) only reached the panel after a restart.
- The running gateway now watches its config file and applies outside changes live - change the password in a terminal and it takes effect within a second, no restart needed. Changes the panel itself makes keep working exactly as before, and host/port still need a restart (the gateway says so when they change).
- `termcrab config get gateway.token` now double-checks itself: right after printing the password it asks the running panel if it accepts it, and prints one plain-English line - "ok: the running panel accepts this password", a warning that the panel is using a different password (with the restart command), or a note that nothing is answering on that port. This is the exact command the login screen tells you to run, so the answer now shows up right where the confusion happens.
- Tests: 286 total (285 pass, 1 skip) - new end-to-end test proves an on-disk password change is accepted without a restart, the old password stops working, and the self-check reports ok/mismatch/offline correctly.


## 0.30.0 - 2026-09-30

- Settings page rebuilt from scratch: a hero "Control room" header, then six grouped cards in plain language (Your crab, AI brain, On-device, Doors & keys, Daily rhythm, Housekeeping) instead of one flat wall of config keys.
- Every value now gets the control it deserves: switches for on/off, number fields with units and range checks for minutes/hours/battery, a dropdown for the AI service, hidden password fields for secrets, comma-separated lists for allowlists - and the raw dotted key survives only as a hover tooltip for power users.
- Save feedback happens on the page itself: a small green "Saved" badge fades in next to the row (red for failures, with the toggle rolling back) - no more chat messages for a settings click. Invalid numbers are refused locally before anything is written.
- Agents moved into the same visual language as one titled card; the create/edit flow keeps every existing id and behavior. The welcome banner now points at the new sections.
- Browser-level verification: 22/22 checks (grouping, controls, save payload, validation, agents, zero JS errors); suite 285 tests (284 pass, 1 skip).


## 0.29.0 - 2026-09-30

- Telegram can control the brain now: `/provider` lists every saved provider (keys, model count, the one in use) and `/provider 2` (or a name/id) switches - endpoint, key and a sensible default model move together, saved to disk so it survives restarts.
- `/model` shows the models of the active provider - saved ones first, then the live catalog fetched on the spot when nothing is saved (marked "new", saved automatically on pick). Choose with a number, the exact id, or a unique substring; builtin providers accept any typed model id.
- Refusals always explain: no key saved, ambiguous name, out-of-range number - each answer reprints the menu instead of guessing.
- Shared provider helpers (endpoint/key resolution, catalog fetch) moved to src/gateway/provider-helpers.ts, used by both the HTTP API and the chat picker.
- Tests: 284 total (283 pass, 1 skip) - 20 new covering menus, switching, persistence, catalog fetch and error paths.


## 0.28.0 - 2026-09-30

- The model now knows which channel it is replying on: every turn sends a "Current channel" note (web, Telegram, WhatsApp, terminal TUI, voice, cron, heartbeat, dream, subagent) with channel-specific formatting guidance - Telegram gets phone-friendly simple markdown, voice replies stay plain speakable text, the web panel keeps full markdown.
- Telegram replies render real markdown now: bold, italic, strike, inline code, fenced code blocks with language, headings, bullet and numbered lists, quotes, links (safe schemes only) and tables as monospace blocks - translated to exactly the tags Telegram understands, everything else escaped.
- Delivery safety: if Telegram rejects a translated chunk, it is retried as plain text so a reply is never lost to a formatting edge case; offline outbox entries are translated on flush.
- Tests: 265 (264 pass, 1 skip) - 19 new ones covering the converter, the plain-text fallback, and channel-aware prompting.


## 0.27.0 - 2026-09-30

- Chat header, sidebar history, session picker, and the Tools > Chats list now show a distinct icon per session source (Web, Telegram, WhatsApp, Schedule, Subagent, Dream, Heartbeat) followed by a friendly name - raw `web:` / `telegram:` prefixes are never rendered.
- Every toolbox tool has its own icon. When the agent calls a tool, the live line shows the icon, the tool name, and a small argument preview; completion or failure appears as a separate status badge appended without clearing the line.
- History reload now re-renders stored tool calls from the session JSONL (with done status rebuilt from tool entries), so tool lines survive a page refresh and a full gateway restart - everything derives from stored session data plus static icon maps.
- 246-test suite green (245 pass, 1 skip); browser-level verification: 32/32 checks on a fresh load and again after a gateway restart.


## 0.26.0 — 2026-09-30 (Every catalog tool is now real)

All 33 "planned" entries from the toolbox catalog are implemented, tested one by one, and now show green "active" badges:

- File & Web: edit (exact replacements with guard rails), apply_patch (unified diffs with context checks), web_search (DuckDuckGo results with titles/URLs/snippets), view_image (real format/dimension/size inspection).
- Shell & Process: exec can run in the background; process lists/kills/reads those runs; terminal keeps interactive shell sessions (spawn/read/write/close over pipes).
- UI & Automation: screen reads a device status snapshot or pushes a notification; automations manages scheduled jobs plus one-shot reminders (they auto-disable after firing); dashboard turns homepage widgets (hero, chips, progress, tasks) on/off from the agent; portal exposes a local HTTP server through a token-gated /portal/<id>/ proxy.
- Messaging & Sessions: conversations_list/send/turn work over a real conversation registry wired into telegram and whatsapp (turn waits for the correlated reply); sessions_list/history/search/send, session settings (info/reset/delete/rename/set_owner) and session_status all run on the live session store.
- Subagents: sessions_spawn runs prompts in background sessions; subagents reports status; agents_wait blocks for outputs; sessions_yield ends the turn while tasks keep running.
- Session & Agent Management: ask_user pops a question in the UI and waits for the operator's answer; suggest_task/dismiss_task drive new suggestion cards above the composer (with live updates over SSE).
- Memory & Context: intent manages standing directives injected into every system prompt; create_goal/get_goal/update_goal track progress and open goals appear in the prompt too.
- Skills & Configuration: skill_workshop creates/checks/repairs skills; github_identity_status reports gh auth + git identity; secrets stores credentials with metadata-only listings and an audit log.
- Progress: progress_card maintains a todo/doing/done card shown live above the composer.
- New operator endpoints: /api/tasks, /api/ask (list + answer), /api/progress, /portal proxy — all token-gated.
- Suite: 245 tests green, including 26 dedicated toolbox tests covering every new tool.

## 0.25.1 — 2026-09-30 (Tools pane toggle fix)

- Fixed: switching to Jobs/Chats/Voice/Skills now hides the Tools catalog pane (the new pane was missing from the tab switcher's list, so it stayed on screen underneath).
- Regression pin added so this exact slip fails the suite next time.

## 0.25.0 — 2026-09-30 (Tools catalog tab)

- The Tools page now opens on a new first tab named "Tools": a full catalog of the agent's toolbox, grouped exactly as requested — File & Edit, Shell & Process, Web, UI & Automation, Messaging & Sessions, Session & Agent Management, Memory & Context, Skills & Configuration, Progress, Utilities.
- Every entry shows a status badge: "active" (green) tools are confirmed live by the new GET /api/tools endpoint straight from the device's real tool registry; "planned" entries are on the roadmap and honestly marked as not built yet.
- A fifth status chip ("Tools") shows the live tool count, and the chip row now fits five boxes on wide screens.
- Extra current tools (list_dir, remember, load_skill, get_time) were folded into the matching groups so the catalog always reflects the whole live registry; any future tool not in the catalog gets appended automatically under "Current tools".

## 0.24.0 — 2026-09-30 (Tools page redesign)

- Tools no longer opens as four collapsed drawers: it now follows the Memory-page look — title, a purple Toolbox hero with a big toolbox mascot, a Refresh button, and four live status chips (jobs, chats, skills, wake) that fill in as data loads.
- Four tabs — Jobs, Chats, Voice, Skills — replace the closed panels. Each tab loads its own data the moment it opens, and entering Tools refreshes everything at once.
- Voice is grouped into labelled cards (speak & dictate, startup, wake loop) instead of one bare pile of buttons.
- The add-job form gets its own bordered card with a plain-language note on cron formats; chats and skills get matching action cards under their lists.
- Every existing control keeps working: add/pause/run/delete jobs, export/rename/purge chats, say/dictate/start-at-boot/wake-loop, skill import and view.

## 0.23.1 — 2026-09-30 (No more silent empty replies)

- If the model sends back nothing, Crabby now retries once — and if it's still empty you get a clear red notice ("[empty reply] …") instead of a blank bubble with no explanation.
- Empty-reply notices are styled as errors in the chat, live and on reload, so failures are visible at a glance.
- The token-limit case is called out specifically (the model ran out of reply space before writing anything).
- Blank assistant messages from earlier bad runs are never sent back to the model provider — they used to break the next message on strict providers.
- The chat UI's bare "(empty reply)" placeholder is gone; the fallback text now says what happened and where to go (Providers).

## 0.23.0 — 2026-09-30 (Homepage becomes the agent's home)

- Empty state is now a real hero: a large floating crab mascot with a soft glow, a greeting, a live status pill (brain, memory count) and one-tap suggestion chips — two start a chat, two jump to Status/Providers. It disappears the moment the conversation starts.
- AI replies now carry a small "CRABBY" identity line above them (follows the active talk-as agent).
- A thinking indicator (bouncing dots + "Crabby is thinking…") shows while a reply is coming; the status pill and the stop button pulse gently while busy.
- Sidebar gets a brand block on top; nav rows are rounder pills; the header status is now a compact green-dot pill instead of raw text.
- Composer gets depth: a fade into black, and a blue focus glow when writing.
- First-run welcome moved into the hero (same guidance, same buttons); the random "connected" system line is gone.

## 0.22.0 — 2026-09-30 (Memory page redesign)

- The Memory page is rebuilt around four tabs — Overview, Memories, Dreams and Settings — with a proper page title and description instead of one collapsed panel.
- **Overview:** a hero status card (crab mascot, "Memory is awake", live engine line, Refresh button), four stat chips (facts, index, daily files, size), a real Sleep Schedule card showing when the next dream sweep runs and whether it is on, and a short "How dreaming works" explainer.
- **Memories:** focused search with results shown as clean cards (file chip + score + line), plus a quick "Remember a fact" box with inline confirmation.
- **Dreams:** status bar with live pill (DREAMING ON/OFF), and three sub-tabs — Scene (a night scene with moon, sleeping crab and the live sweep status), Diary (the dream history), and Advanced (turn dreaming on/off, set the interval, run a dream now — everything saves instantly, no restart).
- **Settings:** engine segmented control (hybrid search vs lexical only) writing live to config, and the full MEMORY.md editor with save confirmation.
- No fake features: every number, schedule and toggle comes from the real backend.

## 0.21.2 — 2026-09-30 (The model icon is actually visible now)

- Fixed a stylesheet clash that squeezed the composer's model button down to a bare circle: the label spilled out next to it and the sparkle icon was pushed out of place, so it looked like plain text with no icon. The pill now sizes itself correctly and the icon shows in blue.
- The model selection popup itself now has icons too: a sparkle in the title and a small sparkle beside every model in the list — no more text-only rows.

## 0.21.1 — 2026-09-30 (Model saving actually reaches the backend)

- Fixed the save bug: the Models page sent its save requests in a shorthand the browser helper did not understand, so they quietly went out as read-only requests — the page said "saved" but nothing was written, and a refresh lost everything. All save requests now go out correctly.
- Ticking a model now saves it to the backend straight away; the Save button retries anything that failed and confirms with a fresh read from the backend — after saving, the page always shows exactly what the system holds on disk.
- If a save cannot reach the backend, the row says so plainly and keeps your tick so one press of Save retries it.
- New regression test: everything ticked is written to the config file and still there after a full restart.

## 0.21.0 — 2026-09-30 (Save button + modern model icon)

- The Models page now has a **Save** button: tick the models you want, then press Save — everything marked is written to the system instantly, with a confirmation that it is ready to use right away (no restart). The button shows how many changes are waiting, e.g. "Save (3)", and unticking a saved model removes it on Save too.
- Fetch is now an outline button so Save stands out as the main action.
- The composer's model button got a modern sparkle icon instead of the old cube.

## 0.20.1 — 2026-09-30 (Current provider shows your own name)

- When the provider in use matches a saved entry, the system now displays the name you gave it on the Providers page (instead of the raw address), everywhere the current provider is shown.

## 0.20.0 — 2026-09-30 (Models page + composer model picker)

- New **Models** sidebar page: pick a provider, press **Fetch** to pull that provider's full model list into a scrollable area (with a search box to filter), and tick the models you want. Every tick saves the model to the system instantly; unticking removes it.
- New rounded **model button** in the composer next to the attachment button. It always shows the model in use; tapping it opens a popup where you pick a provider and then one of the models you saved — the chat switches to it immediately, no restart.
- The picker only offers models you ticked on the Models page, so the system never points at something that was not chosen deliberately.
- Fetching uses the provider's saved key (the one in use first) against its OpenAI-compatible `/models` endpoint; clear errors for missing keys, unreachable services or refusals.
- Provider rows show how many models are saved; everything (registered lists, live model, status line) re-reads the live configuration on every open.

## 0.19.0 — 2026-09-30 (Black theme, smarter composer, icon sidebar)

- The send button now turns into the stop button while a reply is coming in: the paper plane swaps to a red stop square, one click stops the reply, and it flips back when done. The separate stop button is gone.
- The whole app moves to a true black theme: pure black background everywhere, faint dark-grey surfaces and borders, brighter text — easy on the eyes and on OLED screens.
- Every sidebar item (Status, Providers, Memory, Tools, Settings) now shows a clean line icon next to its name.

## 0.18.0 — 2026-09-30 (Providers stay in sync)

- The Providers list now always shows what the system is actually using: saved providers get an "in use" badge, and when the current provider was set outside the page (from the terminal — onboard, config set) it still appears at the top with the badge, named after its service (OpenAI, OpenRouter, Groq, Ollama…).
- Matching is exact: same address plus same key when a key is saved; same address alone when the key came from the terminal.
- Deleting the saved entry never breaks the live connection — the current provider simply reverts to its always-visible top row.
- The list refreshes every time the page opens, so it can never show a stale state.

## 0.17.0 — 2026-09-30 (Composer + Providers)

- The message box is now a rounded two-layer composer: your text on top, rounded icon buttons below — attach (text files), stop (end a reply mid-way), send.
- New **Providers** section in the sidebar (the old setup wizard is retired into it). Only OpenAI-compatible services are supported — the other provider choices are gone.
- Providers page: name plus back button, a + in the corner to add a provider (popup: name + base URL). Saved providers appear as a list.
- Tapping a provider opens its keys page: the provider's name as the page title, + in the corner to add an API key (popup: key name + key). Multiple keys can live side by side.
- Each key can be used (makes it the one the crab talks with) or deleted; keys are always shown masked and never leave the device.
- Nothing on these pages starts or connects by itself — pages and popups only appear when you click them.

## 0.16.0 — 2026-09-30 (GitHub dark + real markdown)

- The whole interface now uses GitHub's default dark theme: canvas #0d1117, hairline #30363d borders, off-white text, blue accents and links, green primary buttons — the exact palette GitHub uses.
- AI replies now take the full width of the screen instead of sitting in a small bubble, following the way chat apps design for phones in 2026.
- AI replies now render proper markdown: headings, bold, italic, strikethrough, bullet/numbered/task lists (nested too), quotes, tables (scroll sideways on phones), horizontal rules, links and images, inline code, and fenced code blocks with a language label and a one-tap Copy button.
- Markdown is re-rendered live while the reply is streaming in — no layout jump when it finishes.
- Research applied for phones: small heading sizes that never overpower the answer, 15px body with roomy line height, tables and code blocks scroll horizontally instead of breaking the layout, links are underlined and tappable, and everything the AI writes is escaped first so no injected HTML can ever run.

## 0.15.1 — 2026-09-30 (Update yourself, part 2)

- When there is no internet, the update buttons now say "no internet connection" instead of the raw internal error text.

## 0.15.0 — 2026-09-30 (Update yourself)

- New **Auto update** button on the Status screen, right next to Check for updates. One tap downloads the new version, installs it, and restarts the server by itself — the page reloads when it is back.
- Progress is visible while it works (downloading, installing, preparing, restarting), and if anything goes wrong it says so and keeps running the old version untouched.
- Fixed slow shutdown: closing the server used to wait forever for open browser tabs. Ctrl+C now stops the gateway in well under a second, even with the control UI open (a hard 3-second cap guarantees it).
- Under `termcrab supervisor`, an auto-update simply exits cleanly and the supervisor starts the new code.
- The Status screen's help text no longer mentions bottom tabs (removed in v0.11) and the CLI update message now points at the Auto update button.

## 0.14.0 — 2026-09-30 (Chat front and center)

- The sidebar no longer lists Chat as a section — the chat is the home screen, not a menu entry.
- A plus button now sits beside the "Chat history" heading: one tap starts a fresh chat, lands you in it, and puts the cursor in the message box.
- First launch after entering the passcode now opens and loads the current chat automatically — no more picking a session from the list to get started.
- A brand-new chat stays selected (and shows in the sidebar) even before its first message is sent.

## 0.13.0 — 2026-09-29 (Every screen has its own address)

The control panel now works like a real multi-page app: each screen, and
each conversation, lives at its own URL you can bookmark, share, or put in
a browser's back/forward history.

### Page routes
- `/` or `/chat` — the chat screen (main conversation)
- `/status` — health, doctor, updates
- `/memory` — search, facts, dream history
- `/tools` — schedules, saved chats, voice, skills
- `/settings` — settings and agents
- `/chat/<conversation-id>` — opens that exact conversation
  (e.g. `/chat/web:main`)
- Switching tabs or opening a conversation updates the address bar;
  browser back/forward walks through screens and chats; a fresh load of
  any address lands on the right screen
- Server change: any unknown page address serves the panel (single-file
  UI routes on the client); unknown `/api/*` paths stay JSON 404 and
  non-GET stays plain 404
- Tests: 157 total (156 pass, 1 environment skip), including live checks
  that all six page routes return the panel and API 404s stay JSON

# Changelog

## 0.12.0 — 2026-09-29 (Three-dot menu, current-chat in the top bar)

Top bar cleaned up per its owner's instructions.

### Top bar
- **Online/offline pill removed** — the header no longer shows connection
  text; the Status screen still reports live state when you want it
- **Three-dot menu (top right)** replaces it, listing the four controls:
  - Talk as — pick the agent/personality (the old "default" dropdown)
  - Reset — clear the current conversation
  - Check in — run a self-check (heartbeat) right now
  - Dream — consolidate recent chats into long-term memory now
  Each action closes the menu and takes you to the Chat screen so you see
  what happened; clicking anywhere outside closes the menu
- The line under the title now shows **which chat you are in**
  ("Chat: web:main") instead of the model/provider string
- The chat toolbar row is gone (its four controls moved into the menu);
  the chat screen now starts directly with the conversation
- Session picker kept as a hidden state holder — the sidebar history and
  saved-chat tools still drive it

### Tests
- 156 total, 155 pass, 1 environment skip; 12/12 served-page checks:
  menu, four items, pill/chatBar/provider-string removed, chat-label helper,
  zero emojis

# Changelog

## 0.11.0 — 2026-09-29 (Sidebar navigation + chat history)

Bottom tab bar is gone — the panel now navigates the way OpenClaw's Control
UI does: a left sidebar, with your chat history living inside it.

### Layout
- **Left sidebar**: Chat · Status · Memory · Tools · Settings, active item
  marked with the coral indicator (OpenClaw's active-nav treatment)
- **Chat history section** under the nav: every conversation with message
  count and date, newest first; tap one to open it (it loads into the chat
  screen and the active-chat marker follows)
- **Phones**: the sidebar becomes a slide-in drawer from the left — hamburger
  button in the top bar, dimmed backdrop to dismiss, drawer closes when you
  pick a destination (same pattern as OpenClaw's mobile shell)
- Desktop: sidebar always visible; content column caps at 780 px and centers
- Token gate and wizard sheets stack above the drawer
- Bottom rail removed; everything else (tokens, zero emojis, zero deps)
  unchanged

### Tests
- 156 total, 155 pass, 1 environment skip; served page verified: sidebar,
  history renderer, drawer toggle present; bottom rail absent; zero emojis;
  no undefined CSS variables; JS syntax clean

# Changelog

## 0.10.0 — 2026-09-29 (OpenClaw look, TermCrab soul)

Reskinned the control panel to the OpenClaw Control UI's own design system,
pulled from their published `ui/docs/design-system/color-tokens.md` — exact
tokens, not eyeballing. Structure stays TermCrab's mobile shell; the visual
language is now the one OpenClaw users know.

### Look (OpenClaw token family, dark)
- Page `#0e1015`, nav chrome `#13151b`, cards `#161920`, elevated sheets
  `#191c24`, fills `#1f2330`; borders `#1e2028` / `#2e3040`
- Text `#bcbcc0` body, `#f4f4f5` strong, `#8b8b94` muted (their AA-audited set)
- Coral accent `#ff5c5c` for focus rings and the active tab indicator;
  filled actions `#d13c3c` (their primary, AA on white ink); teal `#14b8a6`
  for schedules and dream dates
- Semantic chips: ok `#22c55e`, warn `#f59e0b`, fail `#f87171`,
  info `#60a5fa` (doctor results)
- Their spacing/radius scales (4-40 px, 6/10/14/20) and their focus-ring
  recipe; 58 px top bar per their mobile layout rules
- Health pill mirrors their gateway "Health OK" indicator (green dot)
- Crab line art follows the coral brand color
- Still: zero emojis, bottom tab rail, bottom sheets, 16 px inputs,
  reduced-motion honored — 0.9.0 structure untouched

### Tests
- 156 total, 155 pass, 1 environment skip; served page scanned: zero emojis,
  no undefined CSS variables, JS syntax check clean

# Changelog

## 0.9.0 — 2026-09-29 (Mobile control panel, redesigned)

The web panel was rebuilt as a phone-first interface, following Anthropic's
frontend-design guidance (distinctive, not templated) and one hard rule from
its owner: **no emojis anywhere**.

### Redesigned
- **Bottom tab navigation** — Chat · Status · Memory · Tools · Settings; one
  screen at a time, all controls in the thumb zone, 44-48 px targets,
  safe-area aware (notch/bottom-bar friendly)
- **New look** — light "shore station" theme: cool mist base, deep sea-ink
  station-plate header with live status, one sea-green accent; sentence-case
  copy throughout, hairline structure instead of floating cards
- **Chat screen** — agent + chat pickers and Reset / Check in / Dream live in
  a top row; composer sits right above the tab bar; messages use ink (you)
  vs enamel (crab) bubbles
- **Sheets** — token gate and setup wizard slide up from the bottom like
  native mobile sheets
- **No emojis** — every icon-emoji in buttons, status lines and messages was
  replaced with plain words; doctor results use colored pass/warn/fail chips;
  the crab logo is now clean line art (SVG)
- Actions started in Tools (dictate, wake command, run job, export, rename,
  clean old) jump to the Chat screen so you see the result
- Focus-visible outlines, reduced-motion respected, 16 px inputs (no mobile
  keyboard zoom), single-file UI with zero dependencies (unchanged)

### Fixed along the way
- Settings rows wrap correctly on narrow phones (no horizontal scrolling)

### Tests
- 156 total, 155 pass, 1 skipped (live whisper check — engine assets absent in
  this environment); UI verified by ID-wiring check, JS syntax check, emoji
  scan of the served page, and all panel endpoints returning 200

# Changelog

## 0.8.0 — 2026-09-29 (Voice memos & verdicts)

Closes the v0.5 P2 spike round: one keeper shipped, three honest verdicts.

### Added
- **`termcrab transcribe <file>`** — turn a voice recording into text, fully
  offline, via whisper.cpp if you have it (spike #11 keeper). Measured: 10.5 s
  sample → word-perfect text in 1.1 s (~9× realtime, tiny model). Auto-finds
  the engine (`whisper-cli` on PATH or `~/whisper.cpp/build/bin`) and model
  (`~/models/ggml-*.bin`, tiny preferred; `--model` to point anywhere).
  Missing pieces → exact install steps, never a stack trace
- Doctor: **file transcription (whisper)** check (engine+model / what's missing)
- `voice` skill: knows `termcrab transcribe` for audio-file requests

### Docs
- **CONTRIBUTING.md** — house rules + the ONE-TIME human step to enable CI
  (bot tokens can't push workflow files; prefilled link included)
- **docs/SPIKES.md** — all four P2 verdicts with evidence: whisper ✅ shipped,
  wake word ❌ killed (onnxruntime ≈300 MB + no phone to measure battery),
  Signal ⏸️ still deferred (policy/ban risk, not packaging), CI 🔶 one click away
- Roadmap (docs/V05.md): P0 ✅ P1 ✅ P2 decided

### Tests
- 156/156 (4 new: model preference + friendly errors + fake-engine behavior +
  live JFK transcription where the engine exists)

# Changelog

## 0.7.0 — 2026-09-29 (The nice-to-haves)

Completes the v0.5 P1 block ("oh, nice") — five quality-of-life upgrades.

### Added
- **💤 Dream history** — Memory panel shows when your crab last "dreamed" and
  what it learned (every `dream:` line from the daily logs); `termcrab dream
  --history` prints the same from the terminal
- **🗂️ Chats panel** — see every conversation with size + date; **export** any
  chat as a readable Markdown file (download or `termcrab sessions export`),
  **rename** it, **clean out** chats older than N days to free space
  (`termcrab sessions ls|export|purge|rename`; purge really deletes,
  unlike reset which only renames)
- **✨ `termcrab skills new <name>`** — writes a working SKILL.md skeleton the
  loader picks up immediately (validated in tests)
- **👥 Agent starter templates** — `termcrab agents new <name> --template
  brief|teacher|researcher` and a template dropdown when creating agents in
  the panel
- **🧠 `termcrab embeddings status|setup`** — plain-English state of smart
  memory search + guided setup (installs the optional package, fetches the
  ~23 MB model, verifies a 384-dim probe; offline = drop-in folder instructions)
- **📡 `docs/REMOTE.md`** — Tailscale / Cloudflare tunnel / SSH recipes with a
  hardening checklist and an explicit "what NOT to do" (no bare public IPs)

### Tests
- 152/152 (24 new: session export/purge/rename round-trip, scaffolds accepted
  by the real loader, embeddings setup paths incl. failure messages, dream
  history parsing, gateway routes for all of the above)

# Changelog

## 0.6.0 — 2026-09-29 (You're in the driver's seat)

Completes web control parity (P0 #0, phase 3): every CLI control now has a
button in the panel.

### Added
- **Wake loop in the panel** — 👂 Start/Stop from *Voice & boot*; live events
  (keyword heard → command → reply) stream into the chat as they happen.
  No mic? Type the command in the box — same state machine, no Termux needed.
  (`GET/POST /api/wake/start|stop|feed`, service runs inside the gateway)
- **Setup wizard** — 🧙‍♂️ three plain-language steps (brain → name → telegram)
  in the panel; applies everything `termcrab onboard` does, seeds the
  workspace, never echoes your API key back. Reachable from the welcome card
  and the start-here panel.
- **"Check for updates" button** — ⬆️ in the start-here panel: asks GitHub,
  reports "you're on the latest (vX)" or the upgrade command. Still never
  auto-updates. (`POST /api/update`)

### Tests
- 128/128 (new phase-3 suite: wake state machine over HTTP with reply event
  on the bus, friendly no-mic answers, idempotent stop, update shape,
  wizard apply/persist/mask + mock reset)

## 0.5.0 — 2026-09-29 (Bring your old setup)

### Added
- **`termcrab import openclaw`** — one command that brings an old OpenClaw setup over:
  personality files (SOUL/IDENTITY/USER/AGENTS/TOOLS) merged into TermCrab's `SOUL.md`,
  memory (daily logs, topic folders, MEMORY.md lines — no duplicates), skills
  (`skills/<name>/SKILL.md`), named agents, and a best-effort config mapping
  (heartbeat, WhatsApp/Telegram allow-lists, gateway port, model/provider/API key)
  with an **unmapped-keys report** so nothing is silently dropped
- **Preview first** — running it without flags only shows the plan (what will be set,
  what keeps your current TermCrab value, what's absent); nothing is written until
  you re-run with `--apply` (and `--force` to replace existing files)
- **Secrets stay hidden** — API keys and tokens are masked (`•••`) in every report
- `--from <dir>` to point at a non-default OpenClaw home (default `~/.openclaw`)
- Doctor-free by design: preview doubles as the safety check

### Tests
- 121/121 (new: migration suite — JSON5-ish parse, preview writes NOTHING,
  apply round-trip moves personality/memory/skills/agents/config, secrets never
  printed, idempotent second pass)

## 0.4.4 — 2026-09-29 (Talk to it)

### Added
- **Dictation in the panel** — 🎤 *Listen* button: tap, speak, words land in the chat box
  (`POST /api/listen`, one-shot `termux-speech-to-text`, 30s timeout; missing tool or
  silence return friendly messages, never HTTP errors)
- Doctor: **voice input (dictation)** check (ok / install hint for Termux:API)

### Changed
- **`install.sh` is now a true one-command install AND upgrade** — re-running it upgrades
  in place ("installed/upgraded 🦀 (vX)"), drops the `termcrab` command into `$PREFIX/bin`
  on Termux (no PATH editing) with `~/.local/bin` fallback elsewhere, prints next steps
  (`onboard`, `status`)

### Tests
- 115/115 (new: dictation suite — never hangs, friendly when tool missing; live API listen route)

## 0.4.3 — 2026-09-29 (Trust & upkeep)

### Added
- **Friendly errors everywhere** — failures now come out as a sentence + a next step:
  "Can't reach the service at 127.0.0.1:54321 — it's not running → start llama-server
  or check the Brain address", bad API key → exact config command, offline → mock mode,
  blocked ports, TLS/proxy inspection, missing termux tools, missing npm packages.
  Technical details hidden (TCRAB_DEBUG=1 reveals them)
- **`termcrab update`** — asks GitHub for the newest release; tells you the upgrade
  command (never auto-updates). Offline = calm message, no drama. Optional startup
  check (`update.checkOnStart`, editable in Settings) + in-panel notice via SSE
- **`termcrab doctor --share`** — copy-paste diagnostic block for asking help:
  checks + environment only, key/token-shaped strings scrubbed ("secrets: none included")
- **First-run welcome card** — when no real brain is configured, the web panel opens
  with a 2-step "wake your crab" guide + button straight to Settings (`GET /api/setup`)

### Changed
- Agent error channel preserves the underlying cause (was: bare "fetch failed")
- `termcrab help` lists `update` and `doctor --share`

### Tests
- 112/112 (new: update semver/network-stub suite, friendly-error suite, share-report scrub suite)

## 0.4.2 — 2026-09-29 (Made for humans)

Plain-language pass over **both** interfaces — built for the owner first, coders later.

### Added
- **`termcrab status`** — one-screen, plain-English overview: brain, web panel, chat apps,
  memory facts, self-check schedule, dream times ("last: Tue 11:16 · next: Wed 11:16"),
  battery, agents — plus pointers to the two commands worth running next
- **"How this works (start here)" panel** in the web UI — live status strip (awake · brain ·
  facts · next dream) + a human explanation of every panel
- **Plain-English Settings** — every config key shows a human name and one-line explanation
  (technical key shown underneath: transparency, no hidden magic)
- **Friendly event messages** — dream/check-in skips now read as sentences
  ("already dreamed recently — next attempt in about 24h" instead of a raw code)
- **Web control parity (phase 1+2)** — every CLI control reachable from the UI:
  `GET/POST /api/config` (secrets masked), `POST /api/doctor`, `GET /api/status`,
  memory search/remember/edit, skills show/import, agents CRUD + active-for-chat,
  `POST /api/say`, `GET/POST /api/boot[/install]` — 11 routes + 6 panels + live-server tests
- **`termcrab help` rewritten** in plain words: "Start here (the 5 commands most people
  ever need)" first, examples in human sentences

### Tests
- 101/101 (new: status report suite + first live-server API suite)

## 0.4.1 — 2026-09-29 (Embeddings taste-tested)

### Added
- **Offline model drop-in** — embedder now resolves `~/.termcrab/models/Xenova/all-MiniLM-L6-v2/`
  from disk before any Hub request (manual installs on flaky networks; sandboxed/air-gapped boxes)
- **Launch kit hardening** — direct HN/Reddit submit links + pre-flight commands in `docs/LAUNCH.md`;
  HN title shortened to 69 chars (limit 80); `docs/V05.md` v0.5 scope

### Changed
- Embedding model dtype `fp32` → **`q8`** (~23MB vs ~90MB: faster phone download,
  ~4× less RAM, negligible retrieval-quality loss for cosine memory search)

### Verified (real end-to-end)
- `@huggingface/transformers` + quantized MiniLM (384-dim) → hybrid search: semantic
  query "which code editor does he like" ranks `[vector] preferred editor is neovim…` #1;
  doctor `2 vector(s) indexed`; `/api/memory` `{enabled:true, vectors:2}`

## 0.4.0 — 2026-09-29 (Smarter Crab)

### Added
- **Tiered inference** — optional `localProvider` config block (OpenAI-compatible
  endpoint: llama.cpp / Ollama / llama-server) + `--tier local` on `termcrab agent`
  and `RunOpts.tier` across channels; lightweight tasks route on-device with
  automatic fallback to the main provider
- **"Dreaming" memory consolidation** — `termcrab dream [--force]`, hourly gateway
  scheduler gated on `dream.enabled` + `everyHours` + battery + "anything new?"
  checks; distills recent session transcripts into durable MEMORY.md facts using
  the local tier when configured; `POST /api/dream` + 💤 button + SSE `dream` event
- **Hybrid embedding search** (optional) — `npm install @huggingface/transformers`
  activates `memory/index.jsonl` vector indexing; `MemoryStore.search()` now merges
  semantic hits (cosine-scored) with lexical matches — **breaking:** `search()` is
  async; without the package everything stays lexical/zero-dep
- **Voice wake loop** — `termcrab wake [--keyword <word>]`: two-phase STT session
  (keyword arms it, next utterance is the command, reply is spoken via TTS chain);
  honest scope: `termux-speech-to-text` loop, not an always-on DSP wakeword
- **Launch kit** — `docs/LAUNCH.md`: Show HN post, r/termux post, 5-minute demo
  script, posting checklist
- Doctor: local model tier, dreaming, and embeddings checks; `/api/memory` reports
  vector index stats

### Changed
- `AgentCtx.localProvider` + tier routing in `runTurn`; dream/heartbeat power
  budget shares `heartbeat.pauseBelow`

## 0.3.0 — 2026-09-29 (Where The Users Live)

### Added
- **WhatsApp channel** — optional Baileys extension (core stays zero-dependency):
  QR pairing in terminal, secure-by-default allowlist (channel off until configured),
  `/new` `/status` `/agents` commands, outbox fallback, graceful "npm install baileys" hint
- **Multi-agent profiles** — named agents as `workspace/agents/<name>/SOUL.md`;
  route with `@name` prefix (Telegram/WhatsApp), `termcrab agent --as <name>`,
  REPL `/as` + `/agents`, `POST /api/chat {agent}`, `GET /api/agents`
- **Cron management UI** — list/add/pause/run/delete schedules from the control panel
- **Voice** — `termcrab say <text>` (termux-tts-speak → espeak-ng → espeak → spd-say → say)
  + `voice` skill for dictation loops (`termux-speech-to-text`); doctor checks
- **Local model docs** — `docs/LOCAL.md` (llama.cpp / Ollama via OpenAI-compatible endpoint)
- Doctor: whatsapp + TTS checks

### Changed
- Outbox is now per-channel (`telegram` / `whatsapp`) with independent flushers

## 0.2.0 — 2026-09-29 (Daily Driver)

### Added
- **Streaming responses**: SSE token streaming for Anthropic + OpenAI-compatible
  providers, delta events → typewriter UI and live terminal output; automatic
  fallback to non-streaming when a stream dies before any output (`provider.stream=false` to disable)
- **Cron scheduler**: dependency-free 5-field cron (`*`, `-`, `/`, lists, `@daily` etc.)
  with `termcrab cron add|ls|rm|on|off|run`, next-run previews, battery-aware skipping,
  gateway loop (20s resolution) and REST API (`/api/crons`)
- **Skills importer**: `termcrab skills import <folder|git-url>` — drop-in compatible
  with OpenClaw-style `SKILL.md` folders; sanitizes hostile names, `--force` to overwrite
- **Android notifications**: ongoing "gateway alive" notification + per-run alerts via
  `termux-notification` (no-op elsewhere), auto-cancelled on shutdown
- **Session picker** in the web control UI (list, switch, load transcripts)
- Cron events surfaced over SSE (`cron` listener in UI)

### Changed
- Roadmap: WhatsApp channel moved to v0.3 (needs a zero-dep-compliant Baileys spike)

## 0.1.0 — 2026-09-29 (Shell Start)

First public milestone.

### Added
- **Gateway**: HTTP API + SSE event stream, loopback bind, constant-time token auth,
  PID file, health endpoint
- **Agent loop**: provider-agnostic tool calling (Anthropic, OpenAI-compatible, offline
  mock), per-session JSONL transcripts with rolling window, run timeouts, event stream
- **Tools**: `exec` (policy-gated, Termux-aware shell resolver), `read_file`,
  `write_file`, `list_dir` (root-bounded), `web_fetch`, `load_skill`, `remember`,
  `search_memory`, `get_time`
- **Skills**: SKILL.md folders with frontmatter, progressive-disclosure prompt index,
  user override, 4 bundled skills (web-research, termux-api, daily-briefing, shell-safety)
- **Memory**: MEMORY.md + daily logs + lexical search
- **Channels**: Web control UI (mobile-first, SSE), CLI REPL, Telegram
  (allowlist, HTML escape, chunking, `/new` `/heartbeat` `/status`, offline outbox)
- **Mobile layer**: Android bionic guard (networkInterfaces + TMPDIR), battery-adaptive
  heartbeat, offline outbox, supervisor watchdog, Termux:Boot installer, `doctor`
- **Onboard**: interactive wizard + scriptable `--non-interactive` flags
- **Quality**: 33 tests (`node --test`), GitHub Actions CI, TypeScript strict mode
- **Docs**: README, PRODUCT plan, ARCHITECTURE, API, TERMUX, SECURITY, OPENCLAW_REPORT
