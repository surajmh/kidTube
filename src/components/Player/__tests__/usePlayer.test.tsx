import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { usePlayer, PlayerScreenProps } from '../usePlayer';
import { defaultPlaybackSettings } from '../../../playbackTypes';
import { playerAdapter } from '../../../services/playerAdapterInstance';

jest.mock('../../../native', () => ({ isNativeYouTubePlayerAvailable: true }));
jest.mock('../../../services/playerAdapterInstance', () => ({ playerAdapter: {
  pause: jest.fn(async () => {}), resume: jest.fn(async () => {}),
  play: jest.fn(async () => {}), prefetch: jest.fn(async () => {}), stop: jest.fn(async () => {}),
} }));
jest.mock('../../../services/playbackPolicyService', () => ({ playbackPolicy: {
  canPlay: () => ({ allowed: true }), canContinuePlayback: () => ({ allowed: true }), getRemainingSeconds: () => null,
}, describePlaybackDecision: jest.fn(), isTimeRelatedReason: jest.fn() }));
jest.mock('../../../services/screenTimeService', () => ({ screenTimeService: { flush: async () => {}, recordPlaybackSeconds: jest.fn() } }));

const props: PlayerScreenProps = {
  video: { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: true },
  profile: { id: 'kid', name: 'Kid', avatar: '' },
  settings: { ...defaultPlaybackSettings, sponsorBlockEnabled: false },
  onNextVideo: jest.fn(), onUsageChange: jest.fn(), onBack: jest.fn(),
  onSaveHistory: jest.fn(), onPlaybackCompleted: jest.fn(),
};

it('pause cancels recovery, rejects late play, and a switch cancels the old retry', async () => {
  jest.useFakeTimers();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const previousState = AppState.currentState;
  const view = renderHook((p: PlayerScreenProps) => usePlayer(p), { initialProps: props });
  try {
    act(() => view.result.current.nativeHandlers.onLoad());
    await act(async () => view.result.current.togglePlayback());
    expect(playerAdapter.pause).toHaveBeenCalledTimes(1);
    expect(view.result.current.wantsPlayback).toBe(false);
    act(() => view.result.current.nativeHandlers.onPlay());
    expect(view.result.current.isPlaying).toBe(false);
    expect(playerAdapter.pause).toHaveBeenCalledTimes(2);
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(playerAdapter.play).not.toHaveBeenCalled();

    await act(async () => view.result.current.togglePlayback());
    expect(playerAdapter.resume).toHaveBeenCalledWith('aaaaaaaaaaa');
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
    expect(view.result.current.recoveryMessage).not.toBe('');
    await act(async () => view.result.current.togglePlayback());
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(playerAdapter.play).not.toHaveBeenCalled();

    await act(async () => view.result.current.togglePlayback());
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
    view.rerender({ ...props, video: { ...props.video, youtubeVideoId: 'bbbbbbbbbbb' } });
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(playerAdapter.play).not.toHaveBeenCalled();
    expect(view.result.current.wantsPlayback).toBe(true);
    const listener = subscription.mock.calls[subscription.mock.calls.length - 1][1];
    AppState.currentState = 'background';
    act(() => listener('background'));
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(playerAdapter.play).not.toHaveBeenCalled();
    AppState.currentState = 'active';
    await act(async () => listener('active'));
    expect(playerAdapter.resume).toHaveBeenLastCalledWith('bbbbbbbbbbb');
  } finally {
    view.unmount();
    AppState.currentState = previousState;
    subscription.mockRestore();
    jest.useRealTimers();
  }
});


it('prefetches Up next once after ten seconds of playing, never while paused', () => {
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const nextVideo = { ...props.video, id: 'next', youtubeVideoId: 'bbbbbbbbbbb' };
  const view = renderHook(() => usePlayer({ ...props, nextVideo }));
  const progress = (position: number, isPlaying: boolean) => act(() =>
    view.result.current.nativeHandlers.onProgress({ nativeEvent: { duration: 100_000, position, isPlaying } }));
  try {
    progress(9000, false);
    progress(9000, true);
    progress(10_000, false);
    expect(playerAdapter.prefetch).not.toHaveBeenCalled();
    progress(10_000, true);
    progress(11_000, true);
    expect(playerAdapter.prefetch).toHaveBeenCalledTimes(1);
    expect(playerAdapter.prefetch).toHaveBeenCalledWith('bbbbbbbbbbb');
  } finally { view.unmount(); subscription.mockRestore(); }
});
