/**
 * Parent-facing wording for a failed PIN check.
 *
 * Shared because every PIN entry in the app -- the playback override and the PIN change --
 * must describe a failure identically. Two copies would drift, and the one that drifted
 * would be the one quietly under-reporting how close the entry is to locking.
 */

/** The failure half of a PIN check, as the session and PIN services report it. */
export type PinFailure = {
  reason: 'mismatch' | 'locked' | 'not-set';
  attemptsRemaining: number;
  retryAfterMs: number;
};

export const PIN_FAILURE_COPY = {
  noPinSet: 'No parent PIN is set on this device.',
  lastTry: 'That PIN did not match. One more try before PIN entry locks.',
} as const;

const MINUTE_MS = 60_000;

/**
 * The remaining-attempts warning is deliberate: a parent should know the entry is about to lock
 * before it does, rather than discovering it by being locked out. The lockout wait rounds up, so
 * it never promises a retry sooner than the service will allow.
 */
export function describePinFailure(failure: PinFailure): string {
  if (failure.reason === 'locked') {
    return `Too many tries. Try again in ${Math.ceil(failure.retryAfterMs / MINUTE_MS)} min.`;
  }
  if (failure.reason === 'not-set') return PIN_FAILURE_COPY.noPinSet;
  return failure.attemptsRemaining <= 1
    ? PIN_FAILURE_COPY.lastTry
    : `That PIN did not match. ${failure.attemptsRemaining} tries left.`;
}
