/**
 * A log worth reading on a phone (23.2, 23.3).
 *
 * The console log is for the person watching it; this one is for the person
 * asking "what happened at 3pm?" tomorrow. One JSON object per line in
 * `logs/termcrab.jsonl` — level, area, message, and whatever ids the call site
 * knows — so `tail`, `grep` and a bug report all work without a parser.
 *
 * It rotates by itself (size + file count, both stated, both configurable) and
 * it never throws: a logging failure must not become the failure being logged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { logsDir } from '../core/paths.js';

export interface LogRecord {
  ts: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  area: string;
  message: string;
  [key: string]: unknown;
}

export interface StructuredLogOpts {
  /** Where the file lives. Default: <home>/logs/termcrab.jsonl */
  file?: string;
  /** Rotate when the file passes this many bytes (default 2 MB). */
  maxBytes?: number;
  /** How many rotated files to keep (termcrab.jsonl.1 … .N, default 3). */
  maxFiles?: number;
  /** Injectable clock for tests. */
  now?: () => Date;
}

export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_FILES = 3;

export class StructuredLog {
  /** Set only when the caller named a file; otherwise resolved per write. */
  private explicitFile: string | null;
  private maxBytes: number;
  private maxFiles: number;
  private now: () => Date;
  private enabled: boolean;

  constructor(opts: StructuredLogOpts = {}) {
    this.explicitFile = opts.file ?? null;
    this.maxBytes = Math.max(1024, opts.maxBytes ?? DEFAULT_MAX_BYTES);
    this.maxFiles = Math.max(1, Math.min(50, opts.maxFiles ?? DEFAULT_MAX_FILES));
    this.now = opts.now ?? (() => new Date());
    // TCRAB_LOG_FILE=off is the escape hatch for a read-only or tiny device.
    this.enabled = process.env.TCRAB_LOG_FILE !== 'off';
  }

  /** Re-read the limits (config can change while the gateway runs). */
  configure(opts: { maxBytes?: number; maxFiles?: number }): void {
    // Nonsense is ignored rather than obeyed: `configure({maxBytes: -1})` must
    // not turn a 3 MB log into a 1 KB one on the next line written.
    if (typeof opts.maxBytes === 'number' && Number.isFinite(opts.maxBytes) && opts.maxBytes >= 1024) {
      this.maxBytes = opts.maxBytes;
    }
    if (typeof opts.maxFiles === 'number' && Number.isFinite(opts.maxFiles)) {
      this.maxFiles = Math.max(1, Math.min(50, Math.round(opts.maxFiles)));
    }
  }

  /**
   * Where the log is *right now*. Resolved lazily so a caller that sets
   * `TCRAB_HOME` after importing the module (a test, `--home`) still writes
   * into the home it chose instead of the one that happened to be current at
   * import time.
   */
  get path(): string {
    return this.explicitFile ?? path.join(logsDir(), 'termcrab.jsonl');
  }

  private get file(): string {
    return this.path;
  }

  get limits(): { maxBytes: number; maxFiles: number } {
    return { maxBytes: this.maxBytes, maxFiles: this.maxFiles };
  }

  /** Write one record. Never throws, never blocks the caller's flow. */
  write(level: LogRecord['level'], area: string, message: string, extra: Record<string, unknown> = {}): void {
    if (!this.enabled) return;
    const record: LogRecord = {
      ts: this.now().toISOString(),
      level,
      area,
      message: typeof message === 'string' ? message : String(message),
      ...extra,
    };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.appendFileSync(this.file, `${JSON.stringify(record)}\n`, 'utf8');
      this.rotateIfNeeded();
    } catch {
      /* a log that breaks the thing it is logging is worse than no log */
    }
  }

  private rotateIfNeeded(): void {
    let size = 0;
    try {
      size = fs.statSync(this.file).size;
    } catch {
      return;
    }
    if (size < this.maxBytes) return;
    try {
      // Drop the oldest, shift the rest up, then start a fresh live file.
      const oldest = `${this.file}.${this.maxFiles}`;
      if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const from = `${this.file}.${i}`;
        if (fs.existsSync(from)) fs.renameSync(from, `${this.file}.${i + 1}`);
      }
      fs.renameSync(this.file, `${this.file}.1`);
    } catch {
      /* rotation is best effort; the live file keeps growing rather than dying */
    }
  }

  /** The files this log owns right now, newest first (for `termcrab logs`). */
  files(): Array<{ path: string; bytes: number }> {
    const out: Array<{ path: string; bytes: number }> = [];
    const candidates = [this.file];
    for (let i = 1; i <= this.maxFiles; i++) candidates.push(`${this.file}.${i}`);
    for (const f of candidates) {
      try {
        out.push({ path: f, bytes: fs.statSync(f).size });
      } catch {
        /* not there yet */
      }
    }
    return out;
  }

  /** How much disk the log area uses — counted by `termcrab disk`. */
  usage(): { bytes: number; files: number } {
    const files = this.files();
    return { bytes: files.reduce((n, f) => n + f.bytes, 0), files: files.length };
  }

  /** The newest `n` records, oldest-first, skipping unparseable lines. */
  tail(n = 50): LogRecord[] {
    let text = '';
    try {
      text = fs.readFileSync(this.file, 'utf8');
    } catch {
      return [];
    }
    const lines = text.split('\n').filter((l) => l.trim());
    return lines
      .slice(Math.max(0, lines.length - Math.max(1, n)))
      .map((line) => {
        try {
          return JSON.parse(line) as LogRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is LogRecord => r !== null);
  }
}

/** The process-wide log the gateway, the loop and the CLI all write to. */
export const structuredLog = new StructuredLog();

/** One line a human can read, for `termcrab logs`. */
export function formatLogRecord(r: LogRecord): string {
  const head = `${r.ts.slice(0, 19).replace('T', ' ')} ${r.level.toUpperCase().padEnd(5)} [${r.area}]`;
  const extras = Object.entries(r)
    .filter(([k]) => !['ts', 'level', 'area', 'message'].includes(k))
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' ');
  return `${head} ${r.message}${extras ? `  ${extras}` : ''}`;
}
