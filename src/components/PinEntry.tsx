import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from './theme';
import { FocusablePressable } from './tv';

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Parent PIN entry.
 *
 * Phones get a secure text field; Android TV remotes get a D-pad keypad, so the
 * PIN never depends on an OS keyboard.
 */
export function PinEntry({
  pin,
  onChange,
  onSubmit,
  error,
  helper,
  submitLabel = 'Unlock parent mode',
}: {
  pin: string;
  onChange: (pin: string) => void;
  onSubmit: () => void;
  error?: string;
  helper?: string;
  submitLabel?: string;
}) {
  return (
    <View>
      <TextInput
        value={pin}
        onChangeText={(value) => onChange(value.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="••••"
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityLabel="Four digit parent PIN"
      />
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={[styles.dot, pin.length > index && styles.dotFilled]} />
        ))}
      </View>
      <View style={styles.keypad}>
        {digits.map((digit) => (
          <FocusablePressable
            key={digit}
            accessibilityLabel={`PIN digit ${digit}`}
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
      {error ? <Text style={styles.error}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <FocusablePressable accessibilityLabel={submitLabel} style={styles.submit} onPress={onSubmit}>
        <Text style={styles.submitText}>{submitLabel}</Text>
        <Feather name="unlock" size={18} color="#fff" />
      </FocusablePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    height: 56,
    letterSpacing: 10,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
  inputError: { borderColor: colors.danger },
  dots: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
  dot: { backgroundColor: colors.line, borderRadius: 7, height: 13, width: 13 },
  dotFilled: { backgroundColor: colors.purple },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  key: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 13, height: 52, justifyContent: 'center', width: '30%' },
  keyLabel: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: 'center' },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
    marginTop: 16,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
