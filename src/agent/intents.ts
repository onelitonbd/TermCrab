import fs from 'node:fs';
import path from 'node:path';
import { stateDir } from '../core/paths.js';

/** Standing intents: durable directives injected into every system prompt. */
export interface Intent {
  id: string;
  text: string;
  createdAt: number;
}

function file(): string {
  return path.join(stateDir(), 'intents.json');
}

export function listIntents(): Intent[] {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8')) as Intent[];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function save(list: Intent[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify(list, null, 2), 'utf8');
}

export function addIntent(text: string): Intent {
  const t = text.trim();
  if (!t) throw new Error('intent text is empty');
  const list = listIntents();
  const intent: Intent = { id: `in${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`, text: t.slice(0, 500), createdAt: Date.now() };
  list.push(intent);
  save(list);
  return intent;
}

export function removeIntent(id: string): boolean {
  const list = listIntents();
  const next = list.filter((i) => i.id !== id);
  if (next.length === list.length) return false;
  save(next);
  return true;
}
