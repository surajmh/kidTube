import { act, renderHook } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';
import { useKidNavigation } from '../useKidNavigation';

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
