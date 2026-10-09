import React from 'react';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import { AppState, ScrollView, StyleSheet } from 'react-native';
import { usePlayer } from '../player.hook';
import type { PlayerScreenProps } from '../player.type';
import { defaultPlaybackSettings } from '../../../constants/playback.constant';
import { playerAdapter } from '../../../services/playerAdapterInstance';
import { playbackPolicy } from '../../../services/playbackPolicyService';
import { screenTimeService } from '../../../services/screenTimeService';
import { PlayerScreen } from '../player';
import { YouTubePlayer } from '../../../native';
import NativeYouTubePlayer from '../../../native/YouTubePlayerModule';
import * as authorizationModule from '../../../services/playbackAuthorization';

jest.mock('../../../native/YouTubePlayerModule', () => ({ __esModule: true, default: { managesBackgroundPlayback: false } }));
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

it('seeks chapters through the policy-aware player and exposes audio and fullscreen buttons', async () => {
  jest.useRealTimers();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = render(<PlayerScreen {...props} />);
  const latestNativeProps = () => (YouTubePlayer as jest.Mock).mock.calls.at(-1)?.[0];
  await act(async () => latestNativeProps().onReady({ nativeEvent: {
    videoId: props.video.youtubeVideoId, duration: 180_000,
    chapters: [{ title: 'Introduction', startMs: 0 }, { title: 'Story', startMs: 60_000 }],
  } }));
  act(() => latestNativeProps().onTracksChanged({ nativeEvent: {
    videoId: props.video.youtubeVideoId,
    audio: [{ language: 'en', label: 'English (original)', selected: true }, { language: 'es', label: 'Spanish (dubbed)', selected: false }],
  } }));
  fireEvent.press(view.getByLabelText('Player settings'));
  fireEvent.press(view.getByLabelText('Audio language: Spanish (dubbed)'));
  expect(latestNativeProps().audioLanguage).toBe('es');
  fireEvent.press(view.getByLabelText('Chapter: Story, 1:00'));
  expect(playerAdapter.seek).toHaveBeenLastCalledWith(60_000);
  expect(view.queryByLabelText('Close player settings')).toBeNull();
  fireEvent(view.UNSAFE_getByType(ScrollView), 'layout', { nativeEvent: { layout: { width: 360, height: 640 } } });
  fireEvent.press(view.getByLabelText('Enter fullscreen'));
  expect(latestNativeProps().fullscreen).toBe(true);
  fireEvent(view.UNSAFE_getByType(ScrollView), 'layout', { nativeEvent: { layout: { width: 640, height: 360 } } });
  expect(StyleSheet.flatten(view.getByTestId('video-stage').props.style)).toMatchObject({ width: 640, height: 360 });
  expect(view.getByLabelText('Exit fullscreen')).toBeTruthy();
  expect(view.queryByText('Approved by your parent')).toBeNull();
  fireEvent.press(view.getByLabelText('Player settings'));
  expect(view.getByLabelText('Chapter: Story, 1:00')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Close player settings'));
  fireEvent.press(view.getByLabelText('Exit fullscreen'));
  expect(latestNativeProps().fullscreen).toBe(false);
  view.unmount();
  subscription.mockRestore();
});

it('keeps parent-enabled background audio playing and counts native elapsed time once across event gaps', async () => {
  jest.clearAllMocks();
  const previousState = AppState.currentState;
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => usePlayer({ ...props, settings: { ...props.settings, backgroundAudioEnabled: true } }));
  try {
    act(() => view.result.current.nativeHandlers.onPlay());
    const listener = subscription.mock.calls[subscription.mock.calls.length - 1][1];
    AppState.currentState = 'background';
    await act(async () => listener('background'));
    expect(playerAdapter.pause).not.toHaveBeenCalled();
    act(() => view.result.current.nativeHandlers.onPlay());
    expect(view.result.current.isPlaying).toBe(true);
    const sample = (playedMs: number) => view.result.current.nativeHandlers.onProgress({ nativeEvent: { videoId: 'aaaaaaaaaaa', playedMs, duration: 100_000, position: 50_000, isPlaying: true } });
    await act(async () => sample(500));
    // React may be suspended while the native foreground service continues listening.
    await act(async () => sample(30_500));
    await act(async () => sample(30_500));
    expect((screenTimeService.recordPlaybackSeconds as jest.Mock).mock.calls.map((call) => call[1])).toEqual([0.5, 30]);
    await act(async () => view.result.current.nativeHandlers.onProgress({ nativeEvent: { videoId: 'oldoldoldol', playedMs: 60_000 } }));
    expect(screenTimeService.recordPlaybackSeconds).toHaveBeenCalledTimes(2);
  } finally { AppState.currentState = previousState; view.unmount(); subscription.mockRestore(); }
});

it('floats the mini card above navigation and expands without stopping its session', () => {
  jest.clearAllMocks();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const onExpand = jest.fn();
  const view = render(<PlayerScreen {...props} onExpand={onExpand} />);
  try {
    const stops = (playerAdapter.stop as jest.Mock).mock.calls.length;
    view.rerender(<PlayerScreen {...props} minimized miniPlayerBottomInset={80} onExpand={onExpand} />);
    expect(playerAdapter.stop).toHaveBeenCalledTimes(stops);
    const cardStyle = StyleSheet.flatten(view.UNSAFE_getByType(ScrollView).props.style);
    expect(cardStyle).toMatchObject({ position: 'absolute', width: 180, height: 101.25, right: 12, bottom: 92, borderRadius: 12 });
    expect(view.queryByText('A')).toBeNull();
    expect(view.getByLabelText('Pause video')).toBeTruthy();
    expect(view.getByLabelText('Close mini player')).toBeTruthy();
    fireEvent(view.getByLabelText('Expand mini player'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onExpand).toHaveBeenCalledTimes(1);
    view.rerender(<PlayerScreen {...props} onExpand={onExpand} />);
    expect(playerAdapter.stop).toHaveBeenCalledTimes(stops);
  } finally { view.unmount(); subscription.mockRestore(); }
});

it('ignores completion from a previous video so it cannot consume the current approval', () => {
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const onPlaybackCompleted = jest.fn();
  const view = renderHook(() => usePlayer({ ...props, onPlaybackCompleted }));
  try {
    act(() => view.result.current.nativeHandlers.onEnd({ nativeEvent: { videoId: 'bbbbbbbbbbb' } }));
    expect(onPlaybackCompleted).not.toHaveBeenCalled();
    act(() => view.result.current.nativeHandlers.onEnd({ nativeEvent: { videoId: 'aaaaaaaaaaa' } }));
    expect(onPlaybackCompleted).toHaveBeenCalledTimes(1);
  } finally { view.unmount(); subscription.mockRestore(); }
});

it('rechecks a native deadline before resuming and never retries an exhausted budget', async () => {
  jest.clearAllMocks();
  const previousState = AppState.currentState;
  AppState.currentState = 'active';
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => usePlayer(props));
  try {
    await act(async () => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'authorization_expired' } }));
    expect(playerAdapter.resume).toHaveBeenCalledTimes(1);
    await act(async () => view.result.current.nativeHandlers.onError({ nativeEvent: { code: 'policy_blocked' } }));
    expect(playerAdapter.resume).toHaveBeenCalledTimes(1);
    expect(playerAdapter.stop).toHaveBeenCalled();
  } finally { AppState.currentState = previousState; view.unmount(); subscription.mockRestore(); }
});


it('lets native finish automatic PiP when AppState backgrounds before its PiP event', async () => {
  jest.clearAllMocks();
  const previousState = AppState.currentState;
  Object.assign(NativeYouTubePlayer!, { managesBackgroundPlayback: true });
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => usePlayer(props));
  try {
    act(() => view.result.current.nativeHandlers.onPlay());
    const listener = subscription.mock.calls[subscription.mock.calls.length - 1][1];
    AppState.currentState = 'background';
    await act(async () => listener('background'));
    expect(playerAdapter.pause).not.toHaveBeenCalled();
    act(() => view.result.current.nativeHandlers.onPlay({ nativeEvent: { videoId: props.video.youtubeVideoId, inPictureInPicture: true } }));
    expect(view.result.current.isPlaying).toBe(true);
    AppState.currentState = 'active';
    await act(async () => listener('active'));
    expect(playerAdapter.resume).not.toHaveBeenCalled();
    await act(async () => view.result.current.togglePlayback());
    act(() => view.result.current.nativeHandlers.onPlay({ nativeEvent: { inPictureInPicture: true } }));
    expect(view.result.current.wantsPlayback).toBe(false);
    expect(playerAdapter.pause).toHaveBeenCalledTimes(2);
  } finally {
    AppState.currentState = previousState;
    view.unmount();
    subscription.mockRestore();
    Object.assign(NativeYouTubePlayer!, { managesBackgroundPlayback: false });
  }
});


it('refreshes authorization before resuming after a parent changes the limit', async () => {
  jest.clearAllMocks();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const authorize = jest.fn(async () => {});
  Object.assign(NativeYouTubePlayer!, { setPlaybackAuthorization: authorize });
  const authorization = jest.spyOn(authorizationModule, 'playbackAuthorization').mockReturnValue({ date: '2026-10-09', stopAt: Date.now() + 86_400_000, usedMs: 900_000, remainingMs: 86_400_000 });
  const view = renderHook(() => usePlayer(props));
  try {
    await act(async () => {});
    await act(async () => view.result.current.togglePlayback());
    let release!: () => void;
    authorize.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    await act(async () => view.result.current.togglePlayback());
    expect(playerAdapter.resume).not.toHaveBeenCalled();
    await act(async () => release());
    expect(playerAdapter.resume).toHaveBeenCalledWith(props.video.youtubeVideoId);
  } finally {
    view.unmount();
    subscription.mockRestore();
    authorization.mockRestore();
    delete (NativeYouTubePlayer as unknown as { setPlaybackAuthorization?: unknown }).setPlaybackAuthorization;
  }
});

it('keeps the same playback session when PiP hides and restores the browsing controls', () => {
  jest.clearAllMocks();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const onPictureInPictureChange = jest.fn();
  const latestNativeProps = () => (YouTubePlayer as jest.Mock).mock.calls.at(-1)?.[0];
  const view = render(<PlayerScreen {...props} onPictureInPictureChange={onPictureInPictureChange} />);
  try {
    const stops = (playerAdapter.stop as jest.Mock).mock.calls.length;
    act(() => latestNativeProps().onPictureInPictureChanged({ nativeEvent: { inPictureInPicture: true } }));
    expect(onPictureInPictureChange).toHaveBeenLastCalledWith(true);
    expect(view.queryByLabelText('Player settings')).toBeNull();
    expect(playerAdapter.stop).toHaveBeenCalledTimes(stops);
    expect(playerAdapter.pause).not.toHaveBeenCalled();
    expect(latestNativeProps().videoId).toBe(props.video.youtubeVideoId);
    act(() => latestNativeProps().onPictureInPictureChanged({ nativeEvent: { inPictureInPicture: false } }));
    expect(onPictureInPictureChange).toHaveBeenLastCalledWith(false);
    expect(view.getByLabelText('Player settings')).toBeTruthy();
    expect(playerAdapter.stop).toHaveBeenCalledTimes(stops);
  } finally { view.unmount(); subscription.mockRestore(); }
});

it('shows compact approved up-next rows and keeps autoplay parent-controlled', () => {
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const onNextVideo = jest.fn();
  const next = { ...props.video, id: 'b', youtubeVideoId: 'bbbbbbbbbbb', title: 'Approved story' };
  const view = render(<PlayerScreen {...props} upNextVideos={[props.video, next]} onNextVideo={onNextVideo} />);
  try {
    expect(view.queryByLabelText('Play A')).toBeNull();
    fireEvent.press(view.getByLabelText('Play Approved story'));
    expect(onNextVideo).toHaveBeenCalledWith(next);
    expect(view.getByLabelText('Autoplay is controlled by your parent').props.disabled).toBe(true);
    expect(view.getByLabelText('Share video')).toBeTruthy();
  } finally { view.unmount(); subscription.mockRestore(); }
});

it('TV controls stay available during playback until explicitly hidden', async () => {
  const { Platform } = require('react-native');
  const tv = jest.spyOn(Platform, 'isTV', 'get').mockReturnValue(true);
  const appState = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  jest.useFakeTimers();
  const view = renderHook(() => usePlayer(props));
  try {
    act(() => view.result.current.nativeHandlers.onPlay());
    await act(async () => jest.advanceTimersByTime(5000));
    expect(view.result.current.controlsVisible).toBe(true);
    act(() => view.result.current.toggleControls());
    expect(view.result.current.controlsVisible).toBe(false);
    act(() => view.result.current.toggleControls());
    expect(view.result.current.controlsVisible).toBe(true);
  } finally { view.unmount(); appState.mockRestore(); tv.mockRestore(); jest.useRealTimers(); }
});

it('TV Back closes player settings, hides controls, then leaves playback', () => {
  const { BackHandler, Platform } = require('react-native');
  const tv = jest.spyOn(Platform, 'isTV', 'get').mockReturnValue(true);
  const appState = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const handlers = new Set<() => boolean>();
  const back = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_: unknown, listener: unknown) => {
    handlers.add(listener as () => boolean);
    return { remove: () => handlers.delete(listener as () => boolean) };
  });
  const onBack = jest.fn();
  const view = render(<PlayerScreen {...props} onBack={onBack} />);
  const pressBack = () => act(() => { expect([...handlers].at(-1)?.()).toBe(true); });
  try {
    fireEvent.press(view.getByLabelText('Player settings'));
    expect(view.getByLabelText('Close player settings')).toBeTruthy();
    pressBack();
    expect(view.queryByLabelText('Close player settings')).toBeNull();
    expect(onBack).not.toHaveBeenCalled();
    pressBack();
    expect(view.queryByLabelText('Player settings')).toBeNull();
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.press(view.getByLabelText('Show player controls'));
    expect(view.getByLabelText('Player settings')).toBeTruthy();
    pressBack();
    pressBack();
    expect(onBack).toHaveBeenCalledTimes(1);
  } finally { view.unmount(); back.mockRestore(); appState.mockRestore(); tv.mockRestore(); }
});
