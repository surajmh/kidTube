import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatWatchTime } from '../../services/activityService';
import { colors } from '../theme';
import styles from './parentActivity.style';
import { useActivitySummaries } from './parentActivity.hook';
import { barWidthPercent } from './parentActivity.helper';
import { ParentActivityProps } from './parentActivity.type';

export function ParentActivityPanel({
  profiles,
  history,
  screenTime,
  videos,
  categories,
  requests,
  approvals,
}: ParentActivityProps) {
  const summaries = useActivitySummaries({
    profiles,
    history,
    screenTime,
    videos,
    categories,
    requests,
    approvals,
  });


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
                        { width: `${barWidthPercent(category.videos, summary.topCategories[0].videos)}%` },
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
                  <Feather name="play-circle" size={16} color={colors.ink} />
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
                    color={request.status === 'pending' ? colors.yellow : request.status === 'approved' ? colors.mintDark : colors.danger}
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
      <View style={styles.metricIcon}><Feather name={icon} size={15} color={colors.ink} /></View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
