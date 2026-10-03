/**
 * Parse a WORKLOG.md body into its two step tables (the current batch and the
 * next one). Split out of status.mjs so a test can feed it a synthetic tracker
 * without running the whole verifier.
 */
/**
 * Pull the two step tables out of a WORKLOG.md body.
 *
 * Exported so a test can feed it a synthetic tracker: on 2026-10-03 a step's
 * evidence contained the word "ZIP" and this parser silently dropped every row
 * after it — the end-of-input anchor had been written as `\Z`, which JavaScript
 * reads as a literal capital Z. The verifier of the tracker must not be fooled
 * by a letter, so the anchor is `(?!…)` and there is a regression test.
 */
export function parseWorklog(text) {
  const updated = /\*\*Updated:\*\* ([^\n·]+)/.exec(text)?.[1]?.trim() ?? '';
  // Step tables live under "## 2. Now" and "## 3. Next" (any numbering), each
  // row: | id | step | ▶ doing / ☐ todo / ✔ done | evidence |
  const section = (n) => {
    const m = new RegExp(`^## ${n}\\. ([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`, 'm').exec(text);
    return m ? m[1] : '';
  };
  const rowsOf = (body) =>
    [...body.matchAll(/^\|\s*(\d+\.\d+)\s*\|\s*([^|]+?)\s*\|\s*(▶ doing|☐ todo|✔ done)[^|]*\|/gm)].map((m) => ({
      id: m[1],
      step: m[2].replace(/\*\*/g, ''),
      state: m[3],
    }));
  const now = rowsOf(section(2));
  const next = rowsOf(section(3));
  return { updated, stepLines: now, nextSteps: next };
}

