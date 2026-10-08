import type { NativeVideoMetadata } from '../../native/YouTubePlayerModule.type';
import { YouTubeProviderError,readDurationSeconds,readString } from './youtubeContentProvider';
import type { ChannelPageOptions,YouTubeChannel,YouTubeContentProvider,YouTubeProviderErrorCode,YouTubeVideo,YouTubeVideoPage } from './youtubeContentProvider.type';
import type { NativeMetadataModule } from './nativeYouTubeContentProvider.type';

/**
 * A YouTubeContentProvider backed by the on-device extractor.
 *
 * It replaces the HTTP proxy: there is no API key, no quota and no endpoint to configure, because
 * nothing leaves the device except the requests the extractor itself makes. It stays metadata-only
 * and, like every provider, cannot approve anything — `ContentAccessService` remains the only gate.
 */

/** Native reports a failure as data; map it onto the provider's own error vocabulary. */
function fail(code: string | undefined, message: string | undefined): never {
  const known: YouTubeProviderErrorCode[] = [
    'INVALID_INPUT',
    'CHANNEL_NOT_FOUND',
    'VIDEO_NOT_FOUND',
    'NETWORK',
    'UNKNOWN',
  ];
  const mapped = (known as string[]).includes(code ?? '') ? (code as YouTubeProviderErrorCode) : 'UNKNOWN';
  const retryable = mapped === 'NETWORK' || mapped === 'UNKNOWN';
  throw new YouTubeProviderError(mapped, message ?? '', retryable);
}

let metadataModule: NativeMetadataModule | null = null;

/**
 * The native module is handed in rather than imported here.
 *
 * Importing it would pull `expo-modules-core` into the module graph of everything that merely
 * imports the provider registry, which breaks the pure-logic tests that run under plain Node.
 * The types above are `import type`, so they erase and cost nothing at runtime.
 */
export function setNativeMetadataModule(module: NativeMetadataModule | null) {
  metadataModule = module;
}

function requireModule(): NativeMetadataModule {
  if (!metadataModule) {
    throw new YouTubeProviderError('NOT_CONFIGURED', 'The native player build is required for metadata.', false);
  }
  return metadataModule;
}

export class NativeYouTubeContentProvider implements YouTubeContentProvider {
  readonly id = 'native-extractor';

  async resolveChannelId(reference: string): Promise<string> {
    const result = await requireModule().resolveChannelId(reference);
    if (result?.failed) fail(result.code, result.message);
    const channelId = readString(result?.youtubeChannelId);
    if (!channelId) fail('CHANNEL_NOT_FOUND', undefined);
    return channelId;
  }

  async getChannel(channelId: string): Promise<YouTubeChannel> {
    const result = await requireModule().getChannel(channelId);
    if (result?.failed) fail(result.code, result.message);
    const canonical = readString(result?.youtubeChannelId);
    if (!canonical) fail('CHANNEL_NOT_FOUND', undefined);
    return {
      youtubeChannelId: canonical,
      name: readString(result?.name) ?? canonical,
      thumbnailUrl: readString(result?.thumbnailUrl),
      description: readString(result?.description),
    };
  }

  async getChannelVideos(channelId: string, options?: ChannelPageOptions): Promise<YouTubeVideoPage> {
    const result = await requireModule().getChannelVideos(channelId, options?.pageToken ?? null);
    if (result?.failed) fail(result.code, result.message);

    const videos: YouTubeVideo[] = (result?.videos ?? []).flatMap((row: NativeVideoMetadata) => {
      const youtubeVideoId = readString(row?.youtubeVideoId);
      const title = readString(row?.title);
      if (!youtubeVideoId || !title) return [];
      return [
        {
          youtubeVideoId,
          // Pinned to the channel that was asked about, never what the row claims: a response must
          // not be able to attach a video to a different approved channel.
          youtubeChannelId: channelId,
          channelName: readString(row?.channelName),
          title,
          thumbnailUrl: readString(row?.thumbnailUrl),
          publishedAt: readString(row?.publishedAt),
          durationSeconds: readDurationSeconds(row?.durationSeconds),
        },
      ];
    });

    return {
      channelId,
      videos,
      nextPageToken: readString(result?.nextPageToken ?? undefined),
    };
  }
}

export const nativeYouTubeContentProvider = new NativeYouTubeContentProvider();
