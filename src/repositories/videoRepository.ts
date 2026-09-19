import { ApprovedVideo } from '../types';
import { readJson, storageKeys, writeJson } from './storage';

export const videoRepository = {
  getAll: () => readJson<ApprovedVideo[]>(storageKeys.videos, []),
  saveAll: (videos: ApprovedVideo[]) => writeJson(storageKeys.videos, videos),
};
