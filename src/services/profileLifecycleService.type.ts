import type { ChildProfile, WatchHistory } from '../types';
import type { ScreenTimeUsage } from '../types';
import type { ContentApproval, ContentRequest, PlaybackOverride, ProfilePolicyOverrides } from '../types';
import type { ChildRulesMap } from './childRulesService.type';

/**
 * Deleting a child profile must not leave orphaned records behind: approvals, requests, overrides,
 * content rules, per-child policy, watch history and screen time all belong to that profile.
 */
export type ProfileDeletionInput = {
  profiles: ChildProfile[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
  overrides: PlaybackOverride[];
  childRules: ChildRulesMap;
  profilePolicies: Record<string, ProfilePolicyOverrides>;
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
};

export type ProfileDeletionResult = {
  profiles: ChildProfile[];
  requests: ContentRequest[];
  approvals: ContentApproval[];
  overrides: PlaybackOverride[];
  childRules: ChildRulesMap;
  profilePolicies: Record<string, ProfilePolicyOverrides>;
  history: WatchHistory[];
  screenTime: ScreenTimeUsage[];
};
