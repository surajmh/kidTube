import type { ChildContentRules } from '../types';

/**
 * Single source of truth for "may this profile see/play this content?".
 *
 * Both `PlaybackPolicyService` (before handing a video to the native player) and
 * `KidContentLibraryService` (when building the Kid Mode library) call this, so
 * the child never sees content the policy would refuse, and vice versa.
 *
 * Layer order:
 *  1. explicit child blocks            -> child_blocked
 *  2. global whitelist approval, or a child/family grant -> allowed (otherwise not_approved / expired)
 *  3. disabled category                -> category_blocked
 */
export type ContentAccessOutcome = 'allowed' | 'expired' | 'not_approved' | 'category_blocked' | 'child_blocked';

export type ContentAccessInput = {
  videoId?: string;
  channelId?: string;
  categoryIds?: string[];
};

export type ApprovalState = 'allowed' | 'expired' | 'none';

/** `evaluate()` runs once per video/channel in the whole library, so its id-list lookups are
 * indexed into Sets once per rule change rather than `Array.includes`d from scratch every call —
 * turning what was an O(videos × rules) scan into O(videos + rules). */
export type IndexedChildRules = {
  rules: ChildContentRules;
  blockedVideoIds: Set<string>;
  blockedChannelIds: Set<string>;
  grantedVideoIds: Set<string>;
  grantedChannelIds: Set<string>;
  blockedCategoryIds: Set<string>;
};
