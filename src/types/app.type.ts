export type ChildProfile = {
  id: string;
  name: string;
  avatar: string;
};

export type ApprovedChannel = {
  id: string;
  name: string;
  channelId: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  approved: boolean;
  /** Phase 4 content categories. A channel can belong to several. */
  categoryIds?: string[];
};

export type ApprovedVideo = {
  id: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl?: string;
  channelId?: string;
  channelName?: string;
  /** Seconds. */
  duration?: number;
  /** ISO timestamp from the metadata provider, when it reported one. */
  publishedAt?: string;
  sourceUrl?: string;
  approved: boolean;
  /** Phase 4 content categories. A video can belong to several. */
  categoryIds?: string[];
  /**
   * True when the row exists only because its channel was approved. These are not
   * individually approved (`approved` stays false): eligibility still comes from
   * the approved channel, exactly as it did before channel discovery existed.
   */
  syncedFromChannel?: boolean;
};

export type WatchHistory = {
  profileId: string;
  videoId: string;
  watchedAt: string;
  progress: number;
};

export type PersistedData = {
  profiles: ChildProfile[];
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  history: WatchHistory[];
};

export type CuratedPlaylist = {
  id: string;
  name: string;
  /** Ordered library row IDs; playlist membership grants no playback access. */
  videoIds: string[];
};
