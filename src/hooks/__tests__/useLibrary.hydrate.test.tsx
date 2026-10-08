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

const profile = { id: 'p1', name: 'Kid', avatar: 'sun' };
const video = (id: string, ytId: string) => ({ id, youtubeVideoId: ytId, title: id, approved: true });

function mount() {
  return renderHook(() => useLibrary({ parentSession: null, screen: 'kid', onOverrideGranted: () => undefined }));
}

describe('useLibrary startup', () => {
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
});
