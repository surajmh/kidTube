import type { ApprovedVideo } from '../../types';
import type { ChannelSyncState, SyncMode } from './channelSyncRules.type';
import type { ClassifiedProviderError, YouTubeChannel, YouTubeContentProvider } from './youtubeContentProvider.type';

/**
 * One fetch of one channel page, expressed as a pure async function.
 *
 * `ChannelSyncService` owns sessions, in-flight coalescing and persistence; the
 * actual "talk to the provider, then merge" step lives here so its behaviour is
 * testable with a fake provider — no storage, no React, no network.
 *
 * The failure contract is the important one: a failed fetch returns the videos it
 * was given, unchanged. Nothing a provider does can remove cached content.
 */
export type ChannelPageFetchInput = {
  provider: YouTubeContentProvider;
  channelId: string;
  channelName?: string;
  mode: SyncMode;
  state: ChannelSyncState;
  existingVideos: ApprovedVideo[];
  now?: Date;
};

export type ChannelPageFetchResult = {
  state: ChannelSyncState;
  videos: ApprovedVideo[];
  added: number;
  updated: number;
  /** Present only when channel metadata was refetched. */
  metadata?: YouTubeChannel;
  /** Present when the fetch failed; `videos` is then the untouched input. */
  error?: ClassifiedProviderError;
};
