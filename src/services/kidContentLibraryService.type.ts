import type { ApprovedChannel, ApprovedVideo, WatchHistory } from '../types';
import type { ContentCategory } from '../types';

/**
 * KidContentLibrary.
 *
 * The only view of content Kid Mode ever receives. It has no search capability:
 * everything it returns has already passed the same access rules the playback
 * policy enforces, so a child can never be shown something that would be
 * refused at playback time.
 */
export type KidCategoryCard = {
  category: ContentCategory;
  videoCount: number;
};

export type KidLibrary = {
  profileId: string;
  categories: KidCategoryCard[];
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  recentVideos: ApprovedVideo[];
  /** Unapproved rows a parent added: children may ask for these, never play them. */
  askableVideos: ApprovedVideo[];
  askableChannels: ApprovedChannel[];
};

export type KidLibraryInput = {
  profileId: string;
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  categories: ContentCategory[];
  history?: WatchHistory[];
  now?: Date;
};
