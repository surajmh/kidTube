import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { YouTubePlayerProps } from './YouTubePlayer.types';
import { nativeYouTubePlayerAdapter } from './YouTubePlayerAdapter';

const NativeYouTubePlayer = Platform.OS === 'android'
  ? (() => {
      try {
        return requireNativeViewManager<YouTubePlayerProps>('NestlingYouTubePlayer');
      } catch {
        return null;
      }
    })()
  : null;

export const isNativeYouTubePlayerAvailable =
  Platform.OS === 'android' && Boolean(requireOptionalNativeModule('NestlingYouTubePlayer'));

export function YouTubePlayer({ onEnded, videoId, autoplay = true, ...props }: YouTubePlayerProps) {
  useEffect(() => {
    if (!NativeYouTubePlayer || !videoId || !autoplay) return;
    void nativeYouTubePlayerAdapter.play(videoId).catch(() => undefined);
    return () => {
      void nativeYouTubePlayerAdapter.stop().catch(() => undefined);
    };
  }, [autoplay, videoId]);

  if (!NativeYouTubePlayer) {
    return <View {...props} />;
  }
  return <NativeYouTubePlayer {...props} videoId={videoId} autoplay={false} onEnd={props.onEnd ?? onEnded} />;
}
