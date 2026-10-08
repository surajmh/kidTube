import { ApprovedChannel, ApprovedVideo } from '../../types';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';
import { ChannelAvailability, KidSearchResults } from './kidHome.type';
// One duration formatter for the whole app; this used to exist here and in ChannelVideoList
// with different behaviour for a missing value.
export { formatDuration } from '../shared/duration.helper';

/**
 * Pure view logic for Kid Mode.
 *
 * Nothing here decides access: every list handed in has already passed `ContentAccessService`,
 * so these functions only narrow and describe what the child may already see.
 */

function matches(value: string | undefined, needle: string): boolean {
  return Boolean(value && value.toLowerCase().includes(needle));
}

/**
 * Search is a filter over the library Kid Mode was given, so it can only ever surface approved
 * content and never issues a network request.
 */
export function searchLibrary(
  videos: ApprovedVideo[],
  channels: ApprovedChannel[],
  query: string,
): KidSearchResults {
  const needle = query.trim().toLowerCase();
  if (!needle) return { videos: [], channels: [] };
  return {
    videos: videos.filter((video) => matches(video.title, needle) || matches(video.channelName, needle)),
    channels: channels.filter((channel) => matches(channel.name, needle)),
  };
}

/** The feed, narrowed to a category chip. A null category means everything. */
export function videosInCategory(videos: ApprovedVideo[], categoryId: string | null): ApprovedVideo[] {
  if (!categoryId) return videos;
  return videos.filter((video) => video.categoryIds?.includes(categoryId));
}

/**
 * Videos belonging to a channel. Matching on name as well as id is deliberate: videos added by
 * hand before the channel was approved carry a channel name but no id.
 */
export function videosForChannel(videos: ApprovedVideo[], channel: ApprovedChannel): ApprovedVideo[] {
  return videos.filter(
    (video) => video.channelId === channel.channelId || video.channelName === channel.name,
  );
}

/**
 * What a child can be told about a channel's uploads.
 *
 * Kept separate from rendering because the distinction that matters is subtle: a channel that has
 * never been fetched is *unknown*, not empty, and one whose refresh failed while holding cached
 * videos should still show them rather than an error.
 */
export function channelAvailability(
  syncState: ChannelSyncState | undefined,
  videoCount: number,
): ChannelAvailability {
  const failed = Boolean(syncState?.lastError);
  if (failed) return videoCount > 0 ? 'stale-with-cache' : 'unavailable';
  if (!syncState?.fetchedAt) return videoCount > 0 ? 'ready' : 'not-loaded';
  return 'ready';
}


/**
 * Thumbnails come straight from the image CDN by video id, so the feed looks right without a
 * metadata provider. `hq720` is the 16:9 rendition; `mqdefault` always exists as a fallback.
 */
export function thumbnailUrls(video: Pick<ApprovedVideo, 'youtubeVideoId' | 'thumbnailUrl'>) {
  const cdn = `https://i.ytimg.com/vi/${video.youtubeVideoId}`;
  return { primary: video.thumbnailUrl ?? `${cdn}/hq720.jpg`, fallback: `${cdn}/mqdefault.jpg` };
}

/** Stable tint for a channel monogram, so the same channel keeps the same colour. */
export function monogramTint(seed: string, tints: readonly string[]): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  return tints[hash % tints.length];
}

export const videoKey = (video: ApprovedVideo) => video.id;
