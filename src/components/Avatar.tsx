import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChildProfile } from '../types';
import { colors } from './theme';

export const avatarOptions = ['sun', 'cloud', 'moon', 'star'];

export const avatarIcons: Record<string, keyof typeof Feather.glyphMap> = {
  sun: 'sun',
  cloud: 'cloud',
  moon: 'moon',
  star: 'star',
};

export function Avatar({ profile, size }: { profile?: ChildProfile; size: number }) {
  const icon = profile ? avatarIcons[profile.avatar] ?? 'star' : 'user';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Feather name={icon} size={size * 0.48} color={colors.purple} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.lavender, justifyContent: 'center' },
});
