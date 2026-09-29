import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logsDir, pidPath, stateDir } from '../core/paths.js';
import { log } from '../core/logger.js';

/**
 * Replaces systemd/launchd on Termux: keeps the gateway alive with
 * exponential-backoff restarts, single-instance lock, and log tee.
 *
 *   termcrab supervisor
 */
export async function runSupervisor(): Promise<void> {
  const self = fileURLToPath(import.meta.url); // dist/src/mobile/supervisor.js
  const bin = path.resolve(path.dirname(self), '../bin/termcrab.js');
  const logFile = path.join(logsDir(), 'gateway.log');
  fs.mkdirSync(logsDir(), { recursive: true });
  fs.mkdirSync(stateDir(), { recursive: true });

  log.info('supervisor: starting gateway watchdog');
  let delay = 1000;
  let lastCrash = 0;
  let stopping = false;

  const shutdown = () => {
    stopping = true;
    log.info('supervisor: shutting down');
    if (child) child.kill('SIGTERM');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  let child: ReturnType<typeof spawn> | null = null;

  while (!stopping) {
    const startedAt = Date.now();
    log.info(`supervisor: launching gateway (${bin})`);
    child = spawn(process.execPath, [bin, 'gateway'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    const out = fs.createWriteStream(logFile, { flags: 'a' });
    const tee = (chunk: Buffer, to: NodeJS.WriteStream) => {
      out.write(chunk);
      to.write(chunk);
    };
    child.stdout?.on('data', (c: Buffer) => tee(c, process.stdout));
    child.stderr?.on('data', (c: Buffer) => tee(c, process.stderr));

    const code: number = await new Promise((resolve) => {
      child!.on('exit', (c) => resolve(c ?? 1));
      child!.on('error', () => resolve(1));
    });

    if (stopping) break;
    const aliveFor = Date.now() - startedAt;
    log.warn(`supervisor: gateway exited with code ${code} after ${Math.round(aliveFor / 1000)}s`);

    if (aliveFor > 60_000) delay = 1000; // stable run resets backoff
    const now = Date.now();
    if (now - lastCrash < 60_000) delay = Math.min(delay * 2, 30_000);
    lastCrash = now;

    log.info(`supervisor: restarting in ${delay}ms`);
    await new Promise((r) => setTimeout(r, delay));
  }

  try {
    if (fs.existsSync(pidPath())) fs.unlinkSync(pidPath());
  } catch {
    /* ignore */
  }
}
