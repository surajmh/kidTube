import { PARENT_OVERRIDE_COPY } from './parentOverride.constant';
import { PinFailure } from './parentOverride.type';

const MINUTE_MS = 60_000;

/**
 * Parent-facing wording for a failed PIN check.
 *
 * The remaining-attempts warning is deliberate: a parent should know the entry is about to lock
 * before it does, rather than discovering it by being locked out. The lockout wait rounds up, so
 * it never promises a retry sooner than the service will allow.
 */
export function describePinFailure(failure: PinFailure): string {
  if (failure.reason === 'locked') {
    return `Too many tries. Try again in ${Math.ceil(failure.retryAfterMs / MINUTE_MS)} min.`;
  }
  if (failure.reason === 'not-set') return PARENT_OVERRIDE_COPY.noPinSet;
  return failure.attemptsRemaining <= 1
    ? PARENT_OVERRIDE_COPY.lastTry
    : `That PIN did not match. ${failure.attemptsRemaining} tries left.`;
}
