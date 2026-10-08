/** The failure half of a PIN check, as the session and PIN services report it. */
export type PinFailure = {
  reason: 'mismatch' | 'locked' | 'not-set';
  attemptsRemaining: number;
  retryAfterMs: number;
};
