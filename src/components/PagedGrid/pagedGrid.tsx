import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FocusablePressable } from '../tv';
import { usePagedGrid } from './pagedGrid.hook';
import useStyles from './pagedGrid.style';
import type { PagedGridProps } from './pagedGrid.type';

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
}: PagedGridProps<T>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { visible, remaining, showMore } = usePagedGrid(items, pageSize);

  return (
    <View style={style}>
      {visible.map((item, index) => renderItem(item, index))}
      {remaining > 0 ? (
        <FocusablePressable
          accessibilityLabel={`${moreLabel}. ${remaining} more items.`}
          style={[styles.more, moreStyle]}
          onPress={showMore}
        >
          <Feather name="plus" size={18} color={colors.ink} />
          <Text style={styles.moreText}>{`Show ${Math.min(remaining, pageSize)} more`}</Text>
          <Text style={styles.moreCount}>{`${remaining} left`}</Text>
        </FocusablePressable>
      ) : null}
    </View>
  );
}
