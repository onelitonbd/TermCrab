import fs from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from '../core/frontmatter.js';
import { builtinSkillsDir, userSkillsDir } from '../core/paths.js';

export interface SkillMeta {
  name: string;
  description: string;
  path: string;
  origin: 'builtin' | 'user';
}

export interface Skill extends SkillMeta {
  content: string;
}

const NAME_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;

function readSkillDir(dir: string, origin: 'builtin' | 'user'): Skill | null {
  const file = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = parseFrontmatter(raw);
    const name = typeof data.name === 'string' && NAME_RE.test(data.name) ? data.name : path.basename(dir);
    const description = typeof data.description === 'string' ? data.description.slice(0, 300) : '';
    if (!NAME_RE.test(name)) return null;
    return { name, description, content, path: dir, origin };
  } catch {
    return null;
  }
}

function scan(root: string, origin: 'builtin' | 'user'): Map<string, Skill> {
  const out = new Map<string, Skill>();
  if (!fs.existsSync(root)) return out;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const skill = readSkillDir(path.join(root, e.name), origin);
    if (skill) out.set(skill.name, skill);
  }
  return out;
}

/**
 * Skills are discovered fresh on each call (hot-reload friendly, no cache staleness).
 *
 * Precedence (documented in docs/SKILLS.md, pinned by test/tier0.test.ts): roots
 * are read left to right and later roots win, so a skill in the user's
 * `~/.termcrab/skills/<name>` replaces a bundled skill of the same name — in
 * `list()`, in `get()` and in the prompt index alike. `opts.allow` narrows what
 * the agent may use at all (an empty array means "no skills"); without it,
 * nothing is gated.
 */
export class SkillStore {
  private readonly allow: Set<string> | null;

  constructor(
    private readonly roots: { dir: string; origin: 'builtin' | 'user' }[] = [
      { dir: builtinSkillsDir(), origin: 'builtin' },
      { dir: userSkillsDir(), origin: 'user' },
    ],
    opts: { allow?: string[] } = {},
  ) {
    this.allow = Array.isArray(opts.allow) ? new Set(opts.allow) : null;
  }

  /** May this skill be loaded and served to the model at all? */
  private permitted(name: string): boolean {
    return this.allow === null || this.allow.has(name);
  }

  list(): SkillMeta[] {
    const merged = new Map<string, SkillMeta>();
    // Iterate in order: user skills (later roots) override built-ins.
    for (const root of this.roots) {
      for (const [name, s] of scan(root.dir, root.origin)) {
        if (!this.permitted(name)) continue;
        merged.set(name, { name, description: s.description, path: s.path, origin: s.origin });
      }
    }
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(name: string): Skill | null {
    if (!NAME_RE.test(name) || !this.permitted(name)) return null;
    for (const root of [...this.roots].reverse()) {
      const s = readSkillDir(path.join(root.dir, name), root.origin);
      if (s) return s;
    }
    return null;
  }

  /** Index block injected into the system prompt: cheap (descriptions only). */
  promptIndex(): string {
    const skills = this.list();
    if (!skills.length) return '(no skills installed)';
    return skills.map((s) => `- ${s.name} [${s.origin}]: ${s.description || 'no description'}`).join('\n');
  }

  create(name: string, content: string): Skill {
    if (!NAME_RE.test(name)) throw new Error('invalid skill name');
    const dir = path.join(userSkillsDir(), name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
    const skill = readSkillDir(dir, 'user');
    if (!skill) throw new Error('failed to create skill');
    return skill;
  }

  update(name: string, content: string): Skill {
    if (!NAME_RE.test(name)) throw new Error('invalid skill name');
    const dir = path.join(userSkillsDir(), name);
    if (!fs.existsSync(dir)) throw new Error('skill not found');
    fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
    const skill = readSkillDir(dir, 'user');
    if (!skill) throw new Error('failed to update skill');
    return skill;
  }

  remove(name: string): boolean {
    if (!NAME_RE.test(name)) return false;
    const dir = path.join(userSkillsDir(), name);
    if (!fs.existsSync(dir)) return false;
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  }
}
