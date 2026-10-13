import type React from 'react';
import type { TextInputProps, View } from 'react-native';
import type { Feather } from '@expo/vector-icons';
import type { SETTINGS_TONES } from './settingsMenu.constant';

export type SettingsRowProps = {
  label: string;
  accessibilityLabel?: string;
  value?: string;
  description?: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  preferred?: boolean;
  rowRef?: React.Ref<View>;
  icon?: React.ComponentProps<typeof Feather>['name'];
  tone?: keyof typeof SETTINGS_TONES;
  highlighted?: boolean;
  badge?: boolean;
};
export type SettingsGroupProps = { label: string; value?: string; description?: string; children: React.ReactNode };
export type SettingsChoiceProps<T> = {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void | Promise<void>;
  description?: string;
};
export type SettingsTextProps = Pick<TextInputProps, 'keyboardType' | 'secureTextEntry' | 'maxLength' | 'autoCapitalize'> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
};
