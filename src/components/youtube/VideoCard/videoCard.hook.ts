import { useState } from 'react';
import { ApprovedVideo } from '../../../types';
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

export function useChannelAvatarFailure() {
  const [failed, setFailed] = useState(false);
  return { failed, onError: () => setFailed(true) };
}
