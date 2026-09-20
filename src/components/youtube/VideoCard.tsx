import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ApprovedVideo } from '../../types';
import { FocusablePressable } from '../tv';
import { formatDuration, thumbnailUrls, tintFor, yt } from './theme';

/** A 16:9 thumbnail that quietly falls back when the preferred rendition is missing. */
export function Thumbnail({ video, radius = 0 }: { video: ApprovedVideo; radius?: number }) {
  const { primary, fallback } = thumbnailUrls(video);
  const [source, setSource] = useState(primary);
  const duration = formatDuration(video.duration);
  return (
    <View style={[styles.thumbWrap, { borderRadius: radius }]}>
      <Image
        source={{ uri: source }}
        style={styles.thumb}
        resizeMode="cover"
        onError={() => setSource((current) => (current === fallback ? current : fallback))}
      />
      {duration ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{duration}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** A circular channel monogram for channels with no artwork of their own. */
export function ChannelAvatar({ name, uri, size = 36 }: { name: string; uri?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri && !failed) {
    return <Image source={{ uri }} style={[styles.avatar, box]} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[styles.avatar, box, { backgroundColor: tintFor(name || '?') }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>{(name || '?').trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

/**
 * The feed card: full-bleed thumbnail, then a row of channel avatar, title and one metadata line.
 * `compact` is the horizontal-shelf variant used for continue-watching rails.
 */
export function VideoCard({
  video,
  onPress,
  compact = false,
}: {
  video: ApprovedVideo;
  onPress: () => void;
  compact?: boolean;
}) {
  const channel = video.channelName?.trim() || 'Saved by a grown-up';

  if (compact) {
    return (
      <FocusablePressable accessibilityLabel={`Play ${video.title}`} style={styles.compact} onPress={onPress}>
        <Thumbnail video={video} radius={10} />
        <Text style={styles.compactTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.compactMeta} numberOfLines={1}>{channel}</Text>
      </FocusablePressable>
    );
  }

  return (
    <FocusablePressable accessibilityLabel={`Play ${video.title}`} style={styles.card} onPress={onPress}>
      <Thumbnail video={video} />
      <View style={styles.meta}>
        <ChannelAvatar name={channel} />
        <View style={styles.metaText}>
          <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{channel}</Text>
        </View>
      </View>
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  thumbWrap: { backgroundColor: yt.surfaceAlt, overflow: 'hidden', position: 'relative', width: '100%' },
  thumb: { aspectRatio: 16 / 9, width: '100%' },
  badge: {
    backgroundColor: yt.badge,
    borderRadius: 4,
    bottom: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    right: 8,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },

  card: { borderWidth: 0, marginBottom: 20 },
  meta: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingTop: 12 },
  metaText: { flex: 1, gap: 4 },
  title: { color: yt.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  subtitle: { color: yt.textDim, fontSize: 12.5 },

  compact: { borderWidth: 0, gap: 6, width: 210 },
  compactTitle: { color: yt.text, fontSize: 13.5, fontWeight: '600', lineHeight: 18 },
  compactMeta: { color: yt.textDim, fontSize: 12 },
});
