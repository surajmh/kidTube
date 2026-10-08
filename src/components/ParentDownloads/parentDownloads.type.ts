import { ApprovedVideo, ChildProfile } from '../../types';
import type { SavedVideo } from '../../services/downloadService.type';
import type { ParentSession } from '../../services/auth/parentSession.type';

export type ParentDownloadsProps = {
  session: ParentSession; videos: ApprovedVideo[]; profiles: ChildProfile[]; downloads: SavedVideo[];
  maximum: number; refresh: () => Promise<void>; readError: string;
};
