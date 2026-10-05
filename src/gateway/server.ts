import fs from 'node:fs';
import os from 'node:os';
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
import { EmbeddingIndex } from '../agent/embed.js';
import { embedderPlan, resolveEmbedder } from '../agent/embed-provider.js';
import { runDream, startDreamScheduler, readDreamState, dreamHistory } from '../agent/dream.js';
import { countMemoryFacts } from '../agent/status.js';
import { formatTokens, usageForDay } from '../core/usage.js';
import { PRICING_AS_OF } from '../core/pricing.js';
import { checkForUpdate } from '../core/update.js';
import { applyVerified, verifyBuild, ApplyPhase } from '../core/updater.js';
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
import { escapeHtml, TelegramChannel, type IncomingContext, type TelegramDeps } from '../channels/telegram.js';
import { makeIntake } from '../channels/intake.js';
import { makeToolActivity } from '../channels/tool-activity.js';
import { contextReport, renderContext } from '../agent/context.js';
import { toProviderMessages } from '../agent/loop.js';
import { formatInbox, inboxDir, listInbox, readArrival } from '../channels/inbox.js';
import { WhatsAppChannel } from '../channels/whatsapp.js';
import { parseAgentPrefix } from '../channels/telegram.js';
import { getProposal } from '../skills/proposals.js';
import { ChannelName } from '../channels/api.js';
import { listAgents, sanitizeAgentName } from '../agent/prompt.js';
import { resolveRoute, routeTable, setRoute } from '../agent/routing.js';
import { listTasks as listSubagentTasks } from '../agent/tasks.js';
import { listSubagentDirs } from '../agent/subagents.js';
import { approveProposal, listProposals, listRejected, rejectProposal } from '../skills/proposals.js';
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
import {
  listConversations,
  registerDocumentSender,
  registerSender,
  registerVoiceSender,
  recordInbound,
} from '../channels/conversations.js';
import { formatRoomHistory, listRooms } from '../channels/rooms.js';
import { securityAudit } from '../agent/security.js';
import { auditSecrets } from '../agent/security.js';
import { listSecrets } from '../agent/secrets.js';
import { speakToFile } from '../mobile/tts.js';
import { buildBoard } from '../agent/board.js';
import { docsSiteFreshness, ensureDocsSite } from '../docs/site.js';
import { RUN_LIMIT, lastTelegramRuns, telegramRunsPath } from '../channels/telegram-runs.js';
import { perfStatus, suiteTimeStatus } from '../core/perf.js';
import { getPortal } from './portal.js';
import { canvasClear, canvasList, canvasRemove } from './canvas.js';
import { offSwitches, switchKeyFor, TOOL_SWITCHES } from '../agent/tool-catalog.js';
import { findSharedFile, listSharedFiles, recordSharedFile, withinRoots } from '../channels/shared-files.js';
import { extractText } from '../channels/extract.js';
import {
  CHAT_COMMANDS,
  controlUiReport,
  inboxCommand,
  memoryCommand,
  usageCommand,
  skillShow,
  skillsDecide,
  embeddingsSetupReport,
  runReportCommand,
  sayReport,
  workReport,
  type ReportResult,
} from './chat-reports.js';
import { queueCommand, runControlCommand, sessionsPurgeCommand, sessionsRenameCommand, steerCommand, type ControlDeps } from './chat-control.js';
import { embeddingsSetup, embeddingsStatus } from '../agent/embed-setup.js';
import { planRestore, restoreBackup, writeBackup } from '../core/backup.js';
import { servicePlan, serviceStatus } from '../mobile/service.js';
import { transcribeFile } from '../mobile/whisper.js';
import { listSuggestions, dismiss } from '../agent/suggestions.js';
import { listAsks, answer as answerAsk } from '../agent/ask.js';
import { getProgress } from '../agent/progress.js';
import { startCronScheduler, cronTick } from '../cron/scheduler.js';
import { addCron, loadCrons, removeCron, setCronEnabled, getCron } from '../cron/store.js';
import { nextRun, parseCron, CronParseError } from '../cron/parser.js';
import { Approval, getApproval, listApprovals, resolveApproval } from '../core/approvals.js';
import { authKey, authenticate, constantTimeEqual, extractAuth } from './auth.js';
import { formatSessionHits, searchSessions } from '../agent/session-search.js';
import { healthLine, runHealth } from '../agent/run-health.js';
import { buildPresence, presenceLine, withSummary, type Presence, type PresenceChannelInput } from './presence.js';
import { KNOWN_EVENTS, describeTrigger, planTriggers, triggerMessage, triggerSession, watcherMatches, type TriggerPayload } from './triggers.js';
import { rollingLine, rollingSessionKey, telegramSessionKey } from '../agent/rolling.js';
import { detectSandbox, sandboxSetting } from '../agent/sandbox.js';
import { addIntent, listIntents, removeIntent } from '../agent/intents.js';
import { generateImage } from '../media/image.js';
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
  /**
   * 53.3 — a Bot API stub. The suite drives a real Telegram turn through the
   * gateway (message in → tools run → one status message edited → reply out)
   * without a network, which is the only way to prove the wiring rather than
   * describe it.
   */
  telegramApi?: NonNullable<TelegramDeps['api']>;
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

/**
 * 50.1 — the three files a person may edit from the panel. The map is the
 * security boundary: a request names one of these keys, never a path, so no
 * input can walk outside the home.
 */
const IDENTITY_FILES = [
  { name: 'SOUL.md', rel: 'workspace/SOUL.md', what: 'who the agent is and how it behaves' },
  { name: 'IDENTITY.md', rel: 'workspace/IDENTITY.md', what: 'name, tone, language, hard nos' },
  { name: 'USER.md', rel: 'memory/USER.md', what: 'what the agent knows about the owner' },
] as const;
const IDENTITY_MAX = 32 * 1024;

/** Audio uploads are bytes, not JSON — same contract, a bigger limit. */
function readBodyBuffer(req: http.IncomingMessage, limit = 25_000_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error(`upload too large (limit ${Math.round(limit / 1_000_000)} MB)`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
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
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.log': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf',
  '.ogg': 'audio/ogg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.zip': 'application/zip',
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

/**
 * 53.5 — a real download: the bytes, plus a file name the browser keeps.
 * The name is escaped, never trusted as a path.
 */
function serveDownload(res: http.ServerResponse, file: string, name: string): void {
  if (!fs.existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  const safe = name.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'file';
  res.writeHead(200, {
    'content-type': MIME[path.extname(safe)] || 'application/octet-stream',
    'content-disposition': `attachment; filename="${safe}"`,
  });
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

  // Hybrid search (32.1): the local model when its package is installed, the
  // chat provider's embedding endpoint otherwise, lexical search when neither
  // works — and the log always says which one it got.
  let embeddingIndex: EmbeddingIndex | undefined;
  try {
    const { embedder, plan, error } = await resolveEmbedder(config, path.join(home(), 'models'));
    if (embedder) {
      embeddingIndex = new EmbeddingIndex(path.join(memoryDir(), 'index.jsonl'), embedder);
      log.info(`memory: hybrid search enabled — ${plan.note}`);
    } else if (config.memory?.embeddings !== false) {
      log.info(`memory: ${plan.note}${error ? ` (${error})` : ''}`);
    }
  } catch (err) {
    log.info(`memory: embeddings unavailable, lexical only (${err instanceof Error ? err.message : String(err)})`);
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
      // A failed turn must say which session it was, or an event trigger
      // cannot tell its own failure from someone else's (24.2).
      onEvent: (ev) => {
        const stamped = { ...ev, sessionId: (ev as { sessionId?: string }).sessionId ?? turn.sessionId };
        bus.emit(stamped as unknown as BusEvent);
        // 53.3: the per-turn listener the caller passed (Telegram's tool status
        // line). The bus is not a substitute — the caller wants *its* turn.
        turn.onEvent?.(stamped as typeof ev);
      },
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
        // 28.1: the wake word is the owner speaking, so the answer lands in the
        // same rolling main session as the panel and the terminal.
        sessionId: rollingSessionKey(config, { fallback: 'wake:main', channel: 'voice', chatId: 'main' }),
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
  // Built once: one intake closure for the life of the process.
  const telegramIntake = makeIntake(config);
  const tgCfg = config.channels.telegram;
  if (tgCfg?.token && tgCfg.allowedUserIds?.length) {
    const state = readTelegramState();
    telegram = new TelegramChannel({
      cfg: tgCfg,
      ...(opts.telegramApi ? { api: opts.telegramApi } : {}),
      // 16.1–16.3: what arrives becomes something the agent can answer about —
      // a document is read, a voice note transcribed, a photo described.
      // The arrival is remembered by the intake; the same moment is what
      // "file.received" means to an event trigger (24.2).
      intake: async (saved, info) => {
        const text = await telegramIntake(saved, info);
        fireTriggers('file.received', { name: saved.path.split('/').pop() ?? saved.path, bytes: saved.bytes, kind: info.kind });
        return text;
      },
      getOffset: () => readTelegramState().offset,
      setOffset: (n) => writeTelegramState(n),
      onMessage: async (_userId, chatId, text, displayName, ctx) => {
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
        // 51.2/51.4: the context travels with the text — a forum topic and a
        // voice note both change what the answer should be.
        return handleMessage('telegram', chatId, text, _userId, displayName, ctx);
      },
      // 48.3 — an approval answered from the chat. The same resolveApproval()
      // the panel and the CLI call, so all three doors end in one decision.
      onCallback: async (_userId, chatId, data, queryId) => {
        // 51.2 — `/embeddings setup` asks first, then installs. The confirm is
        // a button because installing a package is not something to discover
        // after the fact; the same `embeddingsSetup()` the CLI and the panel run.
        if (data.startsWith('skills:approve:')) {
          void queryId;
          const name = data.slice('skills:approve:'.length);
          const r = skillsDecide('approve', name);
          return r.ok ? r.text : `⚠️ ${r.error}`;
        }
        if (data === 'emb:setup') {
          void queryId;
          const r = await embeddingsSetup();
          const steps = r.steps?.length ? `\n     ${r.steps.join('\n     ')}` : '';
          return r.ok
            ? `🧠 embeddings ready${steps}`
            : `⚠️ embeddings setup failed: ${r.error || 'unknown error'}${steps}`;
        }
        const [action, id] = data.split(':');
        if ((action !== 'approve' && action !== 'deny') || !id) {
          return 'that button is no longer attached to anything';
        }
        const approval = getApproval(id);
        if (!approval) return 'that approval has already expired';
        const decided = resolveApproval(id, action === 'approve', 'telegram');
        void queryId;
        if (!decided) return 'that approval was already decided';
        bus.emit({ type: 'approval:decided', approval: { id, status: action === 'approve' ? 'approved' : 'denied', decidedBy: 'telegram' } } as unknown as BusEvent);
        return action === 'approve'
          ? `✅ approved ${approval.tool} — it is running`
          : `🚫 denied ${approval.tool} — nothing ran`;
      },
    });
    telegram.start();
    // 48.2 — teach Telegram the menu the bot actually understands (best effort;
    // an old API server or a network blip must not stop the gateway).
    void telegram.registerCommands(CHAT_COMMANDS).catch(() => undefined);
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
    // 51.2 — and so do voice notes: the same door, a different envelope.
    registerVoiceSender('telegram', async (address, filePath, caption) => {
      await tg.sendVoice(Number(address), filePath, caption);
    });
    // 48.3 — human-in-the-loop, in the chat where the work was asked for.
    // OpenClaw approves exec from Telegram (`channels.telegram.execApprovals.*`);
    // the audit counted that as a missing cell, and this closes it: the approval
    // the panel shows as a card also arrives as a message with two buttons.
    const chatOf = (sessionId?: string): number | null => {
      const m = /^telegram:(-?\d+)/.exec(sessionId ?? '');
      return m ? Number(m[1]) : null;
    };
    bus.subscribe((ev) => {
      if (ev.type !== 'approval') return;
      const approval = (ev as unknown as { approval?: Approval }).approval;
      if (!approval || approval.status !== 'pending') return;
      const chatId = chatOf(approval.sessionId);
      if (chatId === null) return; // came from the panel or the terminal
      const args = JSON.stringify(approval.args ?? {}).slice(0, 300);
      void tg
        .sendButtons(
          chatId,
          `🔐 ${approval.tool} wants to run\n<pre>${escapeHtml(args)}</pre>\n\nApprove it?`,
          [
            [
              { text: '✅ Allow', data: `approve:${approval.id}` },
              { text: '🚫 Deny', data: `deny:${approval.id}` },
            ],
          ],
        )
        .catch(() => undefined);
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

  /**
   * Which transports are configured, and which are actually running (24.1).
   * "Configured" comes from the config; "running" comes from the live object
   * the server built, so this cannot claim a channel that failed to start.
   */
  function presenceChannels(): PresenceChannelInput[] {
    const c = config.channels;
    const rows: Array<[string, unknown, boolean, string | undefined]> = [
      ['telegram', telegram, Boolean(c.telegram?.token), undefined],
      [
        'whatsapp',
        whatsapp,
        Boolean(c.whatsapp?.enabled),
        c.whatsapp?.enabled && !whatsapp?.available
          ? 'configured; waiting for the WhatsApp connection (scan the QR in the terminal)'
          : undefined,
      ],
      ['discord', discord, Boolean(c.discord), undefined],
      ['slack', slack, Boolean(c.slack), undefined],
      ['signal', signal, Boolean(c.signal), undefined],
      ['sms', sms, Boolean(c.sms), undefined],
      ['matrix', matrix, Boolean(c.matrix), undefined],
    ];
    // buildPresence() drops rows that are neither configured nor running, so
    // the rule lives in one place; this only translates to its input shape.
    return rows.map(([name, live, configured, detail]) => ({
        name,
        configured,
        running: name === 'whatsapp' ? Boolean(whatsapp?.available) : Boolean(live),
        detail,
      }));
  }

  /**
   * Attached *external* clients. bus.size would also count the gateway's own
   * internal subscriber (the event-trigger bridge), and a watcher count that
   * includes the server watching itself is a lie.
   */
  let watcherCount = 0;
  // 28.2: who is attached to which conversation. A session can be open in the
  // panel, on a phone and in the terminal at once; each attachment is one
  // viewer, and the count is on GET /api/sessions.
  const sessionViewers = new Map<string, Set<unknown>>();

  /**
   * 49.3 — the embedding provider picker's state. `EMBED_PROVIDERS` is the same
   * list `embedderPlan()` understands (auto | local | openai | gemini), and a
   * running install is one background job per gateway, reported through
   * `GET /api/embeddings` until it finishes.
   */
  const EMBED_PROVIDERS = ['auto', 'local', 'openai', 'gemini'] as const;
  let embedInstall: {
    running: boolean;
    startedAt: number | null;
    steps: string[];
    ok: boolean | null;
    error: string | null;
  } = { running: false, startedAt: null, steps: [], ok: null, error: null };

  /** The presence picture for this process, built from what it already owns. */
  function presenceNow(): Presence {
    return withSummary(
      buildPresence({
        watchers: watcherCount,
        channels: presenceChannels(),
        devices: listDevices(),
        conversations: listConversations(),
      }),
    );
  }

  /** A presence change is worth one bus event, so UIs need not poll (24.1). */
  function announcePresence(change: string): void {
    const p = presenceNow();
    bus.emit({ type: 'presence', change, watchers: p.watchers, summary: p.summary } as unknown as BusEvent);
  }

  // ---- Event triggers (24.2) ----
  // A hook may name internal events; when one happens the hook gets the same
  // queued turn a webhook POST would have produced. Matching and the safety
  // rules (self-loop, cooldown) live in src/gateway/triggers.ts.
  const triggerLastFired = new Map<string, number>();
  const TRIGGER_COOLDOWN_MS = 60_000;

  function fireTriggers(event: string, data: Record<string, unknown> = {}, fromSession?: string): string[] {
    const payload: TriggerPayload = { event, fromSession, data };
    const decisions = planTriggers(config.hooks ?? [], payload, {
      lastFired: triggerLastFired,
      cooldownMs: TRIGGER_COOLDOWN_MS,
    });
    const fired: string[] = [];
    for (const d of decisions) {
      if (d.skipped) {
        log.debug(describeTrigger(d.hook, payload, d.skipped));
        continue;
      }
      try {
        // Same lane, same queue, same rate of knots as a webhook: no bypass.
        agentQueue.submit({
          sessionId: triggerSession(d.hook.id),
          userMessage: triggerMessage(d.hook, payload),
          channel: 'webhook',
        });
        triggerLastFired.set(d.hook.id, Date.now());
        fired.push(d.hook.id);
        log.info(describeTrigger(d.hook, payload));
      } catch (err) {
        // A full queue is a reason to skip, not to fail the event's source.
        log.warn(`event ${event} could not reach hook ${d.hook.id}:`, err instanceof Error ? err.message : String(err));
      }
    }
    if (fired.length) bus.emit({ type: 'trigger', event, hooks: fired } as unknown as BusEvent);
    return fired;
  }

  /** Which internal bus events are worth waking someone for. */
  function triggerFromBusEvent(ev: BusEvent): { event: string; data: Record<string, unknown>; fromSession?: string } | null {
    const any = ev as Record<string, unknown>;
    const from = typeof any.sessionId === 'string' ? any.sessionId : undefined;
    if (any.type === 'error') {
      return { event: 'run.failed', data: { message: String(any.message ?? '') }, fromSession: from };
    }
    // Lifecycle (24.2/26.x): reactive, not intercepting — a hook is told and
    // may act; it cannot rewrite or block the turn (approvals do that).
    if (any.type === 'run:start') {
      return { event: 'run.start', data: { runId: String(any.runId ?? '') }, fromSession: from };
    }
    if (any.type === 'run:end') {
      return {
        event: 'run.end',
        data: { runId: String(any.runId ?? ''), iterations: Number(any.iterations ?? 0), costUsd: Number(any.costUsd ?? 0) },
        fromSession: from,
      };
    }
    if (any.type === 'session:reset') {
      return { event: 'session.reset', data: { reason: String(any.reason ?? '') }, fromSession: from };
    }
    if (any.type === 'presence' && String(any.change ?? '').startsWith('paired:')) {
      return { event: 'device.paired', data: { deviceId: String(any.change).slice('paired:'.length) } };
    }
    if (any.type === 'cron') {
      return { event: 'cron.finished', data: { name: String(any.name ?? ''), ok: Boolean(any.ok), preview: String(any.preview ?? '') } };
    }
    return null;
  }

  const unsubscribeTriggers = bus.subscribe((ev) => {
    const trigger = triggerFromBusEvent(ev);
    if (trigger) fireTriggers(trigger.event, trigger.data, trigger.fromSession);
  });

  // ---- Watchers (26.x): a path is the rule ----
  // config.watchers entries turn "something changed under this folder" into the
  // `file.changed` event. fs.watch is the platform's own mechanism (inotify on
  // Android/Linux); a burst of events from one save is debounced per watcher.
  const stopWatchers: (() => void)[] = [];
  for (const watcher of config.watchers ?? []) {
    if (!watcher?.id || !watcher.path) continue;
    const target = watcher.path.startsWith('~') ? path.join(os.homedir(), watcher.path.slice(1)) : watcher.path;
    const abs = path.isAbsolute(target) ? target : path.join(workspaceDir(), target);
    if (!fs.existsSync(abs)) {
      log.warn(`watcher ${watcher.id}: ${abs} does not exist yet — not watching`);
      continue;
    }
    const debounceMs = Math.max(200, watcher.debounceMs ?? 1500);
    const timers = new Map<string, NodeJS.Timeout>();
    let handle: fs.FSWatcher;
    try {
      handle = fs.watch(abs, { recursive: true }, (_type, filename) => {
        const changed = String(filename ?? '');
        if (changed && !watcherMatches(watcher, changed)) return;
        const key = changed || abs;
        const existing = timers.get(key);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
          timers.delete(key);
          fireTriggers('file.changed', { watcher: watcher.id, path: abs, name: changed || path.basename(abs) });
        }, debounceMs);
        timer.unref?.();
        timers.set(key, timer);
      });
    } catch (err) {
      // recursive watching is not available everywhere; fall back to the top level.
      try {
        handle = fs.watch(abs, (_type, filename) => {
          const changed = String(filename ?? '');
          if (changed && !watcherMatches(watcher, changed)) return;
          fireTriggers('file.changed', { watcher: watcher.id, path: abs, name: changed || path.basename(abs) });
        });
        log.debug(`watcher ${watcher.id}: recursive watching unavailable (${err instanceof Error ? err.message : String(err)}), watching the top level`);
      } catch (err2) {
        log.warn(`watcher ${watcher.id} could not start:`, err2 instanceof Error ? err2.message : String(err2));
        continue;
      }
    }
    handle.on('error', (err) => log.warn(`watcher ${watcher.id}:`, err instanceof Error ? err.message : String(err)));
    log.info(`watching ${abs} (${watcher.id}) — a change fires file.changed`);
    stopWatchers.push(() => {
      for (const timer of timers.values()) clearTimeout(timer);
      handle.close();
    });
  }

  // A hook listening for an event nothing emits would be silent forever: say
  // so once at startup rather than letting the user guess.
  for (const hook of config.hooks ?? []) {
    for (const pattern of hook.on ?? []) {
      const known = KNOWN_EVENTS.some((k) => pattern === '*' || pattern === k.name || (pattern.endsWith('.*') && k.name.startsWith(pattern.slice(0, -1))));
      if (!known) log.warn(`hook ${hook.id} listens for "${pattern}", which nothing emits — see: termcrab events`);
    }
  }

  // Once the channels are up, that fact is presence too.
  announcePresence('started');

  /** Shared inbound handler for text channels (telegram/whatsapp). */
  /** 51.2 — text, plus "say it out loud" when the surface can. */
  type ChannelAnswer = string | { text: string; speak?: boolean };
  /**
   * 46/47 — the single place a surface's text becomes an answer from the *shared*
   * layer. Telegram, the panel's chat, the command palette and (through the same
   * handler) every other channel call this, so a command has one implementation
   * and one set of words no matter where it was typed.
   */
  const controlDepsFor = (sessionId: string, channel: string, chatId: string | number): ControlDeps => ({
    sessionId,
    channel,
    chatId: String(chatId),
    config,
    saveConfig,
    sessions,
    queue: agentQueue,
    currentVersion: version(),
  });

  async function runSharedCommand(
    text: string,
    channel: string,
    chatId: string | number,
    sessionId: string,
  ): Promise<ReportResult | null> {
    const control = await runControlCommand(text, controlDepsFor(sessionId, channel, chatId));
    if (control) return control;
    // 53.4/53.5 — the three verbs that used to be reachable on Telegram only,
    // because they lived inside this file's channel handler. They come from
    // `chat-reports` now, so the panel's chat and the palette get them too.
    const trimmed = text.trim();
    if (/^\/memory(\s|$)/.test(trimmed)) return memoryCommand({ memory }, trimmed.slice('/memory'.length).trim());
    if (/^\/inbox(\s|$)/.test(trimmed)) return inboxCommand(trimmed.slice('/inbox'.length).trim());
    if (trimmed === '/usage' || trimmed.startsWith('/usage ')) return usageCommand(config);
    // 51.5: the mini-app report needs the address a phone can reach.
    return runReportCommand(text, {
      agent,
      skills,
      proposals: () => listProposals(),
      publicUrl: config.gateway.publicUrl,
    });
  }

  /**
   * 51.2 — what the telegram-only commands answer with. Each one either needs
   * the Bot API (a button, a voice note, an attachment) or is a confirm that
   * only makes sense where the buttons are; everything else goes through the
   * shared dispatcher, so the words stay identical on all three surfaces.
   */
  async function telegramSpecial(
    text: string,
    chatId: string | number,
    sessionId: string,
  ): Promise<ChannelAnswer | null> {
    if (!telegram) return null;
    const tg = telegram;
    const num = Number(chatId);

    if (text === '/controlui' || text.startsWith('/controlui ')) {
      const report = controlUiReport(config.gateway.publicUrl);
      const url = (config.gateway.publicUrl ?? '').trim().replace(/\/+$/, '');
      if (!report.ok) return { text: `⚠️ ${report.error}` };
      // A button that opens nothing must not be sent: the report already says
      // what is missing, so the refusal goes out as text.
      if (!url || /^https?:\/\/(127\.0\.0\.1|localhost)\b/i.test(url)) return { text: report.text };
      await tg.sendWebApp(num, report.text, '🦀 Open the panel', url);
      return { text: '' };
    }

    if (text.startsWith('/skills approve ')) {
      const name = text.slice('/skills approve'.length).trim();
      if (!name) return { text: '⚠️ usage: /skills approve <name>' };
      const one = getProposal(name);
      if (!one) return { text: `⚠️ no proposal named “${name}” — /skills lists them` };
      const shown = skillShow(name);
      const body = shown.ok ? shown.text : `📝 ${name}`;
      await tg.sendButtons(num, `${body}\n\nApproving makes it live on this machine.`, [
        [{ text: '✅ Approve', data: `skills:approve:${name}` }],
      ]);
      return { text: '' };
    }

    if (text === '/embeddings setup') {
      const report = embeddingsSetupReport();
      if (!report.ok) return { text: `⚠️ ${report.error}` };
      await tg.sendButtons(num, report.text, [[{ text: '⬇️ Install and probe', data: 'emb:setup' }]]);
      return { text: '' };
    }

    if (text.startsWith('/say ') || text === '/say') {
      const report = sayReport(text.slice('/say'.length));
      if (!report.ok) return { text: `⚠️ ${report.error}` };
      return { text: report.text, speak: true };
    }

    if (text === '/work full') {
      const report = workReport(true);
      if (!report.ok) return { text: `⚠️ ${report.error}` };
      if (report.attach) {
        try {
          await tg.sendDocument(num, report.attach.file, report.attach.caption);
        } catch (err) {
          log.warn('telegram worklog attach failed:', err instanceof Error ? err.message : err);
        }
      }
      return { text: report.text };
    }
    void sessionId;
    return null;
  }

  async function handleMessage(
    channel: ChannelName,
    chatId: string | number,
    text: string,
    userId: string | number,
    displayName: string,
    ctx?: IncomingContext,
  ): Promise<ChannelAnswer> {
    recordInbound(channel, String(chatId), text);
    // 28.1: the owner's own conversations share one rolling main session;
    // 28.3: with channels.telegram.scoping = 'user' the key is the person, not
    // the room, so their DM and their mentions follow them between chats.
    const group = channel === 'telegram' && Number(chatId) < 0;
    // 51.4: a forum topic is a conversation of its own — the same group with
    // two topics keeps two threads, and a plain group's key is unchanged.
    const scoping = config.channels?.telegram?.scoping ?? 'chat';
    const fallbackSession =
      channel === 'telegram'
        ? telegramSessionKey({ chatId, userId, ...(ctx?.threadId ? { threadId: ctx.threadId } : {}), scoping })
        : scoping === 'user' && userId
          ? `${channel}:u:${userId}`
          : `${channel}:${chatId}`;
    const baseSession = rollingSessionKey(config, {
      fallback: fallbackSession,
      channel,
      chatId: String(chatId),
      group,
    });

    if (text === '/new') {
      sessions.reset(baseSession);
      // also reset every agent-scoped variant of this chat
      for (const s of sessions.list()) {
        if (s.id.endsWith(`:${baseSession}`)) sessions.reset(s.id);
      }
      return '🧹 Session reset. Fresh start!';
    }
    if (text === '/orders' || text.startsWith('/orders ')) {
      // 26.1: standing orders from any surface. They are read from the same
      // store the prompt injects, so adding one here changes every next turn.
      const rest = text.slice('/orders'.length).trim();
      if (rest.startsWith('add ')) {
        const added = addIntent(rest.slice(4).trim());
        return `📌 Standing order added:\n• ${added.text}\n(id ${added.id} — /orders remove ${added.id} to drop it)`;
      }
      if (rest.startsWith('remove ')) {
        const id = rest.slice(7).trim();
        return removeIntent(id) ? `🗑 Removed standing order ${id}.` : `No standing order with id ${id} — /orders lists them.`;
      }
      const list = listIntents();
      if (!list.length) return '📌 No standing orders yet. Add one: /orders add always answer in Bengali';
      return `📌 Standing orders (followed in every conversation):\n${list.map((i) => `• ${i.id} — ${i.text}`).join('\n')}`;
    }
    if (text === '/agents') {
      const agents = listAgents();
      return agents.length
        ? `👥 Named agents:\n${agents.map((a) => `• @${a} <message>`).join('\n')}\nUsage: start your message with @name`
        : 'No named agents yet. Create workspace/agents/<name>/SOUL.md';
    }
    // 34.3: what was said in this room, including the messages the mention
    // policy kept out of the conversation.
    if (text === '/history' || text.startsWith('/history ')) {
      const arg = text.slice('/history'.length).trim();
      const n = Number(arg);
      const limit = Number.isFinite(n) && n > 0 ? Math.min(30, Math.floor(n)) : 12;
      return formatRoomHistory(channel, String(chatId), { limit, lineChars: 120 });
    }
    if (text === '/status') {
      // 21.3: the reset policy is part of "is everything running", because a
      // fresh-looking chat that silently keeps an old thread is worse than one
      // that says it will start over.
      const policy = policyLine(sessions, `${channel}:${chatId}`, config.agent.sessionReset);
      const runs = healthLine(runHealth({ queue: agentQueue, traces: listRuns() }));
      const here = presenceLine(presenceNow());
      return `🦀 TermCrab online\nmodel: ${providerLabel(config)}\nexec: ${config.agent.allowExec ? 'on' : 'off'}\nagents: ${listAgents().join(', ') || '(default)'}\nheartbeat: ${config.heartbeat.enabled ? `every ${config.heartbeat.minutes}m` : 'off'}\n${runs}\n${here}\n${policy}`;
    }
    // 15.4: the same facts the CLI reports with --json, available in the chat.
    // Batches 46 + 47: the chat verbs and the read-only reports live in one
    // shared dispatcher, so Telegram, the panel's chat and the palette answer
    // with the same words (and the CLI's own data). /help moved there too — one
    // list means the Bot menu and this text cannot drift apart.
    // 51.2/51.5: the commands that need the Bot API itself (a voice note, a
    // Web App button, an install confirm). They answer for Telegram only; every
    // other surface gets the shared words below.
    if (channel === 'telegram') {
      const special = await telegramSpecial(text, chatId, baseSession);
      if (special) return special;
    }
    {
      const shared = await runSharedCommand(text, channel, chatId, baseSession);
      if (shared) {
        if (!shared.ok) return `⚠️ ${shared.error}`;
        // 51.2 — /say and anything else that asked to be spoken.
        return shared.speak ? { text: shared.text, speak: true } : shared.text;
      }
    }
    if (text === '/usage') {
      const r = usageCommand(config);
      return r.ok ? r.text : `⚠️ ${r.error}`;
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
      // 47.1: the two verbs the CLI had and the chat did not. Purge needs a
      // number on purpose — "delete stuff" is not a thing a stray tap may do.
      if (arg.startsWith('rename ')) {
        const [from, to] = arg.slice('rename '.length).trim().split(/\s+/);
        const r = sessionsRenameCommand(controlDepsFor(baseSession, channel, chatId), from ?? '', to ?? '');
        return r.ok ? r.text : `⚠️ ${r.error}`;
      }
      if (arg.startsWith('purge')) {
        const r = sessionsPurgeCommand(controlDepsFor(baseSession, channel, chatId), arg.slice('purge'.length).trim());
        return r.ok ? r.text : `⚠️ ${r.error}`;
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
      const r = await memoryCommand({ memory }, text.slice('/memory'.length).trim());
      return r.ok ? r.text : `⚠️ ${r.error}`;
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
      const r = inboxCommand(text.slice('/inbox'.length).trim());
      return r.ok ? r.text : `⚠️ ${r.error}`;
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
    // Precedence (33.2): an @prefix on the message, then agents.routes for this
    // surface, then the main agent. A route naming an agent that does not exist
    // is reported once per turn, not silently ignored.
    const prefixed = parseAgentPrefix(text, listAgents());
    const route = resolveRoute(agent.config, channel, { explicit: prefixed.agent, known: listAgents() });
    if (route.problem) log.warn(`routing: ${route.problem}`);
    const routedAgent = route.agent ?? undefined;
    // 53.3 — a long turn reports the tools it runs in one edited message
    // instead of a message per tool (Telegram only; the panel has its own
    // cards). Off with channels.telegram.toolActivity = false.
    const statusPort =
      channel === 'telegram' && telegram && config.channels.telegram?.toolActivity !== false
        ? telegram.toolStatusPort(Number(chatId))
        : null;
    const activity = statusPort
      ? makeToolActivity(statusPort, {
          ...(typeof config.channels.telegram?.toolActivityMinMs === 'number'
            ? { minMs: config.channels.telegram.toolActivityMinMs }
            : {}),
        })
      : null;
    let result: ChannelAnswer;
    try {
      result = await runQueuedTurn(agent, {
        sessionId: baseSession,
        userMessage: prefixed.text,
        channel,
        user: userId ? String(userId) : undefined,
        room: String(chatId),
        agent: routedAgent,
        onEvent: (ev) => {
          bus.emit(ev as unknown as BusEvent);
          const e = ev as { type?: string; name?: string; sessionId?: string };
          if (activity && e.type === 'tool:start' && (!e.sessionId || e.sessionId === baseSession) && e.name) {
            activity.note(e.name);
          }
        },
      });
    } finally {
      await activity?.finish();
    }
    void userId;
    void displayName;
    return result;
  }

  /** The text half, for the channels whose API only takes text. */
  const textOf = (answer: ChannelAnswer): string => (typeof answer === 'string' ? answer : answer.text);
  const handleChannelMessage = (
    channel: ChannelName,
    chatId: string | number,
    text: string,
    userId: string | number,
    displayName: string,
  ): Promise<string> => handleMessage(channel, chatId, text, userId, displayName).then(textOf);

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
  // 33.4: a job's `deliver` decides which surfaces see the result. The gateway
  // knows which of them exist, so the decision is made here, not in the store.
  const deliverCron = async (text: string, target: 'telegram' | 'panel' | 'none' | 'all'): Promise<void> => {
    const chatId = config.channels.telegram?.notifyChatId;
    if (target !== 'panel' && telegram && chatId) await telegram.send(chatId, `⏲️ ${text}`);
    if (target !== 'telegram') {
      log.info('cron output:', text.slice(0, 300));
      bus.emit({ type: 'cron-output', text: text.slice(0, 2000), at: Date.now() } as unknown as BusEvent);
    }
  };
  const stopCron = startCronScheduler({ ctx: agent, deliver: deliverCron });
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

      // 34.8: the offline docs page — every doc in docs/ as one self-contained
      // HTML file with search, built on demand. Served exactly like the panel
      // shell at `/` (a static page; nothing secret inside it), and the same
      // file works with no network at all: `termcrab docs`, then open it.
      if (req.method === 'GET' && (pathname === '/docs' || pathname === '/docs/' || pathname === '/docs/site')) {
        try {
          const r = ensureDocsSite();
          res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          res.end(fs.readFileSync(r.file, 'utf8'));
        } catch (err) {
          res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
          res.end(`could not build the docs page: ${err instanceof Error ? err.message : String(err)}`);
        }
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
        announcePresence(`paired:${redeemed.device.id}`);
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
      if (req.method === 'GET' && pathname === '/api/perf') {
        // 38.2: the last performance measurement (written by `termcrab perf`,
        // 38.1). Reads state/perf.json; it never measures anything, because a
        // measurement boots a gateway and runs a turn.
        json(res, 200, perfStatus());
        return;
      }

      if (req.method === 'GET' && pathname === '/api/suite-time') {
        // 41.3: the last recorded suite run (docs/openclaw/data/suite-time.json),
        // so "the tests got slow" is visible on a phone without a shell. Reads a
        // recording; it never runs the suite.
        json(res, 200, suiteTimeStatus());
        return;
      }

      if (req.method === 'GET' && pathname === '/api/telegram-runs') {
        // 37.4: the recorded live runs, newest first. Evidence, not state: the
        // Work page shows it so "we tested it on a real bot" is a fact with a
        // timestamp instead of a claim.
        const file = telegramRunsPath();
        json(res, 200, {
          file,
          exists: fs.existsSync(file),
          runs: lastTelegramRuns(10, file),
          limit: RUN_LIMIT,
        });
        return;
      }

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
          // A client attaching is presence becoming true, and its leaving is
          // the first sign something dropped (24.1).
          watcherCount += 1;
          announcePresence('watch');
          req.on('close', () => {
            clearInterval(ping);
            unsubscribe();
            watcherCount = Math.max(0, watcherCount - 1);
            announcePresence('unwatch');
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
          // 28.1: a client that does not name a session is the owner talking
          // from the panel, so it lands in the rolling main session unless
          // rolling is off. A client that names one gets exactly that session.
          const defaulted = !(body as { sessionId?: unknown }).sessionId;
          const sessionId = defaulted
            ? rollingSessionKey(config, { fallback: parsed.value.sessionId, channel: 'web', chatId: 'main' })
            : parsed.value.sessionId;
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

        /**
         * Attach to one conversation (28.2). Same bus frames as /api/events,
         * filtered to this session, plus a first `state` frame carrying the
         * tail of the transcript and whether a turn is running — so a client
         * that just opened a tab sees what happened while it was away without
         * asking a second endpoint. Several clients may attach at once; the
         * queue still runs one turn at a time (that is what makes "no message
         * lost" true), and the viewer count is on GET /api/sessions.
         */
        const attachMatch = pathname.match(/^\/api\/sessions\/([^/]+)\/attach$/);
        if (attachMatch && req.method === 'GET') {
          const sid = decodeURIComponent(attachMatch[1]!);
          // A conversation with nothing in it yet is a conversation: attaching
          // before the first message is how a client opens on one it has not
          // used (the TUI opens on `main` before you ever type). Only a
          // nonsensical id is refused.
          if (!sid || sid.includes('/') || sid.length > 128) {
            json(res, 400, { error: `bad session id: ${sid}` });
            return;
          }
          res.writeHead(200, {
            'content-type': 'text/event-stream',
            'cache-control': 'no-cache',
            connection: 'keep-alive',
          });
          const running = agentQueue.getRunning(sid);
          const tail = sessions.readHot(sid, 60);
          res.write(
            `event: state\ndata: ${JSON.stringify({
              v: WIRE_VERSION,
              sessionId: sid,
              running: running ? { turnId: running.id, status: running.status } : null,
              viewers: (sessionViewers.get(sid)?.size ?? 0) + 1,
              transcript: tail.map((e) => ({ role: e.role, content: 'content' in e ? e.content : '', ts: e.ts, name: 'name' in e ? e.name : undefined })),
            })}\n\n`,
          );
          const mine = sessionViewers.get(sid) ?? new Set<unknown>();
          mine.add(res);
          sessionViewers.set(sid, mine);
          const unsubscribe = bus.subscribe((ev) => {
            const any = ev as Record<string, unknown>;
            if (any.sessionId !== sid) return;
            const frame = wrapEvent(any);
            res.write(`event: ${frame.type}\ndata: ${JSON.stringify(frame)}\n\n`);
          });
          const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
          ping.unref();
          req.on('close', () => {
            clearInterval(ping);
            unsubscribe();
            const set = sessionViewers.get(sid);
            set?.delete(res);
            if (!set?.size) sessionViewers.delete(sid);
          });
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
         * What is running, and is any of it stuck (23.1). Must come before the
         * by-id route below, which would otherwise read "health" as a run id.
         * The panel, `termcrab runs` and the /status line all read this; the
         * verdicts are computed in src/agent/run-health.ts so every surface
         * says the same sentence.
         */
        if (req.method === 'GET' && pathname === '/api/runs/health') {
          const health = runHealth({ queue: agentQueue, traces: listRuns() });
          json(res, 200, { ok: true, v: WIRE_VERSION, count: health.length, runs: health });
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
          // 33.2: the roster plus the routing table, so the panel can say who
          // answers where instead of leaving it to a config file.
          json(res, 200, { agents: listAgents(), routes: routeTable(config, listAgents()) });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/subagents') {
          // 33.1: the same list the agent sees, plus what the scratch dirs hold.
          const tasks = listSubagentTasks();
          json(res, 200, {
            count: tasks.length,
            running: tasks.filter((t) => t.status === 'running').length,
            tasks,
            scratch: listSubagentDirs(),
          });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/skills/proposals') {
          // 33.3: proposals are visible in the panel; approving here is the
          // same decision as the CLI, on the same files.
          json(res, 200, { proposals: listProposals(), rejected: listRejected() });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/skills/proposals') {
          const body = await readJsonBody(req);
          const name = typeof body?.name === 'string' ? body.name : '';
          const action = body?.action === 'approve' || body?.action === 'reject' ? body.action : '';
          if (!name || !action) {
            json(res, 400, { error: 'name and action (approve|reject) are required' });
            return;
          }
          const r =
            action === 'approve'
              ? approveProposal(name, { force: body?.force === true })
              : rejectProposal(name, typeof body?.reason === 'string' ? body.reason : '');
          if (!r.ok) {
            json(res, 404, { error: r.error ?? 'could not decide' });
            return;
          }
          json(res, 200, { ...r, proposals: listProposals() });
          return;
        }

        if (req.method === 'PUT' && pathname === '/api/agents/routes') {
          const body = await readJsonBody(req);
          const surface = typeof body?.surface === 'string' ? body.surface.trim().toLowerCase() : '';
          const agentName = typeof body?.agent === 'string' ? body.agent.trim().toLowerCase() : '';
          if (!surface) {
            json(res, 400, { error: 'surface is required (web, telegram, cli, cron, voice, wake, subagent)' });
            return;
          }
          if (agentName && !listAgents().includes(agentName)) {
            json(res, 400, { error: `no such agent: ${agentName} — create one first (POST /api/agents)` });
            return;
          }
          setRoute(config, surface, agentName || null);
          saveConfig(config);
          json(res, 200, { ok: true, routes: routeTable(config, listAgents()) });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/sessions') {
          // 28.2: who is attached, alongside what exists — a client can see
          // that the same conversation is open somewhere else.
          const running = new Map(agentQueue.listRunning().map((r) => [r.sessionId, r]));
          const listed = sessions.list().map((s) => ({
            ...s,
            viewers: sessionViewers.get(s.id)?.size ?? 0,
            running: running.get(s.id)?.turnId ?? null,
          }));
          // 49.1 — the same ranked search the CLI runs (`sessions search`),
          // offered to the panel: the rail asks `?q=` and gets hits with the
          // words marked, not a filtered list of names.
          const q = (new URL(req.url ?? '/', 'http://localhost').searchParams.get('q') ?? '').trim();
          if (q) {
            const hits = searchSessions(q, { limit: 12 }, sessions).map((h) => ({
              sessionId: h.sessionId,
              role: h.role,
              when: h.when,
              part: h.part,
              snippet: h.snippet,
            }));
            json(res, 200, { query: q, hits, sessions: listed });
            return;
          }
          json(res, 200, { sessions: listed });
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

        // 49.2 — the prompt-section report (`termcrab context`), for the Debug view.
        if (req.method === 'GET' && pathname === '/api/context') {
          const params = new URL(req.url ?? '/', 'http://localhost').searchParams;
          const sid =
            params.get('session')?.trim() ||
            rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' });
          const report = contextReport({
            config,
            memory,
            skills,
            sessionId: sid,
            channel: params.get('channel')?.trim() || 'web',
            messages: toProviderMessages(sessions.readHot(sid, 400)),
            toolCount: (await buildTools({ config, memory, skills })).length,
          });
          json(res, 200, { ...report, sessionId: sid });
          return;
        }

        // 49.3 — the embedding provider, next to the on/off switch. The status
        // comes from the same function `termcrab embeddings status` prints and
        // the switch writes the same config key the CLI writes.
        if (req.method === 'GET' && pathname === '/api/embeddings') {
          json(res, 200, {
            ...embeddingsStatus(),
            setting: (config.memory?.embedProvider as string) ?? 'auto',
            providers: [...EMBED_PROVIDERS],
            install: embedInstall,
          });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/embeddings') {
          const body = await readJsonBody(req);
          if (body?.action === 'install') {
            if (body.confirm !== true) {
              json(res, 400, {
                error:
                  'installing the offline model downloads a package (~10 MB) and a model (~23 MB) — resend with confirm:true, or run: termcrab embeddings setup',
              });
              return;
            }
            if (embedInstall.running) {
              json(res, 409, { error: 'an install is already running', install: embedInstall });
              return;
            }
            embedInstall = { running: true, startedAt: Date.now(), steps: [], ok: null, error: null };
            const state = embedInstall;
            void embeddingsSetup()
              .then((r) => {
                state.running = false;
                state.steps = r.steps;
                state.ok = r.ok;
                state.error = r.ok ? null : (r.error ?? 'setup failed without a message');
              })
              .catch((err: unknown) => {
                state.running = false;
                state.ok = false;
                state.error = err instanceof Error ? err.message : String(err);
              });
            json(res, 202, { ok: true, started: true, install: embedInstall });
            return;
          }
          const provider = String(body?.provider ?? '');
          if (!(EMBED_PROVIDERS as readonly string[]).includes(provider)) {
            json(res, 400, { error: `provider must be one of: ${EMBED_PROVIDERS.join(', ')}` });
            return;
          }
          config.memory = { ...config.memory, embedProvider: provider as (typeof EMBED_PROVIDERS)[number] };
          saveConfig(config);
          json(res, 200, { ok: true, provider, status: embeddingsStatus() });
          return;
        }

        // 49.4 — the queue mode and steering, from the same verbs the chat
        // dispatcher serves (`/queue`, `/steer`), so the panel cannot drift.
        if (req.method === 'GET' && pathname === '/api/queue') {
          const webSession = rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' });
          const r = queueCommand(controlDepsFor(webSession, 'web', 'main'));
          json(res, 200, {
            mode: agentQueue.getMode(),
            running: agentQueue.listRunning().length,
            text: r.ok ? r.text : '',
          });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/queue') {
          const body = await readJsonBody(req);
          const webSession = rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' });
          const r = queueCommand(controlDepsFor(webSession, 'web', 'main'), typeof body?.mode === 'string' ? body.mode : '');
          if (r.ok) json(res, 200, { ok: true, mode: agentQueue.getMode(), message: r.text });
          else json(res, 400, { ok: false, error: r.error });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/steer') {
          const body = await readJsonBody(req);
          const webSession = rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' });
          const r = steerCommand(controlDepsFor(webSession, 'web', 'main'), String(body?.text ?? ''));
          if (r.ok) json(res, 200, { ok: true, message: r.text });
          else json(res, 400, { ok: false, error: r.error });
          return;
        }

        // 50.1 — the identity files, readable and editable from the panel. The
        // name is a key into IDENTITY_FILES, so a path can never be one.
        if (pathname === '/api/bootstrap' && req.method === 'GET') {
          const files = IDENTITY_FILES.map((f) => {
            const abs = path.join(home(), f.rel);
            let text = '';
            let bytes = 0;
            try {
              if (fs.existsSync(abs)) {
                text = fs.readFileSync(abs, 'utf8');
                bytes = fs.statSync(abs).size;
              }
            } catch {
              /* unreadable reads as empty, and the write below will say why */
            }
            return { name: f.name, rel: f.rel, what: f.what, exists: bytes > 0, bytes, text, max: IDENTITY_MAX };
          });
          json(res, 200, { files });
          return;
        }
        if (pathname === '/api/bootstrap' && req.method === 'PUT') {
          const body = await readJsonBody(req);
          const spec = IDENTITY_FILES.find((f) => f.name === body?.file);
          if (!spec) {
            json(res, 400, { error: `file must be one of: ${IDENTITY_FILES.map((f) => f.name).join(', ')}` });
            return;
          }
          const text = typeof body?.text === 'string' ? body.text : null;
          if (text === null) {
            json(res, 400, { error: 'text must be a string' });
            return;
          }
          if (Buffer.byteLength(text, 'utf8') > IDENTITY_MAX) {
            json(res, 413, { error: `${spec.name} is limited to ${Math.round(IDENTITY_MAX / 1024)} KB` });
            return;
          }
          const abs = path.join(home(), spec.rel);
          fs.mkdirSync(path.dirname(abs), { recursive: true });
          fs.writeFileSync(abs, text, 'utf8');
          json(res, 200, { ok: true, file: spec.name, rel: spec.rel, bytes: Buffer.byteLength(text, 'utf8') });
          return;
        }

        // 50.2 — backup and restore, reusing the CLI's own module. Restore
        // always asks for the archive name typed back, and only looks inside
        // $TCRAB_HOME/backups: an upload can never name an arbitrary path.
        if (pathname === '/api/backups' && req.method === 'GET') {
          const dir = path.join(home(), 'backups');
          let list: { name: string; bytes: number; modified: number }[] = [];
          try {
            list = fs
              .readdirSync(dir)
              .filter((f) => f.endsWith('.tar') || f.endsWith('.tar.gz'))
              .map((f) => {
                const st = fs.statSync(path.join(dir, f));
                return { name: f, bytes: st.size, modified: st.mtimeMs };
              })
              .sort((a, b) => b.modified - a.modified);
          } catch {
            /* no backups dir yet */
          }
          json(res, 200, { dir, backups: list });
          return;
        }
        if (pathname === '/api/backup' && req.method === 'POST') {
          const dir = path.join(home(), 'backups');
          fs.mkdirSync(dir, { recursive: true });
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          const file = path.join(dir, `backup-${stamp}.tar`);
          const r = writeBackup(file, { release: version() });
          json(res, 200, { ok: true, file: r.file, name: path.basename(r.file), manifest: r.manifest });
          return;
        }
        const backupDownload = pathname.match(/^\/api\/backups\/([^/]+)$/);
        if (backupDownload && req.method === 'GET') {
          const name = path.basename(decodeURIComponent(backupDownload[1]!));
          const file = path.join(home(), 'backups', name);
          if (!fs.existsSync(file)) {
            json(res, 404, { error: 'no such backup' });
            return;
          }
          res.writeHead(200, { 'content-type': 'application/x-tar', 'content-disposition': `attachment; filename="${name}"` });
          res.end(fs.readFileSync(file));
          return;
        }
        if (pathname === '/api/restore' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const name = typeof body?.name === 'string' ? path.basename(body.name) : '';
          if (!name) {
            json(res, 400, { error: 'name must be the archive file name from GET /api/backups' });
            return;
          }
          const file = path.join(home(), 'backups', name);
          if (!fs.existsSync(file)) {
            json(res, 404, { error: `no backup called ${name} in ${path.join(home(), 'backups')}` });
            return;
          }
          try {
            const plan = planRestore(file);
            if (body?.dryRun === true) {
              json(res, 200, { ok: true, dryRun: true, plan });
              return;
            }
            if (body?.confirm !== name) {
              json(res, 400, {
                error: `restore replaces your home with the archive's copies (the previous files are moved to state/restore-*/) — resend with confirm:"${name}"`,
              });
              return;
            }
            const r = restoreBackup(file);
            json(res, 200, { ok: true, restored: r.restored, bytes: r.bytes, movedTo: r.movedTo, manifest: r.manifest });
          } catch (err) {
            json(res, 400, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        // 50.3 — the service card: what is installed, where the file is, and
        // the command a human runs. Read-only on purpose: no remote execution.
        if (pathname === '/api/service' && req.method === 'GET') {
          const status = serviceStatus();
          const plan = servicePlan();
          json(res, 200, {
            ...status,
            plan: { platform: plan.platform, file: plan.file, steps: plan.steps, content: plan.content },
            installCommand: plan.platform === 'termux' ? 'termcrab boot install' : 'termcrab service install',
            note: 'the panel never runs this — copy it into a terminal on the device',
          });
          return;
        }

        // 50.4 — transcribe an uploaded audio file. The bytes are written
        // inside $TCRAB_HOME/state/uploads and handed to the same
        // transcribeFile() the CLI's `termcrab transcribe` calls.
        if (pathname === '/api/transcribe' && req.method === 'POST') {
          const ext =
            (new URL(req.url ?? '/', 'http://localhost').searchParams.get('ext') ?? 'ogg')
              .replace(/[^a-z0-9]/gi, '')
              .slice(0, 5) || 'ogg';
          let buf: Buffer;
          try {
            buf = await readBodyBuffer(req);
          } catch (err) {
            json(res, 413, { error: err instanceof Error ? err.message : 'upload failed' });
            return;
          }
          if (!buf.length) {
            json(res, 400, { error: 'empty upload — send the audio bytes as the request body' });
            return;
          }
          const dir = path.join(home(), 'state', 'uploads');
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, `upload-${Date.now()}.${ext}`);
          fs.writeFileSync(file, buf);
          const r = await transcribeFile(file);
          if (!r.ok) {
            json(res, 422, { ok: false, error: r.error ?? 'transcription failed', file, bytes: buf.length });
            return;
          }
          json(res, 200, { ok: true, text: r.text ?? '', engine: r.engine ?? null, ms: r.ms ?? 0, bytes: buf.length, file });
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
          const body = raw
            ? (JSON.parse(raw) as {
                name?: string;
                schedule?: string;
                prompt?: string;
                critical?: boolean;
                agent?: string;
                deliver?: string;
              })
            : {};
          try {
            // 34.4: the panel can set the same two things the CLI can (33.4) —
            // refused with a sentence before anything is written otherwise.
            const deliver = body.deliver ? String(body.deliver).toLowerCase() : undefined;
            if (deliver && !['telegram', 'panel', 'none'].includes(deliver)) {
              json(res, 400, { error: 'deliver must be telegram, panel or none' });
              return;
            }
            const agentName = body.agent ? String(body.agent).trim().toLowerCase() : undefined;
            if (agentName && !listAgents().includes(agentName)) {
              json(res, 400, { error: `no such agent: ${agentName} (have: ${listAgents().join(', ') || 'none'})` });
              return;
            }
            const job = addCron({
              name: body.name || '',
              schedule: body.schedule || '',
              prompt: body.prompt || '',
              critical: body.critical,
              ...(agentName ? { agent: agentName } : {}),
              ...(deliver ? { deliver: deliver as 'telegram' | 'panel' | 'none' } : {}),
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
          // 46.2: one command list. The panel's palette and Telegram's Bot menu
          // both read CHAT_COMMANDS, so a command added to the shared handler
          // appears on every surface without a second edit.
          json(res, 200, {
            commands: [
              ...CHAT_COMMANDS.map((c) => ({ name: c.cmd, description: c.description, args: c.args })),
              // The four the panel does itself (they move the UI, not the data).
              { name: '/clear', description: 'Clear this chat view', args: '' },
              { name: '/model', description: 'Pick a model', args: '[model-name]' },
            ],
          });
          return;
        }

        if (req.method === 'POST' && pathname === '/api/slash') {
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { command?: string; args?: string }) : {};
          const cmd = (body.command || '').trim();
          const args = (body.args || '').trim();
          // `ui: true` is the palette asking for a view shortcut (it wants to
          // move the interface, not print text). The chat input sends no flag,
          // so it lands in the shared dispatcher below — exactly like Telegram.
          const wantUi = (body as { ui?: unknown }).ui === true;
          if (!wantUi && (cmd === '/new' || cmd === '/clear')) {
            // 46.3: /new means the same thing on every surface — a fresh thread.
            const sid = rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' });
            sessions.reset(sid);
            for (const s of sessions.list()) if (s.id.endsWith(`:${sid}`)) sessions.reset(s.id);
            json(res, 200, { ok: true, action: 'new', message: '🧹 Session reset. Fresh start!' });
            return;
          }
          if (wantUi) switch (cmd) {
            case '/orders': {
              // 26.1: the same standing orders the prompt injects, editable
              // from the web panel's command palette.
              if (args.startsWith('add ')) {
                const added = addIntent(args.slice(4).trim());
                json(res, 200, { ok: true, message: `Standing order added: ${added.text}`, orders: listIntents() });
                return;
              }
              if (args.startsWith('remove ')) {
                const id = args.slice(7).trim();
                const gone = id ? listIntents().find((i) => i.id === id) : undefined;
                if (!id || !removeIntent(id)) {
                  json(res, 404, { error: `no standing order ${id || '(missing id)'}`, orders: listIntents() });
                  return;
                }
                json(res, 200, { ok: true, message: `Removed standing order ${id}`, removed: gone?.text ?? '', orders: listIntents() });
                return;
              }
              json(res, 200, { ok: true, message: `${listIntents().length} standing order(s)`, orders: listIntents() });
              return;
            }
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
          }
          // 46.3/47.3: everything else is the *shared* dispatcher — the same
          // function Telegram calls, so the panel's chat and a Telegram message
          // get the same words from the same data. This is what makes
          // "reachable on all three surfaces" a fact instead of a promise.
          const webSession = rollingSessionKey(config, { fallback: 'web:main', channel: 'web', chatId: 'main' });
          const report = await runSharedCommand(`${cmd} ${args}`.trim(), 'web', 'main', webSession);
          if (report) {
            if (report.ok) {
              // The palette reads the array too, so the shared answer carries it.
              const extra = cmd === '/orders' ? { orders: listIntents() } : {};
              json(res, 200, { ok: true, message: report.text, ...extra });
            } else {
              const missingOrder = cmd === '/orders' && report.error.startsWith('no standing order');
              json(res, missingOrder ? 404 : 400, {
                ok: false,
                error: report.error,
                ...(cmd === '/orders' ? { orders: listIntents() } : {}),
              });
            }
            return;
          }
          json(res, 400, { error: 'unknown command: ' + cmd });
          return;
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

        // ── 52.1/52.2/52.5 — the ◐ cells, one door each ──────────────────
        // Inbox: the files people sent, listed and readable (the same store
        // the agent's inbox_list tool and the chat's /inbox read).
        if (req.method === 'GET' && pathname === '/api/inbox') {
          const limit = Math.min(Number(new URL(req.url!, 'http://x').searchParams.get('limit')) || 50, 200);
          json(res, 200, { entries: listInbox({ limit }) });
          return;
        }
        {
          const m = pathname.match(/^\/api\/inbox\/([^/]+)$/);
          if (req.method === 'GET' && m) {
            const name = decodeURIComponent(m[1]!);
            if (path.basename(name) !== name) {
              json(res, 400, { error: 'a file name, not a path' });
              return;
            }
            const read = readArrival(name);
            json(res, read.ok ? 200 : 404, read);
            return;
          }
          const dl = pathname.match(/^\/api\/inbox\/([^/]+)\/download$/);
          if (req.method === 'GET' && dl) {
            const name = decodeURIComponent(dl[1]!);
            if (path.basename(name) !== name) {
              json(res, 400, { error: 'a file name, not a path' });
              return;
            }
            const entry = listInbox({ limit: 500 }).find((e) => e.name === name);
            if (!entry) {
              json(res, 404, { error: 'no file by that name in the inbox' });
              return;
            }
            serveDownload(res, path.join(inboxDir(), entry.name), entry.name);
            return;
          }
        }

        // Rooms: what was said while the bot was not addressed (34.3).
        if (req.method === 'GET' && pathname === '/api/rooms') {
          json(res, 200, { rooms: listRooms() });
          return;
        }
        {
          const m = pathname.match(/^\/api\/rooms\/([^/]+)\/([^/]+)$/);
          if (req.method === 'GET' && m) {
            const channel = decodeURIComponent(m[1]!);
            const room = decodeURIComponent(m[2]!);
            const limit = Math.min(Number(new URL(req.url!, 'http://x').searchParams.get('limit')) || 30, 200);
            json(res, 200, { channel, room, history: formatRoomHistory(channel, room, { limit, lineChars: 200 }) });
            return;
          }
        }

        // Watchers: the file triggers /watch writes in a chat and the CLI
        // writes; the panel was the one surface that could only look at them.
        if (req.method === 'GET' && pathname === '/api/watchers') {
          json(res, 200, { watchers: config.watchers ?? [] });
          return;
        }
        if (req.method === 'POST' && pathname === '/api/watchers') {
          const body = (await readJsonBody(req)) as { action?: string; id?: string; path?: string; match?: string } | null;
          const action = body?.action ?? 'add';
          const watchers = [...(config.watchers ?? [])];
          if (action === 'rm' || action === 'remove') {
            const id = (body?.id ?? '').trim();
            const left = watchers.filter((w) => w.id !== id);
            if (left.length === watchers.length) {
              json(res, 404, { error: `no watcher with id ${id || '(none)'}` });
              return;
            }
            config.watchers = left;
            saveConfig(config);
            json(res, 200, { ok: true, removed: id, watchers: left });
            return;
          }
          const what = (body?.path ?? '').trim();
          if (!what) {
            json(res, 400, { error: 'path required' });
            return;
          }
          const id = `w${Date.now().toString(36)}`;
          watchers.push({ id, path: what, ...(body?.match ? { match: body.match } : {}) });
          config.watchers = watchers;
          saveConfig(config);
          json(res, 200, { ok: true, added: { id, path: what }, watchers });
          return;
        }

        // Tool toggles: the three switches the config really carries, so the
        // panel's catalog can flip them instead of sending you to a terminal.
        if (req.method === 'POST' && pathname === '/api/tools/toggle') {
          const body = (await readJsonBody(req)) as { tool?: string; enabled?: boolean } | null;
          const key = switchKeyFor(body?.tool ?? '');
          if (!key) {
            json(res, 400, {
              error: `no toggle for "${body?.tool ?? ''}" — toggles: ${TOOL_SWITCHES.map((s) => s.name).join(', ')}`,
            });
            return;
          }
          config.agent[key] = body?.enabled !== false;
          saveConfig(config);
          json(res, 200, { ok: true, tool: key, enabled: config.agent[key] });
          return;
        }

        // Security: the same audit the chat's /security and `termcrab security`
        // run — findings with fixes, never a secret value.
        if (req.method === 'GET' && pathname === '/api/security') {
          const sandbox = detectSandbox();
          const findings = securityAudit({ config, sandboxAvailable: sandbox.isolated });
          json(res, 200, { findings, sandbox, notable: findings.filter((f) => f.level !== 'ok').length });
          return;
        }

        // Secrets: names and timestamps only; a value never leaves the store.
        if (req.method === 'GET' && pathname === '/api/secrets') {
          json(res, 200, { secrets: listSecrets() });
          return;
        }

        // 52.5 — a spoken reply as a downloadable OGG, for the panel's Speak
        // button (a browser cannot hear this machine's speakers).
        if (req.method === 'POST' && pathname === '/api/voice') {
          const body = (await readJsonBody(req)) as { text?: string } | null;
          const text = (body?.text ?? '').trim();
          if (!text) {
            json(res, 400, { error: 'text required' });
            return;
          }
          const spoken = await speakToFile(text.slice(0, 600), path.join(stateDir(), 'voice'));
          if (!spoken.ok || !spoken.file) {
            json(res, 422, { error: spoken.error ?? 'could not synthesize', hint: 'install espeak-ng and ffmpeg' });
            return;
          }
          const bytes = fs.readFileSync(spoken.file);
          res.writeHead(200, {
            'content-type': spoken.ogg ? 'audio/ogg' : 'audio/wav',
            'content-length': String(bytes.byteLength),
            'content-disposition': `attachment; filename="${path.basename(spoken.file)}"`,
          });
          res.end(bytes);
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
        /**
         * 26.2: image generation from the panel. Same call as `termcrab image`
         * and the agent's `generate_image` tool, so all three share one path.
         */
        if (req.method === 'POST' && pathname === '/api/image') {
          const raw = await readBody(req);
          const body = raw ? (JSON.parse(raw) as { prompt?: string; size?: string; name?: string }) : {};
          if (!body.prompt?.trim()) {
            json(res, 400, { error: 'prompt is required' });
            return;
          }
          try {
            const result = await generateImage(config, {
              prompt: body.prompt,
              size: body.size,
              name: body.name,
            });
            // 53.5 — the picture joins the download list, so the panel can show
            // it (and keep it) without a route that takes a path.
            const record = recordSharedFile({
              name: path.basename(result.path),
              path: result.path,
              bytes: result.bytes,
              via: 'image',
            });
            json(res, 200, { ok: true, ...result, id: record?.id ?? null });
          } catch (err) {
            json(res, 502, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }

        if (req.method === 'GET' && pathname === '/api/canvas') {
          json(res, 200, { widgets: canvasList() });
          return;
        }
        if (req.method === 'DELETE' && pathname === '/api/canvas') {
          const count = canvasList().length;
          canvasClear();
          json(res, 200, { ok: true, cleared: count });
          return;
        }
        if (req.method === 'DELETE' && pathname.startsWith('/api/canvas/')) {
          const id = decodeURIComponent(pathname.slice('/api/canvas/'.length));
          const ok = canvasRemove(id);
          json(res, ok ? 200 : 404, ok ? { ok: true } : { error: `no canvas widget: ${id}` });
          return;
        }

        // 53.5 — the files the agent really sent, and their bytes. The download
        // resolves an id from the record, so a request can never name a path.
        if (req.method === 'GET' && pathname === '/api/sent-files') {
          const limit = Math.min(Number(new URL(req.url!, 'http://x').searchParams.get('limit')) || 50, 200);
          json(res, 200, { files: listSharedFiles({ limit }) });
          return;
        }
        {
          const m = pathname.match(/^\/api\/sent-files\/([^/]+)$/);
          if (req.method === 'GET' && m) {
            const rec = findSharedFile(decodeURIComponent(m[1]!));
            if (!rec) {
              json(res, 404, { error: 'no file with that id' });
              return;
            }
            if (!rec.exists) {
              json(res, 410, { error: `${rec.name} is no longer on disk (it was at ${rec.path})` });
              return;
            }
            if (!withinRoots(rec.path)) {
              json(res, 403, { error: 'refusing to serve a file outside the home' });
              return;
            }
            serveDownload(res, rec.path, rec.name);
            return;
          }
        }

        // 53.5 — text out of an uploaded document, through the same extractor
        // the chat intake uses (`extractText`), so PDF/DOCX behave the same
        // whether they arrive on Telegram or through the panel.
        if (req.method === 'POST' && pathname === '/api/extract') {
          const name =
            (new URL(req.url ?? '/', 'http://localhost').searchParams.get('name') ?? 'upload.txt')
              .replace(/[^\w.\-]+/g, '_')
              .slice(0, 120) || 'upload.txt';
          let buf: Buffer;
          try {
            buf = await readBodyBuffer(req);
          } catch (err) {
            json(res, 413, { error: err instanceof Error ? err.message : 'upload failed' });
            return;
          }
          if (!buf.length) {
            json(res, 400, { error: 'empty upload' });
            return;
          }
          const dir = path.join(home(), 'state', 'uploads');
          fs.mkdirSync(dir, { recursive: true });
          const file = path.join(dir, name);
          fs.writeFileSync(file, buf);
          const read = extractText(file, { name });
          if (!read.ok) {
            json(res, 422, { error: read.reason, name, bytes: buf.length });
            return;
          }
          const text = read.text ?? '';
          json(res, 200, { ok: true, name, bytes: buf.length, kind: read.kind, chars: text.length, text });
          return;
        }

        if (req.method === 'GET' && pathname === '/api/tasks') {
          json(res, 200, { suggestions: listSuggestions('pending') });
          return;
        }
        if (req.method === 'GET' && pathname === '/api/docs') {
          // 34.8: what the docs page is, without building it twice — the panel
          // shows size/counts and links to /docs.
          // 37.2: and *how fresh* it is — which release it describes, how long
          // ago it was built, and whether a doc changed since. The panel asks
          // this on every Work-page refresh, so it must never build.
          json(res, 200, docsSiteFreshness());
          return;
        }
        if (req.method === 'POST' && pathname === '/api/docs') {
          // 37.2: one tap rebuilds, when the note says a doc changed.
          try {
            const r = ensureDocsSite({ force: true, keep: true });
            json(res, 200, { ok: true, ...r, ...docsSiteFreshness() });
          } catch (err) {
            json(res, 500, { error: err instanceof Error ? err.message : String(err) });
          }
          return;
        }
        if (req.method === 'GET' && pathname === '/api/board') {
          // 34.4: the same merged view `termcrab board` prints, from live data.
          json(res, 200, buildBoard());
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

        /**
         * Who can reach me right now (24.1). Derived from the stores the
         * server already owns: attached watchers, running channels, paired
         * devices and recent conversations.
         */
        if (req.method === 'GET' && pathname === '/api/presence') {
          const p = presenceNow();
          json(res, 200, {
            ok: true,
            v: WIRE_VERSION,
            count: p.entries.length,
            watchers: p.watchers,
            summary: p.summary,
            entries: p.entries,
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
            // 30.3: how shell commands are isolated right now, in one block,
            // so the panel can say it before someone runs something sharp.
            sandbox: (() => {
              const info = detectSandbox();
              const setting = sandboxSetting(config);
              return {
                setting,
                mode: setting === 'off' ? 'off' : info.mode,
                isolated: setting !== 'off' && info.isolated,
                note: setting === 'off' ? 'sandbox is off (agent.sandbox=off) — commands run with full access' : info.note,
              };
            })(),
            // 28.1: the session the owner's own surfaces share, in one line.
            sessions: {
              main: config.agent.mainSession || 'main',
              rolling: config.agent.rollingSession !== false,
              note: rollingLine(config, config.agent.mainSession || 'main'),
            },
            queue: agentQueue.stats(),
            presence: (() => {
              const p = presenceNow();
              return { watchers: p.watchers, summary: p.summary, online: p.entries.filter((e) => e.state === 'online').length };
            })(),
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
      // 31.3: the panel button takes the same reversible path the CLI does —
      // snapshot, apply, verify by starting the new build, roll back on failure.
      const r = await applyVerified({
        homeRoot: home(),
        release: target,
        onPhase: (phase) => bus.emit({ type: 'update', phase, message: phaseMsg[phase], target }),
        verify: (root) => verifyBuild(root),
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
      unsubscribeTriggers();
      for (const stop of stopWatchers) stop();
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
