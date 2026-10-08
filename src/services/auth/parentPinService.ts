import * as SecureStore from 'expo-secure-store';
import { elapsedSinceBoot } from './monotonicClock';
import { createPinRecordAsync, isPinRecord, verifyPinRecordAsync } from './pinHash';
import type { PinRecord } from './pinHash.type';
import type { PinAttemptState, PinCheckResult, PinLockState } from './parentPinService.type';

/**
 * Parent PIN storage.
 *
 * Hardening rules, all enforced here so no caller can bypass them:
 *   - the raw PIN is never stored and never returned by this module;
 *   - only a salted PBKDF2 digest lives in the OS keystore (Android Keystore / iOS Keychain);
 *   - repeated failures lock the PIN entry for an escalating, temporary window;
 *   - nothing in this file logs the PIN, the digest or the salt.
 */

const pinKey = 'nestling.parent.pin'; // legacy plaintext slot (migrated, then deleted)
const pinRecordKey = 'nestling.parent.pin.v2';
const attemptKey = 'nestling.parent.pin.attempts';

/** Failures before the first lockout, and the (temporary) delay each further failure adds. */
const failureThreshold = 5;
const lockoutLadderMs = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

export const pinPattern = /^\d{4}$/;

async function readAttempts(): Promise<PinAttemptState> {
  try {
    const raw = await SecureStore.getItemAsync(attemptKey);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<PinAttemptState> | null;
    const failures = typeof parsed?.failures === 'number' && Number.isFinite(parsed.failures) ? Math.max(0, Math.floor(parsed.failures)) : 0;
    const lockedUntil = typeof parsed?.lockedUntil === 'number' && Number.isFinite(parsed.lockedUntil) ? parsed.lockedUntil : 0;
    const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
    return { failures, lockedUntil, lockMs: num(parsed?.lockMs), lockedAtElapsed: num(parsed?.lockedAtElapsed) };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

async function writeAttempts(state: PinAttemptState) {
  try {
    await SecureStore.setItemAsync(attemptKey, JSON.stringify(state));
  } catch {
    // A failed write only weakens throttling; it must never break PIN entry.
  }
}

function lockoutDelayFor(failures: number): number {
  if (failures < failureThreshold) return 0;
  const step = Math.min(failures - failureThreshold, lockoutLadderMs.length - 1);
  return lockoutLadderMs[step];
}

/**
 * Time left on the lockout. Within one boot it is measured on the monotonic clock, so moving the
 * device date forward cannot lift it; after a reboot (or without the native clock) it falls back
 * to the stored wall-clock end.
 */
function remainingLockMs(state: PinAttemptState, now: number): number {
  const elapsed = elapsedSinceBoot();
  if (elapsed !== null && state.lockMs !== undefined && state.lockedAtElapsed !== undefined && elapsed >= state.lockedAtElapsed) {
    return Math.max(0, state.lockMs - (elapsed - state.lockedAtElapsed));
  }
  return Math.max(0, state.lockedUntil - now);
}

function describeLock(state: PinAttemptState, now: number): PinLockState {
  const retryAfterMs = remainingLockMs(state, now);
  return {
    locked: retryAfterMs > 0,
    retryAfterMs,
    attemptsRemaining: Math.max(0, failureThreshold - state.failures),
  };
}

async function readRecord(): Promise<PinRecord | null> {
  try {
    const raw = await SecureStore.getItemAsync(pinRecordKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isPinRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export const parentPinService = {
  async hasPin(): Promise<boolean> {
    if (await readRecord()) return true;
    // Legacy installs stored the raw PIN; treat that as "a PIN exists" until it is migrated.
    try {
      return Boolean(await SecureStore.getItemAsync(pinKey));
    } catch {
      return false;
    }
  },

  async lockState(): Promise<PinLockState> {
    return describeLock(await readAttempts(), Date.now());
  },

  /** Validates, hashes and stores a new PIN. The plaintext is not retained anywhere. */
  async setPin(pin: string): Promise<void> {
    if (!pinPattern.test(pin)) throw new Error('The parent PIN must be exactly 4 digits.');
    const record = await createPinRecordAsync(pin);
    await SecureStore.setItemAsync(pinRecordKey, JSON.stringify(record));
    await SecureStore.deleteItemAsync(pinKey).catch(() => undefined);
    await writeAttempts({ failures: 0, lockedUntil: 0 });
  },

  async verify(pin: string): Promise<PinCheckResult> {
    const state = await readAttempts();
    const now = Date.now();
    const locked = remainingLockMs(state, now);
    if (locked > 0) return { ok: false, reason: 'locked', retryAfterMs: locked };

    const record = await readRecord();
    if (record) {
      if (await verifyPinRecordAsync(record, pin)) {
        await writeAttempts({ failures: 0, lockedUntil: 0 });
        return { ok: true };
      }
      return registerFailure(state);
    }

    // Legacy plaintext PIN: verify once, then replace it with a digest.
    let legacy: string | null = null;
    try {
      legacy = await SecureStore.getItemAsync(pinKey);
    } catch {
      legacy = null;
    }
    if (!legacy) return { ok: false, reason: 'not-set' };

    if (legacy !== pin) return registerFailure(state);

    await parentPinService.setPin(pin);
    return { ok: true };
  },

  /**
   * Changes the PIN in one step. It lives here rather than in the UI so the
   * lockout cannot be sidestepped: a caller that verified separately and then
   * called setPin would reset the failure counter on its own authority.
   *
   * The new PIN is checked first, so a typo in it never costs an attempt
   * against the old one. Rejecting an unchanged PIN keeps "changed" honest --
   * a no-op that reports success would leave a parent believing a PIN their
   * child already knows had been replaced.
   *
   * Throws on a malformed or unchanged new PIN, matching setPin's contract;
   * a wrong current PIN comes back as an ordinary PinCheckResult so the caller
   * can show the remaining attempts or the lockout.
   */
  async changePin(currentPin: string, nextPin: string): Promise<PinCheckResult> {
    if (!pinPattern.test(nextPin)) throw new Error('The parent PIN must be exactly 4 digits.');
    if (nextPin === currentPin) throw new Error('Choose a PIN different from the current one.');
    const check = await parentPinService.verify(currentPin);
    if (!check.ok) return check;
    await parentPinService.setPin(nextPin);
    return { ok: true };
  },

  /** Only the destructive reset path may call this. */
  async clearPin(): Promise<void> {
    await SecureStore.deleteItemAsync(pinRecordKey).catch(() => undefined);
    await SecureStore.deleteItemAsync(pinKey).catch(() => undefined);
    await writeAttempts({ failures: 0, lockedUntil: 0 });
  },
};

async function registerFailure(state: PinAttemptState): Promise<PinCheckResult> {
  const failures = state.failures + 1;
  const delay = lockoutDelayFor(failures);
  const lockedUntil = delay > 0 ? Date.now() + delay : 0;
  const elapsed = elapsedSinceBoot();
  await writeAttempts(
    delay > 0 && elapsed !== null ? { failures, lockedUntil, lockMs: delay, lockedAtElapsed: elapsed } : { failures, lockedUntil },
  );

  if (lockedUntil) return { ok: false, reason: 'locked', retryAfterMs: delay };
  return { ok: false, reason: 'mismatch', attemptsRemaining: Math.max(0, failureThreshold - failures) };
}
