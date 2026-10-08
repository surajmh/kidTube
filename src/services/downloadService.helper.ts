import type { ApprovedVideo } from '../types';
import type { DownloadOwners, ParentDownloadRow, SavedVideo } from './downloadService.type';

export const QUALITY_STEPS = [144, 240, 360, 480, 720, 1080] as const;

export function addOwner(owners: DownloadOwners, videoId: string, profileId: string): DownloadOwners {
  const current = owners[videoId] ?? [];
  return current.includes(profileId) ? owners : { ...owners, [videoId]: [...current, profileId] };
}

/** Drops one child's claim; the entry disappears with its last owner. */
export function removeOwner(owners: DownloadOwners, videoId: string, profileId: string): DownloadOwners {
  const left = (owners[videoId] ?? []).filter((id) => id !== profileId);
  const next = { ...owners };
  if (left.length) next[videoId] = left;
  else delete next[videoId];
  return next;
}

/** Forgets a deleted child everywhere, returning which videos no one owns any more. */
export function removeProfile(owners: DownloadOwners, profileId: string): { owners: DownloadOwners; orphaned: string[] } {
  const next: DownloadOwners = {};
  const orphaned: string[] = [];
  for (const [videoId, ids] of Object.entries(owners)) {
    const left = ids.filter((id) => id !== profileId);
    if (left.length) next[videoId] = left;
    else if (ids.length) orphaned.push(videoId);
  }
  return { owners: next, orphaned };
}

/** Stored ownership minus anyone who is no longer a child on this device. */
export function ownersOfKnownProfiles(owners: DownloadOwners, profiles: Array<{ id: string }>): DownloadOwners {
  const known = new Set(profiles.map((profile) => profile.id));
  const next: DownloadOwners = {};
  for (const [videoId, ids] of Object.entries(owners)) {
    const kept = ids.filter((id) => known.has(id));
    if (kept.length) next[videoId] = kept;
  }
  return next;
}

/** What a device-wide download list looks like to one child. */
export function downloadsFor(downloads: SavedVideo[], owners: DownloadOwners, profileId: string | undefined): SavedVideo[] {
  if (!profileId) return [];
  return downloads.filter((item) => owners[item.videoId]?.includes(profileId));
}

/**
 * Keeps ownership in step with the files on the device.
 *
 * Downloads made before children could save their own have no owner, so they go to every current
 * child rather than vanishing. With `pruneMissing`, owners of files that are gone are forgotten;
 * that is only safe when nothing can be mid-save, i.e. on the first read after the app opens.
 */
export function reconcileOwners(owners: DownloadOwners, downloads: SavedVideo[], profileIds: string[], pruneMissing: boolean): DownloadOwners {
  const next: DownloadOwners = { ...owners };
  const live = new Set(downloads.map((item) => item.videoId));
  if (profileIds.length) {
    for (const item of downloads) if (!next[item.videoId]?.length) next[item.videoId] = [...profileIds];
  }
  if (pruneMissing) for (const videoId of Object.keys(next)) if (!live.has(videoId)) delete next[videoId];
  const same = Object.keys(next).length === Object.keys(owners).length && Object.keys(next).every((key) => owners[key] === next[key] || (owners[key]?.join() === next[key].join()));
  return same ? owners : next;
}

/** Heights worth offering: real ones for this video, within the parent's ceiling. */
export function qualityChoices(available: number[] | undefined, cap: number): number[] {
  const allowed = QUALITY_STEPS.filter((height) => height <= cap);
  if (!available?.length) return allowed;
  const real = allowed.filter((height) => available.includes(height));
  return real.length ? real : allowed;
}

/** Parent list rows, grouped in child order, newest-first within each child as the device reports. */
export function parentDownloadRows(downloads: SavedVideo[], owners: DownloadOwners, profileIds: string[], videos: ApprovedVideo[]): ParentDownloadRow[] {
  const byId = new Map(videos.map((video) => [video.youtubeVideoId, video]));
  return profileIds.flatMap((profileId) =>
    downloadsFor(downloads, owners, profileId).map((item) => ({ profileId, video: byId.get(item.videoId), item })),
  );
}
