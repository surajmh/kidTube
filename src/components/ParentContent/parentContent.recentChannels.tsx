import { useTheme } from '../theme';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import type { ApprovedChannel, ApprovedVideo } from '../../types';
import { channelVideosFrom, describeSyncAge } from '../../services/content/channelSyncRules';
import type { ChannelSyncState } from '../../services/content/channelSyncRules.type';

import useStyles from './parentContent.style';

/** The newest few channels as picture cards, so a parent can spot what they just added. */
export function RecentChannels({
  channels,
  videos,
  syncStateFor,
}: {
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  syncStateFor: (channelId: string) => ChannelSyncState | undefined;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <Text style={styles.sectionHeading}>Recently added</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentChannels}>
        {channels.map((channel) => {
          const count = channelVideosFrom(videos, channel.channelId).length;
          return (
            <View key={channel.id} style={styles.recentChannelCard}>
              <View style={styles.recentChannelPicture}>
                {channel.thumbnailUrl ? (
                  <Image source={{ uri: channel.thumbnailUrl }} style={styles.recentChannelImage} contentFit="cover" />
                ) : (
                  <Feather name="radio" size={26} color={colors.ink} />
                )}
                {count > 0 ? (
                  <View style={styles.recentChannelBadge}>
                    <Text style={styles.recentChannelBadgeText}>{count} {count === 1 ? 'video' : 'videos'}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.recentChannelName} numberOfLines={1}>{channel.name}</Text>
              <Text style={styles.recentChannelMeta} numberOfLines={1}>{describeSyncAge(syncStateFor(channel.channelId))}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
