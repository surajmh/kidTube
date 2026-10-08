import type { ChildContentRules, ContentApproval } from '../types';
import { defaultChildContentRules } from '../utils/parentalControls.helper';
import { whitelistService } from './whitelistService';
import type { ContentAccessOutcome, ContentAccessInput, ApprovalState, IndexedChildRules } from './contentAccessService.type';

export function approvalExpired(approval: ContentApproval, now = new Date()) {
  if (approval.expiresAt && new Date(approval.expiresAt).getTime() <= now.getTime()) return true;
  if (approval.remainingPlays !== undefined && approval.remainingPlays <= 0) return true;
  return false;
}

export function approvalMatchesTarget(approval: ContentApproval, videoId?: string, channelId?: string) {
  if (approval.target.type === 'video') return Boolean(videoId) && approval.target.youtubeVideoId === videoId;
  return Boolean(channelId) && approval.target.youtubeChannelId === channelId;
}

export class ContentAccessService {
  private rules = new Map<string, ChildContentRules>();
  private approvals: ContentApproval[] = [];
  /** Approvals indexed by target id; `evaluate` looks each one up per video. */
  private videoApprovals = new Map<string, ContentApproval[]>();
  private channelApprovals = new Map<string, ContentApproval[]>();
  private indexedRules = new Map<string, IndexedChildRules>();

  hydrate(input: { rules?: Record<string, ChildContentRules>; approvals?: ContentApproval[] }) {
    this.rules = new Map(Object.entries(input.rules ?? {}));
    this.indexedRules = new Map();
    this.setApprovals(input.approvals ?? []);
  }

  setRules(rules: Record<string, ChildContentRules>) {
    this.rules = new Map(Object.entries(rules));
    this.indexedRules = new Map();
  }

  setApprovals(approvals: ContentApproval[]) {
    this.approvals = approvals;
    this.videoApprovals = new Map();
    this.channelApprovals = new Map();
    for (const approval of approvals) {
      const [index, key] =
        approval.target.type === 'video'
          ? [this.videoApprovals, approval.target.youtubeVideoId]
          : [this.channelApprovals, approval.target.youtubeChannelId];
      const bucket = index.get(key);
      if (bucket) bucket.push(approval);
      else index.set(key, [approval]);
    }
  }

  getRules(profileId: string): ChildContentRules {
    return this.rules.get(profileId) ?? defaultChildContentRules(profileId);
  }

  private getIndexedRules(profileId: string): IndexedChildRules {
    const cached = this.indexedRules.get(profileId);
    if (cached) return cached;
    const rules = this.getRules(profileId);
    const indexed: IndexedChildRules = {
      rules,
      blockedVideoIds: new Set(rules.blockedVideoIds),
      blockedChannelIds: new Set(rules.blockedChannelIds),
      grantedVideoIds: new Set(rules.grantedVideoIds),
      grantedChannelIds: new Set(rules.grantedChannelIds),
      blockedCategoryIds: new Set(rules.blockedCategoryIds),
    };
    this.indexedRules.set(profileId, indexed);
    return indexed;
  }

  /** Approvals that apply to this profile (its own plus family-wide ones). */
  approvalsFor(profileId: string) {
    return this.approvals.filter((approval) => approval.profileId === profileId || approval.profileId === null);
  }

  /** Approvals targeting this exact video or channel that apply to this profile. */
  private matchingApprovals(profileId: string, videoId?: string, channelId?: string) {
    const matches: ContentApproval[] = [];
    const collect = (index: Map<string, ContentApproval[]>, key?: string) => {
      if (!key) return;
      for (const approval of index.get(key) ?? []) {
        if (approval.profileId === profileId || approval.profileId === null) matches.push(approval);
      }
    };
    collect(this.videoApprovals, videoId);
    collect(this.channelApprovals, channelId);
    return matches;
  }

  resolveApprovalState(profileId: string, input: ContentAccessInput, now = new Date()): ApprovalState {
    const { videoId, channelId } = this.resolveIdentifiers(input);
    const matches = this.matchingApprovals(profileId, videoId, channelId);
    if (!matches.length) return 'none';
    if (matches.some((approval) => !approvalExpired(approval, now))) return 'allowed';
    return 'expired';
  }

  /** True when a temporary approval (not the global whitelist) is what allows this content. */
  isTemporaryAccess(profileId: string, input: ContentAccessInput, now = new Date()) {
    return this.resolveApprovalState(profileId, input, now) === 'allowed';
  }

  /** Resolves the video record once, alongside the ids `evaluate` needs — avoids the two
   * independent `whitelistService.findVideo` lookups this used to do for the same call. */
  private resolveVideoAndIdentifiers(input: ContentAccessInput) {
    const video = whitelistService.findVideo(input.videoId);
    const channelId = input.channelId ?? video?.channelId;
    return { video, videoId: input.videoId, channelId };
  }

  resolveIdentifiers(input: ContentAccessInput) {
    const { videoId, channelId } = this.resolveVideoAndIdentifiers(input);
    return { videoId, channelId };
  }

  /** True when the child's own rules grant this exact item. */
  isChildGranted(profileId: string, input: { videoId?: string; channelId?: string }) {
    const indexed = this.getIndexedRules(profileId);
    return Boolean(
      (input.videoId && indexed.grantedVideoIds.has(input.videoId)) ||
        (input.channelId && indexed.grantedChannelIds.has(input.channelId)),
    );
  }

  evaluate(profileId: string, input: ContentAccessInput, now = new Date()): ContentAccessOutcome {
    const indexed = this.getIndexedRules(profileId);
    const { rules } = indexed;
    const { videoId, channelId } = this.resolveVideoAndIdentifiers(input);

    // 1. Explicit child blocks always win.
    if (videoId && indexed.blockedVideoIds.has(videoId)) return 'child_blocked';
    if (channelId && indexed.blockedChannelIds.has(channelId)) return 'child_blocked';

    const approvalState = this.resolveApprovalState(profileId, { videoId, channelId }, now);
    const childGranted = this.isChildGranted(profileId, { videoId, channelId });

    // 2. Global approval, a temporary/permanent grant, or a child-specific rule.
    const globallyApproved = rules.inheritGlobalApprovals && whitelistService.isVideoAllowed(videoId ?? '', channelId);
    if (!globallyApproved && !childGranted && approvalState !== 'allowed') {
      return approvalState === 'expired' ? 'expired' : 'not_approved';
    }

    // 3. Disabled category for this child.
    const categoryIds = input.categoryIds ?? whitelistService.categoryIdsFor(videoId, channelId);
    if (categoryIds.some((categoryId) => indexed.blockedCategoryIds.has(categoryId))) return 'category_blocked';

    return 'allowed';
  }
}

export const contentAccessService = new ContentAccessService();
