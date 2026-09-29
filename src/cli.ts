import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';
import { loadConfig, saveConfig, cfgGet, cfgSet, describeConfigLocation, generateToken } from './core/config.js';
import { ensureLayout, home, workspaceDir, memoryDir, configPath } from './core/paths.js';
import { log, setLogLevel } from './core/logger.js';
import { onboard, OnboardFlags } from './onboard.js';
import { startGateway, version } from './gateway/server.js';
import { runSupervisor } from './mobile/supervisor.js';
import { runDoctor, renderChecks, verifyTelegram } from './mobile/doctor.js';
import { installBootScript, bootStatus, isTermux } from './mobile/boot.js';
import { MemoryStore } from './agent/memory.js';
import { SkillStore } from './skills/loader.js';
import { AgentCtx, runTurn, providerLabel } from './agent/loop.js';
import { SessionStore } from './agent/sessions.js';
import { runHeartbeatOnce } from './agent/heartbeat.js';
import { AgentEvent } from './agent/loop.js';

const HELP = `🦀 TermCrab - the always-on AI agent that lives in your Termux

Usage: termcrab <command> [options]

Commands:
  onboard [--provider p --model m --api-key k --base-url u --telegram-token t --allow-user ids --name n --no-exec --non-interactive]
  gateway [--host h --port p]        Run the gateway (HTTP API + SSE + channels)
  supervisor                         Run gateway with auto-restart watchdog
  agent [message...] [--session s]   Chat (one-shot or interactive REPL)
  doctor [--json]                    Diagnose the installation
  heartbeat                          Run one proactive heartbeat tick now
  skills [list|show <name>]          Inspect skills
  memory [show|search <query>]       Inspect memory files
  boot [install|status]              Termux:Boot auto-start management
  config [path|get <k>|set <k> <v>|list]
  version                            Print version
  help                               This help

Examples:
  termcrab onboard --non-interactive --provider anthropic --model claude-sonnet-4-5 --api-key sk-ant-...
  termcrab agent "what can you do?"
  termcrab config set channels.telegram.allowedUserIds [123456789]
`;

function printEvents(ev: AgentEvent): void {
  switch (ev.type) {
    case 'tool:start': {
      const args = Object.entries(ev.args)
        .map(([k, v]) => `${k}=${String(v).slice(0, 60)}`)
        .join(' ');
      process.stdout.write(`\n  ⚡ ${ev.name}(${args})\n`);
      break;
    }
    case 'tool:end':
      process.stdout.write(`     ${ev.ok ? '✓' : '✗'} ${ev.preview.slice(0, 160).replace(/\n/g, ' ')}\n`);
      break;
    case 'delta':
      process.stdout.write(ev.text);
      break;
    case 'error':
      process.stdout.write(`\n\x1b[31m[error] ${ev.message}\x1b[0m\n`);
      break;
    default:
      break;
  }
}

function makeAgentCtx() {
  const config = loadConfig();
  const memory = new MemoryStore();
  const skills = new SkillStore();
  const sessions = new SessionStore();
  const ctx: AgentCtx = { config, memory, skills, sessions };
  return ctx;
}

export async function main(argv: string[]): Promise<void> {
  const [cmd = 'help', ...rest] = argv;

  if (process.env.TCRAB_LOG_LEVEL === 'debug') setLogLevel('debug');

  switch (cmd) {
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return;

    case 'version':
    case '--version':
    case '-v':
      console.log(`termcrab ${version()} (node ${process.version})`);
      return;

    case 'onboard': {
      const { values } = parseArgs({
        args: rest,
        options: {
          'non-interactive': { type: 'boolean', default: false },
          provider: { type: 'string' },
          model: { type: 'string' },
          'api-key': { type: 'string' },
          'base-url': { type: 'string' },
          'telegram-token': { type: 'string' },
          'allow-user': { type: 'string' },
          name: { type: 'string' },
          port: { type: 'string' },
          'no-exec': { type: 'boolean', default: false },
        },
      });
      const flags: OnboardFlags = {
        nonInteractive: Boolean(values['non-interactive']),
        provider: values.provider,
        model: values.model,
        apiKey: values['api-key'],
        baseUrl: values['base-url'],
        telegramToken: values['telegram-token'],
        allowUser: values['allow-user'],
        name: values.name,
        port: values.port,
        noExec: Boolean(values['no-exec']),
      };
      await onboard(flags);
      return;
    }

    case 'gateway': {
      const { values } = parseArgs({
        args: rest,
        options: { host: { type: 'string' }, port: { type: 'string' } },
      });
      const config = loadConfig();
      ensureLayout();
      const handle = await startGateway({
        config,
        host: values.host,
        port: values.port ? Number(values.port) : undefined,
      });
      const label = `${config.gateway.host}:${handle.port}`;
      log.info(`gateway listening on http://${label}/  (provider: ${providerLabel(config)})`);
      log.info(`control UI token: ${config.gateway.token}`);
      log.info('press Ctrl+C to stop');

      const shutdown = async () => {
        log.info('shutting down...');
        await handle.stop();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      // keep process alive
      await new Promise(() => undefined);
      return;
    }

    case 'supervisor':
      await runSupervisor();
      return;

    case 'doctor': {
      const { values } = parseArgs({ args: rest, options: { json: { type: 'boolean', default: false } } });
      const checks = await runDoctor();
      if (values.json) {
        console.log(JSON.stringify(checks, null, 2));
      } else {
        const r = renderChecks(checks);
        console.log(r.text);
        if (r.failed) process.exitCode = 1;
      }
      return;
    }

    case 'agent': {
      const { values, positionals } = parseArgs({
        args: rest,
        options: { session: { type: 'string', default: 'cli:main' } },
        allowPositionals: true,
      });
      const ctx = makeAgentCtx();
      const sessionId = values.session || 'cli:main';
      const message = positionals.join(' ').trim();

      if (message) {
        const text = await runTurn(ctx, { sessionId, userMessage: message, channel: 'cli', onEvent: printEvents });
        console.log(`\n`);
        if (!text) console.log('(no reply)');
        return;
      }

      // Interactive REPL
      console.log(`🦀 ${ctx.config.agent.name} - ${providerLabel(ctx.config)}  (type "exit" to quit, "/new" to reset)`);
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        for (;;) {
          const line = (await rl.question('\n> ')).trim();
          if (!line) continue;
          if (line === 'exit' || line === 'quit') break;
          if (line === '/new') {
            ctx.sessions.reset(sessionId);
            console.log('(session reset)');
            continue;
          }
          process.stdout.write('\n');
          await runTurn(ctx, { sessionId, userMessage: line, channel: 'cli', onEvent: printEvents });
          process.stdout.write('\n');
        }
      } finally {
        rl.close();
      }
      return;
    }

    case 'heartbeat': {
      const ctx = makeAgentCtx();
      const res = await runHeartbeatOnce(ctx);
      console.log(res.ran ? `✅ heartbeat ran (${res.reason})\n\n${res.output}` : `⏭️ skipped: ${res.reason}`);
      return;
    }

    case 'skills': {
      const [sub = 'list', name] = rest;
      const store = new SkillStore();
      if (sub === 'show') {
        if (!name) {
          console.error('usage: termcrab skills show <name>');
          process.exitCode = 1;
          return;
        }
        const skill = store.get(name);
        if (!skill) {
          console.error(`skill not found: ${name}`);
          process.exitCode = 1;
          return;
        }
        console.log(`# ${skill.name} [${skill.origin}]\n${skill.description}\n\n${skill.content}`);
        return;
      }
      const list = store.list();
      if (!list.length) {
        console.log('no skills found');
        return;
      }
      for (const s of list) console.log(`${s.name.padEnd(20)} [${s.origin}] ${s.description}`);
      return;
    }

    case 'memory': {
      const [sub = 'show', ...queryParts] = rest;
      const memory = new MemoryStore();
      if (sub === 'search') {
        const q = queryParts.join(' ');
        if (!q) {
          console.error('usage: termcrab memory search <query>');
          process.exitCode = 1;
          return;
        }
        const hits = memory.search(q);
        if (!hits.length) console.log('no matches');
        else for (const h of hits) console.log(`[${h.file}] ${h.line}`);
        return;
      }
      console.log(memory.readHead(8000));
      console.log(`\n--- stats: ${JSON.stringify(memory.stats())} | files: ${memoryDir()}`);
      return;
    }

    case 'boot': {
      const [sub = 'status'] = rest;
      if (sub === 'install') {
        const r = installBootScript();
        console.log(`${r.created ? '✅ created' : '♻️ updated'} ${r.path}`);
        if (!isTermux()) console.log('ℹ️ not detected as Termux - script will only matter on-device.');
        console.log('Also: install the "Termux:Boot" app from F-Droid and run `termux-wake-lock`.');
        return;
      }
      const s = bootStatus();
      console.log(`boot script: ${s.installed ? '✅ installed' : '⚠️ not installed'} (${s.path})\ntermux detected: ${s.termux ? 'yes' : 'no'}`);
      return;
    }

    case 'config': {
      const [sub = 'list', key, ...valueParts] = rest;
      const cfg = loadConfig();
      if (sub === 'path') {
        console.log(describeConfigLocation());
        return;
      }
      if (sub === 'get') {
        if (!key) {
          console.error('usage: termcrab config get <key>');
          process.exitCode = 1;
          return;
        }
        const v = cfgGet(cfg, key);
        console.log(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));
        return;
      }
      if (sub === 'set') {
        if (!key || !valueParts.length) {
          console.error('usage: termcrab config set <key> <value>');
          process.exitCode = 1;
          return;
        }
        const value = valueParts.join(' ');
        const next = cfgSet(cfg, key, value);
        // Special: rotating token
        if (key === 'gateway.token' && value === 'generate') next.gateway.token = generateToken();
        saveConfig(next);
        console.log(`✅ ${key} = ${JSON.stringify(cfgGet(next, key))}`);
        return;
      }
      // redacted list
      const redacted = JSON.parse(JSON.stringify(cfg)) as Record<string, unknown>;
      const provider = redacted.provider as Record<string, unknown>;
      if (provider.apiKey) provider.apiKey = String(provider.apiKey).slice(0, 6) + '…';
      const tg = (redacted.channels as Record<string, unknown>).telegram as Record<string, unknown> | undefined;
      if (tg?.token) tg.token = String(tg.token).slice(0, 8) + '…';
      console.log(JSON.stringify(redacted, null, 2));
      console.log(`\n(${configPath()})`);
      return;
    }

    default:
      console.error(`unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}
