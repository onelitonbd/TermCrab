import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Central path resolution.
 * - TCRAB_HOME (env) overrides the state directory (tests use temp dirs).
 * - Package root is discovered by walking up to package.json with name "termcrab",
 *   so the layout survives compilation into dist/.
 */

function findPackageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
        if (pkg.name === 'termcrab') return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: dist/src/core -> package root is three levels up.
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

export const PACKAGE_ROOT = findPackageRoot();

export function home(): string {
  const env = process.env.TCRAB_HOME;
  if (env && env.trim()) return path.resolve(env);
  return path.join(os.homedir(), '.termcrab');
}

export function configPath(): string {
  return path.join(home(), 'config.json');
}

export function workspaceDir(): string {
  return path.join(home(), 'workspace');
}

export function memoryDir(): string {
  return path.join(home(), 'memory');
}

export function sessionsDir(): string {
  return path.join(home(), 'sessions');
}

export function userSkillsDir(): string {
  return path.join(home(), 'skills');
}

export function logsDir(): string {
  return path.join(home(), 'logs');
}

export function stateDir(): string {
  return path.join(home(), 'state');
}

export function outboxPath(): string {
  return path.join(stateDir(), 'outbox.json');
}

export function pidPath(): string {
  return path.join(stateDir(), 'gateway.pid');
}

export function builtinSkillsDir(): string {
  return path.join(PACKAGE_ROOT, 'skills');
}

export function uiDir(): string {
  return path.join(PACKAGE_ROOT, 'ui');
}

/** Create the full state layout. Idempotent. */
export function ensureLayout(): void {
  const dirs = [
    home(),
    workspaceDir(),
    path.join(workspaceDir(), 'outbox'),
    memoryDir(),
    path.join(memoryDir(), 'daily'),
    sessionsDir(),
    userSkillsDir(),
    logsDir(),
    stateDir(),
    path.join(home(), 'config-backups'),
  ];
  for (const d of dirs) fs.mkdirSync(d, { recursive: true });
}
