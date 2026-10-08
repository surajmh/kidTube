import React from 'react';
import { Text, View } from 'react-native';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { cardTints } from '../theme';
import styles from './parentContent.style';

export function RecentlyAdded({ items }: { items: Array<ApprovedVideo | ApprovedChannel> }) {
  return (
    <>
      <Text style={styles.filterLabel}>RECENTLY ADDED</Text>
      <View style={styles.recentRow}>
        {items.map((item, index) => (
          <View key={item.id} style={[styles.recentCard, { backgroundColor: cardTints[index % cardTints.length] }]}>
            <Text style={styles.recentTitle} numberOfLines={2}>
              {'title' in item ? item.title : item.name}
            </Text>
            <Text style={styles.recentMeta}>Most recent</Text>
          </View>
        ))}
      </View>
    </>
  );
}
