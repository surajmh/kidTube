import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChildProfile } from '../types';
import { ContentCategory } from '../phase4Types';
import { FocusablePressable } from './tv';
import { yt } from './youtube/theme';

/**
 * The filter surface for both the channel and video lists.
 *
 * It lives in a drawer rather than inline so the list pages stay a list: previously the search
 * box, child chips and category chips pushed the actual content most of a screen down.
 */

export type ParentFilters = {
  query: string;
  childId: string | null;
  categoryId: string | null;
};

export const emptyParentFilters: ParentFilters = { query: '', childId: null, categoryId: null };

/** How many filters are narrowing the list, for the badge on the trigger. */
export function activeFilterCount(filters: ParentFilters): number {
  return (filters.query.trim() ? 1 : 0) + (filters.childId ? 1 : 0) + (filters.categoryId ? 1 : 0);
}

/** The button that opens the drawer, with a count of what is currently applied. */
export function ParentFilterButton({ filters, onPress }: { filters: ParentFilters; onPress: () => void }) {
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

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 14,
  },
  triggerText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  triggerBadge: {
    alignItems: 'center',
    backgroundColor: yt.chipActive,
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 4,
  },
  triggerBadgeText: { color: yt.chipActiveText, fontSize: 11, fontWeight: '700' },

  scrim: { backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: yt.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 12,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: yt.line,
    borderRadius: 2,
    height: 4,
    marginTop: 8,
    width: 36,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  heading: { color: yt.text, fontSize: 17, fontWeight: '700' },
  close: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },

  body: { gap: 10, paddingBottom: 12, paddingHorizontal: 16 },
  input: {
    backgroundColor: yt.surfaceAlt,
    borderRadius: 20,
    color: yt.text,
    fontSize: 14,
    height: 42,
    paddingHorizontal: 16,
  },
  groupLabel: { color: yt.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: yt.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: yt.chipActive },
  chipText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: yt.chipActiveText },

  footer: {
    borderTopColor: yt.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  clear: { alignItems: 'center', borderRadius: 20, flex: 1, justifyContent: 'center', minHeight: 42 },
  clearText: { color: yt.textDim, fontSize: 14, fontWeight: '600' },
  apply: {
    alignItems: 'center',
    backgroundColor: yt.chipActive,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  applyText: { color: yt.chipActiveText, fontSize: 14, fontWeight: '700' },
});
