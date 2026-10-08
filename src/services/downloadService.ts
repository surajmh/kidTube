import { useAppStore } from '../store/appStore';
import type { ApprovedVideo } from '../types';
import { parentSessionService } from './auth/parentSession';
import type { ParentSession } from './auth/parentSession.type';
import { contentAccessService } from './contentAccessService';
import { sponsorBlockService } from './sponsorBlockService';
import { QUALITY_STEPS, addOwner, qualityChoices, removeOwner, removeProfile } from './downloadService.helper';
import type { DownloadModule, DownloadOwners, SaveDownloadInput, SavedVideo } from './downloadService.type';

let native: DownloadModule | null = null;
export function setNativeDownloadModule(module: DownloadModule | null) { native = module; }

function requireDownloads() {
  if (!native?.getDownloads) throw new Error('Install the updated Android build to save videos.');
  return native;
}

const owners = () => useAppStore.getState().downloadOwners;
const setOwners = (next: DownloadOwners) => useAppStore.setState({ downloadOwners: next });

/** Saving bytes grants no access: a child may only save what the content rules already let them watch. */
export function canSaveVideo(profileId: string, video: ApprovedVideo) {
  return contentAccessService.evaluate(profileId, { videoId: video.youtubeVideoId, channelId: video.channelId, categoryIds: video.categoryIds }) === 'allowed';
}

export function savedVideos(downloads: SavedVideo[], allowedVideos: ApprovedVideo[], now = Date.now()) {
  const ready = new Set(downloads.filter((item) => item.state === 'ready' && Number.isFinite(item.expiresAt) && item.expiresAt > now).map((item) => item.videoId));
  return allowedVideos.filter((video) => ready.has(video.youtubeVideoId));
}

export const downloadService = {
  async list() { return native?.getDownloads ? native.getDownloads() : []; },

  /** The qualities worth showing for this video: the real ones, within the parent's ceiling. */
  async options(video: ApprovedVideo, cap: number): Promise<number[]> {
    const module = requireDownloads();
    let heights: number[] | undefined;
    if (module.getDownloadOptions) {
      try {
        heights = (await module.getDownloadOptions(video.youtubeVideoId))?.heights;
      } catch (error) {
        // Not being able to read the ladder must not stop a save: offer the standard steps and let
        // the save itself report whether that quality exists.
        console.warn('[downloads] could not read qualities:', error instanceof Error ? error.message : error);
      }
    }
    return qualityChoices(heights, cap);
  },

  /** A child saves a video for themselves. The files are shared; the claim is theirs. */
  async save({ profileId, video, height, settings }: SaveDownloadInput) {
    if (!settings.downloadsEnabled) throw new Error('Saving videos is turned off.');
    if (!canSaveVideo(profileId, video)) throw new Error('This video is not available to save.');
    const module = requireDownloads();
    const videoId = video.youtubeVideoId;
    const existing = (await module.getDownloads()).find((item) => item.videoId === videoId && item.state !== 'failed' && item.state !== 'removing');
    if (existing) {
      // Already on the device for a sibling (or this child): just add the claim.
      setOwners(addOwner(owners(), videoId, profileId));
      return;
    }
    const cap = settings.maxQualityHeight ?? 1080;
    if (!(QUALITY_STEPS as readonly number[]).includes(height) || height > cap) throw new Error('Choose a valid download quality.');
    const days = settings.downloadRetentionDays === 30 ? 30 : 7;
    // Authorized for this one video and only for a moment, so nothing else can be saved by accident.
    await module.setDownloadAuthorization([videoId], Date.now() + 2 * 60_000);
    const result = await module.downloadVideo(videoId, height, Date.now() + days * 86400_000);
    if (!result.accepted) throw new Error('This video could not be saved.');
    // A fresh download starts with just this child, even if an old claim for the same id lingered.
    setOwners({ ...owners(), [videoId]: [profileId] });
    // Populate the existing segment cache while connected; offline playback reads only that cache.
    void sponsorBlockService.getSegments(videoId).catch(() => undefined);
  },

  /** Lets the player remove files while a parent is signed in, and no longer once they are not. */
  async authorizeParent(session: ParentSession | null) {
    if (!native?.setParentAuthorization) return;
    const active = session && parentSessionService.current();
    await native.setParentAuthorization(active?.expiresAt ?? 0);
  },

  /** Parent: remove one child's copy. The file leaves the device with its last owner. */
  async removeForChild(profileId: string, videoId: string) {
    const active = parentSessionService.require('remove saved videos');
    const module = requireDownloads();
    await this.authorizeParent(active);
    const next = removeOwner(owners(), videoId, profileId);
    setOwners(next);
    if (!next[videoId]) await module.removeDownload(videoId);
  },

  /** Parent deletes a child: their claims go, and files nobody else has go with them. */
  async dropProfile(profileId: string) {
    const active = parentSessionService.require('delete a child profile');
    const result = removeProfile(owners(), profileId);
    setOwners(result.owners);
    if (!result.orphaned.length || !native?.removeDownload) return;
    await this.authorizeParent(active);
    for (const videoId of result.orphaned) await native.removeDownload(videoId).catch(() => undefined);
  },

  /** Called by PIN reset, including recovery where no parent session can exist. */
  async clear() {
    setOwners({});
    if (native?.clearDownloads) await native.clearDownloads();
  },
};
