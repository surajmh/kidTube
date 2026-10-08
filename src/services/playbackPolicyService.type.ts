import type { PlaybackSettings, ScreenTimeUsage } from '../types';
import type { ProfilePolicyOverrides } from '../types';
import type { ContentAccessOutcome } from './contentAccessService.type';

export type PlaybackCheckInput = {
  profileId: string;
  videoId: string;
  channelId?: string;
  categoryIds?: string[];
};

export type PlaybackPolicyHydration = {
  settings: PlaybackSettings;
  screenTime: ScreenTimeUsage[];
  profiles?: { id: string }[];
  profilePolicies?: Record<string, ProfilePolicyOverrides>;
};

export type ContentAccessResolver = (
  profileId: string,
  input: { videoId: string; channelId?: string; categoryIds?: string[] },
  now: Date,
) => ContentAccessOutcome;

export type OverrideWindow = {
  additionalSeconds: number;
  grantsScheduleAccess: boolean;
};

export type OverrideResolver = (profileId: string, now: Date) => OverrideWindow;
