/**
 * 34.4 — one board for everything the agent has been asked to do.
 *
 * The pieces already existed and each one had a view of its own: subagent
 * tasks (`termcrab subagents`), scheduled jobs (`termcrab cron ls`), live runs
 * (`termcrab runs`), the cards the agent suggested (`/api/tasks`). That is four
 * places to look when the question is one question — *what is going on right
 * now, and what did it do while I was away?* This module merges them into one
 * list of cards with one status vocabulary, and nothing else: it reads, it
 * never runs anything, and every card names where it came from.
 *
 * Statuses, in the order they are drawn:
 *   running    — a turn or a subagent is working right now
 *   queued     — waiting for a lane
 *   scheduling — a cron job with a next run in the future
 *   failed     — the last attempt ended in an error (or a run verdict says so)
 *   done       — finished recently enough to be worth showing
 *   suggested  — the agent asked for permission to do something
 */
import { listTasks, type Task } from './tasks.js';
import { loadCrons, type CronJob } from '../cron/store.js';
import { nextRun, parseCron } from '../cron/parser.js';
import { listSuggestions, type Suggestion } from './suggestions.js';
import { runHealth, type RunHealth } from './run-health.js';
import { listRuns } from '../core/tracing.js';

export type BoardStatus = 'running' | 'queued' | 'scheduling' | 'failed' | 'done' | 'suggested';

export interface BoardCard {
  id: string;
  kind: 'turn' | 'subagent' | 'cron' | 'suggestion';
  status: BoardStatus;
  title: string;
  at?: number;
  detail?: string;
}

export interface Board {
  generatedAt: number;
  counts: Record<BoardStatus, number>;
  cards: BoardCard[];
}

export interface BoardInput {
  tasks?: Task[];
  crons?: CronJob[];
  suggestions?: Suggestion[];
  runs?: RunHealth[];
  now?: number;
  /** How long a finished thing stays on the board (default 24h). */
  doneWindowMs?: number;
}

const ORDER: BoardStatus[] = ['running', 'queued', 'scheduling', 'failed', 'done', 'suggested'];

function taskCard(t: Task): BoardCard {
  const status: BoardStatus =
    t.status === 'running' ? 'running' : t.status === 'done' ? 'done' : 'failed';
  const detail =
    t.status === 'running'
      ? `started ${Math.max(1, Math.round((Date.now() - t.started) / 1000))}s ago`
      : t.status === 'done'
        ? (t.output ?? '').replace(/\s+/g, ' ').slice(0, 120)
        : (t.error ?? t.status);
  return {
    id: `subagent:${t.id}`,
    kind: 'subagent',
    status,
    title: t.label || t.prompt.replace(/\s+/g, ' ').slice(0, 80),
    at: t.finished ?? t.started,
    ...(detail ? { detail } : {}),
  };
}

function cronCard(job: CronJob, now: number): BoardCard {
  let next: Date | null = null;
  try {
    next = nextRun(parseCron(job.schedule), new Date(now));
  } catch {
    next = null;
  }
  const failed = job.lastResult === 'error';
  const status: BoardStatus = !job.enabled ? 'done' : failed ? 'failed' : 'scheduling';
  const bits: string[] = [];
  if (!job.enabled) bits.push('off');
  else if (next) bits.push(`next ${next.toLocaleString()}`);
  if (job.lastRun) {
    const how = job.lastResult === 'ok' ? 'ok' : (job.lastResult ?? '?').replace('skipped-', 'skipped: ');
    bits.push(`last ${new Date(job.lastRun).toLocaleTimeString()} ${how}`);
  }
  if (job.failures && job.failures > 1) bits.push(`${job.failures} consecutive failures`);
  if (job.lastError) bits.push(job.lastError.slice(0, 60));
  return {
    id: `cron:${job.id}`,
    kind: 'cron',
    status,
    title: `⏰ ${job.name} (${job.schedule})`,
    at: job.lastRun ?? job.createdAt,
    ...(bits.length ? { detail: bits.join(' · ') } : {}),
  };
}

function suggestionCard(s: Suggestion): BoardCard {
  return {
    id: `suggested:${s.id}`,
    kind: 'suggestion',
    status: 'suggested',
    title: s.title,
    at: s.createdAt,
    ...(s.detail ? { detail: s.detail.slice(0, 120) } : {}),
  };
}

function runCard(r: RunHealth): BoardCard {
  const status: BoardStatus = r.verdict === 'queued' ? 'queued' : r.verdict === 'failing' ? 'failed' : 'running';
  return {
    id: `turn:${r.sessionId}:${r.runId ?? r.turnId ?? 'live'}`,
    kind: 'turn',
    status,
    title: r.request || '(a turn)',
    at: r.startedAt,
    detail: `${r.sessionId} · ${r.verdict} ${Math.round(r.elapsedMs / 1000)}s · ${r.suggestion}`,
  };
}

/** Merge the sources into one board. Reads only; safe to call from any surface. */
export function buildBoard(input: BoardInput = {}): Board {
  const now = input.now ?? Date.now();
  const windowMs = input.doneWindowMs ?? 24 * 60 * 60 * 1000;
  const tasks = input.tasks ?? listTasks();
  const crons = input.crons ?? loadCrons();
  const suggestions = (input.suggestions ?? listSuggestions('pending')).filter((s) => s.status !== 'dismissed');
  let runs: RunHealth[];
  if (input.runs) runs = input.runs;
  else {
    try {
      runs = runHealth({ traces: listRuns(), now });
    } catch {
      runs = []; // no trace store (a bare CLI home): the board is still useful
    }
  }

  const cards: BoardCard[] = [
    ...runs.map(runCard),
    ...tasks
      .filter((t) => t.status === 'running' || (t.finished ?? t.started) >= now - windowMs)
      .map(taskCard),
    ...crons.map((j) => cronCard(j, now)),
    ...suggestions.map(suggestionCard),
  ];

  // Suggested cards are the agent's wishes, not work in flight: they sort last.
  cards.sort((a, b) => {
    const rank = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
    if (rank !== 0) return rank;
    return (b.at ?? 0) - (a.at ?? 0);
  });

  const counts = Object.fromEntries(ORDER.map((s) => [s, 0])) as Record<BoardStatus, number>;
  for (const c of cards) counts[c.status]++;
  return { generatedAt: now, counts, cards };
}

export function formatBoard(board: Board): string {
  const bits = ORDER.filter((s) => board.counts[s] > 0).map((s) => `${board.counts[s]} ${s}`);
  const head = `🧭 Board — ${bits.length ? bits.join(' · ') : 'nothing to do'}`;
  if (!board.cards.length) return `${head}\nNothing running, nothing scheduled, nothing suggested.`;
  const lines = board.cards.map((c) => {
    const icon =
      c.status === 'running'
        ? '▶'
        : c.status === 'queued'
          ? '…'
          : c.status === 'scheduling'
            ? '⏱'
            : c.status === 'failed'
              ? '⚠'
              : c.status === 'suggested'
                ? '💡'
                : '✓';
    return `${icon} ${c.title}${c.detail ? `\n     ${c.detail}` : ''}`;
  });
  return [head, ...lines].join('\n');
}
