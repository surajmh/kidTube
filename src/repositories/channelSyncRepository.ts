import type { ChannelSyncMap } from './channelSyncRepository.type';
import { saveQuietly, useAppStore } from '../store/appStore';

/**
 * Channel sync bookkeeping, keyed by canonical channel id.
 *
 * Deliberately separate from the video rows: this is per-channel fetch state
 * (pagination token, cache timestamp, last failure) and not content, so removing
 * or repairing content never silently discards where a channel got to.
 */
export const channelSyncRepository = {
  getAll: async () => useAppStore.getState().channelSyncStates,
  saveAll: (channelSyncStates: ChannelSyncMap) => saveQuietly({ channelSyncStates }),
};
