import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { loadConfig } from '../core/config.js';
import { home, configPath, pidPath } from '../core/paths.js';
import { guardApplied, isLikelyTermux } from './bionic.js';
import { readBattery } from './power.js';

const execFileAsync = promisify(execFile);

export type Status = 'ok' | 'warn' | 'fail' | 'info';

export interface Check {
  id: string;
  label: string;
  status: Status;
  detail?: string;
  fix?: string;
}

function semverAtLeast(v: string, min: string): boolean {
  const parse = (s: string) => s.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = parse(v);
  const b = parse(min);
  for (let i = 0; i < 3; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}

async function portFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, host, () => srv.close(() => resolve(true)));
  });
}

export async function runDoctor(): Promise<Check[]> {
  const checks: Check[] = [];
  const cfg = loadConfig();

  // Node version
  checks.push({
    id: 'node',
    label: 'Node.js >= 20.10',
    status: semverAtLeast(process.versions.node, '20.10.0') ? 'ok' : 'fail',
    detail: `found v${process.versions.node}`,
    fix: 'pkg install nodejs-lts (Termux) or install Node 20+ from nodejs.org',
  });

  // State home
  try {
    const probe = path.join(home(), '.write-probe');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    checks.push({ id: 'home', label: 'state dir writable', status: 'ok', detail: home() });
  } catch (err) {
    checks.push({
      id: 'home',
      label: 'state dir writable',
      status: 'fail',
      detail: err instanceof Error ? err.message : String(err),
      fix: 'Check storage permissions / TCRAB_HOME',
    });
  }

  // Config
  const hasProviderKey = Boolean(cfg.provider.apiKey) || cfg.provider.type === 'mock';
  checks.push({
    id: 'config',
    label: 'config.json',
    status: fs.existsSync(configPath()) ? (hasProviderKey ? 'ok' : 'warn') : 'fail',
    detail: fs.existsSync(configPath())
      ? `provider=${cfg.provider.type} model=${cfg.provider.model}${hasProviderKey ? '' : ' (no api key)'}`
      : 'missing',
    fix: fs.existsSync(configPath()) ? 'run: termcrab onboard' : 'run: termcrab onboard',
  });

  // Temp dir
  const tmp = os.tmpdir();
  try {
    const probe = path.join(tmp, '.tc-probe');
    fs.writeFileSync(probe, 'x');
    fs.unlinkSync(probe);
    checks.push({ id: 'tmp', label: 'temp dir writable', status: 'ok', detail: tmp });
  } catch {
    checks.push({
      id: 'tmp',
      label: 'temp dir writable',
      status: 'fail',
      detail: tmp,
      fix: 'export TMPDIR=$PREFIX/tmp  (Termux) - or just use termcrab, it applies this automatically',
    });
  }

  // Bionic guard
  checks.push({
    id: 'bionic',
    label: 'Android bionic guard',
    status: guardApplied() ? 'ok' : 'warn',
    detail: guardApplied() ? 'active (applied at startup)' : 'not applied',
    fix: 'Always launch via the termcrab CLI (it loads the guard first)',
  });

  // Termux environment
  const inTermux = isLikelyTermux();
  checks.push({
    id: 'termux',
    label: 'Termux environment',
    status: inTermux ? 'ok' : 'info',
    detail: inTermux ? `PREFIX=${process.env.PREFIX}` : `not detected (${os.platform()})`,
  });

  // Battery API (mobile only)
  if (inTermux) {
    const battery = await readBattery();
    checks.push(
      battery
        ? { id: 'battery', label: 'termux-api battery', status: 'ok', detail: `${battery.percentage}% ${battery.plugged ? '(charging)' : ''}` }
        : {
            id: 'battery',
            label: 'termux-api battery',
            status: 'warn',
            detail: 'termux-battery-status not available',
            fix: 'pkg install termux-api (enables adaptive heartbeat)',
          },
    );

    // Boot script
    const bootScript = path.join(os.homedir(), '.termux', 'boot', 'start-termcrab');
    checks.push({
      id: 'boot',
      label: 'auto-start on boot',
      status: fs.existsSync(bootScript) ? 'ok' : 'warn',
      detail: fs.existsSync(bootScript) ? bootScript : 'not installed',
      fix: 'termcrab boot install   (also run: termux-wake-lock)',
    });
  }

  // Gateway status
  let running = false;
  try {
    if (fs.existsSync(pidPath())) {
      process.kill(Number(fs.readFileSync(pidPath(), 'utf8').trim()), 0);
      running = true;
    }
  } catch {
    running = false;
  }
  const free = await portFree(cfg.gateway.port, cfg.gateway.host);
  checks.push({
    id: 'gateway',
    label: `gateway (${cfg.gateway.host}:${cfg.gateway.port})`,
    status: running ? 'ok' : free ? 'warn' : 'fail',
    detail: running ? `running (pid ${fs.readFileSync(pidPath(), 'utf8').trim()})` : free ? 'not running' : 'port busy',
    fix: running ? undefined : 'termcrab gateway   (or: termcrab supervisor for auto-restart)',
  });

  // Telegram
  const tg = cfg.channels.telegram;
  if (tg?.token) {
    checks.push({
      id: 'telegram',
      label: 'telegram channel',
      status: tg.allowedUserIds?.length ? 'ok' : 'fail',
      detail: tg.allowedUserIds?.length
        ? `allowlist: ${tg.allowedUserIds.join(', ')}`
        : 'token set but allowlist EMPTY (channel stays off by design)',
      fix: tg.allowedUserIds?.length ? undefined : 'termcrab config set channels.telegram.allowedUserIds [YOUR_USER_ID]',
    });
  } else {
    checks.push({ id: 'telegram', label: 'telegram channel', status: 'info', detail: 'not configured (optional)' });
  }

  // exec policy
  checks.push({
    id: 'exec',
    label: 'shell exec policy',
    status: cfg.agent.allowExec ? 'info' : 'info',
    detail: cfg.agent.allowExec ? 'allowExec=true (agent may run shell commands)' : 'allowExec=false (shell disabled)',
  });

  return checks;
}

export function renderChecks(checks: Check[]): { text: string; failed: number; warned: number } {
  const icon: Record<Status, string> = { ok: '✅', warn: '⚠️ ', fail: '❌', info: 'ℹ️ ' };
  let failed = 0;
  let warned = 0;
  const lines: string[] = ['TermCrab doctor', ''];
  for (const c of checks) {
    if (c.status === 'fail') failed++;
    if (c.status === 'warn') warned++;
    lines.push(`${icon[c.status]} ${c.label}${c.detail ? ` - ${c.detail}` : ''}`);
    if (c.fix && c.status !== 'ok') lines.push(`     fix: ${c.fix}`);
  }
  lines.push('', failed ? `RESULT: ${failed} failure(s), ${warned} warning(s)` : `RESULT: all good (${warned} warning(s))`);
  return { text: lines.join('\n'), failed, warned };
}

export async function checkPortInUse(port: number): Promise<boolean> {
  return !(await portFree(port, '127.0.0.1'));
}

/** Verify a telegram token quickly (used by onboard). */
export async function verifyTelegram(token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as { ok: boolean; result?: { username?: string }; description?: string };
    if (!data.ok) return data.description || 'invalid token';
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export async function execExists(cmd: string): Promise<boolean> {
  try {
    await execFileAsync('which', [cmd], { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
