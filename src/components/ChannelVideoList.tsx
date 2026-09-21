import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedVideo } from '../types';
import { ChannelSyncState, describeChannelSync } from '../services/content/channelSyncRules';
import { colors, cardTints } from './theme';
import { FocusablePressable } from './tv';
import { PagedGrid } from './PagedGrid';

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

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export type ChannelVideoListProps = {
  videos: ApprovedVideo[];
  state?: ChannelSyncState;
  busy?: boolean;
  /** Set when the last fetch failed; the list still renders every cached video. */
  errorMessage?: string;
  canLoadMore: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onVideoPress?: (video: ApprovedVideo) => void;
  /** `kid` hides every network control and softens the copy. */
  variant: 'parent' | 'kid';
};

export function ChannelVideoList({
  videos,
  state,
  busy = false,
  errorMessage,
  canLoadMore,
  onRefresh,
  onLoadMore,
  onVideoPress,
  variant,
}: ChannelVideoListProps) {
  const parent = variant === 'parent';
  const loading = busy && videos.length === 0;
  const loadMoreBusy = busy && videos.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.status} numberOfLines={1}>
          {loading
            ? 'Loading videos…'
            : parent
              ? describeChannelSync(state)
              : videos.length
                ? `${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`
                : ''}
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
            {parent ? 'Fetching this channel’s uploads…' : 'Getting videos ready…'}
          </Text>
        </View>
      ) : null}

      {/* A failure keeps every cached video on screen and explains itself. */}
      {!loading && errorMessage && videos.length === 0 ? (
        <View
          style={styles.errorCard}
          // A child gets the plain version; the provider's wording is for the parent.
          accessibilityLabel={parent ? errorMessage : "Couldn't load videos right now."}
        >
          <View style={styles.errorIcon}><Feather name="alert-circle" size={18} color={colors.danger} /></View>
          <Text style={styles.errorTitle}>{"Couldn't load videos right now."}</Text>
          <Text style={styles.errorBody}>
            {parent
              ? errorMessage
              : 'Ask a grown-up to refresh this channel for you.'}
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

      {errorMessage && videos.length > 0 ? (
        <View style={styles.inlineWarning}>
          <Feather name="alert-circle" size={13} color={colors.danger} />
          <Text style={styles.inlineWarningText} numberOfLines={2}>
            {parent ? errorMessage : 'Showing saved videos. A grown-up can refresh this channel.'}
          </Text>
        </View>
      ) : null}

      {videos.length > 0 ? (
        <PagedGrid
          items={videos}
          pageSize={parent ? 20 : 12}
          style={styles.grid}
          renderItem={(video, index) => (
            <ChannelVideoRow
              key={video.id}
              video={video}
              index={index}
              onPress={onVideoPress ? () => onVideoPress(video) : undefined}
            />
          )}
        />
      ) : null}

      {!loading && !errorMessage && videos.length === 0 ? (
        <View style={styles.empty} accessibilityLabel="No videos yet">
          <View style={styles.emptyIcon}><Feather name="inbox" size={18} color={colors.ink} /></View>
          <Text style={styles.emptyTitle}>{parent ? 'No videos found' : 'Nothing here yet'}</Text>
          <Text style={styles.emptyBody}>
            {parent
              ? 'This channel has no public uploads yet, or the provider could not read them. Press Refresh to try again.'
              : 'Ask a grown-up to refresh this channel.'}
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

function ChannelVideoRow({
  video,
  index,
  onPress,
}: {
  video: ApprovedVideo;
  index: number;
  onPress?: () => void;
}) {
  const body = (
    <>
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
          {formatDuration(video.duration)}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return <View style={[styles.row, { backgroundColor: cardTints[index % cardTints.length] }]}>{body}</View>;
  }

  return (
    <FocusablePressable
      accessibilityLabel={`Play ${video.title}`}
      style={[styles.row, { backgroundColor: cardTints[index % cardTints.length] }]}
      onPress={onPress}
    >
      {body}
      <View style={styles.playBadge}>
        <Feather name="play" size={14} color={colors.ink} />
      </View>
    </FocusablePressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6, width: '100%' },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  status: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  refresh: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 11, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 11 },
  refreshText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  pending: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, flexDirection: 'row', gap: 10, padding: 14 },
  pendingText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: '700' },
  errorCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  errorIcon: { alignItems: 'center', backgroundColor: '#FDE9EC', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  errorTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  errorBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  tryAgain: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 12, justifyContent: 'center', marginTop: 12, minHeight: 44, paddingHorizontal: 18 },
  tryAgainText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  inlineWarning: { alignItems: 'center', backgroundColor: '#FDE9EC', borderRadius: 12, flexDirection: 'row', gap: 7, marginBottom: 10, padding: 10 },
  inlineWarningText: { color: colors.danger, flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  grid: { gap: 8 },
  row: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', minHeight: 68, padding: 8 },
  thumb: { borderRadius: 10, height: 48, width: 64 },
  thumbFallback: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center' },
  rowInfo: { flex: 1, paddingHorizontal: 10 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  rowMeta: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  playBadge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 18 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  loadMore: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 14, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 9, minHeight: 48, paddingHorizontal: 14 },
  loadMoreText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
});
