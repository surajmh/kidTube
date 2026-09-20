import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';

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

declare class NestlingYouTubePlayerModule extends NativeModule<YouTubePlayerModuleEvents> {
  /** Metadata only — never resolves a stream and never approves anything. */
  getVideoMetadata(videoId: string): Promise<NativeVideoMetadata>;
  /** Fail-closed allow list: native refuses ids that are not in it. */
  setAllowedVideoIds(videoIds: string[]): Promise<PlayerCommandResult>;
  play(videoId: string): Promise<PlayerCommandResult>;
  pause(): Promise<PlayerCommandResult>;
  resume(videoId: string): Promise<PlayerCommandResult>;
  seek(position: number): Promise<PlayerCommandResult>;
  stop(): Promise<PlayerCommandResult>;
  setVolume(volume: number): Promise<PlayerCommandResult>;
  setFullscreen(fullscreen: boolean): Promise<PlayerCommandResult>;
}

export default requireOptionalNativeModule<NestlingYouTubePlayerModule>('NestlingYouTubePlayer');
