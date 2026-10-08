import { useCallback, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { downloadService } from '../services/downloadService';
import { downloadsFor } from '../services/downloadService.helper';
import type { SavedVideo } from '../services/downloadService.type';
import type { ApprovedVideo, ChildProfile, PlaybackSettings } from '../types';
import type { ChildDownloads } from './useChildDownloads.type';

/** Wires one child's view of the shared download list to the actions a kid screen can take. */
export function useChildDownloads({
  profile,
  settings,
  downloads,
  refresh,
}: {
  profile: ChildProfile | undefined;
  settings: PlaybackSettings;
  downloads: SavedVideo[];
  refresh: () => Promise<void>;
}): ChildDownloads {
  const owners = useAppStore((state) => state.downloadOwners);
  const profileId = profile?.id;
  const mine = useMemo(() => downloadsFor(downloads, owners, profileId), [downloads, owners, profileId]);
  const cap = settings.maxQualityHeight ?? 1080;

  const itemFor = useCallback((video: ApprovedVideo) => mine.find((item) => item.videoId === video.youtubeVideoId), [mine]);
  const options = useCallback((video: ApprovedVideo) => downloadService.options(video, cap), [cap]);
  const start = useCallback(
    async (video: ApprovedVideo, height: number) => {
      if (!profileId) throw new Error('Choose a profile first.');
      await downloadService.save({ profileId, video, height, settings });
      await refresh();
    },
    [profileId, settings, refresh],
  );

  return { enabled: settings.downloadsEnabled && Boolean(profileId), mine, itemFor, options, start };
}
