import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Config } from '../core/config.js';
import { workspaceDir } from '../core/paths.js';
import { isLikelyAndroid } from '../mobile/bionic.js';
import { MemoryStore } from './memory.js';
import { readDigest } from './sessions.js';
import { SkillStore } from '../skills/loader.js';
import { listIntents } from './intents.js';
import { listGoals } from './goals.js';

export interface PromptCtx {
  config: Config;
  memory: MemoryStore;
  skills: SkillStore;
  /** Named agent (uses workspace/agents/<name>/SOUL.md when present). */
  agentName?: string;
  /** Where the reply is delivered: web, telegram, whatsapp, cli, voice, cron, heartbeat, dream, subagent. */
  channel?: string;
  /** Session whose transcript this prompt is for (its compacted digest is injected). */
  sessionId?: string;
  /** Override the memory budget (the context engine decides; 19.3). */
  memoryBudget?: number;
  /**
   * Keep the verbose sections (standing intents, active goals, agent roster).
   * The `compact` context engine sets this false so a long chat on a small
   * phone carries only what the turn needs (19.4).
   */
  includeExtras?: boolean;
}

const AGENT_NAME_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;

/** Per-channel delivery notes so the model knows where its reply lands and what renders there. */
const CHANNEL_NOTES: Record<string, { label: string; guide: string }> = {
  web: {
    label: 'the web panel (a browser on this device)',
    guide: 'Full markdown renders: headings, tables, lists, code blocks, quotes, links.',
  },
  telegram: {
    label: 'Telegram (mobile chat app)',
    guide:
      'Format with simple markdown only: **bold**, *italic*, `code`, fenced code blocks, - lists, > quotes, [links](url). ' +
      'Never use tables or HTML tags - they will not render on Telegram. ' +
      'Keep it phone-friendly: short paragraphs, one idea per line where possible.',
  },
  whatsapp: {
    label: 'WhatsApp (mobile chat app)',
    guide: 'Formatting does not render on WhatsApp: use plain text, short lines, no markdown symbols.',
  },
  cli: {
    label: 'the terminal TUI (a console on this device)',
    guide: 'Markdown is fine; keep lines under about 100 characters.',
  },
  voice: {
    label: 'voice assistant - the reply is spoken aloud',
    guide: 'Plain speakable text only: no markdown, no lists, no links; one or two short sentences.',
  },
  cron: {
    label: 'a scheduled job - no human is watching this reply',
    guide: 'Write a compact status note.',
  },
  heartbeat: {
    label: 'a scheduled heartbeat self-check',
    guide: 'Compact status note; act only if something needs attention.',
  },
  dream: {
    label: 'an offline memory-consolidation run',
    guide: 'Internal working note.',
  },
  subagent: {
    label: 'a parent agent that delegated this task',
    guide: 'Report results compactly for another agent.',
  },
};

export function channelGuide(channel?: string): string {
  if (!channel) return '';
  const note = CHANNEL_NOTES[channel];
  const label = note ? note.label : `the "${channel}" channel`;
  const guide = note ? note.guide : 'Match your formatting to what this channel can display.';
  return `\n# Current channel\nYou are replying via ${label}. ${guide}\n`;
}

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

/** Read AGENTS.md roster (multi-agent routing rules). */
export function readAgentsRoster(): string {
  return readWorkspaceFile('AGENTS.md');
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

/**
 * The prompt broken into named sections (19.3). `buildSystemPrompt` is written
 * from these same pieces, so `termcrab context` can never measure a prompt the
 * model does not actually receive.
 */
export function promptSectionSizes(ctx: {
  config: Config;
  memoryBlock: string;
  skills: SkillStore;
  agentName?: string;
  channel?: string;
  includeExtras?: boolean;
}): { section: string; bytes: number; note: string }[] {
  const { name, soul } = readSoul(ctx.agentName);
  const displayName = ctx.agentName ? name : ctx.config.agent.name || name;
  const bytes = (s: string): number => Buffer.byteLength(s, 'utf8');
  const extras = ctx.includeExtras !== false;
  const parts: { section: string; text: string; note: string }[] = [
    {
      section: 'identity + rules',
      text: `You are ${displayName}.\n${soul}\n${channelGuide(ctx.channel)}`,
      note: 'who the agent is and how it must behave',
    },
    { section: 'memory', text: `# Long-term memory\n${ctx.memoryBlock}`, note: 'facts injected newest-first within the budget' },
    { section: 'skills index', text: ctx.skills.promptIndex(), note: 'skill names + one line each (full text loads on demand)' },
    { section: 'environment', text: environmentBlurb(), note: 'device, platform and paths' },
  ];
  if (ctx.agentName) parts.push({ section: 'agent profile', text: `You are running as "${ctx.agentName}"`, note: 'named-agent role line' });
  if (extras) {
    const intents = listIntents();
    if (intents.length) parts.push({ section: 'standing intents', text: intents.map((i) => `- ${i.text}`).join('\n'), note: 'always-follow instructions' });
    const goals = listGoals().filter((g) => g.status === 'open').slice(0, 5);
    if (goals.length) parts.push({ section: 'active goals', text: goals.map((g) => `- [${g.progress}%] ${g.title}`).join('\n'), note: 'what the agent is working toward' });
    const roster = readAgentsRoster();
    if (roster) parts.push({ section: 'agent roster', text: roster, note: 'other named agents on this device' });
  }
  return parts.map((p) => ({ section: p.section, bytes: bytes(p.text), note: p.note }));
}

/** How big the skills index is (count + bytes) — used by the context report. */
export function detectSkillsIndexBytes(skills: SkillStore): { count: number; bytes: number } {
  const index = skills.promptIndex();
  return { count: skills.list().length, bytes: Buffer.byteLength(index, 'utf8') };
}

export function buildSystemPrompt(ctx: PromptCtx): string {
  // Newest facts first (see MemoryStore.readForPrompt) — the old head-only read
  // meant a fact written today could never reach the prompt.
  const memory = ctx.memory.readForPrompt(ctx.memoryBudget ?? ctx.config.agent.memoryBudget ?? 3000).text;
  const digest = ctx.sessionId ? readDigest(ctx.sessionId, 1200) : null;
  // Never let the model mistake a summary for the turns themselves: the blurb
  // says who wrote it, how much it covers, and where the originals are.
  const engine = digest?.by ? `Written by ${digest.by}${digest.model ? ` ${digest.model}` : ''}.\n` : '';
  const digestBlurb =
    digest?.text
      ? `\n# Earlier in this conversation (compacted)\n${engine}${digest.text}\n\n` +
        `(the earlier ${digest.totalCoveredTurns} turns are summarised above — showing ${digest.blocks} of ${digest.totalBlocks} block(s); the full transcript is on disk)\n`
      : '';
  const skills = ctx.skills.promptIndex();
  const { name, soul } = readSoul(ctx.agentName);
  const displayName = ctx.agentName ? name : ctx.config.agent.name || name;

  const extras = ctx.includeExtras !== false;
  const intents = extras ? listIntents() : [];
  const intentsBlurb = intents.length
    ? `\n# Standing intents (always follow these)\n${intents.map((i) => `- ${i.text}`).join('\n')}\n`
    : '';
  const openGoals = extras ? listGoals().filter((g) => g.status === 'open').slice(0, 5) : [];
  const goalsBlurb = openGoals.length
    ? `\n# Active goals\n${openGoals.map((g) => `- [${g.progress}%] ${g.title}`).join('\n')}\n`
    : '';
  const roster = extras ? readAgentsRoster() : '';
  const rosterBlurb = roster
    ? `\n# Agent roster\n${roster}\n`
    : '';

  const agentNote = ctx.agentName
    ? `\n# Active agent profile\nYou are currently running as the named agent "${ctx.agentName}". Stay in this role.\n`
    : '';

  return `You are ${displayName}, a proactive personal AI agent running on the user's own device (TermCrab).
You are action-oriented: use tools to actually do things, then answer concisely.
${agentNote}${channelGuide(ctx.channel)}# Identity
${soul || `You are ${displayName}, friendly, practical, and concise.`}

# Long-term memory
${memory || '(empty - use the remember tool to record durable facts)'}${digestBlurb}

# Skills index (load a skill with load_skill before using it)
${skills}${intentsBlurb}${goalsBlurb}${rosterBlurb}
# Rules
- Be concise by default; structured answers for research.
- Before running shell commands, state briefly what you are doing.
- Never leak secrets. API keys live in config - never print them.
- When you learn a durable fact about the user or their preferences, call remember.
- If a tool fails, adapt; do not repeat the identical call more than twice.

${environmentBlurb()}`;
}
