/** One possible channel for a parent's lookup. Inert: picking it still goes through the approval form. */
export type ChannelMatch = {
  youtubeChannelId: string;
  name: string;
  thumbnailUrl?: string;
  description?: string;
  subscriberCount?: number;
  videoCount?: number;
  verified?: boolean;
};

/** One possible video for a parent's lookup. */
export type VideoMatch = {
  youtubeVideoId: string;
  title: string;
  channelName?: string;
  youtubeChannelId?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
};
