/**
 * YouTubeContentProvider.
 *
 * The metadata boundary. This is deliberately separate from the local
 * repositories: the app owns its approved library, the provider only describes
 * public YouTube metadata. Replacing the provider (a different proxy, a
 * self-hosted service, a fixture provider in tests) must not touch storage,
 * the whitelist or the playback policy.
 *
 * The provider is metadata-only. Playback never goes through here — it stays in
 * the native PlayerAdapter/Media3/ExoPlayer path, and the video id returned here
 * is all that path needs.
 */

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

export class YouTubeProviderError extends Error {
  constructor(
    readonly code: YouTubeProviderErrorCode,
    message: string,
    readonly retryable = true,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'YouTubeProviderError';
  }
}

/** Parent-facing wording for each failure mode. Never leaks technical detail. */
const providerMessages: Record<YouTubeProviderErrorCode, string> = {
  NOT_CONFIGURED: 'No metadata provider is connected yet. Add your provider URL under Playback settings.',
  INVALID_INPUT: 'That does not look like a YouTube channel link or channel ID.',
  CHANNEL_NOT_FOUND: 'That channel could not be found on YouTube.',
  VIDEO_NOT_FOUND: 'That video could not be found on YouTube.',
  QUOTA_EXCEEDED: 'The YouTube data quota for today is used up. Try again tomorrow.',
  RATE_LIMITED: 'Too many requests right now. Try again in a minute.',
  NETWORK: 'Could not reach the metadata provider. Check the connection and the provider URL.',
  TIMEOUT: 'The metadata provider took too long to answer.',
  SERVER: 'The metadata provider reported a problem.',
  MALFORMED_RESPONSE: 'The metadata provider sent an unexpected response.',
  UNKNOWN: 'Channel videos could not be loaded right now.',
};

export function providerErrorMessage(code: YouTubeProviderErrorCode): string {
  return providerMessages[code];
}

/**
 * Nothing technical ever reaches the child: the only thing Kid Mode shows is
 * that the videos are not available yet, plus a nudge to ask a parent.
 */
export const childChannelUnavailableMessage = "Couldn't load videos right now.";

export type ClassifiedProviderError = {
  code: YouTubeProviderErrorCode;
  message: string;
  /** Whether a retry could plausibly succeed. Terminal failures are not retried. */
  retryable: boolean;
};

/** Terminal codes: retrying immediately cannot help. */
const terminalCodes = new Set<YouTubeProviderErrorCode>([
  'INVALID_INPUT',
  'CHANNEL_NOT_FOUND',
  'VIDEO_NOT_FOUND',
  'NOT_CONFIGURED',
]);

export function isTerminalProviderError(code: YouTubeProviderErrorCode): boolean {
  return terminalCodes.has(code);
}

/** Maps anything thrown by a provider onto a code with parent-facing copy. */
export function classifyProviderError(caught: unknown): ClassifiedProviderError {
  if (caught instanceof YouTubeProviderError) {
    return { code: caught.code, message: caught.message || providerErrorMessage(caught.code), retryable: caught.retryable };
  }
  if (caught instanceof Error && /network|Failed to fetch|abort/i.test(caught.message)) {
    return { code: 'NETWORK', message: providerErrorMessage('NETWORK'), retryable: true };
  }
  return { code: 'UNKNOWN', message: providerErrorMessage('UNKNOWN'), retryable: true };
}

/** Narrows a value from JSON to a usable string, trimming empties. */
export function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Durations arrive from the provider as seconds. Anything that is not a finite
 * non-negative number is dropped rather than stored, so a malformed response can
 * never produce a nonsense runtime in the library.
 */
export function readDurationSeconds(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}
