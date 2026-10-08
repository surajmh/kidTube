import { ApprovedVideo, CuratedPlaylist } from '../../types';

export type ParentPlaylistsProps = {
  playlists: CuratedPlaylist[]; videos: ApprovedVideo[];
  onSave: (playlist: CuratedPlaylist) => Promise<void>; onRemove: (id: string) => Promise<void>;
};
