import { Phase3Settings, ScreenTimeUsage } from '../phase3Types';
import { ApprovedChannel, ApprovedVideo, ChildProfile, WatchHistory } from '../types';
import {
  ContentApproval,
  ContentCategory,
  ContentRequest,
  PlaybackOverride,
  ProfilePolicyOverrides,
  defaultChildContentRules,
} from '../phase4Types';
import { approvalExpired } from './contentAccessService';
import { sanitizeLibrary, sanitizeSettings, sanitizeUsageRecords } from './contentValidation';
import { pruneUsageRecords } from './screenTimeAccounting';
import { ChildRulesMap } from './childRulesService';
import { ChannelSyncMap } from '../repositories/channelSyncRepository';
import { isSyncOwned } from './content/channelSyncRules';

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
  settings: Phase3Settings;
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

const validDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

function sanitizeCategories(categories: ContentCategory[]): ContentCategory[] {
  const seen = new Set<string>();
  const next: ContentCategory[] = [];
  for (const category of categories) {
    if (!category || typeof category.id !== 'string' || typeof category.name !== 'string') continue;
    if (!category.id.trim() || !category.name.trim() || seen.has(category.id)) continue;
    seen.add(category.id);
    next.push({
      id: category.id,
      name: category.name.slice(0, 24),
      icon: typeof category.icon === 'string' && category.icon ? category.icon : 'tag',
      isDefault: category.isDefault === true,
      createdAt: validDate(category.createdAt) ? category.createdAt : new Date(0).toISOString(),
    });
  }
  return next;
}

function sanitizeChildRules(rules: ChildRulesMap, profileIds: Set<string>): ChildRulesMap {
  const next: ChildRulesMap = {};
  for (const [profileId, value] of Object.entries(rules ?? {})) {
    if (!profileIds.has(profileId) || !value) continue;
    const strings = (list: unknown) => (Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []);
    next[profileId] = {
      ...defaultChildContentRules(profileId),
      inheritGlobalApprovals: value.inheritGlobalApprovals !== false,
      blockedCategoryIds: strings(value.blockedCategoryIds),
      grantedVideoIds: strings(value.grantedVideoIds),
      grantedChannelIds: strings(value.grantedChannelIds),
      blockedVideoIds: strings(value.blockedVideoIds),
      blockedChannelIds: strings(value.blockedChannelIds),
    };
  }
  return next;
}

function sanitizePolicies(
  policies: Record<string, ProfilePolicyOverrides>,
  profileIds: Set<string>,
): Record<string, ProfilePolicyOverrides> {
  const next: Record<string, ProfilePolicyOverrides> = {};
  for (const [profileId, value] of Object.entries(policies ?? {})) {
    if (!profileIds.has(profileId) || !value || typeof value !== 'object') continue;
    next[profileId] = value;
  }
  return next;
}

function sanitizeApprovals(approvals: ContentApproval[], profileIds: Set<string>, now: Date): ContentApproval[] {
  const seen = new Set<string>();
  const next: ContentApproval[] = [];
  for (const approval of approvals ?? []) {
    if (!approval || typeof approval.id !== 'string' || !approval.target) continue;
    if (approval.profileId !== null && !profileIds.has(approval.profileId)) continue;
    if (approvalExpired(approval, now)) continue;
    const key = `${approval.profileId ?? '*'}:${approval.target.type}:${
      approval.target.type === 'video' ? approval.target.youtubeVideoId : approval.target.youtubeChannelId
    }`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(approval);
  }
  return next;
}

function sanitizeRequests(requests: ContentRequest[], profileIds: Set<string>): ContentRequest[] {
  return (requests ?? []).filter(
    (request) => request && typeof request.id === 'string' && profileIds.has(request.profileId) && validDate(request.requestedAt),
  );
}

function sanitizeOverrides(overrides: PlaybackOverride[], profileIds: Set<string>, now: Date): PlaybackOverride[] {
  return (overrides ?? []).filter(
    (override) =>
      override &&
      typeof override.id === 'string' &&
      profileIds.has(override.profileId) &&
      Number.isFinite(override.additionalSeconds) &&
      override.additionalSeconds > 0 &&
      validDate(override.expiresAt) &&
      new Date(override.expiresAt).getTime() > now.getTime(),
  );
}

export function repairLocalData(input: LocalDataSnapshot, now = new Date()): RepairReport {
  const repairs: string[] = [];
  const changed = new Set<RepairableCollection>();
  const repair = (collection: RepairableCollection, message: string) => {
    repairs.push(message);
    changed.add(collection);
  };

  const profiles = (input.profiles ?? []).filter((profile) => profile && typeof profile.id === 'string' && profile.id.trim());
  if (profiles.length !== (input.profiles ?? []).length) repair('profiles', 'dropped invalid child profiles');

  const profileIds = new Set(profiles.map((profile) => profile.id));

  const library = sanitizeLibrary(input.videos ?? [], input.channels ?? []);
  if (library.videos.length !== (input.videos ?? []).length) repair('videos', 'removed invalid or duplicate videos');
  if (library.channels.length !== (input.channels ?? []).length) repair('channels', 'removed invalid or duplicate channels');

  const categories = sanitizeCategories(input.categories ?? []);
  if (categories.length !== (input.categories ?? []).length) repair('categories', 'removed invalid categories');

  const requests = sanitizeRequests(input.requests ?? [], profileIds);
  if (requests.length !== (input.requests ?? []).length) repair('requests', 'removed requests for missing profiles');

  const approvals = sanitizeApprovals(input.approvals ?? [], profileIds, now);
  if (approvals.length !== (input.approvals ?? []).length) repair('approvals', 'removed expired or orphaned approvals');

  const overrides = sanitizeOverrides(input.overrides ?? [], profileIds, now);
  if (overrides.length !== (input.overrides ?? []).length) repair('overrides', 'removed expired or orphaned overrides');

  const childRules = sanitizeChildRules(input.childRules ?? {}, profileIds);
  if (Object.keys(childRules).length !== Object.keys(input.childRules ?? {}).length) repair('childRules', 'removed content rules for missing profiles');

  const profilePolicies = sanitizePolicies(input.profilePolicies ?? {}, profileIds);
  if (Object.keys(profilePolicies).length !== Object.keys(input.profilePolicies ?? {}).length) repair('profilePolicies', 'removed playback policies for missing profiles');

  const history = (input.history ?? []).filter(
    (item) => item && profileIds.has(item.profileId) && validDate(item.watchedAt) && Number.isFinite(item.progress),
  );
  if (history.length !== (input.history ?? []).length) repair('history', 'removed orphaned watch history');

  const screenTime = pruneUsageRecords(sanitizeUsageRecords(input.screenTime ?? []), now);
  if (screenTime.length !== (input.screenTime ?? []).length) repair('screenTime', 'removed invalid or old screen-time records');

  const settings = sanitizeSettings(input.settings);

  // Channel discovery bookkeeping: a sync owns only the videos it fetched, so a
  // channel that no longer exists must not leave its fetched rows behind, and no
  // channel may keep a fetch state for a channel the parent has removed.
  const channelIds = new Set(library.channels.map((channel) => channel.channelId));
  const withoutOrphanedSyncVideos = library.videos.filter(
    (video) => !(isSyncOwned(video) && video.channelId !== undefined && !channelIds.has(video.channelId)),
  );
  if (withoutOrphanedSyncVideos.length !== library.videos.length) {
    repair('videos', 'removed videos for channels that are no longer approved');
  }
  const channelSync: ChannelSyncMap = {};
  for (const [channelId, state] of Object.entries(input.channelSync ?? {})) {
    if (!channelIds.has(channelId) || !state) continue;
    channelSync[channelId] = state;
  }
  if (Object.keys(channelSync).length !== Object.keys(input.channelSync ?? {}).length) {
    repair('channelSync', 'removed channel sync state for missing channels');
  }

  // Category memberships that point at a category that no longer exists.
  const categoryIds = new Set(categories.map((category) => category.id));
  const pruneMemberships = <T extends { categoryIds?: string[] }>(item: T) =>
    item.categoryIds?.some((categoryId) => !categoryIds.has(categoryId))
      ? { ...item, categoryIds: item.categoryIds.filter((categoryId) => categoryIds.has(categoryId)) }
      : item;
  const videos = withoutOrphanedSyncVideos.map(pruneMemberships);
  const channels = library.channels.map(pruneMemberships);
  if (videos.some((video, index) => video !== library.videos[index])) {
    repair('videos', 'removed category assignments for missing categories');
  }
  if (channels.some((channel, index) => channel !== library.channels[index])) {
    repair('channels', 'removed category assignments for missing categories');
  }

  return {
    snapshot: {
      profiles,
      videos,
      channels,
      categories,
      requests,
      approvals,
      overrides,
      childRules,
      profilePolicies,
      history,
      screenTime,
      settings,
      channelSync,
    },
    repairs,
    changed: [...changed],
  };
}

/** Runtime guard shared by every content write. */
export function assertKnownProfile(profiles: ChildProfile[], profileId: string) {
  return profiles.some((profile) => profile.id === profileId);
}
