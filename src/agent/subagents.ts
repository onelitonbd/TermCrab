/**
 * Scratch space for subagents (33.1).
 *
 * Two subagents editing files at the same time in the same folder is the kind
 * of race that looks like a bug in the model for weeks. Each task that asks for
 * a working directory gets its own under `workspace/subagents/<id>/` — created,
 * named after the task, and reported in the task line so a person can find it.
 *
 * Deliberately *not* a git worktree: this repository's user never asked for one,
 * a phone has no second checkout to spare, and a plain directory already gives
 * the property that matters — one task, one place, no collisions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { workspaceDir } from '../core/paths.js';

const safeId = (id: string): string => id.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 64);

export function subagentRoot(): string {
  return path.join(workspaceDir(), 'subagents');
}

/** Create (or return) the scratch directory for a task id. */
export function ensureSubagentDir(id: string): string {
  const dir = path.join(subagentRoot(), safeId(id));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface SubagentDir {
  id: string;
  path: string;
  files: number;
  bytes: number;
  modified: number;
}

/** What the scratch areas hold — used by `termcrab subagents` and the disk report. */
export function listSubagentDirs(): SubagentDir[] {
  const root = subagentRoot();
  if (!fs.existsSync(root)) return [];
  const out: SubagentDir[] = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(root, e.name);
    let files = 0;
    let bytes = 0;
    let modified = 0;
    try {
      for (const f of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
        if (!f.isFile()) continue;
        const st = fs.statSync(path.join(f.parentPath ?? dir, f.name));
        files += 1;
        bytes += st.size;
        modified = Math.max(modified, st.mtimeMs);
      }
    } catch {
      /* unreadable counts as empty */
    }
    out.push({ id: e.name, path: dir, files, bytes, modified });
  }
  return out.sort((a, b) => b.modified - a.modified);
}

/** Remove scratch directories older than `days` (0 = everything). Returns what went. */
export function pruneSubagentDirs(days = 7): { removed: string[]; freedBytes: number } {
  const cutoff = Date.now() - days * 86_400_000;
  const removed: string[] = [];
  let freedBytes = 0;
  for (const d of listSubagentDirs()) {
    if (d.modified && d.modified > cutoff) continue;
    try {
      fs.rmSync(d.path, { recursive: true, force: true });
      removed.push(d.id);
      freedBytes += d.bytes;
    } catch {
      /* leave what cannot be removed and say nothing about it */
    }
  }
  return { removed, freedBytes };
}
