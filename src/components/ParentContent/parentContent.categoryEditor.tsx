import React from 'react';
import { Text, View } from 'react-native';
import type { ContentCategory } from '../../types';
import { FocusablePressable } from '../tv';
import useStyles from './parentContent.style';

/** The category-toggle chips shown under an expanded channel or video row. */
export function CategoryEditor<T extends { categoryIds?: string[] }>({
  item,
  categories,
  onToggle,
}: {
  item: T;
  categories: ContentCategory[];
  onToggle: (item: T, categoryId: string, assigned: boolean) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.categoryEditor}>
      {categories.map((category) => {
        const assigned = Boolean(item.categoryIds?.includes(category.id));
        return (
          <FocusablePressable
            key={category.id}
            accessibilityLabel={`Toggle ${category.name}`}
            style={[styles.chip, assigned && styles.chipActive]}
            onPress={() => onToggle(item, category.id, assigned)}
          >
            <Text style={[styles.chipText, assigned && styles.chipTextActive]}>{category.name}</Text>
          </FocusablePressable>
        );
      })}
    </View>
  );
}
