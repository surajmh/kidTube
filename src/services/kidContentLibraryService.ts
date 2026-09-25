import { ApprovedChannel, ApprovedVideo, WatchHistory } from '../types';
import { ContentCategory, resolvedCategoryIds } from '../parentalControlsTypes';
import { contentAccessService } from './contentAccessService';

/**
 * KidContentLibrary.
 *
 * The only view of content Kid Mode ever receives. It has no search capability:
 * everything it returns has already passed the same access rules the playback
 * policy enforces, so a child can never be shown something that would be
 * refused at playback time.
 */
export type KidCategoryCard = {
  category: ContentCategory;
  videoCount: number;
};

export type KidLibrary = {
  profileId: string;
  categories: KidCategoryCard[];
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  recentVideos: ApprovedVideo[];
  /** Unapproved rows a parent added: children may ask for these, never play them. */
  askableVideos: ApprovedVideo[];
  askableChannels: ApprovedChannel[];
};

export type KidLibraryInput = {
  profileId: string;
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  categories: ContentCategory[];
  history?: WatchHistory[];
  now?: Date;
};

export class KidContentLibraryService {
  build(input: KidLibraryInput): KidLibrary {
    const now = input.now ?? new Date();
    const { profileId } = input;

    // The access service is the only gate: Kid Mode never receives content the
    // playback policy would refuse. One evaluation per row decides both lists.
    const videos: ApprovedVideo[] = [];
    const askableVideos: ApprovedVideo[] = [];
    for (const video of input.videos) {
      if (!video.youtubeVideoId) continue;
      const allowed =
        contentAccessService.evaluate(profileId, { videoId: video.youtubeVideoId, channelId: video.channelId }, now) === 'allowed';
      (allowed ? videos : askableVideos).push(video);
    }

    const channels: ApprovedChannel[] = [];
    const askableChannels: ApprovedChannel[] = [];
    for (const channel of input.channels) {
      const allowed = contentAccessService.evaluate(profileId, { channelId: channel.channelId }, now) === 'allowed';
      (allowed ? channels : askableChannels).push(channel);
    }

    const categoryCounts = new Map<string, number>();
    const categoryIds = new Set<string>();
    for (const video of videos) {
      for (const id of new Set(resolvedCategoryIds(video.categoryIds))) {
        categoryCounts.set(id, (categoryCounts.get(id) ?? 0) + 1);
        categoryIds.add(id);
      }
    }
    channels.forEach((channel) => resolvedCategoryIds(channel.categoryIds).forEach((id) => categoryIds.add(id)));

    const categories = input.categories
      .filter((category) => categoryIds.has(category.id))
      .map((category) => ({ category, videoCount: categoryCounts.get(category.id) ?? 0 }));

    const history = input.history ?? [];
    const recentVideos = pickRecentVideos(profileId, history, videos);

    return { profileId, categories, channels, videos, recentVideos, askableVideos, askableChannels };
  }
}

/** Newest watched videos this profile still has access to, deduped by video, capped at 8. */
function pickRecentVideos(profileId: string, history: WatchHistory[], videos: ApprovedVideo[]): ApprovedVideo[] {
  const byVideoId = new Map<string, ApprovedVideo>();
  for (const video of videos) {
    if (!byVideoId.has(video.youtubeVideoId)) byVideoId.set(video.youtubeVideoId, video);
  }
  const entries = history
    .filter((item) => item.profileId === profileId)
    .map((item) => ({ item, watchedAt: new Date(item.watchedAt).getTime() }))
    .sort((a, b) => b.watchedAt - a.watchedAt);
  const seen = new Set<string>();
  const recent: ApprovedVideo[] = [];
  for (const entry of entries) {
    const video = byVideoId.get(entry.item.videoId);
    if (!video || seen.has(video.id)) continue;
    seen.add(video.id);
    recent.push(video);
    if (recent.length === 8) break;
  }
  return recent;
}

export const kidContentLibraryService = new KidContentLibraryService();
