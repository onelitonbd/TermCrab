import { randomUUID } from 'node:crypto';

export interface Approval {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
}

const approvals = new Map<string, Approval>();
const resolvers = new Map<string, (approved: boolean) => void>();

export function createApproval(tool: string, args: Record<string, unknown>): Approval {
  const id = randomUUID();
  const approval: Approval = { id, tool, args, status: 'pending', createdAt: Date.now() };
  approvals.set(id, approval);
  return approval;
}

export function getApproval(id: string): Approval | undefined {
  return approvals.get(id);
}

export function resolveApproval(id: string, approved: boolean): void {
  const approval = approvals.get(id);
  if (!approval) return;
  approval.status = approved ? 'approved' : 'denied';
  const resolver = resolvers.get(id);
  if (resolver) {
    resolver(approved);
    resolvers.delete(id);
  }
}

export function waitForApproval(id: string): Promise<boolean> {
  return new Promise((resolve) => {
    const approval = approvals.get(id);
    if (!approval || approval.status !== 'pending') {
      resolve(approval?.status === 'approved');
      return;
    }
    resolvers.set(id, resolve);
  });
}

export function listApprovals(): Approval[] {
  return Array.from(approvals.values()).filter((a) => a.status === 'pending');
}

export function cleanupOldApprovals(maxAgeMs = 300000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, a] of approvals) {
    if (a.status === 'pending' && a.createdAt < cutoff) {
      resolveApproval(id, false);
      approvals.delete(id);
    }
  }
}
