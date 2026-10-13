import { SettingsChoice, SettingsRow, SettingsScreen, SettingsText } from '../SettingsMenu';
import { useTheme } from '../theme';
import React from 'react';
import { Modal, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChildProfile } from '../../types';
import type { ContentCategory } from '../../types';
import { FocusablePressable } from '../tv';

import useStyles from './parentFilter.style';
import { ParentFilters } from './parentFilter.type';
import { emptyParentFilters } from './parentFilter.constant';
import { activeFilterCount } from './parentFilter.helper';

/**
 * The filter surface for both the channel and video lists.
 *
 * It lives in a drawer rather than inline so the list pages stay a list: previously the search
 * box, child chips and category chips pushed the actual content most of a screen down.
 */

/** The button that opens the drawer, with a count of what is currently applied. */
export function ParentFilterButton({ filters, onPress }: { filters: ParentFilters; onPress: () => void }) {
  const styles = useStyles();
  const { yt } = useTheme();
  const count = activeFilterCount(filters);
  return (
    <FocusablePressable accessibilityLabel="Filters" style={styles.trigger} onPress={onPress}>
      <Feather name="sliders" size={15} color={yt.text} />
      <Text style={styles.triggerText}>Filters</Text>
      {count > 0 ? (
        <View style={styles.triggerBadge}>
          <Text style={styles.triggerBadgeText}>{count}</Text>
        </View>
      ) : null}
    </FocusablePressable>
  );
}

export function ParentFilterDrawer({ visible, label, filters, profiles, categories, onChange, onClose }: {
  visible: boolean; label: string; filters: ParentFilters; profiles: ChildProfile[]; categories: ContentCategory[];
  onChange: (filters: ParentFilters) => void; onClose: () => void;
}) {
  if (!visible) return null;
  return <Modal visible onRequestClose={onClose} animationType="none">
    <SettingsScreen title="Filters" onBack={onClose}>
      <SettingsText label={`Search your approved ${label}`} value={filters.query} onChange={(query) => onChange({ ...filters, query })} />
      <SettingsChoice<string | null> label="Child" value={filters.childId} options={[{ value: null, label: 'All children' }, ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))]} onChange={(childId) => onChange({ ...filters, childId })} />
      <SettingsChoice<string | null> label="Category" value={filters.categoryId} options={[{ value: null, label: 'All' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} onChange={(categoryId) => onChange({ ...filters, categoryId })} />
      <SettingsRow label="Clear filters" onPress={() => onChange(emptyParentFilters)} />
      <SettingsRow label="Apply filters" onPress={onClose} />
    </SettingsScreen>
  </Modal>;
}
