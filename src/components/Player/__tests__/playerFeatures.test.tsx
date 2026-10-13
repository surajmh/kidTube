import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GestureResponderEvent } from 'react-native';
import { formatDuration } from '../player.helper';
import { usePlayerOptions } from '../playerOptions.hook';
import { usePlayerGestures } from '../playerGestures.hook';

it('remembers audio per child across videos and remounts without leaking between profiles', async () => {
  await AsyncStorage.clear();
  const view = renderHook(({ video, profile }: { video: string; profile: string }) => usePlayerOptions(video, profile), { initialProps: { video: 'a', profile: 'one' } });
  await act(async () => {});
  await act(async () => view.result.current.setAudioLanguage('es'));
  expect(await AsyncStorage.getItem('player-audio:one')).toBe('es');
  act(() => { view.result.current.setChapters([{ startMs: 0, title: 'Start' }]); view.result.current.setOptionsOpen(true); });
  view.rerender({ video: 'b', profile: 'one' });
  expect(view.result.current.audioLanguage).toBe('es');
  expect(view.result.current.chapters).toEqual([]);
  expect(view.result.current.optionsOpen).toBe(false);
  view.rerender({ video: 'b', profile: 'two' });
  expect(view.result.current.audioLanguage).toBeNull();
  await act(async () => {});
  await act(async () => view.result.current.setAudioLanguage('fr'));
  view.unmount();
  const restored = renderHook(() => usePlayerOptions('c', 'one'));
  await act(async () => {});
  expect(restored.result.current.audioLanguage).toBe('es');
  restored.unmount();
});

it('does not let a late preference read overwrite a new choice', async () => {
  let resolve!: (value: string | null) => void;
  const read = jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
  const view = renderHook(() => usePlayerOptions('a', 'one'));
  await act(async () => view.result.current.setAudioLanguage('de'));
  await act(async () => resolve('es'));
  expect(view.result.current.audioLanguage).toBe('de');
  read.mockRestore();
  view.unmount();
});

const touch = (x: number, y: number) => ({ nativeEvent: { locationX: x, locationY: y, touches: [{}] } } as GestureResponderEvent);
it('locks gesture direction, clamps seeking and levels, and keeps taps distinct from swipes', () => {
  const seek = jest.fn();
  const view = renderHook(() => usePlayerGestures(60_000, 180_000, seek));
  act(() => view.result.current.handlers.onLayout({ nativeEvent: { layout: { width: 400, height: 200 } } }));
  expect(view.result.current.handlers.onResponderTerminationRequest()).toBe(false);
  act(() => { expect(view.result.current.handlers.onResponderGrant(touch(20, 100))).toBe(true); });
  const swipe = (x: number, y: number, endX: number, endY: number) => {
    act(() => view.result.current.handlers.onResponderGrant(touch(x, y)));
    act(() => view.result.current.handlers.onResponderMove(touch(endX, endY)));
    act(() => view.result.current.handlers.onResponderRelease());
  };
  swipe(200, 100, 800, 110);
  expect(seek).toHaveBeenLastCalledWith(180_000);
  swipe(200, 100, -400, 110);
  expect(seek).toHaveBeenLastCalledWith(0);
  swipe(20, 100, 20, -200);
  expect(view.result.current.brightness).toBe(1);
  swipe(380, 100, 380, 500);
  expect(view.result.current.volume).toBe(0);
  swipe(200, 100, 200, 40);
  expect(view.result.current.fullscreen).toBe(true);
  swipe(200, 100, 200, 160);
  expect(view.result.current.fullscreen).toBe(false);
  act(() => view.result.current.handlers.onResponderGrant(touch(200, 100)));
  act(() => view.result.current.handlers.onResponderMove(touch(205, 101)));
  act(() => { expect(view.result.current.handlers.onResponderRelease()).toBe(true); });
  act(() => view.result.current.handlers.onResponderGrant(touch(200, 100)));
  act(() => view.result.current.handlers.onResponderMove(touch(260, 100)));
  act(() => view.result.current.handlers.onResponderTerminate());
  expect(seek).toHaveBeenCalledTimes(2);
  view.unmount();
});

it('formats chapter zero as a playable timestamp', () => {
  expect(formatDuration(0)).toBe('0:00');
  expect(formatDuration()).toBe('—');
  expect(formatDuration(92)).toBe('1:32');
});

it('minimizes from portrait, expands the mini player, and dismisses it sideways without seeking', () => {
  const seek = jest.fn();
  const onMinimize = jest.fn();
  const onExpand = jest.fn();
  const onClose = jest.fn();
  const view = renderHook(({ minimized }: { minimized: boolean }) => usePlayerGestures(0, 180_000, seek, { minimized, onMinimize, onExpand, onClose }), { initialProps: { minimized: false } });
  act(() => view.result.current.handlers.onLayout({ nativeEvent: { layout: { width: 400, height: 200 } } }));
  const swipe = (x: number, y: number, endX: number, endY: number) => {
    act(() => view.result.current.handlers.onResponderGrant(touch(x, y)));
    act(() => view.result.current.handlers.onResponderMove(touch(endX, endY)));
    act(() => view.result.current.handlers.onResponderRelease());
  };
  swipe(20, 50, 20, 80);
  expect(onMinimize).not.toHaveBeenCalled();
  swipe(20, 50, 20, 120);
  expect(onMinimize).toHaveBeenCalledTimes(1);
  swipe(200, 100, 200, 30);
  expect(view.result.current.fullscreen).toBe(true);
  swipe(200, 50, 200, 120);
  expect(view.result.current.fullscreen).toBe(false);
  expect(onMinimize).toHaveBeenCalledTimes(1);
  view.rerender({ minimized: true });
  swipe(20, 100, 20, 30);
  expect(onExpand).toHaveBeenCalledTimes(1);
  expect(view.result.current.fullscreen).toBe(false);
  swipe(200, 50, 280, 50);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(seek).not.toHaveBeenCalled();
  view.unmount();
});
