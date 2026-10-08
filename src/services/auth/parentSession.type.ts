/**
 * Parent mode authorization.
 *
 * Parent-only actions are enforced here, in the service layer, rather than by hiding buttons in Kid
 * Mode. Every parent-only service method takes a `ParentSession`, and the only way to obtain one is a
 * successful PIN check.
 *
 * The session is deliberately memory-only: an app restart, a process death or a fresh Activity is a
 * security boundary, and there is nothing persisted to restore parent mode from.
 */
export type ParentSession = {
  readonly grantedAt: number;
  readonly expiresAt: number;
  readonly source: 'pin';
};

export type ParentSignInResult =
  | { ok: true; session: ParentSession }
  | { ok: false; reason: 'mismatch' | 'locked' | 'not-set'; attemptsRemaining: number; retryAfterMs: number };
