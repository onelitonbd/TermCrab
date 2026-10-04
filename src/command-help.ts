/**
 * Per-command help and shell completion (13.3, 13.4).
 *
 * One table is the single source of truth: `termcrab help <cmd>`,
 * `termcrab <cmd> --help`, `termcrab help` (the list) and
 * `termcrab completion bash|zsh|fish` all read from it, so a flag can never be
 * documented in one place and missing in another. `test/tier2b.test.ts` fails
 * when a command that exists in cli.ts has no entry here, or when an entry
 * names a flag that cli.ts does not parse.
 */

export interface CommandDoc {
  /** The word typed after `termcrab`. */
  cmd: string;
  /** How to call it, without the leading `termcrab`. */
  usage: string;
  /** One line for the command list. */
  summary: string;
  /** Flags and subcommands, one per line. */
  flags: string[];
  /** A concrete thing to try, printed at the bottom. */
  example?: string;
  /** What `--json` puts in `data`, when the command has a machine view. */
  json?: string;
}

export const COMMANDS: CommandDoc[] = [
  {
    cmd: 'help',
    usage: 'help [command]',
    summary: 'this list, or one command in detail',
    flags: ['<command>   show only that command (same as `<command> --help`)'],
    example: 'termcrab help agent',
  },
  {
    cmd: 'version',
    usage: 'version',
    summary: 'print the version and the Node it runs on',
    flags: [],
  },
  {
    cmd: 'onboard',
    usage: 'onboard [flags]',
    summary: 'first-time setup wizard (writes config.json)',
    flags: [
      '--provider <p>        provider type (openai, mock, ...)',
      '--model <m>           model name',
      '--api-key <k>         API key (also read from the environment)',
      '--base-url <u>        custom OpenAI-compatible endpoint',
      '--telegram-token <t>  connect Telegram now',
      '--allow-user <ids>    comma-separated Telegram user ids',
      '--name <n>            what the assistant calls itself',
      '--demo                offline brain (mock): no network, no key',
      '--no-exec             do not let the agent run shell commands',
      '--non-interactive     never prompt; fail instead',
    ],
    example: 'termcrab onboard --demo',
  },
  {
    cmd: 'gateway',
    usage: 'gateway [--host <h>] [--port <p>]',
    summary: 'start the web control panel (and the channels)',
    flags: [
      '--host <h>   bind address (0.0.0.0 = reachable on your network)',
      '--port <p>   port to listen on (default from config, usually 7788)',
    ],
    example: 'termcrab gateway',
  },
  {
    cmd: 'supervisor',
    usage: 'supervisor',
    summary: 'start the gateway with auto-restart (always-on mode)',
    flags: [],
  },
  {
    cmd: 'doctor',
    usage: 'doctor [--json] [--share]',
    summary: 'health check: what is broken and how to fix it',
    flags: [
      '--json    machine-readable checks',
      '--share   copy-paste report with passwords stripped',
    ],
    json: '{checks:[{name, status, detail, fix}], failed}',
    example: 'termcrab doctor --share',
  },
  {
    cmd: 'update',
    usage: 'update [--check | --apply | --rollback]',
    summary: 'check whether a newer TermCrab exists — and take an update back if it will not start',
    flags: [
      '--check      ask now and print what it finds (the default)',
      '--apply      pull, install and build, then verify the new build starts — rolled back automatically if it does not',
      '--rollback   put the newest build snapshot back by hand',
    ],
    example: 'termcrab update --apply',
    json: '{current, latest, updateAvailable, applied, target, snapshot?, rolledBack?, files?}',
  },
  {
    cmd: 'backup',
    usage: 'backup [file.tar] [--json]',
    summary: 'one tar with config, chats, memory, skills and state — move the whole agent to a new phone',
    flags: [
      '--json   file, format, counts and platform as data',
    ],
    example: 'termcrab backup',
    json: '{file, format, formatVersion, createdAt, release, schemaVersion, files, bytes, platform, node}',
  },
  {
    cmd: 'restore',
    usage: 'restore <file.tar> [--dry-run | --force] [--json]',
    summary: 'put a backup back — existing files are moved aside into state/restore-<time>, never overwritten',
    flags: [
      '--dry-run   verify and list what would happen, writing nothing',
      '--force     accept an archive written by a newer release than this build',
    ],
    example: 'termcrab restore termcrab-backup-2026-10-04.tar',
    json: '{restored, bytes, movedTo, from, schema:{from,to,migrated}}',
  },
  {
    cmd: 'service',
    usage: 'service [status | install | uninstall] [--dry-run] [--json]',
    summary: 'keep the agent running: a systemd user unit on Linux, launchd on macOS, Termux:Boot on Android',
    flags: [
      'install       write the unit and print the commands that enable it (no sudo, no root)',
      '--dry-run     print the path and the steps, write nothing',
      'uninstall     remove the unit (never touches your data)',
      '--json        platform, file, installed, action, steps',
    ],
    example: 'termcrab service install',
    json: '{ok, platform, file, installed, action, steps, error?}',
  },
  {
    cmd: 'bootstrap',
    usage: 'bootstrap [--write | --force] [--json]',
    summary: 'the files a new home gets (SOUL, IDENTITY, AGENTS, USER, MEMORY) and whether anything is missing',
    flags: [
      '--write   write only what is missing; an existing file is never touched',
      '--force   rewrite the templates even where files already exist — this overwrites your words, so it is deliberately not the default',
      '--json    the file set as data',
    ],
    example: 'termcrab bootstrap',
    json: '{home, complete, missing:[rel], present:[{rel,bytes,why}], stage, nextStep}',
  },
  {
    cmd: 'schema',
    usage: 'schema [--dry-run] [--json]',
    summary: 'the state schema version, and which migrations have run',
    flags: [
      '--dry-run   list the steps the next start would run, writing nothing',
      '--json      current + stamp as data',
    ],
    example: 'termcrab schema --dry-run',
    json: '{current, home, stamp:{version,updatedAt,applied,release}, from, to, applied, adopted, backupDir}',
  },
  {
    cmd: 'say',
    usage: 'say <text> [--json]',
    summary: 'speak text aloud on the device (Termux:API, espeak-ng, or macOS say)',
    flags: ['--json  {spoken, backend, chars} — and a failure envelope naming what is missing'],
    json: '{spoken, backend, chars}',
  },
  {
    cmd: 'agent',
    usage: 'agent "<message>" [--as <name>] [--tier local] [--session <id>] [--demo]',
    summary: 'talk to your assistant (no message = interactive chat)',
    flags: [
      '--as <name>     talk to a named agent (workspace/agents/<name>/SOUL.md)',
      '--tier local    run this one task on your own local model',
      '--session <id>  use a different session key (default cli:main)',
      '--demo          answer offline with the built-in mock brain',
    ],
    example: 'termcrab agent "what can you do?"',
  },
  {
    cmd: 'tui',
    usage: 'tui [--session <id>] [--as <name>] [--frames <file>] [--no-attach] [--demo]',
    summary: 'full-screen terminal: transcript, tool cards, live turns from other surfaces',
    flags: [
      '--session <id>   open a specific conversation (default: the rolling main session)',
      '--as <name>      talk to a named agent',
      '--no-attach      do not watch the gateway for turns from the panel or your phone',
      '--frames <file>  append every drawn frame to a file (for tests and bug reports)',
      '--demo           answer offline with the built-in mock brain',
    ],
    example: 'termcrab tui',
  },
  {
    cmd: 'heartbeat',
    usage: 'heartbeat',
    summary: 'run one self-check right now',
    flags: [],
  },
  {
    cmd: 'skills',
    usage: 'skills [ls | show <name> | import <folder|git-url> [--force] | new <name> | proposals [list|show|approve|reject]]',
    summary: 'list, import or scaffold skills',
    flags: [
      'import <src>          copy a skill folder or clone a git repo',
      'import <src> --force  replace a skill that is already installed',
      'new <name>            scaffold a new skill folder',
      'new <name> --description "<one line>"  what the skill is for',
      'proposals             skills the agent wrote and wants approved (nothing loads until you say yes)',
      'proposals approve <n>  move it into skills/<n>/ — live from the next turn',
      'proposals reject <n>   keep it out, with your reason recorded in skills/_rejected/',
      '--json                the list (or what an import/new did) as one document',
    ],
    example: 'termcrab skills ls',
    json: '{count, skills:[{name, origin, description}]} · import → {source, count, results} · new → {created, path}',
  },
  {
    cmd: 'cron',
    usage: 'cron [ls | show <id> | add --schedule "<cron>" --prompt "<text>" [--name <n>] [--critical] | rm <id> | enable <id> | disable <id>]',
    summary: 'scheduled jobs that keep repeating and record how it went (missed runs are caught up once after the device was off)',
    flags: [
      '--schedule "<cron>"  when to run ("0 8 * * *" = 8am daily)',
      '--prompt "<text>"    what to ask the agent each time',
      '--name <n>           a human name for the job',
      '--critical           run even when the battery is low',
      'show <id>            one job in full: target, next run and the last five attempts',
      '--json               list/show/add/rm/on/off as one JSON document',
    ],
    example: 'termcrab cron add --schedule "0 8 * * *" --prompt "give me a briefing" --name morning',
    json: 'ls → {count, jobs:[{id, name, schedule, enabled, critical, nextRun, prompt, agent, deliver, lastRun, lastResult, lastError, failures}]} · show → {job} · add → {job, nextRun} · rm → {removed}',
  },
  {
    cmd: 'import',
    usage: 'import openclaw [--from <dir>] [--apply] [--force]',
    summary: 'bring an OpenClaw setup over (preview first)',
    flags: [
      '--from <dir>  where the old setup lives (default ~/.openclaw)',
      '--apply       actually move anything (default is preview only)',
      '--force       replace files that already exist',
    ],
    example: 'termcrab import openclaw',
  },
  {
    cmd: 'approvals',
    usage: 'approvals [list | approve <id> | deny <id>] [--json]',
    summary: 'dangerous tools waiting for your yes/no',
    flags: ['--json  machine-readable list'],
    example: 'termcrab approvals approve 3f9c1e2a',
    json: '{count, approvals:[{id, tool, args, sessionId, createdAt}]} · approve/deny → {id, decision, by, ok}',
  },
  {
    cmd: 'usage',
    usage: 'usage [--json]',
    summary: "today's tokens (and cost when a price is known)",
    flags: ['--json  machine-readable day, totals and pricing date'],
    json: '{day, turns, calls, promptTokens, completionTokens, totalTokens, costUsd, priced, byModel, pricingAsOf, priceConfigured}',
  },
  {
    cmd: 'run',
    usage: 'run "<message>" [--session <id>] [--no-wait] [--json] | run --wait <id> [--timeout <s>] [--json]',
    summary: 'ask the running panel to do something, and wait for the answer',
    flags: [
      '--session <id>     session to append the message to',
      '--no-wait          return as soon as the run is queued',
      '--wait <id>        wait for a run you started earlier',
      '--timeout <s>      how long to wait (exit 124 when it runs out)',
      '--json             one JSON document, even when the run fails',
    ],
    example: 'termcrab run "summarise today" ',
    json: '{turnId, sessionId, status, …} · --wait → the finished run {runId, status, output, error, durationMs, tokensIn, tokensOut}',
  },
  {
    cmd: 'wait',
    usage: 'wait <id> [--timeout <s>] [--json]',
    summary: 'wait for a run and print what it produced',
    flags: ['--timeout <s>  how long to wait (exit 0 done, 1 failed, 124 timeout, 130 stopped)', '--json         the finished run as one document'],
    json: 'the finished run: {runId, status, output, error, durationMs, tokensIn, tokensOut}',
  },
  {
    cmd: 'stop',
    usage: 'stop [session] [--json]',
    summary: 'stop what the agent is doing right now (the partial answer is kept)',
    flags: ['--json  machine-readable result'],
    json: '{count, stopped:[runId], sessions:[…]}',
  },
  {
    cmd: 'perf',
    usage: 'perf [--full] [--save [--trust]] [--compare [release]] [--json]',
    summary: 'measure this machine against the performance budget (exit 1 when over)',
    flags: [
      '--full  also measure the slow halves: npm install, and a first-run compile',
      '--save  also write the measurement to docs/openclaw/data/perf-<release>.json',
      '--compare [release]  compare this run against a saved measurement (default: the newest other release)',
      '--trust  save even though the machine was busy (the file records the load)',
      '--json  the snapshot that was written to state/perf.json',
    ],
    json: '{at, source, bench, machine, metrics, ceilings, over, skipped, file, historyFile, runs, trend, saved?, compare?}',
  },
  {
    cmd: 'disk',
    usage: 'disk [--trim] [--max-mb <n>] [--keep-days <n>] [--json]',
    summary: 'how much space the agent uses',
    flags: [
      '--trim          enforce the budget now (oldest files first)',
      '--max-mb <n>    override the budget for this run',
      '--keep-days <n> override the retention for this run',
      '--json          machine-readable usage',
    ],
    json: '{before:{root, totalBytes, files, byArea}, budgetBytes, keepDays, trim, overBudget}',
  },
  {
    cmd: 'status',
    usage: 'status [--json]',
    summary: 'plain-English overview: brain, memory, schedule, battery',
    flags: ['--json  the same facts as data (the queue carries waiting/running numbers)'],
    json: '{name, brain, localBrain, panel, queue, channels, memory, heartbeat, cron, dream, agents, configProblems}',
  },
  {
    cmd: 'dream',
    usage: 'dream [--history] [--force]',
    summary: '"sleep on it" — turn chats into memory',
    flags: ['--history  show past dreams', '--force    run even if one ran recently'],
  },
  {
    cmd: 'wake',
    usage: 'wake [--keyword <word>]',
    summary: 'voice mode: say the keyword, then say your command',
    flags: ['--keyword <word>  the word that wakes it (default: hey crab)'],
  },
  {
    cmd: 'sessions',
    usage: 'sessions [ls | search <words> | show <id> | export <id> | reset <id> | verify | purge | rename]',
    summary: 'manage chats: find one, see what is in it, save it, clean old ones',
    flags: [
      'ls                       list sessions with sizes',
      'search <words>           ranked search across every chat, archive included',
      'show <id>                what the chat touched, learned and is waiting on',
      'export <id>              print a session as readable text',
      'reset <id>               archive the working thread; nothing is deleted',
      'verify                   check every transcript parses (--repair cuts torn tails)',
      'purge --older-than <d>   delete sessions with no new lines in d days',
      'rename <old> <new>       rename a session key',
      '--session <id>           search one chat only',
      '--limit <n>              how many search hits (default 10)',
      '--json                   every subcommand as one JSON document',
    ],
    example: 'termcrab sessions search plumber',
    json: '{count, sessions:[…]} · search → {query, count, hits:[{sessionId, part, line, role, when, score, snippet}]} · show → {id, entries, bytes, roles, digest, fence, policy, attachment} · verify → {sessions, badLines, repaired} · reset → {id, archivedTo, entries}',
  },
  {
    cmd: 'subagents',
    usage: 'subagents [list | show <id> | clear | scratch [--prune]]',
    summary: 'background subagent tasks: what is running, what came back, and the scratch space they used',
    flags: [
      'list            every task this process knows (running, done, error, timeout)',
      'show <id>       one task in full: prompt, timing, output or the reason it stopped',
      'clear           forget finished tasks (running ones stay)',
      'scratch         the per-task working directories under workspace/subagents/',
      '--prune         delete those directories (with scratch)',
    ],
    example: 'termcrab subagents list',
    json: '{count, running, tasks:[{id,sessionId,prompt,label,agent,cwd,status,started,finished,elapsedMs,output,error}]}',
  },
  {
    cmd: 'agents',
    usage: 'agents [ls | new <name> [--template brief|teacher|researcher] | routes [set <surface> <agent>|clear <surface>]]',
    summary: 'named personalities (workspace/agents/<name>/SOUL.md) and which surface each one answers on',
    flags: [
      'new <name>              create one',
      '--template <t>          starter personality',
      'routes                  the resolved table: surface → agent (web, telegram, cli, cron, voice, wake, subagent)',
      'routes set <s> <agent>  pin a surface to an agent (an @prefix or --as still wins)',
      'routes clear <s>        back to the main agent',
    ],
    example: 'termcrab agents routes set telegram crabby',
  },
  {
    cmd: 'docs',
    usage: 'docs [build | rebuild | status | path] [--keep] [--json]',
    summary: 'every doc as one offline HTML page — searchable, zero-dependency, rendered by the panel\'s own markdown renderer',
    flags: [
      'build          build it if it is stale (the default), reusing the file otherwise',
      'rebuild        build it again even if it looks fresh',
      '--keep         also write docs-site-<release>.html and keep the last 5 releases',
      'status         is the page still what is on disk? release, age, and what changed since (38.4)',
      'path           just print where the file is',
      '--json         {file, bytes, docs, sections, builtAt, rebuilt} (status adds release, age, staleDocs, stale, kept)',
    ],
    example: 'termcrab docs && echo "open: $(termcrab docs path)"',
    json: '{file, bytes, docs, sections, builtAt, rebuilt}',
  },
  {
    cmd: 'security',
    usage: 'security [audit] [--json]',
    summary: 'audit what this install actually allows (exec, sandbox, approvals, bind address, tokens, browser) and where your keys actually are — read-only, every finding carries its fix',
    flags: [
      'audit     the whole audit (this is the default)',
      '--json    every finding as data: {counts, findings:[{id, level, title, detail, fix?}]} — exit 1 when something is a fail',
    ],
    example: 'termcrab security',
    json: '{counts:{fail,warn,info,ok}, findings:[{id, level, title, detail, fix?}]}',
  },
  {
    cmd: 'board',
    usage: 'board [--limit <n>] [--json]',
    summary: 'one screen for everything in flight: live turns, subagent tasks, scheduled jobs and the cards the agent suggested',
    flags: [
      '--limit <n>   show only the first n cards',
      '--json        the same as data, with counts per status',
    ],
    example: 'termcrab board',
    json: '{generatedAt, counts:{running,queued,scheduling,failed,done,suggested}, cards:[{id, kind, status, title, at?, detail?}]}',
  },
  {
    cmd: 'rooms',
    usage: 'rooms [list | show <channel:chat> [--limit <n>] | clear <channel:chat> | clear --all] [--json]',
    summary: 'ambient room history: what was said in a chat while the bot was not addressed (and is stored locally, bounded)',
    flags: [
      'list                    every room with history, the message count and how many arrived since you were last addressed',
      'show <channel:chat>     the last messages of one room, oldest first (telegram:-100123)',
      'clear <channel:chat>    forget one room\'s history',
      'clear --all             forget every room\'s history',
      '--limit <n>             show: how many messages back (default 20)',
      '--json                  the same as data',
    ],
    example: 'termcrab rooms show telegram:-100123',
    json: 'list → {count, rooms:[{key, channel, room, messages, sinceAddressed, lastAt, bytes}]} · show → {room, count, messages:[{ts, from, fromId?, text, addressed}]} · clear → {cleared, dropped, room?}',
  },
  {
    cmd: 'browser',
    usage: 'browser [status | open <url> | text | shot] [--json]',
    summary: 'drive the browser you already have (Chrome/Chromium with a debug port) — read a page, click, fill, screenshot',
    flags: [
      'status         is a browser reachable, which build, and which tabs (and how to start one if not)',
      'open <url>     navigate and report the final URL + title',
      'text           the page text the agent would read',
      'shot           a real PNG under workspace/browser/',
      '--json         the same as data',
    ],
    example: 'termcrab browser open https://example.com',
    json: 'status → {available, browser?, tabs:[{title,url}], hint?} · open → {url, loaded, title} · text → {url, chars, text} · shot → {file, bytes, width, height}',
  },
  {
    cmd: 'transcribe',
    usage: 'transcribe <audio-file> [--model <ggml-model>] [--json]',
    summary: 'turn a voice recording into text (offline, needs whisper.cpp)',
    flags: ['--model <path>  whisper model to use', '--json          {file, text, engine, model, ms} as one document'],
    json: '{file, text, engine, model, ms}',
  },
  {
    cmd: 'embeddings',
    usage: 'embeddings [status | setup | test [text]] [--json]',
    summary: 'smart memory search: the local model, or your provider\u2019s embedding endpoint',
    flags: [
      'status         which embedder is live, the model, its price, and the fix when there is none',
      'setup          install and download the optional local model (~23 MB, offline, no key)',
      'test [text]    embed one string end to end and print the dimension — proof, not a promise',
      'memory.embedProvider = auto | local | openai | gemini   (auto: local if installed, else your chat provider)',
      'memory.embedModel / memory.embedBaseUrl                override the model or point at your own endpoint',
    ],
    example: 'termcrab embeddings test "the crab likes rice"',
    json: '{packageInstalled, enabled, indexVectors, modelCached, provider, model, costNote, blocker?, summary}',
  },
  {
    cmd: 'memory',
    usage: 'memory [show | search <query> | user [line] | compact <session>] [--json]',
    summary: 'look inside memory, or summarise an old chat with the model',
    flags: [
      'show                 the newest facts with their source line',
      'search <query>       ranked search (exact phrase and recent facts first) with provenance',
      'user [line]          show USER.md, or add one line to it',
      'compact <session>    summarise an old chat (the full transcript stays on disk)',
      '--json               show/search/user/compact as one JSON document',
    ],
    json: 'show → {text, facts, totalFacts, bytes, budget, stats, files} · search → {query, count, hits{file,line,score,snippet,origin,when,source}} · user → {file, text} · compact → {session, compacted, coveredTurns, by, model, note, file}',
  },
  {
    cmd: 'runs',
    usage: 'runs [--json]',
    summary: 'what is running right now, and whether any of it is stuck',
    flags: ['--json   one document: count + runs[] with verdict, lastActivity, suggestion'],
    example: 'termcrab runs',
    json: '{count, live, runs:[{sessionId, turnId, runId, request, elapsedMs, verdict, lastActivity, idleMs, suggestion}]}',
  },
  {
    cmd: 'presence',
    usage: 'presence [--json]',
    summary: 'who can reach this agent right now: watchers, channels, devices, people',
    flags: ['--json   count, watchers, summary and entries[] with state + seenAgoMs'],
    example: 'termcrab presence',
    json: '{count, live, watchers, summary, entries:[{kind, id, label, state, lastSeenAt, seenAgoMs, detail}]}',
  },
  {
    cmd: 'image',
    usage: 'image "<prompt>" [--size 1024x1024] [--out <path>]',
    summary: 'make an image — provider image endpoint when configured, local placeholder under mock',
    flags: ['--size WxH         1024x1024 (default) up to 2048x2048', '--out <file.png>   write here instead of workspace/outbox', '--json             path, bytes, width, height, prompt, provider, model, placeholder'],
    example: 'termcrab image "a crab reading a book on a beach" --size 1536x1024',
    json: '{path, bytes, width, height, prompt, provider, model, placeholder}',
  },
  {
    cmd: 'models',
    usage: 'models [--json]',
    summary: 'what models this endpoint has, and what each one can do (vision, tools, thinking, context, price)',
    flags: ['--json    live (from the endpoint) or catalog models with a capabilities line each'],
    example: 'termcrab models',
    json: '{live, note, provider, current, count, models:[{id, provider, contextWindow, vision, tools, thinking, priceInPerM, priceOutPerM, source, capabilities}]}',
  },
  {
    cmd: 'auth',
    usage: 'auth [list | add <name> --provider <openai|anthropic|gemini> --key <key> [--base-url <url>] [--model <id>] | remove <name> | audit]',
    summary: 'named API keys stored in state/auth-profiles.json (mode 0600) so config.json never holds a secret',
    flags: ['list             profile names, providers and whether a key is set (never the key)', 'add              store or replace one key', 'remove <name>    forget it', 'audit            where the keys are: key-shaped strings in config.json, memory and state (masked), the credential stores and their file mode', '--json           the same list as data'],
    example: 'termcrab auth add work --provider anthropic --key sk-ant-…  &&  termcrab config set provider.authProfile work',
    json: '{count, profiles:[{id, provider, baseUrl, model, createdAt, updatedAt, hasKey}], message?}',
  },
  {
    cmd: 'orders',
    usage: 'orders [list|add <text>|remove <id>]',
    summary: 'standing orders — always-follow instructions injected into every turn',
    flags: ['list               what is in force now (default)', 'add "<text>"       add one (every surface follows it from the next turn)', 'remove <id>        drop one immediately', '--json             count + orders[] with id, text, createdAt'],
    example: 'termcrab orders add "always answer in Bengali"',
    json: '{count, orders:[{id, text, createdAt}]}',
  },
  {
    cmd: 'events',
    usage: 'events [--json]',
    summary: 'which internal events can wake a hook on their own, and who listens',
    flags: ['--json   count + events[] with the hooks listening for each'],
    example: 'termcrab events',
    json: '{count, events:[{name, what, hooks:[id]}]}',
  },
  {
    cmd: 'logs',
    usage: 'logs [n] [--json|--path]',
    summary: 'the last n records from logs/termcrab.jsonl (rotation is built in)',
    flags: ['<n>      how many records (default 30)', '--path   print just the file path', '--json   path, limits, usage and the records'],
    example: 'termcrab logs 50',
    json: '{path, limits:{maxBytes, maxFiles}, usage:{bytes, files}, count, records:[{ts, level, area, message, ...}]}',
  },
  {
    cmd: 'pair',
    usage: 'pair [--name <label>]',
    summary: 'print a short-lived code so a phone or tablet can get its own token',
    flags: ['--name <label>  name this device (shown in `termcrab devices`)', '--json          the code, its expiry and how to redeem it'],
    example: 'termcrab pair --name pixel',
    json: '{code, expiresAt, ttlMs, name, howTo}',
  },
  {
    cmd: 'devices',
    usage: 'devices [list|revoke <id|name>]',
    summary: 'the devices this gateway trusts, and how to take one back',
    flags: ['list              who is paired, when they were last seen (default)', 'revoke <id|name>  kill one device token immediately', '--json            devices plus any unused pairing codes'],
    example: 'termcrab devices revoke pixel',
    json: '{count, devices:[{id, name, createdAt, lastSeenAt, seenAgoMs, seenCount}], pendingCodes}',
  },
  {
    cmd: 'context',
    usage: 'context [session] [--json]',
    summary: 'what the model is really sent: prompt sections, tool schemas, hot transcript',
    flags: [
      'session              which transcript to measure (default: "default")',
      '--json               the same numbers as one JSON document',
    ],
    json: 'context → {engine, sections[{section,bytes,note}], totalBytes, tools{count,schemaBytes}, history{messages,bytes,pruned}, memory{facts,totalFacts,budget,userBytes}, skills{count,bytes}, notes}',
  },
  {
    cmd: 'boot',
    usage: 'boot [install | status]',
    summary: 'start automatically when the phone boots (Termux:Boot)',
    flags: ['install  write the Termux:Boot script', 'status   is it installed, and is this Termux?'],
  },
  {
    cmd: 'config',
    usage: 'config [list | get <key> | set <key> <value> | path]',
    summary: 'change settings (the same settings live in the web panel)',
    flags: [
      'list               show the config with secrets redacted',
      'get <key>          print one value',
      'set <key> <value>  validate and save one value',
      'path               where config.json lives',
    ],
    example: 'termcrab config set channels.telegram.allowedUserIds [123456789]',
  },
  {
    cmd: 'completion',
    usage: 'completion bash|zsh|fish',
    summary: 'print a completion script for your shell',
    flags: ['bash|zsh|fish  the shell to write for'],
    example: 'termcrab completion bash > /etc/bash_completion.d/termcrab',
  },
];

export function commandNames(): string[] {
  return COMMANDS.map((c) => c.cmd);
}

export function findCommand(name: string): CommandDoc | undefined {
  return COMMANDS.find((c) => c.cmd === name);
}

/** The text `termcrab help <cmd>` and `termcrab <cmd> --help` print. */
export function commandHelp(name: string): string | null {
  const doc = findCommand(name);
  if (!doc) return null;
  const lines: string[] = [];
  lines.push(`termcrab ${doc.usage}`);
  lines.push('');
  lines.push(doc.summary);
  if (doc.flags.length) {
    lines.push('');
    for (const f of doc.flags) lines.push(`  ${f}`);
  }
  if (doc.json) {
    lines.push('');
    lines.push(`  --json  one JSON document on stdout, nothing else: {"ok":true,"command":"${doc.cmd}","data":…}`);
    lines.push(`          ${doc.json}`);
    lines.push('          on failure: {"ok":false,"command":"…","error":{"message":…,"hint":…}}, exit code non-zero');
  }
  if (doc.example) {
    lines.push('');
    lines.push(`example: ${doc.example}`);
  }
  lines.push('');
  lines.push(`see also: termcrab help   (every command)`);
  return lines.join('\n');
}

/** The command list `termcrab help` prints when no topic is given. */
export function renderCommandIndex(): string {
  const width = Math.max(...commandNames().map((n) => n.length));
  return COMMANDS.map((c) => `  ${c.cmd.padEnd(width)}  ${c.summary}`).join('\n');
}

export function completionScript(shell: string): string | null {
  const names = commandNames();
  switch (shell) {
    case 'bash':
      return [
        '# termcrab completion for bash',
        '# install: termcrab completion bash > /etc/bash_completion.d/termcrab',
        '_termcrab() {',
        '  local cur="${COMP_WORDS[COMP_CWORD]}"',
        `  local cmds="${names.join(' ')}"`,
        '  if [ "$COMP_CWORD" -eq 1 ]; then',
        '    COMPREPLY=( $(compgen -W "$cmds" -- "$cur") )',
        '    return 0',
        '  fi',
        '  case "${COMP_WORDS[1]}" in',
        '    completion) COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") ); return 0 ;;',
        '    config) COMPREPLY=( $(compgen -W "list get set path" -- "$cur") ); return 0 ;;',
        '    sessions) COMPREPLY=( $(compgen -W "ls export purge rename" -- "$cur") ); return 0 ;;',
        '    skills) COMPREPLY=( $(compgen -W "ls import new" -- "$cur") ); return 0 ;;',
        '    cron) COMPREPLY=( $(compgen -W "ls add rm enable disable" -- "$cur") ); return 0 ;;',
        '    agents) COMPREPLY=( $(compgen -W "ls new" -- "$cur") ); return 0 ;;',
        '    memory) COMPREPLY=( $(compgen -W "show search compact" -- "$cur") ); return 0 ;;',
        '    approvals) COMPREPLY=( $(compgen -W "list approve deny" -- "$cur") ); return 0 ;;',
        '    boot) COMPREPLY=( $(compgen -W "install status" -- "$cur") ); return 0 ;;',
        '    embeddings) COMPREPLY=( $(compgen -W "status setup" -- "$cur") ); return 0 ;;',
        '  esac',
        '  COMPREPLY=( $(compgen -W "--help --json" -- "$cur") )',
        '}',
        'complete -F _termcrab termcrab',
        '',
      ].join('\n');
    case 'zsh':
      return [
        '#compdef termcrab',
        '# termcrab completion for zsh',
        '# install: termcrab completion zsh > "${fpath[1]}/_termcrab"',
        '_termcrab() {',
        '  local -a cmds',
        `  cmds=(${names.join(' ')})`,
        '  if (( CURRENT == 2 )); then',
        '    _describe "termcrab command" cmds',
        '    return',
        '  fi',
        "  _describe 'value' (bash zsh fish list get set path ls export purge rename import new add rm enable disable approve deny show search compact install status setup)",
        '}',
        'compdef _termcrab termcrab',
        '',
      ].join('\n');
    case 'fish':
      return [
        '# termcrab completion for fish',
        '# install: termcrab completion fish > ~/.config/fish/completions/termcrab.fish',
        ...names.map((n) => `complete -c termcrab -n "__fish_use_subcommand" -a "${n}"`),
        'complete -c termcrab -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"',
        'complete -c termcrab -l help -d "show help for this command"',
        'complete -c termcrab -l json -d "machine-readable output"',
        '',
      ].join('\n');
    default:
      return null;
  }
}
