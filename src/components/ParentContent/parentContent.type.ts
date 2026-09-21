import React from 'react';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import { ContentApproval, ContentCandidate, ContentCategory } from '../../phase4Types';
import { ChannelSyncState } from '../../services/content/channelSyncRules';

export type ContentTab = 'channels' | 'videos' | 'categories' | 'requests';

/** Which page of the parent experience this panel is rendering. */
export type ParentContentMode = 'dashboard' | 'channels' | 'videos' | 'categories';

/** Decides whether one child may reach a video or channel. Supplied by the access service. */
export type AccessCheck = (profileId: string, target: { videoId?: string; channelId?: string }) => boolean;

export type ParentContentProps = {
  profiles: ChildProfile[];
  categories: ContentCategory[];
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  approvals: ContentApproval[];
  categoriesSlot?: React.ReactNode;
  requestsSlot?: React.ReactNode;
  manualAddSlot?: React.ReactNode;
  accessFor: AccessCheck;
  onRemoveVideo: (video: ApprovedVideo) => Promise<void>;
  onRemoveChannel: (channel: ApprovedChannel) => Promise<void>;
  onToggleVideoCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => Promise<void>;
  onToggleChannelCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => Promise<void>;
  onSearch: (query: string) => Promise<ContentCandidate[]>;
  onSaveCandidate: (candidate: ContentCandidate) => Promise<void>;
  onApproveCandidate: (candidate: ContentCandidate) => Promise<void>;
  /** Per-channel fetch state for approved-channel video discovery. */
  syncStateFor: (channelId: string) => ChannelSyncState | undefined;
  channelBusy: (channelId: string) => boolean;
  /** Cache-respecting fetch, run when a parent opens a channel's videos. */
  onOpenChannelVideos: (channel: ApprovedChannel) => void;
  mode: ParentContentMode;
  /** Set while a channel's own page is open; the Channels tab otherwise lists channels only. */
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string | null) => void;
  onRefreshChannel: (channel: ApprovedChannel) => void;
  onLoadMoreChannel: (channel: ApprovedChannel) => void;
};
