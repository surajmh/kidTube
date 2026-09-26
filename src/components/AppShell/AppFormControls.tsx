import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { colors } from '../theme';
import { styles } from './appShell.style';

export function PrimaryButton({ label, onPress, icon, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof Feather.glyphMap; disabled?: boolean }) {
  return <FocusablePressable disabled={disabled} accessibilityLabel={label} style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryButtonText}>{label}</Text>{icon ? <Feather name={icon} size={18} color="#fff" /> : null}</FocusablePressable>;
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <FocusablePressable accessibilityLabel={label} style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryButtonText}>{label}</Text></FocusablePressable>;
}

export function AddButton({ label, icon, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  return <FocusablePressable accessibilityLabel={label} style={styles.addButton} onPress={onPress}><Feather name={icon} size={18} color={colors.ink} /><Text style={styles.addButtonText}>{label}</Text><Feather name="plus" size={16} color={colors.ink} /></FocusablePressable>;
}

export function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize = 'sentences' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'url' | 'number-pad'; autoCapitalize?: 'none' | 'sentences' }) {
  return <View style={styles.field}><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={styles.textInput} keyboardType={keyboardType} autoCapitalize={autoCapitalize} /></View>;
}

export function FormCard({ title, subtitle, children, onCancel, onSave }: { title: string; subtitle: string; children: React.ReactNode; onCancel: () => void; onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
          onPress={async () => {
            setSaving(true);
            setError('');
            try {
              await onSave();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'That could not be saved.');
            } finally {
              setSaving(false);
            }
          }}
          icon="check"
        />
      </View>
    </View>
  );
}
