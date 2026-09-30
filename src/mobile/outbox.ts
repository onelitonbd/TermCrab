import fs from 'node:fs';
import path from 'node:path';
import { outboxPath, stateDir } from '../core/paths.js';

/**
 * Offline outbox: outbound messages that failed to send (flaky mobile data)
 * are persisted and retried later instead of being lost.
 */
export interface OutboxItem {
  channel: 'telegram' | 'whatsapp';
  chatId: number | string;
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

export function outboxTake(channel?: OutboxItem['channel']): OutboxItem[] {
  const items = load();
  if (!channel) {
    save([]);
    return items;
  }
  const taken = items.filter((i) => i.channel === channel);
  const rest = items.filter((i) => i.channel !== channel);
  save(rest);
  return taken;
}

export function outboxPeek(): OutboxItem[] {
  return load();
}

export function outboxFile(): string {
  return path.basename(outboxPath());
}
