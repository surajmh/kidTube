import React from 'react';
import type { ContentCategory } from '../../types';
import { SettingsGroup, SettingsToggle } from '../SettingsMenu';

export function CategoryEditor<T extends { categoryIds?: string[] }>({ item, categories, onToggle }: {
  item: T; categories: ContentCategory[]; onToggle: (item: T, categoryId: string, assigned: boolean) => void;
}) {
  return <SettingsGroup label="Assigned categories">{categories.map((category) => {
    const assigned = Boolean(item.categoryIds?.includes(category.id));
    return <SettingsToggle key={category.id} label={category.name} value={assigned} onChange={(next) => next === assigned ? undefined : onToggle(item, category.id, assigned)} />;
  })}</SettingsGroup>;
}
