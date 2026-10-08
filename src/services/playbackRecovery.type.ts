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
