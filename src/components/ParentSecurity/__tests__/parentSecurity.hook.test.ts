import { act, renderHook } from '@testing-library/react-native';

const mockChangePin = jest.fn();

jest.mock('../../../services/auth/parentPinService', () => ({
  parentPinService: { changePin: (...args: unknown[]) => mockChangePin(...args) },
}));

import { useParentSecurity } from '../parentSecurity.hook';

beforeEach(() => mockChangePin.mockReset());

async function fill(result: ReturnType<typeof renderHook<ReturnType<typeof useParentSecurity>, unknown>>['result'],
                    current: string, next: string, confirm: string) {
  await act(async () => {
    result.current.setCurrentPin(current);
    result.current.setNextPin(next);
    result.current.setConfirmPin(confirm);
  });
}

describe('useParentSecurity', () => {
  it('strips non-digits as the parent types', async () => {
    const { result } = renderHook(() => useParentSecurity());

    await act(async () => result.current.setCurrentPin('1a2b3c4d5'));

    expect(result.current.currentPin).toBe('1234');
  });

  it('does not call the service when the form fails local validation', async () => {
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '1234', '8765', '8760');

    await act(async () => { await result.current.submit(); });

    // The point of validating locally: a confirmation typo must not spend an attempt.
    expect(mockChangePin).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/do not match/i);
  });

  it('clears the fields and reports success on a good change', async () => {
    mockChangePin.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '1234', '8765', '8765');

    await act(async () => { await result.current.submit(); });

    expect(mockChangePin).toHaveBeenCalledWith('1234', '8765');
    expect(result.current.notice).toMatch(/PIN changed/i);
    expect(result.current.currentPin).toBe('');
    expect(result.current.nextPin).toBe('');
    expect(result.current.confirmPin).toBe('');
  });

  it('describes a wrong current PIN and keeps the new one typed', async () => {
    mockChangePin.mockResolvedValue({ ok: false, reason: 'mismatch', attemptsRemaining: 3 });
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '0000', '8765', '8765');

    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toMatch(/3 tries left/);
    expect(result.current.currentPin).toBe('');
    expect(result.current.nextPin).toBe('8765');
    expect(result.current.notice).toBe('');
  });

  it('surfaces a lockout with its wait', async () => {
    mockChangePin.mockResolvedValue({ ok: false, reason: 'locked', retryAfterMs: 61_000 });
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '0000', '8765', '8765');

    await act(async () => { await result.current.submit(); });

    // Rounded up: 61s must never be reported as a 1 min wait that is already over.
    expect(result.current.error).toMatch(/2 min/);
  });

  it('reports a generic failure when the service throws, and stops saving', async () => {
    mockChangePin.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '1234', '8765', '8765');

    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toMatch(/could not be saved/i);
    expect(result.current.saving).toBe(false);
  });

  it('clears a stale outcome as soon as the parent edits again', async () => {
    mockChangePin.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '1234', '8765', '8765');
    await act(async () => { await result.current.submit(); });
    expect(result.current.notice).toMatch(/PIN changed/i);

    await act(async () => result.current.setCurrentPin('9'));

    expect(result.current.notice).toBe('');
  });

  it('never puts the typed PIN into an error or notice', async () => {
    mockChangePin.mockResolvedValue({ ok: false, reason: 'mismatch', attemptsRemaining: 2 });
    const { result } = renderHook(() => useParentSecurity());
    await fill(result, '4321', '8765', '8765');

    await act(async () => { await result.current.submit(); });

    expect(result.current.error).not.toMatch(/4321|8765/);
  });
});
