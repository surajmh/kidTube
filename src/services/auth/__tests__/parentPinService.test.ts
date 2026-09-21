/**
 * SecureStore is a native module, so it is faked with a plain in-memory map. The real
 * hashing in pinHash is left alone: these tests are about the change-PIN contract, and
 * stubbing the digest would let a broken comparison pass.
 */
const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockStore.delete(key); }),
}));

import { parentPinService } from '../parentPinService';

beforeEach(() => mockStore.clear());

describe('changePin', () => {
  it('replaces the PIN when the current one is right', async () => {
    await parentPinService.setPin('1234');

    const result = await parentPinService.changePin('1234', '8765');

    expect(result).toEqual({ ok: true });
    expect(await parentPinService.verify('8765')).toEqual({ ok: true });
  });

  it('leaves the old PIN working when the current one is wrong', async () => {
    await parentPinService.setPin('1234');

    const result = await parentPinService.changePin('0000', '8765');

    expect(result.ok).toBe(false);
    // The important half: a failed change must not have quietly applied the new PIN.
    expect(await parentPinService.verify('8765')).not.toEqual({ ok: true });
    expect(await parentPinService.verify('1234')).toEqual({ ok: true });
  });

  it('counts a wrong current PIN as a failed attempt', async () => {
    await parentPinService.setPin('1234');

    const result = await parentPinService.changePin('0000', '8765');

    expect(result).toEqual({ ok: false, reason: 'mismatch', attemptsRemaining: 4 });
  });

  it('honours the lockout instead of offering a second way in', async () => {
    await parentPinService.setPin('1234');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await parentPinService.changePin('0000', '8765');
    }

    const result = await parentPinService.changePin('0000', '8765');

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: 'locked' });
  });

  it('rejects a malformed new PIN without spending an attempt on the old one', async () => {
    await parentPinService.setPin('1234');

    await expect(parentPinService.changePin('1234', '99')).rejects.toThrow('exactly 4 digits');

    // Still five attempts, so a typo in the new field cannot walk the parent into a lockout.
    expect(await parentPinService.changePin('0000', '8765'))
      .toEqual({ ok: false, reason: 'mismatch', attemptsRemaining: 4 });
  });

  it('refuses a new PIN identical to the current one', async () => {
    await parentPinService.setPin('1234');

    await expect(parentPinService.changePin('1234', '1234')).rejects.toThrow('different');
  });

  it('never writes the PIN anywhere in plaintext', async () => {
    await parentPinService.setPin('1234');
    await parentPinService.changePin('1234', '8765');

    const written = [...mockStore.values()].join(' ');
    expect(written).not.toContain('8765');
    expect(written).not.toContain('1234');
  });

  it('clears the failure count once the change succeeds', async () => {
    await parentPinService.setPin('1234');
    await parentPinService.changePin('0000', '8765');

    await parentPinService.changePin('1234', '8765');

    expect(await parentPinService.lockState())
      .toMatchObject({ locked: false, attemptsRemaining: 5 });
  });
});
