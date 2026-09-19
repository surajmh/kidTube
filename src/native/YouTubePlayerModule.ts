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

declare class NestlingYouTubePlayerModule extends NativeModule<YouTubePlayerModuleEvents> {
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
