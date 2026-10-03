/**
 * Batch 14 — machine-readable output, without breaking the human one.
 *
 *   14.1 one document: `--json` writes exactly one JSON object to stdout
 *        (`{ok, command, data}`), whatever else is going on.
 *   14.2 coverage: status, sessions, skills, cron, memory, approvals, disk,
 *        usage, doctor, run/wait, stop all have a machine view, and
 *        `termcrab help <cmd>` documents the keys a script can read.
 *   14.3 discipline: in `--json` mode every log line goes to stderr, so a
 *        warning can never land in the middle of the document.
 *   14.4 failures: a failing `--json` run prints the error envelope and still
 *        exits non-zero (1 failed, 124 timeout, 130 stopped).
 *   14.5 the contract is written down and the census row says WORKING.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { startGateway, GatewayHandle } from '../src/gateway/server.js';
import { defaults, saveConfig } from '../src/core/config.js';

const execFileAsync = promisify(execFile);
const BIN = path.join(process.cwd(), 'dist/src/bin/termcrab.js');

function tmpHome(prefix: string): string {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.env.TCRAB_HOME = home;
  return home;
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const p = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(p));
    });
  });
}

interface Envelope {
  ok: boolean;
  command: string;
  data?: Record<string, unknown>;
  error?: { message: string; hint?: string };
}

async function runJson(
  args: string[],
  home: string,
  env: Record<string, string> = {},
): Promise<{ env: Envelope; stdout: string; stderr: string; code: number }> {
  const base: NodeJS.ProcessEnv = { ...process.env, TCRAB_HOME: home };
  for (const key of ['NO_COLOR', 'FORCE_COLOR', 'TCRAB_COLOR']) delete base[key];
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [BIN, ...args, '--json'], {
      env: { ...base, ...env },
      encoding: 'utf8',
      timeout: 60_000,
    });
    return { env: parseEnvelope(stdout), stdout, stderr, code: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return { env: parseEnvelope(e.stdout ?? ''), stdout: e.stdout ?? '', stderr: e.stderr ?? '', code: e.code ?? 1 };
  }
}

/** One JSON document, and nothing else, on stdout. */
function parseEnvelope(stdout: string): Envelope {
  const trimmed = stdout.trim();
  assert.ok(trimmed.startsWith('{') && trimmed.endsWith('}'), `stdout must be one JSON object, got: ${trimmed.slice(0, 200)}`);
  const parsed = JSON.parse(trimmed) as Envelope;
  assert.deepEqual(
    Object.keys(parsed).sort(),
    parsed.ok || !parsed.error ? ['command', 'data', 'ok'] : ['command', 'error', 'ok'],
    'the envelope has exactly the contract keys',
  );
  return parsed;
}

// --------------------------------------------------------------------- 14.1

test('14.1 --json writes exactly one JSON document to stdout', async (t) => {
  const home = tmpHome('t14a-');
  // A little state so the list commands have something to report.
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  saveConfig(config);

  const commands: Array<[string, string[]]> = [
    ['status', ['status']],
    ['sessions', ['sessions', 'ls']],
    ['skills', ['skills', 'ls']],
    ['cron', ['cron', 'ls']],
    ['memory', ['memory', 'show']],
    ['disk', ['disk']],
    ['doctor', ['doctor']],
  ];
  for (const [name, args] of commands) {
    await t.test(`${name}: parses, and says which command it was`, async () => {
      const { env, stdout, code } = await runJson(args, home);
      assert.equal(env.ok, true, `${name} reported ok`);
      assert.equal(env.command, name);
      assert.equal(typeof env.data, 'object');
      assert.equal(code, 0);
      assert.ok(stdout.trimEnd().endsWith('}'), 'nothing after the document');
    });
  }
});

// --------------------------------------------------------------------- 14.2

test('14.2 every structured command has a documented machine view', async (t) => {
  const home = tmpHome('t14b-');
  const keys: Record<string, string[]> = {
    status: ['name', 'brain', 'queue', 'memory', 'configProblems'],
    sessions: ['count', 'sessions'],
    skills: ['count', 'skills'],
    cron: ['count', 'jobs'],
    memory: ['text', 'facts', 'totalFacts'],
    disk: ['before', 'budgetBytes', 'keepDays'],
    doctor: ['checks', 'failed'],
  };

  for (const [name, required] of Object.entries(keys)) {
    await t.test(`${name}: data carries the documented keys`, async () => {
      const { env } = await runJson([name, ...(name === 'sessions' || name === 'skills' || name === 'cron' ? ['ls'] : name === 'memory' ? ['show'] : [])], home);
      for (const key of required) {
        assert.ok(key in (env.data ?? {}), `${name} data is missing "${key}"`);
      }
      // …and the help page promises them.
      const help = await execFileAsync(process.execPath, [BIN, 'help', name], { encoding: 'utf8' });
      assert.match(help.stdout, /--json/, `${name} help must mention --json`);
      for (const key of required) assert.ok(help.stdout.includes(key), `${name} help must document "${key}"`);
    });
  }

  await t.test('the panel-backed commands too (approvals, usage, stop)', async () => {
    const port = await freePort();
    const cfg = defaults();
    cfg.provider = { type: 'mock', model: 'mock-1' };
    cfg.gateway.token = 'json-token';
    cfg.gateway.port = port;
    saveConfig(cfg); // the CLI reads this file — same port, same token
    const handle: GatewayHandle = await startGateway({ config: cfg, host: '127.0.0.1', port });
    try {
      for (const [name, args, required] of [
        ['approvals', ['approvals', 'list'], ['count', 'approvals']],
        ['usage', ['usage'], ['day', 'turns', 'byModel']],
        ['stop', ['stop'], ['count', 'stopped']],
      ] as Array<[string, string[], string[]]>) {
        const env = JSON.parse(
          (await execFileAsync(process.execPath, [BIN, ...args, '--json'], {
            env: { ...process.env, TCRAB_HOME: home },
            encoding: 'utf8',
          })).stdout,
        ) as Envelope;
        assert.equal(env.ok, true, `${name} ok`);
        assert.equal(env.command, name);
        for (const key of required) assert.ok(key in (env.data ?? {}), `${name} data is missing "${key}"`);
        const help = await execFileAsync(process.execPath, [BIN, 'help', name], { encoding: 'utf8' });
        assert.match(help.stdout, /--json/, `${name} help must mention --json`);
      }
    } finally {
      await handle.stop();
    }
  });
});

// --------------------------------------------------------------------- 14.3

test('14.3 in --json mode, logs go to stderr and stdout stays parseable', async (t) => {
  await t.test('the logger itself moves (info and warn both to stderr)', async () => {
    const script = `
      import { log, setLogToStderr, logStream } from '${path.join(process.cwd(), 'dist/src/core/logger.js').replace(/\\/g, '/')}';
      setLogToStderr(true);
      log.info('an info line');
      log.warn('a warning');
      process.stderr.write('stream=' + logStream() + '\\n');
    `;
    const out = await execFileAsync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    assert.equal(out.stdout, '', 'nothing lands on stdout');
    assert.match(out.stderr, /an info line/);
    assert.match(out.stderr, /a warning/);
    assert.match(out.stderr, /stream=stderr/);
  });

  await t.test('a config warning cannot corrupt the document', async () => {
    const home = tmpHome('t14c-');
    const config = defaults();
    config.provider = { type: 'mock', model: 'mock-1' };
    saveConfig(config);
    const file = path.join(home, 'config.json');
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    raw.mysteryKey = 1;
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));

    const { env, stdout } = await runJson(['status'], home);
    assert.equal(env.ok, true);
    const problems = (env.data?.configProblems ?? []) as { path: string; message: string }[];
    assert.ok(
      problems.some((p) => p.path === 'mysteryKey'),
      'the ignored key is reported in the machine view',
    );
    assert.ok(!stdout.includes('unknown key'), 'the human wording stays off stdout');
  });
});

// --------------------------------------------------------------------- 14.4

test('14.4 a failing --json run still prints the envelope and exits non-zero', async (t) => {
  const home = tmpHome('t14d-');
  const config = defaults();
  config.provider = { type: 'mock', model: 'mock-1' };
  config.gateway.port = 1; // nothing listens here
  saveConfig(config);

  await t.test('panel down: usage', async () => {
    const { env, code, stdout } = await runJson(['usage'], home);
    assert.equal(env.ok, false);
    assert.equal(env.command, 'usage');
    assert.ok(env.error?.message);
    assert.ok(env.error?.hint, 'the envelope carries the fix too');
    assert.notEqual(code, 0);
    assert.ok(stdout.trimEnd().endsWith('}'));
  });

  await t.test('missing session: sessions export', async () => {
    const { env, code } = await runJson(['sessions', 'export', 'nope:nothing'], home);
    assert.equal(env.ok, false);
    assert.match(env.error?.message ?? '', /no chat found/);
    assert.notEqual(code, 0);
  });

  await t.test('missing job: cron rm', async () => {
    const { env, code } = await runJson(['cron', 'rm', 'zzz'], home);
    assert.equal(env.ok, false);
    assert.match(env.error?.message ?? '', /no cron job/);
    assert.notEqual(code, 0);
  });

  await t.test('still running: exit 124 with the error envelope', async () => {
    // A fake panel that always says "running" — the timeout path, offline.
    const port = await freePort();
    const server = http.createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url?.startsWith('/api/runs/')) {
        res.end(JSON.stringify({ runId: 'slow', sessionId: 'cli:main', status: 'running', output: null }));
        return;
      }
      res.statusCode = 404;
      res.end('{}');
    });
    await new Promise<void>((r) => server.listen(port, '127.0.0.1', () => r()));
    const fakeHome = tmpHome('t14e-');
    const cfg = defaults();
    cfg.provider = { type: 'mock', model: 'mock-1' };
    cfg.gateway.port = port;
    saveConfig(cfg);
    try {
      const { env, code } = await runJson(['run', '--wait', 'slow', '--timeout', '0'], fakeHome);
      assert.equal(env.ok, false);
      assert.match(env.error?.message ?? '', /still running/);
      assert.equal(code, 124, 'a timeout keeps the shell convention');
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

// --------------------------------------------------------------------- 14.5

test('14.5 the contract is documented, and the census says so', async (t) => {
  const doc = path.join(process.cwd(), 'docs/CLI.md');
  await t.test('docs/CLI.md shows a real example for every covered command', () => {
    assert.ok(fs.existsSync(doc), 'docs/CLI.md exists');
    const text = fs.readFileSync(doc, 'utf8');
    assert.match(text, /"ok":\s*true/, 'the success envelope is spelled out');
    assert.match(text, /"ok":\s*false/, 'the failure shape is spelled out too');
    assert.match(text, /"error"/, 'the failure envelope shows where the message and hint go');
    for (const cmd of ['status', 'sessions', 'skills', 'cron', 'memory', 'approvals', 'disk', 'usage', 'doctor', 'run', 'stop']) {
      assert.ok(new RegExp(`termcrab ${cmd}[^\\n]*--json`).test(text), `docs/CLI.md needs a real ${cmd} example`);
    }
  });

  await t.test('the census row moved to WORKING with this test as evidence', () => {
    const census = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/openclaw/data/census.json'), 'utf8')) as {
      rows: { capability: string; verdict: string; evidence: string }[];
    };
    const row = census.rows.find((r) => r.capability === 'JSON output mode');
    assert.ok(row, 'the row exists');
    assert.equal(row!.verdict, 'WORKING');
    assert.match(row!.evidence, /test\/tier2c\.test\.ts/);
  });
});
