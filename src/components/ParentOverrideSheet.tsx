import React, { useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ChildProfile } from '../types';
import { Phase3Settings } from '../phase3Types';
import { PlaybackOverride } from '../phase4Types';
import { ParentSession, parentSessionService } from '../services/auth/parentSession';
import { OverridePreset, overridePresets, playbackOverrideService } from '../services/playbackOverrideService';
import { PinEntry } from './PinEntry';
import { colors } from './theme';
import { FocusablePressable } from './tv';

/**
 * Requirement 10: a parent can unlock more time without changing the child's
 * configured limit. Reached from Kid Mode, so it always asks for the PIN.
 */
export function ParentOverrideSheet({
  visible,
  profile,
  settings,
  overrideSecondsToday,
  onClose,
  onGranted,
}: {
  visible: boolean;
  profile?: ChildProfile;
  settings: Phase3Settings;
  overrideSecondsToday: number;
  onClose: () => void;
  onGranted: (overrides: PlaybackOverride[]) => void;
}) {
  const [session, setSession] = useState<ParentSession | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scheduleAccess, setScheduleAccess] = useState(false);

  function reset() {
    // Never leave an unlocked parent session behind after this sheet closes.
    parentSessionService.end();
    setSession(null);
    setPin('');
    setError('');
    setScheduleAccess(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function verify() {
    const result = await parentSessionService.startWithPin(pin);
    setPin('');
    if (!result.ok) {
      if (result.reason === 'locked') {
        setError(`Too many tries. Try again in ${Math.ceil(result.retryAfterMs / 60_000)} min.`);
      } else if (result.reason === 'not-set') {
        setError('No parent PIN is set on this device.');
      } else {
        setError(
          result.attemptsRemaining <= 1
            ? 'That PIN did not match. One more try before PIN entry locks.'
            : `That PIN did not match. ${result.attemptsRemaining} tries left.`,
        );
      }
      return;
    }
    setError('');
    setSession(result.session);
  }

  async function grant(preset: OverridePreset) {
    if (!session || !profile) return;
    setBusy(true);
    try {
      const overrides = await playbackOverrideService.grant(session, {
        profileId: profile.id,
        preset,
        settings,
        grantsScheduleAccess: scheduleAccess,
      });
      onGranted(overrides);
      close();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That override could not be saved.');
    } finally {
      setBusy(false);
    }
  }

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

const styles = StyleSheet.create({
  scrim: { alignItems: 'center', backgroundColor: 'rgba(36, 48, 71, 0.48)', flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.card, borderRadius: 24, padding: 20, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  icon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 20, height: 42, justifyContent: 'center', width: 42 },
  headerText: { flex: 1 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  existing: { backgroundColor: colors.mint, borderRadius: 12, color: colors.mintDark, fontSize: 12, fontWeight: '800', marginTop: 14, padding: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  preset: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 13, flexGrow: 1, minHeight: 52, justifyContent: 'center', paddingHorizontal: 14 },
  presetText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  scheduleToggle: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 12, minHeight: 48, paddingHorizontal: 11 },
  scheduleToggleActive: { backgroundColor: colors.lavender },
  scheduleText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: '800' },
  scheduleTextActive: { color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  cancel: { alignItems: 'center', height: 46, justifyContent: 'center', marginTop: 12 },
  cancelText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
