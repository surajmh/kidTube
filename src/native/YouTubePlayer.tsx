import React, { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { requireNativeViewManager, requireOptionalNativeModule } from 'expo-modules-core';
import type { YouTubePlayerProps } from './YouTubePlayer.types';
import { nativeYouTubePlayerAdapter } from './YouTubePlayerAdapter';
import { playerErrorCodeOf } from '../services/playerErrors';

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
  /*
   * Held in a ref, and deliberately NOT a dependency below.
   *
   * Callers pass an inline arrow, so its identity changes on every render, and this component
   * re-renders on every progress tick. As a dependency it re-ran the effect constantly, and each
   * play() bumps the native request generation, so every resolve was superseded before its result
   * could be applied -- the player buffered forever and reported nothing.
   */
  const onErrorRef = useRef(props.onError);
  onErrorRef.current = props.onError;

  useEffect(() => {
    if (!NativeYouTubePlayer || !videoId || !autoplay) return;
    void nativeYouTubePlayerAdapter.play(videoId).catch((caught: unknown) => {
      // Swallowing this is what let a wrong-thread crash look like a video that merely never
      // started: no message, no retry offered, nothing in the logs. A start that fails is an
      // error like any other and goes down the same channel the native player uses.
      onErrorRef.current?.({
        nativeEvent: {
          videoId,
          code: playerErrorCodeOf(caught),
          message: caught instanceof Error ? caught.message : undefined,
        },
      });
    });
    return () => {
      void nativeYouTubePlayerAdapter.stop().catch(() => undefined);
    };
  }, [autoplay, videoId]);

  if (!NativeYouTubePlayer) {
    return <View {...props} />;
  }
  return <NativeYouTubePlayer {...props} videoId={videoId} autoplay={false} onEnd={props.onEnd ?? onEnded} />;
}
