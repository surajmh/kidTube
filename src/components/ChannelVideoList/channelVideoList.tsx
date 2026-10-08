import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { ApprovedVideo } from '../../types';
import { describeChannelSync } from '../../services/content/channelSyncRules';
import { colors, cardTints } from '../theme';
import { formatDuration } from '../shared/duration.helper';
import styles from './channelVideoList.style';
import { channelListState, isLoadingMore, videoCountLabel } from './channelVideoList.helper';
import { CHANNEL_LIST_COPY, CHANNEL_LIST_PAGE_SIZE } from './channelVideoList.constant';
import { ChannelVideoListProps } from './channelVideoList.type';
import { FocusablePressable } from '../tv';
import { PagedGrid } from '../PagedGrid';

/**
 * The videos of one approved channel.
 *
 * Shared by Parent Mode and Kid Mode so the two never disagree about what a
 * channel holds. The difference is only which controls exist:
 *
 *   parent — Refresh and Load more, because only Parent Mode may call the provider
 *   kid    — read-only over what is already cached, plus local paging
 *
 * A failed fetch is shown as a failed fetch. It must never render as "0 videos",
 * which would claim the channel is empty when it is not (§10).
 */

export function ChannelVideoList({
  videos,
  state,
  busy = false,
  errorMessage,
  canLoadMore,
  onRefresh,
  onLoadMore,
  variant,
}: ChannelVideoListProps) {
  const parent = variant === 'parent';
  const listState = channelListState({ busy, videoCount: videos.length, hasError: Boolean(errorMessage) });
  const loading = listState === 'loading';
  const idleStatus = parent ? describeChannelSync(state) : videoCountLabel(videos.length);
  const loadMoreBusy = isLoadingMore(busy, videos.length);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.status} numberOfLines={1}>
          {loading ? CHANNEL_LIST_COPY.loadingStatus : idleStatus}
        </Text>
        {parent && onRefresh ? (
          <FocusablePressable
            accessibilityLabel="Refresh channel videos"
            style={styles.refresh}
            disabled={busy}
            onPress={onRefresh}
          >
            <Feather name="refresh-cw" size={13} color={colors.ink} />
            <Text style={styles.refreshText}>{busy ? 'Loading…' : 'Refresh'}</Text>
          </FocusablePressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.pending} accessibilityLabel="Loading videos">
          <Feather name="download-cloud" size={20} color={colors.ink} />
          <Text style={styles.pendingText}>
            {parent ? CHANNEL_LIST_COPY.loadingParent : CHANNEL_LIST_COPY.loadingKid}
          </Text>
        </View>
      ) : null}

      {/* A failure keeps every cached video on screen and explains itself. */}
      {listState === 'unavailable' ? (
        <View
          style={styles.errorCard}
          // A child gets the plain version; the provider's wording is for the parent.
          accessibilityLabel={parent ? errorMessage : CHANNEL_LIST_COPY.errorTitle}
        >
          <View style={styles.errorIcon}><Feather name="alert-circle" size={18} color={colors.danger} /></View>
          <Text style={styles.errorTitle}>{CHANNEL_LIST_COPY.errorTitle}</Text>
          <Text style={styles.errorBody}>
            {parent
              ? errorMessage
              : CHANNEL_LIST_COPY.errorBodyKid}
          </Text>
          {parent && onRefresh ? (
            <FocusablePressable
              accessibilityLabel="Try again"
              style={styles.tryAgain}
              disabled={busy}
              onPress={onRefresh}
            >
              <Text style={styles.tryAgainText}>{busy ? 'Trying…' : 'Try Again'}</Text>
            </FocusablePressable>
          ) : null}
        </View>
      ) : null}

      {listState === 'stale-with-cache' ? (
        <View style={styles.inlineWarning}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.inlineWarningText} numberOfLines={2}>
            {parent ? errorMessage : CHANNEL_LIST_COPY.staleKid}
          </Text>
        </View>
      ) : null}

      {videos.length > 0 ? (
        <PagedGrid
          items={videos}
          pageSize={parent ? CHANNEL_LIST_PAGE_SIZE.parent : CHANNEL_LIST_PAGE_SIZE.kid}
          style={styles.grid}
          renderItem={(video, index) => (
            <ChannelVideoRow key={video.id} video={video} index={index} />
          )}
        />
      ) : null}

      {listState === 'empty' ? (
        <View style={styles.empty} accessibilityLabel="No videos yet">
          <View style={styles.emptyIcon}><Feather name="inbox" size={18} color={colors.ink} /></View>
          <Text style={styles.emptyTitle}>{parent ? CHANNEL_LIST_COPY.emptyTitleParent : CHANNEL_LIST_COPY.emptyTitleKid}</Text>
          <Text style={styles.emptyBody}>
            {parent
              ? CHANNEL_LIST_COPY.emptyBodyParent
              : CHANNEL_LIST_COPY.emptyBodyKid}
          </Text>
        </View>
      ) : null}

      {canLoadMore ? (
        <FocusablePressable
          accessibilityLabel="Load more videos"
          style={styles.loadMore}
          disabled={loadMoreBusy}
          onPress={onLoadMore}
        >
          <Feather name={loadMoreBusy ? 'loader' : 'chevrons-down'} size={16} color={colors.ink} />
          <Text style={styles.loadMoreText}>{loadMoreBusy ? 'Loading more…' : 'Load more'}</Text>
        </FocusablePressable>
      ) : null}
    </View>
  );
}

const ChannelVideoRow = React.memo(function ChannelVideoRow({
  video,
  index,
}: {
  video: ApprovedVideo;
  index: number;
}) {
  return (
    <View style={[styles.row, { backgroundColor: cardTints[index % cardTints.length] }]}>
      {video.thumbnailUrl ? (
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Feather name="play" size={16} color={colors.ink} />
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {video.publishedAt ? new Date(video.publishedAt).getFullYear() : 'From this channel'}
          {' · '}
          {formatDuration(video.duration) ?? CHANNEL_LIST_COPY.unknownDuration}
        </Text>
      </View>
    </View>
  );
});
