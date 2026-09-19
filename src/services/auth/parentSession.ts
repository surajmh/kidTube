import { PinCheckResult, parentPinService } from './parentPinService';

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

export class ParentAuthorizationError extends Error {
  constructor(readonly action: string) {
    super(`Parent PIN required for: ${action}`);
    this.name = 'ParentAuthorizationError';
  }
}

export type ParentSignInResult =
  | { ok: true; session: ParentSession }
  | { ok: false; reason: 'mismatch' | 'locked' | 'not-set'; attemptsRemaining: number; retryAfterMs: number };

/** Idle budget before parent mode closes itself again. */
const sessionTtlMs = 30 * 60 * 1000;

export class ParentSessionService {
  private session: ParentSession | null = null;

  async startWithPin(pin: string): Promise<ParentSignInResult> {
    const check: PinCheckResult = await parentPinService.verify(pin);
    if (!check.ok) {
      return {
        ok: false,
        reason: check.reason,
        attemptsRemaining: check.reason === 'mismatch' ? check.attemptsRemaining : 0,
        retryAfterMs: check.reason === 'locked' ? check.retryAfterMs : 0,
      };
    }
    return { ok: true, session: this.grant() };
  }

  /** Only used internally after the PIN has just been created or verified. */
  grant(): ParentSession {
    const now = Date.now();
    this.session = { grantedAt: now, expiresAt: now + sessionTtlMs, source: 'pin' };
    return this.session;
  }

  current(): ParentSession | null {
    if (this.session && this.session.expiresAt <= Date.now()) this.session = null;
    return this.session;
  }

  isActive() {
    return this.current() !== null;
  }

  /** Throws unless a live parent session exists. */
  require(action: string): ParentSession {
    const session = this.current();
    if (!session) throw new ParentAuthorizationError(action);
    return session;
  }

  end() {
    this.session = null;
  }
}

export const parentSessionService = new ParentSessionService();
