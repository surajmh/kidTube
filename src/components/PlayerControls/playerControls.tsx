import React, { useRef, useState } from 'react';
import { ActivityIndicator, GestureResponderEvent, PanResponder, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatDuration, yt } from '../youtube/theme';
import styles from './playerControls.style';
import { usePlayerControls } from './playerControls.hook';
import { elapsedSeconds, progressFromTouch, seekTarget } from './playerControls.helper';
import { SKIP_MS } from './playerControls.constant';
import { PlayerControlsProps } from './playerControls.type';

/**
 * The control overlay that sits on the video surface, in the shape a viewer expects: tap to
 * reveal, skip and play/pause in the centre, scrubber and times along the bottom.
 */
export function PlayerControls({
  isPlaying,
  isBuffering,
  progress,
  durationMs,
  fullscreen,
  canSkipNext = false,
  onTogglePlay,
  onSeek,
  onToggleFullscreen,
  onSkipNext,
}: PlayerControlsProps) {
  const { visible, toggleVisible, keepAlive } = usePlayerControls(isPlaying);
  const [width, setWidth] = useState(0);
  // While a drag is in flight the bar follows the finger rather than the player, which only
  // reports a new position after the seek lands.
  const [scrubbing, setScrubbing] = useState<number | null>(null);

  const widthRef = useRef(0);
  const durationRef = useRef(durationMs);
  widthRef.current = width;
  durationRef.current = durationMs;

  const displayed = scrubbing ?? progress;
  const positionMs = durationMs * displayed;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event: GestureResponderEvent) => {
        setScrubbing(progressFromTouch(event.nativeEvent.locationX, widthRef.current));
      },
      onPanResponderMove: (event: GestureResponderEvent) => {
        setScrubbing(progressFromTouch(event.nativeEvent.locationX, widthRef.current));
      },
      onPanResponderRelease: (event: GestureResponderEvent) => {
        const fraction = progressFromTouch(event.nativeEvent.locationX, widthRef.current);
        setScrubbing(null);
        onSeek(fraction * durationRef.current);
      },
      onPanResponderTerminate: () => setScrubbing(null),
    }),
  ).current;

  function skip(deltaMs: number) {
    keepAlive();
    onSeek(seekTarget(positionMs, deltaMs, durationMs));
  }

  return (
    <View style={styles.surface}>
      {/* The whole surface is the show/hide target, as on YouTube. */}
      <Pressable style={styles.surface} onPress={toggleVisible} accessibilityLabel="Show player controls" />

      {visible ? (
        <View style={styles.surface} pointerEvents="box-none">
          <View style={styles.scrim} pointerEvents="none" />

          <View style={styles.centreRow} pointerEvents="box-none">
            <Pressable
              accessibilityLabel="Rewind 10 seconds"
              style={styles.centreButton}
              onPress={() => skip(-SKIP_MS)}
            >
              <Feather name="rotate-ccw" size={28} color="#FFFFFF" />
            </Pressable>

            <Pressable
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={styles.playButton}
              onPress={() => { keepAlive(); onTogglePlay(); }}
            >
              {isBuffering
                ? <ActivityIndicator color="#FFFFFF" />
                : <Feather name={isPlaying ? 'pause' : 'play'} size={32} color="#FFFFFF" />}
            </Pressable>

            <Pressable
              accessibilityLabel="Forward 10 seconds"
              style={styles.centreButton}
              onPress={() => skip(SKIP_MS)}
            >
              <Feather name="rotate-cw" size={28} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.bottomBar} pointerEvents="box-none">
            <View style={styles.scrubber} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} {...pan.panHandlers}>
              <View style={styles.track} />
              <View style={[styles.fill, { width: Math.max(displayed, 0) * width }]} />
              <View style={[styles.knob, { left: Math.max(displayed, 0) * width }]} />
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatDuration(elapsedSeconds(displayed, durationMs)) ?? '0:00'}</Text>
              <Text style={styles.time}>/ {formatDuration(Math.round(durationMs / 1000)) ?? '0:00'}</Text>
              <View style={styles.spacer} />
              {canSkipNext && onSkipNext ? (
                <Pressable accessibilityLabel="Next video" style={styles.iconButton} onPress={() => { keepAlive(); onSkipNext(); }}>
                  <Feather name="skip-forward" size={19} color="#FFFFFF" />
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                style={styles.iconButton}
                onPress={() => { keepAlive(); onToggleFullscreen(); }}
              >
                <Feather name={fullscreen ? 'minimize' : 'maximize'} size={18} color={yt.text} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
