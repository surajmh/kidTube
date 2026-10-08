import { ApprovedVideo, ChildProfile } from '../types';
import { contentAccessService } from './contentAccessService';
import { parentSessionService } from './auth/parentSession';
import type { ParentSession } from './auth/parentSession.type';
import { sponsorBlockService } from './sponsorBlockService';
import type { SavedVideo, DownloadModule } from './downloadService.type';

let native: DownloadModule | null = null;
export function setNativeDownloadModule(module: DownloadModule | null) { native = module; }
function requireDownloads() {
  if (!native?.getDownloads) throw new Error('Install the updated Android build to save videos.');
  return native;
}

/** Saving bytes grants no access: eligibility always comes from the existing content rules. */
export function downloadableVideos(videos: ApprovedVideo[], profiles: ChildProfile[]) {
  return videos.filter((video) => profiles.some((profile) => contentAccessService.evaluate(profile.id,
    { videoId: video.youtubeVideoId, channelId: video.channelId, categoryIds: video.categoryIds }) === 'allowed'));
}
export function savedVideos(downloads: SavedVideo[], allowedVideos: ApprovedVideo[], now = Date.now()) {
  const ready = new Set(downloads.filter((item) => item.state === 'ready' && Number.isFinite(item.expiresAt) && item.expiresAt > now).map((item) => item.videoId));
  return allowedVideos.filter((video) => ready.has(video.youtubeVideoId));
}

export const downloadService = {
  async list() { return native?.getDownloads ? native.getDownloads() : []; },
  async authorize(session: ParentSession | null, videos: ApprovedVideo[], profiles: ChildProfile[]) {
    if (!native?.setDownloadAuthorization) return;
    const active = session && parentSessionService.current();
    await native.setDownloadAuthorization(active ? downloadableVideos(videos, profiles).map((video) => video.youtubeVideoId) : [], active?.expiresAt ?? 0);
  },
  async save(session: ParentSession, video: ApprovedVideo, videos: ApprovedVideo[], profiles: ChildProfile[], maxHeight: number, days: number) {
    const active = parentSessionService.require('save videos for travel');
    if (![7, 30].includes(days) || ![144, 240, 360, 480, 720, 1080].includes(maxHeight)) throw new Error('Choose a valid download quality and retention period.');
    if (!downloadableVideos(videos, profiles).some((item) => item.youtubeVideoId === video.youtubeVideoId)) throw new Error('Approve this video for a child before downloading it.');
    const module = requireDownloads();
    await this.authorize(active, videos, profiles);
    const result = await module.downloadVideo(video.youtubeVideoId, maxHeight, Date.now() + days * 86400_000);
    if (!result.accepted) throw new Error('This video could not be saved.');
    // Populate the existing segment cache while connected; offline playback reads only that cache.
    void sponsorBlockService.getSegments(video.youtubeVideoId).catch(() => undefined);
  },
  async remove(session: ParentSession, videoId: string, videos: ApprovedVideo[], profiles: ChildProfile[]) {
    const active = parentSessionService.require('remove saved videos');
    await this.authorize(active, videos, profiles);
    await requireDownloads().removeDownload(videoId);
  },
  /** Called by PIN reset, including recovery where no parent session can exist. */
  async clear() { if (native?.clearDownloads) await native.clearDownloads(); },
};
