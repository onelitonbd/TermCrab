import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { log } from '../core/logger.js';
import { isLikelyTermux } from './bionic.js';

const execFileAsync = promisify(execFile);

let available: boolean | null = null;

/** Is termux-notification usable? (probed once, cached) */
export async function notifyAvailable(): Promise<boolean> {
  if (available !== null) return available;
  if (!isLikelyTermux()) {
    available = false;
    return false;
  }
  try {
    await execFileAsync('which', ['termux-notification'], { timeout: 3000 });
    available = true;
  } catch {
    available = false;
  }
  return available;
}

function sanitize(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').slice(0, 120);
}

/** Fire-and-forget Android notification. No-op off-Termux or without termux-api. */
export async function notify(title: string, text: string): Promise<void> {
  try {
    if (!(await notifyAvailable())) return;
    await execFileAsync(
      'termux-notification',
      ['--id', 'termcrab', '--title', sanitize(title), '--content', sanitize(text)],
      { timeout: 5000 },
    );
  } catch (err) {
    log.debug('notification failed:', err instanceof Error ? err.message : err);
  }
}

/** Persistent "gateway is alive" notification (updated in place). */
export async function notifyStatus(content: string): Promise<void> {
  try {
    if (!(await notifyAvailable())) return;
    await execFileAsync(
      'termux-notification',
      ['--id', 'termcrab-status', '--title', '🦀 TermCrab gateway', '--content', sanitize(content), '--ongoing'],
      { timeout: 5000 },
    );
  } catch {
    /* non-fatal */
  }
}

export async function cancelStatusNotification(): Promise<void> {
  try {
    if (!(await notifyAvailable())) return;
    await execFileAsync('termux-notification-cancel', ['--id', 'termcrab-status'], { timeout: 5000 });
  } catch {
    /* non-fatal */
  }
}
