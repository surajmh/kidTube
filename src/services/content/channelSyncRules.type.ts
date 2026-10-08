import type { ApprovedVideo } from '../../types';
import type { YouTubeChannel } from './youtubeContentProvider.type';

export type ChannelReference =
  | { kind: 'channelId'; id: string }
  | { kind: 'handle'; handle: string }
  | { kind: 'legacyUser'; user: string }
  | { kind: 'unknown' };

export type ChannelSyncState = {
  channelId: string;
  uploadsPlaylistId?: string;
  /** Continue-from token for `Load more`. Absent once the channel is fully paged in. */
  nextPageToken?: string;
  /** Last successful fetch. Drives the cache policy. */
  fetchedAt?: string;
  lastAttemptAt?: string;
  lastError?: { code: string; message: string; at: string };
  pagesFetched: number;
  videoCount: number;
};

export type SyncMode = 'initial' | 'refresh' | 'more';

export type MergeResult = {
  videos: ApprovedVideo[];
  added: number;
  updated: number;
  /** The videos this fetch touched, in fetch order. */
  synced: ApprovedVideo[];
};

export type SyncOutcome = {
  state: ChannelSyncState;
  result: MergeResult;
  channelMetadata?: Partial<YouTubeChannel>;
};
