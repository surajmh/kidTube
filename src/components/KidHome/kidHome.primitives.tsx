import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';

import useStyles from './kidHome.style';

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <FocusablePressable
      accessibilityLabel={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </FocusablePressable>
  );
}

export function Notice({ notice, action }: { notice: string; action?: { label: string; onPress: () => void } | null }) {
  const styles = useStyles();
  const { ICON } = useTheme();
  return (
    <View style={styles.notice}>
      <Feather name="info" size={16} color={ICON.ink} />
      <Text style={styles.noticeText}>{notice}</Text>
      {action ? (
        <FocusablePressable
          accessibilityLabel={action.label}
          style={styles.noticeAction}
          onPress={action.onPress}
        >
          <Text style={styles.noticeActionText}>{action.label}</Text>
        </FocusablePressable>
      ) : null}
    </View>
  );
}

export function Empty({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  const styles = useStyles();
  const { ICON } = useTheme();
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={30} color={ICON.inkDim} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}
