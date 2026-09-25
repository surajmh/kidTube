import { ApprovedChannel, ApprovedVideo } from '../../types';
import { resolvedCategoryIds } from '../../parentalControlsTypes';
import { CategoryCounts } from './parentCategories.type';

/**
 * How many videos and channels a category holds.
 *
 * Counting goes through `resolvedCategoryIds`, so uncategorised content counts toward the
 * fallback category rather than vanishing. That matters: the count is what tells a parent
 * whether blocking a category would actually restrict anything.
 */
export function categoryCounts(
  categoryId: string,
  videos: ApprovedVideo[],
  channels: ApprovedChannel[],
): CategoryCounts {
  return {
    videos: videos.filter((video) => resolvedCategoryIds(video.categoryIds).includes(categoryId)).length,
    channels: channels.filter((channel) => resolvedCategoryIds(channel.categoryIds).includes(categoryId)).length,
  };
}
