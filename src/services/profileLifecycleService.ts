import { screenTimeRepository } from '../repositories/playbackSettingsRepository';
import {
  approvalRepository,
  childRulesRepository,
  overrideRepository,
  profilePolicyRepository,
  requestRepository,
} from '../repositories/parentalControlsRepository';
import { watchHistoryRepository } from '../repositories/watchHistoryRepository';
import { ChildProfile, WatchHistory } from '../types';
import { ScreenTimeUsage } from '../playbackTypes';
import { ContentApproval, ContentRequest, PlaybackOverride, ProfilePolicyOverrides } from '../parentalControlsTypes';
import { ParentSession, parentSessionService } from './auth/parentSession';
import { ChildRulesMap } from './childRulesService';

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

function withoutKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

export const profileLifecycleService = {
  async deleteProfile(session: ParentSession, profileId: string, input: ProfileDeletionInput): Promise<ProfileDeletionResult> {
    parentSessionService.require('delete a child profile');

    const result: ProfileDeletionResult = {
      profiles: input.profiles.filter((profile) => profile.id !== profileId),
      // Family-wide approvals (profileId === null) are kept: they are not that child's data.
      requests: input.requests.filter((request) => request.profileId !== profileId),
      approvals: input.approvals.filter((approval) => approval.profileId !== profileId),
      overrides: input.overrides.filter((override) => override.profileId !== profileId),
      childRules: withoutKey(input.childRules, profileId),
      profilePolicies: withoutKey(input.profilePolicies, profileId),
      history: input.history.filter((item) => item.profileId !== profileId),
      screenTime: input.screenTime.filter((record) => record.profileId !== profileId),
    };

    await Promise.all([
      requestRepository.saveAll(result.requests),
      approvalRepository.saveAll(result.approvals),
      overrideRepository.saveAll(result.overrides),
      childRulesRepository.saveAll(result.childRules),
      profilePolicyRepository.saveAll(result.profilePolicies),
      watchHistoryRepository.saveAll(result.history),
      screenTimeRepository.saveAll(result.screenTime),
    ]);

    return result;
  },

  /** Content that only existed as a grant for a deleted profile is pruned from memory elsewhere. */
  orphanedApprovalCount(approvals: ContentApproval[], profileId: string) {
    return approvals.filter((approval) => approval.profileId === profileId).length;
  },
};
