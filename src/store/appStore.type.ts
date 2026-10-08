import type { ChannelSyncMap } from '../repositories/channelSyncRepository.type';
import type { ApprovedChannel, ApprovedVideo, ChildProfile, CuratedPlaylist, WatchHistory } from '../types';
import type { PlaybackSettings, ScreenTimeUsage } from '../types';
import type { ChildContentRules, ContentApproval, ContentCategory, ContentRequest, PlaybackOverride, ProfilePolicyOverrides } from '../types';

/** Everything that survives a restart. Each field is stored under its own pre-existing key. */
export type AppData = {
  profiles: ChildProfile[];
  playlists: CuratedPlaylist[];
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  history: WatchHistory[];
  screenTimeUsage: ScreenTimeUsage[];
  playbackSettings: PlaybackSettings;
  requests: ContentRequest[];
  approvals: ContentApproval[];
  categories: ContentCategory[];
  childRules: Record<string, ChildContentRules>;
  profilePolicies: Record<string, ProfilePolicyOverrides>;
  overrides: PlaybackOverride[];
  channelSyncStates: ChannelSyncMap;
};

export type Next<T> = T | ((current: T) => T);
