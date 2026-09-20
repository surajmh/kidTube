import { ApprovedVideo } from '../../types';
import NativeYouTubePlayer, { NativeVideoMetadata } from '../../native/YouTubePlayerModule';
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

/**
 * Enriches up to `limit` rows, sequentially. Bounded on purpose: this runs on a parent's screen,
 * not in a background job, and a large library should not fire dozens of requests at once.
 * ponytail: sequential and capped; batch it only if a big library actually feels slow.
 */
export async function enrichLibrary(videos: ApprovedVideo[], limit = 12): Promise<ApprovedVideo[] | null> {
  const pending = videos.filter(needsMetadata).slice(0, limit);
  if (!pending.length) return null;

  const updates = new Map<string, ApprovedVideo>();
  for (const video of pending) {
    const enriched = await enrichVideo(video);
    if (enriched) updates.set(video.id, enriched);
  }
  if (!updates.size) return null;
  return videos.map((video) => updates.get(video.id) ?? video);
}
