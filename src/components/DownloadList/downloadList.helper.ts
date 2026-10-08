import type { SavedVideo } from '../../services/downloadService.type';
import type { ApprovedVideo } from '../../types';
import { RING } from './downloadList.constant';
import type { DownloadEntry, DownloadSort } from './downloadList.type';

const DAY_MS = 86_400_000;

/** "Expires in 7 days", "Expires today" or "Expired". */
export function formatExpiry(expiresAt: number, now = Date.now()): string {
  const left = expiresAt - now;
  if (left <= 0) return 'Expired';
  const days = Math.ceil(left / DAY_MS);
  if (days <= 1) return 'Expires today';
  return `Expires in ${days} days`;
}

/** "52 MB", "1.2 GB", "<1 MB". */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / 1048576;
  if (mb < 1) return '<1 MB';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}

/** What shows in a row's second line. */
export function rowMeta(item: SavedVideo, now = Date.now()): string {
  if (item.state === 'failed') return "Couldn't save";
  if (item.state === 'preparing') return 'Getting ready…';
  if (item.state === 'ready') return `${formatSize(item.bytes)} · ${formatExpiry(item.expiresAt, now)}`;
  return `Saving… ${Math.round(item.percent)}%`;
}

export const isWorking = (item: SavedVideo) => item.state === 'preparing' || item.state === 'downloading' || item.state === 'paused';

/** Rows for a list: everything the device holds except files on their way out or past their expiry. */
export function entriesFor(downloads: SavedVideo[], videos: ApprovedVideo[], requireKnown: boolean, now = Date.now()): DownloadEntry[] {
  const byId = new Map(videos.map((video) => [video.youtubeVideoId, video]));
  return downloads.flatMap((item): DownloadEntry[] => {
    if (item.state === 'removing') return [];
    if (item.state === 'ready' && item.expiresAt <= now) return [];
    const video = byId.get(item.videoId);
    if (requireKnown && !video) return [];
    return [{ video, item }];
  });
}

/** Saved-at is not recorded, but every download lasts the same time, so a later expiry means a later save. */
export function sortEntries(entries: DownloadEntry[], sort: DownloadSort): DownloadEntry[] {
  const list = [...entries];
  if (sort === 'name') return list.sort((a, b) => (a.video?.title ?? '').localeCompare(b.video?.title ?? '', undefined, { sensitivity: 'base' }));
  if (sort === 'size') return list.sort((a, b) => b.item.bytes - a.item.bytes);
  return list.sort((a, b) => (b.item.expiresAt || Infinity) - (a.item.expiresAt || Infinity));
}

/** A circular progress ring as an inline SVG, so no graphics library is needed. */
export function ringSvgUri(percent: number): string {
  const { size, stroke, track, done } = RING;
  const radius = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(1, Math.max(0, Number.isFinite(percent) ? percent / 100 : 0));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${track}" stroke-width="${stroke}"/>` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${done}" stroke-width="${stroke}" stroke-linecap="round" ` +
    `stroke-dasharray="${(circumference * fraction).toFixed(2)} ${circumference.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The thumbnail to show; falls back to YouTube's own when the library row has none. */
export function thumbnailFor(video: ApprovedVideo | undefined, videoId: string): string {
  return video?.thumbnailUrl ?? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** m:ss for the duration badge, or null when unknown. */
export function durationLabel(seconds: number | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
}
