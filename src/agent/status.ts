/**
 * `termcrab status`: live state from the running gateway, with a disk-read
 * fallback when the panel is down.
 */
import fs from 'node:fs';
import path from 'node:path';
import { Config, configProblems } from '../core/config.js';
import { GatewayClient, GatewayNotRunningError } from '../gateway/client.js';
import { memoryDir } from '../core/paths.js';
import { MemoryStore } from './memory.js';
import { listAgents } from './prompt.js';
import { providerLabel } from './loop.js';
import { loadCrons } from '../cron/store.js';
import { readDreamState } from './dream.js';
import { readBattery } from '../mobile/power.js';

/** How many facts are remembered (lines that start with a bullet). */
export function countMemoryFacts(): number {
  try {
    const text = fs.readFileSync(path.join(memoryDir(), 'MEMORY.md'), 'utf8');
    return text.split('\n').filter((l) => /^-\s/.test(l)).length;
  } catch {
    return 0;
  }
}

function sizeText(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function when(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Plain-English one-screen overview — the non-coder's home base.
 * No keys, no jargon: what it is, what it's doing, what to run next.
 */
/** The running panel's queue, as numbers — or an honest "I cannot see it". */
export interface LiveQueue {
  state: 'idle' | 'busy' | 'down' | 'unknown';
  waiting?: number;
  running?: number;
  note?: string;
}

/**
 * Ask the running panel for its real queue state. Never guesses: an older
 * panel, a stopped panel and a refused request all read as "unknown".
 */
export async function liveQueue(config: Config): Promise<LiveQueue> {
  const client = new GatewayClient(config, 1200);
  try {
    const data = await client.json<{ queue?: { waiting?: number; running?: number } }>('/api/status');
    const q = data.queue;
    if (!q) return { state: 'unknown', note: 'panel is older than this CLI' };
    const waiting = q.waiting ?? 0;
    const running = q.running ?? 0;
    return { state: waiting || running ? 'busy' : 'idle', waiting, running };
  } catch (err) {
    if (err instanceof GatewayNotRunningError) return { state: 'down' };
    return { state: 'unknown', note: err instanceof Error ? err.message : String(err) };
  }
}

/** The queue in a sentence (used by the human status page). */
export function queueText(q: LiveQueue): string {
  switch (q.state) {
    case 'idle':
      return 'idle — nothing running, nothing waiting';
    case 'busy':
      return `${q.waiting ?? 0} waiting · ${q.running ?? 0} running`;
    case 'down':
      return 'not running — start the panel (termcrab gateway) to see live queue state';
    default:
      return `unknown${q.note ? ` (${q.note})` : ''}`;
  }
}

/** Everything `termcrab status` knows, as data (batch 14: the JSON view). */
export interface StatusData {
  name: string;
  brain: string;
  localBrain: { enabled: boolean; model?: string; baseUrl?: string };
  panel: { url: string; password: boolean };
  queue: LiveQueue;
  channels: { telegram: boolean; whatsapp: boolean };
  memory: { facts: number; bytes: number; dailyFiles: number };
  heartbeat: { enabled: boolean; minutes: number; pauseBelow: number; battery: { percentage: number; plugged: boolean } | null };
  cron: { total: number; running: number };
  dream: { enabled: boolean; everyHours: number; lastAt: number | null };
  agents: string[];
  /** What the last config load thought of config.json (batch 14: visible to scripts). */
  configProblems: { path: string; severity: string }[];
}

export async function statusData(config: Config): Promise<StatusData> {
  const memory = new MemoryStore();
  const stats = memory.stats();
  const crons = loadCrons();
  const battery = await readBattery();
  const dream = config.dream;
  const lastDreamAt = readDreamState().lastDreamAt ?? null;
  return {
    name: config.agent.name,
    brain: providerLabel(config),
    localBrain:
      config.localProvider.enabled && config.localProvider.model
        ? { enabled: true, model: config.localProvider.model, baseUrl: config.localProvider.baseUrl }
        : { enabled: false },
    panel: { url: `http://${config.gateway.host}:${config.gateway.port}`, password: Boolean(config.gateway.token) },
    queue: await liveQueue(config),
    channels: {
      telegram: Boolean(config.channels.telegram?.token),
      whatsapp: Boolean(config.channels.whatsapp?.enabled),
    },
    memory: { facts: countMemoryFacts(), bytes: stats.memoryBytes, dailyFiles: stats.dailyFiles },
    heartbeat: {
      enabled: config.heartbeat.enabled,
      minutes: config.heartbeat.minutes,
      pauseBelow: config.heartbeat.pauseBelow,
      battery,
    },
    cron: { total: crons.length, running: crons.filter((c) => c.enabled).length },
    dream: { enabled: dream.enabled, everyHours: dream.everyHours, lastAt: lastDreamAt },
    agents: listAgents(),
    // Scripts get the structured part; the human sentence belongs to the
    // human page, so it is not repeated inside a JSON document (14.3).
    configProblems: configProblems().map((p) => ({ path: p.path, severity: p.severity })),
  };
}

/** Render the human page from the same data the JSON view reports. */
export function renderStatus(data: StatusData): string {
  const batteryText = data.heartbeat.battery
    ? `${data.heartbeat.battery.percentage}%${data.heartbeat.battery.plugged ? ' (charging)' : ''}`
    : 'unknown — only visible on a phone';

  let dreamText: string;
  if (!data.dream.enabled) {
    dreamText = 'off (turn on in Settings → Night learning)';
  } else if (!data.dream.lastAt) {
    dreamText = `every ${data.dream.everyHours}h — first dream will happen on its own while idle`;
  } else {
    const next = data.dream.lastAt + data.dream.everyHours * 3_600_000;
    const nextText = next <= Date.now() ? 'due now (waiting for idle + good battery)' : when(next);
    dreamText = `every ${data.dream.everyHours}h · last: ${when(data.dream.lastAt)} · next: ${nextText}`;
  }

  const localText = data.localBrain.enabled
    ? `${data.localBrain.model} at ${data.localBrain.baseUrl}`
    : 'off (optional helper — saves cloud costs on small tasks)';

  const panelText =
    `${data.panel.url} · ` + (data.panel.password ? 'password set' : 'NO PASSWORD — set one in Settings');

  const channelText = [
    `Telegram: ${data.channels.telegram ? 'on' : 'off'}`,
    `WhatsApp: ${data.channels.whatsapp ? 'on' : 'off'}`,
  ].join(' · ');

  const checks = data.heartbeat.enabled
    ? `every ${data.heartbeat.minutes} min · pauses below ${data.heartbeat.pauseBelow}% battery · battery: ${batteryText}`
    : 'off (turn on in Settings → Check-in frequency)';

  const facts = data.memory.facts;
  const rows: Array<[string, string]> = [
    ['You (name)', data.name],
    ['Brain', data.brain],
    ['Local brain', localText],
    ['Web panel', panelText],
    ['Queue', queueText(data.queue)],
    ['Chat apps', channelText],
    ['Memory', `${facts} remembered fact${facts === 1 ? '' : 's'} · ${sizeText(data.memory.bytes)} · ${data.memory.dailyFiles} daily log${data.memory.dailyFiles === 1 ? '' : 's'}`],
    ['Self-checks', checks],
    ['Cron jobs', `${data.cron.total} total · ${data.cron.running} running`],
    ['Dreaming', dreamText],
    ['Agents', data.agents.length ? `default${data.agents.map((a) => ` · @${a}`).join('')}` : 'default'],
  ];

  const width = Math.max(...rows.map((r) => r[0].length));
  const lines = ['', '🦀 TermCrab — plain-English status', ''];
  for (const [label, value] of rows) {
    lines.push(`  ${label.padEnd(width)}   ${value}`);
  }
  lines.push('');
  lines.push('  Health check   termcrab doctor   (finds problems and how to fix them)');
  lines.push('  Ask me anything  termcrab agent "what can you do?"');
  lines.push('');
  return lines.join('\n');
}

export async function statusReport(config: Config): Promise<string> {
  return renderStatus(await statusData(config));
}
