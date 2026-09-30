import { log } from '../core/logger.js';
import { bus, BusEvent } from '../gateway/events.js';
import { AgentCtx, runTurn } from '../agent/loop.js';
import { findDue, loadCronState, loadCrons, saveCronState, setCronEnabled } from './store.js';
import { decideHeartbeat, readBattery } from '../mobile/power.js';
import { notify } from '../mobile/notify.js';

export interface CronRunnerDeps {
  ctx: AgentCtx;
  deliver?: (text: string) => Promise<void>;
  /** Injected in tests. */
  now?: () => Date;
}

/**
 * Cron tick: find due jobs for this minute, run them through the agent loop,
 * deliver output, persist run state. Power-aware (skips on low battery unless critical).
 * Returns the ids that ran (used by tests and manual ticks).
 */
export async function cronTick(deps: CronRunnerDeps): Promise<string[]> {
  const now = deps.now ? deps.now() : new Date();
  const jobs = loadCrons();
  const state = loadCronState();
  const due = findDue(jobs, now, state);
  if (!due.length) return [];

  let batteryPause = false;
  if (due.some((d) => !d.job.critical)) {
    const battery = await readBattery();
    batteryPause = !decideHeartbeat(battery, deps.ctx.config.heartbeat.pauseBelow).run;
  }

  const ran: string[] = [];
  for (const { job, minuteKey } of due) {
    state[job.id] = minuteKey; // mark BEFORE running (no double-fire on overlap)
    saveCronState(state);

    if (batteryPause && !job.critical) {
      log.info(`cron "${job.name}" skipped (low battery policy)`);
      continue;
    }

    log.info(`cron "${job.name}" firing (${job.schedule})`);
    try {
      const output = await runTurn(deps.ctx, {
        sessionId: `cron:${job.id}`,
        userMessage: `[scheduled:${job.name}] ${job.prompt}`,
        channel: 'cron',
        onEvent: (ev) => bus.emit({ ...ev, cron: job.name } as unknown as BusEvent),
      });
      deps.ctx.memory.logDaily(`cron ${job.name}: ${output.slice(0, 200).replace(/\n/g, ' ')}`);
      if (deps.deliver) await deps.deliver(`⏲️ ${job.name}\n${output}`);
      await notify(`⏰ ${job.name}`, output.slice(0, 120));
      ran.push(job.id);
      if (job.oneShot) setCronEnabled(job.id, false);
      bus.emit({ type: 'cron', id: job.id, name: job.name, ok: true, preview: output.slice(0, 160) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`cron "${job.name}" failed:`, message);
      bus.emit({ type: 'cron', id: job.id, name: job.name, ok: false, preview: message });
    }
  }
  return ran;
}

/** Start the scheduler loop; returns a stop() function. */
export function startCronScheduler(deps: CronRunnerDeps): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;

  const tickLoop = async () => {
    if (stopped) return;
    try {
      await cronTick(deps);
    } catch (err) {
      log.error('cron scheduler error:', err instanceof Error ? err.message : err);
    } finally {
      if (!stopped) {
        timer = setTimeout(tickLoop, 20_000);
        timer.unref();
      }
    }
  };

  timer = setTimeout(tickLoop, 20_000);
  timer.unref();
  log.info('cron scheduler: started (20s resolution)');
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
