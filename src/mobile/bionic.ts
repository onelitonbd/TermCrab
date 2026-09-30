import os from 'node:os';

/**
 * Android/Termux "bionic guard".
 *
 * On Android, Node's os.networkInterfaces() can crash or throw
 * (libuv uv_interface_addresses -> EPERM / Error 13) for unprivileged apps.
 * OpenClaw-on-Termux guides work around it with a hand-edited hijack.js;
 * TermCrab applies the patch automatically at process start, always.
 *
 * This module must be imported FIRST (before anything queries interfaces).
 */

let applied = false;

export function applyBionicGuard(): void {
  if (applied) return;
  applied = true;
  try {
    const original = os.networkInterfaces.bind(os);
    os.networkInterfaces = () => {
      try {
        const result = original();
        if (result && typeof result === 'object') return result;
        return {};
      } catch (err) {
        // Android restriction: degrade gracefully instead of crashing.
        if (process.env.TCRAB_LOG_LEVEL === 'debug') {
          console.warn('[bionic] networkInterfaces() suppressed:', err instanceof Error ? err.message : err);
        }
        return {};
      }
    };
  } catch {
    /* never let the guard itself break startup */
  }

  // Android has no world-writable /tmp. Prefer Termux's $PREFIX/tmp.
  const tmp = process.env.TMPDIR;
  const suspect =
    !tmp || tmp === '/tmp' || tmp === '/var/tmp' || tmp === '/usr/tmp';
  if (suspect) {
    const termuxTmp = '/data/data/com.termux/files/usr/tmp';
    if (process.env.PREFIX) {
      process.env.TMPDIR = `${process.env.PREFIX}/tmp`;
      process.env.TMP = process.env.TMPDIR;
      process.env.TEMP = process.env.TMPDIR;
    } else if (isLikelyAndroid() && os.platform() === 'android') {
      process.env.TMPDIR = termuxTmp;
      process.env.TMP = termuxTmp;
      process.env.TEMP = termuxTmp;
    }
  }
}

export function guardApplied(): boolean {
  return applied;
}

export function isLikelyAndroid(): boolean {
  if (os.platform() === 'android') return true;
  if (process.env.PREFIX && process.env.PREFIX.includes('com.termux')) return true;
  if (process.env.ANDROOT || process.env.ANDROID_ROOT) return true;
  return false;
}

export function isLikelyTermux(): boolean {
  return Boolean(process.env.PREFIX && process.env.PREFIX.includes('com.termux'));
}

// Auto-apply on import (bin entry imports this before anything else).
applyBionicGuard();
