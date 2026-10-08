import type { SavedVideo } from '../../services/downloadService.type';
import type { ApprovedVideo } from '../../types';

/** One saved video as a list row. The video may be gone from the library (parents still see the file). */
export type DownloadEntry = { video?: ApprovedVideo; item: SavedVideo };

export type DownloadSort = 'recent' | 'name' | 'size';

export type DownloadListProps = {
  entries: DownloadEntry[];
  /** Shows "N downloaded videos" and the sort control. */
  showHeader?: boolean;
  /** Present only for parents: adds the "…" menu with the delete option. */
  onDelete?: (entry: DownloadEntry) => void;
  /** Present for children: a finished row can be played. */
  onPlay?: (video: ApprovedVideo) => void;
  /** Rows that are busy (for example being deleted) are dimmed and cannot be opened. */
  busyId?: string | null;
};

export type SheetOption = { label: string; danger?: boolean; selected?: boolean; onPress: () => void };
