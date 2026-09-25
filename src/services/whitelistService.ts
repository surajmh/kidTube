import { ApprovedChannel, ApprovedVideo } from '../types';
import { resolvedCategoryIds } from '../parentalControlsTypes';

export class WhitelistService {
  private videos: ApprovedVideo[] = [];
  private channels: ApprovedChannel[] = [];
  /** Id → row indexes over the whitelists; every lookup on this service is called per-video. */
  private videoById = new Map<string, ApprovedVideo>();
  private channelById = new Map<string, ApprovedChannel>();
  private approvedChannelIds = new Set<string>();

  setContent(videos: ApprovedVideo[], channels: ApprovedChannel[]) {
    this.videos = videos;
    this.channels = channels;
    this.videoById = indexBy(videos, (video) => video.youtubeVideoId);
    this.channelById = indexBy(channels, (channel) => channel.channelId);
    this.approvedChannelIds = new Set(
      channels.filter((channel) => channel.approved).map((channel) => channel.channelId),
    );
  }

  isVideoAllowed(videoId: string, channelId?: string): boolean {
    const video = this.videoById.get(videoId);
    if (video?.approved) return true;

    const resolvedChannelId = channelId ?? video?.channelId;
    return Boolean(resolvedChannelId && this.approvedChannelIds.has(resolvedChannelId));
  }

  isChannelApproved(channelId: string): boolean {
    return this.approvedChannelIds.has(channelId);
  }

  findVideo(videoId?: string) {
    if (!videoId) return undefined;
    return this.videoById.get(videoId);
  }

  findChannel(channelId?: string) {
    if (!channelId) return undefined;
    return this.channelById.get(channelId);
  }

  approvedVideos() {
    return this.videos.filter((video) => video.approved);
  }

  approvedChannels() {
    return this.channels.filter((channel) => channel.approved);
  }

  /** Category ids of a video plus the categories inherited from its channel. */
  categoryIdsFor(videoId?: string, channelId?: string): string[] {
    const video = this.findVideo(videoId);
    const resolvedChannelId = channelId ?? video?.channelId;
    const channel = this.findChannel(resolvedChannelId);
    const ids = new Set<string>([...(video?.categoryIds ?? []), ...(channel?.categoryIds ?? [])]);
    return resolvedCategoryIds([...ids]);
  }
}

/** First occurrence wins, matching the `find` semantics these indexes replace. */
function indexBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!map.has(key(item))) map.set(key(item), item);
  }
  return map;
}

export const whitelistService = new WhitelistService();
