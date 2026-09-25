import { useCallback, useState } from 'react';
import { ParentSession, parentSessionService } from '../../services/auth/parentSession';
import { OverridePreset, playbackOverrideService } from '../../services/playbackOverrideService';
import { PARENT_OVERRIDE_COPY } from './parentOverride.constant';
import { describePinFailure } from './parentOverride.helper';
import { ParentOverrideProps } from './parentOverride.type';

type UseParentOverrideInput = Pick<ParentOverrideProps, 'profile' | 'settings' | 'onClose' | 'onGranted'>;

/**
 * PIN check and override granting for the sheet.
 *
 * Reached from Kid Mode, so it always asks for the PIN, and closing always ends the parent
 * session: leaving one live would hand the child an unlocked Parent Mode.
 */
export function useParentOverride({ profile, settings, onClose, onGranted }: UseParentOverrideInput) {
  const [session, setSession] = useState<ParentSession | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scheduleAccess, setScheduleAccess] = useState(false);

  const reset = useCallback(() => {
    // Never leave an unlocked parent session behind after this sheet closes.
    parentSessionService.end();
    setSession(null);
    setPin('');
    setError('');
    setScheduleAccess(false);
  }, []);

  const close = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const verify = useCallback(async () => {
    setBusy(true);
    try {
      const result = await parentSessionService.startWithPin(pin);
      // Clear the entry either way, so a wrong PIN is never left sitting in the field.
      setPin('');
      if (!result.ok) {
        setError(describePinFailure(result));
        return;
      }
      setError('');
      setSession(result.session);
    } finally {
      setBusy(false);
    }
  }, [pin]);

  const grant = useCallback(
    async (preset: OverridePreset) => {
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
        setError(caught instanceof Error ? caught.message : PARENT_OVERRIDE_COPY.grantFailed);
      } finally {
        setBusy(false);
      }
    },
    [session, profile, settings, scheduleAccess, onGranted, close],
  );

  return { session, pin, setPin, error, busy, scheduleAccess, setScheduleAccess, reset, close, verify, grant };
}
