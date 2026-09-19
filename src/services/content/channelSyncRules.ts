import { ApprovedVideo } from '../../types';
import {
  YouTubeChannel,
  YouTubeProviderError,
  YouTubeVideo,
  YouTubeVideoPage,
  readDurationSeconds,
  readString,
} from './youtubeContentProvider';
import { isValidChannelId, isValidVideoId, youtubeChannelIdPattern } from '../contentValidation';

/**
 * Channel sync rules.
 *
 * Pure functions only — no storage, no network, no React. `channelSyncService`
 * orchestrates these against the repositories and the provider; keeping the
 * decisions here means the merge, cache and pagination behaviour is directly
 * testable and identical wherever it is used.
 */

/** A channel's uploads change slowly; refetching on every render would burn quota. */
export const channelCacheTtlMs = 6 * 60 * 60 * 1000;
/** After a failure, do not try again automatically until this has passed. */
export const channelFailureBackoffMs = 60 * 1000;
/** YouTube allows up to 50 per page; 30 keeps the first page fast and cheap. */
export const channelPageSize = 30;

export type ChannelReference =
  | { kind: 'channelId'; id: string }
  | { kind: 'handle'; handle: string }
  | { kind: 'legacyUser'; user: string }
  | { kind: 'unknown' };

const handlePattern = /^@[A-Za-z0-9._-]{3,60}$/;
const legacyNamePattern = /^[A-Za-z0-9._-]{1,60}$/;
const youTubeHostPattern = /^(?:www\.|m\.|music\.)?(?:youtube\.com|youtube-nocookie\.com)$/;
const portSuffixPattern = /:[0-9]+$/;
const attemptedChannelIdPattern = /^UC[A-Za-z0-9_-]+$/;

/** A bare token with no host: `@MrBeast`, or the legacy custom URL form `MrBeast`. */
function bareHandle(raw: string): ChannelReference {
  // `UC…` is the channel id namespace, so a malformed one is a mistyped id rather
  // than a handle. Reporting it as invalid is far clearer than a failed lookup.
  if (attemptedChannelIdPattern.test(raw)) return { kind: 'unknown' };
  if (handlePattern.test(raw)) return { kind: 'handle', handle: raw };
  if (!raw.startsWith('@') && legacyNamePattern.test(raw)) return { kind: 'handle', handle: `@${raw}` };
  return { kind: 'unknown' };
}

/**
 * Normalises anything a parent may paste into a channel reference.
 *
 * A handle is never treated as an identifier (§3): it stays a `handle` so the
 * provider has to resolve it to the canonical `UC…` id. Two channels can share a
 * display name, so only a validated `UC…` id is ever canonical.
 */
export function normalizeChannelInput(input: string): ChannelReference {
  const raw = (input ?? '').trim();
  if (!raw) return { kind: 'unknown' };

  // A bare canonical id is the only form accepted without a provider round trip.
  if (isValidChannelId(raw)) return { kind: 'channelId', id: raw };

  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const [beforeFragment] = withoutScheme.split('#');
  const [pathPart] = beforeFragment.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const host = (segments[0] ?? '').toLowerCase().replace(portSuffixPattern, '');
  const hasHost = host.includes('.');

  // A dotted host that is not YouTube means this is some other site's link.
  if (hasHost && !youTubeHostPattern.test(host)) return { kind: 'unknown' };

  const rest = hasHost ? segments.slice(1) : segments;
  if (!rest.length) return bareHandle(raw);
  // A single segment with no host is just a handle or a custom name; multi-segment
  // input without a host ("/channel/UC…") still falls through to the path logic below,
  // but only once it could not be a handle.
  if (!hasHost && rest.length === 1) return bareHandle(rest[0]);

  const [first, second] = rest;

  if (first === 'channel') {
    return second && isValidChannelId(second) ? { kind: 'channelId', id: second } : { kind: 'unknown' };
  }
  // A canonical id in the first path segment: youtube.com/UC…
  if (isValidChannelId(first)) return { kind: 'channelId', id: first };
  if (first === 'user') {
    return second && legacyNamePattern.test(second) ? { kind: 'legacyUser', user: second } : { kind: 'unknown' };
  }
  // /c/CustomName is the legacy custom URL; the handle form resolves it.
  if (first === 'c') {
    return second && legacyNamePattern.test(second) ? { kind: 'handle', handle: `@${second}` } : { kind: 'unknown' };
  }
  if (first.startsWith('@')) {
    return handlePattern.test(first) ? { kind: 'handle', handle: first } : { kind: 'unknown' };
  }
  // A bare segment on a YouTube host (youtube.com/MrBeast) is a legacy custom URL.
  if (hasHost) {
    return legacyNamePattern.test(first) ? { kind: 'handle', handle: `@${first}` } : { kind: 'unknown' };
  }
  return { kind: 'unknown' };
}

/** True when a channel id is canonical (never a display name or a handle). */
export function isCanonicalChannelId(value?: string | null): boolean {
  return Boolean(value && youtubeChannelIdPattern.test(value));
}

export function channelReferenceLabel(reference: ChannelReference): string {
  switch (reference.kind) {
    case 'channelId':
      return reference.id;
    case 'handle':
      return reference.handle;
    case 'legacyUser':
      return `/user/${reference.user}`;
    default:
      return '';
  }
}

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

export function emptyChannelSyncState(channelId: string): ChannelSyncState {
  return { channelId, pagesFetched: 0, videoCount: 0 };
}

export type SyncMode = 'initial' | 'refresh' | 'more';

/**
 * Cache policy (§7):
 *   first load            -> fetch
 *   reopen inside the TTL -> cached data
 *   explicit Refresh      -> fetch
 *   Load more             -> fetch the next page only
 *
 * A recent failure also suppresses automatic refetching, so a broken provider
 * cannot be retried on every render.
 */
export function shouldFetchChannel(state: ChannelSyncState | undefined, mode: SyncMode, now: Date = new Date()): boolean {
  if (mode === 'refresh' || mode === 'more') return true;
  if (!state) return true;

  if (state.lastError?.at) {
    const failedAt = new Date(state.lastError.at).getTime();
    if (Number.isFinite(failedAt) && now.getTime() - failedAt < channelFailureBackoffMs) return false;
  }
  if (!state.fetchedAt) return true;
  const fetchedAt = new Date(state.fetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) return true;
  return now.getTime() - fetchedAt >= channelCacheTtlMs;
}

/** Whether a `Load more` control should be offered at all. */
export function canLoadMore(state: ChannelSyncState | undefined): boolean {
  return Boolean(state?.nextPageToken);
}

/** `Load more` without a token would silently refetch page one; treat it as a refresh. */
export function effectiveSyncMode(state: ChannelSyncState | undefined, mode: SyncMode): SyncMode {
  if (mode === 'more' && !canLoadMore(state)) return 'refresh';
  return mode;
}

/**
 * Validates a provider response before anything is stored (§10, §13. A malformed
 * payload becomes an error rather than a half-populated library.
 */
export function parseChannelResponse(payload: unknown): YouTubeChannel {
  if (!payload || typeof payload !== 'object') {
    throw new YouTubeProviderError('MALFORMED_RESPONSE', 'The metadata provider sent an unexpected response.');
  }
  const record = payload as Record<string, unknown>;
  const id = readString(record.youtubeChannelId) ?? readString(record.channelId);
  if (!id || !isCanonicalChannelId(id)) {
    throw new YouTubeProviderError('CHANNEL_NOT_FOUND', 'That channel could not be found on YouTube.');
  }
  const name = readString(record.name) ?? readString(record.title);
  return {
    youtubeChannelId: id,
    name: name ?? id,
    thumbnailUrl: readString(record.thumbnailUrl),
    description: readString(record.description),
    uploadsPlaylistId: readString(record.uploadsPlaylistId),
  };
}

/**
 * Validates and normalises a page of videos. Rows without a usable video id are
 * dropped instead of stored, and duplicates within one page collapse to the first
 * occurrence so a refresh can never create two rows for the same video.
 */
export function parseVideoPage(payload: unknown, fallbackChannelId: string): YouTubeVideoPage {
  if (!payload || typeof payload !== 'object') {
    throw new YouTubeProviderError('MALFORMED_RESPONSE', 'The metadata provider sent an unexpected response.');
  }
  const record = payload as Record<string, unknown>;
  const rawVideos = Array.isArray(record.videos) ? record.videos : [];
  const channelId = readString(record.channelId) ?? fallbackChannelId;

  const videos: YouTubeVideo[] = [];
  const seen = new Set<string>();
  for (const entry of rawVideos) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const videoId = readString(item.youtubeVideoId) ?? readString(item.videoId);
    if (!videoId || !isValidVideoId(videoId) || seen.has(videoId)) continue;
    seen.add(videoId);
    videos.push({
      youtubeVideoId: videoId,
      youtubeChannelId: readString(item.youtubeChannelId) ?? readString(item.channelId) ?? channelId,
      channelName: readString(item.channelName),
      title: readString(item.title) ?? readString(item.name) ?? `Video ${videoId}`,
      description: readString(item.description),
      thumbnailUrl: readString(item.thumbnailUrl),
      publishedAt: normalizeTimestamp(readString(item.publishedAt)),
      durationSeconds: readDurationSeconds(item.durationSeconds),
    });
  }

  return { channelId, videos, nextPageToken: readString(record.nextPageToken) };
}

/** ISO timestamps only; anything else is dropped rather than shown as an invalid date. */
export function normalizeTimestamp(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/**
 * Converts provider metadata into the app's existing video model.
 *
 * `channelId` comes from the channel the parent approved, never from the video
 * row the provider returned. Otherwise a misbehaving or compromised provider
 * could attribute its videos to some *other* approved channel and inherit that
 * approval — the channel the parent approved is the only one that grants access.
 */
export function toApprovedVideo(
  video: YouTubeVideo,
  context: { channelId: string; channelName?: string },
): ApprovedVideo {
  return {
    id: `synced-${video.youtubeVideoId}`,
    youtubeVideoId: video.youtubeVideoId,
    title: video.title,
    thumbnailUrl: video.thumbnailUrl,
    channelId: context.channelId,
    channelName: video.channelName ?? context.channelName,
    duration: video.durationSeconds,
    publishedAt: video.publishedAt,
    sourceUrl: `https://www.youtube.com/watch?v=${video.youtubeVideoId}`,
    // Not individually approved: eligibility comes from the approved channel (§8).
    approved: false,
    candidate: false,
    syncedFromChannel: true,
  };
}

export type MergeResult = {
  videos: ApprovedVideo[];
  added: number;
  updated: number;
  /** The videos this fetch touched, in fetch order. */
  synced: ApprovedVideo[];
};

/**
 * Merges a fetched page into the local library.
 *
 * Guarantees:
 *  - one row per video id — a refresh never duplicates;
 *  - a parent's existing decisions survive (individual approval, category
 *    membership and the "ask a parent" candidate flag are kept);
 *  - only metadata is refreshed on rows that already exist;
 *  - nothing already stored is dropped, so a shorter page cannot lose videos.
 */
export function mergeSyncedVideos(
  existing: ApprovedVideo[],
  incoming: YouTubeVideo[],
  context: { channelId: string; channelName?: string },
): MergeResult {
  const order: ApprovedVideo[] = [];
  const byVideoId = new Map<string, ApprovedVideo>();
  for (const video of existing) {
    if (!video?.youtubeVideoId) continue;
    if (!byVideoId.has(video.youtubeVideoId)) order.push(video);
    byVideoId.set(video.youtubeVideoId, video);
  }

  let added = 0;
  let updated = 0;
  const synced: ApprovedVideo[] = [];

  for (const video of incoming) {
    if (!video?.youtubeVideoId || !isValidVideoId(video.youtubeVideoId)) continue;
    const current = byVideoId.get(video.youtubeVideoId);
    if (!current) {
      const created = toApprovedVideo(video, context);
      byVideoId.set(video.youtubeVideoId, created);
      order.push(created);
      synced.push(created);
      added += 1;
      continue;
    }
    const refreshed: ApprovedVideo = {
      ...current,
      title: video.title || current.title,
      thumbnailUrl: video.thumbnailUrl ?? current.thumbnailUrl,
      channelId: current.channelId ?? video.youtubeChannelId ?? context.channelId,
      channelName: current.channelName ?? video.channelName ?? context.channelName,
      duration: video.durationSeconds ?? current.duration,
      publishedAt: video.publishedAt ?? current.publishedAt,
    };
    byVideoId.set(video.youtubeVideoId, refreshed);
    const index = order.findIndex((item) => item.youtubeVideoId === video.youtubeVideoId);
    if (index >= 0) order[index] = refreshed;
    synced.push(refreshed);
    updated += 1;
  }

  return { videos: order, added, updated, synced };
}

/** Videos a sync owns: rows that exist only because their channel was approved. */
export function isSyncOwned(video: ApprovedVideo): boolean {
  return Boolean(video?.syncedFromChannel) && video.approved !== true;
}

/** The videos of a channel a sync may delete when the channel is unapproved or removed. */
export function syncOwnedVideos(videos: ApprovedVideo[], channelId: string): ApprovedVideo[] {
  return videos.filter((video) => video.channelId === channelId && isSyncOwned(video));
}

export type SyncOutcome = {
  state: ChannelSyncState;
  result: MergeResult;
  channelMetadata?: Partial<YouTubeChannel>;
};

/**
 * Applies one successful fetch to the library and the sync state. Pure, so the
 * "refresh updates the library", "duplicate is not duplicated" and pagination
 * rules are covered by tests without a network or storage.
 */
export function applyFetchResult(input: {
  existingVideos: ApprovedVideo[];
  state: ChannelSyncState;
  page: YouTubeVideoPage;
  mode: SyncMode;
  channelName?: string;
  channelMetadata?: Partial<YouTubeChannel>;
  now?: Date;
}): SyncOutcome {
  const now = input.now ?? new Date();
  const channelName = input.channelMetadata?.name ?? input.channelName;
  const result = mergeSyncedVideos(input.existingVideos, input.page.videos, {
    channelId: input.page.channelId,
    channelName,
  });

  const state: ChannelSyncState = {
    ...input.state,
    channelId: input.page.channelId,
    uploadsPlaylistId: input.channelMetadata?.uploadsPlaylistId ?? input.state.uploadsPlaylistId,
    // A refresh starts over from page one, so its token replaces the old one.
    nextPageToken: input.page.nextPageToken,
    fetchedAt: now.toISOString(),
    lastAttemptAt: now.toISOString(),
    lastError: undefined,
    pagesFetched: input.mode === 'more' ? input.state.pagesFetched + 1 : 1,
    videoCount: result.videos.filter((video) => video.channelId === input.page.channelId).length,
  };

  return { state, result, channelMetadata: input.channelMetadata };
}

/** Records a failure without touching the cached videos (§13). */
export function applyFetchFailure(
  state: ChannelSyncState,
  error: { code: string; message: string },
  now: Date = new Date(),
): ChannelSyncState {
  return {
    ...state,
    lastAttemptAt: now.toISOString(),
    lastError: { code: error.code, message: error.message, at: now.toISOString() },
  };
}

/** Parent-facing status line for a channel. */
export function describeChannelSync(state: ChannelSyncState | undefined, now: Date = new Date()): string {
  if (!state) return 'Not loaded yet';
  const videos = `${state.videoCount} ${state.videoCount === 1 ? 'video' : 'videos'}`;
  if (state.lastError) return "Couldn't load videos right now · " + videos + ' saved';
  if (!state.fetchedAt) return 'Not loaded yet';
  const fetchedAt = new Date(state.fetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) return `Updated · ${videos}`;
  const minutes = Math.floor(Math.max(0, now.getTime() - fetchedAt) / 60000);
  if (minutes < 1) return `Updated just now · ${videos}`;
  if (minutes < 60) return `Updated ${minutes} min ago · ${videos}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago · ${videos}`;
  return `Updated ${Math.floor(hours / 24)}d ago · ${videos}`;
}

/**
 * Videos of a channel, newest first. Ordering uses the publish date when the
 * provider supplied one, otherwise the provider's own order (an uploads playlist
 * returns newest first).
 */
export function channelVideosFrom(videos: ApprovedVideo[], channelId: string): ApprovedVideo[] {
  const own = videos.filter((video) => video.channelId === channelId);
  return own.sort((a, b) => {
    const left = a.publishedAt ? new Date(a.publishedAt).getTime() : Number.NaN;
    const right = b.publishedAt ? new Date(b.publishedAt).getTime() : Number.NaN;
    if (Number.isNaN(left) || Number.isNaN(right)) return 0;
    return right - left;
  });
}
