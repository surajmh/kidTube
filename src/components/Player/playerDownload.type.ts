import type { ApprovedVideo } from '../../types';
import type { ChildDownloads } from '../../hooks/useChildDownloads.type';

export type PlayerDownloadProps = { video: ApprovedVideo; downloads: ChildDownloads };
