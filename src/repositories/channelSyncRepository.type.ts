import type { ChannelSyncState } from '../services/content/channelSyncRules.type';

/** Channel sync bookkeeping, keyed by canonical channel id. */
export type ChannelSyncMap = Record<string, ChannelSyncState>;
