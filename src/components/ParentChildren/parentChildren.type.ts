import React from 'react';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import type { PlaybackSettings } from '../../types';
import type { ContentApproval, ContentCategory, PlaybackOverride, ProfilePolicyOverrides } from '../../types';
import type { ChildRulesMap } from '../../services/childRulesService.type';
import type { OverridePreset } from '../../services/playbackOverrideService.type';

export type ParentChildrenProps = {
  profiles: ChildProfile[];
  initialProfileId: string;
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  approvals: ContentApproval[];
  rules: ChildRulesMap;
  policyOverrides: Record<string, ProfilePolicyOverrides>;
  globalSettings: PlaybackSettings;
  overrides: PlaybackOverride[];
  onSetPolicy: (profileId: string, patch: ProfilePolicyOverrides | null) => Promise<void>;
  onToggleInherit: (profileId: string, inherit: boolean) => Promise<void>;
  onToggleCategory: (profileId: string, categoryId: string) => Promise<void>;
  onToggleGrantChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleBlockChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleGrantVideo: (profileId: string, videoId: string) => Promise<void>;
  onToggleBlockVideo: (profileId: string, videoId: string) => Promise<void>;
  onGrantOverride: (profileId: string, preset: OverridePreset, grantsScheduleAccess: boolean) => Promise<void>;
  onRevokeOverride: (profileId: string) => Promise<void>;
  onRevokeApproval: (approval: ContentApproval) => Promise<void>;
  /** Existing Phase 1 profile manager, so profile editing stays in one place. */
  profilesSlot?: React.ReactNode;
};

export type UseParentChildrenInput = Pick<
  ParentChildrenProps,
  'profiles' | 'initialProfileId' | 'rules' | 'policyOverrides' | 'globalSettings' | 'overrides' | 'approvals' | 'onSetPolicy'
>;

/** One day's allowed-viewing window, in minutes from midnight. */
export type TimeWindow = { startMinutes: number; endMinutes: number };
export type ScheduleMap = Record<string, TimeWindow[]>;

export type Schedules = Record<string, { startMinutes: number; endMinutes: number }[]>;

export type CardProps = { profile: ChildProfile; profileId: string; childRules: ChildRulesMap[string] };
