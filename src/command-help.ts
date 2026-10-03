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
    usage: 'update',
    summary: 'check whether a newer TermCrab exists',
    flags: [],
  },
  {
    cmd: 'say',
    usage: 'say <text>',
    summary: 'speak text aloud on the device',
    flags: [],
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
    cmd: 'heartbeat',
    usage: 'heartbeat',
    summary: 'run one self-check right now',
    flags: [],
  },
  {
    cmd: 'skills',
    usage: 'skills [ls | import <folder|git-url> [--force] | new <name> [--description "<one line>"]]',
    summary: 'list, import or scaffold skills',
    flags: [
      'import <src>          copy a skill folder or clone a git repo',
      'import <src> --force  replace a skill that is already installed',
      'new <name>            scaffold a new skill folder',
      'new <name> --description "<one line>"  what the skill is for',
      '--json                the list (or what an import/new did) as one document',
    ],
    example: 'termcrab skills ls',
    json: '{count, skills:[{name, origin, description}]} · import → {source, count, results} · new → {created, path}',
  },
  {
    cmd: 'cron',
    usage: 'cron [ls | add --schedule "<cron>" --prompt "<text>" [--name <n>] [--critical] | rm <id> | enable <id> | disable <id>]',
    summary: 'scheduled jobs that keep repeating',
    flags: [
      '--schedule "<cron>"  when to run ("0 8 * * *" = 8am daily)',
      '--prompt "<text>"    what to ask the agent each time',
      '--name <n>           a human name for the job',
      '--critical           run even when the battery is low',
      '--json               list/add/rm/on/off as one JSON document',
    ],
    example: 'termcrab cron add --schedule "0 8 * * *" --prompt "give me a briefing" --name morning',
    json: '{count, jobs:[{id, name, schedule, enabled, critical, nextRun, prompt}]} · add → {job, nextRun} · rm → {removed}',
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
    usage: 'sessions [ls | export <id> | purge --older-than <days> | rename <old> <new>]',
    summary: 'manage chats: list, export as text, clean old ones',
    flags: [
      'ls                       list sessions with sizes',
      'export <id>              print a session as readable text',
      'purge --older-than <d>   delete sessions with no new lines in d days',
      'rename <old> <new>       rename a session key',
      '--json                   list/export/purge/rename as one JSON document',
    ],
    example: 'termcrab sessions export cli:main',
    json: '{count, sessions:[{id, messages, bytes, modified}]} · purge → {purged, freedBytes, olderThanDays} · export → {id, file, bytes} · rename → {from, to, renamed}',
  },
  {
    cmd: 'agents',
    usage: 'agents [ls | new <name> [--template brief|teacher|researcher]]',
    summary: 'named personalities (workspace/agents/<name>/SOUL.md)',
    flags: ['new <name>              create one', '--template <t>          starter personality'],
    example: 'termcrab agents new brief --template brief',
  },
  {
    cmd: 'transcribe',
    usage: 'transcribe <audio-file> [--model <ggml-model>]',
    summary: 'turn a voice recording into text (offline, needs whisper.cpp)',
    flags: ['--model <path>  whisper model to use'],
  },
  {
    cmd: 'embeddings',
    usage: 'embeddings [status | setup]',
    summary: 'smart memory search (optional, offline-capable)',
    flags: ['status  what is installed and cached', 'setup   download the optional model'],
  },
  {
    cmd: 'memory',
    usage: 'memory [show | search <query> | compact <session>] [--json]',
    summary: 'look inside memory, or summarise an old chat with the model',
    flags: [
      'show                 the newest facts with their source line',
      'search <query>       search the memory files',
      'compact <session>    summarise an old chat (the full transcript stays on disk)',
      '--json               show/search/compact as one JSON document',
    ],
    json: 'show → {text, facts, totalFacts, bytes, budget, stats, files} · search → {query, count, hits} · compact → {session, compacted, coveredTurns, by, model, note, file}',
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
