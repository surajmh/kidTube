import assert from 'node:assert/strict';
import { ContentRequest } from '../../parentalControlsTypes';
import { requestService } from '../requestService';

const dayMs = 24 * 60 * 60 * 1000;
const now = new Date('2026-02-01T00:00:00Z');

function request(overrides: Partial<ContentRequest>): ContentRequest {
  return {
    id: 'r1',
    profileId: 'p1',
    type: 'video',
    requestedAt: '2026-01-01T00:00:00Z',
    status: 'pending',
    ...overrides,
  };
}

describe('requestService.pruneResolved', () => {
  it('keeps pending requests no matter how old', async () => {
    const pending = request({ requestedAt: new Date(now.getTime() - 90 * dayMs).toISOString() });
    const next = await requestService.pruneResolved([pending], now);
    assert.deepEqual(next, [pending]);
  });

  it('keeps a resolved request within the retention window', async () => {
    const recent = request({
      id: 'r2',
      status: 'approved',
      resolvedAt: new Date(now.getTime() - 5 * dayMs).toISOString(),
    });
    const next = await requestService.pruneResolved([recent], now);
    assert.deepEqual(next, [recent]);
  });

  it('drops a resolved request once it ages past the retention window', async () => {
    const stale = request({
      id: 'r3',
      status: 'rejected',
      resolvedAt: new Date(now.getTime() - 31 * dayMs).toISOString(),
    });
    const next = await requestService.pruneResolved([stale], now);
    assert.deepEqual(next, []);
  });

  it('returns the same array reference when nothing was pruned', async () => {
    const pending = request({});
    const requests = [pending];
    const next = await requestService.pruneResolved(requests, now);
    assert.equal(next, requests);
  });
});
