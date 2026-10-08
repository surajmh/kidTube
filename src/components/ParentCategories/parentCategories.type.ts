import { ApprovedChannel, ApprovedVideo } from '../../types';
import type { ContentCategory } from '../../types';

/** How much content sits in a category. */
export type CategoryCounts = { videos: number; channels: number };

export type ParentCategoriesProps = {
  categories: ContentCategory[];
  videos: ApprovedVideo[];
  channels: ApprovedChannel[];
  onCreate: (name: string) => Promise<void>;
  onRename: (categoryId: string, name: string) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
};

export type UseParentCategoriesInput = Pick<ParentCategoriesProps, 'onCreate' | 'onRename'>;
