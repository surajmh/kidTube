import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ApprovedVideo } from '../../../types';
import { FocusablePressable } from '../../tv';
import { KID_COPY, MONOGRAM_TINTS } from '../../KidHome/kidHome.constant';
import { monogramTint } from '../../KidHome/kidHome.helper';
import useStyles from './videoCard.style';
import { useChannelAvatar, useThumbnail } from './videoCard.hook';

/** A 16:9 thumbnail that quietly falls back when the preferred rendition is missing. */
export function Thumbnail({ video, radius = 0 }: { video: ApprovedVideo; radius?: number }) {
  const styles = useStyles();
  const { primary, source, duration, onError } = useThumbnail(video);
  return (
    <View style={[styles.thumbWrap, { borderRadius: radius }]}>
      <Image
        source={{ uri: source }}
        recyclingKey={primary}
        style={styles.thumb}
        contentFit="cover"
        onError={onError}
      />
      {duration ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{duration}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Channel artwork, with a monogram when artwork is missing or cannot load. */
export function ChannelAvatar({ name, uri, channelId, size = 36 }: { name: string; uri?: string; channelId?: string; size?: number }) {
  const styles = useStyles();
  const { source, failed, onError } = useChannelAvatar(uri, channelId);
  const box = { width: size, height: size, borderRadius: size / 2 };

  if (source && !failed) {
    return <Image source={{ uri: source }} recyclingKey={source} style={[styles.avatar, box]} contentFit="cover" onError={onError} />;
  }
  return (
    <View style={[styles.avatar, box, { backgroundColor: monogramTint(name || '?', MONOGRAM_TINTS) }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>
        {(name || '?').trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * The feed card: full-bleed thumbnail, then channel avatar, title and one metadata line.
 * `compact` is the horizontal-shelf variant used for the continue-watching rail.
 *
 * Memoized, and it builds its own press closure: a parent that passed `() => press(video)`
 * per row would hand a new function to every card on each render and defeat the memo.
 */
export const VideoCard = React.memo(function VideoCard({
  video,
  onPress,
  compact = false,
}: {
  video: ApprovedVideo;
  onPress: (video: ApprovedVideo) => void;
  compact?: boolean;
}) {
  const styles = useStyles();
  const channel = video.channelName?.trim() || KID_COPY.unknownChannel;
  const press = () => onPress(video);

  if (compact) {
    return (
      <FocusablePressable accessibilityLabel={`Play ${video.title}`} style={styles.compact} onPress={press}>
        <Thumbnail video={video} radius={10} />
        <Text style={styles.compactTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.compactMeta} numberOfLines={1}>{channel}</Text>
      </FocusablePressable>
    );
  }

  return (
    <FocusablePressable accessibilityLabel={`Play ${video.title}`} style={styles.card} onPress={press}>
      <Thumbnail video={video} />
      <View style={styles.meta}>
        <ChannelAvatar name={channel} channelId={video.channelId} />
        <View style={styles.metaText}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{channel}</Text>
        </View>
      </View>
    </FocusablePressable>
  );
});
