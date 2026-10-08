import type { ApprovalDuration, ApprovalTarget, ContentApproval } from '../types';

export type ApprovalGrantInput = {
  profileId: string | null;
  target: ApprovalTarget;
  duration: ApprovalDuration;
  requestId?: string;
};

export type ApprovalGrantResult = {
  approval: ContentApproval;
  approvals: ContentApproval[];
  /** Permanent family-wide grants are mirrored into the Phase 1 whitelist by the caller. */
  mirrorTarget: ApprovalTarget | null;
};
