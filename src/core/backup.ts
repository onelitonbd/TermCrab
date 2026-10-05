/**
 * Backup and restore of a whole home (batch 31.2).
 *
 * "Copy the folder" is the honest answer for a file-based agent, and it is also
 * the reason people lose things: `cp -r` across a phone's storage, a half-done
 * copy, a tar that silently skipped the `.gitignore`d parts. This module makes
 * the copy a command with a manifest:
 *
 *   termcrab backup out.tar      — one archive of everything that matters
 *   termcrab restore out.tar     — verify it, then put it back
 *
 * Format: a plain tar (no compression — `tar` on Termux is busybox, gzip is not
 * always there, and a 3 MB home compresses to maybe 1 MB, which is not worth a
 * dependency). Written by hand on `node:zlib`-free code: 512-byte headers, the
 * ustar magic, and a zero-block terminator. The manifest is a plain JSON file
 * inside the archive, so `tar -xOf out.tar manifest.json | head` answers "what
 * is this and can I use it" without this program.
 */
import fs from 'node:fs';
import path from 'node:path';
import { home } from './paths.js';
import { SCHEMA_VERSION, readStamp } from './schema.js';
import { log } from './logger.js';

/** What goes in, and what stays out. Explicit beats clever for a backup. */
const INCLUDE_DIRS = ['workspace', 'sessions', 'memory', 'skills', 'state', 'logs', 'config-backups'];
const INCLUDE_FILES = ['config.json', 'SOUL.md'];
/** Never worth archiving: sockets, pid files, lock files, snapshots of backups. */
const SKIP = /(\.pid|\.lock|\.tmp|\.migrate-tmp|\.migrate\.tmp)$|^state[/\\]backups($|[/\\])|^logs[/\\]termcrab\.jsonl$/;

export interface BackupManifest {
  format: 'termcrab-backup';
  formatVersion: 1;
  createdAt: string;
  release: string;
  /** The schema version the *content* is written in. */
  schemaVersion: number;
  /** Files in the archive, and their total size before writing. */
  files: number;
  bytes: number;
  /** Host bits that are helpful but not secret. */
  platform: string;
  node: string;
}

export interface BackupResult {
  file: string;
  manifest: BackupManifest;
}

/** Write a POSIX ustar header for a file of `size` bytes. */
function tarHeader(name: string, size: number, mtime: Date, mode: number, isDir: boolean): Buffer {
  const buf = Buffer.alloc(512);
  const write = (offset: number, length: number, value: string): void => {
    buf.write(value.slice(0, length), offset, 'utf8');
  };
  write(0, 100, name);
  write(100, 8, isDir ? '0000755' : (mode & 0o777).toString(8).padStart(7, '0'));
  write(108, 8, '0000000');
  write(116, 8, '0000000');
  // Size: 11 octal digits plus a space — enough for a 8 GB file, which is
  // already more than a phone home will ever be.
  write(124, 12, `${size.toString(8).padStart(11, '0')} `);
  write(136, 12, `${Math.floor(mtime.getTime() / 1000).toString(8).padStart(11, '0')} `);
  write(148, 8, '        '); // checksum placeholder
  buf.write(isDir ? '5' : '0', 156, 'utf8');
  write(257, 6, 'ustar');
  buf.write('00', 263, 'utf8');
  write(265, 32, 'termcrab');
  write(297, 32, 'termcrab');
  let sum = 0;
  for (const byte of buf) sum += byte;
  write(148, 8, `${sum.toString(8).padStart(6, '0')}\0 `);
  return buf;
}

/** Everything that would be archived, as `{ abs, rel, size, isDir, mode }`. */
export function collectHome(root: string = home()): { abs: string; rel: string; size: number; isDir: boolean; mode: number }[] {
  const out: { abs: string; rel: string; size: number; isDir: boolean; mode: number }[] = [];
  const add = (abs: string, rel: string): void => {
    let st: fs.Stats;
    try {
      st = fs.statSync(abs);
    } catch {
      return;
    }
    if (SKIP.test(rel)) return;
    if (st.isDirectory()) {
      out.push({ abs, rel, size: 0, isDir: true, mode: st.mode });
      for (const name of fs.readdirSync(abs).sort()) add(path.join(abs, name), `${rel}/${name}`);
      return;
    }
    if (st.isSymbolicLink && st.isSymbolicLink()) return; // a backup of links is a backup of lies
    if (!st.isFile()) return;
    out.push({ abs, rel, size: st.size, isDir: false, mode: st.mode });
  };
  for (const rel of INCLUDE_FILES) add(path.join(root, rel), rel);
  for (const dir of INCLUDE_DIRS) add(path.join(root, dir), dir);
  return out;
}

/** Write the archive. Returns the manifest that went inside it. */
export function writeBackup(file: string, opts: { release?: string; root?: string } = {}): BackupResult {
  const root = opts.root ?? home();
  const target = path.resolve(file);
  const entries = collectHome(root);
  const manifest: BackupManifest = {
    format: 'termcrab-backup',
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    release: opts.release ?? '',
    schemaVersion: readStamp(root).version || SCHEMA_VERSION,
    files: entries.filter((e) => !e.isDir).length,
    bytes: entries.reduce((n, e) => n + e.size, 0),
    platform: process.platform,
    node: process.version,
  };

  const fd = fs.openSync(target, 'w');
  try {
    const payload: { name: string; body: Buffer }[] = [
      { name: 'manifest.json', body: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8') },
    ];
    for (const entry of entries) {
      payload.push({
        name: entry.isDir ? `${entry.rel}/` : entry.rel,
        body: entry.isDir ? Buffer.alloc(0) : fs.readFileSync(entry.abs),
      });
    }
    for (const item of payload) {
      const isDir = item.name.endsWith('/');
      // Long paths (a session id can be long) do not fit in the ustar name
      // field: fall back to the GNU long-name convention, which tar reads.
      if (Buffer.byteLength(item.name) > 100) {
        fs.writeSync(fd, tarHeader('././@LongLink', Buffer.byteLength(item.name) + 1, new Date(), 0o644, false));
        const nameBuf = Buffer.alloc(Math.ceil((Buffer.byteLength(item.name) + 1) / 512) * 512);
        nameBuf.write(item.name, 0, 'utf8');
        fs.writeSync(fd, nameBuf);
        fs.writeSync(fd, tarHeader(item.name.slice(0, 100), item.body.length, new Date(), 0o644, isDir));
      } else {
        fs.writeSync(fd, tarHeader(item.name, item.body.length, new Date(), 0o644, isDir));
      }
      if (item.body.length) {
        fs.writeSync(fd, item.body);
        const pad = (512 - (item.body.length % 512)) % 512;
        if (pad) fs.writeSync(fd, Buffer.alloc(pad));
      }
    }
    fs.writeSync(fd, Buffer.alloc(1024)); // two empty blocks end a tar
  } finally {
    fs.closeSync(fd);
  }
  return { file: target, manifest };
}

export interface BackupEntry {
  name: string;
  body: Buffer;
}

/** Read an archive back into memory. Throws with a sentence on junk. */
export function readBackup(file: string): { manifest: BackupManifest; entries: BackupEntry[] } {
  const raw = fs.readFileSync(file);
  const entries: BackupEntry[] = [];
  let offset = 0;
  let pendingLongName: string | null = null;
  while (offset + 512 <= raw.length) {
    const header = raw.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;
    let name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const sizeField = header.subarray(124, 136).toString('utf8').trim();
    const size = Number.parseInt(sizeField || '0', 8);
    if (!Number.isFinite(size)) throw new Error(`${file} is not a tar archive this build can read (bad size field)`);
    const type = String.fromCharCode(header[156]!);
    offset += 512;
    const bodyEnd = offset + size;
    if (bodyEnd > raw.length) throw new Error(`${file} is truncated (a file ends before its size does)`);
    const body = raw.subarray(offset, bodyEnd);
    offset += Math.ceil(size / 512) * 512;

    if (name === '././@LongLink' || type === 'L') {
      pendingLongName = body.toString('utf8').replace(/\0.*$/, '');
      continue;
    }
    if (pendingLongName) {
      name = pendingLongName;
      pendingLongName = null;
    }
    if (name === 'manifest.json') {
      try {
        const manifest = JSON.parse(body.toString('utf8')) as BackupManifest;
        if (manifest.format !== 'termcrab-backup') throw new Error('wrong format tag');
        entries.push({ name, body });
        continue;
      } catch {
        throw new Error(`${file} has a manifest.json that is not a TermCrab backup`);
      }
    }
    entries.push({ name, body });
  }
  if (!entries.length) throw new Error(`${file} is empty or not a tar archive`);
  const manifest = entries.find((e) => e.name === 'manifest.json');
  if (!manifest) throw new Error(`${file} is a tar file, but not one of ours (no manifest.json)`);
  const parsed = JSON.parse(manifest.body.toString('utf8')) as BackupManifest;
  return { manifest: parsed, entries };
}

export interface RestorePlan {
  manifest: BackupManifest;
  /** Files that would be written, and whether they already exist. */
  files: { rel: string; bytes: number; exists: boolean }[];
  /** True when the archive was made by a newer release than this build. */
  tooNew: boolean;
}

/** Inspect without writing: what would restore do? */
export function planRestore(file: string, opts: { root?: string; thisSchema?: number } = {}): RestorePlan {
  const root = opts.root ?? home();
  const { manifest, entries } = readBackup(file);
  const thisSchema = opts.thisSchema ?? SCHEMA_VERSION;
  return {
    manifest,
    tooNew: manifest.schemaVersion > thisSchema,
    files: entries
      .filter((e) => e.name !== 'manifest.json')
      .map((e) => ({ rel: e.name, bytes: e.body.length, exists: fs.existsSync(path.join(root, e.name)) })),
  };
}

export interface RestoreResult {
  restored: number;
  bytes: number;
  /** Where the previous home was moved before anything was overwritten. */
  movedTo: string | null;
  manifest: BackupManifest;
}

/**
 * Restore an archive into a home. The rule that makes this safe: **nothing is
 * overwritten in place**. If the target home already has files, they are moved
 * into `state/restore-<stamp>/` first, so a restore that turns out to be the
 * wrong file is itself recoverable.
 */
export function restoreBackup(
  file: string,
  opts: { root?: string; force?: boolean; thisSchema?: number } = {},
): RestoreResult {
  const root = opts.root ?? home();
  const plan = planRestore(file, { root, thisSchema: opts.thisSchema });
  if (plan.tooNew && !opts.force) {
    throw new Error(
      `this backup was written by a newer TermCrab (schema ${plan.manifest.schemaVersion}, this build knows ${
        opts.thisSchema ?? SCHEMA_VERSION
      }) — update the app, or pass --force if you know what you are doing`,
    );
  }
  const { entries } = readBackup(file);
  const payload = entries.filter((e) => e.name !== 'manifest.json');

  // Only files are moved aside: a directory entry that already exists is
  // simply reused, and moving it would take the files inside it along.
  const conflicts = payload.filter((e) => !e.name.endsWith('/') && fs.existsSync(path.join(root, e.name)));
  let movedTo: string | null = null;
  if (conflicts.length) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    movedTo = path.join(root, 'state', `restore-${stamp}`);
    for (const entry of conflicts) {
      const from = path.join(root, entry.name);
      const to = path.join(movedTo, entry.name);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
    }
  }

  let bytes = 0;
  let restored = 0;
  for (const entry of payload) {
    const dest = path.join(root, entry.name);
    if (entry.name.endsWith('/')) {
      fs.mkdirSync(dest, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.restore-tmp`;
    fs.writeFileSync(tmp, entry.body);
    fs.renameSync(tmp, dest);
    bytes += entry.body.length;
    restored += 1;
  }
  log.info(`restore: ${restored} file(s), ${bytes} byte(s)${movedTo ? `; the previous files are in ${movedTo}` : ''}`);
  return { restored, bytes, movedTo, manifest: plan.manifest };
}
