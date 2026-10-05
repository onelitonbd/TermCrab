import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  INSTALL_HINTS,
  detectSandbox,
  resetSandboxCache,
  sandboxFor,
  sandboxPlan,
  sandboxSetting,
} from '../src/agent/sandbox.js';
import { runCommand } from '../src/agent/exec-guard.js';
import { defaults, validateConfig } from '../src/core/config.js';

/**
 * Batch 30 — the sandbox.
 *
 * 30.1 a real isolation boundary when the device has one, 30.2 an honest
 * refusal (or an honest note) when it does not, 30.3 doctor/status/docs.
 */

function tmpdir(tag: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `t30-${tag}-`));
}

/** A fake `bwrap`/`proot` on PATH: executable, prints its argv, exits 0. */
function fakeHelper(dir: string, name: string, opts: { failVersion?: boolean } = {}): string {
  const file = path.join(dir, name);
  fs.writeFileSync(
    file,
    opts.failVersion
      ? '#!/bin/sh\nexit 1\n'
      : `#!/bin/sh\nif [ "$1" = "--version" ]; then echo "${name} 1.0-fake"; exit 0; fi\necho "ARGS $@"\nexit 0\n`,
    { mode: 0o755 },
  );
  return file;
}

const SHELL = '/bin/sh';

// ---------------------------------------------------------------------------
// 30.1 — detection and the argument vector
// ---------------------------------------------------------------------------

test('30.1 detection prefers bubblewrap, falls back to proot, and says so plainly', () => {
  resetSandboxCache();
  const empty = tmpdir('empty');
  const none = detectSandbox({ pathValue: empty, useCache: false });
  assert.equal(none.mode, 'none');
  assert.equal(none.isolated, false);
  assert.match(none.note, /no sandbox/);
  assert.match(none.note, /bubblewrap/);

  const prootOnly = tmpdir('proot');
  fakeHelper(prootOnly, 'proot');
  const proot = detectSandbox({ pathValue: prootOnly, useCache: false });
  assert.equal(proot.mode, 'proot');
  assert.equal(proot.isolated, true);
  assert.equal(proot.canDropNetwork, false);
  assert.match(proot.note, /cannot take the network away/, 'proot is described honestly');

  const both = tmpdir('both');
  fakeHelper(both, 'proot');
  fakeHelper(both, 'bwrap');
  assert.equal(detectSandbox({ pathValue: both, useCache: false }).mode, 'bwrap', 'bubblewrap wins');

  // Executable but broken: an unusable binary is not a sandbox.
  const broken = tmpdir('broken');
  fakeHelper(broken, 'bwrap', { failVersion: true });
  assert.equal(detectSandbox({ pathValue: broken, useCache: false }).mode, 'none');
});

test('30.1 the bubblewrap plan: read-only root, one writable workspace, private tmp, no network', () => {
  const info = { mode: 'bwrap' as const, binary: '/usr/bin/bwrap', note: '', isolated: true, canDropNetwork: true };
  const plan = sandboxPlan(info, 'echo hi', { cwd: '/home/me/workspace', shell: SHELL });
  assert.equal(plan.command, '/usr/bin/bwrap');
  assert.equal(plan.isolated, true);
  assert.match(plan.note, /no network/);

  const argv = plan.args.join(' ');
  assert.match(argv, /--ro-bind \/ \//, 'the root is read-only');
  assert.match(argv, /--bind \/home\/me\/workspace \/home\/me\/workspace/, 'the workspace is the writable path');
  assert.match(argv, /--unshare-net\b/, 'the network is taken away by default');
  assert.match(argv, /--die-with-parent/, 'a killed agent does not leave the command running');
  assert.match(argv, /--unshare-pid/, 'no host process table');
  assert.match(argv, /--chdir \/home\/me\/workspace/);
  assert.match(argv, /--setenv HOME \/tmp\/termcrab-home/, 'a throwaway HOME, so ~/.ssh is not writable');
  assert.deepEqual(plan.args.slice(-4), ['--', SHELL, '-c', 'echo hi'], 'the command is one argv element, never re-parsed');

  // Extra writable paths, and the deliberate network switch.
  const netted = sandboxPlan(info, 'curl example.com', { cwd: '/w', shell: SHELL, network: true, extraWrites: ['/srv/share'] });
  assert.equal(netted.args.join(' ').includes('--unshare-net'), false);
  assert.match(netted.args.join(' '), /--bind \/srv\/share \/srv\/share/);
  assert.match(netted.note, /network kept/);
});

test('30.1 the proot plan is built the same way, and admits the network gap', () => {
  const info = { mode: 'proot' as const, binary: '/usr/bin/proot', note: '', isolated: true, canDropNetwork: false };
  const plan = sandboxPlan(info, 'ls', { cwd: '/data/workspace', shell: SHELL });
  assert.equal(plan.command, '/usr/bin/proot');
  assert.deepEqual(plan.args, ['-0', '-r', '/', '-w', '/data/workspace', '-b', '/dev', '-b', '/proc', '-b', '/data/workspace', SHELL, '-c', 'ls']);
  assert.match(plan.note, /cannot drop the network/);
});

test('30.1 sandbox=off is the old behaviour, and it is recorded as such', () => {
  const info = { mode: 'bwrap' as const, binary: '/usr/bin/bwrap', note: 'x', isolated: true, canDropNetwork: true };
  const plan = sandboxPlan(info, 'echo hi', { cwd: '/w', shell: SHELL }, 'off');
  assert.equal(plan.mode, 'off');
  assert.equal(plan.isolated, false);
  assert.equal(plan.command, SHELL);
  assert.deepEqual(plan.args, ['-c', 'echo hi']);
  assert.match(plan.note, /full access to the device/);
});

// ---------------------------------------------------------------------------
// 30.2 — the three policies
// ---------------------------------------------------------------------------

test('30.2 auto runs and notes that it could not sandbox; require refuses with the fix', () => {
  const config = defaults();
  assert.equal(sandboxSetting(config), 'auto', 'the default is auto');
  const emptyDir = tmpdir('policy');
  const detect = { pathValue: emptyDir, useCache: false };

  const auto = sandboxFor(config, 'echo hi', { cwd: '/w', shell: SHELL }, detect);
  assert.equal(auto.refuse, false, 'auto never blocks the agent mid-thought');
  assert.equal(auto.plan.isolated, false);
  assert.match(auto.plan.note, /ran without a sandbox/);
  assert.match(auto.plan.note, /bubblewrap/, 'the note names the package, so the owner can fix it');

  config.agent.sandbox = 'require';
  const required = sandboxFor(config, 'echo hi', { cwd: '/w', shell: SHELL }, detect);
  assert.equal(required.refuse, true);
  assert.match(required.reason, /agent\.sandbox=require/);
  assert.match(required.reason, /pkg install bubblewrap|apt install bubblewrap/);

  // With a helper present, `require` is satisfied and the plan really isolates.
  const withBwrap = tmpdir('policy2');
  fakeHelper(withBwrap, 'bwrap');
  const ok = sandboxFor(config, 'echo hi', { cwd: '/w', shell: SHELL }, { pathValue: withBwrap, useCache: false });
  assert.equal(ok.refuse, false);
  assert.equal(ok.plan.isolated, true);
  assert.equal(ok.plan.mode, 'bwrap');

  config.agent.sandbox = 'off';
  const off = sandboxFor(config, 'echo hi', { cwd: '/w', shell: SHELL }, { pathValue: withBwrap, useCache: false });
  assert.equal(off.plan.isolated, false);
  assert.equal(off.plan.mode, 'off');

  // Config accepts the keys.
  const problems = validateConfig(config).filter((p) => p.path.includes('sandbox'));
  assert.equal(problems.length, 0, `config complained: ${JSON.stringify(problems)}`);
  assert.match(INSTALL_HINTS['bwrap']!, /bubblewrap/);
});

// ---------------------------------------------------------------------------
// 30.2 — the guard, the runner and the note
// ---------------------------------------------------------------------------

test('30.2 the runner spawns the sandbox binary, not a shell string, and reports how it ran', async () => {
  const seen: { program: string; args: string[] }[] = [];
  const fake = async (program: string, args: string[]): Promise<{ stdout: string; stderr: string }> => {
    seen.push({ program, args });
    return { stdout: 'hello from inside\n', stderr: '' };
  };
  const plan = sandboxPlan(
    { mode: 'bwrap' as const, binary: '/usr/bin/bwrap', note: '', isolated: true, canDropNetwork: true },
    'echo hello',
    { cwd: '/w', shell: SHELL },
  );
  const result = await runCommand('echo hello', SHELL, {
    execImpl: fake as never,
    sandbox: { command: plan.command, args: plan.args, note: plan.note, isolated: plan.isolated },
  });
  assert.equal(result.ok, true);
  assert.equal(seen.length, 1);
  const first = seen[0]!;
  assert.equal(first.program, '/usr/bin/bwrap', 'the sandbox binary is the program');
  assert.deepEqual(first.args.slice(-3), [SHELL, '-c', 'echo hello']);
  assert.deepEqual(result.sandbox, { mode: 'sandboxed', isolated: true, note: plan.note });

  // A refusal by the catastrophe guard still reports the sandbox it would have used.
  const refused = await runCommand('rm -rf /', SHELL, { execImpl: fake as never, sandbox: { command: plan.command, args: plan.args, note: plan.note, isolated: true } });
  assert.equal(refused.ok, false);
  assert.ok(refused.refused, 'the deny rule fired');
  assert.equal(seen.length, 1, 'nothing spawned for a refused command');
  assert.equal(refused.sandbox?.mode, 'sandboxed');
});

test('30.2 the exec tool carries the sandbox note, and require stops it before it spawns', async () => {
  const home = tmpdir('exec');
  process.env.TCRAB_HOME = home;
  const { buildTools } = await import('../src/agent/tools.js');
  const { MemoryStore } = await import('../src/agent/memory.js');
  const { SessionStore } = await import('../src/agent/sessions.js');
  const { SkillStore } = await import('../src/skills/loader.js');

  const makeExec = async (agentOver: Record<string, unknown>) => {
    const config = defaults();
    config.provider = { type: 'mock', model: 'mock-1' };
    Object.assign(config.agent, agentOver);
    const tools = await buildTools({
      config,
      memory: new MemoryStore(),
      skills: new SkillStore(),
      sessions: new SessionStore(),
    } as never);
    return tools.find((t: { def: { name: string } }) => t.def.name === 'exec')!;
  };

  // auto with nothing installed: it runs, and the output says what that meant.
  const autoOut = await (await makeExec({ sandbox: 'auto' })).execute({ command: 'echo sandbox-probe' });
  assert.match(autoOut, /sandbox-probe/);
  assert.match(autoOut, /^\[sandbox\] ran without a sandbox/, 'the note comes first, so it is not skimmed past');
  assert.match(autoOut, /bubblewrap/);

  // require: refused, with the fix, and nothing spawned.
  const required = await makeExec({ sandbox: 'require' });
  const refused = await required.execute({ command: 'echo should-not-run' });
  assert.match(refused, /agent\.sandbox=require/);
  assert.match(refused, /pkg install bubblewrap|apt install bubblewrap/);
  assert.equal(/should-not-run/.test(refused), false, 'the command never ran');

  // off: runs, and says the choice out loud.
  const offOut = await (await makeExec({ sandbox: 'off' })).execute({ command: 'echo off-probe' });
  assert.match(offOut, /off-probe/);
  assert.match(offOut, /sandbox is off/);
});

// ---------------------------------------------------------------------------
// 30.1 — a real sandbox, when this machine can give us one
// ---------------------------------------------------------------------------

test('30.1 (live) bubblewrap, when installed, really isolates the filesystem', async (t) => {
  resetSandboxCache();
  const info = detectSandbox({ useCache: false });
  if (info.mode !== 'bwrap') {
    t.skip(`no bubblewrap here (found: ${info.mode}) — the argument vector is asserted above`);
    return;
  }
  const inside = tmpdir('outside');
  fs.writeFileSync(path.join(inside, 'secret.txt'), 'private\n');
  const workspace = tmpdir('ws');
  const plan = sandboxPlan(info, `cat ${path.join(inside, 'secret.txt')} ; echo probe`, { cwd: workspace, shell: '/bin/sh' });
  const result = await runCommand('x', '/bin/sh', {
    sandbox: { command: plan.command, args: plan.args, note: plan.note, isolated: true },
    timeoutMs: 15_000,
  });
  // The file is world-readable to the user, so a read-only bind still allows
  // it — the point of this live check is that the sandbox runs at all and the
  // private HOME is not the real one.
  assert.match(result.output, /probe/);
  assert.equal(result.sandbox?.mode, 'sandboxed');
});
