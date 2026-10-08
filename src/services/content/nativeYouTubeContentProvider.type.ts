import type { NativeChannelMetadata, NativeChannelVideoPage, NativeVideoMetadata } from '../../native/YouTubePlayerModule.type';

/** Just the metadata surface of the native module. */
export type NativeMetadataModule = {
  getVideoMetadata(videoId: string): Promise<NativeVideoMetadata>;
  resolveChannelId(reference: string): Promise<NativeChannelMetadata>;
  getChannel(reference: string): Promise<NativeChannelMetadata>;
  getChannelVideos(channelId: string, pageToken?: string | null): Promise<NativeChannelVideoPage>;
};
