/**
 * Batch 13 — the cheap flips a finger feels.
 *
 *   13.1 typing: a Telegram chat shows "typing…" while the agent works, and a
 *        failing indicator never costs a reply.
 *   13.2 colour: NO_COLOR / FORCE_COLOR / TCRAB_COLOR and TTY detection decide
 *        whether escape codes are written at all — proven with the real binary.
 *   13.3 help: every command in the CLI's switch has its own usage text, and
 *        `termcrab <cmd> --help` works on commands whose parser used to throw.
 *   13.4 completion: bash/zsh/fish scripts are generated from the same table.
 *   13.5 lives in test/adapters.test.ts (Discord, Slack, Signal, SMS, Matrix).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TelegramChannel, TYPING_REFRESH_MS, TelegramUpdate } from '../src/channels/telegram.js';
import { COMMANDS, commandHelp, commandNames, completionScript, renderCommandIndex } from '../src/command-help.js';
import { ANSI, colorEnabled, colorModeFromEnv, paint, stripAnsi } from '../src/core/color.js';

const execFileAsync = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

async function runCli(
  args: string[],
  home: string,
  env: Record<string, string> = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  const bin = path.join(process.cwd(), 'dist/src/bin/termcrab.js');
  // A clean colour environment unless the test asks for something specific.
  const base: NodeJS.ProcessEnv = { ...process.env, TCRAB_HOME: home };
  for (const key of ['NO_COLOR', 'FORCE_COLOR', 'TCRAB_COLOR']) delete base[key];
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [bin, ...args], {
      env: { ...base, ...env },
      encoding: 'utf8',
      timeout: 60_000,
    });
    return { stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 };
  }
}

// ---------------------------------------------------------------- 13.1 typing

const telegramUpdate = (text: string, userId = 7, chatId = 42): TelegramUpdate => ({
  update_id: 1,
  message: { text, chat: { id: chatId }, from: { id: userId, username: 'rakib' } },
});

test('13.1 telegram shows "typing" while the agent works', async (t) => {
  await t.test('the indicator goes out before the answer, and stops with it', async () => {
    const calls: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let polls = 0;
    const channel = new TelegramChannel({
      cfg: { token: 't', allowedUserIds: [7] },
      getOffset: () => 0,
      setOffset: () => undefined,
      onMessage: async () => {
        await gate;
        return 'the answer';
      },
      api: {
        sendMessage: async (_chatId: number, html: string) => {
          calls.push(`send:${html}`);
          return {};
        },
        getUpdates: async () => {
          polls++;
          if (polls > 1) await sleep(5);
          return polls === 1 ? [telegramUpdate('hello')] : [];
        },
        getMe: async () => ({ username: 'crab' }),
        sendChatAction: async (chatId: number, action: string) => {
          calls.push(`typing:${chatId}:${action}`);
          return {};
        },
      },
    });

    channel.start();
    // The indicator must appear while the turn is still running.
    for (let i = 0; i < 200 && !calls.some((c) => c.startsWith('typing:')); i++) await sleep(5);
    assert.deepEqual(calls.filter((c) => c.startsWith('typing:')), ['typing:42:typing']);
    assert.ok(!calls.some((c) => c.startsWith('send:')), 'no answer sent while the turn is running');

    release();
    for (let i = 0; i < 200 && !calls.some((c) => c.startsWith('send:')); i++) await sleep(5);
    assert.deepEqual(calls.filter((c) => c.startsWith('send:')), ['send:the answer']);
    assert.ok(TYPING_REFRESH_MS > 0 && TYPING_REFRESH_MS < 5000, 'Telegram forgets typing after ~5s');
    await channel.stop();
  });

  await t.test('a typing call that fails never costs the reply', async () => {
    const sent: string[] = [];
    let polls = 0;
    const channel = new TelegramChannel({
      cfg: { token: 't', allowedUserIds: [7] },
      getOffset: () => 0,
      setOffset: () => undefined,
      onMessage: async () => 'still answered',
      api: {
        sendMessage: async (_chatId: number, html: string) => {
          sent.push(html);
          return {};
        },
        getUpdates: async () => {
          polls++;
          if (polls > 1) await sleep(5);
          return polls === 1 ? [telegramUpdate('hello')] : [];
        },
        getMe: async () => ({}),
        sendChatAction: async () => {
          throw new Error('typing is not allowed right now');
        },
      },
    });
    channel.start();
    for (let i = 0; i < 200 && sent.length === 0; i++) await sleep(5);
    assert.deepEqual(sent, ['still answered']);
    await channel.stop();
  });

  await t.test('a non-allowlisted user gets no indicator and no agent turn', async () => {
    const calls: string[] = [];
    let polls = 0;
    const channel = new TelegramChannel({
      cfg: { token: 't', allowedUserIds: [7] },
      getOffset: () => 0,
      setOffset: () => undefined,
      onMessage: async () => {
        calls.push('agent-turn');
        return 'never';
      },
      api: {
        sendMessage: async (_chatId: number, html: string) => {
          calls.push(`send:${html}`);
          return {};
        },
        getUpdates: async () => {
          polls++;
          if (polls > 1) await sleep(5);
          return polls === 1 ? [telegramUpdate('let me in', 9999)] : [];
        },
        getMe: async () => ({}),
        sendChatAction: async () => {
          calls.push('typing');
          return {};
        },
      },
    });
    channel.start();
    for (let i = 0; i < 200 && !calls.some((c) => c.startsWith('send:')); i++) await sleep(5);
    assert.ok(!calls.includes('typing'), 'no typing for a rejected user');
    assert.ok(!calls.includes('agent-turn'), 'the agent was never asked');
    assert.match(calls.find((c) => c.startsWith('send:')) ?? '', /Not authorized/);
    await channel.stop();
  });
});

// ----------------------------------------------------------------- 13.2 colour

test('13.2 colour follows the environment and never leaks into a pipe', async (t) => {
  await t.test('the rules, in order', () => {
    assert.equal(colorModeFromEnv({}), 'auto');
    assert.equal(colorModeFromEnv({ NO_COLOR: '1' }), 'never');
    assert.equal(colorModeFromEnv({ NO_COLOR: '' }), 'auto', 'NO_COLOR="" is not a request');
    assert.equal(colorModeFromEnv({ FORCE_COLOR: '1' }), 'always');
    assert.equal(colorModeFromEnv({ FORCE_COLOR: '0' }), 'auto');
    assert.equal(colorModeFromEnv({ NO_COLOR: '1', FORCE_COLOR: '1' }), 'never', 'NO_COLOR wins');
    assert.equal(colorModeFromEnv({ TCRAB_COLOR: 'always' }), 'always');
    assert.equal(colorModeFromEnv({ TCRAB_COLOR: 'never' }), 'never');

    assert.equal(colorEnabled({ isTTY: false }, {}), false, 'a pipe gets no escape codes');
    assert.equal(colorEnabled({ isTTY: true }, {}), true);
    assert.equal(colorEnabled({ isTTY: true }, { NO_COLOR: '1' }), false);
    assert.equal(colorEnabled({ isTTY: false }, { TCRAB_COLOR: 'always' }), true);

    assert.equal(paint(ANSI.red, 'plain', { stream: { isTTY: false } }), 'plain');
    assert.equal(paint(ANSI.red, 'loud', { stream: { isTTY: true } }), `${ANSI.red}loud\x1b[0m`);
    assert.equal(stripAnsi(`${ANSI.red}loud\x1b[0m`), 'loud');
  });

  await t.test('the real binary: a pipe stays plain, an explicit ask is coloured', async () => {
    const home = tmpHome('t13c-');
    const plain = await runCli(['not-a-command'], home);
    assert.ok(plain.code !== 0);
    assert.ok(!plain.stdout.includes('\x1b['), 'stdout of a piped run has no escape codes');
    assert.ok(!plain.stderr.includes('\x1b['), 'stderr of a piped run has no escape codes');
    assert.match(plain.stderr, /unknown command/i);

    const forced = await runCli(['not-a-command'], home, { TCRAB_COLOR: 'always' });
    assert.ok(forced.stderr.includes('\x1b['), 'TCRAB_COLOR=always colours the error');

    const noColor = await runCli(['not-a-command'], home, { FORCE_COLOR: '1', NO_COLOR: '1' });
    assert.ok(!noColor.stderr.includes('\x1b['), 'NO_COLOR beats FORCE_COLOR');

    const help = await runCli(['help'], home, { NO_COLOR: '1' });
    assert.equal(help.code, 0);
    assert.ok(!help.stdout.includes('\x1b['));
  });
});

// ------------------------------------------------------------------- 13.3 help

test('13.3 every command documents itself', async (t) => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src/cli.ts'), 'utf8');
  const mainSource = source.slice(source.indexOf('export async function main'));
  const commands = [...mainSource.matchAll(/case\s+'([a-z][a-z0-9-]*)'/g)].map((m) => m[1]!);
  const unique = [...new Set(commands)];

  await t.test('the table covers every command in the switch', () => {
    assert.ok(unique.length >= 25, `found ${unique.length} commands in cli.ts`);
    for (const cmd of unique) {
      assert.ok(commandHelp(cmd), `no per-command help for "${cmd}"`);
    }
  });

  await t.test('every documented flag is a flag the CLI parses', () => {
    const flags = [...new Set(COMMANDS.flatMap((c) => c.flags.join(' ').match(/--[a-z][a-z-]+/g) ?? []))];
    assert.ok(flags.length >= 25, `found ${flags.length} documented flags`);
    for (const flag of flags) {
      // Either the CLI matches the literal flag text, or parseArgs declares it
      // as an option key (`host:` for `--host`).
      const asKey = `${flag.slice(2)}:`;
      assert.ok(
        source.includes(flag) || source.includes(asKey),
        `"${flag}" is documented but never parsed in cli.ts`,
      );
    }
  });

  await t.test('every command has a usage line and a summary', () => {
    for (const doc of COMMANDS) {
      assert.ok(doc.usage.startsWith(doc.cmd), `${doc.cmd}: usage should start with the command`);
      assert.ok(doc.summary.length > 10, `${doc.cmd}: needs a real summary`);
    }
    const index = renderCommandIndex();
    for (const name of commandNames()) assert.ok(index.includes(name), `${name} missing from the index`);
  });

  await t.test('the real binary answers help for a topic and for every command', async () => {
    const home = tmpHome('t13h-');
    const topic = await runCli(['help', 'agent'], home);
    assert.equal(topic.code, 0);
    assert.match(topic.stdout, /termcrab agent/);
    assert.match(topic.stdout, /--as/);

    // The one that used to throw: disk parses its own flags with parseArgs.
    const disk = await runCli(['disk', '--help'], home);
    assert.equal(disk.code, 0, 'disk --help must not fail');
    assert.match(disk.stdout, /--trim/);

    const missing = await runCli(['help', 'nonsense'], home);
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /unknown command/);
  });
});

// ------------------------------------------------------------- 13.4 completion

test('13.4 completion scripts come from the same table', async (t) => {
  await t.test('bash, zsh and fish know every command', () => {
    for (const shell of ['bash', 'zsh', 'fish'] as const) {
      const script = completionScript(shell);
      assert.ok(script, `${shell} script missing`);
      for (const name of commandNames()) {
        assert.ok(script!.includes(name), `${shell} completion misses "${name}"`);
      }
    }
    assert.ok(completionScript('bash')!.includes('complete -F _termcrab termcrab'));
    assert.ok(completionScript('zsh')!.startsWith('#compdef termcrab'));
    assert.ok(completionScript('fish')!.includes('complete -c termcrab'));
    assert.equal(completionScript('powershell'), null);
  });

  await t.test('the real binary prints a script and refuses a made-up shell', async () => {
    const home = tmpHome('t13k-');
    const bash = await runCli(['completion', 'bash'], home);
    assert.equal(bash.code, 0);
    assert.match(bash.stdout, /_termcrab\(\)/);
    assert.match(bash.stdout, /complete -F _termcrab termcrab/);

    const bad = await runCli(['completion', 'powershell'], home);
    assert.equal(bad.code, 1);
    assert.match(bad.stderr, /unsupported shell/);

    const none = await runCli(['completion'], home);
    assert.equal(none.code, 1);
    assert.match(none.stderr, /usage: termcrab completion/);
  });
});
