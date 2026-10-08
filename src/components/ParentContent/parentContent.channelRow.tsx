import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import type { ContentApproval, ContentCategory } from '../../types';
import { describeSyncAge } from '../../services/content/channelSyncRules';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentContent.style';
import { PARENT_CONTENT_COPY } from './parentContent.constant';
import { CategoryEditor } from './parentContent.categoryEditor';
import { useChannelRow } from './parentContent.row.hook';
import { categoryNames } from './parentContent.helper';

/**
 * One row of the Channels tab. Memoized so toggling `expanded` on one channel, or any other local
 * panel state (search text, filters), does not force every other row to re-render and re-run its
 * category/expiry derivations too.
 */
export const ParentChannelRow = React.memo(function ParentChannelRow({
  channel,
  videos,
  approvals,
  categories,
  expanded,
  syncState,
  onOpenChannel,
  onToggleExpanded,
  onToggleCategory,
  onRemove,
}: {
  channel: ApprovedChannel;
  videos: ApprovedVideo[];
  approvals: ContentApproval[];
  categories: ContentCategory[];
  expanded: boolean;
  syncState: ChannelSyncState | undefined;
  onOpenChannel: (channel: ApprovedChannel) => void;
  onToggleExpanded: (id: string) => void;
  onToggleCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => void;
  onRemove: (channel: ApprovedChannel) => void;
}) {
  const { expiry, channelVideos } = useChannelRow(approvals, videos, channel.channelId);
  const hasVideoInfo = channelVideos.length > 0 || Boolean(syncState?.fetchedAt);

  const details = channel.approved
    ? [describeSyncAge(syncState), ...categoryNames(channel.categoryIds, categories)].join(' · ')
    : `${channel.channelId} · awaiting approval`;

  return (
    <View style={styles.channelCard}>
      <View style={styles.channelTop}>
        {channel.thumbnailUrl ? (
          <Image source={{ uri: channel.thumbnailUrl }} style={styles.channelThumb} />
        ) : (
          <View style={styles.channelThumbFallback}><Feather name="radio" size={22} color={colors.ink} /></View>
        )}
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={2}>{channel.name}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{details}</Text>
        </View>
        {channel.approved ? (
          <FocusablePressable accessibilityLabel={`Open ${channel.name}`} onPress={() => onOpenChannel(channel)}>
            <Feather name="chevron-right" size={20} color={colors.ink} />
          </FocusablePressable>
        ) : null}
      </View>
      <View style={styles.channelBottom}>
        <View style={styles.tagRow}>
          <View style={styles.approvalTag}>
            <Feather name={channel.approved ? 'check' : 'clock'} size={11} color={colors.mintDark} />
            <Text style={styles.approvalTagText}>{channel.approved ? 'Approved' : 'Not approved'}</Text>
          </View>
          {/* Never claim "0 videos": an unloaded channel is unknown, not empty. */}
          {channel.approved && hasVideoInfo ? (
            <View style={styles.videoCountTag}>
              <Feather name="play-circle" size={11} color={colors.ink} />
              <Text style={styles.videoCountText}>
                {channelVideos.length} {channelVideos.length === 1 ? 'video' : 'videos'}
              </Text>
            </View>
          ) : null}
          {channel.approved && !hasVideoInfo ? (
            <View style={styles.expiryTag}>
              <Text style={styles.expiryTagText}>{PARENT_CONTENT_COPY.videosNotLoaded}</Text>
            </View>
          ) : null}
          {expiry.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.expiryTag}>
              <Text style={styles.expiryTagText}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.channelActions}>
          <FocusablePressable
            accessibilityLabel={`Edit categories for ${channel.name}`}
            style={styles.rowAction}
            onPress={() => onToggleExpanded(channel.id)}
          >
            <Feather name="tag" size={16} color={colors.ink} />
          </FocusablePressable>
          <FocusablePressable
            accessibilityLabel={`Remove ${channel.name}`}
            style={styles.rowActionDanger}
            onPress={() => void onRemove(channel)}
          >
            <Feather name="trash-2" size={16} color={colors.danger} />
          </FocusablePressable>
        </View>
      </View>
      {expanded ? <CategoryEditor item={channel} categories={categories} onToggle={onToggleCategory} /> : null}
    </View>
  );
});
