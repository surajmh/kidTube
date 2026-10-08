export type PlayerCommandResult = {
  accepted: boolean;
  message?: string;
  /** `policy_blocked` means the native allow list refused the request. */
  code?: string;
  videoId?: string;
};

export interface YouTubePlayerModuleEvents {
  [eventName: string]: (event: {
    videoId?: string;
    position?: number;
    duration?: number;
    bufferedPosition?: number;
    isPlaying?: boolean;
    message?: string;
    code?: string;
  }) => void;
}

/**
 * Public metadata for one video, or a failure. Asking about a video grants no ability to play it:
 * the allow list and the playback policy are untouched by this call.
 */
export type NativeVideoMetadata = {
  youtubeVideoId?: string;
  title?: string;
  channelName?: string;
  youtubeChannelId?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  publishedAt?: string;
  failed?: boolean;
  code?: string;
  message?: string;
};

export type NativeChannelMetadata = {
  youtubeChannelId?: string;
  name?: string;
  thumbnailUrl?: string;
  description?: string;
  failed?: boolean;
  code?: string;
  message?: string;
};

export type NativeChannelVideoPage = {
  channelId?: string;
  videos?: NativeVideoMetadata[];
  nextPageToken?: string | null;
  failed?: boolean;
  code?: string;
  message?: string;
};
