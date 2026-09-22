import { ApprovedChannel, ApprovedVideo } from '../../types';

/**
 * The channel's artwork for a video, or undefined when there is none to show.
 *
 * A video stores only its channelId, so the picture has to be joined from the approved channel
 * list. Undefined is a normal answer, not a failure: a video approved on its own has no channel
 * record, and ChannelAvatar falls back to a monogram.
 */
export function channelAvatarUri(
  channels: ApprovedChannel[],
  video: Pick<ApprovedVideo, 'channelId'>,
): string | undefined {
  if (!video.channelId) return undefined;
  return channels.find((channel) => channel.channelId === video.channelId)?.thumbnailUrl;
}
