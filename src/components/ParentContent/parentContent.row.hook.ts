import { useMemo } from 'react';
import { ApprovedVideo } from '../../types';
import type { ContentApproval } from '../../types';
import { channelVideosFrom } from '../../services/content/channelSyncRules';
import { approveLabelFor } from './parentContent.helper';

export function useChannelRow(approvals: ContentApproval[], videos: ApprovedVideo[], channelId: string) {
  const expiry = useMemo(
    () => approveLabelFor(approvals, { channelId }),
    [approvals, channelId],
  );
  const channelVideos = useMemo(
    () => channelVideosFrom(videos, channelId),
    [videos, channelId],
  );
  return { expiry, channelVideos };
}

export function useVideoRow(approvals: ContentApproval[], video: ApprovedVideo) {
  return useMemo(
    () => approveLabelFor(approvals, { videoId: video.youtubeVideoId, channelId: video.channelId }),
    [approvals, video.youtubeVideoId, video.channelId],
  );
}
