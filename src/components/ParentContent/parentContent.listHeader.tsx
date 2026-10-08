import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { yt } from '../youtube/theme';
import { FocusablePressable } from '../tv';
import styles from './parentContent.style';
import { CHANNEL_SORT_LABELS } from './parentContent.constant';
import type { ChannelSort } from './parentContent.type';

/** "Your channels · 3" with the order control; pressing the pill switches between the two orders. */
export function ChannelListHeader({ count, sort, onToggleSort }: { count: number; sort: ChannelSort; onToggleSort: () => void }) {
  return (
    <View style={styles.listHeader}>
      <Text style={styles.sectionHeading}>Your channels · {count}</Text>
      <FocusablePressable accessibilityLabel={`Sort channels: ${CHANNEL_SORT_LABELS[sort]}`} style={styles.sortPill} onPress={onToggleSort}>
        <Feather name="sliders" size={13} color={yt.text} />
        <Text style={styles.sortPillText}>{CHANNEL_SORT_LABELS[sort]}</Text>
        <Feather name="chevron-down" size={14} color={yt.text} />
      </FocusablePressable>
    </View>
  );
}
