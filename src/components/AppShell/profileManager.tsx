import { useTheme } from '../theme';
import React from 'react';
import { Alert,Text,TextInput,View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { Avatar,avatarIcons,avatarOptions } from '../Avatar';

import { useStyles as useStyles } from './appShell.style';
import { PrimaryButton,SecondaryButton } from './appFormControls';
import { useProfileManager } from './profileManager.hook';
import type { ProfileManagerProps } from './profileManager.type';

export function ProfileManager({ profiles, activeProfileId, setActiveProfileId, onChange, onDelete }: ProfileManagerProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { name, setName, avatar, setAvatar, editingId, error, beginEdit, cancelEdit, save } = useProfileManager(profiles, onChange);
  return (
    <View>
      <View style={styles.sectionIntro}><View><Text style={styles.parentSectionTitle}>Little explorers</Text><Text style={styles.parentSectionBody}>Choose who sees the Kid Mode home.</Text></View><Feather name="heart" size={22} color={colors.coral} /></View>
      <View style={styles.profileManagerCard}>
        <Text style={styles.inputLabel}>{editingId ? 'Edit profile' : 'Add a child profile'}</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Profile name" placeholderTextColor={colors.muted} style={styles.textInput} maxLength={24} />
        <View style={styles.avatarPicker}>{avatarOptions.map((option) => <FocusablePressable key={option} accessibilityLabel={`Choose ${option} avatar`} style={[styles.avatarOption, avatar === option && styles.avatarOptionSelected]} onPress={() => setAvatar(option)}><Feather name={avatarIcons[option]} size={23} color={avatar === option ? colors.ink : colors.muted} /></FocusablePressable>)}</View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.formButtonRow}>{editingId ? <SecondaryButton label="Cancel" onPress={cancelEdit} /> : null}<PrimaryButton label={editingId ? 'Save changes' : 'Add profile'} onPress={() => void save()} icon="check" /></View>
      </View>
      <Text style={styles.listLabel}>PROFILES · {profiles.length}</Text>
      {profiles.map((profile) => (
        <View key={profile.id} style={styles.profileRow}>
          <Avatar profile={profile} size={48} />
          <View style={styles.profileRowInfo}>
            <Text style={styles.rowTitle}>{profile.name}</Text>
            <Text style={styles.rowSubtitle}>{activeProfileId === profile.id ? 'Active in Kid Mode' : 'Child profile'}</Text>
          </View>
          {activeProfileId !== profile.id && <FocusablePressable accessibilityLabel={`Use ${profile.name}`} style={styles.smallAction} onPress={() => setActiveProfileId(profile.id)}><Text style={styles.smallActionText}>Use</Text></FocusablePressable>}
          <FocusablePressable accessibilityLabel={`Edit ${profile.name}`} style={styles.iconButton} onPress={() => beginEdit(profile)}><Feather name="edit-2" size={17} color={colors.muted} /></FocusablePressable>
          {profiles.length > 1 && <FocusablePressable accessibilityLabel={`Delete ${profile.name}`} style={styles.iconButton} onPress={() => Alert.alert('Delete profile?', `${profile.name}'s approvals, requests, watch history and screen-time records will be removed too.`, [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void onDelete(profile) }])}><Feather name="trash-2" size={17} color={colors.danger} /></FocusablePressable>}
        </View>
      ))}
    </View>
  );
}
