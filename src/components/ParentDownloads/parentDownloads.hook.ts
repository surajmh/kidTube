import { useState } from 'react';
import { downloadService } from '../../services/downloadService';
import { parentDownloadRows } from '../../services/downloadService.helper';
import { useAppStore } from '../../store/appStore';
import { DELETE_FAILED } from './parentDownloads.constant';
import type { DownloadGroup, ParentDownloadsProps } from './parentDownloads.type';

export function useParentDownloads({ profiles, videos, downloads, refresh }: Pick<ParentDownloadsProps, 'profiles' | 'videos' | 'downloads' | 'refresh'>) {
  const owners = useAppStore((state) => state.downloadOwners);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const rows = parentDownloadRows(downloads, owners, profiles.map((profile) => profile.id), videos);
  const groups: DownloadGroup[] = profiles
    .map((profile) => ({
      profile,
      entries: rows.filter((row) => row.profileId === profile.id && row.item.state !== 'removing').map(({ video, item }) => ({ video, item })),
    }))
    .filter((group) => group.entries.length);

  async function remove(profileId: string, videoId: string) {
    setBusy(`${profileId}:${videoId}`); setError('');
    try { await downloadService.removeForChild(profileId, videoId); await refresh(); }
    catch (caught) { setError(caught instanceof Error && caught.message ? caught.message : DELETE_FAILED); }
    finally { setBusy(null); }
  }
  return { groups, busy, error, remove };
}
