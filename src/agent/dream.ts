import fs from 'node:fs';
import path from 'node:path';
import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { sessionsDir, stateDir, memoryDir, ensureLayout } from '../core/paths.js';
import { AgentCtx, runTurn } from './loop.js';
import { bus, BusEvent } from '../gateway/events.js';
import { decideHeartbeat, readBattery } from '../mobile/power.js';

interface DreamState {
  lastDreamAt?: number;
  lastSourceMtime?: number;
}

function stateFile(): string {
  return path.join(stateDir(), 'dream.json');
}

function loadState(): DreamState {
  try {
    if (fs.existsSync(stateFile())) return JSON.parse(fs.readFileSync(stateFile(), 'utf8')) as DreamState;
  } catch {
    /* ignore */
  }
  return {};
}

function saveState(s: DreamState): void {
  ensureLayout();
  fs.writeFileSync(stateFile(), JSON.stringify(s), 'utf8');
}

/** Newest mtime among daily logs + session transcripts (cheap "is there anything new?"). */
export function latestSourceMtime(): number {
  let newest = 0;
  const consider = (f: string) => {
    try {
      const m = fs.statSync(f).mtimeMs;
      if (m > newest) newest = m;
    } catch {
      /* ignore */
    }
  };
  const daily = path.join(memoryDir(), 'daily');
  if (fs.existsSync(daily)) for (const f of fs.readdirSync(daily)) consider(path.join(daily, f));
  const mem = path.join(memoryDir(), 'MEMORY.md');
  if (fs.existsSync(mem)) consider(mem);
  const sess = sessionsDir();
  if (fs.existsSync(sess)) for (const f of fs.readdirSync(sess)) consider(path.join(sess, f));
  return newest;
}

export interface DreamResult {
  ran: boolean;
  reason: string;
  facts?: number;
}

export interface DreamOpts {
  /** User-initiated (`termcrab dream`): bypass schedule + battery gates. */
  force?: boolean;
}

function recentContext(ctx: AgentCtx, maxEntries = 40): string {
  const parts: string[] = [];
  const sess = sessionsDir();
  if (fs.existsSync(sess)) {
    const files = fs
      .readdirSync(sess)
      .filter((f) => f.endsWith('.jsonl'))
      .map((f) => ({ f, m: fs.statSync(path.join(sess, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)
      .slice(0, 3);
    for (const { f } of files) {
      try {
        const lines = fs.readFileSync(path.join(sess, f), 'utf8').split('\n').filter(Boolean).slice(-maxEntries);
        parts.push(`## session ${f.replace('.jsonl', '')}`);
        for (const line of lines) {
          try {
            const e = JSON.parse(line) as { role: string; content?: string };
            if (e.content) parts.push(`${e.role}: ${String(e.content).slice(0, 400)}`);
          } catch {
            /* skip */
          }
        }
      } catch {
        /* skip */
      }
    }
  }
  return parts.join('\n').slice(0, 14000);
}

/**
 * "Dreaming": while idle (and not on a low battery), distill recent sessions/logs
 * into durable MEMORY.md facts - short-term -> long-term, like sleep does.
 * Uses the LOCAL model tier when configured (cheap, private), else the main provider.
 */
export async function runDream(ctx: AgentCtx, opts: DreamOpts = {}): Promise<DreamResult> {
  ensureLayout();
  const cfg: Config = ctx.config;
  if (!cfg.dream.enabled && !opts.force) return { ran: false, reason: 'dreaming disabled (dream.enabled=false)' };

  const state = loadState();
  const now = Date.now();

  if (!opts.force) {
    const everyMs = Math.max(1, cfg.dream.everyHours || 24) * 3_600_000;
    if (state.lastDreamAt && now - state.lastDreamAt < everyMs) {
      const left = Math.round((everyMs - (now - state.lastDreamAt)) / 60_000);
      return { ran: false, reason: `next dream in ~${left}m` };
    }
    const battery = await readBattery();
    const decision = decideHeartbeat(battery, cfg.heartbeat.pauseBelow);
    if (!decision.run) return { ran: false, reason: `sleepless: ${decision.reason}` };
    const latest = latestSourceMtime();
    if (state.lastSourceMtime && latest <= state.lastSourceMtime && !process.env.TCRAB_DREAM_TEST) {
      return { ran: false, reason: 'no new sessions or logs since last dream' };
    }
  }

  const memory = ctx.memory.readHead(4000);
  const context = recentContext(ctx);
  if (!context.trim()) {
    saveState({ lastDreamAt: now, lastSourceMtime: latestSourceMtime() });
    return { ran: false, reason: 'nothing to consolidate (empty transcripts)' };
  }

  const prompt =
    'Dream cycle: consolidate recent activity into long-term memory.\n\n' +
    '# Existing long-term memory (do NOT repeat these)\n' + memory + '\n\n' +
    '# Recent transcripts\n' + context + '\n\n' +
    'Extract durable facts worth keeping (max 8), one per line, each starting with "- ".\n' +
    'Only: stable preferences, people, projects, commitments, outcomes. No chatter, no timestamps.\n' +
    'Then a final line starting with "SUMMARY:" (max 15 words).';

  // Prefer the local model tier (cheap/private); fall back to main provider automatically.
  const output = await runTurn(
    ctx,
    {
      sessionId: 'dream',
      userMessage: prompt,
      channel: 'dream',
      tier: ctx.localProvider ? 'local' : 'cloud',
      onEvent: (ev) => {
        if (ev.type === 'error') log.warn('dream error:', ev.message);
      },
    },
  );

  const facts: string[] = [];
  let summary = '';
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim();
    if (/^SUMMARY:/i.test(line)) summary = line.replace(/^SUMMARY:\s*/i, '');
    else if (line.startsWith('- ') || line.startsWith('• ')) facts.push(line.replace(/^[-•]\s*/, '').trim());
  }
  let stored = 0;
  for (const fact of facts.slice(0, 8)) {
    if (fact.length < 8) continue;
    const res = ctx.memory.remember(fact);
    if (/Remembered/.test(res)) stored++;
  }
  ctx.memory.logDaily(`dream: ${stored} new fact(s) consolidated${summary ? ` — ${summary}` : ''}`);

  saveState({ lastDreamAt: now, lastSourceMtime: latestSourceMtime() });
  const result: DreamResult = { ran: true, reason: ctx.localProvider ? 'local tier' : 'cloud tier', facts: stored };
  bus.emit({ type: 'dream', ...result } as unknown as BusEvent);
  log.info(`dream complete: ${stored} fact(s) stored (${result.reason})`);
  return result;
}

/** Hourly due-check scheduled by the gateway. Returns stop(). */
export function startDreamScheduler(ctx: AgentCtx): () => void {
  let stopped = false;
  let timer: NodeJS.Timeout | null = null;
  const tick = async () => {
    if (stopped) return;
    try {
      await runDream(ctx);
    } catch (err) {
      log.error('dream scheduler error:', err instanceof Error ? err.message : err);
    } finally {
      if (!stopped) {
        timer = setTimeout(tick, 60 * 60_000);
        timer.unref();
      }
    }
  };
  timer = setTimeout(tick, 20 * 60_000);
  timer.unref();
  if (ctx.config.dream.enabled) {
    log.info(`dream scheduler: checking every hour (consolidate every ${ctx.config.dream.everyHours}h)`);
  }
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
