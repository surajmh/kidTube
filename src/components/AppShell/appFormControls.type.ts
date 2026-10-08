import type React from 'react';
import { Feather } from '@expo/vector-icons';

export type FeatherIconName = keyof typeof Feather.glyphMap;

export type PrimaryButtonProps = { label: string; onPress: () => void; icon?: FeatherIconName; disabled?: boolean };
export type SecondaryButtonProps = { label: string; onPress: () => void };
export type FieldProps = { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'url' | 'number-pad'; autoCapitalize?: 'none' | 'sentences' };
export type FormCardProps = { subtitle: string; children: React.ReactNode; onSave: () => Promise<void> };
