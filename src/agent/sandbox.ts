/**
 * A sandbox for shell commands, when the device can give us one (batch 30).
 *
 * `exec` is the sharpest tool this agent has. Batch 22 put a guard in front of
 * it (catastrophe list, timeout, capped output) and approvals behind it — that
 * stops the *mistakes* we know how to name. It does nothing about the command
 * nobody predicted: a model that decides to read `~/.ssh`, or a script that
 * writes outside the workspace, is inside the same process and the same home
 * directory.
 *
 * A real sandbox is a kernel feature, and Linux phones have three ways to get
 * one:
 *
 *   bwrap   — bubblewrap: unprivileged user namespaces. The right answer:
 *             read-only root, one writable workspace, a private /tmp, no
 *             network unless asked, no /proc from the host.
 *   proot   — userspace chroot: works where unprivileged namespaces are
 *             blocked (many Android kernels), slower, and **cannot** hide the
 *             network — we say that out loud instead of pretending.
 *   none    — no way to isolate. Then the honest thing is a sentence naming
 *             the package to install, not a silent unsandboxed run.
 *
 * `agent.sandbox` decides what happens in that last case:
 *   auto (default) — sandbox when available, otherwise run and *say* it did not;
 *   require        — refuse to run at all, with the install hint;
 *   off            — never sandbox (the pre-30 behaviour), recorded in the run.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Config } from '../core/config.js';

export type SandboxMode = 'bwrap' | 'proot' | 'off' | 'none';

export interface SandboxInfo {
  mode: SandboxMode;
  /** Absolute path to the helper, when one was found. */
  binary: string | null;
  /** One line the owner can act on. */
  note: string;
  /** True when commands run inside a real isolation boundary. */
  isolated: boolean;
  /** Can the sandbox take the network away? proot cannot. */
  canDropNetwork: boolean;
}

export interface PlanOpts {
  /** Directory the command runs in, and the only writable path inside. */
  cwd: string;
  /** Extra directories to make writable (config: agent.sandboxWrites). */
  extraWrites?: string[];
  /** Keep the network reachable (default false: no network). */
  network?: boolean;
  /** Shell to run inside. */
  shell: string;
}

export interface SandboxPlan {
  mode: SandboxMode;
  /** The program to spawn (`sandbox binary`, or the shell itself when off). */
  command: string;
  /** Full argv, built as an array — nothing is ever re-parsed by a shell. */
  args: string[];
  /** What the owner should know about this run, for the transcript. */
  note: string;
  /** True when this run really is inside the sandbox. */
  isolated: boolean;
}

export const INSTALL_HINTS: Record<string, string> = {
  bwrap: 'install bubblewrap (`pkg install bubblewrap` on Termux, `apt install bubblewrap` on Debian/Ubuntu)',
  proot: 'or install proot (`pkg install proot`), which works without user namespaces',
};

const cache = new Map<string, SandboxInfo | null>();

/** Forget what we found — a phone can install bubblewrap while the agent runs. */
export function resetSandboxCache(): void {
  cache.clear();
}

function canRun(binary: string, args: string[]): boolean {
  try {
    execFileSync(binary, args, { stdio: 'ignore', timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

function findOnPath(name: string, pathValue: string | undefined): string | null {
  if (pathValue === undefined) return null;
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

/**
 * What is available on this device? Probed once per process (each probe runs
 * the binary, which is the only honest test — an executable on PATH that
 * cannot create a namespace is not a sandbox), and injectable for tests.
 */
export function detectSandbox(opts: { pathValue?: string; useCache?: boolean } = {}): SandboxInfo {
  const key = opts.pathValue ?? process.env.PATH ?? '';
  if (opts.useCache !== false) {
    const hit = cache.get(key);
    if (hit !== undefined && hit !== null) return hit;
  }
  const pathValue = opts.pathValue ?? process.env.PATH;
  const bwrap = findOnPath('bwrap', pathValue);
  if (bwrap && canRun(bwrap, ['--version'])) {
    const info: SandboxInfo = {
      mode: 'bwrap',
      binary: bwrap,
      note: 'bubblewrap is available: commands run with a read-only root, one writable workspace and a private /tmp',
      isolated: true,
      canDropNetwork: true,
    };
    cache.set(key, info);
    return info;
  }
  const proot = findOnPath('proot', pathValue);
  if (proot && canRun(proot, ['--version'])) {
    const info: SandboxInfo = {
      mode: 'proot',
      binary: proot,
      note: 'proot is available: commands run in a userspace chroot — but proot cannot take the network away, so network access is unchanged',
      isolated: true,
      canDropNetwork: false,
    };
    cache.set(key, info);
    return info;
  }
  const info: SandboxInfo = {
    mode: 'none',
    binary: null,
    note: `no sandbox on this device — ${INSTALL_HINTS.bwrap}, ${INSTALL_HINTS.proot}`,
    isolated: false,
    canDropNetwork: false,
  };
  cache.set(key, info);
  return info;
}

/** The config value, forgivingly: junk means `auto`. */
export function sandboxSetting(config: Config | undefined): 'auto' | 'require' | 'off' {
  const raw = config?.agent?.sandbox;
  return raw === 'require' || raw === 'off' ? raw : 'auto';
}

/**
 * Build the argv for one command. Separated from running it so a test can
 * assert the exact arguments — a sandbox whose flags are wrong is worse than
 * no sandbox, because it looks like one.
 */
export function sandboxPlan(
  info: SandboxInfo,
  command: string,
  opts: PlanOpts,
  setting: 'auto' | 'require' | 'off' = 'auto',
): SandboxPlan {
  const cwd = path.resolve(opts.cwd);
  const writes = [cwd, ...(opts.extraWrites ?? []).map((p) => path.resolve(p))];
  if (setting === 'off' || info.mode === 'none') {
    return {
      mode: setting === 'off' ? 'off' : 'none',
      command: opts.shell,
      args: ['-c', command],
      note:
        setting === 'off'
          ? 'sandbox is off (agent.sandbox=off): this command ran with full access to the device'
          : `ran without a sandbox: ${info.note}`,
      isolated: false,
    };
  }

  if (info.mode === 'bwrap') {
    const args = [
      '--ro-bind', '/', '/',
      '--dev', '/dev',
      '--proc', '/proc',
      '--tmpfs', '/tmp',
      // A private home: tools that write dotfiles get somewhere harmless to do
      // it, and the real ~/.ssh, ~/.netrc and config.json are read-only.
      '--tmpfs', '/tmp/termcrab-home',
      '--setenv', 'HOME', '/tmp/termcrab-home',
      '--setenv', 'TMPDIR', '/tmp',
      '--unshare-pid',
      '--unshare-ipc',
      '--unshare-uts',
      '--unshare-cgroup-try',
      '--die-with-parent',
      '--new-session',
      '--chdir', cwd,
    ];
    for (const dir of writes) {
      if (dir === '/') continue;
      args.push('--bind', dir, dir);
    }
    if (!opts.network) args.push('--unshare-net');
    args.push('--', opts.shell, '-c', command);
    return {
      mode: 'bwrap',
      command: info.binary!,
      args,
      note: opts.network
        ? 'ran in bubblewrap (read-only root, one writable workspace, network kept)'
        : 'ran in bubblewrap (read-only root, one writable workspace, no network)',
      isolated: true,
    };
  }

  // proot: -0 pretends to be root so package managers inside the chroot work;
  // -w sets the working directory; /dev, /proc and the writable paths are
  // bound in. There is no network flag to set — that is the honest gap.
  const args = ['-0', '-r', '/', '-w', cwd, '-b', '/dev', '-b', '/proc'];
  for (const dir of writes) args.push('-b', dir);
  args.push(opts.shell, '-c', command);
  return {
    mode: 'proot',
    command: info.binary!,
    args,
    note: opts.network
      ? 'ran in proot (userspace chroot; network unchanged)'
      : 'ran in proot (userspace chroot; proot cannot drop the network, so it stays reachable)',
    isolated: true,
  };
}

export interface SandboxDecision {
  /** Refuse the command instead of running it outside a sandbox? */
  refuse: boolean;
  /** One sentence for the model/owner when refused. */
  reason: string;
  plan: SandboxPlan;
  info: SandboxInfo;
}

/**
 * Decide, then build. This is the function the exec tool calls: `require` with
 * nothing available must come back with a refusal sentence a person can act on.
 */
export function sandboxFor(
  config: Config | undefined,
  command: string,
  opts: PlanOpts,
  detect: { pathValue?: string; useCache?: boolean } = {},
): SandboxDecision {
  const info = detectSandbox(detect);
  const setting = sandboxSetting(config);
  const plan = sandboxPlan(info, command, opts, setting);
  if (setting === 'require' && !info.isolated) {
    return {
      refuse: true,
      reason: `refused: agent.sandbox=require but ${info.note}`,
      plan,
      info,
    };
  }
  return { refuse: false, reason: '', plan, info };
}
