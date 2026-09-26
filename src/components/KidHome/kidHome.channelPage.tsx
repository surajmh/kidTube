import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { FocusablePressable } from '../tv';
import { ChannelAvatar, VideoCard } from '../youtube/VideoCard';
import { ICON, KID_COPY } from './kidHome.constant';
import { ChannelAvailability } from './kidHome.type';
import { Empty } from './kidHome.primitives';
import styles from './kidHome.style';

export function ChannelRow({
  channel,
  videoCount,
  onOpen,
  subtitle,
}: {
  channel: ApprovedChannel;
  videoCount?: number;
  onOpen: (channelId: string) => void;
  subtitle?: string;
}) {
  return (
    <FocusablePressable
      accessibilityLabel={`Open ${channel.name}`}
      style={styles.channelRow}
      onPress={() => onOpen(channel.channelId)}
    >
      <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={48} />
      <View style={styles.channelRowText}>
        <Text style={styles.channelRowName} numberOfLines={1}>{channel.name}</Text>
        <Text style={styles.channelRowMeta}>{subtitle ?? `${videoCount ?? 0} videos`}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={ICON.inkDim} />
    </FocusablePressable>
  );
}

/**
 * A channel's page. Reads cached sync state only -- refreshing is a Parent Mode control -- and
 * never shows provider wording, error codes or host names.
 */
export function ChannelPage({
  channel,
  videos,
  availability,
  onBack,
  onVideoPress,
}: {
  channel: ApprovedChannel;
  videos: ApprovedVideo[];
  availability: ChannelAvailability;
  onBack: () => void;
  onVideoPress: (video: ApprovedVideo) => void;
}) {
  return (
    <>
      <FocusablePressable
        accessibilityLabel="Back to channels"
        style={styles.backRow}
        onPress={onBack}
      >
        <Feather name="arrow-left" size={20} color={ICON.ink} />
        <Text style={styles.channelRowName}>Channels</Text>
      </FocusablePressable>

      <View style={styles.channelHero}>
        <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={64} />
        <Text style={styles.channelHeroName}>{channel.name}</Text>
        <Text style={styles.channelHeroMeta}>{`${videos.length} videos`}</Text>
      </View>

      {availability === 'unavailable' ? (
        <Empty icon="wifi-off" title={KID_COPY.channelUnavailableTitle} body={KID_COPY.channelUnavailableBody} />
      ) : null}
      {availability === 'stale-with-cache' ? (
        <View style={styles.notice}>
          <Feather name="info" size={16} color={ICON.ink} />
          <Text style={styles.noticeText}>{KID_COPY.channelStaleNotice}</Text>
        </View>
      ) : null}
      {availability === 'not-loaded' ? (
        <Empty icon="clock" title={KID_COPY.channelNotLoadedTitle} body={KID_COPY.channelNotLoadedBody} />
      ) : null}

      {videos.map((video) => (
        <VideoCard key={`channel-${video.id}`} video={video} onPress={onVideoPress} />
      ))}
    </>
  );
}
