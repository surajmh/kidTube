import { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import { ScreenTimeUsage } from '../../playbackTypes';
import { ContentApproval, ContentCategory, ContentRequest } from '../../parentalControlsTypes';

export type ParentActivityProps = {
  profiles: ChildProfile[];
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
};
