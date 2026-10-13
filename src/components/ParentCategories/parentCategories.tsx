import React from 'react';
import { Text, View } from 'react-native';
import { SettingsChoice, SettingsGroup, SettingsRow, SettingsText } from '../SettingsMenu';
import useStyles from './parentCategories.style';
import { useParentCategories } from './parentCategories.hook';
import { categoryCounts } from './parentCategories.helper';
import type { ParentCategoriesProps } from './parentCategories.type';

export function ParentCategoriesPanel({ categories, videos, channels, onCreate, onRename, onDelete }: ParentCategoriesProps) {
  const styles = useStyles();
  const { name, setName, editingId, error, startEdit, cancelEdit, submit } = useParentCategories({ onCreate, onRename });
  const form = <>
    <SettingsText label="Category name" value={name} onChange={setName} maxLength={24} />
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <SettingsRow label={editingId ? 'Save category name' : 'Add category'} onPress={() => void submit()} />
    {editingId && <SettingsRow label="Cancel rename" onPress={cancelEdit} />}
  </>;
  return <View>
    <SettingsGroup label="Add a category">{editingId ? <SettingsRow label="Start a new category" onPress={cancelEdit} /> : form}</SettingsGroup>
    {categories.map((category) => {
      const counts = categoryCounts(category.id, videos, channels);
      return <SettingsGroup key={category.id} label={category.name} value={category.isDefault ? 'Default' : undefined} description={`${counts.videos} videos · ${counts.channels} channels`}>
        {editingId === category.id ? form : <SettingsRow label={`Rename ${category.name}`} onPress={() => startEdit(category.id, category.name)} />}
        {!category.isDefault && <SettingsChoice label={`Delete ${category.name}`} value={false} options={[{ value: false, label: 'Keep category' }, { value: true, label: 'Delete category' }]} onChange={(remove) => remove ? onDelete(category.id) : undefined} />}
      </SettingsGroup>;
    })}
  </View>;
}
