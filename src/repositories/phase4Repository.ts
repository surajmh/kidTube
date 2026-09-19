import {
  ChildContentRules,
  ContentApproval,
  ContentCategory,
  ContentRequest,
  PlaybackOverride,
  ProfilePolicyOverrides,
  defaultCategories,
} from '../phase4Types';
import { readJson, writeJson } from './storage';

/**
 * Phase 4 storage. Keys mirror the `phase3Repository` convention: local keys owned
 * by the phase module rather than the Phase 1 `storageKeys` table.
 */
export const phase4Keys = {
  requests: '@nestling/requests',
  approvals: '@nestling/approvals',
  categories: '@nestling/categories',
  childRules: '@nestling/child-content-rules',
  profilePolicies: '@nestling/profile-policies',
  overrides: '@nestling/playback-overrides',
} as const;

export const requestRepository = {
  getAll: () => readJson<ContentRequest[]>(phase4Keys.requests, []),
  saveAll: (requests: ContentRequest[]) => writeJson(phase4Keys.requests, requests),
};

export const approvalRepository = {
  getAll: () => readJson<ContentApproval[]>(phase4Keys.approvals, []),
  saveAll: (approvals: ContentApproval[]) => writeJson(phase4Keys.approvals, approvals),
};

export const categoryRepository = {
  async getAll(): Promise<ContentCategory[]> {
    const stored = await readJson<ContentCategory[] | null>(phase4Keys.categories, null);
    if (stored && stored.length) {
      // Keep newly shipped defaults available without dropping custom categories.
      const known = new Set(stored.map((category) => category.id));
      const missingDefaults = defaultCategories.filter((category) => !known.has(category.id));
      return missingDefaults.length ? [...stored, ...missingDefaults] : stored;
    }
    await writeJson(phase4Keys.categories, defaultCategories);
    return defaultCategories;
  },
  saveAll: (categories: ContentCategory[]) => writeJson(phase4Keys.categories, categories),
};

export const childRulesRepository = {
  getAll: () => readJson<Record<string, ChildContentRules>>(phase4Keys.childRules, {}),
  saveAll: (rules: Record<string, ChildContentRules>) => writeJson(phase4Keys.childRules, rules),
};

export const profilePolicyRepository = {
  getAll: () => readJson<Record<string, ProfilePolicyOverrides>>(phase4Keys.profilePolicies, {}),
  saveAll: (policies: Record<string, ProfilePolicyOverrides>) => writeJson(phase4Keys.profilePolicies, policies),
};

export const overrideRepository = {
  getAll: () => readJson<PlaybackOverride[]>(phase4Keys.overrides, []),
  saveAll: (overrides: PlaybackOverride[]) => writeJson(phase4Keys.overrides, overrides),
};
