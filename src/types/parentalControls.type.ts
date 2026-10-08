import { ScheduleWindow } from './playback.type';

/**
 * Phase 4 domain types.
 *
 * Everything here is local-only. Timestamps use ISO strings so the entities stay
 * JSON-serialisable and match the existing `WatchHistory.watchedAt` convention.
 */

export type RequestType = 'video' | 'channel';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

/** A child's request for content that is not currently approved. */
export type ContentRequest = {
  id: string;
  profileId: string;
  type: RequestType;
  youtubeVideoId?: string;
  youtubeChannelId?: string;
  title?: string;
  thumbnailUrl?: string;
  channelName?: string;
  requestedAt: string;
  status: RequestStatus;
  resolvedAt?: string;
  resolution?: ApprovalDuration;
};

/** How long a parent approval lasts. */
export type ApprovalDuration = 'once' | 'today' | 'seven_days' | 'permanent';

export type ApprovalTarget =
  | { type: 'video'; youtubeVideoId: string }
  | { type: 'channel'; youtubeChannelId: string };

/**
 * A parent approval. `profileId === null` means family-wide.
 *
 * Permanent family-wide approvals are additionally mirrored into the Phase 1
 * whitelist (video/channel repositories) so existing behaviour is untouched.
 */
export type ContentApproval = {
  id: string;
  profileId: string | null;
  target: ApprovalTarget;
  duration: ApprovalDuration;
  grantedAt: string;
  /** Undefined for permanent approvals. */
  expiresAt?: string;
  /** 1 for `once` approvals, decremented when playback completes. */
  remainingPlays?: number;
  requestId?: string;
};

export type ContentCategory = {
  id: string;
  name: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
};

/** Optional per-child content rules layered on top of global approvals. */
export type ChildContentRules = {
  profileId: string;
  /** When false, only child-specific grants are eligible for this profile. */
  inheritGlobalApprovals: boolean;
  blockedCategoryIds: string[];
  grantedVideoIds: string[];
  grantedChannelIds: string[];
  blockedVideoIds: string[];
  blockedChannelIds: string[];
};

/** Per-child overrides for the global Phase 3 playback settings. */
export type ProfilePolicyOverrides = {
  autoplay?: boolean;
  sponsorBlockEnabled?: boolean;
  screenTimeWarningsEnabled?: boolean;
  dailyLimitMinutes?: number | null;
  allowedHoursEnabled?: boolean;
  schedules?: Record<string, ScheduleWindow[]>;
  bedtimeEnabled?: boolean;
  bedtimeStartMinutes?: number;
  bedtimeEndMinutes?: number;
};

/** A temporary, parent-granted extension. Never mutates the child's configured limit. */
export type PlaybackOverride = {
  id: string;
  profileId: string;
  additionalSeconds: number;
  grantedAt: string;
  expiresAt: string;
  /** `Until bedtime` also unlocks allowed-hours and bedtime restrictions until it expires. */
  grantsScheduleAccess: boolean;
};
