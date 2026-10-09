import { useTheme } from '../theme';
import React from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
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

export function ParentFilterDrawer({
  visible,
  label,
  filters,
  profiles,
  categories,
  onChange,
  onClose,
}: {
  visible: boolean;
  /** "channels" or "videos" — only used for the search placeholder. */
  label: string;
  filters: ParentFilters;
  profiles: ChildProfile[];
  categories: ContentCategory[];
  onChange: (filters: ParentFilters) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const { yt } = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.heading}>Filters</Text>
            <FocusablePressable accessibilityLabel="Close filters" style={styles.close} onPress={onClose}>
              <Feather name="x" size={20} color={yt.text} />
            </FocusablePressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <TextInput
              value={filters.query}
              onChangeText={(query) => onChange({ ...filters, query })}
              placeholder={`Search your approved ${label}`}
              placeholderTextColor={yt.textDim}
              style={styles.input}
              accessibilityLabel={`Search your approved ${label}`}
            />

            <Text style={styles.groupLabel}>Child</Text>
            <View style={styles.chipRow}>
              <Chip
                label="All children"
                active={filters.childId === null}
                onPress={() => onChange({ ...filters, childId: null })}
              />
              {profiles.map((profile) => (
                <Chip
                  key={profile.id}
                  label={profile.name}
                  active={filters.childId === profile.id}
                  onPress={() => onChange({ ...filters, childId: profile.id })}
                />
              ))}
            </View>

            <Text style={styles.groupLabel}>Category</Text>
            <View style={styles.chipRow}>
              <Chip
                label="All"
                active={filters.categoryId === null}
                onPress={() => onChange({ ...filters, categoryId: null })}
              />
              {categories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  active={filters.categoryId === category.id}
                  onPress={() => onChange({ ...filters, categoryId: category.id })}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <FocusablePressable
              accessibilityLabel="Clear filters"
              style={styles.clear}
              onPress={() => onChange(emptyParentFilters)}
            >
              <Text style={styles.clearText}>Clear all</Text>
            </FocusablePressable>
            <FocusablePressable accessibilityLabel="Apply filters" style={styles.apply} onPress={onClose}>
              <Text style={styles.applyText}>Done</Text>
            </FocusablePressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <FocusablePressable
      accessibilityLabel={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </FocusablePressable>
  );
}
