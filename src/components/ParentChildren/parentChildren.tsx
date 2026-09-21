import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { describeApprovalExpiry, describeApprovalTarget } from '../../services/approvalRules';
import { overridePresets } from '../../services/playbackOverrideService';
import { Avatar } from '../Avatar';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentChildren.style';
import { useParentChildren } from './parentChildren.hook';
import { minutesToTime, shiftWindow, windowForDay } from './parentChildren.helper';
import { DAY_LABELS, LIMIT_OPTIONS, PARENT_CHILDREN_COPY } from './parentChildren.constant';
import { ParentChildrenProps } from './parentChildren.type';

export function ParentChildrenPanel({
  profiles,
  initialProfileId,
  channels,
  videos,
  categories,
  approvals,
  rules,
  policyOverrides,
  globalSettings,
  overrides,
  onSetPolicy,
  onToggleInherit,
  onToggleCategory,
  onToggleGrantChannel,
  onToggleBlockChannel,
  onToggleGrantVideo,
  onToggleBlockVideo,
  onGrantOverride,
  onRevokeOverride,
  onRevokeApproval,
  profilesSlot,
}: ParentChildrenProps) {
  const children = useParentChildren({
    profiles,
    initialProfileId,
    rules,
    policyOverrides,
    globalSettings,
    overrides,
    approvals,
    onSetPolicy,
  });
  const {
    setSelectedId,
    scheduleAccess,
    setScheduleAccess,
    profile,
    profileId,
    childRules,
    override,
    summary,
    activeOverrides,
    childApprovals,
    patch,
  } = children;

  if (!profile) {
    return <Text style={styles.helper}>{PARENT_CHILDREN_COPY.noProfiles}</Text>;
  }

  return (
    <View>
      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>{PARENT_CHILDREN_COPY.title}</Text>
          <Text style={styles.subtitle}>{PARENT_CHILDREN_COPY.subtitle}</Text>
        </View>
        <Feather name="users" size={22} color={colors.purple} />
      </View>

      <View style={styles.profileRow}>
        {profiles.map((item) => (
          <FocusablePressable
            key={item.id}
            accessibilityLabel={`Configure ${item.name}`}
            style={[styles.profileChip, item.id === profileId && styles.profileChipActive]}
            onPress={() => setSelectedId(item.id)}
          >
            <Avatar profile={item} size={30} />
            <Text style={[styles.profileChipText, item.id === profileId && styles.profileChipTextActive]}>{item.name}</Text>
          </FocusablePressable>
        ))}
      </View>

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
          <Feather name={scheduleAccess ? 'check-square' : 'square'} size={15} color={scheduleAccess ? colors.purple : colors.muted} />
          <Text style={[styles.chipText, scheduleAccess && styles.chipTextActive]}>Also allow outside allowed hours / bedtime</Text>
        </FocusablePressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Categories for {profile.name}</Text>
        <Text style={styles.helper}>
          Turn a category off and any video in it is blocked for this child only. Global approvals stay untouched.
        </Text>
        <View style={styles.chipRow}>
          {categories.map((category) => {
            const blocked = childRules.blockedCategoryIds.includes(category.id);
            return (
              <FocusablePressable
                key={category.id}
                accessibilityLabel={`${category.name} ${blocked ? 'disabled' : 'enabled'}`}
                style={[styles.chip, !blocked && styles.chipActive]}
                onPress={() => void onToggleCategory(profileId, category.id)}
              >
                <Feather name={blocked ? 'square' : 'check-square'} size={15} color={blocked ? colors.muted : colors.purple} />
                <Text style={[styles.chipText, !blocked && styles.chipTextActive]}>{category.name}</Text>
              </FocusablePressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Channel rules for {profile.name}</Text>
        <Text style={styles.helper}>
          ✓ means this child may watch the channel even if it is not approved family-wide. ✗ blocks it for this child.
        </Text>
        {channels.length === 0 ? (
          <Text style={styles.helper}>No channels in the family library yet.</Text>
        ) : (
          channels.map((channel) => {
            const granted = childRules.grantedChannelIds.includes(channel.channelId);
            const blocked = childRules.blockedChannelIds.includes(channel.channelId);
            return (
              <View key={channel.id} style={styles.ruleRow}>
                <View style={styles.ruleInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{channel.name}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {channel.approved ? 'Approved family-wide' : 'Not approved family-wide'}
                  </Text>
                </View>
                <FocusablePressable
                  accessibilityLabel={`Allow ${channel.name}`}
                  style={[styles.ruleToggle, granted && styles.ruleToggleGrant]}
                  onPress={() => void onToggleGrantChannel(profileId, channel.channelId)}
                >
                  <Feather name={granted ? 'check' : 'plus'} size={15} color={granted ? '#fff' : colors.mintDark} />
                </FocusablePressable>
                <FocusablePressable
                  accessibilityLabel={`Block ${channel.name}`}
                  style={[styles.ruleToggle, blocked && styles.ruleToggleBlock]}
                  onPress={() => void onToggleBlockChannel(profileId, channel.channelId)}
                >
                  <Feather name={blocked ? 'x' : 'minus'} size={15} color={blocked ? '#fff' : colors.danger} />
                </FocusablePressable>
              </View>
            );
          })
        )}
        <FocusablePressable
          accessibilityLabel="Inherit family approvals"
          style={[styles.chip, childRules.inheritGlobalApprovals && styles.chipActive, styles.wideChip]}
          onPress={() => void onToggleInherit(profileId, !childRules.inheritGlobalApprovals)}
        >
          <Feather name={childRules.inheritGlobalApprovals ? 'check-square' : 'square'} size={15} color={childRules.inheritGlobalApprovals ? colors.purple : colors.muted} />
          <Text style={[styles.chipText, childRules.inheritGlobalApprovals && styles.chipTextActive]}>
            Use the family-wide library (uncheck to only allow this child’s own picks)
          </Text>
        </FocusablePressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Video rules for {profile.name}</Text>
        <Text style={styles.helper}>Per-video grants and blocks. A block always wins.</Text>
        {videos.length === 0 ? (
          <Text style={styles.helper}>No videos in the family library yet.</Text>
        ) : (
          videos.slice(0, 12).map((video) => {
            const granted = childRules.grantedVideoIds.includes(video.youtubeVideoId);
            const blocked = childRules.blockedVideoIds.includes(video.youtubeVideoId);
            return (
              <View key={video.id} style={styles.ruleRow}>
                <View style={styles.ruleInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{video.title}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {video.approved && !video.candidate ? 'Approved family-wide' : 'Not approved family-wide'}
                  </Text>
                </View>
                <FocusablePressable
                  accessibilityLabel={`Allow ${video.title}`}
                  style={[styles.ruleToggle, granted && styles.ruleToggleGrant]}
                  onPress={() => void onToggleGrantVideo(profileId, video.youtubeVideoId)}
                >
                  <Feather name={granted ? 'check' : 'plus'} size={15} color={granted ? '#fff' : colors.mintDark} />
                </FocusablePressable>
                <FocusablePressable
                  accessibilityLabel={`Block ${video.title}`}
                  style={[styles.ruleToggle, blocked && styles.ruleToggleBlock]}
                  onPress={() => void onToggleBlockVideo(profileId, video.youtubeVideoId)}
                >
                  <Feather name={blocked ? 'x' : 'minus'} size={15} color={blocked ? '#fff' : colors.danger} />
                </FocusablePressable>
              </View>
            );
          })
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Temporary approvals for {profile.name}</Text>
        {childApprovals.length === 0 ? (
          <Text style={styles.helper}>No temporary approvals. Approvals you grant from Requests appear here until they expire.</Text>
        ) : (
          childApprovals.map((approval) => (
            <View key={approval.id} style={styles.ruleRow}>
              <View style={styles.ruleInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{describeApprovalTarget(approval.target)}</Text>
                <Text style={styles.rowMeta}>
                  {approval.duration.replace('_', ' ')} · {describeApprovalExpiry(approval)}
                </Text>
              </View>
              <FocusablePressable accessibilityLabel="Revoke approval" style={styles.ruleToggle} onPress={() => void onRevokeApproval(approval)}>
                <Feather name="trash-2" size={15} color={colors.danger} />
              </FocusablePressable>
            </View>
          ))
        )}
      </View>

      {profilesSlot}
    </View>
  );
}

function AllowedWindowEditor({
  schedules,
  onChange,
}: {
  schedules: Record<string, { startMinutes: number; endMinutes: number }[]>;
  onChange: (schedules: Record<string, { startMinutes: number; endMinutes: number }[]>) => void;
}) {
  const [day, setDay] = useState(new Date().getDay());
  const window = windowForDay(schedules, day);

  function shift(field: 'startMinutes' | 'endMinutes', deltaMinutes: number) {
    onChange(shiftWindow(schedules, day, field, deltaMinutes));
  }

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
              <Feather name="minus" size={15} color={colors.purple} />
            </FocusablePressable>
            <Text style={styles.stepValue}>{minutesToTime(window.startMinutes)}</Text>
            <FocusablePressable accessibilityLabel="Later start" style={styles.stepButton} onPress={() => shift('startMinutes', 30)}>
              <Feather name="plus" size={15} color={colors.purple} />
            </FocusablePressable>
          </View>
        </View>
        <View style={styles.windowField}>
          <Text style={styles.fieldLabel}>END</Text>
          <View style={styles.stepper}>
            <FocusablePressable accessibilityLabel="Earlier end" style={styles.stepButton} onPress={() => shift('endMinutes', -30)}>
              <Feather name="minus" size={15} color={colors.purple} />
            </FocusablePressable>
            <Text style={styles.stepValue}>{minutesToTime(window.endMinutes)}</Text>
            <FocusablePressable accessibilityLabel="Later end" style={styles.stepButton} onPress={() => shift('endMinutes', 30)}>
              <Feather name="plus" size={15} color={colors.purple} />
            </FocusablePressable>
          </View>
        </View>
      </View>
      <Text style={styles.helper}>Tap the buttons with a remote — no keyboard needed.</Text>
    </View>
  );
}
