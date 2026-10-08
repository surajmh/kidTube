import type React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export type PagedGridProps<T> = {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  style?: StyleProp<ViewStyle>;
  moreStyle?: StyleProp<ViewStyle>;
  moreLabel?: string;
};
