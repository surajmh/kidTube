import React from 'react';
import { Text, View } from 'react-native';
import { avatarOptions } from '../Avatar';
import { SettingsChoice, SettingsGroup, SettingsRow, SettingsText } from '../SettingsMenu';
import { useStyles } from './appShell.style';
import { useProfileManager } from './profileManager.hook';
import type { ProfileManagerProps } from './profileManager.type';

export function ProfileManager({ profiles, activeProfileId, setActiveProfileId, onChange, onDelete }: ProfileManagerProps) {
  const styles = useStyles();
  const { name, setName, avatar, setAvatar, editingId, error, beginEdit, cancelEdit, save } = useProfileManager(profiles, onChange);
  const form = <>
    <SettingsText label="Profile name" value={name} onChange={setName} maxLength={24} />
    <SettingsChoice label="Avatar" value={avatar} options={avatarOptions.map((value) => ({ value, label: value }))} onChange={setAvatar} />
    {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    <SettingsRow label={editingId ? 'Save changes' : 'Add profile'} onPress={() => void save()} />
    {editingId && <SettingsRow label="Cancel editing" onPress={cancelEdit} />}
  </>;
  return <View>
    <SettingsGroup label="Add a child profile">
      {editingId ? <SettingsRow label="Start a new profile" onPress={cancelEdit} /> : form}
    </SettingsGroup>
    {profiles.map((profile) => <SettingsGroup key={profile.id} label={profile.name} value={activeProfileId === profile.id ? 'Active' : 'Child profile'}>
      {activeProfileId !== profile.id && <SettingsRow label={`Use ${profile.name}`} onPress={() => setActiveProfileId(profile.id)} />}
      {editingId === profile.id ? form : <SettingsRow label={`Edit ${profile.name}`} onPress={() => beginEdit(profile)} />}
      {profiles.length > 1 && <SettingsChoice label={`Delete ${profile.name}`} value={false}
        description="This removes the child's approvals, requests, watch history and screen-time records."
        options={[{ value: false, label: 'Keep profile' }, { value: true, label: 'Delete profile' }]}
        onChange={(remove) => remove ? onDelete(profile) : undefined} />}
    </SettingsGroup>)}
  </View>;
}
