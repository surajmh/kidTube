import { approvalRepository } from '../repositories/parentalControlsRepository';
import { ApprovalDuration, ApprovalTarget, ContentApproval } from '../parentalControlsTypes';
import { ParentSession, parentSessionService } from './auth/parentSession';
import { approvalExpired, approvalMatchesTarget } from './contentAccessService';
import { approvalExpiry } from './approvalRules';

export { approvalExpiry, describeApprovalExpiry, describeApprovalTarget, endOfLocalDay } from './approvalRules';

export type ApprovalGrantInput = {
  profileId: string | null;
  target: ApprovalTarget;
  duration: ApprovalDuration;
  requestId?: string;
};

export type ApprovalGrantResult = {
  approval: ContentApproval;
  approvals: ContentApproval[];
  /** Permanent family-wide grants are mirrored into the Phase 1 whitelist by the caller. */
  mirrorTarget: ApprovalTarget | null;
};

function newId() {
  return `approval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export class ApprovalService {
  private approvals: ContentApproval[] = [];
  private hydrated = false;

  hydrate(approvals: ContentApproval[]) {
    this.approvals = approvals;
    this.hydrated = true;
  }

  isHydrated() {
    return this.hydrated;
  }

  all() {
    return this.approvals;
  }

  active(now = new Date()) {
    return this.approvals.filter((approval) => !approvalExpired(approval, now));
  }

  forProfile(profileId: string, now = new Date()) {
    return this.active(now).filter((approval) => approval.profileId === profileId || approval.profileId === null);
  }

  async grant(session: ParentSession, input: ApprovalGrantInput): Promise<ApprovalGrantResult> {
    parentSessionService.require('grant content approval');
    const now = new Date();
    const approval: ContentApproval = {
      id: newId(),
      profileId: input.profileId,
      target: input.target,
      duration: input.duration,
      grantedAt: now.toISOString(),
      ...approvalExpiry(input.duration, now),
      requestId: input.requestId,
    };
    const grantedTargets = {
      videoId: approval.target.type === 'video' ? approval.target.youtubeVideoId : undefined,
      channelId: approval.target.type === 'channel' ? approval.target.youtubeChannelId : undefined,
    };
    this.approvals = [
      approval,
      ...this.approvals.filter(
        (existing) =>
          !(existing.profileId === approval.profileId && approvalMatchesTarget(existing, grantedTargets.videoId, grantedTargets.channelId)),
      ),
    ];
    await approvalRepository.saveAll(this.approvals);
    return {
      approval,
      approvals: this.approvals,
      mirrorTarget: input.duration === 'permanent' && input.profileId === null ? input.target : null,
    };
  }

  async revoke(session: ParentSession, match: { profileId: string | null; videoId?: string; channelId?: string }) {
    parentSessionService.require('revoke content approval');
    const next = this.approvals.filter(
      (approval) =>
        !(
          approval.profileId === match.profileId &&
          approvalMatchesTarget(approval, match.videoId, match.channelId)
        ),
    );
    this.approvals = next;
    await approvalRepository.saveAll(next);
    return next;
  }

  /** Called when playback finishes so `once` approvals expire. */
  async consumePlayback(profileId: string, videoId: string, channelId?: string) {
    if (!this.hydrated) return this.approvals;
    let changed = false;
    const next = this.approvals.map((approval) => {
      if (approval.duration !== 'once' || approval.remainingPlays === undefined) return approval;
      if (approval.profileId !== profileId && approval.profileId !== null) return approval;
      if (!approvalMatchesTarget(approval, videoId, channelId)) return approval;
      changed = true;
      return { ...approval, remainingPlays: Math.max(0, approval.remainingPlays - 1) };
    });
    if (!changed) return this.approvals;
    this.approvals = next;
    await approvalRepository.saveAll(next);
    return next;
  }

  /** Drops expired approvals so the library and policy stay consistent. */
  async pruneExpired(now = new Date()) {
    if (!this.hydrated) return this.approvals;
    const next = this.approvals.filter((approval) => !approvalExpired(approval, now));
    if (next.length === this.approvals.length) return this.approvals;
    this.approvals = next;
    await approvalRepository.saveAll(next);
    return next;
  }
}

export const approvalService = new ApprovalService();
