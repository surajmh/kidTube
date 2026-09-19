import { Phase3Settings, defaultPhase3Settings } from '../phase3Types';
import { readJson, storageKeys, writeJson } from './storage';

const settingsKey = '@nestling/phase3-settings';

export const settingsRepository = {
  async get(): Promise<Phase3Settings> {
    const stored = await readJson<Partial<Phase3Settings> | null>(settingsKey, null);
    if (!stored) return defaultPhase3Settings;
    return {
      ...defaultPhase3Settings,
      ...stored,
      sponsorBlockCategories: stored.sponsorBlockCategories ?? defaultPhase3Settings.sponsorBlockCategories,
      schedules: { ...defaultPhase3Settings.schedules, ...(stored.schedules ?? {}) },
    };
  },
  save: (settings: Phase3Settings) => writeJson(settingsKey, settings),
};

export const screenTimeRepository = {
  getAll: () => readJson<import('../phase3Types').ScreenTimeUsage[]>(storageKeys.screenTime, []),
  saveAll: (records: import('../phase3Types').ScreenTimeUsage[]) => writeJson(storageKeys.screenTime, records),
};
