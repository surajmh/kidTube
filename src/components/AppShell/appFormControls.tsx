import { useTheme } from '../theme';
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';

import { useStyles as useStyles } from './appShell.style';
import { useFormCard } from './appFormControls.hook';
import type { FieldProps, FormCardProps, PrimaryButtonProps, SecondaryButtonProps } from './appFormControls.type';

export function PrimaryButton({ label, onPress, icon, disabled = false }: PrimaryButtonProps) {
  const styles = useStyles();
  return <FocusablePressable disabled={disabled} accessibilityLabel={label} style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryButtonText}>{label}</Text>{icon ? <Feather name={icon} size={18} color="#fff" /> : null}</FocusablePressable>;
}

export function SecondaryButton({ label, onPress }: SecondaryButtonProps) {
  const styles = useStyles();
  return <FocusablePressable accessibilityLabel={label} style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryButtonText}>{label}</Text></FocusablePressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize = 'sentences' }: FieldProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return <View style={styles.field}><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.textInput} keyboardType={keyboardType} autoCapitalize={autoCapitalize} /></View>;
}

export function FormCard({ subtitle, children, onSave }: FormCardProps) {
  const styles = useStyles();
  const { saving, error, save } = useFormCard(onSave);
  return (
    <View>
      <Text style={styles.formPanelSubtitle}>{subtitle}</Text>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.formButtonRow}>
        <PrimaryButton label={saving ? 'Saving…' : 'Save approval'} disabled={saving} onPress={save} icon="check" />
      </View>
    </View>
  );
}
