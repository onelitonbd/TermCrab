import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '../core/config.js';
import { workspaceDir } from '../core/paths.js';
import { isLikelyAndroid } from '../mobile/bionic.js';
import { MemoryStore } from './memory.js';
import { SkillStore } from '../skills/loader.js';
import { listIntents } from './intents.js';
import { listGoals } from './goals.js';

export interface PromptCtx {
  config: Config;
  memory: MemoryStore;
  skills: SkillStore;
  /** Named agent (uses workspace/agents/<name>/SOUL.md when present). */
  agentName?: string;
}

const AGENT_NAME_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;

export function sanitizeAgentName(name: string): string | null {
  const n = (name || '').trim().toLowerCase();
  return AGENT_NAME_RE.test(n) ? n : null;
}

/** Named agents = folders under workspace/agents/ with a SOUL.md. */
export function listAgents(): string[] {
  try {
    const root = path.join(workspaceDir(), 'agents');
    if (!fs.existsSync(root)) return [];
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() && fs.existsSync(path.join(root, e.name, 'SOUL.md')))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export function agentExists(name: string): boolean {
  const n = sanitizeAgentName(name);
  return Boolean(n && listAgents().includes(n));
}

function timezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
  } catch {
    return 'local';
  }
}

function environmentBlurb(): string {
  const platform = isLikelyAndroid() ? 'Android (Termux)' : `${os.type()} ${os.release()}`;
  return `Environment: ${platform}; node ${process.version}; cwd ${process.cwd()}; timezone ${timezone()}; date ${new Date().toISOString()}`;
}

function readWorkspaceFile(rel: string): string {
  try {
    // rel is built internally (never raw user paths beyond sanitized agent names)
    const f = path.join(workspaceDir(), rel);
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').slice(0, 4000);
  } catch {
    /* ignore */
  }
  return '';
}

function readSoul(agentName?: string): { name: string; soul: string } {
  if (agentName) {
    const safe = sanitizeAgentName(agentName);
    if (safe) {
      const soul = readWorkspaceFile(path.join('agents', safe, 'SOUL.md'));
      if (soul) return { name: safe, soul };
    }
  }
  return { name: 'Crabby', soul: readWorkspaceFile('SOUL.md') };
}

export function buildSystemPrompt(ctx: PromptCtx): string {
  const memory = ctx.memory.readHead(3000);
  const skills = ctx.skills.promptIndex();
  const { name, soul } = readSoul(ctx.agentName);
  const displayName = ctx.agentName ? name : ctx.config.agent.name || name;

  const intents = listIntents();
  const intentsBlurb = intents.length
    ? `\n# Standing intents (always follow these)\n${intents.map((i) => `- ${i.text}`).join('\n')}\n`
    : '';
  const openGoals = listGoals().filter((g) => g.status === 'open').slice(0, 5);
  const goalsBlurb = openGoals.length
    ? `\n# Active goals\n${openGoals.map((g) => `- [${g.progress}%] ${g.title}`).join('\n')}\n`
    : '';

  const agentNote = ctx.agentName
    ? `\n# Active agent profile\nYou are currently running as the named agent "${ctx.agentName}". Stay in this role.\n`
    : '';

  return `You are ${displayName}, a proactive personal AI agent running on the user's own device (TermCrab).
You are action-oriented: use tools to actually do things, then answer concisely.
${agentNote}
# Identity
${soul || `You are ${displayName}, friendly, practical, and concise.`}

# Long-term memory
${memory || '(empty - use the remember tool to record durable facts)'}

# Skills index (load a skill with load_skill before using it)
${skills}${intentsBlurb}${goalsBlurb}
# Rules
- Be concise by default; structured answers for research.
- Before running shell commands, state briefly what you are doing.
- Never leak secrets. API keys live in config - never print them.
- When you learn a durable fact about the user or their preferences, call remember.
- If a tool fails, adapt; do not repeat the identical call more than twice.

${environmentBlurb()}`;
}
