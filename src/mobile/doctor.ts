import { execFile } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { runHealth } from '../agent/run-health.js';
import { listRuns } from '../core/tracing.js';
import { loadConfig, Config } from '../core/config.js';
import { INSTALL_HINTS, detectSandbox, sandboxSetting } from '../agent/sandbox.js';
import { home, configPath, pidPath, PACKAGE_ROOT } from '../core/paths.js';
import { guardApplied, isLikelyTermux } from './bionic.js';
import { readBattery } from './power.js';
import { embedderPlan } from '../agent/embed-provider.js';
import { bootstrapStatus } from '../core/bootstrap.js';
import { securityAudit } from '../agent/security.js';

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

/** Address to ask when probing the panel bound to cfg.gateway.host. */
function panelHost(cfg: Config): string {
  const host = cfg.gateway.host;
  return !host || host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
}

/** Version the running panel reports (public /api/health), or null if unreachable. */
async function probeTermcrab(cfg: Config): Promise<string | null> {
  try {
    const res = await fetch(`http://${panelHost(cfg)}:${cfg.gateway.port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; version?: string };
    return data.name === 'termcrab' ? (data.version ?? '?') : null;
  } catch {
    return null;
  }
}

/** Version the running panel reports (public /api/health), or null if unreachable. */
async function runningPanelVersion(cfg: Config): Promise<string | null> {
  try {
    const res = await fetch(`http://${panelHost(cfg)}:${cfg.gateway.port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version || null;
  } catch {
    return null;
  }
}

/**
 * Ask a running panel whether it needs a password. Returns null when nothing
 * is answering (or the health reply is unusable).
 */
export async function probePanelHealth(
  cfg: Config,
): Promise<{ authRequired: boolean } | null> {
  try {
    const res = await fetch(`http://${panelHost(cfg)}:${cfg.gateway.port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { authRequired?: boolean };
    return { authRequired: data.authRequired === true };
  } catch {
    return null;
  }
}

function installedVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version?: string };
    return pkg.version || '?';
  } catch {
    return '?';
  }
}

/**
 * Ask the gateway running on this machine whether it accepts `token`.
 * 'ok' = accepted, 'mismatch' = running with a different password,
 * 'offline' = nothing reachable to ask.
 */
export async function probeGatewayToken(cfg: Config, token: string): Promise<'ok' | 'mismatch' | 'offline'> {
  try {
    const res = await fetch(`http://${panelHost(cfg)}:${cfg.gateway.port}/api/config`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(1500),
    });
    if (res.status === 200) return 'ok';
    if (res.status === 401) return 'mismatch';
    return 'offline';
  } catch {
    return 'offline';
  }
}

export async function runDoctor(): Promise<Check[]> {
  const checks: Check[] = [];
  const cfg = loadConfig();

  // Policy (34.5): the Termux checks below are about this device; this one is
  // about what the agent is allowed to do. Findings are the same objects
  // `termcrab security` prints, reduced to the worst line.
  {
    const findings = securityAudit({ config: cfg, sandboxAvailable: detectSandbox().isolated });
    const fails = findings.filter((f) => f.level === 'fail');
    const warns = findings.filter((f) => f.level === 'warn');
    const worst = fails[0] ?? warns[0];
    checks.push({
      id: 'security',
      label: 'security policy audit',
      status: fails.length ? 'fail' : warns.length ? 'warn' : 'ok',
      detail: fails.length || warns.length
        ? `${fails.length} fail, ${warns.length} warn — worst: ${worst!.title}`
        : 'exec policy, approvals, bind address, tokens and key placement all check out',
      fix: worst ? 'termcrab security   (every finding carries its fix)' : undefined,
    });
  }

  // Node version
  checks.push({
    id: 'node',
    label: 'Node.js >= 20.10',
    status: semverAtLeast(process.versions.node, '20.10.0') ? 'ok' : 'fail',
    detail: `found v${process.versions.node}`,
    fix: 'pkg install nodejs-lts (Termux) or install Node 20+ from nodejs.org',
  });

  // Sandbox (30.3): whether shell commands can be isolated on this device.
  {
    const info = detectSandbox();
    const setting = sandboxSetting(cfg);
    const status = info.isolated ? 'ok' : setting === 'require' ? 'fail' : setting === 'off' ? 'ok' : 'warn';
    checks.push({
      id: 'sandbox',
      label: 'shell sandbox',
      status,
      detail:
        setting === 'off'
          ? 'agent.sandbox=off — commands run with full access to this device (your choice)'
          : setting === 'require' && !info.isolated
            ? `agent.sandbox=require, but ${info.note}`
            : info.note,
      fix: info.isolated ? undefined : `${INSTALL_HINTS.bwrap}, ${INSTALL_HINTS.proot} — or set agent.sandbox=off to stop asking`,
    });
  }

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

  // Config - warn only if there's no api key AND no saved providers AND not
  // pointed at a local host (Ollama etc. don't require a key).
  const isLocal = (() => {
    try {
      const u = new URL(cfg.provider.baseUrl || '');
      return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '::1';
    } catch { return false; }
  })();
  const hasProvider = Boolean(cfg.provider.apiKey) || cfg.providers.some((p) => p.keys.length) || isLocal;
  checks.push({
    id: 'config',
    label: 'config.json',
    status: fs.existsSync(configPath()) ? (hasProvider ? 'ok' : 'warn') : 'fail',
    detail: fs.existsSync(configPath())
      ? `provider=openai model=${cfg.provider.model}${hasProvider ? '' : ' (no api key)'}`
      : 'missing',
    fix: fs.existsSync(configPath()) ? 'run: termcrab onboard' : 'run: termcrab onboard',
  });

  // Web panel password - the exact thing that locks people out of the UI.
  if (!cfg.gateway.token) {
    const host = cfg.gateway.host;
    const exposed = Boolean(host) && host !== '127.0.0.1' && host !== '::1' && host !== 'localhost';
    if (exposed) {
      checks.push({
        id: 'panel-password',
        label: 'web panel password',
        status: 'warn',
        detail: `no password, but reachable from your network (${host})`,
        fix: 'set one now: termcrab config set gateway.token generate',
      });
    } else {
      checks.push({
        id: 'panel-password',
        label: 'web panel password',
        status: 'info',
        detail: 'none set - the panel runs without a login (this device only)',
        fix: 'to require a password: termcrab config set gateway.token generate',
      });
    }
  } else {
    const probe = await probeGatewayToken(cfg, cfg.gateway.token);
    if (probe === 'ok') {
      const running = await runningPanelVersion(cfg);
      const installed = installedVersion();
      if (running && installed !== '?' && running !== installed) {
        checks.push({
          id: 'panel-password',
          label: 'web panel password',
          status: 'warn',
          detail: `accepts it, but the panel is still running v${running} - this install is v${installed}`,
          fix: 'restart the panel: close it, then run termcrab gateway',
        });
      } else {
        checks.push({
          id: 'panel-password',
          label: 'web panel password',
          status: 'ok',
          detail: 'the running panel accepts it',
        });
      }
    } else if (probe === 'mismatch') {
      checks.push({
        id: 'panel-password',
        label: 'web panel password',
        status: 'fail',
        detail: 'the running panel is using a DIFFERENT password than this file',
        fix: 'restart the panel: close it, then run termcrab gateway - afterwards run: termcrab config get gateway.token',
      });
    } else {
      checks.push({
        id: 'panel-password',
        label: 'web panel password',
        status: 'info',
        detail: `saved in config, but no panel is answering on port ${cfg.gateway.port}`,
        fix: 'start the panel: termcrab gateway',
      });
    }
  }

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
  // A busy port is not proof of a problem: another TermCrab gateway may already
  // serve this address (a different home, or one that has not written this
  // home's pid file). Ask it who it is before calling it a failure — telling a
  // user to start a gateway that is already running is the worst kind of advice.
  const serving = !running && !free ? await probeTermcrab(cfg) : null;
  checks.push({
    id: 'gateway',
    label: `gateway (${cfg.gateway.host}:${cfg.gateway.port})`,
    status: running || serving ? 'ok' : free ? 'warn' : 'fail',
    detail: running
      ? `running (pid ${fs.readFileSync(pidPath(), 'utf8').trim()})`
      : serving
        ? `already running (termcrab ${serving} on :${cfg.gateway.port}; no pid file in this home)`
        : free
          ? 'not running'
          : `port busy (something that is not a termcrab gateway holds :${cfg.gateway.port})`,
    fix: running || serving
      ? undefined
      : free
        ? 'termcrab gateway   (or: termcrab supervisor for auto-restart)'
        : `termcrab config set gateway.port ${cfg.gateway.port + 1}   (or stop whatever holds :${cfg.gateway.port})`,
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
    status: 'info',
    detail: cfg.agent.allowExec ? 'allowExec=true (agent may run shell commands)' : 'allowExec=false (shell disabled)',
  });

  // Local model endpoint probe (when provider.baseUrl points at localhost)
  try {
    const base = cfg.provider.baseUrl;
    if (base && /^https?:\/\/(127\.0\.0\.1|localhost|::1)/.test(base)) {
      const url = `${base.replace(/\/+$/, '')}/models`;
      let ok = false;
      let detail = url;
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
        ok = res.ok;
        if (!ok) detail = `${url} -> HTTP ${res.status}`;
      } catch (err) {
        detail = `${url} unreachable (${err instanceof Error ? err.message : err})`;
      }
      checks.push({
        id: 'localmodel',
        label: 'local model endpoint',
        status: ok ? 'ok' : 'fail',
        detail,
        fix: ok ? undefined : 'start llama-server / ollama, or clear provider.baseUrl to use a cloud API',
      });
    }
  } catch {
    /* optional probe */
  }

  // WhatsApp (optional extension)
  const wa = cfg.channels.whatsapp;
  if (wa?.enabled) {
    const { baileysInstalled } = await import('../channels/whatsapp.js');
    const installed = await baileysInstalled();
    checks.push({
      id: 'whatsapp',
      label: 'whatsapp channel (optional Baileys extension)',
      status: installed && wa.allowedJids?.length ? 'ok' : installed ? 'warn' : 'fail',
      detail: !installed
        ? 'baileys not installed'
        : wa.allowedJids?.length
          ? `enabled · allowlist: ${wa.allowedJids.length} entry/entries`
          : 'enabled but allowlist EMPTY (channel stays off)',
      fix: installed
        ? 'termcrab config set channels.whatsapp.allowedJids ["<phone-number>"]'
        : 'npm install baileys   (inside the TermCrab directory)',
    });
  } else {
    checks.push({ id: 'whatsapp', label: 'whatsapp channel', status: 'info', detail: 'disabled (optional: npm install baileys)' });
  }

  // v0.4: local model tier (on-device lightweight tasks)
  const lp = cfg.localProvider;
  checks.push({
    id: 'localmodel',
    label: 'local model tier',
    status: lp?.enabled && lp.model ? 'ok' : 'info',
    detail:
      lp?.enabled && lp.model ? `${lp.model} @ ${lp.baseUrl}` : 'disabled (optional on-device tier)',
    fix:
      lp?.enabled && lp.model
        ? undefined
        : 'termcrab config set localProvider.enabled true  (plus .model / .baseUrl)',
  });

  // v0.4: dreaming (idle memory consolidation)
  checks.push({
    id: 'dream',
    label: 'dreaming (memory consolidation)',
    status: cfg.dream?.enabled ? 'ok' : 'info',
    detail: cfg.dream?.enabled
      ? `every ${cfg.dream.everyHours}h, gated on idle + battery (or termcrab dream)`
      : 'disabled (termcrab config set dream.enabled true)',
  });

  // Hybrid search (32.1): local model, the provider's embedding endpoint, or
  // lexical search only — the plan says which, without doing any I/O.
  const plan = embedderPlan(cfg);
  let vectors = 0;
  try {
    const idxFile = path.join(home(), 'memory', 'index.jsonl');
    if (fs.existsSync(idxFile)) {
      vectors = fs.readFileSync(idxFile, 'utf8').split('\n').filter((l) => l.trim()).length;
    }
  } catch {
    /* ignore */
  }
  checks.push({
    id: 'embeddings',
    label: 'embedding search (hybrid memory)',
    status: plan.kind && !plan.blocker ? 'ok' : plan.kind ? 'warn' : 'info',
    detail: plan.kind
      ? `${plan.kind} · ${plan.model} · ${vectors} vector(s) indexed`
      : `${plan.note}${vectors ? ` · ${vectors} vector(s) indexed` : ''}`,
    fix: plan.blocker,
  });

  // 32.3: the file set a new home gets, and whether the first run is done.
  try {
    const st = bootstrapStatus();
    checks.push({
      id: 'bootstrap',
      label: 'home file set (SOUL, IDENTITY, AGENTS, USER, MEMORY)',
      status: st.complete ? 'ok' : 'warn',
      detail: st.complete
        ? `${st.present.length} file(s) present${st.stage === 'first-run' ? ' · first run not done yet' : ''}`
        : `missing: ${st.missing.join(', ')}`,
      fix: st.complete ? undefined : 'termcrab bootstrap --write',
    });
  } catch {
    /* a home that cannot be read is reported by the other checks */
  }

  // 40.2: the performance budget, as the doctor sees it. The measurement
  // belongs to `termcrab perf` (a doctor run must not boot a gateway and run a
  // turn); this check reads what that command wrote and says how old it is,
  // because a number from last month is a fact about last month.
  try {
    const { perfStatus } = await import('../core/perf.js');
    const p = perfStatus();
    if (!p.exists) {
      checks.push({
        id: 'perf',
        label: 'performance budget',
        status: 'info',
        detail: 'not measured on this home yet',
        fix: 'termcrab perf',
      });
    } else {
      const staleDays = p.ageMs === null ? null : p.ageMs / 86_400_000;
      const worst = p.worst ? `${p.worst.key} ${Math.round(p.worst.value)}/${p.worst.max} (${p.worst.pct}%)` : 'nothing to compare';
      const host = p.machine ? `${p.machine.platform}/${p.machine.arch}` : 'unknown host';
      const over = p.over.length > 0;
      const stale = staleDays !== null && staleDays >= 30;
      checks.push({
        id: 'perf',
        label: 'performance budget',
        status: over ? 'warn' : stale ? 'info' : 'ok',
        detail:
          `measured ${p.age} on ${host} · worst ${worst}` +
          (over ? ` · OVER: ${p.over.join(', ')}` : '') +
          (p.skipped.length ? ` · ${p.skipped.length} metric(s) not measured` : ''),
        fix: over
          ? 'see docs/PERFORMANCE.md for the metric that is over, then: termcrab perf'
          : stale
            ? 'this measurement is a month old: termcrab perf'
            : undefined,
      });
    }
  } catch {
    /* a home without a perf snapshot is the common case, not a problem */
  }

  // Voice / TTS
  try {
    const { resolveTts } = await import('../mobile/tts.js');
    const { execFile: ef } = await import('node:child_process');
    const { promisify: pm } = await import('node:util');
    const execAsync = pm(ef);
    const has = async (c: string) => {
      try {
        await execAsync('which', [c], { timeout: 2000 });
        return true;
      } catch {
        return false;
      }
    };
    let found: string | null = null;
    for (const c of ['termux-tts-speak', 'espeak-ng', 'espeak', 'say', 'spd-say']) {
      if (await has(c)) {
        found = c;
        break;
      }
    }
    checks.push(
      found
        ? { id: 'tts', label: 'voice output (TTS)', status: 'ok', detail: found }
        : { id: 'tts', label: 'voice output (TTS)', status: 'info', detail: 'no TTS backend', fix: 'pkg install termux-api (Termux) or espeak-ng' },
    );
  } catch {
    /* optional */
  }

  // Offline file transcription (whisper.cpp) — optional, spike #11.
  try {
    const { findWhisperBin, findWhisperModel } = await import('./whisper.js');
    const wb = findWhisperBin();
    const wm = findWhisperModel();
    checks.push(
      wb && wm
        ? { id: 'whisper', label: 'file transcription (whisper)', status: 'ok', detail: `engine + model ready (${path.basename(wm)})` }
        : {
            id: 'whisper',
            label: 'file transcription (whisper)',
            status: 'info',
            detail: !wb ? 'engine not installed (optional)' : 'engine found, no model yet',
            fix: 'termcrab transcribe — error message has the full install steps',
          },
    );
  } catch {
    /* optional */
  }

  // Voice input (dictation) — used by the web panel 🎤 button.
  const sttOk = await execExists('termux-speech-to-text');
  checks.push(
    sttOk
      ? { id: 'stt', label: 'voice input (dictation)', status: 'ok', detail: 'termux-speech-to-text' }
      : {
          id: 'stt',
          label: 'voice input (dictation)',
          status: 'info',
          detail: 'no dictation tool (works on Termux only)',
          fix: 'pkg install termux-api  (+ the Termux:API app from F-Droid)',
        },
  );

  // Anything running right now that has stopped making progress (23.1). The
  // doctor is consulted *because* something looks wrong, so this check may
  // only see the queue of the process it is running in — when the gateway is
  // the surface, the same data comes from GET /api/runs/health.
  const health = runHealth({
    queue: undefined,
    traces: listRuns(),
    stuckAfterMs: 60_000,
  });
  const worried = health.filter((h) => h.verdict === 'stuck' || h.verdict === 'failing');
  checks.push(
    health.length === 0
      ? { id: 'runs', label: 'running turns', status: 'ok', detail: 'nothing is running — no run can be stuck' }
      : worried.length === 0
        ? {
            id: 'runs',
            label: 'running turns',
            status: 'ok',
            detail: `${health.length} running, all making progress`,
          }
        : {
            id: 'runs',
            label: 'running turns',
            status: 'warn',
            detail: worried.map((h) => `${h.sessionId}: ${h.verdict} — ${h.lastActivity}`).join('; '),
            fix: worried[0]!.suggestion,
          },
  );

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

/** Scrub anything key-shaped out of a report before it leaves the machine. */
function scrub(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[key]')
    .replace(/\b\d{8,}:[A-Za-z0-9_-]{20,}/g, '[token]')
    .replace(/(apiKey|token)["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, '$1: [hidden]');
}

/**
 * Redacted, copy-paste diagnostic block for `termcrab doctor --share`.
 * Contains checks + environment only — never config secrets.
 */
export function buildShareReport(
  checks: Check[],
  meta: {
    version: string;
    provider: string;
    node: string;
    platform: string;
    home: string;
    configPath: string;
  },
): string {
  const lines: string[] = [
    `termcrab doctor --share  (v${meta.version})`,
    `date: ${new Date().toISOString()}`,
    `node: ${meta.node} · ${meta.platform}`,
    `brain: ${meta.provider}`,
    `home: ${meta.home}`,
    `config: ${meta.configPath}`,
    `secrets: none included`,
    '',
    'checks:',
  ];
  for (const c of checks) {
    let line = `[${c.status}] ${c.id} — ${c.label}`;
    if (c.detail) line += `: ${c.detail}`;
    if (c.fix && c.status !== 'ok') line += ` | fix: ${c.fix}`;
    lines.push(line);
  }
  const failed = checks.filter((c) => c.status === 'fail').length;
  lines.push('', failed ? `result: ${failed} failing check(s)` : 'result: all good');
  return scrub(lines.join('\n'));
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
