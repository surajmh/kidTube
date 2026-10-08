import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '../store/appStore';
import { downloadService } from '../services/downloadService';
import { reconcileOwners } from '../services/downloadService.helper';
import type { SavedVideo } from '../services/downloadService.type';

/**
 * The device's download list, refreshed while the app is open, with ownership kept in step.
 *
 * `ready` is false until the stored ownership has loaded, so older downloads are never handed out
 * against an empty record. `profileIds` is read through a ref so a new profile list does not
 * restart the polling.
 */
export function useDownloads({ profileIds, ready }: { profileIds: string[]; ready: boolean }) {
  const [downloads, setDownloads] = useState<SavedVideo[]>([]);
  const [error, setError] = useState('');
  const profileIdsRef = useRef(profileIds);
  profileIdsRef.current = profileIds;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const firstRead = useRef(true);

  const read = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const next = await downloadService.list();
      if (!isActive()) return;
      setDownloads(next);
      setError('');
      if (!readyRef.current) return;
      const current = useAppStore.getState().downloadOwners;
      const reconciled = reconcileOwners(current, next, profileIdsRef.current, firstRead.current);
      firstRead.current = false;
      if (reconciled !== current) useAppStore.setState({ downloadOwners: reconciled });
    } catch {
      if (isActive()) setError('Could not read saved videos. Try reopening the app.');
    }
  }, []);

  const refresh = useCallback(() => read(), [read]);

  useEffect(() => {
    let active = true;
    const isActive = () => active;
    void read(isActive);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void read(isActive); }, 3000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void read(isActive); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [read]);

  return { downloads, error, refresh };
}
