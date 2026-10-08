import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChildProfile } from '../../types';
import type { PlaybackOverride } from '../../types';
import { overridePresets } from '../../services/playbackOverrideService';
import type { OverridePreset } from '../../services/playbackOverrideService.type';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentChildren.style';

export function OverrideCard({
  profile,
  profileId,
  activeOverrides,
  scheduleAccess,
  setScheduleAccess,
  onGrantOverride,
  onRevokeOverride,
}: {
  profile: ChildProfile;
  profileId: string;
  activeOverrides: PlaybackOverride[];
  scheduleAccess: boolean;
  setScheduleAccess: (value: boolean) => void;
  onGrantOverride: (profileId: string, preset: OverridePreset, grantsScheduleAccess: boolean) => Promise<void>;
  onRevokeOverride: (profileId: string) => Promise<void>;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Temporary parent override</Text>
      <Text style={styles.helper}>
        Adds time for a limited period. {profile.name}’s configured limit never changes.
      </Text>
      {activeOverrides.length ? (
        <View style={styles.overrideActive}>
          <Feather name="clock" size={15} color={colors.mintDark} />
          <Text style={styles.overrideActiveText}>
            Active until {new Date(activeOverrides[0].expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Text>
          <FocusablePressable accessibilityLabel="End override now" style={styles.smallAction} onPress={() => void onRevokeOverride(profileId)}>
            <Text style={styles.smallActionText}>End now</Text>
          </FocusablePressable>
        </View>
      ) : null}
      <View style={styles.chipRow}>
        {overridePresets.map((preset) => (
          <FocusablePressable
            key={preset.id}
            accessibilityLabel={preset.label}
            style={styles.chip}
            onPress={() => void onGrantOverride(profileId, preset, scheduleAccess)}
          >
            <Text style={styles.chipText}>{preset.label}</Text>
          </FocusablePressable>
        ))}
      </View>
      <FocusablePressable
        accessibilityLabel="Also allow outside allowed hours"
        style={[styles.chip, scheduleAccess && styles.chipActive, styles.wideChip]}
        onPress={() => setScheduleAccess(!scheduleAccess)}
      >
        <Feather name={scheduleAccess ? 'check-square' : 'square'} size={15} color={scheduleAccess ? colors.ink : colors.muted} />
        <Text style={[styles.chipText, scheduleAccess && styles.chipTextActive]}>Also allow outside allowed hours / bedtime</Text>
      </FocusablePressable>
    </View>
  );
}
