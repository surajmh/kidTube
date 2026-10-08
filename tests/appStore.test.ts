import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fieldSetter, loadAppData, saveQuietly, useAppStore } from '../src/store/appStore';
import { legacySettingsKey, storageKeys } from '../src/repositories/storage';
import { defaultCategories } from '../src/constants/parentalControls.constant';

const profile = { id: 'p1', name: 'Kid', avatar: 'a' };
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('app store persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAppStore.setState(await loadAppData());
  });

  it('writes changes to the existing storage keys', async () => {
    useAppStore.setState({ profiles: [profile] });
    await flush();
    assert.deepEqual(JSON.parse((await AsyncStorage.getItem(storageKeys.profiles))!), [profile]);
  });

  it('loads what earlier builds stored, and defaults what is missing', async () => {
    await AsyncStorage.setItem(storageKeys.profiles, JSON.stringify([profile]));
    await AsyncStorage.setItem(storageKeys.videos, '{not json');
    const data = await loadAppData();
    assert.deepEqual(data.profiles, [profile]);
    assert.deepEqual(data.videos, []);
    assert.deepEqual(data.categories, defaultCategories);
  });

  it('only rewrites the keys that changed', async () => {
    useAppStore.setState({ profiles: [profile] });
    await flush();
    const spy = jest.spyOn(AsyncStorage, 'multiSet');
    spy.mockClear(); // the mock is shared, so it still holds calls from earlier tests
    useAppStore.setState({ requests: [] });
    await flush();
    assert.equal(spy.mock.calls.length, 1);
    assert.deepEqual(spy.mock.calls[0][0].map(([key]) => key), [storageKeys.requests]);
    spy.mockClear(); // not mockRestore: on this shared jest.fn it would wipe the mock implementation
  });

  it('saves quietly: persisted, readable, and subscribers are not notified', async () => {
    let notified = 0;
    const unsubscribe = useAppStore.subscribe(() => (notified += 1));
    await saveQuietly({ history: [{ profileId: 'p1', videoId: 'v', progress: 5, watchedAt: new Date().toISOString() } as never] });
    unsubscribe();
    assert.equal(notified, 0);
    assert.equal(useAppStore.getState().history.length, 1);
    assert.equal(JSON.parse((await AsyncStorage.getItem(storageKeys.history))!).length, 1);
  });

  it('migrates settings from the legacy key to the new one', async () => {
    await AsyncStorage.setItem(legacySettingsKey, JSON.stringify({ maxMinutesPerDay: 42 }));
    useAppStore.setState(await loadAppData());
    assert.equal((useAppStore.getState().playbackSettings as unknown as Record<string, unknown>).maxMinutesPerDay, 42);
    await saveQuietly({ playbackSettings: useAppStore.getState().playbackSettings });
    assert.equal(JSON.parse((await AsyncStorage.getItem(storageKeys.settings))!).maxMinutesPerDay, 42);
    assert.equal(await AsyncStorage.getItem(legacySettingsKey), null);
  });

  it('notifies when a setter is given the array a service just saved quietly', async () => {
    const approvals = [{ id: 'a' }] as never[];
    let notified = 0;
    const unsubscribe = useAppStore.subscribe(() => (notified += 1));
    await saveQuietly({ approvals });
    fieldSetter('approvals')(approvals);
    assert.equal(notified, 1);
    unsubscribe();
  });

  it('treats an updater that returns the current value as no change', () => {
    let notified = 0;
    const unsubscribe = useAppStore.subscribe(() => (notified += 1));
    fieldSetter('history')((current) => current);
    assert.equal(notified, 0);
    unsubscribe();
  });
});
