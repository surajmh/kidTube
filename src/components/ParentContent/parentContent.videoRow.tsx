import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { ApprovedVideo } from '../../types';
import type { ContentApproval, ContentCategory } from '../../types';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentContent.style';
import { CategoryEditor } from './parentContent.categoryEditor';
import { useVideoRow } from './parentContent.row.hook';

/** One row of the Videos tab. Memoized for the same reason as the channel row. */
export const ParentVideoRow = React.memo(function ParentVideoRow({
  video,
  approvals,
  categories,
  expanded,
  onToggleExpanded,
  onToggleCategory,
  onRemove,
}: {
  video: ApprovedVideo;
  approvals: ContentApproval[];
  categories: ContentCategory[];
  expanded: boolean;
  onToggleExpanded: (id: string) => void;
  onToggleCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => void;
  onRemove: (video: ApprovedVideo) => void;
}) {
  const expiry = useVideoRow(approvals, video);

  return (
    <View style={styles.row}>
      {video.thumbnailUrl ? (
        <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbFallback}><Feather name="play" size={18} color={colors.ink} /></View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{video.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {video.channelName ?? video.youtubeVideoId}
          {video.duration ? ` · ${Math.round(video.duration / 60)} min` : ''}
        </Text>
        <View style={styles.tagRow}>
          <View style={styles.approvalTag}>
            <Feather name={video.approved ? 'check' : 'clock'} size={11} color={colors.mintDark} />
            <Text style={styles.approvalTagText}>{video.approved ? 'Approved' : 'Not approved'}</Text>
          </View>
          {expiry.map((label, index) => (
            <View key={`${label}-${index}`} style={styles.expiryTag}>
              <Text style={styles.expiryTagText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      <FocusablePressable
        accessibilityLabel={`Edit categories for ${video.title}`}
        style={styles.iconButton}
        onPress={() => onToggleExpanded(video.id)}
      >
        <Feather name="tag" size={16} color={colors.muted} />
      </FocusablePressable>
      <FocusablePressable
        accessibilityLabel={`Remove ${video.title}`}
        style={styles.iconButton}
        onPress={() => void onRemove(video)}
      >
        <Feather name="trash-2" size={16} color={colors.danger} />
      </FocusablePressable>
      {expanded ? <CategoryEditor item={video} categories={categories} onToggle={onToggleCategory} /> : null}
    </View>
  );
});
