export type PinAttemptState = {
  failures: number;
  /** Wall-clock end of the lockout; the fallback when the monotonic clock cannot be used. */
  lockedUntil: number;
  /** Length of the current lockout and the boot-relative time it started, set together. */
  lockMs?: number;
  lockedAtElapsed?: number;
};

export type PinCheckResult =
  | { ok: true }
  | { ok: false; reason: 'not-set' }
  | { ok: false; reason: 'mismatch'; attemptsRemaining: number }
  | { ok: false; reason: 'locked'; retryAfterMs: number };

export type PinLockState = {
  locked: boolean;
  retryAfterMs: number;
  attemptsRemaining: number;
};
