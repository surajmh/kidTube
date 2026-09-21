import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, cardTints } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentCategories.style';
import { useParentCategories } from './parentCategories.hook';
import { categoryCounts } from './parentCategories.helper';
import { ParentCategoriesProps } from './parentCategories.type';

export function ParentCategoriesPanel({
  categories,
  videos,
  channels,
  onCreate,
  onRename,
  onDelete,
}: ParentCategoriesProps) {
  const { name, setName, editingId, error, startEdit, cancelEdit, submit } = useParentCategories({
    onCreate,
    onRename,
  });

  function countsFor(categoryId: string) {
    return categoryCounts(categoryId, videos, channels);
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
              onPress={cancelEdit}
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
              onPress={() => startEdit(category.id, category.name)}
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
