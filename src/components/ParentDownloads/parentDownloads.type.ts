import type { ApprovedVideo, ChildProfile } from '../../types';
import type { SavedVideo } from '../../services/downloadService.type';
import type { DownloadEntry } from '../DownloadList';

export type ParentDownloadsProps = {
  profiles: ChildProfile[]; videos: ApprovedVideo[]; downloads: SavedVideo[]; downloadsEnabled: boolean;
  maximum?: never; refresh: () => Promise<void>; readError?: string;
};

export type DownloadGroup = { profile: ChildProfile; entries: DownloadEntry[] };
