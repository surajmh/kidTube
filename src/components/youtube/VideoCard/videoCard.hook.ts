import { useState } from 'react';
import { ApprovedVideo } from '../../../types';
import { useAppStore } from '../../../store/appStore';
import { formatDuration, thumbnailUrls } from '../../KidHome/kidHome.helper';

/** Preferred rendition with a quiet fallback once the preferred one has failed. */
export function useThumbnail(video: ApprovedVideo) {
  const { primary, fallback } = thumbnailUrls(video);
  const [failedPrimary, setFailedPrimary] = useState<string | null>(null);
  return {
    primary,
    source: failedPrimary === primary ? fallback : primary,
    duration: formatDuration(video.duration),
    onError: () => setFailedPrimary(primary),
  };
}

export function useChannelAvatar(uri?: string, channelId?: string) {
  const savedUri = useAppStore((state) => channelId ? state.channels.find((channel) => channel.channelId === channelId)?.thumbnailUrl : undefined);
  const source = uri || savedUri;
  const [failedSource, setFailedSource] = useState<string>();
  return { source, failed: Boolean(source && failedSource === source), onError: () => setFailedSource(source) };
}
