import { useCallback, useRef } from 'react';
import { playbackPolicy } from '../services/playbackPolicyService';
import { ScreenTimeUsage } from '../playbackTypes';

/**
 * Watch time accrues in the policy's own store on every tick; the parent-facing summary only needs
 * minute resolution. Re-rendering the whole app on each tick would be wasteful, so global state is
 * updated when the rounded minute changes (or when forced, e.g. leaving the player).
 */
export function useScreenTimeUsage(setScreenTimeUsage: (usage: ScreenTimeUsage[]) => void) {
  const usageSyncKey = useRef('');

  const syncUsageIntoState = useCallback((force = false) => {
    const records = playbackPolicy.records();
    const key = records
      .map((record) => `${record.profileId}|${record.date}|${Math.floor(record.secondsWatched / 60)}`)
      .sort()
      .join(',');
    if (!force && key === usageSyncKey.current) return;
    usageSyncKey.current = key;
    setScreenTimeUsage(records);
  }, []);

  return { syncUsageIntoState };
}
