/**
 * Background subagent tasks (33.1).
 *
 * A subagent is a turn the agent starts and does not wait for: the parent keeps
 * its own conversation, the child writes to its own session, and the parent can
 * poll (`subagents`), wait (`agents_wait`) or end the turn (`sessions_yield`).
 *
 * What this file is careful about, because on a phone it matters:
 *
 * - **A cap.** Spawning must not be able to fill the device with turns. Past
 *   `maxConcurrent` (default 4) `spawnTask` refuses and names the running tasks
 *   instead of quietly queueing an unbounded amount of work.
 * - **A lifetime.** A task that never finishes would hold its slot forever, so
 *   each one has a deadline (`timeoutMs`, default 15 min). On timeout the task
 *   is marked `timeout` — not `error` — and a late arrival is ignored.
 * - **A result that comes back on its own.** `onFinish` fires for every
 *   terminal state, which is how the parent session gets a one-line note
 *   (33.1) instead of needing somebody to poll for it.
 * - **A place to work.** A task can be given its own scratch directory under
 *   `workspace/subagents/<id>/`, so two subagents doing file work do not fight
 *   over the same names. `cwd` is passed through to the runner; what a tool
 *   does with it is the tool's business.
 */
import { ensureSubagentDir } from './subagents.js';

export type TaskStatus = 'running' | 'done' | 'error' | 'timeout';

const scratchDir = (id: string): string => ensureSubagentDir(id);

export interface Task {
  id: string;
  sessionId: string;
  prompt: string;
  label?: string;
  /** Named agent profile the task runs as, when it is not the main agent. */
  agent?: string;
  /** Scratch working directory, when one was created for this task. */
  cwd?: string;
  status: TaskStatus;
  started: number;
  finished?: number;
  /** Wall-clock milliseconds once it is settled. */
  elapsedMs?: number;
  output?: string;
  error?: string;
  /** Deadline that applied to this task (ms), for the status line. */
  timeoutMs: number;
}

export class TaskLimitError extends Error {
  constructor(
    message: string,
    readonly running: string[],
  ) {
    super(message);
    this.name = 'TaskLimitError';
  }
}

const tasks = new Map<string, Task>();
const order: string[] = [];
const waiters: { ids?: string[]; resolve: () => void }[] = [];

/** Kept in memory only: a restarted gateway has no subagents to report. */
const MAX_HISTORY = 200;
const DEFAULT_MAX_CONCURRENT = 4;
const DEFAULT_TIMEOUT_MS = 15 * 60_000;

function notifyWaiters(): void {
  for (let i = waiters.length - 1; i >= 0; i--) {
    const w = waiters[i]!;
    const list = w.ids ? w.ids.map((id) => tasks.get(id)) : [...tasks.values()];
    if (list.every((t) => t && t.status !== 'running')) {
      waiters.splice(i, 1);
      w.resolve();
    }
  }
}

export function runningTasks(): Task[] {
  return [...tasks.values()].filter((t) => t.status === 'running');
}

export interface SpawnDeps {
  /** Run the prompt. `opts` carries the agent profile and scratch dir. */
  run: (sessionId: string, prompt: string, opts: { agent?: string; cwd?: string }) => Promise<string>;
  sessionId: string;
  prompt: string;
  label?: string;
  agent?: string;
  cwd?: string;
  /** Give this task its own working directory under workspace/subagents/<id>/. */
  scratch?: boolean;
  /** Refuse to start past this many running tasks (default 4). */
  maxConcurrent?: number;
  /** Deadline in ms (default 15 minutes). */
  timeoutMs?: number;
  /** Called once, on done/error/timeout — used to note the result in the parent. */
  onFinish?: (task: Task) => void;
}

export function spawnTask(deps: SpawnDeps): Task {
  const max = deps.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
  const running = runningTasks();
  if (running.length >= max) {
    throw new TaskLimitError(
      `subagent limit reached (${running.length} of ${max} running: ${running.map((t) => t.id).join(', ')}) — ` +
        `wait for one with agents_wait, or raise agent.maxSubagents`,
      running.map((t) => t.id),
    );
  }

  const id = `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // A scratch directory is named after the task, and only the task id can name
  // it — so it is created here rather than by the caller.
  const cwd = deps.cwd ?? (deps.scratch ? scratchDir(id) : undefined);
  const task: Task = {
    id,
    sessionId: deps.sessionId,
    prompt: deps.prompt,
    ...(deps.label ? { label: deps.label } : {}),
    ...(deps.agent ? { agent: deps.agent } : {}),
    ...(cwd ? { cwd } : {}),
    status: 'running',
    started: Date.now(),
    timeoutMs,
  };
  tasks.set(id, task);
  order.push(id);
  if (order.length > MAX_HISTORY) {
    const drop = order.shift()!;
    if (tasks.get(drop)?.status !== 'running') tasks.delete(drop);
  }

  let settled = false;
  const finish = (patch: Partial<Task>): void => {
    if (settled) return; // a late answer after the deadline must not resurrect a task
    settled = true;
    clearTimeout(timer);
    Object.assign(task, patch, { finished: Date.now(), elapsedMs: Date.now() - task.started });
    try {
      deps.onFinish?.(task);
    } catch {
      /* a note that cannot be written must not break the task bookkeeping */
    }
    notifyWaiters();
  };

  const timer = setTimeout(() => {
    finish({
      status: 'timeout',
      error: `no answer within ${Math.round(timeoutMs / 1000)}s — the task is still running in the background; raise agent.subagentTimeoutSec if it needs longer`,
    });
  }, timeoutMs);
  // Do not hold the process open for a background task (the CLI exits when a
  // turn ends; the gateway has its own long-lived loop).
  timer.unref?.();

  void deps
    .run(deps.sessionId, deps.prompt, { ...(deps.agent ? { agent: deps.agent } : {}), ...(cwd ? { cwd } : {}) })
    .then((output) => finish({ status: 'done', output: output.slice(0, 20_000) }))
    .catch((err: unknown) =>
      finish({ status: 'error', error: err instanceof Error ? err.message : String(err) }),
    );
  return task;
}

export function listTasks(): Task[] {
  return order.map((id) => tasks.get(id)).filter((t): t is Task => Boolean(t));
}

export function getTask(id: string): Task | null {
  return tasks.get(id) ?? null;
}

/** Forget finished tasks (the CLI's `subagents clear`, tests). */
export function clearTasks(): number {
  let n = 0;
  for (const id of [...order]) {
    if (tasks.get(id)?.status !== 'running') {
      tasks.delete(id);
      n += 1;
    }
  }
  order.length = 0;
  order.push(...tasks.keys());
  return n;
}

/** One-line summary per task — shared by the CLI, the tool and the panel. */
export function taskLine(t: Task): string {
  const where = [t.sessionId, t.agent ? `@${t.agent}` : '', t.cwd ? `cwd ${t.cwd}` : ''].filter(Boolean).join(' · ');
  const when =
    t.status === 'running'
      ? `running ${Math.round((Date.now() - t.started) / 1000)}s`
      : `${t.status} in ${Math.round((t.elapsedMs ?? 0) / 1000)}s`;
  return `${t.id} ${t.status}${t.label ? ` (${t.label})` : ''} → ${where} · ${when}`;
}

export async function waitForTasks(ids: string[] | undefined, timeoutMs: number): Promise<Task[]> {
  const all = listTasks();
  const running = all.filter((t) => t.status === 'running').map((t) => t.id);
  // Default: everything running; if nothing is running anymore, report the most recent few.
  const wanted = ids && ids.length ? ids : running.length ? running : all.slice(-3).map((t) => t.id);
  const pending = wanted.filter((id) => tasks.get(id)?.status === 'running');
  if (pending.length) {
    await new Promise<void>((resolve) => {
      const w = { ids: pending, resolve };
      waiters.push(w);
      // Unlike a task deadline, this timer is *not* unref'd: the caller asked
      // to wait, and the promise must settle within `timeoutMs` even when the
      // loop has nothing else to do.
      setTimeout(() => {
        const i = waiters.indexOf(w);
        if (i >= 0) waiters.splice(i, 1);
        resolve();
      }, Math.max(0, timeoutMs));
    });
  }
  return wanted.map((id) => tasks.get(id)).filter((t): t is Task => Boolean(t));
}
