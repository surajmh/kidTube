import type { ChildContentRules, ContentApproval, ContentCategory, ContentRequest, PlaybackOverride, ProfilePolicyOverrides } from '../types';
import { defaultCategories } from '../constants/parentalControls.constant';
import { saveQuietly, useAppStore } from '../store/appStore';

const state = () => useAppStore.getState();

export const requestRepository = {
  getAll: async () => state().requests,
  saveAll: (requests: ContentRequest[]) => saveQuietly({ requests }),
};

export const approvalRepository = {
  getAll: async () => state().approvals,
  saveAll: (approvals: ContentApproval[]) => saveQuietly({ approvals }),
};

/** Keeps newly shipped defaults available without dropping custom categories. */
export function withDefaultCategories(stored: ContentCategory[]): ContentCategory[] {
  const known = new Set(stored.map((category) => category.id));
  const missingDefaults = defaultCategories.filter((category) => !known.has(category.id));
  return missingDefaults.length ? [...stored, ...missingDefaults] : stored;
}

export const categoryRepository = {
  getAll: async () => withDefaultCategories(state().categories),
  saveAll: (categories: ContentCategory[]) => saveQuietly({ categories }),
};

export const childRulesRepository = {
  getAll: async () => state().childRules,
  saveAll: (childRules: Record<string, ChildContentRules>) => saveQuietly({ childRules }),
};

export const profilePolicyRepository = {
  getAll: async () => state().profilePolicies,
  saveAll: (profilePolicies: Record<string, ProfilePolicyOverrides>) => saveQuietly({ profilePolicies }),
};

export const overrideRepository = {
  getAll: async () => state().overrides,
  saveAll: (overrides: PlaybackOverride[]) => saveQuietly({ overrides }),
};
