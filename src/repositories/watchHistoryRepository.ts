import { WatchHistory } from '../types';
import { saveQuietly, useAppStore } from '../store/appStore';

/**
 * The player writes history every couple of seconds, so history is capped and written on a
 * debounce rather than on every progress tick.
 */
export const maxHistoryEntries = 500;

export function capHistory(history: WatchHistory[], limit = maxHistoryEntries) {
  if (history.length <= limit) return history;
  return [...history]
    .sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime())
    .slice(0, limit);
}

export const watchHistoryRepository = {
  getAll: async () => useAppStore.getState().history,
  saveAll: (history: WatchHistory[]) => saveQuietly({ history: capHistory(history) }),
};
