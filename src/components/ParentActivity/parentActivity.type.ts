import { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import { ScreenTimeUsage } from '../../phase3Types';
import { ContentApproval, ContentCategory, ContentRequest } from '../../phase4Types';

export type ParentActivityProps = {
  profiles: ChildProfile[];
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
};
