import { ApprovedChannel, ApprovedVideo } from '../../types';
import type { ContentApproval, ContentCategory } from '../../types';
import { resolvedCategoryIds } from '../../utils/parentalControls.helper';
import { describeApprovalExpiry } from '../../services/approvalRules';
import { ParentFilters } from '../ParentFilter/parentFilter.type';
import { AccessCheck, ChannelSort } from './parentContent.type';

/**
 * Pure list logic for Parent Mode.
 *
 * Filtering is narrowing only: `accessFor` is the access service's own decision, so a filter can
 * never widen what a child may reach, and the lists here are never a source of truth for access.
 */

function contains(value: string | undefined, needle: string): boolean {
  return Boolean(value && value.toLowerCase().includes(needle));
}

/** Every approval touching this target, described in parent-facing words. */
export function approveLabelFor(
  approvals: ContentApproval[],
  target: { videoId?: string; channelId?: string },
): string[] {
  return approvals
    .filter((approval) =>
      approval.target.type === 'video'
        ? Boolean(target.videoId) && approval.target.youtubeVideoId === target.videoId
        : Boolean(target.channelId) && approval.target.youtubeChannelId === target.channelId,
    )
    .map((approval) => describeApprovalExpiry(approval));
}

export function filterVideos(
  videos: ApprovedVideo[],
  filters: ParentFilters,
  accessFor: AccessCheck,
): ApprovedVideo[] {
  const needle = filters.query.trim().toLowerCase();
  return videos.filter((video) => {
    if (needle && !contains(video.title, needle) && !contains(video.channelName, needle)) return false;
    if (filters.categoryId && !resolvedCategoryIds(video.categoryIds).includes(filters.categoryId)) return false;
    if (filters.childId && !accessFor(filters.childId, { videoId: video.youtubeVideoId, channelId: video.channelId })) {
      return false;
    }
    return true;
  });
}

export function filterChannels(
  channels: ApprovedChannel[],
  filters: ParentFilters,
  accessFor: AccessCheck,
): ApprovedChannel[] {
  const needle = filters.query.trim().toLowerCase();
  return channels.filter((channel) => {
    if (needle && !contains(channel.name, needle) && !contains(channel.channelId, needle)) return false;
    if (filters.categoryId && !resolvedCategoryIds(channel.categoryIds).includes(filters.categoryId)) return false;
    if (filters.childId && !accessFor(filters.childId, { channelId: channel.channelId })) return false;
    return true;
  });
}

/** `recent` keeps library order, which already puts the newest channel first. */
export function sortChannels(channels: ApprovedChannel[], sort: ChannelSort): ApprovedChannel[] {
  if (sort === 'recent') return channels;
  return [...channels].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/** Names of the categories a parent explicitly assigned, in the order they were assigned. */
export function categoryNames(categoryIds: string[] | undefined, categories: ContentCategory[]): string[] {
  const byId = new Map(categories.map((category) => [category.id, category.name]));
  return (categoryIds ?? []).flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
}
