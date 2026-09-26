import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { watchHistoryRepository } from '../repositories/watchHistoryRepository';
import { screenTimeService } from '../services/screenTimeService';
import { WatchHistory } from '../types';

/** Two history lists with the same profile/video entries in the same order show the same library rows. */
function sameHistoryStructure(a: WatchHistory[], b: WatchHistory[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].profileId !== b[i].profileId || a[i].videoId !== b[i].videoId) return false;
  }
  return true;
}

/**
 * The player reports progress every couple of seconds; storage writes are debounced and flushed
 * on background/unmount so watch history is neither lost nor written on every tick.
 *
 * Ticks update the top entry's `progress`/`watchedAt` in place, which would rebuild the kid
 * library (and re-render the tree) every couple of seconds while a child watches. Only a
 * structural change — a different video moving to the front — goes to state; progress-only
 * updates live in `pending` until a boundary (leaving the player, backgrounding) commits them.
 */
export function useWatchHistory(setHistory: (next: WatchHistory[] | ((current: WatchHistory[]) => WatchHistory[])) => void) {
  const write = useRef<{ timer: ReturnType<typeof setTimeout> | null; pending: WatchHistory[] | null }>({
    timer: null,
    pending: null,
  });

  async function flushHistory() {
    const pending = write.current.pending;
    write.current.pending = null;
    if (write.current.timer) {
      clearTimeout(write.current.timer);
      write.current.timer = null;
    }
    if (pending) await watchHistoryRepository.saveAll(pending);
  }

  function commitPendingHistory() {
    const pending = write.current.pending;
    if (pending) setHistory(pending);
  }

  function saveHistory(next: WatchHistory[]) {
    write.current.pending = next;
    setHistory((current) => (sameHistoryStructure(current, next) ? current : next));
    if (write.current.timer) return;
    write.current.timer = setTimeout(() => {
      write.current.timer = null;
      void flushHistory();
    }, 5_000);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') return;
      commitPendingHistory();
      void flushHistory();
      void screenTimeService.flush();
    });
    return () => {
      subscription.remove();
      void flushHistory();
      void screenTimeService.flush();
    };
  }, []);

  return { saveHistory, commitPendingHistory, flushHistory };
}
