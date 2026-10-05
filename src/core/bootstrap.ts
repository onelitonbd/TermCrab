/**
 * The file set a brand-new home gets (32.3).
 *
 * A fresh install used to be directories and nothing else: the agent had no
 * soul, no user file and no idea it was new, so the first conversation was the
 * user's job to explain. Now the first command that touches a new home writes
 * the files that make an agent an agent — and, crucially, writes them only
 * **once**: an existing file is never touched, because anything here may be the
 * owner's own words by then.
 *
 * The set is the same one OpenClaw's workspace uses where it makes sense
 * (SOUL, IDENTITY, AGENTS, USER, MEMORY) plus BOOTSTRAP.md, which is the file
 * that talks to the *agent* on the first turn and tells it to walk the owner
 * through the others — and to delete it once that is done.
 */
import fs from 'node:fs';
import path from 'node:path';
import { home, workspaceDir, memoryDir, userSkillsDir } from './paths.js';

export interface BootstrapFile {
  /** Path relative to the home directory (always forward slashes). */
  rel: string;
  /** Why it exists, one line — used by `termcrab bootstrap` and the doctor. */
  why: string;
  /** Written only when the agent name or language is known at write time. */
  body: (ctx: { name: string }) => string;
}

export const BOOTSTRAP_FILES: BootstrapFile[] = [
  {
    rel: 'workspace/BOOTSTRAP.md',
    why: 'the first-run note: read by the agent once, then deleted',
    body: ({ name }) => `# BOOTSTRAP.md — a fresh TermCrab home

This file exists because this home is new. It is meant to be **deleted** when
the first conversation is over (the agent can do it: \`delete_file\`).

## What was created for you

| File | What it is | Who edits it |
|---|---|---|
| \`workspace/SOUL.md\` | who ${name} is and how it behaves | the owner, or the agent on request |
| \`workspace/IDENTITY.md\` | name, tone, language, hard nos | the owner |
| \`workspace/AGENTS.md\` | which agent answers on which surface | the owner |
| \`workspace/skills/\` | skills the agent can load | either |
| \`memory/MEMORY.md\` | durable facts, one per line | the agent, with \`remember\` |
| \`memory/USER.md\` | what the agent knows about the owner | either |
| \`state/\` | schema stamp, snapshots, sessions | nobody by hand |

## The agent's job on this first turn

1. Greet the owner by name if you know it, and say in one line that this is a
   fresh install.
2. Ask the two questions that actually matter: **what should I call you**, and
   **what language should I answer in**. Write the answers with \`remember\`.
3. Offer to write \`IDENTITY.md\` and \`USER.md\` from the answers.
4. Then **delete this file** so the next turn is a normal one.

Keep it short — this is a greeting, not a manual.
`,
  },
  {
    rel: 'workspace/SOUL.md',
    why: 'who the agent is and how it behaves',
    body: ({ name }) => `# SOUL.md — who ${name} is

You are ${name}: a practical, friendly personal assistant running on the
owner's own phone. You are action-oriented — you use tools and then answer
concisely, in the language the owner writes in.

## How you behave

- Direct and brief by default; longer only when the task is longer.
- You say what you are doing before you run something, and what happened after.
- You ask before anything destructive, expensive or public.
- When you learn something durable about the owner, you \`remember\` it.
- You never print secrets — API keys live in config, never in a reply.

Edit this file to change any of that. It is injected at the top of every turn.
`,
  },
  {
    rel: 'workspace/IDENTITY.md',
    why: 'name, tone, language, and the things the agent must not do',
    // Injected into every turn, so it is deliberately pure settings: one short
    // line each. The explanation of what it is lives in BOOTSTRAP.md.
    body: ({ name }) => `Name: ${name}
Language: same as the owner
Tone: friendly, short
Hard nos:
`,
  },
  {
    rel: 'workspace/AGENTS.md',
    why: 'how surfaces map to agents — one agent unless you add more',
    body: ({ name }) => `# AGENTS.md — who answers where

By default one agent answers everywhere:

| Surface | Agent |
|---|---|
| web panel | ${name} |
| Telegram | ${name} |
| terminal (CLI / TUI) | ${name} |
| cron, heartbeat, hooks | ${name} |

To add a named agent, create \`workspace/agents/<name>/SOUL.md\` and talk to it
with \`termcrab agent "…" --as <name>\`. To change the routing rules, describe
them here in plain language — this file is injected into every turn.
`,
  },
  {
    rel: 'memory/MEMORY.md',
    why: 'durable facts, newest first, one per line',
    // Everything above the first fact is injected into every prompt, so this
    // head is deliberately two short lines. The explanation lives in
    // BOOTSTRAP.md instead.
    body: () => `# Long-term memory

Facts, one per line — the agent appends with its remember tool; newest last.
`,
  },
  {
    rel: 'memory/USER.md',
    why: "the owner's own file: name, language, preferences",
    // Also injected every turn; the labels are here so filling it in is obvious.
    body: () => `Name:
Language:
Timezone:
What matters to me:
`,
  },
];

export interface BootstrapResult {
  /** Files written by this call (relative paths). */
  created: string[];
  /** Files that were already there — untouched. */
  kept: string[];
  /** Non-file things the home needs (directories made if missing). */
  dirs: string[];
  home: string;
}

export interface BootstrapOptions {
  /** Overwrite existing files (default false: the owner's words win). */
  force?: boolean;
  /** Agent name for the templates. */
  name?: string;
  /** Home to bootstrap; defaults to the real one (tests pass a temp dir). */
  root?: string;
}

/**
 * Write the missing files of the set. Idempotent, never destructive: with the
 * default `force: false` an existing file is reported as kept and left exactly
 * as it is.
 */
export function runBootstrap(opts: BootstrapOptions = {}): BootstrapResult {
  const root = opts.root ? path.resolve(opts.root) : home();
  const name = (opts.name || 'Crabby').trim() || 'Crabby';
  const created: string[] = [];
  const kept: string[] = [];
  const dirs: string[] = [];

  for (const dir of [workspaceDir(), memoryDir(), userSkillsDir(), path.join(workspaceDir(), 'agents')]) {
    const where = opts.root ? path.join(root, path.relative(home(), dir) || '.') : dir;
    if (!fs.existsSync(where)) {
      fs.mkdirSync(where, { recursive: true });
      dirs.push(where);
    }
  }

  for (const file of BOOTSTRAP_FILES) {
    const target = path.join(root, file.rel);
    const exists = fs.existsSync(target);
    if (exists && !opts.force) {
      kept.push(file.rel);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const body = file.body({ name });
    fs.writeFileSync(target, body.endsWith('\n') ? body : `${body}\n`, 'utf8');
    created.push(file.rel);
  }

  return { created, kept, dirs, home: root };
}

export interface BootstrapStatus {
  home: string;
  complete: boolean;
  /** Files that are missing from the set. */
  missing: string[];
  /** Files present, with their size. */
  present: { rel: string; bytes: number; why: string }[];
  /**
   * 'empty'     — nothing has been written yet (no BOOTSTRAP.md, no file set)
   * 'first-run' — the note is still there: the agent will introduce itself
   * 'done'      — the owner has been through it (the note was deleted)
   */
  stage: 'empty' | 'first-run' | 'done';
  nextStep: string;
}

export function bootstrapStatus(root?: string): BootstrapStatus {
  const base = root ? path.resolve(root) : home();
  const present: { rel: string; bytes: number; why: string }[] = [];
  const missing: string[] = [];
  for (const file of BOOTSTRAP_FILES) {
    const target = path.join(base, file.rel);
    try {
      if (fs.existsSync(target)) {
        present.push({ rel: file.rel, bytes: fs.statSync(target).size, why: file.why });
        continue;
      }
    } catch {
      /* unreadable counts as missing */
    }
    missing.push(file.rel);
  }
  const noteThere = fs.existsSync(path.join(base, 'workspace', 'BOOTSTRAP.md'));
  const stage: BootstrapStatus['stage'] = noteThere ? 'first-run' : present.length ? 'done' : 'empty';
  return {
    home: base,
    complete: missing.length === 0,
    missing,
    present,
    stage,
    nextStep:
      stage === 'empty'
        ? 'termcrab bootstrap --write   (SOUL, IDENTITY, AGENTS, USER and MEMORY, written once and never overwritten)'
        : stage === 'first-run'
          ? 'talk to your agent — it will introduce itself and then delete workspace/BOOTSTRAP.md'
          : 'nothing to do: the file set is complete',
  };
}

/** The first-run note, if it is still there. Injected into the prompt once. */
export function readBootstrapNote(): string {
  try {
    const f = path.join(workspaceDir(), 'BOOTSTRAP.md');
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').slice(0, 2000);
  } catch {
    /* ignore */
  }
  return '';
}

/** The owner's IDENTITY.md, injected alongside SOUL.md when it has content. */
export function readIdentity(): string {
  try {
    const f = path.join(workspaceDir(), 'IDENTITY.md');
    if (!fs.existsSync(f)) return '';
    return fs.readFileSync(f, 'utf8').slice(0, 1200);
  } catch {
    return '';
  }
}
