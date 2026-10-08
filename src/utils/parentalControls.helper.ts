import { fallbackCategoryId } from '../constants/parentalControls.constant';
import type { ChildContentRules } from '../types';

export function resolvedCategoryIds(categoryIds?: string[]): string[] {
  return categoryIds?.length ? categoryIds : [fallbackCategoryId];
}

export const defaultChildContentRules = (profileId: string): ChildContentRules => ({
  profileId,
  inheritGlobalApprovals: true,
  blockedCategoryIds: [],
  grantedVideoIds: [],
  grantedChannelIds: [],
  blockedVideoIds: [],
  blockedChannelIds: [],
});
