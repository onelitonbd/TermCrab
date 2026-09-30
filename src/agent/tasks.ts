/** Background subagent tasks: spawned turns tracked to completion. */
export interface Task {
  id: string;
  sessionId: string;
  prompt: string;
  label?: string;
  status: 'running' | 'done' | 'error';
  started: number;
  finished?: number;
  output?: string;
  error?: string;
}

const tasks = new Map<string, Task>();
const order: string[] = [];
const waiters: { ids?: string[]; resolve: () => void }[] = [];

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

export function spawnTask(deps: {
  run: (sessionId: string, prompt: string) => Promise<string>;
  sessionId: string;
  prompt: string;
  label?: string;
}): Task {
  const id = `s${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const task: Task = { id, sessionId: deps.sessionId, prompt: deps.prompt, label: deps.label, status: 'running', started: Date.now() };
  tasks.set(id, task);
  order.push(id);
  if (order.length > 200) {
    const drop = order.shift()!;
    if (tasks.get(drop)?.status !== 'running') tasks.delete(drop);
  }
  void deps
    .run(deps.sessionId, deps.prompt)
    .then((output) => {
      task.status = 'done';
      task.output = output.slice(0, 20_000);
      task.finished = Date.now();
    })
    .catch((err: unknown) => {
      task.status = 'error';
      task.error = err instanceof Error ? err.message : String(err);
      task.finished = Date.now();
    })
    .finally(notifyWaiters);
  return task;
}

export function listTasks(): Task[] {
  return order.map((id) => tasks.get(id)).filter((t): t is Task => Boolean(t));
}

export function getTask(id: string): Task | null {
  return tasks.get(id) ?? null;
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
      const timer = setTimeout(() => {
        const i = waiters.indexOf(w);
        if (i >= 0) waiters.splice(i, 1);
        resolve();
      }, timeoutMs);
    });
  }
  return wanted.map((id) => tasks.get(id)).filter((t): t is Task => Boolean(t));
}
