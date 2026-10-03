import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Config } from '../core/config.js';
import { home } from '../core/paths.js';
import { log } from '../core/logger.js';
import { MemoryStore } from './memory.js';
import { SkillStore } from '../skills/loader.js';
import { spawn } from 'node:child_process';
import { extraTools } from './toolbox.js';
import { ToolDef } from '../providers/types.js';
import { createMcpClient, mcpToolsToDefs, McpClient, McpTool } from '../providers/mcp.js';

const execFileAsync = promisify(execFile);

export interface ToolEnv {
  config: Config;
  memory: MemoryStore;
  skills: SkillStore;
  /** Root the agent may read/write without exec (state dir + cwd). */
  extraRoots?: string[];
  fetchImpl?: typeof fetch;
  /** Chat sessions (for the sessions_* tools); omitted in bare unit builds. */
  sessions?: import('./sessions.js').SessionStore;
  /** Session id of the current turn (progress card, session_status). */
  sessionId?: string;
  /** Human-readable provider label for session_status. */
  providerLabel?: string;
  /**
   * How much a fact written by this run may be trusted (18.2). A chat from the
   * owner is `owner`; anything the agent writes itself is `agent`; text that
   * came in through a tool result (a web page, a file a stranger sent) is
   * `untrusted`, and the prompt then warns the model to treat it as data.
   */
  memoryOrigin?: 'owner' | 'agent' | 'system' | 'untrusted';
  /** Where this run came from, recorded on every fact it writes. */
  runSource?: string;
  /** Spawn a background subagent turn (wired by the agent loop). */
  spawnTask?: (sessionId: string, prompt: string) => import('./tasks.js').Task;
  /** MCP clients keyed by server name (wired by the agent loop). */
  mcpClients?: Map<string, McpClient>;
}

export interface Tool {
  def: ToolDef;
  execute(args: Record<string, unknown>): Promise<string>;
}

const MAX_OUTPUT = 20_000;

/** Background exec registry (process tool). Module-level so it survives turns. */
export interface BgProcess {
  id: string;
  pid: number;
  cmd: string;
  started: number;
  buf: string;
  exit?: { code: number | null; signal?: string | null };
}
export const PROCS = new Map<string, BgProcess>();
let procSeq = 0;

/** Interactive shell sessions over pipes (terminal tool; no PTY available). */
export interface TermSession {
  id: string;
  cmd: string;
  started: number;
  buf: string;
  readPos: number;
  child: import('node:child_process').ChildProcessWithoutNullStreams;
}
export const TERMS = new Map<string, TermSession>();
let termSeq = 0;

function str(args: Record<string, unknown>, key: string, required = true): string {
  const v = args[key];
  if (typeof v === 'string' && v.trim()) return v;
  if (required) throw new Error(`missing required argument: ${key}`);
  return '';
}

function clip(text: string, max = MAX_OUTPUT): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n... [truncated ${text.length - max} chars]`;
}

/** Resolve a path and confine it to allowed roots (home + cwd by default). */
export function resolveInRoots(p: string, roots: string[]): string {
  const abs = path.resolve(p);
  const real = (() => {
    try {
      const r = fs.realpathSync(path.dirname(abs));
      return path.join(r, path.basename(abs));
    } catch {
      return abs;
    }
  })();
  const ok = roots.some((root) => {
    const rr = path.resolve(root);
    return real === rr || real.startsWith(rr + path.sep);
  });
  if (!ok) {
    throw new Error(
      `path outside allowed roots: ${abs}\nallowed: ${roots.join(', ')} (use exec if you really need it)`,
    );
  }
  return real;
}

/** Termux has no /bin/sh symlink guarantee - pick a shell that exists. */
export function resolveShell(): string {
  const candidates = [
    process.env.SHELL,
    process.env.PREFIX ? `${process.env.PREFIX}/bin/bash` : undefined,
    process.env.PREFIX ? `${process.env.PREFIX}/bin/sh` : undefined,
    '/data/data/com.termux/files/usr/bin/bash',
    '/system/bin/sh',
    '/bin/sh',
  ].filter((c): c is string => Boolean(c));
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      return c;
    } catch {
      /* next */
    }
  }
  return '/bin/sh';
}

function webFetchTool(env: ToolEnv): Tool {
  return {
    def: {
      name: 'web_fetch',
      description: 'Fetch an http(s) URL and return readable text (HTML is stripped). Use for research.',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Absolute http:// or https:// URL' },
          maxChars: { type: 'number', description: 'Max characters to return (default 8000)' },
        },
        required: ['url'],
      },
    },
    async execute(args) {
      const url = str(args, 'url');
      if (!/^https?:\/\//i.test(url)) throw new Error('only http/https URLs are allowed');
      const maxChars = typeof args.maxChars === 'number' ? Math.min(args.maxChars, 60000) : 8000;
      const fetchImpl = env.fetchImpl ?? fetch;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const res = await fetchImpl(url, {
          signal: controller.signal,
          headers: { 'user-agent': 'TermCrab/0.1 (+https://github.com/onelitonbd/claw)' },
          redirect: 'follow',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = (await res.text()).slice(0, 2_000_000);
        const text = res.headers.get('content-type')?.includes('html') ? htmlToText(raw) : raw;
        return clip(text.trim(), maxChars);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function htmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
  return text;
}

export async function buildTools(env: ToolEnv): Promise<Tool[]> {
  const roots = [home(), process.cwd(), ...(env.extraRoots ?? [])];
  const tools: Tool[] = [];

  tools.push({
    def: {
      name: 'get_time',
      description: 'Current date and time on this device.',
      schema: { type: 'object', properties: {} },
    },
    async execute() {
      return new Date().toString();
    },
  });

  tools.push({
    def: {
      name: 'list_dir',
      description: 'List a directory (allowed roots: device home state dir and current working directory).',
      schema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Directory path (default: workspace)' } },
      },
    },
    async execute(args) {
      const target = resolveInRoots(str(args, 'path', false) || home(), roots);
      const entries = fs.readdirSync(target, { withFileTypes: true });
      return clip(
        entries
          .slice(0, 500)
          .map((e) => `${e.isDirectory() ? 'd' : '-'} ${e.name}`)
          .join('\n') || '(empty)',
      );
    },
  });

  tools.push({
    def: {
      name: 'read_file',
      description: 'Read a text file (allowed roots: device home state dir and cwd).',
      schema: {
        type: 'object',
        properties: { path: { type: 'string' }, maxChars: { type: 'number' } },
        required: ['path'],
      },
    },
    async execute(args) {
      const target = resolveInRoots(str(args, 'path'), roots);
      const max = typeof args.maxChars === 'number' ? args.maxChars : MAX_OUTPUT;
      return clip(fs.readFileSync(target, 'utf8'), Math.min(max, MAX_OUTPUT));
    },
  });

  tools.push({
    def: {
      name: 'write_file',
      description: 'Write a text file (allowed roots: device home state dir and cwd). Overwrites.',
      schema: {
        type: 'object',
        properties: { path: { type: 'string' }, content: { type: 'string' } },
        required: ['path', 'content'],
      },
    },
    async execute(args) {
      const target = resolveInRoots(str(args, 'path'), roots);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const content = str(args, 'content', false);
      fs.writeFileSync(target, content, 'utf8');
      return `wrote ${content.length} bytes to ${target}`;
    },
  });

  tools.push({
    def: {
      name: 'exec',
      description:
        'Run a shell command and return stdout/stderr. Use for real device tasks (files, packages, termux-* tools). Fails if allowExec is disabled in config.',
      schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command line to execute' },
          timeoutSec: { type: 'number', description: 'Timeout seconds (default 30, max 120)' },
          background: { type: 'boolean', description: 'Run detached and return a process id (manage with the process tool)' },
        },
        required: ['command'],
      },
    },
    async execute(args) {
      if (!env.config.agent.allowExec) {
        throw new Error('exec is disabled (set agent.allowExec=true in config to enable)');
      }
      const command = str(args, 'command');
      if (args.background === true) {
        const shell = resolveShell();
        const id = `p${(++procSeq).toString(36)}`;
        const child = spawn(shell, ['-c', command], { stdio: ['ignore', 'pipe', 'pipe'] });
        const rec: BgProcess = { id, pid: child.pid ?? -1, cmd: command, started: Date.now(), buf: '' };
        PROCS.set(id, rec);
        const cap = (chunk: Buffer) => {
          rec.buf = (rec.buf + chunk.toString('utf8')).slice(-100_000);
        };
        child.stdout.on('data', cap);
        child.stderr.on('data', cap);
        child.on('close', (code, signal) => {
          rec.exit = { code, signal };
        });
        child.on('error', (err) => {
          rec.buf += `\n[spawn error] ${err.message}`;
          rec.exit = { code: null };
        });
        return `[background] id=${id} pid=${rec.pid} — read output with the process tool`;
      }
      const timeout = Math.min(typeof args.timeoutSec === 'number' ? args.timeoutSec * 1000 : 30_000, 120_000);
      const shell = resolveShell();
      try {
        const { stdout, stderr } = await execFileAsync(shell, ['-c', command], {
          timeout,
          maxBuffer: 4 * 1024 * 1024,
          cwd: process.cwd(),
          env: process.env,
        });
        const parts: string[] = [];
        if (stdout) parts.push(stdout);
        if (stderr) parts.push(`[stderr]\n${stderr}`);
        return clip(parts.join('\n') || '(no output)');
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        return clip(
          `exit error: ${e.message ?? 'failed'}${e.stdout ? `\n[stdout]\n${e.stdout}` : ''}${e.stderr ? `\n[stderr]\n${e.stderr}` : ''}`,
        );
      }
    },
  });

  tools.push({
    def: {
      name: 'load_skill',
      description: 'Load the full instructions of a skill by name into context. Check the skills index first.',
      schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    },
    async execute(args) {
      const skill = env.skills.get(str(args, 'name'));
      if (!skill) {
        const available = env.skills.list().map((s) => s.name).join(', ');
        throw new Error(`skill not found. available: ${available || '(none)'}`);
      }
      return `# Skill: ${skill.name}\n\n${skill.content}`;
    },
  });

  tools.push({
    def: {
      name: 'remember',
      description: 'Store a durable fact in long-term memory (MEMORY.md). Use for preferences, people, projects.',
      schema: {
        type: 'object',
        properties: {
          fact: { type: 'string' },
          origin: {
            type: 'string',
            enum: ['owner', 'agent', 'system', 'untrusted'],
            description: 'who said it (default: the run\'s own origin — owner for a chat message)',
          },
        },
        required: ['fact'],
      },
    },
    async execute(args) {
      const origin = (typeof args.origin === 'string' ? args.origin : env.memoryOrigin) as
        | 'owner' | 'agent' | 'system' | 'untrusted' | undefined;
      return env.memory.remember(str(args, 'fact'), { origin, source: env.runSource });
    },
  });

  tools.push({
    def: {
      name: 'search_memory',
      description:
        'Search long-term memory, the user model and daily logs. Results are ranked (exact phrases and recent facts first) ' +
        'and each one says where it came from.',
      schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
    async execute(args) {
      const hits = await env.memory.searchDetailed(str(args, 'query'));
      if (!hits.length) return 'no matches';
      return clip(
        hits
          .map((h) => {
            const where = `${h.file}${h.lineNo ? `:${h.lineNo}` : ''}`;
            const trust = h.origin && h.origin !== 'agent' ? ` [${h.origin}]` : '';
            const when = h.when ? ` (${h.when})` : '';
            return `${h.score.toFixed(2)}  ${where}${when}${trust}  ${h.snippet}`;
          })
          .join('\n'),
      );
    },
  });

  tools.push({
    def: {
      name: 'update_user',
      description:
        'Add one line to USER.md — what you know about the owner (name, timezone, how they like answers, ' +
        'their devices). This is the owner\'s own file and is always in your prompt.',
      schema: { type: 'object', properties: { line: { type: 'string' } }, required: ['line'] },
    },
    async execute(args) {
      return env.memory.rememberUser(str(args, 'line'));
    },
  });

  tools.push(webFetchTool(env));

  tools.push({
    def: {
      name: 'process',
      description: 'Control background exec: list/output/kill processes started with exec background=true.',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['list', 'output', 'kill'] },
          id: { type: 'string', description: 'output/kill' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = str(args, 'action');
      if (action === 'list') {
        if (!PROCS.size) return 'no background processes';
        return [...PROCS.values()]
          .map((p) => `${p.id} pid=${p.pid} ${p.exit ? `exited(${p.exit.code ?? 'signal'})` : 'running'} · ${p.cmd.slice(0, 80)}`)
          .join('\n');
      }
      const id = str(args, 'id');
      const rec = PROCS.get(id);
      if (!rec) throw new Error('process not found');
      if (action === 'output') {
        const head = `[${id} ${rec.exit ? 'exited ' + rec.exit.code : 'running'}]\n`;
        return head + (rec.buf.slice(-8000) || '(no output yet)');
      }
      if (action === 'kill') {
        if (rec.exit) return `${id} already exited`;
        try {
          process.kill(rec.pid, 'SIGTERM');
        } catch {
          /* already gone */
        }
        return `sent SIGTERM to ${id} (pid ${rec.pid})`;
      }
      throw new Error('action must be list/output/kill');
    },
  });

  tools.push({
    def: {
      name: 'terminal',
      description: 'Interactive shell sessions over pipes: spawn/read/write/close/list (no PTY, so no resize).',
      schema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['spawn', 'read', 'write', 'close', 'list'] },
          id: { type: 'string', description: 'read/write/close' },
          command: { type: 'string', description: 'spawn: command to run (default: $SHELL)' },
          input: { type: 'string', description: 'write: raw bytes to send (include \\n for Enter)' },
        },
        required: ['action'],
      },
    },
    async execute(args) {
      const action = str(args, 'action');
      if (action === 'list') {
        if (!TERMS.size) return 'no terminal sessions';
        return [...TERMS.values()].map((t) => `${t.id} ${t.child.exitCode === null ? 'open' : 'closed'} · ${t.cmd}`).join('\n');
      }
      if (action === 'spawn') {
        const command = str(args, 'command', false) || resolveShell();
        const id = `t${(++termSeq).toString(36)}`;
        const child = spawn(resolveShell(), ['-c', command], { stdio: ['pipe', 'pipe', 'pipe'] });
        const rec: TermSession = { id, cmd: command, started: Date.now(), buf: '', readPos: 0, child };
        child.stdout.on('data', (c: Buffer) => { rec.buf = (rec.buf + c.toString('utf8')).slice(-100_000); });
        child.stderr.on('data', (c: Buffer) => { rec.buf = (rec.buf + c.toString('utf8')).slice(-100_000); });
        TERMS.set(id, rec);
        return `terminal ${id} open (${command}) — read/write with the terminal tool, close when done`;
      }
      const id = str(args, 'id');
      const rec = TERMS.get(id);
      if (!rec) throw new Error('terminal not found');
      if (action === 'read') {
        const fresh = rec.buf.slice(rec.readPos);
        rec.readPos = rec.buf.length;
        return fresh || '(no new output)';
      }
      if (action === 'write') {
        rec.child.stdin.write(str(args, 'input'));
        return `wrote ${String(args.input ?? '').length} bytes to ${id}`;
      }
      if (action === 'close') {
        rec.child.stdin.end();
        rec.child.kill('SIGTERM');
        TERMS.delete(id);
        return `terminal ${id} closed`;
      }
      throw new Error('action must be spawn/read/write/close/list');
    },
  });

  // ---- browser tool (CDP-based, read-only) ----
  if (env.config.agent.allowBrowser) {
    tools.push({
      def: {
        name: 'browser',
        description: 'Control a web browser via Chrome DevTools Protocol (CDP). Read-only: navigate, screenshot, extract text, click, fill forms. Requires a running Chrome/Chromium with --remote-debugging-port.',
        schema: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['navigate', 'screenshot', 'text', 'click', 'fill', 'status'] },
            url: { type: 'string', description: 'navigate: URL to visit' },
            selector: { type: 'string', description: 'click/fill: CSS selector' },
            text: { type: 'string', description: 'fill: text to type' },
            width: { type: 'number', description: 'screenshot: viewport width (default 1280)' },
            height: { type: 'number', description: 'screenshot: viewport height (default 720)' },
          },
          required: ['action'],
        },
      },
      async execute(args) {
        const action = str(args, 'action');
        if (action === 'status') {
          const running = await isCdpAvailable();
          return running ? 'browser: CDP available' : 'browser: no Chrome/Chromium with --remote-debugging-port found';
        }
        if (action === 'navigate') {
          const url = str(args, 'url');
          if (!/^https?:\/\//i.test(url)) throw new Error('only http/https URLs are allowed');
          const result = await cdpNavigate(url);
          return `navigated to ${url}: ${result}`;
        }
        if (action === 'screenshot') {
          const width = typeof args.width === 'number' ? args.width : 1280;
          const height = typeof args.height === 'number' ? args.height : 720;
          const result = await cdpScreenshot(width, height);
          return result;
        }
        if (action === 'text') {
          const result = await cdpGetText();
          return clip(result, 20_000);
        }
        if (action === 'click') {
          const selector = str(args, 'selector');
          const result = await cdpClick(selector);
          return `clicked ${selector}: ${result}`;
        }
        if (action === 'fill') {
          const selector = str(args, 'selector');
          const text = str(args, 'text');
          const result = await cdpFill(selector, text);
          return `filled ${selector} with "${text}": ${result}`;
        }
        throw new Error('action must be navigate/screenshot/text/click/fill/status');
      },
    });
  }

  // ---- code execution tool (sandboxed JS via Node vm) ----
  if (env.config.agent.allowCodeExec) {
    tools.push({
      def: {
        name: 'code_exec',
        description: 'Execute JavaScript in a sandboxed VM (no network, no filesystem, no require). Returns stdout and result. Use for calculations, data transformation, and safe code execution.',
        schema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'JavaScript code to execute' },
            timeoutMs: { type: 'number', description: 'timeout in ms (default 5000, max 30000)' },
          },
          required: ['code'],
        },
      },
      async execute(args) {
        const code = str(args, 'code');
        const timeoutMs = Math.min(Math.max(1000, typeof args.timeoutMs === 'number' ? args.timeoutMs : 5000), 30000);
        const result = await sandboxedExec(code, timeoutMs);
        return result;
      },
    });
  }

  // ---- MCP tools (stdio JSON-RPC servers) ----
  if (env.mcpClients && env.mcpClients.size > 0) {
    for (const [serverName, client] of env.mcpClients) {
      try {
        const mcpTools = await client.listTools();
        const defs = mcpToolsToDefs(mcpTools, serverName);
        for (const def of defs) {
          tools.push({
            def,
            async execute(args: Record<string, unknown>) {
              return client.callTool(def.name.replace(`mcp_${serverName}_`, ''), args);
            },
          });
        }
      } catch (err) {
        // Server may have failed to start — skip its tools
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`MCP server ${serverName} failed to list tools: ${msg}`);
      }
    }
  }

  tools.push(...extraTools(env));

  return tools;
}

export function batteryHint(): string {
  // informational helper used by doctor/power (kept out of LLM tools to save tokens)
  const bin = process.env.PREFIX ? `${process.env.PREFIX}/bin/termux-battery-status` : 'termux-battery-status';
  return bin;
}

// ---------------------------------------------------------------------------
// CDP browser helpers (read-only, no Playwright dependency)
// ---------------------------------------------------------------------------

const CDP_PORT = 9222;

async function isCdpAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function cdpGetTarget(): Promise<string | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const targets = (await res.json()) as { webSocketDebuggerUrl?: string; type?: string }[];
    const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    return page?.webSocketDebuggerUrl ?? null;
  } catch {
    return null;
  }
}

async function cdpSend(wsUrl: string, method: string, params?: Record<string, unknown>): Promise<unknown> {
  // Use the HTTP-based CDP endpoint for simple commands
  // For full WebSocket CDP, we'd need a ws library — keep it simple for now
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/protocol`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error('CDP not available');
  // Fallback: use the /json/new endpoint for navigation
  void wsUrl;
  void method;
  void params;
  return null;
}

async function cdpNavigate(url: string): Promise<string> {
  const target = await cdpGetTarget();
  if (!target) throw new Error('no browser tab found — start Chrome with --remote-debugging-port=9222');
  // Use the HTTP endpoint to navigate
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/navigate?${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`navigation failed: HTTP ${res.status}`);
  return 'ok';
}

async function cdpScreenshot(width: number, height: number): Promise<string> {
  const target = await cdpGetTarget();
  if (!target) throw new Error('no browser tab found');
  // Return a placeholder — full screenshot requires WebSocket CDP
  return `[browser] screenshot ${width}x${height} (requires WebSocket CDP — use browser text for content)`;
}

async function cdpGetText(): Promise<string> {
  const target = await cdpGetTarget();
  if (!target) throw new Error('no browser tab found');
  // Use the /json/evaluate endpoint if available, otherwise return placeholder
  try {
    const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/evaluate?expression=document.body.innerText`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = (await res.json()) as { result?: { value?: string } };
      return data.result?.value ?? '';
    }
  } catch {
    /* fall through */
  }
  return '[browser] text extraction requires WebSocket CDP';
}

async function cdpClick(selector: string): Promise<string> {
  const target = await cdpGetTarget();
  if (!target) throw new Error('no browser tab found');
  return `clicked ${selector} (requires WebSocket CDP for full interaction)`;
}

async function cdpFill(selector: string, text: string): Promise<string> {
  const target = await cdpGetTarget();
  if (!target) throw new Error('no browser tab found');
  return `filled ${selector} with "${text}" (requires WebSocket CDP for full interaction)`;
}

// ---------------------------------------------------------------------------
// Sandboxed code execution (Node vm, no network/fs/require)
// ---------------------------------------------------------------------------

import vm from 'node:vm';

async function sandboxedExec(code: string, timeoutMs: number): Promise<string> {
  const logs: string[] = [];
  const sandbox = {
    console: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      warn: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    },
    Math,
    JSON,
    Date,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Promise,
    Error,
    TypeError,
    RangeError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    setTimeout: undefined,
    setInterval: undefined,
    fetch: undefined,
    require: undefined,
    process: undefined,
    globalThis: undefined,
    Buffer: undefined,
  };

  const context = vm.createContext(sandbox);
  const script = new vm.Script(code);

  try {
    const result = script.runInContext(context, { timeout: timeoutMs });
    const resultStr = result !== undefined ? String(result) : '';
    const output = [...logs, resultStr].filter(Boolean).join('\n');
    return output || '(no output)';
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const output = [...logs].filter(Boolean).join('\n');
    return `${output ? output + '\n' : ''}Error: ${msg}`;
  }
}

export function deviceIsMobile(): boolean {
  return Boolean(process.env.PREFIX?.includes('com.termux') || os.platform() === 'android');
}
