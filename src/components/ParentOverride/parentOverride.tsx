import { SettingsChoice, SettingsToggle } from '../SettingsMenu';
import { useTheme } from '../theme';
import React from 'react';
import { Modal, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { overridePresets } from '../../services/playbackOverrideService';
import { PinEntry } from '../PinEntry';

import { FocusablePressable } from '../tv';
import useStyles from './parentOverride.style';
import { useParentOverride } from './parentOverride.hook';
import { ParentOverrideProps } from './parentOverride.type';

export function ParentOverrideSheet({
  visible,
  profile,
  settings,
  overrideSecondsToday,
  onClose,
  onGranted,
}: ParentOverrideProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { session, pin, setPin, error, busy, scheduleAccess, setScheduleAccess, close, verify, grant } =
    useParentOverride({ profile, settings, onClose, onGranted });


  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={close}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.icon}><Feather name={session ? 'clock' : 'lock'} size={20} color={colors.ink} /></View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{session ? 'Parent override' : 'Parent check'}</Text>
              <Text style={styles.body}>
                {session
                  ? `Add extra time for ${profile?.name ?? 'your child'} today. Their configured limit stays the same.`
                  : `Enter your PIN to unlock extra time for ${profile?.name ?? 'your child'}.`}
              </Text>
            </View>
          </View>

          {overrideSecondsToday > 0 ? (
            <Text style={styles.existing}>
              Already extended by {Math.round(overrideSecondsToday / 60)} minutes today.
            </Text>
          ) : null}

          {!session ? (
            <PinEntry pin={pin} onChange={setPin} onSubmit={() => void verify()} error={error} busy={busy} submitLabel="Unlock override" />
          ) : (
            <>
              <SettingsToggle label="Also allow outside allowed hours" value={scheduleAccess} onChange={setScheduleAccess} />
              <SettingsChoice label="Add extra time" value="" options={overridePresets.map((preset) => ({ value: preset.id, label: preset.label }))}
                onChange={(value) => { const preset = overridePresets.find((item) => item.id === value); if (preset && !busy) return grant(preset); }} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={styles.helper}>An override is temporary and expires automatically. It never changes the saved limit.</Text>
            </>
          )}

          <FocusablePressable accessibilityLabel="Close override" style={styles.cancel} onPress={close}>
            <Text style={styles.cancelText}>Not now</Text>
          </FocusablePressable>
        </View>
      </View>
    </Modal>
  );
}
