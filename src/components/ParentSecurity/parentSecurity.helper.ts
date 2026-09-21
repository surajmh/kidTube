import { PARENT_SECURITY_COPY, PIN_LENGTH } from './parentSecurity.constant';

/**
 * Local checks that run before the PIN service is called.
 *
 * Ordering matters: a typo in the new PIN or its confirmation is caught here, so it never
 * reaches verify() and never costs the parent one of their attempts against the current PIN.
 * Returns null when the form is fit to submit.
 */
export function validateChange(currentPin: string, nextPin: string, confirmPin: string): string | null {
  if (currentPin.length !== PIN_LENGTH || nextPin.length !== PIN_LENGTH || confirmPin.length !== PIN_LENGTH) {
    return PARENT_SECURITY_COPY.incomplete;
  }
  if (nextPin !== confirmPin) return PARENT_SECURITY_COPY.mismatch;
  // Caught here so the parent gets a precise reason. The service rejects this too, but its
  // throw would surface as the generic save failure.
  if (nextPin === currentPin) return PARENT_SECURITY_COPY.unchanged;
  return null;
}

/** Strips anything that is not a digit and caps the length, so the field cannot hold a non-PIN. */
export function sanitisePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, PIN_LENGTH);
}
