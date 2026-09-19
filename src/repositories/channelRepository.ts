import { ApprovedChannel } from '../types';
import { readJson, storageKeys, writeJson } from './storage';

export const channelRepository = {
  getAll: () => readJson<ApprovedChannel[]>(storageKeys.channels, []),
  saveAll: (channels: ApprovedChannel[]) => writeJson(storageKeys.channels, channels),
};
