import { channelSyncRepository } from '../repositories/channelSyncRepository';
import type { ChannelSyncMap } from '../repositories/channelSyncRepository.type';
import { ApprovedChannel,ApprovedVideo } from '../types';
import { parentSessionService } from './auth/parentSession';
import type { ParentSession } from './auth/parentSession.type';
import { channelReferenceLabel,effectiveSyncMode,emptyChannelSyncState,isCanonicalChannelId,normalizeChannelInput,shouldFetchChannel,syncOwnedVideos,channelVideosFrom } from './content/channelSyncRules';
import type { ChannelReference,ChannelSyncState,SyncMode } from './content/channelSyncRules.type';
import { YouTubeProviderError,providerErrorMessage } from './content/youtubeContentProvider';
import type { YouTubeChannel,YouTubeContentProvider } from './content/youtubeContentProvider.type';
import { fetchChannelPage } from './content/channelPageFetcher';
import { nativeYouTubeContentProvider } from './content/nativeYouTubeContentProvider';
import type { ResolvedChannel,ChannelSyncResult } from './channelSyncService.type';

/**
 * ChannelSyncService.
 *
 * Turns an approved channel into a browsable list of that channel's public
 * uploads, without changing the security model:
 *
 *   parent approves channel (Parent Mode only)
 *        -> resolve to a canonical channel id
 *        -> fetch channel metadata
 *        -> fetch the uploads playlist, one page at a time
 *        -> merge into the local video library
 *
 * Fetched rows are stored unapproved with `syncedFromChannel`, so eligibility
 * still comes from the approved channel and `PlaybackPolicy` remains the single
 * authority — nothing here can make content playable on its own.
 *
 * Every mutating method is refused without a live parent session; Kid Mode reads
 * the cached library through `KidContentLibraryService` and never calls this.
 */

/** Channels synced automatically in one pass, so a large library cannot burn the quota. */
export const autoSyncBatchLimit = 5;

export class ChannelSyncService {
  /**
   * Metadata comes from the on-device extractor. There is nothing to configure, and it refuses
   * with NOT_CONFIGURED on a build without the native module, so this still fails closed.
   */
  private provider: YouTubeContentProvider = nativeYouTubeContentProvider;
  private states: ChannelSyncMap = {};
  private readonly inFlight = new Map<string, Promise<ChannelSyncResult>>();

  hydrate(input: { states?: ChannelSyncMap }) {
    this.states = { ...(input.states ?? {}) };
  }

  setStates(states: ChannelSyncMap) {
    this.states = { ...states };
  }

  getState(channelId: string): ChannelSyncState | undefined {
    return this.states[channelId];
  }

  allStates(): ChannelSyncMap {
    return { ...this.states };
  }

  /** Videos of a channel as currently cached locally. Read-only, no network. */
  cachedVideos(videos: ApprovedVideo[], channelId: string): ApprovedVideo[] {
    return channelVideosFrom(videos, channelId);
  }

  canLoadMore(channelId: string): boolean {
    return Boolean(this.states[channelId]?.nextPageToken);
  }

  /**
   * Resolves a parent's pasted link/handle/id to a canonical channel, fetching its
   * metadata so the library stores a real name and thumbnail rather than a raw id.
   */
  async resolveChannel(session: ParentSession, input: string): Promise<ResolvedChannel> {
    parentSessionService.require('add a channel');
    const reference: ChannelReference = normalizeChannelInput(input);
    if (reference.kind === 'unknown') {
      throw new YouTubeProviderError('INVALID_INPUT', providerErrorMessage('INVALID_INPUT'), false);
    }

    // One provider round trip, not two: the extractor resolves a handle or link to
    // the canonical id *and* returns its metadata from the same channel fetch.
    const lookup = reference.kind === 'channelId' ? reference.id : channelReferenceLabel(reference);
    const channel = await this.provider.getChannel(lookup);

    if (!isCanonicalChannelId(channel.youtubeChannelId)) {
      throw new YouTubeProviderError('CHANNEL_NOT_FOUND', providerErrorMessage('CHANNEL_NOT_FOUND'), false);
    }

    return {
      youtubeChannelId: channel.youtubeChannelId,
      name: channel.name,
      thumbnailUrl: channel.thumbnailUrl,
      uploadsPlaylistId: channel.uploadsPlaylistId,
      description: channel.description,
    };
  }

  /**
   * Fetches one page of a channel's uploads and merges it into the library.
   *
   * A failure never removes anything: the cached videos stay exactly as they are
   * and only the sync state records the error (§13).
   */
  async sync(
    session: ParentSession,
    input: { channel: ApprovedChannel; videos: ApprovedVideo[]; mode?: SyncMode },
  ): Promise<ChannelSyncResult> {
    parentSessionService.require('refresh channel videos');

    const channelId = input.channel.channelId;
    const mode = effectiveSyncMode(this.states[channelId], input.mode ?? 'initial');

    const running = this.inFlight.get(channelId);
    if (running) {
      // Coalesce: the caller that started the fetch publishes the results, so this
      // one waits and then reports the current state rather than fetching twice.
      await running.catch(() => undefined);
      return {
        videos: input.videos,
        channels: [input.channel],
        state: this.states[channelId] ?? emptyChannelSyncState(channelId),
        fetched: false,
        added: 0,
        updated: 0,
      };
    }

    const state = this.states[channelId] ?? emptyChannelSyncState(channelId);
    if (!shouldFetchChannel(state, mode)) {
      return { videos: input.videos, channels: [input.channel], state, fetched: false, added: 0, updated: 0 };
    }

    const promise = this.perform(session, input.channel, input.videos, mode, state);
    this.inFlight.set(channelId, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(channelId);
    }
  }

  private async perform(
    session: ParentSession,
    channel: ApprovedChannel,
    videos: ApprovedVideo[],
    mode: SyncMode,
    state: ChannelSyncState,
  ): Promise<ChannelSyncResult> {
    // Re-check inside the in-flight window: the session may have expired while we waited.
    parentSessionService.require('refresh channel videos');
    const channelId = channel.channelId;

    const result = await fetchChannelPage({
      provider: this.provider,
      channelId,
      channelName: channel.name,
      mode,
      state,
      existingVideos: videos,
    });

    // The fetch state is persisted either way: a failure has to be remembered so the
    // next attempt can back off instead of hammering the provider.
    this.states = { ...this.states, [channelId]: result.state };
    await channelSyncRepository.saveAll(this.states);

    return {
      videos: result.videos,
      channels: [this.mergeChannelMetadata(channel, result.metadata)],
      state: result.state,
      fetched: !result.error,
      added: result.added,
      updated: result.updated,
      error: result.error,
    };
  }

  /** Keeps the stored channel in step with YouTube without dropping the parent's own settings. */
  private mergeChannelMetadata(channel: ApprovedChannel, metadata?: YouTubeChannel): ApprovedChannel {
    if (!metadata) return channel;
    return {
      ...channel,
      name: metadata.name || channel.name,
      thumbnailUrl: metadata.thumbnailUrl ?? channel.thumbnailUrl,
    };
  }

  /**
   * Loads the first page for approved channels that have never been fetched (or
   * whose cache has expired). Bounded, so approving ten channels does not spend
   * the day's quota in one go.
   */
  async syncMissing(
    session: ParentSession,
    input: { channels: ApprovedChannel[]; videos: ApprovedVideo[] },
  ): Promise<{ videos: ApprovedVideo[]; channels: ApprovedChannel[]; synced: number }> {
    parentSessionService.require('refresh channel videos');

    let videos = input.videos;
    let channels = input.channels;
    let synced = 0;

    const candidates = channels
      .filter((channel) => channel.approved && channel.channelId)
      .filter((channel) => shouldFetchChannel(this.states[channel.channelId], 'initial'))
      .slice(0, autoSyncBatchLimit);

    for (const channel of candidates) {
      const result = await this.sync(session, { channel, videos, mode: 'initial' });
      videos = result.videos;
      if (result.fetched) {
        // The channel row itself only changed if metadata came back.
        channels = channels.map((item) => (item.channelId === channel.channelId ? result.channels[0] : item));
        synced += 1;
      }
    }

    return { videos, channels, synced };
  }

  /**
   * Drops a channel's locally synced videos and its fetch state.
   *
   * Only rows the sync created are removed — a video a parent approved by hand, or
   * saved as an "ask a parent" item, is theirs to keep (§9: no orphaned records,
   * without discarding deliberate decisions).
   */
  async removeChannelContent(
    session: ParentSession,
    channelId: string,
    input: { videos: ApprovedVideo[]; channels: ApprovedChannel[] },
  ): Promise<{ videos: ApprovedVideo[]; channels: ApprovedChannel[]; removed: number }> {
    parentSessionService.require('remove a channel approval');

    const ownedIds = new Set(syncOwnedVideos(input.videos, channelId).map((video) => video.youtubeVideoId));
    const videos = input.videos.filter((video) => !ownedIds.has(video.youtubeVideoId));
    const channels = input.channels.filter((channel) => channel.channelId !== channelId);

    if (this.states[channelId]) {
      const next = { ...this.states };
      delete next[channelId];
      this.states = next;
      await channelSyncRepository.saveAll(next);
    }

    return { videos, channels, removed: ownedIds.size };
  }
}

export const channelSyncService = new ChannelSyncService();
