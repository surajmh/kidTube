import React from 'react';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import { PlaybackSettings } from '../../playbackTypes';
import {
  ContentApproval,
  ContentCategory,
  PlaybackOverride,
  ProfilePolicyOverrides,
} from '../../parentalControlsTypes';
import { ChildRulesMap } from '../../services/childRulesService';
import { OverridePreset } from '../../services/playbackOverrideService';

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
