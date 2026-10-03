/**
 * What belongs to one conversation (21.4): `termcrab sessions show <id>`.
 *
 * A session is not just its transcript. Files were touched in it, facts were
 * learned in it, an approval may be waiting on it, and a writer may hold the
 * fence right now. The data already exists — this module reads it from where
 * it lives (the transcript, MEMORY.md's provenance stamps, the approvals
 * store) instead of keeping a second index that could drift.
 */
import fs from 'node:fs';
import { listApprovals } from '../core/approvals.js';
import { MemoryStore } from './memory.js';
import { SessionStore, type Entry } from './sessions.js';
import { parseResetPolicy, shouldReset } from './session-policy.js';
import { lastDigestSummary } from './sessions.js';

export interface SessionAttachment {
  /** Files this conversation read or wrote, with the last time it touched them. */
  files: Array<{ path: string; times: number; lastAt: number; wrote: boolean }>;
  /** Facts recorded while this session was running (from provenance stamps). */
  facts: Array<{ text: string; origin: string; when: string; line: number; file: string }>;
  /** Approvals that belong to this session (including already-decided ones). */
  approvals: Array<{ id: string; tool: string; status: string; createdAt: number }>;
  /** Tools this conversation used, most-used first. */
  tools: Array<{ name: string; calls: number }>;
}

export interface SessionView {
  id: string;
  file: string;
  archive: string | null;
  entries: { hot: number; archived: number; total: number };
  bytes: number;
  firstAt: number | null;
  lastAt: number | null;
  roles: Record<string, number>;
  digest: { present: boolean; summary: string | null };
  fence: { heldBy: string | null; pid: number | null; since: number | null } | null;
  policy: string;
  resetDue: boolean;
  resetReason: string;
  attachment: SessionAttachment;
}

/** Tool calls that touch the filesystem, and whether they wrote. */
const FILE_TOOLS: Record<string, boolean> = {
  read_file: false,
  write_file: true,
  edit_file: true,
  list_files: false,
  shell: false,
};

export function sessionView(
  sessionId: string,
  opts: { store?: SessionStore; memory?: MemoryStore; now?: number; resetPolicy?: string } = {},
): SessionView {
  const store = opts.store ?? new SessionStore();
  const memory = opts.memory ?? new MemoryStore();
  const now = opts.now ?? Date.now();
  const file = store.transcriptFile(sessionId);
  const archive = fs.existsSync(store.archivePath(sessionId)) ? store.archivePath(sessionId) : null;
  const detail = store.readDetailed(sessionId);
  const entries = detail.entries;
  const stats = store.archiveStats(sessionId);

  const roles: Record<string, number> = {};
  const files = new Map<string, { path: string; times: number; lastAt: number; wrote: boolean }>();
  const tools = new Map<string, number>();
  for (const entry of entries) {
    roles[entry.role] = (roles[entry.role] ?? 0) + 1;
    if (entry.role !== 'assistant' && entry.role !== 'tool') continue;
    const calls: Array<{ name: string; args: unknown }> =
      entry.role === 'assistant'
        ? (entry.toolCalls ?? []).map((c) => ({ name: c.name, args: c.args }))
        : [{ name: entry.name, args: {} }];
    for (const call of calls) {
      tools.set(call.name, (tools.get(call.name) ?? 0) + 1);
      if (!(call.name in FILE_TOOLS)) continue;
      const target = fileTarget(call.name, call.args);
      if (!target) continue;
      const row = files.get(target) ?? { path: target, times: 0, lastAt: 0, wrote: false };
      row.times += 1;
      row.lastAt = Math.max(row.lastAt, entry.ts ?? 0);
      row.wrote = row.wrote || FILE_TOOLS[call.name]!;
      files.set(target, row);
    }
  }

  // The digest lives in memory/compacted/<session>.md; `lastDigestSummary()`
  // is the only reader that knows the header format, so ask it.
  let digestPresent = false;
  let digestSummary: string | null = null;
  try {
    const summary = lastDigestSummaryFor(sessionId);
    if (summary) {
      digestPresent = true;
      digestSummary = `${summary.by || 'extractive'} · ${summary.coveredTurns} turn(s) · ${summary.at}`;
    }
  } catch {
    /* no digest yet: that is normal for a young session */
  }

  const policy = parseResetPolicy(opts.resetPolicy ?? 'never');
  const hot = store.readHot(sessionId, 1_000_000);
  const decision = shouldReset(hot, policy, now);
  const claim = store.readClaim(sessionId);

  // The same fact exists twice on disk (MEMORY.md and the day's mirror), which
  // is correct for durability and noise in a view: keep the canonical file.
  const seenFacts = new Set<string>();
  const facts = [];
  for (const f of memory.factsFromSession(sessionId)) {
    const key = `${f.body}|${f.origin}`;
    if (seenFacts.has(key)) continue;
    seenFacts.add(key);
    facts.push({ text: f.body, origin: f.origin, when: f.stamp, line: f.line, file: f.file });
  }

  return {
    id: sessionId,
    file,
    archive,
    entries: { hot: stats.hot, archived: stats.archived, total: stats.total },
    bytes: bytesOf([file, archive]),
    firstAt: entries.length ? entries[0]!.ts ?? null : null,
    lastAt: entries.length ? entries[entries.length - 1]!.ts ?? null : null,
    roles,
    digest: { present: digestPresent, summary: digestSummary },
    fence: claim ? { heldBy: claim.owner, pid: claim.pid, since: claim.since } : null,
    policy: policy.label,
    resetDue: decision.reset,
    resetReason: decision.reason,
    attachment: {
      files: [...files.values()].sort((a, b) => b.lastAt - a.lastAt || b.times - a.times),
      facts,
      approvals: listApprovals(true)
        .filter((a) => a.sessionId === sessionId)
        .map((a) => ({ id: a.id, tool: a.tool, status: a.status, createdAt: a.createdAt })),
      tools: [...tools.entries()].map(([name, calls]) => ({ name, calls })).sort((a, b) => b.calls - a.calls),
    },
  };
}

function fileTarget(tool: string, args: unknown): string | null {
  const a = (args ?? {}) as Record<string, unknown>;
  const candidate = a.path ?? a.file ?? a.filePath ?? a.target;
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const cleaned = candidate.trim();
  if (tool === 'shell') {
    // `shell` args are a command, not a path; only remember a path-looking word.
    const m = cleaned.match(/[./~][^\s'"]{2,}/);
    return m ? m[0] : null;
  }
  return cleaned;
}

function bytesOf(files: Array<string | null>): number {
  let total = 0;
  for (const f of files) {
    if (!f) continue;
    try {
      total += fs.statSync(f).size;
    } catch {
      /* gone */
    }
  }
  return total;
}

/** The digest for exactly this session, or null (the global last-digest finds any). */
function lastDigestSummaryFor(sessionId: string): { at: string; by: string; coveredTurns: number } | null {
  const summary = lastDigestSummary();
  if (!summary || summary.session !== sessionId) return null;
  return { at: summary.at, by: summary.by, coveredTurns: summary.coveredTurns };
}

/** A short paragraph for `termcrab sessions show` (the non-JSON view). */
export function formatSessionView(view: SessionView): string {
  const kb = (n: number): string => `${Math.max(1, Math.round(n / 1024))} KB`;
  const stamp = (n: number | null): string =>
    n ? new Date(n).toISOString().slice(0, 16).replace('T', ' ') : '—';
  const lines: string[] = [];
  lines.push(`💬 ${view.id}`);
  lines.push(`   entries   ${view.entries.total} (${view.entries.hot} live · ${view.entries.archived} archived) · ${kb(view.bytes)}`);
  lines.push(`   talking   ${stamp(view.firstAt)} → ${stamp(view.lastAt)}`);
  lines.push(`   roles     ${Object.entries(view.roles).map(([r, n]) => `${r} ${n}`).join(' · ') || 'empty'}`);
  lines.push(`   digest    ${view.digest.present ? 'yes' : 'no'}${view.digest.summary ? ` — ${view.digest.summary.slice(0, 80)}` : ''}`);
  if (view.fence) lines.push(`   writer    ${view.fence.heldBy} (pid ${view.fence.pid}) since ${stamp(view.fence.since)}`);
  lines.push(`   policy    ${view.policy}${view.resetDue ? ` — next turn starts fresh (${view.resetReason})` : ` — ${view.resetReason}`}`);
  if (view.attachment.tools.length) {
    lines.push(`   tools     ${view.attachment.tools.slice(0, 6).map((t) => `${t.name}×${t.calls}`).join(' · ')}`);
  }
  if (view.attachment.files.length) {
    lines.push('   files:');
    for (const f of view.attachment.files.slice(0, 8)) {
      lines.push(`     ${f.wrote ? '✎' : '👁'} ${f.path} ×${f.times}`);
    }
  }
  if (view.attachment.facts.length) {
    lines.push('   learned:');
    for (const f of view.attachment.facts.slice(0, 6)) {
      lines.push(`     [${f.origin}] ${f.text.slice(0, 90)}`);
    }
  }
  if (view.attachment.approvals.length) {
    lines.push('   approvals:');
    for (const a of view.attachment.approvals) lines.push(`     ${a.status} · ${a.tool} · ${a.id}`);
  }
  return lines.join('\n');
}

/** Used by `/status` and the CLI: one line, whatever the policy is. */
export function policyLine(
  store: SessionStore,
  sessionId: string,
  raw: unknown,
  now = Date.now(),
): string {
  const policy = parseResetPolicy(raw);
  const entries: Entry[] = store.readHot(sessionId, 1_000_000);
  const decision = shouldReset(entries, policy, now);
  return decision.reset
    ? `Sessions: ${policy.label} — next turn starts fresh (${decision.reason})`
    : `Sessions: ${policy.label} — ${decision.reason}`;
}
