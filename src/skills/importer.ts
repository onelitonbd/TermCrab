import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseFrontmatter } from '../core/frontmatter.js';
import { userSkillsDir, ensureLayout } from '../core/paths.js';

const execFileAsync = promisify(execFile);

export interface ImportResult {
  name: string;
  action: 'imported' | 'updated' | 'skipped';
  source: string;
}

const SAFE_NAME = /^[a-z0-9][a-z0-9-_]{0,63}$/;

function sanitizeName(raw: string, fallbackDir: string): string {
  const n = (raw || fallbackDir)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return SAFE_NAME.test(n) ? n : `skill-${n.replace(/[^a-z0-9]/g, '').slice(0, 20) || 'x'}`;
}

function importOne(skillDir: string, force: boolean): ImportResult {
  const file = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(file)) throw new Error(`no SKILL.md in ${skillDir}`);
  const raw = fs.readFileSync(file, 'utf8');
  const { data } = parseFrontmatter(raw);
  if (!data.name && !data.description) {
    throw new Error(`${file}: missing frontmatter (needs at least name:/description:)`);
  }
  const name = sanitizeName(String(data.name ?? ''), path.basename(skillDir));
  ensureLayout();
  const dest = path.join(userSkillsDir(), name);
  const destFile = path.join(dest, 'SKILL.md');
  const existed = fs.existsSync(destFile);
  if (existed && !force) {
    return { name, action: 'skipped', source: skillDir };
  }
  fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(destFile, raw, 'utf8');
  return { name, action: existed ? 'updated' : 'imported', source: skillDir };
}

function collectSkillDirs(root: string): string[] {
  const out: string[] = [];
  if (fs.existsSync(path.join(root, 'SKILL.md'))) return [root];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    if (fs.existsSync(path.join(dir, 'SKILL.md'))) out.push(dir);
  }
  return out;
}

/**
 * Import skills from a local directory or a git URL.
 * Compatible with OpenClaw-style skill folders (SKILL.md + YAML frontmatter).
 *
 *   termcrab skills import ./my-skills
 *   termcrab skills import https://github.com/org/repo.git --force
 *   termcrab skills import ./standalone-skill-dir
 */
export async function importSkills(source: string, opts: { force?: boolean } = {}): Promise<ImportResult[]> {
  let root = source;
  let cleanup: string | null = null;

  if (/^https?:\/\/|^git@/.test(source)) {
    cleanup = fs.mkdtempSync(path.join(os.tmpdir(), 'tcrab-import-'));
    root = path.join(cleanup, 'repo');
    try {
      await execFileAsync('git', ['clone', '--depth', '1', source, root], { timeout: 120_000 });
    } catch (err) {
      fs.rmSync(cleanup, { recursive: true, force: true });
      throw new Error(`git clone failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  try {
    if (!fs.existsSync(root)) throw new Error(`source not found: ${source}`);
    const dirs = collectSkillDirs(path.resolve(root));
    if (!dirs.length) throw new Error(`no SKILL.md found under ${source}`);
    const results: ImportResult[] = [];
    const errors: string[] = [];
    for (const dir of dirs) {
      try {
        results.push(importOne(dir, Boolean(opts.force)));
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    if (!results.length && errors.length) throw new Error(errors.join('; '));
    if (errors.length) {
      // partial success: report via action=skipped? Keep first error in result list as thrown warning
      throw new Error(`imported ${results.length}, failed: ${errors.join('; ')}`);
    }
    return results;
  } finally {
    if (cleanup) fs.rmSync(cleanup, { recursive: true, force: true });
  }
}
