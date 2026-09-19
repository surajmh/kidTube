import { ApprovedVideo } from '../../types';
import {
  ChannelSyncState,
  SyncMode,
  applyFetchFailure,
  applyFetchResult,
} from './channelSyncRules';
import {
  ClassifiedProviderError,
  YouTubeChannel,
  YouTubeContentProvider,
  classifyProviderError,
} from './youtubeContentProvider';

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

export async function fetchChannelPage(input: ChannelPageFetchInput): Promise<ChannelPageFetchResult> {
  const { state, mode } = input;

  try {
    // Channel metadata (and with it the uploads playlist) is reused while it is
    // known; a refresh re-reads it so a renamed channel or a moved playlist heals.
    const needsMetadata = mode !== 'more' && (!state.uploadsPlaylistId || mode === 'refresh');
    const metadata = needsMetadata ? await input.provider.getChannel(input.channelId) : undefined;

    const page = await input.provider.getChannelVideos(input.channelId, {
      // `more` continues from the stored token; everything else starts at page one.
      pageToken: mode === 'more' ? state.nextPageToken : undefined,
    });

    const outcome = applyFetchResult({
      existingVideos: input.existingVideos,
      state,
      page,
      mode,
      channelName: metadata?.name ?? input.channelName,
      channelMetadata: metadata,
      now: input.now,
    });

    return {
      state: outcome.state,
      videos: outcome.result.videos,
      added: outcome.result.added,
      updated: outcome.result.updated,
      metadata,
    };
  } catch (caught) {
    const error = classifyProviderError(caught);
    return {
      state: applyFetchFailure(state, error, input.now),
      // Untouched: a refresh that fails leaves every cached video in place (§13).
      videos: input.existingVideos,
      added: 0,
      updated: 0,
      error,
    };
  }
}
