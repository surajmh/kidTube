import { act, renderHook } from '@testing-library/react-native';
import { AppState, BackHandler, Platform } from 'react-native';
import { useKidNavigation } from '../useKidNavigation';
import { playbackPolicy } from '../../services/playbackPolicyService';
import { defaultPlaybackSettings } from '../../constants/playback.constant';

it('rechecks a retained time-limit notice on foreground without clearing a current restriction', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 12, 12));
  playbackPolicy.hydrate({ settings: { ...defaultPlaybackSettings, dailyLimitMinutes: 1 },
    profiles: [{ id: 'kid' }], screenTime: [{ profileId: 'kid', date: '2026-10-12', secondsWatched: 60 }] });
  playbackPolicy.setOverrideResolver(() => ({ additionalSeconds: 0, grantsScheduleAccess: false }));
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
  const view = renderHook(() => useKidNavigation({
    screen: 'kid', setScreen: jest.fn(), pinModalVisible: false, setPinModalVisible: jest.fn(),
    onParentBack: jest.fn(), commitPendingHistory: jest.fn(), setupStep: null,
    activeProfile: { id: 'kid', name: 'Kid', avatar: '' },
    kidLibrary: { profileId: 'kid', videos: [], recentVideos: [], channels: [], categories: [], askableVideos: [], askableChannels: [] },
  }));
  try {
    act(() => view.result.current.explainDecision({ allowed: false, reason: 'SCREEN_TIME_EXCEEDED' }));
    const listener = subscription.mock.calls.at(-1)![1];
    act(() => listener('active'));
    expect(view.result.current.kidNotice).toContain('finished your screen time');
    jest.setSystemTime(new Date(2026, 9, 13, 12));
    act(() => listener('active'));
    expect(view.result.current.kidNotice).toBe('');
    expect(view.result.current.kidNoticeAction).toBeNull();
    expect(playbackPolicy.getUsage('kid', '2026-10-12')).toBe(60);
  } finally { view.unmount(); subscription.mockRestore(); jest.useRealTimers(); }
});

it('TV Back closes a channel before leaving Channels, while mobile retains its existing route', () => {
  const tv = jest.spyOn(Platform, 'isTV', 'get').mockReturnValue(true);
  let pressBack: (() => boolean | null | undefined) | undefined;
  const back = jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_, listener) => {
    pressBack = listener;
    return { remove: jest.fn() };
  });
  const props: Parameters<typeof useKidNavigation>[0] = {
    screen: 'kid', setScreen: jest.fn(), pinModalVisible: false, setPinModalVisible: jest.fn(),
    onParentBack: jest.fn(), commitPendingHistory: jest.fn(), setupStep: null, activeProfile: undefined,
    kidLibrary: { profileId: 'kid', videos: [], recentVideos: [], channels: [], categories: [], askableVideos: [], askableChannels: [] },
  };
  const view = renderHook(() => useKidNavigation(props));
  try {
    act(() => { view.result.current.setKidTab('channels'); view.result.current.setKidChannelId('channel'); });
    act(() => { expect(pressBack?.()).toBe(true); });
    expect(view.result.current.kidChannelId).toBeNull();
    expect(view.result.current.kidTab).toBe('channels');
    act(() => { expect(pressBack?.()).toBe(true); });
    expect(view.result.current.kidTab).toBe('home');
    expect(pressBack?.()).toBe(false);
    tv.mockReturnValue(false);
    act(() => { view.result.current.setKidTab('channels'); view.result.current.setKidChannelId('channel'); });
    act(() => { expect(pressBack?.()).toBe(true); });
    expect(view.result.current.kidTab).toBe('home');
    expect(view.result.current.kidChannelId).toBeNull();
  } finally { view.unmount(); back.mockRestore(); tv.mockRestore(); }
});
