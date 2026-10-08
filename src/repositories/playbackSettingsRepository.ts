import type { PlaybackSettings, ScreenTimeUsage } from '../types';
import { defaultPlaybackSettings } from '../constants/playback.constant';
import { saveQuietly, useAppStore } from '../store/appStore';

/** Stored settings may predate newer fields, so fill the gaps from the defaults. */
export function normaliseSettings(stored: Partial<PlaybackSettings>): PlaybackSettings {
  return {
    ...defaultPlaybackSettings,
    ...stored,
    sponsorBlockCategories: stored.sponsorBlockCategories ?? defaultPlaybackSettings.sponsorBlockCategories,
    schedules: { ...defaultPlaybackSettings.schedules, ...(stored.schedules ?? {}) },
  };
}

export const settingsRepository = {
  get: async () => normaliseSettings(useAppStore.getState().playbackSettings),
  save: (playbackSettings: PlaybackSettings) => saveQuietly({ playbackSettings }),
};

export const screenTimeRepository = {
  getAll: async () => useAppStore.getState().screenTimeUsage,
  saveAll: (screenTimeUsage: ScreenTimeUsage[]) => saveQuietly({ screenTimeUsage }),
};
