import assert from 'node:assert/strict';
import { act, renderHook } from '@testing-library/react-native';
import type { ContentRequest } from '../../../types';
import { useParentRequests } from '../parentRequests.hook';
import { DEFAULT_DURATION, DEFAULT_SCOPE } from '../parentRequests.constant';

const requests = [
  { id: 'r1', status: 'pending', profileId: 'milo' },
  { id: 'r2', status: 'pending', profileId: 'ada' },
  { id: 'r3', status: 'approved', profileId: 'milo' },
] as ContentRequest[];

type Input = Parameters<typeof useParentRequests>[0];

function setup(overrides: Partial<Input> = {}) {
  const onDecide = jest.fn(async () => {});
  const props: Input = { requests, onDecide, ...overrides };
  const view = renderHook((next: Input) => useParentRequests(next), { initialProps: props });
  return { ...view, onDecide };
}

describe('useParentRequests', () => {
  it('splits waiting from answered', () => {
    const { result } = setup();
    assert.deepEqual(result.current.pending.map((r) => r.id), ['r1', 'r2']);
    assert.deepEqual(result.current.resolved.map((r) => r.id), ['r3']);
  });

  it('defaults to a permanent approval scoped to the child who asked', () => {
    // Narrow by default: answering quickly must not accidentally grant to every child.
    const { result } = setup();
    assert.equal(result.current.durationFor('r1'), DEFAULT_DURATION);
    assert.equal(result.current.scopeFor('r1'), DEFAULT_SCOPE);
    assert.equal(result.current.scopeFor('r1'), 'child');
  });

  it('keeps each request’s choices to itself', () => {
    // Carrying one request's scope onto the next would silently widen an approval.
    const { result } = setup();
    act(() => result.current.setScope('r1', 'family'));
    act(() => result.current.setDuration('r1', 'today'));

    assert.equal(result.current.scopeFor('r1'), 'family');
    assert.equal(result.current.durationFor('r1'), 'today');
    assert.equal(result.current.scopeFor('r2'), 'child', 'the next request stays narrow');
    assert.equal(result.current.durationFor('r2'), DEFAULT_DURATION);
  });

  it('opens one request at a time and closes on a second tap', () => {
    const { result } = setup();
    act(() => result.current.toggleOpen('r1'));
    assert.equal(result.current.openId, 'r1');
    act(() => result.current.toggleOpen('r2'));
    assert.equal(result.current.openId, 'r2');
    act(() => result.current.toggleOpen('r2'));
    assert.equal(result.current.openId, null);
  });

  it('closes the open request once a decision succeeds', async () => {
    const { result, onDecide } = setup();
    act(() => result.current.toggleOpen('r1'));
    await act(async () => {
      await result.current.decide({
        request: requests[0],
        decision: 'approved',
        profileId: 'milo',
        duration: 'permanent',
      });
    });
    expect(onDecide).toHaveBeenCalledTimes(1);
    assert.equal(result.current.openId, null);
    assert.equal(result.current.error, '');
    assert.equal(result.current.busyId, null);
  });

  it('keeps the request open and reports why when a decision fails', async () => {
    const onDecide = jest.fn(async () => {
      throw new Error('parent session expired');
    });
    const { result } = setup({ onDecide });
    act(() => result.current.toggleOpen('r1'));
    await act(async () => {
      await result.current.decide({
        request: requests[0],
        decision: 'approved',
        profileId: 'milo',
        duration: 'permanent',
      });
    });
    assert.equal(result.current.error, 'parent session expired');
    assert.equal(result.current.openId, 'r1', 'the parent can retry without reopening it');
    assert.equal(result.current.busyId, null, 'the busy flag clears even on failure');
  });
});
