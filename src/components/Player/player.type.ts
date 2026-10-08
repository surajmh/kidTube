import type { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import type { PlaybackSettings } from '../../types';

export type PlayerScreenProps = {
  video: ApprovedVideo;
  profile?: ChildProfile;
  settings: PlaybackSettings;
  nextVideo?: ApprovedVideo;
  retrySignal?: number;
  queueLabel?: string;
  offlineExpected?: boolean;
  onNextVideo: (video: ApprovedVideo) => void;
  onUsageChange: () => void;
  onBack: () => void;
  onSaveHistory: (item: WatchHistory) => void;
  onPlaybackCompleted: () => void;
  onParentOverride?: () => void;
};
