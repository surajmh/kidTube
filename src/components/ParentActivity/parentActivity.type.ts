import { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import type { ScreenTimeUsage } from '../../types';
import type { ContentApproval, ContentCategory, ContentRequest } from '../../types';

export type ParentActivityProps = {
  profiles: ChildProfile[];
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
};
