import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';

import { useStyles as useStyles } from '../AppShell/appShell.style';
import { SecondaryButton } from '../AppShell/appFormControls';
import useOptionStyles from './player.style';
import { usePlayerScrubber } from './playerScrubber.hook';

/** YouTube-style scrubber: buffered track, played bar, thumb appears only while dragging. */
export function PlayerScrubber({ positionMs, bufferedMs, durationMs, onSeek }: {
  positionMs: number;
  bufferedMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
}) {
  const styles = useStyles();
  const { trackRef, dragMs, setDragMs, enabled, played, buffered, positionFrom, measure } = usePlayerScrubber(positionMs, bufferedMs, durationMs);
  return (
    <View
      ref={trackRef}
      style={styles.scrubber}
      accessibilityLabel="Seek slider"
      onLayout={measure}
      onStartShouldSetResponder={() => enabled}
      onMoveShouldSetResponder={() => enabled}
      onResponderGrant={(event) => { const ms = positionFrom(event.nativeEvent.pageX); if (ms !== null) setDragMs(ms); }}
      onResponderMove={(event) => { const ms = positionFrom(event.nativeEvent.pageX); if (ms !== null) setDragMs(ms); }}
      onResponderRelease={(event) => {
        const ms = positionFrom(event.nativeEvent.pageX);
        setDragMs(null);
        if (ms !== null) onSeek(ms);
      }}
      onResponderTerminate={() => setDragMs(null)}
    >
      <View style={styles.scrubTrack}>
        <View style={[styles.scrubFill, styles.scrubBuffered, { width: `${buffered * 100}%` }]} />
        <View style={[styles.scrubFill, styles.scrubPlayed, { width: `${played * 100}%` }]} />
      </View>
      <View style={[styles.scrubThumb, { left: `${played * 100}%`, opacity: dragMs !== null ? 1 : 0 }]} />
    </View>
  );
}

export function PlayerHeader({ onBack }: { onBack: () => void }) {
  const styles = useStyles();
  const { yt } = useTheme();
  return <View style={styles.playerTopBar}><FocusablePressable accessibilityLabel="Back to videos" style={styles.backButton} onPress={onBack}><Feather name="arrow-down" size={24} color={yt.text} /></FocusablePressable></View>;
}

export function BlockedPlayer({ onBack, message }: { onBack: () => void; message: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.blockedPlayer}><View style={styles.blockedIcon}><Feather name="shield-off" size={30} color={colors.danger} /></View><Text style={styles.blockedTitle}>Playback blocked</Text><Text style={styles.blockedBody}>{message}</Text><SecondaryButton label="Go back" onPress={onBack} /></View>;
}

export function ChoiceRow<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  const optionStyles = useOptionStyles();
  return <View><Text style={optionStyles.label}>{label}</Text><View style={optionStyles.row}>
    {options.map((option) => <FocusablePressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value)} style={[optionStyles.choice, option.value === value && optionStyles.selected]}>
      <Text style={optionStyles.text}>{option.label}</Text>
    </FocusablePressable>)}
  </View></View>;
}
