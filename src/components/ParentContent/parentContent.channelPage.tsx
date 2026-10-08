import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { channelVideosFrom, describeChannelSync } from '../../services/content/channelSyncRules';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import { ChannelVideoList } from '../ChannelVideoList';
import styles from './parentContent.style';

/**
 * A channel's own page: just that channel and its uploads. More pages arrive as the parent
 * scrolls, so there is no bulk fetch when a channel is approved.
 */
export function ParentChannelPage({
  channel,
  videos,
  state,
  busy,
  onBack,
  onRefresh,
  onLoadMore,
}: {
  channel: ApprovedChannel;
  videos: ApprovedVideo[];
  state: ChannelSyncState | undefined;
  busy: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
}) {
  const channelVideos = channelVideosFrom(videos, channel.channelId);
  return (
    <View>
      <FocusablePressable
        accessibilityLabel="Back to channels"
        style={styles.backRow}
        onPress={onBack}
      >
        <Feather name="arrow-left" size={18} color={colors.ink} />
        <Text style={styles.backText}>Channels</Text>
      </FocusablePressable>

      <View style={styles.channelHero}>
        {channel.thumbnailUrl ? (
          <Image source={{ uri: channel.thumbnailUrl }} style={styles.heroThumb} />
        ) : (
          <View style={styles.thumbFallback}>
            <Feather name="radio" size={20} color={colors.ink} />
          </View>
        )}
        <Text style={styles.heroName} numberOfLines={2}>{channel.name}</Text>
        <Text style={styles.heroMeta}>{describeChannelSync(state)}</Text>
      </View>

      <ChannelVideoList
        variant="parent"
        videos={channelVideos}
        state={state}
        busy={busy}
        errorMessage={state?.lastError?.message}
        canLoadMore={Boolean(state?.nextPageToken)}
        onRefresh={onRefresh}
        onLoadMore={onLoadMore}
      />
    </View>
  );
}
