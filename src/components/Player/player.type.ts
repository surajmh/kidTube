import type { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import type { PlaybackSettings } from '../../types';
import type { ChildDownloads } from '../../hooks/useChildDownloads.type';

export type PlayerScreenProps = {
  video: ApprovedVideo;
  profile?: ChildProfile;
  settings: PlaybackSettings;
  nextVideo?: ApprovedVideo;
  retrySignal?: number;
  queueLabel?: string;
  offlineExpected?: boolean;
  downloads?: ChildDownloads;
  onNextVideo: (video: ApprovedVideo) => void;
  onUsageChange: () => void;
  onBack: () => void;
  onSaveHistory: (item: WatchHistory) => void;
  onPlaybackCompleted: () => void;
  onParentOverride?: () => void;
};
