import { useEffect, useState } from 'react';
import { parentResetService } from '../../services/auth/parentResetService';
import type { ParentPinModalProps } from './parentPinModal.type';

export function useParentPinModal({ visible, lockRemainingMs, resetting, onSubmit }: Pick<ParentPinModalProps, 'visible' | 'lockRemainingMs' | 'resetting' | 'onSubmit'>) {
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

  return { pin, setPin, error, busy, stage, setStage, confirmText, setConfirmText, submit, locked, canConfirmReset };
}
