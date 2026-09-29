import fs from 'node:fs';
import path from 'node:path';
import { outboxPath, stateDir } from '../core/paths.js';

/**
 * Offline outbox: outbound messages that failed to send (flaky mobile data)
 * are persisted and retried later instead of being lost.
 */
export interface OutboxItem {
  channel: 'telegram';
  chatId: number;
  text: string;
  ts: number;
  attempts: number;
}

function load(): OutboxItem[] {
  try {
    if (!fs.existsSync(outboxPath())) return [];
    return JSON.parse(fs.readFileSync(outboxPath(), 'utf8')) as OutboxItem[];
  } catch {
    return [];
  }
}

function save(items: OutboxItem[]): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(outboxPath(), JSON.stringify(items, null, 2), 'utf8');
}

export function outboxPush(item: OutboxItem): void {
  const items = load();
  items.push(item);
  save(items.slice(-200));
}

export function outboxTakeAll(): OutboxItem[] {
  const items = load();
  save([]);
  return items;
}

export function outboxPeek(): OutboxItem[] {
  return load();
}

export function outboxFile(): string {
  return path.basename(outboxPath());
}
