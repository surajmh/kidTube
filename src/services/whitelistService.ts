import { ApprovedChannel, ApprovedVideo } from '../types';
import { resolvedCategoryIds } from '../phase4Types';

export class WhitelistService {
  private videos: ApprovedVideo[] = [];
  private channels: ApprovedChannel[] = [];

  setContent(videos: ApprovedVideo[], channels: ApprovedChannel[]) {
    this.videos = videos;
    this.channels = channels;
  }

  isVideoAllowed(videoId: string, channelId?: string): boolean {
    const video = this.videos.find((item) => item.youtubeVideoId === videoId);
    if (video?.approved) return true;

    const resolvedChannelId = channelId ?? video?.channelId;
    return Boolean(
      resolvedChannelId &&
        this.channels.some((channel) => channel.approved && channel.channelId === resolvedChannelId),
    );
  }

  isChannelApproved(channelId: string): boolean {
    return this.channels.some((channel) => channel.approved && channel.channelId === channelId);
  }

  findVideo(videoId?: string) {
    if (!videoId) return undefined;
    return this.videos.find((item) => item.youtubeVideoId === videoId);
  }

  findChannel(channelId?: string) {
    if (!channelId) return undefined;
    return this.channels.find((item) => item.channelId === channelId);
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

export const whitelistService = new WhitelistService();
