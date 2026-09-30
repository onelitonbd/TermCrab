import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface BatteryStatus {
  percentage: number;
  /** true when charging/plugged in. */
  plugged: boolean;
}

/**
 * Read battery state on Termux (termux-api package). Returns null elsewhere
 * so every caller degrades gracefully (desktop, CI, tests).
 */
export async function readBattery(): Promise<BatteryStatus | null> {
  try {
    const { stdout } = await execFileAsync('termux-battery-status', [], { timeout: 2500 });
    const data = JSON.parse(stdout) as { percentage?: number; status?: string };
    if (typeof data.percentage !== 'number') return null;
    const plugged = data.status === 'CHARGING' || data.status === 'FULL' || data.status === 'NOT_CHARGING';
    return { percentage: data.percentage, plugged: data.status === 'CHARGING' || data.status === 'FULL' ? true : plugged };
  } catch {
    return null;
  }
}

export interface PowerDecision {
  run: boolean;
  reason: string;
}

/** Adaptive power budget: pause proactive work on low battery unless charging. */
export function decideHeartbeat(
  battery: BatteryStatus | null,
  pauseBelow: number,
): PowerDecision {
  if (!battery) return { run: true, reason: 'no battery API - proceeding' };
  if (battery.plugged) return { run: true, reason: `charging (${battery.percentage}%)` };
  if (battery.percentage <= pauseBelow) {
    return { run: false, reason: `battery ${battery.percentage}% <= pause threshold ${pauseBelow}%` };
  }
  return { run: true, reason: `battery ${battery.percentage}%` };
}
