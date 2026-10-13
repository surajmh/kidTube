import { NativeModule, requireOptionalNativeModule } from 'expo-modules-core';
import type { PlayerCommandResult, YouTubePlayerModuleEvents, NativeVideoMetadata, NativeChannelMetadata, NativeChannelVideoPage, NativeChannelSearch, NativeVideoSearch } from './YouTubePlayerModule.type';

declare class NestlingYouTubePlayerModule extends NativeModule<YouTubePlayerModuleEvents> {
  readonly managesBackgroundPlayback?: boolean;
  /** Removal is a parent action; this authorizes it until the parent session ends. */
  setParentAuthorization(expiresAt: number): Promise<void>;
  /** Heights this video can really be saved at, from the stream itself. */
  getDownloadOptions(videoId: string): Promise<{ heights?: number[] }>;
  getDownloads(): Promise<import('../services/downloadService.type').SavedVideo[]>;
  setDownloadAuthorization(videoIds: string[], expiresAt: number): Promise<void>;
  downloadVideo(videoId: string, maxHeight: number, expiresAt: number): Promise<PlayerCommandResult>;
  removeDownload(videoId: string): Promise<void>;
  clearDownloads(): Promise<void>;
  /** Metadata only — never resolves a stream and never approves anything. */
  getVideoMetadata(videoId: string): Promise<NativeVideoMetadata>;
  resolveChannelId(reference: string): Promise<NativeChannelMetadata>;
  getChannel(reference: string): Promise<NativeChannelMetadata>;
  /** Parent-only name lookup: up to a handful of matches, never approving anything. */
  searchChannels(query: string): Promise<NativeChannelSearch>;
  searchVideos(query: string): Promise<NativeVideoSearch>;
  getChannelVideos(channelId: string, pageToken?: string | null): Promise<NativeChannelVideoPage>;
  /** Milliseconds since boot; unaffected by changes to the device date. */
  getElapsedRealtime(): number;
  /** Native PBKDF2-HMAC-SHA256; identical digest to the pure-TS fallback in auth/pinHash. */
  derivePinHash(pin: string, saltHex: string, iterations: number): Promise<{ hash?: string; failed?: boolean }>;
  /** Fail-closed allow list: native refuses ids that are not in it. */
  setAllowedVideoIds(videoIds: string[]): Promise<PlayerCommandResult>;
  enterPictureInPicture(): Promise<PlayerCommandResult>;
  setPlaybackAuthorization(videoId: string, profileId: string, date: string, usedMs: number, acknowledgedMs: number, remainingMs: number, stopAt: number, backgroundAudio: boolean): Promise<void>;
  getPlaybackUsage(): Promise<import('../types').ScreenTimeUsage[]>;
  play(videoId: string): Promise<PlayerCommandResult>;
  pause(): Promise<PlayerCommandResult>;
  resume(videoId: string): Promise<PlayerCommandResult>;
  seek(position: number): Promise<PlayerCommandResult>;
  stop(): Promise<PlayerCommandResult>;
  setVolume(volume: number): Promise<PlayerCommandResult>;
  setFullscreen(fullscreen: boolean): Promise<PlayerCommandResult>;
  /**
   * Best-effort: resolves a stream ahead of time (e.g. the "up next" video) so switching to it
   * later skips the resolve latency. Never approves anything by itself — still gated by the
   * allow list, and a miss/failure here just means the eventual `play()` resolves normally.
   */
  prefetch(videoId: string): Promise<PlayerCommandResult>;
}

export default requireOptionalNativeModule<NestlingYouTubePlayerModule>('NestlingYouTubePlayer');
