import React from 'react';
import { Modal, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { overridePresets } from '../../services/playbackOverrideService';
import { PinEntry } from '../PinEntry';
import { colors } from '../theme';
import { FocusablePressable } from '../tv';
import styles from './parentOverride.style';
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
            <PinEntry pin={pin} onChange={setPin} onSubmit={() => void verify()} error={error} submitLabel="Unlock override" />
          ) : (
            <>
              <View style={styles.presets}>
                {overridePresets.map((preset) => (
                  <FocusablePressable
                    key={preset.id}
                    accessibilityLabel={preset.label}
                    style={styles.preset}
                    disabled={busy}
                    onPress={() => void grant(preset)}
                  >
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </FocusablePressable>
                ))}
              </View>
              <FocusablePressable
                accessibilityLabel="Also allow outside allowed hours"
                style={[styles.scheduleToggle, scheduleAccess && styles.scheduleToggleActive]}
                onPress={() => setScheduleAccess(!scheduleAccess)}
              >
                <Feather name={scheduleAccess ? 'check-square' : 'square'} size={15} color={scheduleAccess ? colors.purple : colors.muted} />
                <Text style={[styles.scheduleText, scheduleAccess && styles.scheduleTextActive]}>
                  Also allow outside allowed hours and bedtime
                </Text>
              </FocusablePressable>
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
