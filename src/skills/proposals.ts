/**
 * Agent-authored skills, with a review step (33.3).
 *
 * The agent could already write a skill into `skills/<name>/` — which meant a
 * model that had a bad idea at 3am could change its own instructions with
 * nobody looking. Skills are instructions the agent will follow on later turns,
 * so they get the same treatment as anything else that writes itself into the
 * prompt: **a proposal, a person, and a decision**.
 *
 * The flow:
 *
 *   agent  → proposeSkill()      writes skills/_proposals/<name>/ (SKILL.md + PROPOSAL.json)
 *   owner  → termcrab skills proposals list|show|approve|reject   (or the panel)
 *   approve→ the folder moves to skills/<name>/   — and only then does it load
 *   reject → it moves to skills/_rejected/<name>/ with the reason written in
 *
 * `_`-prefixed folders are skipped by the loader, so a proposal can never reach
 * the prompt by accident — including a half-written one.
 */
import fs from 'node:fs';
import path from 'node:path';
import { userSkillsDir } from '../core/paths.js';
import { parseFrontmatter } from '../core/frontmatter.js';

const NAME_RE = /^[a-z0-9][a-z0-9-_]{0,63}$/;
export const PROPOSAL_DIR = '_proposals';
export const REJECTED_DIR = '_rejected';

export interface SkillProposal {
  name: string;
  description: string;
  /** Why the agent wants this skill — the sentence the owner judges. */
  reason: string;
  /** Session/turn the proposal came from, when the agent knew it. */
  source?: string;
  /** Who proposed it ('agent' or an agent name). */
  by: string;
  createdAt: number;
  /** Path of the SKILL.md inside the proposal folder. */
  path: string;
  bytes: number;
  /** True when a live skill of the same name exists and approving replaces it. */
  replacesLive: boolean;
}

function proposalsRoot(): string {
  return path.join(userSkillsDir(), PROPOSAL_DIR);
}

function rejectedRoot(): string {
  return path.join(userSkillsDir(), REJECTED_DIR);
}

export function safeSkillName(name: string): string | null {
  const n = (name || '').trim().toLowerCase();
  return NAME_RE.test(n) ? n : null;
}

export interface ProposeInput {
  name: string;
  description: string;
  /** Full SKILL.md body. Frontmatter is added when missing. */
  content: string;
  reason?: string;
  source?: string;
  by?: string;
}

export interface ProposeResult {
  ok: boolean;
  proposal?: SkillProposal;
  error?: string;
  /** True when the proposal replaced an earlier one with the same name. */
  replaced?: boolean;
}

/**
 * Write a proposal. Never touches the live skills folder: an existing skill of
 * the same name is protected (the agent must ask a person to change it), and a
 * proposal can be revised until it is decided.
 */
export function proposeSkill(input: ProposeInput): ProposeResult {
  const name = safeSkillName(input.name);
  if (!name) return { ok: false, error: 'name must be lowercase letters, digits, - or _ (max 64)' };
  const description = (input.description || '').trim();
  if (!description) return { ok: false, error: 'a description is required (it is the line the agent sees in its skill index)' };
  // A live skill of the same name is not touched here — but the proposal says
  // so, because the person deciding needs to know they are replacing something.
  const replacesLive = fs.existsSync(path.join(userSkillsDir(), name, 'SKILL.md'));

  let content = (input.content || '').trim();
  if (!content) return { ok: false, error: 'content is required (the SKILL.md body)' };
  if (!content.startsWith('---')) {
    content = `---\nname: ${name}\ndescription: ${description}\n---\n\n${content}`;
  }
  const fm = parseFrontmatter(content);
  if (!fm.data.description) return { ok: false, error: 'frontmatter must include a description' };
  if (fm.data.name && String(fm.data.name) !== name) {
    return { ok: false, error: `frontmatter name "${String(fm.data.name)}" does not match the proposal name "${name}"` };
  }

  const dir = path.join(proposalsRoot(), name);
  const replaced = fs.existsSync(path.join(dir, 'SKILL.md'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  const meta: Omit<SkillProposal, 'path' | 'bytes'> = {
    name,
    description,
    reason: (input.reason || '').trim() || `the agent proposed this skill${input.source ? ` from ${input.source}` : ''}`,
    ...(input.source ? { source: input.source } : {}),
    by: (input.by || 'agent').trim() || 'agent',
    createdAt: Date.now(),
    replacesLive,
  };
  fs.writeFileSync(path.join(dir, 'PROPOSAL.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  const proposal = readProposal(name);
  return { ok: true, ...(proposal ? { proposal } : {}), replaced };
}

function readProposal(name: string): SkillProposal | null {
  const dir = path.join(proposalsRoot(), name);
  const skillFile = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillFile)) return null;
  let meta: Partial<SkillProposal> = {};
  try {
    meta = JSON.parse(fs.readFileSync(path.join(dir, 'PROPOSAL.json'), 'utf8')) as Partial<SkillProposal>;
  } catch {
    /* a proposal without metadata is still a proposal — just a thin one */
  }
  let description = typeof meta.description === 'string' ? meta.description : '';
  try {
    const fm = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
    if (!description && typeof fm.data.description === 'string') description = fm.data.description;
  } catch {
    /* unreadable frontmatter shows up as an empty description */
  }
  return {
    name,
    description,
    reason: typeof meta.reason === 'string' ? meta.reason : '',
    ...(typeof meta.source === 'string' ? { source: meta.source } : {}),
    by: typeof meta.by === 'string' ? meta.by : 'agent',
    createdAt: typeof meta.createdAt === 'number' ? meta.createdAt : fs.statSync(skillFile).mtimeMs,
    path: skillFile,
    bytes: fs.statSync(skillFile).size,
    // Recomputed, not read: a live skill can appear or be deleted between the
    // proposal and the decision, and the answer has to be true at decision time.
    replacesLive: typeof meta.replacesLive === 'boolean' ? meta.replacesLive : fs.existsSync(path.join(userSkillsDir(), name, 'SKILL.md')),
  };
}

export function listProposals(): SkillProposal[] {
  const root = proposalsRoot();
  if (!fs.existsSync(root)) return [];
  const out: SkillProposal[] = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const p = readProposal(e.name);
    if (p) out.push(p);
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

export function getProposal(name: string): SkillProposal | null {
  const n = safeSkillName(name);
  return n ? readProposal(n) : null;
}

export interface DecisionResult {
  ok: boolean;
  action: 'approved' | 'rejected' | 'none';
  name: string;
  path?: string;
  error?: string;
}

/**
 * Approve: move it into the live skills folder.
 *
 * A live skill of the same name is *not* replaced by default. Approving is a
 * decision about one proposal; overwriting something approved earlier is a
 * second decision, and it has to be made on purpose (`--force`).
 */
export function approveProposal(name: string, opts: { force?: boolean } = {}): DecisionResult {
  const n = safeSkillName(name);
  if (!n) return { ok: false, action: 'none', name, error: 'invalid skill name' };
  const from = path.join(proposalsRoot(), n);
  if (!fs.existsSync(path.join(from, 'SKILL.md'))) {
    return { ok: false, action: 'none', name: n, error: `no proposal named "${n}"` };
  }
  const to = path.join(userSkillsDir(), n);
  if (fs.existsSync(path.join(to, 'SKILL.md')) && !opts.force) {
    return {
      ok: false,
      action: 'none',
      name: n,
      error: `a live skill named "${n}" already exists — read them both, then approve with --force to replace it`,
    };
  }
  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    // Replace whatever the live skill was, but keep the PROPOSAL.json as an
    // approval record inside the skill folder: who approved what, and when.
    if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
    fs.renameSync(from, to);
    const record = path.join(to, 'PROPOSAL.json');
    try {
      const meta = JSON.parse(fs.readFileSync(record, 'utf8')) as Record<string, unknown>;
      meta.decided = 'approved';
      meta.decidedAt = Date.now();
      fs.writeFileSync(record, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    } catch {
      /* the approval stands even if the record cannot be annotated */
    }
    return { ok: true, action: 'approved', name: n, path: path.join(to, 'SKILL.md') };
  } catch (err) {
    return { ok: false, action: 'none', name: n, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Reject: keep the file (with the reason) so the decision is auditable. */
export function rejectProposal(name: string, reason = ''): DecisionResult {
  const n = safeSkillName(name);
  if (!n) return { ok: false, action: 'none', name, error: 'invalid skill name' };
  const from = path.join(proposalsRoot(), n);
  if (!fs.existsSync(path.join(from, 'SKILL.md'))) {
    return { ok: false, action: 'none', name: n, error: `no proposal named "${n}"` };
  }
  const to = path.join(rejectedRoot(), n);
  try {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
    fs.renameSync(from, to);
    const note = `# rejected ${new Date().toISOString()}\n\n${reason.trim() || '(no reason given)'}\n`;
    fs.writeFileSync(path.join(to, 'REJECTED.md'), note, 'utf8');
    return { ok: true, action: 'rejected', name: n, path: to };
  } catch (err) {
    return { ok: false, action: 'none', name: n, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface RejectedEntry {
  name: string;
  reason: string;
  decidedAt: number;
}

export function listRejected(): RejectedEntry[] {
  const root = rejectedRoot();
  if (!fs.existsSync(root)) return [];
  const out: RejectedEntry[] = [];
  for (const e of fs.readdirSync(root, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    let reason = '';
    let decidedAt = 0;
    try {
      const note = fs.readFileSync(path.join(root, e.name, 'REJECTED.md'), 'utf8');
      reason = note.split('\n').slice(2).join('\n').trim();
      decidedAt = Date.parse(/^# rejected (\S+)/m.exec(note)?.[1] ?? '') || 0;
    } catch {
      /* a rejected folder without a note still happened */
    }
    out.push({ name: e.name, reason, decidedAt });
  }
  return out.sort((a, b) => b.decidedAt - a.decidedAt);
}
