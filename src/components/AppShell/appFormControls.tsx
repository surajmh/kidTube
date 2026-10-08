import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { colors } from '../theme';
import { styles } from './appShell.style';
import { useFormCard } from './appFormControls.hook';
import type { AddButtonProps, FieldProps, FormCardProps, PrimaryButtonProps, SecondaryButtonProps } from './appFormControls.type';

export function PrimaryButton({ label, onPress, icon, disabled = false }: PrimaryButtonProps) {
  return <FocusablePressable disabled={disabled} accessibilityLabel={label} style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryButtonText}>{label}</Text>{icon ? <Feather name={icon} size={18} color="#fff" /> : null}</FocusablePressable>;
}

export function SecondaryButton({ label, onPress }: SecondaryButtonProps) {
  return <FocusablePressable accessibilityLabel={label} style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryButtonText}>{label}</Text></FocusablePressable>;
}

export function AddButton({ label, icon, onPress }: AddButtonProps) {
  return <FocusablePressable accessibilityLabel={label} style={styles.addButton} onPress={onPress}><Feather name={icon} size={18} color={colors.ink} /><Text style={styles.addButtonText}>{label}</Text><Feather name="plus" size={16} color={colors.ink} /></FocusablePressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize = 'sentences' }: FieldProps) {
  return <View style={styles.field}><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.textInput} keyboardType={keyboardType} autoCapitalize={autoCapitalize} /></View>;
}

export function FormCard({ title, subtitle, children, onCancel, onSave }: FormCardProps) {
  const { saving, error, save } = useFormCard(onSave);
  return (
    <View style={styles.formPanel}>
      <View style={styles.formPanelHeader}>
        <View><Text style={styles.formPanelTitle}>{title}</Text><Text style={styles.formPanelSubtitle}>{subtitle}</Text></View>
        <FocusablePressable accessibilityLabel="Close form" style={styles.iconButton} onPress={onCancel}><Feather name="x" size={20} color={colors.muted} /></FocusablePressable>
      </View>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.formButtonRow}>
        <SecondaryButton label="Cancel" onPress={onCancel} />
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save approval'}
          disabled={saving}
          onPress={save}
          icon="check"
        />
      </View>
    </View>
  );
}
