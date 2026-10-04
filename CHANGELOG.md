# Changelog

## 0.68.0 - 2026-10-04

- **The browser tool is real, or it says why it is not.** It used to be a stub that called HTTP endpoints CDP does not have (`/json/navigate`, `/json/evaluate`), so it either answered *"requires WebSocket CDP"* or, worse, looked like it worked. `src/agent/cdp.ts` is now a dependency-free Chrome DevTools Protocol client: one WebSocket session with id-matched replies and event waiters, `Page.enable` + `Page.navigate` and a real wait for `Page.loadEventFired`, `Runtime.evaluate` for text, click and fill (fill goes through the element's native value setter and fires `input`/`change`, so React and Vue state actually updates; `submit` is a real `Input.dispatchKeyEvent` Enter), `Emulation.setDeviceMetricsOverride` + `Page.captureScreenshot` writing a real PNG under `workspace/browser/`, and the HTTP side (`/json/version`, `/json/list`) for status and tabs. **No dependency**: Node 22 and newer ship a global `WebSocket`, and an older Node gets one sentence saying so. **No bundled browser** either — it drives the Chrome or Chromium you already have (start it with `--remote-debugging-port=9222`, or point `CDP_HOST` at another device and `adb forward`), because shipping Playwright plus a Chromium is hundreds of megabytes on a phone install. `allowBrowser` stays off until it is turned on, a bad URL or action is refused *before* anything tries to attach (it used to surface as `TypeError: fetch failed`), and `termcrab browser [status|open <url>|text|shot] [--json]` uses the same client so you can look before the agent does; with no browser running it exits 1 and puts the start hint on stderr. Limits are stated in the row: no OAuth consent flow, no password typing, no downloading, and Android Chrome cannot be driven this way.
- **Fifteen bundled skills, and the commands in them are checked.** The library went from five to fifteen — `shell-safety`, `chat-replies`, `memory-keeping`, `reminders`, `daily-briefing`, `evening-review`, `file-organisation`, `backup-habits`, `secrets-hygiene`, `doctor-first`, `git-habits`, `phone-battery`, `voice`, `termux-api`, `web-research` — each one written for *this* device rather than for a plugin store: how to answer on a phone (answer first, short, no tables in chat, long things as a file), how to turn "remind me at 7" into a cron job with the timezone checked, what must never enter memory, what is safe to delete, what to do when something breaks. Two rules keep the library from rotting: `test/skills.test.ts` **pins the list of fifteen**, so adding or deleting one without updating the test fails the suite, and the same test reads every `termcrab <command>` line in every skill and asserts that the command exists in `src/cli.ts` and that the flags the skills lean on (`cron add --deliver`, `sessions purge --older-than`, `subagents scratch --prune`, `auth add --provider/--key`) still do. Writing it that way immediately caught three invented invocations (`termcrab exec`, an `auth add --id` that does not exist) before a model could follow them.
- **`load_skill` got the two things it was missing.** Wrong name now lists what does exist (capped, so a large library cannot flood a turn) and a capitalised name still resolves — the loader stays case-sensitive, the tool does not need to be. Both are pinned by the test.
- Census: **95%** (WORKING 105 → 107, PARTIAL 13 → 11): **Browser automation** and **Bundled skill library** PARTIAL → WORKING with the limits written into the row; effort ~72 → ~60 developer-days, drift 0.
- Tests: `test/tier2z.test.ts` (3 cases + 1 skip) stands up a **real WebSocket server** — SHA-1 handshake and a mask-aware frame codec, no dependency — that plays a browser, so the wire path is asserted rather than mocked at the function boundary: method order, the selector passed as data, `keyDown`/`keyUp`, a PNG signature on disk, page exceptions surfaced, a deliberate timeout, and the CLI against it. A live-Chrome case skips cleanly when the machine has none, as this one does. `test/skills.test.ts` gained 4 cases (the library, the commands, the flags, `load_skill`).

## 0.67.0 - 2026-10-04

- **Subagents now have a budget, a deadline and a place to work.** A background turn used to be fire-and-forget: nothing stopped a model from spawning more turns than the phone could hold, a stuck one held its slot forever, and two tasks doing file work collided in the same folder. Now `agent.maxSubagents` (default **4**) refuses the next spawn *by name* — the error lists the running task ids and the setting that raises the limit — `agent.subagentTimeoutSec` (default **900**) marks an unfinished task `timeout` (not `error`, because it is still running out there) and a late answer cannot resurrect it, each task that asks for one gets its own `workspace/subagents/<id>/`, and when a task settles exactly one line lands in the parent session (`[subagent s…] finished in 42s — read it with the subagents tool (id …)`) so every surface sees the result without polling. `termcrab subagents [list|show|clear|scratch [--prune]]` and `GET /api/subagents` report the same list; a task names the agent it runs as, and the session id is namespaced once — by `runTurn`, where the agent is applied — so one agent keeps one history instead of getting `coder:coder:…`.
- **Multi-agent routing: which named agent answers where.** `agents.routes.<surface>` (web, telegram, cli, cron, voice, wake, subagent) is now the sentence that was missing for anyone with more than one personality: a Telegram message or a cron job had no way to say "this one goes to the researcher" without typing a prefix every time. Precedence is one line: an explicit `@prefix` or `--as` wins, then the surface's route, then the main agent. A route that names an agent that does not exist is **reported**, not silently ignored — the turn still runs as the main agent, and the reason is in the log, in `termcrab agents routes` (with a ⚠ column and a `source` per row) and on the panel. `PUT /api/agents/routes` sets one, config validation names the exact surface (`agents.routes.telegram`) instead of blaming the whole object, and an unknown surface is a warning rather than an error.
- **The agent can write a skill for itself — and cannot install one.** `skill_workshop action=propose` writes `skills/_proposals/<name>/` (a `SKILL.md` plus a `PROPOSAL.json` carrying the description, the agent's own reason, the session it came from and the time). The loader skips every `_`- or `.`-prefixed folder, so a proposal — including a half-written one — can never reach the prompt. You decide in the surface you are already in: `termcrab skills proposals list|show|approve|reject`, or `GET`/`POST /api/skills/proposals` from the panel. Approving moves the folder into `skills/<name>/` (live from the next turn) and stamps the record; if a skill of that name is already live, approval is **refused** — the list warns first and `--force` is how you say you meant to replace it. Rejecting keeps the text and your reason in `skills/_rejected/<name>/REJECTED.md`, so "we decided against this" is distinguishable from "never seen".
- **A cron job says where its result goes, and which agent runs it.** `cron add --deliver telegram|panel|none` (unset = every configured surface, exactly the old behavior) and `--agent <name>`; `cron ls` shows both, in the table and in `--json`. The scheduler decides *when* and hands the target to the gateway, which knows which surfaces exist; `deliver:none` still records the run, the transcript and a daily-log line that says where it went, and a job whose route names an agent that does not exist runs as the main agent and logs why. Two real CLI bugs came out of writing the test: `cron add --json` was a usage error (the option parser was shown the envelope flag), and a nonsense `--deliver` value or unknown `--agent` is now refused *before* anything is written.
- **Voice is measured, not asserted.** Every earlier test of dictation and speech ran on a machine without `termux-speech-to-text`, without `espeak` and without `whisper-cli` — which proved the error paths well and the working paths not at all. `test/tier2y.test.ts` now puts real executables of the same shape first on `PATH` and runs the whole thing: the first recognized phrase wins, silence and the deadline are sentences, continuous listening emits a phrase per restart and stops when asked, the TTS chain prefers the phone backend and names the one it used, long text is spoken one chunk at a time in order, whisper transcribes a file with the documented argv, and the transcript is what the agent reads. Two genuine defects surfaced and are fixed: **streaming TTS assumed `espeak`** and so failed on any desktop without it (it now resolves the same chain as `termcrab say`, and reports `backend`), and **`termcrab transcribe` printed a friendly line even with `--json`** (now `{file, text, engine, model, ms}`); `termcrab say --json` was added at the same time, and `say` no longer reads the envelope flag out loud as text. Continuous listening also waits 250 ms between attempts, so a silent recognizer cannot spin the battery down.
- **Two pieces of tooling made honest.** `docs-map.mjs` un-escapes what it escapes, so a file description containing a pipe no longer grows a layer of backslashes on every `--write` (`--write` is idempotent now, checked by running it twice). And **`docs/API.md`** documents the new `cron-output` event the panel listens for when a job's output is delivered to it.
- Census: **92% → 95%** (WORKING 99 → 105, PARTIAL 19 → 13): Multi-agent routing, Subagents, Agent-authored skills, Scheduled delivery to channels, Voice STT/TTS and Transcription PARTIAL → WORKING; effort ~92 → ~72 developer-days, drift 0. The 13 remaining PARTIAL rows are the batch-34 queue (browser, bundled skills, group events, cron/task-board depth, secrets, web UI, CLI coverage, tests, docs site, remote access, audits) plus the CI matrix that is one push by the owner away.
- Tests: **13 new cases** — `test/tier2x.test.ts` (10: the cap by name, the deadline with a late answer ignored, the once-only parent note, scratch dirs listed and pruned, routing precedence and a broken route, config validation path, the CLI routes round trip, proposals not loading, revisions/collisions/rejections, the proposals CLI walk, the panel API, and five cron deliveries through a spy `deliver`) and `test/tier2y.test.ts` (3: dictation and continuous listening, the TTS chain with argv and chunking, whisper end to end including the CLI envelope and the intake prompt).

## 0.66.0 - 2026-10-04

- **`termcrab service install` — the agent comes back after a reboot.** One command writes the right thing for the device: a **systemd user unit** on Linux (`~/.config/systemd/user/termcrab.service`, `Restart=on-failure`, no root, no sudo), a launchd agent on macOS, and on Android — which has no systemd — the Termux:Boot script that already existed. `service status` reports what is installed, `--dry-run` prints the path, the exact file and the commands that enable it while writing nothing, and `uninstall` removes the file and never your data.
- **`install.sh --check` tells you what it would do, without doing it.** The installer already worked on Termux, Linux and macOS and re-ran as an upgrade; now it can also *answer*: the Node and git it found, the repo, the pinned ref, the destination, whether this would be a fresh install or an upgrade, and the exact steps it would take. It creates no files, and a Node older than 20.10 still fails with a sentence before anything is touched — both are asserted in the test suite and exercised in CI.
- **CI is a real workflow, one honest command from running.** The workflow had been sitting in `ci/github-actions.yml`, a folder GitHub never reads, so the "CI matrix" row described something that never ran. It is now versioned at **`ci/ci.yml`** with every line asserted by the test suite: build + the full suite on **Node 20, 22 and 24**, an offline CLI smoke that also runs `bootstrap --json`, the work-tracker freshness check, the census drift check, an installer job (`install.sh --check`, plus proving it refuses an unsupported Node), and a packaged-tarball job that `npm pack`s the build, installs it into a clean directory and runs the CLI from there. `npm run ci:install` copies it to `.github/workflows/ci.yml` byte for byte (`--check` fails on drift, and the workflow runs that check on itself). Why the copy step: **GitHub refuses a push that creates a workflow file unless the credential carries the `workflows` permission**, and the integration that writes this repository has `contents: write` without it — the API answers *"Resource not accessible by integration"*. So this row stays **PARTIAL on purpose** until the owner pushes that file once; a workflow in a folder GitHub does not read is not CI, and pretending otherwise is exactly what this batch is fixing.
- **The package is tested as a package.** `npm pack` → `tar -tzf` shows the built CLI inside, `package.json` inside the tarball still declares **zero runtime dependencies**, and installing it elsewhere gives a working `termcrab` command. That is the promise a phone user relies on when `npm install` finishes in under a second.
- Census: **91% → 92%** (WORKING 97 → 99, PARTIAL 21 → 19): Installer and Service install PARTIAL → WORKING, CI matrix re-described honestly and left PARTIAL (one push away) instead of being called done; effort ~99 → ~92 developer-days, drift 0.
- Tests: **6 new cases** in `test/tier2w.test.ts` — the installer plan writes nothing and refuses an old Node, the service unit is written/kept/uninstalled and its content is asserted, the CLI exposes it with a JSON envelope, the workflow lives in `.github/workflows` and does what it claims, and the tarball packs, contains the built CLI, ships no dependencies, and installs a `termcrab` command.

## 0.65.0 - 2026-10-04

- **A new install explains itself.** Before this, a fresh home was a set of empty directories: the agent had no soul, no user file, and no idea it was new, so the first conversation was the owner's job to explain. Now the first command that touches a new home writes the six files that make an agent an agent — `workspace/SOUL.md`, `workspace/IDENTITY.md`, `workspace/AGENTS.md`, `workspace/BOOTSTRAP.md`, `memory/MEMORY.md`, `memory/USER.md` — and prints one line saying it did.
- **`workspace/BOOTSTRAP.md` is written for the agent, not the owner.** While it exists it is injected into the prompt, and it tells the agent: this is a new home, greet the owner, ask the two questions that actually matter (*what should I call you* and *which language*), offer to fill in `IDENTITY.md` and `USER.md` from the answers, then **delete this file** — so the next turn is a normal one and nothing keeps paying for a first-run section.
- **Nothing written once is written again.** `runBootstrap` only creates what is missing; an existing file is reported as kept and left byte-for-byte alone (your `SOUL.md` after a month of edits is not a template target). `--force` is the documented exception. `termcrab bootstrap` reports the set, the stage (`empty` → `first-run` → `done`) and the next step; `termcrab bootstrap --json` answers it as data; the doctor carries a `bootstrap` check with the one-line fix; and the whole set travels inside `termcrab backup`.
- **Two small corrections the file set forced into the open.** The memory head (everything above the first fact in `MEMORY.md`) is injected into every prompt as-is — that was already true, and the templates are now kept to two short lines so they do not eat the memory budget. And freshness for migrations (`isFresh`) now counts *content files*, not directories: the layout pre-creates empty folders, and a home that is nothing but folders is still a home nobody has used, so a brand-new install is adopted at the current schema instead of being "migrated" with a snapshot of nothing.
- Census: **91%** (WORKING 96 → 97), Bootstrap file set PARTIAL → WORKING — all six names are real files now; effort ~101 → ~99 developer-days, drift 0.
- Tests: **6 new cases** in `test/tier2v.test.ts` — the set is complete and has real content, a re-run never overwrites the owner's words (with `--force` shown as the way back), the first-run section appears and then disappears once the note is deleted, a real first turn works from an empty directory with no setup command, the CLI's status/`--write`/auto-on-first-command paths (stdout untouched), and the file set surviving a backup round trip.

## 0.64.0 - 2026-10-04

- **Smart memory search no longer needs a download.** The vector path was gated behind installing `@huggingface/transformers` and pulling ~23 MB of model weights — the exact kind of first-run friction that makes a phone user give up. Now there are three routes behind one decision point (`src/agent/embed-provider.ts`): the **local model** when its package is already installed (offline, no key, no cost), any **OpenAI-compatible `/embeddings` endpoint** (OpenAI, OpenRouter, and the self-hosted servers a Termux user actually has — Ollama, llama.cpp, LM Studio, **which need no API key at all**), or **Gemini's `batchEmbedContents`**, with the key in a header rather than the URL.
- **`memory.embedProvider = auto | local | openai | gemini`.** `auto` (the default) prefers the local model if it is there and otherwise uses the chat provider you already configured — so on most phones semantic search is one config value away, not a package install. `memory.embedModel` overrides the model and `memory.embedBaseUrl` points at your own endpoint. The two new wire formats are exercised against exact request assertions (batch body, headers, order preserved even when a gateway reorders) and the extra keys are validated, not silently accepted.
- **`termcrab embeddings test <text>` proves it.** One string, one real call, printed dimension and elapsed milliseconds — the honest answer to "is smart search actually on?", next to `embeddings status`, which now names the live provider, the model and its price (with no invented price for a model nobody priced), and the one-line fix when nothing is configured. The doctor reports the same, and the gateway logs which embedder it got and why.
- **Failures are sentences, and they never leak the key.** A 500, a dead host, a wrong number of vectors and a timeout each produce a specific line naming the host — with the configured key redacted from any error body the endpoint echoes back. When the endpoint breaks, search still answers lexically from the text; the vector path being down is not a search outage.
- Census: **90% → 91%** (WORKING 95 → 96), Embedding providers PARTIAL → WORKING, effort ~105 → ~101 developer-days, drift 0.
- Tests: **10 new cases** in `test/tier2u.test.ts` — both wire formats byte-for-byte, the redaction rule, the plan for every provider/override combination (including a keyless self-hosted endpoint), config validation, `resolveEmbedder` without network, and two end-to-end proofs: a real local HTTP endpoint behind `termcrab embeddings test`, and a semantic hit that no word match could find (with the lexical-only path shown failing to find it).

## 0.63.0 - 2026-10-04

- **The state has a version, and old ones are carried forward.** TermCrab keeps no database on purpose — the memory, chats and settings are files you can read and `cp -r`. The price of that is what happens when the *shape* of those files changes on a phone with months of history inside. `state/schema.json` now carries a version, every release's shape change ships as a numbered step, and every command migrates before it reads (announced on stderr so `--json` stdout stays machine-readable). Three real steps ship: snake_case config keys (`api_key`, `allow_exec`, `session_reset`, and the old top-level Telegram token) are renamed in place, transcripts written with second-precision timestamps are converted to milliseconds, and `workspace/outbox.json` moves to `state/outbox.json`.
- **A migration cannot leave a half-migrated home.** A step either completes or the version stays where it was (the stamp is written through a temp file + `rename`, a failure is reported and retried on the next start), a home with anything in it is snapshotted into `state/backups/<time>/` before the first change, `termcrab schema --dry-run` lists the steps without touching a file, and a home written by a **newer** TermCrab is refused with a sentence instead of being half-understood. A fresh home is *adopted* at the current version rather than pretend-migrated.
- **`termcrab backup` / `termcrab restore`: move the whole agent to a new phone.** One plain tar (no compression, no dependency) holding config, workspace, chats, memory, skills, state, logs and config backups, with a `manifest.json` inside it naming the release and the schema of the content — so `tar -xOf home.tar manifest.json` answers "what is this" without TermCrab. Restoring verifies the manifest, refuses an archive from a newer release unless `--force`, and **never overwrites in place**: files that already exist are moved into `state/restore-<time>/` first, then the restored home is carried forward to the current schema. Pid/lock/tmp files and previous snapshots are skipped (a backup of a backup cannot grow without bound), and junk -- a non-tar file, a tar with no manifest, a truncated archive -- answers a sentence, not a stack trace.
- **Updates can be taken back.** `termcrab update --apply` snapshots the build first (`dist/` without the test build, `ui/`, `skills/`, `package.json`), applies, then **verifies by starting the new build**: the CLI must answer `--version` and read its own state schema. If it does not, the snapshot is copied back and the answer says how many files were put back. `termcrab update --rollback` restores the newest snapshot by hand, and the panel's update button takes the same verified path.
- Census: **89% → 90%** (WORKING 92 → 95), effort left ~120 → ~105 developer-days, drift 0. The last ABSENT row is gone: Database + migrations → WORKING, Backup/restore PARTIAL → WORKING, Atomic updates + rollback PARTIAL → WORKING.
- Tests: **13 new cases** in `test/tier2t.test.ts` — a fresh home adopted rather than pretend-migrated, a legacy home carried forward (renamed keys, seconds→ms, the moved outbox, with the snapshot kept), a newer stamp refused, a dry run that writes nothing, a step that throws on purpose leaving the version where it was, a home round-tripping through the archive, the same round trip through the real CLI, a restore over an existing home that moves the old files aside, junk refused with a sentence, and a failed update rolling back byte for byte.

## 0.62.0 - 2026-10-04

- **Shell commands now run in a sandbox, when the device can give one.** `exec` was guarded (a catastrophe deny-list, a hard timeout, capped output, approvals) but it ran with your whole home directory and your network in reach. It now runs inside **bubblewrap** when that is installed — read-only root, the workspace as the *only* writable path (`agent.sandboxWrites` adds more), a private `/tmp`, a throwaway `$HOME` so a script that writes `~/.ssh` writes nothing real, `--unshare-pid/ipc/uts`, `--die-with-parent` so a killed agent does not leave a command running, and **no network at all** unless `agent.sandboxNetwork` says otherwise. Where unprivileged namespaces are blocked (most Android kernels) it uses **proot** instead, and says plainly that proot cannot take the network away rather than implying it did.
- **No sandbox? It says so — or refuses.** `agent.sandbox` chooses: `auto` (default) runs the command and starts the output with `[sandbox] ran without a sandbox: … install bubblewrap (pkg install bubblewrap on Termux, apt install bubblewrap elsewhere)`, so the owner sees the gap in the transcript instead of learning about it later; `require` refuses to run anything outside a sandbox, answering with the package to install; `off` is the old behaviour, recorded per run as `sandbox is off (agent.sandbox=off): this command ran with full access to the device`. Nothing is ever silently unsandboxed.
- **The argument vector is data, not a string.** The sandbox flags are built as an argv array and asserted flag by flag in tests — a sandbox whose flags are wrong is worse than no sandbox, because it looks like one. `termcrab doctor` reports which mode this device has (and the fix), `GET /api/status` carries it, and the panel's live status shows `Sandbox: bwrap|proot|none|off`.
- Census: **88% → 89%** (WORKING 90 → 92, PARTIAL 26 → 25), effort left ~132 → ~120 developer-days, drift 0. Security lane: Sandboxing ABSENT → WORKING; tools lane: Sandboxed code execution PARTIAL → WORKING.
- Tests: **8 new cases** in `test/tier2s.test.ts` — detection preferring bubblewrap and refusing a broken binary, the exact bubblewrap argv (read-only root, one bind, private tmp/HOME, `--unshare-net`, `--die-with-parent`, the command as one element), the exact proot argv and its honest network gap, `off`, all three policies (including `require` refusing with the install hint), the runner spawning the sandbox binary and reporting the mode, the exec tool hiding nothing (the note comes first), and a live run when a real bubblewrap exists.

## 0.61.0 - 2026-10-04

- **The terminal is a third surface now, not a second REPL: `termcrab tui`.** A real full-screen screen — the alternate buffer (entered and left on every exit path: `/quit`, Ctrl-C, EOF, even a turn that throws), bracketed paste, raw keys decoded properly (an arrow that arrives in two reads, an emoji split across reads, a stray Escape), and a frame that is exactly the terminal's size, wide characters counted as two so a Bengali or Japanese line does not push the right edge around. The transcript streams the answer while the model is still talking, a tool call is one line with its duration, thinking is dimmed, and the input box edits like a shell should (`↑`/`↓` history, `Ctrl-U`/`Ctrl-K`/`Ctrl-A`/`Ctrl-E`, backspace, a cursor that slides instead of running off the line). `Ctrl-L` redraws after a rotation; a resize redraws by itself.
- **It opens on the rolling main session, and watches it with the others.** `termcrab tui` starts on the session the panel and your Telegram DM use (28.1) and, when a gateway is running, attaches to that conversation (28.2) — so a turn you started from the panel or the phone appears in the terminal as it happens, marked with where it came from. Opening the screen *before* the gateway is up retries for a few seconds instead of failing; `--no-attach` turns it off. `/sessions` opens an arrow-select picker over every conversation on disk, `/new`, `/status`, `/history`, `/dir`, `/help` answer in the transcript, and piping into a non-terminal says so instead of drawing garbage. `--frames <file>` appends every drawn frame, which is both how this is tested and how you send a bug report.
- **Attaching to an empty conversation works.** The 28.2 attach route answered 404 for a session that existed nowhere yet — which is exactly what "open the screen before you have ever typed" looks like. It now streams an empty state frame; only a nonsensical id (empty, slashes, absurdly long) is refused with 400.
- Census: **86% → 88%** (WORKING 88 → 90, PARTIAL 27 → 26, ABSENT 3 → 2), effort left ~152 → ~132 developer-days, drift 0. The terminal lane is done: Full-screen TUI ABSENT → WORKING, Interactive REPL PARTIAL → WORKING.
- Tests: **11 new cases** in `test/tier2r.test.ts` — cell arithmetic incl. CJK/Bengali width, wrapping and hard cuts, a frame that is exactly rows × cols at two sizes, cursor sliding, key decoding with partial escapes and split code points, a typed turn that streams into the screen and a clean terminal restore, history/Ctrl-U/backspace//help//sessions-picker/resize over a fake TTY, the non-TTY refusal, and a real gateway where a panel turn appears in the terminal while it happens.

## 0.60.0 - 2026-10-04

- **One session for you, across every surface.** Until now each surface had its own thread: the panel talked in `web:main`, the terminal in `cli:main`, Telegram in `telegram:<chatId>` — so asking on the phone and then opening the laptop meant starting over. The owner's own conversations now share one session, `main` (`agent.rollingSession`, default on; rename with `agent.mainSession`): the web panel, the CLI and REPL, the voice surface, and a Telegram DM whose chat id is one of your `allowedUserIds`. Groups, other people, cron jobs, the heartbeat, dreams and subagents keep their own keys, and `agent.rollingSession: false` restores the old behaviour exactly.
- **The main session rolls over daily, and never loses a day.** On the first turn of a new local day the live transcript is appended to `<session>.archive.jsonl`, the file is emptied, and the fresh thread opens with a `[rolling]` system note naming the archive and how to search it — so `termcrab sessions search` still finds yesterday and the model is not dropped into the middle of a conversation it cannot see. The roll happens *before* the turn writes (so it judges yesterday by what was there), it is announced as `session:reset` with reason `rolling`, `/api/status` reports the session and a plain-English line, `sessions ls` marks it, `sessions show` explains it, and the panel opens on it.
- **Several clients can watch one conversation.** `GET /api/sessions/:id/attach` streams one session: the first frame is a `state` snapshot (the last 60 transcript entries, the running turn, the viewer count) so a tab that just opened catches up in one request, then only that session's versioned frames — a phone, a laptop and the terminal on one thread, none of them missing a message, and another conversation never leaking in (attaching to a conversation with nothing in it yet answers with an empty state, not a 404). `GET /api/sessions` now reports `viewers` and `running` per session, and closing a tab releases its viewer. A `POST /api/chat` without a `sessionId` lands in the rolling main session; name one and you get exactly that thread.
- **More than one person, honestly.** `channels.telegram.scoping = chat` (default: one thread per room, what a group wants) or `user` (one thread per person, so their DM and their mentions follow them between chats). Who spoke is recorded rather than guessed: the run carries the person, and every memory fact a turn writes carries it as its source — so "who told you that" has an answer.
- Census: **85% → 86%** (WORKING 85 → 88, PARTIAL 29 → 27, ABSENT 4 → 3), the sessions area is **100%**, effort left ~152 developer-days, drift 0.
- Tests: **9 new cases** in `test/tier2q.test.ts` — surface→session mapping and the opt-out, the roll itself plus an empty session, a real turn through the loop that rolls before it writes (this is where a real ordering bug was caught: the turn used to append its own message first, so the roll saw "already talking today"), the attach stream's state frame, second viewer, per-session filtering, release and 404, the panel's default session and `/api/status`, and scoping with run provenance.

## 0.59.0 - 2026-10-03

- **Two more brains, spoken natively.** `provider.type` now takes `anthropic` (POST `/v1/messages`: the system prompt as its own field, typed content blocks, `input_schema` tools, tool results as user turns, thinking blocks echoed back verbatim, SSE with partial-JSON tool reassembly) and `gemini` (POST `:generateContent` with `contents`/`parts`, `systemInstruction`, `functionDeclarations`, merged `functionResponse` parts, `inlineData` images, and synthesized stable tool-call ids because Gemini sends none). Both sit behind the same `Provider` contract as the OpenAI-compatible client, so the loop, tools, images and usage accounting did not change at all — and an old config that said `"type": "anthropic"` used to be silently rewritten to OpenAI-compatible is now honoured.
- **You can see what your endpoint has: `termcrab models`.** It asks the live endpoint first (`/models`, Anthropic's `/v1/models`, Gemini's `/v1beta/models`) and, when that cannot be reached, prints an offline catalog of 22 known models with a note saying which happened. Every model shows what it can do — context window, whether it sees images, tools, thinking, and dated prices — and an id nobody knows says "capabilities unknown" instead of guessing. Vision and the thinking-level logic now consult the same catalog.
- **Keys no longer live in config.json: `termcrab auth add work --provider anthropic --key …`.** The key goes to `state/auth-profiles.json` (mode 0600, every use appended to `state/auth-audit.log`); `config.json` holds only `provider.authProfile: "work"`. A missing profile, or one written for a different vendor, stops with a sentence naming the fix instead of sending a request with an empty key.
- **The local tier is real, and never falls back silently.** `termcrab agent --tier local` runs on `config.localProvider`; with nothing configured the turn still completes on the cloud but writes a `[local tier]` note into the transcript naming the setting and the docs.
- **A turn that is stuck now stops itself, and says why.** `agent.turnBudgetSec` (default 900 s, 0 disables) bounds a whole turn; `agent.idleSec` (default 120 s, 0 disables) resets on every model reply and every finished tool, and a watchdog aborts a call that just hangs — reporting what it was waiting on ("no progress for 120s while waiting for anthropic to reply (iteration 2)"), keeping the partial answer, and recording the run as `error: watchdog` where `termcrab runs` can see it.
- Census: **81% → 85%** (WORKING 77 → 85; PARTIAL 34 → 29, ABSENT 7 → 4), effort left ~171 developer-days, drift 0.
- Tests: **9 new cases** in `test/tier2p.test.ts` — the exact Anthropic body and headers plus a streaming run, the exact Gemini URL/body and id synthesis, `resolveProvider` for all four types with an old `ollama` config still meaning OpenAI-compatible, the catalog online and offline, keys never printed with file mode 0600, the local tier and its note, and a hanging provider stopped in about a second with the reason kept in the transcript.

## 0.58.1 - 2026-10-03

- **A fresh checkout can run `termcrab` now.** Reported from a real phone: copy the branch, `npm install`, type `termcrab` — and get "No command termcrab found". Both halves of that were true: `npm install` only fetches the three dev packages (the CLI is compiled into `dist/`, which does not exist yet and is not tracked), and nothing links the root package's `bin` onto your PATH. There is now a committed launcher, `./termcrab`, that compiles once on first run (saying so, because tsc is silent on a phone), then runs the real CLI; and the quick starts in `README.md` and `docs/TERMUX.md` show both it and `npm link` (one symlink into your npm prefix for a bare `termcrab`). `npm run build` ends with the same hint, `install.sh`'s usage example no longer names a stale version, and a test pins all of it.
- The lock file's version can no longer drift: `scripts/release.mjs --check` compares `package-lock.json` with `package.json` and fails with the exact fix, and a bump writes both (this was found for real — the lock still said 0.52.0 at release 0.58.0).

## 0.58.0 - 2026-10-03

- **Tools from one turn now run together — when that is safe.** Until now a model that asked for three tools in one turn got them one after another: three 120 ms reads took 360 ms. Consecutive read-only calls now run as one bounded batch (`Promise.all`, `agent.parallelTools`, default 4 — set it to 1 to turn batching off entirely), and results are written to the transcript in the order the model asked for them, not the order they finished. `tool:start`/`tool:end` keep their per-call ids and spans, so the panel and `termcrab runs` see each tool normally.
- **And when it is not safe, nothing changes.** Only tools that cannot change anything are batched: one auditable table of 19 read-only names (`PARALLEL_SAFE_TOOLS`: `get_time`, `list_dir`, `read_file`, `view_image`, `web_search`, `web_fetch`, `search_memory`, `load_skill`, the `sessions_*` reads, `conversations_list`, `inbox_list`/`inbox_read`, `battery`, `wifi_info`, `location`, `github_identity_status`). Anything that writes, executes, sends or needs a human's approval flushes the batch and runs alone — two mutations in one batch have no defined order, and the model did not give one. A tool that fails is that tool's result, not a cancelled batch.
- Census: **80% → 81%** of 132 in-scope checks (WORKING 76 → 77, ABSENT 8 → 7), effort left ~201 developer-days, drift 0.
- Tests: **5 new cases** in `test/tier2o.test.ts` — three 120 ms read-only tools really overlap (the batch finishes in under 320 ms, and all three are in flight at once), a mutating tool waits for the batch and the next read waits for it (peak concurrency 1), one failing tool leaves the others' results intact, `agent.parallelTools: 1` is strictly serial, and the safety table is checked for shape (`exec`, `write_file` and `send_file` must never appear in it).

## 0.57.0 - 2026-10-03

- **A standing order is a sentence the agent always follows.** `termcrab orders add "always answer in Bengali"` (with `list`, `remove <id>` and `--json`), the chat command `/orders [add|remove]`, the panel's command palette (`/orders` is in `GET /api/slash`) and the agent's own `intent` tool all read and write one store, `state/intents.json`, and the system prompt injects them as `# Standing orders` into every turn. The precedence is written into the prompt itself: standing orders outrank long-term memory and workspace notes, and never override the safety rules. Adding or removing one changes the next turn immediately.
- **Hooks can hear the run itself, and the filesystem.** `run.start`, `run.end` and `session.reset` joined the event vocabulary, so a hook with `"on": ["run.end"]` is woken with that turn's payload — reactive by design: a hook is told after the fact and may act, but it cannot rewrite or block a turn (approvals and the exec guard do that, in code). `config.watchers` adds watched files/folders (`{id, path, match, debounceMs}`): a change under the path fires `file.changed` with `{watcher, path, name}`, so "when a PDF lands in this folder, look at it" needs no rule language. `termcrab events` now prints the catalogue, who listens and what is being watched.
- **The agent can make an image — offline, honestly.** `src/media/image.ts` uses the configured image endpoint (`POST {baseUrl}/images/generations`, `b64_json` or a `url` to download, model from `config.media.imageModel`) and, when the provider is the mock, draws a real PNG locally with a hand-written encoder on `node:zlib` — deterministic bytes, no dependencies, no network. One path behind three doors: the `generate_image` tool (writes `workspace/outbox/`), `termcrab image "<prompt>" [--size 1024x1024] [--out file.png]`, and `POST /api/image` for the panel. Every result carries `placeholder: true` when nothing was sent out, so a local drawing is never passed off as a model's work.
- **Three rows re-judged with proof, not adjectives:** Canvas/A2UI is WORKING (the widget round-trip is pinned by a test), **Tool count** is WORKING (59 tool definitions, 57 live under a default config — counted at runtime, and the census now carries a *count probe* with a floor so deleting tools breaks the check loudly), and **State layout** is WORKING (one `paths.ts` layout, every path derived from `TCRAB_HOME`, tested).
- **Scope, extended honestly:** eight more rows are excluded because of the three-surface decision (plugin API, manifest and provider interface; container/server deploy; Gmail/IMAP; per-room routing rules; native GUI) — 18 excluded in total, each still measured and drift-checked, each carrying the decision and its date.
- Census: **score 72% → 80%** of 140 in-scope checks (WORKING 75 → 76, BETTER 14, PARTIAL 34, ABSENT 19 → 8), effort left ~291 → **~204 developer-days**, drift 0.
- Tests: **6 new cases** in `test/tier2n.test.ts` — the orders round-trip through the real CLI with the exact prompt block and its precedence sentence, the panel palette's 404 for a missing id, a hook genuinely woken by `run.end` (and its hook session existing afterwards), a watched folder firing `file.changed` with the right hook, the canvas round-trip over HTTP, and image generation (a valid PNG header and dimensions, byte-for-byte determinism, a fake image endpoint asserting model/size/auth whose bytes land unmodified on disk, a failing endpoint reported with its body, the tool, and `POST /api/image` including the 400).

## 0.56.0 - 2026-10-03

- **Three surfaces, decided and written down.** The user's call — telegram, the web panel and the terminal, and nothing else — is now something the code, the docs and the score all agree on. The census can mark a row `scope: 'out'`: it is still measured and still drift-checked, but it leaves the tally, the score and the effort total, and it carries the decision and its date next to it. Ten rows are out: the six extra channel adapters (WhatsApp, Discord, Slack, Signal, SMS, Matrix), the 25+ further channels, the channel-plugin interface, and the native desktop/mobile apps. **Nothing was deleted** — those adapters keep working if configured; they are just not a path we build on.
- **The score now means what it says:** `72%` of 140 in-scope checks (was 70% of everything), ABSENT 19, effort left ~291 developer-days (was ~327 — 36 days of work we have decided not to do). `node scripts/census.mjs` prints `out of scope: 10`, and the TRACKER block, the Bengali summary and `node scripts/status.mjs` all quote the in-scope number with the excluded count beside it.
- **The three chosen surfaces each keep a census row** (`Telegram`, `Web control UI`, `Interactive REPL`), so a future cleanup cannot quietly remove the terminal.
- Docs: `docs/CHANNELS.md` opens with the three supported surfaces and a "kept, not built on" section; `docs/openclaw/README.md`, `BEAT-PLAN.md` (§0.0) and `CHECKPOINT-70.md` (§1.1) carry the decision and the recomputed numbers.
- Tests: `test/census-scope.test.ts` recomputes the published score from the rows (so it cannot drift), checks the tally matches the in-scope rows, requires every excluded row to name the decision, and asserts the three surfaces stay in scope. The `docs/CHANNELS.md` drift test now reads the channel table specifically, so other tables in that file cannot be mistaken for channel claims.

## 0.55.0 - 2026-10-03

- **"Who can reach me right now?" has an answer.** `termcrab presence`, `GET /api/presence`, the `presence` block of `/api/status`, the chat `/status` reply and the panel's live status line all show one picture, derived from stores that already existed: attached gateway watchers (the panel, a phone, another CLI), channels that are *configured* vs actually *running* (read from the live channel objects, so a channel that failed to start cannot claim to be up), paired devices with their last sighting, and people who actually wrote recently. One freshness rule, stated everywhere: **online** = seen within 2 minutes, **recent** = within an hour, **idle** = older, **unknown** = paired and never used, **off** = configured but not running. Presence changes are bus events (`started`, `watch`, `unwatch`, `paired:<id>`), so a UI can react instead of polling.
- **A hook can now wake itself on the inside.** Until now a hook only fired when an external service POSTed to `/api/hooks/:id`. A hook that names events - `"on": ["run.failed"]`, `["device.*"]`, `["*"]` - is woken by what happens in the gateway instead: `run.failed`, `device.paired`, `file.received`, `cron.finished`. The turn is queued exactly like a webhook's (same lane, same queue mode, same limits) in session `hook:<id>`, and its message starts `[event:<name>]`. Two rules keep an agent from waking itself forever: a hook is never triggered by an event its own session produced, and every hook has a 60-second cooldown. `termcrab events` lists the catalogue and which hooks listen for what; the gateway warns at startup when a hook listens for an event nothing emits.
- The gateway area now has no ABSENT row left. Census: **WORKING 73 -> 74**, **Event triggers ABSENT -> PARTIAL** (internal events yes; file-change/condition watchers explicitly not attempted), **ABSENT 23**, score **70%**, drift 0.
- Tests: **10 new cases** in `test/tier2m.test.ts` - the freshness ladder including its boundaries, a device that used its token vs one that never did, the picture with limits and the one-line summary, watchers counted over real HTTP while an SSE client is attached, the presence bus event on attach, the CLI with and without a panel, trigger pattern matching, the self-loop and cooldown rules, and a real pairing over HTTP waking the hook that listens for `device.paired`.

## 0.54.0 - 2026-10-03

- **"Why is it stuck?" has an answer now.** Every running turn gets a verdict - `working`, `slow` (>60s in one step), `stuck` (>5min with nothing new), `failing` (the provider errored) or `queued` (messages waiting behind one) - plus the last thing that actually happened ("in tool web_fetch for 2 minute(s)") and one sentence to act on (`termcrab stop web:main`, `termcrab doctor`, retry smaller). `termcrab runs` prints it, `GET /api/runs/health` serves it, the `/status` line in a chat carries it, and `termcrab doctor` gained a `running turns` check that stays quiet when nothing is wrong.
- **A log worth reading tomorrow.** Every console line is mirrored into `logs/termcrab.jsonl` as one JSON object per line - timestamp, level, area and message, plus whatever ids the call site knows - so "what happened at 3pm?" no longer depends on someone having watched the terminal. `termcrab logs [n]` prints the newest records, `--json` gives the records and the limits, `--path` just the file. The default log level still controls how much gets written.
- **Rotation that is stated, not implied.** The log rotates at 2 MB and keeps 3 files (`logs.maxMB` / `logs.files` to change it, validated and clamped), `termcrab disk` counts the log area as trimmable, and `TCRAB_LOG_FILE=off` disables file logging entirely for a tiny or read-only device. A logging failure never becomes the failure being logged: the writer never throws.
- Caught before release, by the live test itself: the new `GET /api/runs/health` was being read as a run id by the by-id route that came first, so the CLI silently fell back to its local view. The route now answers first, the by-id route still 404s an unknown run, and `termcrab runs` says so instead of quietly showing nothing when the panel is up but cannot answer.
- Tests: **16 new cases** in `test/tier2l.test.ts` (verdict thresholds and each verdict, provider failure, the queued lane, the real `SessionQueue` end to end, JSON-lines shape, the logger mirror including the area rule, tail order, the CLI reader, rotation limits, config validation, and the disk accounting). Census: **WORKING 71 -> 73**, score **68% -> 69%**, drift 0.


## 0.53.0 - 2026-10-03

- **The shell has a guard rail.** `exec` now refuses a short list of catastrophic commands (`rm -rf /`, `mkfs`, `dd` onto a device, a fork bomb, `chmod -R 777 /`, `reboot`, `curl | sh`) with one plain sentence and never spawns a process; the owner can add their own patterns (`agent.execDenyPatterns`) and only an explicit `agent.execAllowDangerous: true` goes past the list. A timeout kills the command (SIGKILL) and reports `[killed after Ns]` together with whatever it managed to print; output is capped and the cap is stated rather than implied. `agent.execTimeoutSec` sets the default, and `agent.allowExec` still gates the whole tool.
- **A wrong argument is a sentence, not a stack trace.** Every tool's already-declared schema is now enforced at the boundary (`src/agent/tool-schema.ts`): required fields, types (`integer` included), nested objects, array items and enums. A bad call comes back as `[bad arguments for read_file] missing required \`path\` (string). Send the call again with the corrected arguments.` - something a small model can act on. A test walks every built-in tool and proves it answers instead of crashing; the wrapper is applied in `buildTools`, so the loop, the panel, the CLI and tests all get the same behaviour.
- **A human can say yes from the terminal too.** When a gated tool pauses the turn, `termcrab agent` now asks `y/N` right there on a TTY; a piped or cron run is told exactly which command approves it rather than hanging silently, and the timeout default still applies. The decision - approved, denied, timed out, and who answered - is written into the transcript as a `[approval] <tool> <decision> by <who>` system line, so "who allowed this?" is answerable later from the same file.
- Tests: **17 new cases** in `test/tier2k.test.ts`. Census: **WORKING 68 -> 71**, score **67% -> 68%** (tools lane 64% -> 78%), drift 0.


## 0.52.0 - 2026-10-03

- **A transcript that survives losing the phone.** Every entry is written as one whole line and flushed to disk before the append returns, and a half-written tail left by a kill is cut before the next write. A line that still does not parse is *reported* (torn tail vs. unreadable line) instead of skipped silently, and `termcrab sessions verify [--repair]` walks every transcript and says what it found. Nothing was deleted to make this true: the archive still holds everything.
- **Find the conversation, not just the string.** `termcrab sessions search <words>` ranks every line of every chat - and of its archive - with term weights, an all-terms bonus, an exact-phrase boost and a 30-day recency half-life. Each hit says which session, which side of the conversation, when, and which file/line, with a snippet that marks the matched words. The same function powers `/sessions search` in a chat and the agent's `sessions_search` tool, so "where did we talk about the plumber" has one answer everywhere.
- **Starting over is a policy, not a habit.** `agent.sessionReset = never` (default) | `daily` | `idle:<minutes>`: when the policy says so, the next turn sees a clean context while the old thread moves to `<session>.archive.jsonl` - still on disk, still searchable. `/status` and `termcrab sessions show <id>` state the policy and why a reset is or is not due, and `termcrab sessions reset <id>` does it on demand.
- **What belongs to a chat.** `termcrab sessions show <id>` (and `/sessions show <id>`) answers: how big it is and when it started, the roles, the digest, whether a turn is writing right now (the fence holder), which files it read or wrote, which facts it taught the agent (found by their provenance stamps), which approvals are attached, and which tools it used.
- Tests: **19 new cases** in `test/tier2j.test.ts` (durability, torn-tail healing, damage reporting, ranked search incl. archive and tool down-weighting, reset policies and their application, the session view, and the same behaviour through the real binary). Census: **WORKING 65 -> 68 · ABSENT 28 -> 26**, score **66% -> 67%**, drift 0.


## 0.51.0 - 2026-10-03

- **Devices pair, and can be taken back.** `termcrab pair` prints a 6-character code (no `0`/`O`/`1`/`I`, because it is read off a screen and typed on a phone) that lives five minutes and works once. `POST /api/pair` exchanges it for that device's own token - shown once, stored only as a sha256 hash in an owner-only file. `termcrab devices` lists every device with when it was paired, when it was last seen and from where, and marks which one is asking; `termcrab devices revoke <id|name>` kills exactly that token while the master password and every other device keep working. No more typing the owner's long password into a phone, and no more changing it for everyone to lock out one device.
- **A wire a client can trust.** Every SSE frame is now wrapped as `{v: 1, seq, ts, type, ...}`: a version a client can check, a monotonic sequence number so a dropped frame is visible instead of invisible, and a type that is always a safe token. The ten event families are declared in `src/gateway/protocol.ts` and mirrored in `docs/API.md`; a test walks the source, so a new event type cannot ship undocumented. Case is preserved deliberately - the panel listens for `thinkingCaps` and `canvas:update` by name.
- **Retries that do not do the work twice.** `POST /api/chat` accepts an `Idempotency-Key` (header or body), remembers the accepted run for a day and answers a replay with the same `turnId` and `"replayed": true`. A phone that loses the answer to a network drop no longer pays for the question twice; request bodies are parsed once with a field name on failure (`400 {error, field}`).
- **Limits that answer instead of absorbing.** A token bucket per key - a device, the master token, a peer address, or a channel chat - with `gateway.rateLimit = {perMinute, burst}` (default 60/minute, burst 10). A full bucket gets an immediate `429 {error, retryAfterMs, limit}` plus a `retry-after` header on the API, and one plain sentence back into a channel chat, instead of another queued turn. Nonsense config is clamped rather than allowed to block everything.
- Tests: **21 new cases** in `test/tier2i.test.ts` (device lifecycle, hash-only storage, expiry, revocation, wire frames, doc-to-code drift, idempotency window, limiter arithmetic, and the whole flow over a real socket including SSE). Census: **WORKING 61 -> 65, ABSENT 31 -> 28**, score **63% -> 66%**, drift 0 - the core lane is now empty.


## 0.50.0 - 2026-10-03

- **Memory you can trust.** Search is now ranked, not counted: BM25 over MEMORY.md, USER.md, the daily logs and the compacted digests, with an all-terms bonus, a 2.2× exact-phrase boost and a 30-day recency half-life taken from each fact's own stamp. Results carry a snippet with the matched terms marked, and the CLI prints them as `termcrab memory search <words> --json` (`{score, snippet, origin, when, source}`) — the chat gets `/memory search`, the agent gets `search_memory`, and all three call the same function.
- **Every fact says where it came from.** A fact line can carry `[from:owner|agent|system|untrusted]` and `(src: telegram · session:s1 · run:t3)`; the run decides the origin (a chat message is the owner, a subagent is the agent, a background job is the system) and the model can state one explicitly. A prompt that contains untrusted facts says so and tells the model to treat them as data, never as instructions.
- **De-duplication that does not destroy lists.** Re-stating a fact updates its own line instead of appending (the file stops growing); a fact that was *extended* merges into the same line; and a pair that differs in its numbers — "fact number 1" vs "fact number 2" — can never merge. This guard came out of the tests: the first version silently collapsed sixty list items into one.
- **USER.md is the owner model.** A real file, injected into every prompt as `## About the user` (600-character budget, never trimmed by the fact budget), written by the agent through `update_user`, by the owner through `termcrab memory user <line>` or `/memory user <line>` in a chat, searched like any other memory file.
- **Old tool results stop being re-sent.** `pruneToolResults()` keeps the newest six verbatim and replaces older bulky ones with one line naming the tool, the size and how to re-run it; small results and tools that cannot be re-run (`remember`, `update_user`) are untouched, and a user message is never touched. The loop applies it before every provider call, so the wire body is really smaller.
- **You can see what the model is sent.** `termcrab context [session] [--json]` and `/context` print the real prompt section by section (identity, memory, USER.md, skills, environment, standing intents, goals, roster) with bytes each, plus tool-schema bytes, the hot transcript and how much pruning would save. The report is built from the same pieces as the prompt, so it cannot describe a prompt the model never receives.
- **Two context engines, swappable and inspectable.** `agent.contextEngine = default | compact`: `default` carries everything, `compact` halves the memory budget, keeps 2 verbatim tool results and drops the roster/goals — for long chats on a small phone. Each engine describes itself in one sentence, and an unknown name falls back to `default` rather than failing a turn.
- Tests: **665 cases, 0 failures** (3 skipped by design; 42 new across `test/tier2g.test.ts` and `test/tier2h.test.ts`). Census: **WORKING 54 → 61 · ABSENT 36 → 31 · BROKEN 0**, score **59% → 63%**, drift 0, core lane still empty.


## 0.49.0 - 2026-10-03

- **The agent can browse what was sent to it.** Two new tools — `inbox_list` (newest first: name, kind, size, age, whether the text was saved, and `GONE` when the disk budget trimmed it) and `inbox_read` (the text of one arrival) — plus `/inbox` and `/inbox <name>` in the chat. "The file I sent you yesterday" now works without a path.
- **Read once, remembered.** Everything learned at arrival (document text, transcript, picture description) is written next to the file as `<name>.text.md`, and one row is added to `workspace/inbox/.inbox-index.json`. `inbox_read` answers from that note — **so the file never has to be parsed twice**, and the text still comes back after the file itself is gone. A re-arrival replaces its own row instead of stacking.
- **A trimmed arrival explains itself.** The index is a few KB and is protected from the disk budget, while the arrivals themselves stay trimmable. After a sweep the list says `GONE — trimmed by the disk budget` and `inbox_read` says the file was trimmed — never a missing-path error. If the text note outlived the file, that is what answers, with the truth about the original attached.
- **A chat cannot point outside the inbox.** Names are checked before anything is opened: separators, drive letters and `..` are refused, so a message can never read `../../config.json`.
- **The docs and the code cannot drift apart.** A test derives the "can send files" column from `docs/CHANNELS.md`, compares it with every `registerDocumentSender(...)` call in the gateway, and probes the runtime registry — adding a channel without touching the docs now fails the suite.
- **`docs-map --check` got stricter.** It used to pass when a generated row still said *"new — describe me"* while the file already had a header comment (it looked at the source, not at the row). It now names those rows as drift, because the doc is what a reader sees.
- Tests: **623 cases, 0 failures** (3 skipped by design; 18 new in `test/tier2f.test.ts`). Census verdicts unchanged by design this batch — it hardened `File operations` and `Disk budget + pruning` rather than adding a capability — so the score stays **59%** (WORKING 54 · BETTER 14 · PARTIAL 46 · ABSENT 36 · **BROKEN 0**), drift 0.


## 0.48.0 - 2026-10-03

- **A file that arrives is now read, not just stored.** The text inside an arriving PDF, DOCX, PPTX, XLSX or text file is pulled out by **our own readers** — no dependency added: PDF content streams are inflated (`FlateDecode`) and turned back into lines (`Tj`/`TJ`/`'`/`"`, with `Td`/`TD`/`T*`/`ET` breaking them), Office files are opened through a small ZIP reader on `node:zlib`. The text is capped at 20 000 characters **with a truncation note inside the text**, so a long document cannot silently change what the agent is answering.
- **A scan is not an empty document.** A PDF with no text layer gets one honest sentence (with the OCR suggestion) instead of a blank answer; a `.zip` is saved but not opened, and says so; a missing file says it could not be opened. The whole module never throws.
- **Pictures are looked at, or the limit is stated.** When the configured model can see (`gpt-4o`, `gpt-4.1`, `gpt-5`, `claude-3/4`, `gemini`, `qwen…-vl`, `llava`, `pixtral`, …) the picture goes to it as a real `image_url` content part, after the text, tools off, at most 2 sentences back — and that description is what the agent reads, so the base64 JPEG never enters a transcript or the disk. A text-only model produces *"I saved it but cannot see it"* plus the exact `termcrab config set provider.model …` command; a picture over 4 MB is refused before it costs a call. `o1` is deliberately not treated as a vision model.
- **A voice note becomes the message.** Arriving audio is transcribed through the same `whisper.cpp` engine `termcrab transcribe` uses, and the transcript is what the agent answers. Over 5 MB it says the recording is too long to transcribe on the phone instead of chewing CPU; with no engine installed the agent gets the one-line install hint.
- **Each of the three is a switch:** `channels.telegram.readDocuments`, `.transcribeVoice`, `.describePhotos` — all default `true`.
- **The inbox is swept; your workspace is not.** `workspace/inbox/` is now its own area in `termcrab disk` and in the disk budget (retention `storage.keepDays`, default 30 days), while anything written into `workspace/` is never a trim candidate.
- **Two gaps this batch's own tests exposed:** the readers could open Office files but the channel's allow-list did not list them (a Word file sent to the bot was refused as unknown — now `.docx .xlsx .pptx .xml` are allowed), and a `.pdf` arriving was previously saved with its text unread.
- **The rules are written down per channel:** `docs/CHANNELS.md` now has *What happens to a file that arrives* — the readers, the caps, the vision rules, the off-switches, the retention promise, and the limits (no OCR, spreadsheet numbers not read, archives not opened, Telegram-only for now).
- **The verifier of the tracker had a bug of its own.** `scripts/status.mjs` ended the "Now" section with a `\Z` anchor — JavaScript reads that as a literal capital **Z**, so a step whose evidence mentioned "ZIP" silently truncated the batch and every row after it disappeared from the report. The parser now lives in `scripts/worklog-parse.mjs` with a real end-of-input anchor, and `test/worklog.test.ts` pins the ZIP case.
- Tests: **605 cases, 0 failures** (3 skipped by design; 27 new in `test/tier2e.test.ts`, including a hand-built PDF and a hand-built ZIP so nothing about extraction is mocked). Census: **WORKING 53 → 54 · ABSENT 37 → 36 · BROKEN 0**, score **58% → 59%**, drift 0, core lane still empty.


## 0.47.0 - 2026-10-03

- **Telegram can finally hand the agent a file.** A photo, a document or a voice note now lands in `workspace/inbox/<timestamp>-<name>` and the agent is asked about it with the path and the caption (`[photo saved to inbox/2026-10-03T…-shot.jpg (12 KB)] look at this`). Names are sanitised, two files cannot collide, and the fetch happens with the same bot token the poller already uses.
- **There is a size limit, an allow-list, and a hard no.** `channels.telegram.maxFileMb` (default 20 MB) caps what is accepted; the extension allow-list decides what counts as a document; and **executables (`.apk .dex .exe .bin .so .sh .bat .cmd .msi .jar .dmg .iso`) are refused by name** — a refused file answers with one sentence and never touches the disk.
- **The agent can send a file back: `send_file`.** Give it a path (inside the usual allowed roots — no new authority), an optional caption, and optionally a channel/chat; without one it goes to the most recent conversation on the first channel that can send files. Failures do not lose the file: it is queued in the outbox **with the file**, and the retry sends the document, not an empty message.
- **A queue bug found by its own test:** `outbox.normalize()` was dropping the new `file` field, so a queued document would have been retried as blank text. Fixed, with the regression pinned.
- **Groups get manners.** In a group the bot now answers only when it is `@mentioned` or when the message replies to one of its own; the mention is stripped before the agent sees the text; `channels.telegram.groupPolicy="all"` opts a room into everything. A second bug found here: `learnSelf()` raced the first poll, so a mention in the very first batch of updates was invisible — the bot now learns its own identity before it starts listening.
- **The chat answers questions the CLI answers.** `/usage` (today's turns, tokens in/out, cost — the real meter), `/sessions` (the real store), `/memory` (the real files), `/help` (the list), joining `/new`, `/status`, `/agents`, `/providers`, `/heartbeat`. Every channel shares them; an unknown `/x` gets the list rather than silence.
- **The rules are written down per channel.** `docs/CHANNELS.md` says honestly which of the seven adapters can send files (Telegram only, for now), what each needs to run, and what the limits are — so nobody has to read source to find out that WhatsApp will not carry a PDF.
- **`doctor` stopped giving bad advice.** A busy gateway port was reported as `fail: port busy` with the fix "run termcrab gateway" — even when a gateway was already answering there from a different home. It now asks `/api/health` first: a TermCrab gateway already serving the address is reported `ok — already running (termcrab X on :7788; no pid file in this home)`, while a stranger on the port still fails, with the fix that actually moves the port.
- Tests: **577 cases, 0 failures** (3 skipped by design; 20 new in `test/tier2d.test.ts`, 2 new in `test/gateway.test.ts`). Census: **WORKING 51 → 53 · PARTIAL 47 → 46 · ABSENT 38 → 37 · BROKEN 0**, score **57% → 58%**, channels area **64% → 76%**, drift 0, core lane still empty.


## 0.46.0 - 2026-10-03

- **The CLI speaks JSON now, so scripts stop scraping.** Any structured command takes `--json` and then writes **exactly one document** to stdout: `{"ok":true,"command":"status","data":{…}}` on success, `{"ok":false,"command":"usage","error":{"message":"…","hint":"…"}}` on failure. It works on `status`, `sessions` (ls/export/purge/rename), `skills` (ls/import/new), `cron` (ls/add/rm/on/off), `memory` (show/search/compact), `approvals`, `usage`, `disk`, `doctor`, `run`/`wait` and `stop`.
- **A warning can no longer corrupt the answer.** In `--json` mode every log line moves to stderr before any command runs (`setLogToStderr`), so nothing interleaves with the document — proven by planting an unknown key in `config.json` and parsing stdout anyway.
- **Failure is data, and the exit code still means what it always did** (0 done · 1 failed · 124 timed out · 130 stopped). A missing chat, a missing cron job, a panel that is not running and a run that never finished each print `ok:false` **with the fix** in `error.hint` — and the timeout case still exits 124, so existing `if termcrab run --wait …` scripts keep working.
- **The human pages did not get worse.** `status` was split into data (`statusData()`), page (`renderStatus()`) and the old one-line call (`statusReport()`), so the two views are rendered from the same facts and cannot disagree; every other command keeps its sentence-shaped output untouched.
- **The contract is written down.** `docs/CLI.md` lists every command's `data` keys and shows copy-paste examples (`jq '.data.queue.running'`), and `termcrab help <cmd>` prints the same key list next to that command's flags.
- **A config problem is visible to a script.** `status --json` reports `configProblems` as `{path, severity}` entries — a machine wants to know *which key*, not to parse the English sentence explaining it.
- Tests: **555 cases, 0 failures** (1 skipped by design; 28 new in `test/tier2c.test.ts`). Census: **WORKING 50 → 51 · PARTIAL 48 → 47 · BROKEN 0**, score 57%, drift 0, core lane still empty.


## 0.45.0 - 2026-10-03

- **The bot now tells you it is thinking.** In Telegram a running turn sends `typing…` immediately, refreshes it every four seconds (Telegram forgets an indicator after about five), and lets it expire the moment the answer lands. If Telegram refuses the indicator the answer still goes out, and somebody on the allowlist's wrong side sees neither. Other channels keep the honest default: no indicator rather than a dependency just to draw one.
- **`termcrab <anything> --help` works, and `termcrab help <cmd>` tells you what a command can do.** One table in `src/command-help.ts` holds the usage, a one-line summary, every flag and an example for all 29 commands; the flat list, `help <cmd>`, `<cmd> --help` and the shell completions are all generated from it, so a flag cannot be documented in one place and missing in another. A test walks the CLI's own switch and fails if a command has no entry, or if a documented flag is never actually parsed — the old behaviour (`disk --help` throwing) cannot come back.
- **The CLI stops spraying escape codes at things that are not a terminal.** `src/core/color.ts` decides once: `TCRAB_COLOR=always|never` wins; a non-empty `NO_COLOR` beats `FORCE_COLOR`; otherwise colour only when stdout/stderr is a TTY. Logs, error messages and the bin's crash handler all go through it, so piping `termcrab` into a file, a log collector or a chat bridge gives clean text.
- **`termcrab completion bash|zsh|fish`** prints a completion script for your shell, generated from the same command table (every command name appears in all three; an unknown shell exits 1 with the usage line).
- **The five optional channels actually talk to the agent now.** Discord, Slack, Signal, SMS (Twilio) and Matrix were files that emitted an event and echoed "Echo: …"; they now share Telegram's handler (allowlists, per-chat sessions, `@agent` prefixes, `/new`), send the agent's answer back through their own transport, queue a failed send in the offline outbox **with the reason**, and are reachable from the `conversations_*` tools. Every transport is injectable, which is how they are tested without an SDK, a token or a network — signal-cli's JSON envelopes, Twilio's REST form + basic auth, Matrix's own-message filtering, Discord/Slack allowlists.
- **Honest limits, kept visible.** Those five still need their own client installed (or a Twilio account) and the census row says so; SMS is text-only (no MMS), Matrix sends plain text, and typing indicators exist only where a channel can show one dependency-free.
- **The study documents caught up with the code.** `docs/openclaw/README.md` had been quoting the first measurement (44%, 10 broken, ~40 core days); it now shows the live numbers with a "what shipped since" table, `BEAT-PLAN.md` has a batch-13 beat, and the tracker's Bengali summary keeps being generated from the census rather than typed by hand.
- Tests: **527 cases, 0 failures** (3 skipped by design; 33 new across `test/tier2b.test.ts` and `test/adapters.test.ts`). Census: **WORKING 41 → 50 · PARTIAL 53 → 48 · ABSENT 42 → 38 · BROKEN 0**, score **53% → 57%**, drift 0, core lane still empty.


## 0.44.0 - 2026-10-03

- **The phone claims now carry measured numbers.** `scripts/bench.mjs` times a fresh `npm install` (0.26 s — zero runtime dependencies), a cold start (103 ms), the idle gateway's RAM (67 MB), a stop-and-start (166 ms) and one real offline turn (83 ms), and writes them into the README's bench block with the Node version, the date and a stated ±40% tolerance. `test/tier2.test.ts` re-runs it and fails if the README's numbers drift too far from a live reading, so they cannot quietly become a lie.
- **The whole loop is proven to run with no network.** With the offline brain, one test blocks every non-loopback request and drives message in → queue → run → answer out, both through the panel API and the real CLI, then checks the transcript on disk. It caught a real leak: the gateway probed `api.openai.com` even when the provider was the mock brain. Startup and config-change probes now skip it, and `probeModel({offline:true})` says "nothing to probe" instead of failing a request.
- **The offline outbox stops losing replies.** It was a take-then-send list: a crash mid-send silently deleted a message, and a half-written file dropped them all. It is now an **ack-after-send queue** — claim, send, ack; a claim that died comes back as pending; a failed send keeps its text, reason and attempt count; the file is written atomically; delivered items are swept after a week. The telegram and whatsapp flushers use it, and the guarantee is stated honestly: **at-least-once, acked exactly once** (a crash between a successful send and its ack can repeat one message; acking first would lose messages instead).
- **The Termux guide answers the question a phone actually asks.** OEM battery killers by name (MIUI/HyperOS, ColorOS/OxygenOS, One UI, Funtouch, EMUI) with where each switch hides, the Termux:Boot "open it once or nothing starts" gotcha, wake-lock behaviour, and the proot/Ubuntu cleanup that gives gigabytes back. A test now fails if the guide prints a `termcrab` command the CLI does not have, or an `npm run` script that does not exist.
- **The first screen of the README answers three questions:** what it is, where it runs, and what it costs (free, MIT, zero runtime dependencies — you pay only your provider's tokens, and `--demo` needs no key and no network).
- **The tracker's Bengali summary is generated now.** It had been hand-written and had been showing "44%, 7 broken" for three batches while the code had moved to 53% and zero broken — the exact rot `scripts/census.mjs` exists to prevent. It is written from the same tally as the block below it.
- Tests: **494 cases, 0 failures** (3 skipped by design). Census unchanged — batch 12 proved claims instead of adding rows: **WORKING 41 · BETTER 14 · PARTIAL 53 · ABSENT 42 · BROKEN 0**, score 53%, drift 0, core lane ~0 days.


## 0.43.0 - 2026-10-03

- **The summary of a long chat is now written by the model, not by a grep.** When a session crosses the compaction threshold, the turns leaving the prompt window are handed to a model — the local tier if one is configured, else the model answering the turn — in bounded chunks (4,000 chars each, at most 4 calls), and its text is what lands in `memory/compacted/<session>.md`. The block header records the engine and the coverage: `## Compacted 2026-10-03 09:12 (240 turns, by model sum-1)`.
- **The deterministic digest is still the floor, and it says so.** No provider, a provider that throws, or `TCRAB_COMPACT=off` on a metered connection → the extractive digest is used and the reason is written into the entry (`by extractive — model failed: 503 service unavailable`). Nothing is deleted either way: the turns move to `<session>.archive.jsonl`, `sessions read` still returns every line, and the prompt blurb tells the model what it is reading — *the earlier 240 turns are summarised above — showing 1 of 1 block(s); the full transcript is on disk*.
- **Compaction is incremental and honest about its cap.** A digest only ever covers turns that are not already covered, so a 400-turn backlog cannot be summarised twice; when the chunk budget runs out the block says how many turns were left out instead of quietly pretending to be complete.
- **You can see it and force it.** `termcrab memory compact <session>` summarises an old chat on demand and prints the engine, the turn count and the file; `GET /api/status` reports the newest digest (`session`, `by`, `model`, `coveredTurns`, `blocks`, `file`).
- **The docs map can no longer rot.** `docs/ARCHITECTURE.md`'s file-by-file table is generated from the tree by `scripts/docs-map.mjs` (descriptions carried over, a file with no description is marked), and `--check` runs inside the test suite — the same suite still fails if any map-style doc names a `.ts` file that does not exist. This is the row that used to be hand-written and wrong.
- Tests: **484 cases, 0 failures** (3 skipped by design) (6 new in `test/compaction-llm.test.ts`, including a real `termcrab memory compact` run against a live OpenAI-shaped upstream). Census: **WORKING 39 → 41**, PARTIAL 54 → 53, ABSENT 43 → 42, score **52% → 53%**, drift 0, BROKEN 0 — and the **core lane is empty** (~4d → **~0d**): `LLM summarisation for compaction` and `Docs that match the code` were the last two rows.

## 0.42.0 - 2026-10-03

- **A typo in `config.json` can no longer break a running agent.** The hot-reload path validates the file *before* it merges: a torn write or an impossible value (`"port": "not-a-port"`, an unknown provider type, a negative timeout) is refused whole, the agent keeps the settings it was already running with, and the panel is told what is wrong (`/api/config` → `configProblems`, shown as a warning band in the UI). Unknown keys are reported but applied, so a newer key can never lock you out. `termcrab config set` refuses the same way, before anything is written.
- **Scripts can drive the agent now.** One id covers a run (the queue's turn id *is* the trace id), `GET /api/runs/:id` reports status, output, error, duration and tokens, and `termcrab run "msg"` submits into the panel while `termcrab run --wait <id>` prints the answer with shell-friendly exit codes (0 done · 1 failed · 124 timeout · 130 stopped).
- **Stopping actually stops.** `POST /api/stop` (one session or everything), `termcrab stop`, and the panel's stop button (which used to only cancel the browser's fetch) now abort the in-flight model call, keep whatever the agent had already written — marked `[interrupted]` — and leave no orphaned work behind: the session's lane stays busy until the runner settles, so the next message starts from a clean transcript.
- **You can see it thinking.** `{type:'draft'}` events carry the whole partial answer while the turn is still running (non-streaming providers included), the draft is persisted in the progress card so a reload mid-turn still shows it, and the bubble is marked `✍️ draft` until the final reply replaces it.
- **Skill precedence is written down and tested.** A user skill replaces a bundled one of the same name in `list()`, in `get()` and in the prompt index; `skills.allow` is a real allow-list (empty = everything), wired from config in the gateway and the CLI. The contract lives in `docs/SKILLS.md` and `test/tier0.test.ts` fails if the code and the page disagree.
- **The phone will not fill up.** `src/core/disk.ts` measures the state directory per area and trims the oldest transcripts, logs, usage lines and stale progress cards when `storage.maxMb` (default 500 MB) is crossed — never the config, the memory, the skills, the workspace, a lock file or anything written in the last minute. It reports the freed bytes: `termcrab disk [--trim]`, `GET /api/disk`, and a check at gateway start.
- **Releases cannot drift from their notes.** `scripts/release.mjs` writes `package.json` and the newest `CHANGELOG` section together, `--check` fails (in the suite too) when they disagree, `--notes` feeds `gh release create`, and `--tag` refuses a dirty tree. `package.json` now says the same version as the newest entry, which it had not for several releases.
- Tests: **475 cases, 0 failures** (7 steps in `test/tier0.test.ts`, live gateway + the real CLI binary). Census: **WORKING 32 → 39**, PARTIAL 61 → 54, score **49% → 52%**, drift 0, BROKEN 0; core lane ~4 focused days left (a model-written compaction summary and the docs-map row).

## 0.41.0 - 2026-10-03

- **You can see what the agent costs.** Providers now parse the `usage` block they were already being sent — both on streamed calls (the request asks for a usage frame) and non-streamed ones — and the loop **sums a whole turn** across its tool loop, because that is the number you are billed for. Every turn writes one line to `TCRAB_HOME/usage/<day>.jsonl`, `run:end` carries the numbers to the panel, and the assistant entry stores them so the footer survives a reload.
- **Three surfaces, one number.** The panel shows a per-turn footer under the reply (`1.2k tokens · in 900 · out 334 · ~$0.0042`) and a "N tok today" pill in the top bar; `termcrab usage [--json]` prints the same totals and per-model breakdown; `GET /api/usage[?day=YYYY-MM-DD]` is the source both read. With the panel down the CLI says so instead of inventing a number.
- **Measured, never modelled.** A server that reports nothing yields no usage at all — nothing is inferred from text length. The only estimated numbers come from the offline mock, and they carry `≈ estimated` in the panel. Cost appears only when a price is known: your `provider.priceInPerM` / `priceOutPerM`, or a **dated** built-in snapshot (`PRICING_AS_OF`) that is printed next to every cost. An unpriced model shows tokens with no cost.
- Tests: **463 cases, 0 failures** (6 new in `test/usage.test.ts`, including a live gateway and the real CLI binary). Full run ~20 s. Census: the usage row **ABSENT → WORKING**, drift 0, core lane ~7d → **~4d** — that was the last core-lane capability.

## 0.40.0 - 2026-10-03

- **One writer per transcript — the last BROKEN row.** `SessionStore` now takes a writer **claim** before a turn writes anything: a lock file holding owner, pid and a heartbeat. A second writer (the CLI while the panel is answering, a cron tick against a live chat, another surface in the same process) is **refused by name** — `[busy] session web:main is being written by gateway (pid 4242, last write 0s ago); nothing was written.` — instead of interleaving lines into the same JSONL. The claim survives a crash: a dead pid or a heartbeat older than the TTL is reclaimed, and a live writer whose claim lapsed retakes it on its next append rather than losing an entry.
- **Appends are atomic.** One `O_APPEND` write of one line per entry, and a torn tail left by a kill mid-write is cut before the next append — every line in the file parses. `runTurn` is the single fenced entry point, so CLI, dream, heartbeat, cron and the gateway all respect it; telegram/whatsapp, the wake/voice loop and cron now submit through `runQueuedTurn`, which closes the "one process only" limit declared in 0.37.0.
- **The docs map is checked, not trusted.** `docs/ARCHITECTURE.md` listed `src/providers/gemini.ts`, `anthropic.ts` and `ollama.ts` — files that never existed (one OpenAI-compatible client does the work). The tree now names the real providers, and `test/docs-map.test.ts` fails the suite if `ARCHITECTURE.md` or `API.md` names a `.ts` file that is not in the repo.
- Tests: **457 cases, 0 failures** (5 new in `test/writer-fence.test.ts`, 2 in `test/docs-map.test.ts`). Full run ~19 s. Census: **BROKEN 1 → 0**, drift 0, capability 48%, core-lane work left **~7 days** (was ~12).

## 0.39.0 - 2026-10-03

- **Your agent now remembers what it just learned.** `MEMORY.md` is append-only, so the newest facts are the important ones — but the prompt injected the *oldest* 3000 characters (`readHead`), which meant a fact written today could never enter context. The prompt now takes the newest facts first until its byte budget is spent, renders each one with its source (`MEMORY.md:<line>`), and always states the budget and how many facts stayed on disk ("showing the newest 34 of 120 facts"); `remember()` reports the line it wrote. The budget is configurable: `agent.memoryBudget` (bytes, default 3000).
- **Compaction summarises; it no longer deletes.** Compacting a session used to rewrite the transcript with only the kept lines — the removed turns survived only as 200-character fragments in a digest. Now the digest is written and the overflow moves to `sessions/<id>.archive.jsonl`; `read()` merges archive + live, so every original line is still on disk and still readable, while the model gets a small hot window plus the last compacted digest (`# Earlier in this conversation (compacted)`). Session totals in the panel count hot + archived, so the number you see is the real length of the conversation.
- Tests: **450 cases, 0 failures** (6 new in `test/memory-truth.test.ts`, plus the compaction contract updated). Full run ~19 s. Census: **BROKEN 3 → 1** (only transcript write fencing remains), drift 0, capability 47%, core-lane work left ~12 focused days.

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
