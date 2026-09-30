import fs from 'node:fs';
import path from 'node:path';
import { stateDir, ensureLayout } from '../core/paths.js';

/** Per-session progress card the agent maintains and the UI shows. */
export interface ProgressCard {
  session: string;
  todo: string[];
  doing: string[];
  done: string[];
  updatedAt: number;
}

function dir(): string {
  return path.join(stateDir(), 'progress');
}

function file(session: string): string {
  const safe = session.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 64) || 'default';
  return path.join(dir(), `${safe}.json`);
}

export function getProgress(session: string): ProgressCard | null {
  try {
    return JSON.parse(fs.readFileSync(file(session), 'utf8')) as ProgressCard;
  } catch {
    return null;
  }
}

export function saveProgress(card: ProgressCard): ProgressCard {
  fs.mkdirSync(dir(), { recursive: true });
  card.updatedAt = Date.now();
  fs.writeFileSync(file(card.session), JSON.stringify(card, null, 2), 'utf8');
  return card;
}

function clampList(items: unknown, max = 30): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((s) => String(s).slice(0, 300)).slice(0, max);
}

export function updateProgress(
  session: string,
  patch: { todo?: string[]; doing?: string[]; done?: string[] },
): ProgressCard {
  const card = getProgress(session) ?? { session, todo: [], doing: [], done: [], updatedAt: Date.now() };
  if (patch.todo) card.todo = clampList(patch.todo);
  if (patch.doing) card.doing = clampList(patch.doing);
  if (patch.done) card.done = clampList(patch.done);
  return saveProgress(card);
}

export function clearProgress(session: string): boolean {
  try {
    fs.unlinkSync(file(session));
    return true;
  } catch {
    return false;
  }
}

void ensureLayout;
