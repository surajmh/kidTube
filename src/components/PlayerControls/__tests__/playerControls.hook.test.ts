import { act, renderHook } from '@testing-library/react-native';
import { usePlayerControls } from '../playerControls.hook';
import { AUTO_HIDE_MS } from '../playerControls.constant';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('usePlayerControls', () => {
  it('starts visible', () => {
    const { result } = renderHook(() => usePlayerControls(false));
    expect(result.current.visible).toBe(true);
  });

  it('hides itself once playing', () => {
    const { result } = renderHook(() => usePlayerControls(true));

    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS + 10); });

    expect(result.current.visible).toBe(false);
  });

  it('stays up while paused, however long it waits', () => {
    const { result } = renderHook(() => usePlayerControls(false));

    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS * 5); });

    // Hiding over a paused video leaves a child tapping a black rectangle.
    expect(result.current.visible).toBe(true);
  });

  it('comes back and stays when playback pauses', () => {
    const { result, rerender } = renderHook(
      ({ playing }: { playing: boolean }) => usePlayerControls(playing),
      { initialProps: { playing: true } },
    );
    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS + 10); });
    expect(result.current.visible).toBe(false);

    rerender({ playing: false });

    expect(result.current.visible).toBe(true);
    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS * 3); });
    expect(result.current.visible).toBe(true);
  });

  it('restarts the clock when a control is used', () => {
    const { result } = renderHook(() => usePlayerControls(true));

    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS - 200); });
    act(() => { result.current.keepAlive(); });
    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS - 200); });

    // Without the restart this would already have hidden mid-gesture.
    expect(result.current.visible).toBe(true);
    act(() => { jest.advanceTimersByTime(400); });
    expect(result.current.visible).toBe(false);
  });

  it('toggles off on a tap, and back on with a fresh timer', () => {
    const { result } = renderHook(() => usePlayerControls(true));

    act(() => { result.current.toggleVisible(); });
    expect(result.current.visible).toBe(false);

    act(() => { result.current.toggleVisible(); });
    expect(result.current.visible).toBe(true);

    act(() => { jest.advanceTimersByTime(AUTO_HIDE_MS + 10); });
    expect(result.current.visible).toBe(false);
  });

  it('does not leave a timer running after unmount', () => {
    const { unmount } = renderHook(() => usePlayerControls(true));

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });
});
