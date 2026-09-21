import { useCallback, useState } from 'react';
import { parentPinService } from '../../services/auth/parentPinService';
import { describePinFailure } from '../shared/pinFailure.helper';
import { PARENT_SECURITY_COPY } from './parentSecurity.constant';
import { sanitisePin, validateChange } from './parentSecurity.helper';
import { ParentSecurityHook } from './parentSecurity.type';

export function useParentSecurity(): ParentSecurityHook {
  const [currentPin, setCurrentRaw] = useState('');
  const [nextPin, setNextRaw] = useState('');
  const [confirmPin, setConfirmRaw] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Typing anywhere clears the previous outcome: leaving "PIN changed" on screen while the
  // parent edits the fields again would misreport the state of the next attempt.
  const clearOutcome = useCallback(() => { setError(''); setNotice(''); }, []);

  const setCurrentPin = useCallback((value: string) => {
    setCurrentRaw(sanitisePin(value));
    clearOutcome();
  }, [clearOutcome]);

  const setNextPin = useCallback((value: string) => {
    setNextRaw(sanitisePin(value));
    clearOutcome();
  }, [clearOutcome]);

  const setConfirmPin = useCallback((value: string) => {
    setConfirmRaw(sanitisePin(value));
    clearOutcome();
  }, [clearOutcome]);

  const submit = useCallback(async () => {
    const localError = validateChange(currentPin, nextPin, confirmPin);
    if (localError) {
      setError(localError);
      return;
    }

    setSaving(true);
    try {
      const result = await parentPinService.changePin(currentPin, nextPin);
      if (!result.ok) {
        setError(describePinFailure({
          reason: result.reason,
          attemptsRemaining: 'attemptsRemaining' in result ? result.attemptsRemaining : 0,
          retryAfterMs: 'retryAfterMs' in result ? result.retryAfterMs : 0,
        }));
        // Only the current-PIN field is cleared. Making the parent retype a new PIN they
        // already entered correctly would invite them to pick something easier.
        setCurrentRaw('');
        return;
      }
      setNotice(PARENT_SECURITY_COPY.saved);
      // Cleared on success so the new PIN is not left sitting on screen.
      setCurrentRaw('');
      setNextRaw('');
      setConfirmRaw('');
    } catch {
      // changePin throws on a malformed or unchanged new PIN. The message is deliberately
      // generic rather than echoing the PIN back into the UI.
      setError(PARENT_SECURITY_COPY.failed);
    } finally {
      setSaving(false);
    }
  }, [currentPin, nextPin, confirmPin]);

  return {
    currentPin, nextPin, confirmPin, error, notice, saving,
    setCurrentPin, setNextPin, setConfirmPin, submit,
  };
}
