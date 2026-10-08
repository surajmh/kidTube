import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import type { ContentRequest, CuratedPlaylist, RequestType } from '../../types';
import type { KidLibrary } from '../../services/kidContentLibraryService.type';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';

export type KidTab = 'home' | 'categories' | 'channels' | 'downloads' | 'requests' | 'playlists';

/** A nav destination. Categories are filter chips on the feed, not a destination. */
export type KidDestination = {
  id: KidTab;
  label: string;
  /** Feather glyph name; typed loosely here so constants.ts need not import the icon set. */
  icon: string;
};

/** What a child may be told about a channel whose uploads could not be loaded. */
export type ChannelAvailability = 'ready' | 'stale-with-cache' | 'unavailable' | 'not-loaded';

export type KidSearchResults = {
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
};

export type KidHomeProps = {
  /** This child's downloads only, in any state. */
  downloads?: import('../../services/downloadService.type').SavedVideo[];
  /** Defaults to true. When false the Downloads tab is hidden. */
  downloadsEnabled?: boolean;
  playlists?: import('../../types').CuratedPlaylist[];
  selectedPlaylistId?: string | null;
  onSelectPlaylist?: (id: string | null) => void;
  onPlayPlaylist?: (videos: ApprovedVideo[], name: string) => void;
  profiles: ChildProfile[];
  activeProfile?: ChildProfile;
  onSelectProfile: (profileId: string) => void;
  library: KidLibrary;
  notice: string;
  noticeAction?: { label: string; onPress: () => void } | null;
  tab: KidTab;
  onTabChange: (tab: KidTab) => void;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string | null) => void;
  onVideoPress: (video: ApprovedVideo) => void;
  onParentPress: () => void;
  requests: ContentRequest[];
  onSubmitRequest: (input: { type: RequestType; title: string }) => Promise<void>;
  onRequestVideo: (video: ApprovedVideo) => Promise<void>;
  onRequestChannel: (channel: ApprovedChannel) => Promise<void>;
  pendingRequestCount: number;
  /** Cached fetch state per channel. Kid Mode only reads this and never triggers a fetch. */
  channelSyncStateFor: (channelId: string) => ChannelSyncState | undefined;
};

export type UseKidHomeInput = Pick<
  KidHomeProps,
  'library' | 'tab' | 'downloadsEnabled' | 'onTabChange' | 'selectedCategoryId' | 'selectedChannelId' | 'onSelectChannel' | 'channelSyncStateFor'
>;

export type Playlist = CuratedPlaylist & { videos: ApprovedVideo[] };

/** A download that is still being saved, or failed, with the video it belongs to. */
