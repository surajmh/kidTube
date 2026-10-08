import React from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { PinEntry } from '../PinEntry';
import { colors } from '../theme';
import { resetConfirmationPhrase } from '../../services/auth/parentResetService';
import { styles } from './appShell.style';
import { PrimaryButton, SecondaryButton } from './appFormControls';
import { formatLockRemaining } from './parentPinModal.helper';
import { useParentPinModal } from './parentPinModal.hook';
import type { ParentPinModalProps } from './parentPinModal.type';

/** Self-contained unlock keypad: PIN keystrokes and error copy never reach the app shell. */
export function ParentPinModal({ visible, lockRemainingMs, resetting, onClose, onSubmit, onReset }: ParentPinModalProps) {
  const { pin, setPin, error, busy, stage, setStage, confirmText, setConfirmText, submit, locked, canConfirmReset } = useParentPinModal({ visible, lockRemainingMs, resetting, onSubmit });
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
