import type { ApprovedVideo, WatchHistory } from '../types';
import type { ScreenTimeUsage } from '../types';
import type { ContentApproval, ContentCategory, ContentRequest } from '../types';

/**
 * Local-only activity summary for the parent dashboard.
 * No analytics SDK, no remote calls - everything is derived from AsyncStorage data.
 */
export type CategoryUsage = {
  categoryId: string;
  name: string;
  videos: number;
};

export type RecentEntry = {
  videoId: string;
  title: string;
  watchedAt: string;
  categoryNames: string[];
};

export type ActivitySummary = {
  profileId: string;
  todayWatchSeconds: number;
  todayVideosWatched: number;
  todayTopCategory?: CategoryUsage;
  weekWatchSeconds: number;
  weekVideosWatched: number;
  topCategories: CategoryUsage[];
  recentlyWatched: RecentEntry[];
  requests: ContentRequest[];
  activeApprovals: ContentApproval[];
};

export type ActivityInput = {
  profileId: string;
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
  now?: Date;
};
