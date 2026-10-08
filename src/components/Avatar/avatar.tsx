import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';
import { avatarIcons } from './avatar.constant';
import styles from './avatar.style';
import { AvatarProps } from './avatar.type';

export function Avatar({ profile, size }: AvatarProps) {
  const icon = profile ? avatarIcons[profile.avatar] ?? 'star' : 'user';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Feather name={icon} size={size * 0.48} color={colors.ink} />
    </View>
  );
}
