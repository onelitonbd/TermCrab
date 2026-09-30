import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';
import { bus } from '../gateway/events.js';

/** Follow-up task cards suggested by the agent; the operator dismisses them. */
export interface Suggestion {
  id: string;
  title: string;
  detail?: string;
  status: 'pending' | 'dismissed';
  createdAt: number;
}

function file(): string {
  return path.join(stateDir(), 'suggestions.json');
}

export function listSuggestions(status?: 'pending' | 'dismissed'): Suggestion[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as Suggestion[];
    const list = Array.isArray(raw) ? raw : [];
    return status ? list.filter((s) => s.status === status) : list;
  } catch {
    return [];
  }
}

function save(list: Suggestion[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(list, null, 2), 'utf8');
  bus.emit({ type: 'tasks', pending: list.filter((s) => s.status === 'pending').length });
}

export function suggest(title: string, detail?: string): Suggestion {
  const t = title.trim();
  if (!t) throw new Error('suggestion title is empty');
  const list = listSuggestions();
  const s: Suggestion = {
    id: `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
    title: t.slice(0, 200),
    detail: detail ? String(detail).slice(0, 500) : undefined,
    status: 'pending',
    createdAt: Date.now(),
  };
  list.push(s);
  save(list);
  return s;
}

export function dismiss(id: string): boolean {
  const list = listSuggestions();
  const hit = list.find((s) => s.id === id);
  if (!hit) return false;
  hit.status = 'dismissed';
  save(list);
  return true;
}
