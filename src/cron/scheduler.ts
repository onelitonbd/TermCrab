/**
 * Cron scheduler: ticks once a minute and runs due jobs through the session lane.
 */
import { log } from '../core/logger.js';
import { bus, BusEvent } from '../gateway/events.js';
import { AgentCtx, runQueuedTurn } from '../agent/loop.js';
import { findDue, loadCronState, loadCrons, markTick, recordCronRun, saveCronState, setCronEnabled } from './store.js';
import { decideHeartbeat, readBattery } from '../mobile/power.js';
import { resolveRoute } from '../agent/routing.js';
import { listAgents } from '../agent/prompt.js';
import { notify } from '../mobile/notify.js';

/**
 * Where a finished job's output goes. `undefined` on a job means "every surface
 * that is configured", which is what the scheduler did before jobs could say
 * (33.4); `none` records the run and delivers nothing.
 */
export type CronTarget = 'telegram' | 'panel' | 'none' | 'all';

export interface CronRunnerDeps {
  ctx: AgentCtx;
  /** Delivery is the caller's business: it knows which surfaces exist. */
  deliver?: (text: string, target: CronTarget) => Promise<void> | void;
  /** Injected in tests. */
  now?: () => Date;
}

/**
 * Jobs this process is running right now, so a slow one cannot pile up on
 * itself (34.4). One gateway process is the writer, so an in-memory set is the
 * honest scope — a restart clears it, and a run killed by a restart should not
 * block the next tick forever.
 */
const runningNow = new Set<string>();

export function runningCronIds(): string[] {
  return [...runningNow];
}

/**
 * Cron tick: find due jobs for this minute (plus anything that became due while
 * the device was off, coalesced to one run), run them through the agent loop,
 * deliver output, record what happened. Power-aware (skips on low battery
 * unless critical) and overlap-safe (a job still running is skipped, not
 * queued twice).
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
  for (const { job, minuteKey, missed } of due) {
    state[job.id] = minuteKey; // mark BEFORE running (no double-fire on overlap)
    markTick(state, now);
    saveCronState(state);

    if (runningNow.has(job.id)) {
      log.warn(`cron "${job.name}" skipped: the previous run is still going`);
      recordCronRun(job.id, { at: Date.now(), ms: 0, ok: false, note: 'still running' }, { result: 'skipped-overlap' });
      continue;
    }

    if (batteryPause && !job.critical) {
      log.info(`cron "${job.name}" skipped (low battery policy)`);
      recordCronRun(job.id, { at: Date.now(), ms: 0, ok: false, note: 'low battery' }, { result: 'skipped-battery' });
      continue;
    }

    if (missed > 1) {
      log.info(`cron "${job.name}": catching up (missed ${missed} run(s) while the device was off — running once)`);
    }
    log.info(`cron "${job.name}" firing (${job.schedule})`);
    const startedAt = Date.now();
    runningNow.add(job.id);
    try {
      // 33.2: a job can name its agent; otherwise the cron route decides.
      const routed = resolveRoute(deps.ctx.config, 'cron', { explicit: job.agent ?? null, known: listAgents() });
      if (routed.problem) log.warn(`cron "${job.name}": ${routed.problem}`);
      const output = await runQueuedTurn(deps.ctx, {
        sessionId: `cron:${job.id}`,
        userMessage: `[scheduled:${job.name}] ${job.prompt}`,
        channel: 'cron',
        ...(routed.agent ? { agent: routed.agent } : {}),
        onEvent: (ev) => bus.emit({ ...ev, cron: job.name } as unknown as BusEvent),
      });
      const target: CronTarget = job.deliver ?? 'all';
      deps.ctx.memory.logDaily(
        `cron ${job.name} (${target === 'all' ? 'all surfaces' : target}): ${output.slice(0, 200).replace(/\n/g, ' ')}`,
      );
      if (deps.deliver && target !== 'none') await deps.deliver(`⏲️ ${job.name}\n${output}`, target);
      else if (target === 'none') log.info(`cron "${job.name}": deliver:none — output recorded, not sent`);
      await notify(`⏰ ${job.name}`, output.slice(0, 120));
      ran.push(job.id);
      recordCronRun(
        job.id,
        {
          at: startedAt,
          ms: Date.now() - startedAt,
          ok: true,
          ...(missed > 1 ? { note: `missed ${missed} while off` } : {}),
        },
        { result: 'ok' },
      );
      if (job.oneShot) setCronEnabled(job.id, false);
      bus.emit({ type: 'cron', id: job.id, name: job.name, ok: true, preview: output.slice(0, 160) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`cron "${job.name}" failed:`, message);
      recordCronRun(
        job.id,
        { at: startedAt, ms: Date.now() - startedAt, ok: false, note: message.slice(0, 200) },
        { result: 'error', error: message },
      );
      bus.emit({ type: 'cron', id: job.id, name: job.name, ok: false, preview: message });
    } finally {
      runningNow.delete(job.id);
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
  log.info('cron scheduler: started (20s resolution; missed runs are caught up once, up to 24h)');
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
