import fs from 'node:fs';
import path from 'node:path';
import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { workspaceDir, ensureLayout } from '../core/paths.js';
import { AgentCtx, runTurn } from '../agent/loop.js';
import { decideHeartbeat, readBattery } from '../mobile/power.js';

export interface HeartbeatResult {
  ran: boolean;
  reason: string;
  output?: string;
}

export function readHeartbeatFile(): string {
  const f = path.join(workspaceDir(), 'HEARTBEAT.md');
  try {
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  } catch {
    /* ignore */
  }
  return '';
}

/** One proactive tick: power check -> checklist -> agent run -> delivery. */
export async function runHeartbeatOnce(
  ctx: AgentCtx,
  deliver?: (text: string) => Promise<void>,
): Promise<HeartbeatResult> {
  ensureLayout();
  const cfg: Config = ctx.config;
  if (!cfg.heartbeat.enabled) return { ran: false, reason: 'heartbeat disabled in config' };

  const battery = await readBattery();
  const decision = decideHeartbeat(battery, cfg.heartbeat.pauseBelow);
  if (!decision.run) {
    log.info('heartbeat skipped:', decision.reason);
    return { ran: false, reason: decision.reason };
  }

  const checklist = readHeartbeatFile();
  if (!checklist || checklist === '# Heartbeat') {
    return { ran: false, reason: 'HEARTBEAT.md is empty - nothing to do' };
  }

  const message =
    `Heartbeat tick (automatic, battery: ${decision.reason}).\n` +
    `Here is the HEARTBEAT checklist:\n\n${checklist}\n\n` +
    `Work through it now with the tools you have. Be brief. ` +
    `If something needs the owner, include it in your reply.`;

  const output = await runTurn(ctx, {
    sessionId: 'heartbeat',
    userMessage: message,
    channel: 'heartbeat',
    onEvent: (ev) => {
      if (ev.type === 'tool:start') log.info(`heartbeat tool: ${ev.name}`);
      if (ev.type === 'error') log.error('heartbeat error:', ev.message);
    },
  });

  ctx.memory.logDaily(`heartbeat: ${output.slice(0, 300).replace(/\n/g, ' ')}`);
  if (deliver) {
    try {
      await deliver(output);
    } catch (err) {
      log.warn('heartbeat delivery failed:', err instanceof Error ? err.message : err);
    }
  }
  return { ran: true, reason: decision.reason, output };
}

/** Scheduling helper: returns a stop() function. */
export function scheduleHeartbeat(
  ctx: AgentCtx,
  deliver?: (text: string) => Promise<void>,
): () => void {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  const tick = async () => {
    if (stopped) return;
    try {
      await runHeartbeatOnce(ctx, deliver);
    } catch (err) {
      log.error('heartbeat crashed:', err instanceof Error ? err.message : err);
    } finally {
      if (!stopped) {
        const minutes = Math.max(5, ctx.config.heartbeat.minutes || 60);
        timer = setTimeout(tick, minutes * 60_000);
      }
    }
  };

  const firstDelay = Math.max(1, ctx.config.heartbeat.minutes || 60) * 60_000;
  timer = setTimeout(tick, firstDelay);
  if (ctx.config.heartbeat.enabled) {
    log.info(`heartbeat scheduled every ${ctx.config.heartbeat.minutes}min (pause below ${ctx.config.heartbeat.pauseBelow}%)`);
  }

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
