/**
 * The disk budget (10.6). A phone that fills up should get *quieter*, not
 * broken: when the state directory grows past the budget the oldest, least
 * valuable files (old chat transcripts, rotated logs, usage lines, stale
 * progress cards, and the inbox of files strangers sent the bot — 16.4) are
 * trimmed — never the config, the memory, the skills, anything the user wrote
 * into the workspace, or a file touched in the last minute (which is what a
 * file being written right now looks like). Whatever is trimmed is reported in
 * bytes, so nobody has to guess what happened.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Config } from './config.js';
import { home } from './paths.js';

export interface DiskUsage {
  root: string;
  totalBytes: number;
  /** Bytes per area; `other` is whatever sits outside the known directories. */
  byArea: Record<string, number>;
  files: number;
}

const AREAS: { name: string; prefix: string; trimmable: boolean }[] = [
  { name: 'sessions', prefix: 'sessions/', trimmable: true },
  { name: 'memory', prefix: 'memory/', trimmable: false },
  { name: 'skills', prefix: 'skills/', trimmable: false },
  // First match wins, so the inbox is listed (and trimmed) as its own area
  // before the general `workspace/` rule — the files the user wrote into the
  // workspace are never touched, but files a stranger sent to the bot are
  // transient by nature (16.4).
  { name: 'inbox', prefix: 'workspace/inbox/', trimmable: true },
  { name: 'workspace', prefix: 'workspace/', trimmable: false },
  { name: 'logs', prefix: 'logs/', trimmable: true },
  { name: 'usage', prefix: 'usage/', trimmable: true },
  { name: 'progress', prefix: 'state/progress/', trimmable: true },
  { name: 'state', prefix: 'state/', trimmable: false },
];

interface FileRecord {
  path: string;
  rel: string;
  size: number;
  mtimeMs: number;
  area: string;
  trimmable: boolean;
}

function walk(root: string, rel = ''): FileRecord[] {
  const out: FileRecord[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      out.push(...walk(root, relPath));
      continue;
    }
    if (!e.isFile() && !e.isSymbolicLink()) continue;
    let st: fs.Stats;
    try {
      st = fs.statSync(path.join(root, relPath));
    } catch {
      continue;
    }
    const area = AREAS.find((a) => relPath.startsWith(a.prefix));
    out.push({
      path: path.join(root, relPath),
      rel: relPath,
      size: st.size,
      mtimeMs: st.mtimeMs,
      area: area?.name ?? 'other',
      trimmable: area?.trimmable ?? false,
    });
  }
  return out;
}

/** Bytes per area, plus the total. Reads the tree once; small on purpose. */
export function diskUsage(root = home()): DiskUsage {
  const byArea: Record<string, number> = {};
  let total = 0;
  const files = walk(root);
  for (const f of files) {
    byArea[f.area] = (byArea[f.area] ?? 0) + f.size;
    total += f.size;
  }
  return { root, totalBytes: total, byArea, files: files.length };
}

export interface TrimResult {
  /** Files removed. */
  removed: number;
  freedBytes: number;
  /** What is left after trimming. */
  totalBytes: number;
  /** True when the budget still cannot be met (nothing trimmable left). */
  overBudget: boolean;
  /** Human-readable reason for each pass that did something. */
  notes: string[];
}

/** Never delete these, whatever the budget says. */
const PROTECTED_NAMES = new Set([
  'config.json',
  'MEMORY.md',
  'SOUL.md',
  // The inbox index is a few KB and it is the only thing that lets the agent
  // say "that file is gone" honestly after the retention rule trims an arrival
  // (17.4). The arrivals themselves stay trimmable.
  '.inbox-index.json',
]);

/**
 * Bring the state directory under `maxBytes`.
 *
 * Pass 1 removes trimmable files older than `keepDays` (the "keep the last N
 * days" promise). Pass 2, only if it is still over budget, removes the oldest
 * trimmable files first — never a lock file, never a file touched in the last
 * minute, never config/memory/skills/workspace.
 */
export function enforceDiskBudget(
  maxBytes: number,
  opts: { keepDays?: number; root?: string; now?: number } = {},
): TrimResult {
  const root = opts.root ?? home();
  const now = opts.now ?? Date.now();
  const keepDays = opts.keepDays ?? 0;
  const notes: string[] = [];
  let removed = 0;
  let freedBytes = 0;

  const candidates = (): FileRecord[] =>
    walk(root)
      .filter((f) => f.trimmable && !PROTECTED_NAMES.has(path.basename(f.rel)) && !f.rel.endsWith('.lock'))
      .sort((a, b) => a.mtimeMs - b.mtimeMs);

  const drop = (f: FileRecord): void => {
    try {
      const size = fs.statSync(f.path).size;
      fs.unlinkSync(f.path);
      removed++;
      freedBytes += size;
    } catch {
      /* already gone */
    }
  };

  if (keepDays > 0) {
    const cutoff = now - keepDays * 86_400_000;
    const stale = candidates().filter((f) => f.mtimeMs < cutoff);
    for (const f of stale) drop(f);
    if (stale.length) notes.push(`removed ${stale.length} file(s) older than ${keepDays} day(s)`);
  }

  const total = (): number => walk(root).reduce((sum, f) => sum + f.size, 0);
  let left = total();
  if (left > maxBytes) {
    let trimmed = 0;
    for (const f of candidates()) {
      if (left <= maxBytes) break;
      if (now - f.mtimeMs < 60_000) continue; // something is writing this right now
      drop(f);
      trimmed++;
      left = total();
    }
    if (trimmed) notes.push(`removed the ${trimmed} oldest file(s) to meet the budget`);
  }

  left = total();
  return { removed, freedBytes, totalBytes: left, overBudget: left > maxBytes, notes };
}

/** The configured budget in bytes (storage.maxMb, default 500 MB). */
export function diskBudgetBytes(config: Config): number {
  const mb = config.storage?.maxMb;
  return Math.max(1, Math.round((typeof mb === 'number' && mb > 0 ? mb : 500) * 1024 * 1024));
}

/** The configured "keep the last N days" window for trimmable files. */
export function diskKeepDays(config: Config): number {
  const days = config.storage?.keepDays;
  return typeof days === 'number' && days >= 0 ? days : 30;
}

/** Trim to the configured budget, unless the user turned auto-trim off. */
export function autoTrim(config: Config): TrimResult | null {
  if (config.storage?.autoTrim === false) return null;
  return enforceDiskBudget(diskBudgetBytes(config), { keepDays: diskKeepDays(config) });
}
