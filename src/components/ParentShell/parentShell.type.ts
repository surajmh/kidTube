import React from 'react';
import { ApprovedChannel, ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import type { PlaybackSettings, ScreenTimeUsage } from '../../types';
import type { ContentApproval, ContentCandidate, ContentCategory, ContentRequest, PlaybackOverride, ProfilePolicyOverrides } from '../../types';
import type { ChildRulesMap } from '../../services/childRulesService.type';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';
import type { OverridePreset } from '../../services/playbackOverrideService.type';
import type { ParentSession } from '../../services/auth/parentSession.type';
import { RequestDecisionInput } from '../ParentRequests';
import { ContentTab, ParentContentMode } from '../ParentContent';

export type ParentSection =
  | 'home'
  | 'channels'
  | 'videos'
  | 'categories'
  | 'requests'
  | 'children'
  | 'activity'
  | 'settings'
  | 'security'
  | 'playlists'
  | 'downloads';

export type ParentShellData = {
  session: ParentSession | null;
  profiles: ChildProfile[];
  activeProfileId: string;
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  approvals: ContentApproval[];
  requests: ContentRequest[];
  childRules: ChildRulesMap;
  profilePolicies: Record<string, ProfilePolicyOverrides>;
  overrides: PlaybackOverride[];
  settings: PlaybackSettings;
  screenTimeUsage: ScreenTimeUsage[];
  history: WatchHistory[];
};

export type ParentShellActions = {
  onExit: () => void;
  onDecideRequest: (input: RequestDecisionInput) => Promise<void>;
  onDeleteRequest: (requestId: string) => Promise<void>;
  onClearResolved: () => Promise<void>;
  onRemoveVideo: (video: ApprovedVideo) => Promise<void>;
  onRemoveChannel: (channel: ApprovedChannel) => Promise<void>;
  onToggleVideoCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => Promise<void>;
  onToggleChannelCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => Promise<void>;
  onSearchContent: (query: string) => Promise<ContentCandidate[]>;
  onSaveCandidate: (candidate: ContentCandidate) => Promise<void>;
  onApproveCandidate: (candidate: ContentCandidate) => Promise<void>;
  syncStateFor: (channelId: string) => ChannelSyncState | undefined;
  channelBusy: (channelId: string) => boolean;
  onOpenChannelVideos: (channel: ApprovedChannel) => void;
  onRefreshChannel: (channel: ApprovedChannel) => void;
  onLoadMoreChannel: (channel: ApprovedChannel) => void;
  onSelectChannel: (channelId: string | null) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onRenameCategory: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSetPolicy: (profileId: string, patch: ProfilePolicyOverrides | null) => Promise<void>;
  onToggleInherit: (profileId: string, inherit: boolean) => Promise<void>;
  onToggleCategoryForChild: (profileId: string, categoryId: string) => Promise<void>;
  onToggleGrantChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleBlockChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleGrantVideo: (profileId: string, videoId: string) => Promise<void>;
  onToggleBlockVideo: (profileId: string, videoId: string) => Promise<void>;
  onGrantOverride: (profileId: string, preset: OverridePreset, grantsScheduleAccess: boolean) => Promise<void>;
  onRevokeOverride: (profileId: string) => Promise<void>;
  onRevokeApproval: (approval: ContentApproval) => Promise<void>;
  onProfilesChange: (profiles: ChildProfile[]) => Promise<void>;
  onSettingsChange: (settings: PlaybackSettings) => Promise<void>;
  accessFor: (profileId: string, target: { videoId?: string; channelId?: string }) => boolean;
};

/** The nav bar. Children, Activity and Playback are reached from the dashboard instead: they are
 *  occasional tasks, and five destinations is the most a nav bar can carry without crowding. */

export type ParentShellProps = {
  data: ParentShellData;
  actions: ParentShellActions;
  section: ParentSection;
  setSection: (section: ParentSection) => void;
  contentTab: ContentTab;
  selectedChannelId: string | null;
  setContentTab: (tab: ContentTab) => void;
  profilesSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
  playlistsSlot?: React.ReactNode;
  downloadsSlot?: React.ReactNode;
  manualAddSlot?: React.ReactNode;
  /** Startup repair summary, shown only to the parent. */
  notice?: string;
};

export type { ParentContentMode };

export type UseParentShellInput = Pick<ParentShellProps, 'data' | 'actions' | 'section' | 'selectedChannelId'>;

/** The scroll geometry a near-bottom check needs, matching NativeScrollEvent's shape. */
export type ScrollMetrics = {
  layoutMeasurement: { height: number };
  contentOffset: { y: number };
  contentSize: { height: number };
};
