/** One-shot self-update: pull the latest code, install, build — with progress callbacks. */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type ApplyPhase = 'pull' | 'install' | 'build';
export type ApplyResult = { ok: true } | { ok: false; error: string };

export interface ApplyOptions {
  /** Called right before each step starts (progress over SSE). */
  onPhase?: (phase: ApplyPhase) => void;
  /** Command runner — injectable so tests never touch git/npm for real. */
  runImpl?: (cmd: string, args: string[], cwd: string) => Promise<string>;
}

/**
 * Find the install's git root by walking up from this module
 * (dist/src/core/updater.js → <install root>). Null when not a git checkout.
 */
export function repoRoot(from: string = fileURLToPath(import.meta.url)): string | null {
  let dir = path.dirname(from);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function defaultRun(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      err += d.toString();
    });
    child.on('error', (e) => reject(new Error(`${cmd}: ${e.message}`)));
    child.on('exit', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} ${args.join(' ')} failed (${code}): ${(err || out).trim().slice(0, 400)}`));
    });
  });
}

/**
 * Download and install an update in the install directory:
 *   1. refuse to touch an install with local edits
 *   2. git pull --ff-only
 *   3. npm install
 *   4. npm run build
 * Never throws — returns { ok:false, error } so the caller can show it plainly.
 * The caller restarts the server afterwards.
 */
export async function applyUpdate(opts: ApplyOptions = {}): Promise<ApplyResult> {
  const run = opts.runImpl ?? defaultRun;
  const root = repoRoot();
  if (!root) return { ok: false, error: 'this install has no git folder — auto-update is not possible here' };
  try {
    const status = await run('git', ['status', '--porcelain'], root);
    if (status.trim()) {
      return { ok: false, error: 'this install has local changes — update skipped so nothing is overwritten' };
    }
    const branch = (await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], root)).trim();
    if (!branch || branch === 'HEAD') {
      return { ok: false, error: 'this install sits on a detached checkout — auto-update is not possible' };
    }
    opts.onPhase?.('pull');
    await run('git', ['pull', '--ff-only', 'origin', branch], root);
    opts.onPhase?.('install');
    await run('npm', ['install', '--no-fund', '--no-audit'], root);
    opts.onPhase?.('build');
    await run('npm', ['run', 'build'], root);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
