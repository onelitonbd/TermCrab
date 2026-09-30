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

export async function onboard(flags: OnboardFlags): Promise<void> {
  ensureLayout();
  const existing = fs.existsSync(path.join(home(), 'config.json')) ? loadConfig() : defaults();
  const cfg: Config = existing;
  if (!cfg.gateway.token) cfg.gateway.token = generateToken();

  if (flags.nonInteractive) {
    if (flags.provider) cfg.provider.type = normalizeProvider(flags.provider);
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
      if (cfg.provider.type === 'mock' && !flags.apiKey) cfg.provider.type = 'mock';
    }
    saveConfig(cfg);
    seedWorkspace(cfg.agent.name);
    console.log(`✅ onboarded (non-interactive) -> ${path.join(home(), 'config.json')}`);
    printNextSteps(cfg);
    return;
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log('\n🦀 TermCrab onboard - your AI agent lives here now.\n');

    const providerRaw = await prompt(
      rl,
      'Provider (anthropic / openai / ollama / openrouter / groq / mock)',
      cfg.provider.type === 'mock' && !flags.apiKey ? 'mock' : cfg.provider.type,
    );
    const provider = normalizeProvider(providerRaw);
    cfg.provider.type = provider;

    if (provider !== 'mock') {
      const key = await prompt(rl, 'API key (empty = none yet)');
      if (key) cfg.provider.apiKey = key;
      const base = await prompt(rl, 'Base URL (empty = official endpoint)');
      if (base) cfg.provider.baseUrl = base;
      const model = await prompt(rl, 'Model', DEFAULT_MODEL_HINTS[provider] || '');
      cfg.provider.model = model;
    } else {
      cfg.provider = { type: 'mock', model: 'mock-1' };
      console.log('   (mock provider: fully offline demo, switch later with: termcrab onboard)');
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

export function normalizeProvider(raw: string): Config['provider']['type'] {
  const v = raw.trim().toLowerCase();
  if (['anthropic', 'claude'].includes(v)) return 'anthropic';
  if (['mock', 'demo', 'offline'].includes(v)) return 'mock';
  // openai, openrouter, groq, ollama, deepseek, custom -> openai-compatible
  return 'openai';
}

function printNextSteps(cfg: Config): void {
  console.log(`
Next steps:
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
