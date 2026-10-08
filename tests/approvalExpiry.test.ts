import assert from 'node:assert/strict';
import { msUntilNextExpiry } from '../src/services/approvalRules';
import type { ContentApproval } from '../src/types';

const approval = (expiresAt?: string) => ({ id: 'a', expiresAt }) as ContentApproval;
const now = Date.parse('2026-10-08T10:00:00Z');

describe('msUntilNextExpiry', () => {
  it('is null when nothing will ever expire', () => {
    assert.equal(msUntilNextExpiry([], now), null);
    assert.equal(msUntilNextExpiry([approval()], now), null);
  });

  it('returns the soonest future expiry and ignores ones already past', () => {
    const list = [approval('2026-10-08T09:00:00Z'), approval('2026-10-08T12:00:00Z'), approval('2026-10-08T10:30:00Z')];
    assert.equal(msUntilNextExpiry(list, now), 30 * 60 * 1000);
  });
});
