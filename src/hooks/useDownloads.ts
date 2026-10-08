import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { downloadService, SavedVideo } from '../services/downloadService';

export function useDownloads() {
  const [downloads, setDownloads] = useState<SavedVideo[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setDownloads(await downloadService.list()); setError(''); }
    catch { setError('Could not read saved videos. Try reopening the app.'); }
  }, []);
  useEffect(() => {
    let active = true;
    const read = async () => {
      try { const next = await downloadService.list(); if (active) { setDownloads(next); setError(''); } }
      catch { if (active) setError('Could not read saved videos. Try reopening the app.'); }
    };
    void read();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void read(); }, 3000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void read(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, []);
  return { downloads, error, refresh };
}
