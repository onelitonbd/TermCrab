import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  Config,
  DEFAULT_MODEL_HINTS,
  defaults,
  generateToken,
  loadConfig,
  saveConfig,
} from './core/config.js';
import { ensureLayout, workspaceDir, home } from './core/paths.js';
import { verifyTelegram } from './mobile/doctor.js';

export interface OnboardFlags {
  nonInteractive: boolean;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  telegramToken?: string;
  allowUser?: string;
  name?: string;
  port?: string;
  noExec?: boolean;
}

function writeIfMissing(file: string, content: string): boolean {
  if (fs.existsSync(file)) return false;
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

export function seedWorkspace(name: string): void {
  ensureLayout();
  const ws = workspaceDir();
  writeIfMissing(
    path.join(ws, 'SOUL.md'),
    `# SOUL\n\n- Name: ${name}\n- Tone: friendly, concise, practical\n- You live on the user's own device (Termux/phone or desktop).\n- Prefer doing over describing: use tools, then report results.\n`,
  );
  writeIfMissing(
    path.join(ws, 'HEARTBEAT.md'),
    `# Heartbeat\n\n- Check for anything urgent in memory or recent tasks\n- If the user left a pending task, follow up on it\n- When nothing needs attention, stay silent (reply: "all clear")\n`,
  );
}

async function prompt(rl: readline.Interface, question: string, def = ''): Promise<string> {
  const suffix = def ? ` [${def}]` : '';
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || def;
}

/** True when the current config does not yet have a usable provider. */
export function configNeedsProvider(cfg: Config): boolean {
  // If the user saved at least one provider entry with a key, they're set.
  for (const p of cfg.providers) if (p.keys.length) return false;
  // Otherwise they need an apiKey on the primary provider.
  return !cfg.provider.apiKey;
}

export async function onboard(flags: OnboardFlags): Promise<void> {
  ensureLayout();
  const existing = fs.existsSync(path.join(home(), 'config.json')) ? loadConfig() : defaults();
  const cfg: Config = existing;
  if (!cfg.gateway.token) cfg.gateway.token = generateToken();

  // 'mock' = the offline brain (no network, no key); every other alias means
  // the OpenAI-compatible wire format.
  const providerType = normalizeProvider(flags.provider ?? '');
  cfg.provider.type = providerType;
  const offline = providerType === 'mock';
  if (offline) {
    cfg.provider.apiKey = '';
    cfg.provider.baseUrl = undefined;
    cfg.provider.model = flags.model || cfg.provider.model || 'mock-1';
  }

  if (flags.nonInteractive || offline) {
    if (flags.model) cfg.provider.model = flags.model;
    if (flags.apiKey) cfg.provider.apiKey = flags.apiKey;
    if (flags.baseUrl) cfg.provider.baseUrl = flags.baseUrl;
    if (flags.name) cfg.agent.name = flags.name;
    if (flags.port) cfg.gateway.port = Number(flags.port);
    if (flags.noExec) cfg.agent.allowExec = false;
    if (flags.telegramToken) {
      cfg.channels.telegram = {
        token: flags.telegramToken,
        allowedUserIds: flags.allowUser ? String(flags.allowUser).split(',').map((s) => Number(s.trim())).filter((n) => n > 0) : [],
        ...(cfg.channels.telegram?.notifyChatId ? { notifyChatId: cfg.channels.telegram.notifyChatId } : {}),
      };
    }
    saveConfig(cfg);
    seedWorkspace(cfg.agent.name);
    console.log(
      offline
        ? `✅ onboarded (offline brain: mock) -> ${path.join(home(), 'config.json')}`
        : `✅ onboarded (non-interactive) -> ${path.join(home(), 'config.json')}`,
    );
    printNextSteps(cfg);
    return;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n🦀 TermCrab onboard - your AI agent lives here now.\n');
    console.log('   TermCrab speaks the OpenAI Chat Completions API. It works with OpenAI,');
    console.log('   OpenRouter, Groq, DeepSeek, xAI, Mistral, Ollama (/v1), vLLM, llama.cpp,');
    console.log('   and most other local or self-hosted servers.\n');

    const hasKey = Boolean(cfg.provider.apiKey);
    const defaultModel = cfg.provider.model || DEFAULT_MODEL_HINTS.openai || 'gpt-4o-mini';
    const defaultBase = cfg.provider.baseUrl || '';

    const key = await prompt(rl, 'API key (empty = skip for now, e.g. for local Ollama)', cfg.provider.apiKey || '');
    if (key) cfg.provider.apiKey = key;
    const base = await prompt(
      rl,
      'Base URL (empty = https://api.openai.com/v1; use http://127.0.0.1:11434/v1 for Ollama)',
      defaultBase,
    );
    cfg.provider.baseUrl = base || undefined;
    const model = await prompt(rl, 'Model', defaultModel);
    cfg.provider.model = model;

    if (!hasKey && !cfg.provider.apiKey) {
      console.log('   (no API key saved yet - you can add one later with: termcrab config set provider.apiKey <key>)');
    }

    const name = await prompt(rl, 'Agent name', cfg.agent.name || 'Crabby');
    cfg.agent.name = name;

    const execAns = (await prompt(rl, 'Allow shell commands? (y/n)', cfg.agent.allowExec ? 'y' : 'n')).toLowerCase();
    cfg.agent.allowExec = execAns.startsWith('y');

    const tg = (await prompt(rl, 'Telegram bot token (from @BotFather, empty to skip)', cfg.channels.telegram?.token || '')).trim();
    if (tg) {
      console.log('   verifying token...');
      const err = await verifyTelegram(tg);
      if (err) console.log(`   ⚠️ token verify failed: ${err} (saved anyway)`);
      else console.log('   ✅ token OK');
      let users = cfg.channels.telegram?.allowedUserIds ?? [];
      const allow = (await prompt(rl, 'Allowed telegram user ids (comma separated, REQUIRED for channel to start)', users.join(','))).trim();
      users = allow.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      cfg.channels.telegram = {
        token: tg,
        allowedUserIds: users,
        ...(cfg.channels.telegram?.notifyChatId ? { notifyChatId: cfg.channels.telegram.notifyChatId } : {}),
      };
      if (!users.length) console.log('   ⚠️ empty allowlist: telegram channel stays OFF (secure default).');
    }

    saveConfig(cfg);
    seedWorkspace(cfg.agent.name);
    console.log(`\n✅ config saved -> ${path.join(home(), 'config.json')}`);
    printNextSteps(cfg);
  } finally {
    rl.close();
  }
}

/**
 * Map a provider name to a real provider type. TermCrab speaks the OpenAI Chat
 * Completions wire format, so every legacy alias (anthropic, gemini, ollama …)
 * lands on 'openai'. The offline brain is the one exception: 'mock' (also
 * 'demo' / 'offline') really is a different provider — no network, no key.
 */
export function normalizeProvider(raw: string): Config['provider']['type'] {
  const v = raw.trim().toLowerCase();
  if (v === 'mock' || v === 'demo' || v === 'offline') return 'mock';
  return 'openai';
}

function printNextSteps(cfg: Config): void {
  console.log(`\nNext steps:
  1. Start the gateway:     termcrab gateway
     Auto-restart version:  termcrab supervisor
  2. Open control UI:       http://127.0.0.1:${cfg.gateway.port}/  (password: termcrab config get gateway.token)
  3. Chat in terminal:      termcrab agent "hello"
  4. Run a health check:    termcrab doctor
  5. Phone auto-start:      termcrab boot install   (Termux + Termux:Boot app)

Config: ${path.join(home(), 'config.json')}
Workspace (SOUL.md / HEARTBEAT.md): ${workspaceDir()}
`);
}
