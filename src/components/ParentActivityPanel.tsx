import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedVideo, ChildProfile, WatchHistory } from '../types';
import { ScreenTimeUsage } from '../phase3Types';
import { ContentApproval, ContentCategory, ContentRequest } from '../phase4Types';
import { activityService, formatWatchTime } from '../services/activityService';
import { colors } from './theme';

/**
 * Local-only dashboard. All numbers come from on-device storage: watch time,
 * watch history and request history. No tracking, no analytics service.
 */
export function ParentActivityPanel({
  profiles,
  history,
  screenTime,
  videos,
  categories,
  requests,
  approvals,
}: {
  profiles: ChildProfile[];
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
  videos: ApprovedVideo[];
  categories: ContentCategory[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
}) {
  const summaries = useMemo(
    () =>
      profiles.map((profile) =>
        activityService.summarize({
          profileId: profile.id,
          history,
          screenTime,
          videos,
          categories,
          requests,
          approvals,
        }),
      ),
    [profiles, history, screenTime, videos, categories, requests, approvals],
  );

  return (
    <View>
      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>Activity</Text>
          <Text style={styles.subtitle}>A local summary. Nothing is uploaded.</Text>
        </View>
        <View style={styles.badge}>
          <Feather name="hard-drive" size={13} color={colors.mintDark} />
          <Text style={styles.badgeText}>On device</Text>
        </View>
      </View>

      {profiles.length === 0 ? <Text style={styles.helper}>Add a child profile to see activity.</Text> : null}

      {summaries.map((summary) => {
        const profile = profiles.find((item) => item.id === summary.profileId);
        return (
          <View key={summary.profileId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{profile?.name ?? 'Child'}</Text>
              <Text style={styles.cardMeta}>{summary.todayVideosWatched} videos today</Text>
            </View>

            <Text style={styles.sectionLabel}>TODAY</Text>
            <View style={styles.metricRow}>
              <Metric label="Watch time" value={formatWatchTime(summary.todayWatchSeconds)} icon="clock" />
              <Metric label="Videos watched" value={String(summary.todayVideosWatched)} icon="play" />
              <Metric label="Top category" value={summary.todayTopCategory?.name ?? '—'} icon="star" />
            </View>

            <Text style={styles.sectionLabel}>THIS WEEK</Text>
            <View style={styles.metricRow}>
              <Metric label="Watch time" value={formatWatchTime(summary.weekWatchSeconds)} icon="calendar" />
              <Metric label="Videos watched" value={String(summary.weekVideosWatched)} icon="film" />
              <Metric label="Requests" value={String(summary.requests.length)} icon="help-circle" />
            </View>

            <Text style={styles.sectionLabel}>MOST WATCHED CATEGORIES</Text>
            {summary.topCategories.length === 0 ? (
              <Text style={styles.helper}>Nothing watched this week yet.</Text>
            ) : (
              summary.topCategories.map((category) => (
                <View key={category.categoryId} style={styles.usageRow}>
                  <Text style={styles.usageLabel}>{category.name}</Text>
                  <View style={styles.usageBar}>
                    <View
                      style={[
                        styles.usageFill,
                        { width: `${Math.min(100, (category.videos / Math.max(1, summary.topCategories[0].videos)) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.usageValue}>{category.videos}</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionLabel}>RECENTLY WATCHED</Text>
            {summary.recentlyWatched.length === 0 ? (
              <Text style={styles.helper}>No watch history for this profile yet.</Text>
            ) : (
              summary.recentlyWatched.map((entry) => (
                <View key={`${entry.videoId}-${entry.watchedAt}`} style={styles.historyRow}>
                  <Feather name="play-circle" size={16} color={colors.purple} />
                  <View style={styles.historyInfo}>
                    <Text style={styles.usageLabel} numberOfLines={1}>{entry.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {new Date(entry.watchedAt).toLocaleDateString()} {entry.categoryNames.length ? `· ${entry.categoryNames.join(', ')}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionLabel}>REQUEST HISTORY</Text>
            {summary.requests.length === 0 ? (
              <Text style={styles.helper}>No requests from {profile?.name ?? 'this child'} yet.</Text>
            ) : (
              summary.requests.slice(0, 6).map((request) => (
                <View key={request.id} style={styles.historyRow}>
                  <Feather
                    name={request.status === 'pending' ? 'clock' : request.status === 'approved' ? 'check-circle' : 'x-circle'}
                    size={16}
                    color={request.status === 'pending' ? colors.purple : request.status === 'approved' ? colors.mintDark : colors.danger}
                  />
                  <View style={styles.historyInfo}>
                    <Text style={styles.usageLabel} numberOfLines={1}>{request.title ?? 'Request'}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {request.status} · {new Date(request.requestedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricIcon}><Feather name={icon} size={15} color={colors.purple} /></View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  badge: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 12, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  badgeText: { color: colors.mintDark, fontSize: 11, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 18, marginTop: 16, padding: 15 },
  cardHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  metricRow: { flexDirection: 'row', gap: 10 },
  metric: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, flex: 1, padding: 11 },
  metricIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 10, height: 28, justifyContent: 'center', width: 28 },
  metricValue: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 9 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  usageRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 36 },
  usageLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  usageBar: { backgroundColor: colors.line, borderRadius: 4, flex: 1, height: 7, overflow: 'hidden' },
  usageFill: { backgroundColor: colors.purple, borderRadius: 4, height: 7 },
  usageValue: { color: colors.muted, fontSize: 12, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  historyRow: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 12, flexDirection: 'row', gap: 10, marginTop: 7, minHeight: 54, padding: 10 },
  historyInfo: { flex: 1 },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
});
