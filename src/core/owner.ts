/**
 * The owner's remaining actions, in one declared place (42.2, 42.5).
 *
 * After batch 42 the declared queue is empty: everything the repository can
 * prove about itself is proven by the suite. What is left is two things that
 * need a token or an account — a CI push and one real Telegram message — and
 * they are written here once so that `termcrab owner`, `docs/OWNER.md`, the help
 * entry and the suite all read the same sentences. A handover that exists in
 * one file and is stale in another is worse than no handover.
 */

export interface OwnerAction {
  /** Stable id: the tests and the JSON view use it. */
  id: string;
  /** One line: what it is and how long it takes. */
  title: string;
  /** What stays open until the action is done. */
  closes: string;
  /** The exact shell lines, in order. */
  commands: string[];
  /** What a person should see when it worked. */
  expect: string;
  /** Where the proof lands. */
  evidence: string;
}

export const OWNER_ACTIONS: OwnerAction[] = [
  {
    id: 'ci',
    title: 'Turn CI on — one push, ~20 seconds',
    closes: 'the last open census row: the CI matrix (PARTIAL until a run exists)',
    commands: [
      'npm run ci:install',
      'git add .github/workflows/ci.yml',
      'git commit -m "ci: install the workflow"',
      'git push',
    ],
    expect: 'the Actions tab runs the suite on Node 20, 22 and 24 within a few minutes',
    evidence: 'the URL of a green run — that is what closes the row',
  },
  {
    id: 'telegram',
    title: 'One real Telegram message — once, ~1 minute',
    closes: "37.4's first real line: the Telegram smoke has only ever talked to the fake bot",
    commands: [
      'TCRAB_TELEGRAM_TOKEN=123:ABC npm run smoke:telegram',
      'TCRAB_TELEGRAM_TOKEN=123:ABC npm run smoke:telegram -- --record',
    ],
    expect: 'telegram smoke: bot is @your_bot, then read back: "…" from you, then telegram smoke: ok',
    evidence: 'one line in docs/openclaw/data/telegram-runs.jsonl, with a fingerprint of the token (never the token)',
  },
];

/** A copy, so a caller cannot mutate the declared handover. */
export function ownerActions(): OwnerAction[] {
  return OWNER_ACTIONS.map((a) => ({ ...a, commands: [...a.commands] }));
}

/** The plain-text view `termcrab owner` prints. */
export function describeOwnerActions(actions: OwnerAction[] = OWNER_ACTIONS): string {
  const lines: string[] = [];
  lines.push(`Still yours — ${actions.length} action(s). Everything else in this repository proves itself.`);
  lines.push('');
  actions.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.title}`);
    lines.push(`   closes:  ${a.closes}`);
    lines.push('   run:');
    for (const c of a.commands) lines.push(`     ${c}`);
    lines.push(`   expect:  ${a.expect}`);
    lines.push(`   leaves:  ${a.evidence}`);
    if (i < actions.length - 1) lines.push('');
  });
  lines.push('');
  lines.push('Both are written down in full — with the surrounding steps and the reasons — in docs/OWNER.md.');
  lines.push('Everything else is done, or asserted by the suite on every run.');
  return lines.join('\n');
}

/** The machine view behind `termcrab owner --json`. */
export function ownerReport(): { count: number; doc: string; actions: OwnerAction[] } {
  return { count: OWNER_ACTIONS.length, doc: 'docs/OWNER.md', actions: ownerActions() };
}
