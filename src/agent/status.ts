import fs from 'node:fs';
import path from 'node:path';
import { Config } from '../core/config.js';
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
export async function statusReport(config: Config): Promise<string> {
  const memory = new MemoryStore();
  const stats = memory.stats();
  const facts = countMemoryFacts();
  const crons = loadCrons();
  const activeCrons = crons.filter((c) => c.enabled).length;
  const battery = await readBattery();
  const agents = listAgents();

  const batteryText = battery
    ? `${battery.percentage}%${battery.plugged ? ' (charging)' : ''}`
    : 'unknown — only visible on a phone';

  const dream = config.dream;
  let dreamText: string;
  if (!dream.enabled) {
    dreamText = 'off (turn on in Settings → Night learning)';
  } else {
    const last = readDreamState().lastDreamAt;
    if (!last) {
      dreamText = `every ${dream.everyHours}h — first dream will happen on its own while idle`;
    } else {
      const next = last + dream.everyHours * 3_600_000;
      const nextText = next <= Date.now() ? 'due now (waiting for idle + good battery)' : when(next);
      dreamText = `every ${dream.everyHours}h · last: ${when(last)} · next: ${nextText}`;
    }
  }

  const localText = config.localProvider.enabled && config.localProvider.model
    ? `${config.localProvider.model} at ${config.localProvider.baseUrl}`
    : 'off (optional helper — saves cloud costs on small tasks)';

  const panelText =
    `http://${config.gateway.host}:${config.gateway.port} · ` +
    (config.gateway.token ? 'password set' : 'NO PASSWORD — set one in Settings');

  const channelText = [
    `Telegram: ${config.channels.telegram?.token ? 'on' : 'off'}`,
    `WhatsApp: ${config.channels.whatsapp?.enabled ? 'on' : 'off'}`,
  ].join(' · ');

  const checks = config.heartbeat.enabled
    ? `every ${config.heartbeat.minutes} min · pauses below ${config.heartbeat.pauseBelow}% battery · battery: ${batteryText}`
    : 'off (turn on in Settings → Check-in frequency)';

  const rows: Array<[string, string]> = [
    ['You (name)', config.agent.name],
    ['Brain', providerLabel(config)],
    ['Local brain', localText],
    ['Web panel', panelText],
    ['Chat apps', channelText],
    ['Memory', `${facts} remembered fact${facts === 1 ? '' : 's'} · ${sizeText(stats.memoryBytes)} · ${stats.dailyFiles} daily log${stats.dailyFiles === 1 ? '' : 's'}`],
    ['Self-checks', checks],
    ['Cron jobs', `${crons.length} total · ${activeCrons} running`],
    ['Dreaming', dreamText],
    ['Agents', agents.length ? `default${agents.map((a) => ` · @${a}`).join('')}` : 'default'],
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
