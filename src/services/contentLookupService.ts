import NativeYouTubePlayer from '../native/YouTubePlayerModule';
import type { NativeVideoMetadata } from '../native/YouTubePlayerModule.type';
import { parentSessionService } from './auth/parentSession';
import type { ParentSession } from './auth/parentSession.type';
import { channelSyncService } from './channelSyncService';
import { isCanonicalChannelId } from './content/channelSyncRules';
import { readDurationSeconds, readString } from './content/youtubeContentProvider';
import { extractVideoId } from './contentValidation';
import { isExactChannelReference } from './contentLookupService.helper';
import type { ChannelMatch, VideoMatch } from './contentLookupService.type';

export class ContentLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentLookupError';
  }
}

const unavailable = 'Lookup needs the updated Android build. You can still add it manually.';

function nativeOrThrow() {
  if (!NativeYouTubePlayer) throw new ContentLookupError(unavailable);
  return NativeYouTubePlayer;
}

/**
 * Parent-only lookup that turns whatever a parent typed — a link, a handle, an id or just a name —
 * into candidate channels or videos.
 *
 * It only describes things. Nothing here approves, saves or makes anything playable; the parent
 * still confirms in the add form, and `ContentAccessService` remains the only gate.
 */
export const contentLookupService = {
  async findChannels(session: ParentSession, query: string): Promise<ChannelMatch[]> {
    parentSessionService.require('look up a channel');
    const text = query.trim();
    if (!text) throw new ContentLookupError('Type a channel link, @handle, ID or name.');

    if (isExactChannelReference(text)) {
      const found = await channelSyncService.resolveChannel(session, text);
      return [
        {
          youtubeChannelId: found.youtubeChannelId,
          name: found.name,
          thumbnailUrl: found.thumbnailUrl,
          description: found.description,
        },
      ];
    }

    const result = await nativeOrThrow().searchChannels(text);
    if (result?.failed) throw new ContentLookupError(result.message || 'That could not be looked up right now.');
    const matches = (result?.results ?? []).flatMap((row): ChannelMatch[] => {
      const youtubeChannelId = readString(row?.youtubeChannelId);
      const name = readString(row?.name);
      if (!youtubeChannelId || !isCanonicalChannelId(youtubeChannelId) || !name) return [];
      return [
        {
          youtubeChannelId,
          name,
          thumbnailUrl: readString(row?.thumbnailUrl),
          description: readString(row?.description),
          subscriberCount: typeof row?.subscriberCount === 'number' ? row.subscriberCount : undefined,
          videoCount: typeof row?.videoCount === 'number' ? row.videoCount : undefined,
          verified: row?.verified === true,
        },
      ];
    });
    if (!matches.length) throw new ContentLookupError(`No channel found for “${text}”. Try its link or @handle.`);
    return matches;
  },

  async findVideos(query: string): Promise<VideoMatch[]> {
    parentSessionService.require('look up a video');
    const text = query.trim();
    if (!text) throw new ContentLookupError('Type a video link, ID or title.');
    const native = nativeOrThrow();

    const videoId = extractVideoId(text);
    if (videoId) {
      const found = await native.getVideoMetadata(videoId);
      if (found?.failed) throw new ContentLookupError(found.message || 'That video could not be found.');
      return [toVideoMatch({ ...found, youtubeVideoId: videoId }, videoId)];
    }

    const result = await native.searchVideos(text);
    if (result?.failed) throw new ContentLookupError(result.message || 'That could not be looked up right now.');
    const matches = (result?.results ?? []).flatMap((row): VideoMatch[] => {
      const id = readString(row?.youtubeVideoId);
      return id && readString(row?.title) ? [toVideoMatch(row, id)] : [];
    });
    if (!matches.length) throw new ContentLookupError(`No video found for “${text}”. Try its link.`);
    return matches;
  },
};

function toVideoMatch(row: NativeVideoMetadata | undefined, videoId: string): VideoMatch {
  return {
    youtubeVideoId: videoId,
    title: readString(row?.title) ?? `Video ${videoId}`,
    channelName: readString(row?.channelName),
    youtubeChannelId: readString(row?.youtubeChannelId),
    durationSeconds: readDurationSeconds(row?.durationSeconds),
    thumbnailUrl: readString(row?.thumbnailUrl),
  };
}
