import { PlaybackSettings, defaultPlaybackSettings } from '../playbackTypes';
import { readJson, storageKeys, writeJson } from './storage';

// Historical key name — renaming it would orphan saved settings on existing installs.
const settingsKey = '@nestling/phase3-settings';

export const settingsRepository = {
  async get(): Promise<PlaybackSettings> {
    const stored = await readJson<Partial<PlaybackSettings> | null>(settingsKey, null);
    if (!stored) return defaultPlaybackSettings;
    return {
      ...defaultPlaybackSettings,
      ...stored,
      sponsorBlockCategories: stored.sponsorBlockCategories ?? defaultPlaybackSettings.sponsorBlockCategories,
      schedules: { ...defaultPlaybackSettings.schedules, ...(stored.schedules ?? {}) },
    };
  },
  save: (settings: PlaybackSettings) => writeJson(settingsKey, settings),
};

export const screenTimeRepository = {
  getAll: () => readJson<import('../playbackTypes').ScreenTimeUsage[]>(storageKeys.screenTime, []),
  saveAll: (records: import('../playbackTypes').ScreenTimeUsage[]) => writeJson(storageKeys.screenTime, records),
};
