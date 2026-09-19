import { ApprovedChannel, ApprovedVideo, WatchHistory } from '../types';
import { ContentCategory, resolvedCategoryIds } from '../phase4Types';
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
    // playback policy would refuse.
    const videos = input.videos.filter(
      (video) =>
        Boolean(video.youtubeVideoId) &&
        contentAccessService.evaluate(profileId, { videoId: video.youtubeVideoId, channelId: video.channelId }, now) === 'allowed',
    );

    const channels = input.channels.filter(
      (channel) => contentAccessService.evaluate(profileId, { channelId: channel.channelId }, now) === 'allowed',
    );

    const categoryIds = new Set<string>();
    videos.forEach((video) => resolvedCategoryIds(video.categoryIds).forEach((id) => categoryIds.add(id)));
    channels.forEach((channel) => resolvedCategoryIds(channel.categoryIds).forEach((id) => categoryIds.add(id)));

    const categories = input.categories
      .filter((category) => categoryIds.has(category.id))
      .map((category) => ({
        category,
        videoCount: videos.filter((video) => resolvedCategoryIds(video.categoryIds).includes(category.id)).length,
      }));

    const history = input.history ?? [];
    const recentVideos = history
      .filter((item) => item.profileId === profileId)
      .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
      .map((item) => videos.find((video) => video.youtubeVideoId === item.videoId))
      .filter((video): video is ApprovedVideo => Boolean(video))
      .filter((video, index, list) => list.findIndex((item) => item.id === video.id) === index)
      .slice(0, 8);

    return {
      profileId,
      categories,
      channels,
      videos,
      recentVideos,
      askableVideos: input.videos.filter(
        (video) =>
          Boolean(video.youtubeVideoId) &&
          contentAccessService.evaluate(profileId, { videoId: video.youtubeVideoId, channelId: video.channelId }, now) !== 'allowed',
      ),
      askableChannels: input.channels.filter(
        (channel) => contentAccessService.evaluate(profileId, { channelId: channel.channelId }, now) !== 'allowed',
      ),
    };
  }
}

export const kidContentLibraryService = new KidContentLibraryService();
