import { childRulesRepository } from '../repositories/parentalControlsRepository';
import type { ChildContentRules } from '../types';
import { defaultChildContentRules } from '../utils/parentalControls.helper';
import { parentSessionService } from './auth/parentSession';
import type { ParentSession } from './auth/parentSession.type';
import { toggleCategoryId } from './categoryService';
import type { ChildRulesMap } from './childRulesService.type';

/**
 * Global approvals stay intact; these rules only add or remove access for a
 * single child. The final decision is always made by `PlaybackPolicy`.
 */
export class ChildRulesService {
  private rules: ChildRulesMap = {};

  hydrate(rules: ChildRulesMap) {
    this.rules = rules;
  }

  all() {
    return this.rules;
  }

  get(profileId: string): ChildContentRules {
    return this.rules[profileId] ?? defaultChildContentRules(profileId);
  }

  private async persist(session: ParentSession, action: string, profileId: string, next: ChildContentRules): Promise<ChildRulesMap> {
    parentSessionService.require(action);
    this.rules = { ...this.rules, [profileId]: next };
    await childRulesRepository.saveAll(this.rules);
    return this.rules;
  }

  setInheritGlobal(session: ParentSession, profileId: string, inheritGlobalApprovals: boolean) {
    return this.persist(session, 'change per-child content rules', profileId, {
      ...this.get(profileId),
      inheritGlobalApprovals,
    });
  }

  /** Requirement 12: disable a category for one child. */
  toggleCategory(session: ParentSession, profileId: string, categoryId: string) {
    const current = this.get(profileId);
    return this.persist(session, 'change per-child category access', profileId, {
      ...current,
      blockedCategoryIds: toggleCategoryId(current.blockedCategoryIds, categoryId),
    });
  }

  private async toggleMembership(
    session: ParentSession,
    action: string,
    profileId: string,
    field: keyof Pick<ChildContentRules, 'grantedVideoIds' | 'grantedChannelIds' | 'blockedVideoIds' | 'blockedChannelIds'>,
    value: string,
  ) {
    const current = this.get(profileId);
    const list = current[field];
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    return this.persist(session, action, profileId, { ...current, [field]: next });
  }

  toggleGrantedVideo(session: ParentSession, profileId: string, videoId: string) {
    return this.toggleMembership(session, 'grant a video to a child', profileId, 'grantedVideoIds', videoId);
  }

  toggleGrantedChannel(session: ParentSession, profileId: string, channelId: string) {
    return this.toggleMembership(session, 'grant a channel to a child', profileId, 'grantedChannelIds', channelId);
  }

  toggleBlockedVideo(session: ParentSession, profileId: string, videoId: string) {
    return this.toggleMembership(session, 'restrict a video for a child', profileId, 'blockedVideoIds', videoId);
  }

  toggleBlockedChannel(session: ParentSession, profileId: string, channelId: string) {
    return this.toggleMembership(session, 'restrict a channel for a child', profileId, 'blockedChannelIds', channelId);
  }
}

export const childRulesService = new ChildRulesService();
