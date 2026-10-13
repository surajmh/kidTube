import type { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import type { PlaybackSettings } from '../../types';
import type { ChildDownloads } from '../../hooks/useChildDownloads.type';

export type PlayerScreenProps = {
  minimized?: boolean;
  miniPlayerBottomInset?: number;
  onMinimize?: () => void;
  onExpand?: () => void;
  onPictureInPictureChange?: (active: boolean) => void;
  video: ApprovedVideo;
  profile?: ChildProfile;
  settings: PlaybackSettings;
  nextVideo?: ApprovedVideo;
  upNextVideos?: ApprovedVideo[];
  onBrowseChannel?: () => void;
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
