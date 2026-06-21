import { BadRequestException } from '@nestjs/common';

export type PrStatus = 'draft' | 'open' | 'merged' | 'closed';

const VALID_TRANSITIONS: Record<PrStatus, PrStatus[]> = {
  draft: ['open', 'closed'],
  open: ['draft', 'merged', 'closed'],
  merged: [],   // terminal state — no transitions out
  closed: [],   // terminal state — no transitions out
};

export function assertValidTransition(from: PrStatus, to: PrStatus): void {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition PR from "${from}" to "${to}". Allowed transitions: ${allowed.join(', ') || 'none (terminal state)'}`,
    );
  }
}

export function assertMergeable(
  reviews: Array<{ status: string }>,
  currentStatus: PrStatus,
): void {
  if (currentStatus !== 'open') {
    throw new BadRequestException('Only open PRs can be merged');
  }

  const hasApproval = reviews.some(r => r.status === 'approved');
  const hasBlockingReview = reviews.some(r => r.status === 'changes_requested');

  if (!hasApproval) {
    throw new BadRequestException('PR requires at least one approval before merging');
  }
  if (hasBlockingReview) {
    throw new BadRequestException('PR has unresolved change requests and cannot be merged');
  }
}