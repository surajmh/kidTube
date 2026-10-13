import { SettingsGroup, SettingsRow, SettingsText } from '../SettingsMenu';
import { useTheme } from '../theme';
import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

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

      <SettingsGroup label="Change parent PIN">
        <SettingsText label="Current parent PIN" value={currentPin} onChange={setCurrentPin} keyboardType="number-pad" secureTextEntry maxLength={PIN_LENGTH} />
        <SettingsText label="New parent PIN" value={nextPin} onChange={setNextPin} keyboardType="number-pad" secureTextEntry maxLength={PIN_LENGTH} />
        <SettingsText label="Confirm new parent PIN" value={confirmPin} onChange={setConfirmPin} keyboardType="number-pad" secureTextEntry maxLength={PIN_LENGTH} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <SettingsRow label={saving ? 'Saving…' : 'Change parent PIN'} disabled={saving} onPress={() => void submit()} />

        <Text style={styles.helper}>
          The PIN is stored as a salted digest in the device keystore, never as the digits you
          type. Repeated wrong entries lock PIN entry for a while. If you forget it, the only way
          back in is the reset on the PIN screen, which clears every approved channel and video.
        </Text>
      </SettingsGroup>
    </View>
  );
}
