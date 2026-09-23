import { ChildContentRules, ContentApproval, defaultChildContentRules } from '../phase4Types';
import { whitelistService } from './whitelistService';

/**
 * Single source of truth for "may this profile see/play this content?".
 *
 * Both `PlaybackPolicyService` (before handing a video to the native player) and
 * `KidContentLibraryService` (when building the Kid Mode library) call this, so
 * the child never sees content the policy would refuse, and vice versa.
 *
 * Layer order:
 *  1. explicit child blocks            -> child_blocked
 *  2. parent candidates (unapproved)   -> not_approved
 *  3. global whitelist approval, or a child/family grant -> allowed
 *  4. expired grant                    -> expired
 *  5. disabled category                -> category_blocked
 */
export type ContentAccessOutcome = 'allowed' | 'expired' | 'not_approved' | 'category_blocked' | 'child_blocked';

export type ContentAccessInput = {
  videoId?: string;
  channelId?: string;
  categoryIds?: string[];
  /** Unapproved library rows a parent added as "ask a parent" candidates. */
  isCandidate?: boolean;
};

export type ApprovalState = 'allowed' | 'expired' | 'none';

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

  hydrate(input: { rules?: Record<string, ChildContentRules>; approvals?: ContentApproval[] }) {
    this.rules = new Map(Object.entries(input.rules ?? {}));
    this.setApprovals(input.approvals ?? []);
  }

  setRules(rules: Record<string, ChildContentRules>) {
    this.rules = new Map(Object.entries(rules));
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

  resolveIdentifiers(input: ContentAccessInput) {
    const video = whitelistService.findVideo(input.videoId);
    const channelId = input.channelId ?? video?.channelId;
    return { videoId: input.videoId, channelId };
  }

  /** True when the child's own rules grant this exact item. */
  isChildGranted(profileId: string, input: { videoId?: string; channelId?: string }) {
    const rules = this.getRules(profileId);
    return Boolean(
      (input.videoId && rules.grantedVideoIds.includes(input.videoId)) ||
        (input.channelId && rules.grantedChannelIds.includes(input.channelId)),
    );
  }

  evaluate(profileId: string, input: ContentAccessInput, now = new Date()): ContentAccessOutcome {
    const rules = this.getRules(profileId);
    const { videoId, channelId } = this.resolveIdentifiers(input);

    // 1. Explicit child blocks always win.
    if (videoId && rules.blockedVideoIds.includes(videoId)) return 'child_blocked';
    if (channelId && rules.blockedChannelIds.includes(channelId)) return 'child_blocked';

    const isCandidate = input.isCandidate ?? whitelistService.findVideo(videoId)?.candidate === true;
    const approvalState = this.resolveApprovalState(profileId, { videoId, channelId }, now);
    const childGranted = this.isChildGranted(profileId, { videoId, channelId });

    // 2. Parent search results stay unplayable until a parent approves or grants them.
    if (isCandidate && approvalState !== 'allowed' && !childGranted) return 'not_approved';

    // 3. Global approval, a temporary/permanent grant, or a child-specific rule.
    const globallyApproved = rules.inheritGlobalApprovals && whitelistService.isVideoAllowed(videoId ?? '', channelId);
    if (!globallyApproved && !childGranted && approvalState !== 'allowed') {
      return approvalState === 'expired' ? 'expired' : 'not_approved';
    }

    // 4. Disabled category for this child.
    const categoryIds = input.categoryIds ?? whitelistService.categoryIdsFor(videoId, channelId);
    if (categoryIds.some((categoryId) => rules.blockedCategoryIds.includes(categoryId))) return 'category_blocked';

    return 'allowed';
  }
}

export const contentAccessService = new ContentAccessService();
