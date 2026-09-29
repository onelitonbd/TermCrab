import fs from 'node:fs';
import path from 'node:path';
import { userSkillsDir, workspaceDir } from '../core/paths.js';

/**
 * Starter files: a working SKILL.md skeleton for `termcrab skills new`,
 * and three bundled SOUL templates for `termcrab agents new --template`.
 * Both are plain Markdown — the user edits them like anything else.
 */

const NAME_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;

export function scaffoldSkill(
  name: string,
  description = '',
): { ok: true; path: string } | { ok: false; error: string } {
  if (!NAME_RE.test(name)) {
    return { ok: false, error: 'name must be lowercase letters, digits, - or _ (max 64)' };
  }
  const dir = path.join(userSkillsDir(), name);
  const file = path.join(dir, 'SKILL.md');
  if (fs.existsSync(file)) {
    return { ok: false, error: `skill already exists: ${file}` };
  }
  const desc = description.trim() || `TODO: one line describing when to use the ${name} skill`;
  const body = `---
name: ${name}
description: ${desc}
---

# ${name}

Write your instructions here. The agent reads this file when the skill is
relevant, so be specific about *what to do* and *when*.

## Steps

1. TODO: first concrete step
2. TODO: next step

## Example

> User: (a sample request this skill should handle)
>
> Agent: (what a good answer looks like)

## Notes

- Keep it short — the whole file goes into the agent's context.
- One skill = one job. Split big abilities into several skills.
`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, body, 'utf8');
  return { ok: true, path: file };
}

export const SOUL_TEMPLATES = ['brief', 'teacher', 'researcher'] as const;
export type SoulTemplate = (typeof SOUL_TEMPLATES)[number];

export function isSoulTemplate(v: string): v is SoulTemplate {
  return (SOUL_TEMPLATES as readonly string[]).includes(v);
}

const TEMPLATE_BODIES: Record<SoulTemplate, string> = {
  brief: `# SOUL

- Name: {NAME}
- Tone: extremely brief — answer in one or two sentences unless asked for more.
- No lists, no preamble, no restating the question.
- If a tool call answers it, just report the result.
` + '\n',
  teacher: `# SOUL

- Name: {NAME}
- Tone: warm, patient teacher — explain *why*, not just *what*.
- Break hard ideas into small steps; use one plain analogy per concept.
- End each explanation with a quick "try this" check the user can do.
- Never mock a question; there are no stupid ones.
` + '\n',
  researcher: `# SOUL

- Name: {NAME}
- Tone: careful analyst — separate facts from guesses, always.
- State confidence: "confirmed", "likely", or "unverified".
- Give sources or the command you ran for any factual claim.
- End with open questions worth checking next.
` + '\n',
};

/** Returns the SOUL.md text for a template (name substituted in). */
export function soulTemplate(kind: SoulTemplate, name: string): string {
  return TEMPLATE_BODIES[kind].replace('{NAME}', name);
}

/** Write workspace/agents/<name>/SOUL.md from a template. Refuses to overwrite. */
export function scaffoldAgent(
  name: string,
  kind: SoulTemplate,
): { ok: true; path: string } | { ok: false; error: string } {
  if (!/^[a-z0-9][a-z0-9-_]{0,63}$/.test(name)) {
    return { ok: false, error: 'name must be lowercase letters, digits, - or _ (max 64)' };
  }
  const dir = path.join(workspaceDir(), 'agents', name);
  const file = path.join(dir, 'SOUL.md');
  if (fs.existsSync(file)) {
    return { ok: false, error: `agent already exists: ${file}` };
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, soulTemplate(kind, name), 'utf8');
  return { ok: true, path: file };
}
