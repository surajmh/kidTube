import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { PinEntry } from '../PinEntry';
import { colors } from '../theme';
import { ParentSignInResult } from '../../services/auth/parentSession';
import { parentResetService, resetConfirmationPhrase } from '../../services/auth/parentResetService';
import { styles } from './appShell.style';
import { PrimaryButton, SecondaryButton } from './AppFormControls';

function formatLockRemaining(ms: number) {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} min ${String(seconds).padStart(2, '0')} s` : `${seconds} seconds`;
}

/** Self-contained unlock keypad: PIN keystrokes and error copy never reach the app shell. */
export function ParentPinModal({ visible, lockRemainingMs, resetting, onClose, onSubmit, onReset }: {
  visible: boolean;
  lockRemainingMs: number;
  resetting: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => Promise<ParentSignInResult>;
  onReset: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'pin' | 'reset'>('pin');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (visible) {
      setPin('');
      setError('');
      setBusy(false);
      return;
    }
    setStage('pin');
    setConfirmText('');
  }, [visible]);

  async function submit() {
    if (pin.length !== 4) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    setBusy(true);
    try {
      const result = await onSubmit(pin);
      setPin('');
      if (!result.ok) {
        if (result.reason === 'locked') {
          setError('');
        } else if (result.reason === 'not-set') {
          setError('No parent PIN is set on this device.');
        } else {
          setError(
            result.attemptsRemaining <= 1
              ? 'That PIN did not match. One more try before PIN entry locks.'
              : `That PIN did not match. ${result.attemptsRemaining} tries left.`,
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  const locked = lockRemainingMs > 0;
  const canConfirmReset = parentResetService.confirmationMatches(confirmText) && !resetting;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <ScrollView style={styles.pinModal} contentContainerStyle={styles.pinModalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalIcon}><Feather name="lock" size={22} color={colors.ink} /></View>
          <Text style={styles.modalTitle}>Parent check</Text>
          {locked ? (
            <>
              <Text style={styles.modalBody}>
                Too many tries, so PIN entry is locked for {formatLockRemaining(lockRemainingMs)}. The lockout is stored on this device
                and survives a restart.
              </Text>
              {stage === 'pin' ? (
                <FocusablePressable
                  accessibilityLabel="Forgot the parent PIN"
                  style={styles.modalCancel}
                  onPress={() => setStage('reset')}
                >
                  <Text style={styles.modalCancelText}>Forgot your PIN?</Text>
                </FocusablePressable>
              ) : (
                <View style={styles.resetCard}>
                  <Text style={styles.inputLabel}>Reset the parent PIN</Text>
                  <Text style={styles.modalBody}>
                    There is no way to recover a forgotten PIN on this device, so this clears the PIN along with everything you approved:
                    library, approvals, categories, per-child rules, schedules and watch history. It cannot be undone.
                  </Text>
                  <Text style={[styles.inputLabel, styles.resetLabelMargin]}>Type {resetConfirmationPhrase} to continue</Text>
                  <TextInput
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder={resetConfirmationPhrase}
                    placeholderTextColor={colors.muted}
                    style={styles.textInput}
                    autoCapitalize="characters"
                  />
                  <View style={styles.formButtonRow}>
                    <SecondaryButton label="Back" onPress={() => setStage('pin')} />
                    <PrimaryButton
                      label={resetting ? 'Resetting…' : 'Reset everything'}
                      disabled={!canConfirmReset}
                      onPress={onReset}
                      icon="alert-triangle"
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.modalBody}>
                Enter your 4-digit PIN to open grown-up settings. Use the keypad below with a TV remote.
              </Text>
              <PinEntry pin={pin} onChange={setPin} onSubmit={submit} error={error} busy={busy} submitLabel="Unlock parent mode" />
            </>
          )}
          <FocusablePressable accessibilityLabel="Close parent check" style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Not now</Text>
          </FocusablePressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
