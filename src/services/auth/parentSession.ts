import { parentPinService } from './parentPinService';
import type { PinCheckResult } from './parentPinService.type';
import type { ParentSession, ParentSignInResult } from './parentSession.type';

export class ParentAuthorizationError extends Error {
  constructor(readonly action: string) {
    super(`Parent PIN required for: ${action}`);
    this.name = 'ParentAuthorizationError';
  }
}

/** How long one PIN entry unlocks parent mode. A fixed budget from sign-in, not extended by activity. */
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
