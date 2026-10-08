import { ApprovedVideo } from '../../types';
import NativeYouTubePlayer from '../../native/YouTubePlayerModule';
import type { NativeVideoMetadata } from '../../native/YouTubePlayerModule.type';
import { readDurationSeconds, readString } from './youtubeContentProvider';

/**
 * Fills in public metadata for videos the parent added by link.
 *
 * The link parser can only produce an id, so those rows carry a placeholder title and no duration
 * or channel. This reads the real values from the on-device extractor — no API key, no quota, and
 * no proxy. It is metadata only: approval, the native allow list and the playback policy are all
 * untouched, so enriching a row can never make it playable.
 */

/**
 * `duration` and `channelName` are only ever written by a metadata source, so their absence is the
 * reliable signal — more reliable than pattern-matching the placeholder title.
 */
export function needsMetadata(video: ApprovedVideo): boolean {
  return !video.duration || !video.channelName;
}

/** Returns an updated copy, or null when nothing could be improved. */
export async function enrichVideo(video: ApprovedVideo): Promise<ApprovedVideo | null> {
  if (!NativeYouTubePlayer) return null;

  let result: NativeVideoMetadata;
  try {
    result = await NativeYouTubePlayer.getVideoMetadata(video.youtubeVideoId);
  } catch {
    return null;
  }
  if (!result || result.failed) return null;

  const title = readString(result.title);
  const channelName = readString(result.channelName);
  const thumbnailUrl = readString(result.thumbnailUrl);
  const publishedAt = readString(result.publishedAt);
  const duration = readDurationSeconds(result.durationSeconds);
  // A provider must never be able to move a video to a different channel: the id is only adopted
  // when the row does not already have one.
  const channelId = video.channelId ?? readString(result.youtubeChannelId);

  const next: ApprovedVideo = {
    ...video,
    title: title ?? video.title,
    channelName: channelName ?? video.channelName,
    thumbnailUrl: thumbnailUrl ?? video.thumbnailUrl,
    publishedAt: publishedAt ?? video.publishedAt,
    duration: duration ?? video.duration,
    channelId,
  };

  const changed =
    next.title !== video.title ||
    next.channelName !== video.channelName ||
    next.thumbnailUrl !== video.thumbnailUrl ||
    next.publishedAt !== video.publishedAt ||
    next.duration !== video.duration ||
    next.channelId !== video.channelId;

  return changed ? next : null;
}

/** A row nothing could be learned about (removed video, offline) is not asked again for this long. */
const retryAfterMs = 10 * 60 * 1000;
const lastTried = new Map<string, number>();

/**
 * Enriches up to `limit` rows per pass with a bounded fan-out. The native metadata calls run on
 * their own IO dispatcher, so a pass costs roughly `limit / concurrency` round trips instead of
 * `limit` back-to-back ones; the small cap keeps a big library from hammering YouTube at once.
 */
export async function enrichLibrary(videos: ApprovedVideo[], limit = 12, concurrency = 4): Promise<ApprovedVideo[] | null> {
  const now = Date.now();
  // Cooling-down rows are skipped before the cap, so a few unresolvable ones cannot starve the rest.
  const pending = videos
    .filter((video) => needsMetadata(video) && now - (lastTried.get(video.id) ?? -Infinity) >= retryAfterMs)
    .slice(0, limit);
  if (!pending.length) return null;

  const updates = new Map<string, ApprovedVideo>();
  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const video = pending[cursor++];
      const enriched = await enrichVideo(video);
      if (enriched) updates.set(video.id, enriched);
      else lastTried.set(video.id, Date.now());
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, worker));

  if (!updates.size) return null;
  return videos.map((video) => updates.get(video.id) ?? video);
}
