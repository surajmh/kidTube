export type PlayerControlsProps = {
  isPlaying: boolean;
  isBuffering: boolean;
  /** 0..1. */
  progress: number;
  durationMs: number;
  fullscreen: boolean;
  /** Hidden when there is nothing to play next. */
  canSkipNext?: boolean;
  onTogglePlay: () => void;
  onSeek: (positionMs: number) => void;
  onToggleFullscreen: () => void;
  onSkipNext?: () => void;
};

export type PlayerControlsHook = {
  visible: boolean;
  /** Tap on the video surface: reveals the controls, or hides them if already up. */
  toggleVisible: () => void;
  /** Called after any control is used, so acting on one does not let them vanish mid-gesture. */
  keepAlive: () => void;
};
