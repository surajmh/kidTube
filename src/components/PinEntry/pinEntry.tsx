import { useTheme } from '../theme';
import React from 'react';
import { ActivityIndicator, Platform, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FocusablePressable } from '../tv';
import { digits } from './pinEntry.constant';
import useStyles from './pinEntry.style';
import type { PinEntryProps } from './pinEntry.type';

/**
 * Parent PIN entry.
 *
 * Phones get a secure text field; Android TV remotes get a D-pad keypad, so the
 * PIN never depends on an OS keyboard. While `busy`, entry freezes and the submit
 * button shows a spinner, so a slow verification reads as work in progress
 * rather than a dead screen.
 */
export function PinEntry({
  pin,
  onChange,
  onSubmit,
  error,
  helper,
  busy = false,
  submitLabel = 'Unlock parent mode',
}: PinEntryProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View>
      <View pointerEvents={busy ? 'none' : 'auto'}>
        {!Platform.isTV ? <TextInput
          value={pin}
          onChangeText={(value) => onChange(value.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="••••"
          placeholderTextColor={colors.muted}
          style={[styles.input, error ? styles.inputError : null]}
          accessibilityLabel="Four digit parent PIN"
        /> : null}
        <View style={[styles.dots, Platform.isTV && { marginTop: 4, marginBottom: 8 }]} accessibilityLabel={`${pin.length} of 4 PIN digits entered`}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={[styles.dot, pin.length > index && styles.dotFilled]} />
          ))}
        </View>
        <View style={styles.keypad}>
          {digits.map((digit) => (
            <FocusablePressable
              key={digit}
              accessibilityLabel={`PIN digit ${digit}`}
              hasTVPreferredFocus={Platform.isTV && digit === '1'}
              style={styles.key}
              onPress={() => onChange((pin + digit).slice(0, 4))}
            >
              <Text style={styles.keyLabel}>{digit}</Text>
            </FocusablePressable>
          ))}
          <FocusablePressable accessibilityLabel="Clear PIN" style={styles.key} onPress={() => onChange('')}>
            <Feather name="x" size={20} color={colors.muted} />
          </FocusablePressable>
          <FocusablePressable
            accessibilityLabel="PIN digit 0"
            style={styles.key}
            onPress={() => onChange((pin + '0').slice(0, 4))}
          >
            <Text style={styles.keyLabel}>0</Text>
          </FocusablePressable>
          <FocusablePressable
            accessibilityLabel="Delete last PIN digit"
            style={styles.key}
            onPress={() => onChange(pin.slice(0, -1))}
          >
            <Feather name="delete" size={20} color={colors.muted} />
          </FocusablePressable>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <FocusablePressable
        accessibilityLabel={submitLabel}
        style={[styles.submit, busy && styles.submitBusy]}
        disabled={busy}
        onPress={onSubmit}
      >
        <Text style={styles.submitText}>{busy ? 'Checking…' : submitLabel}</Text>
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="unlock" size={18} color="#fff" />}
      </FocusablePressable>
    </View>
  );
}
