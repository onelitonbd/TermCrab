import { randomUUID } from 'node:crypto';
import { Config } from './config.js';

/**
 * Human-in-the-loop approvals.
 *
 * A gated tool call stops *before* it executes; the agent loop creates an
 * approval here, emits it (SSE → panel card), and awaits a decision. The
 * decision can come from the panel (`POST /api/approvals/:id/approve|deny`),
 * from the terminal (`termcrab approvals approve|deny <id>`), or from the
 * timeout policy when nobody answers. The old version of this file could
 * create and resolve approvals, but nothing ever called it.
 */

export interface Approval {
  id: string;
  /** Session whose turn is blocked on this. */
  sessionId?: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
  decidedAt?: number;
  /** Who answered: panel | cli | timeout | test (free-form for callers). */
  decidedBy?: string;
  /** Wait window that applied to this approval, in seconds. */
  timeoutSec?: number;
}

export type ApprovalDecision = 'approved' | 'denied' | 'timeout-denied' | 'timeout-allowed' | 'aborted' | 'unknown';

const approvals = new Map<string, Approval>();
const resolvers = new Map<string, (decision: ApprovalDecision) => void>();
/** Keep the decided history small; the panel only ever shows pending ones. */
const MAX_HISTORY = 50;

export function createApproval(input: {
  tool: string;
  args: Record<string, unknown>;
  sessionId?: string;
  timeoutSec?: number;
}): Approval {
  const approval: Approval = {
    id: randomUUID(),
    sessionId: input.sessionId,
    tool: input.tool,
    args: input.args,
    status: 'pending',
    createdAt: Date.now(),
    timeoutSec: input.timeoutSec,
  };
  approvals.set(approval.id, approval);
  trimHistory();
  return approval;
}

export function getApproval(id: string): Approval | undefined {
  return approvals.get(id);
}

/** Decide a pending approval. Returns false when it is unknown or already decided. */
export function resolveApproval(id: string, approved: boolean, by = 'panel'): boolean {
  const approval = approvals.get(id);
  if (!approval || approval.status !== 'pending') return false;
  approval.status = approved ? 'approved' : 'denied';
  approval.decidedAt = Date.now();
  approval.decidedBy = by;
  const resolver = resolvers.get(id);
  if (resolver) {
    resolver(approved ? 'approved' : 'denied');
    resolvers.delete(id);
  }
  return true;
}

/**
 * Wait for a decision. Resolves with *how* it was decided so the model can be
 * told the truth: a human denied it, or nobody answered in time and the
 * configured default applied. An abort (user pressed Stop) ends the wait
 * immediately instead of hanging until the timeout.
 */
export function waitForApproval(
  id: string,
  timeoutMs = 120_000,
  onTimeout: 'deny' | 'allow' = 'deny',
  signal?: AbortSignal,
): Promise<ApprovalDecision> {
  const approval = approvals.get(id);
  if (!approval) return Promise.resolve('unknown');
  if (approval.status === 'approved') return Promise.resolve('approved');
  if (approval.status === 'denied') return Promise.resolve('denied');

  return new Promise<ApprovalDecision>((resolve) => {
    let done = false;
    const finish = (decision: ApprovalDecision) => {
      if (done) return;
      done = true;
      resolvers.delete(id);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(decision);
    };
    const timer = setTimeout(() => {
      // Nobody answered: apply the policy, and mark it so the record is honest.
      const decision: ApprovalDecision = onTimeout === 'allow' ? 'timeout-allowed' : 'timeout-denied';
      const pending = approvals.get(id);
      if (pending && pending.status === 'pending') {
        pending.status = onTimeout === 'allow' ? 'approved' : 'denied';
        pending.decidedAt = Date.now();
        pending.decidedBy = 'timeout';
      }
      finish(decision);
    }, Math.max(0, timeoutMs));
    const onAbort = () => finish('aborted');
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    resolvers.set(id, finish);
  });
}

/** Pending approvals (the panel's list). Pass true for the decided history too. */
export function listApprovals(includeDecided = false): Approval[] {
  const all = Array.from(approvals.values());
  return includeDecided ? all : all.filter((a) => a.status === 'pending');
}

/**
 * True when this tool must be approved before it runs. Tolerant on purpose:
 * `config set security.approvals.tools exec,write_file` writes a plain string
 * (users type it that way), the panel writes a real array, and `*` means
 * "ask me before anything".
 */
export function needsApproval(config: Config, tool: string): boolean {
  const cfg = config.security?.approvals;
  if (!cfg?.enabled) return false;
  const raw = cfg.tools as unknown;
  const list = Array.isArray(raw)
    ? raw.map((t) => String(t).trim()).filter(Boolean)
    : typeof raw === 'string'
      ? raw.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
  return list.includes('*') || list.includes(tool);
}

/** How long a gated call waits, in milliseconds. */
export function approvalTimeoutMs(config: Config): number {
  const seconds = Number(config.security?.approvals?.timeoutSec ?? 120);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 120_000;
}

/**
 * Drop decided approvals once the history is long enough. Pending ones are
 * never removed here — their timeout is handled by the waiter itself.
 */
function trimHistory(): void {
  if (approvals.size <= MAX_HISTORY) return;
  for (const [id, a] of approvals) {
    if (approvals.size <= MAX_HISTORY) break;
    if (a.status !== 'pending') approvals.delete(id);
  }
}

/** Test helper: forget everything (never called by the app). */
export function resetApprovals(): void {
  approvals.clear();
  resolvers.clear();
}
