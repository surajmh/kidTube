import { ApprovedVideo } from '../../src/types';
import { YouTubeProviderError } from '../../src/services/content/youtubeContentProvider';
import type { ChannelPageOptions, YouTubeChannel, YouTubeContentProvider, YouTubeVideo, YouTubeVideoPage } from '../../src/services/content/youtubeContentProvider.type';

/** A channel id that satisfies the canonical `UC` + 22 character rule. */
export const channelA = 'UCaaaaaaaaaaaaaaaaaaaaaa';
export const channelB = 'UCbbbbbbbbbbbbbbbbbbbbbb';
export const channelC = 'UCcccccccccccccccccccccc';

/** Video ids are exactly 11 characters. */
export const videoIds = ['vid00000001', 'vid00000002', 'vid00000003', 'vid00000004', 'vid00000005'];

export function video(index: number, channelId = channelA, overrides: Partial<YouTubeVideo> = {}): YouTubeVideo {
  return {
    youtubeVideoId: videoIds[index % videoIds.length],
    youtubeChannelId: channelId,
    channelName: 'Story Time',
    title: `Story ${index + 1}`,
    thumbnailUrl: `https://img.example/${index}.jpg`,
    publishedAt: `2026-0${(index % 9) + 1}-01T00:00:00.000Z`,
    durationSeconds: 300 + index,
    ...overrides,
  };
}

export function channel(overrides: Partial<YouTubeChannel> = {}): YouTubeChannel {
  return {
    youtubeChannelId: channelA,
    name: 'Story Time',
    thumbnailUrl: 'https://img.example/channel.jpg',
    uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa',
    ...overrides,
  };
}

/**
 * Scriptable provider.
 *
 * Records every call so tests can assert on pagination tokens and on the
 * metadata/playlist calls a fetch actually made.
 */
export class FakeProvider implements YouTubeContentProvider {
  readonly id = 'fake';
  readonly calls: Array<{ method: string; args: unknown[] }> = [];

  constructor(
    private readonly handler: {
      channel?: (channelId: string) => YouTubeChannel | Error;
      videos?: (channelId: string, options?: ChannelPageOptions) => YouTubeVideoPage | Error;
      resolve?: (reference: string) => string | Error;
    } = {},
  ) {}

  async resolveChannelId(reference: string): Promise<string> {
    this.calls.push({ method: 'resolveChannelId', args: [reference] });
    const result = this.handler.resolve?.(reference);
    if (result instanceof Error) throw result;
    if (typeof result === 'string') return result;
    throw new YouTubeProviderError('CHANNEL_NOT_FOUND', 'not found', false);
  }

  async getChannel(channelId: string): Promise<YouTubeChannel> {
    this.calls.push({ method: 'getChannel', args: [channelId] });
    const result = this.handler.channel?.(channelId);
    if (result instanceof Error) throw result;
    return result ?? channel({ youtubeChannelId: channelId });
  }

  async getChannelVideos(channelId: string, options?: ChannelPageOptions): Promise<YouTubeVideoPage> {
    this.calls.push({ method: 'getChannelVideos', args: [channelId, options] });
    const result = this.handler.videos?.(channelId, options);
    if (result instanceof Error) throw result;
    return result ?? { channelId, videos: [] };
  }
}

/** A stored row that came from a channel sync. */
export function syncedVideo(videoId: string, channelId = channelA, title = `Story ${videoId}`): ApprovedVideo {
  return {
    id: `synced-${videoId}`,
    youtubeVideoId: videoId,
    title,
    channelId,
    channelName: 'Story Time',
    approved: false,
    syncedFromChannel: true,
  };
}

/** A row a parent approved by hand. */
export function approvedVideo(videoId: string, channelId = channelB): ApprovedVideo {
  return {
    id: `manual-${videoId}`,
    youtubeVideoId: videoId,
    title: `Approved ${videoId}`,
    channelId,
    approved: true,
  };
}
