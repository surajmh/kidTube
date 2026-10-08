import { useState } from 'react';
import { downloadableVideos } from '../../services/downloadService';
import { QUALITY_HEIGHTS } from './parentDownloads.constant';
import { ParentDownloadsProps } from './parentDownloads.type';

export function useParentDownloads({ videos, profiles, maximum, refresh }: Pick<ParentDownloadsProps, 'videos' | 'profiles' | 'maximum' | 'refresh'>) {
  const [query, setQuery] = useState('');
  const [quality, setQuality] = useState(360);
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const approved = downloadableVideos(videos, profiles);
  const byId = new Map(videos.map((video) => [video.youtubeVideoId, video]));
  async function run(id: string, action: () => Promise<void>) {
    setBusy(id); setError('');
    try { await action(); await refresh(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save this video.'); }
    finally { setBusy(null); }
  }
  const choices = QUALITY_HEIGHTS.filter((height) => height <= maximum);
  const selectedQuality = Math.min(quality, maximum);
  return { query, setQuery, setQuality, days, setDays, busy, error, approved, byId, run, choices, selectedQuality };
}
