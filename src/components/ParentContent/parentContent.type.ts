import React from 'react';
import type { useParentContent } from './parentContent.hook';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import type { ContentApproval, ContentCategory } from '../../types';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';

export type AddContentKind = 'channel' | 'video';

export type ChannelSort = 'recent' | 'name';

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
  /** Renders the full-screen add form for the chosen kind; the panel owns when it is open. */
  addContentSlot?: (kind: AddContentKind, onClose: () => void) => React.ReactNode;
  accessFor: AccessCheck;
  onRemoveVideo: (video: ApprovedVideo) => Promise<void>;
  onRemoveChannel: (channel: ApprovedChannel) => Promise<void>;
  onToggleVideoCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => Promise<void>;
  onToggleChannelCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => Promise<void>;
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

export type UseParentContentInput = Pick<
  ParentContentProps,
  'videos' | 'channels' | 'mode' | 'selectedChannelId' | 'accessFor'
>;

export type UseParentContent = ReturnType<typeof useParentContent>;
