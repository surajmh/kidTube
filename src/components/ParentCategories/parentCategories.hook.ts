import { useCallback, useState } from 'react';
import { PARENT_CATEGORIES_COPY } from './parentCategories.constant';
import { ParentCategoriesProps } from './parentCategories.type';

type UseParentCategoriesInput = Pick<ParentCategoriesProps, 'onCreate' | 'onRename'>;

/** Create-or-rename state for the category editor. One field serves both. */
export function useParentCategories({ onCreate, onRename }: UseParentCategoriesInput) {
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startEdit = useCallback((categoryId: string, currentName: string) => {
    setEditingId(categoryId);
    setName(currentName);
    setError('');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setName('');
    setError('');
  }, []);

  const submit = useCallback(async () => {
    setError('');
    try {
      if (editingId) await onRename(editingId, name);
      else await onCreate(name);
      // Only clear on success, so a rejected name is not lost and can be corrected.
      setName('');
      setEditingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : PARENT_CATEGORIES_COPY.saveFailed);
    }
  }, [editingId, name, onCreate, onRename]);

  return { name, setName, editingId, error, startEdit, cancelEdit, submit };
}
