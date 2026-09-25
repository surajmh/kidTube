import {
  ChildContentRules,
  ContentApproval,
  ContentCategory,
  ContentRequest,
  PlaybackOverride,
  ProfilePolicyOverrides,
  defaultCategories,
} from '../parentalControlsTypes';
import { readJson, writeJson } from './storage';

/**
 * Phase 4 storage. Keys mirror the `playbackSettingsRepository` convention: local keys owned
 * by the phase module rather than the Phase 1 `storageKeys` table.
 */
export const parentalControlsKeys = {
  requests: '@nestling/requests',
  approvals: '@nestling/approvals',
  categories: '@nestling/categories',
  childRules: '@nestling/child-content-rules',
  profilePolicies: '@nestling/profile-policies',
  overrides: '@nestling/playback-overrides',
} as const;

export const requestRepository = {
  getAll: () => readJson<ContentRequest[]>(parentalControlsKeys.requests, []),
  saveAll: (requests: ContentRequest[]) => writeJson(parentalControlsKeys.requests, requests),
};

export const approvalRepository = {
  getAll: () => readJson<ContentApproval[]>(parentalControlsKeys.approvals, []),
  saveAll: (approvals: ContentApproval[]) => writeJson(parentalControlsKeys.approvals, approvals),
};

export const categoryRepository = {
  async getAll(): Promise<ContentCategory[]> {
    const stored = await readJson<ContentCategory[] | null>(parentalControlsKeys.categories, null);
    if (stored && stored.length) {
      // Keep newly shipped defaults available without dropping custom categories.
      const known = new Set(stored.map((category) => category.id));
      const missingDefaults = defaultCategories.filter((category) => !known.has(category.id));
      return missingDefaults.length ? [...stored, ...missingDefaults] : stored;
    }
    await writeJson(parentalControlsKeys.categories, defaultCategories);
    return defaultCategories;
  },
  saveAll: (categories: ContentCategory[]) => writeJson(parentalControlsKeys.categories, categories),
};

export const childRulesRepository = {
  getAll: () => readJson<Record<string, ChildContentRules>>(parentalControlsKeys.childRules, {}),
  saveAll: (rules: Record<string, ChildContentRules>) => writeJson(parentalControlsKeys.childRules, rules),
};

export const profilePolicyRepository = {
  getAll: () => readJson<Record<string, ProfilePolicyOverrides>>(parentalControlsKeys.profilePolicies, {}),
  saveAll: (policies: Record<string, ProfilePolicyOverrides>) => writeJson(parentalControlsKeys.profilePolicies, policies),
};

export const overrideRepository = {
  getAll: () => readJson<PlaybackOverride[]>(parentalControlsKeys.overrides, []),
  saveAll: (overrides: PlaybackOverride[]) => writeJson(parentalControlsKeys.overrides, overrides),
};
