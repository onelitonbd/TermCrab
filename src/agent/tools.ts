import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { Config } from '../core/config.js';
import { home } from '../core/paths.js';
import { MemoryStore } from './memory.js';
import { SkillStore } from '../skills/loader.js';
import { ToolDef } from '../providers/types.js';

const execFileAsync = promisify(execFile);

export interface ToolEnv {
  config: Config;
  memory: MemoryStore;
  skills: SkillStore;
  /** Root the agent may read/write without exec (state dir + cwd). */
  extraRoots?: string[];
  fetchImpl?: typeof fetch;
}

export interface Tool {
  def: ToolDef;
  execute(args: Record<string, unknown>): Promise<string>;
}

const MAX_OUTPUT = 20_000;

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

export function buildTools(env: ToolEnv): Tool[] {
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
        },
        required: ['command'],
      },
    },
    async execute(args) {
      if (!env.config.agent.allowExec) {
        throw new Error('exec is disabled (set agent.allowExec=true in config to enable)');
      }
      const command = str(args, 'command');
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
      schema: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'] },
    },
    async execute(args) {
      return env.memory.remember(str(args, 'fact'));
    },
  });

  tools.push({
    def: {
      name: 'search_memory',
      description: 'Search long-term memory and daily logs. Returns matching lines.',
      schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
    async execute(args) {
      const hits = await env.memory.search(str(args, 'query'));
      if (!hits.length) return 'no matches';
      return clip(hits.map((h) => `[${h.file}] ${h.line}`).join('\n'));
    },
  });

  tools.push(webFetchTool(env));

  return tools;
}

export function batteryHint(): string {
  // informational helper used by doctor/power (kept out of LLM tools to save tokens)
  const bin = process.env.PREFIX ? `${process.env.PREFIX}/bin/termux-battery-status` : 'termux-battery-status';
  return bin;
}

export function deviceIsMobile(): boolean {
  return Boolean(process.env.PREFIX?.includes('com.termux') || os.platform() === 'android');
}
