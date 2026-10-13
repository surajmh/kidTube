import React, { useState } from 'react';
import { Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { useTheme } from '../theme';
import { minutesToTime } from '../shared/time.helper';
import useStyles from './settingsMenu.style';
import { useSettingsMenu } from './settingsMenu.hook';
import { SETTINGS_TONES } from './settingsMenu.constant';
import type { SettingsChoiceProps, SettingsGroupProps, SettingsRowProps, SettingsTextProps } from './settingsMenu.type';

export function SettingsRow({ label, accessibilityLabel, value, description, onPress, selected, disabled, preferred, rowRef, icon, tone = 'blue', highlighted, badge }: SettingsRowProps) {
  const styles = useStyles();
  const { dark } = useTheme();
  const [iconColor, iconBackground] = SETTINGS_TONES[tone][dark ? 'dark' : 'light'];
  const [focused, setFocused] = useState(false);
  return <FocusablePressable ref={rowRef} accessibilityLabel={accessibilityLabel ?? label} accessibilityRole={selected === undefined ? 'button' : 'radio'} accessibilityState={{ selected, checked: selected, disabled }}
    hasTVPreferredFocus={Platform.isTV && preferred} disabled={disabled} onPress={onPress} onFocusChange={setFocused}
    style={[styles.row, highlighted && styles.highlighted, disabled && styles.disabled]} focusStyle={styles.focus}>
    {icon ? <View style={[styles.icon, { backgroundColor: iconBackground }]}><Feather name={icon} size={Platform.isTV ? 26 : 21} color={iconColor} /></View> : null}
    <View style={styles.info}><Text style={[styles.label, focused && styles.focusedText]}>{label}</Text>
      {description ? <Text style={[styles.description, focused && styles.focusedText]}>{description}</Text> : null}</View>
    {value ? <Text style={[styles.value, badge && styles.badge, focused && styles.focusedText]}>{value}</Text> : null}
    <Feather name={selected === undefined ? 'chevron-right' : selected ? 'check-circle' : 'circle'} size={22} color={focused || highlighted ? iconColor : dark ? '#91A0B4' : '#718096'} />
  </FocusablePressable>;
}

export function SettingsScreen({ title, onBack, children, busy = false, focusBack = true }: { title: string; onBack: () => void; children: React.ReactNode; busy?: boolean; focusBack?: boolean }) {
  const styles = useStyles();
  return <SafeAreaView style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
      <SettingsRow label="Back" accessibilityLabel={`Back from ${title}`} onPress={onBack} preferred={focusBack} disabled={busy} icon="arrow-left" tone="cyan" highlighted />
      {children}
    </ScrollView>
  </SafeAreaView>;
}

export function SettingsGroup({ label, value, description, children }: SettingsGroupProps) {
  const menu = useSettingsMenu();
  return <>
    <SettingsRow label={label} value={value} description={description} onPress={() => menu.setOpen(true)} rowRef={menu.trigger} />
    {menu.open && <Modal visible onRequestClose={menu.close} animationType="none">
      <SettingsScreen title={label} onBack={menu.close}>{children}</SettingsScreen>
    </Modal>}
  </>;
}

export function SettingsChoice<T>({ label, value, options, onChange, description }: SettingsChoiceProps<T>) {
  const menu = useSettingsMenu();
  const styles = useStyles();
  const selected = options.find((option) => Object.is(option.value, value));
  return <>
    <SettingsRow label={label} value={selected?.label ?? 'Not set'} description={description} onPress={() => menu.setOpen(true)} rowRef={menu.trigger} />
    {menu.open && <Modal visible onRequestClose={menu.close} animationType="none">
      <SettingsScreen title={label} onBack={menu.close} busy={menu.busy} focusBack={false}>
        {options.map((option, index) => <SettingsRow key={index} label={option.label} accessibilityLabel={`${label}: ${option.label}`}
          selected={Object.is(option.value, value)} preferred={selected ? Object.is(option.value, value) : index === 0} disabled={menu.busy} onPress={() => void menu.choose(() => onChange(option.value))} />)}
        {menu.error ? <Text accessibilityRole="alert" style={styles.error}>{menu.error}</Text> : null}
      </SettingsScreen>
    </Modal>}
  </>;
}

export function SettingsToggle({ label, value, onChange, description }: Omit<SettingsChoiceProps<boolean>, 'options'>) {
  return <SettingsChoice label={label} value={value} onChange={onChange} description={description} options={[{ value: true, label: 'On' }, { value: false, label: 'Off' }]} />;
}

export function SettingsTime({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void | Promise<void> }) {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return <SettingsGroup label={label} value={minutesToTime(value)}>
    <SettingsChoice label={`${label} hour`} value={hour} options={Array.from({ length: 24 }, (_, value) => ({ value, label: String(value).padStart(2, '0') }))} onChange={(next) => onChange(next * 60 + minute)} />
    <SettingsChoice label={`${label} minute`} value={minute} options={Array.from({ length: 60 }, (_, value) => ({ value, label: String(value).padStart(2, '0') }))} onChange={(next) => onChange(hour * 60 + next)} />
  </SettingsGroup>;
}

export function SettingsText({ label, value, onChange, secureTextEntry, ...inputProps }: SettingsTextProps) {
  const styles = useStyles();
  return <SettingsGroup label={label} value={secureTextEntry ? (value ? '••••' : 'Not set') : value || 'Not set'}>
    <TextInput {...inputProps} accessibilityLabel={`Edit ${label}`} value={value} onChangeText={onChange} secureTextEntry={secureTextEntry} style={styles.input} />
  </SettingsGroup>;
}
