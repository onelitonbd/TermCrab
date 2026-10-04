/**
 * Schema versioning and migrations for a home directory (batch 31).
 *
 * TermCrab has no database, on purpose: the state is files a person can read,
 * grep and copy with `cp -r`. That decision makes backups trivial and raises
 * one problem OpenClaw solves with SQLite migrations — what happens when the
 * *shape* of those files changes between releases, on a phone the owner is
 * holding, with months of memory inside?
 *
 * The answer here is the same contract a migration tool gives, without the
 * database: a version stamp in `state/schema.json`, an ordered list of steps
 * that each move one version forward, and a rule that a step either completes
 * or leaves the home exactly as it was (every step writes through a temp file
 * or works on a copy, and a failure stops the run with the version unchanged).
 *
 * Two things this buys immediately:
 *   - a home written by an older release is *carried forward automatically* on
 *     the next start (`runMigrations` is called by `ensureLayout`'s caller);
 *   - a home written by a *newer* release is refused, loudly, instead of being
 *     half-understood — the classic downgrade corruption.
 */
import fs from 'node:fs';
import path from 'node:path';
import { home } from './paths.js';
import { log } from './logger.js';
import { structuredLog } from './structured-log.js';

/**
 * Migration progress is *not* the command's answer. It goes to stderr (so a
 * `config get` still prints exactly the value) and to the structured log (so a
 * week later the phone can still say when its state changed shape).
 */
function note(msg: string): void {
  console.error(msg);
  structuredLog.write('info', 'schema', msg);
}

/** Bump this when a step is added. Never edit a shipped step. */
export const SCHEMA_VERSION = 3;

export interface MigrationStep {
  /** `0001-something` — the number is the target version, the rest is a name. */
  id: string;
  /** One sentence for the owner, past tense, no jargon. */
  what: string;
  /** Returns the number of things it changed (0 is fine: nothing to do). */
  run(root: string): number;
}

export interface SchemaStamp {
  version: number;
  /** When the stamp was last written. */
  updatedAt: string;
  /** Steps that ran, newest last, with what they changed. */
  applied: { id: string; at: string; changed: number }[];
  /** The release that wrote this stamp. */
  release: string;
}

export interface MigrationOutcome {
  from: number;
  to: number;
  /** Steps that actually ran. */
  applied: { id: string; changed: number }[];
  /** A fresh home: the steps are marked adopted, not "run". */
  adopted: boolean;
  /** Files copied into state/backups/<stamp>/ before anything changed. */
  backupDir: string | null;
  refused?: string;
}

function stampPath(root: string): string {
  return path.join(root, 'state', 'schema.json');
}

/** The version on disk. A home with no stamp is version 0 (pre-31). */
export function readStamp(root: string = home()): SchemaStamp {
  try {
    const raw = JSON.parse(fs.readFileSync(stampPath(root), 'utf8')) as Partial<SchemaStamp>;
    const version = typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0;
    return {
      version,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
      applied: Array.isArray(raw.applied) ? raw.applied : [],
      release: typeof raw.release === 'string' ? raw.release : '',
    };
  } catch {
    return { version: 0, updatedAt: '', applied: [], release: '' };
  }
}

function writeStamp(root: string, stamp: SchemaStamp): void {
  const file = stampPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file); // atomic: a killed process leaves no half-stamp
}

/** Read-modify-write one JSON file, atomically. Returns the parsed old value. */
export function editJson(file: string, edit: (data: Record<string, unknown>) => void): boolean {
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    data = parsed as Record<string, unknown>;
  } catch {
    return false;
  }
  const before = JSON.stringify(data);
  edit(data);
  if (JSON.stringify(data) === before) return false;
  const tmp = `${file}.migrate.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
  return true;
}

function hasFiles(dir: string): boolean {
  try {
    // Files, not folders: the layout pre-creates empty directories (workspace/
    // outbox, memory/daily), and those must not make a new home look used.
    return fs.readdirSync(dir, { withFileTypes: true }).some((e) => e.isFile() && !e.name.startsWith('.'));
  } catch {
    return false;
  }
}

function isFresh(root: string): boolean {
  // Fresh means "nothing to carry forward": no config, and no content files in
  // the places a version change touches. Empty directories do not count — the
  // layout creates those on the very first command, and a home that is nothing
  // but folders is still a home nobody has used.
  return (
    !fs.existsSync(path.join(root, 'config.json')) &&
    !hasFiles(path.join(root, 'sessions')) &&
    !hasFiles(path.join(root, 'memory')) &&
    !hasFiles(path.join(root, 'workspace'))
  );
}

// --------------------------------------------------------------------------
// The steps. Each one is small, named after the shape change it makes, and
// safe to run on a home that already has the modern shape (it changes nothing
// and reports 0).
// --------------------------------------------------------------------------

/** Old configs used the dotted keys inside `provider` and a flat `telegram`. */
function legacyConfigKeys(root: string): number {
  const file = path.join(root, 'config.json');
  let changed = 0;
  editJson(file, (cfg) => {
    const provider = (cfg.provider ?? {}) as Record<string, unknown>;
    const map: [string, string][] = [
      ['api_key', 'apiKey'],
      ['base_url', 'baseUrl'],
      ['auth_profile', 'authProfile'],
    ];
    for (const [old, now] of map) {
      if (old in provider && !(now in provider)) {
        provider[now] = provider[old];
        changed += 1;
      }
      if (old in provider) delete provider[old];
    }
    const agent = (cfg.agent ?? {}) as Record<string, unknown>;
    const agentMap: [string, string][] = [
      ['allow_exec', 'allowExec'],
      ['max_iterations', 'maxIterations'],
      ['session_reset', 'sessionReset'],
      ['allow_browser', 'allowBrowser'],
    ];
    for (const [old, now] of agentMap) {
      if (old in agent && !(now in agent)) {
        agent[now] = agent[old];
        changed += 1;
      }
      if (old in agent) delete agent[old];
    }
    // A very old shape kept the Telegram token at the top level.
    if (typeof cfg.telegramToken === 'string') {
      const channels = (cfg.channels ?? {}) as Record<string, unknown>;
      const telegram = (channels.telegram ?? {}) as Record<string, unknown>;
      if (!telegram.token) telegram.token = cfg.telegramToken;
      channels.telegram = telegram;
      cfg.channels = channels;
      delete cfg.telegramToken;
      changed += 1;
    }
    cfg.provider = provider;
    cfg.agent = agent;
  });
  return changed;
}

/** Session lines written by early builds used seconds; everything else is ms. */
function secondTimestamps(root: string): number {
  const dir = path.join(root, 'sessions');
  if (!fs.existsSync(dir)) return 0;
  let changed = 0;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.jsonl')) continue;
    if (name.includes('.migrate-')) continue;
    const file = path.join(dir, name);
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    let touched = false;
    const lines = text.split('\n').map((line) => {
      if (!line.trim()) return line;
      try {
        const entry = JSON.parse(line) as { ts?: unknown };
        if (typeof entry.ts === 'number' && entry.ts > 0 && entry.ts < 1e11) {
          entry.ts = Math.round(entry.ts * 1000);
          touched = true;
          return JSON.stringify(entry);
        }
      } catch {
        /* an unreadable line is left exactly as it is */
      }
      return line;
    });
    if (touched) {
      const tmp = `${file}.migrate-tmp`;
      fs.writeFileSync(tmp, lines.join('\n'), 'utf8');
      fs.renameSync(tmp, file);
      changed += 1;
    }
  }
  return changed;
}

/** The outbox file moved from workspace/ to state/ in 0.40; carry the old one. */
function outboxLocation(root: string): number {
  const old = path.join(root, 'workspace', 'outbox.json');
  const now = path.join(root, 'state', 'outbox.json');
  if (!fs.existsSync(old) || fs.existsSync(now)) return 0;
  fs.mkdirSync(path.dirname(now), { recursive: true });
  fs.copyFileSync(old, now);
  fs.unlinkSync(old);
  return 1;
}

export const MIGRATIONS: MigrationStep[] = [
  {
    id: '0001-config-key-names',
    what: 'renamed old config keys (api_key → apiKey and friends)',
    run: legacyConfigKeys,
  },
  {
    id: '0002-session-timestamps',
    what: 'converted second-precision timestamps in transcripts to milliseconds',
    run: secondTimestamps,
  },
  {
    id: '0003-outbox-location',
    what: 'moved workspace/outbox.json to state/outbox.json',
    run: outboxLocation,
  },
];

// --------------------------------------------------------------------------
// The runner
// --------------------------------------------------------------------------

/** Copy everything a migration could touch into state/backups/<stamp>/. */
function snapshot(root: string, release: string): string | null {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(root, 'state', 'backups', stamp);
  try {
    fs.mkdirSync(dir, { recursive: true });
    const wanted = ['config.json', 'workspace/outbox.json', 'state/outbox.json'];
    let copied = 0;
    for (const rel of wanted) {
      const from = path.join(root, rel);
      if (!fs.existsSync(from)) continue;
      const to = path.join(dir, path.basename(rel));
      fs.copyFileSync(from, to);
      copied += 1;
    }
    // Transcripts are the big, precious thing: copy the ones small enough that
    // a phone will not notice (the rest are covered by `termcrab backup`).
    const sessions = path.join(root, 'sessions');
    if (fs.existsSync(sessions)) {
      let bytes = 0;
      for (const name of fs.readdirSync(sessions)) {
        if (!name.endsWith('.jsonl')) continue;
        const from = path.join(sessions, name);
        const size = fs.statSync(from).size;
        if (bytes + size > 8 * 1024 * 1024) break;
        fs.copyFileSync(from, path.join(dir, name));
        bytes += size;
        copied += 1;
      }
    }
    fs.writeFileSync(
      path.join(dir, 'README.txt'),
      `Snapshot taken before upgrading to schema ${SCHEMA_VERSION} (release ${release}).\n` +
        `Nothing here is needed unless a migration failed: copy the files back into ${root}.\n`,
      'utf8',
    );
    return copied ? dir : null;
  } catch (err) {
    log.warn(`schema: could not snapshot before migrating: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Bring a home to `SCHEMA_VERSION`.
 *
 * - A fresh home (nothing in it) is *adopted*: the stamp is written at the
 *   current version with no steps, because pretending we migrated an empty
 *   directory would be a lie the owner could later read in the stamp.
 * - A home from a newer release is refused and left untouched.
 * - Any step that throws stops the run; the version on disk stays where it was,
 *   so the next start tries again rather than assuming a half-migrated home.
 */
export function runMigrations(
  root: string = home(),
  opts: { release?: string; dryRun?: boolean } = {},
): MigrationOutcome {
  const release = opts.release ?? '';
  const before = readStamp(root);
  if (before.version > SCHEMA_VERSION) {
    return {
      from: before.version,
      to: before.version,
      applied: [],
      adopted: false,
      backupDir: null,
      refused: `this home was written by a newer TermCrab (schema ${before.version}, this build knows ${SCHEMA_VERSION}) — update the app instead of downgrading it`,
    };
  }
  const pending = MIGRATIONS.filter((step) => Number(step.id.slice(0, 4)) > before.version);
  if (!pending.length) {
    // Keep the stamp current without rewriting history.
    if (before.version !== SCHEMA_VERSION) {
      writeStamp(root, { ...before, version: SCHEMA_VERSION, updatedAt: new Date().toISOString(), release });
    }
    return { from: before.version, to: SCHEMA_VERSION, applied: [], adopted: false, backupDir: null };
  }

  const fresh = isFresh(root);
  if (opts.dryRun) {
    return {
      from: before.version,
      to: SCHEMA_VERSION,
      applied: pending.map((s) => ({ id: s.id, changed: 0 })),
      adopted: fresh,
      backupDir: null,
    };
  }

  const backupDir = fresh ? null : snapshot(root, release);
  const applied: { id: string; changed: number }[] = [];
  for (const step of pending) {
    try {
      const changed = fresh ? 0 : step.run(root);
      if (!fresh) note(`schema ${step.id}: ${changed} change(s) — ${step.what}`);
      applied.push({ id: step.id, changed });
    } catch (err) {
      log.error(`schema ${step.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      const partial: SchemaStamp = {
        ...before,
        release,
        updatedAt: new Date().toISOString(),
        applied: [...before.applied, ...applied.map((a) => ({ ...a, at: new Date().toISOString() }))],
      };
      writeStamp(root, partial); // version deliberately unchanged
      return { from: before.version, to: before.version, applied: [], adopted: false, backupDir, refused: `migration ${step.id} failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  writeStamp(root, {
    version: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    applied: [...before.applied, ...applied.map((a) => ({ ...a, at: new Date().toISOString() }))],
    release,
  });
  return { from: before.version, to: SCHEMA_VERSION, applied, adopted: fresh, backupDir };
}

/**
 * Run migrations once per process, at the point where the layout is created.
 * Everything else in the codebase then sees files in the current shape.
 */
let ranThisProcess = false;
export function ensureSchema(opts: { release?: string; quiet?: boolean } = {}): MigrationOutcome | null {
  if (ranThisProcess) return null;
  ranThisProcess = true;
  const root = home();
  if (!fs.existsSync(root)) return null;
  try {
    const outcome = runMigrations(root, { release: opts.release });
    if (outcome.refused) {
      log.error(`schema: ${outcome.refused}`);
      return outcome;
    }
    if (outcome.applied.length && !opts.quiet) {
      note(`schema: upgraded ${outcome.from} → ${outcome.to} (${outcome.applied.length} step(s); a snapshot is in state/backups/)`);
    }
    // Adopting a fresh home is a non-event: nothing was carried forward, and
    // saying so on every first run would be noise, not information.
    if (outcome.adopted) log.debug('schema: fresh home adopted at the current version');
    return outcome;
  } catch (err) {
    log.warn(`schema: migration check failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/** For tests: forget that this process already ran the migrations. */
export function resetSchemaGuard(): void {
  ranThisProcess = false;
}

