/** Public channel metadata, normalised. `youtubeChannelId` is always canonical. */
export type YouTubeChannel = {
  youtubeChannelId: string;
  name: string;
  thumbnailUrl?: string;
  description?: string;
  /** `contentDetails.relatedPlaylists.uploads` — where the channel's uploads live. */
  uploadsPlaylistId?: string;
};

/** Public video metadata, normalised into the shape the local video model uses. */
export type YouTubeVideo = {
  youtubeVideoId: string;
  youtubeChannelId: string;
  channelName?: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  /** Seconds. Absent when YouTube did not report a parsable duration. */
  durationSeconds?: number;
};

export type YouTubeVideoPage = {
  channelId: string;
  videos: YouTubeVideo[];
  /** Present when the channel has more uploads than this page returned. */
  nextPageToken?: string;
};

export type ChannelPageOptions = {
  pageToken?: string;
  /** The provider clamps this; callers should not rely on an exact count. */
  maxResults?: number;
};

export interface YouTubeContentProvider {
  readonly id: string;
  /**
   * Resolves any parent-supplied reference (`@handle`, `/c/Name`, `/user/Name`,
   * `/channel/UC…`, a bare channel id) to the canonical `UC…` channel id.
   *
   * Extension beyond `getChannel`/`getChannelVideos`: Phase 4 lets parents paste
   * a channel link, and a handle must never be mistaken for an identifier.
   */
  resolveChannelId(reference: string): Promise<string>;
  /**
   * Fetches canonical channel metadata. Accepts a `UC…` id or any of the same
   * parent-supplied references `resolveChannelId` takes — resolving a handle and
   * reading its metadata is one provider round trip, not two. The returned
   * `youtubeChannelId` is always the canonical id, never the raw reference.
   */
  getChannel(channelId: string): Promise<YouTubeChannel>;
  getChannelVideos(channelId: string, options?: ChannelPageOptions): Promise<YouTubeVideoPage>;
}

export type YouTubeProviderErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_INPUT'
  | 'CHANNEL_NOT_FOUND'
  | 'VIDEO_NOT_FOUND'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SERVER'
  | 'MALFORMED_RESPONSE'
  | 'UNKNOWN';

export type ClassifiedProviderError = {
  code: YouTubeProviderErrorCode;
  message: string;
  /** Whether a retry could plausibly succeed. Terminal failures are not retried. */
  retryable: boolean;
};
