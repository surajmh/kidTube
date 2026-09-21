import React, { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from './theme';
import { FocusablePressable } from './tv';

/**
 * Windowed renderer for the long library lists.
 *
 * A `FlatList` would be the usual answer, but every one of these lists lives inside a page `ScrollView`
 * (so the whole screen scrolls as one surface with a TV remote). Nesting a virtualized list inside a
 * `ScrollView` disables virtualization anyway and warns at runtime, so instead the list renders a
 * bounded window and grows on demand — the same cost bound, without breaking D-pad scrolling.
 */
export function PagedGrid<T>({
  items,
  renderItem,
  pageSize = 24,
  style,
  moreStyle,
  moreLabel = 'Show more',
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  style?: StyleProp<ViewStyle>;
  moreStyle?: StyleProp<ViewStyle>;
  moreLabel?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize);

  // Growing the window is per-list; a changed item count (new filter, new library) starts fresh.
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [items.length, pageSize]);

  const visible = visibleCount >= items.length ? items : items.slice(0, visibleCount);
  const remaining = items.length - visible.length;

  return (
    <View style={style}>
      {visible.map((item, index) => renderItem(item, index))}
      {remaining > 0 ? (
        <FocusablePressable
          accessibilityLabel={`${moreLabel}. ${remaining} more items.`}
          style={[styles.more, moreStyle]}
          onPress={() => setVisibleCount((count) => count + pageSize)}
        >
          <Feather name="plus" size={18} color={colors.ink} />
          <Text style={styles.moreText}>{`Show ${Math.min(remaining, pageSize)} more`}</Text>
          <Text style={styles.moreCount}>{`${remaining} left`}</Text>
        </FocusablePressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  more: {
    alignItems: 'center',
    backgroundColor: colors.lavender,
    borderRadius: 16,
    gap: 4,
    justifyContent: 'center',
    minHeight: 96,
    padding: 12,
  },
  moreText: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  moreCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});
