import { useState } from 'react';
import { avatarOptions } from '../Avatar';
import { ChildProfile } from '../../types';
import { id } from '../../utils/id';

export function useProfileManager(profiles: ChildProfile[], onChange: (profiles: ChildProfile[]) => Promise<void>) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function beginEdit(profile: ChildProfile) {
    setEditingId(profile.id); setName(profile.name); setAvatar(profile.avatar); setError('');
  }
  function cancelEdit() {
    setEditingId(null); setName('');
  }
  async function save() {
    if (!name.trim()) { setError('Add a name first.'); return; }
    const next = editingId
      ? profiles.map((profile) => profile.id === editingId ? { ...profile, name: name.trim(), avatar } : profile)
      : [...profiles, { id: id('profile'), name: name.trim(), avatar }];
    await onChange(next);
    setName(''); setEditingId(null); setError('');
  }
  return { name, setName, avatar, setAvatar, editingId, error, beginEdit, cancelEdit, save };
}
