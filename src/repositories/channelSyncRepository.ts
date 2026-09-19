import { ChannelSyncState } from '../services/content/channelSyncRules';
import { readJson, writeJson } from './storage';

/**
 * Channel sync bookkeeping, keyed by canonical channel id.
 *
 * Deliberately separate from the video rows: this is per-channel fetch state
 * (pagination token, cache timestamp, last failure) and not content, so removing
 * or repairing content never silently discards where a channel got to.
 */
export const channelSyncKeys = {
  state: '@nestling/channel-sync',
} as const;

export type ChannelSyncMap = Record<string, ChannelSyncState>;

export const channelSyncRepository = {
  getAll: () => readJson<ChannelSyncMap>(channelSyncKeys.state, {}),
  saveAll: (states: ChannelSyncMap) => writeJson(channelSyncKeys.state, states),
};
