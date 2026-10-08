import React, { useEffect, useRef } from 'react';
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

export function YouTubePlayer({ onEnded, onError, videoId, autoplay = true, ...props }: YouTubePlayerProps) {
  // A ref, not a dependency: `onError` is a fresh function every render, and this effect must only
  // re-run when the video itself changes, not on every parent re-render (that would stop and
  // restart playback constantly).
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!NativeYouTubePlayer || !videoId || !autoplay) return;
    // A rejected `play()` (the native allow list refusing this id, or any other startup failure)
    // must reach the same error handling as a mid-playback failure — silently swallowing it left
    // the screen looking like it was still loading, forever, with no way out.
    let active = true;
    void nativeYouTubePlayerAdapter.play(videoId).catch((error: unknown) => {
      if (!active) return;
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
      const message = error instanceof Error ? error.message : undefined;
      onErrorRef.current?.({ nativeEvent: { code, message } });
    });
    return () => {
      active = false;
      void nativeYouTubePlayerAdapter.stop().catch(() => undefined);
    };
  }, [autoplay, videoId]);

  if (!NativeYouTubePlayer) {
    return <View {...props} />;
  }
  return <NativeYouTubePlayer {...props} videoId={videoId} autoplay={false} onEnd={props.onEnd ?? onEnded} onError={onError} />;
}
