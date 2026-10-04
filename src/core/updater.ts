/** One-shot self-update: pull the latest code, install, build — with progress callbacks. */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from './logger.js';

export type ApplyPhase = 'pull' | 'install' | 'build';
export type ApplyResult = { ok: true } | { ok: false; error: string };

export interface ApplyOptions {
  /** Called right before each step starts (progress over SSE). */
  onPhase?: (phase: ApplyPhase) => void;
  /** Command runner — injectable so tests never touch git/npm for real. */
  runImpl?: (cmd: string, args: string[], cwd: string) => Promise<string>;
  /** The install to update. Defaults to the git root this file lives in. */
  rootOverride?: string;
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
  const root = opts.rootOverride ?? repoRoot();
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

// ---------------------------------------------------------------------------
// Verified apply with rollback (31.3)
// ---------------------------------------------------------------------------

export interface BuildSnapshot {
  dir: string;
  release: string;
  files: number;
  bytes: number;
  createdAt: string;
}

export interface VerifyResult {
  ok: boolean;
  detail: string;
}

/** Where snapshots live: state/builds/<release>-<stamp>/. */
export function buildsDir(homeRoot: string): string {
  return path.join(homeRoot, 'state', 'builds');
}

/**
 * Copy the parts of an install that an update replaces and a rollback restores:
 * the compiled CLI (`dist/`), the panel (`ui/`), the built-in skills and
 * `package.json`. The *state* is never touched — a rollback is about code.
 */
export function snapshotBuild(homeRoot: string, root: string, release: string): BuildSnapshot | null {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(buildsDir(homeRoot), `${release || 'unknown'}-${stamp}`);
  let files = 0;
  let bytes = 0;
  try {
    fs.mkdirSync(dir, { recursive: true });
    const copy = (rel: string): void => {
      const from = path.join(root, rel);
      if (!fs.existsSync(from)) return;
      const to = path.join(dir, rel);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      if (fs.statSync(from).isDirectory()) {
        // Every child goes through copy() so its destination directory is
        // created first: copying a nested file inline used to land in a
        // directory that did not exist yet.
        for (const name of fs.readdirSync(from)) copy(`${rel}/${name}`);
      } else {
        fs.copyFileSync(from, to);
        files += 1;
        bytes += fs.statSync(from).size;
      }
    };
    // `dist/src` holds the CLI, `dist/test` is the suite (never worth keeping),
    // and the two asset folders are small enough to always keep.
    copy('package.json');
    const copyDir = (rel: string, skip: (name: string) => boolean = () => false): void => {
      const from = path.join(root, rel);
      if (!fs.existsSync(from)) return;
      for (const name of fs.readdirSync(from)) {
        if (skip(name)) continue;
        copy(`${rel}/${name}`);
      }
    };
    copyDir('ui');
    copyDir('skills');
    copyDir('dist', (name) => name === 'test');
    fs.writeFileSync(
      path.join(dir, 'SNAPSHOT.json'),
      `${JSON.stringify({ release, createdAt: new Date().toISOString(), files, bytes, root }, null, 2)}\n`,
      'utf8',
    );
    return { dir, release, files, bytes, createdAt: new Date().toISOString() };
  } catch (err) {
    // A snapshot that silently is not a snapshot is worse than none: say so,
    // and tell the caller clearly that there is nothing to roll back to.
    log.warn(`snapshot: could not copy the build into ${dir}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** The newest snapshot, for `termcrab update --rollback`. */
export function latestBuildSnapshot(homeRoot: string): string | null {
  const dir = buildsDir(homeRoot);
  try {
    const all = fs
      .readdirSync(dir)
      .filter((n) => fs.existsSync(path.join(dir, n, 'SNAPSHOT.json')))
      .sort();
    const newest = all[all.length - 1];
    return newest ? path.join(dir, newest) : null;
  } catch {
    return null;
  }
}

/** Put a snapshot back over an install. Returns how many files were written. */
export function restoreBuildSnapshot(snapshot: string, root: string): number {
  let written = 0;
  const walk = (rel: string): void => {
    const from = path.join(snapshot, rel);
    const st = fs.statSync(from);
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(from)) walk(`${rel}/${name}`);
      return;
    }
    if (rel === 'SNAPSHOT.json') return;
    const to = path.join(root, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const tmp = `${to}.rollback-tmp`;
    fs.copyFileSync(from, tmp);
    fs.renameSync(tmp, to);
    written += 1;
  };
  for (const name of fs.readdirSync(snapshot)) walk(name);
  return written;
}

/**
 * Does the build in `root` actually start? Running the CLI is the only honest
 * test: a missing import, a syntax error or an empty dist/ all show up as a
 * non-zero exit or an error on stderr, and a build that "succeeded" but cannot
 * boot is exactly what a rollback is for.
 */
export async function verifyBuild(
  root: string,
  opts: { runImpl?: (cmd: string, args: string[], cwd: string) => Promise<string>; timeoutMs?: number } = {},
): Promise<VerifyResult> {
  const run = opts.runImpl ?? defaultRun;
  const entry = path.join(root, 'dist', 'src', 'bin', 'termcrab.js');
  if (!fs.existsSync(entry)) return { ok: false, detail: `the build produced no CLI at ${entry}` };
  try {
    const out = await run(process.execPath, [entry, '--version'], root);
    if (!/termcrab \d+\.\d+\.\d+/.test(out)) return { ok: false, detail: `the new build did not answer --version (it said: ${out.trim().slice(0, 120)})` };
    // A second command that reads real state: if the schema layer or the
    // session store broke, `schema` fails here rather than on the owner's next
    // message.
    const schema = await run(process.execPath, [entry, 'schema', '--json'], root);
    if (!/"ok"\s*:\s*true/.test(schema)) return { ok: false, detail: 'the new build could not read its own state schema' };
    return { ok: true, detail: out.trim() };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export type VerifiedApplyResult =
  | { ok: true; snapshot?: string; verified?: string }
  | { ok: false; error: string; snapshot?: string; rolledBack?: boolean; verified?: string };

/**
 * Apply an update, but keep the ability to take it back:
 * snapshot → apply → verify → (on failure) restore the snapshot.
 * The owner ends up either on the new build or exactly where they started —
 * never on a half-built one.
 */
export async function applyVerified(
  opts: ApplyOptions & {
    homeRoot: string;
    release: string;
    verify?: (root: string) => Promise<VerifyResult>;
    /** The install to update. Defaults to the git root this file lives in; a test seam. */
    root?: string;
  } = { homeRoot: '', release: '' },
): Promise<VerifiedApplyResult> {
  const root = opts.root ?? repoRoot();
  if (!root) return { ok: false, error: 'this install has no git folder — auto-update is not possible here' };
  const snapshot = snapshotBuild(opts.homeRoot, root, opts.release);
  const result = await applyUpdate({ ...opts, rootOverride: root });
  if (!result.ok) {
    // Nothing was built: the snapshot is not needed, but the error is the answer.
    return { ...result, snapshot: snapshot?.dir };
  }
  const verify = opts.verify ?? ((r: string) => verifyBuild(r));
  const check = await verify(root);
  if (check.ok) return { ok: true, snapshot: snapshot?.dir, verified: check.detail };
  if (!snapshot) {
    return { ok: false, error: `the new build did not start (${check.detail}) and there was no snapshot to roll back to`, verified: check.detail };
  }
  try {
    const written = restoreBuildSnapshot(snapshot.dir, root);
    return {
      ok: false,
      error: `the new build did not start (${check.detail}) — rolled back ${written} file(s) to ${opts.release}`,
      snapshot: snapshot.dir,
      rolledBack: true,
      verified: check.detail,
    };
  } catch (err) {
    return {
      ok: false,
      error: `the new build did not start (${check.detail}) and the rollback failed: ${err instanceof Error ? err.message : String(err)} — copy ${snapshot.dir} over ${root} by hand`,
      snapshot: snapshot.dir,
      verified: check.detail,
    };
  }
}
