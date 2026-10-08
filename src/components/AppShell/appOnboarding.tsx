import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { PinEntry } from '../PinEntry';
import { avatarIcons, avatarOptions } from '../Avatar';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import { styles } from './appShell.style';
import { Brand } from './loadingScreen';
import { PrimaryButton } from './appFormControls';
import { usePinSetup, useProfileSetup } from './appOnboarding.hook';
import type { PinSetupProps, ProfileSetupProps } from './appOnboarding.type';

/** Self-contained PIN creation step: keystrokes never reach the app shell. */
export function PinSetup({ onSubmit }: PinSetupProps) {
  const { pin, setPin, error, busy, submit } = usePinSetup(onSubmit);
  return (
    <KeyboardAvoidingView style={styles.setupFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.setupScreen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Brand />
      <View style={styles.setupHero}>
        <View style={styles.heroOrb}><Feather name="lock" size={38} color={colors.ink} /></View>
        <Text style={styles.eyebrow}>A little grown-up setup</Text>
        <Text style={styles.heroTitle}>Make this nest{`\n`}just for them.</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Your private PIN</Text>
        <PinEntry pin={pin} onChange={setPin} onSubmit={submit} error={error} busy={busy} helper="Keep it somewhere safe — kids won’t see this screen." submitLabel="Create parent PIN" />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ProfileSetup({ onSubmit }: ProfileSetupProps) {
  const { name, setName, avatar, setAvatar, error, submit } = useProfileSetup(onSubmit);
  return (
    <KeyboardAvoidingView style={styles.setupFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.setupScreen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Brand />
      <View style={styles.setupHero}>
        <View style={[styles.heroOrb, { backgroundColor: colors.peach }]}><Feather name="heart" size={38} color={colors.coral} /></View>
        <Text style={styles.eyebrow}>First little explorer</Text>
        <Text style={styles.heroTitle}>Who’s watching{`\n`}today?</Text>
        <Text style={styles.heroBody}>Create a profile for your child. You can add more profiles from Parent Mode anytime.</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Their name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Milo" placeholderTextColor={colors.muted} style={styles.textInput} maxLength={24} />
        <Text style={[styles.inputLabel, { marginTop: 18 }]}>Pick a little icon</Text>
        <View style={styles.avatarPicker}>
          {avatarOptions.map((option) => (
            <FocusablePressable key={option} accessibilityLabel={`Choose ${option} avatar`} style={[styles.avatarOption, avatar === option && styles.avatarOptionSelected]} onPress={() => setAvatar(option)}>
              <Feather name={avatarIcons[option]} size={25} color={avatar === option ? colors.ink : colors.muted} />
            </FocusablePressable>
          ))}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label="Create profile" onPress={submit} icon="arrow-right" />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
