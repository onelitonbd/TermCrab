import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';

/** Goal tracking: open goals with progress, surfaced in the system prompt. */
export interface Goal {
  id: string;
  title: string;
  status: 'open' | 'done';
  progress: number; // 0..100
  notes: string[];
  createdAt: number;
  updatedAt: number;
}

function file(): string {
  return path.join(stateDir(), 'goals.json');
}

export function listGoals(): Goal[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as Goal[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: Goal[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(list, null, 2), 'utf8');
}

export function createGoal(title: string, progress = 0): Goal {
  const t = title.trim();
  if (!t) throw new Error('goal title is empty');
  const list = listGoals();
  const goal: Goal = {
    id: `g${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
    title: t.slice(0, 200),
    status: 'open',
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    notes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  list.push(goal);
  save(list);
  return goal;
}

export function getGoal(id: string): Goal | null {
  return listGoals().find((g) => g.id === id || g.title.toLowerCase() === id.toLowerCase()) ?? null;
}

export function updateGoal(
  id: string,
  patch: { progress?: number; status?: 'open' | 'done'; title?: string; note?: string },
): Goal {
  const list = listGoals();
  const idx = list.findIndex((g) => g.id === id || g.title.toLowerCase() === id.toLowerCase());
  if (idx < 0) throw new Error(`goal not found: ${id}`);
  const g = list[idx]!;
  if (typeof patch.progress === 'number') g.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
  if (patch.status) g.status = patch.status;
  if (patch.title) g.title = patch.title.slice(0, 200);
  if (patch.note) g.notes.push(String(patch.note).slice(0, 300));
  g.updatedAt = Date.now();
  list[idx] = g;
  save(list);
  return g;
}
