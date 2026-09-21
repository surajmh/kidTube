import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import { ApprovalDuration, ContentRequest } from '../../phase4Types';

/** Who an approval applies to: only the child who asked, or every child. */
export type RequestScope = 'child' | 'family';

export type RequestDecisionInput = {
  request: ContentRequest;
  decision: 'approved' | 'rejected';
  profileId: string | null;
  duration: ApprovalDuration;
};

export type ParentRequestsProps = {
  profiles: ChildProfile[];
  requests: ContentRequest[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  onDecide: (input: RequestDecisionInput) => Promise<void>;
  onDelete: (requestId: string) => Promise<void>;
  onClearResolved: () => Promise<void>;
};
