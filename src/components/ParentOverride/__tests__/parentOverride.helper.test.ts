import assert from 'node:assert/strict';
import { describePinFailure } from '../parentOverride.helper';
import { PinFailure } from '../parentOverride.type';

function failure(overrides: Partial<PinFailure> = {}): PinFailure {
  return { reason: 'mismatch', attemptsRemaining: 3, retryAfterMs: 0, ...overrides };
}

describe('describePinFailure', () => {
  it('counts down remaining tries', () => {
    assert.equal(describePinFailure(failure({ attemptsRemaining: 3 })), 'That PIN did not match. 3 tries left.');
  });

  it('warns before the last try rather than after locking', () => {
    // A parent should know entry is about to lock, not discover it by being locked out.
    const message = describePinFailure(failure({ attemptsRemaining: 1 }));
    assert.equal(message, 'That PIN did not match. One more try before PIN entry locks.');
  });

  it('uses the same warning if the count somehow reaches zero', () => {
    assert.equal(
      describePinFailure(failure({ attemptsRemaining: 0 })),
      'That PIN did not match. One more try before PIN entry locks.',
    );
  });

  it('rounds the lockout wait up, never promising an early retry', () => {
    // 90s must read as 2 min: saying 1 would invite a retry the service still refuses.
    assert.equal(describePinFailure(failure({ reason: 'locked', retryAfterMs: 90_000 })), 'Too many tries. Try again in 2 min.');
    assert.equal(describePinFailure(failure({ reason: 'locked', retryAfterMs: 60_000 })), 'Too many tries. Try again in 1 min.');
    assert.equal(describePinFailure(failure({ reason: 'locked', retryAfterMs: 1_000 })), 'Too many tries. Try again in 1 min.');
  });

  it('explains when no PIN exists at all', () => {
    assert.equal(describePinFailure(failure({ reason: 'not-set' })), 'No parent PIN is set on this device.');
  });

  it('never leaks the PIN or the attempt internals', () => {
    for (const reason of ['mismatch', 'locked', 'not-set'] as const) {
      const message = describePinFailure(failure({ reason, retryAfterMs: 120_000 }));
      assert.equal(/\d{4}/.test(message), false, `no 4-digit sequence in: ${message}`);
    }
  });
});
