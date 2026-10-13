import type { ApprovedVideo } from '../types';
import { playbackPolicy, localDayKey } from './playbackPolicyService';
import { contentAccessService, approvalMatchesTarget } from './contentAccessService';
import { playbackOverrideService } from './playbackOverrideService';

/** Native stop deadline: every time-dependent rule can change at one of these instants. */
export function playbackAuthorization(profileId: string, video: ApprovedVideo, now = new Date()) {
  const input = { profileId, videoId: video.youtubeVideoId, channelId: video.channelId, categoryIds: video.categoryIds };
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const boundaries = new Set<number>([midnight]);
  for (let at = Math.floor(now.getTime() / 60_000) * 60_000 + 60_000; at < midnight; at += 60_000) boundaries.add(at);
  for (const approval of contentAccessService.approvalsFor(profileId)) {
    if (approval.expiresAt && approvalMatchesTarget(approval, video.youtubeVideoId, video.channelId)) boundaries.add(Date.parse(approval.expiresAt));
  }
  const overrideExpiries = playbackOverrideService.active(profileId, now).map((override) => Date.parse(override.expiresAt));
  for (const expiry of overrideExpiries) boundaries.add(expiry);
  const remainingSeconds = playbackPolicy.getRemainingSeconds(profileId, now);
  let stopAt = now.getTime();
  if (playbackPolicy.canPlay(input, now).allowed) {
    stopAt = [...boundaries].filter((at) => at > now.getTime()).sort((a, b) => a - b)
      .find((at) => at === midnight || (remainingSeconds !== null && overrideExpiries.includes(at)) || !playbackPolicy.canPlay(input, new Date(at)).allowed) ?? midnight;
  }
  return { date: localDayKey(now), stopAt, usedMs: playbackPolicy.getUsage(profileId) * 1000,
    remainingMs: (remainingSeconds ?? (midnight - now.getTime()) / 1000) * 1000 };
}
