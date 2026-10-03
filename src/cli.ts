import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { parseArgs } from 'node:util';
import {
  type Config,
  loadConfig,
  saveConfig,
  cfgGet,
  cfgSet,
  describeConfigLocation,
  generateToken,
  configExists,
  validateConfig,
  configProblems,
} from './core/config.js';
import { diskBudgetBytes, diskKeepDays, diskUsage, enforceDiskBudget } from './core/disk.js';
import { ensureLayout, home, workspaceDir, memoryDir, configPath } from './core/paths.js';
import { log, setLogLevel } from './core/logger.js';
import { onboard, OnboardFlags } from './onboard.js';
import { createMock } from './providers/mock.js';
import { startGateway, version } from './gateway/server.js';
import { runSupervisor } from './mobile/supervisor.js';
import { runDoctor, renderChecks, verifyTelegram, execExists, buildShareReport, probeGatewayToken, probePanelHealth } from './mobile/doctor.js';
import { installBootScript, bootStatus, isTermux } from './mobile/boot.js';
import { importSkills } from './skills/importer.js';
import { addCron, loadCrons, removeCron, setCronEnabled, getCron } from './cron/store.js';
import { nextRun, parseCron } from './cron/parser.js';
import { listAgents, agentExists, sanitizeAgentName } from './agent/prompt.js';
import { speak } from './mobile/tts.js';
import { EmbeddingIndex, tryLoadEmbedder } from './agent/embed.js';
import { formatTokens, usageForDay, type UsageDay } from './core/usage.js';
import { runDream } from './agent/dream.js';
import { runWakeLoop } from './mobile/wake.js';
import { statusReport } from './agent/status.js';
import { GatewayClient, GatewayNotRunningError } from './gateway/client.js';
import { planOpenclaw, applyOpenclaw } from './migrate/openclaw.js';
import { friendlyError } from './core/friendly.js';
import { checkForUpdate, renderUpdate } from './core/update.js';
import { resolveProvider } from './providers/index.js';
import { MemoryStore } from './agent/memory.js';
import { SkillStore } from './skills/loader.js';
import { AgentCtx, runTurn, providerLabel } from './agent/loop.js';
import { SessionStore } from './agent/sessions.js';
import { scaffoldSkill, scaffoldAgent, isSoulTemplate, SOUL_TEMPLATES } from './skills/scaffold.js';
import { embeddingsStatus, embeddingsSetup } from './agent/embed-setup.js';
import { transcribeFile } from './mobile/whisper.js';
import { dreamHistory } from './agent/dream.js';
import { runHeartbeatOnce } from './agent/heartbeat.js';
import { AgentEvent } from './agent/loop.js';

const HELP = `🦀 TermCrab — your personal AI assistant that runs on your own device.

Everything stays yours: the chats, the memory files, the settings.

Start here (the 5 commands most people ever need):
  termcrab status           plain-English overview: brain, memory, schedule, battery
  termcrab agent "ask..."   talk to your assistant (no message = open a chat session)
  termcrab gateway          start the web control panel (open the printed address in a browser)
  termcrab dream [--history]        "sleep on it" — turn chats into memory (--history = see past dreams)
  termcrab doctor           health check: tells you what's broken and exactly how to fix it

Everyday extras:
  termcrab agent "msg" --as <name>   talk to a named agent (workspace/agents/<name>/SOUL.md)
  termcrab agent "msg" --tier local  run this one task on your own local model, if set up
  termcrab say <text>                speak text aloud
  termcrab wake                      voice mode: say the keyword, then say your command
  termcrab memory [show|search ...]  look inside memory
  termcrab memory compact <session>  summarise an old chat with the model (the full transcript stays on disk)
  termcrab skills [list|import|new]  add extra abilities (skill folders, git repos)
  termcrab sessions [ls|export|purge|rename]  manage chats: save one as text, clean old ones
  termcrab agents new <name> --template brief|teacher|researcher   starter personality
  termcrab embeddings [status|setup] smart memory search (optional, offline-capable)
  termcrab transcribe <file>          turn a voice recording into text (offline, needs whisper.cpp)
  termcrab import openclaw [--apply] bring your old OpenClaw setup over (preview first!)
  termcrab cron [ls|add ...]         schedule jobs that repeat ("0 8 * * *" = 8am daily)
  termcrab heartbeat                 run one self-check right now
  termcrab update                    check if a newer TermCrab exists (and how to get it)
  termcrab doctor --share            copy-paste report for asking help (passwords stripped)
  termcrab boot [install|status]     start automatically when the phone boots
  termcrab approvals [list]          dangerous tools waiting for your yes/no (panel card answers too)
  termcrab approvals approve <id>    let that one tool run
  termcrab approvals deny <id>       refuse it — the agent is told and moves on
  termcrab usage [--json]           today's tokens (and cost when a price is known)
  termcrab run "msg" [--no-wait]    ask the running panel to do it, and wait for the answer
  termcrab run --wait <id>          wait for a run you started (0 done · 1 failed · 124 timeout · 130 stopped)
  termcrab stop [session]           stop what the agent is doing right now (partial answer is kept)
  termcrab disk [--trim]            how much space the agent uses (--trim = enforce the budget now)
  termcrab config [get|set|list]     change settings (same settings live in the web panel)
  termcrab supervisor                start the gateway with auto-restart (always-on mode)
  termcrab onboard                   first-time setup wizard
      options: --provider p --model m --api-key k --base-url u --telegram-token t
               --demo                offline brain (mock): no network, no key
               --allow-user ids --name n --no-exec --non-interactive
  termcrab version | help

Examples:
  termcrab agent "what can you do?"
  termcrab config set channels.telegram.allowedUserIds [123456789]
`;

interface RunView {
  runId: string;
  sessionId: string | null;
  status: 'queued' | 'running' | 'done' | 'error' | 'interrupted';
  output: string | null;
  error: string | null;
  startedAt: number | null;
  durationMs: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
}

/**
 * Wait for a run the panel is executing and print what it produced (10.2).
 * Exit codes follow the usual shell conventions so a script can branch:
 * 0 done, 1 failed, 124 still running when the timeout ran out, 130 stopped by
 * a person.
 */
async function waitForRun(client: GatewayClient, runId: string, timeoutSec: number, asJson: boolean): Promise<number> {
  const deadline = Date.now() + Math.max(0, timeoutSec) * 1000;
  for (;;) {
    const run = await client.json<RunView>(`/api/runs/${encodeURIComponent(runId)}`);
    if (run.status === 'done' || run.status === 'error' || run.status === 'interrupted') {
      if (asJson) {
        console.log(JSON.stringify(run, null, 2));
      } else if (run.output) {
        console.log(run.output);
      }
      if (run.status === 'error') {
        console.error(`run ${runId} failed: ${run.error ?? 'unknown error'}`);
        return 1;
      }
      if (run.status === 'interrupted') {
        console.error(`run ${runId} was stopped${run.output ? ' — the text above is what it had written' : ''}`);
        return 130;
      }
      if (!asJson && !run.output) console.error(`run ${runId} finished with no output`);
      return 0;
    }
    if (Date.now() >= deadline) {
      console.error(
        `run ${runId} is still running after ${timeoutSec}s (status: ${run.status})` +
          ` — wait longer (--timeout <seconds>) or stop it: termcrab stop`,
      );
      return 124;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

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
    case 'error': {
      const f = friendlyError(ev.message);
      process.stdout.write(`\n\x1b[31m${f.headline}\x1b[0m\n  \u2192 ${f.fix}\n`);
      break;
    }
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

/** `skills.allow` as the loader wants it: a list means an allow-list, empty means all. */
function skillsAllow(config: Config): string[] | undefined {
  return config.skills?.allow?.length ? config.skills.allow : undefined;
}

async function makeAgentCtx() {
  const config = loadConfig();
  const memory = await buildMemoryStore(config);
  const skills = new SkillStore(undefined, { allow: skillsAllow(config) });
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
          demo: { type: 'boolean', default: false },
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
        provider: values.demo ? 'mock' : values.provider,
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
      if (config.gateway.token) log.info(`control UI token: ${config.gateway.token}`);
      else log.info('no password set - the panel opens without a login (this device only)');
      log.info('press Ctrl+C to stop');

      let stopping = false;
      const shutdown = async () => {
        if (stopping) process.exit(0); // second Ctrl+C forces an exit
        stopping = true;
        log.info('shutting down...');
        const hardStop = setTimeout(() => process.exit(0), 3000); // never hang
        await handle.stop();
        clearTimeout(hardStop);
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
      const { values } = parseArgs({
        args: rest,
        options: {
          json: { type: 'boolean', default: false },
          share: { type: 'boolean', default: false },
        },
      });
      const checks = await runDoctor();
      if (values.share) {
        const report = buildShareReport(checks, {
          version: version(),
          provider: providerLabel(loadConfig()),
          node: process.version,
          platform: `${os.type()} ${os.release()}`,
          home: home(),
          configPath: configPath(),
        });
        console.log('Safe to paste anywhere (passwords are stripped):');
        console.log('```');
        console.log(report);
        console.log('```');
        return;
      }
      if (values.json) {
        console.log(JSON.stringify(checks, null, 2));
      } else {
        const r = renderChecks(checks);
        console.log(r.text);
        if (r.failed) process.exitCode = 1;
      }
      return;
    }

    case 'update': {
      const info = await checkForUpdate(version());
      console.log(renderUpdate(info));
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
          demo: { type: 'boolean', default: false },
        },
        allowPositionals: true,
      });
      const ctx = await makeAgentCtx();
      if (values.demo) {
        // One offline turn: never writes config.json, never opens a socket.
        ctx.provider = createMock(ctx.config.provider.model);
        console.error('(offline demo: answering with the built-in mock brain - no network, no key)');
      }
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
      const store = new SkillStore(undefined, { allow: skillsAllow(loadConfig()) });
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
      if (sub === 'new') {
        const name = source;
        if (!name) {
          console.error('usage: termcrab skills new <name> [--description "one line"]');
          process.exitCode = 1;
          return;
        }
        const dIdx = rest.indexOf('--description');
        const desc = dIdx >= 0 ? rest[dIdx + 1] : '';
        const r = scaffoldSkill(name, desc ?? '');
        if (!r.ok) {
          console.error(r.error);
          process.exitCode = 1;
          return;
        }
        console.log(`✅ created ${r.path}`);
        console.log('   edit it — the instructions in that file are what the agent follows.');
        console.log('   try: termcrab skills list');
        return;
      }
      // Skill registry: search, install, publish, list
      if (sub === 'search') {
        const q = source;
        if (!q) {
          console.error('usage: termcrab skills search <query>');
          process.exitCode = 1;
          return;
        }
        const { searchSkills } = await import('./skills/registry.js');
        const results = await searchSkills(q);
        if (!results.length) {
          console.log('no skills found in registry');
          return;
        }
        for (const s of results) console.log(`${s.name.padEnd(20)} ${s.description}`);
        return;
      }
      if (sub === 'install') {
        const name = source;
        if (!name) {
          console.error('usage: termcrab skills install <name>');
          process.exitCode = 1;
          return;
        }
        const { installSkill } = await import('./skills/registry.js');
        const result = await installSkill(name);
        if (result.ok) {
          console.log(`✅ installed ${name}`);
        } else {
          console.error(`install failed: ${result.error}`);
          process.exitCode = 1;
        }
        return;
      }
      if (sub === 'publish') {
        const name = source;
        if (!name) {
          console.error('usage: termcrab skills publish <name>');
          process.exitCode = 1;
          return;
        }
        const skill = store.get(name);
        if (!skill) {
          console.error(`skill not found: ${name}`);
          process.exitCode = 1;
          return;
        }
        const { publishSkill } = await import('./skills/registry.js');
        const result = await publishSkill(name, skill.content, {
          description: skill.description,
        });
        if (result.ok) {
          console.log(`✅ published ${name}`);
        } else {
          console.error(`publish failed: ${result.error}`);
          process.exitCode = 1;
        }
        return;
      }
      if (sub === 'registry') {
        const { listRegistrySkills } = await import('./skills/registry.js');
        const skills = await listRegistrySkills();
        if (!skills.length) {
          console.log('registry empty or unreachable');
          return;
        }
        for (const s of skills) console.log(`${s.name.padEnd(20)} ${s.description}`);
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

    case 'import': {
      const { values } = parseArgs({
        args: rest,
        options: {
          from: { type: 'string' },
          apply: { type: 'boolean', default: false },
          force: { type: 'boolean', default: false },
        },
        allowPositionals: true,
      });
      const [sub] = rest.filter((r) => !r.startsWith('-'));
      if (sub !== 'openclaw') {
        console.error('usage: termcrab import openclaw [--from <dir>] [--apply] [--force]');
        console.error('  (preview runs by default; add --apply to actually move anything)');
        process.exitCode = 1;
        return;
      }
      const source = (values.from as string | undefined) || path.join(os.homedir(), '.openclaw');
      const plan = planOpenclaw(source);

      console.log('');
      console.log(`🦀 Import from OpenClaw — preview ${values.apply ? '(applying)' : '(nothing changed yet)'}`);
      console.log(`   source: ${plan.source}`);
      if (!plan.sourceExists) {
        console.log(`   not found. If your setup lives elsewhere: termcrab import openclaw --from <dir>`);
        process.exitCode = 1;
        return;
      }
      console.log('');
      console.log('   Found:');
      console.log(`     personality: ${plan.personalityFiles.length ? plan.personalityFiles.join(', ') : '(none)'}`);
      console.log(
        `     memory: ${plan.memory.sourceLines} line(s) (${plan.memory.newLines} new) · ${plan.memory.dailyFiles.length} daily log(s)`,
      );
      console.log(`     skills: ${plan.skills.length ? plan.skills.map((s) => s.name).join(', ') : '(none)'}`);
      if (plan.agentFolders.length) console.log(`     agents: ${plan.agentFolders.map((a) => '@' + a).join(', ')}`);
      if (plan.configPath) console.log(`     config: ${plan.configPath}`);
      else console.log(`     config: ${plan.configParseError ?? 'not found'}`);

      const interesting = plan.rows.filter((r) => r.status !== 'absent');
      if (interesting.length) {
        console.log('');
        console.log('   Config plan:');
        for (const r of interesting) {
          const tag = r.status === 'will set' ? '[will set]' : '[keep yours]';
          console.log(`     ${r.from} = ${r.value}  →  ${r.to}  ${tag}`);
        }
      }
      if (plan.unmapped.length) {
        console.log('');
        console.log(`   Not migrated (left in place): ${plan.unmapped.join(', ')}`);
      }

      console.log('');
      console.log('   Plan:');
      plan.actions.forEach((a, i) => console.log(`     ${i + 1}. ${a}`));
      console.log('');

      if (!values.apply) {
        console.log('   Nothing was changed. Run again with --apply to do it.');
        console.log('   (add --force to also replace files you already have)');
        return;
      }
      const results = await applyOpenclaw(plan, { force: Boolean(values.force) });
      console.log('   Applying:');
      for (const r of results) console.log(`     ✓ ${r}`);
      return;
    }

    case 'approvals': {
      const config = loadConfig();
      const client = new GatewayClient(config);
      const flags = rest.filter((r) => r.startsWith('--'));
      const args = rest.filter((r) => !r.startsWith('--'));
      const asJson = flags.includes('--json');
      const sub = args[0] ?? 'list';
      const target = args[1];
      try {
        if (sub === 'list' || sub === 'ls') {
          const data = await client.json<{
            approvals: { id: string; tool: string; args: Record<string, unknown>; createdAt: number; sessionId?: string }[];
          }>('/api/approvals');
          if (asJson) {
            console.log(JSON.stringify(data, null, 2));
            return;
          }
          if (!data.approvals.length) {
            console.log('');
            console.log('  ✅ Nothing waiting for approval.');
            console.log('     (Which tools ask is in the panel under Settings → Safety.)');
            console.log('');
            return;
          }
          console.log('');
          console.log(`  🛑 ${data.approvals.length} tool call(s) waiting for your decision:`);
          for (const a of data.approvals) {
            const arg = JSON.stringify(a.args ?? {});
            const short = arg.length > 90 ? arg.slice(0, 89) + '…' : arg;
            const age = Math.max(0, Math.round((Date.now() - a.createdAt) / 1000));
            console.log(`     ${a.id}`);
            console.log(`       tool  ${a.tool}  (${age}s ago${a.sessionId ? `, session ${a.sessionId}` : ''})`);
            console.log(`       args  ${short}`);
          }
          console.log('');
          console.log('     answer:  termcrab approvals approve <id>   ·   termcrab approvals deny <id>');
          console.log('     or open the panel — the same request is waiting there as a card.');
          console.log('');
          return;
        }
        if (sub === 'approve' || sub === 'deny') {
          if (!target) {
            console.error('usage: termcrab approvals approve|deny <id>   (list the ids: termcrab approvals)');
            process.exitCode = 1;
            return;
          }
          const res = await client.json<{ decision?: string; error?: string }>(
            `/api/approvals/${encodeURIComponent(target)}/${sub}`,
            { method: 'POST', json: { by: 'cli' } },
          );
          if (asJson) {
            console.log(JSON.stringify(res, null, 2));
            return;
          }
          console.log(res.decision === 'approved' ? `✅ Approved ${target} — the tool will run now.` : `🚫 Denied ${target} — the agent was told.`);
          return;
        }
        console.error('usage: termcrab approvals [list | approve <id> | deny <id>] [--json]');
        process.exitCode = 1;
      } catch (err) {
        if (err instanceof GatewayNotRunningError) {
          console.error(err.message);
          console.error('Approvals live inside the running panel (that is where the blocked tool is waiting).');
        } else {
          console.error(`approvals: ${err instanceof Error ? err.message : String(err)}`);
        }
        process.exitCode = 1;
      }
      return;
    }

    case 'usage': {
      const config = loadConfig();
      const client = new GatewayClient(config);
      const asJson = rest.includes('--json');
      type UsageResponse = UsageDay & { pricingAsOf: string; priceConfigured: boolean };
      try {
        const data = await client.json<UsageResponse>('/api/usage');
        if (asJson) {
          console.log(JSON.stringify(data, null, 2));
          return;
        }
        console.log('');
        if (!data.turns) {
          console.log(`  📊 No turns metered today (${data.day}).`);
          console.log('     Tokens show up as soon as a model reports them, and never before.');
          console.log('');
          return;
        }
        console.log(`  📊 Today (${data.day}) — ${data.turns} turn(s), ${data.calls} model call(s)`);
        console.log(`     tokens   ${formatTokens(data.totalTokens)}   (in ${formatTokens(data.promptTokens)} · out ${formatTokens(data.completionTokens)})`);
        if (data.priced) {
          console.log(`     cost     ~$${data.costUsd.toFixed(4)}   (price snapshot ${data.pricingAsOf}${data.priceConfigured ? ' · your configured prices' : ''})`);
        } else {
          console.log('     cost     unknown — set provider.priceInPerM / priceOutPerM to make it exact');
        }
        for (const [model, m] of Object.entries(data.byModel)) {
          console.log(`     ${model.padEnd(22)} ${formatTokens(m.totalTokens).padStart(8)} tokens`);
        }
        console.log('');
        return;
      } catch (err) {
        if (err instanceof GatewayNotRunningError) {
          console.error('The panel is not running, so there is nothing to measure.');
          console.error('Start it with `termcrab gateway`, then ask again.');
        } else {
          console.error(`usage: ${err instanceof Error ? err.message : String(err)}`);
        }
        process.exitCode = 1;
      }
      return;
    }

    case 'run':
    case 'wait': {
      const config = loadConfig();
      const client = new GatewayClient(config);
      const flags = rest.filter((r) => r.startsWith('--'));
      const args = rest.filter((r) => !r.startsWith('--'));
      const asJson = flags.includes('--json');
      const timeoutIdx = rest.indexOf('--timeout');
      const timeoutSec = timeoutIdx >= 0 && rest[timeoutIdx + 1] ? Number(rest[timeoutIdx + 1]) : 120;
      if (!Number.isFinite(timeoutSec) || timeoutSec < 0) {
        console.error('usage: termcrab run --wait <id> [--timeout <seconds>] [--json]');
        process.exitCode = 1;
        return;
      }
      // `wait` is the short alias: both mean "wait for this run".
      const waitMode = cmd === 'wait' || flags.includes('--wait') || flags.includes('-w');
      try {
        if (waitMode) {
          const id = args[0];
          if (!id) {
            console.error('usage: termcrab run --wait <id>    (the id is printed when a run starts)');
            process.exitCode = 1;
            return;
          }
          process.exitCode = await waitForRun(client, id, timeoutSec, asJson);
          return;
        }
        const message = args.join(' ').trim();
        if (!message) {
          console.error('usage: termcrab run "what to do" [--session <id>] [--no-wait] [--json]');
          console.error('       termcrab run --wait <id> [--timeout <seconds>]');
          console.error('       (a one-off turn without the panel: termcrab agent "what to do")');
          process.exitCode = 1;
          return;
        }
        const sidIdx = rest.indexOf('--session');
        const sessionId = sidIdx >= 0 && rest[sidIdx + 1] ? rest[sidIdx + 1]! : 'cli:main';
        const submitted = await client.json<{ turnId: string; status: string; queueLength?: number }>('/api/chat', {
          method: 'POST',
          json: { message, sessionId },
        });
        if (asJson) {
          console.log(JSON.stringify(submitted, null, 2));
        } else {
          console.log(`▶ run ${submitted.turnId} (session ${sessionId})${submitted.status === 'queued' ? ' — waiting for the lane' : ''}`);
        }
        if (flags.includes('--no-wait')) return;
        process.exitCode = await waitForRun(client, submitted.turnId, timeoutSec, asJson);
        return;
      } catch (err) {
        if (err instanceof GatewayNotRunningError) {
          console.error(err.message);
          console.error('`termcrab run` submits to the panel so the queue, the approvals and the panel all see it.');
          console.error('For a one-off turn without a panel: termcrab agent "what to do"');
        } else {
          console.error(`run: ${err instanceof Error ? err.message : String(err)}`);
        }
        process.exitCode = 1;
      }
      return;
    }

    case 'stop': {
      const config = loadConfig();
      const client = new GatewayClient(config);
      const asJson = rest.includes('--json');
      const session = rest.find((r) => !r.startsWith('--'));
      try {
        const res = await client.json<{ count: number; stopped: string[]; sessions: string[] }>('/api/stop', {
          method: 'POST',
          json: session ? { sessionId: session } : {},
        });
        if (asJson) {
          console.log(JSON.stringify(res, null, 2));
          return;
        }
        if (!res.count) {
          console.log(session ? `nothing is running in ${session}` : 'nothing is running');
          return;
        }
        console.log(`🛑 stopped ${res.count} turn(s): ${res.stopped.join(', ')}`);
        console.log('   (whatever it had already written is kept, marked [interrupted])');
        return;
      } catch (err) {
        if (err instanceof GatewayNotRunningError) console.error(err.message);
        else console.error(`stop: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
        return;
      }
    }

    case 'disk': {
      const config = loadConfig();
      const asJson = rest.includes('--json');
      const maxIdx = rest.indexOf('--max-mb');
      const maxMb = maxIdx >= 0 && rest[maxIdx + 1] ? Number(rest[maxIdx + 1]) : diskBudgetBytes(config) / (1024 * 1024);
      const keepIdx = rest.indexOf('--keep-days');
      const keepDays = keepIdx >= 0 && rest[keepIdx + 1] ? Number(rest[keepIdx + 1]) : diskKeepDays(config);
      if (!Number.isFinite(maxMb) || maxMb <= 0 || !Number.isFinite(keepDays) || keepDays < 0) {
        console.error('usage: termcrab disk [--trim] [--max-mb <n>] [--keep-days <n>] [--json]');
        process.exitCode = 1;
        return;
      }
      const before = diskUsage();
      const mb = (b: number): string => `${(b / (1024 * 1024)).toFixed(1)} MB`;
      const budgetBytes = maxMb * 1024 * 1024;
      const trim = rest.includes('--trim') ? enforceDiskBudget(budgetBytes, { keepDays }) : null;
      if (asJson) {
        console.log(JSON.stringify({ before, budgetBytes, keepDays, trim }, null, 2));
        return;
      }
      console.log('');
      console.log(`  💾 ${before.root}`);
      console.log(`     used    ${mb(before.totalBytes)} of ${mb(budgetBytes)} budget (${before.files} file(s), keeping the last ${keepDays} day(s))`);
      for (const [area, bytes] of Object.entries(before.byArea).sort((a, b) => b[1] - a[1])) {
        if (bytes > 0) console.log(`     ${area.padEnd(10)} ${mb(bytes).padStart(10)}`);
      }
      if (trim) {
        console.log(`     trimmed ${trim.removed} file(s), freed ${(trim.freedBytes / 1024).toFixed(1)} KB`);
        for (const note of trim.notes) console.log(`       ${note}`);
        if (trim.overBudget) {
          console.log('     ⚠️ still over budget — nothing else may be trimmed (memory, skills and the config are never touched)');
        }
      } else if (before.totalBytes > budgetBytes) {
        console.log('     ⚠️ over budget — run: termcrab disk --trim');
      }
      console.log('');
      return;
    }

    case 'status': {
      const config = loadConfig();
      console.log(await statusReport(config));
      return;
    }

    case 'dream': {
      if (rest.includes('--history')) {
        const { lastDreamAt, history } = dreamHistory();
        if (!history.length && !lastDreamAt) {
          console.log('no dreams yet — run: termcrab dream');
          return;
        }
        console.log(lastDreamAt ? `last dream: ${new Date(lastDreamAt).toISOString().slice(0, 16).replace('T', ' ')}` : 'last dream: (unknown)');
        if (history.length) {
          console.log('\nwhat it learned:');
          for (const h of history) console.log(`  ${h.day}  ${h.line}`);
        }
        console.log('\nedit the daily logs anytime: memory/daily/<date>.md');
        return;
      }
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

    case 'sessions': {
      const [sub = 'ls', a, b] = rest;
      const store = new SessionStore();
      if (sub === 'ls' || sub === 'list') {
        const list = store.list();
        if (!list.length) {
          console.log('no chats yet');
          return;
        }
        for (const s of list) {
          const kb = Math.max(1, Math.round(s.bytes / 1024));
          console.log(`${s.id.padEnd(30)} ${String(s.messages).padStart(4)} messages  ${kb} KB  ${new Date(s.modified * 1000).toISOString().slice(0, 10)}`);
        }
        return;
      }
      if (sub === 'export') {
        if (!a) {
          console.error('usage: termcrab sessions export <id> [file.md]');
          process.exitCode = 1;
          return;
        }
        const md = store.exportMarkdown(a);
        if (md === null) {
          console.error(`no chat found: ${a}  (see: termcrab sessions ls)`);
          process.exitCode = 1;
          return;
        }
        const out = b || `${a.replace(/[^a-zA-Z0-9_.-]/g, '_')}.md`;
        fs.writeFileSync(out, md, 'utf8');
        console.log(`✅ exported to ${out}`);
        return;
      }
      if (sub === 'purge') {
        // --older-than N (days), default 30
        const idx = rest.indexOf('--older-than');
        const days = idx >= 0 ? Number(rest[idx + 1]) : 30;
        if (!Number.isFinite(days) || days < 0) {
          console.error('usage: termcrab sessions purge --older-than <days>');
          process.exitCode = 1;
          return;
        }
        const r = store.purgeOlderThan(days);
        console.log(`🧹 removed ${r.removed} old chat file(s), freed ${Math.max(0, Math.round(r.freedBytes / 1024))} KB (older than ${days} day(s))`);
        return;
      }
      if (sub === 'rename') {
        if (!a || !b) {
          console.error('usage: termcrab sessions rename <old-id> <new-id>');
          process.exitCode = 1;
          return;
        }
        const r = store.rename(a, b);
        if (r === 'ok') console.log(`✅ renamed ${a} -> ${b}`);
        else if (r === 'not-found') console.error(`no chat found: ${a}`);
        else if (r === 'exists') console.error(`a chat named ${b} already exists`);
        else console.error('new id may only contain letters, digits, - _ . :');
        if (r !== 'ok') process.exitCode = 1;
        return;
      }
      console.error('usage: termcrab sessions [ls|export <id>|purge --older-than N|rename <old> <new>]');
      process.exitCode = 1;
      return;
    }

    case 'agents': {
      const [sub = 'ls', name] = rest;
      if (sub === 'ls' || sub === 'list') {
        const agents = listAgents();
        console.log(agents.length ? agents.map((a) => ` @${a}`).join('\n') : '(no named agents yet)');
        if (!agents.length) console.log('  create one: termcrab agents new <name> --template brief');
        return;
      }
      if (sub === 'new') {
        const tIdx = rest.indexOf('--template');
        const kindRaw = tIdx >= 0 ? rest[tIdx + 1] : undefined;
        if (!name) {
          console.error('usage: termcrab agents new <name> [--template brief|teacher|researcher]');
          process.exitCode = 1;
          return;
        }
        const kind = kindRaw && isSoulTemplate(kindRaw) ? kindRaw : 'brief';
        if (kindRaw && !isSoulTemplate(kindRaw)) {
          console.error(`unknown template "${kindRaw}" — choose one of: ${SOUL_TEMPLATES.join(', ')}`);
          process.exitCode = 1;
          return;
        }
        const r = scaffoldAgent(name, kind);
        if (!r.ok) {
          console.error(r.error);
          process.exitCode = 1;
          return;
        }
        console.log(`✅ created ${r.path} (template: ${kind})`);
        console.log(`   chat with it: termcrab agent "hello" --as ${name}`);
        return;
      }
      console.error(`usage: termcrab agents [ls|new <name> --template ${SOUL_TEMPLATES.join('|')}]`);
      process.exitCode = 1;
      return;
    }

    case 'transcribe': {
      const file = rest.find((a) => !a.startsWith('--'));
      if (!file) {
        console.error('usage: termcrab transcribe <audio-file> [--model <ggml-model>]');
        process.exitCode = 1;
        return;
      }
      const mIdx = rest.indexOf('--model');
      console.log(`🎙️ transcribing ${file} (offline) ...`);
      const r = await transcribeFile(file, { model: mIdx >= 0 ? rest[mIdx + 1] : undefined });
      if (r.ok) {
        console.log(`\n${r.text}`);
        console.log(`\n(${((r.ms ?? 0) / 1000).toFixed(1)}s · ${path.basename(r.model ?? 'model')})`);
      } else {
        console.error(`❌ ${r.error}`);
        process.exitCode = 1;
      }
      return;
    }

    case 'embeddings': {
      const [sub = 'status'] = rest;
      if (sub === 'status') {
        const st = embeddingsStatus();
        console.log(`🔍 smart memory search: ${st.summary}`);
        console.log(`   package: ${st.packageInstalled ? 'installed' : 'not installed'} · model: ${st.modelCached ? 'cached' : 'not downloaded'} · vectors: ${st.indexVectors}`);
        return;
      }
      if (sub === 'setup') {
        console.log('🧠 setting up smart memory search...');
        try {
          const r = await embeddingsSetup();
          for (const step of r.steps) console.log(`   ${r.ok && step.startsWith('done') ? '✅' : '·'} ${step}`);
          if (!r.ok) {
            console.error(`\n❌ ${r.error}`);
            process.exitCode = 1;
          }
        } catch (err) {
          console.error(`setup failed: ${err instanceof Error ? err.message : err}`);
          process.exitCode = 1;
        }
        return;
      }
      console.error('usage: termcrab embeddings [status|setup]');
      process.exitCode = 1;
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
      if (sub === 'compact') {
        const id = queryParts[0];
        if (!id) {
          console.error('usage: termcrab memory compact <session>   (list sessions: termcrab sessions ls)');
          process.exitCode = 1;
          return;
        }
        const ctx = await makeAgentCtx();
        let provider;
        try {
          provider = resolveProvider(ctx.config.provider);
        } catch {
          provider = undefined;
        }
        const res = await ctx.sessions.compactWithModel(id, ctx.config.agent.compactThreshold || 60, {
          provider: ctx.localProvider ?? provider,
        });
        if (!res.digest) {
          console.log(`nothing to compact in ${id} (the hot window is already small enough)`);
          return;
        }
        const engine = res.model ? `model ${res.model}` : res.by;
        console.log(`🗜️  ${id}: ${res.covered} turn(s) summarised by ${engine} → ${res.digestFile}`);
        if (res.note) console.log(`   note: ${res.note}`);
        console.log('   the full transcript stays on disk; the model now sees the summary, not those turns.');
        return;
      }
      const shown = memory.readForPrompt(8000);
      console.log(shown.text);
      console.log(
        `\n--- injected into prompts: ${shown.facts}/${shown.totalFacts} facts, ${shown.bytes}/${shown.budget} bytes` +
          `${shown.facts < shown.totalFacts ? ' (newest first; older facts stay searchable)' : ''}` +
          ` | stats: ${JSON.stringify(memory.stats())} | files: ${memoryDir()}`,
      );
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
      const blockingProblems = configProblems().filter((p) => p.severity === 'error');
      if (blockingProblems.length && sub !== 'path') {
        console.error(`⚠️  ${describeConfigLocation()} is being ignored (${blockingProblems.length} problem(s)):`);
        for (const problem of blockingProblems) console.error(`    ${problem.path}: ${problem.message}`);
        console.error('    (fix the file, or set the value again with: termcrab config set <key> <value>)');
      }
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
        let v = cfgGet(cfg, key);
        if (key === 'gateway.token' && (typeof v !== 'string' || !v)) {
          // Empty password: ask a running panel first, so a panel deliberately
          // running open is never locked by this read-only command.
          const health = await probePanelHealth(cfg);
          if (health) {
            console.error(
              health.authRequired
                ? 'this config has no password, but the running panel asks for one - it is using a different config; restart it from here: termcrab gateway'
                : 'no password set - the panel runs without a login (set one: termcrab config set gateway.token generate)',
            );
          } else if (!configExists()) {
            // Brand-new install, nothing saved yet, no panel running: create
            // the password right here so the login hint never prints empty.
            cfg.gateway.token = generateToken();
            saveConfig(cfg);
            v = cfg.gateway.token;
            console.error(`no panel password existed - created one and saved it (config: ${describeConfigLocation()})`);
          } else {
            // Config exists with no password on purpose ("run without login").
            console.error(
              'no password set - the panel runs without a login (set one: termcrab config set gateway.token generate)',
            );
          }
        }
        console.log(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));
        if (key === 'gateway.token' && typeof v === 'string' && v) {
          // Say right here whether the running panel actually accepts it —
          // this exact command is what the login screen tells people to run.
          const probe = await probeGatewayToken(cfg, v);
          if (probe === 'ok') {
            console.error('ok: the running panel accepts this password');
          } else if (probe === 'mismatch') {
            console.error(
              `warning: the running panel is using a DIFFERENT password than this file - restart it (termcrab gateway, or termcrab supervisor if you use always-on mode) and run this again`,
            );
          } else {
            console.error(`(could not double-check: nothing is answering on port ${cfg.gateway.port})`);
          }
        }
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
        // 10.1: the same check the hot-reload path uses. A value that cannot
        // work never reaches the file, so it can never break a running agent.
        const blocking = validateConfig(next).filter((p) => p.severity === 'error');
        if (blocking.length) {
          console.error(`❌ refusing to save — ${blocking.length} problem(s) in the config:`);
          for (const problem of blocking) console.error(`   ${problem.path}: ${problem.message}`);
          console.error('   (the file was left exactly as it was)');
          process.exitCode = 1;
          return;
        }
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
