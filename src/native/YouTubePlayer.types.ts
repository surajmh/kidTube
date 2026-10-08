import type { ViewProps } from 'react-native';

export type YouTubePlaybackEvent = {
  videoId?: string;
  position?: number;
  duration?: number;
  bufferedPosition?: number;
  playbackSpeed?: number;
  offline?: boolean;
  captions?: { id: string; label: string }[];
  qualityHeights?: number[];
  isPlaying?: boolean;
  message?: string;
  code?: string;
  /** Recovery progress: which attempt is running and how long it will wait. */
  attempt?: number;
  attempts?: number;
  delayMs?: number;
};

export type YouTubePlayerProps = ViewProps & {
  videoId?: string;
  autoplay?: boolean;
  fullscreen?: boolean;
  volume?: number;
  playbackSpeed?: number;
  qualityHeight?: number;
  maxQualityHeight?: number;
  captionTrack?: string | null;
  captionScale?: number;
  onTracksChanged?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onLoad?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onReady?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onPlay?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onPause?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onBuffer?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onProgress?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  /** Emitted before each bounded recovery attempt (network drop, expired stream). */
  onRetry?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onEnd?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onEnded?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
  onError?: (event: { nativeEvent: YouTubePlaybackEvent }) => void;
};
