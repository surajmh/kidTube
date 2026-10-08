import type { ApprovedChannel, ApprovedVideo } from '../types';
import type { ApprovalDuration, ContentApproval, ContentRequest, RequestType } from '../types';

export type RequestSubmission = {
  type: RequestType;
  /** Free text from the child. Never a URL. */
  title: string;
  /** Optional: must reference content already known to the parent library. */
  videoId?: string;
  channelId?: string;
  thumbnailUrl?: string;
  channelName?: string;
};

export type RequestDecision = 'approved' | 'rejected';

export type RequestWorkflowInput = {
  request: ContentRequest;
  decision: RequestDecision;
  /** `null` approves for every child. */
  profileId: string | null;
  duration: ApprovalDuration;
  requests: ContentRequest[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
};

export type RequestWorkflowResult = {
  requests: ContentRequest[];
  approvals: ContentApproval[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
};
