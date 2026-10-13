import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockSecure = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecure.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockSecure.set(key, value); }),
  deleteItemAsync: jest.fn(async (key: string) => { mockSecure.delete(key); }),
}));

import { useLibrary } from '../useLibrary';
import { parentPinService } from '../../services/auth/parentPinService';
import { storageKeys } from '../../repositories/storage';
import { useAppStore } from '../../store/appStore';
import { nativeYouTubeContentProvider } from '../../services/content/nativeYouTubeContentProvider';
import { channel, channelA, video as upload, videoIds } from '../../../tests/helpers/fakeProvider';

const profile = { id: 'p1', name: 'Kid', avatar: 'sun' };
const video = (id: string, ytId: string) => ({ id, youtubeVideoId: ytId, title: id, approved: true });

function mount() {
  return renderHook(() => useLibrary({ parentSession: null, screen: 'kid', onOverrideGranted: () => undefined }));
}

describe('useLibrary startup', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(async () => {
    mockSecure.clear();
    await AsyncStorage.clear();
    useAppStore.setState(useAppStore.getInitialState());
    await parentPinService.setPin('1234');
  });

  it('repairs stored data before it reaches the screen, and rewrites only what changed', async () => {
    await AsyncStorage.setItem(storageKeys.profiles, JSON.stringify([profile]));
    await AsyncStorage.setItem(storageKeys.videos, JSON.stringify([video('a', 'aaaaaaaaaaa'), video('b', 'aaaaaaaaaaa'), video('c', 'bbbbbbbbbbb')]));

    const { result } = mount();
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await waitFor(() => expect(result.current.videos).toHaveLength(2));
    expect(result.current.repairNotice).toContain('duplicate videos');
    expect(result.current.videos.map((item) => item.youtubeVideoId)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem(storageKeys.videos))!)).toHaveLength(2),
    );
    expect(result.current.setupStep).toBeNull();
  });

  it('offers a retry instead of starting empty when storage cannot be read', async () => {
    const multiGet = jest.spyOn(AsyncStorage, 'multiGet').mockRejectedValueOnce(new Error('disk'));

    const { result } = mount();
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.hydrated).toBe(false);

    await act(async () => result.current.retryLoad());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.loadFailed).toBe(false);
    expect(multiGet).toHaveBeenCalled();
  });

  it('loads an approved channel in Kid Mode and merges against edits made during the fetch', async () => {
    await AsyncStorage.setItem(storageKeys.profiles, JSON.stringify([profile]));
    await AsyncStorage.setItem(storageKeys.channels, JSON.stringify([{ id: 'c', channelId: channelA, name: 'Story Time', approved: true }]));
    jest.spyOn(nativeYouTubeContentProvider, 'getChannel').mockResolvedValue(channel());
    let finish!: (value: { channelId: string; videos: ReturnType<typeof upload>[] }) => void;
    const pending = new Promise<{ channelId: string; videos: ReturnType<typeof upload>[] }>((resolve) => { finish = resolve; });
    const fetch = jest.spyOn(nativeYouTubeContentProvider, 'getChannelVideos').mockReturnValue(pending);
    const { result } = mount();
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    act(() => useAppStore.setState({ videos: [video('parent-added', 'ccccccccccc')] }));
    await act(async () => finish({ channelId: channelA, videos: [upload(0)] }));
    await waitFor(() => expect(result.current.videos).toHaveLength(2));
    expect(result.current.videos.find((item) => item.youtubeVideoId === videoIds[0])).toMatchObject({ approved: false, syncedFromChannel: true });
    expect(result.current.kidLibrary.videos).toHaveLength(2);
    expect(result.current.channels[0].approved).toBe(true);
    await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(storageKeys.videos))!)).toHaveLength(2));
  });
});
