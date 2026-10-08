import type { PlaybackSettings, ScreenTimeUsage } from '../types';
import type { ApprovedChannel, ApprovedVideo, ChildProfile, WatchHistory } from '../types';
import type { ContentApproval, ContentCategory, ContentRequest, PlaybackOverride, ProfilePolicyOverrides } from '../types';
import type { ChildRulesMap } from './childRulesService.type';
import type { ChannelSyncMap } from '../repositories/channelSyncRepository.type';

/**
 * One pure pass over everything stored locally.
 *
 * Storage is only ever written by this app, but a partially failed write, an interrupted migration,
 * or an old build can still leave duplicates, orphans or impossible values behind. Repairing on load
 * keeps every later decision trustworthy, and doing it here (pure, no storage access) keeps it
 * testable.
 */
export type LocalDataSnapshot = {
  profiles: ChildProfile[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  categories: ContentCategory[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
  overrides: PlaybackOverride[];
  childRules: ChildRulesMap;
  profilePolicies: Record<string, ProfilePolicyOverrides>;
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
  settings: PlaybackSettings;
  /** Per-channel fetch state for approved-channel video discovery. */
  channelSync?: ChannelSyncMap;
};

/** Collections whose stored bytes no longer match the repaired snapshot. */
export type RepairableCollection =
  | 'profiles'
  | 'videos'
  | 'channels'
  | 'categories'
  | 'requests'
  | 'approvals'
  | 'overrides'
  | 'childRules'
  | 'profilePolicies'
  | 'history'
  | 'screenTime'
  | 'channelSync';

export type RepairReport = {
  snapshot: Required<LocalDataSnapshot>;
  repairs: string[];
  /** Only these collections need re-persisting; the rest are byte-equivalent to what was read. */
  changed: RepairableCollection[];
};
