import { useState } from 'react';

export function useFormCard(onSave: () => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setSaving(true);
    setError('');
    try {
      await onSave();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That could not be saved.');
    } finally {
      setSaving(false);
    }
  }
  return { saving, error, save };
}
