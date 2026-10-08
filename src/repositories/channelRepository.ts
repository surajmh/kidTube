import { ApprovedChannel } from '../types';
import { saveQuietly, useAppStore } from '../store/appStore';

export const channelRepository = {
  getAll: async () => useAppStore.getState().channels,
  saveAll: (channels: ApprovedChannel[]) => saveQuietly({ channels }),
};
