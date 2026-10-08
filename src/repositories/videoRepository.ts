import { ApprovedVideo } from '../types';
import { saveQuietly, useAppStore } from '../store/appStore';

export const videoRepository = {
  getAll: async () => useAppStore.getState().videos,
  saveAll: (videos: ApprovedVideo[]) => saveQuietly({ videos }),
};
