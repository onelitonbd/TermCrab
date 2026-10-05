/**
 * Running a shell command on someone's phone is the sharpest thing this agent
 * does (22.1). This module is the guard around it: a short list of commands
 * that destroy a device, a real timeout that kills and says so, a capped
 * output, and one honest sentence for every refusal.
 *
 * The deny list is deliberately small and about *catastrophe*, not about
 * policy: `rm -rf /`, writing a raw device, `mkfs`, `dd` onto a block device,
 * a fork bomb, `chmod -R` on the root. Anything else is allowed (or gated by
 * approvals) — a guard that tries to judge intent gets switched off, and then
 * nothing is guarded.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface DenyRule {
  pattern: RegExp;
  why: string;
}

/** Catastrophe, not policy. Keep it short enough to read in one screen. */
export const DEFAULT_DENY_RULES: DenyRule[] = [
  { pattern: /\brm\s+(-[a-z]*[rf][a-z]*\s+)*(?:\/\*?|--no-preserve-root)(?=\s|$)/i, why: 'deletes the whole filesystem' },
  { pattern: /\bmkfs(\.\w+)?\b/i, why: 'formats a filesystem' },
  { pattern: /\bdd\b[^\n]*\bof=\/dev\/(block|mmcblk|sd|sda|nvme)/i, why: 'writes raw data over a device' },
  { pattern: />\s*\/dev\/(block|mmcblk)/i, why: 'writes raw data over a device' },
  { pattern: /:\(\)\s*\{.*\};\s*:/, why: 'is a fork bomb' },
  { pattern: /\bchmod\s+-R\s+(777|a\+rwx)\s+\/(\s|$)/i, why: 'opens up every file on the device' },
  { pattern: /\b(shutdown|reboot|halt|poweroff)\b(?![^\n]*--help)/i, why: 'powers the device off or restarts it' },
  { pattern: /\b(curl|wget)\b[^\n|]*\|\s*(ba)?sh\b/i, why: 'pipes a downloaded script straight into a shell' },
];

export interface GuardResult {
  ok: boolean;
  /** Plain English, shown to the model and the user. */
  why?: string;
  /** The rule that matched, for the log. */
  matched?: string;
}

/** Would this command be refused? `allowDangerous` is the deliberate escape. */
export function checkCommand(
  command: string,
  opts: { extra?: string[]; allowDangerous?: boolean } = {},
): GuardResult {
  if (opts.allowDangerous) return { ok: true };
  const rules: DenyRule[] = [
    ...DEFAULT_DENY_RULES,
    ...(opts.extra ?? [])
      .filter((p) => p.trim())
      .map((p) => {
        try {
          return { pattern: new RegExp(p, 'i'), why: 'is on agent.execDenyPatterns' };
        } catch {
          return null;
        }
      })
      .filter((r): r is DenyRule => r !== null),
  ];
  for (const rule of rules) {
    if (rule.pattern.test(command)) {
      return { ok: false, why: `refused: this command ${rule.why}. Ask the owner to run it themselves if it is really wanted.`, matched: String(rule.pattern) };
    }
  }
  return { ok: true };
}

export interface RunResult {
  ok: boolean;
  output: string;
  code: number | null;
  /** True when the timeout killed it (the output is what it managed to print). */
  timedOut: boolean;
  durationMs: number;
  /** Refused by the guard, never started. */
  refused?: string;
  /** How this command was isolated, and what to tell the owner (30.1). */
  sandbox?: { mode: string; isolated: boolean; note: string };
}

export interface RunOpts {
  timeoutMs?: number;
  maxOutputChars?: number;
  cwd?: string;
  extraDeny?: string[];
  allowDangerous?: boolean;
  /** Injectable for tests: takes the place of execFile. */
  execImpl?: (shell: string, args: string[], opts: Record<string, unknown>) => Promise<{ stdout: string; stderr: string }>;
  /**
   * Run through a sandbox (30.1). `run` builds this from the sandbox plan, so
   * the argv is never re-parsed by a shell and the plan is testable on its own.
   * When absent the shell runs directly (the pre-30 behaviour).
   */
  sandbox?: { command: string; args: string[]; note: string; isolated: boolean };
}

export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_TIMEOUT_MS = 600_000;

/**
 * Run one command and always come back with a sentence. Never throws for a
 * normal failure: a non-zero exit, a timeout and a refusal are all results.
 */
export async function runCommand(
  command: string,
  shell: string,
  opts: RunOpts = {},
): Promise<RunResult> {
  const started = Date.now();
  const guard = checkCommand(command, { extra: opts.extraDeny, allowDangerous: opts.allowDangerous });
  if (!guard.ok) {
    return {
      ok: false,
      output: guard.why ?? 'refused',
      code: null,
      timedOut: false,
      durationMs: 0,
      refused: guard.matched,
      sandbox: opts.sandbox
        ? { mode: opts.sandbox.isolated ? 'sandboxed' : 'direct', isolated: opts.sandbox.isolated, note: opts.sandbox.note }
        : undefined,
    };
  }
  const timeoutMs = Math.max(1000, Math.min(opts.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS));
  const cap = Math.max(200, opts.maxOutputChars ?? 20_000);
  const run = opts.execImpl ?? (execFileAsync as unknown as RunOpts['execImpl'])!;
  const program = opts.sandbox?.command ?? shell;
  const argv = opts.sandbox?.args ?? ['-c', command];
  const sandboxReport = opts.sandbox
    ? { mode: opts.sandbox.isolated ? 'sandboxed' : 'direct', isolated: opts.sandbox.isolated, note: opts.sandbox.note }
    : undefined;
  try {
    const { stdout, stderr } = await run(program, argv, {
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
      cwd: opts.cwd ?? process.cwd(),
      env: process.env,
      killSignal: 'SIGKILL',
    });
    const parts: string[] = [];
    if (stdout) parts.push(stdout);
    if (stderr) parts.push(`[stderr]\n${stderr}`);
    return {
      ok: true,
      output: clipText(parts.join('\n') || '(no output)', cap),
      code: 0,
      timedOut: false,
      durationMs: Date.now() - started,
      sandbox: sandboxReport,
    };
  } catch (err) {
    const e = err as {
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
      signal?: string;
      code?: number | string;
    };
    const timedOut = Boolean(e.killed) || e.signal === 'SIGKILL' || /timed? ?out/i.test(e.message ?? '');
    if (timedOut) {
      const secs = Math.round(timeoutMs / 1000);
      const partial = [e.stdout, e.stderr].filter(Boolean).join('\n');
      return {
        ok: false,
        output: clipText(
          `[killed after ${secs}s — the command was still running and has been stopped]${partial ? `\n${partial}` : ''}`,
          cap,
        ),
        code: null,
        timedOut: true,
        durationMs: Date.now() - started,
        sandbox: sandboxReport,
      };
    }
    const parts: string[] = [`exit error: ${e.message ?? 'failed'}`];
    if (e.stdout) parts.push(`[stdout]\n${e.stdout}`);
    if (e.stderr) parts.push(`[stderr]\n${e.stderr}`);
    return {
      ok: false,
      output: clipText(parts.join('\n'), cap),
      code: typeof e.code === 'number' ? e.code : null,
      timedOut: false,
      durationMs: Date.now() - started,
      sandbox: sandboxReport,
    };
  }
}

function clipText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [output clipped at ${max} characters]`;
}
