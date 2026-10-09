import { useTheme } from '../theme';
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FocusablePressable } from '../tv';
import useStyles from './parentSecurity.style';
import { useParentSecurity } from './parentSecurity.hook';
import { PIN_LENGTH } from './parentSecurity.constant';

export function ParentSecurityPanel() {
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    currentPin, nextPin, confirmPin, error, notice, saving,
    setCurrentPin, setNextPin, setConfirmPin, submit,
  } = useParentSecurity();

  return (
    <View>
      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>Security</Text>
          <Text style={styles.subtitle}>The PIN that unlocks Parent Mode.</Text>
        </View>
        <Feather name="lock" size={24} color={colors.ink} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change parent PIN</Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Current PIN</Text>
          <TextInput
            value={currentPin}
            onChangeText={setCurrentPin}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            accessibilityLabel="Current parent PIN"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New PIN</Text>
          <TextInput
            value={nextPin}
            onChangeText={setNextPin}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            accessibilityLabel="New parent PIN"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm new PIN</Text>
          <TextInput
            value={confirmPin}
            onChangeText={setConfirmPin}
            style={styles.input}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={PIN_LENGTH}
            accessibilityLabel="Confirm new parent PIN"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <FocusablePressable
          accessibilityLabel="Change parent PIN"
          style={[styles.submit, saving && styles.submitDisabled]}
          disabled={saving}
          onPress={() => void submit()}
        >
          <Feather name="check" size={17} color="#fff" />
          <Text style={styles.submitText}>{saving ? 'Saving…' : 'Change PIN'}</Text>
        </FocusablePressable>

        <Text style={styles.helper}>
          The PIN is stored as a salted digest in the device keystore, never as the digits you
          type. Repeated wrong entries lock PIN entry for a while. If you forget it, the only way
          back in is the reset on the PIN screen, which clears every approved channel and video.
        </Text>
      </View>
    </View>
  );
}
