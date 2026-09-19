import { ChildProfile } from '../types';
import { readJson, storageKeys, writeJson } from './storage';

export const profileRepository = {
  getAll: () => readJson<ChildProfile[]>(storageKeys.profiles, []),
  saveAll: (profiles: ChildProfile[]) => writeJson(storageKeys.profiles, profiles),
};
