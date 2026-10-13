import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SettingsChoice, SettingsGroup } from '../SettingsMenu';

import useStyles from './parentChildren.style';
import { useParentChildren } from './parentChildren.hook';
import { PARENT_CHILDREN_COPY } from './parentChildren.constant';
import { ParentChildrenProps } from './parentChildren.type';
import { LimitsCard } from './parentChildren.limitsCard';
import { OverrideCard } from './parentChildren.overrideCard';
import { ApprovalsCard, CategoriesCard, ChannelRulesCard, VideoRulesCard } from './parentChildren.rulesCards';

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
  const styles = useStyles();
  const { colors } = useTheme();
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

  const cardProps = { profile, profileId, childRules };

  return (
    <View>
      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>{PARENT_CHILDREN_COPY.title}</Text>
          <Text style={styles.subtitle}>{PARENT_CHILDREN_COPY.subtitle}</Text>
        </View>
        <Feather name="users" size={22} color={colors.ink} />
      </View>

      <SettingsChoice label="Configure child" value={profileId} options={profiles.map((item) => ({ value: item.id, label: item.name }))} onChange={setSelectedId} />

      <LimitsCard
        profile={profile}
        profileId={profileId}
        override={override}
        summary={summary}
        globalSettings={globalSettings}
        patch={patch}
        onSetPolicy={onSetPolicy}
      />

      <OverrideCard
        profile={profile}
        profileId={profileId}
        activeOverrides={activeOverrides}
        scheduleAccess={scheduleAccess}
        setScheduleAccess={setScheduleAccess}
        onGrantOverride={onGrantOverride}
        onRevokeOverride={onRevokeOverride}
      />

      <CategoriesCard {...cardProps} categories={categories} onToggleCategory={onToggleCategory} />

      <ChannelRulesCard
        {...cardProps}
        channels={channels}
        onToggleGrantChannel={onToggleGrantChannel}
        onToggleBlockChannel={onToggleBlockChannel}
        onToggleInherit={onToggleInherit}
      />

      <VideoRulesCard
        {...cardProps}
        videos={videos}
        onToggleGrantVideo={onToggleGrantVideo}
        onToggleBlockVideo={onToggleBlockVideo}
      />

      <ApprovalsCard profile={profile} childApprovals={childApprovals} onRevokeApproval={onRevokeApproval} />

      <SettingsGroup label="Manage child profiles">{profilesSlot}</SettingsGroup>
    </View>
  );
}
