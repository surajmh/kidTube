import { useTheme } from '../theme';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import type { ApprovedVideo } from '../../types';
import { FocusablePressable } from '../tv';

import { ChannelAvatar } from '../youtube/VideoCard';
import { DOWNLOAD_LIST_COPY } from './downloadList.constant';
import { durationLabel, ringSvgUri, rowMeta, thumbnailFor } from './downloadList.helper';
import useStyles from './downloadList.style';
import type { DownloadEntry } from './downloadList.type';

/** One saved video: picture, title, channel and size, a status mark, and (parents only) a "…" menu. */
export function DownloadRow({
  entry,
  busy,
  onPlay,
  onMenu,
}: {
  entry: DownloadEntry;
  busy: boolean;
  onPlay?: (video: ApprovedVideo) => void;
  onMenu?: (entry: DownloadEntry) => void;
}) {
  const styles = useStyles();
  const { yt } = useTheme();
  const { video, item } = entry;
  const title = video?.title ?? DOWNLOAD_LIST_COPY.removed;
  const length = durationLabel(video?.duration);
  const playable = item.state === 'ready' && video && onPlay && !busy;
  const body = (
    <>
      <View style={styles.thumbBox}>
        <Image source={{ uri: thumbnailFor(video, item.videoId) }} style={styles.thumb} contentFit="cover" />
        {length ? <View style={styles.duration}><Text style={styles.durationText}>{length}</Text></View> : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {video?.channelName ? (
          <View style={styles.channelRow}>
            <ChannelAvatar name={video.channelName} channelId={video.channelId} size={20} />
            <Text style={styles.channel} numberOfLines={1}>{video.channelName}</Text>
          </View>
        ) : null}
        <Text style={styles.meta} numberOfLines={2}>{rowMeta(item)}</Text>
      </View>
      <StatusMark state={item.state} percent={item.percent} />
    </>
  );
  return (
    <View style={[styles.row, busy && styles.rowBusy]}>
      {playable ? (
        <FocusablePressable accessibilityLabel={`Play ${title}`} style={styles.rowMain} onPress={() => onPlay(video)}>
          {body}
        </FocusablePressable>
      ) : (
        <View style={styles.rowMain} accessibilityLabel={title}>{body}</View>
      )}
      {onMenu ? (
        <FocusablePressable accessibilityLabel={`More options for ${title}`} disabled={busy} style={styles.menuButton} onPress={() => onMenu(entry)}>
          <Feather name="more-vertical" size={20} color={yt.text} />
        </FocusablePressable>
      ) : null}
    </View>
  );
}

function StatusMark({ state, percent }: { state: DownloadEntry['item']['state']; percent: number }) {
  const styles = useStyles();
  const { yt } = useTheme();
  if (state === 'ready') {
    return <View style={styles.status} accessibilityLabel="Saved"><View style={styles.doneBadge}><Feather name="check" size={20} color="#14301F" /></View></View>;
  }
  if (state === 'failed') {
    return <View style={styles.status} accessibilityLabel="Could not save"><Feather name="alert-circle" size={26} color="#FF6E6E" /></View>;
  }
  if (state === 'preparing') {
    return <View style={styles.status} accessibilityLabel="Getting ready"><ActivityIndicator size="small" color={yt.text} /></View>;
  }
  return (
    <View style={styles.status} accessibilityLabel={`Saving ${Math.round(percent)} percent`}>
      <View style={styles.ring}>
        <Image source={{ uri: ringSvgUri(percent) }} style={styles.ringImage} contentFit="contain" />
        <Text style={styles.ringText}>{Math.round(percent)}</Text>
      </View>
    </View>
  );
}
