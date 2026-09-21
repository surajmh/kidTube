import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo } from '../types';
import { ContentCategory, resolvedCategoryIds } from '../phase4Types';
import { colors, cardTints } from './theme';
import { FocusablePressable } from './tv';

export function ParentCategoriesPanel({
  categories,
  videos,
  channels,
  onCreate,
  onRename,
  onDelete,
}: {
  categories: ContentCategory[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  onCreate: (name: string) => Promise<void>;
  onRename: (categoryId: string, name: string) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function countsFor(categoryId: string) {
    return {
      videos: videos.filter((video) => resolvedCategoryIds(video.categoryIds).includes(categoryId)).length,
      channels: channels.filter((channel) => resolvedCategoryIds(channel.categoryIds).includes(categoryId)).length,
    };
  }

  async function submit() {
    setError('');
    try {
      if (editingId) await onRename(editingId, name);
      else await onCreate(name);
      setName('');
      setEditingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That change did not save.');
    }
  }

  return (
    <View>
      <View style={styles.formCard}>
        <Text style={styles.formLabel}>{editingId ? 'Rename category' : 'Add a category'}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Bedtime calms"
          placeholderTextColor="#B8B1AA"
          style={styles.input}
          maxLength={24}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.formActions}>
          {editingId ? (
            <FocusablePressable
              accessibilityLabel="Cancel rename"
              style={styles.secondary}
              onPress={() => { setEditingId(null); setName(''); }}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </FocusablePressable>
          ) : null}
          <FocusablePressable accessibilityLabel={editingId ? 'Save category name' : 'Create category'} style={styles.primary} onPress={() => void submit()}>
            <Text style={styles.primaryText}>{editingId ? 'Save name' : 'Create category'}</Text>
          </FocusablePressable>
        </View>
      </View>

      <Text style={styles.listLabel}>CATEGORIES · {categories.length}</Text>
      {categories.map((category, index) => {
        const counts = countsFor(category.id);
        return (
          <View key={category.id} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: cardTints[index % cardTints.length] }]}>
              <Feather name={category.icon as keyof typeof Feather.glyphMap} size={18} color={colors.ink} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle} numberOfLines={1}>{category.name}</Text>
              <Text style={styles.rowMeta}>
                {counts.videos} videos · {counts.channels} channels{category.isDefault ? ' · default' : ''}
              </Text>
            </View>
            <FocusablePressable
              accessibilityLabel={`Rename ${category.name}`}
              style={styles.iconButton}
              onPress={() => { setEditingId(category.id); setName(category.name); }}
            >
              <Feather name="edit-2" size={16} color={colors.muted} />
            </FocusablePressable>
            {!category.isDefault ? (
              <FocusablePressable
                accessibilityLabel={`Delete ${category.name}`}
                style={styles.iconButton}
                onPress={() => void onDelete(category.id)}
              >
                <Feather name="trash-2" size={16} color={colors.danger} />
              </FocusablePressable>
            ) : null}
          </View>
        );
      })}
      <Text style={styles.helper}>
        Default categories always exist so Kid Mode can show friendly cards. Assign categories to videos and channels from the Videos and Channels tabs.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: { backgroundColor: colors.card, borderRadius: 18, marginTop: 16, padding: 14 },
  formLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: colors.canvas, borderRadius: 13, color: colors.ink, fontSize: 15, height: 50, marginTop: 10, paddingHorizontal: 13 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  formActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 12 },
  primary: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 13, height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondary: { alignItems: 'center', height: 48, justifyContent: 'center', paddingHorizontal: 14 },
  secondaryText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  listLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9, marginTop: 24 },
  row: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 15, flexDirection: 'row', marginBottom: 8, minHeight: 68, padding: 9 },
  icon: { alignItems: 'center', borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  rowInfo: { flex: 1, paddingHorizontal: 11 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  iconButton: { alignItems: 'center', height: 46, justifyContent: 'center', width: 44 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
});
