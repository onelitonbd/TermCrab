import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  Config,
  ProviderEntry,
  cfgSet,
  saveConfig,
  configExists,
  configProblems,
  readExternalConfigChange,
} from '../core/config.js';
import { log } from '../core/logger.js';
import {
  PACKAGE_ROOT,
  configPath,
  ensureLayout,
  home,
  logsDir,
  memoryDir,
  pidPath,
  sessionsDir,
  stateDir,
  uiDir,
  workspaceDir,
} from '../core/paths.js';
import { AgentCtx, runQueuedTurn, runTurn, providerLabel } from '../agent/loop.js';
import { diskBudgetBytes, diskKeepDays, diskUsage, enforceDiskBudget } from '../core/disk.js';
import { getRun } from '../core/tracing.js';
import { buildTools } from '../agent/tools.js';
import { runHeartbeatOnce, scheduleHeartbeat } from '../agent/heartbeat.js';
import { MemoryStore } from '../agent/memory.js';
import { EmbeddingIndex, tryLoadEmbedder } from '../agent/embed.js';
import { runDream, startDreamScheduler, readDreamState, dreamHistory } from '../agent/dream.js';
import { countMemoryFacts } from '../agent/status.js';
import { formatTokens, usageForDay } from '../core/usage.js';
import { PRICING_AS_OF } from '../core/pricing.js';
import { checkForUpdate } from '../core/update.js';
import { applyUpdate, ApplyPhase } from '../core/updater.js';
import { resolveProvider } from '../providers/index.js';
import { getModelCapabilities, normalizeThinkingLevel } from '../providers/capabilities.js';
import { getCachedCaps, modelCapsKey, probeModel, probeModels } from '../providers/probe.js';
import { outboxSweep } from '../mobile/outbox.js';
import { createMcpClient } from '../providers/mcp.js';
import { listRuns, clearRuns } from '../core/tracing.js';
import { speakStream } from '../mobile/tts-stream.js';
import { startContinuousStt } from '../mobile/tts-stream.js';
import { DiscordChannel } from '../channels/discord.js';
import { SlackChannel } from '../channels/slack.js';
import { SignalChannel } from '../channels/signal.js';
import { SmsChannel } from '../channels/sms.js';
import { MatrixChannel } from '../channels/matrix.js';
import { lastDigestSummary, QueueFullError, QueuedTurn, SessionQueue, SessionStore } from '../agent/sessions.js';
import { SkillStore } from '../skills/loader.js';
// Auth removed for now — all /api/* endpoints are open.
import { bus, BusEvent } from './events.js';
import { TelegramChannel } from '../channels/telegram.js';
import { makeIntake } from '../channels/intake.js';
import { contextReport, renderContext } from '../agent/context.js';
import { toProviderMessages } from '../agent/loop.js';
import { formatInbox, listInbox, readArrival } from '../channels/inbox.js';
import { WhatsAppChannel } from '../channels/whatsapp.js';
import { parseAgentPrefix } from '../channels/telegram.js';
import { ChannelName } from '../channels/api.js';
import { listAgents, sanitizeAgentName } from '../agent/prompt.js';
import { notifyStatus, cancelStatusNotification } from '../mobile/notify.js';
import { speak } from '../mobile/tts.js';
import { WakeService } from './wake-service.js';
import { seedWorkspace } from '../onboard.js';
import { DEFAULT_MODEL_HINTS } from '../core/config.js';
import {
  activeBaseUrl,
  activeLabel,
  fetchProviderModels,
  maskApiKey,
  providerOutboundKey,
  providerView,
} from './provider-helpers.js';
import { liveCatalog, modelMenu, modelSelect, providerMenu, providerSelect } from '../channels/picker.js';
import { listenOnce } from '../mobile/stt.js';
import { bootStatus, installBootScript, isTermux } from '../mobile/boot.js';
import { runDoctor } from '../mobile/doctor.js';
import { importSkills } from '../skills/importer.js';
import { isSoulTemplate, soulTemplate } from '../skills/scaffold.js';
import { registerDocumentSender, registerSender, recordInbound } from '../channels/conversations.js';
import { getPortal } from './portal.js';
import { canvasList, canvasRemove } from './canvas.js';
import { listSuggestions, dismiss } from '../agent/suggestions.js';
import { listAsks, answer as answerAsk } from '../agent/ask.js';
import { getProgress } from '../agent/progress.js';
import { startCronScheduler, cronTick } from '../cron/scheduler.js';
import { addCron, loadCrons, removeCron, setCronEnabled, getCron } from '../cron/store.js';
import { nextRun, parseCron, CronParseError } from '../cron/parser.js';
import { Approval, listApprovals, resolveApproval } from '../core/approvals.js';
import { authKey, authenticate, constantTimeEqual, extractAuth } from './auth.js';
import { formatSessionHits, searchSessions } from '../agent/session-search.js';
import { healthLine, runHealth } from '../agent/run-health.js';
import { structuredLog } from '../core/structured-log.js';
import { formatSessionView, policyLine, sessionView } from '../agent/session-view.js';
import { CODE_TTL_MS, formatDevice, listDevices, pairCode, redeemCode, revokeDevice } from './devices.js';
import { RateLimiter, limiterFromConfig, rateLimitHint } from './ratelimit.js';
import {
  WIRE_VERSION,
  checkWireEvent,
  parseChatRequest,
  parsePairRequest,
  recallIdempotent,
  rememberIdempotent,
  wrapEvent,
} from './protocol.js';

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

const SECRET_LEAF_KEYS = new Set(['token', 'apiKey', 'key']);

function maskSecret(v: string): string {
  return v.length <= 4 ? '•••' : `${v.slice(0, 2)}•••${v.slice(-2)}`;
}

/** Deep clone of the config with secrets masked — safe to ship to the UI. */
function redactConfig(cfg: Config): unknown {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (SECRET_LEAF_KEYS.has(k) && typeof val === 'string' && val) out[k] = maskSecret(val);
        else out[k] = walk(val);
      }
      return out;
    }
    return v;
  };
  return walk(cfg);
}

/**
 * The providers list, always in sync with the LIVE config: saved rows are
 * flagged when they are the endpoint in use, plus an `active` block that
 * describes whatever the gateway is using right now — even when it was set
 * outside this page (termcrab onboard / config set from a terminal).
 */
function providersListView(cfg: Config) {
  const activeBase = activeBaseUrl(cfg.provider);
  const activeKey = cfg.provider.apiKey || "";
  const views = cfg.providers.map((p) => ({ ...providerView(p), inUse: false }));
  const matched: number[] = [];
  if (activeBase) {
    cfg.providers.forEach((p, i) => {
      if (p.baseUrl === activeBase && activeKey && p.keys.some((k) => k.key === activeKey)) matched.push(i);
    });
    if (!matched.length) {
      cfg.providers.forEach((p, i) => {
        if (p.baseUrl === activeBase) matched.push(i);
      });
    }
  }
  for (const i of matched) views[i]!.inUse = true;
  return {
    providers: views,
    active: {
      type: cfg.provider.type,
      label: matched.length
        ? cfg.providers[matched[0]!]!.name
        : activeLabel(cfg.provider, activeBase),
      baseUrl: activeBase,
      model: cfg.provider.model || "",
      maskedKey: activeKey ? maskApiKey(activeKey) : "",
      matchedId: matched.length ? cfg.providers[matched[0]!]!.id : null,
    },
  };
}

function keyView(k: { id: string; name: string; key: string; created: number }, activeKey: string) {
  return { id: k.id, name: k.name, created: k.created, masked: maskApiKey(k.key), active: !!activeKey && k.key === activeKey };
}

function validHttpUrl(u: string): boolean {
  try {
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Apply one dotted config set to a LIVE config object (shared reference) + disk. */
function applyConfigSet(cfg: Config, key: string, value: string): void {
  const updated = cfgSet(cfg, key, value);
  const live = cfg as unknown as Record<string, unknown>;
  for (const k of Object.keys(cfg)) delete live[k];
  Object.assign(live, updated);
  saveConfig(cfg);
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readBody(req);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
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

  // Optional embedding index (hybrid search) - only when @huggingface/transformers is installed.
  let embeddingIndex: EmbeddingIndex | undefined;
  if (config.memory?.embeddings) {
    try {
      const embedder = await tryLoadEmbedder(path.join(home(), 'models'));
      if (embedder) {
        embeddingIndex = new EmbeddingIndex(path.join(memoryDir(), 'index.jsonl'), embedder);
        log.info('memory: hybrid search enabled (embeddings)');
      }
    } catch {
      log.info('memory: embeddings unavailable, lexical only');
    }
  }
  const memory = new MemoryStore(undefined, embeddingIndex);
  const skills = new SkillStore(undefined, {
    allow: config.skills?.allow?.length ? config.skills.allow : undefined,
  });
  const sessions = new SessionStore();
  // Optional local model tier (llama.cpp / ollama / llama-server on-device).
  let localProvider;
  if (config.localProvider?.enabled && config.localProvider.model) {
    try {
      localProvider = resolveProvider({
        type: 'openai',
        baseUrl: config.localProvider.baseUrl,
        model: config.localProvider.model,
        apiKey: config.localProvider.apiKey || 'local',
      });
      log.info('local model tier:', config.localProvider.model, 'at', config.localProvider.baseUrl);
    } catch {
      localProvider = undefined;
    }
  }
  const agentQueue = new SessionQueue();
  // 23.3: rotation limits come from config when the owner set them.
  structuredLog.configure({
    maxBytes: config.logs?.maxMB ? config.logs.maxMB * 1024 * 1024 : undefined,
    maxFiles: config.logs?.files,
  });
  // Limiters live with the process: one for the HTTP surface, one for channel
  // messages, both re-keyed per device/session (20.3).
  const httpLimiter = limiterFromConfig(config);
  const channelLimiter = limiterFromConfig(config);
  let continuousStt: import('../mobile/tts-stream.js').ContinuousStt | null = null;

  // ---- Config hot-reload: watch config.json for external changes ----
  const configFile = configPath();
  let configReloadTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleConfigReload = (): void => {
    if (configReloadTimer) clearTimeout(configReloadTimer);
    configReloadTimer = setTimeout(() => {
      const fresh = readExternalConfigChange();
      if (fresh) {
        // Merge fresh config into the live config object
        const live = config as unknown as Record<string, unknown>;
        for (const k of Object.keys(live)) delete live[k];
        Object.assign(live, fresh);
        agentQueue.setMode(config.agent.queueMode || 'followup');
        log.info('config: hot-reloaded from disk');
        // Re-resolve provider if it changed
        if (fresh.provider) {
          try {
            const newProvider = resolveProvider(fresh.provider, fetch);
            agent.provider = newProvider;
            log.info('config: provider updated');
            // Kick off a fresh probe for the new model/baseUrl/key combo if
            // we haven't probed it yet, so the thinking picker updates quickly.
            if (fresh.provider.model && fresh.provider.type !== 'mock') {
              const newBase = fresh.provider.baseUrl || 'https://api.openai.com/v1';
              if (!getCachedCaps(newBase, fresh.provider.model, fresh.provider.apiKey)) {
                probeModel({
                  baseUrl: newBase,
                  model: fresh.provider.model,
                  apiKey: fresh.provider.apiKey,
                  fetchImpl: fetch,
                }).catch((e: unknown) => {
                  log.warn('config-change probe failed:', e instanceof Error ? e.message : String(e));
                });
              }
            }
          } catch (err) {
            log.warn('config: provider update failed:', err instanceof Error ? err.message : String(err));
          }
        }
      }
    }, 500); // debounce: wait for file writes to settle
    configReloadTimer.unref();
  };
  // Captured (not fire-and-forget) so stop() can close it. A discarded
  // fs.watch keeps the event loop alive forever: `termcrab gateway` in a test
  // never exits, and every start/stop cycle leaks one watcher in production.
  let cfgFileWatcher: fs.FSWatcher | undefined;
  if (fs.existsSync(configFile)) {
    cfgFileWatcher = fs.watch(configFile, () => scheduleConfigReload());
    cfgFileWatcher.unref();
  }

  // ---- MCP servers (stdio JSON-RPC) ----
  const mcpClients = new Map<string, import('../providers/mcp.js').McpClient>();
  for (const mcpCfg of config.mcpServers ?? []) {
    try {
      const client = createMcpClient(mcpCfg);
      mcpClients.set(mcpCfg.name, client);
      log.info(`MCP server "${mcpCfg.name}" started (${mcpCfg.command})`);
    } catch (err) {
      log.warn(`MCP server "${mcpCfg.name}" failed to start: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 10.6: the budget is enforced before anything else runs, so a phone that
  // filled up while the gateway was down starts instead of failing to write.
  try {
    const trim = enforceDiskBudget(diskBudgetBytes(config), { keepDays: diskKeepDays(config) });
    if (trim.removed) {
      log.info(
        `disk budget: removed ${trim.removed} old file(s), freed ${Math.round(trim.freedBytes / 1024)} KB` +
          (trim.overBudget ? ' — still over budget, nothing trimmable left' : ''),
      );
    }
  } catch (err) {
    log.warn(`disk budget check failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  const agent: AgentCtx = { config, memory, skills, sessions, localProvider, queue: agentQueue, mcpClients };

  // The queue runs turns, one at a time per session. Every surface that submits
  // (web chat, webhooks, channels) gets the same lane, the same queue mode and
  // the same abort path — the panel's "N waiting" is this queue's real length.
  agentQueue.setMode(config.agent.queueMode || 'followup');
  agentQueue.setRunner(async (turn, signal) => {
    return await runTurn(agent, {
      // One identity per run: the id a script waits on (10.2) is the id the
      // trace, the turn poll and the SSE frames all carry.
      runId: turn.id,
      owner: turn.channel ?? 'gateway',
      sessionId: turn.sessionId,
      userMessage: turn.userMessage,
      channel: turn.channel,
      agent: turn.agent,
      tier: turn.tier,
      thinkingLevel: turn.thinkingLevel,
      signal,
      skipQueue: true,
      onEvent: (ev) => bus.emit(ev as unknown as BusEvent),
    });
  });

  // ---- Optional channels (Discord, Slack, Signal, SMS, Matrix) ----
  // Each one routes inbound text through the same handler as Telegram, so an
  // agent turn started from Discord behaves exactly like one from the panel.
  const onChannel = (channel: ChannelName) => async (
    userId: string | number,
    chatId: string | number,
    text: string,
    displayName: string,
  ): Promise<string> => handleChannelMessage(channel, chatId, text, userId, displayName);
  const discord = config.channels.discord
    ? new DiscordChannel({ cfg: config.channels.discord, onMessage: onChannel('discord') })
    : null;
  const slack = config.channels.slack
    ? new SlackChannel({ cfg: config.channels.slack, onMessage: onChannel('slack') })
    : null;
  const signal = config.channels.signal
    ? new SignalChannel({ cfg: config.channels.signal, onMessage: onChannel('signal') })
    : null;
  const sms = config.channels.sms
    ? new SmsChannel({ cfg: config.channels.sms, onMessage: onChannel('sms') })
    : null;
  const matrix = config.channels.matrix
    ? new MatrixChannel({ cfg: config.channels.matrix, onMessage: onChannel('matrix') })
    : null;
  if (discord) discord.start().catch((e) => log.warn('discord:', e instanceof Error ? e.message : String(e)));
  if (slack) slack.start().catch((e) => log.warn('slack:', e instanceof Error ? e.message : String(e)));
  if (signal) signal.start().catch((e) => log.warn('signal:', e instanceof Error ? e.message : String(e)));
  if (sms) sms.start().catch((e) => log.warn('sms:', e instanceof Error ? e.message : String(e)));
  if (matrix) matrix.start().catch((e) => log.warn('matrix:', e instanceof Error ? e.message : String(e)));

  // ---- Wake loop (voice or typed), visible to the panel over SSE ----
  const wake = new WakeService({
    onCommand: async (text: string) => {
      const reply = await runQueuedTurn(agent, {
        sessionId: 'wake:main',
        userMessage: text,
        channel: 'voice',
        onEvent: (ev) => bus.emit(ev as unknown as BusEvent),
      });
      return reply.trim();
    },
    speak: async (text: string) => {
      const r = await speak(text);
      if (!r.ok) log.debug('wake tts unavailable:', r.error ?? '');
    },
    emit: (ev) => bus.emit(ev as unknown as BusEvent),
  });

  // ---- Telegram (optional) ----
  let telegram: TelegramChannel | null = null;
  const tgCfg = config.channels.telegram;
  if (tgCfg?.token && tgCfg.allowedUserIds?.length) {
    const state = readTelegramState();
    telegram = new TelegramChannel({
      cfg: tgCfg,
      // 16.1–16.3: what arrives becomes something the agent can answer about —
      // a document is read, a voice note transcribed, a photo described.
      intake: makeIntake(config),
      getOffset: () => readTelegramState().offset,
      setOffset: (n) => writeTelegramState(n),
      onMessage: async (_userId, chatId, text, displayName) => {
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
        return handleChannelMessage('telegram', chatId, text, _userId, displayName);
      },
    });
    telegram.start();
    log.info('telegram channel started (allowlist:', tgCfg.allowedUserIds.join(', '), ')');
  } else if (tgCfg?.token) {
    log.warn('telegram token set but allowlist empty - channel NOT started (secure default). Run: termcrab config set channels.telegram.allowedUserIds [123]');
  }

  // ---- WhatsApp (optional Baileys extension; off unless enabled + allowlisted) ----
  let whatsapp: WhatsAppChannel | null = null;
  const waCfg = config.channels.whatsapp;
  if (waCfg?.enabled && waCfg.allowedJids?.length) {
    whatsapp = new WhatsAppChannel({
      cfg: waCfg,
      onMessage: async (userId, chatId, text, displayName) => handleChannelMessage('whatsapp', chatId, text, userId, displayName),
    });
    try {
      await whatsapp.start();
    } catch (err) {
      log.warn('whatsapp not started:', err instanceof Error ? err.message : err);
      whatsapp = null;
    }
  } else if (waCfg?.enabled) {
    log.warn(
      'whatsapp enabled but allowlist empty - channel NOT started. Set: termcrab config set channels.whatsapp.allowedJids ["<phone-number>"]',
    );
  }

  // conversations_* tools talk through these senders.
  if (telegram) {
    const tg = telegram;
    registerSender('telegram', async (address, text) => {
      await tg.send(Number(address), text);
    });
  }
  if (whatsapp) {
    const wa = whatsapp;
    registerSender('whatsapp', async (address, text) => {
      await wa.send(address, text);
    });
  }
  // 15.2: files the agent sends go out the same door as its replies.
  if (telegram) {
    const tg = telegram;
    registerDocumentSender('telegram', async (address, filePath, caption) => {
      await tg.sendDocument(Number(address), filePath, caption);
    });
  }
  if (discord) {
    const c = discord;
    registerSender('discord', async (address, text) => {
      await c.send(String(address), text);
    });
  }
  if (slack) {
    const c = slack;
    registerSender('slack', async (address, text) => {
      await c.send(String(address), text);
    });
  }
  if (signal) {
    const c = signal;
    registerSender('signal', async (address, text) => {
      await c.send(String(address), text);
    });
  }
  if (sms) {
    const c = sms;
    registerSender('sms', async (address, text) => {
      await c.send(String(address), text);
    });
  }
  if (matrix) {
    const c = matrix;
    registerSender('matrix', async (address, text) => {
      await c.send(String(address), text);
    });
  }

  /** Shared inbound handler for text channels (telegram/whatsapp). */
  async function handleChannelMessage(
    channel: ChannelName,
    chatId: string | number,
    text: string,
    userId: string | number,
    displayName: string,
  ): Promise<string> {
    recordInbound(channel, String(chatId), text);
    const baseSession = `${channel}:${chatId}`;

    if (text === '/new') {
      sessions.reset(baseSession);
      // also reset every agent-scoped variant of this chat
      for (const s of sessions.list()) {
        if (s.id.endsWith(`:${baseSession}`)) sessions.reset(s.id);
      }
      return '🧹 Session reset. Fresh start!';
    }
    if (text === '/agents') {
      const agents = listAgents();
      return agents.length
        ? `👥 Named agents:\n${agents.map((a) => `• @${a} <message>`).join('\n')}\nUsage: start your message with @name`
        : 'No named agents yet. Create workspace/agents/<name>/SOUL.md';
    }
    if (text === '/status') {
      // 21.3: the reset policy is part of "is everything running", because a
      // fresh-looking chat that silently keeps an old thread is worse than one
      // that says it will start over.
      const policy = policyLine(sessions, `${channel}:${chatId}`, config.agent.sessionReset);
      const runs = healthLine(runHealth({ queue: agentQueue, traces: listRuns() }));
      return `🦀 TermCrab online\nmodel: ${providerLabel(config)}\nexec: ${config.agent.allowExec ? 'on' : 'off'}\nagents: ${listAgents().join(', ') || '(default)'}\nheartbeat: ${config.heartbeat.enabled ? `every ${config.heartbeat.minutes}m` : 'off'}\n${runs}\n${policy}`;
    }
    // 15.4: the same facts the CLI reports with --json, available in the chat.
    if (text === '/help' || text === '/?') {
      return [
        '🦀 What I understand here:',
        '  /new        start a fresh conversation',
        '  /status     is everything running',
        '  /usage      tokens and cost today',
        '  /sessions   your recent conversations (/sessions search <words>, /sessions show <id>)',
        '  /memory     what I have remembered (search: /memory search <words>)',
        '  /context    what the model is actually sent (sizes per section)',
        '  /inbox      files people sent you (and /inbox <name> to read one)',
        '  /agents     named personalities (@name <message>)',
        '  /providers  pick the model',
        '  /heartbeat  run a self-check now',
        'Anything else is a message for the agent.',
      ].join('\n');
    }
    if (text === '/usage') {
      const day = usageForDay();
      if (!day.turns) return `📊 No turns metered today (${day.day}). Tokens show up as soon as a model reports them.`;
      const cost =
        typeof day.costUsd === 'number'
          ? `\n     cost ~$${day.costUsd.toFixed(4)}${config.provider.priceInPerM || config.provider.priceOutPerM ? '' : ' (from a dated price snapshot)'}`
          : '';
      return `📊 Today (${day.day}) — ${day.turns} turn(s), ${day.calls} model call(s)\n     tokens ${formatTokens(day.totalTokens)} (in ${formatTokens(day.promptTokens)} · out ${formatTokens(day.completionTokens)})${cost}`;
    }
    if (text === '/sessions' || text.startsWith('/sessions ')) {
      const arg = text.slice('/sessions'.length).trim();
      if (arg.startsWith('search ')) {
        const q = arg.slice('search '.length).trim();
        if (!q) return '💬 Usage: /sessions search <words>';
        const hits = searchSessions(q, { limit: 6 }, sessions);
        return hits.length ? `💬 Chats mentioning “${q}”:\n${formatSessionHits(q, hits)}` : `💬 No conversation mentions “${q}”.`;
      }
      if (arg.startsWith('show ')) {
        const id = arg.slice('show '.length).trim();
        if (!id) return '💬 Usage: /sessions show <id>';
        return formatSessionView(sessionView(id, { store: sessions, memory, resetPolicy: config.agent.sessionReset }));
      }
      const list = sessions.list().slice(0, 8);
      if (!list.length) return 'No conversations yet.';
      return (
        '💬 Recent conversations:\n' +
        list.map((c) => `  ${c.id} — ${c.messages} lines, ${Math.max(1, Math.round(c.bytes / 1024))} KB`).join('\n') +
        '\n(/sessions search <words> finds one, /sessions show <id> says what is in it)'
      );
    }
    if (text === '/memory' || text.startsWith('/memory ')) {
      const arg = text.slice('/memory'.length).trim();
      if (arg.startsWith('search ')) {
        const q = arg.slice('search '.length).trim();
        if (!q) return '🧠 Usage: /memory search <words>';
        const hits = await memory.searchDetailed(q, 6);
        if (!hits.length) return `🧠 Nothing in memory matches “${q}”.`;
        const lines = hits.map((h) => {
          const trust = h.origin && h.origin !== 'agent' ? ` [${h.origin}]` : '';
          const when = h.when ? ` (${h.when})` : '';
          return `  ${h.score.toFixed(2)}  ${h.file}${h.lineNo ? `:${h.lineNo}` : ''}${when}${trust}\n      ${h.snippet}`;
        });
        return `🧠 Memory matches for “${q}”:\n${lines.join('\n')}`;
      }
      if (arg.startsWith('user ')) {
        const line = arg.slice('user '.length).trim();
        return `👤 ${memory.rememberUser(line)}`;
      }
      const block = memory.readForPrompt(1200);
      const stats = memory.stats();
      const user = memory.readUser().trim();
      const head = `🧠 ${block.facts}/${block.totalFacts} facts injected, ${stats.dailyFiles} daily log(s)`;
      const userLine = user ? `\n\n👤 USER.md:\n${user.slice(0, 600)}` : '';
      const hint = '\n(/memory search <words> to look something up, /memory user <line> to teach me about you)';
      return block.text.trim()
        ? `${head}${userLine}\n\n${block.text.trim()}${hint}`
        : `${head}${userLine}\n(nothing remembered yet — tell me something worth keeping)${hint}`;
    }
    if (text === '/context') {
      const report = contextReport({
        config,
        memory,
        skills,
        sessionId: `${channel}:${chatId}`,
        channel,
        messages: toProviderMessages(sessions.readHot(`${channel}:${chatId}`, 400)),
        toolCount: 0,
      });
      return `📐 ${renderContext(report).split('\n').slice(1).join('\n').trim().slice(0, 3000)}`;
    }
    if (text === '/inbox' || text.startsWith('/inbox ')) {
      const name = text.slice('/inbox'.length).trim();
      if (name) {
        const read = readArrival(path.basename(name));
        return read.ok
          ? `📥 ${name}\n\n${read.text.length > 3000 ? `${read.text.slice(0, 3000)}\n… [truncated — ask for the rest by name]` : read.text}`
          : `📥 ${read.reason}`;
      }
      const entries = listInbox({ limit: 8 });
      const head = `📥 Inbox (${entries.length} shown)`;
      return `${head}\n${formatInbox(entries)}`;
    }
    if (channel === 'telegram' && text === '/heartbeat') {
      const res = await runHeartbeatOnce(agent);
      return res.ran ? `🫀 Heartbeat done (${res.reason}):\n\n${res.output}` : `🫀 Heartbeat skipped: ${res.reason}`;
    }

    // ---- v0.29.0: pick provider/model right from the chat ----
    const pickCmd = text.trim().match(/^\/(providers?|models?)(?:\s+([\s\S]+))?$/i);
    if (pickCmd) {
      const kind = pickCmd[1]!.toLowerCase().startsWith('prov') ? 'provider' : 'model';
      const arg = (pickCmd[2] || '').trim();
      if (kind === 'provider') return arg ? providerSelect(config, arg) : providerMenu(config);
      const fetched = await liveCatalog(config);
      return arg ? modelSelect(config, arg, fetched) : modelMenu(config, fetched);
    }

    // A group chat (or a misbehaving bot) should get one sentence, not a
    // queue full of turns (20.3).
    const chanBudget = channelLimiter.allow(`chan:${channel}:${chatId}`);
    if (!chanBudget.ok) {
      log.warn(`rate limited ${channel}:${chatId} (${Math.ceil(chanBudget.retryAfterMs / 1000)}s)`);
      return rateLimitHint(chanBudget.retryAfterMs);
    }
    const routed = parseAgentPrefix(text, listAgents());
    const result = await runQueuedTurn(agent, {
      sessionId: baseSession,
      userMessage: routed.text,
      channel,
      agent: routed.agent ?? undefined,
      onEvent: (ev) => bus.emit(ev as unknown as BusEvent),
    });
    void userId;
    void displayName;
    return result;
  }

  // ---- Outbox flush (offline tolerance) ----
  const outboxTimer = setInterval(() => {
    outboxSweep(); // forget replies that were delivered days ago
    if (telegram) {
      void telegram.flushOutbox().then((n) => {
        if (n > 0) log.info(`outbox: flushed ${n} telegram message(s)`);
      });
    }
    if (whatsapp) {
      void whatsapp.flushOutbox().then((n) => {
        if (n > 0) log.info(`outbox: flushed ${n} whatsapp message(s)`);
      });
    }
    for (const [name, ch] of [
      ['discord', discord],
      ['slack', slack],
      ['signal', signal],
      ['sms', sms],
      ['matrix', matrix],
    ] as const) {
      if (!ch) continue;
      void ch.flushOutbox().then((n) => {
        if (n > 0) log.info(`outbox: flushed ${n} ${name} message(s)`);
      });
    }
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
  const stopDream =
    config.dream?.enabled !== false ? startDreamScheduler(agent) : () => undefined;
  // One quiet update check at startup (opt-in via update.checkOnStart).
  if (config.update?.checkOnStart) {
    void checkForUpdate(version()).then((r) => {
      if (r.ok && r.updateAvailable) {
        log.info(`update available: v${r.latest} (you have v${r.current}) — use the Auto update button in the web Status screen`);
        bus.emit({ type: 'update', latest: r.latest, current: r.current, url: r.url });
      } else if (!r.ok) {
        log.debug('update check skipped:', r.error ?? '');
      }
    });
  }
  void notifyStatus(`online · ${providerLabel(config)} · port ${port}`);

  // ---- Background capability probe for the active model ----
  // If we haven't probed this (baseUrl, model, key) tuple yet, send a tiny
  // request in the background to learn which thinking levels the server
  // actually accepts. The chat UI reads the result via /api/config. Errors
  // are swallowed — heuristic detection is always the fallback.
  // The offline brain has no server to ask, and a phone with no key must not
  // send a packet to discover that — probing is for real providers only.
  if (config.provider.model && config.provider.type !== 'mock') {
    const baseUrl = config.provider.baseUrl || 'https://api.openai.com/v1';
    const already = getCachedCaps(baseUrl, config.provider.model, config.provider.apiKey);
    if (!already) {
      probeModel({
        baseUrl,
        model: config.provider.model,
        apiKey: config.provider.apiKey,
        fetchImpl: fetch,
      }).catch((e: unknown) => {
        log.warn('startup probe failed:', e instanceof Error ? e.message : String(e));
      });
    }
  }

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

      // Portal: reverse proxy to an exposed local server.
      if (pathname.startsWith('/portal/')) {
        const u = new URL(url, 'http://localhost');
        const rest = pathname.slice('/portal/'.length);
        const id = rest.split('/')[0] ?? '';
        const portal = getPortal(id);
        if (!portal) {
          json(res, 404, { error: `no portal: ${id}` });
          return;
        }
        u.searchParams.delete('token');
        const sub = rest.slice(id.length) || '/';
        const target = `http://127.0.0.1:${portal.port}${sub}${u.search}`;
        try {
          const method = req.method ?? 'GET';
          const hasBody = method !== 'GET' && method !== 'HEAD';
          const body = hasBody ? await readBody(req) : undefined;
          const fwd = await fetch(target, {
            method,
            headers: {
              'content-type': String(req.headers['content-type'] ?? 'application/octet-stream'),
            },
            body: hasBody ? (body ?? undefined) : undefined,
            redirect: 'manual',
            signal: AbortSignal.timeout(30_000),
          });
          res.writeHead(fwd.status, {
            'content-type': fwd.headers.get('content-type') ?? 'application/octet-stream',
          });
          res.end(Buffer.from(await fwd.arrayBuffer()));
        } catch (err) {
          json(res, 502, { error: 'portal upstream failed: ' + (err instanceof Error ? err.message : String(err)) });
        }
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

      // Tracing: list recent runs or get one by id
      if (pathname === '/api/traces' && req.method === 'GET') {
        const runs = listRuns();
        json(res, 200, { runs });
        return;
      }
      const traceMatch = pathname.match(/^\/api\/traces\/([^/]+)$/);
      if (traceMatch && req.method === 'GET') {
        const run = getRun(traceMatch[1]!);
        if (!run) {
          json(res, 404, { error: 'run not found' });
          return;
        }
        json(res, 200, run);
        return;
      }
      if (pathname === '/api/traces' && req.method === 'DELETE') {
        clearRuns();
        json(res, 200, { ok: true });
        return;
      }

      // Inbound webhooks: external services can POST to /api/hooks/:id
      const hookMatch = pathname.match(/^\/api\/hooks\/([^/]+)$/);
      if (hookMatch && req.method === 'POST') {
        const hookId = hookMatch[1]!;
        const hook = (config.hooks ?? []).find((h) => h.id === hookId);
        if (!hook) {
          json(res, 404, { error: 'hook not found' });
          return;
        }
        // Each hook carries its own secret; a webhook that anyone can POST to
        // is a remote agent trigger. Send it as `x-hook-token: <token>` or
        // `?token=<token>`.
        const hookToken =
          (typeof req.headers['x-hook-token'] === 'string' ? req.headers['x-hook-token'] : null) ||
          new URL(req.url || '/', 'http://localhost').searchParams.get('token');
        if (!hook.token || !hookToken || !constantTimeEqual(hookToken, hook.token)) {
          json(res, 401, {
            error: 'This webhook needs its own token: send x-hook-token: <token> (or ?token=<token>).',
          });
          return;
        }
        // A webhook loop is a runaway agent trigger, so it is limited too.
        const hookBudget = httpLimiter.allow(`hook:${hookId}`);
        if (!hookBudget.ok) {
          res.setHeader('retry-after', String(Math.ceil(hookBudget.retryAfterMs / 1000)));
          json(res, 429, { error: rateLimitHint(hookBudget.retryAfterMs), retryAfterMs: hookBudget.retryAfterMs });
          return;
        }
        // Read the webhook payload
        const raw = await readBody(req);
        const payload = raw ? JSON.parse(raw) : {};
        const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

        // Enqueue a turn with the webhook payload (queue modes and the
        // per-session lane apply here exactly as they do for the panel).
        let turn: QueuedTurn;
        try {
          turn = agentQueue.submit({
            sessionId: `hook:${hookId}`,
            userMessage: `[webhook:${hookId}] ${hook.prompt}\n\nPayload: ${payloadStr}`,
            channel: 'webhook',
          }).turn;
        } catch (err) {
          if (err instanceof QueueFullError) {
            json(res, 429, { error: err.message });
            return;
          }
          throw err;
        }

        json(res, 202, { ok: true, turnId: turn.id, hookId, status: turn.status });
        return;
      }

      /**
       * Pairing (20.1). Deliberately outside the token gate — the whole point
       * is that the phone does not have the token yet — and therefore guarded
       * by its own rule: a 5-minute single-use code that only the owner's
       * terminal can print, plus a rate limit so codes cannot be brute-forced.
       */
      if (req.method === 'POST' && pathname === '/api/pair') {
        const peer = req.socket?.remoteAddress ?? null;
        const budget = httpLimiter.allow(`pair:${peer ?? 'unknown'}`);
        if (!budget.ok) {
          res.setHeader('retry-after', String(Math.ceil(budget.retryAfterMs / 1000)));
          json(res, 429, { error: rateLimitHint(budget.retryAfterMs), retryAfterMs: budget.retryAfterMs });
          return;
        }
        const raw = await readBody(req);
        let body: unknown = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          json(res, 400, { error: 'body must be valid JSON', field: 'body' });
          return;
        }
        const parsed = parsePairRequest(body);
        if (!parsed.ok) {
          json(res, 400, { error: parsed.error, field: parsed.field });
          return;
        }
        const redeemed = redeemCode(parsed.value.code, parsed.value.name, { ip: peer });
        if (!redeemed.ok) {
          const why =
            redeemed.reason === 'expired'
              ? 'That pairing code has expired — run `termcrab pair` again for a fresh one.'
              : 'Unknown pairing code — codes are single use, so check for a typo or print a new one with `termcrab pair`.';
          json(res, 401, { ok: false, error: why, reason: redeemed.reason });
          return;
        }
        log.info(`paired device ${redeemed.device.name} (${redeemed.device.id}) from ${peer ?? 'unknown'}`);
        json(res, 200, {
          ok: true,
          v: WIRE_VERSION,
          device: { id: redeemed.device.id, name: redeemed.device.name },
          token: redeemed.token,
          note: 'Store this token now — it is shown once and kept only as a hash.',
        });
        return;
      }

      // Everything else under /api requires the panel token — but only when one
      // is configured. An empty token (the default) means loopback-only, which
      // the bind guard at the top of this function enforces.
      if (pathname.startsWith('/api/')) {
        const presented = extractAuth(req);
        const peer = req.socket?.remoteAddress ?? null;
        const auth = authenticate(config, presented, { ip: peer });
        if (!auth.ok) {
          res.setHeader('www-authenticate', 'Bearer realm="TermCrab"');
          json(res, 401, {
            error: 'Panel password needed. Send Authorization: Bearer <gateway.token>, or open the panel and paste it.',
          });
          return;
        }
      /**
       * The devices this gateway trusts (20.1). `current: true` marks the row
       * whose token made this request, so `termcrab devices` can answer "which
       * of these is this phone?".
       */
      if (req.method === 'GET' && pathname === '/api/devices') {
        const rows = listDevices().map((d) => ({
          ...d,
          tokenHash: undefined,
          current: auth.ok && auth.kind === 'device' ? auth.device.id === d.id : false,
        }));
        json(res, 200, { ok: true, v: WIRE_VERSION, count: rows.length, devices: rows });
        return;
      }
      if (req.method === 'POST' && pathname === '/api/devices/revoke') {
        const raw = await readBody(req);
        let body: { id?: string; name?: string } = {};
        try {
          body = raw ? (JSON.parse(raw) as { id?: string; name?: string }) : {};
        } catch {
          json(res, 400, { error: 'body must be valid JSON', field: 'body' });
          return;
        }
        const wanted = (body.id || body.name || '').trim();
        if (!wanted) {
          json(res, 400, { error: 'id or name required', field: 'id' });
          return;
        }
        const gone = revokeDevice(wanted);
        if (!gone) {
          json(res, 404, { error: `no device ${wanted}` });
          return;
        }
        log.info(`revoked device ${gone.name} (${gone.id})`);
        json(res, 200, { ok: true, revoked: { id: gone.id, name: gone.name } });
        return;
      }

      // Work tracker: the panel renders WORKLOG.md so "what is being built right
      // now" lives on the same screen you test from. It also reports whether the
      // file still points at HEAD, so a stale tracker is visible, not silent.
      if (req.method === 'GET' && pathname === '/api/worklog') {
        const file = path.join(PACKAGE_ROOT, 'WORKLOG.md');
        if (!fs.existsSync(file)) {
          json(res, 404, { error: 'no WORKLOG.md in this install' });
          return;
        }
        const markdown = fs.readFileSync(file, 'utf8');
        let head = '';
        let lastTouched = '';
        let behind = 0;
        try {
          const { execFileSync } = await import('node:child_process');
          const git = (args: string[]) =>
            execFileSync('git', args, { cwd: PACKAGE_ROOT, encoding: 'utf8' }).trim();
          head = git(['rev-parse', '--short', 'HEAD']);
          lastTouched = git(['log', '-1', '--format=%h', '--', 'WORKLOG.md']);
          // Commits after the one that last touched the tracker = the tracker is behind.
          if (lastTouched) behind = Number(git(['rev-list', '--count', `${lastTouched}..HEAD`])) || 0;
        } catch {
          // installed copy without git: freshness is unknowable, not false
          behind = 0;
        }
        json(res, 200, {
          markdown,
          head,
          lastTouched,
          behind,
          fresh: behind === 0,
        });
        return;
      }

        if (req.method === 'GET' && pathname === '/api/events') {
          res.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          });
          res.write(': connected\n\n');
          // Every frame carries the wire version and a sequence number, and
          // its type is a safe token, so a client can say "I speak v1" and
          // notice a gap instead of guessing (20.2).
          const unsubscribe = bus.subscribe((ev) => {
            const frame = wrapEvent(ev as Record<string, unknown>);
            res.write(`event: ${frame.type}\ndata: ${JSON.stringify(frame)}\n\n`);
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
          let body: unknown = {};
          try {
            body = raw ? JSON.parse(raw) : {};
          } catch {
            json(res, 400, { error: 'body must be valid JSON', field: 'body' });
            return;
          }
          const idemHeader = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : null;
          const parsed = parseChatRequest(body, idemHeader);
          if (!parsed.ok) {
            json(res, 400, { error: parsed.error, field: parsed.field });
            return;
          }
          // A retried submission (phone network dropped the answer) must not
          // run the turn twice: the same key returns the same run (20.2).
          if (parsed.value.idempotencyKey) {
            const seen = recallIdempotent(parsed.value.idempotencyKey);
            if (seen) {
              json(res, 200, { ...(seen as Record<string, unknown>), replayed: true });
              return;
            }
          }
          const limitKey = `chat:${authKey(auth, presented, peer)}`;
          const budget = httpLimiter.allow(limitKey);
          if (!budget.ok) {
            res.setHeader('retry-after', String(Math.ceil(budget.retryAfterMs / 1000)));
            json(res, 429, {
              error: rateLimitHint(budget.retryAfterMs),
              retryAfterMs: budget.retryAfterMs,
              limit: httpLimiter.config,
            });
            return;
          }
          const message = parsed.value.message;
          const sessionId = parsed.value.sessionId;
          const agentName = parsed.value.agent ? sanitizeAgentName(parsed.value.agent) ?? undefined : undefined;
          // Only the six known levels; anything else is treated as "auto" so a
          // stray value can never reach a provider request.
          const thinkingLevel = normalizeThinkingLevel(parsed.value.thinkingLevel);

          // Submit through the queue: it serializes turns per session, applies
          // the configured queue mode (followup / steer / collect / interrupt)
          // and refuses a runaway backlog instead of growing without bound.
          let submitted: { turn: QueuedTurn; steered: boolean };
          try {
            submitted = agentQueue.submit({
              sessionId,
              userMessage: message,
              channel: 'web',
              agent: agentName,
              thinkingLevel,
            });
          } catch (err) {
            if (err instanceof QueueFullError) {
              json(res, 429, { error: err.message });
              return;
            }
            throw err;
          }

          const accepted = {
            turnId: submitted.turn.id,
            sessionId: agentName ? `${agentName}:${sessionId}` : sessionId,
            // 'queued' means "accepted, poll the turn"; 'steering' means the
            // message joined the running turn (same turnId).
            status: submitted.steered ? 'steering' : 'queued',
          };
          if (parsed.value.idempotencyKey) rememberIdempotent(parsed.value.idempotencyKey, accepted);
          json(res, 202, accepted);
          return;
        }

        // Poll turn status
        const turnMatch = pathname.match(/^\/api\/chat\/([^/]+)\/([^/]+)$/);
        if (turnMatch && req.method === 'GET') {
          const sid = decodeURIComponent(turnMatch[1]!);
          const turnId = turnMatch[2]!;
          const turn = agentQueue.getTurn(sid, turnId);
          if (!turn) {
            json(res, 404, { error: 'turn not found' });
            return;
          }
          json(res, 200, {
            turnId: turn.id,
            sessionId: sid,
            status: turn.status,
            output: turn.output,
            error: turn.error,
            queueLength: agentQueue.getQueueLength(sid),
          });
          return;
        }

        /**
         * A run, by id, whatever surface started it (10.2). The queue knows the
         * turn (status, output, error); the trace knows the numbers (tokens,
         * duration). Both share one id.
         */
        const runMatch = pathname.match(/^\/api\/runs\/([^/]+)$/);
        if (runMatch && req.method === 'GET') {
          const runId = decodeURIComponent(runMatch[1]!);
          const turn = agentQueue.getTurn('', runId);
          const trace = getRun(runId);
          if (!turn && !trace) {
            json(res, 404, { error: `no run ${runId}` });
            return;
          }
          json(res, 200, {
            runId,
            sessionId: turn?.sessionId ?? trace?.sessionId ?? null,
            status: turn?.status ?? trace?.status ?? 'running',
            output: turn?.output ?? null,
            error: turn?.error ?? trace?.error ?? null,
            startedAt: turn?.startedAt ?? trace?.start ?? null,
            enqueuedAt: turn?.enqueuedAt ?? null,
            durationMs: trace?.durationMs ?? null,
            tokensIn: trace?.tokensIn ?? null,
            tokensOut: trace?.tokensOut ?? null,
          });
          return;
        }

        /**
       * What is running, and is any of it stuck (23.1). The panel and
       * `termcrab runs` read this; the verdicts and the suggestions are
       * computed in src/agent/run-health.ts so both surfaces say the same
       * sentence.
       */
      if (req.method === 'GET' && pathname === '/api/runs/health') {
        const health = runHealth({ queue: agentQueue, traces: listRuns() });
        json(res, 200, { ok: true, v: WIRE_VERSION, count: health.length, runs: health });
        return;
      }

      /** Stop every running turn, or one session's (10.3). */
        if (req.method === 'POST' && pathname === '/api/stop') {
          const body = await readJsonBody(req);
          const only = typeof body?.sessionId === 'string' ? body.sessionId : '';
          let stopped: { sessionId: string; turnId: string }[];
          if (only) {
            const running = agentQueue.getRunning(only);
            stopped = running && agentQueue.interrupt(only) ? [{ sessionId: only, turnId: running.id }] : [];
          } else {
            stopped = agentQueue.stopAll();
          }
          for (const s of stopped) {
            bus.emit({ type: 'stop', sessionId: s.sessionId, turnId: s.turnId } as unknown as BusEvent);
          }
          json(res, 200, {
            ok: true,
            count: stopped.length,
            stopped: stopped.map((s) => s.turnId),
            sessions: stopped.map((s) => s.sessionId),
          });
          return;
        }

        // Interrupt a running turn
        const interruptMatch = pathname.match(/^\/api\/chat\/([^/]+)\/interrupt$/);
        if (interruptMatch && req.method === 'POST') {
          const sid = decodeURIComponent(interruptMatch[1]!);
          const interrupted = agentQueue.interrupt(sid);
          json(res, 200, { ok: interrupted, sessionId: sid });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/agents') {
          json(res, 200, { agents: listAgents() });
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

        // Replay a session: re-execute user messages with full tool trace
        const replayMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/replay$/);
        if (replayMatch && req.method === 'POST') {
          const id = decodeURIComponent(replayMatch[1]!);
          const entries = sessions.read(id);
          if (!entries.length) {
            json(res, 404, { error: 'no chat found with that id' });
            return;
          }
          const newId = `replayed:${id}`;
          const newEntries = entries.filter((e) => e.role === 'user');
          // Create new session file with user messages
          const newFile = path.join(sessionsDir(), `${newId}.jsonl`);
          fs.writeFileSync(newFile, newEntries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
          json(res, 200, { ok: true, originalId: id, replayedId: newId, userMessages: newEntries.length });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/sessions/purge') {
          const body = await readJsonBody(req);
          const days = Number(body?.olderThanDays ?? 30);
          if (!Number.isFinite(days) || days < 0) {
            json(res, 400, { error: 'olderThanDays must be a number of days (e.g. 30)' });
            return;
          }
          json(res, 200, sessions.purgeOlderThan(days));
          return;
        }

        const sessionExport = pathname.match(/^\/api\/sessions\/([^/]+)\/export$/);
        if (sessionExport && req.method === 'GET') {
          const id = decodeURIComponent(sessionExport[1]!);
          const md = sessions.exportMarkdown(id);
          if (md === null) {
            json(res, 404, { error: 'no chat found with that id' });
            return;
          }
          json(res, 200, { id, markdown: md });
          return;
        }

        const sessionRename = pathname.match(/^\/api\/sessions\/([^/]+)\/rename$/);
        if (sessionRename && req.method === 'POST') {
          const id = decodeURIComponent(sessionRename[1]!);
          const body = await readJsonBody(req);
          const to = typeof body?.to === 'string' ? body.to.trim() : '';
          if (!to) {
            json(res, 400, { error: 'new name required (to=<id>)' });
            return;
          }
          const r = sessions.rename(id, to);
          if (r === 'ok') json(res, 200, { ok: true, id: to });
          else if (r === 'not-found') json(res, 404, { error: 'no chat found with that id' });
          else if (r === 'exists') json(res, 409, { error: 'a chat with the new name already exists' });
          else json(res, 400, { error: 'new name may only contain letters, digits, - _ . :' });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/dreams') {
          json(res, 200, dreamHistory());
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
          const output = await runQueuedTurn(agent, {
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

        if (req.method === 'GET' && pathname === '/api/logs') {
          const lines = Math.min(Number(new URL(req.url!, 'http://x').searchParams.get('lines')) || 200, 2000);
          const level = new URL(req.url!, 'http://x').searchParams.get('level') || '';
          const logPath = path.join(logsDir(), 'gateway.log');
          try {
            const content = fs.readFileSync(logPath, 'utf8');
            const all = content.split('\n').filter(Boolean);
            const filtered = level
              ? all.filter((l) => l.includes(level.toUpperCase()))
              : all;
            const tail = filtered.slice(-lines);
            json(res, 200, { lines: tail, total: filtered.length });
          } catch {
            json(res, 200, { lines: [], total: 0 });
          }
          return;
        }

        if (req.method === 'GET' && pathname === '/api/approvals') {
          // ?all=1 includes the decided history (used by tests and debugging).
          const all = new URL(req.url!, 'http://x').searchParams.get('all') === '1';
          json(res, 200, { approvals: listApprovals(all) });
          return;
        }

        const approvalMatch = pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|deny)$/);
        if (approvalMatch && req.method === 'POST') {
          const id = decodeURIComponent(approvalMatch[1]!);
          const approve = approvalMatch[2] === 'approve';
          // Who answered: the browser panel sends no body, the CLI sends `by`.
          let by = 'panel';
          try {
            const body = (await readJsonBody(req)) as { by?: unknown } | null;
            if (typeof body?.by === 'string' && body.by.trim()) by = body.by.trim().slice(0, 32);
          } catch {
            /* no body at all is the normal panel path */
          }
          const ok = resolveApproval(id, approve, by);
          const decision = approve ? 'approved' : 'denied';
          const payload = { ok, id, decision, by } as { ok: boolean; id: string; decision: string; by: string; error?: string };
          if (!ok) payload.error = 'no such pending approval';
          json(res, ok ? 200 : 404, payload);
          return;
        }

        if (req.method === 'GET' && pathname === '/api/skills') {
          json(res, 200, { skills: skills.list() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/skills/create') {
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { name?: string; content?: string }) : {};
          try {
            const name = (body.name || '').trim();
            if (!name) { json(res, 400, { error: 'name required' }); return; }
            const content = body.content || '# ' + name + '\n\nDescribe what this skill does.\n';
            const skill = skills.create(name, content);
            json(res, 200, { skill });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        if (req.method === 'PUT' && pathname.startsWith('/api/skills/')) {
          const name = decodeURIComponent(pathname.slice('/api/skills/'.length));
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { content?: string }) : {};
          try {
            const skill = skills.update(name, body.content || '');
            json(res, 200, { skill });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        if (req.method === 'DELETE' && pathname.startsWith('/api/skills/')) {
          const name = decodeURIComponent(pathname.slice('/api/skills/'.length));
          const ok = skills.remove(name);
          json(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/slash') {
          json(res, 200, {
            commands: [
              { name: '/new', description: 'Start a new chat', args: '' },
              { name: '/clear', description: 'Clear the current chat', args: '' },
              { name: '/model', description: 'Pick a model', args: '[model-name]' },
              { name: '/status', description: 'Show agent status', args: '' },
              { name: '/help', description: 'Show available commands', args: '' },
            ],
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/slash') {
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { command?: string; args?: string }) : {};
          const cmd = (body.command || '').trim();
          const args = (body.args || '').trim();
          switch (cmd) {
            case '/new':
              json(res, 200, { ok: true, action: 'new' });
              return;
            case '/clear':
              json(res, 200, { ok: true, action: 'clear' });
              return;
            case '/model':
              json(res, 200, { ok: true, action: 'model', model: args });
              return;
            case '/status':
              json(res, 200, { ok: true, action: 'status' });
              return;
            case '/help':
              json(res, 200, { ok: true, action: 'help' });
              return;
            default:
              json(res, 400, { error: 'unknown command: ' + cmd });
              return;
          }
        }

        if (req.method === 'GET' && pathname === '/api/providers/detect') {
          // Look for well-known OpenAI-compatible API keys in the environment.
          // (All supported providers speak the same /v1/chat/completions format.)
          const detected: { type: 'openai'; key: string; baseUrl?: string; label?: string }[] = [];
          const env = process.env;
          if (env.OPENAI_API_KEY) detected.push({ type: 'openai', key: env.OPENAI_API_KEY.slice(0, 8) + '…' });
          if (env.GROQ_API_KEY) detected.push({ type: 'openai', key: env.GROQ_API_KEY.slice(0, 8) + '…', baseUrl: 'https://api.groq.com/openai/v1', label: 'Groq' });
          if (env.DEEPSEEK_API_KEY) detected.push({ type: 'openai', key: env.DEEPSEEK_API_KEY.slice(0, 8) + '…', baseUrl: 'https://api.deepseek.com/v1', label: 'DeepSeek' });
          if (env.OPENROUTER_API_KEY) detected.push({ type: 'openai', key: env.OPENROUTER_API_KEY.slice(0, 8) + '…', baseUrl: 'https://openrouter.ai/api/v1', label: 'OpenRouter' });
          if (env.XAI_API_KEY) detected.push({ type: 'openai', key: env.XAI_API_KEY.slice(0, 8) + '…', baseUrl: 'https://api.x.ai/v1', label: 'xAI' });
          if (env.MISTRAL_API_KEY) detected.push({ type: 'openai', key: env.MISTRAL_API_KEY.slice(0, 8) + '…', baseUrl: 'https://api.mistral.ai/v1', label: 'Mistral' });
          json(res, 200, { detected });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/tools') {
          const defs = (await buildTools({ config, memory, skills })).map((t) => ({
            name: t.def.name,
            description: t.def.description,
          }));
          json(res, 200, { tools: defs });
          return;
        }

        // Canvas / A2UI: live widgets pushed by the `canvas` tool.
        // The registry lives in-process; SSE carries live updates, this hydrates
        // a freshly loaded page.
        if (req.method === 'GET' && pathname === '/api/canvas') {
          json(res, 200, { widgets: canvasList() });
          return;
        }
        if (req.method === 'DELETE' && pathname.startsWith('/api/canvas/')) {
          const id = decodeURIComponent(pathname.slice('/api/canvas/'.length));
          const ok = canvasRemove(id);
          json(res, ok ? 200 : 404, ok ? { ok: true } : { error: `no canvas widget: ${id}` });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/tasks') {
          json(res, 200, { suggestions: listSuggestions('pending') });
          return;
        }
        if (req.method === 'DELETE' && pathname.startsWith('/api/tasks/')) {
          const ok = dismiss(pathname.slice('/api/tasks/'.length));
          json(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'not found' });
          return;
        }
        if (req.method === 'GET' && pathname === '/api/ask') {
          json(res, 200, { pending: listAsks() });
          return;
        }
        if (req.method === 'POST' && pathname.startsWith('/api/ask/')) {
          const rest = pathname.slice('/api/ask/'.length);
          if (!rest.endsWith('/answer')) {
            json(res, 404, { error: 'not found' });
            return;
          }
          const id = rest.slice(0, -'/answer'.length);
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { answer?: string }) : {};
          const ok = answerAsk(id, String(body.answer ?? ''));
          json(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'no such pending ask' });
          return;
        }
        if (req.method === 'GET' && pathname === '/api/progress') {
          const sid = new URL(url, 'http://localhost').searchParams.get('session') ?? '';
          json(res, 200, { card: getProgress(sid) });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/memory') {
          json(res, 200, {
            head: memory.readHead(8000),
            content: memory.readHead(500_000),
            stats: memory.stats(),
            index: memory.indexStats(),
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/dream') {
          // Fire-and-forget: consolidation runs in the background; progress streams on SSE.
          void runDream(agent, { force: true })
            .then((r) => log.info('dream:', JSON.stringify(r)))
            .catch((e: unknown) => log.warn('dream failed:', String(e)));
          json(res, 202, { ok: true, scheduled: true });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/heartbeat') {
          const result = await runHeartbeatOnce(agent, notify);
          json(res, 200, result);
          return;
        }

        // ---- Web control parity (v0.5 P0 #0): everything the CLI can do ----

        if (req.method === 'GET' && pathname === '/api/setup') {
          // Setup is needed when there is no config file at all, OR no primary
          // api key AND no saved providers. (Local Ollama-style endpoints with
          // no key work fine: apiKey can be empty if baseUrl points to a
          // trusted local host.)
          const hasSavedProvider = config.providers.some((p) => p.keys.length > 0);
          const hasKey = Boolean(config.provider.apiKey);
          const isLocal = (() => {
            try {
              const u = new URL(config.provider.baseUrl || '');
              return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '::1';
            } catch { return false; }
          })();
          const setupNeeded = !configExists() || !(hasKey || hasSavedProvider || isLocal);
          json(res, 200, {
            setupNeeded,
            providerType: config.provider.type,
            hasKey,
            version: version(),
          });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/config') {
          // The chat UI reads this to label its model button and to render the
          // thinking level picker. Prefer a *verified* capability record (from
          // src/providers/probe.js, populated by /api/probe or the startup
          // background probe); fall back to heuristic detection by model id.
          const heuristic = getModelCapabilities(config.provider.model || '', config.provider.type);
          const verified = getCachedCaps(
            config.provider.baseUrl || 'https://api.openai.com/v1',
            config.provider.model || '',
            config.provider.apiKey,
          );
          const caps = verified ?? heuristic;
          json(res, 200, {
            config: redactConfig(config),
            path: configPath(),
            // A refused edit is never applied, but it is never silent either.
            configProblems: configProblems(),
            thinking: {
              model: config.provider.model || '',
              supportsThinking: caps.supportsThinking,
              supportedLevels: caps.supportedLevels,
              defaultLevel: caps.defaultLevel,
              probed: Boolean(verified),
              probedAt: verified?.probedAt || null,
              rejectReason: verified?.rejectReason || null,
            },
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/config') {
          const body = await readJsonBody(req);
          const key = body?.key;
          const value = body?.value;
          if (typeof key !== 'string' || !/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(key) || typeof value !== 'string') {
            json(res, 400, { error: 'key (dotted path) and string value required' });
            return;
          }
          if (value.includes('•••')) {
            // Masked secret left untouched in the form — keep the stored value.
            json(res, 200, { ok: true, unchanged: true, config: redactConfig(config) });
            return;
          }
          if (value.length > 100_000) {
            json(res, 400, { error: 'value too long' });
            return;
          }
          applyConfigSet(config, key, value);
          log.info(`config set via UI: ${key}`);
          if (key === 'gateway.token' && !value && !isLoopback) {
            log.warn(
              `panel password removed while reachable from the network (${host}) - anyone on this network can use it. Set one: termcrab config set gateway.token generate`,
            );
          }
          json(res, 200, { ok: true, config: redactConfig(config) });
          return;
        }

        // ---- Thinking capability probes ----
        // GET  /api/probe           → return cached caps for current model
        // POST /api/probe           → re-probe the current model
        // POST /api/probe/all       → probe every saved model (active + providers[].models)
        if (pathname === '/api/probe' && req.method === 'GET') {
          const baseUrl = config.provider.baseUrl || 'https://api.openai.com/v1';
          const heuristic = getModelCapabilities(config.provider.model || '', 'openai');
          const cached = getCachedCaps(baseUrl, config.provider.model || '', config.provider.apiKey);
          json(res, 200, {
            model: config.provider.model || '',
            baseUrl,
            thinking: cached ?? {
              ...heuristic,
              probed: false,
              probedAt: null,
              rejectReason: null,
            },
          });
          return;
        }
        if (pathname === '/api/probe' && req.method === 'POST') {
          if (!config.provider.model) { json(res, 400, { error: 'no model configured' }); return; }
          const baseUrl = config.provider.baseUrl || 'https://api.openai.com/v1';
          try {
            const result = await probeModel({
              baseUrl,
              model: config.provider.model,
              apiKey: config.provider.apiKey,
              fetchImpl: fetch,
              force: true,
            });
            bus.emit({ type: 'thinkingCaps', model: config.provider.model, caps: result });
            json(res, 200, { ok: true, model: config.provider.model, thinking: result });
          } catch (e) {
            json(res, 502, { error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }
        if (pathname === '/api/probe/all' && req.method === 'POST') {
          const targets: { baseUrl: string; model: string; apiKey?: string }[] = [];
          if (config.provider.model) {
            targets.push({
              baseUrl: config.provider.baseUrl || 'https://api.openai.com/v1',
              model: config.provider.model,
              apiKey: config.provider.apiKey,
            });
          }
          for (const p of config.providers) {
            for (const m of p.models || []) {
              const k = p.keys[0]?.key;
              targets.push({ baseUrl: p.baseUrl, model: m, apiKey: k });
            }
          }
          // De-duplicate
          const seen = new Set<string>();
          const uniq = targets.filter((t) => {
            const k = modelCapsKey(t.baseUrl, t.model, t.apiKey);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          const results = await probeModels(uniq, { fetchImpl: fetch, force: true, concurrency: 2 });
          json(res, 200, { ok: true, count: uniq.length, results });
          return;
        }

        // ---- Providers: saved OpenAI-compatible endpoints + API keys ----
        if (pathname === '/api/providers' && req.method === 'GET') {
          json(res, 200, providersListView(config));
          return;
        }
        if (pathname === '/api/providers' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const name = typeof body?.name === 'string' ? body.name.trim() : '';
          const baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl.trim().replace(/\/+$/, '') : '';
          if (!name || name.length > 40) {
            json(res, 400, { error: 'a name is required (1-40 characters)' });
            return;
          }
          if (!validHttpUrl(baseUrl)) {
            json(res, 400, { error: 'base url must be a full http(s) address, e.g. https://api.openai.com/v1' });
            return;
          }
          const created: ProviderEntry = {
            id: 'prov_' + randomUUID().replace(/-/g, '').slice(0, 12),
            name,
            baseUrl,
            keys: [],
            models: [],
            created: Math.floor(Date.now() / 1000),
          };
          config.providers.push(created);
          saveConfig(config);
          log.info(`providers: added "${created.name}" (${created.baseUrl})`);
          json(res, 200, { provider: providerView(created) });
          return;
        }

        const provOne = pathname.match(/^\/api\/providers\/([^/]+)$/);
        if (provOne && req.method === 'GET') {
          const p = config.providers.find((x) => x.id === provOne[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const activeKey = config.provider.apiKey || '';
          json(res, 200, { provider: { ...providerView(p), keys: p.keys.map((k) => keyView(k, activeKey)), models: (p.models || []).slice() } });
          return;
        }
        if (provOne && req.method === 'DELETE') {
          const idx = config.providers.findIndex((x) => x.id === provOne[1]);
          if (idx === -1) { json(res, 404, { error: 'provider not found' }); return; }
          const [gone] = config.providers.splice(idx, 1);
          saveConfig(config);
          log.info(`providers: removed "${gone?.name}"`);
          json(res, 200, { ok: true });
          return;
        }

        const provKeys = pathname.match(/^\/api\/providers\/([^/]+)\/keys$/);
        if (provKeys && req.method === 'POST') {
          const p = config.providers.find((x) => x.id === provKeys[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const body = await readJsonBody(req);
          const name = typeof body?.name === 'string' ? body.name.trim() : '';
          const key = typeof body?.key === 'string' ? body.key.trim() : '';
          if (!name || name.length > 40) { json(res, 400, { error: 'a key name is required (1-40 characters)' }); return; }
          if (!key || key.length > 512) { json(res, 400, { error: 'the API key itself is required' }); return; }
          const entry = { id: 'key_' + randomUUID().replace(/-/g, '').slice(0, 12), name, key, created: Math.floor(Date.now() / 1000) };
          p.keys.push(entry);
          saveConfig(config);
          log.info(`providers: added key "${name}" to "${p.name}"`);
          json(res, 200, { key: keyView(entry, config.provider.apiKey || '') });
          return;
        }

        const provKeyDel = pathname.match(/^\/api\/providers\/([^/]+)\/keys\/([^/]+)$/);
        if (provKeyDel && req.method === 'DELETE') {
          const p = config.providers.find((x) => x.id === provKeyDel[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const idx = p.keys.findIndex((k) => k.id === provKeyDel[2]);
          if (idx === -1) { json(res, 404, { error: 'key not found' }); return; }
          p.keys.splice(idx, 1);
          saveConfig(config);
          json(res, 200, { ok: true });
          return;
        }

        const provUse = pathname.match(/^\/api\/providers\/([^/]+)\/keys\/([^/]+)\/use$/);
        if (provUse && req.method === 'POST') {
          const p = config.providers.find((x) => x.id === provUse[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const k = p.keys.find((x) => x.id === provUse[2]);
          if (!k) { json(res, 404, { error: 'key not found' }); return; }
          const model = config.provider.type === 'openai' && config.provider.model
            ? config.provider.model
            : (DEFAULT_MODEL_HINTS.openai || config.provider.model);
          config.provider = { ...config.provider, type: 'openai', baseUrl: p.baseUrl, apiKey: k.key, model };
          saveConfig(config);
          log.info(`providers: now using "${p.name}" with key "${k.name}"`);
          json(res, 200, { ok: true, using: { provider: p.name, baseUrl: p.baseUrl, key: k.name } });
          return;
        }

        // ---- Models: fetch a provider's catalog, tick to register, switch live ----
        const provModels = pathname.match(/^\/api\/providers\/([^/]+)\/models$/);
        if (provModels && req.method === 'GET') {
          const p = config.providers.find((x) => x.id === provModels[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const key = providerOutboundKey(p, config);
          if (!key) { json(res, 400, { error: 'add an API key to this provider first (open it and press +)' }); return; }
          try {
            const models = await fetchProviderModels(p, key);
            json(res, 200, { models });
          } catch (e) {
            json(res, 502, { error: e instanceof Error ? e.message : String(e) });
          }
          return;
        }
        if (provModels && req.method === 'POST') {
          const p = config.providers.find((x) => x.id === provModels[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const body = await readJsonBody(req);
          const model = typeof body?.model === 'string' ? body.model.trim() : '';
          if (!model || model.length > 200) { json(res, 400, { error: 'a model id is required' }); return; }
          p.models ||= [];
          if (!p.models.includes(model)) {
            p.models.push(model);
            p.models.sort();
            saveConfig(config);
            log.info(`models: saved "${model}" from "${p.name}"`);
          }
          json(res, 200, { ok: true, models: p.models });
          return;
        }
        const provModelDel = pathname.match(/^\/api\/providers\/([^/]+)\/models\/(.+)$/);
        if (provModelDel && req.method === 'DELETE') {
          const p = config.providers.find((x) => x.id === provModelDel[1]);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          const model = decodeURIComponent(provModelDel[2] || '');
          p.models ||= [];
          const idx = p.models.indexOf(model);
          if (idx === -1) { json(res, 404, { error: 'model is not registered on this provider' }); return; }
          p.models.splice(idx, 1);
          saveConfig(config);
          json(res, 200, { ok: true, models: p.models });
          return;
        }

        if (pathname === '/api/models/use' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const providerId = typeof body?.providerId === 'string' ? body.providerId : '';
          const model = typeof body?.model === 'string' ? body.model.trim() : '';
          const p = config.providers.find((x) => x.id === providerId);
          if (!p) { json(res, 404, { error: 'provider not found' }); return; }
          p.models ||= [];
          if (!model || !p.models.includes(model)) {
            json(res, 400, { error: 'pick a model that is saved on this provider' });
            return;
          }
          const key = providerOutboundKey(p, config);
          if (!key && activeBaseUrl(config.provider) !== p.baseUrl) {
            json(res, 400, { error: 'add an API key to this provider first' });
            return;
          }
          config.provider = {
            ...config.provider,
            type: 'openai',
            baseUrl: p.baseUrl,
            apiKey: key || config.provider.apiKey || '',
            model,
          };
          saveConfig(config);
          log.info(`models: now chatting with "${p.name}" / "${model}"`);
          json(res, 200, { ok: true, using: { provider: p.name, baseUrl: p.baseUrl, model } });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/doctor') {
          const checks = await runDoctor();
          json(res, 200, { checks });
          return;
        }

        // Token meter for the day (and any past day by ?day=YYYY-MM-DD).
        // Measured, never modelled: an empty day is all zeros, and a model
        // nobody priced comes back with no costUsd at all.
        if (req.method === 'GET' && pathname === '/api/usage') {
          const raw = new URL(req.url || '/', 'http://localhost').searchParams.get('day');
          let when = new Date();
          if (raw) {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
            if (!m) {
              json(res, 400, { error: 'day must look like YYYY-MM-DD' });
              return;
            }
            when = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
          }
          json(res, 200, {
            ...usageForDay(when),
            pricingAsOf: PRICING_AS_OF,
            priceConfigured:
              typeof config.provider.priceInPerM === 'number' || typeof config.provider.priceOutPerM === 'number',
          });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/status') {
          json(res, 200, {
            version: version(),
            provider: providerLabel(config),
            channels: { telegram: Boolean(telegram), whatsapp: Boolean(whatsapp) },
            dream: {
              enabled: config.dream.enabled,
              everyHours: config.dream.everyHours,
              lastDreamAt: readDreamState().lastDreamAt ?? null,
            },
            heartbeat: {
              enabled: config.heartbeat.enabled,
              minutes: config.heartbeat.minutes,
              pauseBelow: config.heartbeat.pauseBelow,
            },
            local: {
              enabled: config.localProvider.enabled,
              model: config.localProvider.model,
              baseUrl: config.localProvider.baseUrl,
            },
            memory: { ...memory.stats(), index: memory.indexStats(), facts: countMemoryFacts() },
            agents: listAgents(),
            queue: agentQueue.stats(),
            disk: { ...diskUsage(), budgetBytes: diskBudgetBytes(config), keepDays: diskKeepDays(config) },
            // The newest compaction summary anywhere in this home.
            digest: lastDigestSummary(),
            configPath: configPath(),
            termux: isTermux(),
          });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/disk') {
          const usage = diskUsage();
          const budgetBytes = diskBudgetBytes(config);
          json(res, 200, {
            ...usage,
            budgetBytes,
            keepDays: diskKeepDays(config),
            overBudget: usage.totalBytes > budgetBytes,
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/memory/search') {
          const body = await readJsonBody(req);
          const query = typeof body?.query === 'string' ? body.query.trim() : '';
          if (!query) {
            json(res, 400, { error: 'query required' });
            return;
          }
          const hits = await memory.search(query, 12);
          json(res, 200, { hits });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/memory/remember') {
          const body = await readJsonBody(req);
          const fact = typeof body?.fact === 'string' ? body.fact.trim() : '';
          if (!fact) {
            json(res, 400, { error: 'fact required' });
            return;
          }
          const result = memory.remember(fact.slice(0, 2000));
          json(res, 200, { ok: /Remembered/.test(result), result });
          return;
        }

        if (req.method === 'PUT' && pathname === '/api/memory') {
          const body = await readJsonBody(req);
          if (typeof body?.content !== 'string') {
            json(res, 400, { error: 'content required' });
            return;
          }
          try {
            memory.write(body.content);
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
            return;
          }
          json(res, 200, { ok: true, stats: memory.stats() });
          return;
        }

        const skillShowMatch = pathname.match(/^\/api\/skills\/([a-z0-9][a-z0-9-_]*)$/i);
        if (skillShowMatch && req.method === 'GET') {
          const skill = skills.get(skillShowMatch[1]!);
          if (!skill) {
            json(res, 404, { error: 'skill not found' });
            return;
          }
          json(res, 200, skill);
          return;
        }

        if (req.method === 'POST' && pathname === '/api/skills/import') {
          const body = await readJsonBody(req);
          const source = typeof body?.source === 'string' ? body.source.trim() : '';
          if (!source || source.length > 500) {
            json(res, 400, { error: 'source required (folder path or git url)' });
            return;
          }
          try {
            const results = await importSkills(source, { force: body?.force === true });
            json(res, 200, { results });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        const agentMatch = pathname.match(/^\/api\/agents\/([a-z0-9][a-z0-9_-]*)$/);
        if (agentMatch && req.method === 'GET') {
          const name = agentMatch[1]!;
          const soulFile = path.join(workspaceDir(), 'agents', name, 'SOUL.md');
          if (!fs.existsSync(soulFile)) {
            json(res, 404, { error: 'agent not found' });
            return;
          }
          json(res, 200, { name, soul: fs.readFileSync(soulFile, 'utf8') });
          return;
        }
        if (agentMatch && req.method === 'PUT') {
          const name = agentMatch[1]!;
          const soulFile = path.join(workspaceDir(), 'agents', name, 'SOUL.md');
          if (!fs.existsSync(soulFile)) {
            json(res, 404, { error: 'agent not found' });
            return;
          }
          const body = await readJsonBody(req);
          const soul = typeof body?.soul === 'string' ? body.soul : '';
          if (!soul.trim() || soul.length > 100_000) {
            json(res, 400, { error: 'soul required (1-100000 chars)' });
            return;
          }
          fs.writeFileSync(soulFile, soul, 'utf8');
          json(res, 200, { ok: true, name });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/agents') {
          const body = await readJsonBody(req);
          const name = sanitizeAgentName(typeof body?.name === 'string' ? body.name : '');
          if (!name) {
            json(res, 400, { error: 'invalid agent name (lowercase letters, digits, - or _)' });
            return;
          }
          const soulFile = path.join(workspaceDir(), 'agents', name, 'SOUL.md');
          if (fs.existsSync(soulFile)) {
            json(res, 409, { error: 'agent already exists' });
            return;
          }
          const tpl = typeof body?.template === 'string' && isSoulTemplate(body.template) ? body.template : null;
          const soul =
            typeof body?.soul === 'string' && body.soul.trim()
              ? body.soul
              : tpl
                ? soulTemplate(tpl, name)
                : `# SOUL\n\n- Name: ${name}\n- You are ${name}, a TermCrab agent.\n`;
          fs.mkdirSync(path.dirname(soulFile), { recursive: true });
          fs.writeFileSync(soulFile, soul, 'utf8');
          log.info(`agent created via UI: ${name}`);
          json(res, 200, { ok: true, name });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/say') {
          const body = await readJsonBody(req);
          const text = typeof body?.text === 'string' ? body.text.trim() : '';
          if (!text || text.length > 2000) {
            json(res, 400, { error: 'text required (1-2000 chars)' });
            return;
          }
          const result = await speak(text);
          json(res, 200, result);
          return;
        }

        // TTS streaming: speak text in chunks
        if (req.method === 'POST' && pathname === '/api/say/stream') {
          const body = await readJsonBody(req);
          const text = typeof body?.text === 'string' ? body.text.trim() : '';
          if (!text || text.length > 10000) {
            json(res, 400, { error: 'text required (1-10000 chars)' });
            return;
          }
          const result = await speakStream(text, {
            onChunk: (chunk) => bus.emit({ type: 'tts:chunk', text: chunk }),
          });
          json(res, 200, result);
          return;
        }

        // Continuous STT: start a listening session
        if (req.method === 'POST' && pathname === '/api/listen/start') {
          const body = await readJsonBody(req);
          const timeoutMs = typeof body?.timeoutMs === 'number' ? body.timeoutMs : 30000;
          const stt = startContinuousStt(
            (text) => bus.emit({ type: 'stt:result', text }),
            { timeoutMs },
          );
          // Store for later stop
          continuousStt = stt;
          json(res, 200, { ok: true, status: 'listening' });
          return;
        }

        // Continuous STT: stop listening
        if (req.method === 'POST' && pathname === '/api/listen/stop') {
          if (continuousStt) {
            continuousStt.stop();
            continuousStt = null;
          }
          json(res, 200, { ok: true, status: 'stopped' });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/listen') {
          // One-shot dictation; always 200 with ok/error so the UI can show either.
          json(res, 200, await listenOnce(30_000));
          return;
        }

        if (req.method === 'GET' && pathname === '/api/wake') {
          json(res, 200, wake.status());
          return;
        }
        if (req.method === 'POST' && pathname === '/api/wake/start') {
          const body = await readJsonBody(req);
          const r = await wake.start(typeof body?.keyword === 'string' && body.keyword.trim() ? body.keyword.trim() : undefined);
          json(res, 200, r);
          return;
        }
        if (req.method === 'POST' && pathname === '/api/wake/stop') {
          json(res, 200, wake.stop());
          return;
        }
        if (req.method === 'POST' && pathname === '/api/wake/feed') {
          const body = await readJsonBody(req);
          const text = typeof body?.text === 'string' ? body.text.trim() : '';
          if (!text) { json(res, 400, { error: 'say something first (text is required)' }); return; }
          json(res, 200, wake.feed(text));
          return;
        }

        if (req.method === 'POST' && pathname === '/api/update') {
          // Manual "check for updates" button — never auto-updates.
          const r = await checkForUpdate(version());
          if (r.ok && r.updateAvailable) {
            bus.emit({ type: 'update', latest: r.latest, current: r.current, url: r.url });
          }
          json(res, 200, r);
          return;
        }

        if (req.method === 'POST' && pathname === '/api/update/apply') {
          // "Auto update" button — downloads, installs, then restarts the server.
          const body = await readJsonBody(req);
          const force = body?.force === true;
          if (applyRunning) {
            json(res, 409, { error: 'an update is already running' });
            return;
          }
          const check = await checkForUpdate(version());
          if (check.ok && !check.updateAvailable && !force) {
            json(res, 200, { ok: true, upToDate: true, current: check.current });
            return;
          }
          if (!check.ok && !force) {
            json(res, 200, { ok: false, error: check.error || 'could not check for updates' });
            return;
          }
          const target = check.latest ?? version();
          json(res, 200, { ok: true, accepted: true, target });
          void runApplyAndRestart(target); // progress arrives over the event stream
          return;
        }

        if (req.method === 'POST' && pathname === '/api/onboard') {
          // Web setup wizard: apply in one shot. TermCrab only supports
          // OpenAI-compatible Chat Completions, so body.provider is normalised
          // to 'openai' regardless of which label the UI shows.
          const body = await readJsonBody(req);
          config.provider.type = 'openai';
          if (body && (typeof body.provider === 'string' || typeof body.apiKey === 'string' || typeof body.baseUrl === 'string' || typeof body.model === 'string')) {
            if (typeof body.apiKey === 'string' && body.apiKey.trim()) config.provider.apiKey = body.apiKey.trim();
            if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) config.provider.baseUrl = body.baseUrl.trim();
            if (typeof body.model === 'string' && body.model.trim()) {
              config.provider.model = body.model.trim();
            } else if (!config.provider.model) {
              config.provider.model = DEFAULT_MODEL_HINTS.openai || 'gpt-4o-mini';
            }
          }
          if (body && typeof body.name === 'string' && body.name.trim()) config.agent.name = body.name.trim().slice(0, 40);
          if (body && typeof body.allowExec === 'boolean') config.agent.allowExec = body.allowExec;
          if (body && typeof body.port === 'string' && /^\d+$/.test(body.port.trim())) {
            const n = Number(body.port.trim());
            if (n > 0 && n < 65536) config.gateway.port = n;
          }
          if (body && typeof body.telegramToken === 'string' && body.telegramToken.trim()) {
            const ids = Array.isArray(body.telegramUsers)
              ? body.telegramUsers.map((u: unknown) => Number(u)).filter((n: number) => Number.isFinite(n) && n > 0)
              : [];
            config.channels.telegram = {
              token: body.telegramToken.trim(),
              allowedUserIds: ids,
              ...(config.channels.telegram?.notifyChatId ? { notifyChatId: config.channels.telegram.notifyChatId } : {}),
            };
          }
          saveConfig(config);
          seedWorkspace(config.agent.name);
          const isLocal = (() => {
            try {
              const u = new URL(config.provider.baseUrl || '');
              return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '::1';
            } catch { return false; }
          })();
          json(res, 200, {
            ok: true,
            setupNeeded: !config.provider.apiKey && !isLocal,
            providerType: config.provider.type,
            model: config.provider.model,
            name: config.agent.name,
            path: configPath(),
          });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/boot') {
          json(res, 200, { ...bootStatus(), termux: isTermux() });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/boot/install') {
          const r = installBootScript();
          json(res, 200, { ok: r.created, path: r.path, termux: isTermux() });
          return;
        }

        json(res, 404, { error: 'not found' });
        return;
      }

      // Page routes: /settings, /status, /memory, /tools, /chat/<id>, ...
      // all serve the single-file control UI, which routes client-side.
      if (req.method === 'GET') {
        serveFile(res, path.join(uiDir(), 'index.html'));
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

  // Hot-apply config changes made OUTSIDE this process (`termcrab config set`
  // in another terminal, an editor). The persisted baseline in config.ts
  // makes the gateway ignore its own saves, so the web panel's live writes
  // never fight this watcher — only outside changes are adopted.
  let cfgWatchTimer: NodeJS.Timeout | undefined;
  let cfgWatcher: fs.FSWatcher | undefined;
  try {
    cfgWatcher = fs.watch(configPath(), () => {
      if (cfgWatchTimer) clearTimeout(cfgWatchTimer);
      cfgWatchTimer = setTimeout(() => {
        const fresh = readExternalConfigChange();
        if (!fresh) return;
        const prevToken = config.gateway.token;
        const prevHost = config.gateway.host;
        const prevPort = config.gateway.port;
        const live = config as unknown as Record<string, unknown>;
        for (const k of Object.keys(live)) delete live[k];
        Object.assign(live, fresh);
        // A listening socket cannot move itself — keep the bound address.
        config.gateway.host = prevHost;
        config.gateway.port = prevPort;
        if (fresh.gateway.host !== prevHost || fresh.gateway.port !== prevPort) {
          log.info(
            `config: host/port changed on disk (${prevHost}:${prevPort} -> ${fresh.gateway.host}:${fresh.gateway.port}) - restart termcrab to switch`,
          );
        }
        if (config.gateway.token !== prevToken) {
          if (!config.gateway.token) {
            if (!isLoopback) {
              log.warn(
                `panel password removed while reachable from the network (${host}) - anyone on this network can use it. Set one: termcrab config set gateway.token generate`,
              );
            } else {
              log.info('panel password removed - the panel now opens without a login');
            }
          } else {
            log.info('config: password changed on disk - now in effect');
          }
        }
      }, 120);
    });
    cfgWatcher.unref(); // never keep the process alive on its own
  } catch {
    /* config file does not exist yet — nothing to watch */
  }

  // One update at a time.
  let applyRunning = false;

  /** Pull + install + build, then restart the server on the new code. */
  async function runApplyAndRestart(target: string): Promise<void> {
    applyRunning = true;
    try {
      const phaseMsg: Record<ApplyPhase, string> = {
        pull: 'downloading the new code…',
        install: 'installing…',
        build: 'preparing the update…',
      };
      const r = await applyUpdate({
        onPhase: (phase) => bus.emit({ type: 'update', phase, message: phaseMsg[phase], target }),
      });
      if (!r.ok) {
        bus.emit({ type: 'update', phase: 'error', message: r.error, target });
        applyRunning = false;
        return;
      }
      bus.emit({ type: 'update', phase: 'restart', message: 'update installed — restarting the server…', target });
      await new Promise((done) => setTimeout(done, 400)); // let browsers receive the event
      await handle.stop();
      if (process.env.TCRAB_SUPERVISOR === '1') {
        process.exit(0); // the supervisor starts us again on the new code
      }
      // Standalone run: relaunch ourselves detached; logs go to logs/gateway.log.
      fs.mkdirSync(logsDir(), { recursive: true });
      const out = fs.openSync(path.join(logsDir(), 'gateway.log'), 'a');
      const child = spawn(process.execPath, process.argv.slice(1), {
        detached: true,
        stdio: ['ignore', out, out],
        env: process.env,
      });
      child.unref();
      process.exit(0);
    } catch (err) {
      bus.emit({ type: 'update', phase: 'error', message: err instanceof Error ? err.message : String(err), target });
      applyRunning = false;
    }
  }

  const handle: GatewayHandle = {
    server,
    port,
    agent,
    stop: async () => {
      if (cfgFileWatcher) cfgFileWatcher.close();
      if (cfgWatcher) cfgWatcher.close();
      if (cfgWatchTimer) clearTimeout(cfgWatchTimer);
      stopHeartbeat();
      stopCron();
      stopDream();
      wake.stop();
      clearInterval(outboxTimer);
      if (telegram) await telegram.stop();
      if (whatsapp) await whatsapp.stop();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        // An open control-UI event stream (or idle keep-alive) would otherwise
        // hold close() open forever — that made Ctrl+C hang with the UI open.
        server.closeAllConnections();
      });
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
