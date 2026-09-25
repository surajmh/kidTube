import { ApprovedVideo, WatchHistory } from '../types';
import { ScreenTimeUsage } from '../playbackTypes';
import { ContentApproval, ContentCategory, ContentRequest, resolvedCategoryIds } from '../parentalControlsTypes';
import { localDayKey } from './playbackPolicyService';

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

function dayKeys(now: Date, days: number) {
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    keys.push(localDayKey(date));
  }
  return keys;
}

export class ActivityService {
  summarize(input: ActivityInput): ActivitySummary {
    const now = input.now ?? new Date();
    const today = localDayKey(now);
    const week = dayKeys(now, 7);
    const profileHistory = input.history.filter((item) => item.profileId === input.profileId);

    const todayWatchSeconds = input.screenTime
      .filter((record) => record.profileId === input.profileId && record.date === today)
      .reduce((total, record) => total + record.secondsWatched, 0);

    const weekWatchSeconds = input.screenTime
      .filter((record) => record.profileId === input.profileId && week.includes(record.date))
      .reduce((total, record) => total + record.secondsWatched, 0);

    const videoById = new Map(input.videos.map((video) => [video.youtubeVideoId, video]));
    const categoryName = (id: string) => input.categories.find((category) => category.id === id)?.name ?? 'Other';

    const watchedOn = (dayKey: string) =>
      profileHistory.filter((item) => localDayKey(new Date(item.watchedAt)) === dayKey);
    const watchedThisWeek = profileHistory.filter((item) => week.includes(localDayKey(new Date(item.watchedAt))));

    const countCategories = (items: WatchHistory[]): CategoryUsage[] => {
      const counts = new Map<string, number>();
      items.forEach((item) => {
        const video = videoById.get(item.videoId);
        resolvedCategoryIds(video?.categoryIds).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
      });
      return [...counts.entries()]
        .map(([categoryId, videos]) => ({ categoryId, name: categoryName(categoryId), videos }))
        .sort((a, b) => b.videos - a.videos);
    };

    const todayCategories = countCategories(watchedOn(today));
    const distinctToday = new Set(watchedOn(today).map((item) => item.videoId));

    const recentlyWatched: RecentEntry[] = [...profileHistory]
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      .filter((item, index, list) => list.findIndex((other) => other.videoId === item.videoId) === index)
      .slice(0, 6)
      .map((item) => {
        const video = videoById.get(item.videoId);
        return {
          videoId: item.videoId,
          title: video?.title ?? 'Approved video',
          watchedAt: item.watchedAt,
          categoryNames: resolvedCategoryIds(video?.categoryIds).map(categoryName),
        };
      });

    return {
      profileId: input.profileId,
      todayWatchSeconds,
      todayVideosWatched: distinctToday.size,
      todayTopCategory: todayCategories[0],
      weekWatchSeconds,
      weekVideosWatched: new Set(watchedThisWeek.map((item) => item.videoId)).size,
      topCategories: countCategories(watchedThisWeek).slice(0, 4),
      recentlyWatched,
      requests: input.requests.filter((request) => request.profileId === input.profileId),
      activeApprovals: input.approvals.filter(
        (approval) =>
          approval.profileId === input.profileId || approval.profileId === null,
      ),
    };
  }
}

export function formatWatchTime(seconds: number) {
  if (seconds <= 0) return '0 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export const activityService = new ActivityService();
