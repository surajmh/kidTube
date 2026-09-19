import { PlayerError } from './playerErrors';

/**
 * The native player already refreshes the stream and retries a few times on its own. This is the
 * React Native side of the same contract: one bounded, backed-off attempt when the native layer
 * gave up, then a message and an explicit "Try again" for the child.
 */
export type RecoveryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export const defaultRecoveryPolicy: RecoveryPolicy = {
  maxAttempts: 1,
  baseDelayMs: 2_000,
  maxDelayMs: 8_000,
};

export function recoveryDelayMs(attempt: number, policy: RecoveryPolicy = defaultRecoveryPolicy) {
  const safeAttempt = Math.max(1, attempt);
  return Math.min(policy.baseDelayMs * 2 ** (safeAttempt - 1), policy.maxDelayMs);
}

export function shouldAutoRecover(
  error: Pick<PlayerError, 'recoverable'>,
  attempt: number,
  policy: RecoveryPolicy = defaultRecoveryPolicy,
) {
  return error.recoverable && attempt < policy.maxAttempts;
}

/** Child-friendly, non-technical status text while a recovery attempt is running. */
export function recoveryStatusText(attempt: number, attempts: number) {
  return attempts > 1 ? `Trying again (${attempt} of ${attempts})…` : 'Trying again…';
}
