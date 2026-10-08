const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockStore.delete(key); }),
}));

let mockElapsed: number | null = 1_000_000;
jest.mock('../src/services/auth/monotonicClock', () => ({ elapsedSinceBoot: () => mockElapsed }));

import { parentPinService } from '../src/services/auth/parentPinService';

async function lockOut() {
  for (let i = 0; i < 5; i += 1) await parentPinService.verify('0000');
}

describe('PIN lockout clock', () => {
  const realNow = Date.now;
  let wall = 1_800_000_000_000;

  beforeEach(async () => {
    mockStore.clear();
    mockElapsed = 1_000_000;
    wall = 1_800_000_000_000;
    Date.now = () => wall;
    await parentPinService.setPin('1234');
  });
  afterEach(() => { Date.now = realNow; });

  it('stays locked when the device date is moved forward', async () => {
    await lockOut();
    wall += 2 * 60 * 60 * 1000; // child sets the date two hours ahead
    mockElapsed! += 5_000; // but only five real seconds have passed
    expect(await parentPinService.verify('1234')).toEqual({ ok: false, reason: 'locked', retryAfterMs: 55_000 });
  });

  it('unlocks once the real lockout time has passed, even if the date was moved back', async () => {
    await lockOut();
    wall -= 24 * 60 * 60 * 1000;
    mockElapsed! += 60_001;
    expect(await parentPinService.verify('1234')).toEqual({ ok: true });
  });

  it('falls back to the wall clock after a reboot or without the native clock', async () => {
    await lockOut();
    mockElapsed = null;
    wall += 30_000;
    expect(await parentPinService.verify('1234')).toEqual({ ok: false, reason: 'locked', retryAfterMs: 30_000 });
    wall += 31_000;
    expect(await parentPinService.verify('1234')).toEqual({ ok: true });
  });
});
