import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Config } from '../core/config.js';
import { log } from '../core/logger.js';
import { PACKAGE_ROOT, ensureLayout, pidPath, stateDir, uiDir } from '../core/paths.js';
import { AgentCtx, runTurn, providerLabel } from '../agent/loop.js';
import { runHeartbeatOnce, scheduleHeartbeat } from '../agent/heartbeat.js';
import { MemoryStore } from '../agent/memory.js';
import { SessionStore } from '../agent/sessions.js';
import { SkillStore } from '../skills/loader.js';
import { extractAuth, checkToken } from './auth.js';
import { bus, BusEvent } from './events.js';
import { TelegramChannel } from '../channels/telegram.js';
import { outboxTakeAll } from '../mobile/outbox.js';
import { notifyStatus, cancelStatusNotification } from '../mobile/notify.js';
import { startCronScheduler, cronTick } from '../cron/scheduler.js';
import { addCron, loadCrons, removeCron, setCronEnabled, getCron } from '../cron/store.js';
import { nextRun, parseCron, CronParseError } from '../cron/parser.js';

export interface GatewayHandle {
  server: http.Server;
  port: number;
  stop: () => Promise<void>;
  agent: AgentCtx;
}

interface GatewayOpts {
  config: Config;
  host?: string;
  port?: number;
}

function readBody(req: http.IncomingMessage, limit = 1_000_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(data);
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveFile(res: http.ServerResponse, file: string): void {
  if (!fs.existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
}

function telegramStateFile(): string {
  return path.join(stateDir(), 'telegram.json');
}

function readTelegramState(): { offset: number } {
  try {
    if (fs.existsSync(telegramStateFile())) {
      return JSON.parse(fs.readFileSync(telegramStateFile(), 'utf8')) as { offset: number };
    }
  } catch {
    /* ignore */
  }
  return { offset: 0 };
}

function writeTelegramState(offset: number): void {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(telegramStateFile(), JSON.stringify({ offset }), 'utf8');
}

export async function startGateway(opts: GatewayOpts): Promise<GatewayHandle> {
  ensureLayout();
  const config = opts.config;
  const host = opts.host ?? config.gateway.host ?? '127.0.0.1';
  const port = opts.port ?? config.gateway.port ?? 7788;

  const isLoopback = host === '127.0.0.1' || host === '::1' || host === 'localhost';
  if (!isLoopback && !config.gateway.token) {
    throw new Error(
      'Refusing to bind a non-loopback host without gateway.token. Set a token first: termcrab config set gateway.token <value>',
    );
  }

  const memory = new MemoryStore();
  const skills = new SkillStore();
  const sessions = new SessionStore();
  const agent: AgentCtx = { config, memory, skills, sessions };

  // ---- Telegram (optional) ----
  let telegram: TelegramChannel | null = null;
  const tgCfg = config.channels.telegram;
  if (tgCfg?.token && tgCfg.allowedUserIds?.length) {
    const state = readTelegramState();
    telegram = new TelegramChannel({
      cfg: tgCfg,
      getOffset: () => readTelegramState().offset,
      setOffset: (n) => writeTelegramState(n),
      onMessage: async (_userId, chatId, text, _name) => {
        // Remember where proactive messages should go.
        if (config.channels.telegram && config.channels.telegram.notifyChatId !== chatId) {
          config.channels.telegram.notifyChatId = chatId;
          try {
            fs.writeFileSync(
              path.join(stateDir(), 'notify.json'),
              JSON.stringify({ chatId }),
              'utf8',
            );
          } catch {
            /* non-fatal */
          }
        }
        if (text === '/new') {
          sessions.reset(`telegram:${chatId}`);
          return '🧹 Session reset. Fresh start!';
        }
        if (text === '/heartbeat') {
          const res = await runHeartbeatOnce(agent);
          return res.ran ? `🫀 Heartbeat done (${res.reason}):\n\n${res.output}` : `🫀 Heartbeat skipped: ${res.reason}`;
        }
        if (text === '/status') {
          return `🦀 TermCrab online\nmodel: ${providerLabel(config)}\nexec: ${config.agent.allowExec ? 'on' : 'off'}\nheartbeat: ${config.heartbeat.enabled ? `every ${config.heartbeat.minutes}m` : 'off'}`;
        }
        const result = await runTurn(agent, {
          sessionId: `telegram:${chatId}`,
          userMessage: text,
          channel: 'telegram',
          onEvent: (ev) => bus.emit(ev as unknown as BusEvent),
        });
        return result;
      },
    });
    telegram.start();
    log.info('telegram channel started (allowlist:', tgCfg.allowedUserIds.join(', '), ')');
  } else if (tgCfg?.token) {
    log.warn('telegram token set but allowlist empty - channel NOT started (secure default). Run: termcrab config set channels.telegram.allowedUserIds [123]');
  }

  // ---- Outbox flush (offline tolerance) ----
  const outboxTimer = setInterval(() => {
    if (!telegram) return;
    void telegram.flushOutbox(outboxTakeAll).then((n) => {
      if (n > 0) log.info(`outbox: flushed ${n} queued message(s)`);
    });
  }, 30_000);
  outboxTimer.unref();

  // ---- Heartbeat ----
  const notify = async (text: string): Promise<void> => {
    const chatId = config.channels.telegram?.notifyChatId;
    if (telegram && chatId) await telegram.send(chatId, `🫀 ${text}`);
    log.info('heartbeat output:', text.slice(0, 300));
  };
  const stopHeartbeat = scheduleHeartbeat(agent, notify);
  const stopCron = startCronScheduler({ ctx: agent, deliver: notify });
  void notifyStatus(`online · ${providerLabel(config)} · port ${port}`);

  // ---- HTTP server ----
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    const pathname = new URL(url, 'http://localhost').pathname;

    try {
      // Static: control UI
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        serveFile(res, path.join(uiDir(), 'index.html'));
        return;
      }
      if (req.method === 'GET' && pathname === '/api/health') {
        json(res, 200, {
          ok: true,
          name: 'termcrab',
          version: version(),
          uptimeSec: Math.floor(process.uptime()),
          provider: providerLabel(config),
          telegram: Boolean(telegram),
        });
        return;
      }

      // Everything else under /api requires a valid token.
      if (pathname.startsWith('/api/')) {
        if (!checkToken(config, extractAuth(req as unknown as { headers: Record<string, string | string[] | undefined>; url?: string }))) {
          json(res, 401, { error: 'unauthorized' });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/events') {
          res.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          });
          res.write(': connected\n\n');
          const unsubscribe = bus.subscribe((ev) => {
            res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
          });
          const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
          ping.unref();
          req.on('close', () => {
            clearInterval(ping);
            unsubscribe();
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/chat') {
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { message?: string; sessionId?: string }) : {};
          const message = (body.message || '').trim();
          if (!message) {
            json(res, 400, { error: 'message required' });
            return;
          }
          const sessionId = body.sessionId || 'web:main';
          const text = await runTurn(agent, {
            sessionId,
            userMessage: message,
            channel: 'web',
            onEvent: (ev) => bus.emit(ev as unknown as BusEvent),
          });
          json(res, 200, { text, sessionId });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/sessions') {
          json(res, 200, { sessions: sessions.list() });
          return;
        }

        const sessionMatch = pathname.match(/^\/api\/sessions\/([^/]+)$/);
        if (sessionMatch && req.method === 'GET') {
          const id = decodeURIComponent(sessionMatch[1]!);
          json(res, 200, { messages: sessions.read(id) });
          return;
        }
        if (sessionMatch && req.method === 'DELETE') {
          const id = decodeURIComponent(sessionMatch[1]!);
          sessions.reset(id);
          json(res, 200, { ok: true });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/crons') {
          const now = new Date();
          json(res, 200, {
            crons: loadCrons().map((c) => {
              let next: string | null = null;
              try {
                const nx = nextRun(parseCron(c.schedule), now);
                next = nx ? nx.toISOString() : null;
              } catch {
                next = null;
              }
              return { ...c, nextRun: next };
            }),
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/crons') {
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { name?: string; schedule?: string; prompt?: string; critical?: boolean }) : {};
          try {
            const job = addCron({
              name: body.name || '',
              schedule: body.schedule || '',
              prompt: body.prompt || '',
              critical: body.critical,
            });
            json(res, 200, { cron: job });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        const cronMatch = pathname.match(/^\/api\/crons\/([^/]+)$/);
        if (cronMatch && req.method === 'DELETE') {
          const id = decodeURIComponent(cronMatch[1]!);
          const ok = removeCron(id);
          json(res, ok ? 200 : 404, { ok });
          return;
        }

        const cronRunMatch = pathname.match(/^\/api\/crons\/([^/]+)\/run$/);
        if (cronRunMatch && req.method === 'POST') {
          const job = getCron(decodeURIComponent(cronRunMatch[1]!));
          if (!job) {
            json(res, 404, { error: 'cron not found' });
            return;
          }
          const output = await runTurn(agent, {
            sessionId: `cron:${job.id}`,
            userMessage: `[manual:${job.name}] ${job.prompt}`,
            channel: 'cron',
            onEvent: (ev) => bus.emit(ev as unknown as BusEvent),
          });
          json(res, 200, { output });
          return;
        }

        const cronToggleMatch = pathname.match(/^\/api\/crons\/([^/]+)\/(enable|disable)$/);
        if (cronToggleMatch && req.method === 'POST') {
          const job = setCronEnabled(decodeURIComponent(cronToggleMatch[1]!), cronToggleMatch[2] === 'enable');
          if (!job) {
            json(res, 404, { error: 'cron not found' });
            return;
          }
          json(res, 200, { cron: job });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/skills') {
          json(res, 200, { skills: skills.list() });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/memory') {
          json(res, 200, { head: memory.readHead(8000), stats: memory.stats() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/heartbeat') {
          const result = await runHeartbeatOnce(agent, notify);
          json(res, 200, result);
          return;
        }

        json(res, 404, { error: 'not found' });
        return;
      }

      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) json(res, 500, { error: message });
      else res.end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  // PID file (supervisor + doctor use it)
  fs.writeFileSync(pidPath(), String(process.pid), 'utf8');

  const handle: GatewayHandle = {
    server,
    port,
    agent,
    stop: async () => {
      stopHeartbeat();
      stopCron();
      clearInterval(outboxTimer);
      if (telegram) await telegram.stop();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      void cancelStatusNotification();
      try {
        if (fs.existsSync(pidPath())) fs.unlinkSync(pidPath());
      } catch {
        /* ignore */
      }
    },
  };
  return handle;
}

export function version(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8')) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}
