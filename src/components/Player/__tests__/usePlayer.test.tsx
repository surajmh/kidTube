import React from 'react';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { usePlayer, PlayerScreenProps } from '../usePlayer';
import { defaultPlaybackSettings } from '../../../playbackTypes';
import { playerAdapter } from '../../../services/playerAdapterInstance';
import { playbackPolicy } from '../../../services/playbackPolicyService';
import { screenTimeService } from '../../../services/screenTimeService';
import { PlayerScreen } from '../Player';
import { YouTubePlayer } from '../../../native';

jest.mock('../../../native', () => ({ isNativeYouTubePlayerAvailable: true, YouTubePlayer: jest.fn(() => null) }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('../../../services/playerAdapterInstance', () => ({ playerAdapter: {
  pause: jest.fn(async () => {}), resume: jest.fn(async () => {}),
  play: jest.fn(async () => {}), prefetch: jest.fn(async () => {}), stop: jest.fn(async () => {}),
  seek: jest.fn(async () => {}),
} }));
jest.mock('../../../services/playbackPolicyService', () => ({
  ...jest.requireActual('../../../services/playbackPolicyService'),
  playbackPolicy: {
    canPlay: () => ({ allowed: true }), canContinuePlayback: () => ({ allowed: true }), getRemainingSeconds: () => null,
    shouldAutoplay: () => false,
  },
}));
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


it('resumes rather than restarts after the final native failure, with one JS retry', async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => usePlayer(props));
  try {
    act(() => view.result.current.nativeHandlers.onProgress({ nativeEvent: { duration: 100_000, position: 42_000, isPlaying: false } }));
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
    await act(async () => jest.advanceTimersByTime(2000));
    expect(playerAdapter.resume).toHaveBeenCalledTimes(1);
    expect(playerAdapter.resume).toHaveBeenCalledWith('aaaaaaaaaaa');
    expect(playerAdapter.play).not.toHaveBeenCalled();
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(playerAdapter.resume).toHaveBeenCalledTimes(1);
    expect(view.result.current.error).not.toBeNull();
  } finally { view.unmount(); subscription.mockRestore(); jest.useRealTimers(); }
});

describe.each(['bedtime', 'screen-time'] as const)('%s enforcement with the real policy', (restriction) => {
  it('does not mount a native player when starting with a blocked policy', () => {
    jest.clearAllMocks();
    const decision = { allowed: false as const, reason: restriction === 'bedtime' ? 'BEDTIME' as const : 'SCREEN_TIME_EXCEEDED' as const };
    const check = jest.spyOn(playbackPolicy, 'canPlay').mockReturnValue(decision);
    const view = render(<PlayerScreen {...props} />);
    try {
      expect(view.getByText(restriction === 'bedtime' ? 'It’s bedtime. Come back in the morning!' : 'You’ve finished your screen time for today. Come back tomorrow!')).toBeTruthy();
      expect(YouTubePlayer).not.toHaveBeenCalled();
    } finally { view.unmount(); check.mockRestore(); }
  });

  it.each(['progress', 'late-play', 'foreground', 'retry', 'manual-resume'] as const)('blocks %s and subsequent autoplay', async (transition) => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 9, 8, 19, 59));
    const actual = jest.requireActual<typeof import('../../../services/playbackPolicyService')>('../../../services/playbackPolicyService');
    const policy = new actual.PlaybackPolicyService();
    policy.hydrate({ settings: { ...props.settings, autoplay: true, dailyLimitMinutes: 1, bedtimeEnabled: true }, profiles: [props.profile!], screenTime: [] });
    policy.setContentAccessResolver(() => 'allowed');
    const spies = [
      jest.spyOn(playbackPolicy, 'canPlay').mockImplementation(policy.canPlay.bind(policy)),
      jest.spyOn(playbackPolicy, 'canContinuePlayback').mockImplementation(policy.canContinuePlayback.bind(policy)),
      jest.spyOn(playbackPolicy, 'getRemainingSeconds').mockImplementation(policy.getRemainingSeconds.bind(policy)),
      jest.spyOn(playbackPolicy, 'shouldAutoplay').mockImplementation(policy.shouldAutoplay.bind(policy)),
    ];
    const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
    const previousState = AppState.currentState;
    AppState.currentState = 'active';
    const view = renderHook(() => usePlayer({ ...props, nextVideo: { ...props.video, id: 'next', youtubeVideoId: 'bbbbbbbbbbb' } }));
    try {
      const listener = subscription.mock.calls.at(-1)![1];
      if (transition === 'retry') act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'network_error' } }));
      if (transition === 'foreground') {
        AppState.currentState = 'background';
        act(() => listener('background'));
      }
      if (transition === 'manual-resume') await act(async () => view.result.current.togglePlayback());
      if (restriction === 'bedtime') jest.setSystemTime(new Date(2026, 9, 8, 20, 0));
      else policy.addPlaybackSeconds('kid', 60);
      if (transition === 'progress') act(() => view.result.current.nativeHandlers.onProgress({ nativeEvent: { duration: 100_000, position: 42_000, isPlaying: true } }));
      if (transition === 'late-play') act(() => view.result.current.nativeHandlers.onPlay());
      if (transition === 'foreground') {
        AppState.currentState = 'active';
        await act(async () => listener('active'));
      }
      if (transition === 'retry') await act(async () => jest.advanceTimersByTime(2000));
      if (transition === 'manual-resume') await act(async () => view.result.current.togglePlayback());
      expect(playerAdapter.stop).toHaveBeenCalled();
      expect(playerAdapter.resume).not.toHaveBeenCalled();
      expect(view.result.current.wantsPlayback).toBe(false);
      expect(view.result.current.timeBlocked).toBe(true);
      expect(view.result.current.policyMessage).toContain(restriction === 'bedtime' ? 'bedtime' : 'screen time');
      act(() => view.result.current.nativeHandlers.onPlay());
      expect(view.result.current.isPlaying).toBe(false);
      act(() => view.result.current.nativeHandlers.onEnd());
      expect(props.onNextVideo).not.toHaveBeenCalled();
    } finally {
      view.unmount(); AppState.currentState = previousState;
      subscription.mockRestore(); spies.forEach(spy => spy.mockRestore()); jest.useRealTimers();
    }
  });
});

it('counts playback but excludes seeks, pauses and recovery from screen time', async () => {
  jest.clearAllMocks();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => usePlayer(props));
  const progress = async (position: number, isPlaying = true) => act(async () =>
    view.result.current.nativeHandlers.onProgress({ nativeEvent: { duration: 100_000, position, isPlaying } }));
  try {
    await progress(0); await progress(1000);
    act(() => view.result.current.seekToPosition(50_000));
    await progress(50_000); await progress(51_000);
    await progress(52_000, false); await progress(52_000, false);
    act(() => view.result.current.nativeHandlers.onRetry({ nativeEvent: { attempt: 1, attempts: 3 } }));
    await progress(80_000, false); await progress(82_000); await progress(83_000);
    expect(playerAdapter.seek).toHaveBeenCalledWith(50_000);
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenCalledTimes(3);
    expect((screenTimeService.recordPlaybackSeconds as jest.Mock).mock.calls).toEqual([['kid', 1], ['kid', 1], ['kid', 1]]);
  } finally { view.unmount(); subscription.mockRestore(); }
});

it('exposes available tracks, applies player choices, and clears captions on video switches', () => {
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  jest.useFakeTimers();
  const view = render(<PlayerScreen {...props} settings={{ ...props.settings, maxQualityHeight: 720 }} />);
  const nativeProps = () => view.UNSAFE_getByType(YouTubePlayer).props;
  try {
    act(() => nativeProps().onTracksChanged({ nativeEvent: { videoId: props.video.youtubeVideoId, captions: [{ id: '1:0', label: 'English' }], qualityHeights: [360, 720, 1080] } }));
    fireEvent.press(view.getByLabelText('Player settings'));
    fireEvent.press(view.getByLabelText('Speed: 2×'));
    fireEvent.press(view.getByLabelText('Quality: Up to 720p'));
    fireEvent.press(view.getByLabelText('Captions: English'));
    fireEvent.press(view.getByLabelText('Caption size: Large'));
    expect(nativeProps()).toMatchObject({ playbackSpeed: 2, qualityHeight: 720, maxQualityHeight: 720, captionTrack: '1:0', captionScale: 1.5 });
    expect(view.queryByLabelText('Quality: Up to 1080p')).toBeNull();
    view.rerender(<PlayerScreen {...props} video={{ ...props.video, youtubeVideoId: 'bbbbbbbbbbb' }} />);
    expect(nativeProps().captionTrack).toBeNull();
    act(() => nativeProps().onTracksChanged({ nativeEvent: { videoId: props.video.youtubeVideoId, captions: [{ id: '1:0', label: 'Old video' }], qualityHeights: [1080] } }));
    fireEvent.press(view.getByLabelText('Player settings'));
    expect(view.queryByLabelText('Captions: Old video')).toBeNull();
    expect(view.getByText('No captions available for this video.')).toBeTruthy();
  } finally { view.unmount(); subscription.mockRestore(); jest.useRealTimers(); }
});

it('accounts native progress at the actual speed, re-anchoring when speed changes', async () => {
  jest.clearAllMocks();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => usePlayer(props));
  const progress = (position: number, speed: number) => act(async () => {
    view.result.current.nativeHandlers.onProgress({ nativeEvent: { duration: 100_000, position, isPlaying: true, playbackSpeed: speed } });
  });
  try {
    await progress(0, 2);
    await progress(2000, 2);
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenLastCalledWith('kid', 1);
    await progress(2500, 0.5);
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenCalledTimes(1);
    await progress(3000, 0.5);
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenLastCalledWith('kid', 1);
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenCalledTimes(2);
  } finally { view.unmount(); subscription.mockRestore(); }
});

it('saved playback counts viewing time, skips network prefetch and stops on content expiry', async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const actual = jest.requireActual<typeof import('../../../services/playbackPolicyService')>('../../../services/playbackPolicyService');
  const policy = new actual.PlaybackPolicyService();
  policy.hydrate({ settings: props.settings, profiles: [props.profile!], screenTime: [] });
  let expired = false;
  policy.setContentAccessResolver(() => expired ? 'expired' : 'allowed');
  const check = jest.spyOn(playbackPolicy, 'canContinuePlayback').mockImplementation(policy.canContinuePlayback.bind(policy));
  const view = renderHook(() => usePlayer({ ...props, offlineExpected: true, nextVideo: { ...props.video, id: 'next', youtubeVideoId: 'bbbbbbbbbbb' } }));
  const progress = (position: number) => act(async () => view.result.current.nativeHandlers.onProgress({ nativeEvent: { duration: 100_000, position, isPlaying: true, playbackSpeed: 2, offline: true } }));
  try {
    await progress(10_000); await progress(12_000);
    expect(view.result.current.isOffline).toBe(true);
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenLastCalledWith('kid', 1);
    expect(playerAdapter.prefetch).not.toHaveBeenCalled();
    expired = true;
    await progress(14_000);
    expect(view.result.current.wantsPlayback).toBe(false);
    expect(playerAdapter.stop).toHaveBeenCalled();
    expect(view.result.current.policyMessage).toContain('finished');
    act(() => view.result.current.nativeHandlers.onPlay());
    expect(view.result.current.isPlaying).toBe(false);
    act(() => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'offline_unavailable' } }));
    await act(async () => jest.advanceTimersByTime(60_000));
    expect(playerAdapter.resume).not.toHaveBeenCalled();
  } finally { view.unmount(); check.mockRestore(); subscription.mockRestore(); jest.useRealTimers(); }
});
