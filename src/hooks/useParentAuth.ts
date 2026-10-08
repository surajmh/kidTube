import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { parentPinService } from '../services/auth/parentPinService';
import { parentSessionService } from '../services/auth/parentSession';
import type { ParentSession, ParentSignInResult } from '../services/auth/parentSession.type';
import { parentResetService } from '../services/auth/parentResetService';
import type { Screen } from './useKidNavigation.type';

/**
 * Parent-mode sign-in: the PIN keypad, session lifetime, lockout countdown and the destructive
 * PIN-reset path. Everything the reset wipes outside of auth itself is handed back through
 * `onResetAll`, so this hook does not need to know about content, requests or navigation state.
 */
export function useParentAuth({
  screen,
  onSessionExpired,
  onSignedIn,
  onResetAll,
  setSetupStep,
}: {
  screen: Screen;
  onSessionExpired: () => void;
  onSignedIn: () => void;
  onResetAll: () => void;
  setSetupStep: (step: 'pin' | 'profile' | null) => void;
}) {
  const [parentSession, setParentSession] = useState<ParentSession | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinLockRemainingMs, setPinLockRemainingMs] = useState(0);
  const [resetting, setResetting] = useState(false);

  // A parent session expiring while Parent Mode is open must drop back to Kid Mode, not linger.
  useEffect(() => {
    if (screen !== 'parent') return;
    const check = () => {
      if (parentSessionService.isActive()) return;
      parentSessionService.end();
      setParentSession(null);
      onSessionExpired();
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') check();
    });
    const interval = setInterval(check, 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [screen]);

  // A lockout is timed, so the countdown ticks down while the PIN screen is open.
  useEffect(() => {
    if (pinLockRemainingMs <= 0) return;
    const interval = setInterval(() => {
      setPinLockRemainingMs((remaining) => (remaining <= 1_000 ? 0 : remaining - 1_000));
    }, 1_000);
    return () => clearInterval(interval);
  }, [pinLockRemainingMs > 0]);

  async function enterParentMode() {
    // A lockout survives app restarts, so the countdown is restored before the keypad appears.
    const lock = await parentPinService.lockState();
    setPinLockRemainingMs(lock.locked ? lock.retryAfterMs : 0);
    setPinModalVisible(true);
  }

  /** Verifies a PIN typed inside `ParentPinModal`; the modal turns the result into its own error copy. */
  async function verifyParentPin(value: string): Promise<ParentSignInResult> {
    const result = await parentSessionService.startWithPin(value);
    if (!result.ok) {
      if (result.reason === 'locked') setPinLockRemainingMs(result.retryAfterMs);
      return result;
    }
    setPinLockRemainingMs(0);
    setPinModalVisible(false);
    setParentSession(result.session);
    onSignedIn();
    return result;
  }

  function exitParentMode() {
    parentSessionService.end();
    setParentSession(null);
  }

  async function finishPinSetup(value: string): Promise<string | null> {
    try {
      await parentPinService.setPin(value);
    } catch {
      return 'That PIN could not be saved. Try a different 4-digit PIN.';
    }
    // The PIN was just set by the parent, so this session is authorized.
    setParentSession(parentSessionService.grant());
    setSetupStep('profile');
    return null;
  }

  /**
   * The only PIN recovery path: destructive, lockout-only and phrase-confirmed. Everything the
   * parent configured is wiped, so this cannot be used to reach the existing setup.
   */
  async function resetParentPin() {
    setResetting(true);
    try {
      await parentResetService.resetEverything();
      parentSessionService.end();
      onResetAll();
      setParentSession(null);
      setPinModalVisible(false);
      setPinLockRemainingMs(0);
    } finally {
      setResetting(false);
    }
  }

  return {
    parentSession,
    pinModalVisible,
    setPinModalVisible,
    pinLockRemainingMs,
    resetting,
    enterParentMode,
    verifyParentPin,
    exitParentMode,
    finishPinSetup,
    resetParentPin,
  };
}
