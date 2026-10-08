import { ChildProfile } from '../types';
import { saveQuietly, useAppStore } from '../store/appStore';

export const profileRepository = {
  getAll: async () => useAppStore.getState().profiles,
  saveAll: (profiles: ChildProfile[]) => saveQuietly({ profiles }),
};
