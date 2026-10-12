import type { ApprovedChannel, ApprovedVideo } from '../types';
import type { ChannelSyncState } from './content/channelSyncRules.type';
import type { ClassifiedProviderError } from './content/youtubeContentProvider.type';
import type { YouTubeVideo } from './content/youtubeContentProvider.type';

export type ResolvedChannel = {
  youtubeChannelId: string;
  name: string;
  thumbnailUrl?: string;
  uploadsPlaylistId?: string;
  description?: string;
};

export type ChannelSyncResult = {
  /** This page's metadata, for merging against the latest library after an async fetch. */
  uploads?: YouTubeVideo[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  state: ChannelSyncState;
  /** False when the cache was fresh or another sync was already running. */
  fetched: boolean;
  added: number;
  updated: number;
  /** Present when the fetch failed; cached videos are untouched. */
  error?: ClassifiedProviderError;
};
