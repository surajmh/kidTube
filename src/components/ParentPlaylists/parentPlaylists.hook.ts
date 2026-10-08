import { useState } from 'react';
import { ApprovedVideo, CuratedPlaylist } from '../../types';

export function useParentPlaylists(videos: ApprovedVideo[]) {
  const [draft, setDraft] = useState<CuratedPlaylist | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const byId = new Map(videos.map((video) => [video.id, video]));
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); setDraft(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not save the playlist.'); }
    finally { setBusy(false); }
  }
  function edit(playlist: CuratedPlaylist) {
    setDraft({ ...playlist, videoIds: playlist.videoIds.filter((id) => byId.has(id)) });
    setQuery(''); setError('');
  }
  function move(index: number, delta: number) {
    if (!draft) return;
    const ids = [...draft.videoIds];
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    setDraft({ ...draft, videoIds: ids });
  }
  return { draft, setDraft, query, setQuery, busy, error, byId, run, edit, move };
}
