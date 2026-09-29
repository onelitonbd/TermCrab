import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '../core/config.js';
import { workspaceDir } from '../core/paths.js';
import { isLikelyAndroid } from '../mobile/bionic.js';
import { MemoryStore } from './memory.js';
import { SkillStore } from '../skills/loader.js';

export interface PromptCtx {
  config: Config;
  memory: MemoryStore;
  skills: SkillStore;
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

function readWorkspaceFile(name: string): string {
  try {
    const f = path.join(workspaceDir(), name);
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').slice(0, 4000);
  } catch {
    /* ignore */
  }
  return '';
}

export function buildSystemPrompt(ctx: PromptCtx): string {
  const name = ctx.config.agent.name || 'Crabby';
  const soul = readWorkspaceFile('SOUL.md');
  const memory = ctx.memory.readHead(3000);
  const skills = ctx.skills.promptIndex();

  return `You are ${name}, a proactive personal AI agent running on the user's own device (TermCrab).
You are action-oriented: use tools to actually do things, then answer concisely.

# Identity
${soul || `You are ${name}, friendly, practical, and concise.`}

# Long-term memory
${memory || '(empty - use the remember tool to record durable facts)'}

# Skills index (load a skill with load_skill before using it)
${skills}

# Rules
- Be concise by default; structured answers for research.
- Before running shell commands, state briefly what you are doing.
- Never leak secrets. API keys live in config - never print them.
- When you learn a durable fact about the user or their preferences, call remember.
- If a tool fails, adapt; do not repeat the identical call more than twice.

${environmentBlurb()}`;
}
