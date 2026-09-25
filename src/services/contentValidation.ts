import { PlaybackSettings, ScheduleWindow, ScreenTimeUsage, SponsorBlockCategory, defaultPlaybackSettings } from '../playbackTypes';
import { ApprovedChannel, ApprovedVideo } from '../types';

/**
 * Content validation and normalization.
 *
 * Every YouTube URL form must resolve to the same id, and nothing malformed may reach storage:
 * duplicate rows, invalid ids, out-of-range schedules and negative watch time all get normalized
 * on load and rejected on write.
 */

/** YouTube video ids are exactly 11 URL-safe characters. */
export const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

/** Channel ids are 24 characters and always start with `UC`. */
export const youtubeChannelIdPattern = /^UC[A-Za-z0-9_-]{22}$/;

export function isValidVideoId(value?: string | null): boolean {
  return Boolean(value && youtubeVideoIdPattern.test(value));
}

export function isValidChannelId(value?: string | null): boolean {
  return Boolean(value && youtubeChannelIdPattern.test(value));
}

export type ParsedYouTubeLink =
  | { kind: 'video'; id: string }
  | { kind: 'channel'; id: string }
  | { kind: 'unknown' };

const videoPathPrefixes = new Set(['shorts', 'embed', 'live', 'v', 'watch']);
const youtubeHosts = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

function queryValue(query: string, name: string): string | null {
  for (const part of query.split('&')) {
    if (!part) continue;
    const separator = part.indexOf('=');
    const key = separator === -1 ? part : part.slice(0, separator);
    const value = separator === -1 ? '' : part.slice(separator + 1);
    if (key.toLowerCase() === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

/**
 * Parses every common form without relying on `URL`, which is incomplete in React Native:
 * youtu.be/id, watch?v=id, shorts/id, embed/id, live/id, m./music./nocookie hosts, bare ids,
 * with or without scheme, query string and fragment.
 */
export function parseYouTubeLink(input: string): ParsedYouTubeLink {
  const raw = (input ?? '').trim();
  if (!raw) return { kind: 'unknown' };

  if (isValidVideoId(raw)) return { kind: 'video', id: raw };
  if (isValidChannelId(raw)) return { kind: 'channel', id: raw };

  const withoutScheme = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const [beforeFragment] = withoutScheme.split('#');
  const [pathPart, ...queryParts] = beforeFragment.split('?');
  const query = queryParts.join('?');
  const segments = pathPart.split('/').filter(Boolean);
  const host = (segments.shift() ?? '').toLowerCase().replace(/:\d+$/, '');

  if (host === 'youtu.be') {
    const id = segments[0] ?? '';
    return isValidVideoId(id) ? { kind: 'video', id } : { kind: 'unknown' };
  }

  if (youtubeHosts.has(host)) {
    const fromQuery = queryValue(query, 'v');
    if (isValidVideoId(fromQuery)) return { kind: 'video', id: fromQuery! };

    const [first, second] = segments;
    if (first === 'channel') {
      const id = second ?? '';
      if (isValidChannelId(id)) return { kind: 'channel', id };
    }
    if (first && videoPathPrefixes.has(first)) {
      const candidate = first === 'watch' ? second : (second ?? '');
      if (isValidVideoId(candidate)) return { kind: 'video', id: candidate! };
      // /watch/ID
      if (first === 'watch' && isValidVideoId(second)) return { kind: 'video', id: second! };
    }
    // https://www.youtube.com/UCxxxxxxxxxxxxxxxxxxxxxx
    if (isValidChannelId(first)) return { kind: 'channel', id: first! };
    return { kind: 'unknown' };
  }

  // A dotted host that is not a YouTube host means this is some other site's URL: an 11-character
  // slug in the path (example.com/not-a-video) must never be mistaken for a video id.
  if (host.includes('.') && !youtubeHosts.has(host)) return { kind: 'unknown' };

  // Scheme-less oddities such as "youtu.be/ID?si=..." without a host match.
  const loose = raw.match(/(?:v=|\/)([A-Za-z0-9_-]{11})(?:[?&#/]|$)/);
  if (loose && isValidVideoId(loose[1])) return { kind: 'video', id: loose[1] };
  const looseChannel = raw.match(/(UC[A-Za-z0-9_-]{22})/);
  if (looseChannel && isValidChannelId(looseChannel[1])) return { kind: 'channel', id: looseChannel[1] };

  return { kind: 'unknown' };
}

export function extractVideoId(input: string): string | null {
  const parsed = parseYouTubeLink(input);
  return parsed.kind === 'video' ? parsed.id : null;
}

export function extractChannelId(input: string): string | null {
  const parsed = parseYouTubeLink(input);
  return parsed.kind === 'channel' ? parsed.id : null;
}

export function canonicalVideoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function canonicalChannelUrl(channelId: string) {
  return `https://www.youtube.com/channel/${channelId}`;
}

/** Keeps the first occurrence so the newest entry (prepended on add) wins. */
export function dedupeBy<T>(items: T[], key: (item: T) => string | undefined): T[] {
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    next.push(item);
  }
  return next;
}

export function sanitizeLibrary(videos: ApprovedVideo[], channels: ApprovedChannel[]) {
  return {
    videos: dedupeBy(
      videos.filter((video) => isValidVideoId(video.youtubeVideoId)),
      (video) => video.youtubeVideoId,
    ),
    channels: dedupeBy(
      channels.filter((channel) => isValidChannelId(channel.channelId)),
      (channel) => channel.channelId,
    ),
  };
}

function clampMinutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.min(Math.max(Math.round(value), 0), 24 * 60 - 1);
}

export function sanitizeSchedules(schedules: unknown): Record<string, ScheduleWindow[]> {
  const next: Record<string, ScheduleWindow[]> = {};
  if (schedules && typeof schedules === 'object') {
    for (const [day, windows] of Object.entries(schedules as Record<string, unknown>)) {
      if (!/^[0-6]$/.test(day) || !Array.isArray(windows)) continue;
      const cleaned: ScheduleWindow[] = [];
      for (const window of windows) {
        const start = clampMinutes((window as ScheduleWindow | undefined)?.startMinutes);
        const end = clampMinutes((window as ScheduleWindow | undefined)?.endMinutes);
        if (start === null || end === null) continue;
        cleaned.push({ startMinutes: start, endMinutes: end });
      }
      if (cleaned.length) next[day] = cleaned;
    }
  }
  return Object.keys(next).length ? next : defaultPlaybackSettings.schedules;
}

const sponsorBlockCategories: SponsorBlockCategory[] = ['sponsor', 'intro', 'outro', 'selfpromo', 'interaction', 'music'];

export function sanitizeSettings(input: Partial<PlaybackSettings> | null | undefined): PlaybackSettings {
  if (!input) return defaultPlaybackSettings;
  const limit = input.dailyLimitMinutes;
  const dailyLimitMinutes =
    limit === null
      ? null
      : typeof limit === 'number' && Number.isFinite(limit) && limit >= 0
        ? Math.min(limit, 24 * 60)
        : defaultPlaybackSettings.dailyLimitMinutes;

  return {
    ...defaultPlaybackSettings,
    ...input,
    dailyLimitMinutes,
    sponsorBlockCategories: (input.sponsorBlockCategories ?? defaultPlaybackSettings.sponsorBlockCategories).filter((category) =>
      sponsorBlockCategories.includes(category),
    ),
    schedules: sanitizeSchedules(input.schedules),
    bedtimeStartMinutes: clampMinutes(input.bedtimeStartMinutes) ?? defaultPlaybackSettings.bedtimeStartMinutes,
    bedtimeEndMinutes: clampMinutes(input.bedtimeEndMinutes) ?? defaultPlaybackSettings.bedtimeEndMinutes,
  };
}

/** Drops corrupt rows and impossible values so watch-time math can never go negative. */
export function sanitizeUsageRecords(records: ScreenTimeUsage[]): ScreenTimeUsage[] {
  const maxSecondsPerDay = 24 * 60 * 60;
  return records
    .filter((record) => Boolean(record) && typeof record.profileId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.date))
    .map((record) => ({
      profileId: record.profileId,
      date: record.date,
      secondsWatched: Number.isFinite(record.secondsWatched)
        ? Math.min(Math.max(Math.round(record.secondsWatched), 0), maxSecondsPerDay)
        : 0,
    }))
    .filter((record) => record.secondsWatched > 0);
}
