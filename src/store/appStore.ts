import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { PersistStorage, persist } from 'zustand/middleware';
import { legacySettingsKey, storageKeys } from '../repositories/storage';
import type { AppData, Next } from './appStore.type';
import { defaultPlaybackSettings } from '../constants/playback.constant';
import { defaultCategories } from '../constants/parentalControls.constant';

export const emptyAppData = (): AppData => ({
  profiles: [],
  playlists: [],
  channels: [],
  videos: [],
  history: [],
  screenTimeUsage: [],
  playbackSettings: defaultPlaybackSettings,
  requests: [],
  approvals: [],
  categories: defaultCategories,
  childRules: {},
  profilePolicies: {},
  overrides: [],
  channelSyncStates: {},
  downloadOwners: {},
});

// Reusing the keys the repositories always wrote means existing installs need no migration.
const keyOf: Record<keyof AppData, string> = {
  profiles: storageKeys.profiles,
  playlists: storageKeys.playlists,
  channels: storageKeys.channels,
  videos: storageKeys.videos,
  history: storageKeys.history,
  screenTimeUsage: storageKeys.screenTime,
  playbackSettings: storageKeys.settings,
  requests: storageKeys.requests,
  approvals: storageKeys.approvals,
  categories: storageKeys.categories,
  childRules: storageKeys.childRules,
  profilePolicies: storageKeys.profilePolicies,
  overrides: storageKeys.overrides,
  channelSyncStates: storageKeys.channelSync,
  downloadOwners: storageKeys.downloadOwners,
};
const fields = Object.keys(keyOf) as (keyof AppData)[];

const pick = (state: AppData): Partial<AppData> => Object.fromEntries(fields.map((field) => [field, state[field]]));

/** The last value written (or loaded) per field, so only fields that really changed hit native storage. */
const persisted = new Map<keyof AppData, unknown>();
let queue: Promise<void> = Promise.resolve();
let legacySettingsPending = false;

/** Writes are serialised so two quick saves of one key can never land out of order. */
function write(state: Partial<AppData>): Promise<void> {
  const run = async () => {
    const changed = fields.filter((field) => field in state && persisted.get(field) !== state[field]);
    if (!changed.length) return;
    await AsyncStorage.multiSet(changed.map((field) => [keyOf[field], JSON.stringify(state[field])]));
    for (const field of changed) persisted.set(field, state[field]);
    // Only drop the old key once the settings are safely under the new one.
    if (legacySettingsPending && changed.includes('playbackSettings')) {
      legacySettingsPending = false;
      await AsyncStorage.removeItem(legacySettingsKey);
    }
  };
  const result = queue.then(run);
  queue = result.catch(() => undefined);
  return result;
}

/** One native read for every key; a missing or corrupt key falls back to its default, as `readJson` did. */
export async function loadAppData(): Promise<AppData> {
  const data = emptyAppData();
  const pairs = [...(await AsyncStorage.multiGet([...fields.map((field) => keyOf[field]), legacySettingsKey]))];
  const legacy = pairs.pop()![1];
  const settingsIndex = fields.indexOf('playbackSettings');
  if (!pairs[settingsIndex][1] && legacy) {
    pairs[settingsIndex] = [keyOf.playbackSettings, legacy];
    legacySettingsPending = true;
  }
  pairs.forEach(([, raw], index) => {
    if (!raw) return;
    try {
      const field = fields[index];
      (data as Record<string, unknown>)[field] = JSON.parse(raw);
      // Settings read from the legacy key must still be written to the new one.
      if (!(legacySettingsPending && field === 'playbackSettings')) persisted.set(field, data[field]);
    } catch {
      // keep the default
    }
  });
  return data;
}

const storage: PersistStorage<Partial<AppData>> = {
  getItem: () => null, // hydration is explicit (`loadAppData`): the library must be repaired before it is trusted
  setItem: (_, value) => void write(value.state).catch(() => undefined),
  removeItem: () => undefined,
};

export const useAppStore = create<AppData>()(
  persist(emptyAppData, {
    name: 'nestling',
    storage,
    skipHydration: true,
    partialize: pick,
  }),
);

/**
 * Persists without notifying subscribers, for data that changes far more often than the UI should
 * redraw (watch progress every few seconds, screen-time ticks). The state object is updated in
 * place so a later `setState` can never write a stale copy over what was just saved.
 */
export function saveQuietly(patch: Partial<AppData>): Promise<void> {
  Object.assign(useAppStore.getState(), patch);
  return write(patch);
}

/**
 * A stable setter for one field, accepting a value or an updater like `useState` did.
 *
 * A direct value always notifies, even when it is the array a service just saved with
 * `saveQuietly`: that call already put it in the store without telling anyone, so the equality
 * check that `useState` would do here would swallow the one notification the screen is waiting
 * for. Only an updater that hands back the current value is a deliberate "no change".
 */
export function fieldSetter<K extends keyof AppData>(field: K) {
  return (next: Next<AppData[K]>) =>
    useAppStore.setState((state) => {
      if (typeof next !== 'function') return { [field]: next } as Pick<AppData, K>;
      const value = (next as (current: AppData[K]) => AppData[K])(state[field]);
      return Object.is(value, state[field]) ? state : ({ [field]: value } as Pick<AppData, K>);
    });
}
