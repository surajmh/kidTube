import React from 'react';
import { Text,View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel,ApprovedVideo,ChildProfile } from '../../types';
import type { ContentApproval,ContentCategory } from '../../types';
import { describeApprovalExpiry,describeApprovalTarget } from '../../services/approvalRules';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import type { CardProps } from './parentChildren.type';
import styles from './parentChildren.style';

export function CategoriesCard({
  profile,
  profileId,
  childRules,
  categories,
  onToggleCategory,
}: CardProps & {
  categories: ContentCategory[];
  onToggleCategory: (profileId: string, categoryId: string) => Promise<void>;
}) {
  return (
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
              <Feather name={blocked ? 'square' : 'check-square'} size={15} color={blocked ? colors.muted : colors.ink} />
              <Text style={[styles.chipText, !blocked && styles.chipTextActive]}>{category.name}</Text>
            </FocusablePressable>
          );
        })}
      </View>
    </View>
  );
}

export function ChannelRulesCard({
  profile,
  profileId,
  childRules,
  channels,
  onToggleGrantChannel,
  onToggleBlockChannel,
  onToggleInherit,
}: CardProps & {
  channels: ApprovedChannel[];
  onToggleGrantChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleBlockChannel: (profileId: string, channelId: string) => Promise<void>;
  onToggleInherit: (profileId: string, inherit: boolean) => Promise<void>;
}) {
  return (
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
        <Feather name={childRules.inheritGlobalApprovals ? 'check-square' : 'square'} size={15} color={childRules.inheritGlobalApprovals ? colors.ink : colors.muted} />
        <Text style={[styles.chipText, childRules.inheritGlobalApprovals && styles.chipTextActive]}>
          Use the family-wide library (uncheck to only allow this child’s own picks)
        </Text>
      </FocusablePressable>
    </View>
  );
}

export function VideoRulesCard({
  profile,
  profileId,
  childRules,
  videos,
  onToggleGrantVideo,
  onToggleBlockVideo,
}: CardProps & {
  videos: ApprovedVideo[];
  onToggleGrantVideo: (profileId: string, videoId: string) => Promise<void>;
  onToggleBlockVideo: (profileId: string, videoId: string) => Promise<void>;
}) {
  return (
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
                  {video.approved ? 'Approved family-wide' : 'Not approved family-wide'}
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
  );
}

export function ApprovalsCard({
  profile,
  childApprovals,
  onRevokeApproval,
}: {
  profile: ChildProfile;
  childApprovals: ContentApproval[];
  onRevokeApproval: (approval: ContentApproval) => Promise<void>;
}) {
  return (
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
  );
}
