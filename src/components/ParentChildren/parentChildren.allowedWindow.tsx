import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentChildren.style';
import { minutesToTime } from './parentChildren.helper';
import { DAY_LABELS } from './parentChildren.constant';
import { useAllowedWindow } from './parentChildren.allowedWindow.hook';

export function AllowedWindowEditor({
  schedules,
  onChange,
}: {
  schedules: Record<string, { startMinutes: number; endMinutes: number }[]>;
  onChange: (schedules: Record<string, { startMinutes: number; endMinutes: number }[]>) => void;
}) {
  const { day, setDay, window, shift } = useAllowedWindow(schedules, onChange);

  return (
    <View style={styles.windowEditor}>
      <View style={styles.chipRow}>
        {DAY_LABELS.map(({ value, label }) => (
          <FocusablePressable
            key={value}
            accessibilityLabel={label}
            style={[styles.dayChip, day === value && styles.chipActive]}
            onPress={() => setDay(value)}
          >
            <Text style={[styles.chipText, day === value && styles.chipTextActive]}>{label}</Text>
          </FocusablePressable>
        ))}
      </View>
      <View style={styles.windowRow}>
        <View style={styles.windowField}>
          <Text style={styles.fieldLabel}>START</Text>
          <View style={styles.stepper}>
            <FocusablePressable accessibilityLabel="Earlier start" style={styles.stepButton} onPress={() => shift('startMinutes', -30)}>
              <Feather name="minus" size={15} color={colors.ink} />
            </FocusablePressable>
            <Text style={styles.stepValue}>{minutesToTime(window.startMinutes)}</Text>
            <FocusablePressable accessibilityLabel="Later start" style={styles.stepButton} onPress={() => shift('startMinutes', 30)}>
              <Feather name="plus" size={15} color={colors.ink} />
            </FocusablePressable>
          </View>
        </View>
        <View style={styles.windowField}>
          <Text style={styles.fieldLabel}>END</Text>
          <View style={styles.stepper}>
            <FocusablePressable accessibilityLabel="Earlier end" style={styles.stepButton} onPress={() => shift('endMinutes', -30)}>
              <Feather name="minus" size={15} color={colors.ink} />
            </FocusablePressable>
            <Text style={styles.stepValue}>{minutesToTime(window.endMinutes)}</Text>
            <FocusablePressable accessibilityLabel="Later end" style={styles.stepButton} onPress={() => shift('endMinutes', 30)}>
              <Feather name="plus" size={15} color={colors.ink} />
            </FocusablePressable>
          </View>
        </View>
      </View>
      <Text style={styles.helper}>Tap the buttons with a remote — no keyboard needed.</Text>
    </View>
  );
}
