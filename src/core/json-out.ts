/**
 * One machine-readable envelope (batch 14).
 *
 * Any command that takes `--json` prints **exactly one** JSON document on
 * stdout, and nothing else:
 *
 *   {"ok":true,  "command":"status", "data":{…}}
 *   {"ok":false, "command":"status", "error":{"message":"…","hint":"…"}}
 *
 * Success *and* failure print an envelope, so a script can always parse what it
 * got and branch on `ok` (the exit code still says the same thing: 0 for
 * success, non-zero for failure). In `--json` mode `main()` also sends every
 * logger line to stderr, because a warning in the middle of stdout would be a
 * bug in a document a script is about to parse.
 */

/** Does this command line ask for the machine-readable form? */
export function jsonWanted(args: readonly string[]): boolean {
  return args.includes('--json');
}

export interface JsonEnvelope<T = unknown> {
  ok: boolean;
  command: string;
  data?: T;
  error?: { message: string; hint?: string };
}

/** Print the success envelope. The only thing written to stdout. */
export function emitJson(command: string, data: unknown): void {
  const envelope: JsonEnvelope = { ok: true, command, data };
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
}

/**
 * Print the failure envelope and set the exit code — the error case of the
 * contract, so a script that pipes stdout still sees *why* in JSON.
 */
export function failJson(command: string, message: string, hint?: string, code = 1): void {
  const envelope: JsonEnvelope = { ok: false, command, error: { message, ...(hint ? { hint } : {}) } };
  process.stdout.write(`${JSON.stringify(envelope, null, 2)}\n`);
  process.exitCode = code;
}

/** Turn any thrown value into the string an error envelope carries. */
export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
