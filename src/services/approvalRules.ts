import { ApprovalDuration, ApprovalTarget, ContentApproval } from '../phase4Types';

/**
 * Dependency-free approval rules.
 *
 * Kept separate from `approvalService` (which owns storage and the parent
 * authorization check) so the expiry math can be reasoned about and tested on
 * its own.
 */

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** End of the given local day, i.e. the moment "today" stops meaning today. */
export function endOfLocalDay(date = new Date(), dayOffset = 0) {
  const start = startOfDay(date);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate() + dayOffset + 1, 0, 0, 0, 0);
}

export function approvalExpiry(
  duration: ApprovalDuration,
  now = new Date(),
): Pick<ContentApproval, 'expiresAt' | 'remainingPlays'> {
  switch (duration) {
    case 'once':
      return { remainingPlays: 1 };
    case 'today':
      return { expiresAt: endOfLocalDay(now).toISOString() };
    case 'seven_days':
      return { expiresAt: endOfLocalDay(now, 6).toISOString() };
    case 'permanent':
      return {};
  }
}

export function describeApprovalExpiry(approval: ContentApproval, now = new Date()) {
  if (approval.remainingPlays !== undefined && approval.remainingPlays > 0) {
    return approval.remainingPlays === 1 ? '1 playback left' : `${approval.remainingPlays} playbacks left`;
  }
  if (!approval.expiresAt) return 'Permanent';
  const remainingMs = new Date(approval.expiresAt).getTime() - now.getTime();
  if (remainingMs <= 0) return 'Expired';
  const hours = Math.round(remainingMs / (60 * 60 * 1000));
  if (hours < 1) return 'Expires in under an hour';
  if (hours < 24) return `Expires in ${hours}h`;
  return `Expires in ${Math.round(hours / 24)}d`;
}

export function describeApprovalTarget(target: ApprovalTarget) {
  return target.type === 'video' ? target.youtubeVideoId : target.youtubeChannelId;
}
