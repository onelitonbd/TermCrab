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
import { runDoctor, renderChecks, verifyTelegram, execExists } from './mobile/doctor.js';
import { installBootScript, bootStatus, isTermux } from './mobile/boot.js';
import { importSkills } from './skills/importer.js';
import { addCron, loadCrons, removeCron, setCronEnabled, getCron } from './cron/store.js';
import { nextRun, parseCron } from './cron/parser.js';
import { listAgents, agentExists, sanitizeAgentName } from './agent/prompt.js';
import { speak } from './mobile/tts.js';
import { EmbeddingIndex, tryLoadEmbedder } from './agent/embed.js';
import { runDream } from './agent/dream.js';
import { runWakeLoop } from './mobile/wake.js';
import { statusReport } from './agent/status.js';
import { resolveProvider } from './providers/index.js';
import { MemoryStore } from './agent/memory.js';
import { SkillStore } from './skills/loader.js';
import { AgentCtx, runTurn, providerLabel } from './agent/loop.js';
import { SessionStore } from './agent/sessions.js';
import { runHeartbeatOnce } from './agent/heartbeat.js';
import { AgentEvent } from './agent/loop.js';

const HELP = `🦀 TermCrab — your personal AI assistant that runs on your own device.

Everything stays yours: the chats, the memory files, the settings.

Start here (the 5 commands most people ever need):
  termcrab status           plain-English overview: brain, memory, schedule, battery
  termcrab agent "ask..."   talk to your assistant (no message = open a chat session)
  termcrab gateway          start the web control panel (open the printed address in a browser)
  termcrab dream            "sleep on it" — turn today's chats into long-term memory
  termcrab doctor           health check: tells you what's broken and exactly how to fix it

Everyday extras:
  termcrab agent "msg" --as <name>   talk to a named agent (workspace/agents/<name>/SOUL.md)
  termcrab agent "msg" --tier local  run this one task on your own local model, if set up
  termcrab say <text>                speak text aloud
  termcrab wake                      voice mode: say the keyword, then say your command
  termcrab memory [show|search ...]  look inside memory
  termcrab skills [list|import ...]  add extra abilities (skill folders, git repos)
  termcrab cron [ls|add ...]         schedule jobs that repeat ("0 8 * * *" = 8am daily)
  termcrab heartbeat                 run one self-check right now
  termcrab boot [install|status]     start automatically when the phone boots
  termcrab config [get|set|list]     change settings (same settings live in the web panel)
  termcrab supervisor                start the gateway with auto-restart (always-on mode)
  termcrab onboard                   first-time setup wizard
      options: --provider p --model m --api-key k --base-url u --telegram-token t
               --allow-user ids --name n --no-exec --non-interactive
  termcrab version | help

Examples:
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

async function makeMemoryStore(): Promise<MemoryStore> {
  const config = loadConfig();
  return buildMemoryStore(config);
}

async function buildMemoryStore(config: ReturnType<typeof loadConfig>): Promise<MemoryStore> {
  let index: EmbeddingIndex | undefined;
  if (config.memory?.embeddings) {
    try {
      const embedder = await tryLoadEmbedder(path.join(home(), 'models'));
      if (embedder) index = new EmbeddingIndex(path.join(memoryDir(), 'index.jsonl'), embedder);
    } catch {
      /* lexical-only fallback */
    }
  }
  return new MemoryStore(memoryDir(), index);
}

async function makeAgentCtx() {
  const config = loadConfig();
  const memory = await buildMemoryStore(config);
  const skills = new SkillStore();
  const sessions = new SessionStore();
  let localProvider;
  if (config.localProvider?.enabled && config.localProvider.model) {
    try {
      localProvider = resolveProvider({
        type: 'openai',
        baseUrl: config.localProvider.baseUrl,
        model: config.localProvider.model,
        apiKey: config.localProvider.apiKey || 'local',
      });
    } catch {
      localProvider = undefined;
    }
  }
  const ctx: AgentCtx = { config, memory, skills, sessions, localProvider };
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
      const boundHost = values.host ?? config.gateway.host;
      const openHost = boundHost === '0.0.0.0' || boundHost === '::' ? 'localhost' : boundHost;
      log.info(`gateway listening on http://${openHost}:${handle.port}/  (provider: ${providerLabel(config)})`);
      if (openHost !== boundHost) log.info('openable from other devices on this network (use this machine\'s IP address)');
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

    case 'say': {
      const text = rest.join(' ').trim();
      if (!text) {
        console.error('usage: termcrab say <text>');
        process.exitCode = 1;
        return;
      }
      const result = await speak(text);
      if (result.ok) console.log(`🔊 spoke via ${result.backend}`);
      else {
        console.error(`tts failed: ${result.error}`);
        process.exitCode = 1;
      }
      return;
    }

    case 'agent': {
      const { values, positionals } = parseArgs({
        args: rest,
        options: {
          session: { type: 'string', default: 'cli:main' },
          as: { type: 'string' },
          tier: { type: 'string' },
        },
        allowPositionals: true,
      });
      const ctx = await makeAgentCtx();
      const tier: 'local' | 'cloud' | undefined = values.tier === 'local' ? 'local' : undefined;
      const sessionId = values.session || 'cli:main';
      let currentAgent = values.as ? sanitizeAgentName(values.as) ?? undefined : undefined;
      if (values.as && !currentAgent) {
        console.error(`invalid agent name: ${values.as} (use lowercase letters, digits, - or _)`);
        process.exitCode = 1;
        return;
      }
      if (currentAgent && !agentExists(currentAgent)) {
        console.error(`agent "${currentAgent}" not found (no workspace/agents/${currentAgent}/SOUL.md)`);
        console.error(`known agents: ${listAgents().join(', ') || '(none)'}`);
        process.exitCode = 1;
        return;
      }
      const message = positionals.join(' ').trim();
      const label = () => `${currentAgent ?? ctx.config.agent.name}`;

      if (message) {
        await runTurn(ctx, {
          sessionId,
          userMessage: message,
          channel: 'cli',
          agent: currentAgent,
          tier,
          onEvent: printEvents,
        });
        console.log(`\n`);
        return;
      }

      // Interactive REPL
      console.log(
        `🦀 ${label()} [${providerLabel(ctx.config)}] - as: ${currentAgent ?? '(default)'}. ` +
          `Commands: /agents, /as <name>, /new, exit`,
      );
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        for (;;) {
          const line = (await rl.question('\n> ')).trim();
          if (!line) continue;
          if (line === 'exit' || line === 'quit') break;
          if (line === '/new') {
            ctx.sessions.reset(currentAgent ? `${currentAgent}:${sessionId}` : sessionId);
            console.log('(session reset)');
            continue;
          }
          if (line === '/agents') {
            const agents = listAgents();
            console.log(agents.length ? agents.map((a) => ` @${a}`).join('\n') : '(no named agents)');
            continue;
          }
          if (line.startsWith('/as ')) {
            const name = sanitizeAgentName(line.slice(4).trim());
            if (name && agentExists(name)) {
              currentAgent = name;
              console.log(`switched to agent @${name}`);
            } else {
              console.log(`unknown agent. known: ${listAgents().join(', ') || '(none)'}`);
            }
            continue;
          }
          process.stdout.write('\n');
          await runTurn(ctx, {
            sessionId,
            userMessage: line,
            channel: 'cli',
            agent: currentAgent,
            tier,
            onEvent: printEvents,
          });
          process.stdout.write('\n');
        }
      } finally {
        rl.close();
      }
      return;
    }

    case 'heartbeat': {
      const ctx = await makeAgentCtx();
      const res = await runHeartbeatOnce(ctx);
      console.log(res.ran ? `✅ heartbeat ran (${res.reason})\n\n${res.output}` : `⏭️ skipped: ${res.reason}`);
      return;
    }

    case 'skills': {
      const [sub = 'list', source] = rest;
      const store = new SkillStore();
      if (sub === 'import') {
        if (!source) {
          console.error('usage: termcrab skills import <folder|git-url> [--force]');
          process.exitCode = 1;
          return;
        }
        const force = rest.includes('--force');
        console.log(`importing from ${source} ...`);
        try {
          const results = await importSkills(source, { force });
          for (const r of results) {
            const icon = r.action === 'skipped' ? '⏭️' : '✅';
            console.log(`${icon} ${r.action}: ${r.name}`);
          }
          console.log(`\n${results.length} skill(s) processed. Try: termcrab skills list`);
        } catch (err) {
          console.error(`import failed: ${err instanceof Error ? err.message : err}`);
          process.exitCode = 1;
        }
        return;
      }
      if (sub === 'show') {
        const name = source;
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

    case 'cron': {
      const [sub = 'ls', id] = rest;
      if (sub === 'ls' || sub === 'list') {
        const jobs = loadCrons();
        if (!jobs.length) {
          console.log('no cron jobs. Add one:');
          console.log('  termcrab cron add --schedule "0 8 * * *" --prompt "give me a briefing" --name morning');
          return;
        }
        const now = new Date();
        for (const j of jobs) {
          let next = 'invalid schedule';
          try {
            const nx = nextRun(parseCron(j.schedule), now);
            next = nx ? nx.toLocaleString() : 'no next run';
          } catch {
            /* keep invalid */
          }
          const state = j.enabled ? 'on ' : 'off';
          console.log(
            `${state} ${j.id}  ${j.name.padEnd(18)} ${j.schedule.padEnd(14)} next: ${next}${j.critical ? ' [critical]' : ''}`,
          );
        }
        return;
      }
      if (sub === 'add') {
        const opts = parseArgs({
          args: rest.slice(1),
          options: {
            schedule: { type: 'string' },
            prompt: { type: 'string' },
            name: { type: 'string' },
            critical: { type: 'boolean', default: false },
          },
        }).values;
        if (!opts.schedule || !opts.prompt) {
          console.error('usage: termcrab cron add --schedule "*/30 * * * *" --prompt "..." [--name x] [--critical]');
          process.exitCode = 1;
          return;
        }
        try {
          const job = addCron({
            name: opts.name || '',
            schedule: opts.schedule,
            prompt: opts.prompt,
            critical: opts.critical,
          });
          const nx = nextRun(parseCron(job.schedule));
          console.log(`✅ cron ${job.id} "${job.name}" created. Next run: ${nx ? nx.toLocaleString() : 'n/a'}`);
        } catch (err) {
          console.error(`error: ${err instanceof Error ? err.message : err}`);
          process.exitCode = 1;
        }
        return;
      }
      if (sub === 'rm' || sub === 'delete') {
        const ok = removeCron(id || '');
        console.log(ok ? '✅ removed' : 'not found');
        if (!ok) process.exitCode = 1;
        return;
      }
      if (sub === 'on' || sub === 'off') {
        const job = setCronEnabled(id || '', sub === 'on');
        console.log(job ? `✅ ${job.name} is now ${job.enabled ? 'on' : 'off'}` : 'not found');
        if (!job) process.exitCode = 1;
        return;
      }
      if (sub === 'run') {
        const job = getCron(id || '');
        if (!job) {
          console.error('cron not found');
          process.exitCode = 1;
          return;
        }
        const ctx = await makeAgentCtx();
        const output = await runTurn(ctx, {
          sessionId: `cron:${job.id}`,
          userMessage: `[manual:${job.name}] ${job.prompt}`,
          channel: 'cron',
          onEvent: printEvents,
        });
        console.log(`\n`);
        return;
      }
      console.error(`unknown cron subcommand: ${sub}`);
      process.exitCode = 1;
      return;
    }

    case 'status': {
      const config = loadConfig();
      console.log(await statusReport(config));
      return;
    }

    case 'dream': {
      const force = rest.includes('--force');
      const ctx = await makeAgentCtx();
      console.log('💤 dreaming (consolidating memory) ...');
      try {
        const r = await runDream(ctx, { force });
        if (!r.ran) console.log(`skipped: ${r.reason}`);
        else console.log(`✅ dream complete: ${r.facts ?? 0} fact(s) consolidated (${r.reason})`);
      } catch (err) {
        console.error(`dream failed: ${err instanceof Error ? err.message : err}`);
        process.exitCode = 1;
      }
      return;
    }

    case 'wake': {
      const kwFlag = rest.indexOf('--keyword');
      const keyword = (kwFlag >= 0 ? rest[kwFlag + 1] : undefined) || 'crab';
      if (!(await execExists('termux-speech-to-text'))) {
        console.error('termux-speech-to-text not found.');
        console.error('  install: pkg install termux-api  (+ the Termux:API app from F-Droid)');
        process.exitCode = 1;
        return;
      }
      console.log(`👂 wake loop: listening for "${keyword}" via termux-speech-to-text (ctrl-c to stop)`);
      console.log('   say the keyword, then your command in the next breath.');
      const ctx = await makeAgentCtx();
      try {
        const r = await runWakeLoop({
          keyword,
          onCommand: async (text: string) => {
            console.log(`   🦀 heard: "${text}"`);
            const reply = await runTurn(ctx, {
              sessionId: 'wake:main',
              userMessage: text,
              channel: 'voice',
            });
            return reply.trim();
          },
          speak: async (text: string) => {
            const res = await speak(text);
            if (!res.ok) console.log(`   🔇 tts unavailable (${res.error}) - reply: ${text}`);
          },
        });
        console.log(`wake loop ended (${r.commands} command(s) handled)`);
      } catch (err) {
        console.error(`wake loop failed: ${err instanceof Error ? err.message : err}`);
        console.error('   needs Termux API app + termux-api package for speech-to-text.');
        process.exitCode = 1;
      }
      return;
    }

    case 'memory': {
      const [sub = 'show', ...queryParts] = rest;
      const memory = await makeMemoryStore();
      if (sub === 'search') {
        const q = queryParts.join(' ');
        if (!q) {
          console.error('usage: termcrab memory search <query>');
          process.exitCode = 1;
          return;
        }
        const hits = await memory.search(q);
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
