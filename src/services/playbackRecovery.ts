import type { PlayerError } from './playerErrors.type';
import type { RecoveryPolicy } from './playbackRecovery.type';

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
