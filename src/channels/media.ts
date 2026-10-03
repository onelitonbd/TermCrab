/**
 * What the agent is allowed to receive through a chat (15.1) and send back
 * (15.2), kept in one place so the channel, the tool and the docs cannot
 * disagree.
 *
 * Two rules drive this file:
 *  - a phone has a small disk and a slow link, so anything bigger than
 *    `maxFileMb` is refused with a sentence rather than half-downloaded;
 *  - executables are refused outright. The agent reads and writes files; it
 *    does not install anything a stranger sent it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { workspaceDir } from '../core/paths.js';

export const DEFAULT_MAX_FILE_MB = 20;

/** Extensions the agent may receive. Unknown extensions are refused by name. */
export const INBOUND_EXTENSIONS = [
  // pictures
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic',
  // documents people actually send a phone agent
  '.pdf', '.txt', '.md', '.csv', '.json', '.yaml', '.yml', '.log', '.ics', '.vcf',
  // audio (whisper can read these later)
  '.ogg', '.oga', '.mp3', '.m4a', '.wav', '.opus', '.flac',
  // archives and zips of the above
  '.zip', '.tar', '.gz', '.tgz',
];

/** Never. These are the formats a phone can be tricked into running. */
export const BLOCKED_EXTENSIONS = ['.apk', '.dex', '.exe', '.bin', '.so', '.sh', '.bat', '.cmd', '.msi', '.jar', '.dmg', '.iso'];

export interface IncomingFile {
  /** Suggested filename (from Telegram or synthesized). */
  name: string;
  bytes: Buffer;
  /** `photo` or `document`, for the sentence the agent sees. */
  kind: 'photo' | 'document' | 'audio';
  mimeType?: string;
  caption?: string;
}

export interface SavedFile {
  path: string;
  /** Path relative to the workspace, which is what the agent is told. */
  relative: string;
  bytes: number;
}

export function safeFileName(name: string, fallback = 'file'): string {
  const base = path.basename(name).replace(/[^\w.\- ]+/g, '_').trim();
  return base && base !== '.' && base !== '..' ? base.slice(0, 120) : fallback;
}

export interface AcceptResult {
  ok: boolean;
  reason?: string;
}

/** Size, type and extension checks in one place, so both paths behave alike. */
export function acceptIncoming(file: { name: string; size: number }, maxMb = DEFAULT_MAX_FILE_MB): AcceptResult {
  const ext = path.extname(file.name).toLowerCase();
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `${ext} files are never accepted (executables are how phones get hurt)` };
  }
  if (file.size > maxMb * 1024 * 1024) {
    return { ok: false, reason: `too large (${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is ${maxMb} MB)` };
  }
  if (ext && !INBOUND_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `${ext} is not on the allowed list (${INBOUND_EXTENSIONS.join(' ')})` };
  }
  return { ok: true };
}

/**
 * Save one incoming file under `<home>/workspace/inbox/` and return the path
 * the agent should be told. The name gets a timestamp so two photos with the
 * same name never overwrite each other.
 */
export function saveIncoming(file: IncomingFile, opts: { dir?: string; now?: Date } = {}): SavedFile {
  const dir = opts.dir ?? path.join(workspaceDir(), 'inbox');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = (opts.now ?? new Date()).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = safeFileName(file.name, file.kind === 'photo' ? 'photo.jpg' : 'file');
  const target = path.join(dir, `${stamp}-${name}`);
  fs.writeFileSync(target, file.bytes);
  const root = workspaceDir();
  const relative = path.relative(root, target).split(path.sep).join('/');
  return { path: target, relative, bytes: file.bytes.byteLength };
}

/** The sentence the agent reads when a file arrives (15.1). */
export function describeIncoming(saved: SavedFile, file: Pick<IncomingFile, 'kind' | 'caption'>): string {
  const what = file.kind === 'photo' ? 'photo' : file.kind === 'audio' ? 'voice note' : 'file';
  const head = `[${what} saved to ${saved.relative} (${Math.max(1, Math.round(saved.bytes / 1024))} KB)]`;
  return file.caption ? `${head} ${file.caption}` : head;
}
