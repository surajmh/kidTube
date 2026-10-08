import React from 'react';
import { Text, View } from 'react-native';
import { ChildProfile } from '../../types';
import type { PlaybackSettings } from '../../types';
import type { ProfilePolicyOverrides } from '../../types';
import { describeProfilePolicy } from '../../services/profilePolicyService';
import { FocusablePressable } from '../tv';
import styles from './parentChildren.style';
import { minutesToTime } from './parentChildren.helper';
import { LIMIT_OPTIONS } from './parentChildren.constant';
import { AllowedWindowEditor } from './parentChildren.allowedWindow';

export function LimitsCard({
  profile,
  profileId,
  override,
  summary,
  globalSettings,
  patch,
  onSetPolicy,
}: {
  profile: ChildProfile;
  profileId: string;
  override: ProfilePolicyOverrides | undefined;
  summary: ReturnType<typeof describeProfilePolicy>;
  globalSettings: PlaybackSettings;
  patch: (patch: ProfilePolicyOverrides) => Promise<void>;
  onSetPolicy: (profileId: string, patch: ProfilePolicyOverrides | null) => Promise<void>;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{profile.name}’s playback limits</Text>
        {override ? (
          <FocusablePressable accessibilityLabel="Use family defaults" style={styles.smallAction} onPress={() => void onSetPolicy(profileId, null)}>
            <Text style={styles.smallActionText}>Use family defaults</Text>
          </FocusablePressable>
        ) : null}
      </View>
      <Text style={styles.helper}>
        {override
          ? 'This child has their own overrides. Anything you have not changed still follows the family defaults.'
          : 'Currently following the family defaults. Change anything below to give this child their own limits.'}
      </Text>

      <Text style={styles.fieldLabel}>DAILY LIMIT</Text>
      <View style={styles.chipRow}>
        {LIMIT_OPTIONS.map((minutes) => (
          <FocusablePressable
            key={minutes}
            accessibilityLabel={`${minutes} minutes`}
            style={[styles.chip, summary.dailyLimitMinutes === minutes && styles.chipActive]}
            onPress={() => void patch({ dailyLimitMinutes: minutes })}
          >
            <Text style={[styles.chipText, summary.dailyLimitMinutes === minutes && styles.chipTextActive]}>{minutes} min</Text>
          </FocusablePressable>
        ))}
        <FocusablePressable
          accessibilityLabel="Unlimited"
          style={[styles.chip, summary.dailyLimitMinutes === null && styles.chipActive]}
          onPress={() => void patch({ dailyLimitMinutes: null })}
        >
          <Text style={[styles.chipText, summary.dailyLimitMinutes === null && styles.chipTextActive]}>Unlimited</Text>
        </FocusablePressable>
      </View>

      <Text style={styles.fieldLabel}>AUTOPLAY</Text>
      <View style={styles.chipRow}>
        {[true, false].map((value) => (
          <FocusablePressable
            key={String(value)}
            accessibilityLabel={value ? 'Autoplay on' : 'Autoplay off'}
            style={[styles.chip, summary.autoplay === value && styles.chipActive]}
            onPress={() => void patch({ autoplay: value })}
          >
            <Text style={[styles.chipText, summary.autoplay === value && styles.chipTextActive]}>{value ? 'On' : 'Off'}</Text>
          </FocusablePressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>ALLOWED HOURS</Text>
      <View style={styles.chipRow}>
        <FocusablePressable
          accessibilityLabel="Use family allowed hours"
          style={[styles.chip, !summary.allowedHoursEnabled && styles.chipActive]}
          onPress={() => void patch({ allowedHoursEnabled: false })}
        >
          <Text style={[styles.chipText, !summary.allowedHoursEnabled && styles.chipTextActive]}>Any time</Text>
        </FocusablePressable>
        <FocusablePressable
          accessibilityLabel="Limit to a daily window"
          style={[styles.chip, summary.allowedHoursEnabled && styles.chipActive]}
          onPress={() =>
            void patch({
              allowedHoursEnabled: true,
              schedules: override?.schedules ?? globalSettings.schedules,
            })
          }
        >
          <Text style={[styles.chipText, summary.allowedHoursEnabled && styles.chipTextActive]}>Daily window</Text>
        </FocusablePressable>
      </View>
      {summary.allowedHoursEnabled ? (
        <AllowedWindowEditor
          schedules={override?.schedules ?? globalSettings.schedules}
          onChange={(schedules) => void patch({ schedules })}
        />
      ) : null}

      <Text style={styles.fieldLabel}>BEDTIME</Text>
      <View style={styles.chipRow}>
        <FocusablePressable
          accessibilityLabel="Bedtime paused"
          style={[styles.chip, !summary.bedtimeEnabled && styles.chipActive]}
          onPress={() => void patch({ bedtimeEnabled: false })}
        >
          <Text style={[styles.chipText, !summary.bedtimeEnabled && styles.chipTextActive]}>Off</Text>
        </FocusablePressable>
        <FocusablePressable
          accessibilityLabel="Bedtime on"
          style={[styles.chip, summary.bedtimeEnabled && styles.chipActive]}
          onPress={() =>
            void patch({
              bedtimeEnabled: true,
              bedtimeStartMinutes: override?.bedtimeStartMinutes ?? globalSettings.bedtimeStartMinutes,
              bedtimeEndMinutes: override?.bedtimeEndMinutes ?? globalSettings.bedtimeEndMinutes,
            })
          }
        >
          <Text style={[styles.chipText, summary.bedtimeEnabled && styles.chipTextActive]}>
            {minutesToTime(override?.bedtimeStartMinutes ?? globalSettings.bedtimeStartMinutes)} – {minutesToTime(override?.bedtimeEndMinutes ?? globalSettings.bedtimeEndMinutes)}
          </Text>
        </FocusablePressable>
      </View>
    </View>
  );
}
